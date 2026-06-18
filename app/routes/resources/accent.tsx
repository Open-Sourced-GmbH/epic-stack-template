import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { data, redirect, useFetcher, useFetchers } from 'react-router'
import { ServerOnly } from 'remix-utils/server-only'
import { z } from 'zod'
import { getAccent, setAccent } from '#app/utils/accent.server.ts'
import { type Accent, accentPresets, brandColor } from '#app/utils/accent.ts'
import { cn } from '#app/utils/misc.tsx'
import { useRequestInfo } from '#app/utils/request-info.ts'
import { type Route } from './+types/accent.ts'

const presetIds = accentPresets.map((p) => p.id) as [string, ...string[]]

const AccentFormSchema = z.object({
	presetId: z.enum(presetIds),
	// this is useful for progressive enhancement
	redirectTo: z.string().optional(),
})

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: AccentFormSchema })

	invariantResponse(submission.status === 'success', 'Invalid accent received')

	const { presetId, redirectTo } = submission.value
	const preset = accentPresets.find((p) => p.id === presetId)
	invariantResponse(preset, 'Unknown accent preset')

	// Preserve the existing button-cursor preference; only the accent changes.
	const current = getAccent(request)
	const responseInit = {
		headers: {
			'set-cookie': setAccent({
				accent: preset.accent,
				cursor: current?.cursor ?? 'default',
			}),
		},
	}
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
		optimisticPresetId ?? matchPresetId(userPreference) ?? accentPresets[0]!.id

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

/** The preset id this preset's accent corresponds to, if any (by l/c/h). */
function matchPresetId(accent?: Accent): string | undefined {
	if (!accent) return undefined
	return accentPresets.find(
		(p) =>
			p.accent.l === accent.l &&
			p.accent.c === accent.c &&
			p.accent.h === accent.h,
	)?.id
}

/**
 * If the user is switching accent, returns the preset id it's being changed to
 * (mirrors `useOptimisticThemeMode`), so `<html>` can re-tint before the reload.
 */
export function useOptimisticAccentPresetId() {
	const fetchers = useFetchers()
	const accentFetcher = fetchers.find(
		(f) => f.formAction === '/resources/accent',
	)
	if (accentFetcher?.formData) {
		const submission = parseWithZod(accentFetcher.formData, {
			schema: AccentFormSchema,
		})
		if (submission.status === 'success') return submission.value.presetId
	}
}

/** The accent to render now, accounting for an in-flight optimistic switch. */
export function useOptimisticAccent(userPreference?: Accent): Accent | undefined {
	const optimisticPresetId = useOptimisticAccentPresetId()
	if (optimisticPresetId) {
		return accentPresets.find((p) => p.id === optimisticPresetId)?.accent
	}
	return userPreference
}
