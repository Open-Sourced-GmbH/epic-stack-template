import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { data, redirect, useFetcher, useFetchers } from 'react-router'
import { ServerOnly } from 'remix-utils/server-only'
import { z } from 'zod'
import { getAccent, setAccent } from '#app/utils/accent.server.ts'
import {
	type Accent,
	type ButtonCursor,
	DEFAULT_ACCENT,
	accentPresets,
	brandColor,
	findAccentPreset,
} from '#app/utils/accent.ts'
import { cn } from '#app/utils/misc.tsx'
import { useRequestInfo } from '#app/utils/request-info.ts'
import { type Route } from './+types/accent.ts'

const presetIds = accentPresets.map((p) => p.id) as [string, ...string[]]

/**
 * One schema for every way the customizer persists an accent: a named `presetId`
 * (the swatch tracer), explicit `l`/`c`/`h` slider values, and/or the button
 * `cursor` segment. All fields are optional so the dock can post just the part
 * that changed (e.g. cursor-only) and the action fills the rest from the cookie.
 */
const AccentFormSchema = z.object({
	presetId: z.enum(presetIds).optional(),
	l: z.coerce.number().optional(),
	c: z.coerce.number().optional(),
	h: z.coerce.number().optional(),
	cursor: z.enum(['default', 'pointer']).optional(),
	// this is useful for progressive enhancement
	redirectTo: z.string().optional(),
})

/** Resolve the accent a submission asks for: a preset, sliders, or unchanged. */
function resolveAccent(
	value: z.infer<typeof AccentFormSchema>,
	current: Accent,
): Accent {
	const { presetId, l, c, h } = value
	if (presetId) {
		const preset = accentPresets.find((p) => p.id === presetId)
		invariantResponse(preset, 'Unknown accent preset')
		return preset.accent
	}
	if (l !== undefined && c !== undefined && h !== undefined) {
		return { l, c, h }
	}
	return current
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: AccentFormSchema })

	invariantResponse(submission.status === 'success', 'Invalid accent received')

	const { cursor, redirectTo } = submission.value
	const current = getAccent(request)

	const responseInit = {
		headers: {
			'set-cookie': setAccent({
				accent: resolveAccent(submission.value, current?.accent ?? DEFAULT_ACCENT),
				// Carry the existing cursor unless this submission changes it.
				cursor: cursor ?? current?.cursor ?? 'default',
			}),
		},
	}
	// `redirectTo` must only ever arrive from a no-JS document POST (the
	// `<ServerOnly>`-gated `<Form>` in AccentSwitch) — those get a real 302 the
	// browser follows with a full GET. JS `useFetcher` callers must NOT send it:
	// a redirect from a single-fetch POST 404s through the splat (`routes/$`).
	if (redirectTo) {
		return redirect(redirectTo, responseInit)
	}
	return data({ result: submission.reply() }, responseInit)
}

/**
 * Tracer UI for the accent path — a minimal row of preset swatches that proves
 * the end-to-end cookie + SSR loop (the full customizer dock is a later slice).
 * Each swatch posts to `/resources/accent`; the active preset gets a ring.
 */
export function AccentSwitch({ userPreference }: { userPreference?: Accent }) {
	const fetcher = useFetcher<typeof action>()
	const requestInfo = useRequestInfo()
	const [form] = useForm({ id: 'accent-switch', lastResult: fetcher.data?.result })

	const optimisticPresetId = useOptimisticAccentPresetId()
	const activeId =
		optimisticPresetId ??
		findAccentPreset(userPreference)?.id ??
		accentPresets[0]!.id

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action="/resources/accent"
			className="flex items-center gap-2"
		>
			<ServerOnly>
				{() => (
					<input type="hidden" name="redirectTo" value={requestInfo.path} />
				)}
			</ServerOnly>
			{accentPresets.map((preset) => {
				const active = preset.id === activeId
				return (
					<button
						key={preset.id}
						type="submit"
						name="presetId"
						value={preset.id}
						aria-pressed={active}
						title={preset.name}
						className={cn(
							'focus-visible:ring-ring size-6 cursor-pointer rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
							active && 'ring-foreground ring-2 ring-offset-2',
						)}
						style={{ backgroundColor: brandColor(preset.accent) }}
					>
						<span className="sr-only">{preset.name}</span>
					</button>
				)
			})}
		</fetcher.Form>
	)
}

/** The valid, in-flight accent submission (if any), shared by the hooks below. */
function useInFlightAccentSubmission() {
	const fetchers = useFetchers()
	const accentFetcher = fetchers.find(
		(f) => f.formAction === '/resources/accent',
	)
	if (accentFetcher?.formData) {
		const submission = parseWithZod(accentFetcher.formData, {
			schema: AccentFormSchema,
		})
		if (submission.status === 'success') return submission.value
	}
	return null
}

/**
 * If the user is switching accent via a preset swatch, returns the preset id
 * it's being changed to (mirrors `useOptimisticThemeMode`), so the active ring
 * can move before the reload.
 */
export function useOptimisticAccentPresetId() {
	return useInFlightAccentSubmission()?.presetId
}

/**
 * The accent to render now, accounting for an in-flight optimistic change —
 * whether it's a preset swatch or a free hue/chroma/light slider drag, so the
 * whole page re-tints live as the customizer moves (ADR 062).
 */
export function useOptimisticAccent(userPreference?: Accent): Accent | undefined {
	const value = useInFlightAccentSubmission()
	if (value?.presetId) {
		return accentPresets.find((p) => p.id === value.presetId)?.accent
	}
	const { l, c, h } = value ?? {}
	if (l !== undefined && c !== undefined && h !== undefined) {
		return { l, c, h }
	}
	return userPreference
}

/** The button-cursor preference to render now, including an in-flight change. */
export function useOptimisticButtonCursor(
	userPreference?: ButtonCursor,
): ButtonCursor | undefined {
	return useInFlightAccentSubmission()?.cursor ?? userPreference
}
