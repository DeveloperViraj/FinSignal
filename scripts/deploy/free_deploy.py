"""Deploy FinSignal on free plans: the backend on Render, the website on
Vercel, and the alert checks on GitHub Actions. None of them needs a card.

Secrets are read from the local, git-ignored env files and written only to
other git-ignored env files or to the signed-in `gh` CLI. Nothing here prints a
value: the output names keys, never their contents.

    python scripts/deploy/free_deploy.py keys
        Add BACKEND_SHARED_KEY and ALERTS_SCHEDULER_TOKEN to .env (once).

    python scripts/deploy/free_deploy.py env-files --backend URL --site URL
        Write .env.render (paste into Render: Environment → Add from .env) and
        .env.vercel (paste into Vercel: Settings → Environment Variables).

    python scripts/deploy/free_deploy.py github --backend URL
        Give the "Alert checks" GitHub Action the backend address and the two
        shared secrets.

`--backend` is the Render service address (https://finsignal-api.onrender.com
or with a suffix Render adds); `--site` is the Vercel address
(https://<project>.vercel.app). See docs/FREE_DEPLOYMENT.md for the sequence.
"""

from __future__ import annotations

import argparse
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND_ENV = ROOT / ".env"
WEBSITE_ENV = ROOT / "dashboard" / ".env.local"
RENDER_OUT = ROOT / ".env.render"
VERCEL_OUT = ROOT / ".env.vercel"

#: Generated here, shared by the website, the backend and the alert check.
SHARED_SECRETS = ("BACKEND_SHARED_KEY", "ALERTS_SCHEDULER_TOKEN")

#: Backend .env names that describe this machine, not the deployment. The
#: deployment's own values for the first two are written explicitly.
LOCAL_ONLY = {"ALLOWED_ORIGINS", "APP_ENV", "PORT", "HOST", "BACKEND_ORIGIN", "QUANT_INFERENCE_URL"}

#: Website settings carried over from dashboard/.env.local when present.
WEBSITE_KEYS = (
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "NEXT_PUBLIC_LOGO_DEV_KEY",
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL", "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
    "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL", "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
)


def read_env(path: Path) -> dict[str, str]:
    """KEY=value lines; comments, blanks and empty values are skipped."""
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip().removeprefix("export ").strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1]
        if key and value:
            values[key] = value
    return values


def https_url(value: str | None, name: str) -> str:
    if not value or not value.startswith("https://"):
        sys.exit(f"--{name} must be an https:// address")
    return value.rstrip("/")


def shared(env: dict[str, str]) -> dict[str, str]:
    missing = [name for name in SHARED_SECRETS if name not in env]
    if missing:
        sys.exit(f"run the keys command first; .env has no {', '.join(missing)}")
    return {name: env[name] for name in SHARED_SECRETS}


def write_env(path: Path, header: str, values: dict[str, str]) -> None:
    lines = [f"# {line}" if line else "#" for line in header.splitlines()]
    lines += [f"{key}={value}" for key, value in sorted(values.items())]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ── commands ─────────────────────────────────────────────────────────────────

def append_env(path: Path, values: dict[str, str]) -> None:
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    if text and not text.endswith("\n"):
        text += "\n"
    text += "\n# Shared by the website proxy, the backend and the alert check (free deployment).\n"
    text += "".join(f"{name}={value}\n" for name, value in values.items())
    path.write_text(text, encoding="utf-8")


def cmd_keys(_args) -> None:
    present = read_env(BACKEND_ENV)
    added = {name: secrets.token_urlsafe(32) for name in SHARED_SECRETS if name not in present}
    if added:
        append_env(BACKEND_ENV, added)
    print(f"added to .env: {', '.join(added)}" if added else "both shared secrets already exist in .env")
    # The local backend reads .env, so from now on it wants the key too; the
    # local website's proxy gets the same value, and development keeps
    # exercising the path production uses.
    key = read_env(BACKEND_ENV)["BACKEND_SHARED_KEY"]
    website = read_env(WEBSITE_ENV)
    if website.get("BACKEND_SHARED_KEY") != key:
        if "BACKEND_SHARED_KEY" in website:
            sys.exit("dashboard/.env.local has a different BACKEND_SHARED_KEY; remove that line and rerun")
        append_env(WEBSITE_ENV, {"BACKEND_SHARED_KEY": key})
        print("added to dashboard/.env.local: BACKEND_SHARED_KEY")


def cmd_env_files(args) -> None:
    backend = https_url(args.backend, "backend")
    site = https_url(args.site, "site")
    env = read_env(BACKEND_ENV)
    keys = shared(env)

    render = {k: v for k, v in env.items() if k not in LOCAL_ONLY}
    render.update(keys, ALLOWED_ORIGINS=site)
    for name in ("CLERK_ISSUER", "CLERK_JWKS_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if name not in render:
            print(f"warning: .env has no {name}; sign-in or saved data will not work on the backend")
    write_env(RENDER_OUT, "Render: finsignal-api → Environment → Add from .env, paste all of this, Save.\n"
              "Git-ignored. Delete it once pasted.", render)

    website = read_env(WEBSITE_ENV)
    vercel = {k: website[k] for k in WEBSITE_KEYS if k in website}
    for name in ("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"):
        if name not in vercel:
            sys.exit(f"dashboard/.env.local has no {name}")
    vercel.update(
        BACKEND_ORIGIN=backend,
        BACKEND_AUTH_MODE="none",
        BACKEND_SHARED_KEY=keys["BACKEND_SHARED_KEY"],
        NEXT_PUBLIC_SITE_URL=site,
    )
    write_env(VERCEL_OUT, "Vercel: project → Settings → Environment Variables, paste all of this\n"
              "(Production), Save, then redeploy. Git-ignored. Delete it once pasted.", vercel)
    print(f"wrote .env.render ({len(render)} keys: {', '.join(sorted(render))})")
    print(f"wrote .env.vercel ({len(vercel)} keys: {', '.join(sorted(vercel))})")


def gh(*args: str, value: str | None = None) -> None:
    exe = shutil.which("gh")
    if not exe:
        sys.exit("the gh CLI is not installed")
    subprocess.run([exe, *args], cwd=ROOT, input=value, text=True, check=True, stdout=subprocess.DEVNULL)


def cmd_github(args) -> None:
    backend = https_url(args.backend, "backend")
    for name, value in shared(read_env(BACKEND_ENV)).items():
        gh("secret", "set", name, value=value)
    gh("variable", "set", "BACKEND_URL", "--body", backend)
    print("set GitHub secrets BACKEND_SHARED_KEY, ALERTS_SCHEDULER_TOKEN and variable BACKEND_URL")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("keys").set_defaults(run=cmd_keys)
    files = sub.add_parser("env-files")
    files.add_argument("--backend", required=True, help="the Render service's https address")
    files.add_argument("--site", required=True, help="the Vercel website's https address")
    files.set_defaults(run=cmd_env_files)
    github = sub.add_parser("github")
    github.add_argument("--backend", required=True, help="the Render service's https address")
    github.set_defaults(run=cmd_github)
    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
