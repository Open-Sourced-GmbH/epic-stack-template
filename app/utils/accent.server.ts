import * as cookie from 'cookie'
import {
	type AccentPrefs,
	parseAccentPrefs,
	serializeAccentPrefs,
} from './accent.ts'

const cookieName = 'en_accent'

/**
 * Read the accent preferences from the `en_accent` cookie, mirroring
 * `theme.server.ts`. Returns `null` when unset or malformed so the caller falls
 * back to the default accent.
 */
export function getAccent(request: Request): AccentPrefs | null {
	const cookieHeader = request.headers.get('cookie')
	const value = cookieHeader ? cookie.parse(cookieHeader)[cookieName] : undefined
	return parseAccentPrefs(value)
}

/**
 * Build the `Set-Cookie` header that persists the accent for a year (mirrors
 * `setTheme`). Passing `null` clears the cookie, reverting to the default.
 */
export function setAccent(prefs: AccentPrefs | null) {
	if (!prefs) {
		return cookie.serialize(cookieName, '', { path: '/', maxAge: -1 })
	}
	return cookie.serialize(cookieName, serializeAccentPrefs(prefs), {
		path: '/',
		maxAge: 31536000,
	})
}
