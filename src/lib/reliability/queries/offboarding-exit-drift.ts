/* eslint-disable greenhouse/no-inline-payroll-scope-gate -- TASK-1349: these are reliability DETECTORS over offboarding cases (drift), not payroll-scope decisions; the scope decision stays in the canonical resolver `src/lib/payroll/exit-eligibility`. */
import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1349 — three exit-drift signals, one file, one honest-degradation
 * shape (mirror of `offboarding-completeness-partial.ts`). Steady state = 0.
 *
 * 1. `hr.offboarding.unresolved_exit_signal` — non-terminal cases (draft /
 *    needs_review / blocked) whose signal date is already in the past and
 *    that no `access_only` review has resolved. Each one blocks payroll
 *    calculation/approval of the periods it touches (Slice 0 gate) and is a
 *    decision nobody has taken. Severity: warning >0 (error when >3, the
 *    near-miss class of 2026-07-06 compounds).
 * 2. `hr.offboarding.executed_member_still_active` — executed REAL exits
 *    (lane <> identity_only, LWD in the past) whose member is still
 *    `active=true` (ISSUE-117). Recovery = governed command, never SQL.
 * 3. `workforce.offboarding.deprovisioned_member_without_case` — active
 *    members whose linked account was deactivated by SCIM/admin but have no
 *    offboarding case at all (the "Maggie" shape). Detection only: nobody
 *    infers a labor exit from an access signal (TASK-1761 owns the Microsoft
 *    side).
 */

export const OFFBOARDING_UNRESOLVED_EXIT_SIGNAL_ID = 'hr.offboarding.unresolved_exit_signal'
export const OFFBOARDING_EXECUTED_MEMBER_STILL_ACTIVE_SIGNAL_ID = 'hr.offboarding.executed_member_still_active'
export const WORKFORCE_DEPROVISIONED_MEMBER_WITHOUT_CASE_SIGNAL_ID = 'workforce.offboarding.deprovisioned_member_without_case'

const UNRESOLVED_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.work_relationship_offboarding_cases AS c
  JOIN greenhouse_core.members AS m ON m.member_id = c.member_id
  WHERE c.status IN ('draft', 'needs_review', 'blocked')
    AND m.is_demo = FALSE
    AND COALESCE(c.last_working_day, c.effective_date, c.created_at::date) <= CURRENT_DATE
    AND COALESCE(c.metadata_json -> 'review' ->> 'decision', '') <> 'access_only'
    -- a stale access stub of a person whose REAL exit is already executed does
    -- not govern payroll (the executed case does); it stays visible in the
    -- work queue but is not an unresolved exit.
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_hr.work_relationship_offboarding_cases x
      WHERE x.member_id = c.member_id
        AND x.status = 'executed'
        AND x.rule_lane <> 'identity_only'
        AND x.last_working_day IS NOT NULL
        AND x.last_working_day <= COALESCE(c.last_working_day, c.effective_date, c.created_at::date)
    )
`

const EXECUTED_STILL_ACTIVE_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.work_relationship_offboarding_cases AS c
  JOIN greenhouse_core.members AS m ON m.member_id = c.member_id
  WHERE c.status = 'executed'
    AND c.rule_lane <> 'identity_only'
    AND c.separation_type <> 'identity_only'
    AND c.last_working_day IS NOT NULL
    AND c.last_working_day <= CURRENT_DATE
    AND m.active = TRUE
    AND m.is_demo = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_payroll.compensation_versions cv
      WHERE cv.member_id = m.member_id AND cv.effective_from > c.last_working_day
    )
    -- re-entry under a NEW episode (employee → contractor, re-hire): the exit
    -- governs its episode only; an active relationship or engagement that
    -- started after the LWD means the member is current workforce.
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_core.person_legal_entity_relationships r
      WHERE r.profile_id = m.identity_profile_id AND r.status = 'active' AND r.effective_to IS NULL
        AND r.effective_from > c.last_working_day
    )
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_hr.contractor_engagements e
      WHERE e.member_id = m.member_id AND e.status IN ('active', 'paused', 'ending', 'pending_review', 'draft')
        AND (e.end_date IS NULL OR e.end_date > CURRENT_DATE) AND e.start_date > c.last_working_day
    )
`

const DEPROVISIONED_WITHOUT_CASE_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.members AS m
  JOIN greenhouse_core.client_users AS cu
    ON cu.identity_profile_id = m.identity_profile_id
   AND cu.tenant_type = 'efeonce_internal'
  WHERE m.active = TRUE
    AND m.is_demo = FALSE
    AND cu.active = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_hr.work_relationship_offboarding_cases c
      WHERE c.member_id = m.member_id AND c.status <> 'cancelled'
    )
`

type CountRow = { n: number }

const buildSignal = async ({
  signalId,
  moduleKey,
  sql,
  label,
  source,
  summarize,
  severityFor,
  evidenceLabel
}: {
  signalId: string
  moduleKey: 'identity'
  sql: string
  label: string
  source: string
  summarize: (count: number) => string
  severityFor: (count: number) => 'ok' | 'warning' | 'error'
  evidenceLabel: string
}): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CountRow>(sql)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId,
      moduleKey,
      kind: 'drift',
      source,
      label,
      severity: severityFor(count),
      summary: summarize(count),
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: evidenceLabel },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'steady_state', value: '0' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, moduleKey, { extra: { source, signalId } })

    return {
      signalId,
      moduleKey,
      kind: 'drift',
      source,
      label,
      severity: 'unknown',
      summary: 'No se pudo evaluar la señal (query falló).',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}

export const getOffboardingUnresolvedExitSignal = () =>
  buildSignal({
    signalId: OFFBOARDING_UNRESOLVED_EXIT_SIGNAL_ID,
    // Rolls up under Identity & Access like `hr.offboarding.completeness_partial`
    // (`hr` is not a reliability module key).
    moduleKey: 'identity',
    sql: UNRESOLVED_SQL,
    label: 'Salidas sin resolver que afectan nómina',
    source: 'getOffboardingUnresolvedExitSignal',
    evidenceLabel:
      'work_relationship_offboarding_cases (draft|needs_review|blocked) con señal <= hoy y sin revisión access_only',
    severityFor: count => (count === 0 ? 'ok' : count > 3 ? 'error' : 'warning'),
    summarize: count =>
      count === 0
        ? 'Sin salidas pendientes de decisión.'
        : `${count} caso${count === 1 ? '' : 's'} de salida sin resolver con señal en el pasado — bloquea${count === 1 ? '' : 'n'} el cálculo/aprobación de nómina hasta revisar (solo acceso o término de relación).`
  })

export const getOffboardingExecutedMemberStillActiveSignal = () =>
  buildSignal({
    signalId: OFFBOARDING_EXECUTED_MEMBER_STILL_ACTIVE_SIGNAL_ID,
    moduleKey: 'identity',
    sql: EXECUTED_STILL_ACTIVE_SQL,
    label: 'Salidas ejecutadas con colaborador aún activo',
    source: 'getOffboardingExecutedMemberStillActiveSignal',
    evidenceLabel: 'cases executed (lane <> identity_only, LWD <= hoy) ⨝ members.active = TRUE, sin reingreso posterior',
    severityFor: count => (count === 0 ? 'ok' : 'warning'),
    summarize: count =>
      count === 0
        ? 'Todo caso ejecutado tiene su colaborador desactivado en el registro canónico.'
        : `${count} salida${count === 1 ? '' : 's'} ejecutada${count === 1 ? '' : 's'} con el colaborador todavía active=true (ISSUE-117) — aplica la recuperación gobernada, nunca SQL.`
  })

export const getWorkforceDeprovisionedMemberWithoutCaseSignal = () =>
  buildSignal({
    signalId: WORKFORCE_DEPROVISIONED_MEMBER_WITHOUT_CASE_SIGNAL_ID,
    moduleKey: 'identity',
    sql: DEPROVISIONED_WITHOUT_CASE_SQL,
    label: 'Cuentas dadas de baja sin caso de offboarding',
    source: 'getWorkforceDeprovisionedMemberWithoutCaseSignal',
    evidenceLabel: 'members.active = TRUE ⨝ client_users (efeonce_internal) active = FALSE sin ningún case no cancelado',
    severityFor: count => (count === 0 ? 'ok' : 'warning'),
    summarize: count =>
      count === 0
        ? 'Toda baja de acceso interna tiene un caso de offboarding que la revise.'
        : `${count} colaborador${count === 1 ? '' : 'es'} activo${count === 1 ? '' : 's'} con la cuenta desactivada y sin caso de offboarding — abre revisión; no se infiere salida laboral.`
  })
