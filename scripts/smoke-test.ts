/**
 * Post-deploy smoke test runner.
 * Usage: npx tsx scripts/smoke-test.ts [--base-url https://staging.app.example.com]
 *
 * Outputs JSON to stdout with pass/fail results for each test.
 * Add routes specific to your app to the `tests` array below.
 */

const DEFAULT_BASE_URL = 'https://staging.app.example.com'

interface TestResult {
	name: string
	passed: boolean
	detail?: string
}

interface SmokeTestOutput {
	baseUrl: string
	timestamp: string
	passed: number
	failed: number
	total: number
	results: TestResult[]
}

function parseArgs(): string {
	const args = process.argv.slice(2)
	const idx = args.indexOf('--base-url')
	if (idx !== -1 && args[idx + 1]) {
		return args[idx + 1]!.replace(/\/+$/, '')
	}
	return DEFAULT_BASE_URL
}

async function fetchPage(
	url: string,
): Promise<{ status: number; body: string }> {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'epic-app-smoke-test/1.0' },
		redirect: 'follow',
	})
	const body = await res.text()
	return { status: res.status, body }
}

type TestFn = (baseUrl: string) => Promise<TestResult>

const ERROR_INDICATORS = [
	'Internal Server Error',
	'Application Error',
	'500 Error',
	'ECONNREFUSED',
	'Cannot read properties of',
	'TypeError:',
	'ReferenceError:',
]

// Public routes hit by the status/content/error checks. Adjust for your app.
const PUBLIC_ROUTES = ['/', '/login']

const tests: TestFn[] = [
	// --- Healthcheck ---
	async (baseUrl) => {
		const { status, body } = await fetchPage(`${baseUrl}/resources/healthcheck`)
		return {
			name: 'GET /resources/healthcheck returns 200',
			passed: status === 200 && body === 'OK',
			detail: `status ${status}`,
		}
	},

	// --- Status code checks ---
	...PUBLIC_ROUTES.map<TestFn>((route) => async (baseUrl) => {
		const { status } = await fetchPage(`${baseUrl}${route}`)
		return {
			name: `GET ${route} returns 200`,
			passed: status === 200,
			detail: `status ${status}`,
		}
	}),

	// --- Content check ---
	async (baseUrl) => {
		const { body } = await fetchPage(baseUrl)
		const hasNav = body.includes('<nav') || body.includes('nav>')
		return {
			name: 'Home page has navigation',
			passed: hasNav,
			detail: `nav: ${hasNav}`,
		}
	},

	// --- Error indicator check ---
	async (baseUrl) => {
		const errors: string[] = []

		for (const page of PUBLIC_ROUTES) {
			const { body } = await fetchPage(`${baseUrl}${page}`)
			for (const indicator of ERROR_INDICATORS) {
				if (body.includes(indicator)) {
					errors.push(`${page}: "${indicator}"`)
				}
			}
		}

		return {
			name: 'No error indicators on pages',
			passed: errors.length === 0,
			detail: errors.length > 0 ? errors.join('; ') : 'clean',
		}
	},
]

async function main() {
	const baseUrl = parseArgs()
	const results: TestResult[] = []

	for (const test of tests) {
		try {
			const result = await test(baseUrl)
			results.push(result)
		} catch (err) {
			results.push({
				name: 'unknown',
				passed: false,
				detail: err instanceof Error ? err.message : String(err),
			})
		}
	}

	const passed = results.filter((r) => r.passed).length
	const failed = results.filter((r) => !r.passed).length

	const output: SmokeTestOutput = {
		baseUrl,
		timestamp: new Date().toISOString(),
		passed,
		failed,
		total: results.length,
		results,
	}

	process.stdout.write(JSON.stringify(output, null, 2) + '\n')

	if (failed > 0) {
		process.stderr.write(`\n${failed}/${results.length} smoke test(s) failed\n`)
		process.exit(1)
	}

	process.stderr.write(`\nAll ${results.length} smoke tests passed\n`)
}

void main()
