# Grounded design spec — Navigation überarbeitung (navbar / AppShell)

> Output of `/to-grounded-design`. Reconciles the Claude Design handoff against
> THIS codebase's real components + tokens so `/to-issues` can slice it without
> re-deriving the design. Not published to the tracker.

## Source

- **Handoff:** `docs/design/Navigation überarbeitung Desktop Mobile.zip` →
  `docs/design/nav-handoff/design_handoff_navigation_redesign/`
  (`README.md` = full spec with exact values; `Epic AppShell.dc.html` = the
  hi-fi prototype; `Navigation Redesign — Handout.dc.html` = principles/IA;
  `epic-icons.svg` = Radix-icon sprite, **use the repo's `Icon` set instead**).
- **PRD:** none yet (the design lane skipped `/to-prd`). See *Ready for /to-issues*.
- **Extends:** [ADR-068](../decisions/068-unified-appshell-navbar-and-section-sidebars.md)
  — this redesign adds a **third navbar variant** and folds the marketing
  surfaces into the unified `AppShell`, retiring the bespoke marketing header.

## HITL decisions (resolved)

1. **Full-variant IA** → back-link only. `full` (account/admin) drops the
   Blog/Admin top links for a single „Zurück zur Website“ → marketing. Admin is
   reached via the avatar dropdown (admins) + the section sidebar; Blog lives
   under marketing nav.
2. **Marketing links** → existing routes only: **Über** (`/about`) + **Blog**
   (`/blog`). `Funktionen`/`Docs` are dropped (no routes; no dead links).
3. **Accent palette** → keep the real **4 presets** (Pine·Iris·Coral·Volt) + L/C/H
   sliders per ADR-062's constrained picker. The handoff's teal/blue/violet/amber/
   rose were illustrative.
4. **Sidebar count badge** → dropped. `SidebarItem` stays `{to,label,icon}`; no
   `ui/*` change, no design-sync lockstep.

## Grounded UI

### Navbar shell — `AppShell` + `AppNavbar` (`app/components/app-shell.tsx`)
Restyle in place; driven by the pure `resolveNavbar` (`app-shell-nav.ts`).

- **Header** → `<header>` sticky `top-0 z-40`, `bg-background/80 backdrop-blur`,
  `border-b border-border` (**except `minimal`** — no border). Row `flex
  items-center justify-between gap-6`, height **`h-15`** (60px; was `h-16`),
  padding `px-4 md:px-[18px]`. Tokens only.
- **Left cluster** `flex items-center gap-[26px] min-w-0`: hamburger (mobile,
  marketing/full) · Logo · product links.
- **Right cluster** `flex items-center gap-2.5`: accent picker · theme toggle ·
  primary CTA (guests) **or** identity avatar.

### Variants — `resolveNavbar` gains a third case
| Variant | Surfaces | Product links | Accent | Identity (guest → user/admin) |
| --- | --- | --- | --- | --- |
| `minimal` | login + auth tail | — | no | — (wordmark only) |
| `marketing` *(new)* | `_marketing/*`, `blog` | Über · Blog | desktop | „Los geht's"/„Anmelden" → avatar |
| `full` | `settings/profile`, `admin` | „Zurück zur Website" → `/` | desktop | avatar (protected → always user) |

Visibility flags map straight to the handoff's derived flags:
`showIdentity = (full‖marketing) && !guest`, `showAccent = (full‖marketing) &&
desktop`, `showHamburger = mobile && (full‖marketing)`, `showSidebar =
(account‖admin) && desktop`, `showProductLinks = (full‖marketing) && desktop`.
Active product link → `text-brand` + `aria-current="page"`; idle →
`text-muted-foreground hover:text-foreground` (`isSectionActive`).

### Logo — `app/components/logo.tsx` (restyle)
Handoff brand lockup = **brand-tile glyph + wordmark**: 30×30 tile
`rounded-md bg-brand` with a centered ▲ glyph in `text-primary-foreground`, then
the stacked wordmark („open" `text-foreground` / „sourced" uppercase tracked
`text-muted-foreground`). Wordmark hidden on mobile unless `minimal`. Links `/`.
Unifies today's text-only wordmark with the inline Pine glyph used in the
auth/admin shells (one lockup, no second mark).

### Identity dropdown — `UserDropdown` (`app/components/user-dropdown.tsx`)
→ `DropdownMenu` + `Avatar` (initials fallback) + `Button variant="secondary"`
trigger (already so). Add a **header block** (36px avatar, name
`text-popover-foreground`, email `text-muted-foreground` truncate) above a
`Separator`, then items: **Konto** (`avatar` icon → `/settings/profile`),
**Admin** (`lock-closed` → `/admin/blog`, admins only — already gated),
**Abmelden** (`exit`, POST `/logout`). Hover `bg-accent`. Align end, `sideOffset 8`.

### Primary CTA (guests) — `Button` (`app/components/ui/button.tsx`)
`marketing` → „Los geht's"; `full` is protected so this only appears for the
logged-out `marketing`/`full` edge → „Anmelden". `Button variant="default"`
(brand) `asChild` wrapping a `Link` to `/login` (or `/signup` for „Los geht's").

### Accent picker — existing `AccentSwitch` (`app/routes/resources/accent.tsx`)
Reuse as-is. Trigger = bordered swatch+chevron; popover lists the **4 presets** +
sliders. Now shown on `marketing` too (desktop). Mutual-exclusion with the avatar
dropdown is the switches' own concern; the navbar just slots both.

### Theme toggle — existing `ThemeSwitch` (`app/routes/resources/theme-switch.tsx`)
Reuse as-is (already cycles light→dark→system; `sun`/`moon`/`laptop`). 34px
bordered ghost square.

### Section sidebar — `Sidebar` (`app/components/ui/sidebar.tsx`)
Already config-driven and a near-exact match: `aside` `bg-brand-soft border-r`,
group label uppercase `text-muted-foreground`, idle item `text-foreground`,
**active item `bg-brand text-primary-foreground`** + soft shadow. Desktop rail +
mobile `Sheet` drawer share one `SidebarNav`. Groups already exist
(`accountGroups`, `adminGroups`). No count badge (decision 4).

### Mobile drawer — `Sheet` (`app/components/ui/sheet.tsx`), `side="left"`
Composition (closes the mobile product-nav gap from the brief):
- **Header** `bg-background border-b`: logo + wordmark + `SheetClose` (`cross-1`).
- **Nav** `flex-1 overflow-auto`: product items (`marketing` → Über/Blog
  (+ Admin for admins); `full` → „Zurück zur Website") **then** the section
  groups (account/admin) — same `SidebarNav` items, drawer sizing (46px rows).
  Active = `bg-brand text-primary-foreground`.
- **Footer** `bg-background border-t`: identity row (avatar, name/email, logout
  `exit`) + an **appearance strip** `bg-accent rounded-[11px]`: „Darstellung" +
  a compact accent-cycle button (brand dot) + theme-cycle button. Both reuse the
  existing accent/theme switch actions in a compact „cycle" affordance.
- Panel base **must be opaque**: `bg-[linear-gradient(var(--brand-soft),var(--brand-soft)),var(--background)]`
  (brand wash over `background`), per the handoff (no translucency). `drawerIn`
  slide-in; backdrop `fadeIn`; close on backdrop / `SheetClose` / item select.

### Per-surface content (restyle, already grounded)
- **Marketing** (`_marketing/__layout.tsx`): retire bespoke `__header.tsx`/
  `__footer.tsx` chrome → render inside `AppShell variant="marketing"`. Hero
  badge = `Badge variant="brand"` pill; H1/sub = type scale; CTAs = `Button`.
- **Login** (`_auth/_layout.tsx`): already `AppShell variant="minimal"` →
  `FormCard` centered card (existing). No change beyond the borderless minimal bar.
- **Account** (`settings/profile/_layout.tsx`): already `AppShell variant="full"`
  + `Sidebar` + `PageHeader` (eyebrow/title) + `FormCard` fields. ✓ grounded.
- **Admin** (`admin/_layout.tsx`): already `AppShell variant="full"` + `Sidebar`;
  list = `Table` (status pill = `Badge variant="brand" dot`), „Neu" = `Button`
  with `plus` icon; cache = `FormCard`. ✓ grounded.
- **blog** (`blog/_layout.tsx`): `variant="full"` → **`variant="marketing"`**.

### Motion
Entrances on `cubic-bezier(.22,.61,.36,1)`: `contentIn` (route remount),
`drawerIn`, `fadeIn`, `rowIn` (admin table stagger), `popIn` (menus). All gated
by `@media (prefers-reduced-motion: reduce)` (the repo already resets motion
globally — reuse that, don't re-implement per component).

## Net-new

- **Components:** **None** — fully grounded. The only `ui/*` candidate (Sidebar
  count badge) was dropped (decision 4). Logo / UserDropdown / AppNavbar are
  app-level components being restyled, not new primitives → no styleguide
  specimen, **no design-sync republish**.
- **Tokens:** **None** — every color/space/radius/type maps to an existing
  `@theme` token (`brand`, `brand-soft`, `popover`, `card`, `accent`, `muted`,
  `border`, type scale, `--radius-*`). No ADR for tokens.

## Convention notes

- **SSR-first.** `route`/`role`/`view` come from the router, session, and a
  viewport/media hint — not client state. Theme + accent persist via the existing
  cookie-backed switches (ADR-005). The prototype's local toggles are demo scaffolding.
- **No route-based dialog needed** — the drawer is a `Sheet` (ADR-023's transient-
  overlay exception, already used by `Sidebar`); the menus are `DropdownMenu`.
- **`resolveNavbar` stays a pure function** — the new `marketing` case is added to
  the table-driven unit test, keeping the navbar a thin projection.
- **ADR-068 amendment (proposed):** the variant model goes `full|minimal` →
  `full|minimal|marketing`, and marketing surfaces move under the unified
  `AppShell` (retiring `_marketing/__header.tsx`/`__footer.tsx`). Update ADR-068
  (or add a superseding note) — this is the structural decision, not a token one.
- **Accessibility** (per `epic-ui-guidelines`): hamburger `aria-label="Menü"`,
  icon-only buttons labelled, `nav aria-label` per region, focus ring on every
  control in both modes, drawer focus-trap (Sheet provides it).

## Ready for /to-issues

Grounded and sliceable. No PRD exists yet — either run **`/to-prd`** first to
capture scope + the four decisions as the authoritative record, or pass this spec
+ the handoff README straight to **`/to-issues`**. Natural tracer-bullet slices:
① `resolveNavbar` marketing variant + table test → ② AppNavbar restyle (logo
tile, CTA, identity header) → ③ marketing surfaces onto AppShell (retire bespoke
header/footer) + blog variant flip → ④ mobile `Sheet` drawer (product + section +
appearance strip) → ⑤ ADR-068 amendment.
