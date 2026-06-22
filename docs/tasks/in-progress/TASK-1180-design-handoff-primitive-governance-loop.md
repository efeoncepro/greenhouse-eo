# TASK-1180 - Design Handoff x Design System Primitive Governance Loop

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `flow`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Code complete dev - migracion aplicada en Cloud SQL dev, API/UI/GVC verificados localmente; rollout staging/prod pendiente.`
- Rank: `TBD`
- Domain: `ui|platform|design-system|api|quality`
- Blocked by: `none`
- Branch: `task/TASK-1180-design-handoff-primitive-governance-loop`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Extender el Design Handoff Control Plane para que cada intencion Figma aprobada declare y gobierne su **estrategia de implementacion Design System**: `route_only`, `reuse_primitive`, `extend_primitive`, `new_primitive`, `variant_kind` o `research_required`. El cockpit debe mostrar esa decision, sus riesgos, su evidencia y sus enlaces a primitive/lab/runtime/GVC, mientras el backend expone commands/readers equivalentes para mantener Full API Parity.

## Why This Task Exists

TASK-1175/TASK-1176 dejaron el Handoff robusto como registro operativo: allowlist, snapshots Figma, owners, evidencias, links y cockpit. Pero todavia falta cerrar la sinergia mayor con el Design System: una pantalla de producto nueva no puede llegar a DEV sin decidir si reutiliza una primitive existente, si pide una variant/kind, si nace una primitive nueva con Lab/GVC/docs o si es honestamente `route_only`.

Sin este paso, el Handoff puede terminar siendo una lista bonita de paginas por implementar. Con este paso, se convierte en el **gate de gobernanza** que evita forks visuales, primitives paralelas, labs faltantes y pantallas que no dejan trazabilidad.

## Goal

- Agregar al Handoff una decision gobernada de implementacion Design System por entry.
- Exponer commands/readers para setear y auditar la decision sin depender de la UI.
- Mostrar en el cockpit una seccion clara de "Primitive governance" con warnings accionables.
- Conectar cada entry con primitive/lab route/runtime route/GVC capture/task/PR/deploy cuando aplique.
- Emitir senales de deuda cuando una entry reusable no tenga decision, lab, runtime o evidencia visual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/documentation/plataforma/design-handoff-control-plane.md` - contrato actual del Handoff.
- `docs/architecture/ui-platform/PRIMITIVES.md` - registry canonico de primitives, variants y labs.
- `docs/architecture/ui-platform/GOVERNANCE.md` - reglas de gobierno del Design System.
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` - Primitive + Variants + Kinds.
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` - Composition Shell como substrato por defecto.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` - Full API Parity y commands/readers.
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md` - GVC como evidencia visual canonica.
- `docs/tasks/in-progress/TASK-1175-design-handoff-control-plane-full-api-parity.md` - backend control plane.
- `docs/tasks/complete/TASK-1176-design-handoff-operations-cockpit-ui.md` - cockpit UI.

Reglas obligatorias:

- **NUNCA** crear un camino UI-only para aprobar la decision; debe existir command/reader gobernado.
- **NUNCA** usar el aggregate AXIS Figma como contenedor de paginas de producto.
- **SIEMPRE** mapear componentes reutilizables a primitive/variant/kind o justificar `route_only`.
- **SIEMPRE** exigir Lab + docs + GVC cuando la decision sea `new_primitive`.
- **SIEMPRE** preservar el Handoff como registro de intenciones de producto, separado del catalogo de primitives.

## Normative Docs

- `src/lib/design-system/handoff/**` - store/readers/commands actuales.
- `src/app/(dashboard)/design-system/handoff/**` - cockpit actual.
- `src/components/greenhouse/primitives/**` - source of truth de primitives reutilizables.
- `scripts/frontend/scenarios/design-system-handoff-cockpit.json` - scenario GVC existente.

## Dependencies & Impact

### Depends on

- TASK-1175 - Control Plane backend-data, snapshots y commands/readers base.
- TASK-1176 - Cockpit UI enterprise sobre el control plane.
- TASK-1120 - Registry original de Design Handoff.

### Blocks / Impacts

- Reduce deuda de primitives paralelas y pantallas one-off sin decision.
- Alimenta el Design System Catalog con trazabilidad desde intencion Figma hasta runtime.
- Mejora el contrato Full API Parity para Nexa/API Platform: el estado de implementacion DS queda consultable y mutable por comandos gobernados.

### Files owned

- `src/lib/design-system/handoff/**` - decision model, commands/readers, signals.
- `src/app/api/design-system/handoff/**` - endpoint command/read surface si aplica.
- `src/app/(dashboard)/design-system/handoff/**` - seccion UI consumer.
- `scripts/frontend/scenarios/design-system-handoff-primitive-governance.json` - GVC scenario nuevo.
- `docs/documentation/plataforma/design-handoff-control-plane.md` - Delta funcional.
- `docs/architecture/ui-platform/PRIMITIVES.md` - Delta de governance loop.

## Current Repo State

### Already exists

- Handoff entries con URL Figma, allowlist fail-closed, snapshots iniciales y verificaciones posteriores.
- Links/evidence/readiness en el control plane.
- Cockpit UI con intake, Evidence Ledger, Exception Command Center e inspector.

### Gap

- No existe decision formal de implementacion Design System por entry.
- No hay reader que liste entries sin decision primitive/lab/runtime/GVC.
- El cockpit no distingue "pagina one-off" vs "nuevo patron reusable" vs "variant/kind".
- No hay signal que alerte primitive nueva sin Lab/GVC/docs.

## UI/UX Contract

### UI brief

Crear una seccion visible en el inspector/cockpit llamada "Primitive governance" que permita ver y accionar:

- Estrategia de implementacion: `route_only`, `reuse_primitive`, `extend_primitive`, `new_primitive`, `variant_kind`, `research_required`.
- Primitive target opcional (`GreenhouseButton`, `CompositionShell`, `NexaProvenanceTrace`, etc.).
- Variant/kind cuando aplique.
- Lab route requerida para `new_primitive` o `extend_primitive`.
- Runtime route y GVC evidence requerida para cierre.
- Rationale corto y owner de la decision.
- Warnings accionables: "needs primitive decision", "new primitive without lab", "runtime route without GVC", "reusable UI marked route_only".

### UX states

- Empty state: entry propuesta sin decision -> CTA para registrar decision.
- Healthy state: decision + primitive/lab/runtime/GVC completos.
- Warning state: decision incompleta o inconsistente.
- Archived/implemented state: decision read-only, evidencia preservada.

### Visual and interaction rules

- Reusar el cockpit TASK-1176; no crear ruta paralela.
- Usar Composition Shell existente y primitives Greenhouse.
- Cero business logic en JSX: la UI consume readers/commands.
- Validar desktop y mobile con GVC, incluyendo inspector abierto y warning states.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (commands/readers gobernados, additive)
- Impacto principal: `command`
- Source of truth afectado: Design Handoff control plane
- Consumidores afectados: cockpit UI, API Platform, Nexa futuro
- Runtime target: `staging` -> `Production`

### Contract surface

- Contrato existente a respetar: handoff entries, links, evidence, snapshots.
- Contrato nuevo: implementation strategy + primitive governance decision.
- Backward compatibility: `compatible` (entries existentes quedan `decision_status=missing` o equivalente).
- Full API parity: cualquier decision que la UI pueda registrar debe poder registrarse por command gobernado.

### Data model and invariants

- Entidades: handoff entry, implementation decision, primitive/lab/runtime links, evidence.
- Invariantes:
  - `new_primitive` requiere lab route + docs target + GVC plan antes de `implemented`.
  - `reuse_primitive` requiere primitive key existente.
  - `variant_kind` requiere primitive key + variant/kind o rationale de creacion.
  - `route_only` requiere rationale y no debe ocultar patrones reutilizables.
  - `research_required` no puede cerrar como implemented sin decision final.
- Tenant/space boundary: mismo boundary que Design Handoff.
- Idempotency/concurrency: command idempotente por entry + decision version.
- Audit/outbox/history: append-only event/evidence para cambios de decision.

### Migration, backfill and rollout

- Migration posture: additive schema o typed-link reuse; discovery debe elegir la opcion mas compatible.
- Default state: entries previas aparecen como `decision_missing`.
- Backfill plan: clasificar entries existentes como `research_required` o `decision_missing` sin bloquear la UI.
- Rollback path: revert PR; datos additive no destruyen entries.
- External coordination: Product Design para criterios de decision.

### Security and access

- Auth/access gate: reusar capabilities de Handoff/Design System; si falta granularidad, agregar `design_system.handoff.primitive_decision.manage`.
- Sensitive data posture: no persistir tokens Figma ni payloads crudos.
- Error contract: fail-closed en commands, mensajes accionables.
- Abuse/rate-limit posture: commands con audit e idempotencia.

### Runtime evidence

- Local checks: unit tests de state machine/validators/readers.
- DB/runtime checks: command registra decision y reader devuelve gaps.
- Integration checks: cockpit registra decision y evidencia se ve sin reload manual.
- Reliability signals/logs:
  - `design_system.handoff.primitive_decision_missing`
  - `design_system.handoff.primitive_lab_missing`
  - `design_system.handoff.runtime_without_gvc`
  - `design_system.handoff.route_only_reuse_suspect`
- Production verification sequence: staging smoke -> GVC -> command/read smoke -> production smoke.

### Acceptance criteria additions

- [ ] Reader lista entries por decision status y gap type.
- [ ] Command registra/actualiza decision con audit e idempotencia.
- [ ] UI consume el command/reader; cero decision UI-only.

## Hybrid Execution Justification

Esta task mezcla backend-data y UI porque el valor es una sola capacidad vertical sobre el control plane ya existente: decision gobernada + visualizacion en el cockpit. Se permite mantenerla unida porque:

- Es additive sobre TASK-1175/TASK-1176.
- No cambia el source of truth del Design System ni migra primitives existentes.
- El backend se implementa primero y la UI solo consume el contrato.
- Si discovery detecta migracion riesgosa o schema amplio, debe dividirse antes de ejecutar: `TASK-1180A backend-data` y `TASK-1180B ui-ux`.

Orden interno obligatorio: contrato/backend -> tests/readers/commands -> UI consumer -> GVC/docs.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 - Decision model + discovery

Auditar el modelo actual de Handoff, links/evidence y Design System primitives. Definir si la decision se persiste como columnas additive, JSON gobernado o typed links/evidence. Documentar trade-off y preservar compatibilidad.

### Slice 2 - Commands/readers + validators

Implementar validators e invariantes para strategy/primitive/lab/runtime/GVC. Exponer reader de gaps y command para registrar decision. Agregar tests unitarios y de contrato.

### Slice 3 - Cockpit consumer

Agregar "Primitive governance" al inspector/cockpit: decision, target primitive, variant/kind, rationale, owner, warnings y evidence links. La UI no calcula invariantes; solo renderiza el reader y dispara commands.

### Slice 4 - GVC + docs + closure

Crear scenario GVC desktop/mobile para decision healthy, missing decision y warning. Actualizar docs/manuales y registrar el delta en arquitectura/ui-platform.

## Out of Scope

- Construir primitives nuevas concretas.
- Detectar automaticamente componentes Figma con IA como fuente de verdad.
- Cambiar el aggregate AXIS Figma o mezclar paginas de producto dentro de AXIS.
- Mover el Handoff fuera de `/design-system/handoff`.
- Ejecutar rollout/cutover de producto masivo.

## Detailed Spec

### Implementation strategies

| Strategy | Uso | Requisitos minimos |
|---|---|---|
| `route_only` | Pantalla one-off o composicion sin reusable nuevo | rationale + runtime route |
| `reuse_primitive` | Usa primitive existente sin extension | primitive key + runtime route + GVC |
| `extend_primitive` | Agrega variant o behavior a primitive existente | primitive key + lab route + docs + GVC |
| `new_primitive` | Nace primitive nueva | primitive proposal key + lab route + docs + GVC + owner |
| `variant_kind` | Mapea semantic kind a variant existente/nueva | primitive key + variant + kind + rationale |
| `research_required` | Todavia no se sabe | owner + due date/review note |

### Governance warnings

El reader debe devolver warnings typed, no strings sueltos:

- `primitive_decision_missing`
- `primitive_key_missing`
- `lab_route_missing`
- `runtime_route_missing`
- `gvc_evidence_missing`
- `route_only_reuse_suspect`
- `research_overdue`

### Traceability target

Cada entry debe poder responder:

- De que nodo Figma nacio.
- Que strategy Design System se eligio.
- Que primitive/variant/kind se toca.
- Donde vive el Lab.
- Donde vive la ruta runtime.
- Que GVC capture valida la implementacion.
- Que TASK/PR/deploy la cerro.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Primero backend/contract, despues UI. No shippear el inspector si el command/reader no existe.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI inventa estado no respaldado por API | design-system | medium | command/reader first, tests de contrato | review + tests |
| Decision `route_only` tapa un reusable real | design-system | medium | warning + rationale obligatorio | `route_only_reuse_suspect` |
| Nueva primitive sin Lab/GVC | ui-platform | medium | invariant antes de implemented | `primitive_lab_missing` |
| Schema excesivo para una extension | data | low | discovery puede elegir typed links/evidence | review arquitectura |

### Feature flags / cutover

- No requiere flag si es additive y compatible.
- Si se agrega capability nueva, seed/grant debe ser parte del rollout.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert docs/discovery | <5 min | si |
| 2 | revert commands/readers/schema additive | <15 min | si |
| 3 | revert UI consumer | <10 min | si |
| 4 | revert docs/scenario | <5 min | si |

### Production verification sequence

1. Staging: registrar decision para una entry existente.
2. Reader: verificar gap healthy/missing/warning.
3. UI: inspector muestra decision y warnings.
4. GVC: desktop + mobile sin overflow horizontal.
5. Production: smoke read/command con entry controlada.

### Out-of-band coordination required

- Product Design debe validar el vocabulario de strategies y los criterios de decision.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Cada handoff entry puede tener strategy Design System gobernada.
- [x] Reader expone decision status, primitive target y warnings typed.
- [x] Command actualiza decision con audit, outbox event y access gate.
- [x] Cockpit muestra "Primitive governance" sin logica UI-only.
- [x] `new_primitive` no puede cerrar como implemented sin Lab + docs + GVC.
- [x] Scenario GVC desktop/mobile valida inspector healthy y ledger con warning state.
- [x] Docs de Handoff y UI Platform actualizadas.

## Verification

- `pnpm exec vitest run src/lib/design-system/handoff/state-machine.test.ts src/lib/design-system/handoff/store.test.ts src/lib/reliability/queries/design-handoff-control-plane-signals.test.ts src/lib/tenant/designer-role.test.ts` -> 33/33 passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` -> exit 0.
- `pnpm exec eslint <TASK-1180 focal files>` -> exit 0.
- `pnpm pg:connect:migrate` -> migracion TASK-1180 aplicada en Cloud SQL dev + Kysely types regenerados.
- `pnpm pg:connect:status` -> No migrations to run.
- API smoke local con agent session: `GET /api/design-system/handoff` -> HTTP 200; `PATCH /api/design-system/handoff/dh-task-1180-gvc-ready/primitive-decision` -> HTTP 200, `decisionStatus=ready`.
- `pnpm fe:capture design-system-handoff-primitive-governance --env=local` -> OK desktop/mobile; evidencia `.captures/2026-06-20T02-49-57_design-system-handoff-primitive-governance`.
- `pnpm design:lint` -> 0 errors / 0 warnings.
- `pnpm route-reachability-gate` -> 209 routes, 0 orphans.
- `pnpm task:lint --task TASK-1180` -> template=1, errors=0, warnings=0.
- `pnpm qa:gates --changed --agent codex --task TASK-1180 --ui --runtime --auth --data --docs` -> advisory pass con gates sugeridos.
- `pnpm ops:lint --changed` -> bloqueado por drift ajeno en TASK-1181 (`Lifecycle=to-do` bajo `in-progress`, registry apunta a `to-do`).

## Closing Protocol

- [x] `Lifecycle` sincronizado como `in-progress` por rollout staging/prod pendiente.
- [x] archivo en la carpeta correcta.
- [x] `docs/tasks/README.md` sincronizado.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [x] `Handoff.md` + `changelog.md`.
- [x] docs Handoff/UI Platform/manual actualizadas.
- [x] GVC evidence archivada y revisada.
- [x] queda rollout real pendiente: cierre operativo `code complete, rollout pendiente`.
