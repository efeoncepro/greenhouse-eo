import 'server-only'

/**
 * Resolve an avatar URL for the frontend.
 * Stored as gs:// in the DB; served via /api/media/users/{userId}/avatar proxy.
 *
 * Centralized here — all person-360 facets and consumers import from this file.
 * Replaces copies in get-person-profile.ts, my/organization/members/route.ts,
 * and my/assignments/route.ts.
 */
export const resolveAvatarUrl = (avatarUrl: string | null, userId: string | null): string | null => {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('gs://') && userId) return `/api/media/users/${userId}/avatar`

  return avatarUrl
}
