import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySignalKind, ReliabilitySeverity } from '@/types/reliability'

/**
 * TASK-837 Slice 6 — 7 Reliability Signals for Sample Sprint outbound projection.
 *
 * All signals roll up under subsystem `commercial` (Commercial Health). Steady
 * state = 0 for all (any > 0 indicates drift or operator action required).
 *
 * Pattern source: TASK-742 7-layer + TASK-744 commercial-health signals shape.
 * Each reader is independent + idempotent + degraded-honest (returns 'unknown'
 * severity on error, never throws to the caller).
 */

interface CountRow extends Record<string, unknown> {
  count: string | number
}

const toCount = (row: CountRow | undefined): number => {
  if (!row) return 0
  const value = row.count
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? n : 0
}

const buildSignal = (input: {
  signalId: string
  label: string
  kind: ReliabilitySignalKind
  source: string
  count: number
  severityWhenNonZero: ReliabilitySeverity
  steadyMessage: string
  driftMessage: (count: number) => string
  runbookHint: string
  thresholdEvidence?: Array<{ label: string; value: string }>
}): ReliabilitySignal => {
  const observedAt = new Date().toISOString()

  const severity: ReliabilitySeverity =
    input.count === 0 ? 'ok' : input.severityWhenNonZero

  return {
    signalId: input.signalId,
    moduleKey: 'commercial',
    kind: input.kind,
    source: input.source,
    label: input.label,
    severity,
    summary: input.count === 0 ? input.steadyMessage : input.driftMessage(input.count),
    observedAt,
    evidence: [
      { kind: 'metric', label: 'count', value: String(input.count) },
      ...(input.thresholdEvidence ?? []).map(e => ({
        kind: 'metric' as const,
        label: e.label,
        value: e.value
      })),
      { kind: 'doc', label: 'Runbook', value: input.runbookHint }
    ]
  }
}

const buildErrorSignal = (input: {
  signalId: string
  label: string
  kind: ReliabilitySignalKind
  source: string
  error: unknown
}): ReliabilitySignal => ({
  signalId: input.signalId,
  moduleKey: 'commercial',
  kind: input.kind,
  source: input.source,
  label: input.label,
  severity: 'unknown',
  summary: 'No fue posible leer el signal. Revisa los logs.',
  observedAt: new Date().toISOString(),
  evidence: [
    {
      kind: 'metric',
      label: 'error',
      value: input.error instanceof Error ? input.error.message : String(input.error)
    }
  ]
})

// ----------------------------------------------------------------------------
// 1. outbound_pending_overdue (lag, warning)
// ----------------------------------------------------------------------------

export const SAMPLE_SPRINT_OUTBOUND_PENDING_OVERDUE_SIGNAL_ID =
  'commercial.sample_sprint.outbound_pending_overdue'

const OVERDUE_THRESHOLD_MINUTES = 15

export const getSampleSprintOutboundPendingOverdueSignal =
  async (): Promise<ReliabilitySignal> => {
    try {
      const rows = await query<CountRow>(
        `SELECT COUNT(*)::text AS count
           FROM greenhouse_core.services
          WHERE engagement_kind != 'regular'
            AND hubspot_sync_status IN ('outbound_pending', 'outbound_in_progress')
            AND created_at < (NOW() - INTERVAL '15 minutes')`
      )

      const count = toCount(rows[0])

      return buildSignal({
        signalId: SAMPLE_SPRINT_OUTBOUND_PENDING_OVERDUE_SIGNAL_ID,
        label: 'Sample Sprint outbound pending overdue',
        kind: 'lag',
        source: 'getSampleSprintOutboundPendingOverdueSignal',
        count,
        severityWhenNonZero: 'warning',
        steadyMessage: `Sin Sample Sprints con outbound projection pendiente más de ${OVERDUE_THRESHOLD_MINUTES} minutos.`,
        driftMessage: c =>
          `${c} ${c === 1 ? 'Sample Sprint tiene' : 'Sample Sprints tienen'} outbound projection pendiente más de ${OVERDUE_THRESHOLD_MINUTES} minutos. Verificar reactive consumer + Cloud Scheduler.`,
        runbookHint: 'docs/operations/runbooks/sample-sprint-outbound-recovery.md',
        thresholdEvidence: [
          { label: 'threshold_minutes', value: String(OVERDUE_THRESHOLD_MINUTES) }
        ]
      })
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_sample_sprint_outbound_pending_overdue' }
      })

      return buildErrorSignal({
        signalId: SAMPLE_SPRINT_OUTBOUND_PENDING_OVERDUE_SIGNAL_ID,
        label: 'Sample Sprint outbound pending overdue',
        kind: 'lag',
        source: 'getSampleSprintOutboundPendingOverdueSignal',
        error
      })
    }
  }

// ----------------------------------------------------------------------------
// 2. outbound_dead_letter (dead_letter, error)
// ----------------------------------------------------------------------------

export const SAMPLE_SPRINT_OUTBOUND_DEAD_LETTER_SIGNAL_ID =
  'commercial.sample_sprint.outbound_dead_letter'

export const getSampleSprintOutboundDeadLetterSignal =
  async (): Promise<ReliabilitySignal> => {
    try {
      const rows = await query<CountRow>(
        `SELECT COUNT(*)::text AS count
           FROM greenhouse_core.services
          WHERE engagement_kind != 'regular'
            AND hubspot_sync_status = 'outbound_dead_letter'`
      )

      const count = toCount(rows[0])

      return buildSignal({
        signalId: SAMPLE_SPRINT_OUTBOUND_DEAD_LETTER_SIGNAL_ID,
        label: 'Sample Sprint outbound dead-letter',
        kind: 'dead_letter',
        source: 'getSampleSprintOutboundDeadLetterSignal',
        count,
        severityWhenNonZero: 'error',
        steadyMessage: 'Sin Sample Sprints en outbound_dead_letter.',
        driftMessage: c =>
          `${c} ${c === 1 ? 'Sample Sprint requiere' : 'Sample Sprints requieren'} recovery operativo desde dead-letter UX.`,
        runbookHint:
          'docs/operations/runbooks/sample-sprint-outbound-recovery.md (sección dead-letter recovery)'
      })
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_sample_sprint_outbound_dead_letter' }
      })

      return buildErrorSignal({
        signalId: SAMPLE_SPRINT_OUTBOUND_DEAD_LETTER_SIGNAL_ID,
        label: 'Sample Sprint outbound dead-letter',
        kind: 'dead_letter',
        source: 'getSampleSprintOutboundDeadLetterSignal',
        error
      })
    }
  }

// ----------------------------------------------------------------------------
// 3. partial_associations (drift, warning)
// ----------------------------------------------------------------------------

export const SAMPLE_SPRINT_PARTIAL_ASSOCIATIONS_SIGNAL_ID =
  'commercial.sample_sprint.partial_associations'

export const getSampleSprintPartialAssociationsSignal =
  async (): Promise<ReliabilitySignal> => {
    try {
      const rows = await query<CountRow>(
        `SELECT COUNT(*)::text AS count
           FROM greenhouse_core.services
          WHERE engagement_kind != 'regular'
            AND hubspot_sync_status = 'partial_associations'`
      )

      const count = toCount(rows[0])

      return buildSignal({
        signalId: SAMPLE_SPRINT_PARTIAL_ASSOCIATIONS_SIGNAL_ID,
        label: 'Sample Sprint partial associations',
        kind: 'drift',
        source: 'getSampleSprintPartialAssociationsSignal',
        count,
        severityWhenNonZero: 'warning',
        steadyMessage: 'Sin Sample Sprints con asociaciones parciales en HubSpot.',
        driftMessage: c =>
          `${c} ${c === 1 ? 'Sample Sprint quedó' : 'Sample Sprints quedaron'} con asociaciones parciales (Deal/Company/Contact). Reactive consumer reintenta.`,
        runbookHint:
          'docs/operations/runbooks/sample-sprint-outbound-recovery.md (sección partial associations)'
      })
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_sample_sprint_partial_associations' }
      })

      return buildErrorSignal({
        signalId: SAMPLE_SPRINT_PARTIAL_ASSOCIATIONS_SIGNAL_ID,
        label: 'Sample Sprint partial associations',
        kind: 'drift',
        source: 'getSampleSprintPartialAssociationsSignal',
        error
      })
    }
  }

// ----------------------------------------------------------------------------
// 4. deal_closed_but_active (drift, warning)
// ----------------------------------------------------------------------------

export const SAMPLE_SPRINT_DEAL_CLOSED_BUT_ACTIVE_SIGNAL_ID =
  'commercial.sample_sprint.deal_closed_but_active'

export const getSampleSprintDealClosedButActiveSignal =
  async (): Promise<ReliabilitySignal> => {
    try {
      const rows = await query<CountRow>(
        `SELECT COUNT(*)::text AS count
           FROM greenhouse_core.services s
           JOIN greenhouse_commercial.deals d ON d.hubspot_deal_id = s.hubspot_deal_id
          WHERE s.engagement_kind != 'regular'
            AND s.hubspot_sync_status = 'ready'
            AND s.status = 'active'
            AND d.is_closed = TRUE
            AND d.is_deleted = FALSE`
      )

      const count = toCount(rows[0])

      return buildSignal({
        signalId: SAMPLE_SPRINT_DEAL_CLOSED_BUT_ACTIVE_SIGNAL_ID,
        label: 'Sample Sprint con Deal cerrado pero servicio activo',
        kind: 'drift',
        source: 'getSampleSprintDealClosedButActiveSignal',
        count,
        severityWhenNonZero: 'warning',
        steadyMessage: 'Sin Sample Sprints activos con su Deal HubSpot cerrado.',
        driftMessage: c =>
          `${c} ${c === 1 ? 'Sample Sprint sigue' : 'Sample Sprints siguen'} activos pero su Deal HubSpot ya cerró. Operador comercial debe registrar outcome o reabrir el Deal.`,
        runbookHint:
          'docs/operations/runbooks/sample-sprint-outbound-recovery.md (sección deal_closed_but_active)'
      })
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_sample_sprint_deal_closed_but_active' }
      })

      return buildErrorSignal({
        signalId: SAMPLE_SPRINT_DEAL_CLOSED_BUT_ACTIVE_SIGNAL_ID,
        label: 'Sample Sprint con Deal cerrado pero servicio activo',
        kind: 'drift',
        source: 'getSampleSprintDealClosedButActiveSignal',
        error
      })
    }
  }

// ----------------------------------------------------------------------------
// 5. deal_associations_drift (drift, warning)
// V1: PG-only proxy — count services with hubspot_deal_id but the local mirror
// of the deal lost its company link (deal.client_id became NULL after originally
// being populated). This is approximate; full HubSpot association polling is
// out of scope for V1 and queued as TASK-derivada V1.1.
// ----------------------------------------------------------------------------

export const SAMPLE_SPRINT_DEAL_ASSOCIATIONS_DRIFT_SIGNAL_ID =
  'commercial.sample_sprint.deal_associations_drift'

export const getSampleSprintDealAssociationsDriftSignal =
  async (): Promise<ReliabilitySignal> => {
    try {
      const rows = await query<CountRow>(
        `SELECT COUNT(*)::text AS count
           FROM greenhouse_core.services s
           JOIN greenhouse_commercial.deals d ON d.hubspot_deal_id = s.hubspot_deal_id
          WHERE s.engagement_kind != 'regular'
            AND s.hubspot_sync_status IN ('ready', 'partial_associations')
            AND s.status = 'active'
            AND d.client_id IS NULL
            AND d.is_deleted = FALSE`
      )

      const count = toCount(rows[0])

      return buildSignal({
        signalId: SAMPLE_SPRINT_DEAL_ASSOCIATIONS_DRIFT_SIGNAL_ID,
        label: 'Sample Sprint Deal lost company link',
        kind: 'drift',
        source: 'getSampleSprintDealAssociationsDriftSignal',
        count,
        severityWhenNonZero: 'warning',
        steadyMessage: 'Sin Sample Sprints cuyo Deal HubSpot perdió company link.',
        driftMessage: c =>
          `${c} ${c === 1 ? 'Sample Sprint tiene' : 'Sample Sprints tienen'} Deal HubSpot sin company asociada (drift post-creación). Operador comercial revisa associations en HubSpot.`,
        runbookHint:
          'docs/operations/runbooks/sample-sprint-outbound-recovery.md (sección deal_associations_drift)'
      })
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_sample_sprint_deal_associations_drift' }
      })

      return buildErrorSignal({
        signalId: SAMPLE_SPRINT_DEAL_ASSOCIATIONS_DRIFT_SIGNAL_ID,
        label: 'Sample Sprint Deal lost company link',
        kind: 'drift',
        source: 'getSampleSprintDealAssociationsDriftSignal',
        error
      })
    }
  }

// ----------------------------------------------------------------------------
// 6. outcome_terminal_pservices_open (drift, warning)
// JOIN with engagement_outcomes — terminal outcome but service.pipeline_stage
// is still in 'validation' (i.e. p_services not moved to Closed in HubSpot).
// ----------------------------------------------------------------------------

export const SAMPLE_SPRINT_OUTCOME_TERMINAL_PSERVICES_OPEN_SIGNAL_ID =
  'commercial.sample_sprint.outcome_terminal_pservices_open'

export const getSampleSprintOutcomeTerminalPservicesOpenSignal =
  async (): Promise<ReliabilitySignal> => {
    try {
      const rows = await query<CountRow>(
        `SELECT COUNT(DISTINCT s.service_id)::text AS count
           FROM greenhouse_core.services s
           JOIN greenhouse_commercial.engagement_outcomes oc
             ON oc.service_id = s.service_id
          WHERE s.engagement_kind != 'regular'
            AND s.hubspot_sync_status = 'ready'
            AND oc.outcome_kind IN ('converted', 'cancelled', 'dropped')
            AND s.pipeline_stage = 'validation'`
      )

      const count = toCount(rows[0])

      return buildSignal({
        signalId: SAMPLE_SPRINT_OUTCOME_TERMINAL_PSERVICES_OPEN_SIGNAL_ID,
        label: 'Sample Sprint outcome terminal pero p_services HubSpot abierto',
        kind: 'drift',
        source: 'getSampleSprintOutcomeTerminalPservicesOpenSignal',
        count,
        severityWhenNonZero: 'warning',
        steadyMessage:
          'Sin Sample Sprints con outcome terminal y p_services HubSpot todavía en Validación.',
        driftMessage: c =>
          `${c} ${c === 1 ? 'Sample Sprint tiene' : 'Sample Sprints tienen'} outcome terminal (converted/cancelled/dropped) pero p_services HubSpot sigue en Validación. Operador HubSpot mueve manualmente a Closed (V1).`,
        runbookHint:
          'docs/operations/runbooks/sample-sprint-outbound-recovery.md (sección outcome_terminal_pservices_open)'
      })
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_sample_sprint_outcome_terminal_pservices_open' }
      })

      return buildErrorSignal({
        signalId: SAMPLE_SPRINT_OUTCOME_TERMINAL_PSERVICES_OPEN_SIGNAL_ID,
        label: 'Sample Sprint outcome terminal pero p_services HubSpot abierto',
        kind: 'drift',
        source: 'getSampleSprintOutcomeTerminalPservicesOpenSignal',
        error
      })
    }
  }

// ----------------------------------------------------------------------------
// 7. legacy_without_deal (data_quality, warning)
// Sample Sprints declarados antes de TASK-837 sin hubspot_deal_id. Alimenta
// manual queue UI futura para vincular retroactivamente.
// ----------------------------------------------------------------------------

export const SAMPLE_SPRINT_LEGACY_WITHOUT_DEAL_SIGNAL_ID =
  'commercial.sample_sprint.legacy_without_deal'

export const getSampleSprintLegacyWithoutDealSignal =
  async (): Promise<ReliabilitySignal> => {
    try {
      const rows = await query<CountRow>(
        `SELECT COUNT(*)::text AS count
           FROM greenhouse_core.services
          WHERE engagement_kind != 'regular'
            AND status = 'active'
            AND hubspot_deal_id IS NULL`
      )

      const count = toCount(rows[0])

      return buildSignal({
        signalId: SAMPLE_SPRINT_LEGACY_WITHOUT_DEAL_SIGNAL_ID,
        label: 'Sample Sprint legacy sin Deal HubSpot',
        kind: 'data_quality',
        source: 'getSampleSprintLegacyWithoutDealSignal',
        count,
        severityWhenNonZero: 'warning',
        steadyMessage: 'Sin Sample Sprints activos legacy sin Deal HubSpot vinculado.',
        driftMessage: c =>
          `${c} ${c === 1 ? 'Sample Sprint legacy carece' : 'Sample Sprints legacy carecen'} de Deal HubSpot. Manual queue UI debe permitir vincular retroactivamente o cerrar.`,
        runbookHint:
          'docs/operations/runbooks/sample-sprint-outbound-recovery.md (sección legacy_without_deal)'
      })
    } catch (error) {
      captureWithDomain(error, 'commercial', {
        tags: { source: 'reliability_signal_sample_sprint_legacy_without_deal' }
      })

      return buildErrorSignal({
        signalId: SAMPLE_SPRINT_LEGACY_WITHOUT_DEAL_SIGNAL_ID,
        label: 'Sample Sprint legacy sin Deal HubSpot',
        kind: 'data_quality',
        source: 'getSampleSprintLegacyWithoutDealSignal',
        error
      })
    }
  }
