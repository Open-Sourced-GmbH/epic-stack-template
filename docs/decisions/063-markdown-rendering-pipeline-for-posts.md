# Markdown Rendering Pipeline for Posts

Date: 2026-06-19

Status: proposed

## Context

[ADR 050](050-blog-cms-replaces-notes.md) replaces the per-user Notes domain with
an admin-authored blog. A `Post` carries a Markdown **body** that must render on
the public feed (`/blog/$slug`) with syntax-highlighted code blocks. The retired
`Note` stored plain text with no rendering, so this is a net-new capability — the
repo ships **no** Markdown or highlighter dependencies today, and the marketing
landing's `__code-block.tsx` is a hand-authored, pre-tokenised surface with "no
parser dependency", not a reusable renderer.

We need to decide three coupled things: what the source of truth is, when
Markdown→HTML happens, and how code is highlighted. The forces:

- **Staleness vs. speed.** Re-rendering Markdown on every request is wasteful;
  persisting rendered HTML risks the stored HTML drifting from the source and the
  pipeline (a sanitizer bump, a highlighter theme change) silently not applying.
- **Safety.** Even with admin-only authoring, a Stack showcase should model
  HTML sanitisation rather than dumping raw `dangerouslySetInnerHTML`.
- **"This stack is real."** The showcase goal argues for the standard, boring,
  correct ecosystem choice over a bespoke mini-parser.

We considered: (1) storing rendered HTML at write/publish time; (2) a lighter
highlighter (Prism/highlight.js) or none this slice; (3) a bespoke tokeniser like
the landing's. We chose render-on-read-cached with the standard `unified` stack
and Shiki.

## Decision

- **Raw Markdown is the single source of truth.** `Post.body` stores Markdown
  only; rendered HTML is **never persisted**.
- **Render on read, cached.** The loader renders Markdown→HTML and wraps it in
  `cachified` keyed on `postId + updatedAt` (the existing SQLite/LRU cache layer,
  ADRs 053–055). A post re-renders only when it changes.
- **Standard `unified` pipeline:** `remark-parse` → `remark-gfm` → `rehype` →
  **`rehype-sanitize`** → syntax highlighting. Sanitisation is kept even though
  authoring is admin-only.
- **Shiki** provides syntax highlighting, themed to match the landing's dark
  code surface so code reads consistently site-wide. The concrete code theme was
  resolved in the design lane (Slice ② grounded design) as a fixed, **always-dark
  palette** (dark in both light and dark mode, like the landing). Promote these
  into `@theme` and map the Shiki theme onto them:

  | Token | Value | Shiki scope |
  | --- | --- | --- |
  | `--code-bg` | `oklch(0.21 0.015 264)` | editor background (ground) |
  | `--code-bg-2` | `oklch(0.25 0.016 264)` | caption bar |
  | `--code-border` | `oklch(0.31 0.018 264)` | block border |
  | `--code-fg` | `oklch(0.87 0.012 264)` | default text |
  | `--code-comment` | `oklch(0.58 0.02 264)` | `comment` (italic), lang label |
  | `--code-kw` | `oklch(0.76 0.13 318)` | `keyword`, `storage` |
  | `--code-string` | `oklch(0.8 0.12 152)` | `string` |
  | `--code-number` | `oklch(0.82 0.1 76)` | `constant.numeric` |
  | `--code-fn` | `oklch(0.78 0.11 232)` | `entity.name.function` |

  Block chrome: `0.7rem` radius, `1px --code-border`, traffic-light caption bar.
  The long-form **prose** ramp that wraps this code is a separate concern — see
  [ADR 064](064-long-form-prose-typography-ramp.md).

## Consequences

- **Positive:** no stored-HTML staleness; a pipeline change (sanitiser, theme)
  applies on the next render. The cache keeps reads cheap. The choice demonstrates
  the real Markdown ecosystem, matching the showcase intent.
- **Negative — new dependencies:** `unified`, `remark-parse`, `remark-gfm`,
  `rehype`, `rehype-sanitize`, and `shiki` are added. Shiki in particular is a
  heavyweight grammar/theme bundle; it must be loaded server-side only so it does
  not bloat the client. (Adding these deps also can't be done inside the
  read-only command sandbox — it needs a real `pnpm add`.)
- **Negative — two code-rendering paths:** the landing keeps its hand-authored
  `__code-block.tsx`; the blog uses Shiki. They are themed to look alike but are
  separate implementations. Unifying them is explicitly out of scope.
- **Reversible-ish:** because the source of truth is raw Markdown, swapping the
  highlighter or sanitiser later is a code change with no data migration — only
  the cache needs busting.
