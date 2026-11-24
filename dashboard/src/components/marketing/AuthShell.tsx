import Link from 'next/link'

import Logo from '@/components/ui/Logo'

/**
 * Frame for sign-in / sign-up: a glass panel under the same ambient light as
 * the landing hero, correct in both themes. The Clerk card inside is rendered
 * chromeless (see clerk-appearance) so this shell provides all the surface
 * language.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <div className="container">
          <Link href="/" aria-label="FinSignal home" className="auth-brand">
            <Logo size={24} />
          </Link>
        </div>
      </header>

      <main id="main" className="auth-main">
        <div className="auth-panel">
          <div className="auth-head">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Research terminal</p>
            <p className="auth-head__lede">
              Five signals, one explainable verdict — every number auditable.
            </p>
          </div>
          {children}
          <p className="auth-note">Free tier: five analyses a day. No card required.</p>
          <p className="auth-legal">
            FinSignal is an experimental research project, not investment advice. By continuing you agree to
            the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy notice</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
