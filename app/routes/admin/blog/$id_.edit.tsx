import { invariantResponse } from '@epic-web/invariant'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithPermission } from '#app/utils/permissions.server.ts'
import { getAllTagNames } from '#app/utils/tag.server.ts'
import { PostEditor } from './+shared/post-editor.tsx'
import { type Route } from './+types/$id_.edit.ts'

export { action } from './+shared/post-editor.server.tsx'

export async function loader({ params, request }: Route.LoaderArgs) {
	await requireUserWithPermission(request, 'update:post:any')
	// The post and the suggestion list are independent reads — fire them together.
	const [post, suggestions] = await Promise.all([
		prisma.post.findUnique({
			where: { id: params.id },
			select: {
				id: true,
				title: true,
				slug: true,
				excerpt: true,
				body: true,
				tags: { select: { name: true }, orderBy: { name: 'asc' } },
			},
		}),
		getAllTagNames(),
	])
	invariantResponse(post, 'Not found', { status: 404 })
	return {
		post: { ...post, tags: post.tags.map((tag) => tag.name) },
		suggestions,
	}
}

export default function EditPost({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	return (
		<PostEditor
			post={loaderData.post}
			suggestions={loaderData.suggestions}
			actionData={actionData}
		/>
	)
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
