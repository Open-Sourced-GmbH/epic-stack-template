---
name: to-acceptance
description: Closing acceptance gate for a finished PRD — proves the feature works (functional tests) and looks right (design fidelity) before promotion, tracked as one Linear QA issue, with minimal human-in-the-loop. Use when a PRD's slices are implemented and the user asks "is this feature ready", to "acceptance-test"/"QA the PRD", "verify the feature is done", or "ready to promote". Not for a single-change spot check (use the global `verify` skill) or diff review (use `/code-review`).
---

# To Acceptance

The **closing step** of this repo's feature lifecycle. After every slice of a
PRD is implemented and a PR is open, this gate proves the whole feature is done:
functional tests **and** design fidelity, tracked in one Linear QA issue, run as
unattended as the sandbox allows.

```
… → /to-issues → implement (/tdd) → PR → /to-acceptance → promote to staging
```

It adapts the live-verification loop to Epic Stack and improves on it: durable
committed Playwright specs instead of throwaway scripts, a first-class
design-fidelity gate, and a deterministic auto-run gate so HITL shrinks to two
known sandbox blockers.

## The loop

1. **Scope** — resolve the PRD (a Linear **project**), its slice issues +
   milestones, and the branch diff vs `develop`. Pull acceptance criteria from
   the PRD body and each slice issue. If the feature has UI, also load the
   grounded design spec from `/to-grounded-design`. Use `mcp__linear__*`
   ([`docs/agents/issue-tracker.md`](../../../docs/agents/issue-tracker.md)),
   never `gh`.
2. **Derive the acceptance matrix** — three lanes with stable case IDs:
   **functional** (`F*`: happy path, edge/error, permissions, regression of
   touched flows), **design** (`D*`: token fidelity, `ui/*` reuse, light/dark,
   layout vs the grounded spec), **cross-cutting** (`X*`: typecheck/lint/unit/
   build). Create **one Linear QA issue** under the project + a `QA`/`Hardening`
   milestone, matrix as a checklist. → [`references/acceptance-matrix.md`](references/acceptance-matrix.md).
3. **Run the automated gate (unattended)** — run
   `node .claude/skills/to-acceptance/scripts/acceptance-gate.mjs --json`. It
   runs the sandbox-safe `X*`/`D-css-fresh` cases and emits PASS/FAIL JSON. No
   HITL. Report failures honestly — incl. any pre-existing ones.
4. **Drive the feature e2e (durable)** — encode the `F*` cases as **committed**
   Playwright specs in `tests/e2e/<feature>.test.ts`, reusing the fixtures in
   `tests/playwright-utils.ts` (`login`, `navigate`, `insertNewUser`, `expect`,
   `waitFor`). Run against the **dev** server (`pnpm test:e2e:dev` /
   `playwright test`) — never `start:mocks` (boot is broken). `tmp/qa/` drivers
   only for throwaway exploration, never committed.
5. **Verify design fidelity** — run the checks in
   [`references/design-fidelity.md`](references/design-fidelity.md): token-drift
   grep of changed files, `styleguide:snapshot` for drift, light/dark
   screenshots of the feature routes, reconciled against the grounded spec. Flag
   any hardcoded color/radius/font or `ui/*` non-reuse.
6. **Close the loop** — post per-case evidence as a Linear comment, tick the
   checklist, and mark the QA issue `Done` **only when every required case
   passes**. File new defects as separate `Bug` issues linked back. Call out
   blocked/env cases (⏭️) explicitly — never silently drop scope.

## Minimal HITL

Step 3 runs fully unattended. Only two things need the human, handed over as
`! <cmd>` in the prompt:

- One-time **`! pnpm test:e2e:install`** — Playwright's chromium binary can't
  install read-only in the sandbox. The gate script auto-detects this and prints
  the handoff; e2e (step 4) waits on it.
- **`/design-sync` republish** — only if a `ui/*` component or `tailwind.css`
  token changed (OAuth, not scriptable). Run `pnpm design-sync:prepare` then
  `/design-sync`.

## Guardrails

- **Durable over ephemeral.** Acceptance criteria become committed e2e specs
  (regression coverage), not `tmp/qa/` scripts that rot.
- **Dev server, not `start:mocks`** for e2e (the prod/mocks boot is broken).
- **No hardcoded tokens** — every color/radius/font maps to an `@theme` token
  ([code-conventions](../../../docs/agents/code-conventions.md#design-tokens)).
- **Don't mark `Done` on partial scope.** All required cases pass, or it stays
  open with ⏭️ cases named.

## Next step

Gate green → promote `develop → staging` per
[`git-workflow.md`](../../../docs/agents/git-workflow.md) (merge commit, **not**
squash, so `release-please` reads the `feat:`/`fix:` commits). Any failing case →
back to `/tdd` for the slice that owns it, then re-run `/to-acceptance`.
