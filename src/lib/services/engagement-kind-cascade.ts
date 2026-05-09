/**
 * TASK-836 — Cascade canonica para resolver `engagement_kind` ante webhook
 * inbound de HubSpot p_services.
 *
 * Helper puro. Reemplaza el riesgo de race condition donde un webhook con
 * `ef_engagement_kind=NULL` pisaba Sample Sprints declarados localmente.
 *
 * 6 casos canonicos (ver Detailed Spec > Engagement kind cascade):
 *
 * | Caso | HubSpot value          | Existing PG value         | Stage resuelto      | Accion canonica                                              |
 * | ---- | ---------------------- | ------------------------- | ------------------- | ------------------------------------------------------------ |
 * | 1    | poblado, valid enum    | -                         | -                   | usar valor HubSpot                                           |
 * | 2    | poblado, fuera enum    | -                         | -                   | NO pisar PG; marcar unmapped + warning                       |
 * | 3    | NULL                   | non-regular (existing)    | -                   | preservar PG (Sample Sprints declarados localmente)          |
 * | 4    | NULL                   | regular (existing)        | -                   | preservar PG ('regular')                                     |
 * | 5    | NULL                   | none (new row)            | 'validation'        | NULL + unmapped_reason; operador clasifica antes de P&L      |
 * | 6    | NULL                   | none (new row)            | operative stages    | default 'regular' (legacy)                                   |
 *
 * Stages operativas: onboarding|active|renewal_pending|renewed|closed|paused.
 */

export const ENGAGEMENT_KINDS = ['regular', 'pilot', 'trial', 'poc', 'discovery'] as const
export type EngagementKind = (typeof ENGAGEMENT_KINDS)[number]

export type StageContext =
  | 'validation'
  | 'onboarding'
  | 'active'
  | 'renewal_pending'
  | 'renewed'
  | 'closed'
  | 'paused'

const isValidEngagementKind = (value: string): value is EngagementKind =>
  (ENGAGEMENT_KINDS as readonly string[]).includes(value)

export interface ResolveEngagementKindInput {
  /** `ef_engagement_kind` desde HubSpot p_services (internal name canonico). NULL/undefined = no setteado. */
  hubspotValue: string | null | undefined
  /** Valor actual en `greenhouse_core.services.engagement_kind` (si la fila existe). NULL = fila nueva. */
  existingPgValue: EngagementKind | null
  /** Stage resuelto por el lifecycle mapper. Determina el default cuando hubspot=NULL y pg=NULL. */
  resolvedStage: StageContext
}

export type ResolveEngagementKindResult =
  | {
    kind: EngagementKind
    /** Razón canonica para audit/debug. */
    rule: 'hubspot_authoritative' | 'preserve_pg' | 'default_regular_legacy'
  }
  | {
    /** Caso 5: stage validation + sin valor en ningun lado -> requiere clasificacion operador. */
    kind: null
    rule: 'classification_required_in_validation'
    requiresUnmappedReason: 'missing_classification'
  }
  | {
    /** Caso 2: HubSpot devolvio valor fuera del enum -> NO pisar PG. */
    kind: EngagementKind | null
    rule: 'hubspot_value_outside_enum'
    requiresUnmappedReason: 'missing_classification'
    invalidValue: string
  }

/**
 * Cascade canonica.
 *
 * Si `hubspotValue` viene poblado con valor invalido, NO pisa PG (preserva
 * `existingPgValue` o NULL si la fila es nueva) y emite `unmapped_reason`
 * para que reliability signal lo flag-ee.
 */
export const resolveEngagementKindCascade = (
  input: ResolveEngagementKindInput
): ResolveEngagementKindResult => {
  const { hubspotValue, existingPgValue, resolvedStage } = input

  const trimmed = typeof hubspotValue === 'string' ? hubspotValue.trim() : ''

  // Caso 1: HubSpot poblado y valor en enum -> HubSpot gana.
  if (trimmed && isValidEngagementKind(trimmed)) {
    return { kind: trimmed, rule: 'hubspot_authoritative' }
  }

  // Caso 2: HubSpot poblado pero fuera del enum -> NO pisar PG.
  if (trimmed && !isValidEngagementKind(trimmed)) {
    return {
      kind: existingPgValue ?? null,
      rule: 'hubspot_value_outside_enum',
      requiresUnmappedReason: 'missing_classification',
      invalidValue: trimmed
    }
  }

  // HubSpot NULL desde aquí.

  // Casos 3-4: fila ya existe en PG -> preservar.
  if (existingPgValue !== null) {
    return { kind: existingPgValue, rule: 'preserve_pg' }
  }

  // Caso 5: fila nueva en stage `validation` -> requiere clasificación.
  if (resolvedStage === 'validation') {
    return {
      kind: null,
      rule: 'classification_required_in_validation',
      requiresUnmappedReason: 'missing_classification'
    }
  }

  // Caso 6: fila nueva en stage operativo -> legacy default.
  return { kind: 'regular', rule: 'default_regular_legacy' }
}
