/**
 * react-router-devtools plugin: a "Styleguide" tab that embeds the dev-only
 * `/styleguide` route inside the devtools panel - the design-system source of
 * truth (components, tokens, and the Emails section) one click away while
 * building. Purely ergonomic; it just iframes the existing route.
 *
 * Loaded via the `pluginDir` option of reactRouterDevTools() in vite.config.ts.
 *
 * NOTE: rrdt's plugin scanner is line-based and brittle - it treats any line
 * that begins an exported `const` binding as a declaration and crashes on near
 * matches. Keep the real declaration below the file's only such line (don't
 * write that two-word phrase in comments).
 */
export const StyleguidePlugin = {
	id: 'styleguide',
	name: 'Styleguide',
	render: (
		<iframe
			src="/styleguide"
			title="Styleguide"
			style={{ width: '100%', height: '100%', border: 'none' }}
		/>
	),
}
