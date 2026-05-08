# ISSUE-068 — TASK-404 governance tables never created (pre-up-marker bug)

## Estado

Resolved (Fases 1-4 entregadas 2026-05-08 vía TASK-838; Fase 5 derivada en TASK-839).

## Resolución aplicada (2026-05-08)

- **Fase 1 ✅** — Forward fix migration `20260508114738704_task-838-fix-task-404-governance-tables-pre-up-marker.sql`. Las 3 governance tables existen en PG dev (381 tablas vs 378 pre-fix). Bloque DO con RAISE EXCEPTION verifica information_schema post-DDL. Append-only audit log enforced también via triggers PG.
- **Fase 2 ✅** — CI gate `scripts/ci/migration-marker-gate.mjs` modo strict en `.github/workflows/ci.yml`. Bloquea PRs con patrón "Up vacía + DDL en Down". 7 self-tests verdes. 295 migrations scanned (1 INFO whitelisted: el legacy de TASK-404 ya forward-fixed).
- **Fase 3 ✅** — Reliability signal `infrastructure.critical_tables.missing` (drift, error si > 0). Lista declarativa de 16 tablas críticas + reader que consulta information_schema. Wireado en `get-reliability-overview.ts` bajo moduleKey 'cloud'. Live PG verde (16/16 presentes).
- **Fase 4 ✅** — FK enforcement migration `20260508115742046_task-838-fk-grants-to-capabilities-registry.sql`. Patrón NOT VALID + VALIDATE atomic + DO block guard post-DDL. Live FK test verde: insert con capability inexistente → FK violation rechazado por DB; insert con capability válida → success. `pg_constraint` confirma `role_entitlement_defaults_capability_fk` + `user_entitlement_overrides_capability_fk` con `convalidated=TRUE`.
- **Fase 5 (deferred)** — Wire Admin Center mutation paths. Movida a **TASK-839** (1-2 días, UX-heavy). No bloqueante: la infraestructura DB + observability + CI gate ya están en su lugar.
- **Fase 6 (oportunista)** — Cleanup capabilities deprecated. No abre TASK propia.

3592/3592 tests verdes. CLAUDE.md + AGENTS.md ya documentan las hard rules canonizadas (commit `a514dec5`). Patrón forward-fix sin tocar legacy preservado.

## Ambiente

Greenhouse EO — Postgres `greenhouse-pg-dev` (Cloud SQL `efeonce-group:us-east4`).

## Detectado

2026-05-08, durante discovery de TASK-611 (recalibración pre-execution V1.1 del spec
`GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1`).

## Síntoma

TASK-404 (`docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md`) está
marcado como cerrado en el README, pero las 3 tablas que el spec declara como entregables
no existen en Postgres:

- `greenhouse_core.role_entitlement_defaults`
- `greenhouse_core.user_entitlement_overrides`
- `greenhouse_core.entitlement_governance_audit_log`

Verificación: `grep "GreenhouseCoreRoleEntitlement\\|GreenhouseCoreUserEntitlement\\|GreenhouseCoreEntitlementGovernance" src/types/db.d.ts` retorna 0 matches. `kysely-codegen` introspect 378 tablas en Postgres y ninguna corresponde a las 3 tablas governance.

## Causa raíz

Pre-up-marker bug en `migrations/20260417044741101_task-404-entitlements-governance.sql`.
Las sentencias `CREATE TABLE` están bajo el marker `-- Down Migration` en lugar de bajo `-- Up Migration`. La sección Up del archivo está vacía.

```sql
-- Up Migration

-- Down Migration
CREATE TABLE greenhouse_core.role_entitlement_defaults (...)
CREATE TABLE greenhouse_core.user_entitlement_overrides (...)
CREATE TABLE greenhouse_core.entitlement_governance_audit_log (...)
```

Cuando `node-pg-migrate` corre la migration:

1. Parsea el archivo buscando `-- Up Migration` para identificar la sección Up.
2. La sección Up queda vacía (no SQL entre `-- Up Migration` y `-- Down Migration`).
3. Registra la migration en `pgmigrations` como aplicada SIN ejecutar las CREATE TABLE.

Es exactamente el patrón anti-regresión documentado en `CLAUDE.md` ("Database — Migration markers (anti pre-up-marker bug)") y que TASK-768 Slice 1 también encontró históricamente.

## Impacto

**Magnitud**: alto a futuro, bajo hoy.

- **Hoy**: el runtime de entitlements de Greenhouse es 100% pure-function (compone capabilities desde `roleCodes + routeGroups + authorizedViews` en cada request). No depende de las governance tables. Por eso el sistema funciona sin ellas.
- **Bloquea**: cualquier feature que dependa de overrides finos persistidos por usuario o defaults configurables por rol (Admin Center > Gobernanza de acceso). Esa surface está construida en UI pero los writes no llegan a ningún lado.
- **Bloquea (TASK-611 V1)**: la decisión Slice 2 de NO agregar FK desde grants persistidos a `capabilities_registry` se origina aquí — la tabla canónica de grants no existe.
- **Layer 5 audit log**: el spec V1 §5 layer 5 referencia `entitlement_grant_audit_log` (TASK-404). Como la tabla no existe, ese layer está ausente. La projection de TASK-611 es read-only, así que no requiere audit log propio (el gap es para el Admin Center mutations).

Cualquier feature futura que asuma que estas tablas existen va a romper silenciosamente — `INSERT INTO greenhouse_core.role_entitlement_defaults` falla con `relation does not exist`.

## Solución — plan multi-fase con 4 pillars

La resolución no es solo "aplicar la SQL". Es **resolver la clase de bug** para que no vuelva a pasar (un agente futuro puede repetir el patrón) Y propagar los efectos secundarios pendientes (FK enforcement, runtime guards, audit log activation). Plan estructurado por fases con scoring 4-pillar:

### Fase 1 — Fix migration canónica (P1, inmediato)

**Objetivo**: las 3 governance tables existen en PG con el mismo schema que TASK-404 declaró.

**Acciones**:

1. NO editar la migration legacy `20260417044741101` — ya está registrada en `pgmigrations`. Editarla provocaría que un environment fresh re-corra el SQL roto y otros environments queden inconsistentes. Patrón canónico anti-edición de migration aplicada: usar **forward fix migration** (mismo principio TASK-768 Slice 1).
2. `pnpm migrate:create task-068-fix-task-404-governance-tables-pre-up-marker`.
3. Bajo `-- Up Migration` (correcto):
   - Copiar las 3 `CREATE TABLE` del archivo bugged + UNIQUE INDEX + GRANT.
   - **Idempotencia**: agregar `IF NOT EXISTS` a CREATE TABLE y CREATE INDEX. Re-correr es safe.
   - **Anti pre-up-marker bug**: bloque `DO $$ ... RAISE EXCEPTION` al final que valida `information_schema.tables` y aborta si las tablas no quedaron creadas (mismo patrón que TASK-611 Slice 2 usó).
4. Bajo `-- Down Migration`: `DROP TABLE IF EXISTS` de las 3 tablas (idempotente).
5. Aplicar via `pnpm pg:connect:migrate` (regenera Kysely types automaticamente).
6. Verificar `db.d.ts` tiene las 3 nuevas interfaces.

**Score**:
- **Safety**: forward fix sin editar migration aplicada → no rompe environments con DB ya migrada. CHECK constraints + UNIQUE composite index protegen contra writes inválidos.
- **Robustness**: idempotente (IF NOT EXISTS). Anti pre-up-marker bug DO block. Transaction-wrapped por `node-pg-migrate`.
- **Resilience**: el fix no toca runtime — Greenhouse es pure-function, no leerá las tablas hasta que existan paths de mutation. Si algo falla mid-migration, rollback automatic.
- **Scalability**: trivial — 3 CREATE TABLE, scale O(1).

### Fase 2 — Anti-regression CI gate (P1, mismo PR)

**Objetivo**: prevenir que **otro agente** caiga en el mismo bug en una migration futura.

**Acciones**:

1. Crear `scripts/ci/migration-marker-gate.mjs`:
   - Walk `migrations/*.sql`.
   - Por cada archivo, parsear:
     - Asertar que `-- Up Migration` aparece exactamente 1 vez.
     - Asertar que `-- Down Migration` aparece exactamente 1 vez (o 0, en casos legacy).
     - Extraer la sección entre `-- Up Migration` y `-- Down Migration` (o EOF).
     - **Heurística del bug**: si la sección Up está vacía (solo whitespace/comentarios) Y la sección Down contiene DDL keywords (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `CREATE FUNCTION`) → **ERROR con mensaje claro**.
   - Whitelist explícita para migrations donde la Up vacía es intencional (raro — debe llevar comentario `-- intentionally empty: <reason>`).
2. Agregar a `package.json`: `"migration-marker-gate": "node scripts/ci/migration-marker-gate.mjs"`.
3. Wire en `.github/workflows/ci.yml` antes de `pnpm migrate:up` (modo blocking).
4. Tests del gate: 1 valid case + 2 invalid cases (Up vacía + Down con CREATE TABLE; Up vacía + Down con ALTER TABLE).

**Score**:
- **Safety**: bug class detection — bloquea TODA migration que repita el patrón antes de mergear.
- **Robustness**: parser regex simple sobre 2 markers (low complexity, low false-positive rate).
- **Resilience**: si el gate tiene bug, falla hard (CI red) en lugar de silent-pass (preferido).
- **Scalability**: O(N) sobre migrations, runs once per PR. Migrations no crecen rápido (~3-5/semana).

### Fase 3 — Runtime startup guard (P2, defense in depth)

**Objetivo**: detectar **otros bugs futuros** del mismo tipo en runtime, no solo en CI. Si por algún motivo (rollback parcial, manual DROP, restore desde backup viejo) una tabla crítica desaparece, el portal lo detecta antes que un endpoint falle.

**Acciones**:

1. Crear `src/lib/db-health/critical-tables-check.ts`:
   - Lista declarativa de tablas críticas: `greenhouse_core.client_users`, `greenhouse_core.user_role_assignments`, `greenhouse_core.organizations`, `greenhouse_core.spaces`, `greenhouse_core.client_team_assignments`, `greenhouse_core.capabilities_registry`, las 3 governance de TASK-404.
   - Función `verifyCriticalTablesExist()` que hace `SELECT count(*) FROM information_schema.tables WHERE schema_name + table_name IN (...)`.
2. Agregarlo como **reliability signal** nuevo: `infrastructure.critical_tables.missing` (kind=`drift`, severity=`error` si count > 0). Steady=0.
3. Ningún hot-path bloqueante — solo signal en `/admin/operations` + Sentry alert via `captureWithDomain('cloud', ...)`.
4. NO bloquear el startup del portal — degraded mode honesto. Si una tabla crítica falta, el feature dependiente degradará en su path canónico (ej. Admin Center governance).

**Score**:
- **Safety**: catch silent failures de migrations futuras o rollbacks accidentales.
- **Robustness**: read-only query a `information_schema` — no muta nada, no puede fallar por contention.
- **Resilience**: signal degrada honestamente a `unknown` si el query falla. Nunca crashea startup.
- **Scalability**: query tiny, runs cada N min via reader del control plane.

### Fase 4 — FK enforcement + canonical_values (P2, follow-up de TASK-611)

**Objetivo**: cerrar el **defense-in-depth Layer 1** que TASK-611 dejó deferred. Una vez existan grants persistidos, agregar FK al registry.

**Acciones**:

1. Migration `task-068-fk-grants-to-capabilities-registry.sql`:
   - `ALTER TABLE greenhouse_core.role_entitlement_defaults ADD CONSTRAINT role_entitlement_defaults_capability_fk FOREIGN KEY (capability) REFERENCES greenhouse_core.capabilities_registry(capability_key) NOT VALID;`
   - `ALTER TABLE ... VALIDATE CONSTRAINT role_entitlement_defaults_capability_fk;` (atomic NOT VALID + VALIDATE — patrón TASK-708/728).
   - Mismo para `user_entitlement_overrides.capability`.
2. **Backfill defensivo previo**: scan ambas tablas y reportar rows con `capability` que no existe en registry. Si > 0, esos rows deben ser deprecados antes de aplicar el FK (no archivar — registrar `deprecated_at` en registry).
3. Marcar capabilities legacy del seed TASK-404 (si las hay) que no estén en TS catalog: `UPDATE capabilities_registry SET deprecated_at = now() WHERE capability_key NOT IN (...)`.

**Score**:
- **Safety**: DB nivel rechaza grants con capability inexistente. Cierra el último gap del 7-layer defense-in-depth para entitlements.
- **Robustness**: NOT VALID + VALIDATE atomic — pattern probado en TASK-708/728/766. Cero downtime.
- **Resilience**: si el VALIDATE falla por rows inválidos, el ALTER se aborta limpio — backfill previo lo previene.
- **Scalability**: NOT VALID es O(1); VALIDATE es O(N) sobre N rows existentes (decenas, no miles — los grants son operacionales, no transaccionales).

### Fase 5 — Wire Admin Center mutation paths (P2, follow-up)

**Objetivo**: que los writes desde Admin Center > Gobernanza de acceso ahora lleguen realmente a las tablas y no caigan al vacío.

**Acciones**:

1. Identificar los endpoints existentes de TASK-404 (`/api/admin/governance/access/...`, `/api/admin/users/[id]/access/...`) — algunos pueden tener swallow-error porque la tabla no existía.
2. Validar que cada mutation:
   - Usa capability granular least-privilege (`access.governance.*`, `access.user_overrides.*`).
   - Publica el outbox event correspondiente (`access.entitlement_role_default_changed` o `access.entitlement_user_override_changed`) — TASK-611 Slice 6 ya tiene el consumer reactivo wireado.
   - Inserta en `entitlement_governance_audit_log` con `actor_user_id`, `occurred_at`, `payload_json`, `reason`.
3. Test E2E: admin crea un override → outbox event publicado → consumer reactivo droppa cache de la projection → próximo request del usuario afectado refleja el grant en pocos segundos.
4. UX honesto: si un usuario admin abre Admin Center > Gobernanza HOY (pre-fix), debería ver banner de degraded mode "Función bloqueada por ISSUE-068". No silent-fail.

**Score**:
- **Safety**: capability granular, audit log append-only, approval workflow en sensitive grants (TASK-404 spec).
- **Robustness**: writes en transacción con outbox event (atomic — patrón TASK-771).
- **Resilience**: degraded mode honesto en UI hasta que la fase aplique. Outbox dead-letter signal cubre el reactive path.
- **Scalability**: writes operacionales (<100/día), reads cacheados.

### Fase 6 — Cleanup de capabilities deprecated (P3, opcional)

**Objetivo**: tras Fase 4, scan periódico (cron mensual o lint) que detecte capabilities en TS catalog sin usage y las marque `deprecated_at`.

Esto es housekeeping, no urgent. Puede vivir como TASK derivada de baja prioridad.

## Roadmap consolidado

| Fase | Scope | Prioridad | Bloquea | Esfuerzo |
|---|---|---|---|---|
| 1 | Fix migration canónica | P1 | nada | Bajo (1h) |
| 2 | Anti-regression CI gate | P1 | nada | Bajo (2h) |
| 3 | Runtime startup guard + signal | P2 | Fase 1 | Medio (3-4h) |
| 4 | FK enforcement grants → registry | P2 | Fase 1 | Medio (3h) |
| 5 | Wire Admin Center mutations | P2 | Fase 1 + 4 | Alto (1-2 días) |
| 6 | Cleanup capabilities deprecated | P3 | Fase 5 | Bajo (oportunista) |

**Recomendación de empaquetado**: Fases 1+2 en una sola TASK-derivada (~half-day, P1). Fases 3-5 en una segunda TASK-derivada (~2-3 días, P2). Fase 6 oportunista, no abrir TASK propia.

**Fuera de scope explícito**: cambiar el modelo runtime de pure-function a DB-backed. La decisión arquitectónica ("runtime es pure-function, governance tables son admin overlay") sigue válida — TASK-404 nunca planeó hacer el runtime DB-dependent. El fix solo activa la capa de governance overlay que existió en intent pero nunca en runtime.

### Hard rules canonizadas tras esta fix

- **NUNCA** colocar `CREATE TABLE` / `ALTER TABLE` / `CREATE INDEX` debajo de `-- Down Migration`. La sección Down es para `DROP` / `ALTER ... DROP CONSTRAINT` / undo. Si alguna vez una migration parece exigirlo, hay un bug en el diseño — reportar.
- **NUNCA** editar una migration ya aplicada. Forward fix con migration nueva idempotente.
- **NUNCA** marcar una migration como complete sin verificar `information_schema` post-apply. Bloque `DO $$ ... RAISE EXCEPTION` es el mecanismo canónico.
- **SIEMPRE** que crees una migration nueva, correr `pnpm migration-marker-gate` (post Fase 2) localmente antes de PR. CI bloquea pero verificar local ahorra round-trips.

## Verificación

Post-fix:

```bash
pnpm db:generate-types
grep "GreenhouseCoreRoleEntitlementDefaults\\|GreenhouseCoreUserEntitlementOverrides\\|GreenhouseCoreEntitlementGovernanceAuditLog" src/types/db.d.ts
# Debe retornar 3 matches.

pnpm pg:doctor  # OK
```

Manual:

```sql
SELECT count(*) FROM greenhouse_core.role_entitlement_defaults;
SELECT count(*) FROM greenhouse_core.user_entitlement_overrides;
SELECT count(*) FROM greenhouse_core.entitlement_governance_audit_log;
-- Las 3 deben devolver 0 rows (tabla creada pero vacía hasta seed).
```

## Relacionado

- `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md` — task de origen.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` Delta 2026-04-17 — declara las 3 tablas como contrato.
- `docs/tasks/in-progress/TASK-611-organization-workspace-facet-projection-entitlements-foundation.md` — discovery que detectó el bug.
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Delta 2026-05-08 — recalibración V1.1 que documenta este gap.
- `CLAUDE.md` — sección "Database — Migration markers (anti pre-up-marker bug)" (regla canónica que esta migration violó).
- `migrations/20260417044741101_task-404-entitlements-governance.sql` — archivo bugged (línea 1: `-- Up Migration` / línea 3: `-- Down Migration` con CREATE TABLE debajo).

## Siguiente paso

Esta issue queda Open. La fix vive como TASK derivada (P2) — no es bloqueante para TASK-611 ni para operación diaria del portal. El documento sirve como auditoría del hallazgo y el contrato de remediación cuando se priorice.
