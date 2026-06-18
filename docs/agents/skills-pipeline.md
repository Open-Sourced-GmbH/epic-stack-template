# Skills pipeline

Structured skills for the feature lifecycle:

```
/to-prd → /grill-me → /to-issues → implement → PR
```

- `/to-prd` turns the current context into a PRD and publishes it to the tracker.
- `/grill-me` stress-tests the plan/design before committing to it.
- `/to-issues` breaks the PRD into independently-grabbable, vertical-slice issues.
- `/tdd` slots into the **implement** step (red → green → refactor).
- `/triage` is standalone for bug/feature intake.

These skills publish to the issue tracker described in
[`issue-tracker.md`](./issue-tracker.md) and follow the conventions in
[`linear-issues.md`](./linear-issues.md).
