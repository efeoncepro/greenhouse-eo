/**
 * TASK-1888 — matriz familia × evidencia, VERSIONADA (browser-safe). Es la única autoridad sobre qué familias puede
 * emitir un productor (planner determinista o autoría IA): una familia `no_evidence` no se emite aunque la geometría
 * exista y el canvas la muestre. El canvas trae datos de ejemplo; no autoriza ninguna familia.
 *
 * Verificada contra los adapters el 2026-09-25 (espejo legible en EFEONCE_INSIGHTS_ARCHITECTURE_V1 §6). Cambiar un
 * veredicto exige: evidencia nueva en el adapter dueño + productor + test + subir `FAMILY_EVIDENCE_MATRIX_VERSION`.
 */

import type { ChartFamily } from '../contracts/chart-spec'
import type { InsightModule } from '../contracts/request'

export const FAMILY_EVIDENCE_MATRIX_VERSION = 'family_evidence_matrix_v3' as const

export type FamilyEvidenceVerdict = 'producer_now' | 'no_evidence'

export interface FamilyEvidenceRow {
  family: ChartFamily
  question: string
  requires: string
  /** Módulos cuyos hechos la sostienen HOY (vacío = sin evidencia). */
  modules: InsightModule[]
  evidence: string
  verdict: FamilyEvidenceVerdict
}

export const FAMILY_EVIDENCE_MATRIX: readonly FamilyEvidenceRow[] = [
  { family: 'bar', question: 'comparar valores', requires: 'valores por dimensión', modules: ['seo', 'aeo', 'ico'], evidence: 'hechos por unidad de cada módulo (TASK-1845)', verdict: 'producer_now' },
  { family: 'bar_grouped', question: 'contra el período anterior', requires: 'pares actual/anterior', modules: ['seo', 'aeo', 'ico'], evidence: 'comparisonFactId del adapter', verdict: 'producer_now' },
  { family: 'bar_stacked', question: 'cuánto del total es un subconjunto, en dos períodos', requires: 'segmentos no superpuestos por período', modules: ['seo'], evidence: 'visitas orgánicas con y sin interacción de GA4, este período y el anterior (TASK-1974)', verdict: 'producer_now' },
  { family: 'line', question: 'tendencia', requires: 'serie de ≥ 3 puntos dentro de la ventana', modules: ['seo', 'ico'], evidence: 'ICO: un hecho por mes y space; SEO: ETV mensual y clics por bloque de 7 días contra el mismo bloque del período anterior (TASK-1962, serie diaria de `readSeoOverviewKpisForWindow`)', verdict: 'producer_now' },
  { family: 'pie', question: 'parte de un total', requires: '≤ 3 partes no superpuestas', modules: [], evidence: 'ningún hecho es parte de un total con sus partes medidas (derivar «el resto» sería calcular)', verdict: 'no_evidence' },
  { family: 'donut', question: 'de qué se compone, con 2–3 partes', requires: '≤ 3 partes no superpuestas que suman el total', modules: ['aeo'], evidence: 'visitas desde IA por asistente de GA4: los 2 que más traen + «otros» sumado por filas (TASK-1974)', verdict: 'producer_now' },
  { family: 'scatter', question: 'relación entre dos métricas', requires: 'pares por observación', modules: [], evidence: 'SEO sólo agregados; sin observaciones pareadas', verdict: 'no_evidence' },
  { family: 'bullet', question: 'resultado contra la meta', requires: 'valor + meta oficial como hecho', modules: ['ico'], evidence: 'OTD%, RpA y FTR% por space contra los umbrales `optimal` de ICO_METRIC_REGISTRY', verdict: 'producer_now' },
  { family: 'gauge', question: 'nivel en escala 0–100', requires: 'valor + período anterior', modules: [], evidence: 'el adapter AEO lee sólo el ÚLTIMO run del grader (`readClientGraderReport` sin runId): la ventana anterior nunca tiene puntaje propio. Habilitarlo = elegir el run por ventana en el dominio dueño (follow-up)', verdict: 'no_evidence' },
  { family: 'waterfall', question: 'qué explica un cambio', requires: 'aportes que suman el cambio', modules: ['seo'], evidence: 'aporte de cada consulta al cambio de clics más el resto, de `readSeoWindowMovers` (misma suma que el total; TASK-1962). Página PDF y lámina desde TASK-1975', verdict: 'producer_now' },
  { family: 'funnel', question: 'conversión por etapas', requires: 'etapas subconjunto de la anterior', modules: [], evidence: 'requiere CRM (fuera de los módulos actuales)', verdict: 'no_evidence' },
  { family: 'heatmap', question: 'cambio por categoría y tiempo', requires: 'matriz categoría × período', modules: [], evidence: 'sin matriz categoría × período en ningún adapter', verdict: 'no_evidence' },
  { family: 'waffle', question: 'proporción de un conjunto contable', requires: 'conteos no superpuestos que suman el total', modules: ['aeo'], evidence: 'tono de las respuestas y tipo de fuente citada del informe del Grader: todas las categorías, incluida «sin clasificar» (TASK-1962). Un cuadro por unidad; página PDF y lámina desde TASK-1975', verdict: 'producer_now' },
  { family: 'venn_two', question: 'coincidencia de dos conjuntos', requires: 'tamaños A, B y A∩B', modules: [], evidence: 'requiere cruce por consulta del grader (no expuesto)', verdict: 'no_evidence' },
  { family: 'upset', question: 'combinaciones de conjuntos', requires: 'conteo por combinación', modules: [], evidence: 'requiere conjuntos por consulta del grader (no expuesto)', verdict: 'no_evidence' }
]

const BY_FAMILY = new Map(FAMILY_EVIDENCE_MATRIX.map(row => [row.family, row]))

/** ¿Puede un productor emitir esta familia para este módulo? */
export const canProduceFamily = (family: ChartFamily, module: InsightModule): boolean => {
  const row = BY_FAMILY.get(family)

  return row?.verdict === 'producer_now' && row.modules.includes(module)
}
