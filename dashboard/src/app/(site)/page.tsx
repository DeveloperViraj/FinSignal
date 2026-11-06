import Link from 'next/link'
import type { Metadata } from 'next'

import { DeterministicConclusion } from '@/components/company/Conclusion'
import { FAMILY_LABEL, FAMILY_ORDER, factorName } from '@/components/company/derive'
import Atmosphere from '@/components/marketing/Atmosphere'
import LiveMacro from '@/components/marketing/LiveMacro'
import PipelineFigure from '@/components/marketing/PipelineFigure'
import ProductTour from '@/components/marketing/ProductTour'
import RunPreview from '@/components/marketing/RunPreview'
import Icon, { type IconName } from '@/components/shell/Icon'
import { RECORDED_LABEL, recordedAnalysis as run } from '@/components/marketing/recordedRun'
import MarketNews from '@/components/terminal/home/MarketNews'
import { FREE_DAILY_LIMIT } from '@/lib/usage'

export const metadata: Metadata = {
  // Inherits the root default title; the template would double the brand here.
  description:
    'Equity research you can audit: a deterministic engine sets every signal from evidence traced to its provider, and an explanation layer narrates it with citations.',
  alternates: { canonical: '/' },
}

/** What each family reads, in the words the methodology uses. */
const FAMILY_READS: Record<string, string> = {
  momentum: 'Trend persistence across one to twelve months, confirmed by volume and measured against the market.',
  fundamental: 'What the price pays for earnings, against the sector and the street, and the drift after results.',
  quality: 'How profitably assets are used, and whether the share count and balance sheet are being diluted.',
  news: 'The tone of recent company headlines, weighted up around earnings.',
  reversal: 'Short-term overextension that tends to mean-revert, as a small contrarian counterweight.',
}

/* The claims the product is built on, in the ribbon under the hero. Words,
   not figures: nothing here could be mistaken for a live value. */
const CLAIMS = [
  'Deterministic signals',
  'Every number traced to its source',
  'Disagreement shown, never averaged',
  'Unknown is not zero',
  'AI explains — it never decides',
]

/* What the terminal holds beyond one company's report, in the words of its own
   destinations (lib/destinations.ts). `go` is the terminal's G-then-key jump. */
const FEATURES: Array<{ icon: IconName; title: string; text: string; go: string; wide?: boolean; viz?: 'rank' | 'lab' }> = [
  {
    icon: 'screen',
    title: 'Screener',
    text: 'Rank and filter the covered universe on the engine’s own factor families, with the evidence behind every row one click away.',
    go: 'S',
    wide: true,
    viz: 'rank',
  },
  { icon: 'list', title: 'Watchlists', text: 'Tracked securities with live prices, quote freshness, notes, tags and research context.', go: 'W' },
  { icon: 'alert', title: 'Alerts', text: 'Price and filing alerts with an inbox, so a move or a new 10-K finds you.', go: 'A' },
  { icon: 'paper', title: 'Paper trading', text: 'A simulated account to test an idea end to end. Orders, fills and P&L — no real money.', go: 'T' },
  { icon: 'graph', title: 'Knowledge graph', text: 'Entities and relationships around one company, and the path between any two.', go: 'K' },
  {
    icon: 'flask',
    title: 'Quant & factor labs',
    text: 'The full research record — preregistered experiments, void runs included — and which factors survive the overlap correction.',
    go: 'Q',
    wide: true,
    viz: 'lab',
  },
  { icon: 'provenance', title: 'Provenance', text: 'The chain from data to decision: how one analysis executed, claim by claim.', go: 'V' },
]

const FAQ = [
  {
    q: 'Does an AI decide the signal?',
    a: 'No. The signal, confidence and risk level come from a deterministic engine — the same inputs always give the same output. A language model writes the explanation afterwards; it must cite the evidence items it uses, and any section that cites nothing, or quotes a number the evidence does not contain, is withheld. The page says which sections were withheld and which provider and model wrote the rest.',
  },
  {
    q: 'Where does the data come from?',
    a: 'Prices, fundamentals and news come from the market-data vendors configured for the deployment; filings come from SEC EDGAR and macro series from FRED. Every run lists which providers answered, which failed and which inputs are missing. A missing input is never filled with an estimate, and a single source is never presented as agreement.',
  },
  {
    q: 'Is this investment advice?',
    a: 'No. FinSignal is a research and education tool. It summarizes public data into a structured, repeatable readout; it does not know your situation, and a signal is a summary of evidence, not a recommendation. Decisions and their consequences remain yours.',
  },
  {
    q: 'Is Pro a subscription?',
    a: 'No. Pro is a single ₹100 payment through Razorpay that unlocks the paid features on your account. There is no recurring charge and nothing to cancel.',
  },
]

export default function LandingPage() {
  const q = run.quant
  const byFamily = (family: string) => (q?.factors ?? []).filter((f) => f.family === family).map((f) => factorName(f.name))

  return (
    <div className="lp">
      {/* ── hero ─────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-container lp-hero__grid">
          <div className="lp-hero__copy">
            <p className="lp-eyebrow">Evidence-grounded equity research</p>
            <h1 className="lp-title">Research you can audit, <em>line by line.</em></h1>
            <p className="lp-lede">
              A deterministic engine sets every signal from evidence it can trace to a provider.
              Disagreements and gaps stay visible. An explanation layer then narrates the result — and
              has to cite the evidence for every sentence it keeps.
            </p>
            <div className="lp-cta">
              <Link href="/start" prefetch={false} className="lp-btn lp-btn--primary">
                Open the terminal<span className="lp-btn__arrow" aria-hidden>→</span>
              </Link>
              <Link href="/#how" className="lp-btn">How a signal is made</Link>
            </div>
            <ul className="lp-proof" aria-label="What every run guarantees">
              <li>Deterministic engine</li>
              <li>Every figure sourced</li>
              <li>AI explains, never decides</li>
            </ul>
            <p className="lp-fine">Free: {FREE_DAILY_LIMIT} research runs a day, no card required.</p>
          </div>
          <div className="lp-stage">
            <RunPreview />
          </div>
        </div>
      </section>

      <section className="lp-ribbon" aria-label="Principles">
        {/* A marquee: four copies end to end, so the track's two halves are
            identical and the loop has no seam. Only the first copy is read by
            assistive technology; the rest are decoration. */}
        <div className="lp-ribbon__track">
          {[0, 1, 2, 3].map((copy) => (
            <ul key={copy} className="lp-ribbon__set" aria-hidden={copy > 0 ? true : undefined}>
              {CLAIMS.map((c) => <li key={c}>{c}</li>)}
            </ul>
          ))}
        </div>
      </section>

      <LiveMacro />

      {/* ── features ─────────────────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <header className="lp-section__head" data-reveal>
            <p className="lp-eyebrow">One terminal</p>
            <h2 className="lp-h2">From a first look to a <em>tracked position</em></h2>
            <p className="lp-section__lede">
              Research, tracking and practice share one workspace and one record, and every screen is a keystroke
              away: press <kbd className="sys-kbd">G</kbd> then a letter, or <kbd className="sys-kbd">Ctrl K</kbd> to search.
            </p>
          </header>
          <ul className="lp-bento" data-reveal>
            {FEATURES.map((f) => (
              <li key={f.title} className={`lp-bento__card${f.wide ? ' lp-bento__card--wide' : ''}`}>
                <span className="lp-bento__icon" aria-hidden><Icon name={f.icon} size={16} /></span>
                <h3 className="lp-bento__title">{f.title}</h3>
                <p className="lp-bento__text">{f.text}</p>
                {f.viz ? <BentoViz kind={f.viz} /> : null}
                <span className="lp-bento__go" aria-hidden><kbd className="sys-kbd">G</kbd><kbd className="sys-kbd">{f.go}</kbd></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── how ──────────────────────────────────────────────────────── */}
      <section id="how" className="lp-section">
        <div className="lp-container">
          <header className="lp-section__head" data-reveal>
            <p className="lp-eyebrow">How a run is assembled</p>
            <h2 className="lp-h2">The signal is fixed before a word is written</h2>
            <p className="lp-section__lede">
              Four stages, always in this order. The explanation layer reads the engine’s output; nothing
              it writes can change it.
            </p>
          </header>
          <PipelineFigure />
        </div>
      </section>

      {/* ── product ──────────────────────────────────────────────────── */}
      <section id="product" className="lp-section lp-section--panel">
        <div className="lp-container">
          <header className="lp-section__head" data-reveal>
            <p className="lp-eyebrow">The company workspace</p>
            <h2 className="lp-h2">One company, every layer of the evidence</h2>
            <p className="lp-section__lede">
              These are the terminal’s own panels, rendered from one recorded production run — not a mock-up.
            </p>
          </header>
          <ProductTour />
        </div>
      </section>

      {/* ── methodology ──────────────────────────────────────────────── */}
      <section id="methodology" className="lp-section">
        <div className="lp-container lp-method">
          <header className="lp-section__head" data-reveal>
            <p className="lp-eyebrow">Methodology · {q?.modelVersion}</p>
            <h2 className="lp-h2">Five families, one composite, a gated sleeve</h2>
            <p className="lp-section__lede">
              Each factor is normalized with outlier-resistant statistics against the company’s own history
              and volatility, then weighted into its family; the families are weighted into one composite.
              Macro stress scales only the momentum sleeve — value, quality and news are never
              macro-suppressed — and in high-volatility regimes momentum is halved in favor of reversal.
            </p>
          </header>

          <div className="lp-method__grid" data-reveal>
            <div className="lp-families">
              {FAMILY_ORDER.map((f) => {
                const w = q?.weightsUsed[f]
                return (
                  <div key={f} className="lp-family">
                    <div className="lp-family__head">
                      <span className="lp-family__name">{FAMILY_LABEL[f]}</span>
                      <span className="lp-family__w sys-num">{w === undefined ? '—' : `${Math.round(w * 100)}%`}</span>
                    </div>
                    <span className="lp-family__bar" aria-hidden><span style={{ width: `${(w ?? 0) * 100 * 2.5}%` }} /></span>
                    <p>{FAMILY_READS[f]}</p>
                    <p className="lp-family__factors">{byFamily(f).join(' · ')}</p>
                  </div>
                )
              })}
              <p className="lp-note">Weights and factors as used in the recorded run. The momentum gate there was ×{q?.macroGate.toFixed(2)}.</p>
            </div>
            <div className="lp-method__side">
              <div className="sys-panel">
                <header className="sys-panel-head">
                  <div className="sys-panel-head__title">
                    <h3 className="sys-panel-title">Confidence and risk, itemised</h3>
                    <span className="sys-panel-sub">{RECORDED_LABEL}</span>
                  </div>
                </header>
                <div className="sys-panel-body lp-conclusion">
                  <DeterministicConclusion a={run} />
                </div>
              </div>
              <ul className="lp-rules">
                <li><b>Unknown is not zero.</b> A factor that could not be computed is reported as missing and costs confidence.</li>
                <li><b>One source is not agreement.</b> Readings from a single vendor are labeled single-source.</li>
                <li><b>Disagreement is shown, not averaged.</b> Conflicting vendor figures appear side by side.</li>
                <li><b>Stale is not current.</b> Every observation carries its own date.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── news ─────────────────────────────────────────────────────── */}
      <section id="news" className="lp-section lp-section--panel">
        <div className="lp-container">
          <header className="lp-section__head" data-reveal>
            <p className="lp-eyebrow">Latest</p>
            <h2 className="lp-h2">Market news, with its sources</h2>
          </header>
          <MarketNews count={5} />
        </div>
      </section>

      {/* ── pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <header className="lp-section__head" data-reveal>
            <p className="lp-eyebrow">Pricing</p>
            <h2 className="lp-h2">Free to use daily. Pro when you need depth.</h2>
          </header>
          <div className="lp-plans" data-reveal>
            <div className="lp-plan">
              <p className="lp-plan__name">Free</p>
              <p className="lp-plan__price"><span className="sys-num">₹0</span></p>
              <ul>
                <li>{FREE_DAILY_LIMIT} research runs a day</li>
                <li>Full signal, evidence record and synthesis</li>
                <li>Three-month price charts</li>
                <li>Macro conditions from FRED</li>
                <li>Headlines, without article links</li>
              </ul>
              <Link href="/sign-up" className="lp-btn">Start free</Link>
            </div>
            <div className="lp-plan lp-plan--pro">
              <p className="lp-plan__name">Pro</p>
              <p className="lp-plan__price"><span className="sys-num">₹100</span><small>one-time</small></p>
              <ul>
                <li>Unlimited research runs</li>
                <li>Every chart window, one month to five years</li>
                <li>Full article access from the news evidence</li>
                <li>Everything in Free</li>
              </ul>
              <Link href="/start" prefetch={false} className="lp-btn lp-btn--primary">Go Pro in the terminal</Link>
            </div>
          </div>
          <p className="lp-note lp-note--center">Payments through Razorpay. One payment, no renewal.</p>
        </div>
      </section>

      {/* ── faq ──────────────────────────────────────────────────────── */}
      <section className="lp-section lp-section--panel">
        <div className="lp-container lp-faq">
          <h2 className="lp-h2">Questions</h2>
          {FAQ.map((item) => (
            <details key={item.q} className="lp-faq__item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-section lp-final">
        <div className="lp-container lp-final__inner">
          <h2 className="lp-h2" data-reveal>Open a company. <em>Read the evidence.</em></h2>
          <Link href="/start" prefetch={false} className="lp-btn lp-btn--primary">
            Open the terminal<span className="lp-btn__arrow" aria-hidden>→</span>
          </Link>
        </div>
      </section>
      <Atmosphere />
    </div>
  )
}

/** Decoration for the wide feature cards: shapes, not data — no axis, no
 *  figure, nothing a reader could take for a live value. */
function BentoViz({ kind }: { kind: 'rank' | 'lab' }) {
  if (kind === 'rank') {
    const rows = [0.92, 0.78, 0.64, 0.52, 0.38]
    return (
      <svg className="lp-bento__viz" viewBox="0 0 240 132" aria-hidden="true" focusable="false">
        {rows.map((w, i) => (
          <g key={i} transform={`translate(0 ${i * 26 + 4})`}>
            <rect className="lp-bento__viz-dot" x="0" y="4" width="10" height="10" rx="3" />
            <rect className="lp-bento__viz-track" x="22" y="6" width="214" height="6" rx="3" />
            <rect className="lp-bento__viz-bar" x="22" y="6" width={214 * w} height="6" rx="3" />
          </g>
        ))}
      </svg>
    )
  }
  return (
    <svg className="lp-bento__viz" viewBox="0 0 240 132" aria-hidden="true" focusable="false">
      <path className="lp-bento__viz-base" d="M0 96 H240" />
      <path className="lp-bento__viz-area" d="M0 100 C30 92 46 70 72 74 S118 96 140 62 S196 40 240 24 V132 H0 Z" />
      <path className="lp-bento__viz-line" d="M0 100 C30 92 46 70 72 74 S118 96 140 62 S196 40 240 24" />
      <path className="lp-bento__viz-ghost" d="M0 104 C40 100 60 90 92 96 S150 104 176 90 S220 84 240 80" />
      <circle className="lp-bento__viz-end" cx="240" cy="24" r="4" />
    </svg>
  )
}
