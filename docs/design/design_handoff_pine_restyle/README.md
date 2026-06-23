# Handoff: Brand Restyle — Auth, Account & Admin (Slice ③ · "Pine")

## Overview
A pure **visual reskin** of the Auth (`_auth/`), Account/Settings (`settings/profile/`),
and Admin (`admin/`) surfaces to the shipping **pine** brand. No behavior change —
routes, URLs, fields, copy, and auth/RBAC/2FA logic are frozen (scope lock). This
package documents the intended look, the five **net-new primitives** the slice
introduces, and every decision made during exploration.

PRD: *Brand Restyle — Auth, Account & Admin (Slice ③)* (team `EPT`). Foundation HEAD
`a206dde` (latest `/design-sync`). The five net-new primitives are **outputs** of this
exploration and must be reconciled against the system by `/to-grounded-design` afterward.

## About the design files
The three `*.dc.html` files in this bundle are **design references** — HTML/React
prototypes showing intended look and behavior. **They are not production code to copy.**
The task is to **recreate these designs in the real `epic-stack-template` codebase**
using its established patterns: the existing `app/components/ui/*` + `forms.tsx`
components, the `tailwind.css` `@theme` tokens, Conform + Zod forms, and Remix routing.
Where a primitive is net-new (Table, Switch, Separator, PageHeader, FormCard), build it
as a real `ui/*` component following the specs below.

Each prototype is laid out as a **side-by-side canvas** of labeled frames (one frame per
screen/state) so reviewers can compare states at a glance. In the real app each frame is
a route/sub-view, not a card on a wall.

## Fidelity
**High-fidelity.** Final pine brand, typography, spacing, radii, and interaction intent
are all expressed via the real design tokens. Recreate pixel-faithfully using the
codebase's components and the `focus-cosy` / eyebrow / FormCard patterns. All color /
space / radius values below are **token references**, not hardcoded hex — keep them
token-only so dark mode and the accent system keep working.

---

## ⚠️ Prototype-only artifacts — do NOT port these
The prototypes run against a **standalone browser bundle** of the design system, which
forced a few workarounds that must not be carried into the real codebase (where the
normal Tailwind build + icon sprite already work):

1. **Injected `<style id="pine-border-fix">` / `pine-admin-style`** — forces
   `border-width:1px` on inputs/outline buttons, `padding-left` on search inputs (the
   bundle's `border` and `pl-9` utilities computed to 0 in the standalone context),
   plus `button{white-space:nowrap}`. In the real build these resolve natively — use the
   normal classes and the **`focus-cosy`** utility.
2. **CSS-spinner "pending" buttons** (a `<span class="pine-spinner">` + `@keyframes`) —
   used only because the bundled icon sprite `<use href="data:…#update">` failed to load
   standalone. In real code use **`StatusButton status="pending"`** (which renders the
   `Spinner` / `update` icon).
3. **Hand-rolled OTP boxes, Switch, and Table** are `<div>` mockups. In real code use
   **`OTPField` / `InputOTP`** and the **new `Switch` / `Table`** components per specs.
4. **Bundle-gate loader script** (waits for `window.React` before injecting the DS
   bundle) — prototype loader only.
5. **Tweak props** (`brandColor`, `showSidebarStretch`, `showShowcaseMotif`, `zebraRows`)
   are prototype review controls — not real props. (The accent customizer is explicitly
   excluded from these surfaces; a theme **toggle** is fine.)

---

## Locked decisions (from the exploration)
| Exploration | Decision |
|---|---|
| **1 · Auth shell form factor** | **(B) Centered branded card** — single-column form in a `bg-card` card on a subtly brand-washed background. (A) split/showcase panel was explored, then dropped; it was the richer desktop-only option and **no longer lives in any file** — re-derive from this README's note if revived. |
| **2 · Settings wayfinding** | **Both shown, decision open.** Restyled breadcrumb (baseline) and the sectioned sidebar (Profile/Security/Connections) stretch are presented side-by-side. The sidebar must stay **purely presentational** — it groups existing pages only, adds no routes/URLs. |
| **3 · Five net-new primitives** | Specced below. |
| **4 · Auth showcase-panel content** | Logo lockup + tagline + one decorative brand-glow motif (lived in option A; decorative only). |
| **5 · Admin nav form factor** | **Left nav rail** (Blog / Cache). Top-tabs explored, dropped. |
| **6 · Empty-state treatment** | Dashed-border card, brand-soft icon tile, plain-spoken title + one CTA (e.g. "No drafts yet" / "No keys match …"). |

---

## Design tokens (token references — keep token-only)

### Pine brand
The real `tailwind.css` already defines `--brand`, `--brand-soft`, `--brand-glow`, and
`--primary` / `--ring` already follow `--brand`. The prototype re-declares them on a
wrapper so the standalone bundle paints pine; in the app you do **not** need this block —
the tokens already exist. Values used (for reference / to verify against `tailwind.css`):

```css
--brand:               oklch(60% 0.135 172);              /* pine — primary action, focus, active nav */
--brand-soft:          oklch(96% 0.025 172);              /* tint fills: icon tiles, OAuth banner, pill bg base */
--brand-glow:          oklch(from var(--brand) l c h / 0.28); /* focus halo + decorative radial */
--primary:             var(--brand);
--primary-foreground:  oklch(98.5% 0.003 247);            /* white-ish on brand */
--ring:                var(--brand);
/* prototype-only helper, NOT a foundation token: a darker pine for the (dropped) showcase panel + band */
--brand-deep:          oklch(31% 0.05 168);
```

### Semantic tokens used (all already in the system)
`--background` / `--foreground`, `--card` / `--card-foreground`,
`--popover` / `--popover-foreground`, `--muted` / `--muted-foreground`,
`--accent` / `--accent-foreground` (row/nav hover fill),
`--secondary`, `--destructive` / `--destructive-foreground`,
`--border`, `--input`, `--input-invalid`, `--error-text`,
`--radius` (inputs/buttons `rounded-md`; cards `rounded-lg`/`rounded-xl`; large bands `rounded-3xl`),
`--font-sans`, `--font-mono`.

### Type scale (use the `text-*` utilities, don't hardcode px)
`text-mega`, `text-h1…h6`, `text-body-2xl…2xs`, `text-caption`, `text-button`.
Prototype px → intent map: card title ≈ `text-h5/600`; section/title ≈ `text-h4`;
field label ≈ `text-body-sm`; helper/muted ≈ `text-body-xs`; eyebrow ≈
`text-sm font-semibold tracking-wide uppercase text-brand`.

### Patterns
- **`focus-cosy`** = 1px brand border + 3px brand-glow ring. Apply to every focusable
  input/textarea/OTP slot/switch/row-action.
- **Eyebrow** = `text-brand text-sm font-semibold tracking-wide uppercase`.
- **Destructive zone** = card surface mixed ~5% destructive, border mixed ~35%
  destructive, title in `text-destructive`.

---

## Net-new primitive specs (the `ui/*` outputs to reconcile)

### `FormCard`
- Surface: `bg-card text-card-foreground border border-border`, radius ≈ `rounded-xl`
  (prototype uses `calc(var(--radius) + 6px)`).
- **Optional header**: `px-[22px] py-[18px] border-b border-border`; title `text-h6/600`,
  optional description `text-body-sm text-muted-foreground`.
- Body padding `22px`; content grid gap `16px`.
- Frames both an **auth form** (header optional, centered) and a **settings section**
  (header with title+description). Destructive variant per pattern above.

### `Switch`
- Track `42×24`, `rounded-full`. Off = `bg-muted`; **on = `bg-brand`**.
- Thumb `20×20` white circle, `top:2px`; off `left:2px`, on `left:20px` (translate 18px),
  `transition` ~200ms (respect `prefers-reduced-motion`).
- Disabled = `opacity:.5`, non-interactive. Focus = brand-glow halo.
- Keyboard operable: `role="switch"`, `aria-checked`, toggles on Space/Enter.
- **Dark-mode-toggle presentation**: same switch preceded by a moon/sun icon + label
  (this is the in-shell theme toggle affordance).

### `Separator`
- **Plain**: 1px full-width line, `bg-border`.
- **Labeled** ("or continue with"): flex row — `flex-1` hairline · centered label
  (`text-[11px] font-medium tracking-[.08em] uppercase text-muted-foreground`) · `flex-1`
  hairline. Used between the email form and the OAuth/passkey button rows.

### `PageHeader`
- `flex items-end justify-between gap-4`. Left = **eyebrow** + **title** (`text-h4/650`,
  `whitespace-nowrap`). Right = **actions slot** (`flex gap-2`, e.g. outline "Import" +
  primary "New post"). One pattern across all three shells.

### `Table`
- Container: `bg-card border border-border rounded-[14px]` + subtle shadow; `overflow-hidden`.
- **Toolbar (optional)**: left = segmented filter (pill group: `bg-muted` track, active
  segment `bg-card` + shadow); right = search input (or a count, e.g. "128 keys · 2.4 MB").
- **Header row**: `grid` (see column templates), `text-[11px] font-semibold tracking-[.05em]
  uppercase text-muted-foreground`, `bg` = card mixed 3% foreground. Leading **select-all**
  checkbox column; the sortable column ("Updated") shows a chevron-down.
- **Body rows**: `grid` matching header, vertical padding ~12px, **hover `bg-accent`**,
  hairline `border-b border-border`. **Zebra is OFF by default** (toggleable: even rows =
  card mixed 3% foreground).
  - **Select checkbox** (16px; checked = `bg-brand` + white check).
  - **Leading tile** `34×34 rounded-[9px]`: Published → `bg-brand-soft text-brand` monogram;
    Draft/other → `bg-muted text-muted-foreground`.
  - **Title** `text-body-sm/550` single-line ellipsis + **mono subtitle** `text-[11–12px]
    text-muted-foreground` (slug, or "expires in 1h" / TTL for cache).
  - **Status pill**: dot + label. Published = bg card+~13% brand, text dark-brand, brand dot.
    Draft = `bg-muted text-muted-foreground`, muted dot. *(Reconcile against `Badge`
    default/outline — either add a tonal+dot Badge variant or keep `Badge`.)*
  - **Updated**: `text-body-sm text-muted-foreground`.
  - **Row action**: `Button variant=ghost size=icon-sm` (⋯) opening a `DropdownMenu`
    (Edit / Unpublish / Copy link / — / **Delete** in `text-destructive`), each item with a
    leading 14px icon. Menu surface = `bg-popover border rounded-xl shadow`.
  - **Selected row**: `bg` card+~6% brand + `box-shadow: inset 3px 0 0 var(--brand)` left bar.
- **Footer**: count ("1–4 of 12 posts") + **numbered pager** (`‹ 1 2 3 ›`; active page
  `30×30 rounded-[8px] bg-brand text-white`).
- **Empty state**: dashed-border card, brand-soft icon tile, title + body + CTA.
- **Loading**: `Skeleton` rows (title bar + pill placeholder per row).
- Column templates used (prototype): Blog `36px 1fr 132px 128px 40px`; Cache
  `36px 1fr 96px 44px`.
- A11y: keyboard-operable rows/menus, header checkbox toggles all, `focus-cosy` on controls.

---

## Screens / views

> Copy shown is **illustrative** ("The pine way to ship", "ada@epic.dev", etc.). Real copy
> is **frozen** per scope lock — use the existing strings from the codebase.

### A · AUTH (`_auth/`) — `Auth Shell — Pine Restyle.dc.html`
Shell = **centered branded card** (decision B): viewport is `bg-background` with a faint
top radial `radial-gradient(120% 70% at 50% -10%, var(--brand-glow), transparent 58%)`;
a single `FormCard` (max-width ~344–360px) centered, with a 42px `rounded-xl bg-brand`
logo tile (pine glyph) above an eyebrow + title. Footer link row beneath.

**States (each is a route/sub-view):**
- **Login** — resting (light **and** dark), **invalid-credentials** (`Alert tone=error`
  title+desc, fields `aria-invalid`), **pending** (disabled fields + `StatusButton
  pending`), **OAuth + passkey** (email/password/Sign-in **above**, then labeled
  `Separator` "or continue with", then outline buttons: Continue with Google / GitHub /
  "Sign in with a passkey"). The 2FA-enabled branch redirects to **Verify**.
- **Signup** — resting (Name, Email, Password, **Turnstile** widget, **ToS** checkbox,
  "Create account"; footer "Already have an account? Sign in"), **invalid-email** (field
  `aria-invalid` + "Enter a valid email address."), **success** ("Check your email" —
  brand-soft mail tile, body, "Resend email").
- **Onboarding** — resting (Display name, Username, Password, ToS), **`$provider` OAuth
  pre-filled** (brand-soft banner "Signing up with **Google** · …", name/username
  pre-filled, no password field).
- **Forgot-password** — resting (Email + "Send reset link"), **submitted/success** ("Check
  your inbox" — *no account-existence leak*: "If an account exists…").
- **Reset-password** — resting (New + Confirm), **password-mismatch** (Confirm
  `aria-invalid` + "Passwords don't match.").
- **Verify / OTP** — resting (6 slots, first focused = brand border + glow),
  **invalid-code** (all slots `border-destructive` + "That code didn't match."),
  **pending** ("Verifying…").
- **2FA challenge** (login-time) — OTP entry in the shell (same as Verify).
- **Cross-cutting** — light/dark via the **in-shell theme toggle** (build with the new
  `Switch` + sun/moon, server-applied per SSR); responsive collapse to single column.
- **Net-new primitives specimen** — FormCard / Separator / PageHeader / Switch shown
  isolated at the bottom of the canvas.

Layout of a login frame: card `display:grid; gap:18px; padding:30px 28px`; centered
header block (`gap:10px`, logo tile → title `text-h6/650` → subtext muted); field blocks
`grid gap:6px` (Label + Input); password label row has a right-aligned "Forgot?" link;
primary action = `Button size=wide` (full width); footer = centered `text-body-sm muted`
with underlined link.

### B · ACCOUNT / SETTINGS (`settings/profile/`) — `Account — Pine Restyle.dc.html`
**Wayfinding (Exploration 2, both shown):**
- **Breadcrumb baseline**: `Settings / Profile` (active crumb `text-brand/600`) + PageHeader
  + a profile `FormCard`.
- **Sectioned sidebar (stretch)**: 212px left rail, `border-r`, faint brand wash
  (`bg = background mixed 3% brand`); grouped links (Account: Profile[active=`bg-brand`
  white] · Security: Password/Two-factor/Passkeys · Connections), content area = PageHeader
  + FormCard. Shown light **and** dark. **Presentational only.**

**Surfaces:**
- **Hub** — stacked `FormCard`s: Profile (Avatar `size-14` "AL" fallback + Display name),
  Preferences (two `Switch` rows: Product emails on / Public profile off), Other sessions
  ("Sign out others" outline), and a **destructive** "Delete account & data" card.
- **Photo** — empty (muted 88px circle + person glyph + "Upload photo"), selected/preview
  (brand-gradient circle + brand-glow ring + "Save photo" / "Cancel"), uploading
  (`pin-spinner` → use `Spinner`/`StatusButton` + 64% progress bar), delete-confirm (renders
  **in place** per ADR-023: destructive tile + Cancel/Remove).
- **Password** — change (Current/New/Confirm), create-initial (OAuth-only account: "You
  signed up with Google. Add a password…"), mismatch (Confirm `aria-invalid` +
  "Passwords don't match.").
- **Change-email** — resting (shows current address + New email), success ("Confirm the
  change" — link emailed to new address).
- **Connections** — Google (linked, Disconnect), GitHub (linked, **Disconnect disabled** +
  note "You can't disconnect your only remaining sign-in method" — this is the
  tooltip-restricted last-method rule; use `Tooltip` on the disabled control), GitLab
  (unlinked, dashed + "Connect").
- **Passkeys** — list (key tiles: device name + added/last-used + "Remove"), empty (dashed
  card + "Add your first passkey").
- **2FA** — enabled status (shield tile + "Enabled" `Badge`) + destructive "Disable 2FA"
  card; enrolment (QR placeholder + 6-slot OTP + "Verify & enable").

### C · ADMIN (`admin/`) — `Admin — Pine Restyle.dc.html`
**Shell = left nav rail** (decision): 200px rail, `border-r`, faint brand wash; brand
logo lockup "Pine Admin"; items Blog[active=`bg-brand` white] / Cache. Content = branded
`PageHeader` (eyebrow "Admin" + title + "New post" action).

**Surfaces:**
- **Blog list** — the modern **`Table`** (toolbar: All/Published/Drafts segmented filter +
  search; select-all; sortable Updated; rows with select checkbox + monogram tile + title/
  slug + status pill + relative date + ⋯ menu **open** showing Edit/Unpublish/Copy
  link/Delete; **selected** first row with brand left bar; numbered pager footer). **Empty**
  (dashed card "No drafts yet" + "New post") and **loading skeleton** shown alongside.
- **Post editor** — breadcrumb + header actions ("Save draft" outline / "Publish" primary);
  two-column **live-preview split**: left = Title, **locked Slug** (disabled input + lock
  icon + "Slug locks once a post is published"), **Tags** (chip + input — use `TagInput`),
  Body `Textarea`, "Set cover image"; right = rendered preview (eyebrow + H1 + tag chips +
  body). **Cover-image dialog** rendered in place (drag-drop zone + Cancel/Use image).
- **Cache admin** — modern `Table`: in-card toolbar (search + "128 keys · 2.4 MB"), rows =
  `#` tile + mono key + TTL subtitle + size + ghost trash; footer count + "Flush all"
  destructive. **No-results** state (dashed card "No keys match …").

---

## Interactions & behavior
- **Focus**: `focus-cosy` everywhere (1px brand border + 3px brand-glow).
- **Hover**: table rows + nav/menu items → `bg-accent`; buttons per variant; ripple is
  prototype flavor, optional.
- **Pending**: `StatusButton status=pending` on submit; disable inputs.
- **Validation**: Conform + Zod; server-validated field errors via the `Field`/`ErrorList`
  model; error fields get `aria-[invalid]` (→ `--input-invalid` border + `--error-text`/
  `--destructive` message). Forgot-password must **not** leak account existence.
- **Route-based dialogs (ADR 023)**: 2FA enrolment/disable, deletes, cover-image, photo
  delete-confirm are **route-driven**, render **in place** (no Radix Portal) so they
  snapshot into `/styleguide`.
- **Motion budget**: restrained — cosy-focus, button/StatusButton states, at most **one**
  decorative brand-glow (auth). No scroll-reveal/breathe on task surfaces. All under
  `prefers-reduced-motion`.
- **Responsive**: centered card is single-column already; tables scroll/stack on narrow;
  sidebar/rail collapse as appropriate.
- **Dark mode**: every surface must support both (class-based `.dark` token flip, **applied
  server-side**, no flash). Prototype demonstrates dark for Login + the settings sidebar;
  replicate the flip across all surfaces (it's automatic via tokens).

## State management
- Form state via Conform (field values, server errors, pending/submitting).
- `Switch` controlled (on/off), `Table` selection (per-row + select-all), filter/search
  query, pagination page, row-action menu open/anchor, dialog open (route-driven).
- Theme = server-applied light/dark; in-shell toggle updates the preference.
- OTP value + complete; Turnstile token.

## Assets
- **Pine logo glyph** (inline SVG, `currentColor`): a stacked-triangle pine + trunk —
  ```html
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L18 10 H14.5 L20 17 H4 L9.5 10 H6 Z"></path><rect x="11" y="17" width="2" height="4.5"></rect></svg>
  ```
  Replace with the official brand mark if one exists in the codebase.
- All other icons are inline stroke SVGs (mail, check, key/passkey, shield, trash, search,
  chevron, dots, edit/unpublish/copy, hash) — swap for the codebase's `Icon` component set.
- **Google** OAuth glyph = a small conic-gradient circle (placeholder); **GitHub** = a dark
  circle (placeholder). Use the real provider marks.
- **Turnstile** widget is mocked (label + "Privacy · Terms"); use the real Cloudflare
  Turnstile component. QR code is a placeholder pattern; render the real enrolment QR.
- No raster assets.

## Files (in this bundle, for reference)
- `Auth Shell — Pine Restyle.dc.html` — auth shell (centered card) + all auth states +
  net-new primitives specimen.
- `Account — Pine Restyle.dc.html` — wayfinding (breadcrumb + sidebar, light/dark), hub,
  photo, password, email, connections, passkeys, 2FA.
- `Admin — Pine Restyle.dc.html` — left-rail shell, blog `Table` + editor + cache `Table`.

To view a prototype live, open it from the **project root** (the files reference the design
system bundle at `_ds/epic-stack-template-ui-…/` and a sibling `support.js`). These are
references only — implement against the real `epic-stack-template` codebase as described
above.

## Known gaps (not yet drawn — intentionally deferred)
For full PRD state coverage, still to add: signup-pending; onboarding field-errors +
pending; reset-password pending; change-email error + pending; passkey *registering* +
delete-confirm; 2FA *disabled*-index + disable-confirm dialog; explicit login→verify
redirect step; and dark-mode replication on every surface (token flip is proven on
Login + the settings sidebar). The original **(A) split/showcase** auth shell was explored
then dropped during condensing and is not in any file.
