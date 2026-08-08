# Wireframe — TASK-1675 · El menú del portal cliente compone los módulos contratados

> **Tipo:** Wireframe de navegación (chrome persistente, no superficie de contenido)
> **Task:** `docs/tasks/to-do/TASK-1675-client-portal-menu-module-driven.md`
> **Flow:** `docs/ui/flows/TASK-1675-client-portal-menu-module-driven-flow.md`
> **Creado:** 2026-08-08 por Claude
> **Estado:** diseño — `UI ready: no`

## 0. Qué se está diseñando (y qué no)

Esto **no es una pantalla nueva**: es un cambio en cómo se puebla el menú lateral que ya existe. El
chrome, los estilos, el orden visual y el comportamiento colapsado/hover **no cambian**. Lo único que
cambia es de dónde salen algunos ítems.

Por eso este wireframe no tiene mockup de alta fidelidad: el resultado visual esperado es
*"exactamente el menú de hoy, más un ítem"*. Cualquier diferencia adicional en la captura es un
defecto, no una mejora. Ese es el criterio de aceptación visual.

**Referencia visual del estado actual (before):**
`.captures/2026-08-08T19-30-53_inline-growth-seo/frames/01-snapshot.png` — sesión real de Grupo Berel,
menú sin el ítem SEO pese a tener el módulo contratado.

## 1. Estado actual vs esperado

```
ANTES (Berel, con SEO contratado)          DESPUÉS (Berel, con SEO contratado)
┌──────────────────────────┐               ┌──────────────────────────┐
│ Pulse                    │               │ Pulse                    │
│ Proyectos                │               │ Proyectos                │
│ Ciclos                   │               │ Ciclos                   │
│ Mi Equipo                │               │ Mi Equipo                │
│ Revisiones               │               │ Revisiones               │
│ Analytics                │               │ Analytics                │
│ Campañas                 │               │ Campañas                 │
│                          │               │ SEO            ← nuevo   │
│ MI CUENTA                │               │                          │
│ Novedades                │               │ MI CUENTA                │
│ Notificaciones           │               │ Novedades                │
│ Mi Greenhouse            │               │ Notificaciones           │
└──────────────────────────┘               │ Mi Greenhouse            │
                                           └──────────────────────────┘
   (la superficie existe pero es              (un solo ítem; el informe
    inalcanzable sin escribir la URL)          cuelga del CTA del header)
```

Para un cliente **sin** el módulo, y para un colaborador interno, la columna "DESPUÉS" es idéntica a
la columna "ANTES". Eso es tan parte del diseño como el ítem nuevo.

## 2. Regiones y origen del dato

| Región del menú | Origen | Cambia en esta task |
|---|---|---|
| Lista primaria (7 ítems) | Hardcodeada + `canSeeView('cliente.*')` | **No** — se conserva intacta |
| **Ítems de módulo** | `module_assignments` → `composeNavItemsFromModules` | **Sí** — es lo nuevo |
| Sección "Módulos" (`capabilityModules`) | `businessLines`/`serviceModules` de la sesión | No — deuda hermana, task aparte |
| "MI CUENTA" | Hardcodeada | No |

El merge es **aditivo**: los ítems de módulo se suman a la lista base filtrando por `route` ya
presente. Nunca la reemplazan. Esa palabra —aditivo— es la que impide dejar sin menú a los
colaboradores puros, que caen en la misma rama del componente.

## 3. Anatomía del ítem

Un ítem de módulo es un `MenuItem` Vuexy más, indistinguible de los existentes:

```
┌────────────────────────────────────┐
│  [icono]  SEO                      │   ← label desde VIEW_REGISTRY
│           (sin subtítulo)          │
└────────────────────────────────────┘
```

- **Label:** del `VIEW_REGISTRY` (`cliente.growth_seo_dashboard` → "SEO"). **No** hay literal nuevo en JSX.
- **Icono:** del descriptor (`menu-builder.ts:66`, `tabler-chart-arrows-vertical`).
- **Ruta:** `route_path` del registry (`/growth/seo`).
- **Active state:** el del `Menu` Vuexy — el mismo motor que el resto. No se introduce un segundo resolver de "activo", que es justo lo que haría montar `ClientPortalNavigation` con su chrome propio.

**Una decisión explícita:** el informe (`cliente.growth_seo_report`) **no** genera ítem. Es ruta hija,
alcanzable desde el CTA "Ver informe" del header del dashboard, como ya declara el flujo. Sin esta
regla, el composer produciría dos ítems SEO en grupos distintos y rompería la relación padre-hijo.

## 4. Copy

Cero copy nuevo. Todos los labels salen del `VIEW_REGISTRY`, que ya está poblado y versionado. Si un
módulo futuro necesita un label distinto al del registry, eso es un cambio de registry (con su
migración), no un literal en el menú.

| Estado | Qué se ve | Copy |
|---|---|---|
| Con módulo | El ítem | `VIEW_REGISTRY.label` |
| Sin módulo | Nada — el menú de siempre | — (deliberadamente sin "no tienes módulos") |
| Resolver falla | Nada — el menú de siempre | — (degradación silenciosa en el chrome; el error va a Sentry) |

**Por qué el estado vacío no dice nada:** un cliente sin módulos extra es la norma, no una carencia.
Un empty state ahí ("Sin módulos contratados") le pondría un cartel de carencia permanente en el
chrome a la mayoría de los clientes, y además invitaría a un upsell que esta superficie no debe hacer.

## 5. Estados

| Estado | Comportamiento | Nota de diseño |
|---|---|---|
| Default | Lista base + ítems de módulo | — |
| **Loading** | **No existe** | Los ítems llegan en el mismo payload RSC que el shell. Ésta es la razón principal de resolver server-side en vez de hacer fetch: un skeleton o una aparición tardía en el sidebar es CLS en chrome persistente, el peor lugar posible. |
| Empty | Menú de hoy | Ver §4 |
| Error | Menú de hoy | Fail-open. Nunca menú vacío. |
| Degraded | ViewCode sin descriptor → se descarta | Filtro defensivo ya existente en el composer |
| Mobile / compact | Hereda `VerticalNav` | Sin tratamiento propio |
| Keyboard / focus | Hereda `MenuItem` | El ítem entra en el orden natural de tabulación |

## 6. Accesibilidad

- El ítem es un `MenuItem` estándar: hereda rol, foco visible y navegación por teclado del menú.
- **Un solo landmark `<nav>`.** Es un argumento de peso contra montar `ClientPortalNavigation`: traería su propio `<nav>` y dejaría dos landmarks anidados en el mismo sidebar.
- El ítem no comunica estado por color ni por icono solo: es label + icono, como todos.
- Sin motion: nada que ocultar bajo `prefers-reduced-motion`.

## 7. Marcadores GVC

- `data-capture` sobre el contenedor del nav lateral.
- Capturas requeridas: `menu-with-module` (persona con módulo) y `menu-without-module` (persona sin módulo).
- La segunda captura no es opcional: **es la prueba del aislamiento per-org**, que es la mitad del contrato.
- Baseline `client-portal-menu` para que cualquier cambio no intencional del chrome salte como diff.

## 8. Implementation Mapping

| Qué | Dónde |
|---|---|
| Resolución | `src/app/(dashboard)/layout.tsx` (único punto server con sesión sobre el menú) |
| Passthrough | `src/components/layout/vertical/Navigation.tsx` |
| Merge | `src/components/layout/vertical/VerticalMenu.tsx`, bloque no-interno |
| Composer | `src/lib/client-portal/composition/menu-builder.ts` (`composeNavItemsFromModules`) |
| Reader | `src/lib/client-portal/readers/native/module-resolver.ts` |
| Tipos client-safe | `src/lib/client-portal/composition/menu-builder-shape.ts` |
| Labels | `src/lib/admin/view-access-catalog.ts` (`VIEW_REGISTRY`) |

Frontera dura: `module-resolver`, `menu-builder` y `ClientPortalNavigation` son `server-only`.
Importarlos desde `VerticalMenu` (client) rompe el build. Al cliente sólo viaja `ClientNavItem[]` como
JSON plano.

## 9. GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/client-portal-menu-modules.scenario.ts`
- Ruta: `/home`
- Viewports: 1440 · 390
- `requiresStorageState`: declarado por escenario (contrato de TASK-1310 — sin él la captura corre con otra identidad y produce evidencia engañosa)
- Assertions: ítem presente con módulo · **ausente** sin módulo · lista base intacta en ambos · `scrollWidth==clientWidth` · sin `console.error`
- Evidencia de foco: tabular hasta el ítem nuevo y capturar el anillo

## 10. Design Decision Log

- **Decisión:** resolver server-side en el layout y pasar `clientNavItems` por props; merge aditivo.
- **Alternativas rechazadas:** fetch desde el cliente (flash/CLS en chrome persistente + no lee kill switches server-only); montar `ClientPortalNavigation` (segundo sistema de navegación, segundo `<nav>`, segundo active-state resolver); claim en el JWT (staleness ≥5 min + tercer carril de verdad para un dato per-org que ya tiene reader).
- **Por qué este patrón:** es el que TASK-827 dejó declarado en su propio contrato, y deja el menú y el gate de la página leyendo el **mismo** `module_assignments`.
- **Reuse / extend / new:** `reuse` + extensión mínima del descriptor (noción de ruta hija).
- **Riesgos abiertos:** colisión con TASK-1388 sobre el mismo archivo; un módulo futuro con viewCode sin descriptor (mitigado por el filtro defensivo del composer).
