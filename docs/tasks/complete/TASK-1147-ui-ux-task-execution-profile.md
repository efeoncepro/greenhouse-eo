# TASK-1147 — UI/UX Task Execution Profile

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- Epic: `optional`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `ops|ui|platform|quality`
- Blocked by: `none`
- Branch: `task/TASK-1147-ui-ux-task-execution-profile`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Formalizar un perfil de ejecucion `ui-ux` para tasks Greenhouse, sin crear una taxonomia paralela.
La task agrega un addendum canonico, campos de triage, proceso de Discovery y enforcement warning-first
para que cualquier trabajo visible declare experiencia, estados, microinteracciones, motion y evidencia GVC.

## Why This Task Exists

El template general de tasks funciona bien para cambios tecnicos, pero una task UI/UX puede quedar
demasiado abierta: "construir pantalla X" no obliga a declarar estados, responsive, copy, motion,
primitive reuse, accesibilidad ni evidencia visual. El resultado puede ser codigo correcto pero experiencia
sub-especificada. El cambio debe vivir en el sistema TASK existente, no en un backlog paralelo.

## Goal

- Crear un addendum UI/UX copiable y canonico para tasks con impacto visible.
- Actualizar `TASK_TEMPLATE.md` y `TASK_PROCESS.md` para soportar `Execution profile` y `UI impact`.
- Agregar enforcement mecanico warning-first en `pnpm task:lint` sin migrar masivamente backlog historico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/architecture/GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`

Reglas obligatorias:

- Mantener un solo sistema `TASK-###`; UI/UX es perfil de ejecucion, no tipo de backlog separado.
- Enforcement gradual: warning-first, legacy-exempt, sin migracion masiva de `complete/`.
- El contrato UI/UX debe cubrir primitives, copy, estados, motion, microinteracciones, accesibilidad, GVC y cierre visual.

## Normative Docs

- `DESIGN.md`
- `AGENTS.md`
- `docs/context/00_INDEX.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-926` — Task Spec Compliance Linter.
- `TASK-869` — AI Product Design Studio Skills 2026.
- `TASK-1033` — Greenhouse Floating Surface Primitive.
- `TASK-1045` — Greenhouse Motion Primitive.
- `TASK-1115` — Adaptive Card / content density contract.
- `TASK-1119` — Composition Shell hardening V1.1.

### Blocks / Impacts

- Nuevas tasks UI/UX creadas despues de este cambio.
- Tasks `to-do/` e `in-progress/` con dominio `ui`, `design-system`, `motion` o impacto visible cuando sean editadas o tomadas.
- `pnpm task:lint --changed` como primer guardrail warning-first.

### Files owned

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `scripts/ci/task-lint/parser.mjs`
- `scripts/ci/task-lint/rules.mjs`
- `scripts/ci/__tests__/task-lint.test.mjs`

## Current Repo State

### Already exists

- `TASK_TEMPLATE.md` define las zonas canonicas y el cierre de tasks.
- `TASK_PROCESS.md` define Plan Mode, Skill scan, ADR check, gates y lifecycle.
- `task-lint` ya soporta enforcement warn-first, legacy-exempt y `--changed`.
- El repo ya tiene contratos UI canonicos: Composition Shell, Adaptive Card density, Floating Surface, Motion Primitive, GVC y copy canonico.

### Gap

- El template no distingue explicitamente tasks con impacto UI/UX visible.
- Las tasks UI pueden omitir estados, microinteracciones, motion, copy source y evidencia GVC sin que el contrato lo advierta.
- No existe un addendum copiable para que el rigor UI escale por nivel (`ui-lite`, `ui-standard`, `ui-platform`).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite`
- Usuario / rol: agentes y operadores que crean o ejecutan tasks UI/UX.
- Momento del flujo: intake/planificacion de una task antes de escribir JSX o copy visible.
- Resultado perceptible esperado: la task deja claro si hay impacto UI y que evidencia visual exige.
- Friccion que debe reducir: evitar que motion, microinteracciones, estados y GVC queden como polish tardio.
- No-goals UX: no cambia ninguna superficie runtime del portal.

### Surface & system decision

- Surface: docs operativos de tasks.
- Composition Shell: `no aplica` — no hay interfaz runtime.
- Primitive decision: `one-off` — contrato documental, no componente.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: documentacion local de proceso.
- Access impact: `none`.

### State inventory

- Default: addendum copiable disponible.
- Loading: no aplica.
- Empty: no aplica.
- Error: warning `ui-ux-contract` cuando falta el contrato.
- Degraded / partial: backlog historico queda legacy-exempt/warning-first.
- Permission denied: no aplica.
- Long content: el addendum separa contrato copiable de explicacion para no inflar el template.
- Mobile / compact: no aplica.
- Keyboard / focus: no aplica.
- Reduced motion: se exige como campo para futuras tasks UI, no se implementa aqui.

### Interaction contract

- Primary interaction: crear/ejecutar una task con perfil `ui-ux`.
- Hover / focus / active: no aplica.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no aplica.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica.
- Non-goal motion: no introducir UI runtime ni labs.

### Visual verification

- GVC scenario: no aplica — docs/tooling only.
- Viewports: no aplica.
- Required captures: no aplica.
- Required `data-capture` markers: no aplica.
- Scroll-width check: no aplica.
- Accessibility/focus checks: no aplica.
- Before/after evidence: `pnpm task:lint:test` + `pnpm ops:lint --changed`.
- Known visual debt: ninguna.

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

### Slice 1 — Addendum + template/process

- Crear `docs/tasks/TASK_UI_UX_ADDENDUM.md` con niveles de rigor, bloque copiable y criterios de aceptacion UI.
- Agregar `Execution profile` y `UI impact` al template.
- Actualizar `TASK_PROCESS.md` para que Discovery/Plan Mode exijan decision UI/UX antes de escribir UI visible.

### Slice 2 — Warning-first lint

- Extender el parser de `task-lint` para leer `Execution profile` y `UI impact`.
- Agregar regla `ui-ux-contract` warning-only para tasks template que parezcan tocar UI/UX y no tengan `## UI/UX Contract`.
- Agregar tests focales para warning y caso aceptado.

### Slice 3 — Registro operativo

- Registrar `TASK-1147` en `TASK_ID_REGISTRY.md`.
- Actualizar `docs/tasks/README.md` con el nuevo siguiente ID y entrada resumida.
- Validar `pnpm task:lint:test` y `pnpm ops:lint --changed`.

## Out of Scope

- Migrar masivamente backlog historico.
- Convertir warnings UI/UX en errores.
- Cambiar skills, hooks de Codex/Claude o GVC DSL.
- Implementar UI runtime o design-system labs nuevos.

## Detailed Spec

El contrato debe modelar UI/UX como perfil de ejecucion:

- `Execution profile: standard|ui-ux`
- `UI impact: none|copy|layout|interaction|motion|primitive|flow`

Si `Execution profile: ui-ux` o `UI impact != none`, la task debe incluir `## UI/UX Contract`.
El linter debe advertir tambien cuando `Domain` contiene `ui`, `design-system`, `motion` o `accessibility`
para atrapar tasks antiguas que aun no declaren los campos.

El enforcement queda `warning-only` incluso en `--changed`; la promocion a error requiere otra task/decision.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (docs contract) -> Slice 2 (lint warning) -> Slice 3 (registry/readme/validation).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El addendum se vuelve burocratico y bloquea UI pequena | ops/ui | medium | niveles `ui-lite`, `ui-standard`, `ui-platform`; warning-first | feedback de agentes / warnings excesivos |
| El linter genera ruido sobre backlog historico | ops | medium | legacy-exempt y solo warning; no migrar `complete/` | `task:lint --active` warnings altos |
| Tasks UI nuevas siguen sin contrato | ui/quality | medium | campo en template + warning `ui-ux-contract` | `pnpm task:lint --changed` |

### Feature flags / cutover

Sin flag — cambio documental/tooling local, sin impacto runtime de produccion.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir docs del addendum/template/process | <10 min | si |
| Slice 2 | Revertir regla `ui-ux-contract` y parser fields | <10 min | si |
| Slice 3 | Revertir registro/README si se descarta la task | <10 min | si |

### Production verification sequence

1. Ejecutar `pnpm task:lint:test`.
2. Ejecutar `pnpm ops:lint --changed`.
3. Verificar que la regla nueva emite warning, no error.

### Out-of-band coordination required

N/A — repo-only governance/tooling change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe `docs/tasks/TASK_UI_UX_ADDENDUM.md` con bloque copiable y niveles `ui-lite|ui-standard|ui-platform`.
- [x] `TASK_TEMPLATE.md` declara `Execution profile`, `UI impact` y referencia el addendum.
- [x] `TASK_PROCESS.md` documenta el perfil `ui-ux`, valores de `UI impact`, migracion gradual y Discovery check.
- [x] `task-lint` advierte `ui-ux-contract` para tasks UI sin addendum y no bloquea `--changed`.
- [x] `TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedan sincronizados.

## Verification

- `pnpm task:lint:test`
- `pnpm ops:lint --changed`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] se dejo documentada la migracion gradual de backlog UI existente

## Follow-ups

- Evaluar promocion de `ui-ux-contract` de warning a error solo para tasks nuevas cuando el backlog reciente lo use consistentemente.
- Migrar como pilotos `TASK-1118`, `TASK-1095` y una task UI activa de Nexa/Design System cuando se tomen.

## Open Questions

- Ninguna para V1; el nivel de enforcement estricto queda como follow-up deliberado.

## Closure 2026-06-16

- Addendum creado: `docs/tasks/TASK_UI_UX_ADDENDUM.md`.
- Template/process actualizados con `Execution profile`, `UI impact`, migracion gradual y Discovery check UI/UX.
- `task-lint` parsea los campos nuevos y emite warning `ui-ux-contract` para tasks UI sin contrato.
- Registry/README/changelog/project_context/handoff sincronizados.
- Gates verdes: `pnpm task:lint:test` 14/14, `pnpm task:lint --task TASK-1147`, `pnpm ops:lint --changed`.
