import { useForm, getFormProps } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { data, redirect, useFetcher, useFetchers } from 'react-router'
import { ServerOnly } from 'remix-utils/server-only'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon.tsx'
import { Switch } from '#app/components/ui/switch.tsx'
import { useHints, useOptionalHints } from '#app/utils/client-hints.tsx'
import {
	useOptionalRequestInfo,
	useRequestInfo,
} from '#app/utils/request-info.ts'
import { type Theme, setTheme } from '#app/utils/theme.server.ts'
import { type Route } from './+types/theme-switch.ts'
const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark']),
	// this is useful for progressive enhancement
	redirectTo: z.string().optional(),
})

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	})

	invariantResponse(submission.status === 'success', 'Invalid theme received')

	const { theme, redirectTo } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	// `redirectTo` must only ever arrive from a no-JS document POST (the
	// `<ServerOnly>`-gated `<Form>` in ThemeSwitch) — those get a real 302 the
	// browser follows with a full GET. JS `useFetcher` callers must NOT send it:
	// a redirect from a single-fetch POST 404s through the splat (`routes/$`).
	if (redirectTo) {
		return redirect(redirectTo, responseInit)
	} else {
		return data({ result: submission.reply() }, responseInit)
	}
}

export function ThemeSwitch({
	userPreference,
}: {
	userPreference?: Theme | null
}) {
	const fetcher = useFetcher<typeof action>()
	const requestInfo = useRequestInfo()

	const [form] = useForm({
		id: 'theme-switch',
		lastResult: fetcher.data?.result,
	})

	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? userPreference ?? 'system'
	const nextMode =
		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
	const modeLabel = {
		light: (
			<Icon name="sun">
				<span className="sr-only">Light</span>
			</Icon>
		),
		dark: (
			<Icon name="moon">
				<span className="sr-only">Dark</span>
			</Icon>
		),
		system: (
			<Icon name="laptop">
				<span className="sr-only">System</span>
			</Icon>
		),
	}

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action="/resources/theme-switch"
		>
			<ServerOnly>
				{() => (
					<input type="hidden" name="redirectTo" value={requestInfo.path} />
				)}
			</ServerOnly>
			<input type="hidden" name="theme" value={nextMode} />
			<div className="flex gap-2">
				<button
					type="submit"
					className="flex size-8 cursor-pointer items-center justify-center"
				>
					{modeLabel[mode]}
				</button>
			</div>
		</fetcher.Form>
	)
}

/**
 * A binary light/dark toggle built on the `Switch` primitive, for the auth
 * shell (EPT-58). Unlike {@link ThemeSwitch} (which cycles system→light→dark),
 * this flips between the two resolved appearances and writes the preference
 * server-side via the same `/resources/theme-switch` action — the html `theme`
 * class is applied in the root document (no client-only theming, no FOUC).
 *
 * It submits with a JS `useFetcher` and deliberately sends **no** `redirectTo`:
 * a redirect from a single-fetch POST 404s through the splat route, so the
 * fetcher just commits the cookie and the optimistic mode re-tints in place.
 */
export function ThemeToggle() {
	const fetcher = useFetcher<typeof action>()
	const theme = useTheme()
	const isDark = theme === 'dark'
	return (
		<div className="flex items-center gap-2">
			<Icon
				name="sun"
				className="text-muted-foreground size-4 shrink-0"
				aria-hidden
			/>
			<Switch
				checked={isDark}
				onCheckedChange={(checked) =>
					void fetcher.submit(
						{ theme: checked ? 'dark' : 'light' },
						{ method: 'POST', action: '/resources/theme-switch' },
					)
				}
				aria-label="Toggle dark mode"
			/>
			<Icon
				name="moon"
				className="text-muted-foreground size-4 shrink-0"
				aria-hidden
			/>
		</div>
	)
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(
		(f) => f.formAction === '/resources/theme-switch',
	)

	if (themeFetcher && themeFetcher.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})

		if (submission.status === 'success') {
			return submission.value.theme
		}
	}
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode
	}
	return requestInfo.userPrefs.theme ?? hints.theme
}

export function useOptionalTheme() {
	const optionalHints = useOptionalHints()
	const optionalRequestInfo = useOptionalRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? optionalHints?.theme : optimisticMode
	}
	return optionalRequestInfo?.userPrefs.theme ?? optionalHints?.theme
}
