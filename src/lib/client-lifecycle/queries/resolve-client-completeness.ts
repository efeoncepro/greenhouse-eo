import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Pieza estructural de un cliente (nivel "nacimiento"). El wizard
 * (`provisionClientFromWizard`) las crea idempotentemente. Los links de Notion/
 * Teams/portal users NO van acá — son ítems del checklist de provisioning
 * (separación de concerns TASK-998/1001), no estructura de nacimiento.
 */
export type ClientStructuralGap = 'client_profile' | 'space' | 'onboarding_case'

export interface ClientCompleteness {
  organizationId: string
  /** false → el org no existe (el wizard creará uno nuevo). */
  exists: boolean
  organizationName: string | null
  lifecycleStage: string | null
  /** organization_type ∈ {client, both}. */
  isClientType: boolean
  hasClientProfile: boolean
  hasSpace: boolean
  hasActiveOnboardingCase: boolean
  /** Caso onboarding no-terminal vigente, si lo hay (deep-link a la ficha). */
  activeOnboardingCaseId: string | null
  /** Piezas estructurales faltantes (orden canónico de creación). */
  structuralGaps: ClientStructuralGap[]
  /** Existe + es client + sin gaps estructurales. */
  isStructurallyComplete: boolean
  /** Existe como org pero le falta ≥1 pieza estructural → "media-cocida". */
  isIncompleteExisting: boolean
}

const STRUCTURAL_ORDER: ClientStructuralGap[] = ['client_profile', 'space', 'onboarding_case']

type CompletenessRow = {
  organization_id: string
  organization_name: string | null
  organization_type: string | null
  lifecycle_stage: string | null
  has_client_profile: boolean
  has_space: boolean
  active_onboarding_case_id: string | null
}

/**
 * SSOT de "¿qué le falta a este cliente?" para una org puntual. Reusa los mismos
 * predicados que los reliability signals TASK-991 (`commercial.client.active_without_profile`
 * / `commercial.client.active_without_space`) — la detección agregada (dashboard) y
 * la puntual (wizard) comparten la verdad. Read-only; la completación la hace el
 * write idempotente `provisionClientFromWizard`.
 *
 * El cliente NO existe → devuelve `exists:false` (el wizard crea uno nuevo, sin gaps).
 */
export const resolveClientCompleteness = async (organizationId: string): Promise<ClientCompleteness> => {
  const id = organizationId?.trim()

  if (!id) {
    return {
      organizationId: organizationId ?? '',
      exists: false,
      organizationName: null,
      lifecycleStage: null,
      isClientType: false,
      hasClientProfile: false,
      hasSpace: false,
      hasActiveOnboardingCase: false,
      activeOnboardingCaseId: null,
      structuralGaps: [],
      isStructurallyComplete: false,
      isIncompleteExisting: false
    }
  }

  const rows = await runGreenhousePostgresQuery<CompletenessRow>(
    `SELECT
       o.organization_id,
       o.organization_name,
       o.organization_type,
       o.lifecycle_stage,
       EXISTS (
         SELECT 1 FROM greenhouse_finance.client_profiles cp
         WHERE cp.organization_id = o.organization_id
       ) AS has_client_profile,
       EXISTS (
         SELECT 1 FROM greenhouse_core.spaces s
         WHERE s.organization_id = o.organization_id
       ) AS has_space,
       (
         SELECT c.case_id
         FROM greenhouse_core.client_lifecycle_cases c
         WHERE c.organization_id = o.organization_id
           AND c.case_kind = 'onboarding'
           AND c.status NOT IN ('completed', 'cancelled')
         ORDER BY c.created_at DESC
         LIMIT 1
       ) AS active_onboarding_case_id
     FROM greenhouse_core.organizations o
     WHERE o.organization_id = $1`,
    [id]
  )

  const row = rows[0]

  if (!row) {
    return {
      organizationId: id,
      exists: false,
      organizationName: null,
      lifecycleStage: null,
      isClientType: false,
      hasClientProfile: false,
      hasSpace: false,
      hasActiveOnboardingCase: false,
      activeOnboardingCaseId: null,
      structuralGaps: [],
      isStructurallyComplete: false,
      isIncompleteExisting: false
    }
  }

  const isClientType = row.organization_type === 'client' || row.organization_type === 'both'
  const hasClientProfile = Boolean(row.has_client_profile)
  const hasSpace = Boolean(row.has_space)
  const activeOnboardingCaseId = row.active_onboarding_case_id ?? null
  const hasActiveOnboardingCase = Boolean(activeOnboardingCaseId)

  const present: Record<ClientStructuralGap, boolean> = {
    client_profile: hasClientProfile,
    space: hasSpace,
    onboarding_case: hasActiveOnboardingCase
  }

  const structuralGaps = STRUCTURAL_ORDER.filter(gap => !present[gap])
  const isStructurallyComplete = structuralGaps.length === 0
  // "Media-cocida": existe (típicamente ya marcado client/active) pero le falta
  // ≥1 pieza estructural. Si el org existe pero NO es client todavía, igual lo
  // tratamos como incompleto-existente: el wizard lo promueve + completa.
  const isIncompleteExisting = !isStructurallyComplete

  return {
    organizationId: id,
    exists: true,
    organizationName: row.organization_name,
    lifecycleStage: row.lifecycle_stage,
    isClientType,
    hasClientProfile,
    hasSpace,
    hasActiveOnboardingCase,
    activeOnboardingCaseId,
    structuralGaps,
    isStructurallyComplete,
    isIncompleteExisting
  }
}
