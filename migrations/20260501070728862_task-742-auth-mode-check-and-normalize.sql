-- TASK-742 Capa 4 — Auth-mode invariant.
--
-- Forbids impossible states on greenhouse_core.client_users:
--   * auth_mode IN ('credentials','both') with password_hash IS NULL
--   * auth_mode = 'microsoft_sso' without microsoft_oid
--   * auth_mode = 'google_sso'    without google_sub
--
-- The 2026-04-30 SSO incident exposed Daniela Ferreira with auth_mode='both'
-- and password_hash=NULL. The current credentials authorize() returns a
-- silent failure for that combination ("Email o contraseña incorrectos"),
-- giving the user no signal that her real auth path is SSO. This migration
-- guarantees the schema rejects the inconsistent state forever.
--
-- Backfill strategy:
--   1. Normalize existing rows with broken invariants BEFORE adding the
--      check constraint. If we add the constraint NOT VALID first we still
--      need backfill for legacy data.
--   2. Add the constraint with NOT VALID (online), then VALIDATE in a
--      separate statement. This avoids long table locks.
--
-- Outbox event 'identity.user.auth_mode_normalized' is emitted once per row
-- normalized so downstream consumers (Reliability Control Plane) record it.

-- Up Migration

-- 1) Backfill: rows with auth_mode='both' but no password_hash --> microsoft_sso
--    if they have an OID, google_sso if they have a google_sub.
--    'password_reset_pending' is a transitional state (invited / pending
--    activation) and is preserved even though it carries no credentials.
UPDATE greenhouse_core.client_users
SET auth_mode = 'microsoft_sso'
WHERE auth_mode IN ('both', 'credentials')
  AND password_hash IS NULL
  AND microsoft_oid IS NOT NULL;

UPDATE greenhouse_core.client_users
SET auth_mode = 'google_sso'
WHERE auth_mode IN ('both', 'credentials')
  AND password_hash IS NULL
  AND google_sub IS NOT NULL;

-- Edge case: 'both' or 'credentials' with no SSO link AND no password_hash.
-- Such accounts are unusable today; we mark them as 'sso_pending' which
-- the application treats as 'not eligible for credentials sign-in but
-- ready to be linked on first SSO sign-in'. This avoids hard-disabling
-- these accounts on the migration.
UPDATE greenhouse_core.client_users
SET auth_mode = 'sso_pending'
WHERE auth_mode IN ('both', 'credentials')
  AND password_hash IS NULL
  AND microsoft_oid IS NULL
  AND google_sub IS NULL;

-- Symmetric backfills (sso modes lacking the corresponding identifier):
-- These should be VERY rare. We keep the row as-is and rely on the next
-- successful sign-in to repopulate. If the constraint complains, these are
-- visible in the migration logs.

-- 2) Add the invariant. NOT VALID first (no scan), then VALIDATE.
ALTER TABLE greenhouse_core.client_users
  DROP CONSTRAINT IF EXISTS client_users_auth_mode_invariant;

ALTER TABLE greenhouse_core.client_users
  ADD CONSTRAINT client_users_auth_mode_invariant
    CHECK (
      CASE auth_mode
        WHEN 'credentials'           THEN password_hash IS NOT NULL
        WHEN 'both'                  THEN password_hash IS NOT NULL
        WHEN 'microsoft_sso'         THEN microsoft_oid  IS NOT NULL
        WHEN 'google_sso'            THEN google_sub     IS NOT NULL
        WHEN 'sso_pending'           THEN password_hash IS NULL AND microsoft_oid IS NULL AND google_sub IS NULL
        WHEN 'password_reset_pending' THEN password_hash IS NULL
        WHEN 'invited'               THEN password_hash IS NULL
        WHEN 'agent'                 THEN TRUE
        ELSE FALSE
      END
    )
    NOT VALID;

ALTER TABLE greenhouse_core.client_users
  VALIDATE CONSTRAINT client_users_auth_mode_invariant;

COMMENT ON CONSTRAINT client_users_auth_mode_invariant ON greenhouse_core.client_users IS
  'TASK-742 Capa 4 - Forbids impossible auth_mode x credentials combinations. credentials/both require password_hash; microsoft_sso requires microsoft_oid; google_sso requires google_sub; sso_pending requires no credentials AND no SSO link (transitional).';

-- Down Migration

ALTER TABLE greenhouse_core.client_users
  DROP CONSTRAINT IF EXISTS client_users_auth_mode_invariant;

-- We DO NOT undo the data normalization. Once a row was migrated from
-- 'both' to 'microsoft_sso', reverting to 'both' would re-create the
-- impossible state. Operators that need to reattach a credentials path
-- should set auth_mode='both' AND populate password_hash atomically.
