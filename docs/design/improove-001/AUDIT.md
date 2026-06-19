# Epic Stack UI — design-system audit & integration plan (re-audit)

> Companion to the visual handoff at `handoff/index.html`. Every claim here is
> verified against the shipping bundle (`_ds_bundle.js` / `_ds_bundle.css`),
> not from memory. Package: **epic-stack-template@0.1.0**, **12 components**, Tailwind v4.

> **Re-audit note.** Since the first pass the library grew from 9 → 12 components
> (**Accordion · Slider · CommandPalette**, all ADR-019 Foundation parts). None of
> the earlier P0/P1 recommendations (Field, Card, unified invalid state, cosy
> focus) were applied — to the old components or the new ones — so every item
> below still stands and now covers a larger surface. The new components add their
> own gaps (see §2) and one re-prioritization (Dialog P2 → P1, §4).

This doc is written to drop straight into a PR description or a tracking issue.
Items are tagged **P0 / P1 / P2** by impact-over-effort.

---

## TL;DR

| Pri | Item | Why |
|---|---|---|
| **P0** | Standardize the **invalid** state across all form controls | `aria-invalid` is documented on `Input` only; `Textarea`/`Checkbox`/`InputOTP` have no invalid treatment despite the tokens existing |
| **P0** | Add a **Field / FormField** primitive (Label + control + description + error) | Every consumer hand-rolls error markup today; `--foreground-destructive` + `--input-invalid` already exist for it |
| **P0** | Add a **Card** primitive | README idiom hand-rolls `bg-card border rounded-lg p-4` everywhere; `--card` / `--card-foreground` already exist |
| **P1** | Curate a semantic **`tokens.css`** | 207 declared tokens (was 195), only ~24 are real — the rest are Tailwind `--tw-*` internals; noise grows each sync |
| **P1** | Add **Alert · Select · Badge · Spinner**, and promote **Dialog** | Recurring patterns with no primitive; CommandPalette already hand-rolls a focus-trap that a shared Dialog should own |
| **P2** | Add **Separator · Switch · RadioGroup · Toast · Skeleton** | Next tier; Skeleton unblocks real loading/empty states (incl. CommandPalette async results) |

---

## 0 · What changed since the last audit

Three Foundation components (ADR 019) were added; the bundle now exports them at
`window.EpicUI.*` (`Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`,
`Slider`, `CommandPalette`). They are solid, token-styled, and Radix-backed where
relevant — but they shipped **without** the earlier audit's cross-cutting fixes:

- **No Field wrapper still** — `Slider` especially wants a label + live value
  output; today every consumer hand-rolls it.
- **Focus not unified** — `Accordion`/`Slider` use the stock detached ring, not
  the proposed cosy-focus standard (§3.5).
- **`tokens.css` not curated** — the declared-token count rose from **195 → 207**
  (all the growth is `--tw-*` engine internals), so the noise problem is worse,
  not better.
- **`CommandPalette` duplicates a modal** — it ships its own focus-trapped
  overlay, which is exactly the Dialog primitive that was filed at P2. That
  duplication is why Dialog moves up to **P1** (§4).

---

## 1 · Tokens

### 1.1 The real surface is ~25 semantic tokens
Full light/dark parity is in place — every color flips on `.dark`. A **brand
accent** (`--brand`, repo ADR 062) drives `--primary` and `--ring`, so one value
re-tints every primary action and focus ring; it is mode-independent (same Pine
in light and dark) and runtime-customizable per request. The type scale is fully
defined in an `@theme` block. Verified set (values upstream, verbatim):

| Token | Role | Light | Dark |
|---|---|---|---|
| `--brand` (→ `--primary`, `--ring`) | Brand accent · ADR 062 | `oklch(60% .135 172)` | same (mode-independent) |
| `--background` / `--foreground` | Page surface / text | `oklch(100% 0 0)` / `oklch(13.71% .036 258.53)` | inverted |
| `--card` / `--card-foreground` | Card surface / text | white / near-black | near-black / near-white |
| `--popover` / `--popover-foreground` | Menu surface / text | — | — |
| `--primary` / `--primary-foreground` | Primary action (follows `--brand`) | `var(--brand)` = Pine | `var(--brand)` = Pine |
| `--secondary` / `--secondary-foreground` | Secondary fill | `oklch(86.48% .0153 248)` | `oklch(34.74% .0295 260.13)` |
| `--muted` / `--muted-foreground` | Subtle surface / text | — | — |
| `--accent` / `--accent-foreground` | Hover fill | `oklch(91.87% .0177 248.02)` | `oklch(20.56% .0228 260.05)` |
| `--destructive` / `--destructive-foreground` | Danger | `oklch(57.14% .2121 27.25)` | `oklch(47.6% .159 25.64)` |
| `--border` · `--input` · `--ring` | Hairlines · field border · focus (`--ring`=`--brand`) | — | — |
| `--input-invalid` · `--foreground-destructive` | Invalid border · error text | `oklch(63.68% .2078 25.33)` · `oklch(51.46% .1979 16.57)` | darker |
| `--radius` | `0.5rem` base for the whole rounding scale | | |

### 1.2 Token noise — **P1** (this is what the in-project DS checker flags)
The authored source (`styles.css`) is already clean — semantic tokens in
`:root`/`.dark` plus an `@theme` block. The noise lives **only in the compiled
`_ds_bundle.css`**, and at the latest sync the declared count has grown to **207**
(from 195 at the first audit — all the growth is more `--tw-*` internals). It's
two distinct Tailwind v4 artifacts:

1. **~170 engine-internal registered properties** — `--tw-translate-x`,
   `--tw-scale-*`, `--tw-shadow`, `--tw-ring-shadow`, `--tw-border-style`,
   `--tw-animation-*`, … emitted by `@property` / `@layer properties`. The DS
   sync counts them as "tokens"; 34 unique can't be classified.
2. **32 custom properties declared under utility selectors** — e.g.
   `.group-hover\:translate-x-1:is(...)` and `.group-[.toaster]\:shadow-lg:is(...)`.
   These are per-utility var declarations, not theme tokens.

Neither is a design decision, and neither can be durably fixed *in this project*:
they're regenerated verbatim by the Tailwind build on every `/design-sync`, and
the checker classifies straight from the CSS (it ignores the `tokenKinds` map in
`_adherence.oxlintrc.json`, so extending that map does **not** clear the warning).

**The fix is at sync/build time — pick one:**

- **(a) Filter at sync (recommended).** Have the design-sync extractor skip any
  custom property that is (i) named `--tw-*`, or (ii) declared under a selector
  other than `:root` / `.dark` / `[data-theme]` / `@theme`. Engine internals and
  utility-scoped vars then never enter the token surface. One rule, permanent.

- **(b) Annotate at emit.** If you'd rather keep them visible, have the build/sync
  append `/* @kind other */` to each non-semantic property as it writes
  `_ds_bundle.css` (so the comment is regenerated, not hand-added). The checker
  accepts `@kind other` as "intentionally uncategorized."

Doing this by hand in `_ds_bundle.css` here would be overwritten on the next sync,
so it's deliberately left for upstream.

### 1.3 Confusing naming — **P1**
`--destructive-foreground` = text that sits **on** a destructive fill.
`--foreground-destructive` = the **red error-text color** for messages.
These are one transposition apart and easy to swap by accident.

- **Action:** alias `--foreground-destructive` → `--error-text` (keep the old
  name as a deprecated alias for one release).

### 1.4 Dark-mode `accent` contrast — review
In dark mode `--accent` is `L 20.56%` against `--background` `L 13.71%` — a hover
fill that's only ~7 L apart from the surface. Verify the hover affordance is
perceptible (and meets a non-text contrast bar) on `ghost`/menu items in dark.

---

## 2 · Component coverage matrix

✓ covered · ◐ partial/undocumented · ✕ missing · – n/a

| Component | default | hover | focus | disabled | invalid | loading | Notes |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **Button** | ✓ | ✓ | ✓ | ✓ | – | →StatusButton | 6 variants × 6 sizes |
| **StatusButton** | ✓ | ✓ | ✓ | ✓ | – | ✓ | idle/pending/success/error |
| **Input** | ✓ | ✕ | ✓ | ✓ | ✓ | – | `aria-invalid` wired |
| **Textarea** | ✓ | ✕ | ✓ | ✓ | ◐ | – | invalid accepted but undocumented |
| **Checkbox** | ✓ | ✕ | ✓ | ✓ | ✕ | – | supports `indeterminate` |
| **Label** | ✓ | – | – | ◐ | – | – | no required/disabled convention |
| **InputOTP** | ✓ | ✕ | ✓ | ✓ | ✕ | – | no invalid state |
| **DropdownMenu** | ✓ | ✓ | ✓ | ✓ | – | – | most complete part |
| **Tooltip** | ✓ | ✓ | ✓ | – | – | – | auto-provider |
| **Accordion** · _new_ | ✓ | ✓ | ✓ | ◐ | – | – | Radix disclosure; `single`/`multiple`; grid-rows anim |
| **Slider** · _new_ | ✓ | ✓ | ✓ | ✓ | – | – | single-thumb; `trackGradient` slot |
| **CommandPalette** · _new_ | ✓ | ✓ | ✓ | – | – | ✕ | ⌘K; inline or dialog overlay |

### Per-component gaps
- **Button** — icon-only size has no enforced `aria-label`; add an ESLint rule or
  a typed discriminated prop. No positive/success variant.
- **StatusButton** — success/error are transient with no documented reset timing;
  spinner is locked inside the component (see Spinner proposal).
- **Input** — no leading/trailing icon or prefix slot, no size variants, no
  error-message slot (see Field).
- **Textarea** — no auto-resize, no character counter, no shown invalid example.
- **Checkbox** — no invalid/error state; no "checkbox + description" pattern.
- **InputOTP** — no invalid state; separator usage left entirely to the consumer.
- **Label** — no required-asterisk convention; no disabled-dimming tied to its
  control's state.
- **DropdownMenu** — document destructive-item styling (it's the one place a
  "remove/delete" item recurs).
- **Accordion** _(new)_ — disabled item is accepted by Radix but neither shown
  nor documented; `type="multiple"` has no specimen; uses the stock detached
  focus ring instead of the proposed cosy-focus standard. No guidance for nested
  or section-grouped accordions.
- **Slider** _(new)_ — single-thumb only (no range / two-thumb), no tick marks,
  no value output/tooltip, no vertical orientation. No label+value pairing — this
  is the clearest consumer of the proposed **Field**.
- **CommandPalette** _(new)_ — no async/loading state for remote command sources
  (needs the proposed **Skeleton**); the ⌘K key binding is left to the consumer;
  it hand-rolls its own focus-trapped overlay rather than composing a shared
  **Dialog** (see §4).

---

## 3 · Consistency findings

1. **Invalid state is the biggest inconsistency — P0.** Only `Input` documents
   `aria-invalid`. Standardize: every form control reads `aria-invalid`, paints
   with `--input-invalid`, and pairs with `--foreground-destructive` message text.
2. **No field wrapper — P0.** There is no Label+control+description+error
   composite, so error markup is reinvented per screen. The tokens for it already
   exist; only the component is missing.
3. **Card is hand-rolled — P0.** The README's own idiom is
   `bg-card text-card-foreground rounded-lg border p-4`. That's a Card component
   waiting to happen.
4. **Loading lives only inside StatusButton.** Extract a standalone Spinner so
   inline and full-page loading don't depend on a button.
5. **Focus is hard and inconsistent — proposed standard.** Controls use a
   detached 2px ring with a 2px offset (`ring-2 ring-offset-2`), and most don't
   transition it — only the OTP active slot animates, so the rest feel abrupt.
   Standardize a single **cosy focus**: a 1px brand border hugging the control +
   a soft `--brand-glow` halo, eased in/out. Bake it into the shared control
   classes upstream so it's not a per-consumer override:

   ```css
   /* replaces: focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden */
   input, textarea, button, [class*="ring-"] {
     transition: box-shadow .2s cubic-bezier(.32,.72,0,1),
                 border-color .2s cubic-bezier(.32,.72,0,1),
                 background-color .2s ease, color .15s ease;
   }
   /* all controls show on :focus (click or keyboard) — matches the OTP feel */
   input:focus, textarea:focus, button:focus, .ring-ring.ring-2 {
     outline: none;
     box-shadow: 0 0 0 2px oklch(from var(--brand) l c h / 0.2);   /* thin, light, finer than ring-2 */
     border-color: var(--brand);
   }
   @media (prefers-reduced-motion: reduce) {
     input, textarea, button, [class*="ring-"] { transition: none; }
   }
   ```

   It's applied live in `handoff/index.html` and both templates as a preview.
   `--brand-glow` already exists (`oklch(from var(--brand) l c h / 0.32)`).
6. **Button size scale has drifted — reconsider.** Real shipped values:
   `sm h-9 px-3` · `default h-10 px-4 py-2` · `lg h-11 px-8` ·
   `pill px-12 py-3 leading-3` · `icon size-10` · `wide px-24 py-5`. Issues:
   - `pill` has no `rounded-full` (so it isn't a pill) and `leading-3` can clip
     the label. Model it as a shape at default height: `h-10 px-6 rounded-full`.
   - `wide` sets no height (`py-5` → ~60px, off-scale) and `px-24` (96px) is
     extreme. It's only used as a form submit → make it `h-10 w-full`.
   - Heights step 36/40/44 and padding jumps 16→32. Propose a cleaner scale:

   | size | height | x-padding | radius |
   |---|---|---|---|
   | `sm` | 32 (`h-8`) | 12 (`px-3`) | md |
   | `default` | 40 (`h-10`) | 16 (`px-4`) | md |
   | `lg` | 48 (`h-12`) | 24 (`px-6`) | md |
   | `icon` / `icon-sm` / `icon-lg` | 40 / 32 / 48 | — | md |
   | `pill` | 40 (`h-10`) | 24 (`px-6`) | full |
   | `wide` | 40 (`h-10`) | full-width | md |

   Previewed live in the handoff (section 05).

---

## 4 · Proposed additions (with the tokens that already back them)

### P0
- **`Field` / `FormField`** — `<Field>` renders `Label` + the control via
  `children` + optional description + error, wires `htmlFor`/`id`/`aria-invalid`/
  `aria-describedby` automatically. Tokens: `foreground-destructive`,
  `input-invalid` (exist).
- **`Card`** family — `Card, CardHeader, CardTitle, CardDescription, CardContent,
  CardFooter`. Tokens: `card`, `card-foreground` (exist).

### P1
- **`Alert` / `Callout`** — form- and page-level messages (info/success/warn/
  error). Tokens: `destructive`, `muted` (exist).
- **`Select`** — Radix Select styled to match `Input`; forms need a labelled
  select, not a DropdownMenu. Tokens: `input`, `ring`, `popover` (exist).
- **`Badge`** — status pills for rows/lists; map to secondary/destructive/outline.
  No new tokens.
- **`Spinner`** — extract StatusButton's spinner. No new tokens.
- **`Dialog`** — _promoted from P2._ `CommandPalette` already ships a
  focus-trapped overlay; extract that trap/overlay as a shared `Dialog` so the
  palette and modal confirmations compose one primitive instead of two. Tokens:
  `popover`, `border` (exist).

### P2
- **`Separator`** — extract the divider already inside DropdownMenu.
- **`Switch`**, **`RadioGroup`** — common form controls absent.
- **`Toast` (Sonner)**, **`Skeleton`** — notifications and loading placeholders.
  Skeleton unblocks proper empty/loading — including `CommandPalette`'s missing
  async-results state.

### Suggested API — `Field` (P0)
```tsx
interface FieldProps {
  label: React.ReactNode
  htmlFor: string
  description?: React.ReactNode
  error?: React.ReactNode        // when set: control gets aria-invalid + the red border
  required?: boolean
  children: React.ReactNode      // the control (Input, Textarea, Select, …)
}
// → <Label> + control + <p class="text-foreground-destructive"> error,
//   with aria-describedby / aria-invalid wired automatically.
```

### Suggested API — `Card` (P0)
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
// bg-card text-card-foreground rounded-lg border — promotes the README idiom.
```

---

## 5 · Accessibility checklist for the PR
- [ ] Visible focus ring (`--ring`) on **every** interactive element in both modes;
      verify ≥3:1 non-text contrast against the adjacent surface.
- [ ] Icon-only `Button` requires `aria-label` (lint or type-enforce).
- [ ] Form controls expose `aria-invalid` + `aria-describedby` (delivered by `Field`).
- [ ] `StatusButton` respects `prefers-reduced-motion` for the spinner.
- [ ] Dark-mode `accent` hover passes a perceptible-contrast check.

---

## 6 · How this maps back to the repo
- The visual handoff (`handoff/index.html`) renders the **real** bundle and the
  reference screens — use it as the acceptance reference.
- Reference screens are composed only from shipping components + tokens, so the
  JSX is directly liftable. Where they hand-roll Field/Card/Badge/Avatar/Skeleton,
  that's the exact code those proposed primitives should replace.
- Source-of-truth fixes belong in the upstream `epic-stack-template` repo, then
  re-synced here via `/design-sync`. Nothing in this project edits the synced
  source.
