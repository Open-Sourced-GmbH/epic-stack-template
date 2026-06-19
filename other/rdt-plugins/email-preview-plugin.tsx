/**
 * react-router-devtools plugin: an "Emails" tab that embeds the dev-only
 * email-preview route (`/resources/email-preview`) inside the devtools panel.
 *
 * Loaded via the `pluginDir` option of reactRouterDevTools() in vite.config.ts.
 * rrdt scans this directory for exported plugin objects and registers each as a
 * TanStack devtools plugin (dev-only - never bundled in production).
 *
 * NOTE: rrdt's plugin scanner is line-based and brittle - it treats any line
 * that begins an exported `const` binding as a declaration and crashes on near
 * matches. Keep the real declaration below the file's only such line (don't
 * write that two-word phrase in comments).
 */
export const EmailPreviewPlugin = {
	id: 'email-preview',
	name: 'Emails',
	render: (
		<iframe
			src="/resources/email-preview"
			title="Email preview"
			style={{ width: '100%', height: '100%', border: 'none' }}
		/>
	),
}
