#!/usr/bin/env node
/**
 * Acceptance gate — the unattended, sandbox-safe slice of `/to-acceptance`.
 * Usage: node .claude/skills/to-acceptance/scripts/acceptance-gate.mjs [--json]
 *
 * Runs the cross-cutting suite that needs zero human-in-the-loop and emits one
 * result per case. Mirrors scripts/smoke-test.ts's JSON-output style. E2E and
 * the styleguide snapshot are NOT here — they need a running dev server (and
 * Playwright's chromium binary) and are driven from the skill itself.
 *
 * Exit code: non-zero if any REQUIRED case fails. `skipped` never fails the gate.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const jsonOnly = process.argv.includes('--json')

/** Run a shell command, return {code, ms}. Inherits stdio unless --json. */
function run(cmd) {
	const start = Date.now()
	const res = spawnSync(cmd, {
		shell: true,
		stdio: jsonOnly ? 'ignore' : 'inherit',
		env: process.env,
	})
	return { code: res.status ?? 1, ms: Date.now() - start }
}

/** Best-effort check that Playwright's chromium is installed (read-only). */
function chromiumInstalled() {
	const base =
		process.env.PLAYWRIGHT_BROWSERS_PATH ||
		join(homedir(), '.cache', 'ms-playwright')
	if (!existsSync(base)) return false
	try {
		return readdirSync(base).some((d) => d.startsWith('chromium'))
	} catch {
		return false
	}
}

// Required cases run in order; `build` must precede the CSS freshness check.
const cases = [
	{ caseId: 'X-typecheck', cmd: 'pnpm typecheck' },
	{ caseId: 'X-lint', cmd: 'pnpm lint' },
	{ caseId: 'X-unit', cmd: 'pnpm test -- --run' },
	{ caseId: 'X-build', cmd: 'pnpm build' },
	{ caseId: 'D-css-fresh', cmd: 'pnpm design-sync:css' },
]

const results = []
for (const c of cases) {
	if (!jsonOnly) process.stderr.write(`\n▶ ${c.caseId}: ${c.cmd}\n`)
	const { code, ms } = run(c.cmd)
	results.push({
		caseId: c.caseId,
		status: code === 0 ? 'pass' : 'fail',
		detail: `${c.cmd} → exit ${code} (${(ms / 1000).toFixed(1)}s)`,
	})
}

// E2E is handed to the human only when the browser binary is missing.
results.push(
	chromiumInstalled()
		? {
				caseId: 'X-e2e',
				status: 'skipped',
				detail: 'chromium present — run e2e from the skill against the dev server',
			}
		: {
				caseId: 'X-e2e',
				status: 'skipped',
				detail: 'chromium missing — ask the human: ! pnpm test:e2e:install',
			},
)

const failed = results.filter((r) => r.status === 'fail')
const output = {
	timestamp: new Date().toISOString(),
	passed: results.filter((r) => r.status === 'pass').length,
	failed: failed.length,
	skipped: results.filter((r) => r.status === 'skipped').length,
	total: results.length,
	results,
}

process.stdout.write(JSON.stringify(output, null, 2) + '\n')
if (failed.length > 0) {
	process.stderr.write(
		`\n${failed.length}/${results.length} required gate case(s) failed: ${failed
			.map((r) => r.caseId)
			.join(', ')}\n`,
	)
	process.exit(1)
}
process.stderr.write(`\nGate green (${output.passed} passed, ${output.skipped} skipped)\n`)
