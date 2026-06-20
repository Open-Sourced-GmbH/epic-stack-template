import { expect, test } from 'vitest'
import { buildImageKey } from './storage.server.ts'

function imageFile(name: string) {
	return new File(['x'], name, { type: 'image/png' })
}

test('a profile image key is scoped under its user', () => {
	const key = buildImageKey(
		{ kind: 'profile', userId: 'user123' },
		imageFile('avatar.png'),
	)
	expect(key.startsWith('users/user123/profile-images/')).toBe(true)
	expect(key.endsWith('.png')).toBe(true)
})

test('a post image key is scoped under its author and post', () => {
	const key = buildImageKey(
		{ kind: 'post', userId: 'user123', postId: 'post456' },
		imageFile('diagram.jpg'),
	)
	expect(key.startsWith('users/user123/posts/post456/images/')).toBe(true)
	expect(key.endsWith('.jpg')).toBe(true)
})

test('the key keeps only the final extension segment', () => {
	const key = buildImageKey(
		{ kind: 'profile', userId: 'user123' },
		imageFile('photo.final.png'),
	)
	expect(key.endsWith('.png')).toBe(true)
})

test('two uploads of the same file get distinct keys', () => {
	const file = imageFile('avatar.png')
	const target = { kind: 'profile', userId: 'user123' } as const
	expect(buildImageKey(target, file)).not.toBe(buildImageKey(target, file))
})
