import 'server-only'

import { query } from '@/lib/db'

/**
 * Canonical resolver: `user_id` → display name (`greenhouse_core.client_users.full_name`).
 *
 * Espejo de `resolveProfileDisplayNames` (profile-scoped) para el plano de usuarios de
 * sesión: los autores de notas del expediente (TASK-1737), confirmadores de propuestas y
 * cualquier consumer que persista `*_user_id` y necesite un nombre legible. Bulk por
 * diseño (`= ANY`) para evitar N+1; el caller decide el fallback honesto (mostrar el id,
 * nunca un "Usuario desconocido" mudo).
 */
export const resolveUserDisplayNames = async (userIds: readonly string[]): Promise<Map<string, string>> => {
  const map = new Map<string, string>()

  const unique = [...new Set(userIds.filter(Boolean))]

  if (unique.length === 0) return map

  const rows = await query<{ user_id: string; full_name: string | null }>(
    `SELECT user_id, full_name
     FROM greenhouse_core.client_users
     WHERE user_id = ANY($1::text[])`,
    [unique]
  )

  for (const row of rows) {
    const name = row.full_name?.trim()

    if (name) map.set(row.user_id, name)
  }

  return map
}
