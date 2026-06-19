/**
 * `cleanTokenSurface` — a pure string→string filter for the compiled Tailwind
 * stylesheet, run as it's copied into `.design-sync/styles.compiled.css`
 * (see `sync-design-css.ts`).
 *
 * The compiled CSS carries hundreds of Tailwind plumbing custom properties
 * (`--tw-*`) and utility-scoped locals alongside the ~two-dozen semantic design
 * tokens declared on `:root` / `.dark`. The design-sync extractor reads every
 * custom property to build the token surface Claude Design sees, so without a
 * filter that surface drowns the real tokens in noise. This drops every custom
 * property that is either (i) named `--tw-*` or (ii) declared under a selector
 * other than `:root` / `.dark` / `[data-…]` / `@theme`, leaving the semantic
 * tokens untouched.
 *
 * Pure by design: no React/DOM imports, so it's unit-testable in isolation.
 */
export function cleanTokenSurface(css: string): string {
	const src = stripComments(css)
	let out = ''
	let buf = ''
	/** Scope stack: true where the immediate enclosing selector is theme-scoped. */
	const themeStack: boolean[] = []
	/** >0 while inside a block dropped wholesale (e.g. `@property --tw-*`). */
	let dropDepth = 0
	let i = 0
	const n = src.length

	while (i < n) {
		const c = src[i]!

		// Copy string literals verbatim so braces/semicolons inside `content`
		// or `url()` can't desync the scanner.
		if (c === '"' || c === "'") {
			const start = i
			i++
			while (i < n && src[i] !== c) {
				if (src[i] === '\\') i++
				i++
			}
			i++
			buf += src.slice(start, i)
			continue
		}

		if (c === '{') {
			const prelude = buf
			buf = ''
			i++
			if (dropDepth > 0) {
				dropDepth++
				continue
			}
			if (isDropBlock(prelude)) {
				dropDepth = 1
				continue
			}
			out += prelude + '{'
			themeStack.push(isThemeScope(prelude))
			continue
		}

		if (c === '}') {
			i++
			if (dropDepth > 0) {
				dropDepth--
				buf = ''
				continue
			}
			out += emitDecl(buf, themeStack[themeStack.length - 1] ?? false)
			buf = ''
			themeStack.pop()
			out += '}'
			continue
		}

		if (c === ';') {
			i++
			if (dropDepth > 0) {
				buf = ''
				continue
			}
			out += emitDecl(buf + ';', themeStack[themeStack.length - 1] ?? false)
			buf = ''
			continue
		}

		buf += c
		i++
	}

	return out + buf
}

/** Strip CSS comments — they carry no tokens and complicate scanning. */
function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** A custom-property declaration survives only in a theme scope and only if it
 * isn't Tailwind plumbing; everything else is dropped. Non-declarations (normal
 * properties, whitespace) pass through untouched. */
function emitDecl(chunk: string, isTheme: boolean): string {
	const match = /^\s*(--[A-Za-z0-9_-]+)\s*:/.exec(chunk)
	if (!match) return chunk
	const name = match[1]!
	const keep = isTheme && !name.startsWith('--tw-')
	return keep ? chunk : ''
}

/** True when the immediate enclosing selector is a theme scope: `:root` /
 * `:host` / `.dark` / a `[data-…]` attribute selector, or an `@theme` block. */
function isThemeScope(prelude: string): boolean {
	const p = prelude.trim()
	if (/^@theme\b/.test(p)) return true
	const pieces = p.split(',').map((s) => s.trim()).filter(Boolean)
	if (pieces.length === 0) return false
	return pieces.every(isThemeSelector)
}

function isThemeSelector(piece: string): boolean {
	if (piece === ':root' || piece === ':host' || piece === '.dark') return true
	return /^\[data-[^\]]*\]$/.test(piece)
}

/** Tailwind emits `@property --tw-*` registration blocks; drop them whole. */
function isDropBlock(prelude: string): boolean {
	return /^\s*@property\s+--tw-/.test(prelude)
}
