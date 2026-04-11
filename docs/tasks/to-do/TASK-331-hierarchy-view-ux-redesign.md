# TASK-331 — Rediseno UX completo de la vista Jerarquia

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-331-hierarchy-view-ux-redesign`

## Summary

Rediseno completo de `/hr/hierarchy`. La vista actual es funcional pero tiene problemas criticos de layout, jerarquia visual, interaccion y microcopy. La gobernanza domina el espacio, el sidebar comprime la tabla, no hay estructura de arbol visual, y las acciones estan dispersas. Se reestructura con tabs (Jerarquia/Gobernanza), drawer lateral en vez de sidebar permanente, tabla full-width con indentacion de arbol, y microcopy corregido.

## Why This Task Exists

La vista de Jerarquia fue construida incrementalmente a lo largo de TASK-324 a TASK-330, acumulando secciones (gobernanza, auditoria, delegaciones, stats) sin un rediseno holístico. El resultado es una pantalla donde:

- La seccion de gobernanza toma ~400px antes de llegar a la tabla
- El sidebar permanente comprime la tabla al 66% del ancho
- No hay representacion visual de la estructura padre-hijo (todo es flat)
- Las acciones estan duplicadas en 3 lugares (header, tabla, sidebar)
- El microcopy mezcla jerga tecnica ("nodos"), ingles ("HR"), y etiquetas ambiguas ("Panel auditado")
- La accesibilidad es deficiente (sin caption, sin aria-labels, color como unico indicador)

Es una herramienta HR de uso diario — debe sentirse como un centro de control, no como un dump de datos.

## Goal

- La tabla de jerarquia ocupa el ancho completo con indentacion visual por nivel
- Gobernanza se mueve a un tab separado, no compite por espacio
- El detalle de miembro (historial + delegaciones) abre en un Drawer, no sidebar permanente
- Microcopy en espanol consistente, sin jerga tecnica
- Accesibilidad WCAG 2.2 AA en tabla, chips y acciones
- Microinteracciones: drawer animado, row selection feedback, OptionMenu

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

Reglas obligatorias:

- Usar primitivos Vuexy (CustomAvatar, CustomChip, CustomTabList, OptionMenu, HorizontalWithSubtitle)
- No crear componentes custom cuando existe un primitivo Vuexy equivalente
- Sentence case en todos los labels. Sin mezcla espanol/ingles
- `members.avatar_url` almacena proxy URLs listas para browser — usar directamente sin conversion

## Normative Docs

- `docs/documentation/hr/jerarquia-reporte-supervisoria.md` — documentacion funcional del modulo

## Dependencies & Impact

### Depends on

- TASK-324 a TASK-330 (complete) — toda la infraestructura de jerarquia ya esta implementada
- `src/types/hr-core.ts` — tipos HrHierarchyRecord, HrHierarchyGovernanceResponse estables
- `src/lib/reporting-hierarchy/admin.ts` — API queries estables, no se modifican
- Sistema de avatares ya resuelve proxy URLs en `members.avatar_url`

### Blocks / Impacts

- TASK-323 (to-do) — programa enterprise de jerarquias. El redesign mejora la base visual que TASK-323 extiende

### Files owned

- `src/views/greenhouse/hr-core/HrHierarchyView.tsx`
- `src/config/greenhouse-nomenclature.ts` (solo keys de hierarchy)

## Current Repo State

### Already exists

- `src/views/greenhouse/hr-core/HrHierarchyView.tsx` (~2300 lineas) — vista completa, funcional
- `src/components/card-statistics/HorizontalWithSubtitle.tsx` — KPI cards
- `src/components/greenhouse/EmptyState.tsx` — empty states con soporte Lottie
- `src/@core/components/mui/Avatar.tsx` — CustomAvatar
- `src/@core/components/option-menu/index.tsx` — OptionMenu (3-dot dropdown)
- `src/@core/components/custom-tab-list/index.tsx` — CustomTabList
- `src/components/greenhouse/TeamAvatar.tsx` — avatar con role colors
- API routes: `/api/hr/core/hierarchy`, `/api/hr/core/hierarchy/history`, `/api/hr/core/hierarchy/delegations`, `/api/hr/core/hierarchy/governance`
- Tipos: `HrHierarchyRecord.memberAvatarUrl` ya tiene proxy URLs
- 3 dialogs funcionales: cambiar supervisor, reasignar, delegacion

### Gap

- No hay tabs — todo esta apilado verticalmente en un solo scroll
- No hay Drawer — sidebar es una columna permanente (lg:4)
- No hay indentacion visual por depth en la tabla
- No hay OptionMenu — hay 3 botones por fila
- Microcopy tiene jerga, ingles, y etiquetas ambiguas
- Sin accesibilidad: no caption, no aria-labels, color-only chips
- Sin microinteracciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Layout: tabs + full-width table

- Agregar `CustomTabList` con 2 tabs: "Jerarquia" (default) y "Gobernanza"
- Tab Jerarquia: KPIs + filtros + tabla full-width (Grid 12/12, sin sidebar)
- Tab Gobernanza: mover toda la seccion de gobernanza actual al segundo tab
- Eliminar el sidebar permanente (Grid lg:4)
- Mover KPI cards arriba de los filtros, debajo del titulo
- Integrar filtros dentro del card de la tabla (no card separado)

### Slice 2 — Tabla con arbol visual

- Agregar `paddingLeft: depth * 24px` al cell de Miembro para indentacion
- CSS pseudo-elements para lineas de conexion padre-hijo (tree lines)
- Root nodes: chip `Raiz` + font-weight bold
- Leaf nodes (0 directos): sin icono de expansion
- Reemplazar columna "Acciones" (3 botones) por `OptionMenu` (3-dot) con items: "Ver detalle", "Cambiar supervisor", "Reasignar reportes"
- Row click selecciona el miembro (visual highlight + opens drawer)
- Columna "Delegacion": mostrar chip solo si hay delegacion, "—" si no
- Columna "Estado": chips con iconos (check para activo, x para inactivo) — no color-only

### Slice 3 — Drawer de detalle

- `MUI Drawer` anchor='right', width ~420px, con framer-motion para open/close
- Contenido: member profile card (avatar + name + role + status chips + metrics)
- Historial de cambios usando `MUI Timeline` (@mui/lab) en vez de cards apilados
- Seccion de delegaciones con lista y acciones (crear, revocar)
- Botones de accion: "Cambiar supervisor", "Reasignar reportes", "Nueva delegacion"
- Focus trap y Escape para cerrar

### Slice 4 — Microcopy y accesibilidad

- Registrar labels en `greenhouse-nomenclature.ts` (no hardcoded en el componente)
- Tabla: agregar `<caption>` con "Estructura de supervisoria del equipo"
- Action buttons: agregar `aria-label` descriptivos
- Status chips: agregar icono + texto (no solo color)
- OptionMenu: aria-labels por item
- Empty states: revisar textos segun auditoria de microcopy

**Tabla de microcopy:**

| Actual | Nuevo |
|--------|-------|
| Jerarquia HR | Jerarquia |
| Supervisión, reportes directos, subárbol y delegaciones temporales | Supervisoria, delegaciones y cambios |
| Nodos visibles en la jerarquia | Personas en la organizacion |
| Sin delegacion temporal | — |
| Auditar (boton) | Eliminar — usar row click + OptionMenu |
| Panel auditado | Detalle del miembro |
| Historial auditado | Historial de cambios |
| Delegaciones temporales | Delegaciones |
| Escoge a alguien desde la tabla | Selecciona un miembro para ver su historial |
| Ejecutar revision | Revisar cambios externos |
| Aun no hay corridas | Sin revisiones recientes |

## Out of Scope

- Modificar APIs o tipos backend — los datos ya son correctos
- Agregar nuevas funcionalidades (solo redistribuir las existentes)
- Refactorizar los 3 dialogs existentes — funcionan bien, solo se abren desde nuevas ubicaciones
- Implementar tree expand/collapse (requiere cambio de API para lazy-load subarbol)
- Drag-and-drop para reasignar supervisores
- Responsive mobile-first — el modulo HR es desktop-first

## Detailed Spec

### Wireframe del layout propuesto

```
┌─────────────────────────────────────────────────────────────┐
│ Jerarquia                                                   │
│ Supervisoria, delegaciones y cambios              [Accion▼] │
├─────────────────────────────────────────────────────────────┤
│ [KPI Miembros] [KPI Raices] [KPI Subarbol] [KPI Delegac.]  │
├─────────────────────────────────────────────────────────────┤
│ [Tab: Jerarquia]  [Tab: Gobernanza]                         │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Buscar...]  [Supervisor▼]  [○ Sin sup.]  [○ Inactivos] │
├─────────────────────────────────────────────────────────────┤
│ Miembro              Supervisor  Directos Subarbol  Deleg.  │
│─────────────────────────────────────────────────────────────│
│ ● Julio Reyes        —           3       6          —    [⋮]│
│   ├ Daniela Ferreira Julio       3       3     V.Hoyos  [⋮]│
│   │ ├ Andres C.      Daniela     0       0          —   [⋮]│
│   │ └ Melkin H.      Daniela     0       0          —   [⋮]│
│   ├ Humberly H.      Julio       0       0          —   [⋮]│
│   └ Luis Reyes       Julio       0       0          —   [⋮]│
│   └ Valentina H.     Julio       0       0          —   [⋮]│
└─────────────────────────────────────────────────────────────┘

Row click o [⋮] > Ver detalle → abre Drawer derecho:
┌──────────── Drawer ────────────┐
│ ✕                              │
│ [Avatar] Julio Reyes           │
│ Managing Director & GTM        │
│ [Activo] [Sin supervisor]      │
│                                │
│ Directos: 3    Subarbol: 6     │
│                                │
│ [Cambiar sup.] [Reasignar]     │
│ [Nueva delegacion]             │
│────────────────────────────────│
│ Historial de cambios           │
│ ● 10 abr 2026                  │
│   Sin supervisor → Sin sup.    │
│   backfill · Sistema           │
│────────────────────────────────│
│ Delegaciones                   │
│ (sin delegaciones activas)     │
│ [Crear delegacion]             │
└────────────────────────────────┘
```

### Componentes Vuexy a usar

| Componente | Uso |
|------------|-----|
| `CustomTabList` | Tabs Jerarquia / Gobernanza |
| `HorizontalWithSubtitle` | 4 KPI cards (mantener existentes) |
| `OptionMenu` | Acciones por fila (3-dot dropdown) |
| `CustomAvatar` | Avatar con `src={row.memberAvatarUrl}` |
| `CustomChip` | Status con icono (accesibilidad) |
| `MUI Drawer` | Panel lateral de detalle de miembro |
| `MUI Timeline` (@mui/lab) | Historial de cambios en el drawer |
| `EmptyState` | Estados vacios en gobernanza y delegaciones |
| `framer-motion` | Animacion de apertura del drawer |

### Indentacion de arbol (CSS)

```css
/* Tree indentation via depth prop */
.hierarchy-row[data-depth="0"] .member-cell { padding-left: 16px; }
.hierarchy-row[data-depth="1"] .member-cell { padding-left: 40px; }
.hierarchy-row[data-depth="2"] .member-cell { padding-left: 64px; }
/* ... o dinamicamente: paddingLeft: 16 + depth * 24 */

/* Tree connector lines */
.hierarchy-row .member-cell::before {
  content: '';
  position: absolute;
  left: calc(16px + (var(--depth) - 1) * 24px);
  top: 0; bottom: 50%;
  border-left: 1px solid var(--mui-palette-divider);
  border-bottom: 1px solid var(--mui-palette-divider);
  width: 12px;
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La tabla de jerarquia ocupa el ancho completo (12 columnas) sin sidebar permanente
- [ ] Existe un tab "Jerarquia" (default) y un tab "Gobernanza"
- [ ] Las filas de la tabla muestran indentacion visual por depth (paddingLeft)
- [ ] Root nodes tienen chip "Raiz" y font-weight bold
- [ ] Cada fila tiene un OptionMenu (⋮) con "Ver detalle", "Cambiar supervisor", "Reasignar reportes"
- [ ] Click en fila o "Ver detalle" abre un Drawer lateral con el perfil del miembro
- [ ] El Drawer muestra avatar, nombre, rol, status chips, metricas, acciones, historial y delegaciones
- [ ] El historial en el Drawer usa MUI Timeline
- [ ] Las columnas Delegacion y Estado muestran "—" o chips con icono (no color-only)
- [ ] Todos los labels estan en espanol, sin jerga tecnica, registrados en nomenclature.ts
- [ ] La tabla tiene `<caption>` accesible
- [ ] Los action buttons tienen aria-labels
- [ ] Los 3 dialogs existentes (cambiar supervisor, reasignar, delegacion) siguen funcionando sin cambios
- [ ] `pnpm build` y `pnpm lint` pasan sin errores

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Verificacion visual en staging: `/hr/hierarchy`
- Verificar que los 3 dialogs (cambiar, reasignar, delegacion) abren y funcionan
- Verificar tab de gobernanza muestra politica y propuestas
- Verificar drawer abre con historial y delegaciones del miembro seleccionado
- Verificar indentacion visual refleja la estructura de arbol

## Closing Protocol

- [ ] Actualizar `docs/documentation/hr/jerarquia-reporte-supervisoria.md` con screenshots del nuevo layout
- [ ] Verificar que TASK-323 no necesita ajustes por el cambio de layout

## Follow-ups

- Tree expand/collapse con lazy-load de subarbol (requiere cambio de API)
- Drag-and-drop para reasignar supervisores visualmente
- Keyboard shortcuts para navegacion rapida entre miembros
- Animacion Lottie para empty states de gobernanza

## Open Questions

- Hay un componente MUI Timeline ya importado en el proyecto? Verificar disponibilidad de `@mui/lab`
- El OptionMenu de Vuexy soporta items con iconos y colores de severidad? Verificar props disponibles
