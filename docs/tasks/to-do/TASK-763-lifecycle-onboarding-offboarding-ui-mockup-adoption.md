# TASK-763 — Lifecycle Onboarding & Offboarding UI Mockup Adoption

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-030`, `TASK-760`
- Branch: `task/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa la shell UI aprobada del módulo `Lifecycle / Onboarding & Offboarding` usando el mockup validado en `docs/mockups/onboarding-module-mockup.html` como referencia visual canónica. La task aterriza la experiencia admin (`HR > Onboarding & Offboarding`), el editor de plantillas, la vista `My Onboarding` y la card compacta en `People 360`, preservando explícitamente que onboarding y offboarding son dos carriles visibles del mismo módulo y no un checklist genérico.

## Why This Task Exists

La foundation funcional y documental del dominio existe en piezas separadas:

- `TASK-030` define el runtime legacy de templates/instances para onboarding/offboarding checklist.
- `TASK-760` define la foundation canónica de `WorkRelationshipOffboardingCase` para salidas.
- El mockup aprobado ya resolvió la dirección visual y de interacción:
  - first fold con summary dominante
  - roster operativo con overdue/owners
  - lane explícita de offboarding
  - editor list-detail de plantillas
  - `My Onboarding` self-service
  - card compacta para `People 360`

Sin esta task, el diseño queda aprobado pero no aterrizado en el producto. Y si implementamos desde `TASK-030` o `TASK-760` sin una shell UI explícita, existe alto riesgo de volver a una superficie plana o incoherente con lo que ya aprobaste.

## Goal

- Implementar la shell UI aprobada del módulo Lifecycle.
- Hacer visible la separación entre `Onboarding` y `Offboarding` como carriles hermanos.
- Reusar el runtime de checklist existente para onboarding y dejar el carril offboarding preparado para el agregado canónico.
- Incorporar estados, microcopy y microinteracciones del mockup aprobado.
- Dejar el módulo listo para iterar luego con `TASK-760`/`761` sin rehacer la shell.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- El módulo visible debe hablar de `Lifecycle / Onboarding & Offboarding`, no ocultar Offboarding como apéndice de Onboarding.
- `Onboarding` y `Offboarding` comparten shell, pero no deben colapsar semánticamente en una sola lista sin carriles.
- La implementación debe distinguir explícitamente ambos planos del access model:
  - `views` / route surface visible
  - `entitlements` / acciones finas
- La UI no debe implicar que el carril de offboarding ya tiene motor completo de finiquitos si ese runtime todavía no existe.
- Reusar componentes compartidos cuando el patrón se repita; no copiar el mockup de forma literal ni introducir HTML paralelo.

## Normative Docs

- `docs/mockups/onboarding-module-mockup.html`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/to-do/TASK-760-workforce-offboarding-runtime-foundation.md`

## Dependencies & Impact

### Depends on

- `TASK-030` para templates/instances checklist
- `TASK-760` para que el carril offboarding no quede como semántica falsa
- `src/views/greenhouse/**`
- `src/components/greenhouse/**`
- `src/app/[lang]/(dashboard)/hr/**`

### Blocks / Impacts

- Desbloquea una implementación consistente del módulo antes de capas futuras como `TASK-761` y `TASK-762`.
- Impacta `HR`, `My Onboarding` y `People 360`.
- Puede requerir registrar nuevas `views` o ajustar navegación HR/Lifecycle.

### Files owned

- `src/app/[lang]/(dashboard)/hr/onboarding/page.tsx`
- `src/app/[lang]/(dashboard)/hr/onboarding/templates/page.tsx`
- `src/app/[lang]/(dashboard)/hr/onboarding/instances/[instanceId]/page.tsx`
- `src/app/[lang]/(dashboard)/my/onboarding/page.tsx`
- `src/views/greenhouse/hr-onboarding/**`
- `src/components/greenhouse/**` (solo si emerge primitive reusable real)
- `docs/documentation/hr/onboarding-offboarding-lifecycle.md`
- `docs/manual-de-uso/hr/onboarding-y-offboarding.md`

## Current Repo State

### Already exists

- Task legacy `TASK-030` con rutas, tablas, templates y superficies propuestas.
- Mockup aprobado:
  - `docs/mockups/onboarding-module-mockup.html`
- Arquitectura formal de offboarding:
  - `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- Skills/UI baseline ya usadas para decidir patrón y copy.

### Gap

- No existe la shell UI implementada del módulo.
- Offboarding aún tiende a quedar diluido o tratado como checklist secundario.
- No hay un detail-shell moderno ni roster operativo con la jerarquía aprobada.
- No existe hoy una card compacta explícita para `People 360`.

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

### Slice 1 — Lifecycle shell

- Header dominante del módulo:
  - título
  - summary breve
  - CTA principal
  - navegación de carriles
- Layout base `summary + roster + queue`
- Navegación interna clara entre:
  - instancias activas
  - plantillas
  - offboarding lane
  - my onboarding

### Slice 2 — HR operational overview

- KPI strip con:
  - activas
  - en tiempo
  - vencidas
  - bloqueos críticos
- Roster operativo de instancias con chips, progreso y owners
- Cola de bloqueos/problemas con copy honesta y accionable

### Slice 3 — Offboarding lane visible

- Surface propia de offboarding dentro de la shell
- Pipeline/case lane de salidas con:
  - causal
  - fecha efectiva
  - access lane
  - handoff
  - payroll/document lane
- La UI debe dejar claro que una salida no es solo revocar usuario

### Slice 4 — Templates editor

- List-detail editor basado en el mockup aprobado
- Lista de templates a la izquierda y canvas de edición dominante a la derecha
- Reordenamiento, owner, due offset, obligatoriedad y contract applicability visibles

### Slice 5 — My onboarding + People 360 card

- Vista self-service `My Onboarding`
- Card compacta de progreso en `People 360`
- Estados explícitos: pending, blocked, completed, partial

## Out of Scope

- No construir en esta task el motor de finiquitos.
- No reemplazar el runtime de `TASK-030` o `TASK-760`.
- No construir aún la firma/document vault de documentos de término.
- No implementar animación compleja o decorativa fuera de hover/focus/feedback liviano.

## Detailed Spec

### Approved visual source of truth

La referencia visual aprobada es:

- `docs/mockups/onboarding-module-mockup.html`

La implementación puede adaptar densidad y componentes Vuexy/MUI, pero debe preservar:

- first fold dominante
- Offboarding visible como carril real
- plantillas en patrón list-detail
- My Onboarding con progreso y próximas acciones
- copy operacional honesta

### Access model

La task debe declarar claramente dónde vive el acceso:

- `views`:
  - surface `HR > Onboarding & Offboarding`
  - surface `My Onboarding`
  - card visible en `People 360`
- `entitlements`:
  - ver instancias
  - editar plantillas
  - operar casos de offboarding
  - completar tareas propias

### Microinteraction policy

Usar el criterio aprobado por skills:

- motion mínima
- hover/focus claros
- estados `warning`, `error`, `partial`, `success`
- reduced motion respetado
- sin loaders apilados ni motion decorativa

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una shell UI moderna del módulo Lifecycle basada en el mockup aprobado.
- [ ] Offboarding tiene una lane explícita y visible dentro del módulo.
- [ ] `My Onboarding` y la card de `People 360` quedan implementadas.
- [ ] El editor de plantillas sigue un patrón list-detail consistente con el mockup.
- [ ] La implementación no implica capacidades de finiquito todavía no entregadas.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- Validación manual local o en preview contra las rutas HR/My afectadas

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] el mockup aprobado sigue enlazado en docs como referencia visual de implementación

## Follow-ups

- Desacoplar o absorber el brief legacy de `TASK-030` una vez que la shell y runtime real converjan.
- Integrar `TASK-761` y `TASK-762` en el lane de offboarding cuando existan runtime y documento de finiquito.
