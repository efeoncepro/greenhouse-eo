# Greenhouse Person Legal Relationship Reconciliation V1

## Purpose

Definir el contrato canónico para **reconciliar drift entre el runtime laboral del member y la relación legal activa registrada en Person 360**.

Hoy un member puede declarar `contract_type='contractor' / payroll_via='deel'` mientras su relación legal activa en `greenhouse_core.person_legal_entity_relationships` sigue como `relationship_type='employee'`. Ese drift lo detecta el signal read-only `identity.relationship.member_contract_drift` (TASK-890 Slice 6) pero V1.0 NO ship un write path — el cleanup vivía como SQL admin manual, violando Solution Quality Operating Model V1.

Este documento define:

1. El helper canónico atómico que ejecuta la reconciliación.
2. La capability granular requerida.
3. El contrato de outbox events (decisión: reusar `.deactivated` + `.created` con metadata correlation, NO crear `.reconciled` nuevo).
4. La estrategia de UI operator-initiated (NUNCA cron / auto / batch en V1.0).
5. El auto-escalation de severity del signal post 30d de write path operativo.

Usar junto con:

- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` (TASK-890 ADR §7 manda este follow-up)
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Status

Decisión arquitectónica aceptada 2026-05-15.

Predecesor: TASK-890 V1.0 (SHIPPED 2026-05-15) — establece el signal detector + ADR §7 que mandata este follow-up.

Implementación: TASK-891 (in-progress).

Caso fuente disparador: Maria Camila Hoyos. Member declara `contract_type='contractor' / payroll_via='deel' / pay_regime='international'` mientras la relación legal activa sigue como `relationship_type='employee'`. Recovery operativa espera (a) staging synthetic fixture verde, (b) HR approval explícito, (c) ejecución vía dialog UI — NO se muta dentro de TASK-891.

## Source-of-Truth Boundaries

- **`greenhouse_core.person_legal_entity_relationships`** es source-of-truth de **relaciones legales** Person 360. Todo mutación pasa por helpers canónicos del módulo, NUNCA por SQL inline en consumers.
- **`greenhouse_core.members`** es source-of-truth de **runtime laboral** (contract_type, payroll_via, pay_regime). NO se muta como parte de esta reconciliación — el target es alinear la relación legal con el runtime, no al revés.
- **Operator EFEONCE_ADMIN** es el único actor con capability `person.legal_entity_relationships.reconcile_drift` en V1.0. Delegación a HR queda como V1.1 post 30d steady.

## Problem Statement

El bug class detectado live (Maria Camila Hoyos) tiene 4 dimensiones:

1. **Detección sin acción**: el signal `identity.relationship.member_contract_drift` alerta en `/admin/operations` desde TASK-890 Slice 6 (2026-05-15) pero el operador HR no tiene CTA accionable.
2. **Workaround inseguro**: el cleanup hoy vive como SQL admin manual fuera del modelo command + audit + outbox. Viola Solution Quality Operating Model V1.
3. **Audit gap**: una corrección SQL manual no deja trace forensic estructurado — sin outbox events, sin notes append-only, sin actor identificado.
4. **Sin gate de capability**: cualquiera con acceso de admin DB podría reconciliar (correctamente o no) sin defense-in-depth.

## Canonical Decisions

### §1. Helper canónico atómico que reusa primitives existentes

Toda reconciliación pasa por un **único** helper server-only que compone los dos helpers existentes del módulo `person-legal-entity-relationships` dentro de una transacción atómica:

```ts
// src/lib/person-legal-entity-relationships/reconcile-drift.ts (server-only)

export type ReconcileMemberContractDriftInput = {
  memberId: string
  targetRelationshipType: 'contractor'
  contractorSubtype?: 'standard' | 'eor' | 'honorarios'
  reason: string  // >= 20 chars
  actorUserId: string
  externalCloseDate?: string  // ISO YYYY-MM-DD, opcional
}

export type ReconcileMemberContractDriftResult = {
  closedRelationshipId: string
  openedRelationshipId: string
  beforeSnapshot: PersonLegalEntityRelationship
  afterSnapshot: PersonLegalEntityRelationship
}

export const reconcileMemberContractDrift = async (
  input: ReconcileMemberContractDriftInput
): Promise<ReconcileMemberContractDriftResult>
```

**Decisión §1.1 — REUSE > CREATE**: NO escribir SQL inline. El helper compone:

- `endPersonLegalEntityRelationship(client, ...)` — cierra la relación legacy (UPDATE `effective_to + status='ended'` + emite outbox `.deactivated`)
- `createContractorLegalEntityRelationship(client, ...)` — abre la nueva relación contractor (INSERT + emite outbox `.created`)

Ambos helpers ya existen en `src/lib/person-legal-entity-relationships/store.ts:124,174` desde TASK-337. Reusar > crear es el patrón canónico.

**Decisión §1.2 — Atomic transaction**: `withGreenhousePostgresTransaction` envuelve los dos helpers. Si cualquier paso falla, rollback completo. Sin estado inconsistente Person 360.

**Decisión §1.3 — Targetable types**: V1.0 ship solo `targetRelationshipType: 'contractor'` (porque el enum DB `relationship_type` incluye `contractor` pero NO `honorarios`/`eor` como valores top-level). El subtype (`'eor' | 'honorarios' | 'standard'`) vive en `metadata_json.contractorSubtype` del nuevo row. V2 puede extender a otros `relationship_type` si emerge necesidad.

### §2. Capability granular EFEONCE_ADMIN-only V1.0

Capability nueva: `person.legal_entity_relationships.reconcile_drift` (module=`identity`, actions=`['update']`, scope=`tenant`).

Grant V1.0: **solo `EFEONCE_ADMIN`**. NO HR ni FINANCE_ADMIN.

**Rationale**: drift Person 360 es cross-domain (impacta payroll, payslips, reportes legales, ICO). Bar conservador V1.0 mientras observamos:

- ¿Cuántas reconciliations por mes? (volumen real)
- ¿Hay drift inverso (employee declared en runtime + contractor en relación)? — fuera de scope V1, podría emerger
- ¿HR necesita autonomía o el escalamiento EFEONCE_ADMIN es suficiente?

Delegación a HR queda como V1.1 post 30d steady sin incidentes operativos.

**Defense in depth**:

- DB: capability registry seed via migration (TASK-839 governance pattern)
- App: `requireAdminTenantContext` + `can(tenant, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')` doble gate
- UI: dialog escondido detrás de capability check
- Audit: `actor_user_id` persistido en row + notes marker + outbox event payload

### §3. Reason ≥20 caracteres

Bar canónico **>=20 chars** (más alto que TASK-890 close_external_provider ≥10).

**Rationale**: blast Person 360 es cross-domain. Mutación cambia (a) timeline legal de la persona, (b) downstream payroll readiness, (c) reportes legales, (d) ICO. El reason queda en outbox event + `notes` append-only + audit. Operador EFEONCE_ADMIN debe escribir contexto útil:

- ❌ "fix drift" (8 chars, no útil para audit forensic)
- ✅ "Maria Hoyos transicionó a contractor via Deel — relación employee legacy cerrada per HR review 2026-05-14" (108 chars)

Patrón fuente: TASK-848 production release bypass (>=20 chars).

### §4. Outbox events: reusar existentes, NO crear `.reconciled`

**Decisión §4.1 — REUSE > CREATE**: NO se crea evento `person.legal_entity_relationship.reconciled v1` nuevo. Se reusan los dos eventos existentes que emiten los helpers compuestos:

- `person_legal_entity_relationship.deactivated v1` (emitido por `endPersonLegalEntityRelationship`)
- `person_legal_entity_relationship.created v1` (emitido por `createContractorLegalEntityRelationship`)

**Correlación forensic** vía 3 layers complementarios:

1. **`actor_user_id` idéntico** en ambos eventos (mismo operador).
2. **`created_at` en mismo segundo** (atomic tx).
3. **`metadata_json.reconciliationContext`** en la nueva relación con shape:
   ```json
   {
     "supersededRelationshipId": "rel_xxx",
     "reconciliationReason": "...",
     "reconciledAt": "2026-05-15T...",
     "reconciledBy": "user_xxx",
     "supersededRelationshipType": "employee",
     "externalCloseDate": "2026-05-14"  // opcional
   }
   ```

**Rationale para NO crear `.reconciled`**: el spec original de TASK-891 declaraba ese evento, pero la decisión arquitectónica post-Discovery es que añade ruido (3 eventos por reconciliation) sin ganancia clara. Los dos eventos individuales (`.deactivated` + `.created`) describen exactamente lo que pasó. El `metadata_json.reconciliationContext` provee correlation explícita sin necesidad de un meta-evento adicional.

Esta decisión es reversible: si emerge consumer downstream (notification hub, audit dashboard) que necesite reaccionar al "reconciliation as one atomic event", podemos agregar `.reconciled` en V1.1 sin breaking change.

### §5. Notes marker append-only (forensic)

Ambas filas (legacy + new) reciben un marker append-only en `notes`:

- **Legacy row** (status='ended'): `notes = COALESCE(notes, '') || ' [TASK-891 reconciled by actor=<USER_ID> on <YYYY-MM-DD> — superseded by <NEW_RELATIONSHIP_ID>]'`
- **New row** (status='active'): `notes = 'Reconciled from <SUPERSEDED_TYPE> via TASK-891 (actor=<USER_ID>, ' || <YYYY-MM-DD>) — reason: ' || reason`

Human-readable audit complementario al outbox event + metadata_json.

### §6. UI operator-initiated dialog (NUNCA cron / auto / batch)

V1.0 ship: dialog standalone que el operador EFEONCE_ADMIN abre desde `/admin/operations` cuando el signal alerta. Muestra delta visible (member runtime vs relación legal) ANTES del confirm. Confirm button disabled hasta `reason.trim().length >= 20`.

**Decisión §6.1 — NO auto / NO cron**: hard rule canonical. Auto-reconciliation desde un read path viola "NUNCA auto-mutar Person 360 desde un read path" (regla TASK-877). Decisión V2 contingente con HR approval explícito + ADR nuevo + eval ≥90d V1.0.

**Decisión §6.2 — NO bulk V1.0**: single-member dialog only. Si emerge volumen sostenido (>50 cases/mes), V1.1 ship bulk con confirmation de safety bar.

### §7. Auto-escalation severity post 30d

El signal `identity.relationship.member_contract_drift` (TASK-890 Slice 6) ship con severity `warning` porque V1.0 NO tenía write path — drift sostenido era informativo. Post-TASK-891 write path SHIPPED, drift sostenido es accionable.

**Decisión §7.1 — Auto-escalation condicional**: el signal reader bumpea automáticamente a `error` cuando:

```
count > 0 AND firstDetectedAt + 30d < NOW()
```

Donde `firstDetectedAt` se rastrea via timestamp del primer drift detectado post-deploy TASK-891. Implementación: query trackea el drift sustained (DATA-DRIVEN, no hardcoded date) o usa heurística simple basada en `MIN(updated_at) FROM drift rows`.

**Decisión §7.2 — Operador es decisor del flip real**: la lógica está ready en V1.0 de TASK-891. El bump efectivo a `error` ocurre data-driven cuando ya pasen 30d sin reconciliar el drift detectado. No requiere intervención manual ni redeploy.

### §8. Validaciones canónicas

El helper enforce:

| Validación | Falla con |
|---|---|
| `memberId` existe + `active=TRUE` + `identity_profile_id` non-null | `member_not_eligible_for_reconciliation` |
| Existe exactamente UNA `relationship_type='employee'` activa para el profile | `no_active_employee_relationship_found` o `multiple_active_employee_relationships` |
| `targetRelationshipType ∈ {'contractor'}` (V1.0 enum cerrado) | `invalid_target_relationship_type` |
| `contractorSubtype ∈ {'standard', 'eor', 'honorarios'} \| undefined` | `invalid_contractor_subtype` |
| `reason.trim().length >= 20` | `reason_too_short` |
| `externalCloseDate` opcional con `effective_from <= externalCloseDate <= NOW()` cuando provided | `invalid_external_close_date` |

Todos los errores devueltos como `PersonRelationshipReconciliationError` con código canónico + es-CL message safe para mostrar al usuario.

## 4-Pillar Score

### Safety

- **Riesgo**: operador EFEONCE_ADMIN ejecuta reconcile sobre member equivocado. **Gates**: dialog UI muestra delta explícito (member runtime vs relación legal) ANTES del confirm; reason ≥20 chars forzado client+server; capability granular EFEONCE_ADMIN-only (no HR delegation V1.0).
- **Blast radius**: 1 row legacy + 1 row new + 2 outbox events. Reversible (NUNCA DELETE; se crea NUEVA reconciliation inversa si emergió error).
- **Residual risk**: drift inverso (member declared employee + relación contractor) NO covered V1.0. Mitigación: signal puede emerger; track via signal severity hasta V2.
- **Verified by**: tests del helper + tests del route handler + smoke staging con synthetic fixture (NUNCA Maria producción).

### Robustness

- **Idempotencia**: si el helper se invoca dos veces sobre el mismo member, la segunda invocación FAILS con `no_active_employee_relationship_found` (porque la primera ya cerró la activa). Defensive idempotency natural.
- **Atomicidad**: `withGreenhousePostgresTransaction` envuelve UPDATE + INSERT + 2 outbox events. Rollback completo si cualquier paso falla. Tests cubren mock failure de outbox publish.
- **Race protection**: unique index activo `(profile_id, legal_entity_organization_id, relationship_type) WHERE status='active' AND effective_to IS NULL` bloquea race de doble apertura. SELECT FOR UPDATE en endRelationship previene UPDATE concurrente.
- **Constraint coverage**: schema CHECK enum sobre `relationship_type` + `status`. App layer enforce reason length + target type whitelist.

### Resilience

- **Retry**: NO (operator-initiated, idempotent failure). Si falla, operador re-intenta.
- **Dead letter**: N/A (no async path V1.0).
- **Reliability signal**: existente `identity.relationship.member_contract_drift` con auto-escalation V1.0 (warning → error post 30d).
- **Audit trail**: dos outbox events + `metadata_json.reconciliationContext` + `notes` marker en ambas rows. Reconstruction forensic via `event_type IN ('person_legal_entity_relationship.deactivated', 'person_legal_entity_relationship.created') AND payload->>'actor_user_id' = <USER> AND created_at BETWEEN <X> AND <X+1s>`.
- **Recovery**: reconciliación errónea se revierte vía NUEVA reconciliation inversa (cierra contractor recién creada + abre employee de vuelta). Append-only audit preserva ambos eventos.

### Scalability

- **Hot path Big-O**: O(1) por reconcile (1 UPDATE + 1 INSERT + 2 outbox). Single-member V1.0.
- **Index coverage**: existentes cubren todas las queries del helper. Sin migration de schema nueva.
- **Cost at 10x**: lineal por operator click. Sin contención (operator dialog manual).
- **Bulk path**: V1.1 contingente si volumen sostenido.

## Hard Rules (anti-regression)

1. **NUNCA** ejecutar `DELETE FROM person_legal_entity_relationships`. Solo supersede via `effective_to + status='ended'`.
2. **NUNCA** escribir SQL inline en consumers que muten `person_legal_entity_relationships`. Toda mutación pasa por helpers canónicos del módulo (`endPersonLegalEntityRelationship`, `createContractorLegalEntityRelationship`, `reconcileMemberContractDrift`).
3. **NUNCA** auto-mutar Person 360 desde un read path / cron / cleanup automático. V1.0 es operator-initiated single-member. V2 (cron) requiere ADR nuevo + HR approval.
4. **NUNCA** fabricar `relationship_type` fuera del enum del schema (`shareholder`, `founder`, `legal_representative`, `board_member`, `executive`, `employee`, `contractor`, `shareholder_current_account_holder`, `lender_to_entity`, `borrower_from_entity`).
5. **NUNCA** mutar Maria Camila Hoyos como parte de TASK-891. Recovery espera staging synthetic fixture verde + HR approval explícito + ejecución vía dialog UI con reason ≥20 chars.
6. **NUNCA** emitir el evento `.reconciled` (no existe en V1.0). Reusar `.deactivated` + `.created` + metadata correlation.
7. **NUNCA** grant `person.legal_entity_relationships.reconcile_drift` a HR ni FINANCE_ADMIN en V1.0. Solo EFEONCE_ADMIN. Delegación = decisión V1.1.
8. **NUNCA** expose error.message raw desde el route handler. Sanitiza via canonical error response + `captureWithDomain('identity', err, ...)`.
9. **SIEMPRE** envolver UPDATE legacy + INSERT new + outbox publish en `withGreenhousePostgresTransaction`. Si cualquier paso falla, rollback completo.
10. **SIEMPRE** validar `reason.trim().length >= 20` en client UI (button disabled) + server (canonical error). Defense in depth.
11. **SIEMPRE** persistir `metadata_json.reconciliationContext` en la new row para correlation forensic.
12. **SIEMPRE** append marker forensic a `notes` de ambas rows (legacy + new) con shape `[TASK-891 reconciled by actor=X on Y — supersedes/supersededBy Z]`.
13. **SIEMPRE** que un consumer downstream necesite reaccionar a reconciliación, correlar via `actor_user_id + created_at` o leer `metadata_json.reconciliationContext` de la new row. Si emerge necesidad real de meta-evento, V1.1 considera `.reconciled v1`.

## Open Questions (deliberadamente NO decididas en V1)

1. **Delegación de capability a HR**: ¿Bar de observabilidad para flip? Propuesta: 30d steady + 0 incidentes operativos + HR approval explícito.
2. **Drift reverso** (member.contract_type='employee' + relación activa='contractor'): ¿es real en el ecosistema? Eval V2 cuando signal lo emita.
3. **Auto-reconciliation desde cron**: ¿bajo qué condiciones (eval ≥90d, drift count baseline)? Decisión V2 con ADR nuevo + HR approval.
4. **Bulk reconciliation UI**: trigger thresholds operativos. Eval V1.1 si emerge volumen sostenido >50/mes.
5. **Legal/Compliance review Chile** para closing `employee` + opening `contractor`: ¿requiere notarial? V1.1 si emerge requirement legal externo.

## Roadmap by Slices

| Slice | Scope | Deliverables |
|---|---|---|
| 1 | ADR + index | Este doc + `DECISIONS_INDEX.md` entry |
| 2 | Helper canónico + tests | `reconcile-drift.ts` + tests unitarios (8 casos) |
| 3 | Capability + grant + migration + route handler | TS catalog + runtime grant + migration seed + POST endpoint |
| 4 | UI dialog operator-initiated | Dialog en surface admin + microcopy es-CL |
| 5 | Auto-escalation severity post 30d | Signal reader update + tests |
| 6 | Docs + manuales + CLAUDE.md | Funcional + operativo + invariants |

## Related Canonical Patterns

- **TASK-890** — Workforce Exit Payroll Eligibility V1.0 (ADR §7 manda este follow-up). Signal detector que TASK-891 cierra con write path.
- **TASK-877** — workforce.member.complete_intake. Pattern fuente signal-then-command auditado.
- **TASK-700 / TASK-765** — state machine + CHECK + audit. Pattern reusado para append-only relationship history.
- **TASK-839 / TASK-873** — capability registry seed via migration + TS catalog + runtime grant. Triple-layer canonical.
- **TASK-742** — defense-in-depth 7-layer (DB + app + UI + signal + audit + workflow + outbox). Aplicado adaptado a V1.0 (sin approval workflow porque V1.0 es EFEONCE_ADMIN-only).
- **TASK-672** — rich struct + thin predicate. Aplicado al helper canónico (struct return con before/after snapshots).

## References

- Spec task: `docs/tasks/in-progress/TASK-891-person-relationship-drift-reconciliation-write-path.md`
- Predecessor ADR: `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` §7
- Schema migration: `migrations/20260418020712679_task-337-person-legal-entity-foundation.sql`
- Helpers reusables: `src/lib/person-legal-entity-relationships/store.ts:124,174` (TASK-337)
- Signal reader detector: `src/lib/reliability/queries/identity-relationship-member-contract-drift.ts` (TASK-890 Slice 6)
