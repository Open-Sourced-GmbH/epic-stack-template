# Grounded Design Spec — Blog/CMS & Public Blog (Slice ②)

> Output of `/to-grounded-design`. It annotates the Claude Design handoff with
> concrete `ui/*` + `@theme` references so `/to-issues` can slice it without
> re-deriving the design. Not published to the tracker — hand it to `/to-issues`
> alongside the PRD.

## Source

- **Handoff:** `docs/design/design_handoff_blog/` (Claude Design dev handoff —
  `README.md` §1–5, `styles/blog.css`, `app/*.jsx` prototype).
- **PRD:** [Blog/CMS & Public Blog (Slice ②)](https://linear.app/open-sourced/document/prd-blogcms-and-public-blog-slice-af01acda6dee)
  in project [2-8050278b2d56](https://linear.app/open-sourced/project/2-8050278b2d56/overview).
- **ADRs:** [050](../../decisions/050-blog-cms-replaces-notes.md) (blog replaces
  notes), [063](../../decisions/063-markdown-rendering-pipeline-for-posts.md)
  (Markdown pipeline + **resolved code palette**),
  [064](../../decisions/064-long-form-prose-typography-ramp.md) (prose ramp).

**Grounding verified against this repo** (not the handoff's assumed published
package): every DS primitive the handoff names exists in `app/components/ui/` —
`Card`, `Badge`, `Button`, `Avatar`/`AvatarFallback`, `Select`, `CommandPalette`,
`DropdownMenu`, `Dialog`, `Field`, `Input`, `Label`, `Textarea`, `StatusButton`,
`Alert`, `Skeleton` — and every colour token resolves in `app/styles/tailwind.css`.

## Grounded UI

Per surface, handoff elements mapped to the system. States are expressed in terms
of existing components, not bespoke markup. Accent (`--brand`/`--primary`/`--ring`)
is **Pine** `oklch(60% .135 172)` everywhere — never a literal.

### Public — `/blog` (index)
- **Page header** → eyebrow + title from the **display type scale**
  (`--text-h1`/`--text-h2`) + `text-muted-foreground` sub.
- **Featured hero lead** (first post) → `Card` composition, 2-col `1.02fr 1.3fr`,
  stacks `<820px`. Cover panel = net-new cover-art system; body = `Badge`
  (secondary) tags + title + excerpt + **Byline**.
- **Card grid** → `repeat(auto-fill, minmax(20rem,1fr))`, each card = `Card`
  (+Header/Content) with 16/9 cover, `Badge` tags, title, 2-line excerpt,
  author chip (`Avatar`+`AvatarFallback`). Cards are real `<a>` links.
- **Pagination** → **net-new `Pagination` primitive** (6/page, `publishedAt`
  desc, drafts excluded).
- **States:** populated (hero+grid) · **empty** → centered empty-state, icon
  tile (`Icon`) + heading + `Button variant="outline"` → editor · **page 2+** →
  hero hidden, grid + pager · **loading** → `Skeleton` feed (hero + 6 cards).

### Public — `/blog/$slug` (post detail)
- **Back-link** → `Button variant="link"`/ghost, `text-muted-foreground`.
- **Editorial hero** → net-new cover-art banner (`1rem` radius, scrim, ghost
  glyph), overlaid eyebrow (first tag) + `<h1>` title (`clamp`, white over scrim).
- **Byline bar** → hairline-bottom row: **Byline** (`Avatar` + name + role pill
  on `--brand-soft`) left, `Badge` tags right.
- **Dek** → excerpt as standfirst, `text-muted-foreground`.
- **Article body** → **`.prose` ramp (ADR 064)** + **code blocks (ADR 063
  palette)**; optional sticky **TOC rail** (≥1080px, built from h2/h3).
- **Prev/next** → two `Card`s.
- **States:** normal · **404** (unknown **or** Draft slug) → notfound block
  (gradient numeral + `Button` → `/blog`). Drafts must 404 publicly.

### Public — `/blog/tags/$tagSlug` (tag archive)
- Same shell + same card grid as index; header `<h1>` = tag label, sub = count.
- **States:** populated · **empty** (known tag, 0 published) → empty-state +
  `Button variant="outline"` → `/blog` · **404** (unknown tag) → notfound block.

### Public — ⌘K command palette
- → **`CommandPalette`** (controlled `open`/`onOpenChange`), mounted once at root.
  Consumer wires the ⌘K/Ctrl-K hotkey. Grouped: **Go to** / **Actions** (incl.
  theme toggle) / **Posts** (5 recent) / **Tags**. Remote source → pass `loading`
  so it shows `Skeleton`s (DS convention), not "no results". Tokens:
  `popover`/`popover-foreground`, `accent`/`accent-foreground`.

### Admin — `/admin/blog` (post list)
- **Admin bar** → strip at `--brand` 6% alpha.
- **Header** → title + "N total · M published" + **New post** `Button` (icon
  `plus`).
- **Table** → single `Card` wrapping a real `<table>`: `[thumb] · Title ·
  Status · Updated · [actions]`; rows click-to-edit; hover = `--accent`.
  - Status cell → `Badge` (Published = `default`/brand, Draft = `outline`).
  - Actions cell (stops row-click) → ghost **Edit** `Button` + kebab
    **`DropdownMenu`** (View live · Publish/Unpublish · Delete in `--destructive`).
- **States:** populated · **empty** → empty-state (`Icon` pencil) + New post
  `Button` · **loading** → `Card` + 6 `Skeleton` rows.
- ⚠️ **Kebab trigger:** use a **native `DropdownMenuTrigger`** styled as the icon
  button — **not** `asChild` + `Button` (see Convention notes / Button-ref).

### Admin — `/admin/blog/new` + `/$id/edit` (post editor)
- **Action header** → back `Button`, title + status `Badge`; right: **Unpublish**
  (published only), **Save draft** (`Button variant="outline"`), **`StatusButton`**
  Publish/Update (`idle→pending→success→error`).
- **Error summary** → `Alert` (+Title/Description), only when submitted-invalid.
- **Meta `Card`** → **Title** `Field`; row **Slug** `Field` + **Author**
  `Select` (+Trigger/Value/Content/Item); **Excerpt** `Textarea` `Field`; row
  **Tags** (net-new TagInput) + **Cover upload** (file input + gradient swatches).
- **Body editor** → mobile Write/Preview segmented control + the **split**:
  Markdown `Textarea` ↔ live `.prose` preview pane (net-new editor-split layout,
  `1fr 1fr` ≥1024px).
- **States:** new (slug auto-derives via `slugify` until edited) · editing Draft
  (slug editable) · editing Published (**slug locked** → `disabled` `Input` +
  helper) · **invalid** (per-`Field` `error=` incl. **slug collision**; `Alert`
  summary; `StatusButton` flashes `error`) · saving (`StatusButton` pending →
  success) · unpublish → route-level confirm `Dialog` (ADR 023).

## Net-new

### Components (add under `app/components/ui/`, each with a styleguide specimen)
- **`Pagination`** (`pagination.tsx`) — no existing pager. Numeric + ellipsis
  collapse (first, last, current ±1), prev/next icon buttons, `disabled` at ends,
  active = `aria-current="page"` on `--brand`/`--primary-foreground`. Wrapped in
  `<nav aria-label="Pagination">`. Reuses `--border`/`--accent`/`--brand`; new
  size token `--pager-size: 2.35rem`. **Specimen:** pager at page 1 / middle / end.
- **`TagInput`** (`tag-input.tsx`) — resolve-or-create multi-select; no
  combobox/select-multi exists (`Command`/`Select` are single-select). Chips
  (`--secondary`) + popover menu (`--popover`) + "Create «query»" row in
  `--brand`; full keyboard (`role="combobox"`/`listbox`/`option`); on create,
  slugify + append to tag registry. Reuses `--input`/`--secondary`/`--popover`/
  `--accent`/`--brand`; new `--combobox-min-h: 2.6rem`. **Specimen:** empty /
  with chips / open menu with a create row.

*(Not new primitives — blog-feature compositions built from the above: cover-art
system, `Byline`/`AuthorAvatar`/author chip, `PostCard`, `FeedSkeleton`, the
editor split, the `.prose` container, the Shiki `CodeBlock`. They live in the
blog feature, not `ui/*`.)*

### Tokens (promote into `@theme`)
- **Code palette (9, always-dark)** — `--code-bg/-bg-2/-border/-fg/-comment/-kw/
  -string/-number/-fn`. **Recorded in [ADR 063](../../decisions/063-markdown-rendering-pipeline-for-posts.md)**
  (the design lane resolved the theme it deferred).
- **Prose ramp** — scoped `--prose-*` + `--measure: 68ch` in a `.prose` block,
  plus a `--font-mono` stack (code + md textarea). **Recorded in
  [ADR 064](../../decisions/064-long-form-prose-typography-ramp.md).** Reuses
  existing colour tokens; ships the `native` (sans) variant — serif is deferred.
- **Layout-size tokens (non-foundational, no ADR)** — `--shell-max: 72rem`,
  `--article-max: 60rem`, `--pager-size: 2.35rem`, `--combobox-min-h: 2.6rem`,
  `--editor-min-h: 30rem`.
- **Decorative (keep as literals or small `--cover-*`/`--author-*`, no ADR)** —
  cover-art radial gradients (pine/slate/amber) and author-avatar accents.

## Convention notes

- **SSR-first / no-FOUC** — theme resolved from cookie + `class="dark"` stamped
  server-side (replace the prototype's `localStorage`). All public surfaces work
  unauthenticated. Dark mode is purely the `.dark` class; never hardcode a dark
  value.
- **Route-based dialogs (ADR 023)** — linkable confirmations are page-based; the
  editor's transient unpublish may use the overlay `Dialog`.
- **Forms via Conform + `Field`** — every control uses `Field` (wires
  `htmlFor`/`id`/`aria-invalid`/`aria-describedby`). Validation: title required;
  excerpt required to publish; slug required + **unique across other posts**
  (collision error); slug locked once published.
- **Accessibility (`epic-ui-guidelines`)** — one `<h1>`/surface; landmarks;
  cards/tags are real links; table has `<th>`; row click-to-edit must not trap
  keyboard (Edit `Button` + kebab are the keyboard paths); reveal motion
  transform-only behind `prefers-reduced-motion: no-preference`; shimmer disabled
  under `reduce`.
- **Button is not `forwardRef`** (verified: `const Button = ({…})`). For this
  slice, popper-anchored triggers (kebab `DropdownMenu`, `Tooltip`) use a
  **native trigger** styled as the icon button — **not** `asChild` + `Button`.
  `Dialog`/`Close` `asChild` + `Button` is fine (no measurement). A follow-up to
  add `forwardRef` to `Button` is deferred to its own DS change (see PRD
  Out of Scope).
- **Token discipline (ADR 019/062)** — no hardcoded colours/radii; accent via
  `--brand`. New tokens land in `@theme` (or scoped `.prose`); new primitives get
  a specimen and a `pnpm design-sync:prepare` → `/design-sync` republish.

## Ready for /to-issues

The design is grounded: all surfaces map to existing `ui/*` + `@theme`; net-new
is reduced to **two primitives** (`Pagination`, `TagInput`), **two recorded
token sets** (ADR 063 code palette, ADR 064 prose ramp), and a small set of
layout/decorative tokens — all sliceable. Hand this spec + the updated PRD to
`/to-issues`.
