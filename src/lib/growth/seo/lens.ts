/**
 * TASK-1785 — La lente deja de ser una instrucción y pasa a ser un campo del contrato.
 *
 * El invariante más load-bearing del módulo —**`●` medido y `◑` estimado jamás se promedian
 * ni se mezclan**— vivía como PROSA en la descripción de cada tool y en `§5` de la
 * arquitectura. Cada tool lo decía bien. Pero la mezcla no ocurre DENTRO de una tool: ocurre
 * ENTRE dos, cuando alguien compone una respuesta. Ninguna tool ve esa composición, así que
 * ninguna descripción puede defenderla, por bien escrita que esté.
 *
 * ═══ Por qué este archivo existe (el inventario que lo justifica) ═══
 *
 * El mismo hecho se decía en CINCO vocabularios paralelos, y por eso ningún mecanismo podía
 * verificarlo — no había un nombre común contra el cual comparar:
 *
 *   1. `lens: 'estimated'`                          domain-overview · url-visibility · keyword-gap
 *   2. `SeoPerformanceSource = gsc_measured|…`      performance/read-performance.ts
 *   3. `measurementKind: 'estimated_market'`        10 sitios del lane ecosystem
 *   4. `estimatedMarker: '◑'` / `measuredMarker`    work-queue/client-dto.ts
 *   5. `ProspectLens` + `ProspectSource`            carril prospecto (TASK-1709)
 *
 * Más los glifos ◑/● crudos en ~14 vistas, `src/lib/copy/growth.ts` y las propias
 * descripciones de las tools MCP. ⚠️ El quinto no se encuentra grepeando `lens`: sus campos
 * no se llaman así. **Un grep angosto no es un inventario** — el barrido que los halló a los
 * cinco fue por GLIFOS e identificadores de rótulo, no por el nombre que uno espera.
 *
 * ═══ La forma: la lente es propiedad de la CIFRA, no del RESULTADO ═══
 *
 * 🔴 Rotular un RESULTADO con una sola lente es lo que produce el defecto, y hay dos pruebas
 * vivas de signo opuesto en este mismo repo:
 *
 *   - `SeoPerformanceResult.source` declara UNA fuente para todo el DTO, pero su `summary`
 *     es SIEMPRE Search Console. Con `source = 'dataforseo_estimated'` ese resultado lleva
 *     una cifra `measured` dentro de un envoltorio rotulado `estimated`.
 *   - `work-queue/client-dto.ts` NO miente, y sólo porque abandonó el rótulo de resultado y
 *     lo puso por campo: `estimatedIncrementalClicks` (◑) convive con `measuredImpressions`
 *     (●) en la MISMA fila, bajo un solo `asOf`. Llegó a la forma correcta por necesidad.
 *
 * Por eso `SeoProvenance` se emite en LISTA y cada entrada declara qué parte del DTO
 * gobierna. Y por eso el mecanismo no es el tipo sino el test que lo acompaña: camina el DTO
 * real y exige que **cada hoja numérica esté reclamada por exactamente una procedencia**. Sin
 * esa cobertura, `section` sería una intención con buen nombre — que es justo la categoría de
 * cosa que esta task existe para eliminar.
 *
 * 🔴 **NO existe `lens: 'mixed'`, y su ausencia es deliberada.** Un valor `mixed` dejaría
 * rotular la fila entera y parar ahí: esconder el desglose con un nombre más honesto. La
 * lente es binaria; lo plural es la lista de procedencias, y lo que se verifica es que cubra
 * todo.
 *
 * ═══ Por qué la lente se DERIVA y no se persiste ═══
 *
 * La lente es CONSTANTE POR FUENTE: `seo_gsc_daily` es medida por definición;
 * `seo_domain_overview_snapshots` es estimada por definición. Una columna que vale siempre lo
 * mismo dentro de su tabla es denormalización que eventualmente diverge — alguien la escribe
 * mal en un INSERT y aparecen filas GSC marcadas `estimated`. Derivándola acá, en un solo
 * lugar, ninguna migración puede corromperla. Esta task NO crea ninguna columna `lens`.
 *
 * Módulo PURO (sin `server-only`): lo importan readers de servidor, el lane ecosystem, las
 * tools MCP y también la UI. Cero dependencias de runtime.
 */

// ─── La lente ────────────────────────────────────────────────────────────────

/**
 * `measured` (●) = observado sobre usuarios reales del propio dominio (Search Console).
 * `estimated` (◑) = observado por el proveedor sobre un query sintético, o modelado por él.
 *
 * 🔴 La distinción NO es "exacto vs aproximado". La posición que devuelve una SERP comprada
 * es EXACTA — y aun así es `estimated`, porque proviene de una consulta que ningún usuario
 * hizo, desde una ubicación elegida por nosotros. GSC promedia, y aun así es `measured`,
 * porque cada impresión que promedia ocurrió. Confundir las dos cosas es lo que vuelve
 * promediables dos magnitudes que no comparten referente.
 */
export type SeoLens = 'measured' | 'estimated'

export const SEO_LENSES: readonly SeoLens[] = ['measured', 'estimated']

/**
 * El glifo de cada lente, con UN solo origen.
 *
 * Antes vivía como literal suelto en `work-queue/client-dto.ts` y como carácter crudo en las
 * vistas.
 *
 * ⚠️ `as const satisfies` y NO una anotación `Record<SeoLens, string>`: la anotación ensancha
 * los valores a `string`, y un consumer que declaraba `estimatedMarker: '◑'` habría pasado a
 * declarar `string` sin que nada fallara. Centralizar no puede costar precisión de tipo.
 * `satisfies` conserva los literales Y sigue exigiendo que estén las dos lentes. Los consumers derivan el valor de acá; ⚠️ **jamás spreadean este módulo dentro de
 * un DTO cliente** — el redactor de la cola es por construcción explícita justamente para que
 * un campo nuevo no cruce solo, y un spread invertiría esa dirección en silencio.
 */
export const SEO_LENS_MARKER = {
  measured: '●',
  estimated: '◑'
} as const satisfies Record<SeoLens, string>

// ─── Las fuentes (vocabulario cerrado) ───────────────────────────────────────

/**
 * Fuentes que puede tener una cifra del módulo. **Cerrado a propósito**: si el motor sólo
 * entiende N fuentes, que el tipo las enumere. Es lo que permite que `resolveSeoLens` sea
 * TOTAL y que el test pruebe exhaustividad en vez de muestrear.
 *
 * Agregar una fuente es editar esta lista Y su lente en `SOURCE_LENS`: el `Record` completo
 * obliga a declarar la lente en el mismo commit — no se puede agregar una fuente y "decidir
 * después" de qué naturaleza es.
 */
export const SEO_FIGURE_SOURCES = [
  'gsc',
  'dataforseo_labs',
  'dataforseo_serp',
  'dataforseo_backlinks',
  'dataforseo_onpage',
  'dataforseo_domain_analytics'
] as const

export type SeoFigureSource = (typeof SEO_FIGURE_SOURCES)[number]

/**
 * El mapeo fuente→lente, declarado en UN solo lugar.
 *
 * 🔴 Search Console es la ÚNICA fuente `measured` del módulo, y un test lo afirma. Toda
 * familia DataForSEO es `estimated`, incluida `dataforseo_serp`: ver la nota de `SeoLens`
 * sobre por qué "exacto" no implica "medido". Rotular el SERP comprado como `measured` lo
 * volvería promediable con GSC — la mezcla exacta que este archivo existe para impedir, y
 * rompería además la asimetría de `readKeywordGap`, que EXCLUYE las keywords con impresiones
 * medidas justamente porque la lente medida gana en vez de promediarse.
 */
const SOURCE_LENS: Readonly<Record<SeoFigureSource, SeoLens>> = {
  gsc: 'measured',
  dataforseo_labs: 'estimated',
  dataforseo_serp: 'estimated',
  dataforseo_backlinks: 'estimated',
  dataforseo_onpage: 'estimated',
  dataforseo_domain_analytics: 'estimated'
}

export const resolveSeoLens = (source: SeoFigureSource): SeoLens => SOURCE_LENS[source]

export const isSeoFigureSource = (value: unknown): value is SeoFigureSource =>
  typeof value === 'string' && (SEO_FIGURE_SOURCES as readonly string[]).includes(value)

// ─── La procedencia de una parte del DTO ─────────────────────────────────────

export interface SeoProvenance {
  /**
   * Qué parte del DTO gobierna esta entrada, como path con `[]` para arrays
   * (`opportunities[].estimatedClickGain`, `summary.current.clicks`). `'*'` = el resultado
   * completo, y SÓLO es legítimo cuando todas sus cifras comparten fuente.
   *
   * El test de contrato camina el DTO real y exige que cada hoja numérica quede reclamada por
   * exactamente una entrada: un campo numérico nuevo sin declarar rompe CI. Ese es el
   * mecanismo — sin él, este campo sería una promesa.
   */
  section: string
  lens: SeoLens
  source: SeoFigureSource
  /**
   * `YYYY-MM-DD` (o ISO datetime) de la captura más reciente que respalda esta sección.
   *
   * `null` = no hay ninguna captura fechable en el alcance pedido. Es un estado honesto y
   * distinguible; ⚠️ jamás se rellena con la fecha de hoy ni con el fin de la ventana pedida
   * para "tener algo". Regla que el test afirma: **si la sección tiene al menos una magnitud
   * no nula, `capturedAt` no puede ser `null`** — una cifra sin as-of se lee como vigente
   * para siempre.
   */
  capturedAt: string | null
}

/**
 * Construye una procedencia derivando la lente de la fuente. Es el único camino: pasar
 * `lens` a mano permitiría rotular GSC como estimado y nadie lo notaría.
 */
export const seoProvenance = (input: {
  section: string
  source: SeoFigureSource
  capturedAt: string | null
}): SeoProvenance => ({
  section: input.section,
  lens: resolveSeoLens(input.source),
  source: input.source,
  capturedAt: input.capturedAt
})

// ─── La cifra ────────────────────────────────────────────────────────────────

/**
 * Forma canónica de una cifra que cruza el contrato agéntico. Generaliza el `ProspectFact`
 * de `TASK-1709`, que llegó primero a esta forma dentro de su carril.
 *
 * Genérico en la fuente porque el carril prospecto tiene su propio vocabulario cerrado
 * (`ProspectSource`), espejado por un CHECK en base: forzarlo a `SeoFigureSource` divorciaría
 * el tipo de su constraint. Lo que comparten —y lo que importa— es la FORMA.
 */
export interface SeoFigureShape<TSource extends string = SeoFigureSource> {
  /**
   * 🔴 `null` = "no lo medimos". **JAMÁS `0` por ausencia.** Cero es una medición: significa
   * que miramos y no había. Ausencia es otra cosa, y colapsarlas convierte un hueco en un
   * hecho. Es el mismo invariante que el grader sostiene con `score: null ≠ 0` y que
   * `TASK-1778` repitió con `truncated`/`observable`.
   */
  magnitude: number | null
  lens: SeoLens
  /** ISO. Sin as-of, la cifra no es reportable. */
  capturedAt: string
  source: TSource
}

export type SeoFigure = SeoFigureShape<SeoFigureSource>

export const seoFigure = (input: {
  magnitude: number | null
  source: SeoFigureSource
  capturedAt: string
}): SeoFigure => ({
  magnitude: input.magnitude,
  lens: resolveSeoLens(input.source),
  capturedAt: input.capturedAt,
  source: input.source
})

// ─── As-of ───────────────────────────────────────────────────────────────────

/**
 * La fecha más reciente entre las que el reader YA devuelve — cero SQL nuevo, cero camino
 * nuevo a PG. Devuelve `null` cuando no hay ninguna candidata fechable, que es el estado
 * honesto: no se inventa una fecha para completar el campo.
 *
 * Compara como TEXTO a propósito: todas las candidatas son `YYYY-MM-DD` o ISO datetime, donde
 * el orden lexicográfico coincide con el cronológico y no depende del timezone del runtime.
 */
export const resolveSeoAsOf = (candidates: Array<string | null | undefined>): string | null => {
  let latest: string | null = null

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.length === 0) continue
    if (latest === null || candidate > latest) latest = candidate
  }

  return latest
}
