# Decisions

This directory contains all the decisions we've made for this starter template
and serves as a record for whenever we wonder why certain decisions were made.

Decisions in here are never final. But these documents should serve as a good
way for someone to come up to speed on why certain decisions were made.

New ADRs start from [`000-template.md`](000-template.md).

## Index

| #   | Decision                                                                 | Status                                              |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| 001 | [TypeScript Only](001-typescript-only.md)                                | Accepted                                            |
| 002 | [Email Service](002-email-service.md)                                     | Superseded by [017](017-resend-email.md)            |
| 003 | [SQLite](003-sqlite.md)                                                   | Accepted                                            |
| 004 | [GitHub Actions](004-github-actions.md)                                   | Accepted                                            |
| 005 | [Client Preference Cookies](005-client-pref-cookies.md)                  | Accepted                                            |
| 006 | [Native ESM](006-native-esm.md)                                          | Accepted                                            |
| 007 | [Sessions](007-sessions.md)                                              | Accepted                                            |
| 008 | [Content Security Policy](008-content-security-policy.md)                | Accepted                                            |
| 009 | [Region Selection](009-region-selection.md)                             | Accepted                                            |
| 010 | [Memory Swap](010-memory-swap.md)                                        | Accepted                                            |
| 011 | [Sitemaps](011-sitemaps.md)                                              | Deprecated                                          |
| 012 | [CUID](012-cuid.md)                                                      | Accepted                                            |
| 013 | [Email Verification Code](013-email-code.md)                            | Accepted                                            |
| 014 | [TOTP](014-totp.md)                                                      | Accepted                                            |
| 015 | [Monitoring](015-monitoring.md)                                          | Accepted                                            |
| 016 | [Source Maps](016-source-maps.md)                                        | Superseded by [034](034-source-maps.md)             |
| 017 | [Migrating to Resend](017-resend-email.md)                              | Accepted                                            |
| 018 | [Images](018-images.md)                                                  | Superseded by [040](040-tigris-image-storage.md)    |
| 019 | [Components](019-components.md)                                          | Accepted                                            |
| 020 | [Icons](020-icons.md)                                                    | Accepted                                            |
| 021 | [Node.js LTS](021-node-version.md)                                       | Accepted                                            |
| 022 | [Report-only CSP](022-report-only-csp.md)                              | Accepted                                            |
| 023 | [Route-based Dialogs (Modals)](023-route-based-dialogs.md)              | Accepted                                            |
| 024 | [Change Email](024-change-email.md)                                      | Accepted                                            |
| 025 | [Rate Limiting](025-rate-limiting.md)                                    | Accepted                                            |
| 026 | [Path Aliases](026-path-aliases.md)                                      | Superseded by [031](031-imports.md)                 |
| 027 | [Toasts](027-toasts.md)                                                  | Accepted                                            |
| 028 | [Permissions (RBAC)](028-permissions-rbac.md)                          | Accepted                                            |
| 029 | [Remix Auth](029-remix-auth.md)                                          | Accepted                                            |
| 030 | [GitHub Auth](030-github-auth.md)                                        | Accepted                                            |
| 031 | [Imports](031-imports.md)                                                | Superseded by [046](046-remove-path-aliases.md)     |
| 032 | [Cross-Site Request Forgery](032-csrf.md)                              | Superseded by [035](035-remove-csrf.md)             |
| 033 | [Honeypot Fields](033-honeypot.md)                                      | Accepted                                            |
| 034 | [Source Maps](034-source-maps.md)                                        | Accepted                                            |
| 035 | [Remove CSRF](035-remove-csrf.md)                                        | Accepted                                            |
| 036 | [Adopting Vite](036-vite.md)                                            | Accepted                                            |
| 037 | [Generated Internal Command Env Var](037-generated-internal-command.md) | Accepted                                            |
| 038 | [Remove Cleanup DB](038-remove-cleanup-db.md)                          | Accepted                                            |
| 039 | [Passkeys](039-passkeys.md)                                              | Accepted                                            |
| 040 | [Switch to Tigris for Image Storage](040-tigris-image-storage.md)       | Accepted (amended by [057](057-pluggable-storage-driver.md)) |
| 041 | [Introduce Image Optimization](041-image-optimization.md)              | Accepted                                            |
| 042 | [Node's Built-in SQLite Support](042-node-sqlite.md)                    | Accepted                                            |
| 043 | [PwnedPasswords Integration](043-pwnedpasswords.md)                    | Accepted                                            |
| 044 | [React Router DevTools](044-rr-devtools.md)                            | Accepted                                            |
| 045 | [React Router Auto Routes](045-rr-auto-routes.md)                      | Accepted                                            |
| 046 | [Remove Path Aliases](046-remove-path-aliases.md)                      | Accepted                                            |
| 047 | [Mock Cache Server in Tests](047-mock-cache-server-in-tests.md)        | Accepted                                            |
| 048 | [Cloudron deploy + branch model](048-cloudron-deploy-branch-model.md)   | Accepted                                            |
| 049 | [Shared Auth Vocabulary in Util Layer](049-shared-vocabulary-in-util-layer.md) | Accepted                                     |
| 050 | [Blog/CMS Replaces Notes](050-blog-cms-replaces-notes.md)                | Accepted                                            |
| 051 | [Verify Dispatch Registry](051-verify-dispatch-registry.md)             | Accepted                                            |
| 052 | [Verify-Session Handshake & 2FA Lifecycle in Util](052-verify-session-handshake-and-2fa-lifecycle-in-util.md) | Accepted                          |
| 053 | [Cache Write-Back Lives in Cache Util](053-cache-writeback-lives-in-cache-util.md) | Accepted                          |
| 054 | [Single-Writer Cache Fork Is One Seam](054-single-writer-cache-fork-is-one-seam.md) | Accepted                          |
| 055 | [Cache Backends Are a Named Registry](055-cache-backend-is-a-named-registry.md) | Accepted                          |
| 056 | [Permission Match Rule & RBAC Vocabulary](056-permission-match-rule-and-vocabulary.md) | Accepted                          |
| 057 | [Pluggable Storage Driver](057-pluggable-storage-driver.md)              | Proposed (amends [040](040-tigris-image-storage.md)) |
| 058 | [Role Identity Is a Typed Registry](058-role-name-is-a-typed-registry.md) | Accepted                          |
| 059 | [Seed Derives Permission Matrix from Registry](059-seed-derives-permission-matrix-from-registry.md) | Accepted                          |
| 060 | [New-Session Finalization in Util](060-new-session-finalization-in-util.md) | Accepted                          |
| 061 | [Ownership→Permission Rule & Note Read-Shape](061-ownership-permission-rule-and-note-select.md) | Accepted                          |
| 062 | [Brand Accent Token + Runtime Accent Customizer](062-brand-accent-token-and-customizer.md) | Accepted                          |
| 063 | [Markdown Rendering Pipeline for Posts](063-markdown-rendering-pipeline-for-posts.md) | Proposed                          |
