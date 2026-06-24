# Unified AppShell: Universal Top Navbar + Section Sidebars

Date: 2026-06-24

Status: accepted (supersedes [066](066-auth-and-admin-shell-chrome-boundary.md);
amends [067](067-unified-app-chrome-and-whole-product-accent-showcase.md) — chrome
moves from `root.tsx` into a shared `AppShell`, but 067's content decisions stand)

## Context

The product carries five divergent chrome topologies. The marketing landing ships
its own branded header (ADR-067). `root.tsx` renders a generic header/footer for the
fallback surfaces (public blog, `/settings`, error/404). The auth surfaces
(`_auth/_layout.tsx`) are a deliberately bare centered card with only a floating
theme toggle. The admin surfaces (`admin/_layout.tsx`) use a bespoke **left nav rail**
(Pine lockup + Blog/Cache + theme/accent at the foot) *instead of* a top bar. And
account (`settings/profile/_layout.tsx`) is a breadcrumb trail over one mega-index
page — it has **no sidebar at all**; its sub-pages are a link list on the index.

The result is that there is no consistent way to navigate: the top bar appears on
three surfaces and not the other two, only admin has a sidebar (and it replaces the
top bar rather than complementing it), and account — the surface with the most
sub-pages — has the weakest navigation of all.

[ADR-066](066-auth-and-admin-shell-chrome-boundary.md) made the chrome-light auth/
admin shells a deliberate decision: focused task surfaces with no marketing header to
strip. [ADR-067](067-unified-app-chrome-and-whole-product-accent-showcase.md) then
pinned the fallback chrome into `root.tsx` — "one generic app chrome, **not**
per-surface shells." This decision revisits both: the product now wants a **single,
predictable navigation frame everywhere** — a top navbar on every surface plus a
consistent section sidebar for the multi-page surfaces (account, admin).

## Decision

- **One shared `AppShell` layout component** owns the chrome: a universal **top
  navbar** + an optional **sidebar slot** + the content column. Each section layout
  wraps with it; `root.tsx` no longer renders chrome (this is the reversal of 067's
  "root owns the chrome"). The error/404 boundary renders inside an `AppShell` too.

- **The navbar is universal but variant-driven.** A `full` variant carries the logo
  (→ `/`), the product links **Blog** (always) and **Admin** (role-gated), and a
  right cluster of theme toggle + accent picker + the `UserDropdown` (Account /
  Logout) — or a **Log In** button when logged out. A `minimal` variant (auth) shows
  only the logo + theme toggle: no links, no avatar, no accent. Marketing **opts out
  entirely** and keeps its own bespoke header (067 preserved).

- **Auth gains a (minimal) navbar; admin gains a top navbar + a proper sidebar.**
  This supersedes 066's "no top navbar on the task surfaces." The bespoke admin left
  rail is retired: its logo lockup drops (the navbar owns the wordmark) and its
  theme/accent controls move into the navbar's right cluster.

- **One shared, config-driven `Sidebar` component** for both multi-page sections,
  rendering grouped items:
  - **Account** — *Account* group (a **General** hub: name/photo + Preferences +
    Active sessions cards, Delete at the foot) and a *Security* group (Email,
    Password, Two-Factor, Connections, Passkeys, each its own page). `/settings/profile`
    lands on General. The old breadcrumb trail is dropped — sidebar + `PageHeader`
    replace it.
  - **Admin** — a *Manage* group (Blog, Cache).
  - Single-page surfaces (public blog, error/404) take the navbar with **no** sidebar.

- **Mobile: the sidebar collapses to a hamburger → slide-over drawer**, which
  requires a net-new **`Sheet`** primitive (Radix Dialog-based). Both `Sidebar` and
  `Sheet` are rendered `ui/*` primitives and so each carries the design-sync lockstep.

- **The accent boundary from 067 is preserved.** Theme toggle is everywhere; the
  accent **picker** rides the `full` navbar (whole-product, incl. admin and logged-out
  blog) but is **absent from the `minimal`/auth variant**. The full marketing hue
  **dock** stays marketing-only. The slim `root.tsx` footer is removed — the navbar
  owns the controls; the marketing footer is unchanged.

## Consequences

- **Navigation becomes predictable.** Every surface (except the deliberately
  standalone marketing landing) shares one navbar; the two multi-page sections share
  one sidebar. A user always knows where the section switcher and the sub-page nav are.

- **066 is reversed, on purpose.** "Auth/admin are chrome-light with no top navbar"
  was the right call for isolated task surfaces; the product reality (a unified,
  client-demoed backend) now wants the opposite. Recording the reversal keeps the
  bare-card/left-rail design from being reintroduced as a "fix."

- **067's structural claim moves; its content claims stand.** Chrome ownership leaves
  `root.tsx` for a per-surface `AppShell` (the very thing 067 argued against), trading
  a single catch-all home for explicit, composable per-surface wiring. But 067's
  *content* decisions — one "Open Sourced" wordmark, the avatar as cross-chrome
  gateway, `/users` + `SearchBar` gone, accent whole-product-except-auth, marketing
  keeps its own header — all survive intact.

- **Two net-new primitives + lockstep cost.** `Sidebar` and `Sheet` are new rendered
  `ui/*` primitives; each forces the 4-file design-sync lockstep. The mobile drawer is
  the reason `Sheet` exists.

- **Reversal cost is real.** Collapsing back to root-owned chrome (or to the
  chrome-light shells) means re-threading the variant logic, the sidebar config, and
  the accent carve-out across every section layout — hence recording the shape now.

- **Guard against regression.** Reintroducing the admin left rail, dropping the navbar
  from auth/admin, mounting the accent picker on the `minimal` variant, or moving
  chrome back into `root.tsx`, each re-opens a boundary this ADR closes.
