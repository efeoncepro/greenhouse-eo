/**
 * TASK-836 — Mapper canonico HubSpot Service Pipeline -> Greenhouse lifecycle.
 *
 * Helper puro (sin DB, sin side effects). Reemplaza el hardcode
 * `pipeline_stage='active'` del UPSERT canonico.
 *
 * Inputs: stage ID HubSpot (ej. `8e2b21d0-7a90-4968-8f8c-a8525cc49c70`).
 * Outputs: triple `(pipelineStage, status, active)` derivado + razon
 * estructurada cuando la stage es desconocida.
 *
 * Reglas duras:
 *   - NUNCA default silencioso a 'active' cuando la stage no se reconoce.
 *   - NUNCA inventar stages locales: solo el Service Pipeline real de HubSpot
 *     gobierna lifecycle.
 *   - Si HubSpot agrega una stage nueva, este mapper debe extenderse antes de
 *     mergear cualquier consumer que dependa de esa stage.
 */

export type GreenhousePipelineStage =
  | 'validation'
  | 'onboarding'
  | 'active'
  | 'renewal_pending'
  | 'renewed'
  | 'closed'
  | 'paused'

export type GreenhouseServiceStatus =
  | 'active'
  | 'closed'
  | 'paused'
  | 'legacy_seed_archived'

export type LifecycleUnmappedReason =
  | 'unknown_pipeline_stage'
  | 'missing_classification'

/**
 * Stage IDs canonicos del HubSpot Service Pipeline (`0-162`) verificados
 * 2026-05-08. La etapa `validation` se agrega en TASK-836 Slice 1 vía runbook
 * y obtiene un nuevo stage ID que el operador registra en el runbook YAML.
 *
 * IMPORTANTE: cuando emerja un nuevo stage HubSpot, agregar al mapping ANTES
 * de aprobar el operacion sobre esa stage. Reliability signal
 * `commercial.service_engagement.lifecycle_stage_unknown` flag-ea drift en
 * runtime.
 */
export const HUBSPOT_STAGE_ID_TO_GREENHOUSE: Readonly<Record<string, {
  stage: GreenhousePipelineStage
  status: GreenhouseServiceStatus
  active: boolean
}>> = Object.freeze({
  // Stage IDs verificados pre-TASK-836 (HubSpot portal 48713323):
  '8e2b21d0-7a90-4968-8f8c-a8525cc49c70': { stage: 'onboarding', status: 'active', active: true },
  '600b692d-a3fe-4052-9cd7-278b134d7941': { stage: 'active', status: 'active', active: true },
  'de53e7d9-6b57-4701-b576-92de01c9ed65': { stage: 'renewal_pending', status: 'active', active: true },
  '1324827222': { stage: 'renewed', status: 'active', active: true },
  '1324827223': { stage: 'closed', status: 'closed', active: false },
  '1324827224': { stage: 'paused', status: 'paused', active: false },
  // TASK-836 — stage 'Validación / Sample Sprint' creada 2026-05-09 via API
  // (runbook docs/operations/runbooks/hubspot-service-pipeline-config.md).
  // Status 'active' aquí significa "operativo en validation" — la semántica
  // fina (approval, progress, outcome) la gobierna Greenhouse interno.
  '1357763256': { stage: 'validation', status: 'active', active: true }
})

/**
 * Fallback de label canonico (en español, como aparece en HubSpot UI).
 * El mapper SIEMPRE prefiere stage ID; este fallback solo se usa cuando un
 * webhook trae el label en lugar del ID (caso edge raro). Auditable via
 * reliability signal con `unmapped_reason='unknown_pipeline_stage'` para
 * cualquier label no reconocido.
 */
const HUBSPOT_STAGE_LABEL_TO_GREENHOUSE: Readonly<Record<string, {
  stage: GreenhousePipelineStage
  status: GreenhouseServiceStatus
  active: boolean
}>> = Object.freeze({
  'Onboarding': { stage: 'onboarding', status: 'active', active: true },
  'Activo': { stage: 'active', status: 'active', active: true },
  'En renovacion': { stage: 'renewal_pending', status: 'active', active: true },
  'En renovación': { stage: 'renewal_pending', status: 'active', active: true },
  'Renovado': { stage: 'renewed', status: 'active', active: true },
  'Closed': { stage: 'closed', status: 'closed', active: false },
  'Cerrado': { stage: 'closed', status: 'closed', active: false },
  'Pausado': { stage: 'paused', status: 'paused', active: false },
  'Validacion / Sample Sprint': { stage: 'validation', status: 'active', active: true },
  'Validación / Sample Sprint': { stage: 'validation', status: 'active', active: true }
})

export interface MapHubSpotStageInput {
  /** Stage ID que HubSpot devuelve en `hs_pipeline_stage` (preferido). */
  hsPipelineStageId?: string | null
  /** Stage label como fallback ultimo recurso si no llega ID. */
  hsPipelineStageLabel?: string | null
}

export interface MapHubSpotStageResolved {
  resolved: true
  pipelineStage: GreenhousePipelineStage
  status: GreenhouseServiceStatus
  active: boolean
}

export interface MapHubSpotStageUnknown {
  resolved: false
  reason: LifecycleUnmappedReason
  detail: string
  /** Ultima entrada conocida para audit; el mapper degrada honest a `paused, false` para no contaminar P&L. */
  fallbackPipelineStage: GreenhousePipelineStage
  fallbackStatus: GreenhouseServiceStatus
  fallbackActive: boolean
}

export type MapHubSpotStageResult = MapHubSpotStageResolved | MapHubSpotStageUnknown

/**
 * Resuelve `hs_pipeline_stage` de HubSpot al triple canonico Greenhouse.
 *
 * Prioridad:
 *   1. `hsPipelineStageId` (UUID o numeric) coincide con un mapping conocido.
 *   2. `hsPipelineStageLabel` coincide (case-sensitive con label canonico).
 *   3. Ambos vacios o desconocidos -> degraded honest a `paused/closed/false`
 *      con `unmapped_reason='unknown_pipeline_stage'`. NO default a active.
 *
 * Caller (UPSERT) escribe `unmapped_reason` cuando el resultado no es resolved.
 */
export const mapHubSpotStageToLifecycle = (
  input: MapHubSpotStageInput
): MapHubSpotStageResult => {
  const stageId = input.hsPipelineStageId?.trim()
  const stageLabel = input.hsPipelineStageLabel?.trim()

  // Caso 1: stage ID coincide con mapping conocido.
  if (stageId && HUBSPOT_STAGE_ID_TO_GREENHOUSE[stageId]) {
    const m = HUBSPOT_STAGE_ID_TO_GREENHOUSE[stageId]!

    return {
      resolved: true,
      pipelineStage: m.stage,
      status: m.status,
      active: m.active
    }
  }

  // Caso 2: label coincide (fallback edge cases sin ID).
  if (stageLabel && HUBSPOT_STAGE_LABEL_TO_GREENHOUSE[stageLabel]) {
    const m = HUBSPOT_STAGE_LABEL_TO_GREENHOUSE[stageLabel]!

    return {
      resolved: true,
      pipelineStage: m.stage,
      status: m.status,
      active: m.active
    }
  }

  // Caso 3: degraded honest. Operador extiende el mapper antes de aprobar
  // mas operacion sobre esa stage. Default a `paused/closed/false` para
  // que NO contamine P&L/ICO/attribution mientras se resuelve.
  const detail = stageId
    ? `unknown HubSpot stage ID: ${stageId}`
    : stageLabel
      ? `unknown HubSpot stage label: ${stageLabel}`
      : 'no stage ID or label provided'

  return {
    resolved: false,
    reason: 'unknown_pipeline_stage',
    detail,
    fallbackPipelineStage: 'paused',
    fallbackStatus: 'paused',
    fallbackActive: false
  }
}

/**
 * Helper: lista de stage IDs conocidos para tests + drift detection.
 */
export const KNOWN_HUBSPOT_STAGE_IDS = Object.freeze(Object.keys(HUBSPOT_STAGE_ID_TO_GREENHOUSE))
