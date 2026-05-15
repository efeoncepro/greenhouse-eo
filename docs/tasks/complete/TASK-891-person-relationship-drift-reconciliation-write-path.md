# TASK-891 — Person 360 Relationship Drift Reconciliation Write Path

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `V1.0 SHIPPED 2026-05-15 — 6 slices completos directo en develop`
- Rank: `TBD`
- Domain: `identity|hr`
- Blocked by: `TASK-890 V1.0 (SHIPPED 2026-05-15) — establece signal detector + ADR §7 que mandata este follow-up`
- Branch: `task/TASK-891-person-relationship-drift-reconciliation-write-path`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Cerrar el seam de reconciliacion Person 360: dado un member con drift entre runtime laboral (`contract_type='contractor' / payroll_via='deel'`) y relacion legal activa (`relationship_type='employee'`), ship un command auditado server-only para que EFEONCE_ADMIN cierre la relacion legacy + abra una nueva relacion correcta en una sola transaccion + outbox event, sin DELETE (supersede via `effective_to` + `status='ended'`).

## Why This Task Exists

TASK-890 V1.0 (shipped 2026-05-15) entregó el **signal read-only** `identity.relationship.member_contract_drift` que detecta este drift y alerta en `/admin/operations`. PERO ADR §7 declaró explícitamente que el write path quedaba como follow-up:

> V1 ship SOLO read-only signal. NUNCA auto-mutate Person 360 desde un read path. Pattern fuente TASK-877 (workforce.member.complete_intake — signal-then-command). Write reconciliation = follow-up task TASK-891+ post 30d observability.

Hoy, sin write path, el operador HR detecta el drift en el dashboard pero la única forma de resolverlo es SQL admin manual — lo cual viola Greenhouse Solution Quality Operating Model V1 (NUNCA mutar state crítico via SQL ad-hoc fuera del modelo canonical command + audit + outbox).

Maria Camila Hoyos es el caso fuente disparador (member runtime contractor/Deel + relacion legal activa employee). TASK-891 ship el dialog + command que resuelve este drift desde la UI con audit trail completo.

## Goal

- Helper canónico `reconcileMemberContractDrift(memberId, targetRelationshipType, reason, actorUserId)` server-only que en una sola transacción atómica cierra la relacion activa actual y abre la nueva.
- Endpoint route handler con capability granular nueva `person.legal_entity_relationships.reconcile_drift` (EFEONCE_ADMIN solo V1.0).
- UI dialog integrado al signal alerta en `/admin/operations` que muestra el delta (member dice X, relacion dice Y) y permite ejecutar el reconcile con reason audit (≥20 chars).
- Outbox event `person.legal_entity_relationship.reconciled v1` con before/after snapshots.
- Nunca DELETE filas legacy — siempre supersede via `effective_to=NOW() + status='ended'` respetando audit triggers existentes.
- Bump severity del signal `member_contract_drift` de `warning` → `error` post 30 días steady (auto-escalation cuando ya hay write path).

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
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` (TASK-890 §7 manda este follow-up)
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- NUNCA DELETE filas de `person_legal_entity_relationships`. Solo supersede via `effective_to=NOW() + status='ended'` respetando audit append-only.
- NUNCA auto-mutar Person 360 desde un read path / cron / cleanup automatico. Toda mutacion pasa por command auditado iniciado por operador EFEONCE_ADMIN con reason ≥20 chars.
- NUNCA fabricar `relationship_type` fuera del enum vigente (`employee`, `contractor`, `eor`, `executive`, `other` — verificar desde schema antes de codear).
- NUNCA mutar Maria Camila Hoyos operativamente en esta task. Recovery espera (a) staging validation con synthetic fixture, (b) HR approval explicito antes de operar caso real.
- SIEMPRE en la misma transaccion PG: UPDATE legacy row + INSERT new row + INSERT outbox event. Si cualquier step falla, rollback completo.
- SIEMPRE emitir outbox event `person.legal_entity_relationship.reconciled v1` con before/after JSONB para reconstruccion forensic.
- Reason ≥20 chars (bar mas alto que TASK-890 close_external_provider que es ≥10, porque blast Person 360 cross-domain es mayor — afecta payroll readiness, payslips, reportes legales, ICO).

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/complete/TASK-890-workforce-exit-payroll-eligibility-window.md` (predecesor inmediato — ADR §7 mandata este follow-up)
- `docs/tasks/complete/TASK-877-workforce-activation-external-identity-reconciliation.md` (pattern fuente signal-then-command)
- `docs/documentation/hr/offboarding.md` (seccion "Drift contrato member ↔ relacion legal" agregada por TASK-890 Slice 7)
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-890-workforce-exit-payroll-eligibility-window.md` — signal detector ya shipped.
- Tabla existente `greenhouse_core.person_legal_entity_relationships` (no requiere schema migration nueva — solo write path canónico).
- Helpers existentes en `src/lib/person-legal-entity-relationships/**` `[verificar contenido en Discovery]`.
- `src/lib/reliability/queries/identity-relationship-member-contract-drift.ts` (signal reader TASK-890).
- `src/lib/observability/capture.ts` (`captureWithDomain` para domain `identity`).
- Capability registry existente `greenhouse_core.capabilities_registry` + entitlements catalog + runtime grants pattern (TASK-839/TASK-873).

### Blocks / Impacts

- `/admin/operations` (subsystem `Identity & Access`) — agrega CTA "Resolver drift" sobre el signal alerta.
- Person 360 timeline de relationships — cuando se reconcilia, el timeline muestra cierre + apertura como dos rows.
- Payroll readiness checks downstream — un member con relacion `contractor` activa ya no genera el drift signal post-reconcile.
- `/admin/reliability` — bump de severity del signal una vez que TASK-891 está en producción ≥30d.
- Caso operativo Maria Camila Hoyos `EO-OFF-2026-0609A520` — recovery posible solo después de staging validation.

### Files owned

- `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md` (nuevo ADR)
- `docs/architecture/DECISIONS_INDEX.md` (entry nuevo)
- `src/lib/person-legal-entity-relationships/reconcile-drift.ts` (nuevo helper canónico)
- `src/lib/person-legal-entity-relationships/reconcile-drift.test.ts` (nuevo)
- `src/app/api/admin/person/relationships/[memberId]/reconcile-drift/route.ts` (nuevo endpoint)
- `src/config/entitlements-catalog.ts` (capability nueva)
- `src/lib/entitlements/runtime.ts` (grant nuevo EFEONCE_ADMIN)
- `migrations/[timestamp]_task-891-person-relationship-reconcile-drift-capability.sql` (seed capability)
- `src/views/greenhouse/admin/operations/**` (UI dialog + integracion al signal) `[verificar path en Discovery]`
- `src/lib/copy/identity.ts` o `src/lib/copy/workforce.ts` (microcopy es-CL del dialog)
- `src/config/event-catalog.ts` (registrar `person.legal_entity_relationship.reconciled v1`)
- `src/lib/reliability/queries/identity-relationship-member-contract-drift.ts` (bump severity V1.1 post 30d)
- `docs/documentation/hr/offboarding.md` (actualizar seccion "Drift" con el write path)
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` `[verificar path en Discovery]`
- `docs/manual-de-uso/hr/offboarding.md` (instrucciones operativas)

## Current Repo State

### Already exists

- Signal reader `src/lib/reliability/queries/identity-relationship-member-contract-drift.ts` (TASK-890 Slice 6) detecta el drift y alerta en `/admin/operations` con severity `warning`.
- Tabla `greenhouse_core.person_legal_entity_relationships` con `relationship_id`, `profile_id`, `legal_entity_organization_id`, `relationship_type`, `status`, `effective_from`, `effective_to`, `metadata_json`, `created_by_user_id`, `source_of_truth`, `notes`, `space_id`, `public_id`, `created_at`.
- Audit triggers en la tabla `[verificar exact triggers en Discovery]`.
- Pattern canónico `captureWithDomain('identity', ...)` ya integrado en signal reader.
- Microcopy es-CL pattern establecido en `src/lib/copy/workforce.ts` (TASK-890 Slice 5 agregó `GH_WORKFORCE_OFFBOARDING_EXTERNAL_CLOSE`).
- Capability registry pattern canónico desde TASK-839/TASK-873 (TS catalog + runtime grant + migration seed).
- Outbox event registration pattern en `src/config/event-catalog.ts`.

### Gap

- No existe helper canónico `reconcileMemberContractDrift` server-only que cierre legacy + abra new en una sola transacción.
- No existe endpoint `POST /api/admin/person/relationships/[memberId]/reconcile-drift`.
- No existe capability `person.legal_entity_relationships.reconcile_drift` ni su grant.
- No existe outbox event `person.legal_entity_relationship.reconciled v1` en el catálogo.
- No existe UI dialog integrado al signal alerta en `/admin/operations` — hoy operador HR/admin solo ve el contador pero no tiene CTA accionable.
- Drift Person 360 hoy solo se puede limpiar via SQL admin manual, violando Solution Quality Operating Model V1.
- Signal sigue en severity `warning` indefinidamente; no hay path canónico para escalarlo a `error` post write path shipped.

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

### Slice 1 — ADR + DECISIONS_INDEX

- Crear `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md` con:
  - Decision §1 — supersede pattern (effective_to + status='ended', NUNCA DELETE)
  - Decision §2 — atomic tx (UPDATE legacy + INSERT new + outbox event en misma transaccion PG)
  - Decision §3 — capability granular EFEONCE_ADMIN solo V1.0 (no delegar a HR todavía — drift Person 360 es sensible y blast cross-domain)
  - Decision §4 — reason ≥20 chars (bar mas alto que TASK-890 close_external_provider ≥10 porque blast Person 360 es mayor)
  - Decision §5 — UI dialog operator-initiated (NUNCA cron / auto / batch en V1; bulk = follow-up V1.1)
  - 4-pillar score + hard rules + open questions
- Indexar la decision en `docs/architecture/DECISIONS_INDEX.md`.
- NO toca runtime — pure ADR.

### Slice 2 — Helper canónico atómico

- Crear `src/lib/person-legal-entity-relationships/reconcile-drift.ts` con:
  - Firma `reconcileMemberContractDrift({ memberId: string, targetRelationshipType: 'contractor' | 'eor' | 'honorarios', reason: string, actorUserId: string, externalCloseDate?: Date }): Promise<{ closedRelationshipId: string; openedRelationshipId: string }>`
  - Pre-checks: member existe + active + identity_profile_id non-null + relationship activa employee existe + reason ≥20 chars (lanza `PersonRelationshipReconciliationError` con códigos canonicos).
  - Transacción atómica `withTransaction(async client => { ... })`:
    1. SELECT current active employee relationship FOR UPDATE
    2. UPDATE `effective_to=NOW(), status='ended', notes=COALESCE(notes,'') || ' [reconciled by TASK-891 actor=...]'`
    3. INSERT new relationship row con `relationship_type=targetRelationshipType, status='active', effective_from=NOW(), legal_entity_organization_id=mismo, profile_id=mismo, source_of_truth='operator_reconciliation', created_by_user_id=actorUserId`
    4. `publishOutboxEvent('person.legal_entity_relationship.reconciled', { schemaVersion: 1, memberId, profileId, before, after, reason, actorUserId, reconciledAt })`
  - `captureWithDomain('identity', { source: 'person_relationship_reconcile_drift', stage: 'commit' })` en degradacion.
- Tests `reconcile-drift.test.ts` cubriendo:
  - Happy path employee → contractor (verifica supersede + new row + outbox call)
  - Reason < 20 chars → throws con code canonical
  - Member sin identity_profile_id → throws
  - Sin relacion employee activa → throws (nothing to reconcile)
  - targetRelationshipType invalido → throws (compile-time + runtime defense)
  - Atomicidad: si outbox falla, UPDATE + INSERT también roll back (mock tx)
- Registrar evento en `src/config/event-catalog.ts` con `aggregateType='person_legal_entity_relationship'` + schema v1.

### Slice 3 — Capability + grant + migration + route handler

- Migration `[timestamp]_task-891-person-relationship-reconcile-drift-capability.sql`:
  - INSERT en `greenhouse_core.capabilities_registry` con anti pre-up-marker check (TASK-839 pattern):
    - `capability_key='person.legal_entity_relationships.reconcile_drift'`
    - `module='identity'` (verificar valor canonical en otros entries identity)
    - `allowed_actions=ARRAY['update']`
    - `allowed_scopes=ARRAY['tenant']`
  - Down migration: soft-delete via `deprecated_at` (NUNCA DELETE audit data).
- Entry en `src/config/entitlements-catalog.ts`:
  - `key: 'person.legal_entity_relationships.reconcile_drift'`, `module: 'identity'`, `actions: ['update']`, `defaultScope: 'tenant'`
- Grant en `src/lib/entitlements/runtime.ts`:
  - **SOLO `EFEONCE_ADMIN`** en V1.0 (NO HR todavía — drift Person 360 cross-domain blast). Comment explicito que delegacion a HR queda como V1.1 decision post observabilidad.
- Route handler `src/app/api/admin/person/relationships/[memberId]/reconcile-drift/route.ts`:
  - `POST` body: `{ targetRelationshipType: 'contractor' | 'eor' | 'honorarios', reason: string, externalCloseDate?: string }`
  - `requireAdminTenantContext()` + `can(tenant, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')`
  - Validacion: reason ≥20 chars; targetRelationshipType en enum cerrado
  - Invoca helper canonical; canonical error response con codes es-CL
  - 200 OK con `{ closedRelationshipId, openedRelationshipId }`
- Tests del route handler (smoke con session mock + capability mock).

### Slice 4 — UI dialog en /admin/operations

- En la vista del signal `identity.relationship.member_contract_drift`:
  - Agregar CTA "Resolver drift" cuando severity = warning + count > 0 (gated por capability)
  - Click abre dialog "Reconciliar relacion legal" mostrando:
    - Tabla delta: columna "Member runtime" (contract_type + payroll_via) vs columna "Relacion legal activa" (relationship_type + effective_from + notes).
    - Select `targetRelationshipType` con 3 opciones (contractor / eor / honorarios).
    - TextField multiline `reason` con helper "Mínimo 20 caracteres. Queda en el audit log de la relacion."
    - Confirm button disabled hasta reason.length ≥ 20.
  - Submit → POST → success snackbar + refresh del signal.
- Microcopy es-CL en `src/lib/copy/identity.ts` o extender `src/lib/copy/workforce.ts` (validar tono con skill `greenhouse-ux-writing`).
- Soporta single-member only V1.0 (un dialog por click — bulk = V1.1).

### Slice 5 — Auto-escalation severity post 30d

- Bump severity del signal `identity.relationship.member_contract_drift` en `src/lib/reliability/queries/identity-relationship-member-contract-drift.ts`:
  - V1.0 ship con condicion: `severity = count === 0 ? 'ok' : (firstDetectedAt > 30 days ago ? 'error' : 'warning')`
  - O alternativa: hardcode bump a `error` directamente cuando TASK-891 está deployed (porque ya hay write path operativo — drift sostenido es accionable).
- Update tests del signal reader para cubrir el nuevo branch.
- Update doc funcional + manual de uso con el cambio.

### Slice 6 — Docs/manuales + sync close-out

- Update `docs/documentation/hr/offboarding.md` seccion "Drift contrato member ↔ relacion legal" con el write path + capability requirement + reason ≥20 + supersede semantics.
- Update `docs/documentation/identity/sistema-identidad-roles-acceso.md` `[verificar path en Discovery]` con la capability nueva.
- Update `docs/manual-de-uso/hr/offboarding.md` con instrucciones operativas paso-a-paso del dialog.
- Update `CLAUDE.md` con sección "Person 360 Relationship Reconciliation invariants" (15 hard rules canonical pattern, mirror TASK-890).
- Sync `Handoff.md`, `changelog.md`, `docs/tasks/README.md` al cierre.
- Mover archivo `in-progress/` → `complete/`.

## Out of Scope

- **Mutar Maria Camila Hoyos en producción**. Recovery operativa de Maria queda post staging validation con synthetic fixture + HR approval explicito + flag flip de TASK-890 + ejecucion via dialog UI.
- **Bulk reconciliation**. V1.0 es 1-by-1 con dialog per row. Si emerge volumen sostenido (>50 cases/mes), follow-up V1.1 ship bulk con confirmation de safety bar.
- **Auto-reconciliation desde cron / scheduled job**. NUNCA en V1.0 — viola hard rule canonical "NUNCA auto-mutate Person 360 desde un read path". Decision V2 contingente con HR approval explicito y eval ≥90d.
- **Delegacion de capability a HR route group**. V1.0 ship EFEONCE_ADMIN solo. Delegacion a HR queda como V1.1 decision post 30d steady observabilidad sin incidentes.
- **Migration schema nueva**. Tabla `person_legal_entity_relationships` ya soporta el flow via columnas existentes (`effective_to`, `status`).
- **Drift reverso (member.contract_type='employee' AND relacion activa='contractor')**. Si emerge, follow-up task separada — V1.0 cubre solo el caso fuente disparador (member contractor/Deel + relacion legacy employee).

## Detailed Spec

### Shape del helper canónico

```ts
// src/lib/person-legal-entity-relationships/reconcile-drift.ts (server-only)

export type ReconcileMemberContractDriftInput = {
  memberId: string
  targetRelationshipType: 'contractor' | 'eor' | 'honorarios'
  reason: string
  actorUserId: string
  externalCloseDate?: Date // optional: para casos donde el ultimo dia legal != NOW()
}

export type ReconcileMemberContractDriftResult = {
  closedRelationshipId: string
  openedRelationshipId: string
  beforeSnapshot: PersonLegalEntityRelationshipRow
  afterSnapshot: PersonLegalEntityRelationshipRow
}

export const reconcileMemberContractDrift = async (
  input: ReconcileMemberContractDriftInput
): Promise<ReconcileMemberContractDriftResult>
```

### Outbox event canonical

```ts
{
  eventType: 'person.legal_entity_relationship.reconciled',
  schemaVersion: 1,
  aggregateType: 'person_legal_entity_relationship',
  payload: {
    memberId: string,
    profileId: string,
    closedRelationshipId: string,
    openedRelationshipId: string,
    before: { relationship_type, effective_from, status, notes },
    after: { relationship_type, effective_from, status, source_of_truth },
    reason: string,
    actorUserId: string,
    reconciledAt: ISO8601
  }
}
```

### SQL canónico de la transacción

```sql
BEGIN;

-- 1. Lock the active employee relationship
SELECT * FROM greenhouse_core.person_legal_entity_relationships
WHERE relationship_id = $1
FOR UPDATE;

-- 2. Close the legacy relationship (supersede, NUNCA DELETE)
UPDATE greenhouse_core.person_legal_entity_relationships
SET
  effective_to = COALESCE($2::timestamp, NOW()),
  status = 'ended',
  notes = COALESCE(notes, '') || ' [TASK-891 reconciled by actor=' || $3 || ' on ' || NOW() || ']'
WHERE relationship_id = $1;

-- 3. Insert the new relationship
INSERT INTO greenhouse_core.person_legal_entity_relationships (
  profile_id,
  legal_entity_organization_id,
  relationship_type,
  status,
  effective_from,
  source_of_truth,
  created_by_user_id,
  notes
) VALUES (
  $4, $5, $6, 'active', NOW(), 'operator_reconciliation', $3,
  'Reconciled from employee via TASK-891. Reason: ' || $7
)
RETURNING relationship_id;

-- 4. Outbox event (via publishOutboxEvent helper, same tx via client param)

COMMIT;
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (ADR)** MUST ship antes de cualquier slice de runtime. Sin ADR no hay contract canónico al que adherirse en Slices 2-5.
- **Slice 2 (helper)** MUST ship antes de Slice 3 (route handler). El route handler consume el helper canónico.
- **Slice 3 (capability + endpoint)** MUST ship antes de Slice 4 (UI). UI sin endpoint no funciona.
- **Slice 4 (UI)** depende de Slice 3 con flag explicito: el dialog solo aparece cuando capability check pasa.
- **Slice 5 (severity bump)** corre solo DESPUÉS de Slice 4 deployed en producción ≥30d sin incidentes — auto-escalation no debe romper alertas antes de que el write path esté validado en runtime real.
- **Slice 6 (docs)** corre al cierre de cada slice (delta updates) y finaliza con el cierre de la task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UPDATE legacy + INSERT new no atómico (uno commitea, el otro falla → estado inconsistente Person 360) | identity | medium | Helper canonical envuelve todo en `withTransaction`; rollback completo si cualquier step falla; test anti-regresión que mockea outbox failure y verifica que UPDATE también roll back | `identity.relationship.member_contract_drift` cuenta inconsistencias post-mutación; Sentry domain=`identity` |
| Audit trigger en `person_legal_entity_relationships` bloquea el UPDATE legacy (effective_to no se puede mover hacia atrás en algunos contratos) | identity | low | Discovery debe verificar contenido exacto de triggers existentes y ajustar SQL si emerge constraint; usar `effective_to = NOW()` (no fecha pasada) salvo `externalCloseDate` explícito | `captureWithDomain('identity', ...)` en error path |
| Operador EFEONCE_ADMIN ejecuta reconcile sobre member equivocado (sin double-confirmation UI) | identity | medium | Dialog UI muestra delta explícito (member runtime vs relación legal) ANTES del confirm; reason ≥20 chars forzado client-side + server-side; capability granular EFEONCE_ADMIN solo (no HR delegation V1.0) | Outbox event registra full before/after + actorUserId para reconstruccion forensic |
| Outbox event consumer downstream rompe por shape inesperado (before/after JSONB nuevo) | event-bus / sync | low | Registrar event en catálogo con schemaVersion=1 explicito; tests anti-regresión del shape; consumer downstream queda fuera de scope V1.0 | `sync.outbox.dead_letter` reliability signal existente |
| Severity bump de signal a `error` post 30d falla porque el path V1.0 dejó casos no reconciliables (e.g. drift inverso fuera de scope) | reliability / identity | medium | Slice 5 condicional en `firstDetectedAt > 30d` solo cuenta drift DESPUÉS de TASK-891 deploy; drift legacy pre-deploy queda `warning` indefinido hasta cleanup manual one-time | El signal mismo muestra `unknown` si query falla; operador HR via dashboard |
| Maria Camila Hoyos se muta operativamente desde esta task sin staging validation | identity / payroll | high (si no se respeta scope) | Out of Scope explícito; Acceptance Criteria requiere "Maria NO mutated"; staging synthetic fixture probado primero | Manual review pre-merge |

### Feature flags / cutover

- **Capability gate**: `person.legal_entity_relationships.reconcile_drift` es el gate canónico. Sin grant, route handler retorna 403; UI esconde el CTA. Default V1.0: solo EFEONCE_ADMIN tiene el grant.
- **Sin feature flag adicional** porque el endpoint es opt-in por capability — el operador NO puede ejecutar sin grant explícito. Si emerge necesidad de pause-switch (ej. incident response), agregar env var `PERSON_RELATIONSHIP_RECONCILE_DRIFT_ENABLED` (default `true`) que cierra el route handler como circuit breaker.
- **Cutover plan**: deploy en staging → operador EFEONCE_ADMIN ejecuta synthetic test fixture (member ficticio con drift artificial) → verifica outbox + signal count post-reconcile → cleanup staging fixture → deploy producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (ADR) | Revert PR si no hay consumers downstream | <15 min | si |
| Slice 2 (helper) | Revert PR si Slice 3 no shipped aún. Si shipped + cases ya reconciled, NO rollback automático — Person 360 changes preservan via supersede (effective_to + status='ended'); revert solo del código, datos quedan auditados | <30 min código; datos no revertible (canonical) | parcial |
| Slice 3 (capability + endpoint) | Revoke grant en `runtime.ts` + redeploy → endpoint queda 403 para todos. Migration de capability se marca `deprecated_at`, NUNCA DELETE | <10 min | si |
| Slice 4 (UI) | Hide CTA via capability check (Slice 3 revoke) o revert PR del componente | <15 min | si |
| Slice 5 (severity bump) | Revert PR del signal reader → vuelve a `warning` | <15 min | si |
| Slice 6 (docs) | Revert PR docs / agregar delta correction | <15 min | si |

**Datos reconciled NO son revertible** porque Person 360 audit es append-only. Si el reconcile fue erróneo, se hace una NUEVA reconciliation que vuelve la relación a su estado anterior — pero el historial preserva ambos eventos para audit forensic. Pattern canónico TASK-700/765 state machine + audit.

### Production verification sequence

1. `pnpm migrate:up` en staging + verify capabilities_registry tiene `person.legal_entity_relationships.reconcile_drift`.
2. Deploy código a staging con capability granted solo a EFEONCE_ADMIN.
3. Synthetic fixture: crear member test con `contract_type='contractor' / payroll_via='deel'` + relación legal `employee` activa (NO Maria — fixture aislado).
4. Verify signal `identity.relationship.member_contract_drift` count incrementa para el fixture.
5. Operador EFEONCE_ADMIN ejecuta dialog → reconcile → verify outbox event publicado + signal count vuelve a baseline.
6. Verify timeline Person 360 muestra cierre + apertura como dos rows audit-preserved.
7. Cleanup fixture (mark inactive, NO delete).
8. Repetir 2-6 en producción con cooldown 24h.
9. Monitor signal severity y reliability dashboard durante 7d post-prod.
10. Post 30d steady (count 0 sostenido), evaluar flip de Slice 5 severity bump a `error`.

### Out-of-band coordination required

- **HR operations**: comunicar a HR que el dialog "Resolver drift" está disponible y que el caso Maria Camila Hoyos puede ser resuelto post-staging-validation. HR debe aprobar explícitamente el caso individual antes de la mutación.
- **DevOps / Plataforma**: verificar que `EFEONCE_ADMIN` role grant está activo en producción para los actores autorizados.
- **Legal / Compliance** (futuro V1.1+): si emerge requirement de notarial/legal proof para cerrar `employee` y abrir `contractor` (Chile labor law), documentar antes del flip V1.1 a HR delegation. V1.0 EFEONCE_ADMIN-only respeta el escalamiento conservador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR `GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md` shipped + indexado en DECISIONS_INDEX.md.
- [ ] Helper canónico `reconcileMemberContractDrift` ejecuta UPDATE legacy + INSERT new + outbox event en una sola transacción atómica (rollback verificado en test).
- [ ] Nunca se ejecuta `DELETE FROM person_legal_entity_relationships` desde el helper, route handler o migration (grep + lint manual review).
- [ ] Capability `person.legal_entity_relationships.reconcile_drift` granted SOLO a EFEONCE_ADMIN en V1.0 (no HR, no FINANCE_ADMIN).
- [ ] Route handler `POST /api/admin/person/relationships/[memberId]/reconcile-drift` valida reason ≥20 chars + capability + retorna canonical error responses es-CL.
- [ ] UI dialog en `/admin/operations` muestra delta visible (member runtime vs relación legal) ANTES del confirm; confirm button disabled hasta reason.length ≥ 20.
- [ ] Outbox event `person.legal_entity_relationship.reconciled v1` registrado en catálogo + emitido en cada reconcile.
- [ ] Tests cubren happy path + reason<20 + member sin identity_profile_id + sin relación employee activa + targetRelationshipType inválido + atomicidad rollback.
- [ ] Maria Camila Hoyos NO mutada en producción durante esta task.
- [ ] Staging synthetic fixture verificó end-to-end antes de deploy producción.
- [ ] Signal `identity.relationship.member_contract_drift` severity tuvo bump a `error` post 30d de TASK-891 en producción (Slice 5 corre como follow-up dentro de la misma task o se documenta como deferred a V1.1).
- [ ] Docs/manuales actualizados (offboarding doc + identity doc + manual offboarding).
- [ ] CLAUDE.md tiene sección canónica "Person 360 Relationship Reconciliation invariants" con hard rules.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm test src/lib/person-legal-entity-relationships/reconcile-drift.test.ts` (focal anti-regresión)
- `pnpm pg:doctor`
- `pnpm build`
- Smoke staging: synthetic fixture + dialog manual run + outbox verify
- Manual API check producción: `curl POST /api/admin/person/relationships/[fixtureMemberId]/reconcile-drift` con session EFEONCE_ADMIN

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado con commit hashes per slice + skills usadas + recovery operativa pendiente (Maria Camila Hoyos)
- [ ] `changelog.md` quedó actualizado con resumen V1.0 SHIPPED
- [ ] Se ejecutó chequeo de impacto cruzado sobre TASK-890 (ADR §7 cierra el follow-up declarado) + otras tasks identity activas
- [ ] Maria Camila Hoyos sigue NO mutada — la recovery operativa la ejecuta HR via dialog después de staging validation, fuera de esta task

## Follow-ups

- **V1.1 — Delegacion de capability a HR** post 30d steady sin incidentes. Decisión operativa post-observabilidad.
- **V1.1 — Bulk reconciliation UI** si emerge volumen sostenido (>50 cases/mes).
- **V2 — Drift reverso** (member.contract_type='employee' + relación activa='contractor') — follow-up task separada.
- **V2 — Auto-reconciliation desde cron** SOLO si HR aprueba explícitamente post ≥90d V1.0 observabilidad. Decisión arquitectónica con ADR nuevo.
- **Maria Camila Hoyos recovery** — operativa post deploy + staging fixture green + HR approval. NO en esta task.
- **Legal/Compliance review** Chile labor law para closing `employee` + opening `contractor` (V1.1 si emerge requirement notarial).

## Open Questions

- ¿`source_of_truth` value canonical para la nueva fila reconciled? Propuesta: `'operator_reconciliation'`. Verificar en Discovery si existe enum o convención en filas existentes.
- ¿`externalCloseDate` opcional para casos donde el último día legal != NOW() (e.g. Maria Camila Hoyos cerrada legalmente 2026-05-14 pero reconcile se ejecuta días después)? Propuesta: SI, pero validar que `externalCloseDate <= NOW()` y ≥ `effective_from` de la relación legacy.
- ¿Validar consistencia member.contract_type vs targetRelationshipType en el route handler? Ej. si member dice `payroll_via='deel'` pero operador elige `targetRelationshipType='honorarios'`, ¿warn o block? Propuesta V1.0: warn en dialog UI (mostrar delta), pero permitir el reconcile porque operador puede tener context legítimo (e.g. caso edge donde Deel se cerró y el contrato pasó a honorarios local).
- ¿Notas concatenadas a la relación legacy son útiles o ruido? Propuesta: SI, agregar marker `[TASK-891 reconciled by actor=... on YYYY-MM-DD]` al notes para forensic. Audit trail principal vive en outbox event, pero notes es human-readable.
- ¿Slice 5 (severity bump) corre dentro de TASK-891 V1.0 o se difiere a TASK-891 V1.1? Propuesta: ship dentro de V1.0 como condicional (`firstDetectedAt > 30d ? 'error' : 'warning'`) — la lógica está lista, solo el flip a `error` real depende de la fecha de deploy.
