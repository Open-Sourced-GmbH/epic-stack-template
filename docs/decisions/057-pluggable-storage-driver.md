# Pluggable Storage Driver (disk default, S3-compatible opt-in)

Date: 2026-06-18

Status: proposed

Amends [040](040-tigris-image-storage.md)

## Context

Uploaded images currently have exactly one backend. `app/utils/storage.server.ts`
is S3-only: every upload is a signed `PUT` and every read a signed `GET` against
`AWS_ENDPOINT_URL_S3` / `BUCKET_NAME`, and `app/utils/env.server.ts` makes those
variables **required** (`z.string()`). Locally this is only survivable because
MSW (`tests/mocks/tigris.ts`) fakes the bucket into `tests/fixtures/uploaded/`.

[040](040-tigris-image-storage.md) chose Tigris for this. Its reasoning was
sound but **Fly-specific**: it justified the external dependency with "Fly has
built-in support and no additional account needs to be created." This template
no longer targets Fly — it deploys to **Cloudron** (see
[048](048-cloudron-deploy-branch-model.md)), a single-instance, self-hosted PaaS
that provides its own persistent, backed-up `/app/data` volume. On Cloudron,
Tigris is a genuine extra account and external dependency — the precise cost 040
said we would avoid.

040's *durable* win was getting binary blobs **out of SQLite** (database bloat,
slow backups). That win is independent of *which* non-SQLite backend we use.

Two further facts forced the decision:

- The DB tooling in `scripts/db/` (`pull/push --with-files`) already syncs a
  filesystem uploads directory (`/app/data/uploads`) — machinery for a
  disk backend the app code never actually used.
- `db pull` today is half a pull: it sanitizes and downloads the DB, but the
  image keys it brings down point at an object store the local env can't serve,
  so local development renders broken images.

## Decision

Make the storage backend a **pluggable driver** selected by an explicit
`STORAGE_DRIVER` environment variable.

- **`disk` (default)** — uploads are written to the container filesystem under
  `/app/data/uploads/<key>` (locally `./data/uploads/<key>`), served via the
  existing image route. Cloudron backs this volume up natively.
- **`s3` (opt-in)** — uploads go to any **S3-compatible** object store. The
  reference target is **MinIO** (self-hostable, fits the Cloudron model), not
  AWS/Tigris specifically; the `AWS_*` vars are generic S3 config
  (endpoint/key/secret/bucket/region).

Mechanics:

- `env.server.ts` gets a conditional schema: `STORAGE_DRIVER` is
  `z.enum(['disk','s3']).default('disk')`, and the `AWS_*` group is required
  **only when** `STORAGE_DRIVER=s3` (via `superRefine`). Disk needs no storage
  env at all.
- The storage abstraction is a small interface — `upload(key, file)` plus
  `getImgSource(key)` — where `getImgSource` returns openimg's already-tagged
  source descriptor: `{ type: 'fs', path }` for disk, `{ type: 'fetch', url,
  headers }` (signed) for s3. `app/routes/resources/images.tsx` calls the driver
  instead of hard-coding the signed-S3 path. The `buildImageKey` scheme is
  unchanged; only the storage location moves.
- With `disk` as the default, local dev writes to a real (gitignored)
  `./data/uploads` and the **MSW Tigris mock is dropped on the default path** —
  it survives only for `s3`-driver tests.

Explicitly **not** in scope:

- **No data migrator.** This is a template (a fresh app ships empty). An app
  already deployed on `s3` simply keeps `STORAGE_DRIVER=s3`; nothing moves. A
  one-off S3→disk copy is a manual exercise if it ever happens.
- **No s3-mode bulk file sync in the CLI (yet).** `files pull` is implemented
  for `disk` (reusing the tested `cloudron exec` + tar logic). In `s3` mode it
  documents a manual escape hatch (`mc mirror`, or `aws --endpoint-url … s3
  sync`) rather than hand-rolling ListObjectsV2 paging or hard-depending on a
  client. Graduate it the first time an s3-backed app needs it.

## Consequences

### Positive

- Default deployment needs **no external storage account** — just Cloudron's
  backed-up volume. Simpler, cheaper, fewer moving parts for the common case.
- Local dev gets real on-disk files and **one fewer mock** to reason about.
- `db pull` can finally be completed by an `files pull` that lands real images
  where local dev reads them.
- 040's "no blobs in SQLite" win is retained; binary data still never enters the
  database.

### Negative

- Two code paths to maintain in the storage layer (mitigated by the tiny
  driver interface and openimg's native `fs`/`fetch` source union).
- `disk` ties uploads to a single instance's volume — fine on Cloudron
  (single-instance by design), but an app that needs horizontal scale or a CDN
  must opt into `s3`.
- The `s3` file-sync gap means s3-backed operators use a manual `mc`/`aws`
  command until the CLI grows that path.

## References

- [040 Switch to Tigris for Image Storage](040-tigris-image-storage.md) (amended)
- [048 Cloudron deploy + branch model](048-cloudron-deploy-branch-model.md)
- [041 Image Optimization](041-image-optimization.md) (openimg source union)
