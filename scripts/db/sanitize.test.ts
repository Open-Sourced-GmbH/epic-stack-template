import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const SCRIPTS_DIR = path.join(import.meta.dirname)

function sqlExec(dbPath: string, sql: string) {
	const tmpSql = `${dbPath}.tmp.sql`
	fs.writeFileSync(tmpSql, sql)
	try {
		execSync(`sqlite3 "${dbPath}" < "${tmpSql}"`, { encoding: 'utf-8' })
	} finally {
		fs.unlinkSync(tmpSql)
	}
}

function query(dbPath: string, sql: string): string {
	return execSync(`sqlite3 "${dbPath}" '${sql}'`, {
		encoding: 'utf-8',
	}).trim()
}

function createTestDb(dbPath: string) {
	sqlExec(
		dbPath,
		`
CREATE TABLE "User" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"email" TEXT NOT NULL,
	"username" TEXT NOT NULL,
	"name" TEXT,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Password" (
	"hash" TEXT NOT NULL,
	"userId" TEXT NOT NULL UNIQUE
);
CREATE TABLE "Session" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"expirationDate" DATETIME NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"userId" TEXT NOT NULL
);
CREATE TABLE "Connection" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"providerName" TEXT NOT NULL,
	"providerId" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"userId" TEXT NOT NULL
);
CREATE TABLE "Passkey" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"aaguid" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"publicKey" BLOB NOT NULL,
	"userId" TEXT NOT NULL,
	"webauthnUserId" TEXT NOT NULL,
	"counter" BIGINT NOT NULL,
	"deviceType" TEXT NOT NULL,
	"backedUp" BOOLEAN NOT NULL,
	"transports" TEXT
);
CREATE TABLE "Verification" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"type" TEXT NOT NULL,
	"target" TEXT NOT NULL,
	"secret" TEXT NOT NULL,
	"algorithm" TEXT NOT NULL,
	"digits" INTEGER NOT NULL,
	"period" INTEGER NOT NULL,
	"charSet" TEXT NOT NULL,
	"expiresAt" DATETIME
);
CREATE TABLE "Role" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"name" TEXT NOT NULL UNIQUE,
	"description" TEXT NOT NULL DEFAULT '',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Permission" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"action" TEXT NOT NULL,
	"entity" TEXT NOT NULL,
	"access" TEXT NOT NULL,
	"description" TEXT NOT NULL DEFAULT '',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "_RoleToUser" (
	"A" TEXT NOT NULL,
	"B" TEXT NOT NULL
);
CREATE TABLE "BlogCategory" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"slug" TEXT NOT NULL UNIQUE,
	"nameDe" TEXT NOT NULL,
	"nameFr" TEXT NOT NULL DEFAULT '',
	"nameEn" TEXT NOT NULL DEFAULT '',
	"order" INTEGER NOT NULL DEFAULT 0,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "BlogPost" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"slug" TEXT NOT NULL UNIQUE,
	"status" TEXT NOT NULL DEFAULT 'draft',
	"titleDe" TEXT NOT NULL,
	"contentDe" TEXT NOT NULL DEFAULT '',
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"authorId" TEXT NOT NULL,
	"categoryId" TEXT
);
CREATE TABLE "BlogTag" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"slug" TEXT NOT NULL UNIQUE,
	"nameDe" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`,
	)
}

function seedTestData(dbPath: string) {
	sqlExec(
		dbPath,
		`
INSERT INTO User VALUES('user1','alice@real.com','alice','Alice Real','2024-01-01','2024-01-01');
INSERT INTO User VALUES('user2','bob@real.com','bob','Bob Real','2024-01-01','2024-01-01');
INSERT INTO Password VALUES('hash1','user1');
INSERT INTO Password VALUES('hash2','user2');
INSERT INTO Session VALUES('sess1','2025-01-01','2024-01-01','2024-01-01','user1');
INSERT INTO Connection VALUES('conn1','github','gh-123','2024-01-01','2024-01-01','user1');
INSERT INTO Passkey VALUES('pk1','aaguid1','2024-01-01','2024-01-01',X'00','user1','wuid1',0,'multiDevice',1,NULL);
INSERT INTO Verification VALUES('ver1','2024-01-01','email','alice@real.com','secret','SHA-1',6,30,'0123456789',NULL);
INSERT INTO Role VALUES('role1','admin','','2024-01-01','2024-01-01');
INSERT INTO Role VALUES('role2','user','','2024-01-01','2024-01-01');
INSERT INTO Permission VALUES('perm1','read','user','own','','2024-01-01','2024-01-01');
INSERT INTO _RoleToUser VALUES('role1','user1');
INSERT INTO _RoleToUser VALUES('role2','user2');
INSERT INTO BlogCategory VALUES('cat1','tech','Technik','','',0,'2024-01-01','2024-01-01');
INSERT INTO BlogPost VALUES('post1','hello-world','published','Hallo Welt','Inhalt hier','2024-01-01','2024-01-01','user1','cat1');
INSERT INTO BlogTag VALUES('tag1','open-source','Open Source','2024-01-01','2024-01-01');
`,
	)
}

function setupTestDb() {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanitize-test-'))
	const dbPath = path.join(tmpDir, 'test.db')
	createTestDb(dbPath)
	seedTestData(dbPath)

	return {
		dbPath,
		[Symbol.dispose]() {
			fs.rmSync(tmpDir, { recursive: true, force: true })
		},
	}
}

describe('sanitize.sql', () => {
	test('deletes auth rows for non-admin users but preserves admin auth', () => {
		using ignoredTestDb = setupTestDb()
		const { dbPath } = ignoredTestDb
		// Verify data exists before sanitization
		expect(query(dbPath, 'SELECT COUNT(*) FROM Password')).toBe('2')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Session')).toBe('1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Connection')).toBe('1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Passkey')).toBe('1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Verification')).toBe('1')

		// Run sanitization
		execSync(`sqlite3 "${dbPath}" < "${SCRIPTS_DIR}/sanitize.sql"`)

		// user1 is admin → auth rows preserved; user2 is regular → rows removed.
		// Session/Connection/Passkey fixtures all belong to user1, so they stay.
		expect(query(dbPath, 'SELECT COUNT(*) FROM Password')).toBe('1')
		expect(query(dbPath, `SELECT userId FROM Password`)).toBe('user1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Session')).toBe('1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Connection')).toBe('1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Passkey')).toBe('1')
		// Verification is always cleared regardless of role
		expect(query(dbPath, 'SELECT COUNT(*) FROM Verification')).toBe('0')
	})

	test('anonymizes non-admin emails/names but preserves admin PII', () => {
		using ignoredTestDb = setupTestDb()
		const { dbPath } = ignoredTestDb
		execSync(`sqlite3 "${dbPath}" < "${SCRIPTS_DIR}/sanitize.sql"`)

		const emails = query(dbPath, 'SELECT email FROM User ORDER BY id')
		// user1 is admin → real email kept
		expect(emails).toContain('alice@real.com')
		// user2 is regular → anonymized
		expect(emails).toContain('user-user2@test.local')
		expect(emails).not.toContain('bob@real.com')

		const names = query(dbPath, 'SELECT name FROM User ORDER BY id')
		expect(names).toContain('Alice Real')
		expect(names).toContain('User user2')
		expect(names).not.toContain('Bob Real')
	})

	test('preserves usernames', () => {
		using ignoredTestDb = setupTestDb()
		const { dbPath } = ignoredTestDb
		execSync(`sqlite3 "${dbPath}" < "${SCRIPTS_DIR}/sanitize.sql"`)

		const usernames = query(dbPath, 'SELECT username FROM User ORDER BY id')
		expect(usernames).toContain('alice')
		expect(usernames).toContain('bob')
	})

	test('preserves roles and permissions', () => {
		using ignoredTestDb = setupTestDb()
		const { dbPath } = ignoredTestDb
		execSync(`sqlite3 "${dbPath}" < "${SCRIPTS_DIR}/sanitize.sql"`)

		expect(query(dbPath, 'SELECT COUNT(*) FROM Role')).toBe('2')
		expect(query(dbPath, 'SELECT COUNT(*) FROM Permission')).toBe('1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM _RoleToUser')).toBe('2')
	})

	test('preserves blog content', () => {
		using ignoredTestDb = setupTestDb()
		const { dbPath } = ignoredTestDb
		execSync(`sqlite3 "${dbPath}" < "${SCRIPTS_DIR}/sanitize.sql"`)

		expect(query(dbPath, 'SELECT COUNT(*) FROM BlogPost')).toBe('1')
		expect(query(dbPath, 'SELECT slug FROM BlogPost')).toBe('hello-world')
		expect(query(dbPath, 'SELECT COUNT(*) FROM BlogCategory')).toBe('1')
		expect(query(dbPath, 'SELECT COUNT(*) FROM BlogTag')).toBe('1')
	})

	test('preserves user count (only anonymizes, does not delete)', () => {
		using ignoredTestDb = setupTestDb()
		const { dbPath } = ignoredTestDb
		execSync(`sqlite3 "${dbPath}" < "${SCRIPTS_DIR}/sanitize.sql"`)

		expect(query(dbPath, 'SELECT COUNT(*) FROM User')).toBe('2')
	})
})
