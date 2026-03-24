# CODEX_TASK_Nubox_Finance_Reconciliation_Bridge_v1

## Summary

Cerrar el circuito Nubox → Finance construyendo un flujo de reconciliación automatizado que convierta DTEs sincronizados desde Nubox (ventas, compras, pagos) en income/expense reconocidos en el módulo financiero, con matching automático, propuestas de reconciliación, y estado de cobertura DTE por organización.

## Why This Task Exists

Nubox ya sincroniza DTEs desde el SII vía pipeline de 3 fases (raw → conformed → Postgres). Los campos de bridge existen en el schema:
- `income` tiene: `nubox_document_id, nubox_sii_track_id, nubox_emission_status, dte_type_code, dte_folio`
- `expenses` tiene: `nubox_purchase_id, nubox_document_status, nubox_supplier_rut, nubox_origin`

Y `sync-nubox-to-postgres.ts` ya hace upsert de ventas Nubox → income y compras → expenses, publicando eventos `finance.income.nubox_synced` y `finance.expense.nubox_synced`.

Pero el flujo es incompleto:
1. **No hay matching inteligente:** El upsert actual opera por `nubox_document_id` exacto. Si un ingreso fue registrado manualmente en Finance antes de que llegara el DTE, no se reconcilian — se duplican.
2. **No hay estado de cobertura:** No existe forma de saber "¿cuántos ingresos de esta organización tienen DTE asociado vs. cuántos son solo registros manuales?"
3. **No hay reconciliación de montos:** Un DTE puede tener un monto diferente al ingreso registrado (por notas de crédito, ajustes, etc.). No hay detección de discrepancias.
4. **No hay vista por organización:** Finance muestra ingresos/egresos flat sin agrupar por organización ni por estado DTE.

## Goal

1. **Matching automático** entre DTEs de Nubox y registros manuales de Finance (por monto, fecha, RUT, y folio)
2. **Dashboard de cobertura DTE** por organización: % de ingresos/egresos con DTE, discrepancias de monto, DTEs huérfanos
3. **Propuestas de reconciliación** para DTEs que no matchean exactamente (similar al patrón de identity reconciliation)
4. **Estado de salud tributaria** por organización como input para el Organization Economics Dashboard

## Dependencies & Impact

### Depends on
- `src/lib/nubox/sync-nubox-to-postgres.ts` — sync actual
- `src/lib/nubox/types.ts` — tipos conformed
- `src/lib/finance/postgres-store-slice2.ts` — income/expense con campos nubox
- `src/lib/account-360/organization-store.ts` — resolución de organización
- Task completada: `CODEX_TASK_Nubox_DTE_Integration.md`
- Task completada: `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`

### Impacts to
- `CODEX_TASK_Organization_Economics_Dashboard_v1.md` — cobertura DTE es un indicador de salud financiera por org
- `CODEX_TASK_Financial_Intelligence_Layer_v2.md` — reconciliación DTE enriquece analytics financieros
- `CODEX_TASK_Outbox_Event_Expansion_v1.md` — reconciliación de DTEs debería publicar eventos (dte.matched, dte.discrepancy_found)

### Files owned
- `src/lib/nubox/reconciliation.ts`
- `src/lib/nubox/dte-matching.ts`
- `src/lib/finance/dte-coverage.ts`
- `src/app/api/finance/dte-reconciliation/route.ts`
- `src/app/api/organizations/[id]/dte-coverage/route.ts`
- `scripts/setup-postgres-dte-reconciliation.sql`
- Modificación: `src/lib/nubox/sync-nubox-to-postgres.ts` (agregar matching step)

## Current Repo State

### Ya existe
- **Sync pipeline:** `sync-nubox-to-postgres.ts` lee de `greenhouse_conformed.nubox_sales` y `nubox_purchases`, upsert a `greenhouse_finance.income` y `expenses`.
- **Campos bridge en income:** `nubox_document_id, nubox_sii_track_id, nubox_emission_status, dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at`.
- **Campos bridge en expenses:** `nubox_purchase_id, nubox_document_status, nubox_supplier_rut, nubox_supplier_name, nubox_origin, nubox_last_synced_at`.
- **Emission:** `src/lib/nubox/emission.ts` para emitir DTEs desde Greenhouse a Nubox (sales outbound).
- **Organization resolution:** `ensureOrganizationForSupplier()` auto-provisiona suppliers como organizaciones por RUT.
- **Outbox events:** `finance.income.nubox_synced`, `finance.expense.nubox_synced` ya se publican.
- **Tipos conformed:** `NuboxConformedSale` y `NuboxConformedPurchase` incluyen `income_id`, `expense_id`, `organization_id`, `client_id`, `supplier_id`.

### No existe aún
- Matching inteligente entre registros manuales y DTEs (por monto + fecha + RUT + folio)
- Tabla de propuestas de reconciliación DTE
- Vista de cobertura DTE por organización (% con DTE, % manual, discrepancias)
- Detección de discrepancias de monto (DTE vs. registro manual)
- API endpoint de reconciliación y cobertura
- Integración con Organization Economics (health tributaria)

## Implementation Plan

### Slice 1 — Matching Engine

1. **Crear `src/lib/nubox/dte-matching.ts`:**
   - Input: DTE conformed (sale o purchase) sin `income_id`/`expense_id` linkado
   - Match signals: monto total (±5% tolerance), fecha (±7 días), RUT cliente/supplier, folio DTE
   - Score: 0-1 composite. Auto-match ≥ 0.90, proposal 0.50-0.89, no-match < 0.50
   - Output: `{ matchedFinanceId, confidence, signals[] }`

2. **Crear tabla `greenhouse_finance.dte_reconciliation_proposals`:**
   ```sql
   CREATE TABLE greenhouse_finance.dte_reconciliation_proposals (
     proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     dte_source TEXT NOT NULL,      -- 'nubox_sale' | 'nubox_purchase'
     dte_source_id TEXT NOT NULL,
     finance_type TEXT NOT NULL,     -- 'income' | 'expense'
     finance_id UUID,               -- matched finance record (nullable)
     confidence NUMERIC(4,3),
     match_signals JSONB,
     status TEXT DEFAULT 'pending',  -- pending, approved, rejected, auto_matched
     resolved_by TEXT,
     resolved_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Integrar matching en sync pipeline:** Después del upsert actual, correr matching para DTEs sin link y crear proposals o auto-match.

### Slice 2 — Cobertura DTE

1. **Crear `src/lib/finance/dte-coverage.ts`:**
   - `getDteCoverage(organizationId, periodYear, periodMonth)` retorna:
     - Total income records, income con DTE, income sin DTE, % cobertura
     - Total expense records, expense con DTE, expense sin DTE, % cobertura
     - Discrepancias de monto (donde DTE amount ≠ finance amount)
     - DTEs huérfanos (sin finance record)

2. **API:** `GET /api/organizations/[id]/dte-coverage?year=&month=`

### Slice 3 — Reconciliation UI

1. **API:** `GET /api/finance/dte-reconciliation?status=pending` — lista proposals pendientes
2. **API:** `PATCH /api/finance/dte-reconciliation/[proposalId]` — aprobar/rechazar
3. **Card de cobertura DTE** integrable en Organization Finance tab

## Acceptance Criteria

- [ ] Matching engine con scoring multi-signal funciona
- [ ] Auto-match (≥0.90) se ejecuta como parte del sync
- [ ] Proposals pendientes visibles vía API
- [ ] Cobertura DTE por organización calculable
- [ ] No rompe el flujo de sync actual
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] Al menos 4 tests (matching engine + coverage calculation)
