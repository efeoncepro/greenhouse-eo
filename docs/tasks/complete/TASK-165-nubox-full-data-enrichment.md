# TASK-165 — Nubox Full Data Enrichment: All Fields, Line Items, References, Balances & Sync Hardening

## Delta 2026-03-30

- Esta task ya no está en modo plan; el baseline quedó implementado y endurecido en runtime.
- Estado real a la fecha:
  - el sync enriquecido ya materializa campos ricos de Nubox en Postgres
  - la UI/detail de income ya consume artefactos enriquecidos como `nuboxPdfUrl` y `nuboxXmlUrl`
  - el incidente de descarga `401` quedó mitigado priorizando URLs directas cuando ya existen en el record
  - los remanentes futuros deben tratarse como follow-ons localizados, no como reapertura de esta task
- Referencias vivas:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/tasks/complete/TASK-139-finance-module-hardening.md`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P0` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Implementado` |
| Closed | `2026-03-30` |
| Rank | — |
| Domain | Finance / Nubox Integration / Data Platform |
| Sequence | Después de TASK-163 (document type separation), conecta con TASK-164 (OC/HES) |

## Summary

Nubox envía datos ricos en cada documento (detalle de líneas, referencias entre documentos, balance de cobro, estado SII, URLs a PDF/XML, forma de pago, montos exentos, retenciones, tipo de compra) pero Greenhouse solo aprovecha un subset. Esta task trae TODO lo que Nubox ofrece, lo integra en las tablas correctas de Postgres, habilita reconciliación cruzada, alertas tributarias, y migra el sync conformed de DELETE/INSERT a upsert incremental.

Estado histórico:
- este summary describe el gap original que originó la task
- no debe interpretarse como deuda abierta del runtime actual

## Why This Task Exists

### Auditoría de campos Nubox (2026-03-30)

**Sales (ventas) — 21 campos disponibles, 14 capturados, 7 no capturados:**

| Campo Nubox | En conformed? | En Postgres? | Valor operativo |
|-------------|:---:|:---:|----------------|
| `id` (nubox_sale_id) | ✓ | ✓ | Identificador único |
| `number` (folio) | ✓ | ✓ | Número de factura |
| `type.legalCode` (DTE code) | ✓ | ✓ | Clasificación SII |
| `type.abbreviation` | ✓ | ✗ | "FAC-EL", "N/C-EL" — para UI |
| `type.name` | ✓ | ✗ | Nombre completo del tipo DTE |
| `totalNetAmount` | ✓ | ✓ | Monto neto (subtotal) |
| `totalExemptAmount` | ✓ | ✗ | Monto exento — para reporting tributario |
| **`totalOtherTaxesAmount`** | **✗** | ✗ | **Impuestos adicionales/específicos** |
| **`totalWithholdingAmount`** | **✗** | ✗ | **Retenciones aplicadas** |
| `balance` | ✓ | ✗ | **Saldo pendiente según Nubox** — reconciliación cruzada |
| `emissionDate` | ✓ | ✓ | Fecha de emisión |
| `dueDate` | ✓ | ✓ | Fecha de vencimiento |
| `periodYear/Month` | ✓ | ✗ | Período fiscal |
| `paymentForm.legalCode` | ✓ | ✗ | **"1"=contado, "2"=crédito** — cash flow |
| `paymentForm.name` | ✓ | ✗ | Nombre forma de pago |
| `dataCl.trackId` | ✓ | ✓ | Track SII |
| `dataCl.annulled` | ✓ | ✓ (ISSUE-002) | Documento anulado |
| `emissionStatus` | ✓ | ✓ | Borrador, Emitido, etc. |
| `origin.name` | ✓ | ✗ | Manual, Integración SII, API |
| **`client.mainActivity`** | **✗** | ✗ | **Giro comercial del cliente** |
| **`links[]`** | **✗** | ✗ | **URLs a PDF, XML, details, references** |

**Purchases (compras) — campos adicionales no capturados:**

| Campo Nubox | En conformed? | Valor operativo |
|-------------|:---:|----------------|
| `dataCl.annulled` | ✓ | **No se filtra** — misma deuda que en sales |
| **`dataCl.receiptAt`** | **✗** | **Fecha de recepción DTE** — clave para HES |
| **`dataCl.vatUnrecoverableAmount`** | **✗** | IVA no recuperable (costo real) |
| **`dataCl.vatFixedAssetsAmount`** | **✗** | IVA activo fijo |
| **`dataCl.vatCommonUseAmount`** | **✗** | IVA uso común |
| `documentStatus.name` | ✓ | **"Aceptado"/"Reclamado"** — alerta tributaria |
| **`purchaseType`** | **✗** | Tipo de compra (giro, activo fijo) |
| `balance` | ✓ | Saldo pendiente de pago |

**Sale/Purchase Details (line items) — NO capturados:**

| Campo Nubox | Tipo | Valor operativo |
|-------------|------|----------------|
| `lineNumber` | int | Orden de línea |
| `description` | string | **Qué se facturó** — sin esto, la factura es una caja negra |
| `quantity` | number | Cantidad |
| `unitPrice` | number | Precio unitario |
| `totalAmount` | number | Total de la línea |
| `discountPercent` | number | Descuento aplicado |
| `exemptIndicator` | boolean | Si la línea es exenta |

**Sale References (vínculos entre documentos) — NO capturados:**

Nubox provee un link `rel: "references"` que conecta notas de crédito con su factura original. Hoy `referenced_income_id` existe en income pero nunca se puebla desde Nubox.

## Architecture Reference

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `src/lib/nubox/types.ts` — tipos Nubox completos
- `src/lib/nubox/mappers.ts` — transformación raw → conformed
- `src/lib/nubox/sync-nubox-to-postgres.ts` — proyección conformed → Postgres

## Dependencies & Impact

- **Depende de:**
  - TASK-163 (Document Type Separation) — `complete`
  - ISSUE-002 (Annulled fix) — `in progress`
  - Nubox API access (exists)
- **Impacta a:**
  - TASK-164 (OC/HES) — `receiptAt` es dato clave para HES tracking
  - TASK-146 (Service P&L) — line items permiten cruzar con servicios
  - TASK-138 (Finance Intelligence) — reconciliación balance Nubox vs Greenhouse
  - TASK-139 (Data Quality) — nuevo check de balance divergence
  - Finance Dashboard — cash flow con payment_form
  - Todos los consumers de income/expenses

## Resultado real de cierre

- Nubox enrichment quedó institucionalizado como baseline del carril Finance/Nubox.
- El runtime actual ya reutiliza metadata tributaria y enlaces ricos materializados por sync.
- El fetch/download de PDF/XML ya quedó endurecido para preferir links directos cuando existen, manteniendo fallback al proxy solo como compatibilidad.

## Scope

### Slice 1 — Schema: nuevas columnas en income + expenses (~1h)

**`greenhouse_finance.income` — agregar columnas:**

```sql
ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS dte_type_abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS dte_type_name TEXT,
  ADD COLUMN IF NOT EXISTS exempt_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS other_taxes_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS withholding_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS balance_nubox NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_form TEXT,           -- 'contado', 'credito'
  ADD COLUMN IF NOT EXISTS payment_form_name TEXT,
  ADD COLUMN IF NOT EXISTS origin TEXT,                 -- 'Manual Emision', 'Integración SII', 'API'
  ADD COLUMN IF NOT EXISTS period_year INT,
  ADD COLUMN IF NOT EXISTS period_month INT,
  ADD COLUMN IF NOT EXISTS nubox_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS nubox_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS nubox_details_url TEXT,
  ADD COLUMN IF NOT EXISTS nubox_references_url TEXT;
```

**`greenhouse_finance.expenses` — agregar columnas:**

```sql
ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS is_annulled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sii_document_status TEXT,     -- 'Aceptado', 'Reclamado', 'Pendiente'
  ADD COLUMN IF NOT EXISTS receipt_date DATE,
  ADD COLUMN IF NOT EXISTS purchase_type TEXT,            -- 'giro', 'activo_fijo', etc.
  ADD COLUMN IF NOT EXISTS balance_nubox NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_unrecoverable_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_fixed_assets_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_common_use_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS nubox_pdf_url TEXT;
```

### Slice 2 — Line items table + fetch (~3h)

**Nueva tabla `greenhouse_finance.income_line_items`:**

```sql
CREATE TABLE greenhouse_finance.income_line_items (
  line_item_id TEXT PRIMARY KEY,
  income_id TEXT NOT NULL REFERENCES greenhouse_finance.income(income_id),
  line_number INT NOT NULL,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_amount NUMERIC,
  discount_percent NUMERIC,
  is_exempt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT line_item_unique UNIQUE (income_id, line_number)
);

CREATE INDEX idx_line_items_income ON greenhouse_finance.income_line_items (income_id);
```

**Fetch de details durante sync:**

En `upsertIncomeFromSale()`, después de crear el income record:
1. Verificar si el sale tiene link `rel: "details"`
2. Si existe, fetch del endpoint de details
3. Upsert cada line item en `income_line_items`
4. Si no existe (sale sin details), skip sin error

**API:** `GET /api/finance/income/[id]/lines` retorna los line items

**UI en Income detail:** tabla de líneas debajo de la información del documento

### Slice 3 — References: vincular N/C → factura (~1.5h)

**Fetch de references durante sync:**

En `upsertIncomeFromSale()`, si `income_type = 'credit_note'`:
1. Verificar si el sale tiene link `rel: "references"`
2. Si existe, fetch del endpoint de references
3. El response contiene el `document_id` de la factura original
4. Buscar el income con ese `nubox_document_id` → set `referenced_income_id`

**UI en Income list:** notas de crédito muestran "Ref: Factura #94" como subtexto

**UI en Income detail:** link clickeable a la factura referenciada

### Slice 4 — Enriquecer mapper conformed → Postgres (~2h)

Actualizar `upsertIncomeFromSale()` para poblar todas las columnas nuevas:

```typescript
// Nuevos campos del INSERT:
exempt_amount,
other_taxes_amount,
withholding_amount,
balance_nubox,
payment_form,
payment_form_name,
origin,
period_year,
period_month,
dte_type_abbreviation,
dte_type_name,
nubox_pdf_url,
nubox_xml_url,
nubox_details_url,
nubox_references_url
```

**Links de Nubox:** extraer URLs del array `links[]` en el mapper conformed:

```typescript
// En mappers.ts — extraer links por rel
const getLink = (links: NuboxLink[] | undefined, rel: string) =>
  links?.find(l => l.rel === rel)?.href || null

// En NuboxConformedSale — agregar campos
pdf_url: getLink(sale.links, 'pdf'),
xml_url: getLink(sale.links, 'xml'),
details_url: getLink(sale.links, 'details'),
references_url: getLink(sale.links, 'references'),
```

Mismo enriquecimiento para `upsertExpenseFromPurchase()` con los campos de purchase.

### Slice 5 — Purchases: annulled + SII status + receipt date (~1.5h)

1. **Annulled en purchases:** mismo patrón que income:
   - `is_annulled = sale.is_annulled` en el INSERT de expenses
   - Queries de expense dashboard excluyen `is_annulled = TRUE`
   - UI muestra chip "Anulada" en lista de expenses

2. **SII document status:**
   - `sii_document_status = purchase.documentStatus.name`
   - Notificación `finance_alert` cuando status = "Reclamado"
   - UI: chip en lista de expenses — "Aceptado" verde, "Reclamado" rojo

3. **Receipt date:**
   - `receipt_date = purchase.dataCl.receiptAt`
   - Disponible para TASK-164 (HES tracking)

### Slice 6 — Balance reconciliation + data quality (~2h)

1. **Sincronizar `balance_nubox`** en cada sync:
   - `balance_nubox = sale.balance` (monto pendiente según Nubox)
   - Se actualiza en cada sync (no solo al crear)

2. **Data quality check nuevo** en `/api/finance/data-quality`:

```typescript
// Check: balance_nubox vs Greenhouse payment tracking
{
  name: 'nubox_balance_divergence',
  query: `
    SELECT COUNT(*) FROM greenhouse_finance.income
    WHERE balance_nubox IS NOT NULL
      AND balance_nubox = 0
      AND payment_status IN ('pending', 'partial', 'overdue')
      AND is_annulled = FALSE
  `,
  // Si Nubox dice balance=0 (pagado) pero Greenhouse dice pending
  // → probablemente se cobró fuera del sistema
}
```

3. **Alerta de divergencia** vía notification mapping:
   - "Factura #94: cobrada según Nubox pero pendiente en Greenhouse"

### Slice 7 — Cash flow enrichment con payment_form (~1h)

1. **`payment_form`** ('contado' / 'credito') en income
2. **Dashboard cash flow:** distinguir facturas de cobro inmediato vs a plazo
3. **DSO adjustment:** facturas contado tienen DSO = 0 por definición

### Slice 8 — Sync hardening: upsert en conformed (~2h)

Migrar el patrón DELETE/INSERT en `sync-nubox-conformed.ts` a MERGE:

```sql
-- Antes (peligroso):
DELETE FROM greenhouse_conformed.nubox_sales WHERE TRUE;
INSERT INTO greenhouse_conformed.nubox_sales ...;

-- Después (seguro):
MERGE `project.greenhouse_conformed.nubox_sales` AS target
USING (SELECT ... FROM UNNEST(@rows)) AS source
ON target.nubox_sale_id = source.nubox_sale_id
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT ...;
```

Si BigQuery no soporta MERGE con arrays, usar INSERT ON CONFLICT pattern o transacción con DELETE parcial (solo IDs que se van a re-insertar).

### Slice 9 — Balance sync ligero (cron cada 4-6h) (~1.5h)

Nuevo cron `/api/cron/nubox-balance-sync`:

1. Fetch solo sales con `balance > 0` de Nubox API (endpoint ligero)
2. Actualizar `balance_nubox` en income
3. Detectar divergencias con `payment_status` de Greenhouse
4. No re-procesar todo el pipeline — solo actualizar balances

Schedule: `*/360 * * * *` (cada 6 horas) o `0 */4 * * *` (cada 4 horas)

### Slice 10 — UI: PDF links + line items + references (~2h)

1. **Income detail view:**
   - Botón "Ver DTE en Nubox" (link a `nubox_pdf_url`)
   - Botón "XML" (link a `nubox_xml_url`)
   - Tabla de line items debajo del detalle
   - Si es N/C: "Referencia: Factura #{folio}" con link

2. **Expense detail view:**
   - Botón "Ver DTE" (link a `nubox_pdf_url`)
   - Chip de estado SII ("Aceptado" / "Reclamado")

3. **Income list:**
   - Columna "Forma de pago" opcional (contado / crédito)

### Slice 11 — Conformed mapper: capturar campos faltantes (~1h)

Actualizar `mapSaleToConformed()` y `mapPurchaseToConformed()` en `mappers.ts`:

```typescript
// Sales — campos nuevos
other_taxes_amount: sale.totalOtherTaxesAmount ?? null,
withholding_amount: sale.totalWithholdingAmount ?? null,
client_main_activity: sale.client?.mainActivity ?? null,
pdf_url: getLink(sale.links, 'pdf'),
xml_url: getLink(sale.links, 'xml'),
details_url: getLink(sale.links, 'details'),
references_url: getLink(sale.links, 'references'),

// Purchases — campos nuevos
receipt_date: purchase.dataCl?.receiptAt ?? null,
vat_unrecoverable_amount: purchase.dataCl?.vatUnrecoverableAmount ?? null,
vat_fixed_assets_amount: purchase.dataCl?.vatFixedAssetsAmount ?? null,
vat_common_use_amount: purchase.dataCl?.vatCommonUseAmount ?? null,
purchase_type_code: purchase.purchaseType?.legalCode ?? null,
purchase_type_name: purchase.purchaseType?.name ?? null,
pdf_url: getLink(purchase.links, 'pdf'),
```

Actualizar tipos `NuboxConformedSale` y `NuboxConformedPurchase` con los campos nuevos.

### Slice 12 — Tests + migration validation (~1.5h)

1. **Tests mapper:** verificar que campos nuevos se mapean correctamente
2. **Tests sync:** verificar que annulled purchases se excluyen de costos
3. **Tests data quality:** verificar check de balance divergence
4. **Migration script:** ALTERs + backfill de `is_annulled` en expenses existentes
5. **Validación:** comparar totales pre/post enrichment

## Relación con el pipeline comercial completo

```
Nubox sale (con detail + references + balance + links)
    ↓
Conformed (todos los campos capturados)
    ↓
Postgres income (enriquecido con todos los campos)
    ├── income_line_items (detalle por línea)
    ├── referenced_income_id (N/C → factura)
    ├── balance_nubox (reconciliación cruzada)
    ├── payment_form (cash flow)
    └── nubox_pdf_url (link directo al DTE)

Nubox purchase (con dataCl + documentStatus + balance)
    ↓
Conformed (con receipt_date, annulled, sii_status)
    ↓
Postgres expense (enriquecido)
    ├── is_annulled (excluido de costos)
    ├── sii_document_status (alerta si Reclamado)
    ├── receipt_date (input para HES — TASK-164)
    └── balance_nubox (reconciliación payables)
```

## Cross-Module Ecosystem: Outbox, Projections & Consumers

### Outbox Events Emitidos

Estos son los eventos del catálogo (`event-catalog.ts`) que esta task enriquece o crea:

| Evento | Trigger | Payload enrichment por TASK-165 |
|--------|---------|--------------------------------|
| `finance.income.created` | Sync Nubox → Postgres inserta income | +`exempt_amount`, `payment_form`, `balance_nubox`, `pdf_url`, `xml_url`, `period_year/month` |
| `finance.income.updated` | Sync actualiza income existente | +`balance_nubox` (actualizado cada sync) |
| `finance.expense.created` | Sync inserta expense desde purchase | +`is_annulled`, `sii_document_status`, `receipt_date`, `purchase_type`, `vat_*` splits |
| `finance.expense.updated` | Sync actualiza expense existente | +`balance_nubox`, `sii_document_status` (puede cambiar en SII) |
| `finance.quote.created` | Sync inserta cotización (DTE 52/COT) | Ya existe (TASK-163) — sin cambios |
| `finance.quote.converted` | Cotización cambia a `converted` | Ya existe — `convertedToIncomeId` ya se vincula |
| `finance.credit_note.created` | Sync inserta N/C (DTE 61) | +`referenced_income_id` (link a factura original vía Nubox references) |
| **`finance.balance_divergence.detected`** | **NUEVO** — Cron balance-sync detecta discrepancia | `{ incomeId, nuboxBalance, greenhouseStatus, dteFolio }` |
| **`finance.sii_claim.detected`** | **NUEVO** — Sync detecta `documentStatus = "Reclamado"` | `{ expenseId, supplierName, dteFolio, claimDate }` |

### Reactive Projections Afectadas

| Proyección | Eventos trigger relevantes | Impacto del enrichment |
|------------|---------------------------|------------------------|
| **operational-pl** | `finance.income.*`, `finance.expense.*`, `finance.credit_note.created` | Ahora tiene `is_annulled` en expenses → excluye anuladas de costos. `payment_form` permite distinguir cash vs crédito en el flujo |
| **client-economics** | `finance.income.*`, `finance.expense.*` | Con `balance_nubox` puede detectar clientes con cobros divergentes. `exempt_amount` refina el cálculo de IVA efectivo |
| **period-closure-status** | `finance.income.*`, `finance.expense.*`, `finance.exchange_rate.upserted` | Balance Nubox como dato adicional para validar readiness de cierre |
| **member-capacity-economics** | `finance.expense.created/updated`, `finance.exchange_rate.upserted` | `purchase_type` + `vat_*` splits refinan el costo real de insumos por miembro |
| **person-intelligence** | Indirecto vía `member-capacity-economics` | Costo real de herramientas y licencias con IVA no recuperable |
| **notification-dispatch** | `finance.sii_claim.detected`, `finance.balance_divergence.detected` | **2 mappings nuevos** (ver abajo) |

### Notification Mappings Nuevos

Agregar a `notification-mapping.ts`:

```typescript
// SII claim alert — priority high
{
  eventType: 'finance.sii_claim.detected',
  category: 'finance_alert',
  title: 'DTE Reclamado: {supplierName}',
  body: 'El documento {dteFolio} fue reclamado ante el SII. Requiere revisión.',
  actionUrl: '/finance/expenses/{expenseId}',
  recipientResolver: 'finance_admins',
}

// Balance divergence alert
{
  eventType: 'finance.balance_divergence.detected',
  category: 'finance_alert',
  title: 'Divergencia de cobro: Factura #{dteFolio}',
  body: 'Nubox marca como cobrada pero Greenhouse tiene pago pendiente.',
  actionUrl: '/finance/income/{incomeId}',
  recipientResolver: 'finance_admins',
}
```

### Cross-Module Consumers Impactados

| Consumer | Archivo | Datos que recibe del enrichment | Impacto |
|----------|---------|---------------------------------|---------|
| **Agency Space 360** | `src/lib/agency/agency-finance-metrics.ts` | Vía `operational_pl_snapshots` — costos reales sin anuladas, IVA no recuperable como costo real | Márgenes por Space más precisos |
| **Organization 360** | `src/lib/account-360/organization-economics.ts` | Vía `computeClientEconomicsSnapshots` — `payment_form` distingue cash vs crédito por cliente | Cash flow por organización |
| **Cost Intelligence P&L** | `src/lib/cost-intelligence/compute-operational-pl.ts` | `is_annulled` excluye purchases anuladas. `vat_unrecoverable` suma al costo real. `payment_form` alimenta cash flow | P&L operativo más preciso |
| **Finance PnL Dashboard** | `src/app/api/finance/dashboard/pnl/route.ts` | `is_annulled` en expenses (mismo filtro que income). `exempt_amount` en revenue detail | Margen bruto real |
| **Working Capital** | `src/app/api/finance/dashboard/summary/route.ts` | `balance_nubox` como contraste para DSO. `payment_form=contado` → DSO=0 | DSO más preciso |
| **Data Quality** | `src/app/api/finance/data-quality/route.ts` | **Nuevo check** balance divergence + annulled check en expenses | Alertas proactivas |
| **Payroll Cost Allocation** | `src/lib/finance/payroll-cost-allocation.ts` | Indirecto — expenses anuladas no entran a direct costs | Costo real por Space |
| **TASK-164 (OC/HES)** | (futuro) | `receipt_date` de purchases es input clave para HES tracking | Fecha de recepción SII |
| **TASK-146 (Service P&L)** | (futuro) | Line items permiten cruzar con servicios contratados | Qué se facturó por servicio |

### Flujo de Datos Completo Post-Enrichment

```
Nubox API
  ├── /v1/sales (ventas)
  │     ├── [sync principal] → BigQuery raw → conformed → Postgres income
  │     │     ├── outbox: finance.income.created/updated
  │     │     ├── → operational-pl, client-economics, period-closure
  │     │     └── → notification-dispatch (finance_alert)
  │     ├── [details endpoint] → Postgres income_line_items
  │     │     └── → UI detail view, TASK-146 service matching
  │     └── [references endpoint] → referenced_income_id en income
  │           └── → N/C → Factura link, credit note audit trail
  │
  ├── /v1/purchases (compras)
  │     ├── [sync principal] → BigQuery raw → conformed → Postgres expense
  │     │     ├── outbox: finance.expense.created/updated
  │     │     ├── → operational-pl, member-capacity-economics
  │     │     └── sii_claim? → finance.sii_claim.detected → notification
  │     └── receipt_date → TASK-164 HES tracking
  │
  ├── /v1/bank/expenses (egresos)
  │     └── → BigQuery conformed bank_movements
  │
  └── /v1/bank/incomes (ingresos banco)
        └── → BigQuery conformed bank_movements

Cron balance-sync (cada 4-6h)
  └── Nubox sales balance → income.balance_nubox
        ├── divergencia? → finance.balance_divergence.detected → notification
        └── → data-quality dashboard
```

### Proyecciones Entrantes (datos que esta task consume)

| Fuente | Dato | Uso en esta task |
|--------|------|------------------|
| `greenhouse_core.organizations` (tax_id) | RUT de organización | Identity resolution: sale.client.rut → organization_id |
| `greenhouse_finance.suppliers` (tax_id) | RUT de proveedor | Identity resolution: purchase.supplier.rut → supplier_id |
| `greenhouse_core.spaces` (client_id) | Client ID de Space | Vincula income con Space para economics |
| Nubox API `/v1/sales/{id}/details` | Line items de factura | Fetch durante sync, almacena en income_line_items |
| Nubox API `/v1/sales/{id}/references` | Documento referenciado | Fetch para N/C, resuelve referenced_income_id |
| `greenhouse_sync.source_sync_runs` | Estado de syncs previos | Tracking de ejecución, delta detection |

## Out of Scope

- Contabilidad tributaria completa (libro de compras/ventas) — mejora futura
- Prorrateo IVA uso común — solo se almacena el monto, no el cálculo
- Sincronización bidireccional (Greenhouse → Nubox) — solo lectura
- OCR de DTEs — solo links a PDF/XML de Nubox
- Conciliación automática balance Nubox → income_payments — solo alerta, no auto-fix

## Acceptance Criteria

### Schema
- [ ] Todas las columnas nuevas agregadas a income y expenses
- [ ] Tabla `income_line_items` creada con indexes

### Datos
- [ ] Campos de sales (exempt, taxes, withholding, balance, payment_form, origin, links) poblados en income
- [ ] Campos de purchases (annulled, sii_status, receipt_date, purchase_type, balance, vat splits) poblados en expenses
- [ ] Line items fetcheados e insertados para incomes con link `details`
- [ ] `referenced_income_id` poblado automáticamente para notas de crédito via link `references`
- [ ] `balance_nubox` actualizado en cada sync

### Filtros y cálculos
- [ ] Expenses anuladas excluidas de cálculos de costos
- [ ] SII status "Reclamado" genera notificación
- [ ] Data quality check detecta divergencia balance Nubox vs payment_status
- [ ] Dashboard cash flow distingue contado vs crédito

### Sync
- [ ] Conformed migrado de DELETE/INSERT a upsert (MERGE o ON CONFLICT)
- [ ] Cron `nubox-balance-sync` actualiza balances cada 4-6h
- [ ] Sync no falla si line items o references no están disponibles

### UI
- [ ] Income detail: botones "Ver DTE" / "XML", tabla line items, link de referencia N/C
- [ ] Expense detail: botón "Ver DTE", chip SII status
- [ ] Expense list: chip "Anulada" para expenses anuladas

### Tests
- [ ] Mapper tests para campos nuevos
- [ ] Sync tests para annulled purchases
- [ ] Data quality tests para balance divergence
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## File Reference

| Archivo | Cambio |
|---------|--------|
| `scripts/setup-nubox-enrichment.sql` | DDL: ALTERs + income_line_items table (nuevo) |
| `src/lib/nubox/types.ts` | Agregar campos a NuboxConformedSale/Purchase |
| `src/lib/nubox/mappers.ts` | Capturar todos los campos nuevos + link extractor |
| `src/lib/nubox/mappers.test.ts` | Tests para campos nuevos |
| `src/lib/nubox/sync-nubox-conformed.ts` | Migrar DELETE/INSERT a MERGE |
| `src/lib/nubox/sync-nubox-to-postgres.ts` | Poblar columnas nuevas + fetch details/references |
| `src/app/api/cron/nubox-balance-sync/route.ts` | Nuevo cron de balance ligero |
| `src/app/api/finance/income/[id]/lines/route.ts` | Nuevo endpoint line items |
| `src/app/api/finance/data-quality/route.ts` | Nuevo check balance divergence |
| `src/views/greenhouse/finance/IncomeDetailView.tsx` | PDF link + line items + reference |
| `src/views/greenhouse/finance/ExpensesListView.tsx` | Chip annulled + SII status |
| `src/lib/finance/postgres-store-slice2.ts` | Columnas nuevas en INSERT/UPDATE |
| `src/lib/webhooks/consumers/notification-mapping.ts` | +2 mappings: SII Reclamado + Balance Divergence |
| `src/lib/sync/event-catalog.ts` | +2 eventos: `finance.sii_claim.detected`, `finance.balance_divergence.detected` |
| `src/lib/sync/projections/notifications.ts` | Agregar triggers para 2 eventos nuevos |
| `src/lib/cost-intelligence/compute-operational-pl.ts` | Filtrar `is_annulled` en expenses, aprovechar `vat_unrecoverable` |
| `src/app/api/finance/dashboard/pnl/route.ts` | Filtrar expenses anuladas |
| `src/app/api/finance/dashboard/summary/route.ts` | Cash flow con `payment_form`, DSO con balance_nubox |
| `vercel.json` | Agregar cron nubox-balance-sync |
