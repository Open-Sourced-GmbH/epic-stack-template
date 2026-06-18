import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const SCRIPT = path.resolve(import.meta.dirname, 'classify-destructive.sh')

/**
 * Run the classifier with `sql` piped to stdin. No mocks, no fixtures, no
 * migration directories - the classifier's interface is SQL text in, a verdict
 * out, so the test surface is exactly that.
 */
function classify(sql: string) {
	const result = spawnSync('bash', [SCRIPT], { input: sql, encoding: 'utf-8' })
	return { stdout: result.stdout, exitCode: result.status ?? 1 }
}

describe('classify-destructive.sh', () => {
	test('flags DROP TABLE (exit 2)', () => {
		const { stdout, exitCode } = classify('DROP TABLE "users";\n')
		expect(exitCode).toBe(2)
		expect(stdout).toContain('DROP TABLE "users"')
	})

	test('flags DROP TABLE IF EXISTS', () => {
		const { stdout, exitCode } = classify('DROP TABLE IF EXISTS "sessions";\n')
		expect(exitCode).toBe(2)
		expect(stdout).toContain('DROP TABLE IF EXISTS "sessions"')
	})

	test('flags ALTER TABLE ... DROP COLUMN', () => {
		const { stdout, exitCode } = classify(
			'ALTER TABLE "users" DROP COLUMN "email";\n',
		)
		expect(exitCode).toBe(2)
		expect(stdout).toContain('ALTER TABLE "users" DROP COLUMN "email"')
	})

	test('flags ALTER TABLE ... DROP without the COLUMN keyword', () => {
		const { exitCode } = classify('ALTER TABLE "users" DROP "email";\n')
		expect(exitCode).toBe(2)
	})

	test('is case-insensitive', () => {
		const { exitCode } = classify('drop table "users";\n')
		expect(exitCode).toBe(2)
	})

	test('passes CREATE TABLE / ADD COLUMN / CREATE INDEX (exit 0)', () => {
		const { stdout, exitCode } = classify(
			[
				'CREATE TABLE "posts" ("id" TEXT PRIMARY KEY);',
				'ALTER TABLE "users" ADD COLUMN "name" TEXT;',
				'CREATE INDEX "idx_users_name" ON "users" ("name");',
				'',
			].join('\n'),
		)
		expect(exitCode).toBe(0)
		expect(stdout.trim()).toBe('')
	})

	test('ignores commented-out DROP statements', () => {
		const { exitCode } = classify(
			[
				'-- DROP TABLE "users";',
				'--DROP TABLE "sessions";',
				'  -- DROP TABLE "posts";',
				'CREATE TABLE "safe" ("id" TEXT);',
				'',
			].join('\n'),
		)
		expect(exitCode).toBe(0)
	})

	test('ignores DROP inside a string literal (not at line start)', () => {
		const { exitCode } = classify(
			[
				'CREATE TABLE "log" ("message" TEXT);',
				`INSERT INTO "log" ("message") VALUES ('DROP TABLE users is dangerous');`,
				'',
			].join('\n'),
		)
		expect(exitCode).toBe(0)
	})

	test('does not flag DROP INDEX', () => {
		const { exitCode } = classify(
			[
				'DROP INDEX IF EXISTS "idx_users_email";',
				'CREATE INDEX "idx_users_name" ON "users" ("name");',
				'',
			].join('\n'),
		)
		expect(exitCode).toBe(0)
	})

	test('reports every destructive statement in the input', () => {
		const { stdout, exitCode } = classify(
			[
				'DROP TABLE IF EXISTS "NoteImage";',
				'DROP TABLE IF EXISTS "Note";',
				'ALTER TABLE "users" DROP COLUMN "legacy_field";',
				'',
			].join('\n'),
		)
		expect(exitCode).toBe(2)
		expect(stdout).toContain('DROP TABLE IF EXISTS "NoteImage"')
		expect(stdout).toContain('DROP TABLE IF EXISTS "Note"')
		expect(stdout).toContain('ALTER TABLE "users" DROP COLUMN "legacy_field"')
	})

	test('passes empty input', () => {
		const { exitCode } = classify('')
		expect(exitCode).toBe(0)
	})
})
