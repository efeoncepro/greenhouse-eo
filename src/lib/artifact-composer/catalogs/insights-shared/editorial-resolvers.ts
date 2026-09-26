/**
 * Resolvers editoriales de los catálogos Insights (TASK-1889): lo que la plantilla deriva del dato
 * en vez de pedírselo al autor. Los comparten `insights-report` (prefijo `report`) e `insights-deck`
 * (prefijo `deck`); cada catálogo los registra con su prefijo para que sus contratos sigan
 * nombrando resolvers propios.
 *
 * Ninguno dibuja un valor inventado: el ordinal sale de la posición, la barra de semanas del rango
 * declarado y los puntos del nivel declarado. Un valor fuera de rango no cae a un default — el
 * resolver devuelve `null` y el motor falla cerrado (`UnknownResolverValueError`).
 */

import type { FieldEffect, ResolverRegistry } from '../../resolver-contract'
import { parsePrintedNumber } from '../../bar-figure'
import { channelIsotypeEffects, CHANNEL_ISOTYPES } from './channels'

/**
 * El dato no vino (el campo es opcional en el contrato): el resolver derivado corre igual y recibe
 * `"undefined"`. Sin dato, el nodo se QUITA; nunca se dibuja un nivel o un rango por defecto.
 */
const isAbsent = (value: string): boolean => value === 'undefined' || value === 'null' || value.trim() === ''

/**
 * Enciende tantos puntos (`.pip`) como el nivel 1–3 dentro del grupo. Sin nivel, desaparece el
 * bloque entero (`.level` que contiene al grupo): una acción sin impacto estimado no muestra puntos.
 */
export const levelDotsEffects = (group: string, value: string): FieldEffect[] | null => {
  if (isAbsent(value)) return [{ selector: `.level:has(${group})`, remove: true }]

  const level = Number(value)

  if (!Number.isInteger(level) || level < 1 || level > 3) return null

  return [1, 2, 3].map(n => ({
    selector: `${group} .pip:nth-child(${n})`,
    toneClass: n <= level ? 'pip--on' : 'pip--off',
    toneGroup: ['pip--on', 'pip--off']
  }))
}

/**
 * Semanas del calendario (`"1-2"`, `"3"`): la barra sale del rango sobre una grilla de 4 semanas
 * con 2 px de aire a cada lado (regla del canvas aprobado).
 */
export const weekSpanEffects = (value: string): FieldEffect[] | null => {
  if (isAbsent(value)) return [{ selector: '.week-track', remove: true }]

  const match = /^([1-4])(?:-([1-4]))?$/.exec(value.trim())

  if (!match) return null

  const start = Number(match[1])
  const end = Number(match[2] ?? match[1])

  if (end < start) return null

  return [
    { selector: '.week-bar', styleProp: 'left', styleValue: `calc(${(start - 1) * 25}% + 2px)` },
    { selector: '.week-bar', styleProp: 'width', styleValue: `calc(${(end - start + 1) * 25}% - 4px)` }
  ]
}

/** Referencia sellada al logo privado de la organización cliente: `asset-ref:org-logo:<assetId>`. */
export const ORG_LOGO_REF = /^asset-ref:org-logo:[A-Za-z0-9_-]+$/

/**
 * Logo del cliente en la portada. Acepta sólo dos formas: un asset del PROPIO catálogo (`assets/…`,
 * el probe del gate visual) o la referencia sellada al logo de la organización, cuyos bytes entrega
 * quien compone (`ComposeOptions.externalAssets`). Sin logo, el `<img>` se quita y queda el nombre.
 */
export const clientLogoEffects = (value: string): FieldEffect[] | null => {
  if (value === 'undefined' || value === 'null' || value.trim() === '') return [{ selector: ':field', remove: true }]

  if (/^assets\/[\w./-]+$/.test(value) || ORG_LOGO_REF.test(value)) return [{ selector: ':field', attr: 'src', value }]

  return null
}


/**
 * Íconos de trazo de las páginas de figura (TASK-1889 Slice 4), los del canvas aprobado. La plantilla
 * trae el set completo (`.i-<clave>`) y el resolver deja sólo el pedido. Sin clave, el nodo se quita:
 * una métrica sin ícono propio no recibe uno ajeno. Una clave desconocida falla cerrado.
 */
export const FIGURE_ICON_KEYS = ['bars', 'clicks', 'impressions', 'ctr', 'search', 'target', 'link', 'trend'] as const

export const iconEffects = (value: string): FieldEffect[] | null => {
  if (isAbsent(value)) return [{ selector: ':field', remove: true }]

  if (!(FIGURE_ICON_KEYS as readonly string[]).includes(value)) return null

  return FIGURE_ICON_KEYS.filter(key => key !== value).map(key => ({ selector: `.i-${key}`, remove: true }))
}

/**
 * Variación: `<dirección>[:<tono>]`. La DIRECCIÓN (`up`/`down`/`flat`) es la del valor y decide el triángulo; el
 * TONO (`better`/`worse`/`neutral`) dice si el cambio es bueno según la dirección de la métrica, y decide el color.
 * Sin tono se lee como el canvas (subir = mejor). Así «▼ 7,6 %» de RpA puede ir en el tono bueno y «▲ 0,8 pos.»
 * en el tono peor, con una sola regla para tablas y figuras.
 */
export const DELTA_VALUES = ['up', 'down', 'flat', 'up:better', 'up:worse', 'up:neutral', 'down:better', 'down:worse', 'down:neutral', 'flat:neutral'] as const

export const parseDelta = (value: string): { direction: 'up' | 'down' | 'flat'; better: boolean } | null => {
  if (!(DELTA_VALUES as readonly string[]).includes(value)) return null

  const [direction, tone] = value.split(':') as ['up' | 'down' | 'flat', string | undefined]

  return { direction, better: tone ? tone === 'better' : direction === 'up' }
}

export const deltaToneEffects = (value: string): FieldEffect[] | null => {
  const parsed = parseDelta(value)

  if (!parsed) return null

  const effects: FieldEffect[] = [
    { selector: ':field', toneClass: parsed.better ? 'delta--better' : 'delta--plain', toneGroup: ['delta--better', 'delta--plain'] }
  ]

  if (parsed.direction !== 'up') effects.push({ selector: '.delta-mark-up', remove: true })
  if (parsed.direction !== 'down') effects.push({ selector: '.delta-mark-down', remove: true })

  return effects
}

/**
 * Par de barras de una métrica (período y anterior) en la escala PROPIA de la métrica: el mayor de los
 * dos ocupa el carril completo. Salen del número impreso de `current`/`prior` —la misma cifra que se
 * lee al lado—, así barra y etiqueta no pueden decir cosas distintas. Sin anterior, se quita su línea;
 * un valor negativo o ilegible no dibuja barra (nunca una barra que el dato no sostiene).
 */
export const pairBarsEffects = (item: Record<string, unknown>): FieldEffect[] => {
  const current = parsePrintedNumber(item.current)
  const prior = item.prior === undefined ? null : parsePrintedNumber(item.prior)
  const max = Math.max(0, current ?? 0, prior ?? 0)
  const effects: FieldEffect[] = []

  const bar = (selector: string, value: number | null) => {
    if (value === null || value < 0 || max <= 0) effects.push({ selector, remove: true })
    else effects.push({ selector, styleProp: '--fill', styleValue: (value / max).toFixed(4) })
  }

  bar('.bar-current', current)

  if (item.prior === undefined) effects.push({ selector: '.pair-prior', remove: true })
  else bar('.bar-prior', prior)

  return effects
}

/**
 * Fila de metas (bullet, canvas `Premium-Metas`). Cada fila mide en su PROPIA escala: el mayor entre
 * lo logrado y la meta ocupa el 91 % del carril (1,1 × máximo, la regla del canvas) y la marca vertical
 * es la meta. La zona de ATENCIÓN sólo se dibuja si el ítem trae `band` —el límite de atención del
 * registro dueño de la métrica, como cifra impresa—: ningún umbral se escribe acá (un 0,85 a mano daba
 * una tercera versión de los umbrales ICO). Sin banda, la pista es una sola. La fila «mayor brecha» es
 * la que queda más lejos de su meta en la dirección que empeora —decidida con TODAS las filas— y el tono
 * de la píldora sale de si se alcanzó.
 */
export const bulletRowEffects = (item: Record<string, unknown>, slots: Record<string, unknown>): FieldEffect[] | null => {
  const lowerIsBetter = slots.bulletDirection === 'lower_is_better'
  const value = parsePrintedNumber(item.value)
  const target = parsePrintedNumber(item.target)

  if (value === null || target === null || value < 0 || target <= 0) return null

  const ratio = (row: Record<string, unknown>): number | null => {
    const v = parsePrintedNumber(row.value)
    const t = parsePrintedNumber(row.target)

    if (v === null || t === null || t <= 0) return null

    // Brecha normalizada: > 1 = no alcanzó (en la dirección que empeora).
    return lowerIsBetter ? v / t : t / Math.max(v, 1e-9)
  }

  const rows = Array.isArray(slots.bulletRows) ? (slots.bulletRows as Record<string, unknown>[]) : []
  const gaps = rows.map(ratio).filter((r): r is number => r !== null && r > 1)
  const own = ratio(item)!
  const met = own <= 1
  const worst = gaps.length > 0 ? Math.max(...gaps) : null
  const band = item.band === undefined ? null : parsePrintedNumber(item.band)

  if (item.band !== undefined && (band === null || band < 0)) return null

  const scale = Math.max(value, target, band ?? 0) * 1.1

  const effects: FieldEffect[] = [
    { selector: ':self', styleProp: '--achieved', styleValue: `${((value / scale) * 100).toFixed(1)}%` },
    { selector: ':self', styleProp: '--target', styleValue: `${((target / scale) * 100).toFixed(1)}%` },
    { selector: ':self', styleProp: '--zone', styleValue: band === null ? '0%' : `${((band / scale) * 100).toFixed(1)}%` },
    { selector: '.delta-pill', toneClass: met ? 'delta--better' : 'delta--plain', toneGroup: ['delta--better', 'delta--plain'] },
    { selector: met ? '.delta-mark-down' : '.delta-mark-up', remove: true }
  ]

  // Más oscuro = peor (Few): con «menos es mejor» la zona crítica queda SOBRE el límite, no bajo él.
  if (lowerIsBetter) effects.push({ selector: ':self', toneClass: 'bullet--lower', toneGroup: ['bullet--lower'] })

  if (!met && worst !== null && own === worst) effects.push({ selector: ':self', toneClass: 'bullet--gap', toneGroup: ['bullet--gap'] })

  return effects
}

export const insightsEditorialResolvers = (prefix: string): ResolverRegistry => ({
  /** `channelId` → isotipo del canal. Un canal desconocido se dibuja sin isotipo (no rompe). */
  [`${prefix}-channel-isotype`]: {
    known: [...Object.keys(CHANNEL_ISOTYPES), '<cualquier otro: nombre sin isotipo>'],
    build: value => channelIsotypeEffects(value)
  },
  /** Ordinal de un ítem (`01`, `02`…): sale de su posición, el autor no lo escribe. */
  [`${prefix}-ordinal`]: {
    known: ['<derivado de la posición del ítem>'],
    build: (_value, ctx) => [{ selector: ':field', asText: true, value: String(ctx.index + 1).padStart(2, '0') }]
  },
  /** Número sin relleno (`1`, `2`…): el de las acciones del plan. */
  [`${prefix}-number`]: {
    known: ['<derivado de la posición del ítem>'],
    build: (_value, ctx) => [{ selector: ':field', asText: true, value: String(ctx.index + 1) }]
  },
  [`${prefix}-impact-dots`]: {
    known: ['1', '2', '3'],
    build: value => levelDotsEffects('.impact-dots', value)
  },
  [`${prefix}-effort-dots`]: {
    known: ['1', '2', '3'],
    build: value => levelDotsEffects('.effort-dots', value)
  },
  [`${prefix}-week-span`]: {
    known: ['<N> o <N>-<M> con 1 ≤ N ≤ M ≤ 4'],
    build: value => weekSpanEffects(value)
  },
  [`${prefix}-client-logo`]: {
    known: ['assets/<archivo del catálogo>', 'asset-ref:org-logo:<assetId>'],
    build: value => clientLogoEffects(value)
  },
  /** Ícono de un bloque de cierre: `measure` (bombilla) o `action` (flecha). */
  [`${prefix}-closing-icon`]: {
    known: ['measure', 'action'],
    build: value =>
      value === 'measure'
        ? [{ selector: '.closing-icon--action', remove: true }]
        : value === 'action'
          ? [{ selector: '.closing-icon--measure', remove: true }]
          : null
  },
  /** Ícono de trazo de una métrica o de la figura (set del canvas). */
  [`${prefix}-icon`]: {
    known: [...FIGURE_ICON_KEYS],
    build: value => iconEffects(value)
  },
  /** Dirección de la variación contra el período anterior. */
  [`${prefix}-delta-tone`]: {
    known: [...DELTA_VALUES],
    build: value => deltaToneEffects(value)
  },
  /** Barras del período y del anterior, en la escala propia de la métrica. */
  [`${prefix}-pair-bars`]: {
    known: ['<derivado de current y prior>'],
    build: (_value, ctx) => pairBarsEffects(ctx.item)
  },
  /** Fila de metas: escala propia, marca de meta, zona y mayor brecha, desde las cifras. */
  [`${prefix}-bullet-row`]: {
    known: ['<derivado de value, target, band, bulletDirection y las demás filas>'],
    build: (_value, ctx) => bulletRowEffects(ctx.item, ctx.slots)
  },
  /** Muestra de línea de la leyenda según el rol de la serie (el mismo trazo que en la figura). */
  [`${prefix}-line-role`]: {
    known: ['primary', 'reference', 'detail'],
    build: value =>
      ['primary', 'reference', 'detail'].includes(value)
        ? ['primary', 'reference', 'detail'].filter(role => role !== value).map(role => ({ selector: `.line-swatch--${role}`, remove: true }))
        : null
  }
})
