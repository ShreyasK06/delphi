# delphi style guide

The single source of truth for all UI work on this app. Every new screen, component, or tweak
must follow these rules. Decided with the product owner on 2026-06-10.

## Brand personality

Professional first, warm second. delphi should feel like a sharp financial tool that happens to
be friendly — not a toy. Personality comes from copy, color, and generous spacing, not from
decoration.

## Color — "money greens"

All colors are defined as semantic tokens in `src/index.css` using `light-dark()`, so dark mode
follows the OS automatically. **Never hardcode Tailwind palette colors (`slate-*`, `indigo-*`,
`emerald-*`) in components — always use the tokens.**

| Token | Use for |
|---|---|
| `canvas` | page background |
| `surface` / `surface-2` | cards / muted fills, progress tracks, hovers |
| `ink` / `ink-mid` / `ink-faint` | headings & key numbers / body & labels / hints & captions |
| `line` / `line-strong` | card borders / input borders |
| `brand`, `brand-strong`, `brand-soft`, `brand-line`, `brand-ink`, `on-brand` | primary actions, links, highlights, callouts |
| `ok-*`, `warn-*`, `bad-*`, `info-*` | semantic status (each has base, `-soft`, `-line`, `-ink`) |

Rules:
- Primary actions are `bg-brand text-on-brand`, hover `bg-brand-strong`.
- Status colors encode meaning only: ok = on track/positive, warn = caution, bad = over/negative,
  info = neutral notices. Never use them decoratively.
- Callout boxes: `bg-{x}-soft border-{x}-line text-{x}-ink`.
- The sidebar and landing/onboarding shells are always-dark forest green (`#04231c` family with
  white/alpha internals) in both light and dark mode — they are brand chrome, not themed surfaces.

## Typography

- **Display (headings h1–h3, big numbers):** Space Grotesk, weights 500–700. Applied globally
  via a CSS rule on `h1,h2,h3` and the `font-display` utility.
- **Body (everything else):** Inter, weights 400–700.
- Both loaded from Google Fonts in `index.html`.
- Base body size is **14px** (`text-sm`); page titles `text-2xl`, card titles `text-sm uppercase
  tracking-wide` section labels, hero numbers `text-4xl`+.
- Never go below 11px (`text-[11px]`) anywhere.

## Emoji policy

**Very minimal — professional look.**
- ❌ Never in: navigation, page titles, card headers, buttons, badges, table content, empty states.
- ✅ Allowed sparingly in: coach chat messages and milestone celebration banners (one per message max).
- Functional glyphs are always SVG icons from `src/components/icons.tsx` — add new icons there
  (18px, stroke 2, lucide-style outline).

## Motion

**Subtle in the app, playful on the landing page.**
- ✅ Allowed everywhere: one-shot entrance fades (`animate-fade-up`, `animate-pop`), hover/active
  transitions (color, border, slight scale on press), loading indicators (`animate-pulse` on
  genuine loading).
- ✅ **Landing page only** (the marketing surface, `src/pages/Landing.tsx`): floating preview
  cards (`animate-float*`), drifting gradient blobs (`animate-blob*`), the feature marquee
  (`animate-marquee`), and pointer parallax.
- ❌ Banned inside the app (everything behind login): looping/floating decoration, parallax,
  scroll-triggered effects, confetti.
- Always respect `prefers-reduced-motion` (already handled globally in `index.css`).

## Surfaces & shape

- Cards: `bg-surface border border-line rounded-2xl p-6` (16px radius). No shadows except the
  sidebar/popup chrome (`shadow-2xl` is reserved for floating chrome: sidebar, coach widget).
- The one glass flourish: the floating sidebar (and coach widget header) — dark forest green,
  `backdrop-blur-xl`, `rounded-3xl`, white/10 borders. Nothing else gets glassmorphism.
- Inputs: `rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm`, focus ring
  `focus:ring-2 focus:ring-brand`.
- Pills/badges: `rounded-full px-2.5 py-0.5 text-xs font-medium` with status soft/ink colors.

## Layout

- App shell: floating sidebar (fixed, left-4 top-4 bottom-4, w-60) + `md:ml-[17rem]` main column,
  `max-w-3xl` content width.
- **Dashboard-style pages are a single-column feed**: cards stacked in priority order, `space-y-5`.
  No two-column card grids. (Small stat tiles may sit in one `grid sm:grid-cols-3` row, and
  quick-action tiles in one row of 4 — those are rows, not column layouts.)
- Page header pattern: `h1 text-2xl font-bold` + one-line `text-sm text-ink-faint` subtitle.
- Mobile: sidebar becomes a sticky translucent top bar with horizontal icon nav.

## Dark mode

- Implemented with `light-dark()` tokens resolved against the root `color-scheme`.
- Users pick system / light / dark via the sidebar toggle (`src/hooks/useTheme.tsx`), which sets
  `document.documentElement.style.colorScheme`. Default is system.
- Adding any new color = add a token pair in `index.css`, never a one-sided hex.
- Mental test for every change: "would this read on a near-black canvas?" If a color is
  hardcoded, the answer is no — tokenize it.

## Copy & content

- Voice: financially-savvy older peer. Direct, warm, zero shame. Sentence case everywhere
  (headings, buttons, labels) — never Title Case or ALL CAPS except the small uppercase
  tracking-wide section labels.
- **No em dashes (—) anywhere in user-facing copy.** Restructure with commas, periods, or
  parentheses instead. (This file is documentation, not UI copy, so dashes here are fine.)
- Always ground advice in the user's actual numbers; never generic tips.
- Numbers: `fmtMoney()` for currency (whole dollars), explicit units (`/mo`, `/week`).
- Product names: the app is **delphi** (always lowercase, wordmark rendered as `delphi.` with an
  emerald dot). Features use simple names: "Extra Cash" (not windfall), "Invest",
  "Discounts".

## Code conventions

- Tailwind utility classes with the semantic tokens above; no inline `style` for colors.
- Reusable visual patterns live in components (`ScoreCard`, `BudgetTable`, …) — extend those
  before inventing new card styles.
- Icons: extend `src/components/icons.tsx`; never emoji-as-icon, never an icon font.
