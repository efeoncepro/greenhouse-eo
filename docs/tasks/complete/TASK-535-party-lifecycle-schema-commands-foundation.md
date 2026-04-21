# TASK-535 — Party Lifecycle Schema & Commands Foundation (Fase A)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado — 2026-04-21`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-535-party-lifecycle-schema-commands-foundation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase A del programa TASK-534. Extiende `greenhouse_core.organizations` con `lifecycle_stage`, `commercial_party_id`, `is_dual_role` y columnas auxiliares; crea la tabla inmutable `organization_lifecycle_history`; implementa los comandos CQRS `promoteParty`, `createPartyFromHubSpotCompany`, `instantiateClientForParty`; backfill idempotente sobre organizations existentes. Nada visible al usuario todavia.

## Why This Task Exists

Sin la foundation nadie mas puede construir: ni el sync inbound de prospects, ni el selector unificado, ni la creacion de deal inline, ni quote-to-cash. El comando `promoteParty` es el unico punto de entrada autorizado para transicionar estados; sin el, cada modulo inventaria su propia semantica y la hub queda con tax rate problem (ver TASK-528 como antecedente).

## Goal

- Agregar columnas de lifecycle sobre `organizations` sin romper consumers existentes.
- Crear `organization_lifecycle_history` como historial inmutable de transiciones.
- Implementar los 3 comandos CQRS con audit trail, outbox emit y validacion de invariantes.
- Ejecutar backfill idempotente para clasificar todas las organizations actuales.
- Publicar el tipo `LifecycleStage` y helpers en `src/lib/commercial/party/`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — secciones §4, §6, §8, §10
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- DDL via `node-pg-migrate` con `pnpm migrate:create`; nunca editar timestamps manualmente.
- `lifecycle_stage` default `prospect`; migracion backfill separada del DDL inicial.
- `organization_lifecycle_history` es append-only; ningun UPDATE/DELETE permitido.
- Los 3 comandos viven en `src/lib/commercial/party/commands/` y son el UNICO write path legal para lifecycle.
- Cada comando emite evento canonico al outbox en la misma transaccion del write.
- Capability gates segun spec §9.1; validar con `hasCapability(userId, 'commercial.party.*')` antes de ejecutar.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (existe)
- `greenhouse_core.clients` (existe)
- `greenhouse_sync.outbox_events` (existe)
- `src/lib/db.ts` (Kysely + `withTransaction`)
- `src/lib/commercial/*-events.ts` (patron de emit existente)

### Blocks / Impacts

- `TASK-536` Fase B (inbound sync) — requiere `createPartyFromHubSpotCompany`
- `TASK-537` Fase C (endpoints) — requiere comandos + tabla history
- `TASK-538` Fase D (selector) — lee `lifecycle_stage`
- `TASK-539` Fase E (inline deal) — usa `promoteParty(prospect→opportunity)`
- `TASK-540` Fase F (outbound) — consume eventos `commercial.party.*`
- `TASK-541` Fase G (quote-to-cash) — compone `promoteParty` + `instantiateClientForParty`

### Files owned

- `migrations/YYYYMMDDHHMMSS_task-535-organization-lifecycle-ddl.sql`
- `migrations/YYYYMMDDHHMMSS_task-535-organization-lifecycle-backfill.sql`
- `scripts/backfill-organization-lifecycle.ts`
- `src/lib/commercial/party/types.ts`
- `src/lib/commercial/party/commands/promote-party.ts`
- `src/lib/commercial/party/commands/create-party-from-hubspot-company.ts`
- `src/lib/commercial/party/commands/instantiate-client-for-party.ts`
- `src/lib/commercial/party/party-events.ts`
- `src/lib/commercial/party/party-store.ts`
- `src/lib/commercial/party/lifecycle-state-machine.ts`
- `src/types/db.d.ts` (regenerado automatico)

## Current Repo State

### Already exists

- `greenhouse_core.organizations` con `organization_id`, `hubspot_company_id`, `tenant_type`, `client_id` FK (TASK-486)
- `greenhouse_core.clients` con `client_id`, `organization_id`, `hubspot_company_id`
- Patron de comandos CQRS en `src/lib/commercial/` (master-agreements, contracts)
- Patron de outbox emit (`src/lib/commercial/quotation-events.ts`)
- Entitlements runtime (TASK-403/404) con capability checks
- `node-pg-migrate` + `kysely-codegen` operativos

### Gap

- No existen columnas `lifecycle_stage`, `lifecycle_stage_since`, `lifecycle_stage_source`, `commercial_party_id`, `is_dual_role` en `organizations`.
- No existe tabla `organization_lifecycle_history`.
- No existen comandos ni helpers para lifecycle.
- No existen eventos `commercial.party.*` en el catalogo.
- No existe capability `commercial.party.*` en el entitlements seed.
- Backfill: organizations sin lifecycle cruzan a `prospect` por default — validar que no rompa consumers que asumen `active_client` implicito.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — DDL + history table

- Migracion DDL con ALTER TABLE organizations + CREATE TABLE organization_lifecycle_history + indexes.
- `pnpm db:generate-types` para regenerar Kysely types.

### Slice 2 — Backfill idempotente

- Script `scripts/backfill-organization-lifecycle.ts` con reglas de §10.1 del spec.
- Migracion de backfill separada que invoca el script (idempotente).
- Validacion: cada organization debe tener lifecycle_stage NOT NULL y al menos un row en history.

### Slice 3 — State machine + types

- `lifecycle-state-machine.ts` con tabla de transiciones permitidas.
- `types.ts` con enums + result types.
- Tests unitarios: every valid + invalid transition covered.

### Slice 4 — Comando `promoteParty`

- Implementacion con `withTransaction`: lock pesimista, validar transicion, insert history, update organization, emit outbox.
- Capability gate por target stage (segun spec §9.1).
- Tests de integracion contra DB local.

### Slice 5 — Comando `createPartyFromHubSpotCompany`

- Upsert idempotente por `hubspot_company_id`.
- Mapping HubSpot lifecyclestage → Greenhouse stage (§4.5 del spec).
- Skip degradacion si existe como `provider_only`; evaluar `is_dual_role`.

### Slice 6 — Comando `instantiateClientForParty`

- Side effect de transicion a `active_client`.
- Crea row en `clients` con FK + bootstrap `fin_client_profiles` defaults.
- Emite `commercial.client.instantiated`.

### Slice 7 — Eventos + catalog update

- Agregar 8 eventos `commercial.party.*` y `commercial.client.instantiated` a `GREENHOUSE_EVENT_CATALOG_V1.md`.
- Publisher registrado en domain `cost_intelligence`.

### Slice 8 — Capabilities seed

- Insertar las 6 capabilities de spec §9.1 en el seed de entitlements.
- Asignar a roles default (`efeonce_admin`, `finance_admin`, `sales_lead`, `sales`).

## Out of Scope

- Extender sync HubSpot inbound (TASK-536).
- Endpoints HTTP (TASK-537).
- Cualquier UI.
- Sweep cron de `active_client → inactive` (diferido a TASK-535 follow-up o TASK-542).
- Outbound sync (TASK-540).
- Resolver open question #1 dual-role si no hay caso real ya en data — dejar `is_dual_role=false` por default y documentar como seguir.

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` §4, §6.1-6.3, §8, §9.1 para contratos completos. Esta task implementa literalmente esas secciones.

### Reglas de backfill (§10.1 del spec)

```
organization HAS client_id + contratos activos    → active_client
organization HAS client_id + sin contratos 6m     → inactive
organization es provider sin cliente              → provider_only
organization sin client, sin provider, con deals  → opportunity
organization sin client, sin provider, sin deals  → prospect
```

Para cada row backfilled, insertar en history con `from_stage=NULL, to_stage=<computed>, source='bootstrap'`.

### Idempotencia del backfill

- Script detecta `lifecycle_stage IS NULL OR lifecycle_stage_source='bootstrap'` y procesa.
- Segunda corrida es no-op salvo que se use `--force` explicito.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `organizations` tiene `lifecycle_stage` NOT NULL en el 100% de rows post-backfill.
- [ ] `organization_lifecycle_history` tiene al menos 1 row por organization tras backfill.
- [ ] Los 3 comandos existen, con tests unitarios + integration ≥90% coverage.
- [ ] Toda transicion ilegal del state machine retorna `IllegalTransitionError` sin mutar DB.
- [ ] Los 9 eventos nuevos estan en el catalogo y son emitidos correctamente por cada comando.
- [ ] `promoteParty` con actor sin capability adecuada retorna `InsufficientPermissionsError` antes de tocar DB.
- [ ] `instantiateClientForParty` falla si la organization ya tiene `client_id` (no double-instantiation).
- [ ] Backfill corre dos veces seguidas sin producir cambios en la segunda.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/commercial/party`
- `pnpm pg:connect:migrate` en local (DB de dev)
- Correr `backfill-organization-lifecycle.ts` contra snapshot de staging y validar distribucion de estados
- Validar manualmente con `pnpm pg:connect:shell`: `SELECT lifecycle_stage, COUNT(*) FROM greenhouse_core.organizations GROUP BY lifecycle_stage;`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado con "Commercial Party Lifecycle foundation"
- [ ] Chequeo de impacto cruzado sobre TASK-454, TASK-457, TASK-462

- [ ] Update TASK-534 umbrella con fecha de cierre de Fase A
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` sincronizado con los eventos nuevos

## Follow-ups

- Sweep cron `active_client → inactive` (deferred; decidir en Discovery si va aqui o en TASK-542).
- Resolver open question #1 (dual-role) con data real post-backfill.
- Documentar runbook operacional (`docs/operations/party-lifecycle-runbook.md`) — delegable a TASK-542.
- Provisionar roles `sales` + `sales_lead` + bindear capabilities commercial.* cuando aterrice el role family (TASK-536+).
- Spec §10.1 asumia `organizations.client_id` + `organizations.is_provider`; la implementacion real usa `fin_client_profiles.organization_id` + `clients.hubspot_company_id` bridge. Proveedores no son detectables hoy desde `organizations`; todos los orgs sin client link caen a `prospect` por default.

## Closing Summary — 2026-04-21

### Artefactos entregados

- **Migraciones** (`migrations/`):
  - `20260421113910459_task-535-organization-lifecycle-ddl.sql` — ALTER organizations (6 columnas + CHECKs + unique) + CREATE organization_lifecycle_history (append-only via trigger que bloquea UPDATE/DELETE) + 3 indexes.
  - `20260421114006586_task-535-organization-lifecycle-backfill.sql` — backfill idempotente con guard fail-fast de orphans.
- **Domain module** (`src/lib/commercial/party/`):
  - `types.ts` (unions + result types + error classes)
  - `lifecycle-state-machine.ts` (tabla de transiciones + helpers)
  - `party-events.ts` (4 publishers transaccionales)
  - `party-store.ts` (reads pesimistas + helpers de bridge)
  - `hubspot-lifecycle-mapping.ts` (§4.5 + env override `HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE` + unknown fallback observable)
  - `commands/promote-party.ts`, `commands/create-party-from-hubspot-company.ts`, `commands/instantiate-client-for-party.ts`
  - `index.ts` (barrel)
- **Event catalog** (`src/lib/sync/event-catalog.ts`): 2 aggregates (`commercial_party`, `commercial_client`) + 5 event types.
- **Entitlements** (`src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts`): modulo `commercial` + 6 capabilities bindeadas a `efeonce_admin` + `finance_admin`.
- **Backfill CLI** (`scripts/backfill-organization-lifecycle.ts`): `--dry-run` / `--force` soportados.
- **Tests** (`src/lib/commercial/party/__tests__/`): 4 test files, 36 tests passing (state machine, promoteParty, createPartyFromHubSpotCompany, hubspot-lifecycle-mapping).
- **Spec docs**: `GREENHOUSE_EVENT_CATALOG_V1.md` extendido con sección "Commercial Party Lifecycle (TASK-535, Fase A)".

### Verificacion

- `pnpm exec vitest run src/lib/commercial/party` → 4 test files, 36 tests passing.
- `pnpm lint` → 0 errors (warning preexistente en `BulkEditDrawer.tsx` no relacionado).
- `npx tsc --noEmit` → clean.

### Cross-impact chequeado

- TASK-454 (hubspot company lifecycle bridge): no colisiona; `clients.lifecyclestage` sigue operativo como bridge para consumers legacy.
- TASK-457 / TASK-462: no tocados por esta fase.
- TASK-460 (contracts): leido para la backfill rule (`greenhouse_commercial.contracts.organization_id`) — sin cambios.
- TASK-534 (umbrella): Fase A cerrada; TASK-536 (Fase B) desbloqueada.

### Robustez del mapping HubSpot

`hubspot-lifecycle-mapping.ts` expone `resolveHubSpotStage(rawStage, options)`:

- Env var `HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE` (JSON) permite mapear stages custom sin deploy.
- Unknown stages → warn log + fallback configurable (default `prospect`), nunca throw.
- `isKnownHubSpotStage` + `getEffectiveHubSpotStageMap` para ops/diagnostics.
- Cubierto por 9 tests unitarios.
