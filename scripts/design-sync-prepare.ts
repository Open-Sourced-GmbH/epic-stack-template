/**
 * One command to produce everything `/design-sync` consumes, so publishing the
 * design system to Claude Design is two steps in one terminal:
 *
 *   pnpm design-sync:prepare   # this script
 *   /design-sync               # the interactive Claude Code skill
 *
 * It runs the deterministic middle of the pipeline:
 *
 *   1. `react-router build`   → build/client/assets/tailwind-<hash>.css
 *   2. `design-sync:css`      → copy that into .design-sync/styles.compiled.css
 *   3. dev server + snapshot  → styleguide/ bundle (+ manifest.json) for review
 *
 * The two ends stay manual on purpose: reviewing styleguide/index.html is a
 * human judgement call, and `/design-sync` is an interactive skill (OAuth +
 * incremental diff), not a CLI.
 *
 * The /styleguide route is dev-only, so step 3 needs a dev server. If one is
 * already running on STYLEGUIDE_URL this script reuses it; otherwise it boots
 * one, waits for the route, snapshots, and tears it back down.
 *
 * Env:
 *   STYLEGUIDE_URL   base URL to snapshot (default http://localhost:3000)
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'

const BASE_URL = (
	process.env.STYLEGUIDE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')
const ROUTE = `${BASE_URL}/styleguide`
const BOOT_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 500

/** Run a pnpm script synchronously, inheriting stdio; throw on non-zero exit. */
function run(script: string) {
	const r = spawnSync('pnpm', [script], { stdio: 'inherit' })
	if (r.status !== 0) {
		throw new Error(`\`pnpm ${script}\` exited with code ${r.status ?? 'null'}`)
	}
}

async function reachable(): Promise<boolean> {
	try {
		const res = await fetch(ROUTE, { redirect: 'manual' })
		// dev route returns 200; anything that responds means the server is up.
		return res.status > 0
	} catch {
		return false
	}
}

async function waitForServer(): Promise<void> {
	const deadline = Date.now() + BOOT_TIMEOUT_MS
	while (Date.now() < deadline) {
		if (await reachable()) return
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
	}
	throw new Error(
		`Dev server did not become reachable at ${ROUTE} within ` +
			`${BOOT_TIMEOUT_MS / 1000}s.`,
	)
}

async function main() {
	// 1 + 2: prod build → compiled Tailwind CSS for the bundler.
	console.error('▸ Building (react-router build) …')
	run('build')
	console.error('▸ Refreshing compiled CSS (.design-sync/styles.compiled.css) …')
	run('design-sync:css')

	// 3: snapshot the dev-only /styleguide route.
	let server: ChildProcess | null = null
	if (await reachable()) {
		console.error(`▸ Reusing dev server already at ${BASE_URL}`)
	} else {
		console.error('▸ Booting dev server for the snapshot …')
		server = spawn('node', ['index.ts'], {
			env: { ...process.env, NODE_ENV: 'development', MOCKS: 'true' },
			// Surface server logs on stderr; keep stdout clean for tooling.
			stdio: ['ignore', 'inherit', 'inherit'],
		})
		server.on('exit', (code) => {
			if (code && code !== 0 && server) {
				console.error(`Dev server exited early with code ${code}`)
			}
		})
		try {
			await waitForServer()
		} catch (err) {
			server.kill('SIGTERM')
			throw err
		}
	}

	try {
		console.error('▸ Snapshotting /styleguide …')
		run('styleguide:snapshot')
	} finally {
		if (server) {
			console.error('▸ Stopping dev server …')
			server.kill('SIGTERM')
		}
	}

	console.error(
		'\n✓ Prepared. Review styleguide/index.html, then run /design-sync to publish.',
	)
}

main().catch((err: unknown) => {
	console.error(`\n${err instanceof Error ? err.message : String(err)}`)
	process.exit(1)
})
