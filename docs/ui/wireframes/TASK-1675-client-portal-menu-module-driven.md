# Wireframe — TASK-1675 · El menú del portal cliente compone los módulos contratados

> **Tipo:** Wireframe de navegación (chrome persistente, no superficie de contenido)
> **Task:** `docs/tasks/to-do/TASK-1675-client-portal-menu-module-driven.md`
> **Flow:** `docs/ui/flows/TASK-1675-client-portal-menu-module-driven-flow.md`
> **Creado:** 2026-08-08 por Claude
> **Estado:** diseño — `UI ready: yes` (mapping, plan GVC y decision log completos; gates en verde)

## 0. Qué se está diseñando (y qué no)

Esto **no es una pantalla nueva**: es un cambio en cómo se puebla el menú lateral que ya existe. El
chrome, los estilos, el orden visual y el comportamiento colapsado/hover **no cambian**. Lo único que
cambia es de dónde salen algunos ítems.

Por eso este wireframe no tiene mockup de alta fidelidad: el resultado visual esperado es
*"exactamente el menú de hoy, más un ítem"*. Cualquier diferencia adicional en la captura es un
defecto, no una mejora. Ese es el criterio de aceptación visual.

**Referencia visual del estado actual (before):**
`docs/ui/evidence/task-1675/before-menu-berel-sin-seo-1440.png` — sesión real de Grupo Berel, menú sin
el ítem SEO pese a tener el módulo contratado. Promovido desde `.captures/` a propósito: ese directorio
es gitignored y se purga a los 30 días, así que citarlo desde un contrato de diseño es una referencia
que muere sola.

## Visual direction

- Visual direction mode: `repo-native-benchmark`
- Benchmark: el propio menú del portal en producción. **No hay dirección visual nueva y no debe haberla**: el objetivo es que el ítem sea indistinguible de los que ya existen.
- Product Design asset: docs/ui/evidence/task-1675/before-menu-berel-sin-seo-1440.png — el **estado actual capturado con sesión real de Grupo Berel**, que es el benchmark literal de esta task: el after debe ser esta imagen más una fila. No hay pieza de dirección de arte que transcribir, y una inventada sería decorativa; el asset que gobierna acá es la evidencia del propio producto.
- Evidencia complementaria: docs/ui/evidence/task-1675/before-superficie-seo-funcionando-1440.png — la superficie SEO renderizando con datos medidos de Berel, que es lo que hoy resulta inalcanzable.

## Desktop Target — 1440×1000

El sidebar conserva su ancho, su orden y su tratamiento. En la lista primaria aparece **un** ítem más
(`SEO`), después de `Campañas` y antes del bloque `MI CUENTA`, con el mismo alto de fila, el mismo
icono a la izquierda y el mismo tratamiento de hover/activo que sus vecinos.

Criterio de éxito medible: el diff contra el baseline `client-portal-menu` no muestra **ninguna**
diferencia fuera del rectángulo de esa fila nueva. Cualquier corrimiento del resto del menú, cambio de
espaciado o reflow del contenido es un defecto.

## Mobile Target — 390×844

A 390px el sidebar es el drawer del `VerticalNav`. El ítem aparece en la misma posición relativa,
hereda el comportamiento de apertura/cierre y no introduce scroll horizontal: `scrollWidth ==
clientWidth`. Con el menú colapsado, el ítem se reduce a su icono como cualquier otro — por eso el
icono del descriptor tiene que ser legible por sí solo, sin apoyarse en el label.

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

## Action Hierarchy

- **Primary:** navegar al módulo contratado. Es la única acción del ítem — un click/Enter que cambia de superficie.
- **Secondary:** ninguna. El ítem no tiene menú contextual, badge accionable ni acción secundaria; agregarle una lo convertiría en un control y el sidebar no es un lugar para controles.
- **Destructive:** ninguna. Quitar un módulo es una acción de operador en su propia superficie (`/admin/client-portal/organizations/[id]/modules`), nunca desde el chrome del cliente.
- **Selection vs action:** es **acción**, no selección. El estado "activo" del ítem refleja la ruta actual, no una selección persistente del usuario — y lo resuelve el mismo motor del `Menu` Vuexy que el resto de los ítems, no un resolver paralelo.
- **Pending / disabled:** no existen. Un módulo o está vigente (y el ítem aparece) o no lo está (y no aparece). No hay ítem deshabilitado: un ítem gris que no lleva a ningún lado es peor que su ausencia, porque promete algo que no se puede cumplir.

## Visual Fidelity Mapping

No hay fuente de diseño externa que transcribir: el ítem debe ser **indistinguible** de los que ya
existen. La fidelidad aquí se mide por ausencia de diferencia.

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Fila de navegación | `MenuItem` Vuexy dentro de `VerticalNav` | El ítem pertenece al mismo sistema, sin chrome propio | Un `ListItemButton` MUI con estilos propios (lo que traería `ClientPortalNavigationList`) |
| Icono | `descriptor.icon` (glyph Tabler) del `menu-builder` | Categoría reconocible de un vistazo | SVG transcrito o icono fuera de la familia Tabler |
| Label | `VIEW_REGISTRY.label` | Un solo origen de verdad para el nombre | Literal en JSX |
| Color / activo | `menuItemStyles` del tema (`midnightNavy`) | Un único lenguaje de estado activo | `theme.palette.action.selected` propio del builder muerto |
| Agrupación | `group` del descriptor (`primary` / `capabilities` / `account`) | El módulo cae donde el usuario ya espera encontrarlo | Sección nueva inventada para "lo contratado" |

## Copy Ledger

Cero copy nuevo: **todos** los labels salen del `VIEW_REGISTRY`, que ya está poblado, versionado y es
el mismo origen que usa el resto del portal. Si un módulo futuro necesita otro label, eso es un cambio
de registry con su migración — no un literal en el menú.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `VIEW_REGISTRY['cliente.growth_seo_dashboard'].label` | Ítem de módulo | "SEO" | — | Origen único; no se duplica en JSX |
| `VIEW_REGISTRY['cliente.growth_seo_report'].label` | — (no se renderiza) | "Informe SEO" | — | Ruta hija: existe en el registry pero **no** produce ítem |
| — | Estado sin módulos | *(sin copy)* | — | Deliberado: ver State Copy |

**Por qué el estado vacío no dice nada:** un cliente sin módulos extra es la norma, no una carencia.
Un "Sin módulos contratados" le pondría un cartel permanente en el chrome a la mayoría de los
clientes, y encima insinuaría un upsell que esta superficie no debe hacer.

## State Copy

El menú es chrome, no una superficie de contenido: **ningún estado imprime copy propio**. Es una
decisión, no un olvido — un cartel en el sidebar es permanente y se lee como defecto del producto.

| Estado | Copy visible | Comportamiento y recuperación |
|---|---|---|
| ready | — (los ítems) | Lista base + ítems de módulo, ordenados por grupo/tier |
| loading | — | **No existe por construcción.** Los ítems llegan en el mismo payload RSC que el shell. Es la razón principal de resolver server-side en vez de hacer fetch: un skeleton o una aparición tardía en el sidebar es CLS en chrome persistente, el peor lugar posible |
| empty | — | Organización sin módulos → menú de hoy. Sin "no tienes módulos": es la norma, no una carencia, y un cartel ahí sería un upsell que esta superficie no debe hacer |
| partial | — | ViewCode sin descriptor → ese ítem se descarta y el resto se compone igual (filtro defensivo ya existente en el composer) |
| error | — | Resolver falla → menú de hoy. El error va a Sentry (`captureWithDomain`), no a la pantalla. Recuperación: la siguiente carga dura reintenta |
| denied | — | No aplica en el chrome: la organización sin el módulo simplemente no ve el ítem. El deny explicado vive en la page |

| Otras condiciones | Comportamiento |
|---|---|
| Mobile / compact | Hereda `VerticalNav` (colapsado/hover). Sin tratamiento propio |
| Keyboard / focus | Hereda `MenuItem`: el ítem entra en el orden natural de tabulación |
| Reduced motion | Sin motion propio — nada que degradar |

## Accessibility Contract

- **Heading order:** sin cambios. El menú no introduce headings; el ítem es un elemento de lista dentro del `<nav>` existente.
- **Chart/table alternatives:** no aplica — no hay datos ni visualizaciones en el chrome.
- **Aria labels:** ninguno nuevo. El `MenuItem` toma su nombre accesible del label visible, que es lo correcto: un `aria-label` distinto del texto rompería el "speak what you see".
- **Focus notes:** el ítem entra en el orden natural de tabulación, entre el ítem anterior y el siguiente de su grupo. Hereda el anillo de foco del `MenuItem`; no se agrega manejo de foco propio.
- **Color-independent state labels:** el estado activo se comunica por el tratamiento del `MenuItem` (fondo + peso), no por color solo — igual que el resto de los ítems.
- **Un solo landmark `<nav>`:** es un argumento de peso contra montar `ClientPortalNavigation`, que traería su propio `<nav>` y dejaría dos landmarks anidados en el mismo sidebar.

## 7. Marcadores GVC

- `data-capture` sobre el contenedor del nav lateral.
- Capturas requeridas: `menu-with-module` (persona con módulo) y `menu-without-module` (persona sin módulo).
- La segunda captura no es opcional: **es la prueba del aislamiento per-org**, que es la mitad del contrato.
- Baseline `client-portal-menu` para que cualquier cambio no intencional del chrome salte como diff.

## Implementation Mapping

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

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/client-portal-menu-modules.scenario.ts`
- Ruta: `/home`
- Viewports: desktop 1440 · mobile 390px
- Quality profile: premium
- `requiresStorageState`: declarado por escenario (contrato de TASK-1310 — sin el la captura corre con otra identidad y produce evidencia enganosa)
- Required steps: cargar con persona **con** modulo; cargar con persona **sin** modulo
- Required captures: `menu-with-module`, `menu-without-module`
- Required `data-capture` markers: contenedor del nav lateral
- Assertions: item presente con modulo · **ausente** sin modulo · lista base intacta en ambos · sin `console.error` · `noLoginRedirect`
- Scroll-width checks: `scroll-width == clientWidth` en 1440 y 390px
- Baseline decision / surface ID: `client-portal-menu`, con `maxDiffRatio` estricto. El baseline es la defensa real aca: el criterio de exito es *"el menu de hoy mas un item"*, asi que **cualquier otro pixel que cambie es un defecto**, y un diff es lo unico que lo detecta sin depender de que alguien mire con atencion
- Review dossier: `pnpm fe:capture:review client-portal-menu-modules`
- Reduced-motion / focus evidence: tabular hasta el item nuevo y capturar el anillo de foco

## Design Decision Log

- **Decisión:** resolver server-side en el layout y pasar `clientNavItems` por props; merge aditivo.
- **Alternativas rechazadas:** fetch desde el cliente (flash/CLS en chrome persistente + no lee kill switches server-only); montar `ClientPortalNavigation` (segundo sistema de navegación, segundo `<nav>`, segundo active-state resolver); claim en el JWT (staleness ≥5 min + tercer carril de verdad para un dato per-org que ya tiene reader).
- **Por qué este patrón:** es el que TASK-827 dejó declarado en su propio contrato, y deja el menú y el gate de la página leyendo el **mismo** `module_assignments`.
- **Reuse / extend / new:** `reuse` + extensión mínima del descriptor (noción de ruta hija).
- **Riesgos abiertos:** colisión con TASK-1388 sobre el mismo archivo; un módulo futuro con viewCode sin descriptor (mitigado por el filtro defensivo del composer).
