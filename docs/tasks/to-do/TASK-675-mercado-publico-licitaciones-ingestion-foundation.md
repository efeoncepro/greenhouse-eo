# TASK-675 — Mercado Publico Licitaciones Ingestion Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-674`
- Branch: `task/TASK-675-mercado-publico-licitaciones-ingestion`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementa la primera ingesta productiva de licitaciones Mercado Publico hacia tablas `greenhouse_commercial.public_procurement_*`, con `space_id`, watermarks, runs, replays y normalizacion minima de items/comprador/fechas. Este es el carril base para descubrir oportunidades antes de scoring, UI y workflow.

## Why This Task Exists

El POC demostro que la API oficial permite listar e hidratar licitaciones, pero hoy solo existe un helper sin persistencia. Para operar en Greenhouse se necesita una foundation durable, tenant-aware, observable y reejecutable.

## Goal

- Crear DDL y repositorios Kysely para oportunidades e items de licitaciones.
- Implementar sync incremental/replay desde `licitaciones.json`.
- Emitir eventos y observabilidad compatible con `source_sync_runs` y `source_sync_watermarks`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/schema-snapshot-baseline.sql`

Reglas obligatorias:

- Usar `pnpm migrate:create <nombre>` para migraciones.
- Usar `const db = await getDb()` para modulo nuevo y nunca crear `new Pool()`.
- Toda query filtra por `space_id`.
- El ticket Mercado Publico debe resolverse por Secret Manager; no imprimirlo.
- Usar skill `greenhouse-agent` antes de escribir backend/DB.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- `docs/research/TASK-673-findings.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-674`
- `src/lib/integrations/mercado-publico/tenders.ts`
- `greenhouse_sync.source_sync_runs` y `greenhouse_sync.source_sync_watermarks` en `docs/architecture/schema-snapshot-baseline.sql`

### Blocks / Impacts

- `TASK-679`
- `TASK-682`
- `TASK-683`
- `TASK-684`
- `TASK-686`
- `TASK-687`

### Files owned

- `migrations/`
- `src/lib/integrations/mercado-publico/`
- `src/lib/commercial/public-procurement/`
- `src/app/api/cron/`
- `docs/architecture/schema-snapshot-baseline.sql`

## Current Repo State

### Already exists

- Helper API/detalle en `src/lib/integrations/mercado-publico/tenders.ts`.
- Research con endpoints y constraints en `docs/research/RESEARCH-007-commercial-public-tenders-module.md`.

### Gap

- No hay persistence layer productivo para oportunidades publicas.
- No hay sync job, watermark ni replay.

## Scope

### Slice 1 — DDL Foundation

- Crear tablas target definidas por `TASK-674` para oportunidades e items de licitaciones.
- Incluir unique constraints por `space_id + source_system + external_code`.
- Incluir raw payload JSONB acotado, timestamps, estado externo y lifecycle interno.

### Slice 2 — Sync Runtime

- Crear reader/normalizer sobre `licitaciones.json` y detalle por codigo.
- Registrar runs/watermarks por fecha/estado.
- Manejar retry, timeout, partial failures y dedupe.

### Slice 3 — API/Cron And Tests

- Crear trigger cron/manual interno para sync.
- Agregar tests unitarios de normalizacion y repositorio.
- Documentar operacion y variables.

## Out of Scope

- Adjuntos.
- Compra Agil COT.
- Scoring.
- UI.
- Postulacion.

## Detailed Spec

El agente debe partir desde el contrato de `TASK-674`. Si ese contrato aun no existe o contradice esta task, detenerse y corregir la task antes de implementar.

## Acceptance Criteria

- [ ] Migraciones creadas con `pnpm migrate:create`.
- [ ] Existen repositorios Kysely tenant-aware para upsert/list/detail.
- [ ] El sync puede correr incremental y replay sin duplicar oportunidades.
- [ ] `source_sync_runs` registra `succeeded`, `partial` o `failed` con conteos.
- [ ] Ningun log expone el ticket Mercado Publico.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test -- --runInBand` o suite focalizada equivalente
- `rg -n "new Pool\\(" src | grep -v "src/lib/postgres/client.ts"` debe no encontrar nuevos usos.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo movido si corresponde.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con paths, comandos y gaps.
- [ ] `changelog.md` actualizado si cambia comportamiento.
- [ ] `docs/architecture/schema-snapshot-baseline.sql` actualizado si hubo migracion.
- [ ] `db.d.ts` actualizado si `migrate:up` regenera tipos.

## Follow-ups

- `TASK-679`
- `TASK-682`
