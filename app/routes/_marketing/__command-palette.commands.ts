/**
 * Slice-① landing command set — a framework-free factory for the ⌘K palette's
 * registry (no React/DOM), so the command shape can be unit tested without a
 * renderer (mirrors `command.matcher.ts`). The palette wiring
 * (`__command-palette.tsx`) injects `onTheme`, which carries the toast + cookie
 * side effects; this module only declares *which* commands exist.
 */

import { type Command } from '#app/components/ui/command.matcher.ts'
import { type Theme } from '#app/utils/theme.server.ts'
import { navSections } from './__header.tsx'
import { type IconName } from '@/icon-name'

/** The theme *preference* a command can set — the resolved `Theme` plus `system`. */
export type ThemeMode = Theme | 'system'

/** Leading icon per nav target; falls back to a generic arrow for new sections. */
const navIcons: Partial<Record<(typeof navSections)[number]['id'], IconName>> = {
	work: 'link-2',
	services: 'file-text',
	pricing: 'file-text',
	faq: 'question-mark-circled',
}

/** The 3-way theme set, mirroring the customizer dock's segment (ADR 062). */
const themeModes: Array<{ mode: ThemeMode; title: string; icon: IconName }> = [
	{ mode: 'light', title: 'Light', icon: 'sun' },
	{ mode: 'dark', title: 'Dark', icon: 'moon' },
	{ mode: 'system', title: 'System', icon: 'laptop' },
]

/**
 * Build the landing palette registry: a Navigation group of `href` commands
 * (Home, each in-page nav section, Contact) and a Theme group of `run` commands
 * that report the chosen mode to `onTheme`. The `run` XOR `href` split keeps each
 * command unambiguously a navigation or an action (enforced by {@link Command}).
 */
export function landingCommands({
	onTheme,
}: {
	onTheme: (mode: ThemeMode) => void
}): Command[] {
	const navigation: Command[] = [
		{ id: 'nav-home', title: 'Home', group: 'Navigation', href: '/', icon: 'arrow-right' },
		{
			id: 'nav-blog',
			title: 'Blog',
			group: 'Navigation',
			href: '/blog',
			icon: 'file-text',
			keywords: ['articles', 'posts', 'writing'],
		},
		...navSections.map(
			(section): Command => ({
				id: `nav-${section.id}`,
				title: section.label,
				group: 'Navigation',
				href: `/#${section.id}`,
				icon: navIcons[section.id] ?? 'arrow-right',
			}),
		),
		{
			id: 'nav-contact',
			title: 'Start a project',
			group: 'Navigation',
			href: '/#contact',
			icon: 'envelope-closed',
			keywords: ['contact', 'hire', 'get in touch'],
		},
	]

	const theme: Command[] = themeModes.map(({ mode, title, icon }) => ({
		id: `theme-${mode}`,
		title,
		group: 'Theme',
		icon,
		keywords: ['theme', 'appearance', 'dark', 'light'],
		run: () => onTheme(mode),
	}))

	return [...navigation, ...theme]
}
