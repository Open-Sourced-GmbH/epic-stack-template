import { expect, test } from 'vitest'
import { getAccent } from '#app/utils/accent.server.ts'
import { ACCENT_LIGHT_MAX } from '#app/utils/accent.ts'
import { action } from './accent.tsx'

/** POST form fields to the accent action and return the resulting Response. */
async function post(fields: Record<string, string>) {
	const request = new Request('https://example.com/resources/accent', {
		method: 'POST',
		body: new URLSearchParams(fields),
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
	})
	return (await action({ request } as any)) as Response
}

/** Read back the prefs the action persisted via its Set-Cookie header. */
function persisted(response: Response) {
	const setCookie = response.headers.get('set-cookie')!
	const pair = setCookie.split(';')[0]!
	return getAccent(new Request('https://example.com', { headers: { cookie: pair } }))
}

test('persists a custom accent from explicit l/c/h slider values', async () => {
	const res = await post({ l: '52', c: '0.2', h: '300', redirectTo: '/' })
	expect(persisted(res)?.accent).toEqual({ l: 52, c: 0.2, h: 300 })
})

test('clamps an out-of-band custom Light into the safe band', async () => {
	const res = await post({ l: '95', c: '0.1', h: '200', redirectTo: '/' })
	expect(persisted(res)?.accent.l).toBe(ACCENT_LIGHT_MAX)
})

test('a cursor-only change preserves the existing accent', async () => {
	// Seed a non-default accent, then flip only the cursor.
	const seeded = await post({ l: '50', c: '0.12', h: '120', redirectTo: '/' })
	const cookiePair = seeded.headers.get('set-cookie')!.split(';')[0]!
	const request = new Request('https://example.com/resources/accent', {
		method: 'POST',
		body: new URLSearchParams({ cursor: 'pointer', redirectTo: '/' }),
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			cookie: cookiePair,
		},
	})
	const res = (await action({ request } as any)) as Response
	const prefs = persisted(res)
	expect(prefs?.cursor).toBe('pointer')
	expect(prefs?.accent).toEqual({ l: 50, c: 0.12, h: 120 })
})

test('still applies a named preset by id (backward compatible)', async () => {
	const res = await post({ presetId: 'iris', redirectTo: '/' })
	// Iris from the preset table.
	expect(persisted(res)?.accent).toEqual({ l: 56, c: 0.16, h: 280 })
})
