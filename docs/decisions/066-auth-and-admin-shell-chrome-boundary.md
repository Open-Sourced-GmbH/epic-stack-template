# Auth & Admin Shell Chrome Boundary

Date: 2026-06-23

Status: accepted (amended by [067](067-unified-app-chrome-and-whole-product-accent-showcase.md) — the admin shell now exposes the accent preset picker; auth stays toggle-only and neither mounts the marketing customizer dock)

## Context

Slice ③ reskins the auth (`_auth/`), account/settings (`settings/profile/`), and
admin (`admin/`) surfaces to the Pine brand. The Claude Design handoff
(`docs/design/design_handoff_pine_restyle/`) gives auth a **centered branded card
shell** (logo tile + eyebrow + footer + in-shell theme toggle) and admin a **left
nav rail shell** (logo lockup + Blog/Cache rail + branded `PageHeader`).

Neither shell exists today:

- The auth routes (`login.tsx`, `signup.tsx`, `onboarding/`, `verify.tsx`, …) are
  **flat** — there is no `_auth.tsx` pathless layout; each route renders its own
  centered box.
- The admin routes (`admin/blog/`, `admin/cache/`) are **flat** — there is no
  `admin/_layout.tsx`; there is no shared admin chrome at all.
- `settings/profile/` **does** already have a `_layout.tsx`, so settings is
  restyled in place and is not part of this decision.

The repo already has marketing chrome — `_marketing/__app-frame.tsx` and
`__layout.tsx` (header/footer, command palette, the accent customizer dock). The
tempting move is to reuse `__app-frame` for the new auth/admin shells. Two forces
push the other way:

1. **The surfaces are deliberately chrome-light.** Auth and admin are focused task
   surfaces — the handoff excludes the marketing header/footer entirely (auth is a
   bare centered card; admin is a minimal rail). Wrapping them in `__app-frame`
   would mean immediately stripping most of what it provides.
2. **The accent customizer must not appear here.** `__app-frame` mounts the
   marketing theme/accent customizer dock. Per ADR-062 the runtime accent
   customizer is a **marketing-only showcase**; these surfaces get a theme
   **toggle** (light/dark) but never the hue slider. Reusing `__app-frame` would
   drag the customizer onto auth/admin and force a carve-out.

## Decision

- **Two new, standalone shell layouts**, not a fork or reuse of
  `_marketing/__app-frame`:
  - an **auth shell** — a shared pathless layout for `_auth/` rendering the
    centered-card chrome (brand radial background, logo tile, in-shell theme
    toggle), and
  - an **admin shell** — a shared `admin/` layout rendering the left nav rail +
    branded `PageHeader`.
- **The customizer boundary is hard.** These shells expose a light/dark theme
  **toggle** only (server-applied via the `en_theme` cookie, ADR-005). They do
  **not** mount the accent customizer dock — the hue slider stays marketing-only
  (ADR-062). The shared, non-marketing pieces (token theming, `Icon`, the
  `Switch`-based toggle, `PageHeader`) are reused as **components**; the marketing
  **frame** is not.
- **Settings is unchanged structurally** — it restyles the existing
  `profile/_layout.tsx` in place. The flagged sectioned-sidebar stretch is a
  presentational addition to that layout, adds no routes, and is out of this
  decision's scope.

## Consequences

- **Auth and admin get the chrome the task surfaces actually need** — no
  marketing header/footer to strip, no customizer to carve out. The shells stay
  small and purpose-built.
- **One enforced boundary for the accent customizer.** "Customizer is
  marketing-only" is now structural: it lives in `__app-frame`, and auth/admin
  simply never wrap in it. A future change that wants the customizer on a task
  surface has to cross this ADR.
- **Some duplication is accepted.** The auth/admin shells re-implement small bits
  of layout scaffolding rather than inheriting `__app-frame`. This is the
  deliberate trade: a little duplicated structure in exchange for not coupling
  task surfaces to the marketing frame + customizer. Shared atoms (theme toggle,
  `PageHeader`, `Icon`, tokens) keep the duplication to layout scaffolding only.
- **Reversal cost is real.** Collapsing the three shells back into one frame later
  means re-threading the customizer carve-out and the chrome differences — hence
  recording the boundary now rather than discovering it implicitly.
- **Guard against regression.** Mounting the accent customizer dock on an auth or
  admin route, or refactoring the auth/admin shells to wrap `_marketing/__app-frame`,
  re-opens the coupling this ADR closes.
