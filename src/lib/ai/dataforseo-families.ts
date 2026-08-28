/**
 * TASK-1300 — Registry declarativo de familias DataForSEO.
 *
 * Un cliente, familias como CONFIG. No hay un cliente por familia: el transporte, la auth y
 * la resolución del secreto son compartidos, y la familia sólo selecciona prefijo + breaker +
 * bucket de costo.
 *
 * ⚠️ ALLOWLIST CERRADO, NUNCA PREFIJO LIBRE. El caller declara una familia nombrada; jamás
 * un prefijo arbitrario. Aceptar un string del caller ampliaría el candado del cliente y
 * convertiría cualquier bug de composición en una llamada a un endpoint no previsto
 * (riesgo §13.3 de la arquitectura del módulo SEO).
 *
 * Este archivo NO importa `server-only`: es sólo datos y tipos, así que un test o un consumer
 * de tipos puede importarlo sin arrastrar el transporte.
 */

export interface DataForSeoFamilyDefinition {
  /** Prefijo canónico de la familia. `normalizeEndpoint` valida contra esto. */
  prefix: string
  /**
   * `true` cuando la familia SIEMPRE opera para una organización cliente concreta.
   *
   * Las 4 familias SEO son trabajo per-cliente y su gasto DEBE quedar atribuido, así que el
   * tipo obliga a pasar `organizationId` — el gasto no rastreado se vuelve imposible por
   * construcción, no por disciplina del caller.
   *
   * ⚠️ `serp` queda en `false` POR DISEÑO, no por deuda — y desde TASK-1696 esa distinción es
   * verificable, no una promesa. La atribución YA existe: `ProviderAdapterContext` transporta la
   * organización derivada de `grader_profiles.organization_id` (TASK-1243) y el adapter de AI
   * Mode la pasa al transporte, así que el gasto del grader sobre un perfil ligado a un cliente
   * entra al ledger con `consumer='aeo'`.
   *
   * Lo que NO se puede hacer es exigirla: el grader corre sobre prospectos PÚBLICOS que no son
   * clientes, y ésos legítimamente no tienen organización. Poner esto en `true` "para cerrar la
   * deuda" rompería el camino público del lead magnet en la primera llamada. El tipo no puede
   * exigir lo que el dominio permite que falte; el gasto sin organización queda contado como no
   * atribuible en `growth.dataforseo.spend_ledger_drift`, nunca invisible.
   */
  requiresOrganization: boolean
  /** Para qué se usa; sirve de documentación en el propio registry. */
  purpose: string
}

export const DATAFORSEO_FAMILIES = {
  serp: {
    prefix: '/v3/serp/',
    requiresOrganization: false,
    purpose:
      'SERP en vivo (AI Mode / organic). Familia COMPARTIDA: la compran el rank capture del módulo SEO y el adapter de AI Mode del grader AEO — por eso `consumer` es requerido en el transporte.'
  },
  labs: {
    prefix: '/v3/dataforseo_labs/',
    requiresOrganization: true,
    purpose: 'Keyword research: volumen, dificultad, ranked keywords, competidores.'
  },
  backlinks: {
    prefix: '/v3/backlinks/',
    requiresOrganization: true,
    purpose: 'Perfil de enlaces: dominios referentes, backlinks, toxicidad.'
  },
  onpage: {
    prefix: '/v3/on_page/',
    requiresOrganization: true,
    purpose: 'Site audit. Task-based async: el POST crea la tarea y se poll-ea aparte.'
  },
  domain: {
    prefix: '/v3/domain_analytics/',
    requiresOrganization: true,
    purpose: 'Analítica de dominio (tecnologías, Whois).'
  }
} as const satisfies Record<string, DataForSeoFamilyDefinition>

/**
 * ═══ LÍMITES CONOCIDOS DEL TRANSPORTE (medidos, no supuestos) ═══
 *
 * Que una familia esté en el allowlist significa "el prefijo se acepta", NO "el transporte
 * puede llamar ese endpoint". Antes de integrar una capability nueva, contrastá contra esto:
 *
 * 1. **El transporte es POST-only, con el body `JSON.stringify(tasks)`.** Toda la convención
 *    `task_get/$id` y `tasks_ready` de DataForSEO es **GET, con el id en el path y sin
 *    body** — `normalizeEndpoint` los aceptaría (el prefijo calza) y el proveedor
 *    respondería 404/405. OnPage se salva porque `summary`/`pages` son POST; **Lighthouse
 *    (`lighthouse/task_get/json/$id`) y el SERP task-based NO**. Si los necesitas, el
 *    transporte requiere soporte de método/path, no un prefijo nuevo.
 * 2. **`cost` es del BATCH, no de la tarea.** Se lee de `json.cost` en la raíz de la
 *    respuesta. Con N tareas en un POST no hay forma de repartirlo entre N filas, así que un
 *    `provider_cost` "por fila" en una tabla snapshot no se puede poblar con exactitud desde
 *    un batch: o mandas una tarea por llamada, o el costo se atribuye al lote.
 * 3. **El breaker es por FAMILIA, no por operación.** En un flujo task-based, los polls que
 *    fallan abren el breaker de la familia y apagan también la creación de tareas nuevas.
 * 4. **`checkDataForSeoConnection` es un carril aparte, deliberado**: pega a
 *    `/v3/appendix/user_data` sin familia, sin allowlist y sin breaker. Es un health check
 *    de credenciales, no una capability — por eso no pasa por `postDataForSeoTask`.
 * 5. **Familias ausentes a propósito**: `keywords_data` (el volumen y la dificultad salen de
 *    `labs`; ver §3 de la arquitectura del módulo SEO) y `business_data` (reseñas/GBP, fuera
 *    de alcance). Si buscabas `/v3/keywords_data/.../search_volume/live`, el equivalente
 *    dentro del allowlist es `labs` (`keyword_ideas` lo trae inline).
 */
/**
 * TASK-1696 — QUIÉN consumió el dólar que se le pagó a DataForSEO.
 *
 * Vive acá, junto al registry de familias, porque lo necesitan los dos extremos de la cadena:
 * el TRANSPORTE (que es el único que escribe gasto) y el writer del ledger en el dominio growth.
 * Ponerlo del lado de growth obligaría al transporte a importar hacia arriba e invertiría la
 * dirección de la dependencia que TASK-1300 fijó a propósito (growth conoce a `ai`, nunca al revés).
 *
 * ⚠️ NO es lo mismo que la FAMILIA. La familia dice QUÉ se compró (`serp`, `labs`, `backlinks`…);
 * el consumidor dice PARA QUÉ SERVICIO. La familia `serp` la compran los dos: el rank capture
 * diario del módulo SEO y el adapter de AI Mode del grader AEO. Sin esta dimensión, el gasto del
 * grader se descontaría del presupuesto SEO del cliente y nadie podría separarlos después.
 *
 * Vocabulario CERRADO y espejado por CHECK en la base
 * (`migrations/20260828015655472_task-1696-seo-provider-spend-consumer-dimension.sql`); la paridad
 * la sostiene un test que rompe el build.
 */
export const DATAFORSEO_SPEND_CONSUMERS = ['seo', 'aeo'] as const

export type DataForSeoSpendConsumer = (typeof DATAFORSEO_SPEND_CONSUMERS)[number]

export type DataForSeoFamily = keyof typeof DATAFORSEO_FAMILIES

export const DATAFORSEO_FAMILY_NAMES = Object.keys(DATAFORSEO_FAMILIES) as DataForSeoFamily[]

export const isDataForSeoFamily = (value: string): value is DataForSeoFamily =>
  Object.prototype.hasOwnProperty.call(DATAFORSEO_FAMILIES, value)

/**
 * Valida que el endpoint pertenezca a la familia declarada y devuelve la ruta normalizada.
 *
 * Lanza —no degrada— porque un mismatch familia/endpoint es un error de programación del
 * caller, no una condición de runtime: degradarlo silenciosamente escondería justo el bug
 * que este candado existe para atrapar.
 */
export const normalizeEndpoint = (endpoint: string, family: DataForSeoFamily): string => {
  const definition = DATAFORSEO_FAMILIES[family]

  if (!definition) {
    throw new Error(`Familia DataForSEO desconocida: ${String(family)}.`)
  }

  const trimmed = endpoint.trim()

  if (!trimmed.startsWith(definition.prefix)) {
    throw new Error(
      `Endpoint DataForSEO no permitido para la familia "${family}": se esperaba el prefijo ${definition.prefix}.`
    )
  }

  return trimmed
}
