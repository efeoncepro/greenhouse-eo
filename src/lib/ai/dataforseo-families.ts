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
   * ⚠️ `serp` queda en `false` por una limitación ACTUAL, no porque su gasto no sea
   * atribuible. `grader_profiles.organization_id` existe y es NULLABLE (TASK-1243): un perfil
   * del grader puede ser público/prospecto (sin org) o estar ligado a una organización
   * cliente. Pero `ProviderAdapterContext` no transporta la organización hoy, así que el
   * adapter AEO no tiene con qué atribuir ni siquiera cuando el perfil sí tiene org.
   * Consecuencia viva: **el gasto AEO de perfiles ligados a un cliente no entra en el
   * presupuesto de ese cliente.** Cerrarlo exige llevar la organización al contexto del
   * adapter — trabajo del dominio AEO, registrado como follow-up en TASK-1300.
   */
  requiresOrganization: boolean
  /** Para qué se usa; sirve de documentación en el propio registry. */
  purpose: string
}

export const DATAFORSEO_FAMILIES = {
  serp: {
    prefix: '/v3/serp/',
    requiresOrganization: false,
    purpose: 'SERP en vivo (AI Mode / organic). Lo consume el AEO grader sobre prospectos.'
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
