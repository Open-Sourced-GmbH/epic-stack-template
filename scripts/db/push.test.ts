import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts/db')
const MOCK_BIN = path.join(PROJECT_ROOT, 'tests/fixtures/mock-bin-push')

function exec(cmd: string, env: Record<string, string> = {}) {
	return execSync(cmd, {
		encoding: 'utf-8',
		env: {
			...process.env,
			PATH: `${MOCK_BIN}:${process.env.PATH}`,
			DB_OPS_CONFIRM: 'skip',
			// Force a clean cloudron CLI invocation so assertions don't
			// depend on the developer's local .env (which may define a
			// CLOUDRON_SERVER / CLOUDRON_TOKEN that _common.sh would inject).
			CLOUDRON_SERVER: '',
			CLOUDRON_TOKEN: '',
			...env,
		},
		cwd: PROJECT_ROOT,
	})
}

function writeMockBin(name: string, script: string) {
	const dest = path.join(MOCK_BIN, name)
	fs.writeFileSync(dest, script, { mode: 0o755 })
}

function setupMockBin() {
	fs.mkdirSync(MOCK_BIN, { recursive: true })

	writeMockBin(
		'cloudron',
		`#!/usr/bin/env bash
echo "CLOUDRON_CALL: $*" >> "${MOCK_BIN}/calls.log"
# Drain stdin so producers (cat/tar) don't get SIGPIPE
if [[ ! -t 0 ]]; then
  cat > /dev/null
fi
`,
	)

	// Mock sqlite3 so the pre-push WAL checkpoint doesn't try to
	// parse the fake DB fixture below.
	writeMockBin(
		'sqlite3',
		`#!/usr/bin/env bash
echo "SQLITE3_CALL: $*" >> "${MOCK_BIN}/calls.log"
`,
	)

	// Create a fake local database
	fs.mkdirSync(path.join(PROJECT_ROOT, 'prisma'), { recursive: true })
	const fakeDb = path.join(PROJECT_ROOT, 'prisma/data.db')
	if (!fs.existsSync(fakeDb)) {
		fs.writeFileSync(fakeDb, 'fake-sqlite-db')
	}

	return {
		[Symbol.dispose]() {
			fs.rmSync(MOCK_BIN, { recursive: true, force: true })
		},
	}
}

describe('push.sh', () => {
	test('blocks prod target with non-zero exit', () => {
		using ignoredMockBin = setupMockBin()
		expect(() => exec(`bash ${SCRIPTS_DIR}/push.sh prod`)).toThrow()
	})

	test('blocks production target with non-zero exit', () => {
		using ignoredMockBin = setupMockBin()
		expect(() => exec(`bash ${SCRIPTS_DIR}/push.sh production`)).toThrow()
	})

	test('allows staging target and reports a successful push', () => {
		using ignoredMockBin = setupMockBin()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		const output = exec(`bash ${SCRIPTS_DIR}/push.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		expect(output).toContain('Pushed local database to staging')

		const log = fs.readFileSync(logFile, 'utf-8')
		expect(log).toContain('--app my-staging-app')
	})

	test('checkpoints local WAL into the main file before pushing', () => {
		using ignoredMockBin = setupMockBin()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/push.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')
		const checkpointIdx = log.indexOf(
			'SQLITE3_CALL: ' +
				path.join(PROJECT_ROOT, 'prisma/data.db') +
				' PRAGMA wal_checkpoint(TRUNCATE);',
		)
		const pushIdx = log.indexOf('CLOUDRON_CALL: push --app my-staging-app')

		expect(checkpointIdx).toBeGreaterThanOrEqual(0)
		expect(pushIdx).toBeGreaterThan(checkpointIdx)
	})

	test('uses cloudron push (not raw cat overwrite) for the DB file', () => {
		using ignoredMockBin = setupMockBin()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/push.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')
		expect(log).toContain('CLOUDRON_CALL: push --app my-staging-app')
		expect(log).toContain('/app/data/prisma/data.db')
		// Guard against regressing to a live-overwrite of the running DB.
		expect(log).not.toContain('cat > /app/data/prisma/data.db')
	})

	test('push → wal cleanup → restart (WAL-safe sequence)', () => {
		using ignoredMockBin = setupMockBin()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/push.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')
		const pushIdx = log.indexOf('CLOUDRON_CALL: push --app my-staging-app')
		const rmIdx = log.indexOf(
			'rm -f /app/data/prisma/data.db-wal /app/data/prisma/data.db-shm',
		)
		const restartIdx = log.indexOf(
			'CLOUDRON_CALL: restart --app my-staging-app',
		)

		expect(pushIdx).toBeGreaterThanOrEqual(0)
		expect(rmIdx).toBeGreaterThan(pushIdx)
		expect(restartIdx).toBeGreaterThan(rmIdx)
	})

	test('fails with no arguments', () => {
		using ignoredMockBin = setupMockBin()
		expect(() => exec(`bash ${SCRIPTS_DIR}/push.sh`)).toThrow()
	})

	test('fails with missing CLOUDRON_APP_STAGING', () => {
		using ignoredMockBin = setupMockBin()
		expect(() =>
			exec(`bash ${SCRIPTS_DIR}/push.sh staging`, {
				CLOUDRON_APP_STAGING: '',
			}),
		).toThrow()
	})

	test('rejects unknown second argument', () => {
		using ignoredMockBin = setupMockBin()
		expect(() =>
			exec(`bash ${SCRIPTS_DIR}/push.sh staging --bogus`, {
				CLOUDRON_APP_STAGING: 'my-staging-app',
			}),
		).toThrow()
	})

	test('does not push files without --with-files', () => {
		using ignoredMockBin = setupMockBin()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/push.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')
		expect(log).not.toContain('tar -C /app/data/uploads -xf')
	})

	test('pushes files when --with-files is set', () => {
		using ignoredMockBin = setupMockBin()
		const localUploadsDir = fs.mkdtempSync(
			path.join(os.tmpdir(), 'push-uploads-'),
		)
		fs.writeFileSync(path.join(localUploadsDir, 'foo.txt'), 'data')

		try {
			const output = exec(`bash ${SCRIPTS_DIR}/push.sh staging --with-files`, {
				CLOUDRON_APP_STAGING: 'my-staging-app',
				LOCAL_UPLOADS_DIR: localUploadsDir,
			})

			expect(output).toContain('Pushed local files to staging')

			const log = fs.readFileSync(path.join(MOCK_BIN, 'calls.log'), 'utf-8')
			expect(log).toContain(
				'CLOUDRON_CALL: exec --app my-staging-app -- bash -c mkdir -p /app/data/uploads && tar -C /app/data/uploads -xf -',
			)
		} finally {
			fs.rmSync(localUploadsDir, { recursive: true, force: true })
		}
	})

	test('warns and skips when local uploads dir is missing', () => {
		using ignoredMockBin = setupMockBin()
		const missingDir = path.join(
			os.tmpdir(),
			`push-missing-${Date.now()}-${Math.random()}`,
		)

		const output = exec(`bash ${SCRIPTS_DIR}/push.sh staging --with-files`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
			LOCAL_UPLOADS_DIR: missingDir,
		})

		expect(output).not.toContain('Pushed local files')

		const log = fs.readFileSync(path.join(MOCK_BIN, 'calls.log'), 'utf-8')
		expect(log).not.toContain('tar -C /app/data/uploads -xf')
	})
})
