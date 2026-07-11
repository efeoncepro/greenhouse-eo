# TASK-1388 / Vertical Menu (sidebar interno) — Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1388 — Reestructuración del menú vertical (portal interno)`
- Product Design asset: propuesta IA aprobada por el operador (artefacto "Rediseño de la navegación" — reparto entre superficies + antes/después + 6 movimientos, sesión 2026-07-11). No hay PNG de Product Design: el diseño es de arquitectura de información (reparto de destinos entre superficies), no de una pantalla nueva. La dirección visual del chrome NO cambia (mismo Vuexy/AXIS); cambia **qué destino vive en qué superficie** y la **conducta de agrupación** del sidebar.
- Alcance de superficies: (a) **sidebar** interno (solo operativo tras el rehome); (b) **dropdown del avatar** (`UserDropdown.tsx`) como hogar de lo personal `/my/*`; (c) **⌘K** consolidado.
- Intended consumers: `VerticalMenu.tsx` (árbol del sidebar), `GenerateMenu.tsx` (render recursivo), `UserDropdown.tsx` (avatar), `search/index.tsx` + `CommandPalette/index.tsx` (⌘K a consolidar) — portal interno.
- Copy source: `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV`) reexportado locale-aware por `src/config/greenhouse-navigation-copy.ts` + `GH_MESSAGES.logout_button`. Zonas nuevas (Operación / Administración / Recursos) y renombres se agregan ahí, NUNCA literals en JSX.
- Primitive decision: `reuse` — no nace primitive nueva. Se reusan los tipos `menuTypes.ts` (`VerticalSectionDataType` para zonas, `VerticalSubMenuDataType` para dominios/secciones colapsables, `VerticalMenuItemDataType` para hojas), el render de `GenerateMenu.tsx`, el MUI Menu del `UserDropdown`, y una de las dos palettes ⌘K como base. **Corrección vs draft previo:** el ⌘K NO está dormido — hay DOS implementaciones (`NavSearch` montado + `CommandPalette` TASK-696 dormido); el trabajo es consolidarlas, no encender una. Los favoritos YA existen (`ShortcutsDropdown`, TASK-553) — no se construyen.
- UI ready target: `no` — pendiente card-sort de validación de la taxonomía + sign-off del operador sobre nombres de zonas/dominios antes de escribir JSX.

## Brief

- Primary user: usuario interno de Greenhouse, en especial perfiles multi-sombrero (`efeonce_admin`, finanzas+comercial, HR+people) que hoy ven ~96 hojas en 12 grupos top-level.
- User moment: navegación cotidiana — el usuario abre el portal y busca a qué dominio/función ir.
- Job to be done: llegar al destino correcto sin perder el mapa mental del portal; escanear el rail de un vistazo; usar ⌘K para la cola larga.
- Primary decision signal: ¿en qué zona/dominio vive lo que busco? El rail debe responder eso en ≤2 segundos de escaneo.
- Non-goals: NO cambiar rutas/URLs; NO rediseñar el chrome visual del sidebar; NO tocar el gating por rol; NO tocar el portal cliente/collaborator (follow-up separado).

## Layout Skeleton

Rail vertical, top→bottom. `[zona]` = heading no colapsable (`isSection`); `▸dominio` = submenú colapsable uniforme; `▾sección` = sub-submenú colapsable; `·hoja` = destino. Máx 2 niveles colapsables dentro de una zona (dominio → sección → hoja).

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Brand + toggle (sin cambios) | Logo Greenhouse + colapsar rail | Vuexy layout header | — |
| 1 | Home (pinned, plano) | Destino directo al home del portal | `VerticalMenuItemDataType` | `session.portalHomePath` |
| 2 | `[Operación]` (zona) | Enmarca los dominios operativos | `VerticalSectionDataType` | `GH_INTERNAL_NAV.zones.operacion` |
| 2a | ▸Agencia → ▾Resumen · ▾Delivery y operaciones · ▾Equipo y talento | Operación de la agencia | `VerticalSubMenuDataType` | rama `isAgencyUser` |
| 2b | ▸Comercial → ▾Pipeline y ventas · ▾Contratos · ▾Growth | Venta + growth marketing | `VerticalSubMenuDataType` | rama `commercial\|finance\|admin` |
| 2c | ▸Finanzas → ▾Flujo operativo · ▾Tesorería · ▾Documentos · ▾Inteligencia | Finanzas | `VerticalSubMenuDataType` | rama `finance\|admin` |
| 2d | ▸Personas → ▾Directorio · ▾Nómina · ▾Supervisión · ▾Organización · ▾Desarrollo | HR + people | `VerticalSubMenuDataType` | rama HR/people/supervisor |
| 3 | `[Administración]` (zona, solo admins) | Enmarca la configuración de plataforma | `VerticalSectionDataType` | `GH_INTERNAL_NAV.zones.administracion` |
| 3a | ▸Administración → ▾Identidad y acceso · ▾Comercial y operaciones · ▾Plataforma | Admin Center consolidado (23 hojas en 3 secciones; Herramientas IA vive aquí, dedup) | `VerticalSubMenuDataType` | rama `isAdminUser` |
| 4 | `[Recursos]` (zona, footer) | Utilidades de plataforma (absorbe micro-grupos) | `VerticalSectionDataType` | `GH_INTERNAL_NAV.zones.recursos` |
| 4a | ▸Recursos → ·Knowledge · ·Roadmap · ·Design System | Utilidades | `VerticalSubMenuDataType` | `plataforma.*` viewCodes |

> **Lo personal (`/my/*`) sale del sidebar.** La zona "Mi Ficha" del sidebar se elimina; sus 14 hojas se reubican en el dropdown del avatar (superficie B, abajo).

### Superficie B — Dropdown del avatar (`UserDropdown.tsx`)

Menú del avatar en la esquina superior derecha. Hoy: Home + Admin Center + 4 atajos admin + Logout, **0 rutas `/my/*`**. Propuesto:

| Región | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| B0 | Header de perfil (clickeable) | Avatar + nombre + email → `/my/profile` (Mi Perfil) | MUI Menu header + `resolveAvatarUrl` (server-only, prop) | `session.user` |
| B1 | `Mi Ficha` (grupo) | Las 14 rutas `/my/*` gated: Mi Greenhouse, Mis asignaciones, Mi desempeño, Mi delivery, Mi Nómina, Mi cuenta de pago, Mis permisos, Mis objetivos, Mis evaluaciones, Mi organización (+ contractor/contratos si aplica) | MUI MenuItem | `VIEW_REGISTRY` sección `mi_ficha` |
| B2 | `Preferencias` | Configuración (+ tema si se decide moverlo desde `ModeDropdown`) | MUI MenuItem | `/settings` |
| B3 | `Cerrar sesión` | Ejecuta `signOut({ callbackUrl: '/login' })` | MUI MenuItem | `GH_MESSAGES.logout_button` |

> Los atajos admin del dropdown de hoy se **eliminan** (ya viven en el sidebar zona Administración).

### Superficie C — ⌘K consolidado

| Región | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| C0 | ⌘K overlay | Buscador/salto rápido (supplemental) — UNA sola palette role-aware con recientes + acciones | consolidación de `NavSearch` + `CommandPalette` | `VIEW_REGISTRY` filtrado por audiencia |

## Copy Ledger

Todas las strings visibles salen de `GH_INTERNAL_NAV` (en `greenhouse-nomenclature.ts`). Ids nuevos a agregar (zonas + renombres); el resto reusa los labels ya existentes de cada hoja.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `internalNav.zones.operacion` | 2 | `Operación` | — | Zona nueva (heading) |
| `internalNav.zones.administracion` | 3 | `Administración` | — | Zona nueva (heading), reemplaza el grupo "Admin Center" top-level |
| `internalNav.zones.miEspacio` | 4 | `Mi espacio` | — | Zona nueva (heading) que agrupa Mi Ficha + Recursos |
| `internalNav.domains.agencia` | 2a | `Agencia` | — | Renombra la sección "Gestión" → dominio "Agencia" |
| `internalNav.sections.agencia.resumen` | 2a | `Resumen` | — | Agrupa las 3 hojas hoy sueltas (Agencia/Spaces/Economía) |
| `internalNav.sections.comercial.growth` | 2b | `Growth` | — | Absorbe el micro-grupo Growth (Forms + AEO Grader) |
| `internalNav.domains.recursos` | 4b | `Recursos` | — | Absorbe Knowledge + Roadmap + Design System |
| `internalNav.disambiguation.adminSpaces` | 3a | `Spaces (admin)` | — | Desambigua la colisión con Agencia→Spaces (clientes vs tenants) |

> El resto de labels de hoja (Nómina mensual, Cobros, Usuarios, etc.) **no cambian de texto** — solo cambian de padre en el árbol. No se re-escriben en el ledger porque ya existen en `GH_INTERNAL_NAV`.

## State Copy

El menú es navegación persistente; sus "estados" son de gating y de expansión, no de carga de datos.

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | Rail con las zonas/dominios que el rol puede ver | — | Estado normal; active state en el item de la ruta actual |
| loading | — | Skeleton del rail durante hidratación de sesión | — | Reusa el skeleton actual del layout; sin cambios |
| empty (rol mínimo) | — | Solo Home + Mi espacio si el rol no tiene dominios operativos | — | El gating recorta; nunca un rail vacío total |
| permission denied | — | El dominio/sección simplemente no se renderiza | — | No se muestra un dominio "bloqueado"; se omite (patrón actual) |
| active | — | Item actual resaltado + zona/dominio padre expandido | `aria-current="page"` | Wayfinding: nunca ocultar el path activo aunque el rail esté colapsado |

## Accessibility Contract

- Heading order: las zonas (`isSection`) se anuncian como headings de grupo del `<nav>`; los dominios son `button` expand/collapse con `aria-expanded`.
- Chart/table alternatives: N/A (navegación).
- Aria labels: `<nav aria-label="Navegación principal">`; cada dominio colapsable expone `aria-expanded` + `aria-controls`; ⌘K trigger con `aria-label="Abrir buscador rápido"` (ya existe en `CommandPalette`).
- Focus notes: orden de tab = orden visual (DOM = visual); al expandir un dominio, el foco permanece en el disparador; teclado: flechas para moverse entre items del mismo nivel, Enter para navegar/expandir, Esc cierra ⌘K y devuelve foco al disparador.
- Color-independent state labels: el active state usa peso + fondo + `aria-current`, nunca solo color.

## Implementation Mapping

- Route / surface: sidebar del layout `(dashboard)` (portal interno). Sin ruta nueva.
- Primitives: `VerticalSectionDataType` (zonas) · `VerticalSubMenuDataType` (dominios/secciones) · `VerticalMenuItemDataType` (hojas) — `src/types/menuTypes.ts`. `CommandPalette` (`src/components/greenhouse/CommandPalette/index.tsx`) para ⌘K.
- Variants / kinds: N/A (no primitive nueva).
- Component candidates: `src/components/layout/vertical/VerticalMenu.tsx` (constructor del árbol — SoT del gating) · `src/components/GenerateMenu.tsx` (render recursivo, ya soporta anidamiento arbitrario).
- Copy source: `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV`) + `src/config/greenhouse-navigation-copy.ts`.
- Data reader / command: ninguno nuevo. El árbol se deriva de `useSession()` (`routeGroups`, `authorizedViews`, `roleCodes`, flags). El ⌘K consume `VIEW_REGISTRY` filtrado por audiencia (ya soportado por el prop `routes`).
- API parity: N/A — no expone acción de negocio nueva; es reorganización de proyección de navegación. Backend impact: `none`.
- Access / capability: gating sin cambios (`routeGroups` + `viewCode` + flags). La reachability de cada hoja se declara en `src/lib/navigation/route-reachability-manifest.ts` (TASK-982) — hay que actualizar `parent`/`via` de las hojas que cambian de padre.
- Runtime consumers: solo el sidebar interno. El portal cliente/collaborator queda fuera (follow-up).
- Print/email/PDF considerations: N/A.
- GVC markers: `data-capture="sidebar-internal"` en el contenedor del rail; `data-capture="cmdk-open"` en el overlay del ⌘K.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task-1388-vertical-menu-restructure.ts` (nuevo).
- Route: home del portal interno (`/home` o `portalHomePath`) con sesión `agent@greenhouse.efeonce.org` (superadmin, ve el árbol completo).
- Viewports: desktop 1440 + mobile 390.
- Required steps: (1) capturar rail colapsado por defecto; (2) expandir cada zona/dominio y capturar el acordeón (abrir uno colapsa los otros); (3) navegar a una ruta profunda (p.ej. Finanzas→Tesorería→Cobros) y verificar active state + path expandido; (4) abrir ⌘K con `⌘K`, escribir una query, capturar resultados; (5) captura con reduced-motion.
- Required captures: rail default, rail con dominio expandido, active state en ruta profunda, overlay ⌘K con resultados, mobile drawer del rail.
- Required `data-capture` markers: `sidebar-internal`, `cmdk-open`.
- Assertions: sin scroll horizontal de página (desktop + 390); consola limpia (sin console.error/hydration); active state presente con `aria-current`; ⌘K abre con foco en el input y cierra con Esc.
- Scroll-width checks: `scrollWidth == clientWidth` en 1440 y 390.
- Accessibility/focus checks: `aria-expanded` correcto por dominio; foco vuelve al disparador al cerrar ⌘K; orden de tab = orden visual.
- Reduced-motion evidence: acordeón y overlay del ⌘K sin animación con `prefers-reduced-motion`.

## Design Decision Log

- Decision: reestructurar en **3 zonas (headings fijos) + dominios colapsables uniformes + máx 2 niveles internos**, absorber micro-grupos, deduplicar, y **cablear el `CommandPalette` existente (dormido)** como nav supplemental. NO agregar profundidad por profundidad.
- Alternatives considered: (a) solo agregar más niveles de anidamiento — rechazado: el sistema ya soporta anidamiento ilimitado y ya usa 3 niveles; el problema es inconsistencia + sobrecarga del top-level, no falta de profundidad. (b) mega-menú flyout — rechazado: patrón de sitio marketing, no de app-shell operativa. (c) construir un ⌘K nuevo — rechazado: ya existe uno role-aware (TASK-696) solo que no está montado.
- Why this pattern: un top-level ≤7 + patrón uniforme dentro de cada zona respeta la Ley de Miller aplicada a nav y elimina la impredecibilidad de "¿este item se abre, navega o titula?"; el ⌘K cubre la cola larga (el 20% que se busca) mientras el árbol cubre el 80% que se explora.
- Reuse / extend / new primitive: `reuse` en todo — tipos de menú, render recursivo y CommandPalette existentes.
- Open risks: (1) los nombres de zonas/dominios necesitan card-sort antes de congelar; (2) reachability manifest debe sincronizarse o el gate TASK-982 falla; (3) el acordeón "uno abierto a la vez" puede molestar a power-users que quieren varios abiertos — validar en GVC/card-sort.
- Follow-up: portal cliente/collaborator con el mismo lente; favoritos persistentes (backend, requiere reader/command) como task separada.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger. (zonas + renombres en `GH_INTERNAL_NAV`; labels de hoja preexistentes referenciados)
- [ ] Dynamic values are named and bounded. (N/A — labels estáticos)
- [ ] Partial/degraded states are explicit. (gating recorta zonas/dominios; nunca rail vacío total)
- [ ] No copy implies a guarantee when data is estimated. (N/A)
- [ ] Charts have table/text alternatives. (N/A — navegación)
- [ ] State and aria copy is ready for implementation. (active state con `aria-current`; dominios con `aria-expanded`)
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface. (sí — reuse, sin backend)
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file. (sí — `task-1388-vertical-menu-restructure.ts`)
- [ ] Design decision log explains reuse/extend/new before JSX starts. (sí — reuse en todo)
