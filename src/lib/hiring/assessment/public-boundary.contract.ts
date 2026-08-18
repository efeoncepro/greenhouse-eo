/**
 * TASK-1734 Slice 5 — Contrato ejecutable del boundary candidate-facing del assessment.
 *
 * Denylist de campos que JAMÁS pueden cruzar al candidato (ni a ningún consumer
 * público/cliente) desde el dominio de evaluación: scores (auto/humano/efectivo),
 * resultados por competencia, propuestas IA, rationale, confidence, clase de riesgo,
 * estado de revisión, answer key y rubric.
 *
 * Los tokens se comparan como SUBSTRING sobre cada key (lowercase, deep-scan) del DTO
 * serializado. Al agregar un campo nuevo de resultado/scoring al dominio, agrégalo AQUÍ:
 * las suites (`public-boundary.test.ts`, el route test público, la suite de emails y la
 * de DTOs candidate/client) lo asserten automáticamente.
 *
 * Consumers: src/lib/hiring/assessment/public-boundary.test.ts (contrato ejecutable),
 * src/app/api/public/assessment/[token]/route.test.ts, candidate-boundary.test.ts,
 * hiring-lifecycle-emails-antileak.test.ts.
 */

export const PUBLIC_ASSESSMENT_FORBIDDEN_FIELDS = [
  // scores en cualquier variante (cubre autoScore, humanScore, overallScore, scorecard, scoredBy/At)
  'score',
  // resultados por competencia / bandas
  'result_band',
  'resultband',
  'competency_result',
  'competencyresult',
  'level_achieved',
  'levelachieved',
  // carril IA: propuestas, rationale, confidence, riesgo, run
  'proposal',
  'rationale',
  'confidence',
  'risk_class',
  'riskclass',
  'risk_tier',
  'risktier',
  'scoring_run',
  'scoringrun',
  // estado de revisión humana
  'review_state',
  'reviewstate',
  'review_status',
  'reviewstatus',
  'needs_human_rating',
  'needshumanrating',
  // contenido interno de la pregunta
  'answer_key',
  'answerkey',
  'rubric',
] as const

/** Deep-scan: recolecta todas las keys (a cualquier profundidad) de un valor serializable. */
export const collectDeepKeys = (value: unknown, keys: Set<string> = new Set()): Set<string> => {
  if (Array.isArray(value)) {
    for (const item of value) collectDeepKeys(item, keys)

    return keys
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      keys.add(key)
      collectDeepKeys(nested, keys)
    }
  }

  return keys
}

/** Devuelve las keys del payload que matchean algún token prohibido (vacío = boundary limpio). */
export const findForbiddenKeys = (payload: unknown): string[] => {
  const keys = collectDeepKeys(payload)
  const offenders: string[] = []

  for (const key of keys) {
    const normalized = key.toLowerCase()

    if (PUBLIC_ASSESSMENT_FORBIDDEN_FIELDS.some(token => normalized.includes(token))) {
      offenders.push(key)
    }
  }

  return offenders.sort()
}
