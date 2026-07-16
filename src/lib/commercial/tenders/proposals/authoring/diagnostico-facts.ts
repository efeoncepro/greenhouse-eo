import 'server-only'

/**
 * Diagnóstico (SEO/AEO) — el facts mapper: `AI Visibility Grader → hechos con evidencia`
 * (TASK-1415 Slice 2). PURO y determinista: la ÚNICA fábrica de cifras del capítulo de
 * diagnóstico. El LLM del author (Slice 4) sólo enmarca lo que sale de acá.
 *
 * FRONTERA DE DOMINIO (port de reader, no acoplamiento): este módulo consume el CONTRATO del
 * reader del Grader (`GraderReport` — `src/lib/growth/ai-visibility/report/contracts.ts`) y el
 * SoT del framework de 5 niveles (`REPORT_LEVEL_DIMENSIONS` —
 * `src/components/growth/ai-visibility/report-artifact/model.ts`, módulo PURO sin IO/JSX). Si
 * el dominio Tender se extrae a package (EPIC-027), estos dos imports son el port a declarar.
 *
 * El mapeo dimensión/readiness → peldaño NO se inventa acá: es el canónico del Report Artifact
 * (Delta 2026-06-27), verificado contra el run real `EO-GRUN-00046`:
 *   found      ← ai_visibility (40 → 40)
 *   readable   ← entity_clarity + category_ownership + citation_quality, ponderado (70.4 → 70)
 *   correct    ← message_alignment (36.8 → 37)
 *   actionable ← readiness.agentic.overallScore — NO es una dimensión del score (8.4 → 8)
 *   intrinsic  ← competitive_sov + revenue_intent_coverage, ponderado (76.375 → 76)
 * (= los 5 scores de la lámina `escalera` del deck SKY, autorada a mano.)
 */

import {
  REPORT_LEVEL_DIMENSIONS,
  REPORT_LEVEL_IDS,
  type ReportLevelId
} from '@/components/growth/ai-visibility/report-artifact/model'
import type { GraderReport } from '@/lib/growth/ai-visibility/report/contracts'

import { ProposalInputError } from '../errors'
import type { ChapterFactSheet, EvidencedFact } from './chapter-author'

// ─────────────────────────────────────────────────────────────────────────────
// Source — lo que el CALLER resuelve con el scope de su sesión y entrega como dato
// ─────────────────────────────────────────────────────────────────────────────

/** Subset del `GraderReport` que consume el mapper (Pick = el contrato sigue siendo del reader). */
export type DiagnosticoReportSnapshot = Pick<
  GraderReport,
  | 'dimensions'
  | 'readiness'
  | 'citationInsight'
  | 'citationSourceBreakdown'
  | 'competitiveSov'
  | 'provenance'
>

export interface DiagnosticoSource {
  /** Public id del run (`EO-GRUN-#####`) — la raíz de todo `evidenceRef` del capítulo. */
  runPublicId: string
  /** Nombre de la marca evaluada (del profile del Grader, resuelto por el caller). */
  brandName: string
  /** URL pública del informe (si existe): entra como hecho = allowlist de links del framing. */
  publicReportUrl?: string
  report: DiagnosticoReportSnapshot
  /**
   * Hechos EXTERNOS pre-evidenciados por el operador (p. ej. tráfico Semrush). Passthrough
   * verbatim — el operador es la fuente y su `evidenceRef` viaja con el hecho. El LLM jamás
   * los produce ni los altera.
   */
  operatorFacts?: EvidencedFact[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Facts — la hoja de hechos del capítulo de diagnóstico
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagnosticoRungFact extends EvidencedFact {
  levelId: ReportLevelId
  /** El ancla canónica del peldaño (`Be Found` … `Be Intrinsic`). */
  anchor: string
}

export interface DiagnosticoFacts extends ChapterFactSheet {
  /** Los 5 peldaños de la escalera, en orden ASCENDENTE (el orden ES el argumento). */
  rungs: DiagnosticoRungFact[]
  /** Hechos-titular (citabilidad, share of voice competitivo, externos del operador). */
  goals: EvidencedFact[]
  /** Munición de contexto (total de citas, respuestas, motores, fuentes top, URL del informe). */
  context: EvidencedFact[]
  /** Subject de la lámina de escalera (derivado, no LLM). */
  subjectName: string
  subjectContext: string
}

const RUNG_ANCHORS: Record<ReportLevelId, string> = {
  found: 'Be Found',
  readable: 'Be Readable',
  correct: 'Be Correct',
  actionable: 'Be Actionable',
  intrinsic: 'Be Intrinsic'
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
] as const

/** `trustpilot.com → Trustpilot` (determinista; nombres de dominio, no marketing). */
const prettifyDomain = (domain: string): string => {
  const label = domain.split('.')[0]

  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Join es-CL: `A, B y C` (o `e` cuando la última palabra empieza con i-). */
const joinEs = (names: string[]): string => {
  if (names.length <= 1) return names.join('')
  const last = names[names.length - 1]
  const connector = /^i/i.test(last) ? 'e' : 'y'

  return `${names.slice(0, -1).join(', ')} ${connector} ${last}`
}

// ─────────────────────────────────────────────────────────────────────────────
// El mapper
// ─────────────────────────────────────────────────────────────────────────────

export const deriveDiagnosticoFacts = (source: DiagnosticoSource): DiagnosticoFacts => {
  const { report, runPublicId } = source
  const asOf = new Date(report.provenance.asOfDate ?? Number.NaN)

  if (Number.isNaN(asOf.getTime())) {
    throw new ProposalInputError(`El run ${runPublicId} no tiene asOfDate válida: sin fecha no hay evidencia.`)
  }

  const graderRef = `AI Visibility Grader · run ${runPublicId}`
  const graderRefDated = `${graderRef} · ${asOf.toISOString().slice(0, 7)}`

  // ── Peldaños: el mapeo canónico del Report Artifact, redondeado ──
  const dimensionByKey = new Map(report.dimensions.map(dimension => [dimension.key, dimension]))

  const rungs: DiagnosticoRungFact[] = REPORT_LEVEL_IDS.map(levelId => {
    let score: number | null

    if (levelId === 'actionable') {
      // Be Actionable NO es una dimensión del score de percepción: sale del readiness agéntico.
      score = source.report.readiness?.agentic.overallScore ?? null
    } else {
      const dims = REPORT_LEVEL_DIMENSIONS[levelId]
        .map(key => dimensionByKey.get(key))
        .filter((dim): dim is NonNullable<typeof dim> => Boolean(dim && dim.score !== null))

      const totalWeight = dims.reduce((acc, dim) => acc + dim.weight, 0)

      score =
        totalWeight === 0
          ? null
          : dims.reduce((acc, dim) => acc + (dim.score as number) * dim.weight, 0) / totalWeight
    }

    if (score === null) {
      // Fail-closed: sin dato ≠ 0. Un peldaño no medido no compone una escalera con score.
      throw new ProposalInputError(
        `El run ${runPublicId} no tiene dato para el peldaño "${RUNG_ANCHORS[levelId]}": ` +
          'el diagnóstico no se autora con peldaños sin medir.'
      )
    }

    const rounded = Math.round(score)

    return {
      factId: `rung.${levelId}`,
      levelId,
      anchor: RUNG_ANCHORS[levelId],
      label: `Peldaño ${RUNG_ANCHORS[levelId]}`,
      value: String(rounded),
      numericValue: rounded,
      evidenceRef: graderRef
    }
  })

  // ── Hechos-titular del Grader ──
  const goals: EvidencedFact[] = []

  if (report.citationInsight.ownDomainShare !== null) {
    const share = Math.round(report.citationInsight.ownDomainShare)

    goals.push({
      factId: 'goal.citability',
      label: 'Citabilidad del contenido propio (share de respuestas que citan el dominio propio)',
      value: `${share}%`,
      numericValue: share,
      evidenceRef: graderRefDated
    })
  }

  const [sovLeader, sovRunnerUp] = report.competitiveSov.competitors

  if (sovLeader && sovRunnerUp) {
    goals.push({
      factId: 'goal.sov-gap',
      label: `Menciones de competidores en la categoría: ${sovLeader.name} vs ${sovRunnerUp.name}`,
      value: `${sovLeader.mentions} vs ${sovRunnerUp.mentions}`,
      evidenceRef: graderRefDated
    })
  }

  // ── Hechos externos del operador (passthrough pre-evidenciado) ──
  for (const fact of source.operatorFacts ?? []) {
    if (!fact.evidenceRef || fact.evidenceRef.trim().length === 0) {
      throw new ProposalInputError(
        `El hecho externo "${fact.factId}" no trae evidenceRef: un hecho del operador también exige fuente.`
      )
    }

    goals.push(fact)
  }

  // ── Munición de contexto ──
  const engines = report.provenance.providersSampled.length
  const answers = report.provenance.promptCount * engines

  const topExternalSources = report.citationSourceBreakdown.domains
    .filter(domain => domain.classification !== 'own_domain')
    .slice(0, 3)
    .map(domain => prettifyDomain(domain.domain))

  const context: EvidencedFact[] = [
    {
      factId: 'context.total-citations',
      label: 'Total de citas observadas en el estudio',
      value: String(report.citationSourceBreakdown.totalCitations),
      numericValue: report.citationSourceBreakdown.totalCitations,
      evidenceRef: graderRefDated
    },
    {
      factId: 'context.answers-resolved',
      label: 'Respuestas resueltas en el estudio (prompts × motores)',
      value: String(answers),
      numericValue: answers,
      evidenceRef: graderRefDated
    },
    {
      factId: 'context.engines-sampled',
      label: 'Motores de respuesta muestreados',
      value: String(engines),
      numericValue: engines,
      evidenceRef: graderRefDated
    }
  ]

  if (topExternalSources.length > 0) {
    context.push({
      factId: 'context.top-external-sources',
      label: 'Fuentes de terceros más citadas (en orden)',
      value: joinEs(topExternalSources),
      evidenceRef: graderRefDated
    })
  }

  if (source.publicReportUrl) {
    context.push({
      factId: 'context.report-url',
      label: 'URL pública del informe del run (único link permitido en el framing)',
      value: source.publicReportUrl,
      evidenceRef: graderRef
    })
  }

  const subjectContext = `${engines} motores · ${answers} respuestas · ${MONTHS_ES[asOf.getUTCMonth()]} ${asOf.getUTCFullYear()}`

  return {
    facts: [...rungs, ...goals, ...context],
    rungs,
    goals,
    context,
    subjectName: source.brandName,
    subjectContext
  }
}
