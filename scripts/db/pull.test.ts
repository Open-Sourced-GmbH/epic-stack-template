import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts/db')

let mockBin: string
let backupsDir: string
let dbDir: string
let localDb: string
let localDbTmp: string

function exec(cmd: string, env: Record<string, string> = {}) {
	return execSync(cmd, {
		encoding: 'utf-8',
		env: {
			...process.env,
			PATH: `${mockBin}:${process.env.PATH}`,
			DB_OPS_CONFIRM: 'skip',
			BACKUPS_DIR: backupsDir,
			LOCAL_DB: localDb,
			LOCAL_DB_TMP: localDbTmp,
			// Don't let the developer's local .env (loaded by _common.sh)
			// inject --server / --token into cloudron calls - log assertions
			// would otherwise depend on personal config.
			CLOUDRON_SERVER: '',
			CLOUDRON_TOKEN: '',
			...env,
		},
		cwd: PROJECT_ROOT,
	})
}

function writeMockBin(name: string, script: string) {
	const dest = path.join(mockBin, name)
	fs.writeFileSync(dest, script, { mode: 0o755 })
}

function setupMocks() {
	mockBin = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-mock-bin-'))
	backupsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-backups-'))
	dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-db-'))
	localDb = path.join(dbDir, 'data.db')
	localDbTmp = path.join(dbDir, 'data-pull-tmp.db')

	// Mock sqlite3: handles .backup (creates file) and reads SQL from stdin
	writeMockBin(
		'sqlite3',
		`#!/usr/bin/env bash
echo "SQLITE3_CALL: $*" >> "${mockBin}/calls.log"
for arg in "$@"; do
  if [[ "$arg" == .backup* ]]; then
    dest=$(echo "$arg" | sed "s/^.backup '\\(.*\\)'/\\1/")
    touch "$dest"
  fi
done
# If stdin has data (SQL piped in), log it
if [[ ! -t 0 ]]; then
  sql=$(cat)
  echo "SQLITE3_SQL: $sql" >> "${mockBin}/calls.log"
fi
`,
	)

	// Mock cloudron: logs calls, produces fake DB content on cat, and
	// produces an empty tar archive when asked to tar /app/data/uploads.
	writeMockBin(
		'cloudron',
		`#!/usr/bin/env bash
echo "CLOUDRON_CALL: $*" >> "${mockBin}/calls.log"
if [[ "$*" == *"cat /tmp/db-pull.db"* ]]; then
  echo "mock-db-content"
fi
if [[ "$*" == *"tar"*"-cf -"* ]]; then
  tar -cf - -T /dev/null 2>/dev/null
fi
`,
	)

	// Seed a fake local database for the snapshot-before-overwrite test
	fs.writeFileSync(localDb, 'fake-sqlite-db')

	return {
		[Symbol.dispose]() {
			fs.rmSync(mockBin, { recursive: true, force: true })
			fs.rmSync(backupsDir, { recursive: true, force: true })
			fs.rmSync(dbDir, { recursive: true, force: true })
		},
	}
}

describe('pull.sh', () => {
	test('downloads remote DB via cloudron exec', () => {
		using ignoredMocks = setupMocks()
		const logFile = path.join(mockBin, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/pull.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')

		// Verify hot copy via sqlite3 .backup
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- sqlite3 /app/data/prisma/data.db .backup /tmp/db-pull.db',
		)

		// Verify file streamed out
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- cat /tmp/db-pull.db',
		)

		// Verify cleanup
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- rm -f /tmp/db-pull.db',
		)
	})

	test('runs sanitize.sql against downloaded database', () => {
		using ignoredMocks = setupMocks()
		const logFile = path.join(mockBin, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/pull.sh prod`, {
			CLOUDRON_APP_PROD: 'my-prod-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')

		// Verify sanitize.sql was piped to sqlite3
		expect(log).toContain('SQLITE3_SQL:')
		expect(log).toContain('DELETE FROM Password')
		expect(log).toContain('DELETE FROM Session')
		expect(log).toContain('UPDATE User')
	})

	test('snapshots local DB before overwriting', () => {
		using ignoredMocks = setupMocks()
		exec(`bash ${SCRIPTS_DIR}/pull.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		// A pre-pull snapshot should have been created
		const snapshots = fs
			.readdirSync(backupsDir)
			.filter((f) => f.includes('pre-pull'))
		expect(snapshots).toHaveLength(1)
		expect(snapshots[0]).toMatch(/^local-\d{4}-\d{2}-\d{2}-\d{6}-pre-pull\.db$/)
	})

	test('replaces local database file', () => {
		using ignoredMocks = setupMocks()
		exec(`bash ${SCRIPTS_DIR}/pull.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		// The local DB should now contain the mock content (from cloudron cat)
		const content = fs.readFileSync(localDb, 'utf-8')
		expect(content).toContain('mock-db-content')
	})

	test('rejects local as pull source', () => {
		using ignoredMocks = setupMocks()
		expect(() => exec(`bash ${SCRIPTS_DIR}/pull.sh local`)).toThrow()
	})

	test('fails with no arguments', () => {
		using ignoredMocks = setupMocks()
		expect(() => exec(`bash ${SCRIPTS_DIR}/pull.sh`)).toThrow()
	})

	test('fails with missing CLOUDRON_APP_STAGING', () => {
		using ignoredMocks = setupMocks()
		expect(() =>
			exec(`bash ${SCRIPTS_DIR}/pull.sh staging`, {
				CLOUDRON_APP_STAGING: '',
			}),
		).toThrow()
	})

	test('rejects unknown second argument', () => {
		using ignoredMocks = setupMocks()
		expect(() =>
			exec(`bash ${SCRIPTS_DIR}/pull.sh staging --bogus`, {
				CLOUDRON_APP_STAGING: 'my-staging-app',
			}),
		).toThrow()
	})

	test('does not pull files without --with-files', () => {
		using ignoredMocks = setupMocks()
		const logFile = path.join(mockBin, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/pull.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')
		expect(log).not.toContain('tar -C /app/data/uploads')
	})

	test('pulls files when --with-files is set', () => {
		using ignoredMocks = setupMocks()
		const localUploadsDir = fs.mkdtempSync(
			path.join(os.tmpdir(), 'pull-uploads-'),
		)
		const logFile = path.join(mockBin, 'calls.log')

		try {
			exec(`bash ${SCRIPTS_DIR}/pull.sh staging --with-files`, {
				CLOUDRON_APP_STAGING: 'my-staging-app',
				LOCAL_UPLOADS_DIR: localUploadsDir,
			})

			const log = fs.readFileSync(logFile, 'utf-8')
			expect(log).toContain(
				'CLOUDRON_CALL: exec --app my-staging-app -- bash -c mkdir -p /app/data/uploads && tar -C /app/data/uploads -cf - .',
			)
		} finally {
			fs.rmSync(localUploadsDir, { recursive: true, force: true })
		}
	})

	test('snapshots local uploads before pulling files', () => {
		using ignoredMocks = setupMocks()
		const localUploadsDir = fs.mkdtempSync(
			path.join(os.tmpdir(), 'pull-uploads-'),
		)
		fs.writeFileSync(path.join(localUploadsDir, 'existing.txt'), 'old data')

		try {
			exec(`bash ${SCRIPTS_DIR}/pull.sh staging --with-files`, {
				CLOUDRON_APP_STAGING: 'my-staging-app',
				LOCAL_UPLOADS_DIR: localUploadsDir,
			})

			const snapshots = fs
				.readdirSync(backupsDir)
				.filter((f) => f.startsWith('local-uploads-'))
			expect(snapshots).toHaveLength(1)
			expect(snapshots[0]).toMatch(
				/^local-uploads-\d{4}-\d{2}-\d{2}-\d{6}-pre-pull\.tar\.gz$/,
			)
		} finally {
			fs.rmSync(localUploadsDir, { recursive: true, force: true })
		}
	})

	test('skips uploads snapshot when local dir is empty', () => {
		using ignoredMocks = setupMocks()
		const localUploadsDir = fs.mkdtempSync(
			path.join(os.tmpdir(), 'pull-uploads-'),
		)

		try {
			exec(`bash ${SCRIPTS_DIR}/pull.sh staging --with-files`, {
				CLOUDRON_APP_STAGING: 'my-staging-app',
				LOCAL_UPLOADS_DIR: localUploadsDir,
			})

			const snapshots = fs
				.readdirSync(backupsDir)
				.filter((f) => f.startsWith('local-uploads-'))
			expect(snapshots).toHaveLength(0)
		} finally {
			fs.rmSync(localUploadsDir, { recursive: true, force: true })
		}
	})
})
