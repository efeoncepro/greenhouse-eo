import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

// ══════════════════════════════════════════════════════════════════════════════
// Integridad de plantillas de assessment — módulos sin instrumento.
//
// FALLA SILENCIOSA QUE ESTA SEÑAL EXISTE PARA HACER RUIDOSA (hallazgo 2026-08-17):
// un módulo de plantilla cuya competencia no tiene NINGUNA pregunta activa que el
// resolvedor pueda elegir no desaparece del examen — se renderiza como sección
// vacía para el candidato — y `submitPublicAssessment` deja enviar igual, porque
// sólo exige responder las preguntas que sí se resolvieron. Resultado: un examen
// encogido que se envía sin error y se puntúa sobre una fracción del peso
// declarado. Nada en el sistema lo reportaba: ni el build, ni los tests, ni el
// candidato, ni el evaluador.
//
// Se detectaron DOS plantillas activas en ese estado (45% y 25% del peso sin
// instrumento). Se archivaron por migración; esta señal existe para que la clase
// no vuelva a pasar inadvertida — archivar una pregunta o crear una plantilla
// sobre una competencia sin banco la reabre en cualquier momento.
//
// El predicado replica el JOIN del resolvedor real
// (`PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL`): status activo + match de nivel.
// Si ese SQL cambia su criterio de elegibilidad, este debe cambiar con él.
//
// PII-free: sólo ids de plantilla y claves de competencia. Nunca datos de candidato.
// ══════════════════════════════════════════════════════════════════════════════

type TemplateIntegrityRow = {
  broken_active_templates: number
  blind_modules: number
  worst_blind_weight_pct: number | null
  worst_template_id: string | null
  competencies_without_questions: number
}

export const HIRING_ASSESSMENT_TEMPLATE_INTEGRITY_SIGNAL_ID = 'hiring.assessment.template_module_without_questions'

const LABEL = 'Plantillas de assessment con módulos sin preguntas'

export const getHiringAssessmentTemplateIntegritySignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<TemplateIntegrityRow>(
      `WITH module_coverage AS (
         SELECT tm.template_id,
                tm.module_id,
                tm.weight,
                EXISTS (
                  SELECT 1
                    FROM greenhouse_hiring.hiring_question q
                   WHERE q.competency_id = tm.competency_id
                     AND q.status = 'active'
                     AND (tm.target_level IS NULL OR q.level = tm.target_level)
                ) AS has_question
           FROM greenhouse_hiring.hiring_assessment_template_module tm
           JOIN greenhouse_hiring.hiring_assessment_template t
             ON t.template_id = tm.template_id
          WHERE t.status = 'active'
       ),
       per_template AS (
         SELECT template_id,
                COUNT(*) FILTER (WHERE NOT has_question) AS blind_modules,
                SUM(weight) FILTER (WHERE NOT has_question) AS blind_weight,
                NULLIF(SUM(weight), 0) AS total_weight
           FROM module_coverage
          GROUP BY template_id
         HAVING COUNT(*) FILTER (WHERE NOT has_question) > 0
       ),
       ranked AS (
         SELECT template_id,
                blind_modules,
                ROUND(100.0 * blind_weight / total_weight)::int AS blind_weight_pct
           FROM per_template
          ORDER BY blind_weight / total_weight DESC, template_id
          LIMIT 1
       )
       SELECT (SELECT COUNT(*)::int FROM per_template)                       AS broken_active_templates,
              (SELECT COALESCE(SUM(blind_modules), 0)::int FROM per_template) AS blind_modules,
              (SELECT blind_weight_pct FROM ranked)                           AS worst_blind_weight_pct,
              (SELECT template_id FROM ranked)                                AS worst_template_id,
              (SELECT COUNT(*)::int
                 FROM greenhouse_hiring.hiring_competency c
                WHERE NOT EXISTS (
                        SELECT 1 FROM greenhouse_hiring.hiring_question q
                         WHERE q.competency_id = c.competency_id AND q.status = 'active'
                      ))                                                      AS competencies_without_questions`,
    )

    const row = rows[0] ?? {
      broken_active_templates: 0,
      blind_modules: 0,
      worst_blind_weight_pct: null,
      worst_template_id: null,
      competencies_without_questions: 0,
    }

    const broken = Number(row.broken_active_templates)
    const blindModules = Number(row.blind_modules)
    const orphanCompetencies = Number(row.competencies_without_questions)

    // Steady = 0 plantillas rotas. Una sola ya puede mandarle a un candidato un
    // examen incompleto que se envía sin error, así que es `error`, no `warning`.
    // Las competencias sin banco son el precursor: todavía no rompen nada si
    // ninguna plantilla activa las usa, pero es la munición del próximo caso.
    const severity = broken > 0 ? 'error' : orphanCompetencies > 0 ? 'warning' : 'ok'

    const summary =
      broken > 0
        ? `${broken} plantilla(s) activa(s) con ${blindModules} módulo(s) sin preguntas: el candidato ve la sección vacía y el examen se envía igual (hasta ${row.worst_blind_weight_pct ?? 0}% del peso sin instrumento).`
        : orphanCompetencies > 0
          ? `${orphanCompetencies} competencia(s) sin preguntas activas. Ninguna plantilla activa las usa todavía; usarlas rompería el examen en silencio.`
          : 'Toda plantilla activa tiene preguntas para cada uno de sus módulos.'

    return {
      signalId: HIRING_ASSESSMENT_TEMPLATE_INTEGRITY_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringAssessmentTemplateIntegritySignal',
      label: LABEL,
      severity,
      observedAt: new Date().toISOString(),
      summary,
      evidence: [
        { kind: 'metric', label: 'broken_active_templates', value: String(broken) },
        { kind: 'metric', label: 'blind_modules', value: String(blindModules) },
        { kind: 'metric', label: 'worst_blind_weight_pct', value: String(row.worst_blind_weight_pct ?? 0) },
        { kind: 'metric', label: 'worst_template_id', value: row.worst_template_id ?? 'n/a' },
        { kind: 'metric', label: 'competencies_without_questions', value: String(orphanCompetencies) },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_template_integrity' } })

    return {
      signalId: HIRING_ASSESSMENT_TEMPLATE_INTEGRITY_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringAssessmentTemplateIntegritySignal',
      label: LABEL,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar la integridad de las plantillas de assessment.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
