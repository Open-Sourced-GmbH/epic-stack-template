import { prisma } from '#app/utils/db.server.ts'
import { MOCK_CODE_GITHUB } from '#app/utils/providers/constants.ts'
import {
	getPermissionMatrix,
	roleGrantedAccess,
	roleNames,
} from '#app/utils/user.ts'
import { createPassword, createUser, getUserImages } from '#tests/db-utils.ts'
import { insertGitHubUser } from '#tests/mocks/github.ts'

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

	// Placeholder posts proving the Post pipeline seeds — one Published, one
	// Draft, under a shared Tag. Rich sample content (code blocks, cover images)
	// lands in the seed slice once the render pipeline exists (EPT-44).
	const announcements = await prisma.tag.create({
		select: { id: true },
		data: { name: 'Announcements', slug: 'announcements' },
	})

	await prisma.post.create({
		data: {
			title: 'Hello, world',
			slug: 'hello-world',
			body: '# Hello, world\n\nThis is a placeholder post seeded with the Post domain foundation. Real sample content lands once the Markdown render pipeline exists.',
			excerpt: 'The first placeholder post, proving the public feed renders.',
			publishedAt: new Date(),
			authorId: kody.id,
			tags: { connect: { id: announcements.id } },
		},
	})

	await prisma.post.create({
		data: {
			title: 'A work in progress',
			slug: 'a-work-in-progress',
			body: 'This Draft is still being written, so it never appears on the public feed.',
			authorId: kody.id,
		},
	})

	console.timeEnd(`🐨 Created admin user "kody"`)

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
