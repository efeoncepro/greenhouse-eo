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
  }
})
