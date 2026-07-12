/**
 * Artifact Composer — el CONTRATO de resolvers (TASK-1393 Slice 2).
 *
 * Un `resolver` traduce un valor SEMÁNTICO del slot (`kind: "visibility"`) a una decisión de
 * PRESENTACIÓN (qué ícono pintar, qué tono aplicar, cuánto mide una barra). El autor dice QUÉ es
 * cada cosa; el catálogo decide CÓMO se ve.
 *
 * La partición que este módulo sella:
 *   - El MOTOR posee el contrato y el dispatch (`resolveFieldDirective`): cómo se declara un
 *     resolver, qué puede efectuar sobre el DOM y el fail-closed ante valores desconocidos.
 *   - El CATÁLOGO posee la TABLA (`ResolverRegistry`): `stat-goal-icon` o `chart-bar-geometry` son
 *     semántica del deck AXIS, no del motor. Un carrusel declara los suyos sin tocar este archivo.
 */

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

export type ResolverDef = (value: string, ctx: ResolverContext) => FieldEffect[] | null

/** La tabla de resolvers de un CATÁLOGO: nombre → valores conocidos + builder de efectos. */
export type ResolverRegistry = Record<string, { known: string[]; build: ResolverDef }>

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
 * Decide qué hacer con un campo del item, contra la tabla del CATÁLOGO.
 *
 * `validation-only` gana sobre todo: un campo que existe sólo para validar (la evidencia de una
 * cifra) NUNCA se pinta en la lámina — es munición interna, no copy para el comité.
 */
export const resolveFieldDirective = (
  resolvers: ResolverRegistry,
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

  const resolver = resolvers[field.resolver]

  if (!resolver) {
    // Un resolver declarado en el contrato pero ausente de la tabla del catálogo es un bug del
    // catálogo, no del contenido. Fail-closed: sin resolver no hay lámina.
    throw new Error(
      `Resolver "${field.resolver}" declarado en el contrato pero no implementado en la tabla del catálogo.`
    )
  }

  const effects = resolver.build(String(value), ctx)

  if (!effects) {
    throw new UnknownResolverValueError(field.resolver, String(value), resolver.known)
  }

  return { mode: 'apply', effects }
}
