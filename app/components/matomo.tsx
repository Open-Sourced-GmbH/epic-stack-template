import { useEffect } from 'react'

declare global {
	interface Window {
		_paq?: Array<unknown[]>
	}
}

export function Matomo({ url, siteId }: { url: string; siteId: string }) {
	useEffect(() => {
		const paq = (window._paq = window._paq ?? [])
		paq.push(['trackPageView'])
		paq.push(['enableLinkTracking'])
		const baseUrl = url.replace(/\/?$/, '/')
		paq.push(['setTrackerUrl', `${baseUrl}matomo.php`])
		paq.push(['setSiteId', siteId])
		const script = document.createElement('script')
		script.async = true
		script.src = `${baseUrl}matomo.js`
		const first = document.getElementsByTagName('script')[0]
		first?.parentNode?.insertBefore(script, first)
	}, [url, siteId])
	return null
}
