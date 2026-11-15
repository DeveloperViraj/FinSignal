interface LogoProps {
  size?: number
  withWordmark?: boolean
  className?: string
}

/**
 * Mark: three ascending signal bars and a rising trace on a violet signal
 * tile. The tile is CSS (the product gradient, its glow and edge light), so the
 * mark follows the theme and needs no SVG gradient ids; the glyph is drawn in
 * the paired on-signal ink. Reads at 14px and at 40px.
 */
export function LogoMark({ size = 20 }: { size?: number }) {
  const glyph = Math.round(size * 0.64)
  return (
    <span className="logo-tile" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }} aria-hidden="true">
      <svg width={glyph} height={glyph} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
        <rect x="1.5" y="9.5" width="2.6" height="5" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="6.7" y="6.5" width="2.6" height="8" rx="1" fill="currentColor" opacity="0.85" />
        <rect x="11.9" y="3.5" width="2.6" height="11" rx="1" fill="currentColor" />
        <path d="M1.5 6.4 6.9 3.2l3 1.6 4.6-3.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      </svg>
    </span>
  )
}

export default function Logo({ size = 20, withWordmark = true, className }: LogoProps) {
  return (
    <span className={className ? `logo ${className}` : 'logo'}>
      <span className="logo__mark">
        <LogoMark size={size} />
      </span>
      {withWordmark && (
        <span className="logo__word" style={{ fontSize: size * 0.8 }}>
          Fin<span className="logo__word-accent">Signal</span>
        </span>
      )}
    </span>
  )
}
