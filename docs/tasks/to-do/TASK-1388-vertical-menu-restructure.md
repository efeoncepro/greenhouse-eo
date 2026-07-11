# TASK-1388 — Reequilibrio de la navegación interna (sidebar · avatar · ⌘K)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1388-vertical-menu-restructure.md`
- Flow: `docs/ui/flows/TASK-1388-vertical-menu-restructure-flow.md`
- Motion: `docs/ui/motion/TASK-1388-vertical-menu-restructure-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-1388-vertical-menu-restructure`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La navegación interna no tiene un problema de "menú largo" sino de **reparto entre superficies**: el sidebar acumula lo operativo + las 14 rutas personales `/my/*` + utilidades (~96 hojas en 12 grupos top-level), mientras el **dropdown del avatar** — el hogar natural de lo personal — se desaprovecha mostrando duplicados admin y **ninguna** ruta `/my/*`, y el **⌘K está duplicado** (dos palettes). Esta task reequilibra la navegación del portal interno en 3 superficies: mueve lo personal del sidebar al avatar, reestructura el sidebar (solo operativo) en 3 zonas + dominios uniformes, y consolida el ⌘K. NO cambia rutas ni gating.

## Why This Task Exists

Principio de IA (Rosenfeld — los 4 sistemas de navegación coexisten): cada tipo de destino tiene su superficie. Hoy están mal cargadas:

1. **Sidebar sobrecargado** — ~96 hojas en 12 grupos top-level (>7±2), con patrón inconsistente (secciones-heading `isSection`, submenús colapsables y hojas planas mezclados en el mismo tier) y altitud mezclada dentro de grupos (Gestión/Personas ponen hojas sueltas junto a submenús).
2. **Dropdown del avatar desaprovechado** — para un usuario interno solo muestra Home + Admin Center + 4 atajos admin (que **duplican** el sidebar) + Logout. **Cero rutas `/my/*`**; el header nombre/email ni siquiera linkea a Mi Perfil. Lo personal vive apretado en el sidebar bajo "Mi Ficha" (14 hojas). Fuente: `UserDropdown.tsx`.
3. **⌘K duplicado** — hay dos implementaciones: `NavSearch` (`src/components/layout/shared/search/index.tsx`, montado en la topbar, ⌘K funcional, fuente `VIEW_REGISTRY`) **y** `CommandPalette` (`src/components/greenhouse/CommandPalette/index.tsx`, TASK-696, más rico — `recentItems`/`actions`/audiencia — pero **dormido**, sin montar). Duplicación de superficie.
4. **Micro-grupos y duplicaciones** — "Growth" (2) y "Design System" (2) como grupos top-level; "Herramientas IA" 2 veces; "Sample Sprints" en Gestión y Comercial; "Spaces" colisionado (clientes en Agencia vs tenants en Admin); y `src/data/navigation/verticalMenuData.tsx` es código muerto sin imports.

El dolor se concentra en perfiles multi-sombrero (admin, finanzas+comercial, HR+people). El favoritos/recientes **ya existe** como superficie (`ShortcutsDropdown`, TASK-553, data-driven vía `/api/me/shortcuts`) — no hay que construirlo, solo aprovecharlo.

## Goal

- Las 14 rutas personales `/my/*` viven en el **dropdown del avatar** (con header de perfil clickeable), NO en el sidebar; movimiento atómico que mantiene toda ruta alcanzable.
- Sidebar interno reducido a ~6 grupos top-level dentro de 3 zonas fijas (Operación · Administración · Recursos), con dominios colapsables uniformes y máx 2 niveles internos.
- Una sola superficie ⌘K (consolidando `NavSearch` + `CommandPalette`), role-aware, con recientes + acciones.
- Duplicaciones eliminadas (Herramientas IA, Sample Sprints, atajos admin del avatar), "Spaces" desambiguado, y archivo legacy borrado. Cero cambios de ruta/URL ni de gating.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — el gating por `routeGroups` + `authorizedViews` (viewCode) NO cambia; solo cambia en qué superficie aparece cada destino.
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `docs/architecture/ui-platform/PATTERNS.md` — Composition Shell y patrones de nav.
- `docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md` — toda hoja `(dashboard)` debe ser alcanzable; al mover `/my/*` de sidebar → avatar, declarar el avatar dropdown como `via` en el manifest.
- Skill `info-architecture` (lead) + `greenhouse-ux` + `greenhouse-ux-writing`.

Reglas obligatorias:

- **NUNCA** cambiar `href`/rutas de las hojas — se reproyecta la navegación entre superficies; cero redirects 301.
- **NUNCA** tocar el gating (`routeGroups`/`viewCode`/flags); cada rol ve lo mismo, solo en otra superficie.
- **NUNCA** poner labels literales en JSX — zonas/renombres van a `GH_INTERNAL_NAV` (`greenhouse-nomenclature.ts`), reexportados por `greenhouse-navigation-copy.ts`. La key de menú va en `GH_INTERNAL_NAV`, no solo en navigation-copy.ts (si falta, rompe el dashboard con 500 — solo lo atrapa GVC).
- **NUNCA** dejar una ruta `/my/*` sin superficie durante el rehome (movimiento atómico sidebar→avatar).
- **SIEMPRE** actualizar `route-reachability-manifest.ts` para las hojas que cambian de superficie/padre, o el gate `pnpm route-reachability-gate` falla.

## Normative Docs

- `docs/ui/wireframes/TASK-1388-vertical-menu-restructure.md` — layout de las 3 superficies + árbol propuesto + copy ledger.
- `docs/ui/flows/TASK-1388-vertical-menu-restructure-flow.md` — surfaces (sidebar/avatar/⌘K), state machines, routing contract.
- `docs/ui/motion/TASK-1388-vertical-menu-restructure-motion.md` — acordeón (reuse collapse Vuexy) + ⌘K.
- Memoria de proyecto: SoT de nav = `GH_INTERNAL_NAV`; helper canónico de avatar = `resolveAvatarUrl` (server-only, resolver en el server component/route del layout, no en el cliente).

## Dependencies & Impact

### Depends on

- `src/components/layout/vertical/VerticalMenu.tsx` — SoT del árbol del sidebar + gating (existe).
- `src/components/layout/shared/UserDropdown.tsx` — menú del avatar (existe; hoy sin rutas `/my/*`).
- `src/components/layout/shared/search/index.tsx` (`NavSearch`, ⌘K montado) + `src/components/greenhouse/CommandPalette/index.tsx` (⌘K dormido, TASK-696) — a consolidar.
- `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV`) + `src/config/greenhouse-navigation-copy.ts` — copy (existen).
- `src/types/menuTypes.ts` — tipos recursivos de menú (existen).
- `src/lib/admin/view-access-catalog.ts` (`VIEW_REGISTRY`, sección `mi_ficha`) — fuente de las rutas `/my/*` y del ⌘K.
- `src/lib/navigation/route-reachability-manifest.ts` — manifest de alcanzabilidad (existe; TASK-982).
- `src/components/layout/shared/ShortcutsDropdown.tsx` (favoritos/recientes, TASK-553) — NO se reconstruye; se referencia.

### Blocks / Impacts

- Ninguna task bloqueada. Impacta la percepción de navegación de todos los roles internos.
- Follow-up separado: portal cliente/collaborator (`!isInternalPortalUser`), incluye dedup del footer cliente (que hoy duplica el UserDropdown cliente).
- Follow-up opcional: breadcrumbs / local nav para rutas profundas (wayfinding), que hoy no existen en el chrome.

### Files owned

- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/shared/search/index.tsx` + `src/components/greenhouse/CommandPalette/index.tsx` (consolidación ⌘K)
- `src/config/greenhouse-nomenclature.ts` (bloque `GH_INTERNAL_NAV`)
- `src/config/greenhouse-navigation-copy.ts` (reexport de keys nuevas)
- `src/lib/navigation/route-reachability-manifest.ts` (via/parent de hojas reubicadas)
- `scripts/frontend/scenarios/task-1388-vertical-menu-restructure.ts` (nuevo scenario GVC)
- `docs/ui/wireframes/TASK-1388-vertical-menu-restructure.md`
- `docs/ui/flows/TASK-1388-vertical-menu-restructure-flow.md`
- `docs/ui/motion/TASK-1388-vertical-menu-restructure-motion.md`
- Borrar: `src/data/navigation/verticalMenuData.tsx` (legacy huérfano)

## Current Repo State

### Already exists

- Árbol interno construido dinámicamente en `VerticalMenu.tsx` (ramas por `routeGroups`, filtro por `viewCode`, flags); render recursivo con anidamiento ilimitado (`GenerateMenu.tsx` + `menuTypes.ts`).
- `UserDropdown.tsx` con: header nombre/email (no clickeable), Home, Admin Center + 4 atajos admin (solo admin), Logout. **Cero rutas `/my/*`**.
- **DOS** superficies ⌘K: `NavSearch` (montado en `NavbarContent.tsx`, ⌘K funcional, `VIEW_REGISTRY`) + `CommandPalette` (TASK-696, dormido, más rico).
- `ShortcutsDropdown` (TASK-553) — favoritos/recientes data-driven vía `/api/me/shortcuts` + `src/lib/shortcuts/catalog.ts`. **Ya es la capa de favoritos.**
- `VIEW_REGISTRY` sección `mi_ficha` con las 14 rutas `/my/*` (`view-access-catalog.ts`).
- Zonas `isSection` ya usadas (Gestión, Personas y HR, Mi Ficha); `route-reachability-manifest.ts` + gate (TASK-982).

### Gap

- Sidebar con 12 grupos top-level, 3 patrones mezclados, y 14 hojas personales que no deberían vivir ahí.
- Avatar dropdown sin las rutas `/my/*` ni Mi Perfil clickeable; muestra duplicados admin.
- ⌘K duplicado (dos implementaciones) → consolidar.
- Micro-grupos huérfanos + duplicaciones (Herramientas IA, Sample Sprints) + "Spaces" colisionado.
- Acordeón "uno abierto a la vez" no implementado; archivo legacy muerto en el repo.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: portal Next.js — layout `(dashboard)` interno (`VerticalMenu.tsx`, `UserDropdown.tsx`, `NavbarContent.tsx`, config de nomenclatura).
- Future candidate home: `portal`
  - Nota: la navegación del shell interno es del portal; el ⌘K consolidado podría ser `ui-package` en el futuro (metadata de diseño, no autorizante).
- Boundary: la navegación consume `useSession()` (routeGroups/authorizedViews/roleCodes/flags) + `VIEW_REGISTRY`; el avatar consume `resolveAvatarUrl` (server-only); no crea contrato de datos nuevo.
- Server/browser split: árbol y dropdown se construyen en Client Components desde la sesión; el `avatarUrl` se resuelve en el server (helper `resolveAvatarUrl`) y se pasa como prop. Sin stores/DB/secrets/SDK en cliente.
- Build impact: `none` — reusa dependencias ya instaladas (cmdk, Radix Dialog).
- Extraction blocker: `none` — cambio local de proyección de navegación.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: usuario interno, énfasis en perfiles multi-sombrero.
- Momento del flujo: navegación cotidiana + acceso a "mi cuenta".
- Resultado perceptible esperado: sidebar escaneable (~6 grupos, solo operativo); dropdown del avatar como "mi cuenta" real (perfil + `/my/*` + preferencias + salir); un solo ⌘K para saltar por nombre.
- Friccion que debe reducir: perderse en 96 hojas; excavar el sidebar para lo personal; dos buscadores.
- No-goals UX: no rediseñar el chrome visual; no tocar rutas ni gating; no tocar portal cliente.

### Surface & system decision

- Surface: (a) sidebar `(dashboard)` interno; (b) `UserDropdown` del avatar; (c) ⌘K consolidado (overlay global).
- Composition Shell: `no aplica` — es navegación del shell; se respeta el shell existente.
- Primitive decision: `reuse` — tipos de menú + `GenerateMenu` + `UserDropdown` (MUI Menu) + una de las dos palettes ⌘K como base de la consolidación. Sin primitive nueva.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: ⌘K = Dialog modal (cmdk/Radix); UserDropdown = MUI Menu/Popover (existente).
- Copy source: `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV`) + `greenhouse-navigation-copy.ts` + `GH_MESSAGES.logout_button`.
- Access impact: `none` — gating idéntico; la reachability se declara en el manifest (nueva `via` = avatar dropdown para `/my/*`).

### State inventory

- Default: sidebar con zonas/dominios gated; avatar con perfil + `/my/*` gated; path activo expandido.
- Loading: skeleton del rail + avatar con fallback de iniciales mientras resuelve `avatarUrl`.
- Empty: rol mínimo → sidebar Home + Recursos; avatar con perfil + salir.
- Error: N/A (sin fetch en el árbol; el ⌘K filtra en cliente).
- Degraded / partial: si un flag apaga una hoja, el resto renderiza normal.
- Permission denied: el dominio/hoja/ítem se omite (no se muestra bloqueado).
- Long content: acordeón en sidebar; dropdown del avatar con scroll si `/my/*` excede alto.
- Mobile / compact: sidebar = drawer; avatar dropdown = menú full-width; ⌘K full-width.
- Keyboard / focus: flechas + Enter + `⌘K`/Esc; foco restaura al cerrar dropdown/⌘K.
- Reduced motion: acordeón y ⌘K sin animación (ver motion contract).

### Interaction contract

- Primary interaction: sidebar (dominio→sección→hoja, acordeón); avatar (abrir → perfil/`/my/*`/salir); ⌘K (typing).
- Hover / focus / active: hover tenue; focus ring 2px; activo con peso + fondo + `aria-current`.
- Pending / disabled: N/A (Logout ejecuta `signOut`).
- Escape / click-away: Esc/click-away cierran dropdown y ⌘K.
- Focus restore: al cerrar avatar/⌘K, foco vuelve al disparador.
- Latency feedback: N/A (navegación cliente).
- Toast / alert behavior: N/A.

### Motion & microinteractions

- Motion primitive: `CSS` (collapse Vuexy) + `existing primitive` (Radix del ⌘K + MUI Menu del avatar). Sin Framer/GSAP nuevo.
- Enter / exit: expand/collapse de altura (sidebar); fade/scale del ⌘K; Menu MUI del avatar.
- Layout morph: acordeón (a lo sumo 2 dominios).
- Stagger: none.
- Timing / easing token: reusar duración/ease del collapse Vuexy; nunca ms crudos (lint `no-untokenized-motion`).
- Reduced-motion fallback: estado instantáneo.
- Non-goal motion: sin decoraciones/parallax/stagger de items.

### Implementation mapping

- Route / surface: sidebar `(dashboard)`; `UserDropdown`; ⌘K overlay. Sin ruta nueva.
- Primitive / variant / kind: tipos de menú recursivos (reuse); MUI Menu (avatar, reuse); cmdk/Radix (⌘K, consolidar).
- Component candidates: `VerticalMenu.tsx`, `GenerateMenu.tsx`, `UserDropdown.tsx`, `search/index.tsx` + `CommandPalette/index.tsx`.
- Copy source: `GH_INTERNAL_NAV` + `greenhouse-navigation-copy.ts` + `GH_MESSAGES`.
- Data reader / command: ninguno nuevo (sesión + `VIEW_REGISTRY` + `resolveAvatarUrl` server-only para el avatar).
- API parity: N/A — no expone acción de negocio; Backend impact `none`. (Logout ya usa `signOut`.)
- Access / capability: gating sin cambios; reachability en `route-reachability-manifest.ts` (nueva `via` avatar para `/my/*`).
- States to implement: default / loading(avatar fallback) / empty(rol mínimo) / permission-denied(omitir) / mobile / keyboard-focus / reduced-motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task-1388-vertical-menu-restructure.ts`.
- Route: `/home` (o `portalHomePath`) con `agent@greenhouse.efeonce.org` (ve todo).
- Viewports: desktop 1440 + mobile 390.
- Required steps: (1) sidebar default → expandir zonas/dominios (acordeón); (2) navegar a ruta profunda (active path); (3) abrir el avatar dropdown y capturar el bloque `/my/*` + perfil; (4) abrir ⌘K y buscar; (5) captura reduced-motion.
- Required captures: sidebar default, dominio expandido, active state profundo, avatar dropdown lleno, overlay ⌘K, drawer mobile.
- Required `data-capture` markers: `sidebar-internal`, `avatar-dropdown`, `cmdk-open`.
- Assertions: sin scroll horizontal (1440 + 390); consola limpia; `aria-current` presente; solo un dominio `aria-expanded=true`; avatar dropdown lista las `/my/*` gated; ⌘K con focus trap y Esc restaura foco.
- Scroll-width checks: `scrollWidth == clientWidth`.
- Reduced-motion / focus evidence: acordeón + ⌘K + Menu estáticos con `prefers-reduced-motion`.

### Design decision log

- Decision: reequilibrar la navegación en 3 superficies (sidebar operativo · avatar personal · ⌘K único), moviendo lo personal del sidebar al avatar. No profundizar el árbol por profundizar.
- Alternatives considered: solo más anidamiento (rechazado — ya hay 3 niveles; el problema es reparto entre superficies); dejar lo personal en el sidebar (rechazado — infla el rail y desaprovecha el avatar); construir ⌘K nuevo (rechazado — ya hay dos, se consolidan); construir favoritos (rechazado — `ShortcutsDropdown` ya existe).
- Why this pattern: cada destino en su superficie natural (Rosenfeld); acorta el sidebar, da sentido al avatar, y unifica el ⌘K.
- Reuse / extend / new primitive: `reuse` en todo.
- Open risks: rehome atómico + reachability `via` avatar; nombres de zonas/dominios pendientes de card-sort; cuál palette ⌘K queda como base.

### Visual verification

- GVC scenario: `task-1388-vertical-menu-restructure`.
- Viewports: 1440 + 390.
- Required captures: sidebar default, dominio expandido, active state profundo, avatar dropdown lleno, ⌘K, drawer mobile.
- Required `data-capture` markers: `sidebar-internal`, `avatar-dropdown`, `cmdk-open`.
- Scroll-width check: `scrollWidth == clientWidth` en ambos viewports.
- Accessibility/focus checks: `aria-expanded`, `aria-current`, focus trap ⌘K, foco restaura al cerrar avatar.
- Before/after evidence: sidebar actual (12 grupos) vs propuesto (~6); avatar actual (0 `/my/*`) vs propuesto (mi cuenta).
- Known visual debt: ninguno nuevo — el chrome no cambia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Rehome de lo personal (sidebar → avatar) [atómico]

- Mover las 14 rutas `/my/*` (sección `mi_ficha`) del sidebar al `UserDropdown`, con el header de perfil clickeable → `/my/profile` (Mi Perfil).
- Quitar la zona/sección "Mi Ficha" del sidebar interno.
- Actualizar `route-reachability-manifest.ts` declarando el avatar dropdown como `via` de cada `/my/*` (mismo commit — movimiento atómico).
- Copy vía `GH_INTERNAL_NAV`; sin cambiar rutas.

### Slice 2 — Sidebar: 3 zonas + dominios uniformes (solo operativo)

- Reencuadrar el árbol interno en 3 zonas `isSection` (Operación · Administración · Recursos) y convertir cada grupo operativo en submenú colapsable uniforme (Agencia, Comercial, Finanzas, Personas).
- Mover hojas hoy "sueltas" a una sección `Resumen`/`Directorio` (elimina altitud mezclada).
- Agregar ids de copy de zonas/renombres a `GH_INTERNAL_NAV` + reexport.

### Slice 3 — Consolidar el ⌘K

- Unificar `NavSearch` + `CommandPalette` en una sola superficie ⌘K role-aware (rutas filtradas por audiencia + recientes + acciones), retirando la implementación redundante.
- Verificar keybinding `⌘K`/`Ctrl+K`, focus trap, Esc, navegación.

### Slice 4 — Deduplicar, desambiguar, limpiar

- Growth → sección dentro de Comercial; Knowledge/Roadmap/Design System → dominio `Recursos`.
- Herramientas IA una sola vez (Administración→Plataforma); Sample Sprints un único hogar; quitar los atajos admin del `UserDropdown` (ya están en el sidebar).
- Desambiguar "Spaces (admin)"; borrar `src/data/navigation/verticalMenuData.tsx`.
- Sincronizar `route-reachability-manifest.ts` para hojas reparentadas.

### Slice 5 — Acordeón + GVC

- Acordeón en el sidebar (un dominio abierto; path activo siempre expandido) reusando el collapse Vuexy.
- Crear el scenario GVC `task-1388-vertical-menu-restructure.ts`; capturar las 3 superficies desktop + mobile; iterar hasta "Apto para implementar".

## Out of Scope

- Cualquier cambio de ruta/URL o de gating (routeGroups/viewCode/flags).
- Rediseño del chrome visual (colores, tipografía, iconos del shell) y del `ShortcutsDropdown` (favoritos ya existe; solo se referencia).
- Portal cliente/collaborator (`!isInternalPortalUser`) — follow-up, incluye el dedup del footer cliente (que duplica el UserDropdown cliente).
- Breadcrumbs / local nav para rutas profundas — follow-up opcional de wayfinding.
- Construir favoritos/recientes (existe `ShortcutsDropdown`) o un ⌘K nuevo (se consolidan los dos existentes).
- Card-sort formal (research, no un slice de código).

## Detailed Spec

El árbol propuesto (zonas → dominios → secciones → hojas), el inventario antes/después del `UserDropdown`, el mapeo de cada hoja a su superficie/padre, la tabla de deduplicaciones y el copy ledger viven en el wireframe. Las state machines (acordeón sidebar · avatar dropdown · ⌘K), el routing contract y los failure paths viven en el flow. El contrato de motion vive en el motion doc. No se duplica aquí.

## Rollout Plan & Risk Matrix

Cambio de UI sin migraciones, sin cambio de rutas, sin gating, sin backend. Riesgo acotado a la proyección de navegación entre superficies; el punto sensible es el rehome atómico de `/my/*`.

### Slice ordering hard rule

- Slice 1 (rehome `/my/*` + reachability) DEBE ir en un commit atómico: sacar del sidebar y agregar al avatar + actualizar el manifest juntos. Si se hace en pasos separados, alguna `/my/*` queda inalcanzable entre commits.
- Slice 1 → Slice 2 (sidebar zonas) → Slice 4 (dedup/limpiar + reachability) → Slice 5 (acordeón + GVC).
- Slice 3 (⌘K) puede correr en paralelo tras Slice 2, pero se documenta aparte para no mezclar diffs.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una `/my/*` queda inalcanzable durante el rehome | UI | medium | Rehome atómico (Slice 1) + `via` avatar en el manifest en el mismo commit | `pnpm route-reachability-gate` falla |
| Key de menú solo en navigation-copy.ts y no en `GH_INTERNAL_NAV` | UI | medium | La key va en `GH_INTERNAL_NAV`; validar en dev + GVC | Dashboard 500 (lo atrapó solo GVC en TASK-1247) |
| Un rol ve más/menos de lo que veía (gating alterado) | identity | low | No tocar predicados de gating; diff review por rol; GVC con personas agente | Item aparece/desaparece indebido por rol |
| Consolidar ⌘K rompe el keybinding o filtra rutas no autorizadas | identity | low | Consumir rutas ya filtradas por audiencia; test `⌘K`/Esc/focus | GVC con persona limitada: resultado no autorizado |
| Acordeón oculta el path activo al colapsar | UI | low | Path activo siempre expandido | GVC: active state no visible |
| `avatarUrl` resuelto en cliente (viola server-only) | UI | low | Resolver con `resolveAvatarUrl` en el server, pasar como prop | Import error de `server-only` en build |

### Feature flags / cutover

- Sin flag — cambio aditivo/estructural de UI, cutover inmediato al mergear; rollback = `revert PR`. (Opcional: gatear el montaje del ⌘K consolidado con una constante si se quiere rollout gradual, no requerido.)

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (rehome) | revert PR + redeploy (restaura `/my/*` al sidebar y el manifest) | <5 min | sí |
| Slice 2 (sidebar zonas) | revert PR | <5 min | sí |
| Slice 3 (⌘K) | revert PR / restaurar la palette retirada | <5 min | sí |
| Slice 4 (dedup/limpiar) | revert PR (incluye restaurar el legacy si hiciera falta) | <5 min | sí |
| Slice 5 (acordeón + GVC) | revert PR | <5 min | sí |

### Production verification sequence

1. Local: `pnpm local:check:ui` (lint + design:lint + tsc + build) + `pnpm route-reachability-gate` verdes.
2. GVC local: `pnpm fe:capture task-1388-vertical-menu-restructure --env=local` desktop + mobile → mirar frames → iterar.
3. Preview/staging: verificar por rol con las 3 personas agente (superadmin / collaborator / client): cada uno ve lo mismo que antes, reubicado por superficie; las `/my/*` accesibles desde el avatar; el ⌘K solo muestra rutas autorizadas.
4. Cero verificación de datos/DB/integración — no aplica (sin backend).

### Out-of-band coordination required

- N/A — repo-only change. (Recomendado, no bloqueante: card-sort con 5–8 usuarios internos para validar nombres de zonas/dominios y el reparto sidebar↔avatar antes de congelar copy.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 14 rutas `/my/*` viven en el `UserDropdown` (no en el sidebar) y el header de perfil linkea a `/my/profile`.
- [ ] Toda `/my/*` sigue alcanzable: declarada con `via` avatar en `route-reachability-manifest.ts` y `pnpm route-reachability-gate` pasa.
- [ ] El sidebar interno tiene ~6 grupos top-level dentro de 3 zonas `isSection` (Operación · Administración · Recursos), sin mezclar hojas planas con submenús al mismo nivel.
- [ ] Existe una sola superficie ⌘K (consolidada); abre con `⌘K`/`Ctrl+K`, atrapa foco, cierra con Esc, y solo muestra rutas autorizadas por audiencia.
- [ ] Toda ruta/`href` de hoja es idéntica a la actual (cero cambios de URL).
- [ ] El gating por rol es idéntico (cada persona agente ve el mismo conjunto de hojas, reubicado por superficie).
- [ ] "Herramientas IA" aparece una sola vez; "Sample Sprints" tiene un único hogar; "Spaces" de admin desambiguado; los atajos admin salieron del `UserDropdown`.
- [ ] `src/data/navigation/verticalMenuData.tsx` borrado, sin imports rotos.
- [ ] El acordeón mantiene un solo dominio abierto y el path activo siempre expandido.
- [ ] Todas las strings visibles nuevas viven en `GH_INTERNAL_NAV` (no literals en JSX).
- [ ] GVC desktop 1440 + mobile 390 capturado y mirado para las 3 superficies; sin scroll horizontal; consola limpia.
- [ ] `UI ready` permanece `no` hasta card-sort + sign-off del operador; si pasa a `yes`, `pnpm task:lint --task TASK-1388` queda sin findings.

## Verification

- `pnpm local:check:ui` (lint + design:lint + tsc + build)
- `pnpm route-reachability-gate`
- `pnpm test` (focal a navegación/menú si aplica) + full antes de cerrar
- `pnpm fe:capture task-1388-vertical-menu-restructure --env=local` (desktop + mobile, 3 superficies)
- `pnpm task:lint --task TASK-1388`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado con lo implementado, verificado y pendientes
- [ ] `changelog.md` actualizado (cambio de estructura de navegación visible)
- [ ] chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] verificación GVC desktop + mobile mirada + evidencia before/after de las 3 superficies

## Follow-ups

- Portal cliente/collaborator (`!isInternalPortalUser`): reequilibrio con el mismo lente + dedup del footer cliente (hoy duplica el UserDropdown cliente). **Guardrail:** un colaborador puro (solo routeGroup `my`) NO es `isInternalPortalUser` y su sidebar se construye en la rama "Pure collaborator home" (`VerticalMenu.tsx:700`) — para él "Mi Ficha" ES su contenido. El follow-up debe darle el menú personal en el avatar (Mi Perfil) PERO conservar su navegación personal en el sidebar; NO vaciarle el rail moviendo todo al avatar (a diferencia del interno, que siempre tiene ≥1 dominio operativo).
- Breadcrumbs / local nav para rutas profundas (wayfinding) — no existe en el chrome hoy.
- Card-sort formal (5–8 usuarios internos) para validar taxonomía de zonas/dominios y reparto sidebar↔avatar antes de congelar copy y pasar a `UI ready: yes`.
- Visibilizar el `ShortcutsDropdown` (favoritos) si el card-sort muestra baja adopción.
- **TASK-1389 (gobernanza de navegación)** — candado anti-regresión: Contrato de Asignación de Superficies + gate de presupuesto del sidebar (`pnpm nav:budget`). Su gate arranca en `warn` y se **promueve a `error` cuando esta task (TASK-1388) baje el sidebar bajo el tope** (verificado verde). Es lo que evita que la navegación vuelva a inflarse.

## Open Questions

- ¿El dropdown del avatar incluye el control de tema (hoy `ModeDropdown` separado en la topbar) o se mantiene aparte?
- ¿Se retiran del avatar TODOS los atajos admin, o se deja un "acceso rápido admin" mínimo para admins?
- ¿Cuál de las dos palettes (`NavSearch` vs `CommandPalette`) queda como base de la consolidación? (CommandPalette es más rico: recientes/acciones/audiencia.)
- Nombres finales de zonas/dominios ("Operación" vs "Trabajo"; "Personas" vs "Personas y HR") — resolver con card-sort + sign-off.
