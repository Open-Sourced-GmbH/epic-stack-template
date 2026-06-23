import { prisma } from '#app/utils/db.server.ts'
import { MOCK_CODE_GITHUB } from '#app/utils/providers/constants.ts'
import {
	getPermissionMatrix,
	roleGrantedAccess,
	roleNames,
} from '#app/utils/user.ts'
import { createPassword, createUser, getUserImages } from '#tests/db-utils.ts'
import { insertGitHubUser } from '#tests/mocks/github.ts'
import { samplePosts } from './sample-posts.ts'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🔑 Created permissions and roles...')
	// Derive the RBAC permission matrix and role grants from the vocabulary
	// registry (app/utils/user.ts), so the database rows cannot drift from it.
	// Idempotent: re-running the seed reconciles existing rows to the registry.
	for (const permission of getPermissionMatrix()) {
		await prisma.permission.upsert({
			where: {
				action_entity_access: {
					action: permission.action,
					entity: permission.entity,
					access: permission.access,
				},
			},
			create: permission,
			update: {},
		})
	}
	for (const name of roleNames) {
		const permissions = await prisma.permission.findMany({
			select: { id: true },
			where: { access: roleGrantedAccess[name] },
		})
		await prisma.role.upsert({
			where: { name },
			create: { name, permissions: { connect: permissions } },
			update: { permissions: { set: permissions } },
		})
	}
	console.timeEnd('🔑 Created permissions and roles...')

	const totalUsers = 5
	console.time(`👤 Created ${totalUsers} users...`)
	const userImages = await getUserImages()

	for (let index = 0; index < totalUsers; index++) {
		const userData = createUser()
		const user = await prisma.user.create({
			select: { id: true },
			data: {
				...userData,
				password: { create: createPassword(userData.username) },
				roles: { connect: { name: 'user' } },
			},
		})

		// Upload user profile image
		const userImage = userImages[index % userImages.length]
		if (userImage) {
			await prisma.userImage.create({
				data: {
					userId: user.id,
					objectKey: userImage.objectKey,
				},
			})
		}
	}
	console.timeEnd(`👤 Created ${totalUsers} users...`)

	console.time(`🐨 Created admin user "kody"`)

	const githubUser = await insertGitHubUser(MOCK_CODE_GITHUB)

	const kody = await prisma.user.create({
		select: { id: true },
		data: {
			email: 'kody@kcd.dev',
			username: 'kody',
			name: 'Kody',
			password: { create: createPassword('kodylovesyou') },
			connections: {
				create: {
					providerName: 'github',
					providerId: String(githubUser.profile.id),
				},
			},
			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})

	await prisma.userImage.create({
		data: {
			userId: kody.id,
			objectKey: 'user/kody.png',
		},
	})

	console.timeEnd(`🐨 Created admin user "kody"`)

	console.time(`📝 Created ${samplePosts.length} sample posts`)
	// Resolve-or-create each distinct tag up front (posts share tags, so creating
	// inline would hit the unique constraint), then create every post connecting
	// its tags by id. Covers are created as PostImages and singled out via
	// `coverImageId` — the same relations the real editor uses, no schema bypass.
	const tagIdBySlug = new Map<string, string>()
	for (const tag of samplePosts.flatMap((post) => post.tags)) {
		if (tagIdBySlug.has(tag.slug)) continue
		const row = await prisma.tag.upsert({
			select: { id: true },
			where: { slug: tag.slug },
			create: { name: tag.name, slug: tag.slug },
			update: { name: tag.name },
		})
		tagIdBySlug.set(tag.slug, row.id)
	}

	for (const post of samplePosts) {
		const created = await prisma.post.create({
			select: { id: true },
			data: {
				title: post.title,
				slug: post.slug,
				body: post.body,
				excerpt: post.excerpt ?? null,
				publishedAt: post.publishedAt,
				authorId: kody.id,
				tags: {
					connect: post.tags.map((tag) => ({ id: tagIdBySlug.get(tag.slug)! })),
				},
			},
		})

		// The cover is one of the post's own PostImages, singled out by
		// `coverImageId` — so create the image, then point the post at it.
		if (post.cover) {
			const image = await prisma.postImage.create({
				select: { id: true },
				data: {
					postId: created.id,
					objectKey: post.cover.objectKey,
					altText: post.cover.altText,
				},
			})
			await prisma.post.update({
				where: { id: created.id },
				data: { coverImageId: image.id },
			})
		}
	}
	console.timeEnd(`📝 Created ${samplePosts.length} sample posts`)

	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

// we're ok to import from the test directory in this file
/*
eslint
	no-restricted-imports: "off",
*/
