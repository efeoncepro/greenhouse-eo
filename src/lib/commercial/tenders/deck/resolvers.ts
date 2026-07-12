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

/** Un efecto sobre el DOM del item: setear un atributo, o marcar la clase de tono. */
export interface FieldEffect {
  /** Selector DENTRO del item. `':self'` = el nodo raíz del item. */
  selector: string
  attr?: string
  value?: string
  /** Clase de tono a aplicar (reemplaza a las del mismo grupo). */
  toneClass?: string
  toneGroup?: string[]
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

type ResolverDef = (value: string) => FieldEffect[] | null

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
  }
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
  field: { resolver?: string; consumer?: string },
  value: unknown
): FieldDirective => {
  if (field.consumer === 'validation-only') {
    return { mode: 'skip' }
  }

  if (!field.resolver) {
    return { mode: 'text' }
  }

  const resolver = RESOLVERS[field.resolver]

  if (!resolver) {
    // Un resolver declarado en el contrato pero no implementado es un bug del motor, no del contenido.
    throw new Error(`Resolver "${field.resolver}" declarado en el contrato pero no implementado en resolvers.ts`)
  }

  const effects = resolver.build(String(value))

  if (!effects) {
    throw new UnknownResolverValueError(field.resolver, String(value), resolver.known)
  }

  return { mode: 'apply', effects }
}
