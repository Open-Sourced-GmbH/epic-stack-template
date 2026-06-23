// Owned preview — mirrors the `page-header` specimen (the one header pattern
// reused across the auth / settings / admin shells: eyebrow + title, with and
// without an actions slot).
import { Button, PageHeader } from 'epic-stack-template'

export const WithActions = () => (
	<div className="max-w-2xl">
		<PageHeader
			eyebrow="Admin"
			title="Blog"
			actions={
				<>
					<Button variant="outline">Preview</Button>
					<Button>New post</Button>
				</>
			}
		/>
	</div>
)

export const TitleOnly = () => (
	<div className="max-w-2xl">
		<PageHeader eyebrow="Account" title="Settings" />
	</div>
)
