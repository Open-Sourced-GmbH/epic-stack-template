---
name: epic-database
description: Guide on Prisma, SQLite, and database patterns for Epic Stack on Cloudron
categories:
  - database
  - prisma
  - sqlite
  - cloudron
---

# Epic Stack: Database

## When to use this skill

Use this skill when you need to:

- Design database schema with Prisma
- Create migrations
- Work with SQLite
- Optimize queries and performance
- Create seed scripts
- Manage backups and restores

> **For operational tasks** (pull, push, snapshot, reset, migration checks), see `docs/claude/database-operations.md` instead.
> **For full operations documentation**, see `docs/claude/database-operations.md`.

## Architecture

This project runs on **Cloudron** as a **single instance** — no multi-region, no LiteFS, no replicas.

| Environment | Database path | Access |
|-------------|---------------|--------|
| **local** | `prisma/data.db` | Direct filesystem |
| **staging** | `/app/data/prisma/data.db` | `cloudron exec` |
| **production** | `/app/data/prisma/data.db` | `cloudron exec` |

Production database changes go through **CI/CD migrations only** — never push data to production directly.

## Patterns and conventions

### Database Philosophy

Following Epic Web principles:

**Do as little as possible** - Only fetch the data you actually need. Use
`select` to fetch specific fields instead of entire models. Avoid over-fetching
data "just in case" - fetch what you need, when you need it.

**Pragmatism over purity** - Optimize queries when there's a measurable benefit,
but don't over-optimize prematurely. Simple, readable queries are often better
than complex optimized ones. Add indexes when queries are slow, not before.

**Example - Fetch only what you need:**

```typescript
// ✅ Good - Fetch only needed fields
const user = await prisma.user.findUnique({
	where: { id: userId },
	select: {
		id: true,
		username: true,
		name: true,
	},
})

// ❌ Avoid - Fetching everything
const user = await prisma.user.findUnique({
	where: { id: userId },
	// Fetches all fields including password hash, email, etc.
})
```

### Prisma Schema

Epic Stack uses Prisma with SQLite as the database.

**Basic configuration:**

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["typedSql"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Basic model:**

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  name      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  notes     Note[]
  roles     Role[]
}

model Note {
  id      String @id @default(cuid())
  title   String
  content String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner   User   @relation(fields: [ownerId], references: [id])
  ownerId String

  @@index([ownerId])
  @@index([ownerId, updatedAt])
}
```

### CUID2 for IDs

Epic Stack uses CUID2 to generate unique IDs.

**Advantages:**

- Globally unique
- Sortable
- Secure (no exposed information)
- URL-friendly

```prisma
model User {
  id String @id @default(cuid()) // Automatically generates CUID2
}
```

### Timestamps

```prisma
model User {
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt // Automatically updated
}
```

### Relationships

**One-to-Many:**

```prisma
model User {
  id    String @id @default(cuid())
  notes Note[]
}

model Note {
  id      String @id @default(cuid())
  owner   User   @relation(fields: [ownerId], references: [id])
  ownerId String

  @@index([ownerId])
}
```

**One-to-One:**

```prisma
model User {
  id      String  @id @default(cuid())
  image   UserImage?
}

model UserImage {
  id        String @id @default(cuid())
  user      User   @relation(fields: [userId], references: [id])
  userId    String @unique
}
```

**Many-to-Many:**

```prisma
model User {
  id    String @id @default(cuid())
  roles Role[]
}

model Role {
  id    String @id @default(cuid())
  users User[]
}
```

### Indexes

```prisma
model Note {
  id      String @id @default(cuid())
  ownerId String
  updatedAt DateTime

  @@index([ownerId])              // Simple index
  @@index([ownerId, updatedAt])   // Composite index
}
```

**Best practices:**

- Index foreign keys
- Index fields used in `where` frequently
- Index fields used in `orderBy`
- Use composite indexes for complex queries

### Cascade Delete

```prisma
model Note {
  id      String @id @default(cuid())
  owner   User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId String
}
```

**Options:**

- `onDelete: Cascade` - Deletes children when parent is deleted
- `onDelete: SetNull` - Sets to null when parent is deleted
- `onDelete: Restrict` - Prevents deletion if there are children

### Migrations

**Create migration:**

```bash
npx prisma migrate dev --name add_user_field
```

**Apply migrations in production:**

```bash
npx prisma migrate deploy
```

Migrations are automatically applied on deploy via the app's start script.

**Widen-then-narrow strategy for zero-downtime:**

1. **Widen app** - App accepts A or B
2. **Widen DB** - DB provides A and B, app writes to both
3. **Narrow app** - App only uses B
4. **Narrow DB** - DB only provides B

**Example: Rename field `name` to `firstName` and `lastName`:**

```prisma
// Step 1: Widen app (accepts both)
model User {
  id        String @id @default(cuid())
  name      String?  // Deprecated
  firstName String?  // New
  lastName  String?  // New
}

// Step 2: Widen db (migration copies data)
// In SQL migration:
ALTER TABLE User ADD COLUMN firstName TEXT;
ALTER TABLE User ADD COLUMN lastName TEXT;
UPDATE User SET firstName = name;

// Step 3: Narrow app (only uses new fields)
// Code only uses firstName and lastName

// Step 4: Narrow db (removes old field)
ALTER TABLE User DROP COLUMN name;
```

### CI migration check

Both deploy workflows run `scripts/db/migration-check.sh` before deploying. It detects `DROP TABLE` and `ALTER TABLE ... DROP COLUMN` in pending migrations:

- Exit 0 → safe, deploy proceeds
- Exit 2 → destructive detected, CI emits a warning but deploys
- Exit 1 → error, deploy blocked

See `docs/claude/database-operations.md` for details.

### Prisma Client

**Import Prisma Client:**

```typescript
import { prisma } from '#app/utils/db.server.ts'
```

**Basic query:**

```typescript
const user = await prisma.user.findUnique({
	where: { id: userId },
})
```

**Specific select:**

```typescript
const user = await prisma.user.findUnique({
	where: { id: userId },
	select: {
		id: true,
		email: true,
		username: true,
	},
})
```

**Include relations:**

```typescript
const user = await prisma.user.findUnique({
	where: { id: userId },
	include: {
		notes: {
			select: {
				id: true,
				title: true,
			},
			orderBy: { updatedAt: 'desc' },
		},
		roles: true,
	},
})
```

**Complex queries:**

```typescript
const notes = await prisma.note.findMany({
	where: {
		ownerId: userId,
		title: { contains: searchTerm },
	},
	select: {
		id: true,
		title: true,
		updatedAt: true,
	},
	orderBy: { updatedAt: 'desc' },
	take: 20,
	skip: (page - 1) * 20,
})
```

### Transactions

```typescript
await prisma.$transaction(async (tx) => {
	const user = await tx.user.create({
		data: {
			email,
			username,
			roles: { connect: { name: 'user' } },
		},
	})

	await tx.note.create({
		data: {
			title: 'Welcome',
			content: 'Welcome to the app!',
			ownerId: user.id,
		},
	})

	return user
})
```

### Connecting to DB in production

Use the Cloudron CLI to access the database on staging or production:

```bash
# Open a shell in the Cloudron app
cloudron exec --app <APP_ID>

# Run sqlite3 inside the container
sqlite3 /app/data/prisma/data.db

# See docs/claude/database-operations.md and scripts/db/ for snapshot/pull/push operations
```

### Seed Scripts

```typescript
// prisma/seed.ts
import { prisma } from '#app/utils/db.server.ts'

async function seed() {
	await prisma.role.createMany({
		data: [
			{ name: 'user', description: 'Standard user' },
			{ name: 'admin', description: 'Administrator' },
		],
	})

	const user = await prisma.user.create({
		data: {
			email: 'user@example.com',
			username: 'testuser',
			roles: { connect: { name: 'user' } },
		},
	})

	console.log('Seed complete!')
}

seed()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
```

**Run seed:**

```bash
npx prisma db seed
# Or directly:
npx tsx prisma/seed.ts
```

### Query Optimization

**Guidelines (pragmatic approach):**

- Use `select` to fetch only needed fields
- Use selective `include` — only include relations you actually use
- Index fields used in `where` and `orderBy` — but only if queries are slow
- Use composite indexes for complex queries — when you have a real performance problem
- Measure first, optimize second

### Prisma Query Logging

```typescript
// app/utils/db.server.ts
const client = new PrismaClient({
	log: [
		{ level: 'query', emit: 'event' },
		{ level: 'error', emit: 'stdout' },
		{ level: 'warn', emit: 'stdout' },
	],
})

client.$on('query', async (e) => {
	if (e.duration < 20) return // Only log slow queries

	console.info(`prisma:query - ${e.duration}ms - ${e.query}`)
})
```

### Database URL

**Development:**

```bash
DATABASE_URL=file:./data.db?connection_limit=1
```

**Production (Cloudron):**

```bash
DATABASE_URL=file:/app/data/prisma/data.db?connection_limit=1
```

## Common mistakes to avoid

- **Fetching unnecessary data** — use `select` to fetch only what you need
- **Over-optimizing prematurely** — measure first, then optimize
- **Not using indexes when needed** — index foreign keys and frequently queried fields
- **N+1 queries** — use `include` to fetch relations in a single query
- **Not using transactions for related operations** — always use transactions when multiple operations must be atomic
- **Breaking migrations without strategy** — use widen-then-narrow for zero-downtime
- **Not validating data before inserting** — always validate with Zod before create/update
- **Forgetting `onDelete` in relations** — explicitly decide what to do when parent is deleted
- **Not using CUID2** — Epic Stack uses CUID2 by default
- **Pushing data to production** — production changes go through migrations only; use the staging push script in scripts/db/ for staging
- **Copying production DB without sanitization** — always use the pull script in scripts/db/ which auto-sanitizes PII

## References

- [Database Operations](../../../docs/claude/database-operations.md) — scripts, hard rules, Cloudron backup/restore
- [Epic Web Principles](https://www.epicweb.dev/principles)
- [Prisma Documentation](https://www.prisma.io/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- `prisma/schema.prisma` — complete schema
- `prisma/seed.ts` — seed example
- `app/utils/db.server.ts` — Prisma Client setup
- `scripts/db/` — database operation scripts
