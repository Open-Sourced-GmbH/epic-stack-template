import { RouterContextProvider } from 'react-router'
import { expect, test } from 'vitest'
import {
	getSessionCookieFor,
	makeAdmin,
	makeReader,
} from '#tests/post-admin-utils.ts'
import { BASE_URL } from '#tests/utils.ts'
import { action } from './preview-markdown.tsx'

async function callAction(userId: string | null, body: string) {
	const headers: HeadersInit = {}
	if (userId) headers.cookie = await getSessionCookieFor(userId)
	const request = new Request(`${BASE_URL}/resources/preview-markdown`, {
		method: 'POST',
		headers,
		body: new URLSearchParams({ body }),
	})
	return action({
		request,
		params: {},
		context: new RouterContextProvider(),
		url: new URL(request.url),
		pattern: '/resources/preview-markdown',
	})
}

test('renders author Markdown through the shared sanitising pipeline', async () => {
	const admin = await makeAdmin()
	const result = await callAction(
		admin.id,
		['# Title', '', '<script>alert(1)</script>', '', 'safe body'].join('\n'),
	)

	if (result instanceof Response) throw new Error('expected a data() result')
	// Same renderer as the public article (renderPostBody): GFM heading in,
	// dangerous HTML stripped, benign prose preserved.
	expect(result.data.html).toContain('<h1>Title</h1>')
	expect(result.data.html).not.toContain('<script>')
	expect(result.data.html).toContain('safe body')
})

test('refuses a non-admin (reader) with a 403', async () => {
	const reader = await makeReader()
	const thrown = await callAction(reader.id, '# nope').catch(
		(error: unknown) => error,
	)
	const status =
		thrown instanceof Response
			? thrown.status
			: (thrown as { init?: ResponseInit }).init?.status
	expect(status).toBe(403)
})
