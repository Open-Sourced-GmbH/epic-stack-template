import {
	type ReactNode,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { Icon } from '#app/components/ui/icon.tsx'
import { cn, prefersReducedMotion } from '#app/utils/misc.tsx'

export type CarouselSlide = {
	/** Stable id; used for tab/panel `aria-controls` wiring. */
	id: string
	/** Tab label. */
	label: string
	content: ReactNode
}

/** Autoplay dwell per slide, in milliseconds. */
const AUTOPLAY_MS = 7_000

function PlayPauseIcon({ playing }: { playing: boolean }) {
	return (
		<svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
			{playing ? (
				<>
					<rect x="4" y="3" width="3" height="10" rx="1" />
					<rect x="9" y="3" width="3" height="10" rx="1" />
				</>
			) : (
				<path d="M5 3.5v9a.5.5 0 0 0 .76.43l7-4.5a.5.5 0 0 0 0-.86l-7-4.5A.5.5 0 0 0 5 3.5Z" />
			)}
		</svg>
	)
}

/**
 * Tabbed carousel showpiece (marketing-local). Renders an ARIA tablist, the
 * active slide's panel, prev/next arrows, and — once motion is enhanced on the
 * client — a 7s autoplay with a per-slide progress fill, a play/pause toggle,
 * and pause-on-hover.
 *
 * Motion is progressive enhancement: the server/no-JS/reduced-motion resting
 * state is a static slide with no autoplay control and no progress fill (the
 * `enhanced` flag only flips true in a mount effect when motion is allowed).
 * The panel height animates to the active slide; the fill/height transitions
 * are gated behind `prefers-reduced-motion: no-preference` in `tailwind.css`.
 */
export function Carousel({
	slides,
	label,
}: {
	slides: CarouselSlide[]
	label: string
}) {
	const baseId = useId()
	const count = slides.length
	const [active, setActive] = useState(0)
	const [enhanced, setEnhanced] = useState(false)
	const [playing, setPlaying] = useState(false)
	const [hovered, setHovered] = useState(false)
	const [height, setHeight] = useState<number>()

	const panelRef = useRef<HTMLDivElement>(null)
	const current = slides[active]

	const go = (delta: number) => setActive((i) => (i + delta + count) % count)

	// Enable motion on the client only when the visitor allows it. Autoplay
	// starts on; the static resting state stands under reduced motion / no JS.
	useEffect(() => {
		if (prefersReducedMotion()) return
		setEnhanced(true)
		setPlaying(true)
	}, [])

	// Autoplay: advance after the dwell, re-armed whenever the active slide,
	// play state, or hover state changes. Paused while hovered.
	const autoplaying = enhanced && playing && !hovered && count > 1
	useEffect(() => {
		if (!autoplaying) return
		const id = window.setTimeout(() => go(1), AUTOPLAY_MS)
		return () => window.clearTimeout(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoplaying, active, count])

	// Height-animate the panel to the active slide's measured height.
	useLayoutEffect(() => {
		if (!enhanced) return
		const el = panelRef.current
		if (el) setHeight(el.offsetHeight)
	}, [enhanced, active])

	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<div className="mb-4 flex items-center gap-2">
				<div
					role="tablist"
					aria-label={label}
					className="flex flex-1 flex-wrap gap-1.5"
				>
					{slides.map((slide, index) => {
						const selected = index === active
						return (
							<button
								key={slide.id}
								role="tab"
								type="button"
								id={`${baseId}-tab-${slide.id}`}
								aria-selected={selected}
								aria-controls={`${baseId}-panel-${slide.id}`}
								onClick={() => setActive(index)}
								className={cn(
									'text-body-2xs rounded-full px-3 py-1.5 font-medium transition-colors',
									selected
										? 'bg-brand-soft text-brand'
										: 'text-muted-foreground hover:bg-muted',
								)}
							>
								{slide.label}
							</button>
						)
					})}
				</div>

				{enhanced ? (
					<button
						type="button"
						onClick={() => setPlaying((p) => !p)}
						aria-label={playing ? 'Pause' : 'Play'}
						className="text-muted-foreground hover:text-foreground hover:bg-muted grid h-8 w-8 shrink-0 place-items-center rounded-full"
					>
						<PlayPauseIcon playing={playing} />
					</button>
				) : null}

				<div className="flex shrink-0 gap-1">
					<button
						type="button"
						onClick={() => go(-1)}
						aria-label="Previous slide"
						className="text-muted-foreground hover:text-foreground hover:bg-muted grid h-8 w-8 place-items-center rounded-full"
					>
						<Icon name="arrow-left" />
					</button>
					<button
						type="button"
						onClick={() => go(1)}
						aria-label="Next slide"
						className="text-muted-foreground hover:text-foreground hover:bg-muted grid h-8 w-8 place-items-center rounded-full"
					>
						<Icon name="arrow-right" />
					</button>
				</div>
			</div>

			{/* Per-slide progress fill — only meaningful while autoplaying. The
			    width animation lives in tailwind.css behind no-preference; `key`
			    restarts it each slide. */}
			{enhanced ? (
				<div className="bg-muted mb-4 h-0.5 overflow-hidden rounded-full">
					<div
						key={active}
						data-running={autoplaying ? '' : undefined}
						className="carousel-fill bg-brand h-full w-0"
						style={{ ['--carousel-ms' as string]: `${AUTOPLAY_MS}ms` }}
					/>
				</div>
			) : null}

			<div
				className="carousel-viewport overflow-hidden"
				style={enhanced && height ? { height } : undefined}
			>
				{current ? (
					<div
						ref={panelRef}
						role="tabpanel"
						id={`${baseId}-panel-${current.id}`}
						aria-labelledby={`${baseId}-tab-${current.id}`}
					>
						{current.content}
					</div>
				) : null}
			</div>
		</div>
	)
}
