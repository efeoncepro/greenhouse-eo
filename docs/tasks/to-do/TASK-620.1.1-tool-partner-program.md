# TASK-620.1.1 — Tool Partner Program (Adobe / Microsoft / HubSpot reseller tracking + commission accounting)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo` (~1.5 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque C)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-620, TASK-620.1`
- Branch: `task/TASK-620.1.1-tool-partner-program`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar tracking completo del programa de partners de Efeonce (Adobe Authorized Reseller, Microsoft Solutions Partner, HubSpot Solutions Partner). Cada quote line item con `sellable_tool` registra el partner_id y permite calcular revenue share + comisiones. HubSpot sync de tools como `product_type='tool_license'`. Reportes de revenue por partner para reconciliacion de comisiones contra los partner programs.

## Why This Task Exists

Efeonce no es solo agencia de servicios — tambien es **reseller licenciado** de software de terceros:

- Adobe Authorized Reseller → comision ~10-20%
- Microsoft Solutions Partner → ~5-15% segun tier
- HubSpot Solutions Partner → ~20%

Sin tracking de partner por linea de quote, el ICO/income engine no separa "revenue gross" (lo que cobramos al cliente) de "revenue neto post-comision" (lo que entra a Efeonce despues de pagar el partner). Eso distorsiona margin engine + reportes financieros.

Adicionalmente, Adobe/Microsoft/HubSpot exigen reportes mensuales/trimestrales de revenue para validar comisiones que te depositan. Hoy Efeonce los hace manual en Excel.

## Goal

- Extender `tool_partners` con campos de commission tracking
- Tabla `quote_line_partner_attribution` que registra `partner_revenue_share_pct` snapshot por linea
- Tabla `partner_commission_reports` con reportes generables per partner per periodo
- Endpoint `/api/commercial/partner-reports/[partnerId]?from=&to=` que devuelve reporte para reconciliar
- HubSpot sync de tools como `product_type='tool_license'` (separado del `'license'` interno)
- Dashboard "Partner Revenue" en Admin Center con metricas por partner
- Audit log de cada agregacion de tool a quote: registra partner snapshot + commission_pct vigente

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (TASK-620)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8

Reglas obligatorias:

- partner attribution snapshot inmutable (no recalcular en quotes historicos si commission_pct cambia)
- HubSpot product_type='tool_license' es separado de 'license' (interno)
- reportes generables idempotentes (re-run no duplica filas)
- ICO/margin engine consume `partner_net_revenue` (gross - commission) en addition al gross para reports

## Dependencies & Impact

### Depends on

- **`TASK-620`** (tool_partners + sellable_tools)
- **`TASK-620.1`** (tools cableados como FK)

### Blocks / Impacts

- ICO engine + margin engine: necesitan separar gross vs neto en reports financieros
- Admin Center: nuevo dashboard "Partner Revenue"
- Finance reconciliation: comparar reportes Greenhouse vs depositos de Adobe/Microsoft/HubSpot
- Future: TASK-624 (renewal engine) — renewals de tools deben mantener mismo partner attribution

### Files owned

- `migrations/YYYYMMDD_task-620.1.1-partner-program.sql` (nueva)
- `src/lib/commercial/partner-attribution-store.ts` (nuevo)
- `src/lib/commercial/partner-commission-reports.ts` (nuevo, generador de reportes)
- `src/app/api/commercial/partner-reports/[partnerId]/route.ts` (nuevo)
- `src/lib/integrations/hubspot/products-outbound-adapter.ts` (modificado: `product_type='tool_license'` para tools)
- `src/views/greenhouse/admin/partner-revenue/PartnerRevenueDashboard.tsx` (nuevo)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- `tool_partners` table (TASK-620, con seed Adobe/Microsoft/HubSpot)
- `sellable_tools.partner_id` FK (TASK-620.1)
- `quotation_line_items` (existe)
- HubSpot products outbound adapter (TASK-603)

### Gap

- No hay tabla de attribution snapshot (commission_pct congelado al momento del quote)
- No hay generador de reportes de revenue por partner
- HubSpot sync no diferencia tools partner-resold vs servicios propios
- No hay dashboard de visibility para finance team

## Scope

### Slice 1 — Migracion (0.5 dia)

```sql
-- migrations/YYYYMMDD_task-620.1.1-partner-program.sql

-- 1. Snapshot attribution por quote line
CREATE TABLE IF NOT EXISTS greenhouse_commercial.quote_line_partner_attribution (
  attribution_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_line_item_id text NOT NULL,
  quotation_id text NOT NULL,
  version_number int NOT NULL,
  partner_id text NOT NULL REFERENCES greenhouse_commercial.tool_partners(partner_id) ON DELETE RESTRICT,
  tool_id text NOT NULL REFERENCES greenhouse_commercial.sellable_tools(tool_id) ON DELETE RESTRICT,
  commission_pct_snapshot numeric(5,2) NOT NULL,        -- congelado al momento del quote
  gross_revenue numeric(14,2) NOT NULL,                 -- snapshot del valor cobrado
  estimated_commission numeric(14,2) NOT NULL,          -- gross * commission_pct
  estimated_net_revenue numeric(14,2) NOT NULL,         -- gross - estimated_commission
  currency text NOT NULL,
  partner_program_snapshot text NOT NULL,
  partner_tier_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE greenhouse_commercial.quote_line_partner_attribution OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_quote_line_partner_attribution_partner
  ON greenhouse_commercial.quote_line_partner_attribution (partner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quote_line_partner_attribution_quote
  ON greenhouse_commercial.quote_line_partner_attribution (quotation_id, version_number);

-- 2. Reportes de comision per partner per periodo (idempotente via UNIQUE)
CREATE TABLE IF NOT EXISTS greenhouse_commercial.partner_commission_reports (
  report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL REFERENCES greenhouse_commercial.tool_partners(partner_id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  currency text NOT NULL,
  total_gross_revenue numeric(14,2) NOT NULL,
  total_estimated_commission numeric(14,2) NOT NULL,
  total_estimated_net_revenue numeric(14,2) NOT NULL,
  line_items_count int NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'reconciled', 'disputed')),
  partner_paid_amount numeric(14,2),                    -- lo que el partner realmente deposito
  partner_paid_at date,
  reconciliation_notes text,
  CONSTRAINT partner_commission_reports_period_valid CHECK (period_end >= period_start),
  CONSTRAINT partner_commission_reports_unique UNIQUE (partner_id, period_start, period_end, currency)
);

ALTER TABLE greenhouse_commercial.partner_commission_reports OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_partner_commission_reports_partner_period
  ON greenhouse_commercial.partner_commission_reports (partner_id, period_start, period_end);

-- 3. Extender tool_partners con metadata adicional para reporting
ALTER TABLE greenhouse_commercial.tool_partners
  ADD COLUMN IF NOT EXISTS reporting_frequency text DEFAULT 'monthly'
    CHECK (reporting_frequency IN ('monthly', 'quarterly', 'annual')),
  ADD COLUMN IF NOT EXISTS reporting_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS partner_account_manager_email text,
  ADD COLUMN IF NOT EXISTS partner_portal_url text;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  greenhouse_commercial.quote_line_partner_attribution,
  greenhouse_commercial.partner_commission_reports
TO greenhouse_runtime;
```

### Slice 2 — Attribution snapshot trigger (0.25 dia)

Cuando se inserta un `quotation_line_item` con `tool_id` que tiene `partner_id`, auto-crear el snapshot:

```typescript
// src/lib/commercial/partner-attribution-store.ts

export const snapshotPartnerAttributionForLine = async (lineItem: QuotationLineItem) => {
  if (!lineItem.toolId) return null

  const tool = await getSellableToolById(lineItem.toolId)
  if (!tool?.partnerId) return null

  const partner = await getToolPartner(tool.partnerId)
  if (!partner?.commissionPct) return null

  const grossRevenue = Number(lineItem.subtotalAfterDiscount || 0)
  const estimatedCommission = grossRevenue * (Number(partner.commissionPct) / 100)
  const estimatedNetRevenue = grossRevenue - estimatedCommission

  await runQuery(`
    INSERT INTO greenhouse_commercial.quote_line_partner_attribution
      (quotation_line_item_id, quotation_id, version_number, partner_id, tool_id,
       commission_pct_snapshot, gross_revenue, estimated_commission, estimated_net_revenue,
       currency, partner_program_snapshot, partner_tier_snapshot)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `, [
    lineItem.lineItemId, lineItem.quotationId, lineItem.versionNumber,
    partner.partnerId, tool.toolId,
    partner.commissionPct, grossRevenue, estimatedCommission, estimatedNetRevenue,
    lineItem.currency, partner.partnerProgram, partner.partnerTier
  ])
}
```

Hook en el flow de `addLineItemToQuote()` y `expandServiceIntoQuoteLines()`.

### Slice 3 — Generador de reportes (0.25 dia)

`src/lib/commercial/partner-commission-reports.ts`:

```typescript
export const generatePartnerCommissionReport = async (params: {
  partnerId: string
  periodStart: Date
  periodEnd: Date
  currency: string
  generatedBy: string
}) => {
  const lines = await runQuery<any>(`
    SELECT
      COALESCE(SUM(gross_revenue), 0) AS gross,
      COALESCE(SUM(estimated_commission), 0) AS commission,
      COALESCE(SUM(estimated_net_revenue), 0) AS net,
      COUNT(*) AS line_count
    FROM greenhouse_commercial.quote_line_partner_attribution
    WHERE partner_id = $1
      AND currency = $2
      AND created_at >= $3
      AND created_at < $4
  `, [params.partnerId, params.currency, params.periodStart, params.periodEnd])

  const summary = lines[0]

  return upsertCommissionReport({
    ...params,
    totalGrossRevenue: Number(summary.gross),
    totalEstimatedCommission: Number(summary.commission),
    totalEstimatedNetRevenue: Number(summary.net),
    lineItemsCount: Number(summary.line_count)
  })
}
```

### Slice 4 — Endpoint + reconciliation (0.25 dia)

`src/app/api/commercial/partner-reports/[partnerId]/route.ts`:

- `GET ?from=2026-04-01&to=2026-04-30&currency=USD` → genera o retorna reporte cached
- `POST { partner_paid_amount, partner_paid_at, reconciliation_notes }` → marca como `reconciled`
- Solo Finance Admin puede crear/reconciliar

### Slice 5 — HubSpot sync ajuste + dashboard (0.25 dia)

**Adapter outbound:** modificar `src/lib/integrations/hubspot/products-outbound-adapter.ts` para:

- Si producto es un `sellable_tool` con `partner_id != NULL` → `product_type='tool_license'` (no 'license')
- Property HubSpot `partner_id` agregada (custom property)
- Property HubSpot `partner_revenue_share_pct` agregada (custom property)

**Dashboard `PartnerRevenueDashboard.tsx`:**

```
┌───────────────────────────────────────────────┐
│ Partner Revenue Dashboard                      │
├───────────────────────────────────────────────┤
│ [Selector partner ▼]  [Periodo ▼]  [Currency]│
│                                                │
│ ┌─────────────┬─────────────┬─────────────┐  │
│ │ Gross       │ Commission  │ Net Revenue │  │
│ │ $52,400 USD │ $7,860 USD  │ $44,540 USD │  │
│ └─────────────┴─────────────┴─────────────┘  │
│                                                │
│ ┌─ Quotes con tools de este partner ────┐    │
│ │ QT-001 v3 · 2026-04-12 · $5,000 USD   │    │
│ │ QT-014 v1 · 2026-04-18 · $12,000 USD  │    │
│ │ ...                                    │    │
│ └────────────────────────────────────────┘    │
│                                                │
│ [Generar reporte para reconciliacion]          │
└───────────────────────────────────────────────┘
```

## Out of Scope

- Sync inbound desde Adobe/Microsoft/HubSpot APIs de su pricing real (futuro)
- Auto-pago de comisiones entre Greenhouse y partners (manual via finance team)
- Multi-currency conversion en reportes (cada moneda separada en v1)
- Tier graduado de comisiones (Adobe paga distinto si haces $X vs $Y por trimestre)

## Acceptance Criteria

- [ ] migracion aplicada sin errores
- [ ] auto-snapshot trigger funcional cuando se agrega tool con partner a una quote
- [ ] endpoint partner-reports devuelve datos consistentes
- [ ] HubSpot sync diferencia 'tool_license' vs 'license' interna
- [ ] dashboard PartnerRevenueDashboard funcional con datos reales
- [ ] reconciliation workflow: marcar reporte como `reconciled` con `partner_paid_amount`
- [ ] tests passing
- [ ] aplicado en staging + prod despues de QA

## Verification

- Crear quote con tool Adobe → verificar attribution snapshot creada
- Generar reporte mensual Adobe → verificar totals correctos
- Cambiar `tool_partners.commission_pct` → verificar quotes historicas mantienen snapshot original
- HubSpot portal: verificar producto Adobe sync con `product_type='tool_license'`

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con dashboard screenshot
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` actualizado seccion "Partner Revenue Tracking"
- [ ] `docs/documentation/admin-center/partner-revenue.md` (nuevo) explica feature al finance team
