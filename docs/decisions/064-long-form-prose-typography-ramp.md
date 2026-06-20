# Long-Form Prose Typography Ramp

Date: 2026-06-20

Status: proposed

## Context

[ADR 050](050-blog-cms-replaces-notes.md) introduces a `Post` with a rendered
Markdown **body**, and [ADR 063](063-markdown-rendering-pipeline-for-posts.md)
decides how that Markdown becomes HTML. Neither says how the resulting article
**reads** — the paragraph rhythm, heading ramp, blockquote, list markers, inline
code, and reading measure of long-form prose.

The design system today ships a **display** type scale only (`--text-mega` …
`--text-caption`/`--text-button` in `app/styles/tailwind.css`): big, tight,
weighted steps tuned for headings and marketing surfaces. It has **no reading
ramp** — nothing sized for sustained body copy, no constrained line length, no
prose-specific vertical rhythm. Rendering a blog article with the display scale
produces lines that are too long and a rhythm tuned for headlines, not reading.

The grounded design (Slice ②) specified a concrete reading ramp. The decision is
where it lives and how broad a system change it is.

We considered: (1) reusing the display scale (rejected — wrong measure and
rhythm for reading); (2) adding the prose steps as new **global** `@theme` type
tokens (rejected — they only apply to rendered article/preview content and would
pollute the global scale); (3) a **scoped** `.prose` block with its own tokens,
applied to rendered Markdown only.

## Decision

Add a **scoped long-form prose ramp**, not new global type steps.

- The ramp lives in a `.prose` block (its own CSS module/layer), applied to
  rendered Markdown on the public article (`/blog/$slug`) and the editor's live
  preview pane. It is **not** added to the global display scale.
- Its values are **scoped tokens** (`--prose-*`, `--measure`) rather than global
  `@theme` type steps, so the reading ramp can evolve without touching the
  display scale every other surface uses. Shipped values:
  - reading measure `--measure: 68ch`; vertical rhythm `* + * = 1.25em`.
  - body `p, li`: `1.12rem` / line-height `1.72`, colour
    `oklch(from var(--foreground) l c h / 0.9)`.
  - `h2 1.7em` / `h3 1.3em` / `h4 1.08em` (em-relative, so they track the body).
  - `blockquote` `1.22rem` italic, `3px var(--brand)` left rule; `li::marker`
    and links use `var(--brand)`; inline code on `var(--muted)` + `var(--border)`.
- The ramp **reuses existing colour tokens** (`--foreground`, `--brand`,
  `--muted`, `--border`) — it introduces no new colours. The only genuinely new
  font need is a **monospace** stack for inline/block code and the Markdown
  textarea (`--font-mono`); the base body font stays the system sans
  (`native` variant), so no new display font ships by default.
- One **net-new specimen** ("Prose / long-form article") is added to
  `app/components/styleguide/specimens.tsx` and re-published via
  `pnpm design-sync:prepare` → `/design-sync`, so the styleguide stays the
  source of truth for the reading ramp.
- An optional **`editorial` (serif)** prose variant is left switchable via a
  `data-prose` attribute but is **out of scope** to ship this slice; `native`
  (system sans) is the shipped default.

## Consequences

- **Positive:** articles read correctly without disturbing the display scale.
  Keeping the ramp scoped means the reading typography is a localized, reversible
  change, and the `.prose` block is reused verbatim by the editor preview, so the
  author sees exactly what publishes.
- **Positive:** because it reuses existing colour tokens and only adds a mono
  font + scoped size tokens, the foundational surface area is small.
- **Negative — a second type vocabulary:** the project now has a display scale
  *and* a prose ramp. A future reader must know which applies where (display =
  chrome/headings, prose = rendered article body). This ADR is that pointer.
- **Negative — styleguide upkeep:** the prose specimen must be kept current with
  the ramp, or the styleguide stops being the source of truth for reading type.
- **Reversible:** scoped tokens and a scoped block can be retuned or dropped
  without a data migration; the source of truth stays raw Markdown (ADR 063).
