# TASK-1731 — Selection-to-Workforce Account Continuity Bridge

## Delta 2026-08-16 — Atomic seams audit and two-checkpoint continuity contract

- Hiring ya posee dos unidades atómicas que esta task debe **reusar, no reemplazar**:
  `decideHiringApplication` persiste decisión, history y `hiring.application.decided` en una transacción; y
  `createMemberForHiringActivation` crea/reutiliza el `member`, actualiza el activation request, audita y publica
  `hiring.activation.linked` en otra transacción.
- TASK-1731 se conecta a esos hechos downstream y divide la continuidad en dos checkpoints distintos:
  `principal_bound` después de `hiring.activation.linked`, con cuenta estable y acceso sólo de preboarding; y
  `workforce_enabled` después de intake/readiness completado, con grants workforce y sesión renovada.
- `provisionInternalCollaboratorFromScim` es precedente de atomicidad para
  `identity_profile + member + client_user + role + outbox`, pero no se invoca desde Hiring: exige Entra/SCIM y
  puede crear un principal. Esta task extrae/reusa únicamente un núcleo Identity source-neutral que preserve el
  `user_id` candidato existente.
- Hallazgos que pasan a ser gates P0: verificar/corregir `handoff_id` versus `hiring_handoff_id`; serializar por
  `identity_profile_id` para evitar members concurrentes; asegurar unicidad/idempotencia de principal y grants; y
  agregar tests SQL-contract porque los mocks actuales no validan nombres de columnas.
- El runtime actual no tiene `sessionVersion`: refresca access claims por intervalo. TASK-1727 crea ese contrato y
  TASK-1731 lo incrementa/revoca en cada cambio de audience/capability.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Backend impact: `command|sync|migration`
- Epic: `EPIC-011`
- Status real: `Diseno auditado; seams atómicos identificados y continuidad dividida en principal_bound/workforce_enabled`
- Rank: `TBD`
- Domain: `identity|hr|ops|data`
- Blocked by: `TASK-1727`
- Branch: `Greenhouse develop; sin worktrees`
- GitHub Issue: `none`

## Summary

Extiende la activación `internal_hire` sin reconstruir Hiring ni TASK-770. Vincula el `member` al mismo portal
principal del candidato durante preboarding y promueve sus audiences/capabilities sólo después de readiness e
intake laboral. Ambos checkpoints son idempotentes, auditables, revocan claims stale y se reconcilian con TASK-1721.

## Why This Task Exists

TASK-770 crea/reutiliza `member` por identidad y emite `hiring.activation.linked`, pero deliberadamente no escribe
`client_users` ni `user_role_assignments`. La continuidad de `client_users.user_id`, audiences, grants y sesiones
no está cerrada. “Misma persona” todavía no prueba “misma cuenta y login”, y asignar el rol `collaborator` cuando el
member sigue `pending_intake` abriría superficies workforce antes del gate correspondiente.

## Goal

- Garantizar una sola cuenta durante selección→preboarding→workforce.
- Vincular principal-member sin conceder anticipadamente capabilities de colaborador activo.
- Promover capabilities workforce y revocar claims stale sólo con evidencia de intake/readiness completado.
- Hacer idempotentes y reconciliables ambos checkpoints y exponerlos a TASK-1721 por readback/eventos.
- Corregir divergencias de activation/journey verificadas contra schema/runtime, no por suposición documental.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- La atomicidad contractual de la selección termina en `decideHiringApplication`; el recorrido completo es saga.
- TASK-1731 nunca decide, crea handoffs, crea personas, crea una segunda cuenta ni copia datos candidato→member.
- `principal_bound` no equivale a `workforce_enabled`; selection ni `member_created/pending_intake` conceden el rol
  amplio `collaborator`, payroll, leave, performance o capacidades workforce activas.
- Cada write vive en su owner: Hiring decide/handoff; Workforce crea member/intake; Identity vincula principal,
  grants y session version; Auth consume y rechaza sesiones stale; TASK-1721 sólo coordina/readback.
- Conflictos de identidad, principal o grants fallan cerrados y quedan reconciliables; nunca auto-merge.

## Normative Docs

- `docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md`
- `docs/tasks/complete/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- `docs/tasks/to-do/TASK-1721-governed-hiring-selection-journey-orchestrator.md`
- `src/lib/hiring/decide.ts`
- `src/lib/workforce/hiring-activation/service.ts`
- `src/lib/scim/provisioning-internal-collaborator.ts`

## Dependencies & Impact

### Depends on

- TASK-1727 para principal candidato, audiences y `sessionVersion`.
- TASK-356 para handoff gobernado y aprobado.
- TASK-770 para activation request, creación/reuso de member y eventos linked/completed.

### Blocks / Impacts

- Bloquea `TASK-1732` y `TASK-1761`; impacta TASK-1721 checkpoints y `/my` capability refresh.
- TASK-1721 registra/readback `principal_bound` y `workforce_enabled`, pero no ejecuta writes de Identity.
- TASK-1761 consume ambos checkpoints para Microsoft Entra; no amplía el significado de `workforce_enabled` ni
  mete Graph/SCIM/licencias dentro de esta task.

### Files owned

- `src/lib/identity/workforce-account-continuity/**` para primitives source-neutral de binding/promoción/reconcile.
- `src/lib/workforce/hiring-activation/**` sólo para integrar los primitives y corregir divergencias verificadas.
- `src/lib/sync/projections/hiring-account-continuity.ts` para consumer/checkpoints idempotentes.
- `src/lib/auth.ts` y contratos de sesión únicamente en el seam definido por TASK-1727.
- migrations, eventos y reliability signals estrictamente necesarios para continuity.

## Current Repo State

### Already exists

- `decideHiringApplication` bloquea la application y persiste decisión/history/outbox en una transacción.
- TASK-356 materializa/transiciona un handoff único por application con audit/outbox.
- `createMemberForHiringActivation` crea/reutiliza member, actualiza request y emite `hiring.activation.linked` en
  una transacción; `completeHiringActivation` emite `hiring.activation.completed` tras verificar intake.
- `provisionInternalCollaboratorFromScim` demuestra el patrón atómico de principal/member/role/outbox, pero está
  acoplado a Entra y no es un command válido para una cuenta candidata.
- Auth carga `memberId`, roles y `authorizedViews` desde `session_360`, con refresh periódico de claims.

### Gap

- No existe primitive source-neutral para vincular un principal candidato existente con un member.
- `hiring.activation.linked|completed` no tienen consumer de account continuity.
- No existe `sessionVersion`; el refresh periódico no entrega revocación inmediata verificable.
- El rol amplio `collaborator` no es apto para preboarding porque habilita vistas workforce de `/my`.
- `getHiringJourneyForPerson` depende de `candidate_facet.member_id`, columna que TASK-770 no mantiene; el reader debe
  derivar member por `identity_profile_id` o activation request.
- Deben verificarse contra schema/runtime el lock `handoff_id|hiring_handoff_id`, unicidad/concurrencia por persona,
  principal y role assignment; los unit mocks actuales no prueban esos contratos SQL.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/workforce/hiring-activation`, Identity/Auth compartido y consumers existentes
- Future candidate home: `domain-package`
- Boundary: `bindExistingPrincipalToMember + promotePrincipalToWorkforce + reconcileAccountContinuity`
- Server/browser split: `ejecución completa en servidor/worker; ningún state, grant o write viaja al browser`
- Build impact: `none`
- Extraction blocker: `PoolClient/transacción HRIS-Identity, session_360, grants y outbox compartidos`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`.
- Impacto principal: `command|sync|migration`.
- Source of truth afectado: `identity_profiles`, portal principal/`client_users`, `members`, activation request,
  role/audience grants y session-version contract de TASK-1727.
- Consumidores afectados: ops-worker, Hiring Selection Journey, Auth/session resolver, `/my` manifest y People 360.
- Runtime target: Vercel + PostgreSQL + ops-worker compartido en staging/production.

### Contract surface

- Contrato existente a respetar: `decideHiringApplication`, `transitionHiringHandoff`,
  `createMemberForHiringActivation`, `completeHiringActivation`, `completeWorkforceMemberIntake`, outbox/event
  catalog, `session_360` y capability/view registries.
- Contrato nuevo o modificado: `bindExistingPrincipalToMember`, `promotePrincipalToWorkforce`,
  `reconcileAccountContinuity`; checkpoints/eventos `principal_bound` y `workforce_enabled` con nombres finales
  registrados en el event catalog durante Plan Mode.
- Backward compatibility: additive y flag-gated; TASK-770 legacy sigue operativo sin account-continuity consumer.
- Full API parity: commands/consumer/reconciler llaman los mismos primitives Identity server-side; ninguna UI,
  route o agente escribe principal/member/grants directamente.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.identity_profiles`, `greenhouse_core.client_users`,
  `greenhouse_core.members`, `greenhouse_core.user_role_assignments`, `greenhouse_hr.hiring_activation_request`,
  `greenhouse_serving.session_360` y state/checkpoint additive si el audit de schema lo justifica.
- Invariantes:
  - `userId` e `identityProfileId` permanecen estables; se crea/reusa exactamente un member.
  - `principal_bound` preserva candidate capabilities y sólo agrega preboarding explícito.
  - `workforce_enabled` exige readback de intake/readiness completed; selección o member pending nunca bastan.
  - Ningún retry crea otra cuenta, member, role assignment, checkpoint o evento lógico.
  - `candidate_facet.member_id` no se convierte en segunda fuente de verdad.
- Tenant/space boundary: principal resuelto server-side por `identity_profile_id`; no se acepta `userId`, member,
  tenant, role o audience libre desde browser/event payload sin readback.
- Idempotency/concurrency: lock de handoff/activation request + serialización transaccional por
  `identity_profile_id`; constraints/CAS para binding y grants según schema verificado; outcome incierto siempre
  hace readback antes de retry.
- Audit/outbox/history: cada binding, promoción, revocación y reparación registra actor/correlation/IDs técnicos,
  transition y session version sin email, CV, salario, documentos ni PII sensible.

### Migration, backfill and rollout

- Migration posture: expand-only para session version/checkpoints/constraints faltantes; correcciones SQL focales
  sólo después de verificar schema live.
- Default state: `HIRING_ACCOUNT_CONTINUITY_BRIDGE_ENABLED=false`; reconciler primero shadow/read-only.
- Backfill plan: dry-run por identidades con handoff/activation existentes; clasificar missing/ambiguous/conflict;
  apply sólo por allowlist y batch acotado mediante los commands canónicos.
- Rollback path: flag OFF detiene bindings/promociones nuevas; revoca sólo grants/audiences creados erróneamente,
  incrementa session version y preserva member, principal, audit e historia para reparación.
- External coordination: sign-off Talent, People/Workforce, Identity y Ops; no requiere proveedor externo ni SSO
  corporativo nuevo.

### Security and access

- Auth/access gate: command interno HRIS/Identity con capabilities del paso; cada checkpoint revalida authority y
  estado real. Un candidato nunca puede autoactivar workforce.
- Sensitive data posture: sólo IDs técnicos y estados allowlisted en commands/events/logs; sin PII sensible.
- Error contract: `principal_missing | principal_ambiguous | principal_member_conflict |
  activation_not_ready | workforce_grant_conflict | session_version_stale | continuity_uncertain`, sanitizados y
  capturados bajo dominios `identity`/`hiring` según owner.
- Abuse/rate-limit posture: replay guard, lock/CAS, circuit breaker del reconciler y sin endpoint público mutante.

### Runtime evidence

- Local checks: unit/contract tests de commands, capability matrix, negative access, concurrency, retries y rollback.
- DB/runtime checks: verificar `hiring_handoff_id`, FK/indexes/uniqueness reales, migration markers y smoke PG con
  rollback forzado tras cada write del checkpoint.
- Integration checks: candidato sintético → selected → handoff approved → principal_bound → intake completed →
  workforce_enabled, más revocación y replay.
- Reliability signals/logs: `hiring_activation_account_binding_stuck`, `principal_member_inconsistent`,
  `workforce_access_promotion_stuck`, `stale_session_denied`.
- Production verification sequence: shadow → una identidad staging → production allowlist de una persona → cooldown
  y readback de sesión → ampliación gradual.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Runtime/schema audit and P0 seam corrections

- Verificar live `handoff_id|hiring_handoff_id`, `members.identity_profile_id`, principal/member linkage,
  role-assignment uniqueness, `session_360` y eventos/consumers existentes.
- Corregir sólo drifts demostrados; agregar SQL-contract/integration tests que fallen con columnas o constraints
  incorrectos y cubrir replay sticky/supersede que afecte el activation seam.
- Definir serialización por persona y política de conflictos/rehires antes de cualquier nuevo write.

### Slice 1 — Source-neutral Identity primitives

- Extraer/adaptar del patrón SCIM un core que **sólo vincule el principal existente**; nunca invocar el command SCIM,
  exigir Entra ni crear un principal alternativo.
- Implementar `bindExistingPrincipalToMember` y `promotePrincipalToWorkforce` con `PoolClient`, locks/readback,
  idempotencia, audit y outbox.
- Integrar `sessionVersion` definido por TASK-1727 y negative tests de stale sessions/cross-person binding.

### Slice 2 — `principal_bound` preboarding checkpoint

- Integrar el binding en el seam de `hiring.activation.linked`/create-member sin recrear member o handoff.
- Conservar candidate audience/capabilities y agregar sólo grants explícitos de preboarding; prohibir rol
  `collaborator` y capabilities activas mientras intake no esté completed.
- Publicar/readback checkpoint para TASK-1721 y dejar fallo parcial reconciliable.

### Slice 3 — `workforce_enabled` promotion checkpoint

- Consumir evidencia canónica de intake/readiness completed y verificar nuevamente principal/person/member.
- Asignar/reusar grants workforce, recalcular audiences/views, incrementar session version y auditar/outbox dentro
  de una unidad Identity/HRIS atómica.
- Mantener el cierre de HiringHandoff como transacción idempotente propia; si falla, reintentar sólo ese cierre.

### Slice 4 — Reconciliation, projections and controlled rollout

- Reconciler para member sin binding, principal bound sin intake, grant faltante/conflictivo, session stale y
  activation/handoff parcialmente completados.
- Corregir journey/People 360 para resolver member por identidad/activation request, no por una columna stale.
- Shadow, canary allowlisted, rollback/revocation y reliability signals con readback real.

## Out of Scope

- Crear principal candidato, UI, payroll autoactivation, SSO corporativo o copiar perfil profesional.
- Cambiar la decisión Hiring, autoaprobar handoff, completar intake/readiness o fusionar identidades automáticamente.
- Invocar `provisionInternalCollaboratorFromScim` desde Hiring o exigir Entra para preservar una cuenta candidata.
- Otorgar capabilities payroll/leave/performance por selección, handoff aprobado o member `pending_intake`.
- Crear, habilitar, licenciar o deshabilitar cuentas Microsoft Entra; eso pertenece a `TASK-1761`.

## Detailed Spec

La transición se implementa como atomicidad por checkpoint dentro de una saga, no como transacción distribuida:

```text
TX Hiring: decision + history + outbox
  → TX Handoff: materialize/approve + audit + outbox
  → TX HRIS/Identity: member + principal_bound + preboarding + audit/outbox
  → TX Workforce: intake/readiness
  → TX Identity/HRIS: workforce grants + sessionVersion + workforce_enabled + audit/outbox
  → TX Hiring: handoff completed con downstreamRef
```

Si member y binding no pueden quedar en la misma transacción por un boundary verificado, `hiring.activation.linked`
dispara un consumer at-least-once y el reconciler conserva el mismo contrato observable. Nunca se elimina un member
para compensar un fallo de acceso: queda pending y se repara. El session reader rechaza versiones stale; esperar el
refresh periódico de cinco minutos no cuenta como revocación correcta.

## Rollout Plan & Risk Matrix

- Ordering: audit/P0 fixes → Identity primitives → shadow `principal_bound` → shadow `workforce_enabled` → staging
  canary → production allowlist; TASK-770 legacy permanece fallback durante todo el rollout.
- Flag `HIRING_ACCOUNT_CONTINUITY_BRIDGE_ENABLED` default OFF; promociones workforce requieren además readiness
  real, no sólo el flag.
- Riesgos P0: columna de lock incorrecta, member/principal/grant duplicado por concurrencia y privilegio prematuro.
  Mitigaciones: SQL-contract, lock por persona, constraints/CAS verificadas, checkpoints separados y negative tests.
- Riesgos P1: sesión stale, consumer perdido, journey sobre proyección stale y fallo después del grant. Mitigaciones:
  sessionVersion, outbox+reconciler, readback por identidad/activation y retry por checkpoint.
- Rollback: flag OFF, revocar únicamente audience/grants erróneos, incrementar session version y preservar
  member/principal/history/audit para reconciliación.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `decideHiringApplication`, TASK-356 y TASK-770 siguen siendo los únicos owners de decisión, handoff y member;
      TASK-1731 no duplica esos writes.
- [ ] El schema/runtime confirma y el código usa el nombre real `hiring_handoff_id`; existe test SQL-contract que
      falla ante `handoff_id` u otra columna inexistente.
- [ ] La concurrencia por `identity_profile_id` queda serializada y dos handoffs/retries no crean dos members,
      principals, role assignments ni eventos lógicos.
- [ ] `principal_bound` conserva exactamente el mismo `userId`/`identityProfileId`, crea/reusa exactamente un member
      y deja el principal con candidate + preboarding explícito, sin rol/capabilities workforce amplias.
- [ ] Selección, handoff aprobado y member `pending_intake` no conceden payroll, leave, performance ni acceso de
      colaborador activo; existen negative tests de capabilities/views.
- [ ] `workforce_enabled` sólo ocurre con intake/readiness completed verificado por readback y agrega/reusa grants
      workforce mediante un primitive Identity source-neutral.
- [ ] Cada cambio de audience/grant incrementa `sessionVersion`; JWT stale es rechazado y la nueva sesión conserva
      `userId` e incluye el `memberId`, roles y `authorizedViews` esperados.
- [ ] Principal ausente, ambiguo o enlazado a otro member bloquea con error canónico y nunca crea otra cuenta o
      auto-fusiona identidades.
- [ ] Fallo después de member, binding, grant o activation converge por reconciler/readback sin borrar historia ni
      repetir side effects.
- [ ] Los checkpoints `principal_bound` y `workforce_enabled` producen audit/outbox sin PII y TASK-1721 puede
      observarlos sin escribir tablas Identity/Workforce.
- [ ] Journey/People 360 resuelve la relación laboral por `identity_profile_id`/activation request y no depende de
      `candidate_facet.member_id` como source of truth.
- [ ] Shadow, staging canary, production allowlist, rollback y reliability signals quedan ejercitados con evidencia.
- [ ] Source of truth, contract surface, consumers, access boundary, migration/backfill y rollback quedan verificados
      contra schema/runtime real.

## Verification

- `pnpm task:lint --task TASK-1731`
- lint/typecheck + tests focales de decide/handoff/activation/identity/auth.
- SQL-contract + smoke PG/worker staging + concurrency, rollback, retry y stale-session drills.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog, TASK-770/1721 y arquitectura sincronizados.
- [ ] Continuidad real verificada con una identidad canary end-to-end.

## Follow-ups

- `TASK-1732`, `TASK-1733`, `TASK-1761`.

## Delta 2026-08-21 — consumer Microsoft Entra separado

`TASK-1761` queda como follow-on explícito de los checkpoints de esta task. `principal_bound` permite solicitar una
cuenta Entra deshabilitada, pero `workforce_enabled` no equivale por sí solo a licencia o readiness M365. El bridge
Microsoft debe preservar el mismo principal longitudinal y nunca mapear `accountEnabled=false` a apagar `/my`.
