/**
 * TASK-1266 — Growth AI Visibility · Readiness scoring config (Slice 2).
 *
 * Config VERSIONADA del/los score(s) de readiness técnica del sitio analizado. Dos ejes
 * ORTOGONALES entre sí y al score de percepción (`ai_visibility_score_v1`), reportados LADO
 * A LADO, NUNCA fusionados: `structural` ("¿por qué no te citan?") y `agentic` ("¿te pueden
 * usar los agentes?"). Cada dimensión = un probe kind. Los pesos suman 100 DENTRO de cada eje
 * (rebalanceo intra-eje), nunca cross-eje. PURO.
 */

import { type ProbeAxis, type ProbeKind } from '../probes/contracts'

export const AI_READINESS_SCORE_VERSION = 'ai_readiness_score_v1' as const
export type ReadinessScoreVersion = typeof AI_READINESS_SCORE_VERSION

export interface ReadinessDimensionConfig {
  key: ProbeKind
  axis: ProbeAxis
  label: string
  /** Peso 0..100; la suma POR EJE debe ser 100. */
  weight: number
  meaning: string
}

/** Dimensiones de readiness por eje (peso suma 100 dentro de cada eje). */
export const READINESS_DIMENSIONS: ReadinessDimensionConfig[] = [
  // ── Eje structural (suma 100) ──────────────────────────────────────────────
  {
    key: 'robots_txt',
    axis: 'structural',
    label: 'Acceso de crawlers IA',
    weight: 30,
    meaning: 'robots.txt no bloquea a los crawlers de los answer engines (GPTBot, PerplexityBot, ClaudeBot, Google-Extended).'
  },
  {
    key: 'json_ld',
    axis: 'structural',
    label: 'Structured data (schema.org)',
    weight: 30,
    meaning: 'El sitio publica JSON-LD que define la entidad de marca para los motores.'
  },
  {
    key: 'llms_txt',
    axis: 'structural',
    label: 'llms.txt',
    weight: 15,
    meaning: 'El sitio cura contenido clave para los LLMs vía llms.txt.'
  },
  {
    key: 'sitemap',
    axis: 'structural',
    label: 'Sitemap',
    weight: 10,
    meaning: 'Un sitemap válido habilita el descubrimiento completo del contenido.'
  },
  {
    key: 'core_web_vitals',
    axis: 'structural',
    label: 'Core Web Vitals',
    weight: 15,
    meaning: 'El sitio renderiza con buen rendimiento (señal de calidad para crawlers).'
  },
  // ── Eje agentic (suma 100) — probes en Slice 3 ──────────────────────────────
  {
    key: 'well_known_mcp',
    axis: 'agentic',
    label: '.well-known/mcp',
    weight: 25,
    meaning: 'El sitio expone un servidor MCP descubrible para que los agentes lo operen.'
  },
  {
    key: 'api_discoverability',
    axis: 'agentic',
    label: 'API discoverable',
    weight: 20,
    meaning: 'El sitio publica un contrato programático descubrible (OpenAPI / ai-plugin).'
  },
  {
    key: 'structured_actions',
    axis: 'agentic',
    label: 'Acciones estructuradas',
    weight: 20,
    meaning: 'El JSON-LD declara potentialAction/SearchAction que un agente puede ejecutar.'
  },
  {
    key: 'dom_semantics',
    axis: 'agentic',
    label: 'DOM semántico',
    weight: 15,
    meaning: 'El HTML usa landmarks/ARIA que un agente puede interpretar y navegar.'
  },
  {
    key: 'webmcp_tools',
    axis: 'agentic',
    label: 'WebMCP tools',
    weight: 20,
    meaning: 'La página registra tools WebMCP (navigator.modelContext) — el techo de la operabilidad agéntica.'
  }
]

export const READINESS_DIMENSION_CONFIG_BY_KEY = Object.fromEntries(
  READINESS_DIMENSIONS.map(dimension => [dimension.key, dimension])
) as Record<ProbeKind, ReadinessDimensionConfig>

export const readinessDimensionsForAxis = (axis: ProbeAxis): ReadinessDimensionConfig[] =>
  READINESS_DIMENSIONS.filter(dimension => dimension.axis === axis)

/** Suma de pesos por eje (debe ser 100 en cada uno). */
export const readinessAxisWeightSum = (axis: ProbeAxis): number =>
  readinessDimensionsForAxis(axis).reduce((total, dimension) => total + dimension.weight, 0)
