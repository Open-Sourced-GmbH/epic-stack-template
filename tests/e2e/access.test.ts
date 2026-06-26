import { prisma } from '#app/utils/db.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'

/**
 * Acceptance e2e for the User & Role Management ("Access") feature
 * (PRD: user & rollen management; ADR-069 dynamic RBAC, ADR-070 audit).
 *
 * Encodes the high-value functional (F*) cases as durable regression coverage.
 * Runs against the dev server (`pnpm test:e2e:dev`) — never `start:mocks`.
 */

/** Sign in a fresh user and grant it the built-in `admin` role (full Access). */
async function loginAsAdmin(login: () => Promise<{ id: string }>) {
	const user = await login()
	await prisma.user.update({
		where: { id: user.id },
		data: { roles: { connect: { name: 'admin' } } },
	})
	return user
}

test('F1: an admin sees the Users list and can search it', async ({
	page,
	login,
	insertNewUser,
}) => {
	await loginAsAdmin(login)
	const unique = Date.now()
	const needle = await insertNewUser({ username: `findme${unique}` })

	await page.goto('/admin/users')

	// The managed Users table is present.
	await expect(page.getByRole('table', { name: 'Users' })).toBeVisible()

	// Searching by username narrows the list to the match.
	await page
		.getByRole('searchbox', { name: /search users by name or email/i })
		.fill(needle.username)
	await page.keyboard.press('Enter')
	await expect(page.getByText(needle.username)).toBeVisible()
})

test('F2: a non-manager is forbidden from the Access area', async ({
	page,
	login,
}) => {
	// `login()` grants only the built-in `user` role — no `*:user:any`.
	await login()
	const res = await page.goto('/admin/users')
	expect(res?.status()).toBe(403)
	// And the Access sidebar group is not offered to them anywhere.
	await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
})

test('F12/F13/F14: an admin creates a custom role and grants a permission via the matrix', async ({
	page,
	login,
}) => {
	await loginAsAdmin(login)

	// The roles list distinguishes built-in (System) from Custom roles.
	await page.goto('/admin/roles')
	const rolesTable = page.getByRole('table', { name: 'Roles' })
	await expect(rolesTable).toBeVisible()
	// Built-in roles carry the System marker (scope to the table — the theme
	// switch also has a hidden "System" option label).
	await expect(rolesTable.getByText('System').first()).toBeVisible()

	// Create a new custom role.
	const roleName = `editor-${Date.now()}`
	await page.getByRole('link', { name: /new role/i }).click()
	await page.waitForURL(/\/admin\/roles\/new$/)
	await page.getByRole('textbox', { name: 'Name', exact: true }).fill(roleName)

	// Grant a permission by toggling a matrix ToggleChip (off → on).
	const chip = page.getByRole('button', { name: /\(any\)/i }).first()
	await expect(chip).toHaveAttribute('aria-pressed', 'false')
	await chip.click()
	await expect(chip).toHaveAttribute('aria-pressed', 'true')

	await page.getByRole('button', { name: 'Create role', exact: true }).click()
	// Creating redirects to the new role's editor — wait for it so the submit
	// fully lands before we navigate away (else the goto aborts it).
	await page.waitForURL(/\/admin\/roles\/(?!new$)[^/]+$/)

	// The new role shows up on the list, marked Custom.
	await page.goto('/admin/roles')
	await expect(
		page.getByRole('table', { name: 'Roles' }).getByText(roleName),
	).toBeVisible()
})

test('F5/F33: deactivating a user blocks their sign-in with the suspended notice', async ({
	page,
	login,
	insertNewUser,
}) => {
	await loginAsAdmin(login)
	// A fresh target with a known password (the fixture otherwise defaults the
	// password to a *generated* username, not the one we pass).
	const username = `target${Date.now()}`
	const target = await insertNewUser({ username, password: username })

	// Drive the deactivation from the user-detail page.
	await page.goto(`/admin/users/${target.id}`)
	await page.getByRole('button', { name: /^deactivate$/i }).click()
	await expect(page.getByRole('button', { name: /^reactivate$/i })).toBeVisible()

	// The deactivated user can no longer sign in: the form is swapped for the
	// suspended notice (story 33) rather than a session.
	await page.context().clearCookies()
	await page.goto('/login')
	await page.getByRole('textbox', { name: /username/i }).fill(target.username)
	await page.getByLabel(/password/i).fill(target.username)
	await page.getByRole('button', { name: /^log in$/i }).click()
	await expect(
		page.getByRole('heading', { name: /this account is deactivated/i }),
	).toBeVisible()
	await expect(page.getByText(/access suspended/i)).toBeVisible()
})

test('F3: an admin can open a user’s detail from the Users list', async ({
	page,
	login,
	insertNewUser,
}) => {
	await loginAsAdmin(login)
	const target = await insertNewUser({ username: `open${Date.now()}` })

	await page.goto('/admin/users')
	// Narrow to the target so its row is the only data row, regardless of how many
	// other accounts exist (search filters by name/email — both rendered).
	await page
		.getByRole('searchbox', { name: /search users by name or email/i })
		.fill(target.email)
	await page.keyboard.press('Enter')

	// The row-overflow menu (matching the Roles list affordance) carries View →
	// the detail view, where the single-user actions live.
	const row = page.getByRole('row', { name: new RegExp(target.name ?? '') })
	await row.getByRole('button', { name: /actions for/i }).click()
	await page.getByRole('menuitem', { name: 'View' }).click()

	await expect(page).toHaveURL(new RegExp(`/admin/users/${target.id}`))
})
