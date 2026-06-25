/**
 * In-page sections the landing links to (footer sitemap + ⌘K palette). Each `id`
 * is both the anchor target and the scrollspy observation target, so the section
 * stubs in the landing must render elements with matching ids. Lives in its own
 * data module (not the retired marketing header) so the landing page and the
 * command palette share one source without re-introducing header chrome.
 */
export const navSections = [
	{ id: 'work', label: 'Work' },
	{ id: 'services', label: 'Services' },
	{ id: 'pricing', label: 'Pricing' },
	{ id: 'faq', label: 'FAQ' },
] as const
