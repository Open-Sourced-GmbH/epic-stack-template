import { type Prisma } from '@prisma/client'

// The Note image projection, named once so the read loaders share one shape
// rather than each hand-writing `{ id, altText, objectKey }`. Adding a field to
// what a Note image exposes is then one edit.
export const noteImageSelect = {
	id: true,
	altText: true,
	objectKey: true,
} satisfies Prisma.NoteImageSelect
