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

export const INSIGHT_CHANNEL_IDS = ['google', 'google_ai_overview', 'chatgpt', 'gemini', 'claude', 'perplexity'] as const
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
