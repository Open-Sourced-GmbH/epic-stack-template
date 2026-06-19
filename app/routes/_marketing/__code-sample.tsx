import { useId, useRef, useState } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import { Checkbox } from '#app/components/ui/checkbox.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { CodeBlock, type CodeLine } from './__code-block.tsx'
import { useReveal } from './__use-reveal.ts'

/**
 * Authored, pre-tokenised source for the left half. It mirrors the live sign-in
 * card on the right — the whole point of the section is that the code you read is
 * the code that runs. Highlighting is hand-authored token spans, not a parser.
 */
const SOURCE: CodeLine[] = [
	[
		{ text: 'function', kind: 'keyword' },
		{ text: ' ' },
		{ text: 'SignInCard', kind: 'tag' },
		{ text: '() {' },
	],
	[{ text: '  return (' }],
	[
		{ text: '    <' },
		{ text: 'form', kind: 'tag' },
		{ text: ' ' },
		{ text: 'className', kind: 'attr' },
		{ text: '=' },
		{ text: '"grid gap-4"', kind: 'string' },
		{ text: '>' },
	],
	[
		{ text: '      <' },
		{ text: 'Label', kind: 'tag' },
		{ text: '>' },
		{ text: 'Email' },
		{ text: '</' },
		{ text: 'Label', kind: 'tag' },
		{ text: '>' },
	],
	[
		{ text: '      <' },
		{ text: 'Input', kind: 'tag' },
		{ text: ' ' },
		{ text: 'type', kind: 'attr' },
		{ text: '=' },
		{ text: '"email"', kind: 'string' },
		{ text: ' />' },
	],
	[
		{ text: '      <' },
		{ text: 'Checkbox', kind: 'tag' },
		{ text: ' ' },
		{ text: 'onCheckedChange', kind: 'attr' },
		{ text: '=' },
		{ text: '{setRemember}' },
		{ text: ' />' },
	],
	[
		{ text: '      <' },
		{ text: 'Button', kind: 'tag' },
		{ text: '>' },
		{ text: 'Sign in' },
		{ text: '</' },
		{ text: 'Button', kind: 'tag' },
		{ text: '>' },
	],
	[{ text: '    </' }, { text: 'form', kind: 'tag' }, { text: '>' }],
	[{ text: '  )' }],
	[{ text: '}' }],
]

/** The live sign-in card — composed from the real Foundation components. */
function SignInCard() {
	const emailId = useId()
	const passwordId = useId()
	const rememberId = useId()
	const [remember, setRemember] = useState(false)

	return (
		<form
			className="bg-card text-card-foreground border-border grid gap-4 rounded-xl border p-6"
			onSubmit={(event) => event.preventDefault()}
		>
			<div className="grid gap-1.5">
				<Label htmlFor={emailId}>Email</Label>
				<Input id={emailId} type="email" placeholder="you@studio.com" />
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor={passwordId}>Password</Label>
				<Input id={passwordId} type="password" placeholder="••••••••" />
			</div>
			<div className="flex items-center gap-2">
				<Checkbox
					id={rememberId}
					checked={remember}
					onCheckedChange={(value) => setRemember(value === true)}
				/>
				<Label htmlFor={rememberId} className="font-normal">
					Remember me
				</Label>
			</div>
			<Button type="submit" className="mt-2 w-full">
				Sign in
			</Button>
		</form>
	)
}

/**
 * Proof-of-craft section: the source on the left and the very same UI running
 * live on the right. The two halves stagger in on scroll-reveal (progressive
 * enhancement — the resting state renders server-side); the layout stacks below
 * the `lg` breakpoint (~900px). Tokens only, except CodeBlock's scoped palette.
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
				<p className="text-brand text-sm font-semibold tracking-wide uppercase">
					Proof of craft
				</p>
				<h2
					id="code-sample-heading"
					className="mt-3 text-3xl font-semibold tracking-tight text-balance"
				>
					The code is the product
				</h2>
				<p className="text-muted-foreground mt-4 text-pretty">
					What you read on the left is what runs on the right — the same design
					system components, no mockups.
				</p>
			</div>

			<div className="mx-auto mt-16 grid max-w-5xl items-center gap-8 min-[900px]:grid-cols-2">
				<div data-reveal>
					<CodeBlock filename="sign-in-card.tsx" lines={SOURCE} />
				</div>
				<div data-reveal style={{ transitionDelay: '120ms' }}>
					<SignInCard />
				</div>
			</div>
		</section>
	)
}
