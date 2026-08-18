import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  AI_SCORING_RUN_ITEM_TERMINAL_STATUSES,
} from '@/types/hiring-assessment-ai-run'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1734 Slice 6 — Reliability signals del run asíncrono de scoring IA de assessments
 * (ADR `GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1`, §Resilience).
 *
 * Cinco señales PII-free (solo counts/IDs agregados; NUNCA texto de respuesta, nombre,
 * score individual ni rationale — el resultado del scoring es operator-only y estas
 * señales viajan al dashboard `/admin/operations`):
 *
 *  1. `hiring.assessment_ai.run_backlog_stuck`     — runs atascados (lease vencida / edad).
 *  2. `hiring.assessment_ai.provider_failure_rate` — items `failed` por modelo en 24h.
 *  3. `hiring.assessment_ai.abstention_rate`       — abstenciones / items puntuados (7d, advisory).
 *  4. `hiring.assessment_ai.override_delta`        — overridden+rejected vs confirmed (30d).
 *  5. `hiring.assessment_ai.orphan_reconciliation` — huérfanas pendientes del reconcile (steady=0).
 *
 * Con los flags del ADR D6 en OFF, TODAS deben reportar `ok` (steady=0 sin actividad):
 * cualquier otra cosa es drift pre-rollout. Runbook de rollout/rollback:
 * `docs/operations/runbooks/assessment-ai-scoring-rollout.md`.
 */

export const HIRING_ASSESSMENT_AI_RUN_BACKLOG_STUCK_SIGNAL_ID = 'hiring.assessment_ai.run_backlog_stuck'
export const HIRING_ASSESSMENT_AI_PROVIDER_FAILURE_SIGNAL_ID = 'hiring.assessment_ai.provider_failure_rate'
export const HIRING_ASSESSMENT_AI_ABSTENTION_RATE_SIGNAL_ID = 'hiring.assessment_ai.abstention_rate'
export const HIRING_ASSESSMENT_AI_OVERRIDE_DELTA_SIGNAL_ID = 'hiring.assessment_ai.override_delta'
export const HIRING_ASSESSMENT_AI_ORPHAN_RECONCILIATION_SIGNAL_ID = 'hiring.assessment_ai.orphan_reconciliation'

const RUN_TABLE = 'greenhouse_hiring.hiring_assessment_ai_scoring_run'
const ITEM_TABLE = 'greenhouse_hiring.hiring_assessment_ai_scoring_run_item'

/** SQL literal de estados terminales de item — derivado del enum canónico, nunca a mano. */
const ITEM_TERMINAL_SQL = `(${AI_SCORING_RUN_ITEM_TERMINAL_STATUSES.map(s => `'${s}'`).join(', ')})`

const RUNBOOK_EVIDENCE = {
  kind: 'doc' as const,
  label: 'Runbook',
  value: 'docs/operations/runbooks/assessment-ai-scoring-rollout.md',
}

const ADR_EVIDENCE = {
  kind: 'doc' as const,
  label: 'ADR',
  value: 'docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md',
}

const unknownSignal = (
  signalId: string,
  kind: ReliabilitySignal['kind'],
  source: string,
  label: string,
): ReliabilitySignal => ({
  signalId,
  moduleKey: 'hiring',
  kind,
  source,
  label,
  severity: 'unknown',
  observedAt: null,
  summary: 'No se pudo evaluar la señal del scoring IA de assessments.',
  evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
})

// ── 1. Runs atascados (lag, steady=0) ───────────────────────────────────────

type BacklogRow = {
  n: number
  oldest_minutes: number
}

/**
 * Runs `enumerating|scoring` con lease vencida hace >5 min (el drain los reclamaría en
 * el próximo tick sano — si persisten, el scheduler está caído o el drain falla) o con
 * edad total >30 min (un run cabe en un tick del drain por diseño — ADR D4).
 *
 * Steady=0. Severidad conservadora: >0 ⇒ `warning`; el más viejo >120 min ⇒ `error`
 * (dos horas sin drenar = scheduler caído o falla persistente de provider).
 */
export const getHiringAssessmentAiRunBacklogStuckSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Runs de scoring IA atascados'

  try {
    const rows = await runGreenhousePostgresQuery<BacklogRow>(`
      SELECT COUNT(*)::int AS n,
             COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60), 0)::int AS oldest_minutes
        FROM ${RUN_TABLE}
       WHERE status IN ('enumerating', 'scoring')
         AND (
           (lease_expires_at IS NOT NULL AND lease_expires_at < NOW() - INTERVAL '5 minutes')
           OR created_at < NOW() - INTERVAL '30 minutes'
         )`)

    const row = rows[0] ?? { n: 0, oldest_minutes: 0 }
    const count = Number(row.n)
    const oldestMinutes = Number(row.oldest_minutes)

    return {
      signalId: HIRING_ASSESSMENT_AI_RUN_BACKLOG_STUCK_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'lag',
      source: 'getHiringAssessmentAiRunBacklogStuckSignal',
      label,
      severity: count === 0 ? 'ok' : oldestMinutes > 120 ? 'error' : 'warning',
      summary:
        count === 0
          ? 'Ningún run de scoring IA está atascado.'
          : `${count} run(s) enumerating/scoring con lease vencida o edad > umbral (el más viejo lleva ${oldestMinutes} min). El drain del ops-worker no los está tomando: revisar Cloud Scheduler ops-assessment-ai-drain + flags.`,
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'stuck_runs', value: String(count) },
        { kind: 'metric', label: 'oldest_minutes', value: String(oldestMinutes) },
        {
          kind: 'sql',
          label: 'Query',
          value: `${RUN_TABLE} WHERE status IN ('enumerating','scoring') AND (lease vencida > 5 min OR created_at > 30 min)`,
        },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_ai_run_backlog' } })

    return unknownSignal(
      HIRING_ASSESSMENT_AI_RUN_BACKLOG_STUCK_SIGNAL_ID,
      'lag',
      'getHiringAssessmentAiRunBacklogStuckSignal',
      label,
    )
  }
}

// ── 2. Fallas de provider por modelo (dead_letter, ventana 24h, steady=0) ───

type ProviderFailureRow = {
  model: string
  n: number
}

/**
 * Items `failed` (retry budget agotado / timeout / cost cap) en las últimas 24h,
 * dimensionados por MODELO efectivo del run (PII-free; jamás payload del provider).
 * Un item failed vuelve fail-closed a la cola manual — no se pierde — pero una tasa
 * sostenida indica provider degradado, schema drift o cost cap mal calibrado.
 *
 * Steady=0. Severidad: 1-3 ⇒ `warning`; >3 ⇒ `error` (falla sistemática, no puntual).
 */
export const getHiringAssessmentAiProviderFailureSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Fallas de provider en scoring IA (24h)'

  try {
    const rows = await runGreenhousePostgresQuery<ProviderFailureRow>(`
      SELECT COALESCE(r.model, 'unknown') AS model, COUNT(*)::int AS n
        FROM ${ITEM_TABLE} i
        JOIN ${RUN_TABLE} r ON r.run_id = i.run_id
       WHERE i.status = 'failed'
         AND i.updated_at > NOW() - INTERVAL '24 hours'
       GROUP BY 1
       ORDER BY n DESC`)

    const total = rows.reduce((acc, row) => acc + Number(row.n), 0)
    const byModel = rows.map(row => `${row.model}=${row.n}`).join(', ')

    return {
      signalId: HIRING_ASSESSMENT_AI_PROVIDER_FAILURE_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'dead_letter',
      source: 'getHiringAssessmentAiProviderFailureSignal',
      label,
      severity: total === 0 ? 'ok' : total <= 3 ? 'warning' : 'error',
      summary:
        total === 0
          ? 'Sin items failed de provider en las últimas 24 horas.'
          : `${total} item(s) failed en 24h (${byModel}). Cada uno quedó fail-closed en la cola manual; una tasa sostenida indica provider degradado o cost cap corto.`,
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'failed_items_24h', value: String(total) },
        { kind: 'metric', label: 'by_model', value: byModel || 'none' },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_ai_provider_failure' } })

    return unknownSignal(
      HIRING_ASSESSMENT_AI_PROVIDER_FAILURE_SIGNAL_ID,
      'dead_letter',
      'getHiringAssessmentAiProviderFailureSignal',
      label,
    )
  }
}

// ── 3. Tasa de abstención (data_quality, ventana 7d, ADVISORY) ──────────────

type AbstentionRow = {
  abstained: number
  attempted: number
}

/**
 * Abstenciones / items intentados (attempt_count > 0) en 7 días. ADVISORY por diseño:
 * abstenerse es el comportamiento SEGURO (injection/PII/OOD ⇒ revisión humana), así que
 * esta señal NUNCA pasa de `warning` — una tasa alta no es un incidente, es información
 * de calibración (quizá el corpus real difiere del eval, quizá el template es ambiguo).
 *
 * `warning` sólo con muestra mínima (≥5 items) y tasa >30%.
 */
export const getHiringAssessmentAiAbstentionRateSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Tasa de abstención del scoring IA (7d)'

  try {
    const rows = await runGreenhousePostgresQuery<AbstentionRow>(`
      SELECT COUNT(*) FILTER (WHERE status = 'abstained')::int AS abstained,
             COUNT(*) FILTER (WHERE attempt_count > 0)::int AS attempted
        FROM ${ITEM_TABLE}
       WHERE updated_at > NOW() - INTERVAL '7 days'`)

    const row = rows[0] ?? { abstained: 0, attempted: 0 }
    const abstained = Number(row.abstained)
    const attempted = Number(row.attempted)
    const rate = attempted > 0 ? abstained / attempted : 0
    const ratePct = Math.round(rate * 100)

    return {
      signalId: HIRING_ASSESSMENT_AI_ABSTENTION_RATE_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringAssessmentAiAbstentionRateSignal',
      label,
      severity: attempted >= 5 && rate > 0.3 ? 'warning' : 'ok',
      summary:
        attempted === 0
          ? 'Sin actividad de scoring IA en los últimos 7 días.'
          : `${abstained}/${attempted} items abstenidos (${ratePct}%) en 7 días. La abstención es fail-closed (revisión humana); una tasa alta es señal de calibración, no incidente.`,
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'abstained_7d', value: String(abstained) },
        { kind: 'metric', label: 'attempted_7d', value: String(attempted) },
        { kind: 'metric', label: 'rate_pct', value: String(ratePct) },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_ai_abstention' } })

    return unknownSignal(
      HIRING_ASSESSMENT_AI_ABSTENTION_RATE_SIGNAL_ID,
      'data_quality',
      'getHiringAssessmentAiAbstentionRateSignal',
      label,
    )
  }
}

// ── 4. Delta de override humano (drift, ventana 30d) ────────────────────────

type OverrideDeltaRow = {
  overridden: number
  confirmed: number
  rejected: number
}

/**
 * Resoluciones humanas de excepciones/muestra en 30 días: `overridden` + `rejected_to_manual`
 * (el humano DISCREPÓ de la propuesta) vs `confirmed` (el humano la validó). Es la señal
 * de CALIDAD de la IA contra el juicio humano real — el gate vivo que la spec exige
 * vigilar antes de ampliar el rollout (§Production verification sequence paso 7).
 *
 * Severidad conservadora con muestra mínima: disagreement >25% con n≥5 ⇒ `warning`;
 * >50% con n≥10 ⇒ `error` (la policy no debe seguir promoviendo batch_eligible así).
 */
export const getHiringAssessmentAiOverrideDeltaSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Delta de override humano vs propuesta IA (30d)'

  try {
    const rows = await runGreenhousePostgresQuery<OverrideDeltaRow>(`
      SELECT COUNT(*) FILTER (WHERE resolution = 'overridden')::int AS overridden,
             COUNT(*) FILTER (WHERE resolution = 'confirmed')::int AS confirmed,
             COUNT(*) FILTER (WHERE resolution = 'rejected_to_manual')::int AS rejected
        FROM ${ITEM_TABLE}
       WHERE resolution IS NOT NULL
         AND resolved_at > NOW() - INTERVAL '30 days'`)

    const row = rows[0] ?? { overridden: 0, confirmed: 0, rejected: 0 }
    const overridden = Number(row.overridden)
    const confirmed = Number(row.confirmed)
    const rejected = Number(row.rejected)
    const disagreement = overridden + rejected
    const total = disagreement + confirmed
    const rate = total > 0 ? disagreement / total : 0
    const ratePct = Math.round(rate * 100)

    const severity: ReliabilitySignal['severity'] =
      total >= 10 && rate > 0.5 ? 'error' : total >= 5 && rate > 0.25 ? 'warning' : 'ok'

    return {
      signalId: HIRING_ASSESSMENT_AI_OVERRIDE_DELTA_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'drift',
      source: 'getHiringAssessmentAiOverrideDeltaSignal',
      label,
      severity,
      summary:
        total === 0
          ? 'Sin resoluciones humanas de items IA en los últimos 30 días.'
          : `${disagreement}/${total} resoluciones discreparon de la propuesta (${ratePct}%: ${overridden} overridden + ${rejected} rechazadas vs ${confirmed} confirmadas). Sobre el umbral, congelar la ampliación del rollout y revisar la policy/eval.`,
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'overridden_30d', value: String(overridden) },
        { kind: 'metric', label: 'rejected_30d', value: String(rejected) },
        { kind: 'metric', label: 'confirmed_30d', value: String(confirmed) },
        { kind: 'metric', label: 'disagreement_pct', value: String(ratePct) },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_ai_override_delta' } })

    return unknownSignal(
      HIRING_ASSESSMENT_AI_OVERRIDE_DELTA_SIGNAL_ID,
      'drift',
      'getHiringAssessmentAiOverrideDeltaSignal',
      label,
    )
  }
}

// ── 5. Huérfanas pendientes de reconciliación (data_quality, steady=0) ──────

type OrphanRow = {
  orphan_proposals: number
  orphan_items: number
}

/**
 * Lo que `reconcileAssessmentAiScoringRuns` cerraría si corriera AHORA (ADR D3, caso
 * EO-ASM-0050): proposals `proposed` cuya respuesta ya tiene score humano (o assessment
 * `scored`) + items no terminales superados por el carril manual. Steady=0 — si esto
 * crece, la reconciliación (cron/operador) no está corriendo o está fallando.
 *
 * Severidad: 1-5 ⇒ `warning` (correr `pnpm hiring:ai:run-rollback` o el reconcile);
 * >5 ⇒ `error` (backlog sistemático).
 */
export const getHiringAssessmentAiOrphanReconciliationSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Huérfanas de scoring IA sin reconciliar'

  try {
    const rows = await runGreenhousePostgresQuery<OrphanRow>(`
      SELECT
        (SELECT COUNT(*)::int
           FROM greenhouse_hiring.hiring_assessment_ai_proposal p
           JOIN greenhouse_hiring.hiring_assessment_response r ON r.response_id = p.target_ref
           JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = r.assessment_id
          WHERE p.kind = 'response_score'
            AND p.status = 'proposed'
            AND (r.human_score IS NOT NULL OR a.status = 'scored')) AS orphan_proposals,
        (SELECT COUNT(*)::int
           FROM ${ITEM_TABLE} i
           JOIN greenhouse_hiring.hiring_assessment_response r2 ON r2.response_id = i.response_id
          WHERE i.status NOT IN ${ITEM_TERMINAL_SQL}
            AND r2.human_score IS NOT NULL) AS orphan_items`)

    const row = rows[0] ?? { orphan_proposals: 0, orphan_items: 0 }
    const orphanProposals = Number(row.orphan_proposals)
    const orphanItems = Number(row.orphan_items)
    const total = orphanProposals + orphanItems

    return {
      signalId: HIRING_ASSESSMENT_AI_ORPHAN_RECONCILIATION_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringAssessmentAiOrphanReconciliationSignal',
      label,
      severity: total === 0 ? 'ok' : total <= 5 ? 'warning' : 'error',
      summary:
        total === 0
          ? 'Sin proposals ni items huérfanos: el ledger IA está reconciliado con el carril manual.'
          : `${orphanProposals} proposal(s) y ${orphanItems} item(s) superados por el carril manual sin transicionar. Correr la reconciliación (reconcileAssessmentAiScoringRuns / pnpm hiring:ai:run-rollback en dry-run) — nunca DELETE.`,
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'orphan_proposals', value: String(orphanProposals) },
        { kind: 'metric', label: 'orphan_items', value: String(orphanItems) },
        {
          kind: 'sql',
          label: 'Query',
          value: `proposals response_score 'proposed' con human_score aplicado + items no terminales con human_score`,
        },
        RUNBOOK_EVIDENCE,
        ADR_EVIDENCE,
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_ai_orphans' } })

    return unknownSignal(
      HIRING_ASSESSMENT_AI_ORPHAN_RECONCILIATION_SIGNAL_ID,
      'data_quality',
      'getHiringAssessmentAiOrphanReconciliationSignal',
      label,
    )
  }
}

// ── Agregador (wiring canónico en get-reliability-overview) ─────────────────

/**
 * Las cinco señales del run de scoring IA. Cada getter degrada honesto a `unknown`
 * por su cuenta; el agregador nunca lanza (mismo patrón que
 * `getNexaKnowledgeRetrievalSignals`).
 */
export const getHiringAssessmentAiRunSignals = async (): Promise<ReliabilitySignal[]> =>
  Promise.all([
    getHiringAssessmentAiRunBacklogStuckSignal(),
    getHiringAssessmentAiProviderFailureSignal(),
    getHiringAssessmentAiAbstentionRateSignal(),
    getHiringAssessmentAiOverrideDeltaSignal(),
    getHiringAssessmentAiOrphanReconciliationSignal(),
  ])
