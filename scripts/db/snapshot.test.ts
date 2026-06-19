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

function exec(cmd: string, env: Record<string, string> = {}) {
	return execSync(cmd, {
		encoding: 'utf-8',
		env: {
			...process.env,
			PATH: `${mockBin}:${process.env.PATH}`,
			DB_OPS_CONFIRM: 'skip',
			BACKUPS_DIR: backupsDir,
			LOCAL_DB: localDb,
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
	mockBin = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-mock-bin-'))
	backupsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-backups-'))
	dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-db-'))
	localDb = path.join(dbDir, 'data.db')

	// Mock sqlite3: parses .backup arg and touches the destination file
	writeMockBin(
		'sqlite3',
		`#!/usr/bin/env bash
echo "SQLITE3_CALL: $*" >> "${mockBin}/calls.log"
for arg in "$@"; do
  if [[ "$arg" == .backup* ]]; then
    dest=\$(echo "$arg" | sed "s/^.backup '\\(.*\\)'/\\1/")
    touch "$dest"
  fi
done
`,
	)

	// Mock cloudron: logs calls and handles exec + cat for remote snapshot flow
	writeMockBin(
		'cloudron',
		`#!/usr/bin/env bash
echo "CLOUDRON_CALL: $*" >> "${mockBin}/calls.log"
# For 'exec ... cat ...' produce some bytes so the redirect creates a file
if [[ "$*" == *"cat /tmp/db-snapshot.db"* ]]; then
  echo "mock-db-content"
fi
`,
	)

	// Seed a fake local database for the local snapshot test
	fs.writeFileSync(localDb, 'fake-sqlite-db')

	return {
		[Symbol.dispose]() {
			fs.rmSync(mockBin, { recursive: true, force: true })
			fs.rmSync(backupsDir, { recursive: true, force: true })
			fs.rmSync(dbDir, { recursive: true, force: true })
		},
	}
}

describe('snapshot.sh', () => {
	test('local snapshot creates file with correct naming pattern', () => {
		using ignoredMocks = setupMocks()
		const output = exec(`bash ${SCRIPTS_DIR}/snapshot.sh local`)

		const match = output.match(/Snapshot saved: (.+)/)
		expect(match).toBeTruthy()

		const filePath = match![1]!.trim()
		expect(fs.existsSync(filePath)).toBe(true)

		const filename = path.basename(filePath)
		expect(filename).toMatch(/^local-\d{4}-\d{2}-\d{2}-\d{6}\.db$/)
	})

	test('local snapshot with name includes label in filename', () => {
		using ignoredMocks = setupMocks()
		const output = exec(`bash ${SCRIPTS_DIR}/snapshot.sh local pre-migration`)

		const match = output.match(/Snapshot saved: (.+)/)
		const filename = path.basename(match![1]!.trim())
		expect(filename).toMatch(
			/^local-\d{4}-\d{2}-\d{2}-\d{6}-pre-migration\.db$/,
		)
	})

	test('remote snapshot constructs correct cloudron exec commands', () => {
		using ignoredMocks = setupMocks()
		const logFile = path.join(mockBin, 'calls.log')

		exec(`bash ${SCRIPTS_DIR}/snapshot.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		const log = fs.readFileSync(logFile, 'utf-8')

		// Verify sqlite3 .backup was called via cloudron exec
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- sqlite3 /app/data/prisma/data.db .backup /tmp/db-snapshot.db',
		)

		// Verify the file was streamed out via cloudron exec cat
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- cat /tmp/db-snapshot.db',
		)

		// Verify cleanup
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- rm -f /tmp/db-snapshot.db',
		)
	})

	test('remote snapshot creates output file', () => {
		using ignoredMocks = setupMocks()
		const output = exec(`bash ${SCRIPTS_DIR}/snapshot.sh prod backup`, {
			CLOUDRON_APP_PROD: 'my-prod-app',
		})

		const match = output.match(/Snapshot saved: (.+)/)
		expect(match).toBeTruthy()

		const filePath = match![1]!.trim()
		expect(fs.existsSync(filePath)).toBe(true)

		const filename = path.basename(filePath)
		expect(filename).toMatch(/^prod-\d{4}-\d{2}-\d{2}-\d{6}-backup\.db$/)
	})

	test('fails with unknown environment', () => {
		using ignoredMocks = setupMocks()
		expect(() => exec(`bash ${SCRIPTS_DIR}/snapshot.sh invalid`)).toThrow()
	})

	test('fails with missing CLOUDRON_APP_STAGING', () => {
		using ignoredMocks = setupMocks()
		expect(() =>
			exec(`bash ${SCRIPTS_DIR}/snapshot.sh staging`, {
				CLOUDRON_APP_STAGING: '',
			}),
		).toThrow()
	})

	test('fails with no arguments', () => {
		using ignoredMocks = setupMocks()
		expect(() => exec(`bash ${SCRIPTS_DIR}/snapshot.sh`)).toThrow()
	})
})
