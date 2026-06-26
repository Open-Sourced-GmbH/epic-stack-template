import { useId, useRef } from 'react'
import { useFetcher } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { type action } from '#app/routes/resources/honeypot-demo.tsx'
import { cn } from '#app/utils/misc.tsx'
import { CodeBlock, type CodeLine } from './__code-block.tsx'
import { useReveal } from './__use-reveal.ts'

/**
 * Authored, pre-tokenised source for the left half — the real honeypot wiring,
 * condensed: the hidden `<HoneypotInputs />` trap in the form and the
 * `honeypot.check()` guard in the action. It mirrors what the live form on the
 * right actually posts to `/resources/honeypot-demo`, so the code you read is the
 * code that runs. Highlighting is hand-authored token spans, not a parser.
 */
const SOURCE: CodeLine[] = [
	[
		{ text: '<' },
		{ text: 'Form', kind: 'tag' },
		{ text: ' ' },
		{ text: 'method', kind: 'attr' },
		{ text: '=' },
		{ text: '"POST"', kind: 'string' },
		{ text: '>' },
	],
	[
		{ text: '  <' },
		{ text: 'HoneypotInputs', kind: 'tag' },
		{ text: ' />' },
		{ text: '   // hidden trap — bots fill it, humans never see it', kind: 'comment' },
	],
	[
		{ text: '  <' },
		{ text: 'Input', kind: 'tag' },
		{ text: ' ' },
		{ text: 'name', kind: 'attr' },
		{ text: '=' },
		{ text: '"email"', kind: 'string' },
		{ text: ' />' },
	],
	[
		{ text: '  <' },
		{ text: 'Button', kind: 'tag' },
		{ text: '>' },
		{ text: 'Sign in' },
		{ text: '</' },
		{ text: 'Button', kind: 'tag' },
		{ text: '>' },
	],
	[{ text: '</' }, { text: 'Form', kind: 'tag' }, { text: '>' }],
	[{ text: ' ' }],
	[
		{ text: 'export', kind: 'keyword' },
		{ text: ' ' },
		{ text: 'async', kind: 'keyword' },
		{ text: ' ' },
		{ text: 'function', kind: 'keyword' },
		{ text: ' ' },
		{ text: 'action', kind: 'tag' },
		{ text: '({ request }) {' },
	],
	[
		{ text: '  ' },
		{ text: 'const', kind: 'keyword' },
		{ text: ' formData ' },
		{ text: '=' },
		{ text: ' ' },
		{ text: 'await', kind: 'keyword' },
		{ text: ' request.formData()' },
	],
	[
		{ text: '  ' },
		{ text: 'await', kind: 'keyword' },
		{ text: ' honeypot.check(formData)' },
		{ text: '   // throws SpamError if the trap was filled', kind: 'comment' },
	],
	[{ text: '}' }],
]

const BOT_TRAP_VALUE = 'https://buy-cheap-pills.example/now'

/**
 * The live half: the very same honeypot the auth forms use, posting to the real
 * `/resources/honeypot-demo` action. "Sign in" submits clean (the trap stays
 * empty) and passes; "Simulate bot" fills the hidden trap exactly like a spam bot
 * would, then submits the same form — so the server-enforced rejection is visible.
 */
function HoneypotDemo() {
	const emailId = useId()
	const formRef = useRef<HTMLFormElement>(null)
	const fetcher = useFetcher<typeof action>()
	const verdict = fetcher.data
	const pending = fetcher.state !== 'idle'

	/**
	 * Fill the hidden honeypot trap the way a form-stuffing bot would, then submit
	 * the same form. `fetcher.submit` serialises the form synchronously, so the
	 * trap is reset immediately afterwards to leave the form clean for the next try.
	 */
	function simulateBot() {
		const form = formRef.current
		if (!form) return
		const trap = form.querySelector<HTMLInputElement>('.__honeypot_inputs input')
		if (trap) trap.value = BOT_TRAP_VALUE
		void fetcher.submit(form)
		if (trap) trap.value = ''
	}

	return (
		<div className="bg-card text-card-foreground border-border grid gap-4 rounded-xl border p-6">
			<fetcher.Form
				ref={formRef}
				method="POST"
				action="/resources/honeypot-demo"
				className="grid gap-4"
			>
				<HoneypotInputs />
				<div className="grid gap-1.5">
					<Label htmlFor={emailId}>Email</Label>
					<Input
						id={emailId}
						name="email"
						type="email"
						placeholder="you@studio.com"
					/>
				</div>
				<div className="grid gap-2 sm:grid-cols-2">
					<Button type="submit" disabled={pending} className="w-full">
						Sign in
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={pending}
						onClick={simulateBot}
						className="w-full"
					>
						Simulate bot
					</Button>
				</div>
			</fetcher.Form>

			<Verdict pending={pending} verdict={verdict} />
		</div>
	)
}

/**
 * The server's ruling, announced politely for assistive tech. Idle until the
 * first submit; then a green pass or a red `SpamError` rejection carrying the 400
 * the action returned — proof the check ran on the server, not in the browser.
 */
function Verdict({
	pending,
	verdict,
}: {
	pending: boolean
	verdict: ReturnType<typeof useFetcher<typeof action>>['data']
}) {
	const accepted = verdict?.verdict === 'accepted'
	const rejected = verdict?.verdict === 'rejected'

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-body-xs',
				!verdict && 'text-muted-foreground border-dashed',
				accepted &&
					'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
				rejected &&
					'border-destructive/30 bg-destructive/10 text-destructive',
			)}
		>
			{pending ? (
				<>
					<Icon name="update" className="mt-0.5 animate-spin" aria-hidden />
					<span>Running honeypot.check() on the server…</span>
				</>
			) : accepted ? (
				<>
					<Icon name="check" className="mt-0.5" aria-hidden />
					<span>
						<strong className="font-semibold">Accepted</strong> — passed{' '}
						<code className="font-mono text-body-2xs">honeypot.check()</code>.
					</span>
				</>
			) : rejected ? (
				<>
					<Icon name="cross-1" className="mt-0.5" aria-hidden />
					<span>
						<strong className="font-semibold">Rejected (400)</strong> —{' '}
						<code className="font-mono text-body-2xs">SpamError</code>: {verdict.reason}
					</span>
				</>
			) : (
				<span>
					Submit to see the server&rsquo;s verdict. Try “Sign in”, then “Simulate
					bot”.
				</span>
			)}
		</div>
	)
}

/**
 * Proof-of-craft section: the real anti-spam honeypot source on the left and the
 * very same defense running live on the right. The two halves stagger in on
 * scroll-reveal (progressive enhancement — the resting state renders server-side);
 * the layout stacks below the `lg` breakpoint (~900px). Tokens only, except
 * CodeBlock's scoped palette.
 */
export function CodeSample() {
	const ref = useRef<HTMLElement>(null)
	useReveal(ref)

	return (
		<section
			id="code-sample"
			ref={ref}
			aria-labelledby="code-sample-heading"
			className="container scroll-mt-20 py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-brand text-body-xs font-semibold tracking-wide uppercase">
					Proof of craft
				</p>
				<h2
					id="code-sample-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					The code is the product
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					The same anti-spam honeypot that guards every auth form — running live.
					Read it on the left, then beat it on the right.
				</p>
			</div>

			<div className="mx-auto mt-16 grid max-w-5xl items-center gap-8 min-[900px]:grid-cols-2">
				<div data-reveal className="min-w-0">
					<CodeBlock filename="honeypot.tsx" lines={SOURCE} />
				</div>
				<div data-reveal style={{ transitionDelay: '120ms' }}>
					<HoneypotDemo />
				</div>
			</div>
		</section>
	)
}
