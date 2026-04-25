# TASK-606 — Space 360 Motion Consistency & Empty State Follow-up

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-606-space-360-motion-consistency-empty-state-followup`
- Legacy ID: `PR-62 legacy follow-up`
- GitHub Issue: `[optional]`

## Summary

Follow-up frontend-only de `TASK-321` para cerrar micro-gaps de consistencia en `Space 360`: listas secundarias sin `AnimatePresence`/stagger, empty states heterogéneos todavía resueltos como `Typography` plana, KPI shell sin wrapper accesible y donut de Finance sin breakdown visible debajo del chart.

## Why This Task Exists

El viejo `PR #62` intentó capturar una follow-up válida de `Space 360`, pero hoy no puede mergearse porque nació sobre un backlog antiguo y recicla `TASK-415`, que ya quedó cerrada con otro dominio. La intención de producto sigue siendo útil: `Space 360` ya tiene un patrón canónico de microinteracción y feedback en `NexaInsightsBlock`, `EmptyState` y el shell del módulo, pero todavía quedan secciones secundarias donde la UX no conversa con el resto de la vista.

La tarea correcta ya no es “agregar una `TASK-415`”, sino rescatar ese contenido como una follow-up nueva, alineada al runtime y a la taxonomía actual del repo.

## Goal

- Normalizar las listas secundarias de `Space 360` con motion gated por `useReducedMotion`.
- Unificar empty states secundarios sobre `EmptyState` en vez de `Typography` plana.
- Mejorar a11y y legibilidad del shell financiero sin reabrir el rediseño completo de `TASK-321`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`

Reglas obligatorias:

- motion imports solo desde `@/libs/FramerMotion`
- gating de motion solo desde `@/hooks/useReducedMotion`
- reutilizar `EmptyState` y `ExecutiveMiniStatCard` sin abrir cambios de API pública
- esta task es un follow-up acotado de microinteracción y accesibilidad; no reemplaza el scope mayor de `TASK-321`

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-321-space-360-ui-ux-polish.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/agency/space-360/Space360View.tsx`
- `src/views/greenhouse/agency/space-360/tabs/DeliveryTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/FinanceTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/IcoTab.tsx`
- `src/components/greenhouse/NexaInsightsBlock.tsx`
- `src/components/greenhouse/EmptyState.tsx`

### Blocks / Impacts

- `TASK-321`
- consistencia visual del bloque `Agency > Space 360`
- follow-ups futuros de microinteracciones 360 cross-module

### Files owned

- `src/views/greenhouse/agency/space-360/Space360View.tsx`
- `src/views/greenhouse/agency/space-360/tabs/DeliveryTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/FinanceTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx`
- `src/views/greenhouse/agency/space-360/tabs/IcoTab.tsx`

## Current Repo State

### Already exists

- `NexaInsightsBlock.tsx` ya usa `AnimatePresence` + `motion` + `useReducedMotion` como patrón canónico
- `EmptyState` ya existe como primitive reusable y ya se usa en partes de `Space 360`
- `DeliveryTab`, `FinanceTab`, `ServicesTab` e `IcoTab` ya están materializadas como tabs separadas y sirven como boundary natural para un follow-up frontend-only
- `FinanceTab` ya usa `EmptyState` en ingresos/egresos y tiene `figure` con `aria-label` en el donut

### Gap

- `DeliveryTab` todavía deja varios estados secundarios como `Typography` plana:
  - tendencia histórica vacía
  - `stuckAssets` vacío
  - proyectos del período vacíos
- `FinanceTab` aún deja el donut sin breakdown textual visible y resuelve el caso “sin costos” con `Typography` plana
- `ServicesTab` y algunas listas secundarias siguen renderizando `.map()` simples sin patrón de motion consistente con `NexaInsightsBlock`
- `IcoTab` todavía resuelve `Pipeline CSC` vacío con `Typography` plana
- `Space360View` mantiene KPI cards shell sin wrapper accesible/clickeable y todavía mezcla copy legacy (`Margin`, `Summary Agency`, `ICO latest snapshot`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Motion consistency en listas secundarias

- aplicar el patrón de `NexaInsightsBlock.tsx` a listas de:
  - `DeliveryTab`
  - `FinanceTab`
  - `ServicesTab`
- usar `AnimatePresence` + `motion.div` con gating por `useReducedMotion`
- cuando `prefers-reduced-motion` esté activo, el render debe degradar a lista estática sin wrappers animados

### Slice 2 — Empty state normalization

- reemplazar `Typography color='text.secondary'` plana por `EmptyState` en estados vacíos secundarios de:
  - `DeliveryTab`
  - `FinanceTab`
  - `IcoTab`
- mantener `animatedIcon` solo donde el estado vacío sea principal y no en sub-bloques secundarios

### Slice 3 — Shell a11y y clarity

- agregar wrapper accesible y explícito a los KPI cards de `Space360View`
- normalizar copy legacy mínimo en el shell (`Margin`, `Summary Agency`, `ICO latest snapshot`)
- agregar `figcaption` visible al donut de `FinanceTab` con breakdown textual del costo visible

## Out of Scope

- reabrir el scope grande de `TASK-321`
- rediseñar por completo `Space 360`
- tocar backend `Space360Detail` o `getAgencySpace360()`
- cambiar la API pública de `EmptyState`, `ExecutiveMiniStatCard` o `NexaInsightsBlock`

## Detailed Spec

Esta task rescata la intención del `PR #62`, pero la ajusta a la realidad actual:

- ya no usa `TASK-415` porque ese ID quedó ocupado y cerrado en otro dominio
- ya no asume que `Space 360` sigue exactamente en el estado del 2026-04-16
- parte desde el runtime actual, donde varias mejoras ya existen y solo quedan follow-ups puntuales

Principios:

1. **Pattern reuse first**
   - copiar el patrón de motion/reduced-motion desde `NexaInsightsBlock`
   - no inventar otro micro-pattern para listas 360

2. **Secondary empty states, not theatrical UI**
   - los estados vacíos secundarios deben ser claros y consistentes
   - no hace falta volverlos más vistosos que el contenido principal

3. **Accessibility without overengineering**
   - `aria-label` útil en KPIs
   - `figcaption` visible para charts
   - reduced motion respetado

4. **No backlog drift**
   - esta task reemplaza documentalmente la intención del `PR #62`
   - el PR viejo debe cerrarse como superseded por `TASK-606`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] las listas secundarias de `Space 360` usan el patrón canónico de motion con gating por `useReducedMotion`
- [ ] los empty states secundarios ya no caen a `Typography` plana en los casos cubiertos por la task
- [ ] el shell de `Space 360` mejora a11y y clarity mínima sin tocar backend
- [ ] el `PR #62` puede cerrarse como reemplazado por esta task sin perder su intención útil

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- validación manual en `/agency/spaces/[id]`
- validación manual con `prefers-reduced-motion: reduce`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-321` y otras follow-ups de Space 360

## Follow-ups

- evaluar si el mismo patrón debe migrarse después a otras vistas `360`
- si `TASK-321` cambia más fuerte el shell, revisar si esta task debe absorberse parcial o totalmente ahí

## Delta 2026-04-24

Task creada para rescatar la intención válida del `PR #62` sin arrastrar el drift documental de ese branch antiguo. Sustituye la vieja pseudo-`TASK-415` por una follow-up nueva y consistente con el backlog vigente.
