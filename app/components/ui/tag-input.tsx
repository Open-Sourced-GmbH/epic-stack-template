import { useId, useState, type KeyboardEvent } from 'react'
import { cn } from '#app/utils/misc.tsx'
import { dedupeBySlug, slugify } from '#app/utils/slug.ts'
import { Badge } from './badge.tsx'
import { Icon } from './icon.tsx'

export type TagInputProps = {
	/** Form field name — one hidden `<input>` is emitted per selected tag. */
	name?: string
	/** Existing tag names to offer in the menu (filtered by the query). */
	suggestions?: string[]
	/** Controlled selected tag names. */
	value?: string[]
	/** Uncontrolled initial selection. */
	defaultValue?: string[]
	/** Fires with the full selection whenever it changes. */
	onChange?: (tags: string[]) => void
	/**
	 * Offer the "Create «query»" row for a typed name that isn't an existing
	 * suggestion. Set `false` to resolve to existing options only — e.g. assigning
	 * a user one of the existing roles, where inventing a role makes no sense.
	 * @default true
	 */
	allowCreate?: boolean
	id?: string
	placeholder?: string
	disabled?: boolean
	className?: string
	'aria-label'?: string
	'aria-labelledby'?: string
}

/** One row of the open menu: an existing suggestion, or the create affordance. */
type Option =
	| { kind: 'existing'; label: string }
	| { kind: 'create'; label: string }

/**
 * TagInput — a resolve-or-create multi-select combobox (the editor's tag field).
 * There is no other multi-select in the system (`Command`/`Select` are
 * single-select), so this is a net-new primitive (GROUNDED-SPEC §Net-new).
 *
 * Selected tags render as removable chips on `--secondary`; typing opens a
 * `--popover` menu listing matching existing tags plus a **"Create «query»"**
 * row (on `--brand`) when the typed name isn't already an option. Identity is by
 * slug, so "React"/"react" are the same tag and can never be added twice — the
 * server's {@link resolveTags} applies the same rule, so the menu and the write
 * path agree. Full keyboard: ↓/↑ move the active option, Enter selects or
 * creates, Backspace on an empty query removes the last chip.
 *
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). With
 * a `name`, it emits one hidden input per tag so a plain `<Form>` submits the
 * selection as repeated keys — the array the editor action resolves.
 */
export function TagInput({
	name,
	suggestions = [],
	value,
	defaultValue = [],
	onChange,
	allowCreate = true,
	id,
	placeholder = 'Add a tag…',
	disabled = false,
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
}: TagInputProps) {
	const reactId = useId()
	const inputId = id ?? `${reactId}-input`
	const listboxId = `${reactId}-listbox`

	const isControlled = value !== undefined
	const [internal, setInternal] = useState(() => dedupeBySlug(defaultValue))
	const selected = isControlled ? dedupeBySlug(value) : internal

	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(0)

	const selectedSlugs = new Set(selected.map(slugify))
	const q = query.trim()
	const qSlug = slugify(q)

	const matches = suggestions
		.filter((s) => !selectedSlugs.has(slugify(s)))
		.filter((s) => !q || s.toLowerCase().includes(q.toLowerCase()))
	// Offer "Create" only when the typed name is real, not already chosen, and not
	// already an exact existing option (then the user reuses rather than creates).
	const canCreate =
		allowCreate &&
		qSlug !== '' &&
		!selectedSlugs.has(qSlug) &&
		!matches.some((s) => slugify(s) === qSlug)

	const options: Option[] = [
		...matches.map((label): Option => ({ kind: 'existing', label })),
		...(canCreate ? [{ kind: 'create', label: q } as Option] : []),
	]
	const menuOpen = open && options.length > 0

	function commit(next: string[]) {
		if (!isControlled) setInternal(next)
		onChange?.(next)
	}

	function addTag(label: string) {
		const slug = slugify(label)
		if (slug && !selectedSlugs.has(slug)) commit([...selected, label.trim()])
		setQuery('')
		setActiveIndex(0)
	}

	function removeBySlug(slug: string) {
		commit(selected.filter((s) => slugify(s) !== slug))
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (disabled) return
		switch (event.key) {
			case 'ArrowDown':
				if (!options.length) return
				event.preventDefault()
				setOpen(true)
				setActiveIndex((i) => Math.min(i + 1, options.length - 1))
				return
			case 'ArrowUp':
				if (!options.length) return
				event.preventDefault()
				setActiveIndex((i) => Math.max(i - 1, 0))
				return
			case 'Enter': {
				if (!q && !options.length) return
				event.preventDefault()
				const option = options[activeIndex]
				if (option) addTag(option.label)
				return
			}
			case 'Backspace':
				if (query === '' && selected.length) {
					event.preventDefault()
					commit(selected.slice(0, -1))
				}
				return
			case 'Escape':
				setOpen(false)
				return
		}
	}

	const activeId =
		menuOpen && options[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined

	return (
		<div className={cn('relative', className)}>
			<div
				className={cn(
					'border-input bg-background flex min-h-(--combobox-min-h) w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5',
					// Match the DS cosy-focus treatment (EPT-22): a brand border + glow
					// when the inner input is focused, not the retired detached ring.
					'focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--brand-glow)]',
					disabled && 'cursor-not-allowed opacity-50',
				)}
			>
				{selected.map((tag) => {
					const slug = slugify(tag)
					return (
						<Badge key={slug} variant="secondary" className="gap-1">
							{tag}
							<button
								type="button"
								aria-label={`Remove ${tag}`}
								disabled={disabled}
								onClick={() => removeBySlug(slug)}
								className="text-secondary-foreground/70 hover:text-secondary-foreground rounded-full disabled:pointer-events-none"
							>
								<Icon name="cross-1" className="size-3" />
							</button>
						</Badge>
					)
				})}
				<input
					id={inputId}
					role="combobox"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					aria-expanded={menuOpen}
					aria-controls={menuOpen ? listboxId : undefined}
					aria-autocomplete="list"
					aria-activedescendant={activeId}
					autoComplete="off"
					disabled={disabled}
					value={query}
					placeholder={selected.length ? undefined : placeholder}
					onChange={(event) => {
						setQuery(event.currentTarget.value)
						setOpen(true)
						setActiveIndex(0)
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => setOpen(false)}
					onKeyDown={handleKeyDown}
					className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-body-xs outline-hidden disabled:cursor-not-allowed"
				/>
			</div>

			{/* One hidden input per tag so a plain <Form> submits repeated `name` keys. */}
			{name
				? selected.map((tag) => (
						<input key={slugify(tag)} type="hidden" name={name} value={tag} />
					))
				: null}

			{menuOpen ? (
				<ul
					id={listboxId}
					role="listbox"
					className="bg-popover text-popover-foreground border-border absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-overlay"
				>
					{options.map((option, index) => {
						const active = index === activeIndex
						return (
							<li
								key={option.kind === 'create' ? `create:${option.label}` : option.label}
								id={`${listboxId}-opt-${index}`}
								role="option"
								aria-selected={active}
								// Keep focus on the input so the field's blur doesn't close the
								// menu before the click lands.
								onMouseDown={(event) => event.preventDefault()}
								onMouseEnter={() => setActiveIndex(index)}
								onClick={() => addTag(option.label)}
								className={cn(
									'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-body-xs',
									active && 'bg-accent text-accent-foreground',
									option.kind === 'create' && 'text-brand font-medium',
								)}
							>
								{option.kind === 'create' ? (
									<>
										<Icon name="plus" className="size-3.5" />
										<span>
											Create “{option.label}”
										</span>
									</>
								) : (
									option.label
								)}
							</li>
						)
					})}
				</ul>
			) : null}
		</div>
	)
}
