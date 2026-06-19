# Operational runbooks

Concrete, deployment-specific operations for this Cloudron app. These are the
*runbooks* for this project; the `epic-*`
[domain skills](../agents/skills-pipeline.md#domain-skills-epic-stack-know-how)
are the general how-to guides. When they overlap, the file here wins for
anything Cloudron- or this-deployment-specific.

| Doc                                          | Covers                                                              |
| -------------------------------------------- | ------------------------------------------------------------------ |
| [deployment.md](deployment.md)               | Cloudron deploy: Docker image → GHCR → `cloudron update`           |
| [database-operations.md](database-operations.md) | DB scripts in `scripts/db/`, backups, migrations               |
| [environment.md](environment.md)             | env vars, `.env`, mock (`MOCK_`) values, Cloudron configuration    |
