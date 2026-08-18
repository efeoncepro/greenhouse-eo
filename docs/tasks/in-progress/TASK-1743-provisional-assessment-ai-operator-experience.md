# TASK-1743 — Provisional Assessment AI Operator Experience

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1743-provisional-assessment-ai-operator-experience.md`
- Flow: `docs/ui/flows/TASK-1743-provisional-assessment-ai-operator-experience.md`
- Motion: `docs/ui/motion/TASK-1743-provisional-assessment-ai-operator-experience.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `En ejecución coordinada; implementación del consumer comienza después del DTO/reader de TASK-1742`
- Rank: `2`
- Domain: `hr`
- Blocked by: `TASK-1742`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende el workbench de TASK-1738 para presentar una evaluación IA provisional claramente separada del score efectivo: global/competencias, cobertura, evidencia y excepciones, solo para operadores. La pantalla debe ahorrar corrección rutinaria sin insinuar validación humana ni filtrar resultados al postulante.

## Why This Task Exists

Hoy las proposals viven en la cola técnica y barras/radar solo reflejan scores efectivos. Sin una jerarquía visual honesta, el operador interpreta “pendiente” como ausencia de IA o puede confundir una propuesta no calibrada con un resultado final.

## Goal

- Mostrar una lectura IA inmediata y útil para todos los tests enviados.
- Separar de forma inequívoca evaluación provisional, score efectivo y excepciones pendientes.
- Conservar accesibilidad, responsive, anti-anchoring y cero superficie candidate-facing.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`
- `DESIGN.md`

Reglas obligatorias:

- Reutilizar `AssessmentAiRunWorkbench` y primitives/tokens existentes; no crear dashboard, card o chart paralelo.
- “Provisional” nunca adopta copy, color o status de un score efectivo/confirmado.
- Candidate/public/email permanecen sin score, rationale, confianza o review state.
- UI consume el DTO/reader de TASK-1742 y no deriva autoridad de negocio en el browser.

## Normative Docs

- `docs/tasks/complete/TASK-1738-assessment-ai-review-workbench.md`
- `docs/ui/wireframes/TASK-1738-assessment-ai-review-workbench.md`
- `docs/operations/runbooks/assessment-ai-scoring-rollout.md`
- `src/lib/copy/hiring.ts`

## Dependencies & Impact

### Depends on

- TASK-1742 — reader/DTO provisional global, cobertura y estados de riesgo.
- TASK-1738 — workbench, anti-anchoring, confirm/cancel y GVC baseline.

### Blocks / Impacts

- Application 360 → Evaluación → assessment card/workbench.
- No modifica rutas públicas ni el drawer manual existente.

### Files owned

- `src/views/greenhouse/hiring/AssessmentAiRunWorkbench.tsx`
- `src/views/greenhouse/hiring/Application360View.tsx`
- `src/lib/copy/hiring.ts`
- `src/views/greenhouse/hiring/__tests__/**assessment-ai**`
- `scripts/frontend-capture/scenarios/**assessment-ai**`
- `docs/ui/reviews/TASK-1743-*`

## Current Repo State

### Already exists

- Workbench de TASK-1738 con cola risk-ordered, muestra ciega, coverage sticky, confirm/cancel y estados parciales honestos.
- Barras/radar efectivos y primitive/chart responsive ya corregidos.

### Gap

- No existe presentación de global/competencias provisionales separada del score efectivo ni copy/estado para `global_provisional`.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `Application 360 / src/views/greenhouse/hiring`
- Future candidate home: `portal`
- Boundary: `ProvisionalAssessmentAiProjection DTO de TASK-1742; workbench es consumer read-only`
- Server/browser split: `reader/auth/provider permanecen server-only; Client Component recibe DTO browser-safe y callbacks existentes`
- Build impact: `none; reutiliza MUI/Vuexy/AXIS y chart stack existente`
- Extraction blocker: `route composition y session/capability del portal`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: `operador interno de Hiring autorizado`
- Momento del flujo: `Application 360 → Evaluación, después de que el candidato envía el test`
- Resultado perceptible esperado: `entender en segundos qué evaluó la IA, qué es provisional y qué necesita atención`
- Friccion que debe reducir: `puntuar manualmente cada respuesta o interpretar ausencia de score como ausencia de procesamiento`
- No-goals UX: `candidate-facing, ranking, decisión, stage move, edición de rúbrica o nuevo destino de navegación`

### Surface & system decision

- Surface: `assessment card + AssessmentAiRunWorkbench existente`
- Nav placement: `none — no agrega destino`
- Composition Shell: `no aplica — surface anidada en Application 360 existente`
- Primitive decision: `extend — AssessmentAiRunWorkbench y AdaptiveCard existentes`
- Adaptive density / The Seam: `aplica — stack a una columna en 390px, coverage y score sin overflow`
- Floating/Sidecar/Dialog decision: `no nuevo floating; conservar drawer/manual existente como fallback`
- Copy source: `src/lib/copy/hiring.ts`
- Access impact: `none — hereda hiring.application.read/assessment AI reader de TASK-1742`

### State inventory

- Default: `provisional completo con global, competencias, coverage y CTA/estado de revisión`
- Loading: `skeleton reservado sin reflow`
- Empty: `run aún no iniciado o no hay respuestas IA-eligible, con causa explícita`
- Error: `error recuperable + Reintentar, nunca “sin evaluación”`
- Degraded / partial: `abstenciones/fallos/cobertura parcial y score parcial inequívoco`
- Permission denied: `sin contenido de propuestas`
- Long content: `rationale/evidencia colapsable con wrap y lectura completa accesible`
- Mobile / compact: `una columna, controles 44px, sin scroll horizontal`
- Keyboard / focus: `orden DOM natural, expansión y retry operables por teclado, focus visible`
- Reduced motion: `sin motion nueva; estados instantáneos y skeleton sin animación esencial`

### Interaction contract

- Primary interaction: `leer provisional; abrir evidencia/excepción; usar confirmación existente solo cuando el modo lo permita`
- Hover / focus / active: `tokens canónicos y focus-visible`
- Pending / disabled: `acciones existentes deshabilitadas con razón textual durante request`
- Escape / click-away: `conservar contrato del drawer existente`
- Focus restore: `regresa al item que abrió el detalle`
- Latency feedback: `loading inline + estado de run; no toast como única evidencia`
- Toast / alert behavior: `alert inline para estado provisional/degradado; toast solo para acciones existentes`

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: `none nueva`
- Layout morph: `none`
- Stagger: `none`
- Timing / easing token: `n/a`
- Reduced-motion fallback: `equivalencia total por ausencia de motion nueva`
- Non-goal motion: `counters animados, radar animado o celebraciones de score`

### Implementation mapping

- Route / surface: `/agency/hiring/applications/[applicationId]?tab=assessment`
- Primitive / variant / kind: `AssessmentAiRunWorkbench extendido + AdaptiveCard/StatusChip/Progress primitives existentes`
- Component candidates: `AssessmentAiRunWorkbench`, subview `ProvisionalAssessmentSummary` local si reduce complejidad`
- Copy source: `src/lib/copy/hiring.ts`
- Data reader / command: `ProvisionalAssessmentAiProjection de TASK-1742; commands existentes de resolve/confirm/cancel`
- API parity: `UI solo consume App API/reader canónico`
- Access / capability: `hiring.application.read + capability IA existente`
- States to implement: `loading|empty|provisional|partial|abstained|failed|stale|effective|permission-denied`

### GVC scenario plan

- Scenario file: `scripts/frontend-capture/scenarios/task-1743-provisional-assessment-ai.ts`
- Route: `/agency/hiring/applications/[known-fixture]?tab=assessment`
- Viewports: `1440x1100, 390x844`
- Quality profile: `premium`
- Required steps: `capturar provisional completo, parcial/excepciones, effective coexistente, error/retry y mobile`
- Required captures: `desktop full card; desktop workbench; mobile summary; mobile exception; permission/error`
- Required `data-capture` markers: `assessment-provisional-summary`, `assessment-ai-coverage`, `assessment-ai-exceptions`
- Assertions: `copy provisional visible; score efectivo no sustituido; candidate route sin contenido; no clipped rationale`
- Scroll-width checks: `documentElement.scrollWidth === clientWidth en ambos viewports`
- Reduced-motion / focus evidence: `keyboard walkthrough + prefers-reduced-motion capture`
- Review dossier: `docs/ui/reviews/TASK-1743-provisional-assessment-ai-operator-experience.scorecard.json`
- Baseline decision / surface ID: `TASK-1738 workbench baseline; extend, no redesign`

### Design decision log

- Decision: `presentar una capa provisional dentro del workbench, visual y semánticamente separada del score efectivo`
- Alternatives considered: `usar barras/radar efectivo; modal separado; dashboard nuevo; ocultar propuestas hasta confirmación`
- Why this pattern: `reduce toil sin falsear autoridad y conserva el contexto de Application 360`
- Reuse / extend / new primitive: `extend AssessmentAiRunWorkbench; no primitive nueva`
- Open risks: `densidad con 9 competencias y coexistencia provisional/effective; resolver con summary compacto y disclosure progresivo`

### Visual verification

- GVC scenario: `task-1743-provisional-assessment-ai`
- Viewports: `1440x1100, 390x844`
- Required captures: `default, partial, error, mobile, reduced-motion`
- Required `data-capture` markers: `assessment-provisional-summary`, `assessment-ai-coverage`, `assessment-ai-exceptions`
- Scroll-width check: `sin overflow de página`
- Accessibility/focus checks: `teclado, focus visible, headings/aria, contraste AA`
- Before/after evidence: `TASK-1738 effective-only vs TASK-1743 provisional+effective`
- Known visual debt: `none accepted at close`
- Visual scorecard: `docs/ui/reviews/TASK-1743-provisional-assessment-ai-operator-experience.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Slice 1 — Copy y summary provisional

- Añadir copy reusable y summary operator-only con estado, global provisional, coverage y separación del efectivo.
- Reutilizar primitives y tokens existentes; no agregar chart o card paralela.

### Slice 2 — Competencias, evidencia y excepciones

- Mostrar competencias provisionales, abstenciones/fallos y rationale/evidence con progressive disclosure.
- Mantener muestra ciega y anti-anchoring del workbench existente.

### Slice 3 — Estados, responsive y accesibilidad

- Implementar loading/empty/error/partial/stale/permission/mobile y keyboard/focus/reduced-motion.
- Evitar clipping, truncado semántico y overflow horizontal.

### Slice 4 — GVC y cierre

- Capturar desktop/mobile/estados, puntuar contra premium threshold y corregir hallazgos.
- Probar la ruta candidate-facing y el DOM para ausencia total de resultados.

## Out of Scope

- Cambiar score efectivo, rollup, rúbrica, risk policy o provider.
- Crear nueva navegación, dashboard, modal, chart library o primitive platform-level.
- Ranking, recomendación, stage/decision/email/test assignment.
- Cualquier resultado o explicación al postulante.

## Detailed Spec

El encabezado del assessment prioriza el estado real. Cuando solo existe provisional, presenta “Evaluación provisional de IA” y “No incorporada al resultado efectivo”; cuando coexiste un score efectivo, ambos se distinguen por label y provenance, sin sumar ni fusionar visualmente. Coverage siempre declara numerador/denominador y causas faltantes.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-1742 reader verde → Slice 1 → Slice 2 → Slice 3 → Slice 4. No JSX con fixtures inventadas una vez disponible el DTO real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Provisional parece efectivo | UI/hiring | medium | jerarquía/copy/provenance explícita + GVC | operator confusion test |
| Resultado filtra a candidato | public/privacy | low | sin cambios públicos + probes/DOM denylist | contract test rojo |
| Densidad/overflow | UI/mobile | medium | adaptive stack + wrap + scroll-width | GVC/assertion |
| Anti-anchoring regresa | governance | medium | conservar blind reader/DOM test | proposal visible en sample |

### Feature flags / cutover

- La UI provisional se muestra solo cuando el reader de TASK-1742 reporta modo permitido y run válido.
- Revert: ocultar consumer provisional; workbench y score efectivo de TASK-1738 permanecen intactos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | desactivar render provisional | <5 min | sí |
| Slice 2 | volver a workbench TASK-1738 | <5 min | sí |
| Slice 3 | revert UI sin tocar datos | <5 min | sí |
| Slice 4 | no promover si GVC falla | inmediato | sí |

### Production verification sequence

1. Tests component/contract con DTO real en local.
2. GVC staging desktop/mobile y candidate negative probe.
3. Activar reader/backend provisional con UI ya desplegada y hidden cuando OFF.
4. Verificar Lucero y un nuevo submission real; confirmar copy/coverage y cero score efectivo falso.

### Out-of-band coordination required

N/A — la coordinación de flags/runtime vive en TASK-1742; esta task es consumer portal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Execution profile: ui-ux`, `UI impact: layout`, `UI ready: yes` y wireframe pasan gates focales.
- [ ] Reutiliza/extiende `AssessmentAiRunWorkbench`; no crea primitive, dashboard o chart paralelo.
- [ ] El copy reusable vive en `src/lib/copy/hiring.ts` y distingue provisional de efectivo sin ambigüedad.
- [ ] Global/competencias/cobertura/evidencia/excepciones se muestran con numeradores y estados honestos.
- [ ] Loading/empty/error/degraded/permission/long-content/mobile/keyboard/focus quedan cubiertos.
- [ ] La muestra ciega conserva anti-anchoring y la propuesta no llega al DOM antes del juicio.
- [ ] Candidate/public/email negative probes prueban cero score/rationale/confianza/review state.
- [ ] GVC premium desktop + 390px pasa score threshold, contraste/focus y `scrollWidth === clientWidth`.
- [ ] No hay ranking, recomendación, stage move, decisión, email, test assignment, MCP ni B2B access.

## Verification

- `pnpm task:lint --task TASK-1743`
- `pnpm ui:wireframe-check --task TASK-1743`
- `pnpm ui:readiness-check --task TASK-1743`
- tests focales de workbench/Application 360/candidate anti-leak
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm qa:gates --changed`
- `pnpm fe:capture task-1743-provisional-assessment-ai --env=staging`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] El scorecard GVC y las capturas de rollout real quedaron enlazados.

## Follow-ups

- Ninguno para provisional; `calibrated_batch` pertenece al gate backend de TASK-1742.

## Open Questions

- Ninguna: el resultado permanece operator-only y no materializa score efectivo.
