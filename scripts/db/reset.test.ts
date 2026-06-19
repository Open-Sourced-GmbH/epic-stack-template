import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts/db')
const MOCK_BIN = path.join(PROJECT_ROOT, 'tests/fixtures/mock-bin-reset')

function exec(cmd: string, env: Record<string, string> = {}) {
	return execSync(cmd, {
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
`,
	)

	writeMockBin(
		'npx',
		`#!/usr/bin/env bash
echo "NPX_CALL: $*" >> "${MOCK_BIN}/calls.log"
`,
	)

	return {
		[Symbol.dispose]() {
			fs.rmSync(MOCK_BIN, { recursive: true, force: true })
		},
	}
}

describe('reset.sh', () => {
	test('staging reset invokes prisma migrate reset via cloudron exec', () => {
		using ignoredMockBin = setupMockBin()
		const logFile = path.join(MOCK_BIN, 'calls.log')

		const output = exec(`bash ${SCRIPTS_DIR}/reset.sh staging`, {
			CLOUDRON_APP_STAGING: 'my-staging-app',
		})

		expect(output).toContain('Reset staging database complete')

		const log = fs.readFileSync(logFile, 'utf-8')
		expect(log).toContain(
			'CLOUDRON_CALL: exec --app my-staging-app -- npx prisma migrate reset --force',
		)
	})

	test('fails with no arguments', () => {
		using ignoredMockBin = setupMockBin()
		expect(() => exec(`bash ${SCRIPTS_DIR}/reset.sh`)).toThrow()
	})

	test('fails with unknown environment', () => {
		using ignoredMockBin = setupMockBin()
		expect(() => exec(`bash ${SCRIPTS_DIR}/reset.sh invalid`)).toThrow()
	})
})
