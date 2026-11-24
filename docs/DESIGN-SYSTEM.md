# FinSignal design system — Nocturne

One set of tokens, one component layer, enforced by tests. The tokens live in
`dashboard/src/styles/tokens.css`; the shared components and their styles in
`dashboard/src/components/system/` and `dashboard/src/styles/system.css`.
`dashboard/src/styles/overdrive.css` is the finish layer, loaded last from
`app/layout.tsx`: it holds the cross-cutting decisions below (light, glass,
depth, the signal accent, display type) so they apply to every screen at once
rather than being repeated per page. Older class families in
`dashboard/src/app/globals.css` resolve to the same tokens through aliases
(`--bg`, `--text`, `--line`…).

Nocturne replaces the earlier flat greyscale "Graphite" finish. The structure,
the component layer and every rule the tests hold are unchanged; what changed
is the palette, the type, and how surfaces are lit.

---

## Principles

1. **One signal, never on data.** The interface has one interaction colour, a
   violet "signal" (`--accent`, and `--grad-signal` for the primary action). It
   marks selection, focus, the primary action and the brand. It is never a data
   state, so it can never be confused with a gain, a loss or a warning, which
   keep their semantic colours.
2. **Light with a source.** Depth tells a reader what sits above what: a raised
   surface catches a hairline of light on its top edge (`--edge-hi`) and casts a
   soft shadow (`--lift-1`); the primary action is lit from below
   (`--glow-signal`); a faint ambient glow (`--aurora-*`) sits behind the hero,
   the sign-in screen and the top of the terminal workspace. None of it sits
   under a figure strongly enough to tint it.
3. **Glass chrome, solid content.** The site header, the terminal top bar, the
   sticky workspace tabs and overlays (palette, dialogs, sign-in panel) are
   translucent with a backdrop blur over what scrolls beneath them. Panels,
   tables and anything holding data are opaque.
4. **Display type for headlines only.** Headlines, page titles and the wordmark
   are set in Sora; the interface, prose and every figure stay in Inter. A
   headline's emphasis is the brand gradient (`--grad-brand`) set as text, not
   a second face.
5. **Quiet labels.** Labels, panel titles, table heads, badges and states are
   sentence case. Small tracked capitals are kept for navigation group labels,
   page eyebrows in the terminal and short literal tags that are codes
   (`STALE`/`LIVE`, `DEFAULT`, `RECORDED`, the paper ribbon).
6. **Figures line up.** Every figure that can sit above another uses tabular,
   slashed-zero numerals. Prose never does: Inter's tabular feature widens the
   hyphen, so "post-earnings" set tabular reads as "post - earnings".
7. **A row keeps one line.** A table row shows its figures and one or two direct
   actions; the rest are one press away in an `ActionMenu`.

## Foundations

### Colour

Dark is the default; light is an explicit choice made with the theme toggle
(`html[data-theme='light']`). Dark is an ink-navy with a faint indigo cast;
light is a cool porcelain.

| Role | Dark | Light |
|---|---|---|
| Page (`--p-base`) | `#07080f` | `#f5f6fb` |
| Panel (`--p-panel`) | `#0d1020` | `#ffffff` |
| Raised / hover (`--p-raised`, `--p-hover`) | `#121629` / `#171c33` | `#fafbfe` / `#f0f2f9` |
| Rule / strong rule (`--rule`, `--rule-strong`) | `#1b2036` / `#283050` | `#e3e6ef` / `#cfd4e2` |
| Ink / muted / faint | `#eceef8` / `#a9b0c9` / `#8f97b3` | `#0c1022` / `#454c66` / `#575f7a` |
| Accent (`--accent`) | `#a596ff` | `#5a43e6` |
| Primary action (`--grad-signal`) | `#7357ff → #5b4cf0 → #4a55ea` | `#6a4cf5 → #5a43e6 → #4a4fdc` |

Text on the signal gradient is `--on-signal` (white), which clears 4.5:1 on
every stop of the gradient in both themes; text on a flat accent fill is
`--on-accent` (the panel colour). The browser `theme-color` (`lib/theme.ts`)
equals `--p-base`, and the sign-in widget's accent literal
(`lib/clerk-appearance.ts`) equals the light `--accent`; all of it is held by
tests.

Semantic colour carries meaning, and every value that carries a state reads it
from a token:

| Token | Dark | Light | Means |
|---|---|---|---|
| `--e-pos` | `#3ecf8e` | `#0f7a4c` | positive · verified · healthy |
| `--e-neg` | `#ff6b6b` | `#c22f2f` | negative · failure · high risk |
| `--e-warn` | `#f2b552` | `#8f5a06` | partial · degraded · stale · uncertain |
| `--e-null` | `#8d93a8` | `#5f6478` | unavailable · not reported |
| `--e-info` | ink-muted | ink-muted | informational |

Research and data states (`live`, `stale`, `waking`, `unavailable`, `blocked`,
`paper`, `recorded`, …) each have a `--s-*` token that aliases one of these, so
a state looks the same everywhere it appears. The `<Status>` chip renders them;
`/terminal/handbook` keys every one in words.

### Light, glass and depth

| Token | Use |
|---|---|
| `--edge-hi` | 1px inner highlight on the top edge of a raised surface |
| `--lift-1` | the soft shadow of a panel or card |
| `--grad-edge` | a sheen over a panel's upper part, layered above `--p-panel` |
| `--glow-signal` | the light under the primary action and the logo tile |
| `--glass`, `--glass-chrome`, `--glass-edge` | translucent chrome and its edge |
| `--aurora-1/2/3` | ambient light: violet, indigo, a trace of green |
| `--grid-line` | the faint grid under the hero, the closing call and sign-in |
| `--grad-brand` | headline emphasis set as text |

Ambient motion (the aurora drift, the eyebrow pulse, the principles marquee) is
switched off under `prefers-reduced-motion`; the marquee then becomes a still,
centred line.

### Type

| Token | Face | Use |
|---|---|---|
| `--font-display` | Sora | headlines, page titles, the wordmark |
| `--font-sans` | Inter | interface and prose |
| `--font-mono` | Inter, tabular | figures, prices, counts (`.num`, `.sys-num`) |
| `--font-code` | IBM Plex Mono | keyboard keys, ids, hashes, dataset and version strings |
| `--font-serif` | Newsreader | retained for long-form reading surfaces |

`--font-mono` keeps its name because many rules reference it, but it means
"figure", not "monospace": Inter with `tabular-nums slashed-zero` aligns
columns without a typewriter face. Sizes come from the `--t-*` scale (10px
floor; inputs are 16px on touch screens so iOS does not zoom). Weights are
400–700. Panel titles are 600 at `--t-body`; metric-strip figures are 600 at
`--t-title`.

### Negative numbers

A negative figure is printed with U+2212 MINUS SIGN (`−3.4%`), never the
hyphen-minus: in a tabular figure font the hyphen keeps its short glyph in a
digit-wide cell and reads as "- 3.4%". `lib/format.ts` owns it —
`typographicMinus()` inside every central formatter (`fmtNum`, `fmtPct`,
`fmtPctRaw`, `fmtSigned`, `fmtPrice`, `quantity.format()` behind `<Value>`),
and `typographicMinusInText()` for sentences the backend composes ("hist
-3.193"), which converts only a hyphen that begins a number. Values are never
converted in service or calculation code, and display text is never parsed
back into a number. A symbol unit (`%`, `×`) sits against its figure; a word
unit (`MB`, `bp`) keeps a gap.

### Space, radius, layers, motion

Spacing is the `--d-*` scale on a 4px base, with a 2px half-step for dense
tables and chips; odd pixel values fail a test. Radii are `--r-xs/sm/md/lg` (4, 8, 12 and 18px).
Stacking layers are named (`--z-*`) and ordered so a menu sits above a drawer
and the palette above a toast. Transitions use `--t-fast/med/slow` with one
easing curve, and a hover that moves anything is gated on
`(hover: hover) and (pointer: fine)`. Breakpoints come from a fixed list held by
a test (480, 560, 640, 720, 760, 860, 900, 980, 1023, 1100, 1180, 1280).

---

## Components

| Component | Use |
|---|---|
| `Workbench` | Page frame for every terminal route: title, subtitle, context rail |
| `Panel` | A titled surface; the header title never wraps, the subtitle gives way and stacks under it on phones. A badge is sentence case |
| `Strip` | A row of figures inside a panel, separated from the prose around it |
| `Value` | Every number: one formatter (`lib/quantity.ts`) per kind — currency, percent, count, ratio — and an em dash, never a zero, when absent |
| `Status` | A state chip with its meaning as its title; the label is shown in sentence case whatever the source casing |
| `StateBlock` / `EmptyLine` | Loading, unavailable, blocked (signed out, not permitted) and empty states, each in words; `EmptyLine` stacks a title over its explanation |
| `ActionMenu` | A row's secondary actions behind one button: a real menu (arrows, Home/End, Escape returns focus), positioned against the viewport so a scrolling table cannot clip it. Items are actions, links, group labels and separators; a destructive item is `tone: 'danger'` and opens an inline confirm rather than acting. It flips above its button near the bottom edge, stays inside the viewport, supports type-ahead, and below 640px is a bottom sheet with 44px items. `size="sm"` (24px) beside row buttons, `"md"` beside regular controls |
| `Table` / `DataTable` / `.sys-table` | Tables; figures right-aligned and tabular, wide tables scroll inside `.sys-scroll-x`, never the page. At 640px and below the tracker and alert tables become one card per row |
| `Drawer` | Side panel for editors and tickets; focus moves in, Escape closes, focus returns |
| `Inspectable` / `.sys-inspectable` | A value that opens its provenance; the touch area is enlarged on coarse pointers |
| `.sys-btn` (`--primary`, `--danger`, `--xs`, `--micro`, `--icon`), `.sys-input`, `.sys-seg` | Controls; at least 32px on touch screens. Primary is the signal gradient with white text; danger is the negative tone and is used only to confirm |

Times are shown in UTC with the zone named (`formatMoment`), or as a date for a
session close. A figure from a broker, a vendor or a recorded run says which.

### Density

Every panel is one container: a 38px head (13px semibold title, subtitle,
end actions) and a 12px body; figures in a strip are 20px semibold, worded
values 15px and allowed to wrap. Sections inside a panel are set off by a
rule, not by a nested card. The legacy `.panel--pad` / `.h-panel` pair is
aligned to the same 16px padding and 13px title. A note inside a flush panel
keeps the panel's padding. Explanations are never line-clamped.

Buttons: 28px default, 24px `--xs`, 32px `--lg`; an icon button is square at
its size; on coarse pointers the minimum is 36/32px. One focus ring
(2px `--rule-focus`) on every control.

### Screen patterns

- **Tracker (watchlists).** Lists on the left; the selected list framed as one
  panel. Each row: symbol (with tags, note and an alert count), price, change,
  period return, trend, quote freshness with its source and time, research, then
  "Set alert" and an `ActionMenu` (paper order, note and tags, move, move to
  list, remove).
- **Alerts.** Counts above the work; alerts and the notification inbox in the
  main column, the new-alert editor beside them (stacked below 980px). Deleting
  an alert takes a second, explicit step.
- **System health.** A one-sentence verdict, the summary strip, process
  figures, then components in three groups decided by the report's own
  flags: critical and not ready ("limits research output"), optional and not
  fully running (research continues; an unconfigured optional provider is a
  choice, not an outage), and ready.
- **Portfolio.** Positions is a system panel: a labelled form row, the table
  flush, fractional shares exactly as held, "Edit" plus a menu with an inline
  confirm to remove; on phones each holding is a card. Portfolio intelligence
  is one panel of ruled sections, each labelled with what kind of figure it
  holds (derived from weights, measured from closes, engine score).
- **Company workspace.** A flat header (no sector art); the verdict strip
  shows every explanation in full; the decomposition separates factors
  raising the composite from those lowering it.
- **First run.** A user with no watchlist gets a panel that says what a list
  does and a primary action that creates one (empty — symbols are theirs to add).

## Rules the tests hold

`dashboard/tests/` fails the build for: an undefined token, an off-scale font
size, weight, radius, letter-spacing or transition; odd-pixel spacing; a
breakpoint off the list; a CSS class nothing reaches; an ungated moving hover; a
dialog without focus handling; a generic element given a name without a role; a
number or date formatted in the viewer's locale; a `theme-color` or sign-in
accent that drifts from its token; a badge class missing from `system.css`; and
a new hand-built table that has not been checked in the rendered DOM.
