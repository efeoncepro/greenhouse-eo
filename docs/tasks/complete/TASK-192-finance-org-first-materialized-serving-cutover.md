# TASK-192 - Finance Org-First Materialized Serving Cutover

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Implementación validada`
- Rank: `51`
- Domain: `finance`
- GitHub Project: `TBD`
- GitHub Issue: `TBD`

## Summary

`TASK-191` dejó saneado el contrato de entrada downstream para que Finance acepte identidad org-first en `purchase-orders`, `hes`, `expenses`, `allocations` y `client_economics`. `TASK-192` cerró la deuda residual en serving y materialización: `cost_allocations`, `client_economics`, `commercial_cost_attribution`, `operational_pl` y sus consumers ya no dependen ciegamente de `client_id` como única llave materializada efectiva.

La lane quedó cerrada sin romper compatibilidad: se persiste contexto canónico `organization_id` / `space_id` donde hacía falta, los consumers leen el scope correcto (`organization` o `space`) y `client_id` queda explícito como bridge legacy solo en las capas cuyo grano materializado sigue siendo comercial por cliente.

## Why This Task Exists

Después de `TASK-191`, el runtime ya puede resolver:

- `organizationId`
- `clientProfileId`
- `hubspotCompanyId`
- `spaceId`
- `clientId` solo cuando todavía hace falta un bridge legacy

Pero varios dominios materiales siguen anclados a `client_id`:

- `greenhouse_finance.cost_allocations`
- `greenhouse_finance.client_economics`
- `greenhouse_serving.commercial_cost_attribution`
- `greenhouse_serving.operational_pl_snapshots` en sus inputs upstream, no en el scope expuesto
- readers Agency / Org 360 / Finance que heredan esa boundary

Eso genera un gap estructural:

- el input contract ya es org-first
- el storage sigue siendo mayormente client-first y parte del serving depende de inputs client-first
- el sistema funciona, pero la semántica canónica todavía depende de bridges que deberían quedar residuales y documentados, no implícitos

Si no se ejecuta esta lane:

- `allocations` seguirá persistiendo asignaciones solo por cliente
- `client_economics` seguirá requiriendo bridge client-based incluso cuando el negocio ya es organization-first
- `commercial_cost_attribution` y las capas que alimentan `operational_pl` seguirán arrastrando una semántica client-first difícil de extender hacia `business_unit`
- `TASK-167` y `TASK-177` quedarán montadas sobre una base parcialmente legacy

## Goal

- Formalizar qué capas materiales de Finance deben pasar a `organization_id` como scope persistido y cuáles conservan `client_id` solo como compat boundary.
- Evolucionar `allocations` y `client_economics` para persistir contexto organization/space sin depender ciegamente de `client_id` como única llave de resolución.
- Mantener `commercial_cost_attribution` como truth layer canónica por `member + client` y asegurar que `operational_pl` y los consumers deriven `space` / `organization` desde un bridge canónico, no ad hoc.
- Dejar explícito el contrato de consumers Agency / Org 360 / Finance para que lean snapshots en el scope correcto (`space` para Agency, `organization` para Org 360, compat bridge para Finance) sin recomponer bridges manuales.
- Tomar `operational_pl scope_type='organization'` ya existente en repo como baseline; esta task no reimplementa `TASK-167`.
- Formalizar tenant isolation para tablas materiales que todavía no persisten `space_id`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- `greenhouse_core.organizations` sigue siendo el anchor canónico B2B.
- `client_id` solo puede permanecer como bridge documentado de compatibilidad, no como contrato de entrada implícito.
- `commercial_cost_attribution` sigue siendo la truth layer canónica por asignación comercial `member + client`; los scopes `space` y `organization` viven en serving derivado (`operational_pl_snapshots`) y sus readers.
- Toda evolución de schema debe hacerse con migraciones versionadas, backward-compatible y siguiendo el modelo `nullable -> backfill -> constraint`.
- `operational_pl`, `commercial_cost_attribution` y `client_economics` no deben recalcular semántica distinta por consumer.
- Mientras las tablas legacy no persistan `space_id`, tenant isolation debe resolverse con joins explícitos vía `greenhouse_core.spaces` y/o `greenhouse_finance.client_profiles`.

## Dependencies & Impact

### Depends on

- `TASK-162` - `commercial_cost_attribution` canónica
- `TASK-181` - `Finance Clients` org-first
- `TASK-191` - downstream input contract org-first
- `greenhouse_finance.cost_allocations`
- `greenhouse_finance.client_economics`
- `greenhouse_serving.commercial_cost_attribution`
- `greenhouse_serving.operational_pl_snapshots`
- `greenhouse_core.organizations`
- `greenhouse_core.spaces`
- `greenhouse_finance.client_profiles`

### Impacts to

- `TASK-177` - queda montada sobre una base materializada más canónica para futuros scopes `business_unit`
- `TASK-167` - queda absorbida por el estado real del repo y debe tratarse como desactualizada si se retoma
- `Agency Economics` y `agency-finance-metrics`
- `Organization 360`
- `Finance Intelligence`
- futuras lanes de budget / management accounting

### Files owned

- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/lib/commercial-cost-attribution/store.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/account-360/organization-economics.ts`
- `src/lib/agency/agency-finance-metrics.ts`
- `src/app/api/finance/intelligence/client-economics/route.ts`
- `src/app/api/finance/intelligence/allocations/route.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`

## Current Repo State

### Ya existe

- `TASK-191` ya dejó el input contract downstream org-first.
- `resolveFinanceDownstreamScope()` ya encapsula la resolución canónica y el bridge legado.
- `computeClientEconomicsSnapshots()` ya tiene hardening parcial org-aware.
- `operational_pl` ya materializa `scope_type = 'organization'` en repo y schema snapshot.
- `organization-economics` ya consume serving `scope_type = 'organization'` con fallback bridge-aware.
- `TASK-162` ya consolidó `commercial_cost_attribution` como truth layer.

### Gap actual

- `cost_allocations` sigue persistiendo asignaciones por `client_id`.
- `client_economics` sigue materializando snapshots con llave efectiva client-based y sin contexto persistido org/space.
- `commercial_cost_attribution` sigue materializándose por `member_id + client_id + period`, que es correcto para su grano canónico pero no deja explícito el bridge downstream.
- `operational_pl` ya sirve `organization`, pero se alimenta de truth layers y bridges todavía client-first.
- `Agency` y otros consumers todavía heredan esa semántica en vez de consumir explícitamente el scope derivado correcto (`space` u `organization`).
- No existe todavía una política documentada y versionada para distinguir:
  - serving nativamente org-first
  - serving client-based transitorio
  - bridges legacy permitidos
- No existe una política implementada consistente para tenant isolation en tablas materiales que aún no persisten `space_id`.

## Scope

### Slice 1 - Inventory materialized-first

- Auditar tablas, projections y readers que todavía persisten o sirven por `client_id`.
- Definir explícitamente qué superficies deben evolucionar a `organization_id`.
- Documentar qué capas seguirán client-based por compatibilidad y por cuánto tiempo.

### Slice 2 - Allocations & Client Economics evolution

- Evolucionar `cost_allocations` para soportar contexto persistido organization/space además del bridge `client_id`.
- Evolucionar `client_economics` para que el snapshot no dependa exclusivamente de `client_id` como único contexto persistido.
- Mantener bridges backward-compatible mientras existan consumers legacy.

### Slice 3 - Commercial Attribution + Operational P&L cutover

- Mantener `commercial_cost_attribution` en su grano canónico `member + client`, haciendo explícito el bridge canónico a `space` / `organization` donde haga falta.
- Reconciliar los inputs de `operational_pl` con esa semántica sin reabrir la materialización `organization` ya existente.
- Evitar que `TASK-167` y `TASK-177` se implementen sobre una base semánticamente legacy.

### Slice 4 - Consumer cutover

- Alinear `agency-finance-metrics`, `organization-economics` y readers financieros a los scopes materiales correctos (`space`, `organization` o compat client bridge).
- Reducir recomposición manual de bridges en consumers.

### Slice 5 - Migration, tests & docs

- Crear migraciones necesarias para columnas/índices/snapshots organization-first.
- Agregar tests de regresión para serving y projections.
- Actualizar arquitectura viva y notas de rollout/cutover.

## Out of Scope

- Eliminar físicamente `client_id` de todas las tablas Finance en una sola lane.
- Reabrir `TASK-191` para volver a tocar UI/API que ya quedaron saneadas.
- Mezclar este trabajo con reconciliación bancaria o budget engine.
- Implementar por sí sola toda la UX final de Business Unit P&L.

## Acceptance Criteria

- [x] Existe inventario explícito de serving/materialización que sigue client-first vs org-first.
- [x] `cost_allocations` soporta contexto persistido organization/space o queda documentado un bridge temporal formal.
- [x] `client_economics` deja de depender exclusivamente de `client_id` como único contexto materializado efectivo.
- [x] `commercial_cost_attribution` y `operational_pl` documentan y/o exponen responsabilidades de scope consistentes (`client` canónico vs `space` / `organization` derivado).
- [x] Consumers Agency / Org 360 / Finance pueden leer serving en su scope correcto sin recomponer bridges ad hoc.
- [x] Tenant isolation queda explícita y verificable en queries/materializers tocados, aun cuando el bridge siga siendo necesario.
- [x] `pnpm lint` pasa.
- [x] `pnpm build` pasa.
- [x] Existe cobertura de tests para serving/materializers tocados.

## Documents To Update

| Documento | Motivo |
|-----------|--------|
| `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` | Contrato canónico de `cost_allocations`, `client_economics` y compatibilidad `client_id` / `organization_id` / `space_id` |
| `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md` | Truth layer, bridges downstream y readers shared org-first |
| `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` | Alineación de `operational_pl` con inputs materializados y consumers |
| `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` | Solo si cambian columnas persistidas, llaves o constraints del dominio |

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm exec vitest run src/lib/finance/*.test.ts src/lib/commercial-cost-attribution/*.test.ts src/lib/sync/projections/*.test.ts`
- `GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false pnpm migrate:up`
- Smoke manual:
  - leer economics para una organización org-first sin `clientId` explícito
  - validar allocations/economics/P&L para una organización con múltiples spaces
  - revisar consumers Agency/Org 360 sin pérdida del scope resuelto

## Follow-ups

- Si esta lane confirma que `client_id` ya es residual en serving financiero, abrir una task posterior de schema cleanup físico.
- Si `business_unit` requiere una truth layer propia y no solo un scope más de `operational_pl`, separar esa evolución en un follow-on de `TASK-177`.
