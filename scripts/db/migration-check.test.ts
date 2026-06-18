import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts/db')
const MOCK_BIN = path.join(PROJECT_ROOT, 'tests/fixtures/mock-bin-mc')
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'prisma/migrations')

/** Track test migration dirs so disposable cleanup can remove them. */
const testMigrations: string[] = []

function run(cmd: string, env: Record<string, string> = {}) {
	const result = spawnSync('bash', ['-c', cmd], {
		encoding: 'utf-8',
		env: {
			...process.env,
			PATH: `${MOCK_BIN}:${process.env.PATH}`,
			DB_OPS_CONFIRM: 'skip',
			// Don't let the developer's local .env (loaded by _common.sh)
			// inject --server / --token into cloudron calls - log assertions
			// would otherwise depend on personal config.
			CLOUDRON_SERVER: '',
			CLOUDRON_TOKEN: '',
			...env,
		},
		cwd: PROJECT_ROOT,
	})
	return {
		stdout: result.stdout,
		stderr: result.stderr,
		exitCode: result.status ?? 1,
	}
}

function writeMockBin(name: string, script: string) {
	const dest = path.join(MOCK_BIN, name)
	fs.writeFileSync(dest, script, { mode: 0o755 })
}

/** Get names of all real (non-test) migration directories. */
function getRealMigrations(): string[] {
	return fs
		.readdirSync(MIGRATIONS_DIR)
		.filter(
			(d) =>
				!d.startsWith('99') &&
				fs.existsSync(path.join(MIGRATIONS_DIR, d, 'migration.sql')),
		)
}

/** Create a test migration directory with the given SQL content. */
function createTestMigration(name: string, sql: string) {
	const dir = path.join(MIGRATIONS_DIR, name)
	fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(path.join(dir, 'migration.sql'), sql)
	testMigrations.push(name)
}

/** Write the list of "applied" migrations that the mock cloudron returns. */
function setAppliedMigrations(names: string[]) {
	fs.writeFileSync(
		path.join(MOCK_BIN, 'applied_migrations.txt'),
		names.join('\n') + '\n',
	)
}

function setupMocks() {
	fs.mkdirSync(MOCK_BIN, { recursive: true })

	// Mock sqlite3: accepts any args, ignores stdin, exits 0
	writeMockBin(
		'sqlite3',
		`#!/usr/bin/env bash
echo "SQLITE3_CALL: $*" >> "${MOCK_BIN}/calls.log"
`,
	)

	// Mock cloudron: returns schema or applied migrations depending on args
	writeMockBin(
		'cloudron',
		`#!/usr/bin/env bash
echo "CLOUDRON_CALL: $*" >> "${MOCK_BIN}/calls.log"
if [[ "$*" == *".schema"* ]]; then
  echo "CREATE TABLE test (id TEXT PRIMARY KEY);"
elif [[ "$*" == *"_prisma_migrations"* ]]; then
  cat "${MOCK_BIN}/applied_migrations.txt" 2>/dev/null || true
fi
`,
	)

	// Mark all real migrations as applied by default
	setAppliedMigrations(getRealMigrations())

	return {
		[Symbol.dispose]() {
			fs.rmSync(MOCK_BIN, { recursive: true, force: true })

			for (const name of testMigrations) {
				fs.rmSync(path.join(MIGRATIONS_DIR, name), {
					recursive: true,
					force: true,
				})
			}
			testMigrations.length = 0
		},
	}
}

describe('migration-check.sh', () => {
	// The classification rules ("what counts as destructive") are unit-tested in
	// classify-destructive.test.ts. These tests cover the orchestration around
	// it: remote pull, pending detection, env validation, and that a destructive
	// migration is wired through to exit 2 with the finding attributed.
	test('detects DROP TABLE as destructive (exit 2)', () => {
		using ignoredMocks = setupMocks()
		createTestMigration(
			'99990101000001_test_drop_table',
			'DROP TABLE "users";\n',
		)

		const { stdout, exitCode } = run(
			`bash ${SCRIPTS_DIR}/migration-check.sh staging`,
			{ CLOUDRON_APP_STAGING: 'my-staging-app' },
		)

		expect(exitCode).toBe(2)
		expect(stdout).toContain('Destructive operations detected')
		expect(stdout).toContain('DROP TABLE "users"')
	})

	test('reports no pending migrations when all are applied', () => {
		using ignoredMocks = setupMocks()
		// All real migrations are already marked as applied in setupMocks
		const { stdout, exitCode } = run(
			`bash ${SCRIPTS_DIR}/migration-check.sh staging`,
			{ CLOUDRON_APP_STAGING: 'my-staging-app' },
		)

		expect(exitCode).toBe(0)
		expect(stdout).toContain('No pending migrations')
	})

	test('pulls schema via cloudron exec', () => {
		using ignoredMocks = setupMocks()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		run(`bash ${SCRIPTS_DIR}/migration-check.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- sqlite3 /app/data/prisma/data.db .schema',
		)
	})

	test('queries applied migrations from remote', () => {
		using ignoredMocks = setupMocks()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		run(`bash ${SCRIPTS_DIR}/migration-check.sh prod`, {
			CLOUDRON_APP_PROD: 'my-prod-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')
		expect(log).toContain('CLOUDRON_CALL: exec --app my-prod-app -- sqlite3')
		expect(log).toContain('_prisma_migrations')
	})

	test('rejects local environment', () => {
		using ignoredMocks = setupMocks()
		const { stderr, exitCode } = run(
			`bash ${SCRIPTS_DIR}/migration-check.sh local`,
		)

		expect(exitCode).toBe(1)
		expect(stderr).toContain('remote environments only')
	})

	test('fails with unknown environment', () => {
		using ignoredMocks = setupMocks()
		const { exitCode } = run(`bash ${SCRIPTS_DIR}/migration-check.sh invalid`)

		expect(exitCode).toBe(1)
	})

	test('fails with no arguments', () => {
		using ignoredMocks = setupMocks()
		const { exitCode } = run(`bash ${SCRIPTS_DIR}/migration-check.sh`)

		expect(exitCode).toBe(1)
	})

	test('fails with missing CLOUDRON_APP_STAGING', () => {
		using ignoredMocks = setupMocks()
		const { exitCode } = run(`bash ${SCRIPTS_DIR}/migration-check.sh staging`, {
			CLOUDRON_APP_STAGING: '',
		})

		expect(exitCode).toBe(1)
	})
})
