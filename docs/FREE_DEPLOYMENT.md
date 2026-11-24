# Free deployment

FinSignal runs on free plans with no card anywhere:

| Piece | Where | Free plan limits that matter |
|---|---|---|
| Website | Vercel (Hobby) | Personal, non-commercial use, which this is: there is no paid tier |
| Backend | Render (free web service) | 512 MB, a fraction of one CPU, sleeps after 15 idle minutes, 750 hours a month per workspace |
| Alert checks | GitHub Actions (public repository) | Unlimited minutes; schedules run best-effort |
| Sign-in | Clerk (development instance) | Works on a `vercel.app` address; shows a small "Development mode" badge |
| Database | Supabase (free project) | Pauses after a week without activity; the alert checks keep it active |

The pieces depend on each other like this:

```
browser ──► Vercel website ──(server-side proxy, X-Backend-Key)──► Render backend ──► Supabase
                                                                      ▲
GitHub Actions, 10-min, Mon–Fri ──(X-Backend-Key + X-Scheduler-Token)─┘
```

The backend refuses every request without `BACKEND_SHARED_KEY` except
`/api/health`, so its public address cannot be used to spend the free
data-provider quotas. The key never reaches a browser: the proxy adds it.

## What to expect from the free backend

- A research run takes longer than on a laptop: the free instance has a
  fraction of a CPU. Measured locally a run costs 1.5–7 CPU-seconds, so expect
  roughly 15 seconds to over a minute; the website waits up to two minutes.
- On weekdays (UTC) the alert checks call the backend every ten minutes, which
  keeps it awake. GitHub sometimes runs a schedule late; if the backend fell
  asleep, the first request after that waits about a minute while it wakes.
- At weekends the markets are shut, the alert checks stop and the backend
  sleeps after 15 idle minutes: the first visit then waits about a minute.
  That is what keeps it inside the free hours: awake all week it would use
  about 744 of the 750 a month, awake on weekdays about 550 at most.
- Memory: the backend peaks near 220 MB of the 512 MB. Heavy research builds
  (Factor Lab panels) run offline, never in the web process; see
  `docs/incidents/PROD_INCIDENT_001_RENDER_MEMORY.md`.
- Free services in one Render workspace share its 750 monthly hours, and a
  sleeping service uses none. Another free service that is mostly asleep fits
  beside this one; one kept awake around the clock does not. **Billing →
  Monthly Included Usage** shows the hours used so far.

## Setting it up

Everything below happens once. After that, a merge to `main` redeploys both the
website (Vercel) and the backend (Render) on its own.

### 1. Shared secrets

```bash
python scripts/deploy/free_deploy.py keys
```

Adds `BACKEND_SHARED_KEY` and `ALERTS_SCHEDULER_TOKEN` to `.env`. Run it once;
it never replaces existing values.

### 2. Backend on Render

1. Sign in at <https://render.com> with GitHub. No card is asked for.
2. **New → Blueprint**, choose this repository, branch `main`. Render reads
   `render.yaml` and proposes one free web service, `finsignal-api`. Apply it.
3. Note the service address, e.g. `https://finsignal-api.onrender.com` (Render
   adds a suffix if the name is taken).

### 3. Website on Vercel

1. At <https://vercel.com/new>, import this repository.
2. Set **Root Directory** to `dashboard`. The framework is detected as Next.js.
3. Deploy. Note the address, e.g. `https://finsignal-viraj.vercel.app`. The
   first deploy shows errors until step 4: it has no settings yet.

### 4. Settings for both

```bash
python scripts/deploy/free_deploy.py env-files \
  --backend https://finsignal-api.onrender.com \
  --site https://finsignal-viraj.vercel.app
```

This writes two git-ignored files and prints only the names of the keys inside:

- `.env.render`: in Render, open `finsignal-api` → **Environment** → **Add from
  .env**, paste the whole file, **Save**. Render redeploys.
- `.env.vercel`: with the Vercel CLI signed in (`vercel whoami`), send it with
  `python scripts/deploy/free_deploy.py vercel` (`--project` if the project is
  not called `finsignal`). Without the CLI: open the project → **Settings →
  Environment Variables**, paste the whole file into the first field (Vercel
  splits it), environment **Production**, **Save**. Either way, then
  **Deployments → Redeploy**.

Delete both files once pasted.

### 5. Alert checks

```bash
python scripts/deploy/free_deploy.py github --backend https://finsignal-api.onrender.com
```

Gives the "Alert checks" workflow the backend address and the two shared
secrets through the signed-in `gh` CLI. Then run it once by hand to see it
pass: **Actions → Alert checks → Run workflow**.

### 6. Check

- `https://<backend>/api/health` answers `{"status": "ok", ...}` with the
  deployed `commit`.
- Any other backend path without the key answers 401.
- The website opens, you can sign in, and a company page shows a live price
  ("last sale · finnhub") during market hours.

## Keeping it free

- No paid tier exists in the code: no payment routes, no limits to lift.
- None of the services above has a card on file, so none of them can bill.
  When a free limit is reached the service pauses instead: Render suspends free
  services for the rest of the month after 750 hours, and a provider over its
  own rate limit is reported as unavailable for that run.
