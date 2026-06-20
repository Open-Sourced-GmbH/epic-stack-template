import path from 'node:path'
import { reactRouter } from '@react-router/dev/vite'
import {
	type SentryReactRouterBuildOptions,
	sentryReactRouter,
} from '@sentry/react-router'
import tailwindcss from '@tailwindcss/vite'
import { reactRouterDevTools } from 'react-router-devtools'
import { defineConfig } from 'vite'
import { envOnlyMacros } from 'vite-env-only'
import { iconsSpritesheet } from 'vite-plugin-icons-spritesheet'

export default defineConfig((config) => {
	const mode = config.mode ?? process.env.NODE_ENV
	const isTest = mode === 'test' || Boolean(process.env.VITEST)
	const cacheServerStubPlugin = {
		name: 'vitest-cache-server-stub',
		enforce: 'pre' as const,
		resolveId(source: string) {
			if (!process.env.VITEST) return null
			if (source.endsWith('cache.server.ts')) {
				return path.resolve('tests/mocks/cache-server.ts')
			}
			return null
		},
	}
	return {
	build: {
		target: 'es2022',
		cssMinify: mode === 'production',

		rollupOptions: {
			input: config.isSsrBuild ? './server/app.ts' : undefined,
			external: [/node:.*/, 'fsevents'],
		},

		assetsInlineLimit: (source: string) => {
			if (
				source.endsWith('favicon.svg') ||
				source.endsWith('apple-touch-icon.png')
			) {
				return false
			}
		},

		sourcemap: true,
	},
	server: {
		watch: {
			ignored: ['**/playwright-report/**'],
		},
	},
	resolve: {
		// Force a single copy of React and the router across the whole module graph.
		// `@nasa-gcn/remix-seo` drags a transitive `react-router-dom@6` into the dep
		// scan; without dedupe the dev optimizer can hand a module a stale/duplicate
		// React, surfacing as `Cannot read properties of null (reading 'useContext')`
		// after a mid-session re-optimize. Dedupe is the standard Vite remedy.
		dedupe: ['react', 'react-dom', 'react-router'],
	},
	optimizeDeps: {
		// `@nasa-gcn/remix-seo` (used server-side in the sitemap loader) peer-deps
		// on `@remix-run/react`, which imports the legacy `react-router-dom`. Under
		// `future.unstable_optimizeDeps` Vite crawls every route into the client
		// dep scan and tries to pre-bundle `react-router-dom`, which isn't (and
		// shouldn't be) installed under React Router 7. Exclude it to silence the
		// "Failed to resolve dependency: react-router-dom" warning.
		exclude: ['react-router-dom'],
	},
	sentryConfig,
	plugins: [
		cacheServerStubPlugin,
		envOnlyMacros(),
		tailwindcss(),
		reactRouterDevTools({ pluginDir: './other/rdt-plugins' }),

		iconsSpritesheet({
			inputDir: './other/svg-icons',
			outputDir: './app/components/ui/icons',
			fileName: 'sprite.svg',
			withTypes: true,
			iconNameTransformer: (name) => name,
		}),
		// it would be really nice to have this enabled in tests, but we'll have to
		// wait until https://github.com/remix-run/remix/issues/9871 is fixed
		isTest ? null : reactRouter(),
		mode === 'production' && process.env.SENTRY_AUTH_TOKEN
			? sentryReactRouter(sentryConfig, config)
			: null,
	],
	test: {
		include: ['./app/**/*.test.{ts,tsx}'],
		setupFiles: ['./tests/setup/setup-test-env.ts'],
		globalSetup: ['./tests/setup/global-setup.ts'],
		restoreMocks: true,
		coverage: {
			include: ['app/**/*.{ts,tsx}'],
			all: true,
		},
	},
	}
})

const sentryConfig: SentryReactRouterBuildOptions = {
	authToken: process.env.SENTRY_AUTH_TOKEN,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,

	unstable_sentryVitePluginOptions: {
		release: {
			name: process.env.COMMIT_SHA,
			setCommits: {
				auto: true,
			},
		},
		sourcemaps: {
			filesToDeleteAfterUpload: ['./build/**/*.map'],
		},
	},
}
