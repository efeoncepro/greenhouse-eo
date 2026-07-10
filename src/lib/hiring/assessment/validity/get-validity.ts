import 'server-only'

// TASK-1364 — Reader de validez predictiva del assessment (READ-ONLY, agregados sin PII).
//
// Join canónico: hiring_activation_request (mapping application↔member de TASK-770) →
// score AL MOMENTO DE DECIDIR (snapshot 1383 en decisionHistory[], fallback rollup) +
// hiring_competency_result → outcome de desempeño de la FUENTE CANÓNICA:
//   primaria: greenhouse_serving.ico_member_metrics (RpA mensual, ICO engine — viva)
//   secundaria: greenhouse_hr.eval_summaries.overall_rating (TASK-029)
// Pearson es invariante a escala → outcomes en su escala nativa, fuente SIEMPRE etiquetada.
//
// Invariantes: NUNCA reescribe scores ni convierte el score en gate; n<10 → NO se reporta r
// (correlación espuria prohibida); salida agregada SIN identificadores per-candidato.

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { pearson, resolveVerdict, type ValidityVerdict } from './stats'

export type ValidityOutcomeSource = 'ico_rpa' | 'hr_eval' | 'mixed' | 'none'

export interface ValidityCell {
  competencyKey: string | null
  sampleSize: number
  verdict: ValidityVerdict

  /** Solo presente con n>=10 (nunca correlación espuria). */
  correlation: number | null
  meanScore: number | null
  meanOutcome: number | null
}

export interface AssessmentValidityReport {
  scope: { templateId: string | null; competencyKey: string | null }
  windowMonths: number
  outcomeSource: ValidityOutcomeSource
  overall: ValidityCell
  byCompetency: ValidityCell[]
  computedAt: string
}

export interface GetAssessmentValidityInput {
  templateId?: string | null
  competencyKey?: string | null
  windowMonths?: number
}

interface PairRow extends Record<string, unknown> {
  member_id: string
  competency_key: string | null
  score: string | number | null
  decision_score: string | number | null
  ico_outcome: string | number | null
  eval_outcome: string | number | null
}

const toNum = (v: string | number | null): number | null => (v == null ? null : Number(v))

const buildCell = (
  pairs: Array<{ score: number; outcome: number }>,
  competencyKey: string | null,
): ValidityCell => {
  const n = pairs.length
  const verdict = resolveVerdict(n)
  const reportable = verdict !== 'insufficient_sample'

  return {
    competencyKey,
    sampleSize: n,
    verdict,
    correlation: reportable ? pearson(pairs.map((p) => p.score), pairs.map((p) => p.outcome)) : null,
    meanScore: n > 0 ? pairs.reduce((a, p) => a + p.score, 0) / n : null,
    meanOutcome: n > 0 ? pairs.reduce((a, p) => a + p.outcome, 0) / n : null,
  }
}

/**
 * Un solo query trae los pares (sin PII hacia afuera): por member contratado vía el bridge
 * de 770 — score de decisión + score por competencia + outcome ICO (AVG RpA de los meses
 * dentro de la ventana post hire_date) + outcome eval (overall_rating finalizado en ventana).
 */
const PAIRS_SQL = `
  WITH hires AS (
    SELECT har.hiring_application_id, har.member_id, m.hire_date,
           app.template_snapshot_score, app.decision_snapshot_score
    FROM greenhouse_hr.hiring_activation_request har
    JOIN greenhouse_core.members m ON m.member_id = har.member_id
    JOIN LATERAL (
      SELECT
        a.score AS template_snapshot_score,
        NULLIF((
          SELECT entry->'prerequisitesSnapshot'->'assessment'->>'score'
          FROM jsonb_array_elements(COALESCE(a.explainability_json->'decisionHistory', '[]'::jsonb)) AS entry
          WHERE entry->>'decision' = 'selected'
          ORDER BY entry->>'decidedAt' DESC
          LIMIT 1
        ), '')::numeric AS decision_snapshot_score
      FROM greenhouse_hiring.hiring_application a
      WHERE a.application_id = har.hiring_application_id
        AND ($1::text IS NULL OR EXISTS (
          SELECT 1 FROM greenhouse_hiring.hiring_assessment ass
          WHERE ass.application_id = a.application_id AND ass.template_id = $1
        ))
    ) app ON TRUE
    WHERE har.member_id IS NOT NULL
      AND har.state IN ('member_created', 'onboarding_open', 'active')
      AND m.hire_date IS NOT NULL
  ),
  outcomes AS (
    SELECT h.hiring_application_id, h.member_id,
      (SELECT AVG(imm.rpa_avg)
       FROM greenhouse_serving.ico_member_metrics imm
       WHERE imm.member_id = h.member_id
         AND make_date(imm.period_year, imm.period_month, 1)
             BETWEEN date_trunc('month', h.hire_date)::date
                 AND (date_trunc('month', h.hire_date) + make_interval(months => $2))::date
      ) AS ico_outcome,
      (SELECT AVG(es.overall_rating)
       FROM greenhouse_hr.eval_summaries es
       WHERE es.member_id = h.member_id
         AND es.finalized_at IS NOT NULL
         AND es.finalized_at BETWEEN h.hire_date::timestamptz
             AND h.hire_date::timestamptz + make_interval(months => $2)
      ) AS eval_outcome
    FROM hires h
  )
  SELECT h.member_id, cr.competency_key,
         cr.score, COALESCE(h.decision_snapshot_score, h.template_snapshot_score) AS decision_score,
         o.ico_outcome, o.eval_outcome
  FROM hires h
  JOIN outcomes o ON o.hiring_application_id = h.hiring_application_id
  LEFT JOIN LATERAL (
    SELECT comp.key AS competency_key, hcr.score
    FROM greenhouse_hiring.hiring_competency_result hcr
    JOIN greenhouse_hiring.hiring_assessment ass ON ass.assessment_id = hcr.assessment_id
    JOIN greenhouse_hiring.hiring_competency comp ON comp.competency_id = hcr.competency_id
    WHERE ass.application_id = h.hiring_application_id
      AND ($3::text IS NULL OR comp.key = $3)
  ) cr ON TRUE
`

export const getAssessmentValidity = async (
  input: GetAssessmentValidityInput = {},
): Promise<AssessmentValidityReport> => {
  const windowMonths = Math.min(Math.max(input.windowMonths ?? 3, 1), 24)
  const templateId = input.templateId?.trim() || null
  const competencyKey = input.competencyKey?.trim() || null

  const rows = await runGreenhousePostgresQuery<PairRow>(PAIRS_SQL, [templateId, windowMonths, competencyKey])

  // Outcome por member: ICO primario, eval secundario (fuente etiquetada, nunca mezcla muda).
  const memberOutcome = new Map<string, { outcome: number; source: 'ico_rpa' | 'hr_eval' }>()

  for (const row of rows) {
    if (memberOutcome.has(row.member_id)) continue

    const ico = toNum(row.ico_outcome)
    const evalScore = toNum(row.eval_outcome)

    if (ico != null) memberOutcome.set(row.member_id, { outcome: ico, source: 'ico_rpa' })
    else if (evalScore != null) memberOutcome.set(row.member_id, { outcome: evalScore, source: 'hr_eval' })
  }

  const sources = new Set([...memberOutcome.values()].map((v) => v.source))

  const outcomeSource: ValidityOutcomeSource =
    sources.size === 0 ? 'none' : sources.size > 1 ? 'mixed' : [...sources][0]

  // Overall: score al decidir vs outcome (un par por member).
  const overallPairs: Array<{ score: number; outcome: number }> = []
  const seenMembers = new Set<string>()

  for (const row of rows) {
    if (seenMembers.has(row.member_id)) continue

    const score = toNum(row.decision_score)
    const outcome = memberOutcome.get(row.member_id)?.outcome ?? null

    if (score != null && outcome != null) {
      overallPairs.push({ score, outcome })
      seenMembers.add(row.member_id)
    }
  }

  // Por competencia: score de hiring_competency_result vs outcome del member.
  const byCompetencyPairs = new Map<string, Array<{ score: number; outcome: number }>>()

  for (const row of rows) {
    if (!row.competency_key) continue

    const score = toNum(row.score)
    const outcome = memberOutcome.get(row.member_id)?.outcome ?? null

    if (score == null || outcome == null) continue

    const list = byCompetencyPairs.get(row.competency_key) ?? []

    list.push({ score, outcome })
    byCompetencyPairs.set(row.competency_key, list)
  }

  return {
    scope: { templateId, competencyKey },
    windowMonths,
    outcomeSource,
    overall: buildCell(overallPairs, null),
    byCompetency: [...byCompetencyPairs.entries()]
      .map(([key, pairs]) => buildCell(pairs, key))
      .sort((a, b) => (a.competencyKey ?? '').localeCompare(b.competencyKey ?? '')),
    computedAt: new Date().toISOString(),
  }
}
