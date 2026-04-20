# TASK-460 — Contract/SOW Canonical Entity & Lifecycle

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-459 (delivery model refinement)`
- Branch: `task/TASK-460-contract-sow-canonical-entity`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Introducir `greenhouse_commercial.contracts` (SOWs) como entidad canónica post-venta separada de quotation. Anchor estable para document chain, profitability y renewal, especialmente crítico para los retainers (85% del revenue) que pueden tener múltiples quotes históricas bajo un mismo contrato lógico que renueva implícita o explícitamente.

## Why This Task Exists

Hoy TASK-350 usa `quotation_id` como anchor de document chain y TASK-351 mide profitability/renewal a nivel quote. **Esto se rompe en retainers** porque:

- Un retainer de 3 años con Sky puede tener 3 quotes (renewal anual), pero es **1 contrato lógico**
- Un retainer con modificación mid-year emite quote v2 — pero el SOW es el mismo
- Cost attribution y delivery tracking viven a nivel "contrato en ejecución", no quote
- MRR/ARR es inmedible porque nadie sabe qué es "el contrato vigente" para un cliente dado

Con 85% retainer + nadie puede responder MRR/ARR sin Excel + SOWs reales con Sky/Pinturas Berel, la entidad Contract es foundation crítica.

## Goal

- `greenhouse_commercial.contracts` existe como first-class entity con lifecycle propio
- Un contrato puede referenciar N quotes (originator, renewals, modifications)
- Document chain (TASK-350) soporta `contract_id` como anchor canónico sin romper convivencia temporal con `quotation_id`
- Profitability tracking (TASK-351) agrega grain `contract × período` sin remover de inmediato el grain `quote × período`
- Renewal lifecycle (TASK-351) agrega contract-level; el sweep quote-grain se mantiene durante la transición
- MRR/ARR computable desde `contracts` activos
- UI (TASK-457) "Contrato" row = contract activo, no standalone quote

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Contract NO reemplaza Quotation — convive. Quote sigue siendo el artefacto pre-venta; Contract es el artefacto de ejecución post-aceptación.
- Un Contract puede tener N Quotes (M:N via tabla join `contract_quotes`)
- Lifecycle bien definido: `draft → active → paused → terminated / completed / renewed`
- Retrocompat: TASK-350/351 siguen funcionando durante la migración (doble anchor temporal)
- `docs/architecture/schema-snapshot-baseline.sql` sirve solo como referencia histórica; el schema comercial vigente debe validarse contra migraciones y runtime actual
- `contract_id` puede ser técnico interno (`ctr-<uuid>`), pero el identificador de negocio visible debe seguir convención `EO-*`

## Normative Docs

- `src/lib/finance/quote-to-cash/document-chain-reader.ts` — anchor actual (quote)
- `src/lib/commercial-intelligence/profitability-materializer.ts` — grain actual (quote × período)
- `src/lib/commercial-intelligence/renewal-lifecycle.ts` — grain actual (quote.expiry_date)

## Dependencies & Impact

### Depends on

- TASK-459 — `commercial_model` + `staffing_model` existen (contract los hereda)

### Blocks / Impacts

- TASK-461 — MSA (`contract.msa_id` reservado como referencia futura; FK real se agrega cuando exista la entidad)
- TASK-462 — MRR/ARR (contract es el grain correcto)
- TASK-350 refactor — document chain re-anclada en contract
- TASK-351 refactor — profitability + renewal re-anclados en contract
- TASK-457 — UI "Contrato" row ya no será quote-grain sino contract-grain

### Files owned

- `migrations/[verificar]-task-460-contracts-schema.sql`
- `src/lib/commercial/contracts-store.ts` (nuevo)
- `src/lib/commercial/contract-lifecycle.ts` (nuevo — promote-from-quote, renewal, termination)
- `src/lib/commercial/contract-events.ts` (nuevo — publishers)
- `src/lib/sync/projections/contract-lifecycle.ts` (nuevo projection)
- `src/app/api/finance/contracts/**` (nuevo API surface)
- `src/views/greenhouse/finance/ContractDetailView.tsx` (nueva UI mínima)
- Refactor: `src/lib/finance/quote-to-cash/*` para doble anchor (quote + contract)
- Refactor: `src/lib/commercial-intelligence/*` para grain contract
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_commercial.quotations` con `hubspot_deal_id`, `convertedAt`, `converted_to_income_id`
- TASK-350 document chain anchored en quote
- TASK-351 profitability/renewal anchored en quote
- TASK-459 split del delivery model
- El schema baseline en `docs/architecture/schema-snapshot-baseline.sql` está desactualizado para el dominio commercial; la fuente operativa real son las migraciones vigentes

### Gap

- No hay entidad de contract separada
- MRR/ARR no se puede calcular porque no hay concepto de "contrato activo"
- Retainer renewal vs modification no se distinguen (son quotes separadas, igual-shaped)
- Cost attribution y delivery execution no tienen anchor stable a lo largo del tiempo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + lifecycle

- `greenhouse_commercial.contracts`:
  - `contract_id` PK técnico interno (formato `ctr-<uuid>`)
  - `contract_number` human-readable con convención visible `EO-CTR-*`
  - `client_id` FK, `organization_id`, `space_id`
  - `msa_id` referencia opcional nullable (sin FK real hasta TASK-461)
  - `commercial_model` (inherit de quote originator)
  - `staffing_model` (inherit de quote originator)
  - `status` enum: `draft / active / paused / terminated / completed / renewed`
  - `start_date date` NOT NULL
  - `end_date date` NULL (NULL para retainer abierto)
  - `auto_renewal boolean` — si true, no requiere quote nueva para renovar
  - `renewal_frequency_months` — cadencia nominal de revisión (12 típico)
  - `mrr_clp`, `arr_clp` numeric — montos recurrentes derivados del scope actual
  - `tcv_clp`, `acv_clp` — si aplica
  - `originator_quote_id` FK — la quote que creó el contract
  - `currency`, `exchange_rate_to_clp`
  - `signed_at`, `terminated_at`, `renewed_at`, timestamps standard
- Tabla join `greenhouse_commercial.contract_quotes`:
  - `contract_id`, `quotation_id`, `relationship_type` enum: `originator / renewal / modification / cancellation`
  - `effective_from`, `effective_to`
- Indices: `client_id`, `status WHERE status='active'`, `end_date WHERE end_date IS NOT NULL`

### Slice 2 — Runtime helpers + lifecycle

- `contracts-store.ts` — CRUD + readers (list by client, list active, list by MSA)
- `contract-lifecycle.ts`:
  - `promoteQuoteToContract({ quotationId, startDate, endDate? })` — invocado al aprobar + convertir una quote
  - `renewContract({ contractId, newQuotationId? })` — crea nueva fila de relación en contract_quotes; si es auto-renewal sin nueva quote, sigue mismo scope
  - `terminateContract({ contractId, terminatedAt, reason })`
  - `modifyContract({ contractId, newQuotationId, modificationReason })` — nueva quote bajo mismo contract
- `contract-events.ts` — publishers:
  - `commercial.contract.created`
  - `commercial.contract.activated`
  - `commercial.contract.renewed`
  - `commercial.contract.modified`
  - `commercial.contract.terminated`
  - `commercial.contract.completed`

### Slice 3 — Refactor document chain (TASK-350) a anchor contract

- `quote-to-cash/document-chain-reader.ts` — agregar variante `readContractDocumentChain({ contractId })` que retorna todos los POs/HES/incomes de TODAS las quotes del contract
- Mantener reader por quote durante ventana de coexistencia; ningún consumer existente debe romperse en este corte
- `purchase_orders.contract_id`, `service_entry_sheets.contract_id`, `income.contract_id` — nullable FKs agregadas
- Backfill: para cada contract creado via promoteQuoteToContract, propagar `contract_id` a sus POs/HES/incomes existentes via `quotation_id` chain

### Slice 4 — Refactor profitability + renewal (TASK-351) a anchor contract

- `quotation_profitability_snapshots` convive temporalmente con `contract_profitability_snapshots`; la migración es gradual, no destructiva
- `contract_profitability_snapshots` usa grain `(contract_id, period_year, period_month)`
- `renewal-lifecycle.ts` sweep → itera sobre `contracts WHERE status='active' AND end_date IS NOT NULL`
  - Retainer con `auto_renewal=TRUE` → no emite `renewal_due` hasta `terminated_at`
  - Contract con `end_date` próxima → emite `commercial.contract.renewal_due`
- UI Renovaciones tab (TASK-351) → contract-grain en lugar de quote-grain

### Slice 5 — UI contract detail + listado

- `/finance/contracts` — lista tenant-safe de contracts activos
- `/finance/contracts/[id]` — detail view con:
  - Header: contract number, client, status, dates, MRR
  - Tab Overview: delivery_model, scope resumen
  - Tab Quotes asociadas: tabla de quotes con `relationship_type` chip (originator, renewal, modification)
  - Tab Document chain: re-usa el componente de TASK-350 pero ancla en contract
  - Tab Profitability: serie histórica del contract × periods
  - Tab Renewal timeline: historia de renewals y status actual

## Out of Scope

- FK real de MSA / clause library (TASK-461)
- MRR/ARR dashboard ejecutivo (TASK-462)
- Refactor completo removiendo quote anchors legacy — en este corte queda doble anchor durante transición

## Detailed Spec

### Migration con backfill

```sql
CREATE TABLE greenhouse_commercial.contracts (
  contract_id text PRIMARY KEY DEFAULT 'ctr-' || gen_random_uuid(),
  contract_number text UNIQUE NOT NULL, -- visible: EO-CTR-*
  client_id text REFERENCES greenhouse_core.clients(client_id) ON DELETE RESTRICT,
  organization_id text,
  space_id text,
  msa_id text,  -- referencia futura a TASK-461, nullable y sin FK en este corte
  commercial_model text NOT NULL CHECK (commercial_model IN ('retainer', 'project', 'one_off')),
  staffing_model text NOT NULL CHECK (staffing_model IN ('named_resources', 'outcome_based', 'hybrid')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'terminated', 'completed', 'renewed')),
  start_date date NOT NULL,
  end_date date,
  auto_renewal boolean NOT NULL DEFAULT FALSE,
  renewal_frequency_months integer,
  mrr_clp numeric(18,2),
  arr_clp numeric(18,2),
  tcv_clp numeric(18,2),
  acv_clp numeric(18,2),
  originator_quote_id text REFERENCES greenhouse_commercial.quotations(quotation_id),
  currency text DEFAULT 'CLP',
  exchange_rate_to_clp numeric(12,6),
  signed_at timestamptz,
  terminated_at timestamptz,
  terminated_reason text,
  renewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_commercial.contract_quotes (
  contract_id text NOT NULL REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE CASCADE,
  quotation_id text NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE RESTRICT,
  relationship_type text NOT NULL
    CHECK (relationship_type IN ('originator', 'renewal', 'modification', 'cancellation')),
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contract_id, quotation_id)
);

-- FK columns en document chain tables
ALTER TABLE greenhouse_finance.purchase_orders
  ADD COLUMN IF NOT EXISTS contract_id text
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE SET NULL;
ALTER TABLE greenhouse_finance.service_entry_sheets
  ADD COLUMN IF NOT EXISTS contract_id text
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE SET NULL;
ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS contract_id text
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE SET NULL;

-- Backfill: crear 1 contract por cada quote approved/converted
-- (heurística inicial — múltiples quotes del mismo cliente/scope quedan como contracts separados hasta reconciliación manual)
INSERT INTO greenhouse_commercial.contracts (
  contract_number, client_id, organization_id, space_id,
  commercial_model, staffing_model, status, start_date, end_date,
  auto_renewal, originator_quote_id, currency, signed_at
)
SELECT
  COALESCE(quotation_number, quotation_id),
  client_id, organization_id, space_id,
  commercial_model, staffing_model,
  CASE WHEN status = 'converted' THEN 'active' WHEN status = 'approved' THEN 'active' ELSE 'draft' END,
  COALESCE(quote_date::date, CURRENT_DATE),
  CASE WHEN commercial_model = 'retainer' THEN NULL ELSE expiry_date::date END,
  commercial_model = 'retainer',
  quotation_id, currency, approved_at
FROM greenhouse_commercial.quotations
WHERE status IN ('approved', 'converted', 'sent');

-- Backfill contract_quotes como originator
INSERT INTO greenhouse_commercial.contract_quotes (contract_id, quotation_id, relationship_type, effective_from)
SELECT c.contract_id, c.originator_quote_id, 'originator', c.start_date
FROM greenhouse_commercial.contracts c
WHERE c.originator_quote_id IS NOT NULL;

-- Propagar contract_id a POs/HES/incomes existentes
UPDATE greenhouse_finance.purchase_orders po
SET contract_id = c.contract_id
FROM greenhouse_commercial.contracts c
WHERE po.quotation_id = c.originator_quote_id;

UPDATE greenhouse_finance.service_entry_sheets hes
SET contract_id = c.contract_id
FROM greenhouse_commercial.contracts c
WHERE hes.quotation_id = c.originator_quote_id;

UPDATE greenhouse_finance.income inc
SET contract_id = c.contract_id
FROM greenhouse_commercial.contracts c
WHERE inc.quotation_id = c.originator_quote_id;
```

### Event catalog additions

```typescript
contractCreated: 'commercial.contract.created',
contractActivated: 'commercial.contract.activated',
contractRenewed: 'commercial.contract.renewed',
contractModified: 'commercial.contract.modified',
contractTerminated: 'commercial.contract.terminated',
contractCompleted: 'commercial.contract.completed',
contractRenewalDue: 'commercial.contract.renewal_due',
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Schema + backfill aplica idempotente
- [ ] Cada quote `approved|converted|sent` tiene 1 contract asociado post-backfill
- [ ] POs/HES/incomes existentes tienen `contract_id` poblado via la quote originator
- [ ] Los readers/APIs quote-grain existentes siguen operando durante la coexistencia con contract-grain
- [ ] Promoción automática: al hacer `POST /api/finance/quotes/[id]/convert-to-invoice` (TASK-350) se crea contract si no existe
- [ ] `listActiveContracts({ tenant })` devuelve solo contracts con `status='active'`
- [ ] Retainer contract con `end_date IS NULL` no se marca como `renewal_due` nunca
- [ ] Contract con `end_date` próximo → `commercial.contract.renewal_due` emitido con dedup
- [ ] Document chain accesible por contract: `GET /api/finance/contracts/[id]/document-chain`
- [ ] UI `/finance/contracts` lista contracts con KPI de MRR total
- [ ] `pnpm test` cubre promote/renew/terminate/modify flows

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Staging smoke: aprobar una quote nueva → verificar contract creado; extender retainer → verificar renewal flow; cerrar project contract → verificar `completed` transition

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con nuevo contract-anchor como source of truth
- [ ] Chequeo impacto cruzado TASK-461, TASK-462, TASK-457, TASK-350, TASK-351
- [ ] Actualizar `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` con delta de contract como nuevo anchor canónico
- [ ] Registrar eventos nuevos en `GREENHOUSE_EVENT_CATALOG_V1.md`
- [ ] Documentación funcional `docs/documentation/finance/contratos.md` creada

## Follow-ups

- Cleanup task: remove legacy quote-anchor readers después de ventana de coexistencia
- Reconcile contracts duplicados generados por backfill heurístico (casos de retainer con múltiples quotes históricas que debieron ser 1 contract)
- UI edit contract (scope changes, extend end_date, termination flow) — V2

## Open Questions

- El backfill inicial crea 1 contract por quote approved. Para clientes con retainers históricos que tienen v1+v2+v3 quotes, esto genera 3 contracts cuando debió ser 1. ¿Resolvemos con una reconciliation task separada post-deploy (preferido) o lo enfrentamos en backfill con una heurística más agresiva?
- `contract_number` formato: ¿heredar de `quotation_number` de la originator, o generar nuevo (ej. `EO-CTR-YYYY-NNNN`)?
- Para retainers con `auto_renewal=TRUE`: ¿la renewal crea un nuevo "period" interno o el contrato es un continuum único? Propuesta: continuum único; los periods son artefactos de billing, no del contract lifecycle.
