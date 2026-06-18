/**
 * Cloudflare Turnstile verification — the JS-capable counterpart to the
 * honeypot (see honeypot.server.ts). The honeypot stops naive bots; Turnstile
 * challenges the ones that execute scripts. Signup is the highest-value abuse
 * target (account creation), so it's the one form that runs this check.
 *
 * The feature is opt-in: with no TURNSTILE_SECRET_KEY configured (dev, tests,
 * or a deploy that hasn't enabled it) `checkTurnstile` is a no-op, exactly like
 * the widget not rendering when TURNSTILE_SITE_KEY is unset.
 */

// The Turnstile widget injects its token into the form under this field name.
const TOKEN_FIELD = 'cf-turnstile-response'
const SITEVERIFY_URL =
	'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function checkTurnstile(formData: FormData, request: Request) {
	const secret = process.env.TURNSTILE_SECRET_KEY
	// Not configured → feature disabled, nothing to verify.
	if (!secret) return

	const token = formData.get(TOKEN_FIELD)
	if (typeof token !== 'string' || token.length === 0) {
		throw new Response('Bot challenge missing', { status: 400 })
	}

	const body = new FormData()
	body.append('secret', secret)
	body.append('response', token)
	// Cloudflare uses the remote IP as an additional signal. We send the same
	// non-spoofable client IP the proxy gives us (see server/index.ts trust proxy).
	const remoteIp =
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
	if (remoteIp) body.append('remoteip', remoteIp)

	let outcome: { success?: boolean } = {}
	try {
		const response = await fetch(SITEVERIFY_URL, {
			method: 'POST',
			body,
			signal: AbortSignal.timeout(3000),
		})
		outcome = (await response.json()) as { success?: boolean }
	} catch {
		// Fail closed: if we can't verify the challenge, reject the submission.
		throw new Response('Bot challenge could not be verified', { status: 400 })
	}

	if (!outcome.success) {
		throw new Response('Bot challenge failed', { status: 400 })
	}
}
