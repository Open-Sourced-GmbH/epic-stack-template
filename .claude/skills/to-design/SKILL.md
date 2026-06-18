---
name: to-design
description: Turn a PRD into a design brief that seeds a Claude Design exploration — grounded in this repo's existing components, tokens, and conventions so design starts from the real system, not a blank canvas. Use when a PRD is ready and you want to brief a Claude Design exploration before issues are written.
---

# To Design

The **brief** side of this repo's design pipeline. It turns a PRD into a design
brief that seeds a [Claude Design](https://claude.ai/design) exploration, so the
exploration starts from this system's real components, tokens, and conventions
instead of a blank canvas.

```
/grill-with-docs → /to-prd → /to-design → [Claude Design: explore + export handoff]
                                → /to-grounded-design → /to-issues → implement → PR
```

It's the front bookend to
[`/to-grounded-design`](../to-grounded-design/SKILL.md): `/to-design` grounds the
*start* of exploration; `/to-grounded-design` grounds the *handoff* that comes
back. See [`docs/agents/styleguide.md`](../../../docs/agents/styleguide.md) for
the grounding contract.

## Process

### 1. Gather the PRD and the source of truth

Work from the PRD in context. If the user passes a PRD reference (issue number,
URL, or path), fetch its full body. Load the design-system inventory:

- `app/components/styleguide/specimens.tsx` — what's catalogued
- `app/components/ui/*` — the real components and their variants/props
- `app/styles/tailwind.css` — the `@theme` tokens (colors, type scale, radii)
- [`docs/agents/code-conventions.md`](../../../docs/agents/code-conventions.md)
  and [`docs/agents/styleguide.md`](../../../docs/agents/styleguide.md)

### 2. Make sure the Foundation is current

The exploration should start from the real components. If any `ui/*` component or
`tailwind.css` token has changed since the last publish, tell the user to refresh
the Claude Design Foundation first:

```
pnpm dev → pnpm styleguide:snapshot → /design-sync
```

If nothing has changed, note that the Foundation is already current.

### 3. Derive the surfaces from the PRD

List the screens, flows, and states to design, derived from the PRD's user
stories — including the empty, loading, error, and invalid states, not just the
happy path. Use the project's domain glossary vocabulary.

### 4. Separate build-from from open-for-exploration

For each surface, distinguish:

- **Build from** — the existing `ui/*` components (with variants) and `@theme`
  tokens it should reuse. This is the constraint that keeps the design grounded.
- **Open for exploration** — what's deliberately undefined. Net-new is allowed
  here, but frame it as a question; `/to-grounded-design` reconciles anything new
  against the system afterward, so flag it as a known cost, not a freebie.

### 5. Emit the design brief

Write the brief using the template below and hand it to the user to take into
Claude Design. Do not publish it to the tracker — it's an input to the
exploration, not an issue.

<design-brief-template>

## Source

Reference to the PRD this design serves.

## Foundation

Whether the Claude Design Foundation is current, or the command to refresh it
(step 2).

## Surfaces to design

The screens / flows / states derived from the PRD's user stories.

## Build from

The existing components (with variants) and tokens the design should reuse —
the grounded starting point. Reference the [styleguide](../../../docs/agents/styleguide.md).

## Open for exploration

What's deliberately undefined, framed as questions. Note where net-new
components or tokens are expected (and that they'll be reconciled by
`/to-grounded-design`).

## Constraints

The non-negotiables the design must respect: SSR-first, route-based dialogs
(ADR 023), forms via Conform, accessibility (`epic-ui-guidelines`), responsive +
dark mode.

## Next step

When the exploration is done, export the dev handoff and run
`/to-grounded-design`.

</design-brief-template>
