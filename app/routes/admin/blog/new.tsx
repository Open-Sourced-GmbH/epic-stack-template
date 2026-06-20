import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { PostEditor } from './+shared/post-editor.tsx'
import { type Route } from './+types/new.ts'

export { action } from './+shared/post-editor.server.tsx'

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'create:post:any')
	return {}
}

export default function NewPost({ actionData }: Route.ComponentProps) {
	return <PostEditor actionData={actionData} />
}
