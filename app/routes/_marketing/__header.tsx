import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { cn } from '#app/utils/misc.tsx'

/**
 * In-page sections the nav links to. Each `id` is both the anchor target and the
 * scrollspy observation target, so the section stubs in the landing shell must
 * render elements with matching ids.
 */
export const navSections = [
	{ id: 'work', label: 'Work' },
	{ id: 'services', label: 'Services' },
	{ id: 'pricing', label: 'Pricing' },
	{ id: 'faq', label: 'FAQ' },
] as const

/**
 * Sticky, blurred marketing header. A bottom border appears once the page is
 * scrolled, and the nav link for the section currently in view is marked active
 * (scrollspy). Both effects are progressive enhancement — the resting state
 * renders server-side, so SSR and reduced-JS clients still get a usable header.
 *
 * `themeSwitch` is a slot so the shell can pass the real cookie-backed
 * `ThemeSwitch` while tests render a lightweight stand-in.
 */
export function MarketingHeader({
	themeSwitch,
}: {
	themeSwitch?: React.ReactNode
}) {
	const [scrolled, setScrolled] = useState(false)
	const [activeId, setActiveId] = useState<string | null>(null)

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8)
		onScroll()
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		if (typeof IntersectionObserver === 'undefined') return
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) setActiveId(entry.target.id)
				}
			},
			{ rootMargin: '-50% 0px -50% 0px' },
		)
		for (const { id } of navSections) {
			const el = document.getElementById(id)
			if (el) observer.observe(el)
		}
		return () => observer.disconnect()
	}, [])

	return (
		<header
			className={cn(
				'bg-background/80 sticky top-0 z-40 backdrop-blur transition-colors',
				scrolled
					? 'border-border border-b'
					: 'border-b border-transparent',
			)}
		>
			<nav
				aria-label="Primary"
				className="container flex h-16 items-center justify-between gap-8"
			>
				<Link
					to="/"
					className="group grid leading-snug"
					aria-label="Open Sourced home"
				>
					<span className="font-light transition group-hover:-translate-x-1">
						open
					</span>
					<span className="font-bold transition group-hover:translate-x-1">
						sourced
					</span>
				</Link>

				<ul className="hidden items-center gap-8 md:flex">
					{navSections.map((section) => {
						const isActive = activeId === section.id
						return (
							<li key={section.id}>
								<a
									href={`#${section.id}`}
									aria-current={isActive ? 'true' : undefined}
									className={cn(
										'after:bg-brand hover:text-brand relative py-1 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform hover:after:scale-x-100',
										isActive
											? 'text-brand after:scale-x-100'
											: 'text-muted-foreground after:scale-x-0',
									)}
								>
									{section.label}
								</a>
							</li>
						)
					})}
				</ul>

				<div className="flex items-center gap-2">
					{themeSwitch}
					<Button asChild size="sm">
						<a href="#contact">Start a project</a>
					</Button>
				</div>
			</nav>
		</header>
	)
}
