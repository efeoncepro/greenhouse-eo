# TASK-1388 — Reestructuración del menú vertical (navegación interna) Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1388 — Reestructuración del menú vertical (portal interno)`
- Related wireframe: [docs/ui/wireframes/TASK-1388-vertical-menu-restructure.md](../wireframes/TASK-1388-vertical-menu-restructure.md)
- Intended route / surface: 3 superficies del portal interno — sidebar del layout `(dashboard)`, dropdown del avatar (`UserDropdown.tsx`), y overlay ⌘K global (consolidación de `NavSearch` + `CommandPalette`).
- Flow type: `multi-surface` — el reparto de destinos cruza sidebar (operativo) ↔ avatar (personal `/my/*`) ↔ ⌘K (búsqueda). No hay cross-route nuevo: las rutas destino ya existen.
- Primary primitives: `VerticalSectionDataType` / `VerticalSubMenuDataType` / `VerticalMenuItemDataType` (`src/types/menuTypes.ts`); render `GenerateMenu.tsx`; MUI Menu de `UserDropdown.tsx`; ⌘K consolidado (`search/index.tsx` + `CommandPalette/index.tsx`).
- Copy source: `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV`) + `greenhouse-navigation-copy.ts`.

## Flow Brief

- Primary user: usuario interno multi-sombrero navegando el portal.
- Entry moment: abre el portal (rail siempre visible) o presiona `⌘K` desde cualquier pantalla.
- Successful outcome: llega al destino con el mínimo de escaneo/clics, manteniendo orientación (sabe dónde está y qué zona/dominio lo contiene).
- Primary decision/action: elegir zona → dominio → sección → hoja; o buscar por nombre en ⌘K.
- Non-goals: sin cambio de rutas; sin cambio de gating; sin rediseño del chrome visual; sin tocar portal cliente.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Rail vertical (sidebar) | Nav global operativa | Rail fijo; zonas como headings; dominios colapsables (acordeón: uno abierto a la vez); solo operativo tras el rehome | Drawer temporal (patrón Vuexy actual); mismo árbol | Vuexy vertical menu + `GenerateMenu.tsx` |
| Dropdown del avatar | Nav personal ("mi cuenta") | Menú desde el avatar (esquina sup. der.); header de perfil clickeable + rutas `/my/*` + preferencias + salir | Menú full-width | MUI Menu de `UserDropdown.tsx` |
| ⌘K overlay | Buscador/salto rápido (supplemental) | Dialog modal centrado; input con foco; resultados agrupados (Recientes/Vistas/Acciones); UNA sola palette | Full-width dialog; mismo cmdk | consolidación `NavSearch` + `CommandPalette` (Radix + cmdk) |
| Ruta destino | Página del item elegido | Ya existe; item activo resaltado + path expandido en el rail (si es ruta de sidebar) | idem | rutas `(dashboard)` existentes |

## Flow Map

1. Entry: rail visible al cargar el portal (dominios colapsados por defecto salvo el que contiene la ruta actual), o `⌘K` desde cualquier pantalla.
2. Primary action: click en un dominio (expande y colapsa los demás — acordeón) → click en sección → click en hoja; o typing en ⌘K.
3. Transition: navegación cliente Next.js a la ruta de la hoja (sin recarga); el rail mantiene el estado expandido del path activo.
4. User decision: si no sabe dónde vive algo, abre ⌘K y busca por nombre.
5. Completion: la ruta destino renderiza; el item queda con `aria-current="page"` y su zona/dominio/sección expandidos.
6. Recovery / exit: Esc cierra ⌘K (foco vuelve al disparador); back del browser regresa a la ruta previa; el rail refleja el nuevo active state.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click en dominio | Rail | Dominio `open`, demás `closed` (acordeón) | Enter/Space sobre el disparador | `aria-expanded` refleja el estado |
| Click en hoja | Rail | Navegación a ruta destino | Enter | Cierra el drawer en mobile |
| `⌘K` / `Ctrl+K` | Global | ⌘K `open` con foco en input | ⌘K | Ya implementado en `CommandPalette` (línea del keydown handler) |
| Typing en ⌘K | ⌘K overlay | Filtra resultados por label/ruta | — | Fuente `VIEW_REGISTRY` filtrada por audiencia |
| Enter en resultado ⌘K | ⌘K overlay | Navega + cierra overlay | Enter | Foco restaura al disparador |
| Esc | ⌘K overlay | ⌘K `closed` | Esc | Foco restaura |

## State Machine

Dos máquinas independientes: el **acordeón del rail** y el **overlay ⌘K**.

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| rail: collapsed-all | Ningún dominio expandido (salvo path activo) | Carga inicial | Click en un dominio | Active path siempre expandido para no perder wayfinding |
| rail: domain-open | Un dominio expandido, resto colapsado | Click en dominio | Click en otro dominio / re-click | `aria-expanded=true` solo en el abierto |
| cmdk: closed | Overlay oculto | Esc / Enter en resultado / click-away | `⌘K` | — |
| cmdk: opening | Dialog montándose | `⌘K` | animación completa | reduced-motion: sin animación |
| cmdk: open | Input con foco, resultados visibles | opening done | Esc / seleccionar | focus trap; `role=dialog`; `aria-modal` |
| cmdk: empty-query | Sin texto → muestra Recientes | open sin typing | typing | Recientes client-side |
| cmdk: no-results | Query sin match | typing sin coincidencia | cambiar query / Esc | mensaje "Sin resultados" es-CL |

## Routing Contract

- Route changes: `none` para la reestructura (el árbol reagrupa `href` existentes); el ⌘K produce navegación normal a rutas ya existentes.
- Canonical URL: las URLs de cada hoja **no cambian** — cero redirects 301.
- Deep-link behavior: entrar directo a una ruta profunda expande su zona/dominio/sección en el rail (active path expandido).
- Back button behavior: canónico del browser; el rail actualiza el active state.
- Reload behavior: el rail reconstruye el árbol desde la sesión; el path activo queda expandido.
- Shareability: sin estado de nav en query params (el rail es local); las rutas destino siguen siendo compartibles como hoy.

## Focus & Accessibility

- Initial focus: al abrir ⌘K, foco en el input (comportamiento actual del `CommandPalette`).
- Escape behavior: Esc cierra ⌘K.
- Click-away behavior: click en el overlay cierra ⌘K.
- Focus restore: al cerrar ⌘K, foco vuelve al disparador.
- Modal vs non-modal semantics: ⌘K es modal (`role=dialog` + `aria-modal`); el rail es navegación no-modal.
- Screen reader announcement: `<nav aria-label="Navegación principal">`; dominios con `aria-expanded`; item activo con `aria-current="page"`.
- Keyboard traversal: flechas dentro del rail y del ⌘K; Tab respeta orden visual; sin `tabindex>0`.
- Reduced motion: acordeón del rail y transición del ⌘K sin animación con `prefers-reduced-motion` (ver motion contract).

## Data & Command Boundaries

- Readers: ninguno nuevo. El árbol se deriva de `useSession()` (`routeGroups`, `authorizedViews`, `roleCodes`, flags); el ⌘K lee `VIEW_REGISTRY` filtrado por audiencia.
- Commands: ninguno — el menú no ejecuta acciones de negocio, solo navega.
- API routes: ninguna nueva.
- Optimistic updates: N/A.
- Cache / invalidation: N/A (estado de expansión es UI-local; recientes en client-side storage).
- Audit / signals: N/A. La reachability se declara en `route-reachability-manifest.ts` (gate, no signal runtime).
- Tenant / access boundary: sin cambios — gating `routeGroups` + `viewCode` + flags idéntico; el ⌘K debe recibir el listado de rutas **ya filtrado por audiencia** (nunca exponer rutas no autorizadas).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | El dominio/sección/hoja simplemente no se renderiza | — | Patrón actual: omitir, no mostrar bloqueado |
| not found / empty | Rol mínimo → solo Home + Mi espacio | — | Nunca un rail totalmente vacío |
| partial / degraded | Si un flag apaga una hoja, el resto del árbol renderiza normal | — | Degradación por item, no del rail entero |
| stale data | N/A | — | El árbol se reconstruye por render de sesión |
| timeout / API error | N/A (sin fetch en el árbol) | — | El ⌘K no hace fetch remoto; filtra en cliente |
| dirty exit | N/A | — | El menú no tiene estado dirty |

## GVC Scenario Plan

- Scenario: reestructura del rail interno + ⌘K.
- Scenario file: `scripts/frontend/scenarios/task-1388-vertical-menu-restructure.ts`.
- Route: `/home` (o `portalHomePath`) con `agent@greenhouse.efeonce.org` (ve el árbol completo).
- Viewports: desktop 1440 + mobile 390.
- Required steps: rail default → expandir cada zona/dominio (acordeón) → navegar a ruta profunda y verificar active path → abrir ⌘K y buscar → captura reduced-motion.
- Required captures: rail default, dominio expandido, active state profundo, overlay ⌘K con resultados, drawer mobile.
- Required `data-capture` markers: `sidebar-internal`, `cmdk-open`.
- Assertions: sin scroll horizontal (1440 + 390); consola limpia; `aria-current` presente; ⌘K abre con foco en input y cierra con Esc restaurando foco.
- Scroll-width checks: `scrollWidth == clientWidth`.
- Accessibility/focus checks: `aria-expanded` por dominio; focus trap en ⌘K; orden de tab = visual.
- Reduced-motion evidence: acordeón y ⌘K estáticos con `prefers-reduced-motion`.

## Design Decision Log

- Decision: modelar la navegación como **acordeón de dominios dentro de 3 zonas** + **⌘K reusando el `CommandPalette` dormido** en vez de profundizar el árbol.
- Alternatives considered: expandir varios dominios a la vez (rechazado: rail se alarga y reaparece el problema de longitud); construir ⌘K nuevo (rechazado: ya existe role-aware); mega-menú (rechazado: patrón marketing).
- Why this pattern: mantiene el rail corto (uno abierto), preserva wayfinding (active path siempre expandido) y da una vía de búsqueda para los ~96 destinos.
- Reuse / extend / new primitive: `reuse` — tipos de menú, render recursivo y CommandPalette existentes.
- Open risks: acordeón vs multi-open (validar en card-sort); recientes client-side vs favoritos persistentes (favoritos = follow-up backend); nombres de zonas/dominios pendientes de card-sort.
- Follow-up: portal cliente/collaborator; favoritos persistentes.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior. (rail fijo/drawer; ⌘K centrado/full-width)
- [ ] Opening, closing, escape and focus restore are specified. (acordeón + ⌘K)
- [ ] Route/deep-link/back-button behavior is explicit. (sin cambio de rutas; active path expandido en deep-link)
- [ ] Data readers/commands are named and UI-only business logic is avoided. (sin readers/commands nuevos; solo sesión + VIEW_REGISTRY)
- [ ] Failure paths are user-safe and do not expose internals. (omitir denied; degradar por item)
- [ ] GVC sequence captures prove the flow, not only static screens. (acordeón + navegación + ⌘K)
- [ ] Design decision log explains why the flow uses these surfaces/routes. (acordeón + ⌘K reuse)
