# TASK-770 — Hiring to HRIS Collaborator Activation (backend-data)

## Delta 2026-07-10 — TASK-356 completada: la cola y el handoff YA existen en runtime

- **Desbloqueada por TASK-356** (implementada local-first en `develop`). Lo que esta task consume ya es real:
  - Cola read-model: `listInternalHireReadyForOnboarding()` en `src/lib/hiring/handoff/queue.ts` (handoffs `internal_hire` en `approved|in_setup`, con scope via opening + `full_name` de identity_profiles). **Gateada por `HIRING_HANDOFF_BRIDGES_ENABLED` (default OFF)** — retorna `{enabled:false, items:[]}` explícito; 770 debe manejar ese estado y el flip del flag es parte de SU rollout.
  - Aggregate `greenhouse_hiring.hiring_handoff` + audit append-only; command `transitionHiringHandoff` (`POST /api/hiring/handoffs/[id]/complete` con `downstreamRef` = evidencia del member creado — así 770 marca `completed`, nunca por inferencia).
  - Copy es-CL de estados/razones/CTAs listo en `src/lib/copy/hiring.ts` (`GH_HIRING_HANDOFF` + helpers `hiringHandoffStateLabel`/`hiringHandoffBlockedReasonLabel`).
  - Señal `hiring.internal_hire_awaiting_onboarding` (72h SLA) ya vigila la cola — cuando 770 active el flujo, esa señal detecta cola sin drenar.
- El handoff llega con `identity_profile_id` + `candidate_facet_id`: crear/promover el `member` SIEMPRE sobre ese mismo profile (cascade anti-dup D-2), en `pending_intake`.


## Delta 2026-07-08 (v2) — Revisión 3-lentes + split UI + reframe "bridge, no subsistema"

Revisada con `arch-architect` (dominante — toca creación de `member`/identity, la superficie del incidente 2026-06-01) + `greenhouse-talent-people-operator` + product-design. Hechos verificados contra el repo real. **Reframe central: 770 es un BRIDGE que reusa la maquinaria de activación workforce existente, NO un subsistema nuevo.** Ajustes:

- **SPLIT (decisión operador 2026-07-08):** 770 queda **backend-data (backend-critical)** = el bridge de activación (contrato + creación/promoción de member + onboarding + API + eventos + cola-consumer + señal). La **activation lane UI** (viejo Slice 5) se mueve a **TASK-1368** (ui-ux, blocked by 770, alineada al mockup aprobado de TASK-763). Patrón 354(UI)/1367(backend).
- **REUSAR, no reconstruir** (todo esto ya existe):
  - Readiness: **`resolveWorkforceActivationReadiness`** (`src/lib/workforce/activation/readiness.ts`) + `isWorkforceActivationReadinessGuardEnabled()` + 409 `activation_readiness_blocked` + override cap `workforce.member.activation_readiness.override`. NO inventar un readiness schema paralelo (viejo Slice 1).
  - Intake/activación: **`completeWorkforceMemberIntake`** (`src/lib/workforce/intake/complete-intake.ts`, `pending_intake→completed`, cap `workforce.member.complete_intake`, `FOR UPDATE`) — **ya abre el onboarding case** (`ensureActivatedOnboardingCaseForMember`).
  - Onboarding = **DOS subsistemas, no confundir:** (A) HR checklist templates/instances `createOnboardingInstance` (`src/lib/hr-onboarding/store.ts`, TASK-030 complete) + `ensureOnboardingChecklistForMemberEvent`; (B) work-relationship onboarding **case** `ensureActivatedOnboardingCaseForMember` (`src/lib/workforce/onboarding/store.ts`), que es el que dispara la activación. Usar (B) para el case de activación; (A) para el checklist.
  - Legal readiness: **`assessPersonLegalReadiness({useCase:'document_render_onboarding_contract'})`** (TASK-784) para el tramo legal, NO reimplementar.
- **Creación de member — el corazón crítico (2 hallazgos duros):**
  1. Existe el primitive atómico `provisionInternalCollaboratorFromScim` (`src/lib/scim/provisioning-internal-collaborator.ts:507`) con cascade D-2 (profile_id→azure_oid→email→INSERT) anti-duplicación, **pero es SCIM-shaped (exige `externalId`/Entra) y nace el member `active=TRUE, workforce_intake_status='pending_intake'`.** Un hire de careers **no tiene Azure** y **no debe nacer activo**. → 770 necesita un **core source-neutral** (extraído del primitive o hermano) que cree el member sobre el mismo `identity_profile_id`, **no activo**, en `pending_intake`, y **discoverable por la cascade D-2** (para que si luego llega Entra, el SCIM lo enlace por profile_id sin duplicar — el dominio del incidente 2026-06-01).
  2. **`members.active` y `members.status` son columnas GENERATED** → **NUNCA** `UPDATE members SET active=true`. La activación se maneja por las columnas fuente / el path `completeWorkforceMemberIntake`, no por escritura directa.
- **Capabilities — no proliferar.** Las 5 `hr.hiring_activation.*` propuestas duplican `workforce.member.*` existentes. **Reusar** `workforce.member.complete_intake`, `workforce.member.activation_readiness.read/override`, `hr.onboarding_instance`. Agregar como MUCHO **1** cap nueva para el triage de la cola (`hiring.activation.review`) + grant mismo PR (coverage TASK-873).
- **Home canónico = `src/lib/workforce/**`** (donde vive intake/activation), NO `src/lib/hr-core/hiring-activation/**` (hr-core = leave/attendance/departments). Más `src/lib/hiring/handoff/**` solo para reader/mark-completed.
- **Señal deconflictada con 356:** 356 owns `hiring.internal_hire_awaiting_onboarding` (aprobado SIN member). La de 770 (member creado pero intake atascado en `pending_intake`/`in_review`) va en namespace **`workforce.*`** (módulo que ya existe; prior art `identity.workforce.unlinked_internal_user` / `workforce.scim_members_pending_profile_completion`). NO reusar la señal de hiring.
- **Eventos:** el lifecycle ya emite `member.created`, `workforce.member.intake_completed`, `work_relationship_onboarding_case.*`, `hr.onboarding.instance_created`. 770 NO duplica esos; agrega solo los eventos-puente que falten (`hiring.activation.linked` / `hiring.activation.completed`).

## Delta 2026-07-08

- **Blockers recalibrados:** `TASK-353` y `TASK-030` ya están **complete**. El **único blocker vivo es `TASK-356`** (produce la cola/contrato `internal_hire_ready_for_onboarding`). Rutas stale a `to-do/TASK-353`, `to-do/TASK-030`, `to-do/TASK-763` → los tres viven en `complete/`.
- **Foundation real disponible:** `greenhouse_hiring` + `hiring_application` (snapshot de handoff embebido); `candidate_facet.identity_profile_id` es la raíz.
- **Co-ownership con TASK-356:** **356 es dueña del contrato de la cola** `internal_hire_ready_for_onboarding` (la produce como read-model); **770 la consume**, no la redefine.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Backend impact: `command`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-356`
- Branch: `task/TASK-770-hiring-to-hris-collaborator-activation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el loop operacional de Hiring como **bridge backend-data**: consume la cola `internal_hire_ready_for_onboarding` (TASK-356), crea/promueve la faceta `member` sobre el mismo `identity_profile_id` (source-neutral, no activa, `pending_intake`) **reusando la maquinaria workforce existente** (readiness + intake completion + onboarding case), y marca el `HiringHandoff` `completed` con referencias downstream reales. La **UI** de la lane vive en **TASK-1368**.

## Why This Task Exists

`TASK-356` deja el handoff explícito y auditable pero NO activa colaboradores. Sin 770, una application puede quedar `selected` y el handoff `approved`, pero no existe un carril robusto/idempotente/seguro para convertir esa selección en colaborador sin duplicar persona, saltarse onboarding o crear payroll/access truth demasiado temprano. 770 es el **puente gobernado** entre el handoff y la maquinaria de activación workforce que ya existe.

## Goal

- Consumir handoffs `internal_hire` aprobados (cola de 356).
- Crear/promover `member` sobre el mismo `identity_profile_id` (source-neutral, no activo, `pending_intake`) sin duplicar identidad, discoverable por la cascade D-2 del SCIM.
- Enganchar la maquinaria workforce existente (readiness + intake completion + onboarding case), NO reconstruirla.
- Activar colaborador solo cuando readiness queda completo (vía el path existente), nunca por escritura directa a `members.active` (columna GENERATED).
- Dejar trazabilidad completa `HiringApplication ↔ HiringHandoff ↔ member ↔ onboarding`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (**SCIM Internal Collaborator Provisioning invariants, TASK-872** — el contrato de creación de member que 770 debe honrar)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Hiring selecciona y entrega; HRIS/People convierte en colaborador.
- **No crear una segunda persona.** El `member` se crea/promueve sobre el mismo `identity_profile_id` del `CandidateFacet`/`HiringApplication`, y **discoverable por la cascade D-2** del SCIM (para no duplicar cuando llegue Entra).
- **No `UPDATE members SET active=true`** (columna GENERATED). La activación pasa por `completeWorkforceMemberIntake` / las columnas fuente.
- **REUSAR** `resolveWorkforceActivationReadiness`, `completeWorkforceMemberIntake`, `ensureActivatedOnboardingCaseForMember`, `createOnboardingInstance`, `assessPersonLegalReadiness`. NO reimplementar readiness/onboarding.
- No crear payroll truth, compensación definitiva ni accesos productivos desde Hiring. El member nace `pending_intake` → excluido del payroll gate por construcción.
- Idempotente: reintentos no duplican `member`, onboarding, relaciones ni eventos.
- Falla cerrado ante identidad ambigua, `member` activo incompatible (`MemberIdentityDriftError`), legal entity faltante, fecha inválida, contrato incompleto o readiness bloqueada.
- Onboarding es paso obligatorio entre selección y activo, salvo excepción explícita y auditada.
- El estado `active` es ownership HRIS/People (vía el path existente), no Hiring.

## Normative Docs

- `docs/tasks/complete/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/complete/TASK-353-hiring-ats-domain-foundation.md`
- `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- `docs/tasks/complete/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption.md` (mockup aprobado que guía la UI — implementada en TASK-1368)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- `TASK-356` para `HiringHandoff` aprobado + la cola `internal_hire_ready_for_onboarding` (contrato).
- Maquinaria workforce existente: `src/lib/workforce/activation/readiness.ts`, `src/lib/workforce/intake/complete-intake.ts`, `src/lib/workforce/onboarding/store.ts`.
- `src/lib/hr-onboarding/store.ts` (`createOnboardingInstance`, TASK-030).
- `src/lib/scim/provisioning-internal-collaborator.ts` (cascade D-2 / core de member a extraer/reusar).
- `src/lib/person-legal-profile/` (`assessPersonLegalReadiness`).
- `greenhouse_core.identity_profiles` (raíz humana) + `greenhouse_core.members` (faceta operativa).

### Blocks / Impacts

- **`TASK-1368`** (ui-ux): la activation lane UI que consume los readers/commands de 770.
- Completa el programa Hiring/ATS end-to-end para `internal_hire`.
- Impacta People, HRIS, Lifecycle/Onboarding, Person 360, Identity/Access y payroll readiness (indirecto).

### Files owned

- `migrations/<ts>_task-770-hiring-to-hris-collaborator-activation.sql` (mapping table de activation-request, additive)
- `src/lib/workforce/hiring-activation/**` (bridge: consumer de cola + service de activación)
- `src/lib/scim/**` solo para extraer el core source-neutral de creación de member (si se refactoriza el primitive)
- `src/app/api/hr/hiring-activation/**` (API interna)
- `src/lib/hiring/handoff/**` solo para readers/mark-completed del handoff
- `src/lib/person-360/**` solo para readers derivados del journey
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/documentation/hr/onboarding-offboarding-lifecycle.md`
- `docs/manual-de-uso/hr/onboarding-y-offboarding.md`

## Current Repo State

### Already exists (verificado 2026-07-08)

- **Creación de member atómica:** `provisionInternalCollaboratorFromScim` (`src/lib/scim/provisioning-internal-collaborator.ts:507`) — `withTransaction`, cascade D-2, `MemberIdentityDriftError` (no auto-merge), member nace `active=TRUE, workforce_intake_status='pending_intake'` (SCIM-shaped).
- **Schema `members`:** `workforce_intake_status` CHECK `('pending_intake','in_review','completed')`; `active`/`status` **GENERATED**; `azure_oid` nullable (member puede existir sin Azure); `identity_profile_id`, `hire_date`, `efeonce_start_date`, `contract_type` (generated).
- **Intake/activación:** `completeWorkforceMemberIntake` (`src/lib/workforce/intake/complete-intake.ts:38`) + `resolveWorkforceActivationReadiness` (`src/lib/workforce/activation/readiness.ts:559`) + flag guard + 409 `activation_readiness_blocked` + override cap.
- **Onboarding:** (A) `createOnboardingInstance` (`src/lib/hr-onboarding/store.ts:637`, TASK-030 complete) + `ensureOnboardingChecklistForMemberEvent`; (B) `ensureActivatedOnboardingCaseForMember` (`src/lib/workforce/onboarding/store.ts:614`). Evento `hr.onboarding.instance_created` existe (`event-catalog.ts:282`); case-level `work_relationship_onboarding_case.*` (:310-315).
- **Legal readiness:** `assessPersonLegalReadiness` con caso `document_render_onboarding_contract` (TASK-784).
- **Capabilities:** `workforce.member.complete_intake`, `workforce.member.activation_readiness.read/override`, `hr.onboarding_instance` existen.
- **UI existente:** `src/views/greenhouse/hr-onboarding/HrOnboardingView.tsx` + rutas `(dashboard)/hr/onboarding`, `(dashboard)/hr/workforce/activation` → **TASK-1368 extiende esto**, no greenfield.

### Gap

- No existe consumer del contrato de cola `internal_hire_ready_for_onboarding` (356) hacia la maquinaria workforce.
- No existe el bridge/service `activateHiringHandoffAsCollaborator` (source-neutral, idempotente) que cree el member no-activo `pending_intake` y lo enganche a intake/onboarding.
- No existe el mapping durable `hiring_handoff_id ↔ member_id ↔ onboarding_case/instance ↔ activation state`.
- No existe cap de triage de la cola ni señal `workforce.*` de activación atascada.
- No existe el mark-completed del handoff con referencias downstream reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (crea/promueve `member`/identity — superficie del incidente 2026-06-01; migración additive + capability + payroll-adjacent boundary)
- Impacto principal: `command` (bridge de activación) + `migration` (mapping table) + `reader` (cola/journey) + `api`
- Source of truth afectado: `greenhouse_core.members` (SSOT de la faceta — 770 crea/promueve vía core canónico, NO INSERT ad hoc) + `greenhouse_hiring.hiring_handoff` (356, se lee/mark-completed) + una tabla nueva de mapping de activation-request
- Consumidores afectados: TASK-1368 (UI), Person 360/People readers, Nexa (por parity), la maquinaria workforce (intake/onboarding)
- Runtime target: `staging`/`production` (flag-gated) + `worker` (si el consumo de cola es reactivo)

### Contract surface

- Contrato existente a respetar: `provisionInternalCollaboratorFromScim` (cascade D-2 / core member), `completeWorkforceMemberIntake`, `resolveWorkforceActivationReadiness`, `ensureActivatedOnboardingCaseForMember`, `createOnboardingInstance`, `assessPersonLegalReadiness`, contrato de cola `internal_hire_ready_for_onboarding` (356). Boundary Hiring↛payroll/compensation.
- Contrato nuevo o modificado:
  - **Service:** `activateHiringHandoffAsCollaborator({hiringHandoffId, actorUserId, ...})` (source-neutral, idempotente) en `src/lib/workforce/hiring-activation/**`.
  - **Member core source-neutral:** extraer/reusar el core de materialización de member (member + person_membership + role assignment + `pending_intake`, no-activo) de `provisionInternalCollaboratorFromScim` para que Hiring y SCIM compartan un solo primitive.
  - **Readers:** `listHiringActivationQueue()` (consume la cola 356), `getHiringActivationDetail(id)`, `getHiringJourneyForPerson(identityProfileId)`.
  - **API:** `POST /api/hr/hiring-activation/[id]/(review|create-member|open-onboarding|complete)`.
  - **Eventos puente (solo los que falten):** `hiring.activation.linked`, `hiring.activation.completed` v1.
  - **Reliability signal:** `workforce.hiring_activation_stuck` (member creado, intake/onboarding atascado tras ventana).
- Backward compatibility: `gated` (flag `HIRING_ACTIVATION_ENABLED` default OFF). Additive.
- Full API parity: activación = command gobernado (capability), consumido por UI (1368) + Nexa (propose→confirm) por construcción.

### Data model and invariants

- Entidades/tablas afectadas: nueva `greenhouse_hr.hiring_activation_request` (mapping durable: `hiring_handoff_id` UNIQUE, `identity_profile_id`, `candidate_facet_id`, `hiring_application_id`, `member_id`, `onboarding_case_id`/`onboarding_instance_id`, `state`, blockers) + audit. Lee/escribe `members` **solo vía core canónico**. Lee `hiring_handoff` (356), marca `completed`.
- Invariantes:
  - **Un member por persona:** creación/promoción sobre el mismo `identity_profile_id`; cascade D-2 evita duplicado; `MemberIdentityDriftError` bloquea merge ambiguo.
  - **Member nace no-activo `pending_intake`** (excluido del payroll gate); NUNCA `UPDATE active=true` directo (GENERATED).
  - **Activación por el path existente:** `completeWorkforceMemberIntake` / readiness resolver; 770 no reimplementa la transición a activo.
  - **Idempotencia:** key `hiring_handoff_id + identity_profile_id`; claim atómico (`FOR UPDATE`); reintento retorna el request existente; member compatible → enlaza, incompatible → bloquea.
  - **Boundary:** NUNCA escribe `payroll_*`/`compensation_versions`/`final_settlements`; `hire_date` desde el handoff revisado, no desde la application sin aprobar.
- Tenant/space boundary: hereda scope del handoff/opening.
- Idempotency/concurrency: claim atómico + idempotency key; el consumo de cola respeta `outbox_reactive_log` si es reactivo.
- Audit/outbox/history: audit append-only por transición + eventos puente + mark `hiring_handoff.completed` con `member_id`/`onboarding_*` reales.

### Migration, backfill and rollout

- Migration posture: `additive` (mapping table + audit, marker `-- Up Migration`, DO block anti pre-up-marker, GRANTs, Down solo DROP). `db.d.ts` en el mismo commit.
- Default state: `flag OFF` (`HIRING_ACTIVATION_ENABLED`) hasta shadow verde en staging con un `internal_hire` real; registrar en `FEATURE_FLAG_STATE_LEDGER.md`.
- Backfill plan: `none` V1 (nace con el flujo).
- Rollback path: flag off → revert PR → reverse migration (DROP additive). El member creado se supersede/queda en estado previo (no delete).
- External coordination: env `HIRING_ACTIVATION_ENABLED` (staging/prod) + sign-off People/HRIS antes de activar en prod + depende del contrato de cola de 356.

### Security and access

- Auth/access gate: `session` + capabilities **reusadas** `workforce.member.complete_intake` / `workforce.member.activation_readiness.*` / `hr.onboarding_instance` + a lo sumo **1 nueva** `hiring.activation.review` (triage de cola) + grant a rol real (`hr_manager`/`hr_payroll`) mismo PR (coverage guard).
- Sensitive data posture: PII masked/reveal con capability+reason+audit (reusar person-legal-profile readers); NUNCA `value_full` en logs/eventos.
- Error contract: `canonicalErrorResponse` es-CL + `captureWithDomain(err,'workforce'|'identity',...)`.
- Abuse/rate-limit posture: `N/A` (superficie interna gobernada por capability).

### Runtime evidence

- Local: `pnpm test` (idempotencia, drift negativo, template faltante bloquea, member nace pending_intake no-activo, boundary NO payroll) + lint + tsc + build.
- DB/runtime: `pnpm migrate:up` + `information_schema` verify; smoke contra PG real: handoff `internal_hire` aprobado → 1 member sobre el mismo `identity_profile_id`, `pending_intake`, onboarding case abierto, payroll/access NO activos; replay → sin duplicado; verify cascade D-2 no duplica si aparece azure_oid después.
- Integration: `pnpm staging:request` readers de cola; shadow con caso real.
- Reliability: `workforce.hiring_activation_stuck` steady=0; `identity.scim.users_without_member` sin drift nuevo.
- Production verification sequence: flag OFF deploy → verify readers → flip staging + caso real → member no-activo + onboarding + idempotencia → sign-off HRIS → flip prod con cooldown.

### Acceptance criteria additions

- [ ] SSOT (`members` vía core canónico + `hiring_activation_request`), contract surface (service/readers/API/eventos/signal) y consumers (1368/360/Nexa) nombrados con paths reales.
- [ ] Invariantes (un-member-por-persona vía D-2, nace `pending_intake` no-activo, activación vía path existente, boundary NO-payroll) explícitos; idempotencia con claim atómico.
- [ ] Reusa readiness/intake/onboarding/legal existentes (no reimplementa); capabilities reusadas + ≤1 nueva con grant mismo PR.
- [ ] Migration additive + flag OFF + rollback explícito.
- [ ] Evidencia DB/worker (member no-activo + onboarding + replay + señal steady).

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive (`src/lib/workforce/hiring-activation/**`), NO en UI (la UI es 1368).
- [ ] Modelada como command/aggregate (`activateHiringHandoffAsCollaborator`), no click-handler.
- [ ] Read (`listHiringActivationQueue`/`getHiringJourneyForPerson`) + write (command con semantics + auth fina + idempotencia + audit/outbox + errores canónicos).
- [ ] Capability nueva (≤1) + grant mismo PR (coverage test).
- [ ] Camino programático: `POST /api/hr/hiring-activation/*` + reader para 1368; Nexa por parity.
- [ ] Write apto para propose→confirm→execute.
- [ ] Un primitive, muchos consumers (1368 UI, Person 360, Nexa) — cero lógica duplicada; el member core es compartido con SCIM.
- [ ] Parity check = SÍ.

## Scope

### Slice 1 — Activation-request mapping + estado (migration additive)

- `CREATE TABLE greenhouse_hr.hiring_activation_request` (mapping durable + estado + blockers auditables) + audit append-only. NO redefinir readiness (se reusa el resolver workforce).
- Estados V1: `pending_hr_review`, `blocked`, `member_created`, `onboarding_open`, `ready_to_activate`, `active`, `cancelled` (derivados del/alineados al lifecycle workforce existente, no un state-machine paralelo de member).

### Slice 2 — Source-neutral member create/promote + service idempotente

- Extraer/reusar el **core source-neutral** de materialización de member (de `provisionInternalCollaboratorFromScim`): crea/promueve `member` sobre `identity_profile_id`, **no-activo `pending_intake`**, discoverable por cascade D-2.
- `activateHiringHandoffAsCollaborator()` en `src/lib/workforce/hiring-activation/**`: resolver persona → member compatible (enlazar) | crear (core) → persistir mapping. Tx + claim atómico + idempotency key. `hire_date` desde el handoff revisado.
- **NUNCA** `UPDATE members SET active=true`.

### Slice 3 — Onboarding bridge (reusa runtime existente)

- Abrir el onboarding **case** vía `ensureActivatedOnboardingCaseForMember` (B) y/o el **checklist** vía `createOnboardingInstance` (A, TASK-030), eligiendo template por legal entity/contract type/país/modalidad. Si no hay template aplicable → `blocked` con razón auditada.
- Enlazar `onboarding_case_id`/`onboarding_instance_id` al request y al handoff. Reusar los eventos existentes (`hr.onboarding.instance_created`, `work_relationship_onboarding_case.*`).

### Slice 4 — HRIS activation API + readiness reuse

- API interna: `listHiringActivationQueue` (consume cola 356), `review`, `create-member`, `open-onboarding`, `complete`.
- **Reusar** `resolveWorkforceActivationReadiness` para el gate + `assessPersonLegalReadiness('document_render_onboarding_contract')` para legal. NO reimplementar.
- Capabilities: reusar `workforce.member.*` + `hr.onboarding_instance`; agregar ≤1 `hiring.activation.review` + grant mismo PR.

### Slice 5 — Eventos, señal y audit (mark handoff completed)

- Eventos puente `hiring.activation.linked`/`completed` v1 (solo los que falten; no duplicar `member.created`/`workforce.member.intake_completed`).
- Marcar `HiringHandoff` `completed` solo con `member_id`/`onboarding_*` reales.
- Señal `workforce.hiring_activation_stuck` (namespace workforce, no hiring) + audit por transición.

> **NOTA (split):** el viejo Slice 5 "UI HRIS/People activation lane" se movió a **TASK-1368** (ui-ux, alineada al mockup 763, extiende `HrOnboardingView`/`hr/workforce/activation`).

## Out of Scope

- **La activation lane UI → `TASK-1368`.**
- ATS foundation (353), careers pública (354), Hiring Desk (355), reacción/handoff (356).
- Reemplazar el runtime de onboarding (se consume TASK-030) o el de intake/activación workforce (se reusa).
- Calcular payroll / crear compensation truth.
- Crear placement Staff Augmentation (bridge de 356).
- Activar accesos productivos sin readiness/approval.

## Detailed Spec

Flujo canónico V1:

`HiringHandoff approved(internal_hire) [cola 356] → hiring_activation_request(pending_hr_review) → HR review → member creado/promovido(pending_intake, NO activo, core source-neutral) → onboarding case/instance abierto → resolveWorkforceActivationReadiness OK → completeWorkforceMemberIntake (activa por el path existente) → HiringHandoff completed`

Readiness (reusar `resolveWorkforceActivationReadiness` + `assessPersonLegalReadiness`): `identity_profile_id` no ambiguo · member compatible · legal entity/relationship · `hire_date` · manager · onboarding abierto o excepción auditada · contract/payroll readiness · access readiness o diferido.

Idempotency: key `hiring_handoff_id + identity_profile_id`; reintento retorna el request existente; member compatible → enlaza, incompatible → `blocked` (`MemberIdentityDriftError`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Único blocker vivo `TASK-356` (contrato de cola). Orden: consumir cola → crear member no-activo (core) → onboarding → readiness (reuse) → activar por path existente. **NUNCA** activar member/access/payroll antes de readiness ni por `UPDATE active=true`.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigation | Signal |
|---|---|---|---|---|
| Persona/member duplicado | identity | media | crear sobre `identity_profile_id`; cascade D-2; drift throw | `identity.scim.users_without_member` / person-360 |
| Activación prematura (payroll/access antes de readiness) | payroll/identity | alta | member nace `pending_intake`; activar solo vía `completeWorkforceMemberIntake` + readiness gate | member activo sin readiness |
| Escritura directa a `active` (GENERATED) | data | media | prohibido; usar path existente; test negativo | build/test |
| Reintento duplica member/onboarding | hris | media | idempotencia key + claim atómico | doble member/onboarding |
| Reinventar readiness/onboarding | arch | media | reuse obligatorio de primitives workforce | review |
| Co-ownership cola con 356 | data | baja | 356 dueña del contrato; 770 consume | ambigüedad owner |

### Feature flags / cutover

- `HIRING_ACTIVATION_ENABLED` default OFF hasta shadow verde en staging con un `internal_hire` real; registrar en `FEATURE_FLAG_STATE_LEDGER.md`. Cutover = flip post-smoke.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 migration | reverse (DROP additive) | ~min | Sí |
| 2 member create | flag off; member queda `pending_intake` (supersede, no delete) | <15 min | parcial |
| 3-4 onboarding/API | revert PR + flag off | <10 min | Sí |
| 5 eventos/señal | revert PR (additive) | ~min | Sí |

### Production verification sequence

1. Staging flag ON: handoff `internal_hire` aprobado (356) → member creado sobre el mismo `identity_profile_id`, `pending_intake`, onboarding abierto, payroll/access NO activos.
2. Verify idempotencia (reintento no duplica) + cascade D-2 (azure_oid tardío no duplica).
3. Prod con cooldown + monitoreo de señales.

### Out-of-band coordination required

- People/HRIS sign-off antes de activar en prod. Depende del contrato de cola de 356.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un `HiringHandoff` `internal_hire` aprobado aparece en la cola de activación (consumiendo el contrato de 356).
- [ ] Se crea/promueve un único `member` sobre el mismo `identity_profile_id`, **no activo, `pending_intake`**, vía el core source-neutral (no INSERT ad hoc), discoverable por cascade D-2.
- [ ] Reintentar la activación no duplica `member`, onboarding ni eventos (idempotencia + claim atómico).
- [ ] Bloquea ante identidad ambigua, `member` incompatible (`MemberIdentityDriftError`) o datos legales mínimos faltantes.
- [ ] Se abre onboarding (case/instance reusando runtime existente) antes de activar, salvo excepción auditada.
- [ ] `member` activo solo vía `completeWorkforceMemberIntake` + readiness (`resolveWorkforceActivationReadiness`), NUNCA `UPDATE active=true`.
- [ ] `HiringHandoff` `completed` solo con `member_id`/`onboarding_*` reales.
- [ ] Capabilities reusadas + ≤1 nueva con grant mismo PR; señal `workforce.hiring_activation_stuck` steady=0.
- [ ] People 360 muestra el journey sin identidad paralela.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test` (full) · `pnpm build` · `pnpm migrate:up` + verify
- Test idempotente del service; negativo de identidad ambigua/member incompatible; negativo de template faltante; negativo de boundary (NO escribe payroll/compensation); test de que el member nace `pending_intake` no-activo
- Smoke PG real end-to-end handoff→member→onboarding; replay sin duplicado
- `pnpm qa:gates --changed` + `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle`/carpeta sincronizados; `README.md`; `Handoff.md`; `changelog.md`
- [ ] `## Delta` a `TASK-1368` (consume readers/commands de 770) y a `TASK-356` si cambian supuestos de la cola
- [ ] `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` + `Greenhouse_HRIS_Architecture_v1.md` con delta
- [ ] `EVENT_CATALOG` actualizado si se agregan eventos `hiring.activation.*`
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` con la fila del flag
- [ ] doc funcional + manual HR actualizados; Runtime Rollout Completion Gate (flag/redeploy) reportado

## Follow-ups

- **`TASK-1368`** — activation lane UI (ui-ux, blocked by 770, mockup 763).
- Automatización parcial de access provisioning post-readiness.
- Staff Augmentation activation lane para destino `staff_augmentation` (simétrico), si aplica.
- Analytics time-to-hire / time-to-active desde `HiringApplication` hasta `member` activo.
