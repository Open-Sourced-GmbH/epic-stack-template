# Grounded Design Spec — User & Role Management (Access)

## Source

- **Handoff:** `docs/design/Epic Stack Template UI-Admin Ext.zip` → `design_handoff_user_role_management/` (6 surfaces: AdminUsers, AdminUserDetail, AdminRoles, AdminRoleEditor, AdminAudit, AuthDeactivated). High-fidelity, authored against the published `EpicUI` design system.
- **PRD:** [user & rollen management](https://linear.app/open-sourced/project/user-and-rollen-management-ea50821138f8/overview).
- **Grounding contract:** `docs/agents/styleguide.md`. Architecture: ADR-068 (AppShell + sidebars), ADR-069 (dynamic RBAC), ADR-070 (audit log), ADR-023 (route-based dialogs).

## Reconciliation summary

The handoff verified cleanly against the real system. Net-new collapses to **one** primitive (`ToggleChip`) plus a feature-level matrix composite. **Zero net-new tokens.** Every "chip/pill/marker" recipe maps onto existing `Badge` variants; the removable-role-chip UI maps onto `TagInput`; the entire "Table card" (selection, row menu, empty/loading, pager, selected-row brand bar) is the existing `Table` primitive.

**Corrections applied:**
- **Drop the handoff's "per-page accent block"** (`--brand`, `--brand-soft`, `--brand-glow`, `--primary`, `--ring`). These are already global `@theme` tokens; `tailwind.css:84` explicitly forbids re-declaring them, and the handoff's `--brand-soft: oklch(96% 0.025 172)` is *wrong* (real token = `color-mix(in srgb, var(--brand) 13%, transparent)`). Inherit the globals; never hardcode.
- **Drop "Invite user"** (Users list) and **"Export"** (Audit log) — both are PRD Out-of-Scope. (Reinstate only by amending the PRD.)
- **"Duplicate role"** row action is not backed by a user story — treated as out of scope unless the PRD adds it.
- Cosmetic-only flourishes (status-pill dot-glow ring, role-chip inset ring) dropped in favor of the standard `Badge` look.

## Global frame (every Access surface)

- **Shell** → existing **`AppShell variant="full"`** (ADR-068) — navbar + section `Sidebar` + content slot. Mirrors `screen-section-shell` / `screen-admin-blog`. Tokens already own navbar 60px, sidebar 208px, content padding — no overrides.
- **Sidebar** → existing **`Sidebar`** with a new **"Access"** group (`Users` `/admin/users`, `Roles` `/admin/roles`, `Audit log` `/admin/audit`) added to the admin `SidebarGroup[]`. Active link styling (`bg-brand text-primary-foreground`, `aria-current="page"`) and `linkComponent={Link}` are built in.
- **Header** → existing **`PageHeader`** via the `handle.adminHeader` seam (eyebrow = brand uppercase, title, optional subtitle, trailing action cluster).
- **Cards** → existing **`FormCard`** (+ `destructive` variant for danger zones). Tokens: `bg-card`, `border-border`, `--radius`.
- **Permission-gated chrome** — the Access group renders only when the user holds the management permissions (loader-provided flag; consistent with ADR-068).

## Grounded UI

### Surface 1 — Users list (`/admin/users`)
- **Page** → `PageHeader` (eyebrow "Access", title "Users"). *(No "Invite user" action — out of scope.)*
- **Filter toolbar** → `Input` (`type="search"`, leading `Icon name="magnifying-glass"`, `pl-9`) + two `Select`s (Role, Status). SSR GET; Status/Role `Select` auto-submit via `requestSubmit`.
- **Table** → `Table` primitive. `columnTemplate` ≈ `"1fr 132px 110px 92px"`; `selection` (from `useRowSelection`) switches on the select-all + per-row checkbox tracks; `rowActions` renders the `DropdownMenu` (View, Force log out, Deactivate, sep, Delete destructive). Selected-row brand left-bar and hover are built in.
  - **User cell** → `Avatar` (`size-9`, brand-soft fallback) + name (`text-body-sm` 600) over email (`text-body-2xs text-muted-foreground`), ellipsized.
  - **Roles cell** → role chips = **`Badge`** `variant="secondary"` (ordinary) / `variant="brand"` (privileged/management-granting). *(replaces `.u-role`/`.u-role--elev`)*
  - **Status cell** → **`Badge`** `variant="brand" dot` ("Active") / `variant="outline" dot` ("Deactivated"). *(replaces `.u-status`)*
  - **Created cell** → `text-body-sm text-muted-foreground` date.
- **Bulk bar** (≥1 selected) → existing **`BulkActionBar`** pattern (EPT-69): count + `Button variant="outline" size="sm"` (Force log out, Deactivate) + `variant="destructive" size="sm"` (Delete) + `Separator` + `variant="ghost"` Clear.
- **Deactivated row** → `opacity-60` on the row + the "Deactivated" status badge.
- **States** → `Table` `emptyState` (no users / no matches — distinct copy), `loading` (Skeleton rows), error → `Alert tone="error"`. Pager → `Pagination` in the Table `footer` (server pagination, mirrors `getAllPostsForAdmin`).

### Surface 2 — User detail (`/admin/users/$id`)
- Single stacked column (`max-w-[760px]`), back-link "All users", name (`text-h?`/26px) + status `Badge`.
- **Identity** → `FormCard`; `Avatar` (`size-14`) + name/email; `Separator`; meta rows (Joined, Last active, `User ID` in `font-mono`).
- **Roles** → `FormCard`; assigned roles as removable chips + an "Assign a role" combobox → reuse **`TagInput`** (combobox + removable `--secondary` chips with "Remove X"), resolving to existing roles (not free-text create). *(replaces `.ud-chip` + Select + Add button)*
- **Account status** → `FormCard`; copy + `Button variant="outline"` Deactivate ↔ Reactivate. (Deactivating ends sessions — server.)
- **Sessions & security** → `FormCard`; "Active sessions (N)" + `Button variant="outline"` Force log out; "Password" + `Button variant="outline"` Send reset email. Rows split by `Separator`.
- **Danger** → `FormCard variant="destructive"`; `Button variant="destructive"` "Delete user…" → **route-based `Dialog`** (ADR-023) with `useDoubleCheck`.
- **Blocked-operation** → **route-based `Dialog`**: destructive-tinted warning `Icon`, title (e.g. "Can't deactivate the last admin"), explanation, a bordered "What to do instead" note, actions `Button variant="ghost"` Close + `Button` "Manage roles". (Chosen treatment: explanatory dialog, not inline Alert.)

### Surface 3 — Roles list (`/admin/roles`)
- `PageHeader` (title "Roles", `Button` "New role" action) → `Table` (`columnTemplate ≈ "1fr 132px 96px"`).
  - **Role cell** → brand-soft/muted icon tile (`Icon`) + name (`text-body-sm` 600) over muted description.
  - **Type cell** → System = **`Badge variant="outline"`** + leading lock `Icon`; Custom = **`Badge variant="brand"`**. *(replaces bespoke marker)*
  - **Users cell** → right-aligned count.
  - **Row actions** → `DropdownMenu`. **System roles expose View only** (no rename/delete). Custom roles: Edit / (sep) Delete. *(Duplicate dropped — no story.)*
- Footer summary text ("N roles · X system, Y custom").
- **States** → empty / loading / error as Surface 1.

### Surface 4 — Role editor (`/admin/roles/$id`, `/admin/roles/new`)
- Column (`max-w-[860px]`), back-link "All roles", name + Custom/System `Badge`.
- **Details** → `FormCard`; `Field`+`Input` Name, `Field`+`Textarea` Description (Conform + Zod; `aria-invalid` repaints via `--input-invalid`). **System roles: locked** (disabled inputs; focusable-span `Tooltip` explains why).
- **Permissions** → `FormCard`; header + right-aligned grant-count `Badge`. Body = **permission grant matrix (feature composite)**:
  - Bordered CSS grid (`grid-template-columns: minmax(104px,1.1fr) repeat(4,1fr)`): header (Resource / Create·Read·Update·Delete) + one row per entity (icon tile + name), each cell a centered pair of **`ToggleChip`** (`own` / `any`), or a muted `—` where N/A.
  - **`ToggleChip`** (net-new `ui/*` primitive) = the `.pc` two-state toggle: off = `border-border bg-background text-muted-foreground`; on (`aria-pressed`) = `bg-brand border-brand text-primary-foreground`; locked = `bg-brand-soft text-brand` + lock + tooltip (admin-floor-protected / system partial-lock). Controlled grant state, submitted via Conform as the grant set (`{action}:{entity}:{scope}` strings).
- **Save bar** → sticky; brand status dot + "Unsaved changes" + `Button variant="ghost"` Discard + `StatusButton` Save. Visible only when dirty.
- **States** → default/dirty, invalid (`Field` error), blocked (admin-floor → blocked `Dialog` *or* `Alert tone="error"`), system partial-lock, create (empty form).

### Surface 5 — Audit log (`/admin/audit`)
- `PageHeader` (title "Audit log") → filter toolbar (`Input` search + event `Select`). *(No Export — out of scope.)* → `Table` (`columnTemplate ≈ "96px 1.25fr 140px 1.3fr"`, plus an expand track).
  - **When** → relative time (`text-body-sm text-muted-foreground`), absolute in a `Tooltip`.
  - **Actor** → `Avatar size-7` + name; **deleted-actor fallback** = dashed-border circle + *italic muted* "Deleted user" (from the denormalized label, ADR-070).
  - **Event** → **`Badge`**: `role.grant`→`brand`, `role.update`→`secondary`, `user.deactivate`→`outline`, `user.delete`→`destructive`, `auth.login`→`secondary`.
  - **Target** → name (+ optional muted qualifier); `—`/italic-muted "Deleted user" fallback.
  - **Expand** → chevron `Button variant="ghost" size="icon-sm"`; expandable detail row.
- **Detail (inline diff, feature markup)** → expanded row tinted `bg-[color-mix(...)]`, a `font-mono` block: added line `+ grant …` on brand tonal, removed line `− revoke …` on destructive tonal. Tokens only.
- **States** → empty / loading / error.

### Surface 6 — Deactivated sign-in (`/login`, story 33)
- Existing **minimal auth shell** (`AppShell variant="minimal"` / `screen-auth`): borderless navbar (logo + theme `Button variant="ghost" size="icon-sm"`), centered column, top `--brand-glow` radial, brand pine tile, heading "This account is deactivated" + muted subtitle.
- `FormCard` (`max-w-[380px]`): `Alert tone="error"` (AlertTitle "Access suspended" + AlertDescription naming the email, reassuring data is safe) + `Button size="wide"` "Contact an administrator" + `Button variant="ghost" size="wide"` "Back to sign in" + muted support footer link.

## Net-new

- **Components**
  - **`ToggleChip`** → `app/components/ui/toggle-chip.tsx`. A controlled two-state toggle button (`aria-pressed`, on/off/locked) — no existing primitive fits (`Switch` is a sliding switch; `Checkbox` is a box; `Button` has no pressed state). Used per-grant in the permission matrix; reusable beyond it. **Add specimen** to `specimens.tsx` (group "Forms") and complete the 4-file design-sync lockstep (config ↔ barrel/entry ↔ preview ↔ specimen), then `pnpm design-sync:prepare` → `/design-sync`.
  - **Permission grant matrix** → *feature composite* in the role-editor route (not `ui/*`): it's RBAC-domain-specific (entities × actions × scopes). Built from `ToggleChip` + tokens. No styleguide entry.
  - **Blocked-operation dialog**, **audit inline-diff block** → feature markup composed from existing `Dialog`/tokens; not primitives.
- **Tokens**: **None.** All values map to existing `@theme` tokens; the handoff's per-page accent block is dropped (see Corrections). No ADR needed.

## Convention notes

- **SSR-first**: loaders for lists/detail, actions for every mutation; filters via Conform GET with `requestSubmit` auto-submit.
- **Route-based dialogs** (ADR-023) for destructive confirms and the blocked-operation dialog; **overlay no-portal convention** (Dialog/Tooltip/Sheet render in place so the open state snapshots into `/styleguide`).
- **Forms** via Conform + Zod through `Field`; the matrix submits the grant set as controlled state; toggles via `useInputControl`.
- **Accessibility** (`epic-ui-guidelines`): `navigation`/`main` landmarks, `aria-current` active link, keyboard-operable matrix/menus/expandable rows, `aria-pressed` ToggleChip, focusable-span `Tooltip` on disabled/locked controls, `Alert tone="error"` assertive.
- **Tokens only** — no hardcoded colors/fonts/radii; ToggleChip and all feature markup reference `@theme` tokens.
- **Responsive + dark mode + 403** are in scope (PRD stories 32, 34) but not drawn in the handoff — build from the token system (all tokens flip on `.dark`; tables degrade to stacked).

## Ready for /to-issues

Grounded and sliceable: one net-new primitive (`ToggleChip` + lockstep), one feature matrix composite, everything else mapped to existing `Table`/`Badge`/`TagInput`/`FormCard`/`Dialog`/`PageHeader`/`AppShell`/`Sidebar` + existing tokens. PRD updated with these decisions.
