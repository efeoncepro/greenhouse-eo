# TASK-331 — Rediseno UX completo de la vista Jerarquia

## Delta 2026-05-12 — Audit visual live (fe:capture + product design skills)

Se ejecuto auditoria visual end-to-end con `pnpm fe:capture hr-hierarchy-governance-audit --env=local` (7 frames + recording.webm) y se invocaron las skills `modern-ui-greenhouse-overlay`, `greenhouse-ui-review`, `a11y-architect`, `state-design`, `info-architecture`, `motion-design`, `greenhouse-ux-writing`, `forms-ux`. Output: **6 blockers + 13 modern-bar + 9 polish** vs el tier 2026 alcanzado en `/hr/offboarding`.

**Insights nuevos respecto a la spec original** (mantener Slice 1-4 + agregar lo siguiente):

### Primitives canonicas reusables (post offboarding modernization 2026-05)

Estos componentes NO existian cuando se redacto TASK-331 V1. **Reusar verbatim**, no reconstruir:

| Primitive | Path | Uso en /hr/hierarchy |
|---|---|---|
| `Breadcrumb` | `src/components/greenhouse/primitives/Breadcrumb.tsx` | Header: `Mi Greenhouse → Organizacion → Jerarquia` (B-1) |
| `FilterTile` | `src/components/greenhouse/primitives/FilterTile.tsx` | Reemplaza chips `Pendientes:1 / Aprobadas:0 / ...` por tiles clickeables filtrables (B-2) |
| `DismissibleBanner` | `src/components/greenhouse/primitives/DismissibleBanner.tsx` | Hint persistente sobre "Politica vigente: manual prevalece" si emerge necesidad de educar al usuario nuevo |
| `DataTableShell` (TASK-743) | `src/components/greenhouse/data-table/DataTableShell.tsx` | Envolver tabla `Jerarquia` + tabla `Propuestas de gobernanza` para resolver overflow horizontal con sticky-first column (M-6) |
| `InlineNumericEditor` (TASK-743) | `src/components/greenhouse/primitives/InlineNumericEditor.tsx` | N/A en jerarquia, pero confirma el contract de density |
| `OptionMenu` | `src/@core/components/option-menu/` | Ya en spec original Slice 2 — confirmado canonico |

### Blockers nuevos detectados live (frames Playwright + skills)

| ID | Sintoma observado en captura | Skill que lo detecto | Slice donde absorberlo |
|---|---|---|---|
| B-1 | Header dice "Jerarquia HR" sin breadcrumb canonico. Inconsistente con `/hr/offboarding` post-modernizacion. | info-architecture | Slice 1 (extender) |
| B-2 | Chips `Pendientes:1 / Aprobadas:0 / Rechazadas:0 / Descartadas:0 / Autoaplicadas:0` son estaticos + 4 con valor 0 son ruido. NO actuan como filtros del listado. | state-design + modern-ui | Slice 2 (nuevo) |
| B-3 | Boton "Cambiar supervisor" del header siempre visible aunque este disabled. Usuario no sabe por que no responde al click. Falta tooltip con razon. | a11y-architect + forms-ux | Slice 4 (extender) |
| B-4 | Triple CTA "Cambiar supervisor" coexisten: header global + Panel auditado + por fila. 3 entry points identicos. | info-architecture | Slice 1 (ya cubierto por eliminar sidebar; agregar: eliminar tambien del header) |
| B-5 | Acciones por fila (Cambiar / Reasignar / Auditar) son 3 buttons `variant='text'` inline con overflow horizontal en columna Acciones. Tambien aplica a Aprobar/Rechazar/Descartar en tabla de propuestas. | modern-ui + info-architecture | Slice 2 (ya cubierto, confirmar OptionMenu en ambas tablas) |
| B-6 | KPI card "Subarbol seleccionado" muestra stat `—` + chip vacio cuando no hay seleccion. Ambiguo entre cero/no-aplica/error. | state-design | Slice 1 (nuevo: empty state explicito por KPI card) |

### Modern bar nuevos

| ID | Sintoma | Fix concreto | Slice |
|---|---|---|---|
| M-1 | `fontWeight={600}` en `subtitle1` redundante en lineas 982, 1026, 1125 | Remover override — theme ya define el peso | Slice 4 sweep |
| M-2 | `borderRadius: 2` hardcoded en `<Box>` (lineas 973, 1017, 1116, 1745) | `sx={theme => ({ borderRadius: theme.shape.customBorderRadius.lg })}` | Slice 4 sweep |
| M-3 | `p: 2.5` off-scale (lineas 972, 1016, 1122, 1139, 1341, 1744) | Cambiar a `p: 3` canonico | Slice 4 sweep |
| M-4 | Bullet list de policy precedence usa `<i className='tabler-point-filled'>` no semantico | Migrar a `<Box component='ul'>` + `<Box component='li'>` con dot CSS | Slice 4 a11y |
| M-5 | 4 KPI cards usan iconos mezclados (`tabler-sitemap`, `tabler-tree`, `tabler-branch`, `tabler-shield-check`) sin convencion | Sistema por categoria: Conteo → `tabler-users`, Estructura → `tabler-binary-tree-2`, Foco → `tabler-target`, Governance → `tabler-shield-check` | Slice 1 |
| M-6 | Tabla "Propuestas" y tabla "Jerarquia" cortan columna Acciones (overflow horizontal) en viewport 1440 | Envolver con `DataTableShell` density `comfortable` + sticky-first column en `Miembro` | Slice 1 + Slice 2 |
| M-7 | Switches `Sin supervisor` + `Incluir inactivos` viven separados de search/supervisor autocomplete; mental model ambiguo (filtro vs setting) | Convertir a chips toggle (`Chip variant='outlined'` activable) en la misma row | Slice 1 (filtros) |
| M-8 | Date format `4:00 a. m.` con espacio + puntos en sufijo AM/PM no canonico es-CL | Verificar `formatGreenhouseDateTime` con `hour12: false` para canonical 24h | Slice 4 |
| M-9 | Header subtitulo no incluye contadores live (cuantas personas, propuestas pendientes, delegaciones vigentes) | `{summary.total} miembros activos · {governanceSummary.pending} propuestas pendientes · {summary.delegatedApprovals} delegaciones vigentes` | Slice 1 |
| M-10 | Chips `Canonica: manual` + `Externa: azure-ad` sin tooltip explicativo | Tooltip: "Source-of-truth Greenhouse (manual)" / "Fuente enriquecimiento Azure AD" | Slice 4 |
| M-11 | `useFlexGap` + `flexWrap='wrap'` repetido 10+ veces. MUI 7 prefiere `gap={1}` directo | Sweep + promover wrapper `<ChipRow>` reusable | Slice 4 |
| M-12 | Empty state "Sin propuestas pendientes" tiene CTA "Ejecutar revision" que ya existe arriba derecha | Empty state sin CTA — solo mensaje + icono | Slice 4 microcopy |
| M-13 | Sticky FAB azul abajo-derecha sin label visible ni `aria-label` | Verificar componente y agregar tooltip + aria-label `'Abrir asistente Greenhouse'` | Slice 4 a11y |

### Polish (post-merge)

| ID | Antes | Despues | Skill |
|---|---|---|---|
| P-1 | "Origen: rh-sync" | "Detectado por sync de RH" | ux-writing |
| P-1 | "Sin cargo visible" | "Cargo no registrado" | ux-writing |
| P-1 | "Sin departamento" | "Sin departamento asignado" | ux-writing |
| P-1 | "Corrida rh-sync-12ab" | `<Tooltip title='ver run completo'><Chip label='Run 12ab' /></Tooltip>` | ux-writing |
| P-1 | "Veces detectada: 21" | "Detectada 21 veces" o badge numerico superpuesto al chip de estado | ux-writing + info-arch |
| P-1 | "Supervisor inactivo" / "Raiz" / "Vigente" | "Supervisor dado de baja" / "Raiz organizacional" / "Vinculo vigente" | ux-writing |
| P-2 | Avatares iniciales todos en `skin='light' color='info'` (azul claro uniforme) | Color por department hash: Managing Director → primary, Creative → info, Finance → warning, Growth → success | modern-ui |
| P-3 | Sin microinteracciones — todo estatico | KPI cards `whileHover={{ y: -2 }}` + row `whileTap={{ scale: 0.995 }}` + `<AnimatePresence>` para entrada de nuevas propuestas + `AnimatedCounter` para stats KPI + sliding bar `layoutId` en chip-toggle filters | motion-design |
| P-4 | "Inicio: 03-05-2026, 4:00 a. m." + "Termino: 03-05-2026, 4:00 a. m." (mismo timestamp) | Si `startedAt === finishedAt`, mostrar `"Inmediata"` o duration en segundos | info-architecture |
| P-5 | Subtitulo de la pagina enumera lo mismo que las 4 KPI cards | "Gestiona quien reporta a quien, delegaciones temporales y propuestas de cambio." | ux-writing |
| P-6 | Card "Politica vigente" texto seco "La linea manual de Greenhouse prevalece por defecto..." | "Greenhouse usa la linea manual como fuente principal. Los cambios detectados en Azure AD entran como propuestas auditables, no se aplican automaticamente." | ux-writing |
| P-7 | Chip "Pendiente" + caption "Veces detectada: 21" duplican info verticalmente | Badge superpuesto al chip con el contador, tooltip con detalle | info-architecture |
| P-8 | `selected={rowSelected}` en TableRow sin focus indicator visible | Border-left primary 2px + bg tint cuando seleccionada | a11y-architect |
| P-9 | Header sin counter `{summary.total} miembros activos` — usuario no sabe scope a glance | Ya cubierto en M-9 | info-arch |

### Comparativa /hr/offboarding (tier 2026) vs /hr/hierarchy (auditado)

| Dimension | Offboarding (actual) | Hierarchy (auditado) | Gap ID |
|---|---|---|---|
| Breadcrumb canonico | Si | No | B-1 |
| FilterTile interactivos | 4 tiles (whileTap + layoutId) | 5 chips estaticos | B-2 |
| Microinteracciones | 4 layers Framer Motion | Solo hover MUI | P-3 |
| DataTableShell (TASK-743) | Si | No (2 tablas con overflow) | M-6 |
| DismissibleBanner | Si (educativo) | N/A | — |
| Accion primary por fila | OptionMenu | 3 buttons text inline | B-5 |
| Empty states explicitos | Si | Parcial (KPI subarbol roto) | B-6 |
| Disabled tooltip context | Si | No | B-3 |
| Copy CL canonico | Si | Parcial ("Origen: rh-sync") | P-1 |
| Tokens canonicos | Si | No (`p: 2.5`, `borderRadius: 2`) | M-1/2/3 |

### Action list priorizada (5 PRs)

| PR | Scope | Skill lider | Effort |
|---|---|---|---|
| PR-1 | Slice 1 extendido — B-1 + B-3 + B-4 + B-6 + M-5 + M-7 + M-9 (header + breadcrumb + tooltip disabled + KPI empty state + iconografia + chips toggle + header counter) | info-architecture | S (1 dia) |
| PR-2 | Slice 2 confirmado — B-2 (FilterTile para summary chips) + OptionMenu por fila en ambas tablas | state-design | M (1.5 dias) |
| PR-3 | Slice 1+2 — M-6 (DataTableShell wrapping ambas tablas) + indentacion tree visual | modern-ui | M (2 dias) |
| PR-4 | Slice 4 sweep — M-1 + M-2 + M-3 + M-4 + M-8 + M-10 + M-11 + M-12 + M-13 (tokens canonicos + a11y semantic list + microcopy) | modern-ui + a11y-architect | M (2 dias) |
| PR-5 | Polish — P-1 + P-2 + P-3 + P-4 + P-5 + P-6 + P-7 + P-8 (copy humanizado + microinteracciones + avatares por dept + counter animado) | motion-design + ux-writing | M (2 dias) |

**Total ~9 dias-dev** para llevar `/hr/hierarchy` al mismo tier 2026 que `/hr/offboarding`.

### Verificacion visual canonica obligatoria post-fix

Una vez aplicadas las Slices, re-ejecutar el helper canonico de captura y volver a auditar:

```bash
pnpm fe:capture hr-hierarchy-governance-audit --env=local --gif
```

Comparar contra `.captures/2026-05-12T09-22-49_hr-hierarchy-governance-audit/` con `pnpm fe:capture:diff <prev> <curr>` para validar que los 28 hallazgos cierran sin introducir regresion visual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno + audit visual 2026-05-12 (live capture)`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-331-hierarchy-view-ux-redesign`
- Audit evidence: `.captures/2026-05-12T09-22-49_hr-hierarchy-governance-audit/` (7 frames, fe:capture helper)

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
