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

Re-publish whenever a `ui/*` component or a `tailwind.css` token changes. One
command does the deterministic prep; `/design-sync` is the only manual step:

```bash
pnpm design-sync:prepare  # build → compiled CSS → boot dev server → snapshot → teardown
# review styleguide/index.html, then:
/design-sync              # pushes to the Claude Design project, one component at a time
```

`pnpm design-sync:prepare` ([`scripts/design-sync-prepare.ts`](../../scripts/design-sync-prepare.ts))
runs the four-step middle of the pipeline so you don't have to juggle two
terminals:

1. `react-router build` → `build/client/assets/tailwind-<hash>.css`
2. `pnpm design-sync:css` → copies that hashed file into
   `.design-sync/styles.compiled.css` (the `cssEntry` the bundler reads)
3. boots a dev server (the `/styleguide` route is dev-only) — or reuses one
   already running on `STYLEGUIDE_URL`
4. `pnpm styleguide:snapshot` → writes `styleguide/` (light + dark +
   `manifest.json` + `index.html`), then tears the server back down

The two ends stay manual on purpose: **reviewing `styleguide/index.html`** is a
human judgement call, and **`/design-sync`** is an interactive Claude Code skill
(OAuth + incremental diff), not a CLI — so neither belongs in an npm script. The
individual steps (`pnpm styleguide:snapshot`, `pnpm design-sync:css`) remain
available for re-running a single stage.

`/design-sync` syncs **incrementally, never as a wholesale replace** — it diffs
the bundle against the remote project and updates only what changed. The
`styleguide/manifest.json` carries the card metadata (name, group, subtitle,
viewport) it registers in the Design System pane.

Requirements: Playwright's chromium (`pnpm test:e2e:install`, or
`npx playwright install chromium`). `styleguide/` is a build artifact and is
gitignored.

### What's enforced vs. manual

The code side is kept honest automatically; publishing is not (it can't be —
`/design-sync` needs a human + OAuth):

| Guard | Where | Catches |
| --- | --- | --- |
| Component set in lockstep (config ↔ barrel ↔ specimens ↔ previews) | `app/components/styleguide/design-sync.test.ts` (vitest, CI) | Adding a `ui/*` component to one place but not another |
| Compiled CSS freshness | `🎨 Design-sync CSS freshness` job in [`ci.yml`](../../.github/workflows/ci.yml) | A token/utility change that wasn't re-synced into `.design-sync/styles.compiled.css` |
| Converter toolchain never committed | `.gitignore` (`package-build.mjs`, `package-validate.mjs`, `/lib/`, `/ds-bundle/`) | The staged `/design-sync` `.mjs` toolchain leaking into the repo |

> **Not automated:** nothing republishes to (or drift-checks against) the Claude
> Design project itself — that's a deliberate manual step. CI guarantees the
> *inputs* to `/design-sync` are internally consistent and fresh; the human runs
> the publish.

The `/design-sync` converter (`package-build.mjs`, `package-validate.mjs`,
`lib/`) is **staged at the repo root by the `/design-sync` skill**, not vendored
here, so it is gitignored and not reproducible from a clean checkout without the
skill. The reviewable, tracked inputs are `design-sync.config.json` and
everything under `.design-sync/`.

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
