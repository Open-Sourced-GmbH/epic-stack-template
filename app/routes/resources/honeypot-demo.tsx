import { data } from 'react-router'
import { SpamError } from 'remix-utils/honeypot/server'
import { honeypot } from '#app/utils/honeypot.server.ts'
import { type Route } from './+types/honeypot-demo.ts'

/**
 * Verdict returned to the proof-of-craft honeypot demo. `accepted` means the
 * submission passed the real `honeypot.check()`; `rejected` carries the
 * `SpamError` reason so the UI can show *why* the request was dropped.
 */
export type HoneypotVerdict =
	| { verdict: 'accepted' }
	| { verdict: 'rejected'; reason: string }

/**
 * The same anti-spam guard the auth forms run, exposed as a resource route so the
 * landing's "code is the product" section can prove it end-to-end. It calls the
 * shared {@link honeypot} instance — no demo-only logic — and turns a `SpamError`
 * into a 400 verdict instead of re-throwing it as the auth `checkHoneypot` does,
 * so the fetcher gets data to render rather than an error boundary.
 */
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	try {
		await honeypot.check(formData)
	} catch (error) {
		if (error instanceof SpamError) {
			return data<HoneypotVerdict>(
				{ verdict: 'rejected', reason: error.message },
				{ status: 400 },
			)
		}
		throw error
	}
	return data<HoneypotVerdict>({ verdict: 'accepted' })
}
