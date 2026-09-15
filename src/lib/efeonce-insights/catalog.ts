import 'server-only'

/**
 * TASK-1845 — catálogo elegible por actor y organización (arquitectura §7.1): qué módulos,
 * salidas, audiencias, profundidades y límites puede encargar ESTE actor sobre ESTA org. La
 * disponibilidad de cada módulo se declara con honestidad (asignación vigente + fuente
 * conectada), sin prometer una sección que el productor no puede servir.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { listRegisteredInsightModules, resolveInsightAdapter } from './adapters/registry'
import type { AdapterDescriptor } from './adapters/contract'
import { INSIGHT_DEPTHS, INSIGHT_LOCALES, INSIGHT_MODULES, INSIGHT_OUTPUTS, type InsightAudience, type InsightModule } from './contracts/request'
import type { InsightsAccessGrant } from './authz'
import { MAX_INSIGHT_WINDOW_DAYS } from './window'

export interface InsightsCatalogModule {
  module: InsightModule
  adapterVersion: string
  granularities: AdapterDescriptor['granularities']
  suggestedSections: string[]
  available: boolean
  /** Motivo de no disponibilidad, declarado; null cuando está disponible. */
  reason: 'module_not_assigned' | 'no_active_spaces' | null
}

export interface InsightsCatalog {
  organizationId: string
  modules: InsightsCatalogModule[]
  outputs: readonly string[]
  audiences: InsightAudience[]
  depths: readonly string[]
  locales: readonly string[]
  limits: { maxWindowDays: number; maxModulesPerEdition: number }
  /** Salidas hoy renderizables. Vacío hasta TASK-1846: crear sí, emitir no. */
  renderableOutputs: readonly string[]
}

const MODULE_REQUIREMENTS: Record<InsightModule, { moduleKeys: string[] } | { spaces: true }> = {
  seo: { moduleKeys: ['seo_v2', 'seo_v1'] },
  aeo: { moduleKeys: ['ai_visibility_v1'] },
  ico: { spaces: true }
}

const hasAnyModuleAssignment = async (organizationId: string, moduleKeys: string[]): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1
        AND module_key = ANY($2::text[])
        AND effective_to IS NULL
        AND status IN ('active', 'pilot')
        AND (expires_at IS NULL OR expires_at > now())`,
    [organizationId, moduleKeys]
  )

  return Number(rows[0]?.n ?? 0) > 0
}

const hasActiveSpaces = async (organizationId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT count(*)::int AS n FROM greenhouse_core.spaces WHERE organization_id = $1 AND active = true`,
    [organizationId]
  )

  return Number(rows[0]?.n ?? 0) > 0
}

export const getInsightsCatalog = async (grant: InsightsAccessGrant): Promise<InsightsCatalog> => {
  const modules: InsightsCatalogModule[] = []

  for (const moduleKey of INSIGHT_MODULES) {
    if (!listRegisteredInsightModules().includes(moduleKey)) continue

    const descriptor = (await resolveInsightAdapter(moduleKey)).describe()
    const requirement = MODULE_REQUIREMENTS[moduleKey]
    let available = true
    let reason: InsightsCatalogModule['reason'] = null

    if ('spaces' in requirement) {
      available = await hasActiveSpaces(grant.organizationId)
      reason = available ? null : 'no_active_spaces'
    } else {
      available = await hasAnyModuleAssignment(grant.organizationId, requirement.moduleKeys)
      reason = available ? null : 'module_not_assigned'
    }

    modules.push({
      module: moduleKey,
      adapterVersion: descriptor.version,
      granularities: descriptor.granularities,
      suggestedSections: descriptor.suggestedSections,
      available,
      reason
    })
  }

  return {
    organizationId: grant.organizationId,
    modules,
    outputs: INSIGHT_OUTPUTS,
    audiences: grant.allowedAudiences,
    depths: INSIGHT_DEPTHS,
    locales: INSIGHT_LOCALES,
    limits: { maxWindowDays: MAX_INSIGHT_WINDOW_DAYS, maxModulesPerEdition: INSIGHT_MODULES.length },
    renderableOutputs: []
  }
}
