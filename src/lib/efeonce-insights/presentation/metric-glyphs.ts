/**
 * TASK-1990/1996 — el glifo Trazo de cada métrica de Insights (catálogo AXIS `STROKE_GLYPHS` de
 * `@efeoncepro/axis-graphic-line/icons`). UNA tabla para PDF, deck y web: `statItemView` lo resuelve y viaja en el modelo
 * web como `metricIcon`; Think y los catálogos sólo lo dibujan. Una cifra con isotipo de plataforma no lleva glifo (nunca
 * los dos); una métrica sin glifo no lleva ninguno. Pedido del operador el 2026-10-04: los íconos bajan la carga de leer.
 */

export const METRIC_GLYPH_KEYS = [
  'clic',
  'impresion',
  'ctr',
  'posicion',
  'keyword',
  'visita',
  'ia',
  'cita',
  'enlace',
  'competencia',
  'medicion',
  'reloj',
  'checklist',
  'reunion',
  'assets',
  'social',
  'prensa',
  'web'
] as const

export type MetricGlyphKey = (typeof METRIC_GLYPH_KEYS)[number]

const BY_METRIC: Readonly<Record<string, MetricGlyphKey>> = {
  clicks: 'clic',
  impressions: 'impresion',
  ctr: 'ctr',
  position: 'posicion',
  rank: 'posicion',
  page_one_keywords: 'keyword',
  keywords_top10: 'keyword',
  keywords_tracked: 'keyword',
  organic_etv: 'visita',
  ai_sessions: 'visita',
  share_of_model: 'ia',
  share_of_voice: 'competencia',
  citation_share: 'enlace',
  overall_score: 'medicion',
  otd: 'reloj',
  otd_pct: 'reloj',
  ftr: 'checklist',
  ftr_pct: 'checklist',
  rpa: 'reunion',
  'delivered.completed': 'assets',
  // Tipo de fuente que citan los motores (Grader).
  'source_type.social': 'social',
  'source_type.news': 'prensa',
  'source_type.owned': 'web',
  'source_type.earned': 'cita',
  'source_type.review': 'cita',
  'source_type.forum': 'reunion'
}

/** Familias con prefijo (`site.organic_sessions`, `ai_source.chatgpt`, `mention_rate.openai`, `sov.brand`). */
const BY_FAMILY: Readonly<Record<string, MetricGlyphKey>> = {
  site: 'visita',
  ai_source: 'visita',
  mention_rate: 'cita',
  sov: 'competencia'
}

export const metricGlyphOf = (metricId: string | undefined): MetricGlyphKey | null => {
  if (!metricId) return null

  return BY_METRIC[metricId] ?? BY_FAMILY[metricId.split('.')[0] ?? ''] ?? null
}
