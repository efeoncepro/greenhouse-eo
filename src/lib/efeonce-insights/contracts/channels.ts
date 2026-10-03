/**
 * TASK-1888 — identidad de canal (browser-safe). Un `channelId` es el nombre ESTABLE de una superficie donde la
 * marca se ve (un buscador o un motor de respuesta IA). Lo sellan los adapters en cada hecho que representa un
 * canal y el planner lo copia a las series, dimensiones e ítems de gráfico; los catálogos lo traducen a su isotipo
 * (`artifact-composer/catalogs/insights-shared/channels.ts`, TASK-1889), nunca al revés.
 *
 * El vocabulario de cada dominio productor NO es el del documento: el grader AEO habla de `openai` y `anthropic`,
 * el lector de un informe ve ChatGPT y Claude. El mapeo vive acá, en un solo lugar. Un proveedor desconocido no rompe
 * nada: queda SIN `channelId` (campo ausente) y el documento muestra su nombre sin isotipo.
 */

/**
 * TASK-1990 — las 19 plataformas del contrato AXIS `efeonce.insights-stat-card` 0.2.0, con los mismos ids que
 * `AXIS_PLATFORM_ASSETS[].platform` de `@efeoncepro/axis-brand-assets` (un test falla si las listas difieren). Que un id
 * esté acá no hace que un adapter lo emita: sólo lo vuelve un `channelId` válido cuando un productor lo selle.
 */
export const INSIGHT_CHANNEL_IDS = [
  'google', 'google_ai_overview', 'chatgpt', 'gemini', 'claude', 'perplexity',
  'google_search_console', 'google_analytics', 'google_ads', 'bing', 'youtube', 'reddit', 'wikipedia', 'linkedin',
  'instagram', 'tiktok', 'meta', 'frameio', 'greenhouse'
] as const
export type InsightChannelId = (typeof INSIGHT_CHANNEL_IDS)[number]

export const isInsightChannelId = (value: unknown): value is InsightChannelId =>
  typeof value === 'string' && (INSIGHT_CHANNEL_IDS as readonly string[]).includes(value)

/** Proveedor del AI Visibility Grader → canal. Sólo los que existen de verdad en el grader. */
const AEO_PROVIDER_CHANNELS: Readonly<Record<string, InsightChannelId>> = {
  openai: 'chatgpt',
  anthropic: 'claude',
  gemini: 'gemini',
  perplexity: 'perplexity',
  google_ai_overview: 'google_ai_overview'
}

/** Canal de un proveedor del grader AEO; `undefined` si el proveedor no está en el registro. */
export const channelForAeoProvider = (provider: string): InsightChannelId | undefined => AEO_PROVIDER_CHANNELS[provider]

/** Search Console y el ranking orgánico miden Google. */
export const SEO_SEARCH_CHANNEL: InsightChannelId = 'google'

/**
 * TASK-1990 — dominio citado → plataforma con isotipo. Sólo las plataformas cuyo dominio identifica sin ambigüedad a la
 * fuente (una página de YouTube, un hilo de Reddit, un artículo de Wikipedia en cualquier idioma, un perfil de LinkedIn,
 * Instagram o TikTok, una página de Facebook). Cualquier otro dominio queda sin canal: la cifra lleva su glifo.
 */
const DOMAIN_CHANNELS: ReadonlyArray<readonly [string, InsightChannelId]> = [
  ['youtube.com', 'youtube'],
  ['youtu.be', 'youtube'],
  ['reddit.com', 'reddit'],
  ['wikipedia.org', 'wikipedia'],
  ['linkedin.com', 'linkedin'],
  ['instagram.com', 'instagram'],
  ['tiktok.com', 'tiktok'],
  ['facebook.com', 'meta']
]

export const channelForDomain = (domain: string): InsightChannelId | undefined => {
  const host = domain.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#:]/)[0]!.replace(/\.$/, '')

  if (!host) return undefined

  return DOMAIN_CHANNELS.find(([root]) => host === root || host.endsWith(`.${root}`))?.[1]
}
