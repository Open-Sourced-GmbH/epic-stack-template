import { expect, test } from 'vitest'
import { getAccent, setAccent } from './accent.server.ts'
import { type AccentPrefs } from './accent.ts'

function requestWith(setCookie: string) {
	// A Set-Cookie header is `name=value; attrs…`; the Cookie request header is
	// just the `name=value` pair, so strip the attributes.
	const pair = setCookie.split(';')[0]!
	return new Request('https://example.com', { headers: { cookie: pair } })
}

test('setAccent → getAccent round-trips through a request', () => {
	const prefs: AccentPrefs = {
		accent: { l: 60, c: 0.135, h: 172 },
		cursor: 'pointer',
	}
	const parsed = getAccent(requestWith(setAccent(prefs)))
	expect(parsed).toEqual(prefs)
})

test('getAccent returns null when the cookie is absent', () => {
	expect(getAccent(new Request('https://example.com'))).toBeNull()
})

test('setAccent(null) emits a clearing cookie', () => {
	expect(setAccent(null)).toContain('en_accent=;')
})
