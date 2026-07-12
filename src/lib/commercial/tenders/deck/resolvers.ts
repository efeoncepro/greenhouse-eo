/**
 * Tender Deck Composer — resolvers de campos.
 *
 * Un `resolver` traduce un valor SEMÁNTICO del slot (`kind: "visibility"`) a una decisión de
 * PRESENTACIÓN (qué ícono Solar pintar). Es una tabla, no un juicio: por eso vive acá, en el lado
 * determinista, y no en el chapter-author.
 *
 * El chapter-author dice QUÉ es cada cosa; el deck decide CÓMO se ve. Si el autor pudiera elegir el
 * ícono, dos láminas del mismo tipo terminarían con iconografías distintas — justo la incoherencia
 * que el molde existe para evitar.
 */

import { solarIconPath } from './solar-icons'

/** Un efecto sobre el DOM del item: atributo, clase de tono, o GEOMETRÍA (estilo). */
export interface FieldEffect {
  /**
   * Selector DENTRO del item.
   * - `':self'`  = el nodo raíz del item (para clases de tono).
   * - `':field'` = el nodo `[data-slot-field="<campo>"]` del propio campo.
   *
   * ⚠️ NUNCA escribir texto en `':self'`: `textContent` sobre la raíz del item BORRA todos sus hijos
   * (y con ellos las anclas del resto de los campos). Para texto derivado, usar `':field'`.
   */
  selector: string
  attr?: string
  value?: string
  /** Clase de tono a aplicar (reemplaza a las del mismo grupo). */
  toneClass?: string
  toneGroup?: string[]
  /**
   * Propiedad CSS a escribir (`height`, `left`, `width`…).
   *
   * ⚠️ Esto es lo que evita que una lámina MIENTA. Las barras de los prototipos tienen alturas y
   * posiciones hardcodeadas; si el composer sólo cambiara los NÚMEROS, la barra seguiría midiendo lo
   * del ejemplo — un gráfico que exagera (o esconde) la mejora real. En una oferta eso no es un bug
   * de layout: es **fabricación gráfica**. La geometría se deriva del dato, siempre.
   */
  styleProp?: string
  styleValue?: string
  /** Escribe el valor como TEXTO del nodo (para ordinales derivados, que no son un atributo). */
  asText?: boolean
  /**
   * Quita el nodo explícitamente cuando el dato no lo sostiene. No es un fallback: un resolver
   * debe declararlo para que el filler jamás deje chrome del blueprint fingiendo que existe.
   */
  remove?: true
}

/**
 * Contexto que un resolver necesita más allá del valor del campo.
 *
 * Los resolvers de geometría no pueden decidir con un solo campo: una barra de Gantt necesita
 * `startUnit` Y `endUnit` Y cuántas unidades tiene el eje; una barra de "antes/después" necesita el
 * otro valor para escalar. Por eso el resolver ve el item completo y el resto de los slots.
 */
export interface ResolverContext {
  item: Record<string, unknown>
  index: number
  itemCount: number
  slots: Record<string, unknown>
}

/** Qué hacer con un campo de item al llenar el DOM. */
export type FieldDirective =
  | { mode: 'text' }
  /** No se pinta: existe sólo para que el validador lo exija (ej. `evidenceRef`). */
  | { mode: 'skip' }
  /** Aplica efectos de presentación (ícono, tono) en vez de escribir texto. */
  | { mode: 'apply'; effects: FieldEffect[] }

const SOLAR = (name: string) => `assets/solar/${name}-bold.svg`

/**
 * `stat-goal-icon` — los 5 peldaños de la escalera Be X → su ícono.
 *
 * El mapa refleja el HTML de `StatSplit`, que ya trae un ícono por goal. Acá se hace explícito y
 * gobernable: el ícono lo decide el `kind`, no el orden en que el autor escribió la lista.
 */
const STAT_GOAL_ICON: Record<string, string> = {
  visibility: SOLAR('target'),
  citability: SOLAR('ranking'),
  coherence: SOLAR('shield-check'),
  learning: SOLAR('soundwave'),
  growth: SOLAR('chart-2')
}

/**
 * `four-pillars-icon-and-tone` — cada frente del método define DOS cosas: su ícono y su tono.
 *
 * El tono es la clase del `<article class="pillar ai|data|method|human">`, que el CSS de la
 * plantilla usa para colorear. Los íconos son los que el prototipo ya trae por pilar — no se
 * inventan acá, se leen del HTML canónico.
 */
const FOUR_PILLARS = ['ai', 'data', 'method', 'human'] as const

const FOUR_PILLAR_ICON: Record<string, string> = {
  ai: SOLAR('cpu'),
  data: SOLAR('chart-square'),
  method: SOLAR('book-2'),
  human: SOLAR('users-group-rounded')
}

/**
 * Íconos de las plantillas que usan `<svg><path>` inline (no `<img src>`): acá va el NOMBRE del
 * ícono Solar; el resolver le pide su path a `solar-icons.ts`.
 */
const TEAM_ROLE_ICON: Record<string, string> = {
  lead: 'star',
  strategy: 'target',
  content: 'pen-new-square',
  technical: 'settings',
  data: 'chart-2'
}

const METRICS_KPI_ICON: Record<string, string> = {
  visibility: 'target',
  engines: 'cpu',
  authority: 'ranking',
  gap: 'chart-2'
}

const CARD_GRID_ICON: Record<string, string> = {
  search: 'magnifer',
  conversation: 'chat-square',
  authoring: 'pen-new-square',
  data: 'database',
  measurement: 'chart-square',
  governance: 'shield-check'
}

type ResolverDef = (value: string, ctx: ResolverContext) => FieldEffect[] | null

const RESOLVERS: Record<string, { known: string[]; build: ResolverDef }> = {
  'stat-goal-icon': {
    known: Object.keys(STAT_GOAL_ICON),
    build: value => {
      const icon = STAT_GOAL_ICON[value]

      return icon ? [{ selector: '.goal-icon', attr: 'src', value: icon }] : null
    }
  },

  'four-pillars-icon-and-tone': {
    known: Object.keys(FOUR_PILLAR_ICON),
    build: value => {
      const icon = FOUR_PILLAR_ICON[value]

      if (!icon) return null

      return [
        { selector: '.icon-stage img', attr: 'src', value: icon },
        // El tono vive en la clase del propio `<article class="pillar …">`.
        { selector: ':self', toneClass: value, toneGroup: [...FOUR_PILLARS] }
      ]
    }
  },

  /**
   * `pricing-option-tone` — `isProposed` NO es un texto: marca cuál plan es el propuesto, y eso se
   * pinta con la clase `.is-proposed`. Escribirlo como copy dejaría un "true" impreso en la lámina
   * de la oferta económica.
   */
  'pricing-option-tone': {
    known: ['true', 'false'],
    build: value => {
      if (value !== 'true' && value !== 'false') return null

      return value === 'true'
        ? [{ selector: ':self', toneClass: 'is-proposed' }]
        : // El blueprint puede venir del plan destacado: hay que QUITARLE la clase, si no todos
          // los planes salen marcados como "el propuesto".
          [{ selector: ':self', toneGroup: ['is-proposed'] }]
    }
  },

  /**
   * `legend-layer-tone` — el punto de la leyenda NO es contenido: su opacidad **codifica la
   * profundidad de la capa** (outer → middle → core). El prototipo lo trae hardcodeado inline en
   * cada `.dot`, así que si el filler sólo clonara el blueprint, **los tres puntos saldrían del tono
   * más pálido** y la leyenda dejaría de significar algo. El tono sale de la capa, o no sale.
   */
  'legend-layer-tone': {
    known: ['outer', 'middle', 'core'],
    build: value => {
      const TEAL = '54,200,191'

      const background =
        value === 'outer'
          ? `rgba(${TEAL},.30)`
          : value === 'middle'
            ? `rgba(${TEAL},.60)`
            : value === 'core'
              ? `rgb(${TEAL})`
              : null

      if (background === null) return null

      return [{ selector: '.dot', styleProp: 'background', styleValue: background }]
    }
  },

  // ── Íconos SVG inline ────────────────────────────────────────────────────────────────────────
  // Estas plantillas no usan `<img src>` sino `<svg><path d="…">`: hay que reescribir el `d`.

  'team-role-icon': {
    known: Object.keys(TEAM_ROLE_ICON),
    build: value => {
      const icon = TEAM_ROLE_ICON[value]

      return icon ? [{ selector: '.av svg path', attr: 'd', value: solarIconPath(icon) }] : null
    }
  },

  'metrics-kpi-icon': {
    known: Object.keys(METRICS_KPI_ICON),
    build: value => {
      const icon = METRICS_KPI_ICON[value]

      return icon ? [{ selector: '.ic svg path', attr: 'd', value: solarIconPath(icon) }] : null
    }
  },

  'card-grid-capability-icon': {
    known: Object.keys(CARD_GRID_ICON),
    build: value => {
      const icon = CARD_GRID_ICON[value]

      return icon ? [{ selector: '.ic svg path', attr: 'd', value: solarIconPath(icon) }] : null
    }
  },

  // ── Ordinales: chrome derivado, no dato autorable ────────────────────────────────────────────
  // El número de un capítulo/fase sale de su POSICIÓN. Si el autor lo escribiera a mano, un deck
  // reordenado quedaría con la numeración vieja y se contradiría solo.

  'ordinal-number': {
    known: ['<derivado del índice>'],
    build: (_value, ctx) => [{ selector: ':field', value: String(ctx.index + 1).padStart(2, '0'), asText: true }]
  },

  'timeline-phase-ordinal': {
    known: ['<derivado del índice>'],
    build: (_value, ctx) => [{ selector: '.n', value: String(ctx.index + 1).padStart(2, '0'), asText: true }]
  },

  'section-number': {
    known: ['<derivado del orden de la sección>'],
    build: value => [{ selector: ':field', value: String(value).padStart(2, '0'), asText: true }]
  },

  'chapter-anchor': {
    // No es texto: alimenta el `href="#<id>"` — la nav del HTML y el link interno del PDF.
    known: ['<slideId destino>'],
    build: value => [{ selector: ':self', attr: 'href', value: `#${value}` }]
  },

  // ── Geometría: lo que impide que la lámina MIENTA ────────────────────────────────────────────

  /**
   * `case-study-before-after-bar-scale` — las dos barras se derivan de los valores REALES.
   *
   * El prototipo trae `height:74px` y `height:234px` fijas. Si el composer sólo cambiara los
   * números, un "de 12 a 14" se seguiría dibujando como el salto gigante del ejemplo. Eso no es un
   * bug de layout en una oferta: es **fabricación gráfica** — el evaluador ve una mejora que no
   * ocurrió. La barra mayor toma el alto máximo y la otra escala proporcionalmente.
   */
  'case-study-before-after-bar-scale': {
    known: ['<derivado de beforeValue/afterValue>'],
    build: (_value, ctx) => {
      const before = toNumber(ctx.item.beforeValue)
      const after = toNumber(ctx.item.afterValue)

      if (before === null || after === null) return null

      const max = Math.max(before, after)

      if (max <= 0) return null

      const MAX_PX = 234
      const MIN_PX = 12 // una barra de 0 igual debe verse: una raya, no la nada

      const height = (value: number) => `${Math.max(MIN_PX, Math.round((value / max) * MAX_PX))}px`

      return [
        { selector: '.barcol.before .bar', styleProp: 'height', styleValue: height(before) },
        { selector: '.barcol.after .bar', styleProp: 'height', styleValue: height(after) }
      ]
    }
  },

  /**
   * `chart-bar-geometry` — el ancho de cada barra sale de su valor.
   *
   * Mismo principio: las barras del prototipo son `width:88%|48%|32%` a mano. La serie mayor cae
   * sobre la refline (88%) y el resto escala contra ella.
   */
  'chart-bar-geometry': {
    known: ['<derivado de valuePct>'],
    build: (_value, ctx) => {
      const series = Array.isArray(ctx.slots.series) ? (ctx.slots.series as Record<string, unknown>[]) : []
      const values = series.map(item => toNumber(item.valuePct))

      if (values.some(value => value === null)) {
        throw new Error('chart-bar-geometry requiere valuePct numérico en cada serie; no se puede dibujar una barra sin dato.')
      }

      const max = Math.max(...(values as number[]), 0)
      const own = toNumber(ctx.item.valuePct)
      const printed = toNumber(ctx.item.value)
      const highlighted = series.filter(item => item.highlight === 'sky')

      if (own === null || max <= 0) return null

      if (printed === null || Math.abs(printed - own) > 0.001) {
        throw new Error(
          `chart-bar-geometry detectó value inconsistente: "${String(ctx.item.value)}" no representa valuePct=${own}. ` +
            'La etiqueta y la barra deben afirmar el mismo dato.'
        )
      }

      if (highlighted.length !== 1) {
        throw new Error(
          `chart-bar-geometry requiere exactamente una serie destacada (highlight="sky"); recibió ${highlighted.length}.`
        )
      }

      if (ctx.item.highlight !== 'sky' && ctx.item.highlight !== 'muted') {
        throw new Error(`chart-bar-geometry no conoce el tono "${String(ctx.item.highlight)}".`)
      }

      const REFLINE_PCT = 88
      const width = Math.round((own / max) * REFLINE_PCT)
      const isHighlighted = ctx.item.highlight === 'sky'
      const highlightedValue = toNumber(highlighted[0]!.valuePct)

      if (highlightedValue === null) {
        throw new Error('chart-bar-geometry no puede derivar la brecha: la serie destacada no tiene valuePct numérico.')
      }

      const highlightedWidth = Math.round((highlightedValue / max) * REFLINE_PCT)
      const gapWidth = REFLINE_PCT - highlightedWidth
      const pointDelta = max - highlightedValue
      const pointLabel = Number.isInteger(pointDelta) ? String(pointDelta) : pointDelta.toFixed(1).replace('.', ',')

      const effects: FieldEffect[] = [
        { selector: ':self', toneGroup: ['sky'], ...(isHighlighted ? { toneClass: 'sky' } : {}) },
        { selector: '.fill', toneClass: isHighlighted ? 'sky' : 'muted', toneGroup: ['sky', 'muted'] },
        { selector: '.fill', styleProp: 'width', styleValue: `${width}%` }
      ]

      if (isHighlighted && gapWidth > 0) {
        effects.push(
          { selector: '.gap', styleProp: 'left', styleValue: `${highlightedWidth}%` },
          { selector: '.gap', styleProp: 'width', styleValue: `${gapWidth}%` },
          { selector: '.gap .glabel', asText: true, value: `+${pointLabel} pts a cerrar` }
        )
      } else {
        effects.push({ selector: '.gap', remove: true })
      }

      return effects
    }
  },

  /**
   * `timeline-phase-span` — la barra de la fase se posiciona por sus unidades reales.
   *
   * Una fase que va del mes 2 al 4 debe dibujarse ahí. Con la geometría del prototipo, un plan de 8
   * meses se seguiría viendo como el de 6 del ejemplo: el cronograma diría una cosa y la barra otra.
   */
  'timeline-phase-span': {
    known: ['<derivado de startUnit/endUnit>'],
    build: (_value, ctx) => {
      const axis = Array.isArray(ctx.slots.timeAxis) ? ctx.slots.timeAxis : []
      const units = axis.length

      const start = toNumber(ctx.item.startUnit)
      const end = toNumber(ctx.item.endUnit)

      if (units <= 0 || start === null || end === null || end < start) return null

      const unit = 100 / units
      const left = (start - 1) * unit
      const width = (end - start + 1) * unit

      return [
        { selector: '.bar', styleProp: 'left', styleValue: `${left.toFixed(2)}%` },
        { selector: '.bar', styleProp: 'width', styleValue: `${width.toFixed(2)}%` }
      ]
    }
  },

  'timeline-phase-bar-kind': {
    known: ['work', 'continuous'],
    build: value => {
      if (value !== 'work' && value !== 'continuous') return null

      return value === 'continuous'
        ? [{ selector: '.bar', toneClass: 'cont', toneGroup: ['cont'] }]
        : [{ selector: '.bar', toneGroup: ['cont'] }]
    }
  },

  'timeline-milestone-position': {
    known: ['<derivado de la unidad del hito>'],
    build: (value, ctx) => {
      const axis = Array.isArray(ctx.slots.timeAxis) ? ctx.slots.timeAxis : []
      const units = axis.length
      const at = toNumber(value)

      if (units <= 0 || at === null) return null

      // El hito se ancla al FIN de su unidad (un hito "en el mes 2" cae al cerrar el mes 2).
      const left = (at / units) * 100

      // El rombo va SIEMPRE en su posición real —no se miente sobre la fecha—, pero la etiqueta se
      // ancla HACIA ADENTRO cuando el hito cae en un extremo. Un hito en la última unidad cae al
      // 100% del eje y su label, centrado y `nowrap`, se partiría contra el borde del lienzo. (El
      // prototipo esquivaba esto a mano: sus ejemplos usan 16%, 50% y 91%, nunca 100%.)
      const EDGE = 12
      const anchor = left >= 100 - EDGE ? 'at-end' : left <= EDGE ? 'at-start' : null

      return [
        { selector: ':self', styleProp: 'left', styleValue: `${left.toFixed(2)}%` },
        // El grupo se limpia SIEMPRE: el blueprint puede traer el anclaje de otro hito.
        { selector: ':self', toneGroup: ['at-start', 'at-end'], ...(anchor ? { toneClass: anchor } : {}) }
      ]
    }
  }
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    // Tolera "1.234", "45%", "$ 1.200" — el dato manda, no su formato de presentación.
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
    const parsed = Number.parseFloat(cleaned)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export class UnknownResolverValueError extends Error {
  constructor(resolver: string, value: string, known: string[]) {
    super(
      `El resolver "${resolver}" no sabe qué hacer con el valor "${value}". ` +
        `Valores conocidos: ${known.join(', ')}. ` +
        `Un valor nuevo NO cae a un ícono por defecto: se agrega al mapa (o el enum del contrato está mal).`
    )
    this.name = 'UnknownResolverValueError'
  }
}

/**
 * Decide qué hacer con un campo del item.
 *
 * `validation-only` gana sobre todo: un campo que existe sólo para validar (la evidencia de una
 * cifra) NUNCA se pinta en la lámina — es munición interna, no copy para el comité.
 */
export const resolveFieldDirective = (
  field: { resolver?: string; consumer?: 'validation-only' | 'resolver-only' },
  value: unknown,
  ctx: ResolverContext = { item: {}, index: 0, itemCount: 1, slots: {} }
): FieldDirective => {
  if (field.consumer === 'validation-only') {
    return { mode: 'skip' }
  }

  if (!field.resolver) {
    if (field.consumer === 'resolver-only') return { mode: 'skip' }

    return { mode: 'text' }
  }

  const resolver = RESOLVERS[field.resolver]

  if (!resolver) {
    // Un resolver declarado en el contrato pero no implementado es un bug del motor, no del contenido.
    throw new Error(`Resolver "${field.resolver}" declarado en el contrato pero no implementado en resolvers.ts`)
  }

  const effects = resolver.build(String(value), ctx)

  if (!effects) {
    throw new UnknownResolverValueError(field.resolver, String(value), resolver.known)
  }

  return { mode: 'apply', effects }
}
