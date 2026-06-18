import {
	specimens,
	type Specimen,
} from '#app/components/styleguide/specimens.tsx'
import { type Route } from './+types/styleguide.ts'

/**
 * Living styleguide — the source of truth for the design system. It renders the
 * real `#app/components/ui/*` components and design tokens, so it can never
 * drift from what ships. `scripts/snapshot-styleguide.ts` snapshots this page
 * into the bundle published to Claude Design via `/design-sync`.
 *
 * Dev-only: the loader 404s in production so the page never ships to users.
 */
export async function loader(_: Route.LoaderArgs) {
	if (process.env.NODE_ENV === 'production') {
		throw new Response('Not found', { status: 404 })
	}
	return {}
}

export const meta: Route.MetaFunction = () => [{ title: 'Styleguide' }]

function groupOrder(items: Specimen[]) {
	const seen: string[] = []
	for (const s of items) if (!seen.includes(s.group)) seen.push(s.group)
	return seen
}

export default function Styleguide() {
	const groups = groupOrder(specimens)
	return (
		<main className="container py-12">
			<header className="mb-10">
				<h1 className="text-h2">Styleguide</h1>
				<p className="text-muted-foreground text-body-sm mt-2 max-w-prose">
					The design-system source of truth, rendered from the real components
					and tokens. Toggle the theme switch (bottom of the page) to review
					light and dark. Published to Claude Design with{' '}
					<code className="text-foreground">pnpm styleguide:snapshot</code> →{' '}
					<code className="text-foreground">/design-sync</code>.
				</p>
			</header>

			<div className="flex flex-col gap-14">
				{groups.map((group) => (
					<section key={group}>
						<h2 className="text-h5 border-border mb-6 border-b pb-2">
							{group}
						</h2>
						<div className="flex flex-col gap-8">
							{specimens
								.filter((s) => s.group === group)
								.map((s) => (
									<div key={s.name}>
										<div className="mb-3 flex items-baseline gap-3">
											<h3 className="text-body-sm font-medium">{s.name}</h3>
											{s.subtitle ? (
												<span className="text-muted-foreground text-body-2xs">
													{s.subtitle}
												</span>
											) : null}
										</div>
										<div
											data-specimen={s.name}
											data-group={s.group}
											data-subtitle={s.subtitle ?? ''}
											data-vw={s.viewport.width}
											data-vh={s.viewport.height ?? ''}
											className="border-border rounded-lg border p-6"
										>
											{s.render()}
										</div>
									</div>
								))}
						</div>
					</section>
				))}
			</div>
		</main>
	)
}
