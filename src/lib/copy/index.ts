/**
 * TASK-265 — Greenhouse Microcopy Foundation: API pública
 *
 * Capa dictionary-ready para microcopy funcional shared. Convive con
 * `src/config/greenhouse-nomenclature.ts`:
 *
 *   - greenhouse-nomenclature.ts: product nomenclature (Pulse, Spaces,
 *     Ciclos, Mi Greenhouse) + navegación + labels institucionales
 *
 *   - src/lib/copy/ (este módulo): microcopy funcional shared (CTAs,
 *     estados, loading, empty, meses, aria, errores, feedback, time).
 *     Locale-aware desde día uno.
 *
 * ## Uso típico
 *
 * ```tsx
 * import { getMicrocopy } from '@/lib/copy'
 *
 * const t = getMicrocopy() // default locale es-CL
 *
 * <Button>{t.actions.save}</Button>
 * <Chip label={t.states.pending} />
 * <Typography>{t.empty.noResults}</Typography>
 * <IconButton aria-label={t.aria.closeDialog} />
 * ```
 *
 * Para fetching de datos por mes:
 *
 * ```ts
 * const t = getMicrocopy()
 * const monthLabel = t.months.short[monthIndex] // 'Ene' .. 'Dic'
 * ```
 *
 * ## Cómo agregar copy nuevo
 *
 * 1. Identificá si es **product nomenclature** (vive en
 *    `greenhouse-nomenclature.ts`) o **microcopy funcional shared**
 *    (vive acá). Si dudás, invocá la skill `greenhouse-ux-writing`.
 * 2. Si es microcopy:
 *    - Si pertenece a un namespace existente (`actions`, `states`, etc.),
 *      agregá la clave en `dictionaries/es-CL/<namespace>.ts` y en su tipo
 *      en `types.ts`.
 *    - Si necesita namespace nuevo, agregalo a `MicrocopyNamespace` en
 *      `types.ts`, creá el archivo del namespace, y registrarlo en el
 *      composer `dictionaries/es-CL/index.ts`.
 * 3. Replicá la clave en `dictionaries/en-US/index.ts` cuando TASK-266
 *    active el locale real (hoy `en-US` re-exporta es-CL como semilla).
 *
 * ## Reglas duras
 *
 * - NO importar este módulo con `import 'server-only'` — la capa debe
 *   ser usable client-side también (data estática serializable).
 * - NO duplicar texto que ya existe en `greenhouse-nomenclature.ts`.
 *   Si una string es parte del lenguaje de producto, vive allá.
 * - NO inventar namespaces nuevos sin justificación de >3 surfaces que
 *   los reusen — sino vive cerca del dominio.
 * - Toda clave nueva debe pasar por skill `greenhouse-ux-writing` para
 *   validar tono es-CL.
 */

import { enUS } from './dictionaries/en-US'
import { esCL } from './dictionaries/es-CL'
import { DEFAULT_LOCALE } from './types'
import type { GetMicrocopy, Locale, MicrocopyDictionary } from './types'

const DICTIONARIES: Record<Locale, MicrocopyDictionary> = {
  'es-CL': esCL,
  'en-US': enUS
}

/**
 * Devuelve el dictionary completo para el locale solicitado. Si el locale
 * no existe, fallback a DEFAULT_LOCALE (es-CL).
 *
 * Server-side y client-side compatible. Los dictionaries son estáticos
 * y se serializan al cliente sin overhead.
 */
export const getMicrocopy: GetMicrocopy = (locale = DEFAULT_LOCALE) => {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}

export type {
  ActionsCopy,
  AriaCopy,
  EmptyCopy,
  ErrorsCopy,
  FeedbackCopy,
  GetMicrocopy,
  LoadingCopy,
  Locale,
  MicrocopyDictionary,
  MicrocopyNamespace,
  MonthsCopy,
  StatesCopy,
  TimeCopy
} from './types'

export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types'
