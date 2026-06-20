import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { getAllTagNames } from '#app/utils/tag.server.ts'
import { PostEditor } from './+shared/post-editor.tsx'
import { type Route } from './+types/new.ts'

export { action } from './+shared/post-editor.server.tsx'

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'create:post:any')
	return { suggestions: await getAllTagNames() }
}

export default function NewPost({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	return (
		<PostEditor suggestions={loaderData.suggestions} actionData={actionData} />
	)
}
