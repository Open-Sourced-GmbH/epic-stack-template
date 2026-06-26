import { useEffect, useState } from 'react'
import { Icon } from '#app/components/ui/icon.tsx'
import { cn } from '#app/utils/misc.tsx'

/**
 * A single highlighted token. `kind` selects a colour from the scoped syntax
 * palette below; an undefined `kind` renders in the base `--code-text` colour.
 */
export type CodeToken = { text: string; kind?: TokenKind }
export type TokenKind = 'keyword' | 'string' | 'tag' | 'attr' | 'punc' | 'comment'
/** One line of source, as an ordered list of tokens. */
export type CodeLine = CodeToken[]

/**
 * Scoped code-syntax palette — deliberately NOT foundational tokens (no ADR, not
 * in the global token table). It lives with this component and stays dark in both
 * light and dark themes, because a code surface reads best on a dark ground. The
 * vars are set on the surface container; each token span reads its `--tk-*`
 * colour by kind via an inline `color` style, and carries `data-token` for it.
 */
const CODE_PALETTE = {
	'--code-bg': 'oklch(0.21 0.015 264)',
	'--code-text': 'oklch(0.9 0.015 264)',
	'--tk-keyword': 'oklch(0.78 0.13 12)',
	'--tk-string': 'oklch(0.83 0.13 150)',
	'--tk-tag': 'oklch(0.78 0.12 230)',
	'--tk-attr': 'oklch(0.84 0.13 80)',
	'--tk-punc': 'oklch(0.7 0.02 264)',
	'--tk-comment': 'oklch(0.6 0.025 264)',
} as React.CSSProperties

const COPIED_RESET_MS = 1600

/**
 * Static, pre-tokenised code surface with a copy button — the left half of the
 * proof-of-craft section. Highlighting is authored (the `lines` tokens), not
 * computed, so there is no parser dependency. The copy button copies the joined
 * raw source and shows "Copied" for {@link COPIED_RESET_MS} before resetting.
 */
export function CodeBlock({
	lines,
	filename,
	className,
}: {
	lines: CodeLine[]
	filename?: string
	className?: string
}) {
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		if (!copied) return
		const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS)
		return () => clearTimeout(timer)
	}, [copied])

	async function copy() {
		const source = lines
			.map((line) => line.map((token) => token.text).join(''))
			.join('\n')
		await navigator.clipboard.writeText(source)
		setCopied(true)
	}

	return (
		<div
			style={CODE_PALETTE}
			className={cn(
				'group relative overflow-hidden rounded-xl border border-white/10 [background:var(--code-bg)] [color:var(--code-text)]',
				className,
			)}
		>
			<div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
				<span className="font-mono text-body-2xs text-[color:var(--tk-punc)]">
					{filename ?? 'example.tsx'}
				</span>
				<button
					type="button"
					onClick={copy}
					className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-body-2xs font-medium text-[color:var(--code-text)]/80 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-hidden"
				>
					{copied ? (
						<>
							<Icon name="check" aria-hidden />
							Copied
						</>
					) : (
						'Copy'
					)}
				</button>
			</div>

			<pre className="overflow-x-auto p-4 text-body-xs leading-relaxed">
				<code className="font-mono">
					{lines.map((line, i) => (
						<span key={i} className="block">
							{line.map((token, j) => (
								<span
									key={j}
									data-token={token.kind}
									style={
										token.kind ? { color: `var(--tk-${token.kind})` } : undefined
									}
								>
									{token.text}
								</span>
							))}
						</span>
					))}
				</code>
			</pre>
		</div>
	)
}
