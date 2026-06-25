# Dynamic role→permission RBAC

To support an admin-facing user & role management surface, **roles become data an
admin edits** rather than a fixed code construct. The permission *catalog* (the
valid `action × entity × access` set, derived from `permissionEntities` /
`permissionActions` / `entityAccesses` and reconciled by the seed) stays
code-owned — admins cannot invent entities/actions at runtime, since a permission
with no guarding code is dead data. What becomes editable is the **grant**: the
join between a Role and a catalog Permission, plus the existence/name of Custom
Roles.

## Context & trade-off

The prior model ([ADR-058](058-role-name-is-a-typed-registry.md),
[ADR-059](059-seed-derives-permission-matrix-from-registry.md)) treated the whole
RBAC config as code: `roleNames` a typed union, the seed deriving and *resetting*
both the permission matrix and every role's grants from `roleGrantedAccess`. That
guarantees no drift but makes roles/grants un-editable at runtime. Going dynamic
trades that guarantee for admin flexibility. We chose dynamic with guardrails
rather than either extreme (fully static, or fully dynamic incl. the catalog).

## Decisions

- **System vs Custom roles.** `user` and `admin` remain in the typed `roleNames`
  registry and carry a protected flag — **undeletable, unrenameable** — so guards
  like `requireUserWithRole('admin')` keep compiling. Their *grants* are still
  editable. All other roles are Custom: pure data, never referenced by name in
  code, mattering only via the permissions they carry. `RoleName` narrows to mean
  "roles the code knows about" — this **narrows but does not break** ADR-058.
- **Grants are DB-owned after bootstrap.** The seed *bootstraps* a role's grants
  once (`create`) and never overwrites them (`update: {}`). After first seed the
  database is the source of truth for grants; `roleGrantedAccess` is a seed-time
  default, not an enforced invariant. This **amends ADR-059**: the "no drift from
  the vocabulary" guarantee now covers the permission catalog only, not grants.
  Cost: a later `roleGrantedAccess` code change won't propagate to a seeded DB —
  grant changes go through the UI.
- **Permission-gated management.** A new `role` entity is added to the catalog;
  role pages guard on `*:role:any`, user pages on the existing `*:user:any`, the
  audit viewer on a new `audit` entity (`read:audit:any`). This lets a Custom role
  be granted management rights without being full `admin` — the payoff of dynamic
  RBAC.
- **Last-capable-admin invariant.** The data layer always keeps ≥1 user holding
  both `*:role:any` and `*:user:any`; any mutation that would drop below one
  (revoke, strip-grant, delete, deactivate) is blocked. Plus footgun guards:
  self-deactivate and self-delete are refused.

## Status

Accepted. Amends ADR-059; narrows ADR-058.
