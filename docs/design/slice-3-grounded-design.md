# Grounded Design Spec — Brand Restyle: Auth, Account & Admin (Slice ③ · "Pine")

> The UI→system mapping for `/to-issues`. Every element below is reconciled
> against the real `app/components/ui/*` + `forms.tsx` components and the
> `app/styles/tailwind.css` `@theme` tokens. The PRD stays the authoritative
> decision record; this spec is the detailed mapping.

## Source

- **Handoff:** `docs/design/design_handoff_pine_restyle/` (Claude Design export —
  `README.md` + `Auth Shell`, `Account`, `Admin` `.dc.html` references). The
  `.dc.html` files are **references, not code to port**; the README's
  "⚠️ Prototype-only artifacts" list (injected border-fix styles, CSS-spinner
  buttons, `<div>` OTP/Switch/Table mockups, bundle-gate loader, tweak props) is
  **dropped** — the real build uses the native Tailwind build, the `Icon` sprite,
  `StatusButton`, `OTPField`/`InputOTP`, and the real new primitives.
- **PRD:** [Brand Restyle — Auth, Account & Admin (Slice ③)](https://linear.app/open-sourced/project/brand-restyle-auth-account-and-admin-slice-15b434099c01)
  (team `EPT`).
- **Foundation:** HEAD `a206dde` — current; no `ui/*` or token drift since the
  last `/design-sync`.

## Grounding decisions (HITL, this pass)

| # | Decision |
|---|---|
| 1 | **`Switch` builds on `@radix-ui/react-switch`** (new dep) — matches the Checkbox/Slider/Select primitives; a11y (`role=switch`, `aria-checked`, keyboard) comes free, we style track/thumb with brand tokens + `focus-cosy`. |
| 2 | **`Separator` builds on `@radix-ui/react-separator`** (new dep) for the plain rule; the labeled "or continue with" variant is composed on top. |
| 3 | **`Badge` gains a tonal `brand` variant + optional leading dot** — status pills (Published / Draft / "Enabled") stay systemic instead of bespoke Table markup. |
| 4 | **Chrome-boundary recorded as [ADR-066](../decisions/066-auth-and-admin-shell-chrome-boundary.md)** — new auth-shell + admin-shell layout components (not a fork of `_marketing/__app-frame`), customizer-excluded / theme-toggle boundary. |
| — | **`--brand-deep` is NOT added.** It was a prototype-only helper for the dropped (A) split/showcase auth panel (decision B won). No foundational token is introduced this slice. |

## Foundation reconciliation (tokens)

Every color/space/radius in the handoff maps to an **existing** token — confirmed
against `tailwind.css`:

- **Brand:** `--brand` (pine `oklch(60% 0.135 172)`), `--brand-soft`, `--brand-glow`
  all exist; `--primary`/`--ring` already follow `--brand`. ⚠️ The handoff's
  reference value for `--brand-soft` (`oklch(96% 0.025 172)`, opaque) is **stale** —
  the real token is `color-mix(in srgb, var(--brand) 13%, transparent)` (a
  translucent tint). Use the real token: it tints icon tiles / OAuth banners / pill
  fills correctly over any surface. `--brand-glow` is `/0.32` (handoff said `/0.28`)
  — real token wins.
- **Utilities:** `bg-brand` / `text-brand` / `border-brand` / `bg-brand-soft` /
  `bg-brand-glow` resolve via `@theme inline` (ADR-062). Never reintroduce
  `bg-[--brand]` arbitrary values.
- **Semantic:** `background`/`card`/`popover`/`muted`/`secondary`/`accent`/
  `destructive` (+ foregrounds), `border`/`input`/`input-invalid`/`error-text` —
  all present in `:root` **and** `.dark`, so dark mode is automatic via the token
  flip.
- **Radii:** `rounded-sm/md/lg/xl` from the `--radius` scale; `rounded-3xl` (large
  bands) and `rounded-full` are Tailwind built-ins. The handoff's arbitrary radii
  (`calc(var(--radius)+6px)`, `rounded-[14px]`, `rounded-[9px]`, `rounded-[8px]`)
  map to `rounded-xl` / `rounded-lg` / `rounded-md` — **do not inline the px**.
- **Type:** `text-mega`/`text-h1…h6`/`text-body-2xl…2xs`/`text-caption`/`text-button`
  all exist; the handoff's px→intent map (`text-h6/650`, `text-body-sm`, eyebrow)
  uses them.
- **Focus & eyebrow:** `focus-cosy` (+ `focus-cosy-active` for the InputOTP slot)
  are real utilities; eyebrow = `text-brand text-sm font-semibold tracking-wide
  uppercase`.
- **New tokens:** **none foundational.** Any shared dimension that emerges while
  building the primitives (e.g. nav-rail width, switch track size, table row
  height) follows the **non-foundational layout token** precedent already in
  `:root` (`--pager-size`, `--editor-min-h`, `--combobox-min-h`) — added only if a
  value is genuinely shared across consumers, never for a one-off (use a Tailwind
  spacing utility for those).

## Grounded UI

### A · Auth (`_auth/`) — centered branded card (decision B)

**Shell (net-new chrome, ADR-066):** a shared auth-shell layout — viewport
`bg-background` with a faint top brand radial (single decorative glow, the
slice's one motion indulgence, under `prefers-reduced-motion`), a centered
`FormCard` (`max-w-[~360px]`), a `rounded-xl bg-brand` logo tile (the `Icon`
sprite's pine glyph), eyebrow + title, footer link row, and the in-shell
**theme toggle** (`Switch` + sun/moon `Icon`, server-applied per ADR-005, no
client-only theming).

- **Login** → form fields via `Field` (Conform+Zod); primary `Button size="wide"`;
  `StatusButton status="pending"` on submit; invalid-credentials → `Alert` (error
  tone) + `Field`s `aria-invalid` (→ `--input-invalid`/`--error-text` via
  `ErrorList`). OAuth/passkey block: labeled `Separator` ("or continue with") then
  `Button variant="outline"` rows (Google / GitHub / passkey) with provider `Icon`s.
  2FA-enabled branch redirects to **Verify** (unchanged logic).
- **Signup** → `Field` (Name/Email/Password), real Cloudflare **Turnstile**
  component (not the mock), `CheckboxField` (ToS), `StatusButton`. Success
  ("check your email") = `bg-brand-soft` mail-`Icon` tile + body + resend `Button`.
- **Onboarding** → `Field` (Display name/Username/Password) + `CheckboxField` (ToS);
  `$provider` variant = `bg-brand-soft` banner + pre-filled fields, no password.
- **Forgot-password** → `Field` (Email) + `StatusButton`; success = neutral
  "If an account exists…" (no existence leak — behavior frozen).
- **Reset-password** → `Field` (New/Confirm); mismatch → Confirm `aria-invalid` +
  `ErrorList`.
- **Verify / OTP & login-time 2FA** → `OTPField`/`InputOTP` (active slot uses
  `focus-cosy-active`); invalid-code → slots `border-destructive` + `ErrorList`;
  pending state via `StatusButton`.
- **Cross-cutting:** light/dark via the in-shell toggle; single-column already
  responsive.

### B · Account / Settings (`settings/profile/`) — restyle in place

Restyle the **existing** `profile/_layout.tsx`; no route/URL changes.

- **Wayfinding:** restyled breadcrumb baseline (active crumb `text-brand`) +
  `PageHeader`. **Sectioned sidebar = flagged stretch**, purely presentational —
  a 212px rail grouping the existing pages (Account / Security / Connections),
  active item `bg-brand text-primary-foreground`, faint brand wash
  (`color-mix` background). Adds **no** routes.
- **Hub** → stacked `FormCard`s (Profile: `Avatar` + name `Field`; Preferences:
  `Switch` rows; Other sessions: `Button variant="outline"`); destructive "Delete
  account & data" = `FormCard` destructive variant.
- **Photo** → empty (`Avatar` fallback + upload `Button`), preview (brand-glow ring),
  uploading (`StatusButton`/`Spinner` + progress), delete-confirm rendered **in
  place** (ADR-023, no Portal).
- **Password / Password-create** → `Field`s; mismatch → `aria-invalid` + `ErrorList`.
- **Change-email** → `Field` + success state; behavior frozen.
- **Connections** → linked/unlinked provider rows; last-method disconnect is a
  **disabled** control wrapped in `Tooltip` (restriction note).
- **Passkeys** → list of key tiles + remove `Button`; empty = dashed `FormCard` +
  add `Button`.
- **2FA** → status with tonal `Badge` ("Enabled"); enrolment = QR + `OTPField` +
  `StatusButton`; disable-confirm route-driven (ADR-023). All toggles → `Switch`.

### C · Admin (`admin/`) — left nav rail (decision)

**Shell (net-new chrome, ADR-066):** a shared admin-shell layout — 200px left rail
(`border-r`, faint brand wash), "Pine Admin" logo lockup, items Blog / Cache
(active `bg-brand text-primary-foreground`), content area = `PageHeader` (eyebrow
"Admin" + title + actions slot).

- **Blog list** → the new **`Table`**: toolbar (segmented All/Published/Drafts
  filter + search `Input`), select-all `Checkbox`, sortable "Updated" header, rows
  = `Checkbox` + monogram tile (`bg-brand-soft`/`bg-muted`) + title/slug + status
  **`Badge` (tonal `brand` + dot)** + relative date + `Button variant="ghost"
  size="icon-sm"` (⋯) opening a `DropdownMenu` (Edit / Unpublish / Copy link / —
  / **Delete** `text-destructive`). Selected row = brand left bar (`inset box-shadow
  var(--brand)`). Footer = count + **`Pagination`** (reuse the existing primitive,
  not a bespoke pager). Empty = dashed `FormCard` ("No drafts yet" + `Button`);
  loading = `Skeleton` rows. *(Replaces the current hand-rolled `<table>` in
  `admin/blog/index.tsx`.)*
- **Post editor** → breadcrumb + header actions ("Save draft" `outline` / "Publish"
  primary); live-preview split (left: Title `Field`, **locked Slug** disabled
  `Input` + lock `Icon` + note, **`TagInput`**, Body `Textarea`, "Set cover image";
  right: `.prose` rendered preview). Cover-image dialog rendered **in place**
  (ADR-023). Existing editor behavior (debounced preview, slug lock) unchanged.
- **Cache admin** → the new **`Table`**: in-card toolbar (search + count), rows =
  `#` tile + mono key + TTL subtitle + size + `Button variant="ghost" size="icon-sm"`
  (trash); footer count + "Flush all" destructive `Button`. No-results = dashed
  `FormCard` ("No keys match …").

## Net-new

### Components (all `app/components/ui/*`, each needs the 4-file design-sync lockstep + a specimen)

> Adding a `ui/*` primitive requires editing `design-sync.config.json`, the barrel,
> `specimens.tsx`, **and** the `.design-sync` preview together, or
> `design-sync.test.ts` goes red (per repo convention). One `/design-sync`
> republish covers all five + the Badge variant.

- **`Switch`** — `@radix-ui/react-switch` base. Track `rounded-full`, off
  `bg-muted` / on `bg-brand`, white thumb, ~200ms transition (reduced-motion
  honored), disabled `opacity-50`, `focus-cosy`. Dark-mode-toggle composition =
  Switch + sun/moon `Icon` + label. **Unit-tested** (toggle, keyboard, disabled,
  aria). Specimen: resting on/off, disabled, theme-toggle composition.
- **`Separator`** — `@radix-ui/react-separator` base for the plain `bg-border`
  rule; **labeled** variant = flex hairline · uppercase muted label · hairline.
  Specimen: plain + labeled ("or continue with").
- **`Table`** — bespoke (no Radix); `bg-card border rounded-xl` container,
  `grid`-based header/rows, hover `bg-accent`, optional zebra (off by default),
  selectable rows, monogram tile, status `Badge`, row-action `DropdownMenu`,
  `Pagination` footer, empty + `Skeleton` loading. Column templates are
  per-consumer props. **Unit-tested** (render rows, select-all, empty, a11y).
  Specimen: populated (blog), empty, loading.
- **`PageHeader`** — bespoke; `flex items-end justify-between`, left = eyebrow +
  title (`text-h4`), right = actions slot. One pattern across all three shells.
  Specimen: with + without actions.
- **`FormCard`** — bespoke; `bg-card border rounded-xl`, optional header
  (title + description), body padding, **destructive variant** (per the
  destructive-zone pattern). Frames auth forms and settings sections. Specimen:
  plain, with header, destructive.

### Component variant

- **`Badge` tonal `brand` variant + optional dot** — extend
  `app/components/ui/badge.tsx` `cva` with a `brand` variant (card-mixed brand fill
  + brand text) and an optional leading status dot. Used for Published/Draft pills
  and the 2FA "Enabled" badge. Update the existing `badge` specimen.

### Tokens

**None foundational.** `--brand-deep` is explicitly **not** added. Non-foundational
layout tokens added only if a shared dimension emerges (precedent:
`--pager-size`/`--editor-min-h`/`--combobox-min-h`).

### Dependencies

- `@radix-ui/react-switch`, `@radix-ui/react-separator` (both new).

## Convention notes

- **SSR-first** — theme/accent applied server-side via the `en_theme`/`en_accent`
  cookies (ADR-005 / ADR-062); the in-shell theme **toggle** updates the
  preference, no client-only theming, no FOUC. The **accent customizer stays
  marketing-only** — do not place the hue slider on these surfaces.
- **Route-based dialogs (ADR-023)** — 2FA enrolment/disable, account/photo/passkey
  deletes, and the cover-image picker are route-driven and render **in place** (no
  Radix Portal), so the open surface snapshots into `/styleguide` (overlay
  convention).
- **Forms via Conform + Zod** — keep the `Field`/`ErrorList` model; server-validated
  field errors → `aria-invalid` → `--input-invalid`/`--error-text`. No copy, field,
  or validation-logic changes (scope lock).
- **Accessibility (`epic-ui-guidelines`)** — labelled controls, `focus-cosy`
  focus-visible, keyboard-operable `Switch`/`Table`/dropdowns/OTP, contrast in
  light **and** dark.
- **New ADR:** [ADR-066 — Auth & Admin Shell Chrome Boundary](../decisions/066-auth-and-admin-shell-chrome-boundary.md).
  **Respected:** ADR-005 (pref cookies), ADR-023 (route dialogs), ADR-062 (brand
  token / customizer scope), ADR-064 (`.prose` for the editor preview).
- **Known gaps (handoff §Known gaps)** — states not pixel-drawn (signup-pending,
  onboarding errors, reset pending, change-email error/pending, passkey
  registering/delete-confirm, 2FA disabled-index/disable-confirm, explicit
  login→verify step, full dark replication). These are **in scope** (the PRD
  enumerates every state); they reuse the visual language the drawn states
  establish — not bespoke, not deferred.

## Scope additions (post-`/to-prd`, 2026-06-23)

`/to-prd` admitted **two feature additions** on top of the restyle (the rest stays
behavior-frozen) — folded into the PRD's Implementation Decisions:

- **Row selection + bulk actions.** `Table` selection is real (not deferred),
  powered by a pure **`useRowSelection`** module. The blog list gets select +
  select-all and **bulk Unpublish / bulk Delete** (a perm-guarded bulk post
  mutation reusing Slice ②b publish-lifecycle semantics); the cache list gets
  multi-select + **bulk Delete** beside Flush-all.
- **One real preference:** `User.allowProductEmails Boolean @default(true)`
  (+ migration), surfaced as a `Switch` in a Preferences `FormCard`, read/written
  via a `userPreferences` module; consulted at the product-email send site (no
  mailer built this slice). **"Public profile" is dropped** — no public
  user-profile surface exists (the only public user footprint is the post Author
  byline).

## Ready for /to-issues

Grounded and sliceable: 5 net-new `ui/*` primitives + 1 Badge variant + 2 Radix
deps + ADR-066, every other element mapped to existing components/tokens, no new
foundational token. The PRD's milestones (③a primitives → ③b auth → ③c settings →
③d admin → ③e polish) carry straight through.
