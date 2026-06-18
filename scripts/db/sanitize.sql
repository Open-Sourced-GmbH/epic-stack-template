-- Sanitize a pulled database by removing auth data and anonymizing PII.
-- Preserves: usernames, roles, permissions, and your app's content tables.
-- Admin users (Role.name = 'admin') keep real credentials + PII so admins can
-- log in locally with their own accounts after a pull.
--
-- Usage: sqlite3 <database> < sanitize.sql
-- ── Delete auth rows for non-admin users ─────────────────────────────
DELETE FROM Password
WHERE
    userId NOT IN (
        SELECT
            ru.B
        FROM
            _RoleToUser ru
            JOIN Role r ON r.id = ru.A
        WHERE
            r.name = 'admin'
    );

DELETE FROM Session
WHERE
    userId NOT IN (
        SELECT
            ru.B
        FROM
            _RoleToUser ru
            JOIN Role r ON r.id = ru.A
        WHERE
            r.name = 'admin'
    );

DELETE FROM Connection
WHERE
    userId NOT IN (
        SELECT
            ru.B
        FROM
            _RoleToUser ru
            JOIN Role r ON r.id = ru.A
        WHERE
            r.name = 'admin'
    );

DELETE FROM Passkey
WHERE
    userId NOT IN (
        SELECT
            ru.B
        FROM
            _RoleToUser ru
            JOIN Role r ON r.id = ru.A
        WHERE
            r.name = 'admin'
    );

-- Ephemeral OTPs - always clear
DELETE FROM Verification;

-- ── Anonymize User PII for non-admin users ───────────────────────────
UPDATE User
SET
    email = 'user-' || id || '@test.local',
    name = 'User ' || id
WHERE
    id NOT IN (
        SELECT
            ru.B
        FROM
            _RoleToUser ru
            JOIN Role r ON r.id = ru.A
        WHERE
            r.name = 'admin'
    );