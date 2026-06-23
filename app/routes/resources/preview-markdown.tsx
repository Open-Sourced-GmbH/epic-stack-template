import { data } from 'react-router'
import { z } from 'zod'
import { renderPostBody } from '#app/utils/markdown.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/preview-markdown.ts'

// Mirror the editor's body cap (`PostEditorSchema`) — an over-long body is
// simply not previewed rather than erroring the keystroke.
const PreviewSchema = z.object({ body: z.string().max(50_000) })

/**
 * Server-render the editor's draft body to the **same** safe HTML the public
 * article ships (`renderPostBody`, ADR 063), so an author's live preview can
 * never diverge from what readers get. The editor posts the body here (debounced)
 * and drops the returned `html` into its `.prose` preview pane.
 *
 * Authoring-only: previewing renders arbitrary author Markdown server-side, so
 * it's gated behind the same `post` permission the editor requires. Admins — the
 * only authors — hold `create:post:any` whether drafting or editing.
 */
export async function action({ request }: Route.ActionArgs) {
	await requireUserWithPermission(request, 'create:post:any')
	const formData = await request.formData()
	const parsed = PreviewSchema.safeParse({ body: formData.get('body') })
	const html = parsed.success ? await renderPostBody(parsed.data.body) : ''
	return data({ html })
}
