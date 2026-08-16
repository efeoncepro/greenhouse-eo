# TASK-1721 — Governed Hiring Selection Journey Orchestrator

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command|migration|sync`
- Epic: `EPIC-011`
- Status real: `Diseño; existen decisión/handoff/activation manuales, pero orchestration contract y ADR siguen pendientes de aceptación`
- Rank: `TBD`
- Domain: `hr|agency|identity|data|ops`
- Blocked by: `TASK-1603`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea un recorrido durable y gobernado para que una confirmación humana seleccione una postulación exacta y el
sistema coordine, sin duplicar business logic, la decisión canónica, el correo, el `HiringHandoff` y la activación
posterior. La experiencia es una sola operación rastreable, pero el contrato no finge una transacción distribuida:
la decisión es atómica; los pasos posteriores forman una saga idempotente, reanudable y observable.

El orquestador avanza automáticamente sólo por checkpoints seguros. Se detiene ante aprobación de handoff,
conflicto de identidad, datos legales/intake, readiness o una capability ausente; nunca auto-contrata, auto-aprueba,
auto-fusiona identidades, crea payroll/access ni rechaza a los demás candidatos.

## Why This Task Exists

El runtime ya posee piezas correctas pero separadas: `decideHiringApplication` persiste la decisión y su outbox en
una transacción; un consumer materializa `HiringHandoff`; People aprueba el handoff; y el servicio de activación
revisa, crea/promueve `member`, abre onboarding y completa sólo cuando Workforce confirma readiness. Para un humano
o agente, el recorrido queda fragmentado en varias superficies y no existe un run que explique qué ocurrió, qué
falta, quién debe actuar o cómo reconciliar un timeout parcial.

Envolver todos esos dominios en una única transacción PostgreSQL sería falso e inseguro: intervienen consumers,
correo, estados humanos y comandos con capabilities distintas. También sería incorrecto reimplementar esos pasos
dentro de Hiring. Esta task agrega coordinación durable sobre commands existentes y preserva sus dueños.

## Goal

- Exponer `propose → confirm → status → advance/cancel` como primitive server-side reutilizable por UI, Nexa y MCP.
- Mantener la selección exacta como decisión humana y atómica mediante `decideHiringApplication`.
- Registrar un run durable con checkpoints, actores, authority/effect digest, outcomes, reintentos y siguiente acción.
- Avanzar automáticamente por materialización/readbacks seguros y detenerse en cada boundary de aprobación.
- Reconciliar decisiones, handoffs, email delivery y activación sin borrar historia ni repetir side effects.
- Diferenciar explícitamente `internal_hire`, `staff_augmentation` y destinos no soportados.

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
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Seleccionar exige una aplicación exacta y confirmación humana. Ningún score, assessment, IA o agente decide.
- `decideHiringApplication` conserva ownership de la decisión. El journey no escribe directamente
  `hiring_application`, no inventa un segundo decision history y no emite un evento sustituto.
- `HiringHandoff` se materializa desde `hiring.application.decided`; el journey espera/readback y reconcilia. No lo
  crea por SQL ni asume que el consumer ya corrió.
- Selección confirmada no equivale a aprobación de handoff. Esa transición exige su capability y autoridad propias.
- La selección tampoco autoriza por anticipado revisión HR, creación/promoción de `member`, onboarding, intake,
  payroll, access, contrato ni placement.
- El orquestador ejecuta sólo commands canónicos y registra resultados observables; no business rules duplicadas.
- Un fallo después de la decisión no revierte ni elimina la selección. El run queda `blocked`/`failed` y reconcilia.
- Una re-decisión/supersesión crea o reconcilia una nueva versión; nunca muta historia para aparentar rollback.
- No se rechazan, archivan ni mueven automáticamente otras aplicaciones. Opening capacity y cierre de cohorte son
  policy fuera de esta task.
- El correo de selección es reactivo a la decisión; `decision_recorded` no se representa como `email_sent`.
- CV, assessment y notas son inputs de preview allowlisted; no se copian al aggregate de journey.
- El camino `internal_hire` puede llegar hasta onboarding/readiness. `staff_augmentation` se detiene en el boundary
  del owner de placement hasta que exista un command canónico explícitamente integrado.

## Normative Docs

- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- `docs/tasks/complete/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- `docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md`
- `docs/tasks/complete/TASK-1368-hiring-activation-lane-ui.md`
- `docs/tasks/complete/TASK-1689-hiring-lifecycle-transactional-emails.md`
- `docs/tasks/to-do/TASK-1603-hiring-quality-gate-opening-binding.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/hiring/decide.ts`: decisión transaccional, snapshot, history y `hiring.application.decided`.
- `src/lib/hiring/handoff/transition.ts` y `src/lib/sync/projections/hiring-handoff-materialize.ts`.
- `src/lib/workforce/hiring-activation/service.ts`, `readers.ts`, `types.ts` y `resolve-blocker.ts`.
- `src/lib/hiring/notifications/send.ts` y el delivery ledger de la plataforma email.
- `TASK-1603`: completeness/evidence gate debe quedar operativo antes de habilitar confirm de selección.
- ADR/delta aceptado para ownership, saga, authority boundaries, states, recovery y branch por destino.

### Blocks / Impacts

- `TASK-1722`: adapter MCP delegado consume exclusivamente estos commands/readers.
- Nexa/Application 360 pueden consumir el mismo preview/status en un follow-up UI, sin duplicar orchestration.
- Reliability/Platform Health recibe stuck/failed/uncertain journey signals.
- El recorrido actual de Activation Lane permanece válido y puede operar el mismo handoff/run en paralelo seguro.

### Files owned

- `src/lib/hiring/selection-journey/types.ts` *(nuevo)*
- `src/lib/hiring/selection-journey/store.ts` *(nuevo)*
- `src/lib/hiring/selection-journey/service.ts` *(nuevo)*
- `src/lib/hiring/selection-journey/readers.ts` *(nuevo)*
- `src/lib/hiring/selection-journey/reconcile.ts` *(nuevo)*
- `src/lib/hiring/selection-journey/index.ts` *(nuevo)*
- `src/lib/sync/projections/hiring-selection-journey.ts` *(nuevo)*
- `src/lib/reliability/queries/hiring-selection-journey-stuck.ts` *(nuevo)*
- `src/app/api/hiring/applications/[id]/selection-journey/propose/route.ts` *(nuevo)*
- `src/app/api/hiring/selection-journeys/[runId]/confirm/route.ts` *(nuevo)*
- `src/app/api/hiring/selection-journeys/[runId]/route.ts` *(nuevo)*
- `src/app/api/hiring/selection-journeys/[runId]/advance/route.ts` *(nuevo)*
- `src/app/api/hiring/selection-journeys/[runId]/cancel/route.ts` *(nuevo)*
- `migrations/*task-1721*hiring-selection-journey*.sql` *(nuevo; nombre timestamp en ejecución)*
- arquitectura, functional docs, manual y event/capability catalogs afectados

## Current Repo State

### Already exists

- `decideHiringApplication` bloquea la aplicación y persiste decision/history/outbox en una transacción.
- El consumer de handoff re-lee la aplicación y materializa una fila única por application con supersesión guardada.
- `transitionHiringHandoff` aplica state machine, audit y capability `hiring.handoff.approve`.
- Hiring Activation tiene estados, commands y blockers explícitos; conflictos de identidad fallan cerrados.
- El email `hiring_decision_selected` consume el evento y deduplica por delivery ledger.
- Application 360 y Activation Lane permiten operar manualmente los pasos existentes.
- Estos primitives no forman un journey: ninguna ruta/provider MCP coordina la cadena, y el consumer email sólo
  acredita delivery por ledger. El release `0fe2420ed894` añadió la alerta interna de assessment submitted, no un
  selector automático ni evidencia de recorrido real candidato-a-activación.

### Gap

- No existe aggregate/read model que siga el recorrido completo desde propuesta de selección hasta activación.
- No existe effect digest/authority que ligue el preview de una selección con su ejecución exacta.
- No existe primitive que continúe sólo hasta el próximo gate humano y reporte `nextRequiredAction`.
- No existe reconciler que recupere decisión exitosa + checkpoint fallido, consumer tardío o outcome incierto.
- No existe status unificado que distinga decisión, handoff, correo, activation y readiness.
- No existe señal de stuck journey ni prueba sintética de recorrido completo con pausas/reintentos.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: dominio Hiring/Workforce compartido en `src/lib`, routes Vercel y consumer/reconciler en ops-worker
- Future candidate home: `domain-package`
- Boundary: `HiringSelectionJourney` coordina por IDs, commands y readers públicos de dominio; cada aggregate dueño
  conserva sus writes, transacciones, capabilities y audit
- Server/browser split: proposal authority, effect digest, PII, orchestration, DB y commands son server-only; consumers
  reciben DTO allowlisted con estado, blocker y siguiente acción
- Build impact: `none` — lógica TypeScript/SQL sobre infraestructura existente, sin dependencia pesada
- Extraction blocker: saga cruza transacción Hiring, consumer ops-worker, email y Workforce; no se extrae hasta tener
  contratos de commands/events y reconciliación estables

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command|migration|sync`
- Source of truth afectado: nueva coordinación durable; las verdades de decisión, handoff, email y workforce siguen
  en sus aggregates/ledgers existentes
- Consumidores afectados: Hiring Desk, Nexa, MCP, Activation Lane, ops-worker y Platform Health
- Runtime target: Vercel + PostgreSQL + ops-worker compartido staging/production

### Contract surface

- Contrato existente a respetar: `decideHiringApplication`, `transitionHiringHandoff`, Hiring Activation commands,
  event catalog/outbox, email delivery ledger y capabilities vigentes
- Contrato nuevo o modificado: proposal/run/checkpoint aggregate; commands `proposeHiringSelectionJourney`,
  `confirmHiringSelectionJourney`, `advanceHiringSelectionJourney`, `cancelHiringSelectionJourney`; reader
  `getHiringSelectionJourney`; reconciler/event consumer
- Backward compatibility: `additive`; las superficies actuales siguen funcionando sin journey
- Full API parity: todos los consumidores llaman el mismo primitive; routes/MCP/UI no coordinan pasos localmente

### Data model and invariants

- Entidades/tablas/views afectadas: nuevas tablas `hiring_selection_journey_run` y
  `hiring_selection_journey_checkpoint` bajo `greenhouse_hiring` *(nombres finales se confirman en Plan Mode)*
- Invariantes que no se pueden romper:
  - Run se ancla a `hiring_application_id`, proposal/effect digest y decision version; no a candidato suelto.
  - Sólo una confirmación puede ejecutar un proposal; replay devuelve el mismo run/outcome.
  - Proposal guarda preview minimizado y hashes/refs, no CV/respuestas/notas/PII duplicadas.
  - Checkpoints son append-only; el estado corriente es proyección reconstruible.
  - `decision_recorded` sólo aparece después de readback de la decisión persistida.
  - `handoff_materialized` sólo aparece con `hiring_handoff_id` real.
  - `email_sent` sólo aparece desde delivery ledger; fallo de email no revierte selección.
  - Approval/activation checkpoints sólo aparecen después del command canónico y su readback.
  - `completed` exige estado downstream real; nunca “todos los calls devolvieron 2xx”.
  - Supersesión/cancelación preserva historia y bloquea pasos incompatibles.
- Tenant/space boundary: application→opening es la única derivación de scope; nunca aceptar tenant/space libre
- Idempotency/concurrency: unique proposal execution; lock por application/run; compare-and-set state/version;
  consumer/reconciler dedup por event/checkpoint; uncertain outcome obliga readback antes de retry
- Audit/outbox/history: cada proposal/confirm/advance/cancel/checkpoint registra initiating actor, effective actor,
  capability, authority, correlation y refs; sin chain-of-thought ni payload sensible

### Migration, backfill and rollout

- Migration posture: `expand-only`; tablas/indexes/checks/triggers nuevos, sin alterar history existente
- Default state: `HIRING_SELECTION_JOURNEY_ENABLED=false`; reconciler puede correr primero en shadow/read-only
- Backfill plan: no crear journeys históricos. Opcional dry-run reporta decisiones recientes sin run para medir gap
- Rollback path: flag OFF detiene nuevas proposals/advances; conservar tablas/history; operar con UI/commands actuales
- External coordination: Talent, People/Workforce, Identity, Legal/Privacy y Ops aceptan gates y ownership

### Security and access

- Auth/access gate: `hiring.application.decide` para confirmar selección; cada advance revalida la capability del
  command exacto (`hiring.handoff.approve`, activation/workforce capabilities vigentes). No super-capability.
- Sensitive data posture: DTO allowlisted; nombre/opening/destino/evidence summary mínimo; sin CV, email, teléfono,
  identidad legal, assessment answers, score detallado, salary, payroll o access secrets en checkpoints/logs
- Error contract: `selection_proposal_expired | selection_effect_mismatch | evidence_incomplete |
  selection_already_superseded | handoff_pending | approval_required | activation_blocked |
  identity_conflict | workforce_intake_required | destination_not_supported | uncertain_outcome`
- Abuse/rate-limit posture: proposal/confirm por actor+application, no batch, authority TTL, replay protection,
  capability por step y circuit breaker del reconciler

### Runtime evidence

- Local checks: state machine, effect binding, capability matrix, replay, supersesión, redaction y fault injection
- DB/runtime checks: migration/checks/triggers; selección persiste una vez; checkpoints reconstruyen state; no duplicate
  member/onboarding/email ante retry
- Integration checks: synthetic internal-hire desde selection proposal hasta pausa de approval, resume, member,
  onboarding, workforce intake y completion; staff-augmentation pausa honesta
- Reliability signals/logs: `hiring.selection_journey_stuck`, `hiring.selection_journey_uncertain`,
  `hiring.selection_journey_reconciliation_failed`; sin PII
- Production verification sequence: shadow → un caso staging → un opening interno allowlisted → cooldown/readback →
  rollout gradual; nunca full cohort de inicio

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
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — ADR, states and authority contract

- Aceptar un delta/ADR que declare saga, transaction boundary, owners, destination branches y human gates.
- Fijar state machine: `proposed → confirmed → decision_recorded → handoff_materialized →
  awaiting_handoff_approval → activation_review → member_created → onboarding_open →
  awaiting_workforce_intake → completed`, más `blocked|failed|cancelled|superseded`.
- Definir qué pasos son automáticos, cuáles exigen nueva autoridad y cómo se representa outcome incierto.
- Threat model de confused deputy, approval laundering, replay, stale preview, cross-application IDOR y PII leakage.

### Slice 1 — Durable proposal/run/checkpoint foundation

- Migration expand-only con aggregate, checkpoints append-only, constraints, indexes y audit.
- Implementar types/store/readers y DTO allowlisted.
- Proposal resuelve aplicación/opening, destino, evidence completeness, blockers y effects; genera digest/TTL.
- Confirm consume proposal one-shot y llama exclusivamente `decideHiringApplication`.

### Slice 2 — Event-driven checkpoints and safe continuation

- Consumir/readback `hiring.application.decided`, handoff y email delivery para checkpoints reales.
- Implementar `advanceHiringSelectionJourney` para continuar sólo por pasos determinísticos ya autorizados.
- Pausar con `nextRequiredAction` ante handoff approval, HR review, identity conflict, onboarding/intake o destino.
- Integrar internal-hire con los commands de TASK-770; mantener staff-augmentation en boundary honesto.

### Slice 3 — Reconciliation, cancellation and reliability

- Reconciler por run/application para consumers tardíos, timeout incierto, supersesión y checkpoints incompletos.
- Cancelar sólo futuro trabajo cancelable; nunca borrar/revertir decision/member/history.
- Agregar stuck/uncertain/reconciliation signals y runbook de recuperación.
- Probar crash después de cada boundary y convergencia sin side effects duplicados.

### Slice 4 — Product API parity and controlled rollout

- Exponer propose/confirm/status/advance/cancel en routes delgadas con capabilities y idempotency.
- Tests contract/API/DB/integration y synthetic live journey.
- Documentación funcional/manual para explicar “una operación rastreable” versus “una sola transacción”.
- Shadow/reconciliation primero; luego un opening interno allowlisted con sign-off Talent+People+Ops.

## Out of Scope

- Seleccionar automáticamente al candidato “mejor”, rankear, recomendar contratación o reemplazar criterio humano.
- Rechazar/mover otras aplicaciones, cerrar opening, consumir seat capacity o emitir oferta/contrato.
- Completar documentos legales, payroll, access, compensation o workforce intake por inferencia.
- Auto-fusionar identidad o crear persona/member paralelo.
- Implementar placement Staff Augmentation si no existe command dueño aprobado.
- UI visible; Application 360/Activation Lane consumer es follow-up separado si se requiere.
- MCP/OAuth/provider federation; pertenece a `TASK-1722`.

## Detailed Spec

La atomicidad contractual termina en `decideHiringApplication`: esa transacción persiste decision, history y
outbox. El journey es una saga durable. Confirm debe poder devolver `accepted/in_progress` después de verificar la
decisión, aunque handoff/email aún estén pendientes. Un timeout posterior se resuelve por readback del application
y event/history, no repitiendo ciegamente la decisión.

`advance` nunca significa “haz todo con mis permisos”. Calcula el próximo checkpoint desde verdades actuales y:

1. continúa automáticamente por lecturas/materializaciones sin side effect;
2. ejecuta un command sólo si existe autoridad/capability exacta y preview vigente para ese step;
3. si no, devuelve `approval_required` con acción, capability, owner y blocker tipados;
4. se detiene ante cualquier dato legal/identidad/readiness faltante.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 → Slice 1 → Slice 2 → Slice 3 → Slice 4.
- TASK-1603 MUST gate selection confirm before production enablement.
- Reconciler/shadow MUST ship before enabling automatic continuation.
- Staff-augmentation remains blocked until its command owner and compensation/reversal contract are accepted.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Decisión persiste y journey aparenta fallo | Hiring/outbox | medium | readback + reconciliation antes de retry | `hiring.selection_journey_uncertain` |
| Side effect duplicado por retry | Workforce/onboarding/email | medium | canonical idempotency + checkpoint refs | `hiring.selection_journey_reconciliation_failed` |
| Approval laundering entre steps | Identity/HR | high | capability y authority nueva por boundary | audit denial + `approval_required` |
| Identidad ambigua auto-fusionada | Identity/member | low | fail-closed existing command | `identity_conflict` |
| PII copiada a journey/log | Hiring/data | medium | allowlist + sentinel tests | security redaction finding |
| Run detenido sin owner | Ops | medium | next owner/action + stuck SLO | `hiring.selection_journey_stuck` |

### Feature flags / cutover

- `HIRING_SELECTION_JOURNEY_ENABLED=false` controla nuevas proposal/confirm/advance.
- `HIRING_SELECTION_JOURNEY_RECONCILER_ENABLED=false` se habilita primero en shadow.
- Flags viven en cada runtime consumidor; ops-worker usa su deploy contract, no Vercel env por inferencia.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | revertir doc antes de aceptación; ADR aceptado se supersede | horas | sí/parcial |
| 1 | flag OFF + revert routes; conservar tablas/history | <15 min | sí |
| 2 | continuation OFF; operar commands actuales manualmente | <15 min | sí |
| 3 | reconciler OFF; preservar señales/checkpoints | <15 min | sí |
| 4 | retirar allowlist/provider consumer; volver a UI actual | <15 min | sí |

### Production verification sequence

1. Migración + constraints + state-machine y rollback drill en staging.
2. Reconciler shadow sobre decisiones existentes sin crear runs ni side effects.
3. Proposal/confirm sintética: verificar una decision, un evento y un email delivery eventual.
4. Verificar pausa en `awaiting_handoff_approval`; deny sin capability.
5. Aprobar con autoridad real y recorrer activation hasta pausa de workforce intake.
6. Completar intake por path humano vigente; verificar journey `completed` y handoff/member/onboarding reales.
7. Repetir retries/crash/supersesión/staff-augmentation blocked; luego un opening interno allowlisted.

### Out-of-band coordination required

- Aceptación de Talent, People/Workforce, Identity, Legal/Privacy y Ops.
- No requiere configurar MCP/OAuth; eso pertenece a TASK-1722.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR/delta aceptado declara límites de atomicidad, saga, owners, states, gates y recovery.
- [ ] Proposal muestra aplicación/candidato/opening/destino/effects/blockers exactos y confirm ejecuta su digest una vez.
- [ ] Confirm usa `decideHiringApplication`; no existe segundo decision writer ni auto-selection.
- [ ] Run/checkpoints son durables, append-only, reconstruibles e idempotentes ante retries/concurrencia.
- [ ] Status distingue decisión, handoff, email, activation y readiness sin declarar success anticipado.
- [ ] El sistema se detiene ante cada capability/approval/identity/legal/readiness boundary y declara owner/next action.
- [ ] Internal-hire recorre commands TASK-770; staff-augmentation no crea placement por side effect.
- [ ] Supersesión/cancelación preserva historia y nunca borra decision/member/onboarding.
- [ ] Otras aplicaciones no son rechazadas, movidas ni cerradas automáticamente.
- [ ] Reconciler recupera crash/timeout en cada boundary sin duplicar decisión, email, member u onboarding.
- [ ] DTO/audit/logs pasan sentinels de PII/CV/answers/economics y no guardan chain-of-thought.
- [ ] Tests allow/deny/revoked/stale/replay/IDOR y capability coverage cierran con cero bypass.
- [ ] Synthetic staging journey prueba pause/resume/completion contra DB, outbox, delivery y workforce reales.
- [ ] Flags, worker deploy contract, rollback y Platform Health quedan documentados y verificados por runtime.

## Verification

- `pnpm task:lint --task TASK-1721`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- tests focales `src/lib/hiring/selection-journey/**`
- migration up/check/rollback drill en staging
- API smoke allow/deny/replay/supersession
- synthetic live internal-hire journey con evidencia DB/outbox/email/workforce
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] EPIC-011, Hiring/Workforce architecture, event/capability catalogs, functional docs y runbook reflejan runtime real
- [ ] TASK-1722 consume sólo el contrato publicado y no queda adelantada respecto del rollout

## Follow-ups

- `TASK-1722` — Delegated MCP Candidate Selection Journey.
- UI/UX consumer en Application 360 para timeline/next action, sólo si el primitive requiere nueva superficie visible.
- Placement Staff Augmentation journey cuando exista command canónico y owner de reversa.
- Policy explícita para capacity/opening closure y tratamiento de candidaturas restantes; no inferirla aquí.

## Delta 2026-08-15

- Task creada después de verificar que TASK-355 posee la decisión, TASK-356 el handoff y TASK-770 la activación,
  pero ninguna posee coordinación durable end-to-end. La separación evita describir como “atómica” una cadena
  distribuida y conserva una única operación rastreable para el usuario.

## Open Questions

- ¿Qué roles pueden aprobar handoff y steps de Activation desde una misma sesión sin segundo confirmante?
- ¿Cuál es el owner/command canónico para continuar `staff_augmentation` desde un handoff aprobado?
- ¿Qué SLO define journey `stuck` por checkpoint y quién recibe cada escalación?
