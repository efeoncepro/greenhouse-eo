/**
 * TASK-1962 — contrato de contenido del informe (browser-safe, sin I/O). QUÉ debe decir un informe de Insights, como
 * ocho preguntas del cliente, y con qué evidencia se responde cada una HOY por módulo.
 *
 * Es el contrato de MANTENIMIENTO del informe, hermano de la matriz familia × evidencia
 * (`editorial/family-evidence-matrix.ts`): aquélla dice qué FIGURAS puede dibujar un productor; éste dice qué PREGUNTAS
 * responde. Agregar un dato nuevo al informe exige, en el mismo cambio:
 *
 *  1. el hecho en el adapter del dominio dueño (`adapters/*`), leído de un reader dueño;
 *  2. su regla en `CONTENT_METRIC_RULES` (a qué pregunta responde);
 *  3. el veredicto `producer_now` de esa pregunta para ese módulo en `CONTENT_CONTRACT`, con su evidencia;
 *  4. el productor del planner (y la fila de la matriz de familias si dibuja una figura nueva);
 *  5. subir `CONTENT_CONTRACT_VERSION`.
 *
 * `content-contract.test.ts` lo exige en las dos direcciones: ninguna métrica responde a una pregunta que el contrato
 * declara sin evidencia, y ninguna pregunta `producer_now` de hechos queda sin al menos una métrica que la sostenga.
 */

import type { InsightModule } from '../contracts/request'

export const CONTENT_CONTRACT_VERSION = 'content_contract_v3' as const

/** Las ocho preguntas, en el orden en que un informe de agencia las responde. */
export const INSIGHT_CONTENT_QUESTIONS = [
  'outcome',
  'drivers',
  'competition',
  'work_delivered',
  'recommendations',
  'asks',
  'measurement',
  'limits'
] as const

export type InsightContentQuestion = (typeof INSIGHT_CONTENT_QUESTIONS)[number]

/**
 * - `producer_now`: hay evidencia y un productor determinista que la emite.
 * - `no_evidence`: el dominio dueño no la mide (o no se la entrega a Insights) todavía.
 * - `policy_blocked`: se mide, pero una regla vigente prohíbe mostrarla al cliente.
 * - `needs_input`: falta un dato que pone una persona (meta pactada, registro de entregas).
 * - `agent_task`: la responde la redacción (agente con aceptación humana, TASK-1903), no un hecho.
 */
export type InsightContentVerdict = 'producer_now' | 'no_evidence' | 'policy_blocked' | 'needs_input' | 'agent_task'

/** Dónde vive la respuesta en el plan editorial. */
export type InsightContentPlanSection = 'executive_summary' | 'essentials' | 'chapter' | 'actions' | 'ask' | 'measurement' | 'decision' | 'limits'

export interface InsightContentCell {
  verdict: InsightContentVerdict
  /** Evidencia que la sostiene, o la causa por la que no (con su dueño/task). Nunca vacía. */
  evidence: string
}

export interface InsightContentQuestionRow {
  question: InsightContentQuestion
  /** La pregunta tal como la haría el cliente (documentación; el informe no la imprime). */
  asked: string
  planSections: readonly InsightContentPlanSection[]
  /** `facts`: la responden hechos del snapshot; `plan`: una sección del plan sin hecho propio (acciones, petición). */
  answeredBy: 'facts' | 'plan'
  byModule: Readonly<Record<InsightModule, InsightContentCell>>
}

export const CONTENT_CONTRACT: readonly InsightContentQuestionRow[] = [
  {
    question: 'outcome',
    asked: '¿Cómo nos fue?',
    planSections: ['executive_summary', 'essentials', 'chapter'],
    answeredBy: 'facts',
    byModule: {
      seo: { verdict: 'producer_now', evidence: 'Search Console por ventana (clics, impresiones, CTR, posición), ranking (keywords en primera página) y ETV mensual' },
      aeo: { verdict: 'producer_now', evidence: 'run del Grader en la ventana: mención por motor, Share of Model, citas del sitio, puntaje y dimensiones' },
      ico: { verdict: 'producer_now', evidence: 'snapshot mensual por space: OTD, FTR y RpA' }
    }
  },
  {
    question: 'drivers',
    asked: '¿Por qué cambió?',
    planSections: ['chapter'],
    answeredBy: 'facts',
    byModule: {
      seo: { verdict: 'producer_now', evidence: 'consultas y páginas de Search Console que más movieron los clics (`readSeoWindowMovers`): descomposición medida, nunca causalidad' },
      aeo: { verdict: 'producer_now', evidence: 'sitios que más citan los motores y tipo de fuente, del mismo informe del Grader (`citationSourceBreakdown`, `sourceTypeSummary`): de dónde sale lo que dicen de la marca' },
      ico: { verdict: 'no_evidence', evidence: 'atraso atribuible existe por persona y mes, no por cliente' }
    }
  },
  {
    question: 'competition',
    asked: '¿Cómo estamos frente a la competencia?',
    planSections: ['chapter'],
    answeredBy: 'facts',
    byModule: {
      seo: { verdict: 'policy_blocked', evidence: 'ETV de competidores y gap de keywords existen, pero la comparativa competitiva SEO nunca es client-facing (GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1, auditoría §7); decide el operador' },
      aeo: { verdict: 'producer_now', evidence: 'Share of Voice contra los competidores declarados del mercado (el Grader ya lo muestra al cliente)' },
      ico: { verdict: 'no_evidence', evidence: 'no aplica: la entrega no se compara con terceros' }
    }
  },
  {
    question: 'work_delivered',
    asked: '¿Qué hicimos este mes?',
    planSections: ['chapter'],
    answeredBy: 'facts',
    byModule: {
      seo: { verdict: 'needs_input', evidence: 'no existe registro por cliente de entregables SEO/contenido (insumos, optimizaciones, publicaciones): follow-up de TASK-1962' },
      aeo: { verdict: 'needs_input', evidence: 'no existe registro por cliente de entregables AEO (contenido, datos estructurados, menciones): follow-up de TASK-1962' },
      ico: { verdict: 'producer_now', evidence: 'piezas completadas (`context.completedTasks`) y throughput del snapshot mensual por space' }
    }
  },
  {
    question: 'recommendations',
    asked: '¿Qué recomendamos?',
    planSections: ['actions'],
    answeredBy: 'plan',
    byModule: {
      seo: { verdict: 'producer_now', evidence: 'cola SEO priorizada (TASK-1700), sólo orígenes propios (Search Console, consolidación, objetivos declarados); nunca origen competidor' },
      aeo: { verdict: 'agent_task', evidence: 'las recomendaciones del Grader son genéricas por dimensión (iguales para todo cliente): la redacción la hace TASK-1903' },
      ico: { verdict: 'agent_task', evidence: 'el bullet ya señala qué space revisar primero; el plan lo redacta TASK-1903' }
    }
  },
  {
    question: 'asks',
    asked: '¿Qué necesitamos de ustedes?',
    planSections: ['ask'],
    answeredBy: 'plan',
    byModule: {
      seo: { verdict: 'producer_now', evidence: 'Search Console sin conectar (`gsc` `not_connected`): el cliente da el acceso; es lo único que se le puede pedir sin una persona' },
      aeo: { verdict: 'needs_input', evidence: 'sin análisis configurado es trabajo interno de Efeonce, no un pedido al cliente; las peticiones de negocio las agrega una persona en la revisión' },
      ico: { verdict: 'needs_input', evidence: 'sin space activo es configuración interna de Efeonce; lo que se pide al cliente (aprobaciones, insumos) lo agrega una persona en la revisión' }
    }
  },
  {
    question: 'measurement',
    asked: '¿Cómo lo mediremos?',
    planSections: ['measurement'],
    answeredBy: 'facts',
    byModule: {
      seo: { verdict: 'needs_input', evidence: 'no hay metas pactadas por cliente para SEO: follow-up de TASK-1962' },
      aeo: { verdict: 'needs_input', evidence: 'no hay metas pactadas por cliente para visibilidad en IA: follow-up de TASK-1962' },
      ico: { verdict: 'producer_now', evidence: 'metas y bandas oficiales de ICO_METRIC_REGISTRY como hechos de referencia' }
    }
  },
  {
    question: 'limits',
    asked: '¿Qué no podemos afirmar?',
    planSections: ['limits'],
    answeredBy: 'plan',
    byModule: {
      seo: { verdict: 'producer_now', evidence: 'rechazos del adapter traducidos a límites de lector' },
      aeo: { verdict: 'producer_now', evidence: 'rechazos del adapter AEO (sin análisis en la ventana, gate del Grader) traducidos a límites de lector' },
      ico: { verdict: 'producer_now', evidence: 'rechazos del adapter ICO (sin snapshot, RpA suprimido, OTD sin base) traducidos a límites de lector' }
    }
  }
]

/**
 * A qué pregunta responde cada métrica, por nombre exacto o espacio de nombres terminado en «.» (el más largo gana). Una métrica que ningún prefijo
 * clasifica es un dato sin contrato: el test lo rechaza.
 */
export const CONTENT_METRIC_RULES: ReadonlyArray<{ module: InsightModule; prefix: string; question: InsightContentQuestion }> = [
  { module: 'seo', prefix: 'clicks', question: 'outcome' },
  { module: 'seo', prefix: 'impressions', question: 'outcome' },
  { module: 'seo', prefix: 'ctr', question: 'outcome' },
  { module: 'seo', prefix: 'position', question: 'outcome' },
  { module: 'seo', prefix: 'keywords_tracked', question: 'outcome' },
  { module: 'seo', prefix: 'page_one_keywords', question: 'outcome' },
  { module: 'seo', prefix: 'organic_etv', question: 'outcome' },
  { module: 'seo', prefix: 'clicks_week.', question: 'outcome' },
  { module: 'seo', prefix: 'driver.', question: 'drivers' },
  { module: 'seo', prefix: 'opportunity.', question: 'recommendations' },
  { module: 'aeo', prefix: 'overall_score', question: 'outcome' },
  { module: 'aeo', prefix: 'dimension.', question: 'outcome' },
  { module: 'aeo', prefix: 'mention_rate.', question: 'outcome' },
  { module: 'aeo', prefix: 'share_of_model', question: 'outcome' },
  { module: 'aeo', prefix: 'citation_share', question: 'outcome' },
  { module: 'aeo', prefix: 'sov.', question: 'competition' },
  { module: 'aeo', prefix: 'cited_source.', question: 'drivers' },
  { module: 'aeo', prefix: 'source_type.', question: 'drivers' },
  { module: 'aeo', prefix: 'sentiment.', question: 'outcome' },
  { module: 'ico', prefix: 'otd', question: 'outcome' },
  { module: 'ico', prefix: 'ftr', question: 'outcome' },
  { module: 'ico', prefix: 'rpa', question: 'outcome' },
  { module: 'ico', prefix: 'delivered.', question: 'work_delivered' },
  { module: 'ico', prefix: 'target.', question: 'measurement' },
  { module: 'ico', prefix: 'band.', question: 'measurement' }
]

/** Pregunta a la que responde un hecho; null = métrica sin contrato. */
export const questionOfMetric = (module: InsightModule, metricId: string): InsightContentQuestion | null => {
  const match = CONTENT_METRIC_RULES
    .filter(rule => rule.module === module && (rule.prefix.endsWith('.') ? metricId.startsWith(rule.prefix) : metricId === rule.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]

  return match?.question ?? null
}

const BY_QUESTION = new Map(CONTENT_CONTRACT.map(row => [row.question, row]))

export const contentCell = (question: InsightContentQuestion, module: InsightModule): InsightContentCell => {
  const row = BY_QUESTION.get(question)

  if (!row) throw new Error(`content-contract: pregunta desconocida ${question}`)

  return row.byModule[module]
}

export type InsightContentCoverageStatus = 'answered' | 'not_answered' | 'not_applicable'

export interface InsightContentCoverageEntry {
  question: InsightContentQuestion
  status: InsightContentCoverageStatus
  /** Módulos de la edición que la responden. */
  modules: InsightModule[]
  /** Por qué no se responde, por módulo de la edición (veredicto del contrato o «sin datos en la ventana»). */
  gaps: Array<{ module: InsightModule; verdict: InsightContentVerdict | 'no_data_in_window'; evidence: string }>
}

/**
 * Cobertura de UNA edición: qué preguntas responde con lo que el snapshot y el plan traen, y por qué no las demás. Es
 * para la revisión interna (y para el agente redactor), nunca para el cliente.
 */
export const contentCoverageOf = (input: {
  modules: readonly InsightModule[]
  facts: ReadonlyArray<{ module: InsightModule; metricId: string; value: number | null }>
  hasActions: boolean
  hasAsk: boolean
  hasMeasurement: boolean
  hasLimits: boolean
}): InsightContentCoverageEntry[] =>
  INSIGHT_CONTENT_QUESTIONS.map(question => {
    const row = BY_QUESTION.get(question)!
    const modules: InsightModule[] = []
    const gaps: InsightContentCoverageEntry['gaps'] = []

    for (const moduleKey of input.modules) {
      const cell = row.byModule[moduleKey]

      const answered = row.answeredBy === 'facts'
        ? input.facts.some(fact => fact.module === moduleKey && fact.value !== null && questionOfMetric(moduleKey, fact.metricId) === question)
        : (question === 'recommendations' && input.hasActions) ||
          (question === 'asks' && input.hasAsk) ||
          (question === 'limits' && input.hasLimits)

      if (answered) modules.push(moduleKey)
      else gaps.push({ module: moduleKey, verdict: cell.verdict === 'producer_now' ? 'no_data_in_window' : cell.verdict, evidence: cell.evidence })
    }

    const measurementByPlan = question === 'measurement' && input.hasMeasurement
    const status: InsightContentCoverageStatus = modules.length > 0 || measurementByPlan ? 'answered' : input.modules.length === 0 ? 'not_applicable' : 'not_answered'

    return { question, status, modules, gaps }
  })
