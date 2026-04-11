-- Up Migration
-- Backfill members.avatar_url from the linked client_users record.
-- After this, members.avatar_url is the canonical source for all avatar
-- consumers (payroll, HR, people lists, admin, etc.).
-- Future avatar writes (Entra sync, admin upload) propagate to both tables.

UPDATE greenhouse_core.members m
SET avatar_url = cu.avatar_url,
    updated_at = CURRENT_TIMESTAMP
FROM greenhouse_core.client_users cu
WHERE cu.member_id = m.member_id
  AND cu.avatar_url IS NOT NULL
  AND (m.avatar_url IS NULL OR m.avatar_url IS DISTINCT FROM cu.avatar_url);


-- Down Migration
-- Revert members.avatar_url to NULL (pre-backfill state).
-- Safe: avatar data remains in client_users.
UPDATE greenhouse_core.members
SET avatar_url = NULL, updated_at = CURRENT_TIMESTAMP
WHERE avatar_url IS NOT NULL;
