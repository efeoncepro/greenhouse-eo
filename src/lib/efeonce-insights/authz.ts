import 'server-only'

/**
 * TASK-1845 — autorización de Efeonce Insights (arquitectura §7/§7.1). Tres planos, una puerta:
 *
 *   1. capability por acción (`can()`; los grants viven en runtime.ts);
 *   2. target: el cliente sólo opera SU organización (derivada server-side, nunca del payload);
 *      el colaborador interno opera cuentas a su cargo — hoy scope `tenant`, revalidado por
 *      target en CADA command (ser interno no concede todos los verbos);
 *   3. entitlement per-ORG: módulo `insights_v1` vigente en `module_assignments`. Sin módulo,
 *      la organización "no existe" para el actor (404 anti-oracle).
 *
 * `audience` es una dimensión distinta del actor: un cliente NUNCA puede pedir `internal`.
 */

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { InsightAudience } from './contracts/request'
import type { InsightActor } from './contracts/states'
import { InsightsForbiddenError, InsightsNotFoundError } from './errors'

export const INSIGHTS_MODULE_KEY = 'insights_v1'

export type InsightsAccessNeed =
  | 'read'
  | 'create'
  | 'review'
  | 'issue'
  | 'share_read'
  | 'share_create'
  | 'share_revoke'
  | 'delivery_read'
  | 'delivery_send'
  | 'delivery_manage'
  | 'schedule_read'
  | 'schedule_manage'
  | 'cover_preference_read'
  | 'cover_preference_manage'

type InsightsCapabilityKey =
  | 'insights.report.read'
  | 'insights.edition.create'
  | 'insights.edition.review'
  | 'insights.edition.issue'
  | 'insights.share.manage'
  | 'insights.delivery.send'
  | 'insights.schedule.manage'
  | 'insights.cover_preference.manage'

const NEED_TO_CAPABILITY: Record<InsightsAccessNeed, { capability: InsightsCapabilityKey; action: 'read' | 'create' | 'update' | 'approve' }> = {
  read: { capability: 'insights.report.read', action: 'read' },
  create: { capability: 'insights.edition.create', action: 'create' },
  review: { capability: 'insights.edition.review', action: 'update' },
  issue: { capability: 'insights.edition.issue', action: 'approve' },
  // TASK-1848 — compartir es una autoridad propia: generar o leer un informe no concede enlaces.
  share_read: { capability: 'insights.share.manage', action: 'read' },
  share_create: { capability: 'insights.share.manage', action: 'create' },
  share_revoke: { capability: 'insights.share.manage', action: 'update' },
  // TASK-1848 — enviar desde Efeonce es autoridad interna: sin scope `own`, un cliente nunca la tiene.
  delivery_read: { capability: 'insights.delivery.send', action: 'read' },
  delivery_send: { capability: 'insights.delivery.send', action: 'create' },
  delivery_manage: { capability: 'insights.delivery.send', action: 'update' },
  // TASK-1848 — la recurrencia también es interna: una autoridad durable que genera en nombre de alguien.
  schedule_read: { capability: 'insights.schedule.manage', action: 'read' },
  schedule_manage: { capability: 'insights.schedule.manage', action: 'update' },
  // TASK-1888 — leer la portada preferida es leer el reporte; fijarla es autoridad interna propia.
  cover_preference_read: { capability: 'insights.report.read', action: 'read' },
  cover_preference_manage: { capability: 'insights.cover_preference.manage', action: 'update' }
}

export interface InsightsAccessInput {
  subject: TenantEntitlementSubject
  /** Organización del actor derivada de la sesión (cliente); null para internos. */
  actorOrganizationId: string | null
  /** Organización objetivo del command. */
  organizationId: string
  need: InsightsAccessNeed
}

export interface InsightsAccessGrant {
  actor: InsightActor
  organizationId: string
  /** Audiencias que este actor puede solicitar/ver. */
  allowedAudiences: InsightAudience[]
  isInternal: boolean
}

export interface InsightsModuleEntitlement {
  hasModule: boolean
  status: string | null
}

export const resolveInsightsModuleEntitlement = async (organizationId: string): Promise<InsightsModuleEntitlement> => {
  // Mismo predicado que el resolver del portal (TASK-1392 authz): activo/piloto, vigente y no expirado.
  // SQL directo a propósito: `client-portal` es hoja del DAG (lint) y este dominio no puede importarlo.
  const rows = await runGreenhousePostgresQuery<{ status: string }>(
    `SELECT status
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1
        AND module_key = $2
        AND effective_to IS NULL
        AND status IN ('active', 'pilot')
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY effective_from DESC
      LIMIT 1`,
    [organizationId, INSIGHTS_MODULE_KEY]
  )

  return { hasModule: rows.length > 0, status: rows[0]?.status ?? null }
}

export const actorFromSubject = (subject: TenantEntitlementSubject): InsightActor => ({
  kind: subject.tenantType === 'client' ? 'client_user' : 'member',
  userId: subject.userId,
  memberId: subject.memberId ?? null
})

export const assertInsightsAccess = async (input: InsightsAccessInput): Promise<InsightsAccessGrant> => {
  const isInternal = input.subject.tenantType !== 'client'
  const { capability, action } = NEED_TO_CAPABILITY[input.need]

  if (!isInternal) {
    // Cliente: target = su propia org o nada. Un target ajeno se responde como inexistente.
    if (!input.actorOrganizationId || input.actorOrganizationId !== input.organizationId) {
      throw new InsightsNotFoundError('organization', input.organizationId)
    }

    if (!can(input.subject, capability, action, 'own')) {
      throw new InsightsForbiddenError(`El actor no tiene ${capability} sobre su organización`, { need: input.need })
    }
  } else if (!can(input.subject, capability, action, 'tenant')) {
    throw new InsightsForbiddenError(`El actor no tiene ${capability}`, { need: input.need })
  }

  const entitlement = await resolveInsightsModuleEntitlement(input.organizationId)

  if (!entitlement.hasModule) {
    throw new InsightsNotFoundError('organization', input.organizationId)
  }

  return {
    actor: actorFromSubject(input.subject),
    organizationId: input.organizationId,
    allowedAudiences: isInternal ? ['client', 'internal'] : ['client'],
    isInternal
  }
}

/** Ningún caller amplía acceso pidiendo `audience=internal` sin ser interno (§7.1). */
export const assertAudienceAllowed = (grant: InsightsAccessGrant, audience: InsightAudience): void => {
  if (!grant.allowedAudiences.includes(audience)) {
    throw new InsightsForbiddenError('La audiencia solicitada no está permitida para este actor', { audience })
  }
}
