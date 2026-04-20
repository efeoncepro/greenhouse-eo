# TASK-478 — Tool & Provider Cost Basis Snapshots

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementado y verificado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-476`, `TASK-475`
- Branch: `task/TASK-478-tool-provider-cost-basis-snapshots`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir snapshots de costo comercial por herramienta/proveedor reutilizando `greenhouse_ai.tool_catalog`, licencias de miembros, consumo y anchors `provider_id` ya existentes. La task no crea otro catálogo de tools: materializa una capa de costo real/estimado con prorrateo, freshness, provenance y confidence.

## Why This Task Exists

Greenhouse ya tiene la base correcta de tooling y providers. Lo que falta es un read model comercial que diga cuánto cuesta una herramienta hoy y con qué confianza. Sin eso, el builder termina pidiendo “monto” para algo que el sistema ya sabe o puede estimar.

## Goal

- Materializar un read model comercial reusable por tool/provider sin duplicar el catálogo ni ignorar los snapshots provider-level ya existentes.
- Resolver prorrateo, consumo, fallback y provenance.
- Exponer readers consumibles por el pricing engine y por la UI.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`
- `docs/tasks/complete/TASK-464c-tool-catalog-extension-overhead-addons.md`

Reglas obligatorias:

- `greenhouse_ai.tool_catalog` sigue siendo el catálogo canónico.
- `greenhouse_core.providers` sigue siendo la identidad cross-domain del vendor.
- Cada snapshot debe declarar freshness, provenance y confidence.
- La materialización batch de tools/provider vive en `commercial-cost-worker`; el portal solo lee, explica o dispara la corrida.

## Dependencies & Impact

### Depends on

- `src/lib/commercial/tool-catalog-store.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/providers/provider-tooling-snapshots.ts`
- `src/lib/providers/monthly-snapshot.ts`
- `src/lib/commercial-cost-worker/materialize.ts`
- `src/app/api/admin/pricing-catalog/tools/[id]/route.ts`
- `src/app/api/finance/suppliers/[id]/route.ts`

### Blocks / Impacts

- `TASK-480`
- `TASK-481`

### Files owned

- `migrations/[timestamp]_task-478-tool-provider-cost-basis-snapshots.sql`
- `src/lib/commercial-cost-basis/tool-provider-cost-basis.ts`
- `src/lib/commercial-cost-basis/tool-provider-cost-basis-reader.ts`
- `src/lib/commercial/tool-catalog-store.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/providers/provider-tooling-snapshots.ts`
- `src/lib/commercial-cost-worker/materialize.ts`
- `src/app/api/admin/pricing-catalog/tools/[id]/route.ts`
- `src/app/api/finance/suppliers/[id]/route.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- catálogo canónico de tools con `provider_id`
- licencias por member
- credit ledger
- providers cross-domain
- `greenhouse_serving.provider_tooling_snapshots` ya materializa un agregado mensual por `provider_id`
- `src/lib/providers/monthly-snapshot.ts` ya calcula costos observados/modelados más ricos a nivel provider
- `src/lib/team-capacity/tool-cost-reader.ts` ya resuelve insumos de costo member-level para licencias, usage y gasto directo
- `TASK-483` ya dejó activo `POST /cost-basis/materialize/tools` en `commercial-cost-worker` como runtime base de esta materialización.

### Gap

- No existe un snapshot comercial reusable con granularidad explícita por `tool_id + provider_id`; hoy el serving existente es provider-level agregado.
- No existe un contrato shared que persista `sourceKind`, `sourceRef`, `snapshotDate`, `freshness`, `confidence` y metadata FX para costo comercial de tools.
- El scope `tools` del worker hoy materializa snapshots provider-level; esta task debe decidir si lo extiende o crea un read model complementario más fino sin romper esa semántica.
- `space_id` no existe nativamente en los snapshots actuales; cualquier aislamiento tenant-aware debe resolverse desde bridges financieros/comerciales y no desde `tool_catalog`.

## Scope

### Slice 1 — Tool cost snapshot contract

- Definir snapshot comercial de tool/provider sobre la base existente de `tool_catalog`, `member_tool_licenses`, `credit_wallets`, `credit_ledger`, `suppliers`, `providers` y `provider_tooling_snapshots`.
- El contrato nuevo debe dejar explícita la granularidad elegida:
  - `provider_id` solamente, o
  - `tool_id + provider_id`, o
  - ambas capas con un bridge claro entre agregado y detalle.
- Persistir, como mínimo:
  - costo resuelto
  - moneda
  - `sourceKind`
  - `sourceRef`
  - `snapshotDate`
  - `freshness`
  - `confidence`
  - metadata FX

### Slice 2 — Resolver y materializar

- Reusar tooling + provider + finance para estimar costo comercial de tools sin recalcular joins pesados on-read.
- Montar la materialización batch en `commercial-cost-worker`, alineada con el scope `tools` ya creado por `TASK-483`.

### Slice 3 — Reader consumible

- Dejar un reader estable para engine/UI y consumers de finance/suppliers sin recalcular joins complejos on-read en el builder.
- La salida debe distinguir costo observado, costo modelado y fallback aplicado cuando corresponda.

## Out of Scope

- Cambios UI del builder.
- Nuevo catálogo maestro de herramientas.

## Acceptance Criteria

- [x] Existe un snapshot/read model reutilizable de costo comercial por tool/provider.
- [x] El snapshot incluye provenance, freshness y confidence.
- [x] El contrato deja explícita la relación con `greenhouse_serving.provider_tooling_snapshots` y evita duplicar semántica provider-level sin necesidad.
- [x] El engine puede consumir costo de tools sin pedir monto manual por defecto.
- [x] Providers y tool catalog se siguen reutilizando como anchors canónicos.

## Verification

- `pnpm exec vitest run src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm migrate:up --no-check-order`
- `pnpm build`
- `pnpm lint`
