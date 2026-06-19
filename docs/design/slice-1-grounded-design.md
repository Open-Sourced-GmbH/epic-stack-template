# Northbound landing — Grounded design spec (Slice ①)

Grounds the [Claude Design handoff](./slice-1-handoff.md) into THIS codebase
before `/to-issues`. Every surface is mapped to real `ui/*` components and
`@theme` tokens; net-new is minimized and assigned a home; the customizer is
reconciled onto Epic Stack's existing SSR theme plumbing (no `localStorage`,
no FOUC).

## Source

- **Handoff:** [`./slice-1-handoff.md`](./slice-1-handoff.md) (Claude Design export, 11 surfaces).
- **PRD:** Linear project "Brand Foundation & Marketing Landing (Slice ①)"
  (`705d4824-8366-4da4-a119-24508e5e9a9e`).
- **Decisions in force:** customizer in scope (memory `theme-customizer-in-scope`);
  audience = clients (memory `landing-audience-clients`); default accent Pine
  `oklch(60% 0.135 172)`.

## Settled this pass (HITL)

1. **Accent foreground = constrain the picker.** Drop the handoff's runtime
   `fgFor()` contrast math. `--primary-foreground` stays a fixed near-white token.
   The Light slider is clamped to a safe band (**L 45–68**); Hue/Chroma stay free.
   The **Volt** preset is retuned darker into the band (no near-white-text break).
2. **Net-new homes — recommended split.**
   - **Foundation (`app/components/ui/*` + styleguide specimen + republish):**
     `Accordion`, `Command` (⌘K palette), `Slider`.
   - **Marketing-local (under `app/routes/_marketing/`, no specimen):**
     `AppFrame`, `CodeBlock`, `Carousel`, `ThemeCustomizer`.
3. **Work images = real static images.** `<ImageSlot>` (drag-drop + localStorage)
   is **removed** entirely; the Work section uses real optimized screenshots of
   the three projects as static assets.

## Foundational reconciliation (applies to every surface)

### Brand accent → the token system (replaces all `bg-[--brand]` arbitrary values)

The handoff scatters `bg-[--brand]`, `text-[--brand]`, `--brand-soft`,
`--brand-glow` as arbitrary values. **Ground them into the token system** so real
utilities (`bg-brand`, `text-brand`, `border-brand`, `ring-brand`, `bg-brand-soft`)
resolve — never hardcode (per
[design-tokens convention](../agents/code-conventions.md#design-tokens)):

- Add to `:root` **and** `.dark` in `app/styles/tailwind.css`:
  ```css
  --brand:      oklch(60% 0.135 172);                                  /* Pine, default */
  --brand-soft: color-mix(in srgb, var(--brand) 13%, transparent);
  --brand-glow: oklch(from var(--brand) l c h / 0.32);
  ```
- **`--primary` follows `--brand`** (`--primary: var(--brand)`), and
  **`--ring: var(--brand)`**. Consequence: the default `<Button>` (`bg-primary`)
  and every `ring-ring` focus state are **already brand-colored** →
  **drop the handoff's `.brand-cta` class entirely**; use plain `<Button>`.
- `--primary-foreground` = fixed near-white (constrained-picker decision).
- Map into `@theme inline` so utilities exist:
  ```css
  --color-brand: var(--brand);
  --color-brand-soft: var(--brand-soft);
  --color-brand-glow: var(--brand-glow);
  ```
- **Foundational → ADR required.** Proposed **ADR 062 — Brand accent token +
  runtime accent customizer** (covers the brand tokens, `--primary` = brand
  default Pine overriding the near-monochrome primary, the constrained picker,
  and the cookie/SSR extension below). Net-new specimen for the accent + the
  three brand tokens added to `app/components/styleguide/specimens.tsx`.

### Customizer persistence → cookie + SSR (NOT localStorage)

The handoff's `ThemeProvider` uses `localStorage` + `useEffect` → would FOUC on
SSR. **Reconcile onto Epic Stack's existing plumbing** (memory:
`theme-customizer-in-scope`; follows [ADR 005 client-pref-cookies](../decisions/005-client-pref-cookies.md)):

- Theme mode already works: `en_theme` cookie (`app/utils/theme.server.ts`) →
  `getTheme(request)` in the root loader → `<html className={theme}>` rendered
  server-side (`app/root.tsx`), no flash. **Keep the existing 3-way switch**
  (`ThemeSwitch` / `useTheme` in `app/routes/resources/theme-switch.tsx`) —
  do not reinvent it.
- **Extend it to carry the accent** (`{l,c,h}`, constrained) and the
  button-cursor pref: add an `en_accent` cookie + server helper alongside
  `theme.server.ts`, read it in the root loader, and render the accent as
  **inline CSS-variable overrides on `<html style>` server-side** (`--brand`,
  `--primary`, `--ring`, `--brand-soft`, `--brand-glow`) → no flash, SSR-correct.
- The `accentVars()` helper survives **without** `fgFor` (constrained picker):
  it maps `{l,c,h}` → the brand vars; `--primary-foreground` is the fixed token.
- Persist via a Conform-backed resource route (mirror
  `/resources/theme-switch`), e.g. `/resources/accent`. Optimistic update like
  `useOptimisticThemeMode`.

### Radius — scope flag

The recorded scope was "accent **+ radius**", but **the handoff's customizer
exposes accent + theme + button-cursor only — no radius control.** Two
consequences for `/to-issues`:
- **Radius customization is deferred** (not designed this pass). Either add a
  radius control later or amend the scope note. Flagged, not silently dropped.
- The handoff's arbitrary radii (cards 16px, tiers/dock 18px, palette 14–16px,
  pills 999px, icon tiles 8–12px) are **mapped to the Foundation scale**, not
  hardcoded: cards/app-frames/palette → `rounded-xl`; pills/chips/tags →
  `rounded-full`; inputs/buttons → `rounded-md` (already); icon tiles →
  `rounded-lg`. If the larger 16–18px card look is wanted, that's a small
  foundational `--radius` bump folded into ADR 062 — call it out, don't inline px.

## Grounded UI

### 1. Header / Nav  — *marketing-local*
- **Logo mark / nav shell** → plain JSX, tokens: `bg-brand`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `backdrop-blur` over
  `color-mix(... var(--background) ...)`.
- **Animated underline / scrollspy active link** → `text-brand` + `after:bg-brand`;
  active state from an IntersectionObserver (progressive enhancement).
- **Theme cycle button** → reuse `ThemeSwitch` (existing 3-way light/dark/system);
  render its `Sun`/`Moon`/`Monitor` via the `Icon` component (existing icon set),
  not raw `lucide-react`, where an equivalent icon exists.
- **"Start a project" CTA** → `<Button>` (default = brand).
- States: default/scrolled(border)/hover/active/mobile(<780px)/dark — all token-driven.

### 2. Hero  — *marketing-local*
- **Headline / lead / eyebrow** → type via the `@theme` scale + the handoff's
  `clamp()` display sizes; `text-balance`/`text-pretty`; eyebrow `text-brand`.
- **CTAs** → `<Button size="lg">` + `<Button size="lg" variant="outline">`
  (drop `.brand-cta`).
- **Product panel (forced `.dark`)** → `bg-card`, `text-card-foreground`,
  `border-border`, progress fill `bg-brand`; brand glow via `bg-brand-glow`.
- **"All checks passed" chip** → `Icon` check on `bg-brand`.
- States: entrance/breathing-glow/progress-fill/mobile(<880px)/**reduced-motion
  (final state shown)** — entrance gated on `prefers-reduced-motion: no-preference`
  + `data-in`; SSR renders the resting state.

### 3. How it works (timeline)  — *marketing-local*
- **Step nodes / connector / body** → `bg-brand-soft`, `text-brand`,
  `border-border`, `bg-muted`/`text-muted-foreground` duration chip.
- States: scroll-reveal per row (`.in` toggle), mobile stack, reduced-motion
  (all visible, no draw).

### 4. Services + Work  — *marketing-local*
- **Service cards** → `<article>` with `bg-card`, `border-border`, hover lift +
  `hover:border-brand`-tint; icon tile `bg-brand-soft`/`text-brand`. `Icon` set.
- **Work cards** → **real static `<img>`** screenshots (ImageSlot removed),
  optimized assets; domain link `text-brand` with arrow nudge. Real projects:
  opensourced.ch, xiquell.ch, livediag.com (**replace the placeholder Livediag
  one-liner** — handoff §6 action item).
- States: hover/scroll-reveal-stagger/mobile(<820px 1-col)/dark.

### 5. Code sample (proof-of-craft)
- **Left = `CodeBlock`** (*marketing-local, net-new*): static highlighted `<pre>`
  + copy button. Needs a **scoped** code-syntax palette (`--code-bg`, `--code-text`,
  `--tk-*`) — **not foundational**, lives with the component (no ADR); document
  it in the component, not the global token table.
- **Right = live render** → real Foundation parts: `Label` + `Input`,
  `Checkbox` (`onCheckedChange`), `<Button>` — inside `bg-card`/`border-border`.
  This is the craft proof: it's the actual DS components.
- States: copy idle→"Copied"(1.6s, `Icon` check), stacks <900px, dark, reveal.

### 6. Live component playground  — *`Carousel` marketing-local, net-new*
- **`Carousel`** (tabs + arrows + autoplay progress + height-animate) wraps slides
  that compose **real Foundation parts**: `Input`, `Label`, `Checkbox`, `Textarea`,
  `InputOTP`+`InputOTPGroup`+`InputOTPSlot`, `Button`, `StatusButton`
  (idle→pending→success), `Tooltip`, `DropdownMenu`. Wrap in **`AppFrame`**
  (*marketing-local*).
- Tokens: `bg-brand-soft`/`text-brand` active tab, `bg-brand` fill, `border-border`.
- States: 3 slides/tab+arrow/autoplay 7s/pause-on-hover+play-pause/height-animate/
  onboarding sub-states/mobile/**reduced-motion (no autoplay)**/dark.

### 7. ⌘K command palette  — *`Command` → Foundation `ui/*`, net-new*
- New `app/components/ui/command.tsx` (the standard `cmdk` primitive is the
  expected base; full keyboard nav ↑↓ wrap / ↵ / esc, grouped results, fuzzy
  filter). Tokens: `bg-popover`/`text-popover-foreground`, `border-border`,
  selected row `bg-brand-soft` + icon `bg-brand`.
- **Empty / no-match** → suggested-action chips (Create project, Invite, Toggle
  theme, Contact support); running an action fires a `sonner` **toast** (existing,
  [ADR 027](../decisions/027-toasts.md)).
- **Convention note:** this is a transient **client overlay**, not a navigable
  route — it is a deliberate exception to
  [ADR 023 route-based dialogs](../decisions/023-route-based-dialogs.md)
  (not content-bearing or bookmarkable; the cmdk pattern). Note it in the issue.
- a11y per `epic-ui-guidelines`: `role="dialog"`, focus management, `aria` labels.
- Specimen added to the styleguide; republish via `pnpm design-sync:prepare` → `/design-sync`.

### 8. FAQ accordion  — *`Accordion` → Foundation `ui/*`, net-new*
- New `app/components/ui/accordion.tsx` (Radix `@radix-ui/react-accordion` is the
  idiomatic base — compound, accessible, matches the DS's Radix convention).
  Single-open; `aria-expanded`/`aria-controls`; grid-rows `0fr→1fr` height anim;
  plus icon `rotate-45` → `bg-brand`. Tokens: `border-border`, `text-brand` hover,
  `ring-brand`/`outline-[--ring]` focus-visible.
- States: collapsed(item 0 open)/open/hover/focus-visible/mobile/dark/reduced-motion.
- Specimen added; republish.

### 9. Theme customizer (floating dock)  — *marketing-local, net-new*
- `ThemeCustomizer` route feature wired to the **cookie+SSR provider above** (not
  localStorage). Controls: accent preset swatches, **Hue/Chroma/Light sliders**
  (Light clamped 45–68), 3-way theme segment (reuse `useTheme`/`ThemeSwitch`
  logic), button-cursor segment. Live re-theme + persist via the `/resources/accent`
  resource route (Conform).
- **Sliders → `Slider` → Foundation `ui/*`, net-new** (Radix
  `@radix-ui/react-slider` for a11y; reusable). Specimen added; republish.
- Segmented control → compose from `<Button>`s / tokens (not a new primitive).
- Tokens: `bg-card`/`border-border`, active swatch `outline-foreground`, dock
  `bg-brand` swatch. States: minimized FAB / expanded / active-preset-ring /
  reduced-motion.

### 10. Final CTA  — *marketing-local*
- Brand-gradient band derived from `oklch(from var(--brand) …)`; `text-white` on
  band is acceptable (literal `#fff`/white on the dark brand gradient, per handoff).
  Buttons: light button + ghost. States: hover/reveal/mobile/dark (band stays
  brand-derived + readable).

### 11. Footer  — *marketing-local*
- Tokens: `border-border`, `text-muted-foreground`, `text-foreground/80`,
  `hover:text-brand`. States: hover/mobile(<820px 2-col)/dark.

### Pricing (referenced in assembly, under-specified in handoff)
- 3-tier CHF grid (Sprint · **Project** featured · Embedded), featured tier ringed
  in `ring-brand`, `rounded-xl`. **Flag:** only a one-line note in the handoff —
  `/to-issues` should treat it as a thinner spec (states: default/hover-lift/
  featured-emphasis/mobile 1-col/dark) or schedule a focused design pass.

## Net-new

### Components
- **`app/components/ui/accordion.tsx`** — Radix accordion. No existing fit (FAQ).
  Specimen: open/collapsed + single-open behavior.
- **`app/components/ui/command.tsx`** — `cmdk`-based ⌘K palette. No existing fit.
  Specimen: default + empty/no-match states.
- **`app/components/ui/slider.tsx`** — Radix slider. No existing fit (customizer).
  Specimen: default + gradient-track variant.
- **Marketing-local (no specimen, under `app/routes/_marketing/`):** `AppFrame`,
  `CodeBlock`, `Carousel`, `ThemeCustomizer`, plus the `useReveal` hook + `.rv`
  global rule. `ImageSlot` **removed**.

### Tokens
- **Foundational (ADR 062):** `--brand`, `--brand-soft`, `--brand-glow` (+ `@theme
  inline` `--color-brand*` utilities); `--primary` = `--brand` (default Pine);
  `--ring` = `--brand`; fixed near-white `--primary-foreground`. Defined in `:root`
  + `.dark`. Specimen added to `specimens.tsx`; republish.
- **Scoped (no ADR, live with their component):** CodeBlock syntax palette
  (`--code-bg`, `--code-text`, `--tk-keyword|string|tag|attr|punc`); palette-demo
  invoice status colors (`--state-paid`, `--state-overdue: var(--destructive)`).

## Convention notes
- **SSR-first:** all motion is progressive enhancement, gated on
  `prefers-reduced-motion: no-preference`; resting state renders server-side. The
  customizer applies accent **server-side from a cookie** (no FOUC) — the one hard
  reconciliation vs the handoff's `localStorage`.
- **Cookies:** `en_theme` (existing) + new `en_accent`, per
  [ADR 005](../decisions/005-client-pref-cookies.md).
- **Forms:** customizer + theme persistence via **Conform** resource routes
  (mirror `/resources/theme-switch`).
- **Dialogs:** ⌘K palette is a deliberate client-overlay exception to
  [ADR 023](../decisions/023-route-based-dialogs.md) — note in its issue.
- **Toasts:** command actions use the existing `sonner` toaster
  ([ADR 027](../decisions/027-toasts.md)).
- **Icons:** prefer the `Icon` component + existing icon set; add SVGs to the
  generated set ([ADR 020](../decisions/020-icons.md)) rather than
  importing `lucide-react` ad hoc.
- **New ADR proposed:** **062 — Brand accent token + runtime accent customizer.**
- **Accessibility:** per `epic-ui-guidelines` for Accordion, Command, Slider.
- **Re-publish gate:** the three new `ui/*` components + the accent/brand specimens
  must land in `specimens.tsx` and be pushed via
  `pnpm design-sync:prepare` → `/design-sync` so the styleguide stays source of truth.

## Open flags for /to-issues (not silently dropped)
1. **Radius customization** was in recorded scope but **not designed** — defer or
   amend scope.
2. **Pricing** surface is under-specified — thin spec or a focused design pass.
3. **Livediag** copy is a placeholder — needs a real one-liner.

## Ready for /to-issues
The design is grounded: every surface maps to real `ui/*` components and `@theme`
tokens, net-new is minimized to 3 Foundation components + 4 marketing-local pieces
+ one foundational token set (ADR 062), and the customizer is reconciled onto the
existing cookie/SSR theme plumbing. Sliceable.
