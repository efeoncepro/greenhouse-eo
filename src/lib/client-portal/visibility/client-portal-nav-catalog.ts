/**
 * TASK-1685 Slice 3 — Catálogo declarado de la navegación base del portal cliente.
 *
 * **Qué es.** La lista de superficies que el menú del portal cliente ofrece *por sí mismo*,
 * fuera de los ítems que compone desde los módulos contratados (`composeNavItemsFromModules`).
 * Hasta esta task vivía como literales dispersos dentro del JSX de `VerticalMenu`: siete
 * `if (item.href === '/x') return canSeeView('cliente.x', true)` que sólo se podían leer
 * mirando el componente.
 *
 * **Por qué existe como dato y no como JSX.** La señal de divergencia
 * (`identity.client_portal.menu_gate_divergence`) tiene que poder preguntar *"¿qué ofrece el
 * menú?"* sin renderizar React ni replicar la lista a mano. Una lista replicada en la señal
 * sería exactamente el anti-patrón que esta familia de tasks vino a cerrar: dos fuentes que
 * dicen lo mismo hasta que una cambia. El catálogo es **una** fuente, y tanto el menú como la
 * señal la leen.
 *
 * **Módulo puro — client-safe.** Cero `server-only`, cero I/O, cero imports de
 * `VIEW_REGISTRY`. `VerticalMenu` es un Client Component y tiene que poder importarlo;
 * replica el split ya canonizado `menu-builder-shape.ts` (puro) ↔ `menu-builder.ts`
 * (`server-only`).
 *
 * **Lo que este catálogo NO es.** No es la lista de vistas que un cliente puede ver: eso lo
 * decide el primitive de visibilidad contra los módulos contratados. El catálogo declara
 * *qué superficies existen en la navegación base y a qué ruta llevan* — presentación, no
 * autorización. Un viewCode acá **no** implica acceso.
 *
 * **NUNCA** agregar una entrada acá para "destrabar" un ítem de menú: agregar la entrada no
 * concede acceso, y si la organización no tiene un módulo que declare ese viewCode el
 * resultado es un enlace que el guard niega — el defecto que `ISSUE-148` midió en 36 pares.
 * La forma correcta de que una superficie aparezca es que el módulo que la vende la declare.
 */

export interface ClientPortalNavCatalogEntry {
  /** ViewCode canónico (`cliente.*`). */
  readonly viewCode: string

  /** Ruta destino, tal como la renderiza el menú. */
  readonly route: string

  /**
   * `true` cuando la página llama a `requireViewCodeAccess(viewCode)`.
   *
   * `/home` es el **terminator** del portal cliente: es adonde el guard redirige cuando
   * deniega, así que por construcción no puede estar guardada. Marcarla como no-guardada no
   * es una excepción cómoda: es la razón de que el portal tenga una salida siempre
   * alcanzable, y por eso queda fuera de cualquier medición de divergencia.
   */
  readonly guarded: boolean
}

export const CLIENT_PORTAL_NAV_CATALOG: readonly ClientPortalNavCatalogEntry[] = [
  // Primary
  { viewCode: 'cliente.pulse', route: '/home', guarded: false },
  { viewCode: 'cliente.proyectos', route: '/proyectos', guarded: true },
  { viewCode: 'cliente.ciclos', route: '/sprints', guarded: true },
  { viewCode: 'cliente.equipo', route: '/equipo', guarded: true },
  { viewCode: 'cliente.reviews', route: '/reviews', guarded: true },
  { viewCode: 'cliente.analytics', route: '/analytics', guarded: true },
  { viewCode: 'cliente.campanas', route: '/campanas', guarded: true },

  // Mi Cuenta — las tres son vistas base del portal (`CLIENT_PORTAL_BASE_VIEW_CODES`),
  // así que el guard siempre las abre. Están acá porque el menú las declara, no porque
  // necesiten autorización.
  { viewCode: 'cliente.actualizaciones', route: '/updates', guarded: true },
  { viewCode: 'cliente.notificaciones', route: '/notifications', guarded: true },
  { viewCode: 'cliente.configuracion', route: '/settings', guarded: true }
]

/** Los viewCodes del catálogo cuya página SÍ pasa por `requireViewCodeAccess`. */
export const CLIENT_PORTAL_GUARDED_NAV_VIEW_CODES: readonly string[] = CLIENT_PORTAL_NAV_CATALOG.filter(
  entry => entry.guarded
).map(entry => entry.viewCode)
