/*
 * The product accent as a literal, for the third-party sign-in widget, which takes a colour
 * string and cannot read a CSS variable. It is the light-theme accent
 * from styles/tokens.css, which keeps at least 3:1 against both the light and the dark panel (the
 * near-white dark-theme accent would vanish on white). `tests/third-party-theme.test.ts` holds it equal
 * to the token, so it cannot drift back to a colour the product no longer uses.
 */
export const ACCENT_LITERAL = '#5a43e6'

/*
 * Clerk theming: the card is rendered CHROMELESS (transparent, no border,
 * no shadow) — the surrounding AuthShell glass panel provides all surface
 * language, in both themes. Element-level styles use CSS variables so the
 * form follows the active theme; Clerk passes them through as inline
 * styles, which resolve against the page's custom properties.
 */

const control = {
  background: 'var(--p-panel)',
  border: '1px solid var(--rule-strong)',
  color: 'var(--ink)',
  borderRadius: '10px',
}

export const clerkAppearance = {
  variables: {
    colorPrimary: ACCENT_LITERAL,
    borderRadius: '10px',
    fontFamily: "'Inter Variable', -apple-system, 'Segoe UI', sans-serif",
    fontSize: '15px',
  },
  elements: {
    rootBox: { width: '100%' },
    // Clerk v7 wraps the card in a cardBox that carries its own default
    // width (400px), border and drop shadow. Left unstyled it renders as a
    // second card that overflows the 420px AuthShell panel — neutralize it
    // so the glass shell is the only visible surface.
    cardBox: {
      width: '100%',
      maxWidth: '100%',
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      borderRadius: 0,
    },
    card: {
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      width: '100%',
      padding: '8px 4px',
    },
    headerTitle: {
      fontFamily: "'Sora Variable', 'Inter Variable', -apple-system, sans-serif",
      fontWeight: 600,
      fontSize: '1.3rem',
      letterSpacing: '-0.02em',
      color: 'var(--ink)',
    },
    headerSubtitle: { color: 'var(--ink-muted)' },
    socialButtonsBlockButton: {
      ...control,
      transition: 'border-color 120ms ease-out, background 120ms ease-out',
    },
    socialButtonsBlockButtonText: { color: 'var(--ink)', fontWeight: 550 },
    dividerLine: { background: 'var(--rule)' },
    dividerText: { color: 'var(--ink-faint)' },
    formFieldLabel: { color: 'var(--ink-muted)', fontWeight: 550 },
    formFieldInput: control,
    formButtonPrimary: {
      background: 'var(--accent)',
      // The accent lit from above, as on every primary action. Both of its stops clear 4.5:1
      // against --on-accent in its theme, so the text pairing below still holds.
      backgroundImage: 'var(--grad-signal)',
      boxShadow: 'var(--glow-signal)',
      border: 'none',
      // The fill a reader sees is the signal gradient, so the text takes the gradient's paired
      // token, which clears 4.5:1 on every stop of it in both themes (tests/third-party-theme).
      // The flat --accent underneath is only what shows if the gradient cannot be drawn.
      color: 'var(--on-signal)',
      fontWeight: 600,
      textTransform: 'none' as const,
      fontSize: '0.875rem',
      height: '42px',
      borderRadius: '10px',
    },
    footer: { background: 'transparent' },
    footerActionText: { color: 'var(--ink-muted)' },
    footerActionLink: { color: 'var(--accent-strong)', fontWeight: 550 },
    identityPreview: control,
    identityPreviewText: { color: 'var(--ink)' },
    otpCodeFieldInput: control,
    formResendCodeLink: { color: 'var(--accent-strong)' },
    // Clerk's development-instance badge: keep it, but as a quiet status
    // chip rather than a warning ("Development Preview", not an error).
    badge: {
      background: 'var(--p-raised)',
      color: 'var(--ink-muted)',
      border: '1px solid var(--rule)',
      borderRadius: '4px',
      fontWeight: 550,
      letterSpacing: '0.04em',
    },
    logoBox: { display: 'none' },

    // UserButton popover (terminal header, dark by default). Same CSS-
    // variable approach as above — previously unstyled, so it fell back to
    // Clerk's own light-mode default card and overrode the surrounding
    // dark theme whenever it opened.
    userButtonPopoverCard: {
      background: 'var(--p-overlay)',
      border: '1px solid var(--rule-strong)',
      boxShadow: 'var(--shadow-2)',
    },
    userButtonPopoverMain: { background: 'var(--p-overlay)' },
    userButtonPopoverActionButton: { color: 'var(--ink)' },
    userButtonPopoverActionButtonText: { color: 'var(--ink)', fontWeight: 500 },
    userButtonPopoverActionButtonIcon: { color: 'var(--ink-muted)' },
    userButtonPopoverFooter: { background: 'var(--p-raised)' },
    userPreviewMainIdentifier: { color: 'var(--ink)' },
    userPreviewSecondaryIdentifier: { color: 'var(--ink-muted)' },
    menuList: { background: 'var(--p-overlay)', border: '1px solid var(--rule-strong)' },
    menuItem: { color: 'var(--ink)' },
  },
}
