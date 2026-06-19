# Acceptance matrix & Linear QA issue

The acceptance matrix is the contract for "done". It lives as the description of
**one** Linear QA issue per PRD (the PRD is a Linear **project**; the QA issue
sits under it on a `QA`/`Hardening` milestone). Evidence accrues as comments;
checkboxes tick as cases pass.

## Case-ID scheme

Stable IDs so evidence comments, checklist ticks, and the gate-script JSON all
line up:

- **`F1-n`** — functional cases (happy path, edge/error, permissions, regression
  of flows the diff touches). Group by user-facing flow (`F1-*`, `F2-*`, …).
- **`D1-n`** — design cases (token fidelity, `ui/*` reuse, light/dark, layout vs
  the grounded spec). `D-css-fresh` is emitted by the gate script.
- **`X-*`** — cross-cutting, emitted by `acceptance-gate.mjs`: `X-typecheck`,
  `X-lint`, `X-unit`, `X-build`, `X-e2e`.

One-line assertion per case. A case is **required** unless explicitly marked ⏭️.

## Legend

`⬜ not run · 🟡 in progress · ✅ pass · ❌ fail · ⏭️ blocked/env`

## QA issue description template

```md
## Acceptance matrix — <feature> (vs develop)

Legend: ⬜ not run · 🟡 in progress · ✅ pass · ❌ fail · ⏭️ blocked/env

### Functional

- [ ] F1-1 <happy-path assertion>
- [ ] F1-2 <edge/error assertion>
- [ ] F2-1 <permissions assertion>
- [ ] F2-2 <regression: existing flow still works>

### Design fidelity

- [ ] D1-1 no hardcoded color/radius/font in changed files (all @theme tokens)
- [ ] D1-2 reuses ui/* components per the grounded spec (no bespoke re-impl)
- [ ] D1-3 renders correctly in light + dark
- [ ] D1-4 layout matches the grounded design spec
- [ ] D-css-fresh .design-sync/styles.compiled.css up to date

### Cross-cutting (acceptance-gate.mjs)

- [ ] X-typecheck · X-lint · X-unit · X-build green
- [ ] X-e2e durable specs in tests/e2e/ pass against the dev server

**Done = every required (non-⏭️) box ✅.** Evidence posted as comments per case.
```

## Run-time updates

- Per case: `mcp__linear__save_comment` on the QA issue with concrete evidence —
  the gate JSON line, e2e pass/fail, screenshot paths, before/after state.
- **Aggregate, then tick once.** Collect all results, then do a **single**
  `mcp__linear__save_issue` that flips every passed `- [ ]` → `- [x]` and updates
  the legend marker. Don't tick one box per call.
- Map each `caseId` → its checklist line: pass = `- [x]` + ✅; fail = leave
  unticked + ❌ with a pointer to the evidence comment.

## Close

- When all required cases pass: set the QA issue `state` to `Done`.
- New defects found → separate `Bug` issues (repro + root cause + suggested fix),
  linked back to the QA issue. Don't fold them into the checklist.
- Partial scope → keep the issue open, list ⏭️ cases and why. Never mark `Done`
  with blocked cases silently dropped.
