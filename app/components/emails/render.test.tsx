import { expect, test } from 'vitest'
import {
	listEmailTemplates,
	renderEmailTemplate,
} from '#app/utils/email-preview.server.tsx'
import { emailColors } from './email-theme.generated.ts'

/**
 * Every registered template must render through the shared `EmailLayout`, which
 * means its HTML carries the design-token colours (inline) and the brand chrome.
 * This guards both the layout wiring and the token projection end to end.
 */
test.each(listEmailTemplates())(
	'renders $name through EmailLayout',
	async ({ name }) => {
		const html = await renderEmailTemplate(name)
		expect(html).not.toBeNull()
		expect(html).toContain('Epic Notes')
		// design-token colour is inlined by the layout chrome
		expect(html!.toLowerCase()).toContain(emailColors.foreground)
	},
)
