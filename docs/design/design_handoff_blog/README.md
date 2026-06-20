# Developer Handoff — Epic Stack Blog

Public blog (index · post detail · tag archive · ⌘K) and admin (post list · post editor) surfaces, built on the **Epic Stack Template UI** design system (`epic-stack-template@0.1.0`, the published React library — Radix-based, Tailwind v4 tokens).

## How to read this package

- **`Blog.html` + `app/*.jsx` are design references**, not production code. They are a hash-routed React-on-Babel prototype that demonstrates intended layout, composition, and every state. **Recreate them in your real stack** (React Router + Tailwind v4 + the same `epic-stack-template` component library) using your established patterns — loaders, actions, route modules, Conform forms. Do **not** ship the prototype's hand-rolled hash router, inline Babel, or the `window.BLOG` mock data.
- **Fidelity: high.** Colors, type, spacing, radii, and interactions are final. Match them pixel-for-pixel using the design-system primitives named below.
- **Token discipline.** Where a value maps to an existing design-system token, the code references the token (`var(--brand)`, `text-muted-foreground`, `rounded-md`). Only the **net-new** values in §3/§4 are literals — those are the ones to promote into your `@theme`.
- Every measurement, color, and state in this README is taken verbatim from the prototype CSS/JSX. A developer who wasn't in the room can build from this README alone.

The five sections the spec is organized into:

1. [Per surface](#1-per-surface) — layout, composition, and every state
2. [Reused primitives](#2-reused-primitives-per-surface) — DS components + tokens per surface
3. [Net-new](#3-net-new-concrete-specs) — prose ramp, code theme, pagination, tag combobox, editor split
4. [Tokens table](#4-tokens-table) — every value, mapped or new
5. [Accessibility & responsive](#5-accessibility--responsive-per-surface)

---

## 1. Per surface

Routing (target): React Router route modules. Prototype routes map 1:1 to the PRD:

| PRD route | Prototype hash | Module |
|---|---|---|
| `/blog` | `#/blog` | `routes/blog._index.tsx` |
| `/blog/$slug` | `#/blog/$slug` | `routes/blog.$slug.tsx` |
| `/blog/tags/$tagSlug` | `#/blog/tags/$tagSlug` | `routes/blog.tags.$tagSlug.tsx` |
| `/admin/blog` | `#/admin/blog` | `routes/admin.blog._index.tsx` |
| `/admin/blog/new` · `/admin/blog/$id/edit` | `#/admin/blog/new` · `#/admin/blog/$id/edit` | `routes/admin.blog.new.tsx` / `admin.blog.$id.edit.tsx` |

All surfaces sit inside shared **chrome**: a sticky marketing `<header>` (blurred translucent `--background`, `1px` `--border` bottom, `4rem` tall), a marketing `<footer>`, and on admin routes an `admin-bar` strip (`--brand` at 6% alpha). The ⌘K palette is mounted once at the app root.

### 1a. Blog index — `/blog`
**Layout.** Centered column, `max-width: 72rem` (`--shell-max`), `1.5rem` side padding. Page header (eyebrow + `page-title` + sub). Then a **featured hero lead** (first post) above a responsive **card grid**, then **pagination**. The hero/grid composition is tweakable (`hero` default, `grid`, `column`, `side`) — ship `hero`.
- **Hero lead**: 2-col grid `1.02fr 1.3fr`, cover panel left (`min-height: 16.5rem`), body right (`padding: 1.6rem 1.9rem`, `gap: 0.65rem`): eyebrow "Featured" + 2 tag badges on one row, `clamp(1.45rem,2.3vw,2.05rem)` title, excerpt, byline. Stacks `<820px`.
- **Grid**: `repeat(auto-fill, minmax(20rem, 1fr))`, `gap: 1.25rem`. Each card = `Card` with cover (`16/9`), body (`padding: 1.1rem 1.15rem 1.25rem`, `gap: 0.6rem`): 2 tag badges, `1.2rem` title, 2-line clamped excerpt, author chip.
- Posts sorted `publishedAt` desc; 6 per page; drafts excluded.

**States.**
- **Populated** — hero + grid as above.
- **Empty** (no published posts) — centered `empty-state`: muted rounded icon tile (`file-text`), `1.4rem` heading "No posts published yet", muted body, outline Button → editor.
- **Page 2+** — hero hidden; grid only; pagination reflects current page.
- **Loading** — `FeedSkeleton` (hero skeleton + 6 card skeletons) using the shimmer system (§3).

### 1b. Post detail — `/blog/$slug`
**Layout.** Article column `max-width: 60rem`. Back-link → "All posts". **Editorial hero**: the cover gradient is a full banner (`min-height: 23rem`, `border-radius: 1rem`, `padding: 2.25rem`) with a bottom-up black scrim and a large ghost initial glyph; eyebrow (first tag) + overlaid white title `clamp(2rem,4.4vw,3.3rem)`. Below: **byline bar** (hairline-bottom row, `padding: 1.15rem 0`) — byline left, tags right. Then the **dek** (excerpt as standfirst, `1.28rem` muted). Then a `prose` body (max-width `--measure` = `68ch`) with an optional sticky **TOC rail** (`14rem`, only ≥`1080px`, built from h2/h3). Prev/next post cards at the foot (`post-nav`, 2-col).

**States.**
- **Normal** — full article; Markdown rendered to prose with highlighted code blocks (§3).
- **404** (unknown slug **or** Draft slug) — `notfound` block: gradient `404` numeral `clamp(4rem,12vw,8rem)`, `page-title`, muted body, Button → `/blog`. *Drafts must 404 on the public detail even though they exist.*

### 1c. Tag archive — `/blog/tags/$tagSlug`
**Layout.** Same shell as index. Header: back-link, eyebrow "Tag", `page-title` = tag label, sub = post count. Then the card grid (same card as index), no hero.

**States.**
- **Populated** — grid of posts carrying the tag.
- **Empty** (known tag, no published posts) — `empty-state`, "Nothing here yet", outline Button → `/blog`.
- **404** (unknown tag) — `notfound` block, "No such tag", Button "Browse all posts".

### 1d. ⌘K command palette
**Composition.** DS `CommandPalette` (controlled `open`/`onOpenChange`) mounted once. ⌘K / Ctrl-K toggles it (consumer wires the hotkey — the palette registers none). A header "Search" button also opens it. Grouped results: **Go to** (Blog, Admin · Posts), **Actions** (New post, theme toggle), **Posts** (5 most recent → `/blog/$slug`), **Tags** (→ archive). `onNavigate` closes + routes. Mount only when open. For a remote command source, pass `loading` so it shows Skeletons (DS convention) instead of "no results".

### 1e. Admin post list — `/admin/blog`
**Layout.** Shell column. Header row (`page-head`, wraps): title "Posts" + "N total · M published", primary **New post** Button (icon `plus`). A single `Card` wrapping a table: columns **[thumb 3.6rem] · Title · Status 7rem · Updated 8rem · [actions 7.5rem]**. Rows `padding: 0.6rem 0.85rem`, hairline top borders, hover fill, **row is click-to-edit**.
- **Title cell**: bold title (ellipsis, `max-width: 30rem`), below it an author line = small accent avatar + name + monospace `/slug`. Untitled drafts → italic muted "Untitled draft".
- **Status cell**: `Badge` — Published = default (brand), Draft = `outline`.
- **Actions cell** (stops row-click propagation): ghost **Edit** Button + a kebab **DropdownMenu** (View live · Publish/Unpublish · Delete-in-red).

**States.**
- **Populated** — table as above.
- **Empty** (no posts) — `empty-state`, icon `pencil-2`, "No posts yet", New post Button.
- **Loading** — `Card` wrapping 6 `sk-row` shimmer rows (thumb + 2 text lines + badge + meta + action chips).

> ⚠️ **DropdownMenu trigger gotcha (verified bug).** The library's `Button` is a plain function component **without `React.forwardRef`**. Using it as `<DropdownMenuTrigger asChild><Button/>` gives Radix no ref to measure, so the popper renders off-screen (`translate(0,-200%)`). Use a **native `DropdownMenuTrigger`** styled as the icon button (class `icon-trigger`), **not** `asChild` + `Button`. Same caution for any popper-anchored trigger (Tooltip/Popover). Dialog/Close `asChild + Button` is fine (no measurement). If your upstream `Button` *does* forwardRef, `asChild` is fine — verify first.

### 1f. Post editor — `/admin/blog/new` + `/$id/edit`
**Layout.** Sticky-ish action header: back Button, "New post"/"Edit post" + status badge, helper line; right side actions — **Unpublish** (published only), **Save draft** (outline), **StatusButton** Publish/Update. Below, an error `Alert` (only when submitted-invalid). Then a meta `Card` (`padding: 1.5rem`, `gap: 1.25rem`): **Title** Field; row of **Slug** + **Author** (`Select`); **Excerpt** Textarea Field; row of **Tags** (combobox §3) + **Cover upload** (file input + 3 gradient swatches). Below the card, the **body editor**: a label row with a mobile-only Write/Preview segmented control, then the **split** — Markdown `Textarea` ↔ live `preview-pane` (`prose`), `1fr 1fr` ≥`1024px`, tab-swapped below.

**States.**
- **New** — empty fields; slug auto-derives from title (`slugify`) until manually edited.
- **Editing Draft** — fields populated; **slug editable**.
- **Editing Published** — **slug locked** (`disabled` Input, helper "Locked — changing a live URL breaks inbound links"); Publish→**Update**; Unpublish shown.
- **Invalid** — on submit: per-Field errors via `Field error=` (`aria-invalid` wired) for missing title / missing excerpt / **slug collision** ("That slug is already taken by another post"); top `Alert` summary; StatusButton flashes `error`.
- **Saving / pending** — StatusButton `pending` (spinner) → `success` (~1.4s) → `idle`.
- **Publish / Unpublish** — Unpublish opens a route-level confirm `Dialog` (per ADR 023: page-based for linkable confirms; the editor's transient unpublish uses the overlay).

---

## 2. Reused primitives (per surface)

DS components consumed from `window.EpicUI` (your import: `from 'epic-stack-template'`).

| Surface | DS components | DS tokens |
|---|---|---|
| **Index** | `Card` (+Header/Content), `Badge` (secondary tags), `Button` (ghost/outline/default), `Avatar`+`AvatarFallback` (author), `Skeleton`* | `background`/`foreground`, `card`, `muted`/`muted-foreground`, `border`, **`brand`/`primary`** (eyebrow, links, pager-active), `secondary` (tag pills), type scale, `--radius` |
| **Post detail** | `Badge`, `Button`, `Avatar`, `Card` (prev/next) | `border` (byline rule, scrim over cover art), `brand` (links, blockquote rule, list markers), `muted-foreground` (dek/meta), `foreground`, type scale, `--radius` (hero `1rem`) |
| **Tag archive** | `Card`, `Badge`, `Button`, `Avatar` | same as index |
| **⌘K** | **`CommandPalette`** (grouped results, no-match, `loading`→`Skeleton`) | `popover`/`popover-foreground`, `accent`/`accent-foreground` (active row), `muted-foreground`, `--radius` |
| **Admin list** | `Card`, `Badge` (default/outline status), `Button` (ghost/default), **`DropdownMenu`** (+Trigger/Content/Item/Separator), `Avatar`, `Dialog` (confirm), `Skeleton`* | `card`, `border`, `accent` (row hover), `muted-foreground`, **`brand`** (admin bar, New post), `destructive` (delete item), `--radius` |
| **Editor** | **`Field`**, **`Input`**, **`Label`**, **`Textarea`**, **`Select`** (+Trigger/Value/Content/Item), **`StatusButton`** (idle/pending/success/error), `Button`, `Badge`, `Card`, `Dialog`, `Alert` (+Title/Description) | `input`/`border` (controls), `ring`→`brand` (focus), `secondary` (tag chips), `muted` (segmented bg), `destructive` (errors), `card`, type scale, `--radius` (`md` controls) |

\* `Skeleton` is the DS primitive; the prototype uses a custom shimmer wrapper (§3) for richer skeletons but you may compose DS `Skeleton` instead.

**Accent = Pine.** `--brand` / `--primary` / `--ring` all resolve to **`oklch(60% .135 172)`** (Pine). Everywhere the design shows the accent — eyebrows, links, active pager, focus rings, list markers, blockquote rule, role pills, New-post — it's `var(--brand)`; never a literal.

---

## 3. Net-new (concrete specs)

These do **not** map to an existing primitive/token. Each is given as concrete values to promote into your `@theme` / a scoped `.prose` block. The PRD flags these as known net-new cost.

### 3.1 Long-form article / prose typography ramp — *net-new*
There is no reading ramp in the DS today (display scale only). Scope it to a `.prose` block (data-attribute switches three ramps; ship **`native`**).

```
.prose            max-width: 68ch (--measure); vertical rhythm: child + child = 1.25em
 p, li            1.12rem / line-height 1.72 / color: oklch(from var(--foreground) l c h / 0.9)
 h2               1.7em  / lh 1.15 / -0.02em  / margin-top 2em
 h3               1.3em  / lh 1.2  / -0.015em / margin-top 1.7em
 h4               1.08em / margin-top 1.5em
 blockquote       1.22rem italic; border-left 3px var(--brand); padding-left 1.25em
 a                color var(--brand); underline; offset 0.18em; 1px; 45%-alpha brand → solid on hover
 ul/ol            padding-left 1.4em; li margin-top 0.4em; li::marker color var(--brand)
 inline code      0.86em; bg var(--muted); 1px var(--border); radius 0.35rem; pad 0.15em 0.4em
 img figure       16/9 placeholder; bg var(--muted); 1px var(--border); radius 0.6rem; centered caption 0.85rem muted
```
Variants (optional, exposed as a tweak): **editorial** — serif body (`"Iowan Old Style", "Palatino Linotype", Georgia, ui-serif`), `1.2rem`/`1.75`. **display** — `--measure: 62ch`, h2 `2.1em`, h3 `1.5em`, body `1.18rem`/`1.78`.
→ Suggested tokens: `--prose-measure`, `--prose-body-size`, `--prose-body-leading`, `--prose-h2/h3/h4`, `--prose-quote`.

### 3.2 Code-block theme (Shiki target) — *net-new* (ADR 063 punted)
A dark code surface that **stays dark in light and dark mode**, derived from the landing's `CODE_PALETTE` (`oklch(0.21 0.015 264)` ground). The prototype ships a lightweight tokenizer; **in production derive a Shiki theme** from these exact values:

```
--code-bg       oklch(0.21 0.015 264)   ground
--code-bg-2     oklch(0.25 0.016 264)   caption bar
--code-border   oklch(0.31 0.018 264)
--code-fg       oklch(0.87 0.012 264)   default text
--code-comment  oklch(0.58 0.02 264)    italic
--code-kw       oklch(0.76 0.13 318)    keyword (magenta)
--code-string   oklch(0.8 0.12 152)     string (green)
--code-number   oklch(0.82 0.1 76)      number (amber)
--code-fn       oklch(0.78 0.11 232)    function (blue)
```
Block chrome: `border-radius: 0.7rem`, `1px --code-border`, shadow `0 20px 40px -28px oklch(0 0 0 / 0.6)`; caption bar = 3 traffic-light dots (`oklch(0.62 0.16 25)` / `0.78 0.13 80` / `0.72 0.14 150`) + uppercase lang label right (`--code-comment`); `pre` padding `1.1rem 1.25rem`; mono `0.86rem`/`1.65`.
Shiki mapping: `keyword`/`storage`→`--code-kw`, `string`→`--code-string`, `constant.numeric`→`--code-number`, `entity.name.function`→`--code-fn`, `comment`→`--code-comment`, base `--code-fg` on `--code-bg`.

### 3.3 Pagination control — *net-new*
No pagination component exists. Spec: centered flex row, `gap: 0.35rem`, `margin-top: 3rem`. Buttons `min-width: 2.35rem; height: 2.35rem; radius 0.55rem; 1px var(--border); bg var(--background)`. Hover → `var(--accent)`. **Active** (`aria-current="page"`) → `bg var(--brand)` / `var(--primary-foreground)`, no border, weight 600. Prev/next are icon buttons (`arrow-left`/`arrow-right`), `disabled` at ends (opacity 0.4). Numeric with ellipsis collapse: always show first, last, current ±1; gaps render a non-interactive `…`. `<nav aria-label="Pagination">`.
→ Tokens: reuse `--border`/`--accent`/`--brand`/`--primary-foreground`; new size token `--pager-size: 2.35rem`.

### 3.4 Tag input (combobox) — *net-new control*
No combobox/select-multi in `ui/*` (Command palette is the closest pattern). Resolve-or-create multi-select. Ship the **combobox** variant (two others — `command`-grouped and plain `chips` — exist as tweaks).
```
.tag-control   flex-wrap; min-height 2.6rem; pad 0.35rem 0.5rem; 1px var(--input); radius 0.5rem;
               focus-within → outline 2px var(--brand) offset -1px
.tag-chip      bg var(--secondary)/secondary-foreground; radius 0.4rem; pad 0.2rem .25rem .2rem .55rem;
               trailing ✕ button (cross-1), opacity .6 → 1 hover
input          flex:1; min-width 6rem; transparent; inherits font
.tag-menu      popover panel: absolute; top +0.35rem; bg var(--popover); 1px var(--border);
               radius 0.55rem; shadow 0 16px 40px -16px oklch(0 0 0 / .35); pad 0.3rem; max-height 15rem
.tag-opt       pad 0.45rem 0.55rem; radius 0.4rem; active/hover → bg var(--accent); trailing muted count
create row     icon plus + "Create “<query>”" in var(--brand)
```
Keyboard: ↓/↑ move active, Enter selects/creates, Backspace on empty removes last; `role="combobox"` + `aria-expanded`, menu `role="listbox"`, options `role="option" aria-selected`. On create, slugify the label and append to the tag registry.
→ Tokens: reuse `--input`/`--secondary`/`--popover`/`--accent`/`--brand`; new `--combobox-min-h: 2.6rem`.

### 3.5 Editor split / live preview — *net-new layout*
`.editor-grid.split` = `1fr 1fr` ≥`1024px`; single column below, swapped by a segmented control (`.seg`, bg `--muted`, active pill bg `--background`). Textarea: mono `0.9rem`/`1.6`, `min-height: 30rem`, vertical-resize. `.preview-pane`: `1px var(--border)`, radius `0.6rem`, `padding: 1.5rem 1.75rem`, `min-height: 30rem`, renders the same `.prose` (body size dialed to `1rem`). Markdown→HTML must be debounced and sanitized in production.
→ Tokens: new `--editor-min-h: 30rem`; reuse `--muted`/`--background`/`--border`.

**Other small net-new bits.** Cover-art gradient system (`pine`/`slate`/`amber` radial gradients — decorative, keep as literals or `--cover-*`); author identity avatars (accent per author: Pine `oklch(0.58 0.13 172)`, indigo `oklch(0.55 0.14 264)`, amber `oklch(0.6 0.14 40)`); skeleton shimmer (`.sk` + `sk-shimmer` keyframe, sweep `color-mix(in srgb, var(--foreground) 7%, transparent)`, 1.5s, disabled under reduced-motion).

---

## 4. Tokens table

Raw values as used. "Maps to" = existing `epic-stack-template` token (use it; don't redefine). "New" = promote into `@theme`.

### Color — existing (reference, don't redefine)
| Value (light / dark) | Token | Used for |
|---|---|---|
| `oklch(60% .135 172)` | `--brand` = `--primary` = `--ring` | **Pine accent**: eyebrows, links, active pager, focus, markers, blockquote, New-post |
| `color-mix(srgb, brand 13%, transparent)` | `--brand-soft` | role-pill background |
| `oklch(from brand l c h / .32)` | `--brand-glow` | ::selection, avatar halo |
| `oklch(98.38% .0035 247.86)` | `--primary-foreground` | text on brand (pager active, badge) |
| `oklch(100% 0 0)` / `oklch(13.71% .036 258.53)` | `--background` | page surface |
| `oklch(13.71% .036 258.53)` / `oklch(98.38% .0035 247.86)` | `--foreground` | body text |
| `oklch(100% 0 0)` / `oklch(13.71% .036 258.53)` | `--card` | card surface |
| `oklch(94.32% .0123 247.96)` / `oklch(22.6% .0267 260.02)` | `--muted` | inline-code bg, segmented bg, skeleton fill |
| `oklch(40.68% .0281 257.44)` / `oklch(71.07% .0351 256.79)` | `--muted-foreground` | meta, dek, captions |
| `oklch(91.87% .0177 248.02)` / `oklch(20.56% .0228 260.05)` | `--accent` | row/option/pager hover |
| `oklch(86.48% .0153 248)` / `oklch(34.74% .0295 260.13)` | `--secondary` | tag pills/chips |
| `oklch(92.9% .0126 255.53)` / `oklch(28% .0369 259.97)` | `--border` | hairlines, control borders |
| `oklch(92.56% .0133 255.54)` / `oklch(28% .0369 259.97)` | `--input` | input/combobox border |
| `oklch(57.14% .2121 27.25)` / `oklch(47.6% .159 25.64)` | `--destructive` | delete item, errors |
| — | `--popover` / `--popover-foreground` | combobox + ⌘K panels |

### Color — new (promote)
| Value | Suggested token | Used for |
|---|---|---|
| `oklch(0.21 0.015 264)` | `--code-bg` | code ground (always dark) |
| `oklch(0.25 0.016 264)` | `--code-bg-2` | code caption bar |
| `oklch(0.31 0.018 264)` | `--code-border` | code border |
| `oklch(0.87 0.012 264)` | `--code-fg` | code text |
| `oklch(0.58 0.02 264)` | `--code-comment` | comments / lang label |
| `oklch(0.76 0.13 318)` | `--code-kw` | keywords |
| `oklch(0.8 0.12 152)` | `--code-string` | strings |
| `oklch(0.82 0.1 76)` | `--code-number` | numbers |
| `oklch(0.78 0.11 232)` | `--code-fn` | function names |
| `oklch(0.58 0.13 172)` / `0.55 0.14 264` / `0.6 0.14 40` | `--author-pine/indigo/amber` | author avatar accents |
| `oklch(.7 .13 172)…` etc (3 radials) | `--cover-pine/slate/amber` | decorative cover art |

### Type scale — existing vs new
| Value | Token | |
|---|---|---|
| `5rem` / `3.5rem` / `2.5rem` / `2rem` / `1.5rem` / `1.125rem` / `1rem` | `--text-mega`/`-h1`/`-h2`/`-h3`/`-body-lg`/`-caption`/`-body-sm` | existing display scale (headers, page-title) |
| `ui-sans-serif, system-ui, …` | `--font-sans` | existing — all UI/headings |
| prose ramp (§3.1): `1.12rem`/`1.72`, h2 `1.7em`, h3 `1.3em`, h4 `1.08em`, quote `1.22rem` | **new** `--prose-*` | reading body |
| `"Iowan Old Style", Palatino, Georgia, ui-serif` | **new** `--font-prose-serif` | editorial variant |
| `ui-monospace, "SF Mono", Menlo` `0.86–0.9rem` | **new** `--font-mono` | code + md textarea |

### Spacing / radius / size
| Value | Token | |
|---|---|---|
| `.5rem` | `--radius` (existing; `md` on controls) | inputs, buttons, cards |
| `0.35rem`/`0.4rem`/`0.5rem`/`0.55rem`/`0.6rem`/`0.7rem`/`1rem` | derive from `--radius` where possible | chips, opts, panels, code (`0.7rem`), hero (`1rem`) |
| `72rem` | **new** `--shell-max` | page shell width |
| `68ch` (62ch display) | **new** `--measure` | prose column |
| `60rem` | **new** `--article-max` | detail column |
| `2.35rem` | **new** `--pager-size` | pager buttons |
| `2.6rem` | **new** `--combobox-min-h` | tag control |
| `30rem` | **new** `--editor-min-h` | textarea/preview |
| `4rem` | header height | sticky header |
| shadows: `0 20px 40px -28px oklch(0 0 0 /.6)` (code), `0 16px 40px -16px oklch(0 0 0 /.35)` (popover) | reuse DS `--shadow-*` if present, else new | elevation |

---

## 5. Accessibility & responsive (per surface)

**Global.** SSR-first, no-FOUC: resolve theme from a cookie and stamp `class="dark"` on `<html>` server-side (prototype uses `localStorage`+class — replace). Dark mode is purely the `.dark` class; every token flips — never hardcode a dark value. All public surfaces work unauthenticated. Reveal/entrance motion is **transform-only** and gated behind `@media (prefers-reduced-motion: no-preference)`; shimmer animation is disabled under `prefers-reduced-motion: reduce`. Single `<h1>` per surface; landmarks `<header>`/`<nav>`/`<main>`/`<footer>`.

| Surface | Landmarks / headings | Focus & a11y | Breakpoints |
|---|---|---|---|
| **Index** | `<main>`; `<h1>` page title; cards use `<h3>` titles (don't skip levels) | cards are real links (keyboard-focusable); tag pills are `<a>`; pager is `<nav aria-label="Pagination">` with `aria-current="page"` | grid `auto-fill minmax(20rem,1fr)`; hero stacks `<820px` |
| **Post detail** | `<main>`; single `<h1>` (hero title over cover — ensure contrast via scrim); body h2/h3 drive the TOC | back-link first in tab order; TOC links smooth-scroll with a `90px` offset for the sticky header; prose is screen-reader navigable by heading | TOC rail only ≥`1080px`; hero scales via `clamp()` |
| **Tag archive** | `<main>`; `<h1>` = tag label | empty/404 CTAs are real Buttons | same grid as index |
| **⌘K** | dialog overlay; `role` handled by `CommandPalette` | ⌘K/Ctrl-K toggles, Esc closes, arrows move, Enter selects; focus trapped in overlay, returns to opener | full-width on mobile (DS handles) |
| **Admin list** | `<main>`; `<h1>` "Posts"; real `<table>` w/ `<th>` headers | row click-to-edit **must not** trap keyboard — Edit Button + DropdownMenu are the keyboard paths; action cell stops propagation; kebab = native `DropdownMenuTrigger` (see §1e bug) with `aria-label` | header row wraps; table scrolls horizontally on narrow |
| **Editor** | `<main>`; `<h1>` New/Edit | **`Field`** wires `htmlFor`/`id`/`aria-invalid`/`aria-describedby` — use it for every control; errors announced; slug-locked Input is `disabled` with helper text; StatusButton announces pending/success; Tags combobox full keyboard (§3.4); confirm `Dialog` traps focus, labelled by `DialogTitle` | split `1fr 1fr` ≥`1024px`; below, Write/Preview segmented control swaps panes (both reachable) |

**Forms.** Build with Conform + the `Field` primitives (per epic-ui-guidelines). Validation rules shown: title required, excerpt required to publish, slug required + **unique across other posts** (collision error), slug locked once published. Route-based dialogs (ADR 023) for linkable confirmations; the editor's transient unpublish may use the overlay.

---

## Files in this bundle
- `Blog.html` — entry (load order: React 18.3.1 → DS bundle → app libs → Babel JSX modules).
- `app/shared.jsx` — router, reveal hook, Cover, Byline/AuthorAvatar/AuthorChip, PostCard, FeedSkeleton.
- `app/public.jsx` — index, post detail, tag archive, pagination, 404.
- `app/admin.jsx` — post list, editor, TagInput (3 variants), CoverUpload, confirm dialogs.
- `app/chrome.jsx` — header, footer, admin bar, ⌘K wiring.
- `app/main.jsx` — theme, tweaks, route switch, mount.
- `lib/markdown.js` — Markdown→HTML + the tokenizer (replace with your MD pipeline + Shiki).
- `lib/data.js` — mock content (replace with loaders).
- `styles/blog.css` — all net-new CSS (prose ramp, code theme, pager, combobox, editor split, covers, skeleton, motion).

> The DS itself is **not** included — install `epic-stack-template` in your app and import the named components. The prototype loaded it from `_ds/…/_ds_bundle.js`; your build resolves it from the package.
