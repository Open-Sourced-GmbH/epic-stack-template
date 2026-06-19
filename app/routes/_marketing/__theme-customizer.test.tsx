/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRoutesStub } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
	ACCENT_LIGHT_MAX,
	ACCENT_LIGHT_MIN,
	type Accent,
	type ButtonCursor,
	DEFAULT_ACCENT,
	accentPresets,
} from '#app/utils/accent.ts'
import { type Theme } from '#app/utils/theme.server.ts'
import { ThemeCustomizer } from './__theme-customizer.tsx'

beforeEach(() => {
	// Radix + any motion checks read matchMedia; default to reduced motion.
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('reduce'),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
})

afterEach(() => {
	vi.unstubAllGlobals()
})

type Submission = { action: string; data: Record<string, string> }

/**
 * Render the dock inside a router stub whose `/resources/*` actions record the
 * submissions, so tests can assert what the customizer persists.
 */
function renderDock(props?: {
	accent?: Accent
	cursor?: ButtonCursor
	theme?: Theme | null
}) {
	const submissions: Submission[] = []
	const capture = (action: string) => async ({ request }: { request: Request }) => {
		const fd = await request.formData()
		submissions.push({ action, data: Object.fromEntries(fd) as Record<string, string> })
		return Response.json({ result: null })
	}
	const Stub = createRoutesStub([
		{
			path: '/',
			Component: () => (
				<ThemeCustomizer
					accent={props?.accent ?? DEFAULT_ACCENT}
					cursor={props?.cursor ?? 'default'}
					theme={props?.theme ?? null}
				/>
			),
		},
		{ path: '/resources/accent', action: capture('/resources/accent') },
		{ path: '/resources/theme-switch', action: capture('/resources/theme-switch') },
	])
	render(<Stub initialEntries={['/']} />)
	return { submissions }
}

/** Expand the dock from its minimized FAB. */
async function expand(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', { name: /customize theme/i }))
}

test('starts minimized: a FAB, with the controls hidden', () => {
	renderDock()
	const fab = screen.getByRole('button', { name: /customize theme/i })
	expect(fab).toHaveAttribute('aria-expanded', 'false')
	expect(screen.queryByRole('slider', { name: /hue/i })).not.toBeInTheDocument()
})

test('expanding reveals the full control set', async () => {
	const user = userEvent.setup()
	renderDock()
	await expand(user)

	expect(
		screen.getByRole('button', { name: /customize theme/i }),
	).toHaveAttribute('aria-expanded', 'true')
	// Preset swatches — one per preset.
	for (const preset of accentPresets) {
		expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument()
	}
	// Three accent sliders.
	expect(screen.getByRole('slider', { name: /hue/i })).toBeInTheDocument()
	expect(screen.getByRole('slider', { name: /chroma/i })).toBeInTheDocument()
	expect(screen.getByRole('slider', { name: /light/i })).toBeInTheDocument()
	// Theme segment (3-way) and cursor segment.
	expect(screen.getByRole('group', { name: /theme/i })).toBeInTheDocument()
	expect(screen.getByRole('group', { name: /cursor/i })).toBeInTheDocument()
})

test('the Light slider is constrained to the safe band', async () => {
	const user = userEvent.setup()
	renderDock()
	await expand(user)

	const light = screen.getByRole('slider', { name: /light/i })
	expect(light).toHaveAttribute('aria-valuemin', String(ACCENT_LIGHT_MIN))
	expect(light).toHaveAttribute('aria-valuemax', String(ACCENT_LIGHT_MAX))
})

test('each accent slider paints a gradient track', async () => {
	const user = userEvent.setup()
	const { container } = renderDockWithContainer(user)
	await expand(user)

	const tracks = container.querySelectorAll('[data-slot="slider-track"]')
	expect(tracks).toHaveLength(3)
	for (const track of tracks) {
		expect((track as HTMLElement).style.background).not.toBe('')
	}
})

test('the swatch matching the current accent is pressed', async () => {
	const user = userEvent.setup()
	const iris = accentPresets.find((p) => p.id === 'iris')!
	renderDock({ accent: iris.accent })
	await expand(user)

	expect(screen.getByRole('button', { name: iris.name })).toHaveAttribute(
		'aria-pressed',
		'true',
	)
	expect(screen.getByRole('button', { name: 'Pine' })).toHaveAttribute(
		'aria-pressed',
		'false',
	)
})

test('clicking a preset persists it to the accent resource route', async () => {
	const user = userEvent.setup()
	const { submissions } = renderDock()
	await expand(user)

	await user.click(screen.getByRole('button', { name: 'Coral' }))

	await waitFor(() => {
		const sub = submissions.find((s) => s.action === '/resources/accent')
		expect(sub?.data.presetId).toBe('coral')
	})
})

test('the theme segment persists the chosen mode to the theme route', async () => {
	const user = userEvent.setup()
	const { submissions } = renderDock()
	await expand(user)

	const themeGroup = screen.getByRole('group', { name: /theme/i })
	await user.click(within(themeGroup).getByRole('button', { name: /dark/i }))

	await waitFor(() => {
		const sub = submissions.find((s) => s.action === '/resources/theme-switch')
		expect(sub?.data.theme).toBe('dark')
	})
})

test('the cursor segment persists the chosen cursor to the accent route', async () => {
	const user = userEvent.setup()
	const { submissions } = renderDock()
	await expand(user)

	const cursorGroup = screen.getByRole('group', { name: /cursor/i })
	await user.click(within(cursorGroup).getByRole('button', { name: /pointer/i }))

	await waitFor(() => {
		const sub = submissions.find(
			(s) => s.action === '/resources/accent' && 'cursor' in s.data,
		)
		expect(sub?.data.cursor).toBe('pointer')
	})
})

/** Variant of `renderDock` that also returns the render container. */
function renderDockWithContainer(_user: ReturnType<typeof userEvent.setup>) {
	const Stub = createRoutesStub([
		{
			path: '/',
			Component: () => (
				<ThemeCustomizer accent={DEFAULT_ACCENT} cursor="default" theme={null} />
			),
		},
		{ path: '/resources/accent', action: () => Response.json({}) },
		{ path: '/resources/theme-switch', action: () => Response.json({}) },
	])
	return render(<Stub initialEntries={['/']} />)
}
