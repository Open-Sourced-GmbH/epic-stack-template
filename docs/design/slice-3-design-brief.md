# Design Brief — Brand Restyle: Auth, Account & Admin (Slice ③)

## Source

PRD: **[Brand Restyle — Auth, Account & Admin (Slice ③)](https://linear.app/open-sourced/project/brand-restyle-auth-account-and-admin-slice-15b434099c01)**
(team `EPT`). A pure visual reskin of the auth, account/settings, and admin
surfaces to the shipping pine brand — no behavioral change.

## Foundation

**Current — no refresh needed.** HEAD (`a206dde`) is the latest `/design-sync`
republish, and no `ui/*` component or `tailwind.css` token has changed since. The
Claude Design Foundation faithfully reflects the real system. (The five net-new
primitives this slice adds don't exist yet — they're *outputs* of the
exploration, reconciled later by `/to-grounded-design`.)

## Surfaces to design

Derived from the PRD's user stories, with empty/loading/error/invalid states —
not just the happy path.

**Auth (`_auth/`) — inside the new auth shell + theme toggle:**

- **Login** — resting · invalid-credentials error · pending submit · with OAuth +
  passkey button rows · the 2FA-enabled branch (redirects to verify).
- **Signup** — resting · invalid-email · Turnstile present · pending · success
  ("check your email").
- **Onboarding** — username/name/password/ToS · field errors · pending · the
  `$provider` OAuth variant (pre-filled).
- **Forgot-password** — resting · submitted/success · (no account-existence leak).
- **Reset-password** — resting · password-mismatch error · pending.
- **Verify / OTP** — resting · invalid-code error · pending.
- **2FA challenge** (login-time) — OTP entry in the shell.
- **Cross-cutting:** light/dark via the in-shell theme toggle; responsive collapse
  (especially the split-panel option → single column on mobile).

**Account / Settings (`settings/profile/`):**

- **Hub** — the stacked sections (name/username edit, sign-out-other-sessions,
  delete-data) → branded `FormCard`s.
- **Photo** — empty avatar · file chosen/preview · uploading · delete-confirm.
- **Password** — change (current+new+confirm) and the create-initial variant ·
  errors · pending.
- **Change-email** — resting · error · pending · success.
- **Connections** — linked + unlinked providers · tooltip-restricted disconnect
  (last login method).
- **Passkeys** — list · empty · registering · delete.
- **2FA** — index status (enabled / disabled) · verify (QR + OTP enrolment) ·
  disable-confirm.
- **Wayfinding:** restyled breadcrumb baseline; **sectioned sidebar** as the
  flagged stretch. Toggles → the new `Switch`.

**Admin (`admin/`) — inside the new admin shell:**

- **Admin shell** — persistent nav rail (Blog / Cache) + branded page header.
- **Blog list** — `Table` rows · Draft/Published status badges · row-action
  dropdown · empty state (no drafts) · loading skeleton.
- **Post editor** — branded card/header language · live preview split ·
  cover-image dialog · tag input · publish/unpublish/locked-slug states.
- **Cache admin** — search · `Table` of keys · delete · empty/no-results.

## Build from

The grounded starting point — reuse these real components (with their variants)
and `@theme` tokens. See [styleguide.md](../agents/styleguide.md).

**Components (`app/components/ui/*` + `forms.tsx`):**

- **Forms:** `Field`, `CheckboxField`, `OTPField`, `TextareaField`, `ErrorList` —
  and `Input` (`aria-[invalid]` state), `Label`, `Textarea`, `Select`, `Checkbox`,
  `TagInput`.
- **Actions:** `Button` (variants `default`/`destructive`/`outline`/`secondary`/
  `ghost`/`link`; sizes `default`/`wide`/`sm`/`lg`/`pill`/`icon*`), `StatusButton`
  (pending/success/error), `Spinner`.
- **Surfaces:** `Card` (+`Header`/`Title`/`Content`/`Footer`), `Alert`, `Badge`
  (`default`/`outline`), `Avatar`, `Skeleton`, `Dialog`, `DropdownMenu`, `Tooltip`,
  `Pagination`, `Icon`.
- **Reference shell:** adapt (don't reuse) `MarketingLayout` / `AppFrame` patterns
  from `_marketing/`.

**Tokens (`tailwind.css`):** `--brand` / `--brand-soft` / `--brand-glow` (pine;
`--primary` and `--ring` already follow it); semantic `background`/`card`/
`popover`/`muted`/`secondary`/`accent`/`destructive` + foregrounds; `--border` /
`--input` / `--input-invalid` / `--error-text`; radii `rounded-sm/md/lg/xl` (+
`rounded-3xl` for large bands); the type scale (`text-mega`, `text-h1…h6`,
`text-body-*`, `text-caption`, `text-button`); the **`focus-cosy`** utility (1px
brand border + 3px brand-glow); the eyebrow pattern (`text-brand text-sm
font-semibold tracking-wide uppercase`).

## Open for exploration

Deliberately undefined — frame each as a question. Net-new is allowed here but
**flagged as a known cost**: `/to-grounded-design` reconciles every new piece
against the system afterward.

1. **Auth shell form factor — the headline question.** **(A) split/panel** (form
   beside a branded showcase panel with a decorative brand-glow + logo lockup/
   tagline/product motif) vs **(B) centered branded card** (single-column form in
   a branded card on a subtly branded background). Explore both; the marketing
   header/footer chrome is **excluded**. *Net-new layout.*
2. **Settings wayfinding stretch.** Does a **sectioned sidebar** (Profile /
   Security / Connections) beat the restyled-breadcrumb baseline — without implying
   new routes or moved URLs? Show the sidebar only if it stays purely
   presentational.
3. **The five net-new primitives' visual form** (all *net-new `ui/*`*, reconciled
   later):
   - **`Table`** — density, header treatment, row hover, zebra-or-not, how status
     `Badge` + row-action `DropdownMenu` sit in cells.
   - **`Switch`** — track/thumb sizing, on=brand, disabled, the dark-mode-toggle
     presentation.
   - **`Separator`** — plain rule + the labeled **"or continue with"** variant.
   - **`PageHeader`** — eyebrow + title + actions slot; one pattern across all
     three shells.
   - **`FormCard`** — padding, optional header, how it frames an auth form vs a
     settings section.
4. **Auth showcase-panel content** (option A) — what fills it: logo lockup,
   tagline, an abstract brand-glow motif. Decorative only.
5. **Admin nav form factor** — left rail vs top tabs for the admin shell.
6. **Empty-state treatment** — no-drafts / no-cache-results: voice + iconography
   within the branded `Table`.

## Constraints

Non-negotiables the design must respect:

- **No behavior change** — routes, URLs, fields, copy, and auth/RBAC/2FA logic are
  frozen (scope lock). Restyle only.
- **SSR-first** — server-rendered, no flash; the theme/accent are applied
  server-side (no client-only theming).
- **Route-based dialogs (ADR 023)** — multi-step/destructive flows (2FA enrolment,
  disable, deletes) are route-driven, not ad-hoc client modals.
- **Forms via Conform + Zod** — keep the `Field`/`ErrorList` model; design must
  accommodate server-validated field errors and pending states.
- **Accessibility** (`epic-ui-guidelines`) — labelled controls, focus-visible via
  `focus-cosy`, keyboard-operable `Switch`/`Table`/dropdowns, OTP fields,
  color-contrast in light **and** dark.
- **Responsive + dark mode** — every surface in both modes; the split-panel
  collapses gracefully on mobile.
- **Token-only** — all color/space/radius map to existing tokens (no hardcoded
  values); this is what keeps dark mode + the accent customizer working. Any
  net-new token must be **non-foundational layout** only (the `--pager-size` /
  `--editor-min-h` precedent).
- **Motion budget** — restrained: cosy-focus, button/`StatusButton` states, at most
  one decorative glow on the auth panel; **no** scroll-reveal/breathe on task
  surfaces; all under `prefers-reduced-motion`.
- **Accent customizer excluded** — it stays a marketing-only showcase; do not place
  the hue slider on these surfaces (a theme **toggle** is fine).
- **Overlay snapshot convention** — new overlay primitives render in place (no
  Radix Portal) so the open surface snapshots into `/styleguide`.

## Next step

Take this into **[Claude Design](https://claude.ai/design)** and explore — lead
with the **auth shell A-vs-B** question. When the exploration is done, **export
the dev handoff** and run **`/to-grounded-design`** to reconcile it against this
system (it's the authoritative gate for the final net-new component + token list,
and where the chrome-boundary ADR gets drafted).
