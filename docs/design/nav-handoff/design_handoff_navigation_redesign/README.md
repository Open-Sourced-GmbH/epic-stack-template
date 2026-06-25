# Handoff: Navigation-Redesign (Desktop & Mobile)

## Overview
A single, config-driven application navbar that resolves its appearance from three
inputs — **route**, **role**, and **view** (desktop/mobile). It replaces three
previously divergent headers (marketing, app, admin) with one component that renders
the correct density per context: minimal on auth, inviting on marketing, work-ready in
account/admin. It supports light/dark/system themes and five brand accents, plus a
mobile off-canvas drawer.

The reference implementation is built on the **Epic Stack UI** design system
(Tailwind v4 tokens, Radix-based components).

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that
demonstrate the intended look and behavior. They are **not production code to copy
verbatim**. The task is to **recreate these designs in the target codebase's existing
environment** (the Epic Stack React app, or whatever framework is in use) using its
established components, tokens, and patterns. Where the prototype hand-rolls markup
(e.g. the dropdown, drawer, sidebar), prefer the equivalent Epic Stack UI component
(`DropdownMenu`, `Sheet`, `Sidebar`, `Avatar`, `Button`, `Badge`, `Separator`).

The prototype is authored as a "Design Component" (`.dc.html`). Read it as source for
exact structure and values; it depends on a runtime (`support.js`) and the Epic UI
bundle to actually render, but every measurement you need is documented below.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, and
interactions are specified. Recreate the UI pixel-perfectly using the codebase's
existing Epic Stack UI library and design tokens — do not hardcode the hex/oklch values
where a token exists; map them to the token (see Design Tokens).

---

## Surfaces, Routes & Variant Resolution

The navbar layout is resolved by a single function from `route` + `view`. `role` then
modulates which building blocks appear inside that layout.

```
isFull      = route ∈ { account, admin }     → variant: Full
isMarketing = route ∈ { marketing, blog }     → variant: Marketing
isMinimal   = route === login                 → variant: Minimal
// variant = isMinimal ? Minimal : isMarketing ? Marketing : Full
```

| Route            | Surface   | Variant   | Product links (desktop)            | Section sidebar |
|------------------|-----------|-----------|------------------------------------|-----------------|
| `login`          | Login     | Minimal   | — (wordmark only, no bottom border)| —               |
| `marketing`,`blog`| Marketing| Marketing | Funktionen · Über · Docs · Blog    | —               |
| `account`        | Konto     | Full      | „Zurück zur Website“ (→ marketing) | Konto           |
| `admin`          | Admin     | Full      | „Zurück zur Website“ (→ marketing) | Manage          |

Roles: `guest`, `user`, `admin`. Views: `desktop`, `mobile`.

---

## Screens / Views

### Shell (container shared by all screens)
- **Layout**: centered column. Desktop width **1140px**, mobile width **390px**, both
  `max-width: 100%`.
- **Surface**: `background` token; `color: foreground`.
- **Border**: `1px solid border`. **Radius**: desktop **16px**, mobile **30px** (device-like).
- **Min-height**: desktop **600px**, mobile **690px**. `overflow: hidden; position: relative`.
- **Shadow**: `0 1px 2px rgba(16,24,40,.06), 0 18px 50px rgba(16,24,40,.16)`.
- Below the shell in the prototype sits a **prototype control bar** (Route/Rolle/Ansicht
  toggles) — this is scaffolding for the demo only and is **not part of the product**.

### Navbar (header)
- **Layout**: `display:flex; align-items:center; justify-content:space-between; gap:24px;`
  **height 60px**; padding desktop `0 18px`, mobile `0 14px`; `position:relative; z-index:40`.
- **Border-bottom**: `1px solid border` — **except Minimal/login** (no border).
- **Left cluster**: `display:flex; align-items:center; gap:26px; min-width:0`.
  - **Hamburger** (mobile only, Marketing/Full): 38×38, radius 10, `1px solid border`,
    transparent bg; three bars 16×1.8px, `foreground`, radius 2, gap 3.5px. `aria-label="Menü"`.
  - **Logo + wordmark** (always; links to marketing, `title="Zur Startseite"`):
    logo 30×30, radius 8, `background:brand`, centered ▲ glyph `primary-foreground` 13px.
    Wordmark stacked: „open“ 13.5px/680, ls −0.01em, `foreground`; „sourced“ 9.5px/600,
    ls .2em, uppercase, `muted-foreground`. Wordmark hidden on mobile unless Minimal.
  - **Product links** (desktop, Marketing/Full): nav `display:flex; align-items:center; gap:24px`.
    - Full: single link „Zurück zur Website“ → marketing. Idle style 14px/500 `muted-foreground`.
    - Marketing: Funktionen · Über · Docs · Blog — 14px/500 `muted-foreground`, hover→`foreground`
      (`transition:color .15s`). „Blog“ → blog route.
- **Right cluster**: `display:flex; align-items:center; gap:10px`.
  - **Accent picker** (desktop, Full/Marketing): trigger 34px high, padding `0 9px`, radius 9,
    `1px solid border`; bg `accent` when open else transparent. Swatch 15px circle `brand` with
    ring `0 0 0 2px background, 0 0 0 3px brand`; 11px chevron (`#arrow-right` rotated 90°).
    Popover: `position:absolute; top:42px; right:0; z-index:30`; flex gap 9; padding `11px 12px`;
    radius 12; `popover` bg; `1px solid border`; shadow `0 14px 34px rgba(0,0,0,.28)`;
    animation `popIn .14s ease`. Five swatches 22px circles; active swatch ring
    `0 0 0 2px popover, 0 0 0 3.5px <accent>`.
  - **Theme toggle**: 34×34, radius 9, `1px solid border`, transparent, icon 17px
    `muted-foreground`; hover `background:accent; color:foreground` (`transition .15s`).
    Cycles light → dark → system; icon `#sun` / `#moon` / `#laptop`.
  - **Primary CTA** (guests): „Anmelden“ (Full) / „Los geht's“ (Marketing). Height 34px,
    padding `0 16px`, radius 9, `background:brand`, `primary-foreground`, 13.5px/560;
    Anmelden hover `filter:brightness(1.08)`.
  - **Identity / avatar** (users & admins, Full/Marketing): button height 40, radius 999,
    `1px solid border`, transparent; `transition:border-color .15s` (desktop). Avatar 30px
    circle `brand`/`primary-foreground` „AK“ 12px/600; name „Anna“ 13px/540 (desktop only);
    12px chevron. **Dropdown**: `top:48px; right:0; z-index:30; width:228px`; padding 6;
    radius 13; `popover` bg; `1px solid border`; shadow `0 18px 40px rgba(0,0,0,.3)`;
    `popIn .14s`. Header: 36px avatar, „Anna Keller“ 13.5px/560 `popover-foreground`,
    „anna@epic.dev“ 11.5px `muted-foreground` (ellipsis). Hairline `1px border`. Items
    (38px high, radius 9, 13.5px, hover `background:accent`, icon 16px `muted-foreground`):
    **Konto** (`#avatar`) → account; **Admin** (`#lock-closed`) → admin (admins only);
    **Abmelden** (`#exit`) → logout.

### Marketing (route = marketing/blog)
- Centered hero, `padding:46px 20px 40px; max-width:560px; margin:0 auto`. Mount animation
  `contentIn .34s cubic-bezier(.22,.61,.36,1)`.
- Badge: inline pill 11.5px/600 `brand` on `brand-soft`, radius 999, padding `5px 13px` —
  „Open-source · production-ready“.
- H1 40px/660, ls −0.035em, line-height 1.08, `foreground`, margin-top 18 —
  „Der Full-Stack, der mit dir mitwächst“.
- Sub 15.5px, line-height 1.55, `muted-foreground`, margin-top 14 —
  „Eine Navbar, ein Theme-System, jede Fläche konsistent. Aus Tokens gebaut, in hell und dunkel zuhause.“
- CTAs (margin-top 26, gap 10, centered): „Los geht's“ — 42px, padding `0 20px`, radius 10,
  `brand`/`primary-foreground`, 14px/560 → sets role=user. „Dokumentation“ — 42px, radius 10,
  `1px solid border`, transparent, `foreground`, 14px/540.

### Login (route = login, variant Minimal)
- Centered card, `padding:30px 0`, `contentIn .34s`. Card 360px, `1px solid border`,
  radius 16, `card` bg, padding `28px 26px`, shadow `0 1px 2px rgba(16,24,40,.05)`.
- Title „Willkommen zurück“ 21px/640, ls −0.02em, centered. Sub „Melde dich bei deinem Konto an“
  13px `muted-foreground`, centered, margins 5/22.
- Field label 12px/560 `foreground`, mb 6. Field box 40px, `1px solid border`, radius 9,
  padding `0 12px`, 13px `muted-foreground`. E-Mail „anna@epic.dev“; Passwort „••••••••“ (ls 2px).
- Submit „Anmelden“: full width, 40px, radius 9, `brand`/`primary-foreground`, 13.5px/560.

### Account (route = account, variant Full)
- Section sidebar present on desktop (see Sidebar). Main padding desktop `26px 28px`,
  mobile `20px 16px`. Content wrapper animates `contentIn .34s`.
- Eyebrow 11px/600, ls .1em, uppercase, `brand` (group: General/Security).
- Title 24px/640, ls −0.02em, `foreground`, mt 4 (Profil/Passwort/Verbindungen/Sitzungen).
- Hairline `1px border`, margin `20px 0`.
- Fields (`display:flex; flex-direction:column; gap:16px; max-width:400px`): each label
  12px/560 mb 6; value box 40px, `1px solid border`, radius 9, padding `0 12px`, 13px
  `foreground`, `card` bg. Field content by item:
  - Profil: Name → „Anna Keller“, E-Mail → „anna@epic.dev“
  - Passwort: Aktuelles Passwort → „••••••••“, Neues Passwort → „••••••••“
  - Verbindungen: GitHub → „verbunden · @anna“, Google → „nicht verbunden“
  - Sitzungen: Dieses Gerät → „macOS · Zürich“, Weitere Sitzung → „iOS · vor 2 Tagen“
- „Speichern“ button: 38px, padding `0 17px`, radius 9, `brand`/`primary-foreground`,
  13.5px/560, mt 22.

### Admin (route = admin, variant Full)
- Header row `display:flex; align-items:flex-end; justify-content:space-between; mb 18`.
  Left: eyebrow „Manage“ + title (Blog/Cache). Right (Blog only): „Neu“ button with `#plus`
  icon (13px), 36px high, padding `0 14px`, radius 9, `brand`/`primary-foreground`, 13px/560.
- **Blog table**: container `1px solid border`, radius 12, overflow hidden. Rows 52px,
  padding `0 15px`, gap 13, `border-bottom 1px border`; stagger animation `rowIn .4s
  cubic-bezier(.22,.61,.36,1)`, delay `0.04 + index·0.06s`. Row: 34px icon tile (radius 9,
  `accent` bg, `muted-foreground`, `#file-text` 16px); title 13.5px/540 `foreground`; meta
  11.5px `muted-foreground`; status pill 11px/600 `brand` on `brand-soft`, radius 7,
  padding `2px 9px`. Rows:
  - „Eine Navbar für jede Fläche“ · „vor 2 Tagen · Anna“ · live
  - „Tokens statt Hex-Werte“ · „vor 5 Tagen · Anna“ · live
  - „Dark Mode als Class-Flip“ · „letzte Woche · Tom“ · entwurf
- **Cache panel** (admItem = cache): card `1px solid border`, radius 12, padding 20,
  `card` bg, max-width 440. Title „Anwendungs-Cache“ 14px/560; body 12.5px `muted-foreground`
  line-height 1.5 — „Geleert werden alle gespeicherten Render- und Daten-Caches. Nutzer
  bemerken kurz langsamere Antworten.“; „Cache leeren“ button 36px, radius 9, `1px solid
  border`, transparent, `foreground`, 13px/540, mt 16.

### Section Sidebar (desktop, Full only)
- `<aside>` width **218px**, `flex:none`, `background:brand-soft`, `border-right 1px border`,
  padding `16px 11px`.
- Group label 10.5px/600, ls .08em, uppercase, `muted-foreground`, padding `0 8px 7px`.
- Item (idle): `display:flex; align-items:center; gap:11px; height:38px; padding:0 12px;
  radius 9; 13.5px/500; color:foreground; transparent; transition:background .18s,color .18s,
  box-shadow .18s`. Icon 15px.
- Item (active): same but 13.5px/560, `color:primary-foreground; background:brand;
  box-shadow:0 1px 3px rgba(0,0,0,.18)`.
- **Account groups**: General → Profil (`#avatar`); Security → Passwort (`#lock-closed`),
  Verbindungen (`#link-2`), Sitzungen (`#laptop`).
- **Admin group**: Manage → Blog (`#file-text`, trailing count badge „24“: 11px/600,
  `primary-foreground` on `rgba(255,255,255,.22)`, radius 7, padding `1px 7px`),
  Cache (`#update`).

### Mobile Drawer (view = mobile, Marketing/Full)
- Backdrop: `position:absolute; inset:0; z-index:50; background:rgba(8,12,20,.5);
  animation:fadeIn .18s`. Click closes.
- Panel: `position:absolute; top:0; bottom:0; left:0; width:86%; max-width:330px; z-index:60`;
  **background `linear-gradient(brand-soft, brand-soft), background`** (brand wash over an
  **opaque** base — must not be translucent); `display:flex; flex-direction:column`;
  shadow `8px 0 34px rgba(0,0,0,.3)`; animation **`drawerIn .3s cubic-bezier(.22,.61,.36,1)`**
  (slide −100%→0 + opacity .4→1).
- **Header** (`background:background`): 28px logo, wordmark, close button 32×32 radius 8
  `1px border` (`#cross-1` 14px). Padding `16px 14px 13px`, `border-bottom 1px border`.
- **Nav** (`flex:1; overflow:auto; padding:14px 12px`; `contentIn .32s`, delay .06s):
  label „Navigation“ 10.5px/600 uppercase. Items use drawer style `dw()`: 46px high, gap 12,
  padding `0 13px`, radius 11, 14.5px; idle 500 `foreground` transparent, active 560
  `primary-foreground` on `brand`; `transition:background .18s,color .18s`. Icons 17px.
  - Full: „Zurück zur Website“ (`#arrow-left`) → marketing.
  - Marketing: „Blog“ (`#file-text`); „Admin“ (`#lock-closed`, admins only).
  - sectionAccount: label „Konto“ → Profil/Passwort/Sitzungen.
  - sectionAdmin: label „Manage“ → Blog/Cache.
- **Footer** (`background:background`, `border-top 1px border`, padding `12px 14px`):
  identity row (34px avatar, „Anna Keller“/„anna@epic.dev“, logout button 34×34 `#exit`);
  appearance strip (`background:accent`, radius 11, padding `9px 11px`): label „Darstellung“
  12.5px/500, accent-cycle button (13px brand dot) + theme-cycle button (`themeIcon` 15px).

---

## Interactions & Behavior
- **Route switch** → content remounts and plays `contentIn .34s cubic-bezier(.22,.61,.36,1)`
  (translateY 9px + fade).
- **Open accent picker** → closes avatar dropdown; **open avatar dropdown** → closes accent.
  A transparent full-shell backdrop (`z-index:25`) closes both on outside click (desktop).
- **Theme toggle** cycles light→dark→system; applies `.dark` class on the shell root when
  dark (or system+OS dark via `matchMedia('(prefers-color-scheme: dark)')`).
- **Accent pick** sets `--brand`, `--primary`, `--ring` to the chosen value and recomputes
  `--brand-soft = color-mix(in srgb, <brand> 13%, transparent)`.
- **Hamburger** toggles drawer; backdrop or close button dismisses; selecting any drawer
  item closes the drawer.
- **Logout** sets role=guest, closes menus/drawer, and if on account/admin redirects route
  to marketing (never strand a guest on a protected surface).
- **Admin table rows** stagger in (`rowIn .4s`, 60ms step, 40ms base delay).
- **Active state changes** (sidebar/segment) transition bg/color/shadow over 180ms.
- **Hover** transitions ~150ms (theme button bg, marketing links color, Anmelden brightness).
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` forces
  `animation-duration:.001ms !important; animation-delay:0ms !important`.

## State Management
State variables (prototype): `route` (marketing|blog|account|admin|login), `role`
(guest|user|admin), `view` (desktop|mobile), `theme` (light|dark|system), `accent`
(teal|blue|violet|amber|rose), `accentOpen`, `dropdownOpen`, `drawerOpen`,
`accItem` (profil|passwort|verbindungen|sitzungen), `admItem` (blog|cache).

Derived/visibility flags (compute, don't store):
`isFull`, `isMarketing`, `isMinimal`, `isMobile`, `isGuest`, `isAdmin`;
`showIdentity = (isFull||isMarketing) && !isGuest`;
`showAdminLink = isAdmin && (isFull||isMarketing)` (avatar menu + marketing drawer);
`showAccent = (isFull||isMarketing) && isDesktop`;
`showHamburger = isMobile && (isFull||isMarketing)`;
`showSidebar = (account||admin) && isDesktop`;
`showProductLinks = (isFull||isMarketing) && isDesktop`.
Mutual exclusion: opening accent closes dropdown and vice versa.

In production, `route`/`role`/`view` come from the router, session, and viewport — not
local toggles. Theme & accent should persist (localStorage / cookie / user prefs).

## Design Tokens
Map to Epic Stack UI tokens — do not hardcode. Color roles used:
`background`/`foreground`, `card`/`card-foreground`, `popover`/`popover-foreground`,
`brand`=`primary`/`primary-foreground`, `brand-soft` (= `color-mix(in srgb, brand 13%,
transparent)`), `muted`/`muted-foreground`, `accent`/`accent-foreground`, `border`/`input`,
`ring` (= brand).

Accent palette (sets `--brand`/`--primary`/`--ring` together):
- teal `oklch(0.60 0.135 172)` (default)
- blue `oklch(0.60 0.15 250)`
- violet `oklch(0.56 0.20 300)`
- amber `oklch(0.70 0.16 65)`
- rose `oklch(0.62 0.21 18)`

Radius: `sm/md/lg/xl` from one `--radius`; inputs & buttons use `md`. The prototype uses
literal radii (8–16px) for shell/menus that don't map 1:1 — prefer the nearest token.

Typography scale: `text-mega`, `h1…h6`, `body-2xl…body-2xs`, `caption`, `button`
(headings carry their own weight/line-height). Font stacks: `--font-sans`
(ui-sans-serif/system-ui…), `--font-mono` (ui-monospace/Cascadia Code…).

Key shadows: menus `0 18px 40px rgba(0,0,0,.3)` / `0 14px 34px rgba(0,0,0,.28)`;
shell `0 1px 2px rgba(16,24,40,.06), 0 18px 50px rgba(16,24,40,.16)`;
drawer `8px 0 34px rgba(0,0,0,.3)`.

Keyframes: `popIn` (translateY −6 + scale .98), `drawerIn` (translateX −100% + opacity
.4→1), `fadeIn`, `contentIn` (translateY 9), `rowIn` (translateY 7), `navItemIn`
(translateX −9). Standard ease for entrances: `cubic-bezier(.22,.61,.36,1)`.

## Assets
- **Icons**: `epic-icons.svg` — an inline SVG sprite (Radix-icon set), referenced via
  `<svg><use href="#id"></use></svg>`. IDs used: `arrow-left`, `arrow-right`, `avatar`,
  `file-text`, `lock-closed`, `laptop`, `link-2`, `update`, `exit`, `sun`, `moon`,
  `cross-1`, `plus`, `camera`. In the codebase, use the existing icon component/set
  (Radix Icons / lucide) rather than this sprite.
- **No raster images.** Avatar is initials („AK“); logo is a ▲ glyph on a brand tile.

## Files
- `Epic AppShell.dc.html` — the navigation prototype (all variants, roles, views, theming,
  drawer, animations). Primary reference.
- `Navigation Redesign — Handout.dc.html` — the full design specification handout
  (principles, IA, resolveNavbar, variants, tokens, motion, a11y, changelog, glossary).
- `epic-icons.svg` — icon sprite used by the prototype.
- `support.js` — Design-Component runtime (needed only to render the `.dc.html` in a
  browser; not part of the product). The prototype also expects the Epic UI bundle under
  `_ds/…` to be present to render — not included here; consult the live design system in
  the codebase.

> Note: the bundled HTML are **design references**. Recreate them in the Epic Stack app
> using its real components and tokens; the described behavior is the spec to implement,
> not HTML to ship.
