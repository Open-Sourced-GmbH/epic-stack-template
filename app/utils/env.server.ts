import { z } from 'zod'

const schema = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	DATABASE_PATH: z.string(),
	DATABASE_URL: z.string(),
	SESSION_SECRET: z.string(),
	INTERNAL_COMMAND_TOKEN: z.string(),
	HONEYPOT_SECRET: z.string(),
	CACHE_DATABASE_PATH: z.string(),
	LITEFS_DIR: z.string(),
	// If you plan on using Sentry, remove the .optional()
	SENTRY_DSN: z.string().optional(),
	// If you plan to use Resend, remove the .optional()
	RESEND_API_KEY: z.string().optional(),
	// If you plan to use GitHub auth, remove the .optional()
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
	GITHUB_REDIRECT_URI: z.string().optional(),
	GITHUB_TOKEN: z.string().optional(),

	ALLOW_INDEXING: z.enum(['true', 'false']).optional(),

	// Matomo analytics (self-hosted, cookieless). When both are set the
	// tracker mounts; leave unset to disable analytics entirely.
	MATOMO_URL: z.string().url().optional(),
	MATOMO_SITE_ID: z.string().optional(),

	// Cloudflare Turnstile bot challenge. When both are set the widget mounts on
	// signup and the action verifies the token; leave unset to disable entirely.
	// The site key is public (sent to the client); the secret key never is.
	TURNSTILE_SITE_KEY: z.string().optional(),
	TURNSTILE_SECRET_KEY: z.string().optional(),

	// Tigris Object Storage Configuration
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_REGION: z.string(),
	AWS_ENDPOINT_URL_S3: z.string().url(),
	BUCKET_NAME: z.string(),
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof schema> {}
	}
}

export function init() {
	const parsed = schema.safeParse(process.env)

	if (parsed.success === false) {
		console.error(
			'❌ Invalid environment variables:',
			parsed.error.flatten().fieldErrors,
		)

		throw new Error('Invalid environment variables')
	}
}

type FeatureRow = { label: string; enabled: boolean; hint: string }

/**
 * A presence-gated integration: active only when *all* of its `vars` are set.
 * When disabled, the hint names exactly which vars are still missing.
 */
function presenceFeature(label: string, vars: string[]): FeatureRow {
	const missing = vars.filter((name) => !process.env[name])
	return { label, enabled: missing.length === 0, hint: `set ${missing.join(', ')}` }
}

/**
 * The optional, feature-toggling environment variables, resolved against the
 * current `process.env`. Required variables are already guaranteed present by
 * `init()`, so they are not reported here.
 */
function getFeatureRows(): FeatureRow[] {
	return [
		presenceFeature('Sentry error monitoring', ['SENTRY_DSN']),
		presenceFeature('Resend email', ['RESEND_API_KEY']),
		presenceFeature('GitHub auth', ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']),
		presenceFeature('Matomo analytics', ['MATOMO_URL', 'MATOMO_SITE_ID']),
		presenceFeature('Turnstile bot challenge', [
			'TURNSTILE_SITE_KEY',
			'TURNSTILE_SECRET_KEY',
		]),
		{
			// A value flag, not a presence toggle: indexing is allowed unless
			// ALLOW_INDEXING is explicitly 'false' (matches server/index.ts).
			label: 'Search-engine indexing',
			enabled: process.env.ALLOW_INDEXING !== 'false',
			hint: 'unset ALLOW_INDEXING or set it to "true"',
		},
	]
}

/**
 * Prints a readable startup summary of which optional integrations are
 * configured.
 */
export function logEnvStatus() {
	const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
	const green = (s: string) => `\x1b[32m${s}\x1b[0m`
	const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`

	const lines = getFeatureRows().map(({ label, enabled, hint }) => {
		const marker = enabled ? green('✓') : yellow('○')
		const status = enabled ? green('enabled') : yellow(`disabled (${hint})`)
		return `  ${marker} ${label.padEnd(26)} ${status}`
	})

	console.log(
		[
			dim('┌─ Environment'),
			dim(`│  mode: ${process.env.NODE_ENV}`),
			dim('├─ Optional integrations'),
			...lines,
			dim('└─'),
		].join('\n'),
	)
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
	return {
		MODE: process.env.NODE_ENV,
		SENTRY_DSN: process.env.SENTRY_DSN,
		ALLOW_INDEXING: process.env.ALLOW_INDEXING,
		MATOMO_URL: process.env.MATOMO_URL,
		MATOMO_SITE_ID: process.env.MATOMO_SITE_ID,
		TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
	}
}

type ENV = ReturnType<typeof getEnv>

declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}
