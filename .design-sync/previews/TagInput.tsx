// Owned preview — mirrors the `tag-input` specimen: the resolve-or-create
// multi-select empty (placeholder visible; focus + type to open the suggestion
// menu with its "Create «query»" row) and populated (each tag a removable chip
// on --secondary). Suggestions are inert sample names here; in the editor they
// come from the existing tag registry.
import { TagInput } from 'epic-stack-template'

export const Empty = () => (
	<TagInput aria-label="Tags (empty)" suggestions={['React', 'Remix', 'CSS']} />
)

export const WithChips = () => (
	<TagInput
		aria-label="Tags (with chips)"
		defaultValue={['React', 'TypeScript']}
		suggestions={['React', 'Remix', 'CSS', 'TypeScript']}
	/>
)
