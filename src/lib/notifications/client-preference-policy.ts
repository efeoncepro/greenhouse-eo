import 'server-only'

import { NOTIFICATION_CATEGORIES } from '@/config/notification-categories'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { NotificationService } from './notification-service'

/**
 * TASK-1852 — política explícita de preferencias para personas cliente de una cuenta que abre
 * servicios. La declara el operador (no la infiere el sistema) y se persiste por persona como
 * filas de `notification_preferences`, para que el preview de habilitación deje de reportar
 * `preferences_not_explicit`. Es una preferencia inicial: la persona puede cambiarla desde su
 * portal (`PUT /api/notifications/preferences`) y esa decisión prevalece.
 *
 * Racional (decisión del operador 2026-09-10, "algo razonable"):
 *  - `report_ready` y `feedback_requested` piden acción o entregan valor → in-app + email.
 *  - `sprint_milestone` y `delivery_update` son de alta frecuencia → sólo in-app, sin correo.
 *  - Cadencia: por evento (el Hub V1 no agrega/digiere; TASK-387). El destino Teams del cliente
 *    recibe únicamente avisos de la clase reporte/feedback, y sólo cuando Insights (TASK-1848)
 *    los emita; hasta entonces, ningún envío automático.
 */
export const CLIENT_SERVICE_NOTIFICATION_POLICY_KEY = 'client_service_default_v1' as const

export const CLIENT_SERVICE_NOTIFICATION_POLICY_V1 = {
  key: CLIENT_SERVICE_NOTIFICATION_POLICY_KEY,
  cadence: 'per_event' as const,
  teamsDestinationClasses: ['report_ready', 'feedback_requested'] as const,
  categories: {
    report_ready: { inApp: true, email: true },
    feedback_requested: { inApp: true, email: true },
    sprint_milestone: { inApp: true, email: false },
    delivery_update: { inApp: true, email: false }
  } as const
}

type PolicyCategory = keyof typeof CLIENT_SERVICE_NOTIFICATION_POLICY_V1.categories

// Guard at module load: the policy may only name client-audience categories of the catalog.
for (const code of Object.keys(CLIENT_SERVICE_NOTIFICATION_POLICY_V1.categories) as PolicyCategory[]) {
  if (NOTIFICATION_CATEGORIES[code]?.audience !== 'client') {
    throw new Error(`client notification policy references a non-client category: ${code}`)
  }
}

export interface ApplyClientNotificationPolicyInput {
  /** client_id canónico resuelto server-side; toda persona debe pertenecer a él. */
  clientId: string
  userIds: string[]
}

export type ApplyClientNotificationPolicyOutcome =
  | { userId: string; outcome: 'applied'; categories: PolicyCategory[] }
  | { userId: string; outcome: 'not_in_client' | 'not_client_tenant' }

export const applyClientNotificationPreferencePolicy = async (
  input: ApplyClientNotificationPolicyInput
): Promise<{ policy: typeof CLIENT_SERVICE_NOTIFICATION_POLICY_KEY; results: ApplyClientNotificationPolicyOutcome[] }> => {
  const userIds = [...new Set(input.userIds.map(id => id.trim()).filter(Boolean))]

  if (userIds.length === 0 || userIds.length > 50) throw new Error('Between 1 and 50 people are required.')

  const rows = await runGreenhousePostgresQuery<{ user_id: string; client_id: string | null; tenant_type: string }>(
    `SELECT user_id, client_id, tenant_type FROM greenhouse_core.client_users WHERE user_id = ANY($1::text[])`,
    [userIds]
  )

  const byId = new Map(rows.map(row => [row.user_id, row]))
  const results: ApplyClientNotificationPolicyOutcome[] = []
  const categories = Object.keys(CLIENT_SERVICE_NOTIFICATION_POLICY_V1.categories) as PolicyCategory[]

  for (const userId of userIds) {
    const row = byId.get(userId)

    if (!row || row.client_id !== input.clientId) {
      results.push({ userId, outcome: 'not_in_client' })
      continue
    }

    if (row.tenant_type !== 'client') {
      results.push({ userId, outcome: 'not_client_tenant' })
      continue
    }

    for (const category of categories) {
      const setting = CLIENT_SERVICE_NOTIFICATION_POLICY_V1.categories[category]

      await NotificationService.upsertPreference(userId, category, setting.inApp, setting.email)
    }

    results.push({ userId, outcome: 'applied', categories })
  }

  return { policy: CLIENT_SERVICE_NOTIFICATION_POLICY_KEY, results }
}
