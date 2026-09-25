import 'server-only'

/**
 * TASK-1888 — portada preferida de los informes por organización (command + reader canónicos; UI, App API, Ecosystem
 * API, MCP y Nexa son adapters del MISMO primitive, sin lógica propia).
 *
 * - Leer: `insights.report.read` (quien lee los informes puede saber cómo se verán).
 * - Fijar: `insights.cover_preference.manage` (interna). La organización sale de la autoridad autenticada, nunca del
 *   payload; sin módulo `insights_v1` es 404 anti-oracle, como el resto del dominio.
 * - Idempotente: fijar el mismo valor no escribe ni publica. Un cambio real publica `insights.cover_preference.updated`
 *   en la misma transacción, con el valor anterior. Apto para `propose → confirm → execute`: un solo write, sin efectos
 *   laterales, reversible fijando el valor previo.
 *
 * Funciona con `INSIGHTS_EDITORIAL_V2_ENABLED` apagado (la preferencia se puede guardar antes del release); sólo la
 * APLICACIÓN al generar depende del flag.
 */

import { readOrganizationLogoVariants } from '@/lib/account-360/organization-logo-variants-reader'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertInsightsAccess } from '../authz'
import { INSIGHT_COVER_PREFERENCES, isInsightCoverPreference, resolveInsightCover, type InsightCoverPreference, type InsightCoverPreferenceDto } from '../contracts/cover'
import type { PlanCoverV1 } from '../contracts/plan'
import { InsightsInputError } from '../errors'
import { publishInsightCoverPreferenceUpdated } from '../events'
import { getInsightCoverPreferenceRow, upsertInsightCoverPreference, type InsightCoverPreferenceRecord } from '../stores/cover-preference-store'

interface CoverPreferenceScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
}

const toDto = (organizationId: string, record: InsightCoverPreferenceRecord | null): InsightCoverPreferenceDto => ({
  organizationId,
  coverTheme: record?.coverTheme ?? 'auto',
  isDefault: record === null,
  updatedAt: record?.updatedAt ?? null,
  updatedByActorKind: record?.updatedByActorKind ?? null
})

/** Reader canónico. Sin fila = `auto` (`isDefault: true`). */
export const getInsightCoverPreference = async (scope: CoverPreferenceScope): Promise<InsightCoverPreferenceDto> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'cover_preference_read' })

  return toDto(grant.organizationId, await getInsightCoverPreferenceRow(undefined, grant.organizationId))
}

export interface SetInsightCoverPreferenceResult {
  preference: InsightCoverPreferenceDto
  /** `false` cuando el valor ya era ese: no hubo escritura ni evento. */
  changed: boolean
}

export const setInsightCoverPreference = async (scope: CoverPreferenceScope & { coverTheme: unknown }): Promise<SetInsightCoverPreferenceResult> => {
  if (!isInsightCoverPreference(scope.coverTheme)) {
    throw new InsightsInputError(`coverTheme debe ser uno de: ${INSIGHT_COVER_PREFERENCES.join(', ')}`, { field: 'coverTheme', allowed: INSIGHT_COVER_PREFERENCES })
  }

  const coverTheme: InsightCoverPreference = scope.coverTheme
  const grant = await assertInsightsAccess({ subject: scope.subject, actorOrganizationId: scope.actorOrganizationId, organizationId: scope.organizationId, need: 'cover_preference_manage' })

  return withGreenhousePostgresTransaction(async client => {
    const previous = await getInsightCoverPreferenceRow(client, grant.organizationId, { forUpdate: true })
    const previousTheme = previous?.coverTheme ?? 'auto'

    // Mismo valor ⇒ sin efecto. Una organización sin fila que pide `auto` tampoco escribe: ya se lee así.
    if (previousTheme === coverTheme) return { preference: toDto(grant.organizationId, previous), changed: false }

    const saved = await upsertInsightCoverPreference(client, { organizationId: grant.organizationId, coverTheme, actor: grant.actor })

    await publishInsightCoverPreferenceUpdated(client, {
      version: 1,
      organizationId: grant.organizationId,
      coverTheme,
      previousCoverTheme: previousTheme,
      actorKind: grant.actor.kind
    })

    return { preference: toDto(grant.organizationId, saved), changed: true }
  })
}

/**
 * Portada de una edición al GENERARLA (fase composing, sistema). Lee la preferencia y las variantes del logo por sus
 * readers canónicos —account-360 para el logo, nunca una escritura— y aplica `resolveInsightCover`. El resultado se
 * sella en el plan congelado.
 */
export const resolveInsightCoverForEdition = async (input: { organizationId: string; requested?: InsightCoverPreference | null }): Promise<PlanCoverV1> => {
  const [preference, logos] = await Promise.all([getInsightCoverPreferenceRow(undefined, input.organizationId), readOrganizationLogoVariants(input.organizationId)])

  return resolveInsightCover({ requested: input.requested ?? null, organization: preference?.coverTheme ?? 'auto', logos })
}
