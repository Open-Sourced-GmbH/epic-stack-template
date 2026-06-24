# Unified App Chrome + Whole-Product Accent Showcase

Date: 2026-06-24

Status: accepted (amended by [068](068-unified-appshell-navbar-and-section-sidebars.md) —
chrome ownership moves from `root.tsx` into a shared `AppShell`; the content decisions
below — one wordmark, avatar gateway, `/users` removed, accent whole-product-except-auth,
marketing keeps its own header — stand)

## Context

Three brand rollout slices each restyled their own surfaces but never reconciled
the **generic app chrome** that everything else falls back to. The result was two
divergent, unbranded seams:

- The landing (and all `_marketing` surfaces) ship their own branded header/footer
  and set `handle.hideChrome`, so a **logged-in owner browsing the landing saw no
  account affordance at all** — no avatar, no way back into the backend.
- `/users` and `/users/$username` did **not** set `hideChrome`, so they rendered
  the **stock Epic Stack root chrome** — the `epic notes` wordmark + a global
  `SearchBar` + a plain "Log In" button. That chrome was never rebranded; it was
  leftover scaffolding from the retired `Note` example domain (ADR-050).

So the product carried **three logos** (`epic notes`, `open sourced`, the Pine
glyph), a login affordance present in exactly one of the two public-ish chromes,
and a public user directory + search that no longer maps to anything (there is one
canonical blog feed, not per-user content).

Two existing ADRs also pinned a boundary that this work revisits:

- **ADR-062** declared the runtime accent customizer a **marketing-only showcase**.
  But the (unbranded) root chrome footer *already* rendered the `AccentSwitch` on
  `/settings`, quietly contradicting it.
- **ADR-066** made it structural that the auth and admin shells expose a light/dark
  **toggle only — never the accent control**.

The product reality changed the calculus: the logged-in **backend (admin) is
demoed to clients**, so the accent showcase should reach it too — the brand should
visibly re-theme the whole product, not just the public page.

## Decision

- **One generic app chrome, rebranded — not per-surface shells.** `root.tsx` keeps
  ownership of a single header/footer for the surfaces that don't ship their own
  (today: `/settings` and the global error/404 boundary). It now renders the one
  canonical **"Open Sourced" wordmark** (`app/components/logo.tsx`) and the shared
  `UserDropdown`; the `SearchBar` is gone. The Pine glyph remains the **compact
  icon** for the chrome-light auth/admin shells only.
- **The `/users` public directory + global `SearchBar` are removed.** This is a
  single-tenant portfolio/blog template; a public people-search has no role. The
  post-login landing and the avatar's account link now target **`/settings/profile`**
  (a URL `redirectTo` still wins via `safeRedirect`); blog author bylines were
  already plain text, so nothing else referenced the deleted profile.
- **The avatar is the cross-chrome gateway.** The shared `UserDropdown` (Account /
  role-gated Admin / Logout) is mounted in **both** the generic app chrome and the
  **marketing header** — anonymous visitors see only the "Start a project" CTA; the
  logged-in owner gets the avatar *beside* it, so the page demos identically to a
  client's view while still offering a way into the backend.
- **The accent showcase is now whole-product (amends ADR-062 and ADR-066).** The
  `AccentSwitch` preset picker is intentionally present on the app chrome
  (`/settings`) and is **added to the admin shell**, so the backend shown to clients
  re-themes live. The boundary is redrawn, not erased: the full marketing
  `ThemeCustomizer` **dock** (hue slider + cursor) stays **marketing-only**, and the
  **auth shell stays toggle-only** (a transient pre-login pass-through).
- **Two intentional footers sharing atoms.** Marketing keeps its rich link-column
  footer; the app chrome keeps a slim footer. They are unified by sharing the
  `Logo` and switch components, not by becoming identical.

## Consequences

- **The two unbranded seams close.** There is one wordmark, one login affordance
  reachable from every public-ish surface, and no stock `epic notes` / search
  scaffolding left to leak through.
- **The accent boundary moves but stays legible.** "Accent customizer is
  marketing-only" (ADR-062) becomes "the accent *picker* is whole-product; the
  marketing *dock* and hue slider stay marketing-only." A future change that wants
  the full hue dock on a task surface, or the picker on the auth shell, still has to
  cross an ADR.
- **Post-login UX changes deliberately.** Login/onboarding/OAuth now land on
  `/settings/profile` instead of `/`; the e2e landing assertions were updated to
  match. Logout still returns to `/`.
- **`/users` removal is hard to reverse cleanly** — re-introducing a public profile
  later means new routes, re-pointing the avatar, and a search surface. Recording it
  here makes the deletion a decision, not an accident.
- **Single chrome remains the catch-all.** Keeping one generic app chrome (rather
  than giving `/settings` its own shell) preserves a home for the error/404 boundary
  and any future authenticated page, at the cost of the app chrome not being a
  purpose-built shell like auth/admin.
