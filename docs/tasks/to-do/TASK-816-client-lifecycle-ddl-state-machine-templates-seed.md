# TASK-816 — Client Lifecycle DDL + State Machine + Templates Seed

## Delta 2026-05-07 — Bow-tie alignment

Cambia el alcance para alinear con `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` (spec puente entre `spec/Arquitectura_BowTie_Efeonce_v1_1.md` y `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`). Razón: las 6 tasks originales no proyectaban a HubSpot ni clasificaban clientes post-onboarding (Active/Self-Serve/Project), bloqueando el sistema de medición Bow-tie (NRR/GRR/Expansion Rate).

Adiciones obligatorias a esta task (Slice 1 DDL):

1. **Extender `greenhouse_core.clients`** con columnas Bow-tie:
   - `client_kind TEXT CHECK (client_kind IN ('active','self_serve','project'))` — clasificación post-onboarding (Bow-tie §5.1 stages 8/9/10). NULLABLE hasta classifier corre.
   - `client_kind_changed_at TIMESTAMPTZ` — snapshot del último cambio
   - `customer_since DATE` — fecha primer Closed-Won (Bow-tie property §8.1)
   - `last_expansion_date DATE`, `last_renewal_date DATE`
   - `is_at_risk BOOLEAN DEFAULT FALSE` — snapshot motion property Bow-tie §7.1 (Greenhouse computa, projecta a HubSpot)
   - `at_risk_triggered_by TEXT[]` — array catalog: `'msa_expiring','mrr_decline','ico_red'`
   - Migración con `ADD COLUMN ... NULL` (anti-blast). NO toca rows existentes.

2. **Tabla nueva `greenhouse_core.client_kind_history`** (append-only, mismo patrón TASK-535 organization_lifecycle_history):

   ```sql
   CREATE TABLE greenhouse_core.client_kind_history (
     history_id            TEXT PRIMARY KEY,                      -- 'ckh-{uuid}'
     client_id             TEXT NOT NULL REFERENCES greenhouse_core.clients(client_id),
     organization_id       UUID NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
     from_kind             TEXT,                                  -- NULL en primera classification
     to_kind               TEXT NOT NULL CHECK (to_kind IN ('active','self_serve','project')),
     decision_trigger      TEXT NOT NULL CHECK (decision_trigger IN ('msa_active','sow_only','saas_only','manual_override','reactivation')),
     rationale_json        JSONB NOT NULL,                        -- {activeMsaId, activeSowCount, saasSubscriptions[], decision_at}
     case_id               TEXT REFERENCES greenhouse_core.client_lifecycle_cases(case_id),  -- nullable; classifier puede correr fuera de un case
     actor_user_id         TEXT REFERENCES greenhouse_core.users(user_id),
     occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   CREATE INDEX client_kind_history_client_id ON greenhouse_core.client_kind_history (client_id, occurred_at DESC);
   CREATE INDEX client_kind_history_organization_id ON greenhouse_core.client_kind_history (organization_id, occurred_at DESC);
   ```

   Anti-UPDATE/DELETE triggers (mismo patrón `client_lifecycle_case_events_no_update`).

3. **Extender CHECK en `client_lifecycle_cases.metadata_json`** para enforce shape cuando `trigger_source='hubspot_deal'`:

   ```sql
   ALTER TABLE greenhouse_core.client_lifecycle_cases
     ADD CONSTRAINT client_lifecycle_cases_hubspot_metadata_required
     CHECK (
       trigger_source != 'hubspot_deal'
       OR (metadata_json ? 'hubspot_deal_id' AND metadata_json ? 'hubspot_deal_type')
     );
   ```

   Razón: el classifier (TASK-817 Delta) requiere `hubspot_deal_type` para clasificar (Bow-tie §5.2).

4. **Acceptance criteria adicional**:
   - [ ] `clients.client_kind`, `client_kind_changed_at`, `customer_since`, `last_expansion_date`, `last_renewal_date`, `is_at_risk`, `at_risk_triggered_by` agregadas (NULL/default-safe)
   - [ ] `client_kind_history` tabla creada con 2 indexes + 2 triggers anti-UPDATE/DELETE
   - [ ] CHECK `client_lifecycle_cases_hubspot_metadata_required` aplicada
   - [ ] `pnpm db:generate-types` regenera tipos sin error
   - [ ] Smoke SQL: INSERT en `client_kind_history` con `to_kind='unknown'` falla CHECK
   - [ ] Smoke SQL: UPDATE en `client_kind_history` falla con trigger error
   - [ ] Smoke SQL: INSERT case con `trigger_source='hubspot_deal'` y metadata sin `hubspot_deal_type` falla CHECK

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial`
- Blocked by: `none`
- Branch: `task/TASK-816-client-lifecycle-ddl`

## Summary

Materializa la base de datos para el módulo Client Lifecycle V1 (onboarding/offboarding/reactivation): 4 tablas nuevas en `greenhouse_core` (`client_lifecycle_cases`, `client_lifecycle_case_events` append-only, `client_lifecycle_checklist_templates`, `client_lifecycle_checklist_items`) + state machine via CHECK + triggers anti-UPDATE/DELETE + seed de 3 templates canónicos (10+10+5 items).

## Why This Task Exists

Hoy el ciclo de vida de un cliente vive disperso en piezas (TASK-535 lifecycle_stage, TASK-801/802/803 engagement primitives, TASK-706/813 HubSpot pipeline) sin una entidad orquestadora ni audit trail unificado. El operador compone a mano y la falta de un agregado canónico produce: onboardings incompletos invisibles, offboardings ad-hoc con invoices abiertas, sin checklist, sin reliability signals, sin forensic. Este slice canoniza la base estructural sobre la cual los slices 2-6 construirán comandos, API, UI, reliability y HubSpot trigger.

## Goal

- 1 migración aplicada que crea 4 tablas + indexes + CHECK constraints + 2 triggers anti-mutation
- Estado machine de `case.status` enforced en DB (`draft → in_progress → blocked? → completed | cancelled`)
- 3 templates seed insertados: `standard_onboarding_v1` (10 items), `standard_offboarding_v1` (10 items), `reactivation_v1` (5 items)
- Tipos Kysely regenerados (`pnpm db:generate-types`)
- Backward compat 100% (no toca tablas existentes)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — fuente canónica, especialmente §5 (Data Model), §6 (State Machines), §16 (Hard Rules)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — anchor en `organizations.organization_id`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate canónico
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — ownership `greenhouse_ops` + grants `greenhouse_runtime`

Reglas obligatorias:

- Migration generada con `pnpm migrate:create` (NUNCA editar timestamp manual)
- Marker `-- Up Migration` exacto al inicio
- `client_lifecycle_case_events` append-only enforced via triggers PG (mismo patrón TASK-535 `organization_lifecycle_history`)
- Templates declarados como append-only (versionados via `effective_from/effective_to`); NUNCA modificar template existente
- Verificar DDL aplicado via `information_schema.columns` + `pg_constraint` post `pnpm migrate:up` (TASK-768 silent failure pattern)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §5.1–§5.5

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (TASK-535) — FK target
- `greenhouse_core.clients` (TASK-535) — FK target opcional
- `greenhouse_core.users` (existente) — FK target
- `greenhouse_core.assets` (TASK-721) — FK target opcional para `evidence_asset_id`

### Blocks / Impacts

- TASK-817 (canonical commands) — necesita las tablas creadas
- TASK-820 (reliability signals) — lee `client_lifecycle_cases` + `_items`

### Files owned

- `migrations/<timestamp>_task-816-client-lifecycle-ddl.sql`
- `src/types/db.d.ts` (regenerado)
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (Delta minor si aplica)

## Current Repo State

### Already exists

- `greenhouse_core.organizations` con `lifecycle_stage` enum (TASK-535)
- `greenhouse_core.clients` (TASK-535)
- `greenhouse_core.users` + `assets`
- Patrón canónico de append-only audit con anti-UPDATE/DELETE triggers (TASK-535 `organization_lifecycle_history`, TASK-765 `payment_order_state_transitions`, TASK-808 `engagement_audit_log`)
- Spec canónico `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (creado 2026-05-07)

### Gap

- No existe entidad `client_lifecycle_cases` ni audit log asociado
- No existe estructura de checklist orientada a cliente (TASK-030 cubrió HRIS para colaboradores)
- No hay seed de templates canónicos para onboarding/offboarding/reactivation

## Scope

### Slice 1 — Migration DDL

- Crear migración con `pnpm migrate:create task-816-client-lifecycle-ddl`
- 4 CREATE TABLE: `client_lifecycle_cases`, `client_lifecycle_case_events`, `client_lifecycle_checklist_templates`, `client_lifecycle_checklist_items`
- Indexes: hot path + UNIQUE partial active per kind + cursor pagination friendly
- 2 CREATE FUNCTION + 2 CREATE TRIGGER append-only para `client_lifecycle_case_events`
- 1 CREATE TRIGGER append-only para `client_lifecycle_checklist_templates` (versionados append-only)
- Grants: ownership `greenhouse_ops`, runtime grants `greenhouse_runtime`
- Verify DDL aplicado via `information_schema` script post-migración

### Slice 2 — Templates seed

- INSERT en `client_lifecycle_checklist_templates`:
  - `standard_onboarding_v1`: 10 items per spec §5.5
  - `standard_offboarding_v1`: 10 items per spec §5.5
  - `reactivation_v1`: 5 items per spec §5.5
- Mismo migration (split en sección `-- Seed templates`)

### Slice 3 — Types regen + verification

- `pnpm db:generate-types`
- Verificar 4 tablas en `src/types/db.d.ts`
- Smoke SQL: INSERT case + verificar UNIQUE partial rechaza segundo activo del mismo kind
- Smoke SQL: UPDATE en `case_events` debe fallar con error del trigger
- Smoke SQL: INSERT case con `case_kind='offboarding'` y `reason=NULL` debe fallar CHECK
- Smoke SQL: INSERT case `completed` sin `completed_at` debe fallar CHECK

## Out of Scope

- Comandos TS canónicos (`provisionClientLifecycle`, etc.) — TASK-817
- Endpoints HTTP — TASK-818
- UI surfaces — TASK-819
- Reliability signals + reactive consumers — TASK-820
- HubSpot webhook handler — TASK-821
- Modificación de `clients.status` con CHECK que requiere case (TASK-817 enforce a nivel app; CHECK DB sobre `clients` queda OUT — habilitar en V1.1 o cuando V1.0 esté en producción)

## Detailed Spec

Ver `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §5 para DDL completo. Los CREATE TABLE deben copiarse verbatim del spec ajustando solo:

- Schema target: `greenhouse_core` (todas las 4 tablas)
- Ownership: `greenhouse_ops` (ALTER TABLE OWNER TO greenhouse_ops + GRANT a greenhouse_runtime)
- Comments en columnas críticas (case_kind, status, blocked_reason_codes, template_code, owner_role)

Para los seeds, usar INSERT plano con `effective_from = CURRENT_DATE`. Items spec §5.5 verbatim (item_code, item_label, owner_role, blocks_completion, requires_evidence, default_order).

Verificación post-migration (script ad-hoc en migration o doc separado):

```sql
-- 4 tablas existen
SELECT count(*) FROM information_schema.tables
  WHERE table_schema='greenhouse_core'
    AND table_name LIKE 'client_lifecycle%';
-- expect 4

-- UNIQUE partial activa
SELECT indexname FROM pg_indexes
  WHERE tablename='client_lifecycle_cases'
    AND indexname='client_lifecycle_cases_one_active_per_kind';
-- expect 1 row

-- Triggers append-only
SELECT tgname FROM pg_trigger
  WHERE tgrelid='greenhouse_core.client_lifecycle_case_events'::regclass
    AND tgname LIKE 'prevent_%';
-- expect 2 rows

-- Templates seed
SELECT template_code, count(*) FROM greenhouse_core.client_lifecycle_checklist_templates
  GROUP BY template_code;
-- expect 3 rows: standard_onboarding_v1=10, standard_offboarding_v1=10, reactivation_v1=5
```

## Acceptance Criteria

- [ ] `pnpm migrate:up` aplica la migración sin errores
- [ ] 4 tablas existen en schema `greenhouse_core` con DDL del spec §5
- [ ] UNIQUE partial `client_lifecycle_cases_one_active_per_kind` enforced (smoke INSERT segundo activo falla)
- [ ] 2 triggers anti-UPDATE/DELETE en `client_lifecycle_case_events` (smoke UPDATE falla con mensaje "is append-only")
- [ ] CHECK constraint `case_kind='offboarding'` requires `reason IS NOT NULL AND length(reason) >= 10` (smoke falla sin reason)
- [ ] CHECK constraint `status='completed'` requires `completed_at IS NOT NULL` (smoke falla)
- [ ] CHECK constraint `case_kind='reactivation'` requires `previous_case_id IS NOT NULL` (smoke falla)
- [ ] FK constraints `organization_id`, `client_id`, `template_code`, `evidence_asset_id`, `completed_by_user_id` activos
- [ ] 25 filas en `client_lifecycle_checklist_templates` (10 onboarding + 10 offboarding + 5 reactivation)
- [ ] `pnpm db:generate-types` regenera `src/types/db.d.ts` y las 4 tablas aparecen
- [ ] Ownership: las 4 tablas son owned by `greenhouse_ops`; grants `greenhouse_runtime` correctos
- [ ] `pnpm migrate:status` reporta migration aplicada

## Verification

- `pnpm migrate:up`
- `pnpm migrate:status`
- `pnpm db:generate-types`
- `pnpm tsc --noEmit`
- `pnpm pg:connect:shell` para smoke SQL manual (5 smokes listed)

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] Archivo en carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con learnings y desvíos vs spec
- [ ] `changelog.md` actualizado si hubo Delta al spec
- [ ] Chequeo de impacto cruzado sobre TASK-817..821 (deberían quedar listas para tomar)
- [ ] Si hubo desvío vs spec §5, registrar Delta en `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`

## Follow-ups

- TASK-817 puede arrancar inmediatamente al cierre
- Si el smoke detecta edge case en CHECK, evaluar si requiere ajuste al spec antes de TASK-817
- Considerar índice GIN sobre `blocked_reason_codes` si TASK-820 lo necesita para signals (revisar al cierre)

## Open Questions

- ¿Aplicamos CHECK en `clients.status` ahora o en V1.1? Recomendación spec §17 = V1.1 (no afectar runtime existente). Esta task NO toca `clients`.
- ¿`previous_case_id` permite cadena profunda (case A → case B → case C → ...) o solo nivel 1? El FK lo permite naturalmente; sin restricción adicional.
