# TASK-838 — ISSUE-068 Resolution: TASK-404 governance tables + CI gate + runtime guard + FK enforcement (Fases 1-4)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `bugfix + hardening`
- Epic: `—` (cierra ISSUE-068)
- Status real: `Cerrada 2026-05-08 — 4 fases entregadas, 3592/3592 tests verdes, ISSUE-068 movido a resolved/`
- Domain: `identity` + `cloud` (CI + runtime guards)
- Blocked by: `none`
- Branch: `task/TASK-838-issue-068-task-404-governance-tables-resolution`
- ISSUE asociado: `ISSUE-068`

## Summary

Resuelve **end-to-end** las Fases 1-4 del plan documentado en `docs/issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md`. La Fase 5 (wire Admin Center mutation paths) queda como TASK-839 derivada (1-2 días, UX-heavy). Fase 6 oportunista.

**Alcance**:

- **Fase 1** — Forward fix migration que crea las 3 governance tables de TASK-404 (`role_entitlement_defaults`, `user_entitlement_overrides`, `entitlement_governance_audit_log`) con sus indexes + GRANTs + bloque DO de verificación post-DDL.
- **Fase 2** — CI gate `migration-marker-gate.mjs` que detecta el patrón "Up vacía + Down con DDL" en cualquier migration nueva. Modo blocking en PRs.
- **Fase 3** — Runtime startup guard via reliability signal `infrastructure.critical_tables.missing` (drift, error). Lista declarativa de tablas críticas + reader que consulta `information_schema`.
- **Fase 4** — FK enforcement `role_entitlement_defaults.capability` y `user_entitlement_overrides.capability` → `capabilities_registry.capability_key` (NOT VALID + VALIDATE atomic, patrón TASK-708/728).

## Goal

Cerrar la **clase de bug** que parió ISSUE-068:

1. Las 3 governance tables existen en PG con schema correcto.
2. Cualquier agente futuro que repita el patrón se bloquea en CI antes del merge.
3. Cualquier rollback parcial / restore desde backup viejo se detecta en runtime via signal.
4. Defense-in-depth Layer 1 cerrado para entitlements grants (FK al registry canónico).

## Architecture Alignment

- `docs/issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md` — plan canónico 4-pillar
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate spec
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — Delta 2026-04-17 (TASK-404) + Delta 2026-05-08 (TASK-611)
- `migrations/20260417044741101_task-404-entitlements-governance.sql` — archivo bugged (legacy, no editar)

## Scope

### Slice 1 — Forward fix migration (Fase 1)

- `pnpm migrate:create task-838-fix-task-404-governance-tables-pre-up-marker`.
- Up Migration:
  - 3 `CREATE TABLE IF NOT EXISTS` (role_entitlement_defaults, user_entitlement_overrides, entitlement_governance_audit_log) con schemas idénticos al SQL legacy bugged (preserva intent original de TASK-404).
  - 4 indexes UNIQUE/standard (idénticos al legacy).
  - GRANTs `SELECT, INSERT, UPDATE, DELETE` a `greenhouse_runtime` para las 2 mutables; `SELECT, INSERT` para audit log (append-only).
  - Bloque DO con RAISE EXCEPTION que verifica las 3 tablas existen post-apply.
- Down Migration: `DROP TABLE IF EXISTS` de las 3 (idempotente).
- Aplicar via `pnpm pg:connect:migrate`. Regenera Kysely types.
- Verificación: `db.d.ts` tiene las 3 nuevas interfaces.

### Slice 2 — CI gate migration-marker-gate (Fase 2)

- `scripts/ci/migration-marker-gate.mjs`:
  - Walk `migrations/*.sql`.
  - Por cada archivo, parsear sección Up (entre `-- Up Migration` y `-- Down Migration` o EOF).
  - Detectar bug: Up vacía/whitespace + Down contiene `CREATE TABLE` / `ALTER TABLE` / `CREATE INDEX` / `CREATE FUNCTION` / `CREATE TRIGGER` → ERROR.
  - Whitelist explícita: comentario `-- intentionally empty: <reason>` permite Up vacía.
  - Excluir migration legacy bugged `20260417044741101` (ya documentada como ISSUE-068; whitelist explícita).
- `package.json`: nuevo script `migration-marker-gate`.
- `.github/workflows/ci.yml`: agregar step que corre el gate antes de `pnpm build`.
- Tests `scripts/ci/__tests__/migration-marker-gate.test.mjs`: 1 valid + 3 invalid cases (CREATE TABLE en Down, ALTER TABLE en Down, CREATE INDEX en Down).
- Local check: `pnpm migration-marker-gate` debe pasar contra el repo actual (excepto la legacy whitelisted).

### Slice 3 — Runtime startup guard + signal (Fase 3)

- `src/lib/db-health/critical-tables-check.ts`:
  - Lista declarativa `CRITICAL_TABLES`: client_users, user_role_assignments, organizations, spaces, clients, client_team_assignments, capabilities_registry, role_entitlement_defaults, user_entitlement_overrides, entitlement_governance_audit_log.
  - `verifyCriticalTablesExist(): Promise<{missingTables: string[]}>`.
- `src/lib/reliability/queries/critical-tables-missing.ts`:
  - Signal ID `infrastructure.critical_tables.missing` (kind=`drift`, severity=`error` si > 0). Steady=0.
  - Wireado en `get-reliability-overview.ts` bajo moduleKey `'cloud'`.
  - Cualquier table missing → `captureWithDomain(err, 'cloud', { tags: { source: 'critical_tables_check' } })`.
- Tests: drift signal + happy path.

### Slice 4 — FK enforcement (Fase 4)

- `pnpm migrate:create task-838-fk-grants-to-capabilities-registry`.
- Up:
  - Pre-cleanup defensivo: scan `role_entitlement_defaults` y `user_entitlement_overrides` por `capability` que no esté en `capabilities_registry` (o que esté con `deprecated_at IS NOT NULL`). Si > 0 rows, RAISE NOTICE con detalle. **NO marcar como deprecated automáticamente** — operador decide.
  - `ALTER TABLE greenhouse_core.role_entitlement_defaults ADD CONSTRAINT role_entitlement_defaults_capability_fk FOREIGN KEY (capability) REFERENCES greenhouse_core.capabilities_registry(capability_key) NOT VALID;`
  - `ALTER TABLE ... VALIDATE CONSTRAINT role_entitlement_defaults_capability_fk;`
  - Mismo para `user_entitlement_overrides_capability_fk`.
  - Bloque DO post-apply: verifica `pg_constraint` tiene los 2 FKs creados.
- Down: `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` para los 2.
- Tests: verifica que insertar grant con capability inexistente → FK violation.

## Out of Scope

- Fase 5 (wire Admin Center mutation paths con outbox + audit log + UI degraded mode). Queda como **TASK-839** (a crear como follow-up). 1-2 días, UX-heavy.
- Fase 6 (cleanup capabilities deprecated). Oportunista, no abrir TASK propia.
- Cambiar el modelo runtime de pure-function a DB-backed. Decisión arquitectónica preservada — runtime sigue siendo pure-function; las governance tables son admin overlay.

## Acceptance Criteria

- [ ] Las 3 governance tables existen en PG (verificable con `psql` o `db.d.ts`).
- [ ] `pnpm migration-marker-gate` corre verde local + en CI workflow.
- [ ] Migration con CREATE TABLE bajo Down → CI red (test del gate).
- [ ] Reliability signal `infrastructure.critical_tables.missing` aparece en `/admin/operations` bajo subsystem `Cloud Platform` con severity ok (steady=0).
- [ ] FK constraints `role_entitlement_defaults_capability_fk` + `user_entitlement_overrides_capability_fk` activos y validados.
- [ ] Insert de grant con capability inexistente → FK violation (test).
- [ ] ISSUE-068 movido a `resolved/` con fecha + verificación.
- [ ] PR a `develop` con resumen de las 4 fases + KPI/data diff.

## Verification

- `pnpm lint` + `pnpm tsc --noEmit` + `pnpm test`
- `pnpm pg:connect:migrate` aplica sin errores; bloque DO no aborta.
- `pnpm pg:doctor` verde
- `pnpm migration-marker-gate` verde (excepto whitelisted legacy)
- Live PG: queries `SELECT count(*) FROM greenhouse_core.role_entitlement_defaults;` etc. retornan 0 sin error.
- FK violation test: `INSERT INTO greenhouse_core.role_entitlement_defaults (capability='organization.zombie_inexistente', ...)` → ERROR FK.
- Reliability signal verde en steady=0.
