# TASK-1247 — Growth AI Visibility: Admin Review UI

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
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|ui|reliability`
- Blocked by: `TASK-1244`
- Branch: `task/TASK-1247-growth-ai-visibility-admin-review-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la superficie interna para operar el gate humano de `review_required`: cola de reportes pendientes, detalle de evidencia, preview publico seguro y acciones aprobar/rechazar consumiendo los comandos de `TASK-1244`. Convierte el backend de review en una operacion usable por Growth/Marketing Ops.

## Why This Task Exists

`TASK-1244` declara explicitamente que la UI admin queda como follow-up. Sin esta task, el sistema puede tener comandos approve/reject pero el operador no tiene una ruta enterprise para revisar reportes antes del release publico.

## Goal

- Crear `/admin/growth/ai-visibility/review` o integrar la cola en `/admin/growth/ai-visibility`.
- Mostrar evidencia interna suficiente para decidir sin filtrar raw innecesario.
- Ejecutar approve/reject via comandos gobernados, con estados de pending/success/error y audit visible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §10 admin/control plane, §11 API parity.
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1244-growth-ai-visibility-admin-evidence-review.md`

Reglas obligatorias:

- La UI no aprueba por si sola; consume `approveAiVisibilityReport`/`rejectAiVisibilityReport`.
- No mostrar el DTO publico como unica evidencia: el reviewer necesita razones internas bounded.
- No crear dialogs/drawers paralelos si `AdaptiveSidecar` o `CompositionShell` resuelven el flujo.
- Copy visible en `src/lib/copy/growth.ts` o archivo canonico de copy del dominio.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`

## Dependencies & Impact

### Depends on

- `TASK-1244` — reader de cola y comandos approve/reject.
- `TASK-1238`/`TASK-1227` — razones `review_required`.
- `TASK-1239` — publish honra aprobacion.

### Blocks / Impacts

- Desbloquea operacion humana del gate de seguridad para launch.
- Reduce dependencia de APIs/CLI para revisar reportes.

### Files owned

- `src/app/(dashboard)/admin/growth/ai-visibility/**` [verificar route group vigente]
- `src/views/growth/ai-visibility/admin/**`
- `src/lib/copy/growth.ts`
- `scripts/frontend/scenarios/growth-ai-visibility-admin-review.*` [verificar extension DSL]

## Current Repo State

### Already exists

- Endpoints admin de runs/report/score/publish bajo `src/app/api/admin/growth/ai-visibility/**`.
- Primitives de Composition Shell, Adaptive Sidecar, Loading Surface y command feedback.

### Gap

- No existe una UI admin de review queue ni approve/reject.
- `TASK-1244` deja la UI como follow-up.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno Growth/Marketing Ops o admin Efeonce.
- Momento del flujo: reporte escalado a `review_required` antes de release publico.
- Resultado perceptible esperado: el operador entiende el riesgo, compara evidencia, aprueba/rechaza y ve feedback auditable.
- Friccion que debe reducir: revisar sin saltar entre SQL/API/reportes crudos.
- No-goals UX: editar scoring, reescribir respuestas provider, configurar prompt packs.

### Surface & system decision

- Surface: `/admin/growth/ai-visibility/review` o child del admin AI Visibility existente.
- Composition Shell: `aplica` — lista/cola + detalle/sidecar.
- Primitive decision: `reuse` — CompositionShell, AdaptiveSidecar, GreenhouseAsyncActionButton, GreenhouseCommandFeedback, tables/cards existentes.
- Adaptive density / The Seam: `aplica` — filas/cards de cola deben condensar en sidebars y mobile.
- Floating/Sidecar/Dialog decision: sidecar para detalle; Dialog solo si rechazo requiere confirmacion destructiva/legal.
- Copy source: `src/lib/copy/growth.ts`
- Access impact: `entitlements` — capability `growth.ai_visibility.report.review` ya definida por TASK-1244.

### State inventory

- Default: cola con pendientes + detalle seleccionado.
- Loading: skeleton/loader de cola y detalle.
- Empty: no hay reportes pendientes.
- Error: reader falla o comando rechaza.
- Degraded / partial: evidencia incompleta o run partial.
- Permission denied: sin capability `report.review`.
- Long content: evidencia/reasons scroll interno, no pagina horizontal.
- Mobile / compact: cola y detalle apilados/drawer.
- Keyboard / focus: foco al detalle y botones, aria-live para resultado.
- Reduced motion: sin transiciones obligatorias.

### Interaction contract

- Primary interaction: seleccionar reporte -> revisar -> aprobar/rechazar.
- Hover / focus / active: estados visibles en filas y botones.
- Pending / disabled: comandos disable mientras ejecutan, anti doble submit.
- Escape / click-away: sidecar cierra si no hay comando pending.
- Focus restore: vuelve a fila revisada tras accion/cierre.
- Latency feedback: pending persistente con command feedback.
- Toast / alert behavior: feedback persistente, no solo toast efimero.

### Motion & microinteractions

- Motion primitive: `Motion|framer layout|CSS`
- Enter / exit: entrada ligera del detalle.
- Layout morph: Composition Shell si aplica.
- Stagger: opcional para lista.
- Timing / easing token: tokens del design system.
- Reduced-motion fallback: sin stagger/morph.
- Non-goal motion: animacion decorativa.

### Visual verification

- GVC scenario: `growth-ai-visibility-admin-review`
- Viewports: desktop + 390px.
- Required captures: empty, cola con detalle, command pending/success/error.
- Required `data-capture` markers: `admin-review-queue`, `admin-review-detail`, `admin-review-actions`.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: focus order, aria labels, keyboard action.
- Before/after evidence: N/A pagina nueva.
- Known visual debt: depende del route shell admin existente.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo; consume reader/commands de `TASK-1244`
- Consumidores afectados: UI admin de review
- Runtime target: `local|staging`

### Contract surface

- Contrato existente a respetar: cola reader + `approveAiVisibilityReport`/`rejectAiVisibilityReport` de `TASK-1244`.
- Contrato nuevo o modificado: ninguno; esta task no crea backend nuevo.
- Backward compatibility: `not applicable`
- Full API parity: la UI es cliente del primitive server-side, sin logica de aprobacion local.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna por esta task.
- Invariantes que no se pueden romper:
  - La UI no auto-aprueba ni muta estado fuera de los comandos gobernados.
  - La UI no filtra raw provider text completo si el reader no lo expone.
- Tenant/space boundary: interno/admin, capability definida por `TASK-1244`.
- Idempotency/concurrency: delegada al command; UI deshabilita doble submit mientras pending.
- Audit/outbox/history: delegada al command de `TASK-1244`; UI muestra resultado/audit cuando el reader lo exponga.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: route oculta o permission denied hasta capability/grant de `TASK-1244`.
- Backfill plan: none.
- Rollback path: revert route/nav o ocultar surface.
- External coordination: rol interno con capability review.

### Security and access

- Auth/access gate: session interna + capability `growth.ai_visibility.report.review`.
- Sensitive data posture: evidencia interna bounded; no publico.
- Error contract: mapear errores canonicos del API a estados UI sanitizados.
- Abuse/rate-limit posture: interno autenticado; no public abuse surface.

### Runtime evidence

- Local checks: UI tests/focal tests.
- DB/runtime checks: fixture o staging con reporte `review_required`.
- Integration checks: approve/reject contra API de `TASK-1244`.
- Reliability signals/logs: revisar signals del backend de review si existen.
- Production verification sequence: staging primero; prod via rollout de EPIC-020.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Review queue surface

- Crear ruta admin con cola de `review_required` pendientes desde el reader de `TASK-1244`.
- Estados loading/empty/error/permission.

### Slice 2 — Evidence detail + preview

- Mostrar razones de review, accuracy findings internas bounded, score/report preview y snapshot/public preview si aplica.
- Evitar raw provider text completo salvo que el reader interno lo permita explicitamente.

### Slice 3 — Approve/reject commands

- Botones gobernados con `GreenhouseAsyncActionButton`/feedback.
- Rechazo exige razon; approval/rejection actualiza cola y detalle.

### Slice 4 — GVC + a11y

- Scenario GVC desktop/mobile con estados clave.
- Scroll-width, focus y reduced-motion.

## Out of Scope

- Backend de review (`TASK-1244`).
- Public page (`TASK-1241`).
- Cambiar scoring/review gates.
- Bulk approve o auto-approve.

## Detailed Spec

La UI debe ser un consumer del contrato `TASK-1244`: lista pendientes, lee detalle, ejecuta approve/reject. Debe usar Composition Shell como substrato y sidecar/inspector para preservar contexto. El reviewer necesita ver suficiente evidencia para decidir, pero la surface no debe normalizar ni recalcular el score.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. No conectar acciones antes de tener estados de error/pending.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Operador aprueba sin contexto suficiente | safety | medium | evidencia/reasons visibles + preview | rechazos post-publicacion |
| Accion duplicada | data quality | low | command idempotente + pending disabled | command conflict |
| UI filtra raw sensitive evidence | privacy/legal | medium | bounded reader + copy interna | code review/GVC |
| Overflow mobile en admin dense UI | UI | medium | Composition Shell + scroll-width check | GVC |

### Feature flags / cutover

- Gated por capability `growth.ai_visibility.report.review`.
- Puede ocultarse de nav hasta que `TASK-1244` este desplegada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert route/nav | <5 min | si |
| Slice 2 | revert detail panel | <5 min | si |
| Slice 3 | remove actions/disable buttons | <5 min | si |
| Slice 4 | revert visual polish | <5 min | si |

### Production verification sequence

1. Staging con un `review_required` real o fixture seeded.
2. Operador con capability ve cola/detalle.
3. Approve -> publish permitido; reject -> publish 409.
4. GVC desktop/mobile mirado.

### Out-of-band coordination required

- Rol interno/usuarios con capability de review.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: flow`.
- [ ] UI consume reader/commands de `TASK-1244`, sin logica de aprobacion local.
- [ ] Cola, detalle, preview y acciones approve/reject cubren loading/empty/error/permission/pending.
- [ ] Copy reusable vive en `src/lib/copy/*`.
- [ ] GVC desktop+mobile capturado y mirado; `scrollWidth==clientWidth`.
- [ ] Focus/keyboard/reduced-motion validados.
- [ ] No se filtra raw provider text o accuracy findings al publico; esta surface es interna.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-ai-visibility-admin-review --env=staging`
- `pnpm task:lint --task TASK-1247`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados si aplica

## Follow-ups

- Notificaciones Teams/email al reviewer cuando entra un reporte pendiente.
- Bulk triage si el volumen lo justifica.

## Open Questions

1. ¿La surface vive como ruta dedicada `/review` o dentro del detalle de run existente? Propuesta: ruta dedicada con deep-link al detalle.
