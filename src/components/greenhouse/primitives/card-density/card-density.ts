// TASK-1115 — Adaptive Card / content density contract (capacidad HERMANA del Composition Shell).
//
// Generaliza el Density Contract de tablas (TASK-743, `data-table/density.ts`) a CARDS, reusando el
// patrón `size → behavior` de `resolveAdaptiveSidecarMode` (TASK-1028). El card se adapta a SU PROPIO
// ancho (container query) — NO hereda del shell. El seam con el Composition Shell es la container query:
// cuando una región condensa, el ancho del card cambia → su fit mode se reevalúa solo. Componen sin cablearse.
//
// PURE + testeable sin DOM. El hook `useContainerDensity` (ResizeObserver) consume estos helpers.

/** Fit modes canónicos del card (chico set, mirror de los 3 de tablas). NO skins — comportamiento. */
export type CardDensity = 'full' | 'condensed' | 'peek'

/**
 * Breakpoints de fit por ancho del PROPIO card (px). Constraints de layout, no spacing scale.
 * Derivados del modelo de regiones (Composition Shell `aside` minInlineSize 360 / `primary` 480) +
 * `resolveAdaptiveSidecarMode` (sidecarWidth 420); se afinan con GVC.
 *   - >= condensed (360) → `full`   (cabe el card completo)
 *   - >= peek (200), < 360 → `condensed` (versión real más chica: KPI = value+label, chart = sparkline)
 *   - < 200 → `peek`        (solo el dato clave)
 */
export const CARD_DENSITY_BREAKPOINTS = { condensed: 360, peek: 200 } as const

/** Orden de mayor a menor densidad de contenido (full = más rico). */
const CARD_DENSITY_ORDER: readonly CardDensity[] = ['full', 'condensed', 'peek']

export const isCardDensity = (value: unknown): value is CardDensity =>
  value === 'full' || value === 'condensed' || value === 'peek'

/** Modo solicitado por el consumer: un fit fijo, `'auto'` (resolver por ancho) o nada (default `full`). */
export type CardDensityRequest = CardDensity | 'auto'

/**
 * Resuelve el fit mode por el ancho del card. Espeja `degradeDensityForWidth` (TASK-743) +
 * `resolveAdaptiveSidecarMode` (size→behavior). Sin ancho medido (SSR / primer paint) → `full`
 * (never-hidden: el contenido rico se monta y luego condensa al medir, nunca al revés).
 */
export const resolveCardDensity = (availableWidth?: number | null): CardDensity => {
  if (availableWidth == null || availableWidth <= 0) return 'full'
  if (availableWidth < CARD_DENSITY_BREAKPOINTS.peek) return 'peek'
  if (availableWidth < CARD_DENSITY_BREAKPOINTS.condensed) return 'condensed'

  return 'full'
}

/**
 * Resuelve el fit mode efectivo desde el request del consumer + el ancho medido.
 * - request fijo (`full`/`condensed`/`peek`) → se respeta (override, ignora el ancho).
 * - `'auto'` → `resolveCardDensity(width)`.
 * - undefined → `full` (default: comportamiento legacy del card, sin adaptación).
 */
export const resolveCardDensityRequest = (
  request: CardDensityRequest | undefined,
  availableWidth?: number | null
): CardDensity => {
  if (request === undefined) return 'full'
  if (request === 'auto') return resolveCardDensity(availableWidth)

  return request
}

/** Negativo si `a` es más rico que `b` (mismo contrato que `compareDensity` de tablas). */
export const compareCardDensity = (a: CardDensity, b: CardDensity): number =>
  CARD_DENSITY_ORDER.indexOf(a) - CARD_DENSITY_ORDER.indexOf(b)

/** `true` si el modo es al menos tan condensado como `floor` (e.g. "¿oculto el subtitle?" → `isAtLeast('condensed')`). */
export const isCardDensityAtLeast = (mode: CardDensity, floor: CardDensity): boolean =>
  compareCardDensity(mode, floor) >= 0
