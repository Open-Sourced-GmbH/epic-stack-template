# Brand Accent Token + Runtime Accent Customizer

Date: 2026-06-18

Status: accepted

## Context

Slice ① introduces a brand identity for the marketing landing and a user-facing
customizer that re-themes the page live. The Claude Design handoff expressed the
accent as scattered arbitrary values — `bg-[--brand]`, `text-[--brand]`,
`--brand-soft`, `--brand-glow` — and shipped a `.brand-cta` class to paint the
primary button, on top of a `ThemeProvider` that read the accent from
`localStorage` in a `useEffect`.

Two problems with taking that literally:

1. **The accent had no home in the token system.** Arbitrary `bg-[--brand]`
   values bypass the design-tokens convention (`docs/agents/code-conventions.md`
   — never hardcode colors; the `/styleguide` route is the source of truth). The
   accent must inherit from one source, like every other semantic color.

2. **The stock primary is near-monochrome.** Epic Stack's `--primary` is a dark
   slate, so a branded button needed a bespoke `.brand-cta` override — a second
   way to say "primary," guaranteed to drift.

The grounded design also recorded the scope as "accent **+ radius**," but the
handoff's customizer exposes accent + theme + button-cursor only.

## Decision

- **The accent is a token, defined once.** `--brand`, `--brand-soft`,
  `--brand-glow` live in both `:root` and `.dark` in `app/styles/tailwind.css`.
  The default is **Pine** `oklch(60% 0.135 172)` (locked at grounding).
  `--brand-soft`/`--brand-glow` derive from `--brand` via `color-mix()` /
  `oklch(from …)`, so one edit re-tints the whole accent. The accent is
  mode-independent (the same Pine in light and dark), so `.dark` needs no brand
  variant beyond the definition.

- **`--primary` and `--ring` follow `--brand`.** `--primary: var(--brand)` and
  `--ring: var(--brand)`. Consequence: the default `<Button>` (`bg-primary`) and
  every `ring-ring` focus state render in the brand accent **with no component
  edits** — the handoff's `.brand-cta` class is unnecessary and is dropped. This
  overrides Epic Stack's near-monochrome primary.

- **`--primary-foreground` is a fixed near-white token**, in both modes
  (`.dark`'s old dark-on-light pairing would be unreadable on the Pine button).
  This is the **constrained-picker** decision: the customizer only offers accents
  that read well against near-white, so there is **no runtime `fgFor()` contrast
  math** — the foreground is a constant, not a computed value.

- **Utilities are exposed via `@theme inline`.** `--color-brand`,
  `--color-brand-soft`, `--color-brand-glow` map the raw vars into Tailwind, so
  `bg-brand` / `text-brand` / `border-brand` / `ring-brand` / `bg-brand-soft` /
  `bg-brand-glow` resolve as real utilities — replacing every `bg-[--brand]`
  arbitrary value in the handoff.

- **A styleguide specimen records the accent.** A `brand-accent` specimen in
  `app/components/styleguide/specimens.tsx` renders the accent and the three
  brand tokens, so the published design system reflects them (republished via
  `pnpm design-sync:prepare` → `/design-sync`).

- **The runtime customizer rides Epic Stack's cookie plumbing, not
  `localStorage`.** The per-request accent override is serialized to an
  `en_accent` cookie and rendered as inline CSS-variable overrides on
  `<html style>` server-side (following [ADR-005](005-client-pref-cookies.md),
  mirroring the `en_theme` no-flash pattern) — SSR-correct, no FOUC. An
  `accentVars()` helper maps `{l, c, h}` → the brand vars; `--primary-foreground`
  stays the fixed token. (The cookie/SSR/customizer surface itself is built in
  the follow-on issues; this ADR records the contract they implement.)

## Consequences

- **One source of truth for the accent.** Re-theming — at design time or at
  runtime — is a change to `--brand`; `--primary`, `--ring`, `--brand-soft`, and
  `--brand-glow` follow. No component knows the brand color.

- **`.brand-cta` is gone.** Branded CTAs are plain `<Button>`; there is one way
  to say "primary."

- **The drift guard now recognizes aliased and mixed color values.** Because
  `--primary`/`--ring` are `var()` aliases and `--brand-soft` is a `color-mix()`,
  `specimens.test.ts` was widened to treat `oklch()`, `color-mix()`, and `var()`
  as color values; the three `brand*` tokens are curated as covered by the
  dedicated `brand-accent` specimen, so a new token is still never silently
  dropped.

- **No runtime contrast math.** The constrained picker keeps the foreground a
  fixed near-white. Accent presets that would break near-white text (e.g. a
  light "Volt") are retuned darker into the readable band rather than triggering
  `fgFor()`.

- **Radius is deferred, not dropped.** The recorded "+ radius" scope is not built
  this pass — the customizer exposes accent + theme + button-cursor only. The
  handoff's arbitrary radii are mapped to the Foundation `--radius` scale
  (`rounded-md`/`lg`/`xl`/`full`), not inlined. A radius control or a
  foundational `--radius` bump can be added later as an amendment.

- **Guard against regression.** Reintroducing `bg-[--brand]` arbitrary values (or
  a `.brand-cta` class) instead of the `bg-brand`/`<Button>` token utilities, or
  reading the accent from `localStorage` instead of the `en_accent` cookie,
  re-opens the duplication closed here.
