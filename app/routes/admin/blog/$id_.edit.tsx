import { invariantResponse } from '@epic-web/invariant'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { PostEditor } from './+shared/post-editor.tsx'
import { type Route } from './+types/$id_.edit.ts'

export { action } from './+shared/post-editor.server.tsx'

export async function loader({ params, request }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'update:post:any')
	const post = await prisma.post.findUnique({
		where: { id: params.id },
		select: { id: true, title: true, slug: true, excerpt: true, body: true },
	})
	invariantResponse(post, 'Not found', { status: 404 })
	return { post }
}

export default function EditPost({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	return <PostEditor post={loaderData.post} actionData={actionData} />
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No post with the id "{params.id}" exists</p>
				),
			}}
		/>
	)
}
