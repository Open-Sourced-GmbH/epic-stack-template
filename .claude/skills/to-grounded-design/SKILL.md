---
name: to-grounded-design
description: Ground a Claude Design dev handoff into this codebase — reconcile every element against the real components and design tokens, flag net-new pieces, and emit a grounded design spec ready for /to-issues. Use when a design comes back from a Claude Design exploration and needs to be grounded before issues are written.
---

# To Grounded Design

The **consume** side of this repo's design pipeline. It takes a dev handoff
exported from a [Claude Design](https://claude.ai/design) exploration and grounds
it into THIS codebase before issues are written, so implementation reuses the
real system instead of re-deriving it.

```
/grill-with-docs → /to-prd → /to-design → [Claude Design: explore + export handoff]
                                → /to-grounded-design → /to-issues → implement → PR
```

Claude Design generates freely — that's its value. This skill translates "free"
into "what our system already has, plus the minimal net-new." See
[`docs/agents/styleguide.md`](../../../docs/agents/styleguide.md) for the
grounding contract.

## Process

### 1. Gather the handoff and the source of truth

Work from the handoff the user provides (an exported Claude Design dev handoff:
screens, specs, tokens, component breakdown). If they pass a file path or URL,
read it. Also load the design-system source of truth:

- `app/components/styleguide/specimens.tsx` — what's catalogued
- `app/components/ui/*` — the real components and their variants/props
- `app/styles/tailwind.css` — the `@theme` tokens (colors, type scale, radii)
- [`docs/agents/code-conventions.md`](../../../docs/agents/code-conventions.md)
  and [`docs/agents/styleguide.md`](../../../docs/agents/styleguide.md)

### 2. Reconcile every element

For each UI element in the handoff:

- **Reuse first.** Map it to an existing `ui/*` component where one fits; name
  the component and the exact variant/props (e.g. `Button variant="destructive"
  size="lg"`).
- **Map to tokens.** Map every color, space, radius, and type style to an
  existing `@theme` token. **Never hardcode** colors, fonts, or radii (per the
  [design-tokens convention](../../../docs/agents/code-conventions.md#design-tokens)).
- **Flag net-new.** Anything with no existing component or token is net-new.
  A new foundational token (a color, type step, or radius) is a system change —
  propose an [ADR](../../../docs/decisions/README.md), not a one-off.
- **Apply conventions.** SSR-first; dialogs are route-based (ADR 023); forms use
  Conform via the `Field` component; accessibility per the `epic-ui-guidelines`
  skill; component/state patterns per `epic-react-patterns`.

### 3. Resolve the net-new list (HITL)

Present the net-new components and tokens. For each, decide with the user:

- Substitute an existing component/token (preferred), **or**
- Add it: new component under `app/components/ui/`, new token in
  `app/styles/tailwind.css`. Accepted additions must also get a specimen in
  `app/components/styleguide/specimens.tsx` and be re-published via
  `pnpm styleguide:snapshot` → `/design-sync`, so the styleguide stays the
  source of truth. Foundational tokens get an ADR.

Iterate until the net-new list is minimal and agreed.

### 4. Emit the grounded design spec

Write the spec using the template below. It annotates the design with concrete
component + token references so `/to-issues` can slice it without re-deriving the
design. Do not publish it to the tracker — hand it to `/to-issues`.

<grounded-design-spec-template>

## Source

Reference to the Claude Design handoff and the PRD it implements.

## Grounded UI

Per screen / section, the elements mapped to the system:

- **<element>** → `<ui/* component>` (`variant`/`props`), tokens: `<token>, …`

Describe behavior and states (loading, empty, error, invalid) in terms of the
existing components, not bespoke markup.

## Net-new

- **Components**: name, proposed location under `app/components/ui/`, why no
  existing component fits, and the specimen to add to the styleguide.
- **Tokens**: proposed `@theme` addition and whether an ADR is required (link
  it).

Or "None — fully grounded in the existing system."

## Convention notes

SSR / route-based-dialog / Conform-forms / accessibility decisions applied, and
any ADRs respected or proposed.

## Ready for /to-issues

A one-line confirmation that the design is grounded and sliceable.

</grounded-design-spec-template>
