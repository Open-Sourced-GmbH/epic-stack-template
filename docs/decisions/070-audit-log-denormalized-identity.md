# Audit log with denormalized identity

The audit log for sensitive role/user changes stores, on each row, a **snapshot
of the actor's and target's identity** (an email/username/name label) *alongside*
the optional foreign keys to those records — rather than relying on the FKs alone.

## Context & trade-off

An audit trail's whole purpose is post-hoc investigation, and the events most
worth investigating (offboarding, "who gave this account admin?") are exactly the
ones where the actor or target user/role may later be **deleted**. If the row
modelled identity purely as FKs with `SetNull` on delete (the pattern used for
`Post.author`), deleting a user would erase who-did-what — the trail goes blank
precisely when it matters. Denormalizing the label looks like a normalization
mistake to a future reader, hence this record.

Alternatives rejected: **FK-only** (loses identity on deletion); **free-text
message** (not filterable/queryable by event or target).

## Decision

Each Audit Event row carries: a typed `event` enum, an optional actor FK **plus**
a denormalized actor label, an optional target FK **plus** a denormalized target
label, a JSON `details` blob, and `createdAt`. Rows are append-only — never edited
or deleted through the UI. The `/admin/audit` viewer is read-only, filterable by
actor/target/event, and paginated with the existing admin Table pattern. Every
sensitive mutation funnels through a small set of server functions so the audit
write lives in one seam.

## Status

Accepted.
