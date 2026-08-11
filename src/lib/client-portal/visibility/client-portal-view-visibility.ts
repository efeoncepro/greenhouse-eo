/**
 * TASK-1685 Slice 2 — **El** primitive de visibilidad del portal cliente.
 *
 * Responde una sola pregunta, y es la única respuesta autorizada:
 *
 *     ¿esta persona puede ver esta vista?
 *
 * Hasta esta task la respuesta vivía repartida en dos mitades que no se conocían: el menú
 * aplicaba el ROL sobre su lista base y el page guard aplicaba el MÓDULO contratado. Ninguna
 * de las dos era la respuesta completa, y ninguna podía observar a la otra — por eso nadie
 * notó en meses que un `revoke` per-persona no cerraba nada y que el menú prometía 36 páginas
 * que la puerta negaba (`ISSUE-148`, medido el 2026-08-10 sobre 8 de 8 usuarios cliente).
 *
 * ## La semántica (decisión (a′), `TASK-1685` §Slice 1)
 *
 *     acceso =  esSesiónInterna
 *            ∨ ( ¬revocadaParaLaPersona ∧ ( esVistaBase ∨ laOrgTieneUnMóduloQueLaDeclara ) )
 *
 * Las dos dimensiones son ortogonales y cada una tiene su dueño:
 *
 *   - **el MÓDULO autoriza** — es un hecho de la *organización*: qué contrató. Es el carril
 *     positivo, y el único.
 *   - **el `revoke` per-persona excluye** — es un hecho de la *persona*: la excepción dentro
 *     de una organización que sí contrató.
 *
 * ## Por qué deny y no grant, y por qué per-persona y no per-rol
 *
 * **Deny, no grant.** Exigir un *grant* para abrir convierte cada assignment comercial en un
 * cambio de dos tablas, y esa carga deriva: el default permisivo de `role_view_assignments`
 * existía precisamente porque la gente olvida sembrar. Con la puerta fail-closed, ese olvido
 * deja de ser ruido de gobernanza y pasa a ser **un cliente que pagó y no entra, en silencio**.
 * Honrar un *deny* no crea carga: el caso normal no requiere nada y la excepción se declara
 * cuando existe.
 *
 * **Per-persona, no per-rol.** Un deny per-rol sobre una vista que el módulo concede
 * reintroduce la paradoja de que *ganar un rol te quita acceso*, porque el rol es un conjunto
 * que se acumula. Un sujeto singular no la tiene. `user_view_overrides` ya es per-persona, con
 * `reason` y `expires_at`.
 *
 * ## Módulo puro — es la razón de que exista como archivo aparte
 *
 * Cero `server-only`, cero I/O. **Tiene que serlo**: el page guard corre en el servidor contra
 * PG, pero el menú (`VerticalMenu`) y el ⌘K (`GlobalCommandPalette`) son Client Components. Un
 * primitive `server-only` no lo podrían consumir, y volveríamos a tener dos implementaciones —
 * exactamente el defecto que esta task cierra. Replica el split ya canonizado
 * `menu-builder-shape.ts` (puro) ↔ `menu-builder.ts` (`server-only`).
 *
 * Los adaptadores que consiguen los insumos viven aparte: `resolve-client-portal-visibility`
 * (servidor, contra PG) y el contexto de React que los transporta al cliente.
 *
 * ## Hard rules
 *
 * - **NUNCA** decidir visibilidad de una vista `cliente.*` fuera de este primitive. Si un
 *   consumer necesita la respuesta, la pide acá; no la re-deriva. El lint
 *   `greenhouse/no-client-portal-view-visibility-bypass` lo enforcea.
 * - **NUNCA** agregar el carril de rol (`authorizedViews` / `role_view_assignments`) como
 *   insumo positivo. El rol NO gobierna vistas `cliente.*` — decisión D2 del Slice 1. El seam
 *   para una restricción per-clase, si algún día hace falta, es `revokedViewCodes`, que es
 *   per-persona por construcción.
 * - **NUNCA** convertir `revokedViewCodes` en `grantedViewCodes`. La asimetría es el corazón
 *   del diseño, no un detalle de implementación.
 */

/**
 * Vistas base del portal: alcanzables sin módulo contratado.
 *
 * Un cliente **no contrata** "poder ver sus notificaciones" ni "entrar a la configuración de
 * su cuenta": modelar eso como módulo obliga a asignárselo a cada organización nueva y a que
 * alguien se acuerde — y el día que alguien no se acuerde, el cliente pierde su configuración.
 * La allowlist declara lo que es cierto: hay superficies del portal que no son un producto
 * vendible.
 *
 * **Alcance deliberadamente chico** (decisión del operador 2026-08-09, `TASK-1679` Slice 5):
 * sólo estas tres. Las candidatas que quedaron fuera lo hicieron por una razón —
 * `cliente.ciclos` y `cliente.analytics` son superficies de delivery, y como Creative pertenece
 * a un solo cliente, dejarlas base le daría a los demás páginas permanentemente vacías.
 *
 * **NUNCA** agregar acá una vista que dependa de un servicio contratado: la allowlist es la
 * excepción al carril de módulos, no un atajo para destrabar una página.
 * **NUNCA** resolver esta allowlist leyendo `role_view_assignments`: sería reintroducir el
 * carril viejo por la puerta que esta familia de tasks vino a cerrar.
 */
export const CLIENT_PORTAL_BASE_VIEW_CODES: readonly string[] = [
  'cliente.notificaciones',
  'cliente.configuracion',
  'cliente.actualizaciones'
]

const BASE_VIEW_CODES = new Set(CLIENT_PORTAL_BASE_VIEW_CODES)

/** Declarativo y testeable sin DB: no depende de assignments. */
export const isClientPortalBaseViewCode = (viewCode: string): boolean => BASE_VIEW_CODES.has(viewCode)

export interface ClientPortalViewVisibilityInputs {
  /**
   * `true` para sesiones `efeonce_internal`.
   *
   * Bypass D1 de `TASK-827`: los operadores internos alcanzan cualquier superficie cliente
   * para soporte legítimo. Las escrituras siguen gateadas por capabilities en los endpoints.
   * Se evalúa **primero**, así que un `revoke` no aplica a una sesión interna: el override es
   * un instrumento del portal cliente, no una sanción global.
   */
  readonly isInternalSession: boolean

  /** ViewCodes que declaran los módulos VIGENTES de la organización de esta persona. */
  readonly moduleViewCodes: readonly string[]

  /**
   * ViewCodes con `user_view_overrides.override_type = 'revoke'` vigente para esta persona.
   *
   * Al 2026-08-10 la tabla está **vacía**: por eso hacer que el `revoke` cierre la puerta es
   * un cambio con delta de acceso exactamente cero, y por eso esta task va sin feature flag.
   */
  readonly revokedViewCodes: readonly string[]
}

/**
 * La respuesta. Un solo lugar, tres consumers: el page guard, la lista base del menú y el ⌘K.
 */
export const canSeeClientPortalView = (
  viewCode: string,
  inputs: ClientPortalViewVisibilityInputs
): boolean => {
  if (inputs.isInternalSession) return true

  if (inputs.revokedViewCodes.includes(viewCode)) return false

  if (isClientPortalBaseViewCode(viewCode)) return true

  return inputs.moduleViewCodes.includes(viewCode)
}
