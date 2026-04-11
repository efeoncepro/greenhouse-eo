-- Up Migration
-- Convert members.avatar_url from raw gs:// paths to browser-ready proxy URLs.
-- After this, any SELECT m.avatar_url returns a value the browser can render
-- directly, without requiring resolveAvatarUrl() conversion.
-- client_users.avatar_url retains the gs:// path as the source of truth for
-- the media proxy endpoint.

UPDATE greenhouse_core.members m
SET avatar_url = '/api/media/users/' || cu.user_id || '/avatar',
    updated_at = CURRENT_TIMESTAMP
FROM greenhouse_core.client_users cu
WHERE cu.member_id = m.member_id
  AND cu.active = TRUE
  AND m.avatar_url IS NOT NULL
  AND m.avatar_url LIKE 'gs://%';


-- Down Migration
-- Revert members.avatar_url to gs:// paths from client_users.
UPDATE greenhouse_core.members m
SET avatar_url = cu.avatar_url,
    updated_at = CURRENT_TIMESTAMP
FROM greenhouse_core.client_users cu
WHERE cu.member_id = m.member_id
  AND cu.active = TRUE
  AND m.avatar_url LIKE '/api/media/%'
  AND cu.avatar_url LIKE 'gs://%';
