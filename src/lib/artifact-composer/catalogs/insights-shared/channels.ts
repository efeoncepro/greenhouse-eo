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

/** channelId → isotipo relativo al catálogo. `google_ai_overview` es Google: mismo isotipo. */
export const CHANNEL_ISOTYPES: Readonly<Record<string, string>> = {
  google: 'assets/channels/google.svg',
  google_ai_overview: 'assets/channels/google.svg',
  chatgpt: 'assets/channels/chatgpt.svg',
  gemini: 'assets/channels/gemini.svg',
  claude: 'assets/channels/claude.svg',
  perplexity: 'assets/channels/perplexity.svg'
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
