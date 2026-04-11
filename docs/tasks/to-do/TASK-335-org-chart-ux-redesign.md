# TASK-335 — Rediseno UX de la vista Organigrama

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-331` (jerarquia y organigrama comparten patron sidebar + tabs; jerarquia primero para establecer la pauta)
- Branch: `task/TASK-335-org-chart-ux-redesign`

## Summary

Rediseno visual y de interaccion del organigrama (`/hr/org-chart`). Los nodos de React Flow estan sobrecargados (6-8 chips + 2 botones + stats en 320×228px), el sidebar permanente comprime el grafo al 66%, los textos se truncan sin indicador visual, y la vista de liderazgo crea confusion entre persona enfocada y lider anclado. Se simplifica el nodo, se reemplaza el sidebar por un Drawer, se mejoran las etiquetas de contexto heredado, y se agrega responsive awareness.

## Why This Task Exists

La vista de organigrama fue implementada en TASK-329 como un explorador visual completo con React Flow + Dagre. Funciona correctamente pero tiene problemas de densidad visual y usabilidad:

- **Nodos sobrecargados**: un nodo de departamento tiene tipo, status, avatar, nombre, responsable, departamento padre, 3 stats, 2 botones — todo en 320×228px. Los chips se apilan y el texto se trunca.
- **Sidebar permanente**: igual que en jerarquia, un panel lg:4 siempre visible comprime el grafo. El detalle contextual deberia aparecer on-demand.
- **Contexto heredado confuso**: los alerts que explican "por que esta persona aparece aqui" son largos (80+ caracteres) y usan terminologia interna ("adscripcion directa", "contexto estructural").
- **Vista de liderazgo ambigua**: al buscar un no-lider, el mapa se ancla a otro nodo pero el sidebar muestra la persona buscada. No hay indicador visual claro de este cambio de foco.
- **Mobile inutilizable**: min zoom 0.18× hace el texto ilegible. No hay adaptacion real para mobile.
- **Fallbacks verbosos**: "Sin responsable visible", "Sin adscripcion directa", "Area sin detalle adicional" — ruido visual en cada nodo sin datos completos.

## Goal

- Nodos mas limpios con informacion priorizada y chips reducidos
- Sidebar reemplazado por Drawer (consistente con TASK-331)
- Contexto heredado explicado con lenguaje simple, no jerga tecnica
- Vista de liderazgo con indicador visual claro de anclaje
- Fallbacks cortos y consistentes ("—" o "Sin dato")
- Mobile: raise minZoom, disable zoom-on-scroll, o simplificar la vista

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

Reglas obligatorias:

- Usar primitivos Vuexy cuando existan
- `members.avatar_url` almacena proxy URLs listas para browser — usar directamente
- Mantener patrones de Drawer y tabs consistentes con TASK-331
- React Flow + Dagre layout se mantienen — solo cambian los node cards y la interaccion

## Normative Docs

- `docs/documentation/hr/jerarquia-reporte-supervisoria.md` — documentacion funcional del modulo

## Dependencies & Impact

### Depends on

- TASK-329 (complete) — organigrama fundacional, React Flow + Dagre
- TASK-331 (to-do) — establece patron de Drawer + tabs para la jerarquia. El organigrama debe seguir la misma pauta visual.
- Sistema de avatares ya resuelve proxy URLs en `members.avatar_url`

### Blocks / Impacts

- Ninguna task bloqueada directamente

### Files owned

- `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
- `src/views/greenhouse/hr-core/components/OrgChartNodeCard.tsx` (si se extrae)
- `src/views/greenhouse/hr-core/components/OrgLeadershipNodeCard.tsx` (si se extrae)

## Current Repo State

### Already exists

- `src/views/greenhouse/hr-core/HrOrgChartView.tsx` (866 lineas) — vista completa con React Flow
- Node cards inline en el componente (OrgChartNodeCard ~256 lineas, OrgLeadershipNodeCard ~222 lineas)
- React Flow configurado: Dagre layout, minimap, controls, fit-view
- 2 vistas: structure (departamentos + personas) y leaders (solo lideres)
- Sidebar con detail panel, breadcrumb path, stats, action buttons
- Search Autocomplete funcional
- URL-driven state (focusMemberId, view params)
- API: `src/lib/reporting-hierarchy/org-chart.ts` y `org-chart-leadership.ts`

### Gap

- Nodos tienen 6-8 chips + 2 botones + 3 stats en 320×228px — demasiado densos
- Sidebar permanente comprime grafo al 66%
- Alerts de contexto heredado usan jerga tecnica
- Vista de liderazgo no indica claramente el anclaje a otro nodo
- Fallbacks verbosos crean ruido visual
- Mobile: zoom minimo 0.18× hace texto ilegible
- Sin keyboard navigation entre nodos
- Sin indicador de frescura de datos (cuando fue el ultimo sync)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Simplificar nodos del grafo

- **Structure node**: reducir a: tipo badge + avatar + nombre + rol + 1 stat (directos) + accion contextual (click = foco)
- **Leadership node**: reducir a: avatar + nombre + area principal + directos + dept chips (max 2 + "+N")
- Mover stats detallados (subarbol, profundidad) y acciones (ver ficha, jerarquia) al Drawer
- Eliminar botones de accion del nodo — el click abre el Drawer
- Reducir chips de status: solo "Tu", "Raiz", "Delegacion" (quitar "Activo" que es redundante si aparece, "Contexto heredado" que es confuso)
- Fallbacks cortos: "—" para campos vacios, no frases completas
- Ajustar dimensiones: structure 300×160px, leadership 300×200px

### Slice 2 — Drawer en vez de sidebar

- Reemplazar sidebar (Grid lg:4) con MUI Drawer (anchor='right', ~420px)
- El grafo ocupa 12/12 columnas — full width
- Click en nodo abre Drawer con detalle completo (avatar, nombre, rol, status, stats, breadcrumb, acciones)
- Mantener contenido del sidebar actual pero reorganizado en el Drawer:
  1. Header: avatar + nombre + rol + status chips
  2. Stats grid: directos, subarbol, profundidad
  3. Contexto: departamento, supervisor, regimen
  4. Ruta (breadcrumb path clickable)
  5. Acciones: "Ver ficha", "Abrir jerarquia"
- Focus trap, Escape para cerrar, framer-motion animacion

### Slice 3 — Microcopy y contexto simplificado

- Reemplazar alerts de contexto heredado por chips + tooltips cortos:
  - "Contexto heredado" → chip "Ubicacion estimada" con tooltip "No tiene departamento asignado; aparece en el area de su supervisor"
  - "Responsable de area" → chip "Lidera {area}" 
  - Alert largo de liderazgo → tooltip en chip "Anclado a {nombre}"
- Fallbacks consistentes: "Sin dato" (corto), nunca frases de 20+ caracteres
- Registrar labels en nomenclature.ts

### Slice 4 — Responsive y accesibilidad

- Mobile: subir minZoom a 0.4, desactivar zoomOnScroll
- Nodos: aria-label descriptivo con nombre + rol + stats
- Minimap: ocultar en mobile (xs/sm)
- Grafo height mobile: reducir a 480px
- Stats chips: tooltip con explicacion de "raices" y "profundidad"
- Timestamp de ultimo refresh visible ("Actualizado hace 2 min")

## Out of Scope

- Cambiar React Flow por otra libreria de grafos
- Modificar el layout algorithm (Dagre) — solo dimensiones de nodos
- Agregar drag-and-drop para reasignar
- Cambiar APIs o tipos backend
- Implementar lazy-load de subarbol
- Responsive mobile-first (desktop-first, mejoras puntuales en mobile)

## Detailed Spec

### Wireframe del nodo simplificado (structure)

```
┌──────────────── 300px ────────────────┐
│ [Dept] [Activo]           [Tu] [Raiz] │
│                                       │
│ [Avatar]  Ejecutivo                   │
│           Julio Reyes                 │
│           Nivel raiz                  │
│                                       │
│ Directos: 3  ·  Miembros: 1          │
└───────────────────────────────────────┘
        ↕ 160px
```

### Wireframe del nodo simplificado (leadership)

```
┌──────────────── 300px ────────────────┐
│ [Lider] [Activo]              [Tu]    │
│                                       │
│ [Avatar]  Daniela Ferreira            │
│           Creative Operations Lead    │
│           Reporta a Julio Reyes       │
│                                       │
│ Directos: 3  ·  Subarbol: 3          │
│                                       │
│ [Creative Ops]  [+0 mas]             │
└───────────────────────────────────────┘
        ↕ 200px
```

### Wireframe del Drawer

```
┌──────────── Drawer 420px ─────────────┐
│ ✕                                     │
│                                       │
│ [Avatar 56px]                         │
│ Julio Reyes                           │
│ Managing Director & GTM               │
│ [Activo] [Sin supervisor] [Raiz]      │
│                                       │
│ ┌─────────┬─────────┬──────────┐     │
│ │Direct: 3│Subarb: 6│Prof: 0   │     │
│ └─────────┴─────────┴──────────┘     │
│                                       │
│ Departamento    Ejecutivo             │
│ Regimen         Chile                 │
│ Supervisor      —                     │
│                                       │
│ Ruta: [Ejecutivo] → [Julio Reyes]     │
│                                       │
│ [Ver ficha]        [Abrir jerarquia]  │
└───────────────────────────────────────┘
```

### Componentes Vuexy a usar

| Componente | Uso |
|------------|-----|
| `MUI Drawer` | Detalle de miembro (reemplaza sidebar) |
| `CustomAvatar` | Avatar en nodos y drawer con `src` |
| `CustomChip` | Status badges simplificados |
| `Tooltip` | Explicaciones de contexto heredado y stats |
| `EmptyState` | Estados vacios (mantener existentes) |
| `framer-motion` | Animacion de drawer |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Nodos de estructura miden ~300×160px con info priorizada (avatar, nombre, rol, 1-2 stats)
- [ ] Nodos de liderazgo miden ~300×200px con dept chips reducidos
- [ ] No hay botones de accion dentro de los nodos — click abre Drawer
- [ ] El grafo ocupa 12/12 columnas (full width, sin sidebar permanente)
- [ ] Click en nodo abre Drawer lateral con detalle completo
- [ ] El Drawer muestra: avatar, nombre, rol, status, stats, contexto, ruta, acciones
- [ ] Contexto heredado usa chip + tooltip, no alerts largos
- [ ] Fallbacks son "—" o "Sin dato", no frases de 20+ caracteres
- [ ] Mobile: minZoom >= 0.4, minimap oculto, grafo height 480px
- [ ] Nodos tienen aria-label descriptivo
- [ ] Labels registrados en nomenclature.ts
- [ ] `pnpm build` y `pnpm lint` pasan sin errores

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Verificacion visual en staging: `/hr/org-chart`
- Verificar vista structure con 7 nodos visibles
- Verificar vista leadership con nodos filtrados
- Verificar Drawer abre con detalle correcto al click
- Verificar breadcrumb clickable navega entre nodos
- Verificar search sigue funcionando
- Verificar mobile: zoom, minimap oculto, height reducido

## Closing Protocol

- [ ] Actualizar `docs/documentation/hr/jerarquia-reporte-supervisoria.md` si incluye referencia al organigrama
- [ ] Verificar que los tests existentes de org chart siguen pasando

## Follow-ups

- Keyboard navigation entre nodos (arrow keys)
- "Copiar enlace" para compartir posicion en el organigrama
- Indicador de frescura de datos ("Actualizado hace X min")
- Export a imagen/PDF del organigrama visible

## Open Questions

- El patron de Drawer de TASK-331 debe estar implementado primero para mantener consistencia? (asumo si — blocked by TASK-331)
- Los tests existentes (`org-chart.test.ts`, `org-chart-leadership.test.ts`) cubren la logica de datos pero no el rendering — se necesitan tests de componente?
