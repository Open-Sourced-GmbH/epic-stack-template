# Styleguide & Claude Design

The styleguide is the **design-system source of truth**. It renders the real
`app/components/ui/*` components and `app/styles/tailwind.css` tokens, so it can
never drift from what ships. From it we publish a mirror to
[Claude Design](https://claude.ai/design) so design exploration always starts
from the real components and tokens — not a parallel mockup that rots.

> **Code is the source of truth; Claude Design is a mirror + sketchpad, never
> the source.** If the Design project ever becomes authoritative, the design
> system has forked from the shipping CSS and will drift forever.

## The pieces

| Piece | Path | Role |
| --- | --- | --- |
| Specimens | `app/components/styleguide/specimens.tsx` | Single source: each component/token rendered with its variants |
| Route | `app/routes/styleguide.tsx` → `/styleguide` | Living, browsable styleguide. **Dev-only** (loader 404s in production) |
| Snapshot | `scripts/snapshot-styleguide.ts` (`pnpm styleguide:snapshot`) | Captures the live route into a self-contained `styleguide/` HTML bundle |

The snapshot reads the route's rendered DOM (post-hydration) and the
actually-applied CSS, so the bundle is faithful to what ships — tokens (oklch),
variants, and resting states all render correctly. Both the route and the
snapshot consume the same specimens, so there is **zero drift**.

## Publish cadence: code → Claude Design

Re-publish whenever a `ui/*` component or a `tailwind.css` token changes:

```bash
pnpm dev                  # the /styleguide route is dev-only, so the server must run
pnpm styleguide:snapshot  # writes styleguide/ (light + dark, + manifest.json + index.html)
# review styleguide/index.html, then:
/design-sync              # pushes to the Claude Design project, one component at a time
```

`/design-sync` syncs **incrementally, never as a wholesale replace** — it diffs
the bundle against the remote project and updates only what changed. The
`styleguide/manifest.json` carries the card metadata (name, group, subtitle,
viewport) it registers in the Design System pane.

Requirements: a running dev server (`pnpm dev`) and Playwright's chromium
(`pnpm test:e2e:install`, or `npx playwright install chromium`). `styleguide/`
is a build artifact and is gitignored.

## Adding a specimen

Edit `app/components/styleguide/specimens.tsx` — add a `Specimen` to the
`specimens` array. Use the real `#app/components/ui/*` components and only
design tokens (never hardcoded colors/fonts/radii, per
[code-conventions.md](./code-conventions.md#design-tokens)). The route and the
next snapshot pick it up automatically.

## Why this exists (the grounding contract)

The styleguide is the contract both sync directions share:

- **Publish (code → Design):** keeps Claude Design current so feature design is
  born grounded in the real system.
- **Ground (Design → code) — `/to-grounded-design`:** when a feature's design
  comes back from Claude Design, it is reconciled against *this same* token +
  component set — reuse an existing `ui/*` component, map every
  color/space/radius to an existing token, and flag anything genuinely net-new
  (a new foundational token may warrant an [ADR](../decisions/README.md)).

Both directions are wired into the pipeline:
[`/to-design`](../../.claude/skills/to-design/SKILL.md) seeds a Claude Design
exploration from the real system, and
[`/to-grounded-design`](../../.claude/skills/to-grounded-design/SKILL.md)
reconciles the handoff that comes back against this styleguide before
[`/to-issues`](./skills-pipeline.md). See the
[skills pipeline](./skills-pipeline.md) for the full flow.
