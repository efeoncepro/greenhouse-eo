import 'server-only'

/**
 * TASK-1291 Slice 2 — Growth AI Visibility · gate de validación del cross-sell operador · signal.
 *
 * `growth.ai_visibility.operator_gate_blocking` (drift): ata el estado del flag del cross-sell con la
 * población que el gate (`assertSubjectGradeable`) bloquearía. Cuenta perfiles de marca ORG-LINKED
 * activos que son PROSPECTO (org no cliente) y NO graduables como prospecto — categoría no resuelta
 * (`category_node_id` NULL/'unknown') O modelo de negocio sin confirmar (`business_model` NULL/'unknown').
 * Es la población que un envío/run operador rechazaría: si el cross-sell está ON y este número sube,
 * el operador chocará el gate al intentar correr/enviar sobre esos prospectos → resolver su categoría/
 * modelo (grounded read / override) antes de cross-sellear.
 *
 * Distinto de los signals atómicos `profile_category_unresolved` / `profile_business_model_unresolved`
 * (que cuentan TODA la población org-linked sin resolver): este aplica el predicado COMPUESTO del gate
 * (prospecto) y se atenúa por el flag. Gate: `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` OFF → severity
 * `ok` (pre-launch, sin envíos operador). Steady target: 0. Error de lectura → `unknown` (honesto).
 */

import { isOperatorSendEnabled } from '@/lib/growth/ai-visibility/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_OPERATOR_GATE_BLOCKING_SIGNAL_ID =
  'growth.ai_visibility.operator_gate_blocking'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthAiVisibilityOperatorGateSignals'

type OperatorGateAgg = {
  org_linked: number
  prospect_ungradeable: number
}

const buildOperatorGateSignals = async (observedAt: string): Promise<ReliabilitySignal[]> => {
  const enabled = isOperatorSendEnabled()

  // Predicado de prospecto = espejo de getOrganizationCommercialFacts (org NO cliente). COALESCE trata
  // una org faltante como prospecto (lo más estricto, igual que el gate cuando facts=null).
  const rows = await runGreenhousePostgresQuery<OperatorGateAgg>(
    `SELECT
       COUNT(*) FILTER (WHERE gp.organization_id IS NOT NULL)::int AS org_linked,
       COUNT(*) FILTER (
         WHERE gp.organization_id IS NOT NULL
           AND NOT (
             COALESCE(o.organization_type IN ('client', 'both'), FALSE)
             OR COALESCE(o.lifecycle_stage = 'active_client', FALSE)
           )
           AND (
             gp.category_node_id IS NULL OR gp.category_node_id = 'unknown'
             OR gp.business_model IS NULL OR gp.business_model = 'unknown'
           )
       )::int AS prospect_ungradeable
     FROM greenhouse_growth.grader_profiles gp
     LEFT JOIN greenhouse_core.organizations o ON o.organization_id = gp.organization_id
     WHERE gp.status = 'active'`
  )

  const orgLinked = Number(rows[0]?.org_linked ?? 0)
  const blocked = Number(rows[0]?.prospect_ungradeable ?? 0)

  const severity: ReliabilitySignal['severity'] = !enabled
    ? 'ok'
    : blocked === 0
      ? 'ok'
      : blocked <= 5
        ? 'warning'
        : 'error'

  return [
    {
      signalId: GROWTH_AI_VISIBILITY_OPERATOR_GATE_BLOCKING_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: SOURCE,
      label: 'Cross-sell AEO: prospectos no graduables (gate bloqueando)',
      severity,
      summary: !enabled
        ? 'Cross-sell operador OFF: el gate no bloquea envíos activos (esperado pre-launch).'
        : blocked === 0
          ? `Todos los prospectos enlazados (${orgLinked} perfiles) pasan el gate de validación.`
          : `${blocked} prospecto(s) no graduables (categoría/modelo sin resolver) — el operador chocará el gate al cross-sellear. Resolver antes vía grounded read / override.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'prospect_ungradeable', value: String(blocked) },
        { kind: 'metric', label: 'org_linked', value: String(orgLinked) },
        { kind: 'metric', label: 'operator_send_enabled', value: String(enabled) },
        { kind: 'doc', label: 'follow-up', value: 'TASK-1291 — resolver categoría/modelo (grounded / override operador)' }
      ]
    }
  ]
}

export const getGrowthAiVisibilityOperatorGateSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  return buildOperatorGateSignals(observedAt).catch(error => {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_operator_gate' } })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_OPERATOR_GATE_BLOCKING_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'drift' as const,
        source: SOURCE,
        label: 'Cross-sell AEO: prospectos no graduables (gate bloqueando)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          { kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }
        ]
      }
    ]
  })
}
