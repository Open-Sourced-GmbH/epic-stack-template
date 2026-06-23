// Owned preview — mirrors the `table` specimen (the branded data table both
// admin lists converge onto: populated with selection + status pills + a ⋯ row
// menu + a footer pager / empty / loading).
import {
	Badge,
	Button,
	DropdownMenuItem,
	Pagination,
	Table,
} from 'epic-stack-template'

type Post = {
	id: string
	title: string
	monogram: string
	status: 'published' | 'draft'
	updated: string
}

const posts: Post[] = [
	{ id: '1', title: 'Shipping the Pine design system', monogram: 'S', status: 'published', updated: '2h ago' },
	{ id: '2', title: 'Notes on grounded design', monogram: 'N', status: 'draft', updated: 'Yesterday' },
	{ id: '3', title: 'Building on the Epic Stack', monogram: 'B', status: 'published', updated: '3d ago' },
]

// A static view of the selection contract (one row selected) so the preview
// renders the brand left bar + indeterminate header without interaction.
const selection = {
	isSelected: (id: string) => id === '1',
	toggle: () => {},
	toggleAll: () => {},
	allSelected: false,
	someSelected: true,
}

function Monogram({ children }: { children: string }) {
	return (
		<span className="bg-brand-soft text-brand flex size-8 items-center justify-center rounded-lg text-body-sm font-semibold">
			{children}
		</span>
	)
}

const columns = [
	{
		key: 'title',
		header: 'Post',
		cell: (post: Post) => (
			<div className="flex items-center gap-3">
				<Monogram>{post.monogram}</Monogram>
				<span className="font-medium">{post.title}</span>
			</div>
		),
	},
	{
		key: 'status',
		header: 'Status',
		cell: (post: Post) =>
			post.status === 'published' ? (
				<Badge variant="brand" dot>
					Published
				</Badge>
			) : (
				<Badge variant="secondary" dot>
					Draft
				</Badge>
			),
	},
	{
		key: 'updated',
		header: 'Updated',
		cell: (post: Post) => post.updated,
		className: 'text-muted-foreground text-body-sm',
	},
]

export const Populated = () => (
	<div className="w-full max-w-3xl">
		<Table
			aria-label="Posts"
			columns={columns}
			data={posts}
			getRowId={(post) => post.id}
			columnTemplate="1fr auto auto"
			selection={selection}
			getRowLabel={(post) => post.title}
			rowActions={(post) => (
				<>
					<DropdownMenuItem>Edit</DropdownMenuItem>
					<DropdownMenuItem>Copy link</DropdownMenuItem>
					<DropdownMenuItem>Delete {post.title}</DropdownMenuItem>
				</>
			)}
			getRowActionsLabel={(post) => `Actions for ${post.title}`}
			footer={
				<Pagination page={1} pageCount={4} getPageHref={(p) => `#page-${p}`} />
			}
		/>
	</div>
)

export const Empty = () => (
	<div className="w-full max-w-3xl">
		<Table
			aria-label="Posts"
			columns={columns}
			data={[]}
			getRowId={(post) => post.id}
			columnTemplate="1fr auto auto"
			emptyState={{
				icon: (
					<svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
						<path
							d="M4 5h16M4 12h16M4 19h10"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							fill="none"
						/>
					</svg>
				),
				title: 'No posts yet',
				description: 'Draft your first post and it will appear here.',
				action: <Button>New post</Button>,
			}}
		/>
	</div>
)

export const Loading = () => (
	<div className="w-full max-w-3xl">
		<Table
			aria-label="Posts"
			columns={columns}
			data={[]}
			getRowId={(post) => post.id}
			columnTemplate="1fr auto auto"
			loading
			loadingRows={3}
		/>
	</div>
)
