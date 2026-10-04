/**
 * Identidad visual de los canales que mide Efeonce Insights (TASK-1889) — compartida por los
 * catálogos `insights-report` e `insights-deck`.
 *
 * El `channelId` lo sella TASK-1888 en cada serie o dimensión que representa un canal
 * (`contracts/channels.ts` del dominio). El catálogo sólo lo traduce a su isotipo: un archivo DENTRO
 * del catálogo (`assets/channels/*.svg`, copiado de los isotipos oficiales del repo), porque el
 * catálogo viaja solo al worker.
 *
 * Un canal desconocido NO rompe el render: se dibuja el nombre sin isotipo (wireframe, «canal
 * desconocido»). Por eso el resolver responde a cualquier valor en vez de fallar cerrado.
 */

import type { FieldEffect } from '../../resolver-contract'

/**
 * Plataforma → isotipo relativo al catálogo. Cada archivo es una copia de `AXIS_PLATFORM_ASSETS`
 * (@efeoncepro/axis-brand-assets 0.4.15, `platforms/<id>-isotype.svg`), verificada por
 * `insights-shared/channels.test.ts`: nunca se edita a mano. AI Overview lleva su lupa con el degradado de la G (aprobada
 * el 2026-10-03), no la G de Google. Search Console, Google Analytics y Greenhouse son plataformas de la FUENTE de una
 * cifra (tarjeta de cifra, contrato AXIS `efeonce.insights-stat-card` 0.2.0), no `channelId`.
 */
export const CHANNEL_ISOTYPES: Readonly<Record<string, string>> = {
  google: 'assets/channels/google.svg',
  google_ai_overview: 'assets/channels/google-ai-overview.svg',
  google_search_console: 'assets/channels/search-console.svg',
  google_analytics: 'assets/channels/google-analytics.svg',
  greenhouse: 'assets/channels/greenhouse.svg',
  chatgpt: 'assets/channels/chatgpt.svg',
  gemini: 'assets/channels/gemini.svg',
  claude: 'assets/channels/claude.svg',
  perplexity: 'assets/channels/perplexity.svg',
  // TASK-1996 (2026-10-04) — las demás plataformas del contrato AXIS: el dominio citado (linkedin.com, youtube.com…) y la
  // pauta llevan su isotipo apenas un hecho trae su `channelId` (`channelForDomain`).
  google_ads: 'assets/channels/google-ads.svg',
  bing: 'assets/channels/bing.svg',
  youtube: 'assets/channels/youtube.svg',
  reddit: 'assets/channels/reddit.svg',
  wikipedia: 'assets/channels/wikipedia.svg',
  linkedin: 'assets/channels/linkedin.svg',
  instagram: 'assets/channels/instagram.svg',
  tiktok: 'assets/channels/tiktok.svg',
  meta: 'assets/channels/meta.svg',
  frameio: 'assets/channels/frameio.svg'
}

/**
 * Efectos sobre el ítem de un canal: con isotipo conocido, el `<img>` del campo toma su `src`; sin
 * él, se quita el disco entero (`.channel-disc`) y queda el nombre.
 */
export const channelIsotypeEffects = (channelId: string): FieldEffect[] => {
  const isotype = CHANNEL_ISOTYPES[channelId]

  if (!isotype) return [{ selector: '.channel-disc', remove: true }]

  return [{ selector: ':field', attr: 'src', value: isotype }]
}
