import { Link } from 'react-router'
import { Logo } from '#app/components/logo.tsx'

type FooterLink =
	| { label: string; href: string }
	| { label: string; to: string }

const footerColumns: Array<{ heading: string; links: FooterLink[] }> = [
	{
		heading: 'Studio',
		links: [
			{ label: 'Work', href: '#work' },
			{ label: 'Services', href: '#services' },
			{ label: 'Pricing', href: '#pricing' },
		],
	},
	{
		heading: 'Resources',
		links: [
			{ label: 'FAQ', href: '#faq' },
			{ label: 'About', to: '/about' },
			{ label: 'Support', to: '/support' },
		],
	},
	{
		heading: 'Legal',
		links: [
			{ label: 'Privacy', to: '/privacy' },
			{ label: 'Terms', to: '/tos' },
		],
	},
]

function FooterLinkItem({ link }: { link: FooterLink }) {
	const className = 'text-muted-foreground hover:text-brand transition-colors'
	return 'to' in link ? (
		<Link to={link.to} className={className}>
			{link.label}
		</Link>
	) : (
		<a href={link.href} className={className}>
			{link.label}
		</a>
	)
}

/**
 * Branded marketing footer: a brand identity column plus nav / legal link
 * columns. Collapses to two columns under 820px (`sm`).
 */
export function MarketingFooter() {
	return (
		<footer className="border-border bg-background border-t">
			<div className="container grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
				<div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
					<Logo />
					<p className="text-muted-foreground text-body-xs text-pretty">
						Product engineering studio — design and ship production web apps.
					</p>
				</div>
				{footerColumns.map((column) => (
					<nav
						key={column.heading}
						aria-label={column.heading}
						className="flex flex-col gap-3 text-body-xs"
					>
						<h2 className="text-foreground/80 font-medium">{column.heading}</h2>
						<ul className="flex flex-col gap-2">
							{column.links.map((link) => (
								<li key={link.label}>
									<FooterLinkItem link={link} />
								</li>
							))}
						</ul>
					</nav>
				))}
			</div>
		</footer>
	)
}
