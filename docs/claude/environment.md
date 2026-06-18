# Environment Variables

Copy `.env.example` to `.env` for local development. Prefix mock values with
`MOCK_` to use MSW handlers instead of real APIs. In production on Cloudron, set
these via the dashboard or a `.env` file in `/app/data/` (read by `start.sh`).

## Required

| Variable                 | Description                                                    |
| ------------------------ | ------------------------------------------------------------- |
| `NODE_ENV`               | `production`, `development`, or `test`                        |
| `DATABASE_PATH`          | Path to SQLite database file                                  |
| `DATABASE_URL`           | Prisma connection string (`file:./data.db?connection_limit=1`) |
| `CACHE_DATABASE_PATH`    | Path to SQLite cache database                                 |
| `SESSION_SECRET`         | Secret for session cookie signing                             |
| `HONEYPOT_SECRET`        | Secret for honeypot form protection                           |
| `INTERNAL_COMMAND_TOKEN` | Token for internal cache-sync commands                        |

> `start.sh` generates random fallbacks for `SESSION_SECRET`, `HONEYPOT_SECRET`,
> and `INTERNAL_COMMAND_TOKEN` if unset, but sessions won't survive restarts -
> set them explicitly in production.

## Optional

| Variable                      | Description                                                       | Default |
| ----------------------------- | ---------------------------------------------------------------- | ------- |
| `ALLOW_INDEXING`              | Search engine indexing (`true`/`false`)                          | `true`  |
| `SENTRY_DSN`                  | Sentry error tracking DSN                                        | -       |
| `RESEND_API_KEY`              | Resend API key for transactional email                          | -       |
| `GITHUB_CLIENT_ID` / `_SECRET` / `_TOKEN` / `_REDIRECT_URI` | GitHub OAuth (mocked when `MOCK_`-prefixed) | -       |
| `AWS_*` / `BUCKET_NAME`       | S3-compatible object storage for uploaded images                | mocked  |
| `CLOUDRON_MAIL_SMTP_*` / `CLOUDRON_MAIL_FROM` | Cloudron-provided SMTP credentials & sender address | -       |
| `CRON_SECRET`                 | Shared secret for an external scheduler to authorize cron endpoints (`Authorization: Bearer $CRON_SECRET`) | - |
| `CLOUDRON_APP_STAGING`        | Cloudron app ID for staging (used by `scripts/db/`)              | -       |
| `CLOUDRON_APP_PROD`           | Cloudron app ID for production (used by `scripts/db/`)           | -       |
