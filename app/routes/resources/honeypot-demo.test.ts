import { expect, test } from 'vitest'
import { action } from './honeypot-demo.tsx'

/** Build a POST Request whose body is the given fields, as the demo form posts. */
function post(fields: Record<string, string>) {
	const formData = new FormData()
	for (const [key, value] of Object.entries(fields)) formData.set(key, value)
	return new Request('http://localhost/resources/honeypot-demo', {
		method: 'POST',
		body: formData,
	})
}

test('a clean submit passes the real honeypot.check()', async () => {
	// `data()` wraps the payload + response init; the framework serialises it at
	// the boundary and the fetcher receives `.data`, so assert on that shape here.
	const result = await action({
		request: post({ email: 'you@studio.com' }),
	} as Parameters<typeof action>[0])

	expect(result.init?.status ?? 200).toBe(200)
	expect(result.data).toEqual({ verdict: 'accepted' })
})

test('a filled trap is rejected with a 400 SpamError verdict', async () => {
	const result = await action({
		request: post({ email: 'bot@spam.example', name__confirm: 'filled' }),
	} as Parameters<typeof action>[0])

	expect(result.init?.status).toBe(400)
	expect(result.data).toMatchObject({ verdict: 'rejected' })
	expect((result.data as { reason: string }).reason).toMatch(/not empty/i)
})
