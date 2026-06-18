# Domain

> **Stub.** Replace this with your project's domain notes — the single-context
> glossary, core entities, business rules, and invariants an agent needs to work
> in this codebase without re-deriving them from the schema each time.

Keep this file focused on *what the product is and the rules it obeys*, not how
the code is structured (that's [code-conventions.md](code-conventions.md)) and
not architectural decisions (those are ADRs under `docs/decisions/`).

## Suggested sections

- **Core entities** — the nouns of the domain and how they relate.
- **Key workflows** — the important end-to-end flows.
- **Business rules / invariants** — constraints that must always hold.
- **Glossary** — terms with precise meanings in this project.

## Glossary

- **Verification** — an *ephemeral, one-time* proof of control over an
  identifier (email/username), backed by a row in the `verification` table and a
  TOTP code. Created by `prepareVerification`, emailed, then **consumed**
  (validated and deleted) on use. Types: `onboarding`, `reset-password`,
  `change-email`. A Verification is always deleted once consumed — it never
  persists past a single successful use.
- **Two-Factor Authenticator** — a *permanent credential* belonging to a user
  who has enabled 2FA. It shares the `verification` table and TOTP machinery
  with Verifications (type `2fa`, target = user id) but is **never deleted on
  verify** — it is a standing credential, re-checked on login and after a 2-hour
  recency window. Distinct concept from a Verification despite the shared table;
  conflating the two is what made the `2fa` case the lone switch arm that skips
  deletion.
- **Pending Two-Factor Authenticator** — the *in-progress* row written while a
  user is enabling 2FA (type `2fa-verify`, target = user id). It is **not** a
  `VerificationTypes` member: it never flows through `/verify`, and is exercised
  only by the 2FA settings route. Once the user confirms a code it is
  **promoted** in place into a Two-Factor Authenticator (its `type` flips to
  `2fa`); abandoning setup deletes it. Naming it separately is what lets the
  permanent and pending states stay distinct rather than being one fuzzy "2fa"
  row.
