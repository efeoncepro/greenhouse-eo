# TASK-840 — ISSUE-068 Fase 6: Deprecated capabilities cleanup (oportunista)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Bajo`
- Type: `housekeeping`
- Epic: `—`
- Status real: `Backlog oportunista`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `TASK-839` (necesita writes activos para que emerjan candidates a deprecar)
- Branch: `task/TASK-840-issue-068-fase-6-deprecated-capabilities-cleanup`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Housekeeping oportunista: scan periódico que detecta capabilities en `capabilities_registry` que ya no aparecen en el TS catalog (`src/config/entitlements-catalog.ts`) y las marca `deprecated_at`. Limpia drift histórico sin romper grants persistidos.

**Spec referenciado**: `docs/issues/resolved/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md` (Fase 6 del plan multi-fase 4-pillar — explicitada como "oportunista, no abrir TASK propia"; **se crea ahora a pedido del usuario para registrar el work item explícitamente en backlog**).

## Why This Task Exists

- El TS catalog evoluciona: capabilities se agregan, ocasionalmente se renombran o retiran.
- El registry DB (`capabilities_registry`) acumula entries con el seed inicial + migrations que TASK-611 / futuras tasks agreguen.
- Sin housekeeping, una capability removida del TS catalog queda en el registry indefinidamente. Si alguien escribe un grant con esa capability vía SQL directo o a través de bypass, queda persistido pero el runtime no lo respeta.
- El parity test runtime ya detecta `inRegistryNotInCatalog` — pero rompe el build. La solución honesta es marcar `deprecated_at` (preserva audit histórico de grants pasados) en lugar de borrar.

## Goal

- Lint o cron mensual que escanea registry vs TS catalog y emite reporte de capabilities deprecated candidate.
- Helper canónico `markCapabilityDeprecated({capabilityKey, reason, actorUserId})` con audit log + outbox event.
- Migration discipline: cuando una capability se remueve del TS catalog, una migration la marca `deprecated_at` en el registry (no DELETE).
- 0 capabilities con `deprecated_at IS NULL` que NO existan en TS catalog.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/issues/resolved/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md` (Fase 6)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` Delta 2026-05-08
- `src/lib/capabilities-registry/parity.ts` (TASK-611 Slice 2 — ya detecta `inRegistryNotInCatalog`)

Reglas:

- **NUNCA** DELETE de rows en `capabilities_registry`. Solo `UPDATE deprecated_at = now()`.
- **NUNCA** marcar deprecated una capability que el TS catalog todavía declara. Es drift inverso — fix en migration que la agregue al catalog.
- **SIEMPRE** registrar en `entitlement_governance_audit_log` cada mark deprecated con `change_type` futuro (extender CHECK del audit log si emerge necesidad).
- **SIEMPRE** verificar antes de deprecar: ¿existe algún grant activo (no expirado, no archived) que la referencia? Si sí, **NO deprecar** — primero migrar grants a capability nueva o documentar el drift.

## Dependencies & Impact

### Depends on

- TASK-838 Fase 1 (governance tables + audit log).
- TASK-839 (admin endpoints activos para que `markCapabilityDeprecated` propague outbox + audit).
- `src/lib/capabilities-registry/parity.ts` (parity test ya detecta candidates).

### Blocks / Impacts

- Ninguna feature crítica. Es housekeeping. Si se omite indefinidamente, drift acumula como warning visual en `/admin/operations` (parity signal) pero no bloquea operación.

## Current Repo State

### Already exists

- Columna `deprecated_at TIMESTAMPTZ` en `capabilities_registry` (TASK-611 Slice 2 migration).
- Parity test detecta drift (`inRegistryNotInCatalog`).
- Index parcial `WHERE deprecated_at IS NULL` para reads activos.

### Gap

- No hay helper para marcar deprecated.
- No hay endpoint admin para hacerlo.
- No hay scan periódico que recomiende candidates.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Helper canónico `markCapabilityDeprecated`

- `src/lib/capabilities-registry/deprecate.ts`:
  - `markCapabilityDeprecated({capabilityKey, reason, actorUserId})` — atomic tx:
    1. Pre-check: scan `role_entitlement_defaults` y `user_entitlement_overrides` por grants activos con `capability = capabilityKey`. Si > 0, throw con detalle (operador decide migrar primero).
    2. UPDATE `capabilities_registry SET deprecated_at = now()`.
    3. INSERT en `entitlement_governance_audit_log` con `change_type='capability_deprecated'` (extender CHECK del audit log).
    4. `publishOutboxEvent('access.capability.deprecated', { capabilityKey, reason, actorUserId })` (event nuevo en EVENT_TYPES).
- 4 tests: happy path, capability no existe (404), capability con grants activos (rejected), audit + outbox publishing.

### Slice 2 — Endpoint admin

- `POST /api/admin/governance/access/capabilities/[key]/deprecate` con capability `access.governance.capability.deprecate` (EFEONCE_ADMIN solo).
- Body: `{ reason: string >= 10 chars }`.
- Return: `{ deprecatedAt, auditId }`.

### Slice 3 — Scan reporter

- Script `scripts/governance/find-deprecated-candidates.ts` (one-shot, idempotente):
  - Lee TS catalog + registry.
  - Lista capabilities en registry con `deprecated_at IS NULL` cuya key NO está en TS catalog.
  - Lista grants activos por capability (de role_defaults + user_overrides).
  - Output: tabla CSV con candidates ordenados por `(grant_count_descending, introduced_at_ascending)`.
  - Operador decide cuáles deprecar via endpoint Slice 2.

### Slice 4 — Migration discipline (documentación)

- Update CLAUDE.md: regla canónica "cuando se remueve capability del TS catalog, migration que la marque deprecated_at".
- Update AGENTS.md: misma regla.

## Out of Scope

- Cron mensual que auto-deprecate. Demasiado peligroso (auto-mutation sobre el registry sin operador en el loop). Operador-driven via Slice 3 reporter + Slice 2 endpoint manual.
- Migrar grants persistidos automáticamente a capabilities nuevas. Caso por caso, no automático.

## Acceptance Criteria

- [ ] `markCapabilityDeprecated` helper atomic con pre-check de grants activos.
- [ ] Admin endpoint con capability granular + audit log row + outbox event.
- [ ] Scan reporter script funcional con CSV output.
- [ ] CHECK constraint `entitlement_governance_audit_log_change_type_check` extendido para incluir `'capability_deprecated'` (migration).
- [ ] EVENT_TYPES extiende `access.capability.deprecated` v1 (event-catalog.ts + REACTIVE_EVENT_TYPES si emerge consumer).
- [ ] Disciplina canonizada en CLAUDE.md + AGENTS.md.

## Verification

- `pnpm lint` + `pnpm tsc --noEmit` + `pnpm test`
- Live test: deprecate capability con grants activos → rejected (error claro). Sin grants → success.
- Parity test runtime: post-deprecate, capability ya no aparece en `inRegistryNotInCatalog`.

## Closing Protocol

Estándar.

## Follow-ups

- Ninguno. Esta task cierra el plan multi-fase de ISSUE-068 al 100%.
