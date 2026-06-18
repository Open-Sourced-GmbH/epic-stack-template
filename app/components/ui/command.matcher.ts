/**
 * Command palette matcher — a framework-free deep module (no React/DOM). The
 * `Command` palette UI (`command.tsx`) renders whatever {@link filterCommands}
 * returns; all ranking, grouping, and filtering lives here so it can be unit
 * tested without a renderer.
 */

type CommandBase = {
	id: string
	title: string
	/** Section header, e.g. "Navigation", "Actions", "Help". */
	group: string
	/** Extra search terms that match but are not shown as the title. */
	keywords?: string[]
}

/** An action command runs a side effect; it never navigates. */
type ActionCommand = CommandBase & { run: () => void; href?: never }

/** A navigation command points at an href; it never runs an action. */
type NavCommand = CommandBase & { href: string; run?: never }

/**
 * A single command. The `run` XOR `href` split is enforced by the type: a
 * command is either an action or a navigation, never both and never neither.
 */
export type Command = ActionCommand | NavCommand

/** Match quality, lowest is best. A prefix beats a substring beats a keyword. */
const Rank = { prefix: 0, substring: 1, keyword: 2 } as const

/**
 * Score a command against an already-normalized (trimmed, lower-cased) query.
 * Returns the best {@link Rank} the command achieves, or `null` for no match.
 */
function matchRank(command: Command, normalized: string): number | null {
	const title = command.title.toLowerCase()
	if (title.startsWith(normalized)) return Rank.prefix
	if (title.includes(normalized)) return Rank.substring
	const hitsKeyword = command.keywords?.some((keyword) =>
		keyword.toLowerCase().includes(normalized),
	)
	return hitsKeyword ? Rank.keyword : null
}

/**
 * Filter and rank `commands` against `query`.
 *
 * Results are grouped by `group` (in first-appearance order) and, within a
 * group, ranked by match quality: a prefix-of-title beats a substring-of-title
 * beats a keyword-only match. Matching is case-insensitive. An empty/whitespace
 * query matches everything, so the full registry comes back grouped in original
 * order; a query that matches nothing returns an empty array.
 */
export function filterCommands(
	query: string,
	commands: Command[],
): Command[] {
	const normalized = query.trim().toLowerCase()
	const groupOrder = firstAppearanceIndex(commands.map((c) => c.group))
	return commands
		.map((command, index) => ({
			command,
			index,
			groupIndex: groupOrder.get(command.group)!,
			// An empty query matches everything at the best rank.
			rank: normalized ? matchRank(command, normalized) : Rank.prefix,
		}))
		.filter((scored) => scored.rank !== null)
		.sort(
			(a, b) =>
				a.groupIndex - b.groupIndex ||
				a.rank! - b.rank! ||
				a.index - b.index,
		)
		.map((scored) => scored.command)
}

/** A contiguous run of commands sharing a `group`, ready for sectioned render. */
export type CommandGroup = { group: string; commands: Command[] }

/**
 * Split an ordered command list (typically a {@link filterCommands} result)
 * into render-ready sections, one per `group`, preserving the incoming order of
 * both the groups and the commands within them.
 */
export function groupCommands(commands: Command[]): CommandGroup[] {
	const sections: CommandGroup[] = []
	for (const command of commands) {
		const last = sections.at(-1)
		if (last?.group === command.group) {
			last.commands.push(command)
		} else {
			sections.push({ group: command.group, commands: [command] })
		}
	}
	return sections
}

/** Map each distinct value to the index at which it first appears. */
function firstAppearanceIndex(values: string[]): Map<string, number> {
	const order = new Map<string, number>()
	for (const value of values) {
		if (!order.has(value)) order.set(value, order.size)
	}
	return order
}
