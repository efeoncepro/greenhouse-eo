# CODEX TASK — Nubox DTE Integration: Emisión, compras y sincronización bidireccional de documentos tributarios

## Estado

Baseline de implementación al 2026-03-19.

Credenciales de API verificadas y funcionando contra 4 endpoints: sales, purchases, expenses, incomes. Script de discovery ejecutado con resultados positivos.

## Resumen

Integrar la API de Nubox al Finance module de Greenhouse para:
1. **Emitir DTEs** (facturas, boletas, NC, ND) directamente desde Greenhouse al SII vía Nubox
2. **Importar facturas de proveedores** (compras) automáticamente al módulo de gastos
3. **Sincronizar pagos** — egresos (expenses) e ingresos (incomes) bancarios desde Nubox
4. **Descargar PDFs y XMLs** tributarios desde la vista de detalle
5. **Sincronizar documentos** emitidos en Nubox que no fueron creados desde Greenhouse

Efeonce emite todas sus facturas a clientes y recibe todas las facturas de proveedores a través de Nubox. Hoy ambos procesos se hacen manualmente. Con esta integración, la emisión de ventas sale directo desde `/finance/income` y las compras llegan automáticamente a `/finance/expenses` sin salir de Greenhouse.

## Contexto técnico

### API de Nubox (Nueva API — Integraciones/Pyme)

- **Base URL prod**: `https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1`
- **Auth**: Dos headers estáticos por request:
  - `Authorization: Bearer <NUBOX_BEARER_TOKEN>`
  - `x-api-key: <NUBOX_X_API_KEY>`
- **Credenciales**: almacenadas en `.env.local` y Vercel como `NUBOX_BEARER_TOKEN`, `NUBOX_X_API_KEY`, `NUBOX_API_BASE_URL`
- **Idempotencia**: header `x-idempotence-id: <UUID>` en POST para prevenir duplicados

### Endpoints verificados (todos responden 200 con credenciales actuales)

#### Ventas (sales) — facturas que Efeonce emite a clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/sales/issuance` | Emitir hasta 50 DTEs por request |
| `GET` | `/v1/sales?period=YYYY-MM` | Listar ventas por periodo (paginado) |
| `GET` | `/v1/sales/{id}` | Detalle de documento |
| `GET` | `/v1/sales/{id}/details` | Líneas de detalle |
| `GET` | `/v1/sales/{id}/references` | Documentos referenciados (NC→FAC) |
| `GET` | `/v1/sales/{id}/pdf?template=TEMPLATE_A4` | PDF del DTE |
| `GET` | `/v1/sales/{id}/xml` | XML tributario |

#### Compras (purchases) — facturas que proveedores emiten a Efeonce

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/v1/purchases?period=YYYY-MM` | Listar compras por periodo (paginado) |
| `GET` | `/v1/purchases/{id}` | Detalle de documento de compra |
| `GET` | `/v1/purchases/{id}/details` | Líneas de detalle |
| `GET` | `/v1/purchases/{id}/references` | Documentos referenciados |

#### Egresos (expenses) — pagos bancarios a proveedores

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/v1/expenses?period=YYYY-MM` | Listar egresos por periodo |
| `GET` | `/v1/expenses/{id}` | Detalle de egreso |

#### Ingresos (incomes) — cobros bancarios de clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/v1/incomes?period=YYYY-MM` | Listar ingresos por periodo |

#### Datos de prueba (feb-2026)

| Endpoint | Registros | Monto total |
|----------|-----------|-------------|
| `/v1/sales?period=2026-02` | 5+ facturas/NC | Incluye Sky Airline, Gob Regional RM |
| `/v1/purchases?period=2026-02` | 8 documentos | $1,012,241 CLP |
| `/v1/expenses?period=2026-02` | 1 pago | $303,450 CLP |
| `/v1/incomes?period=2026-02` | 0 (204 No Content) | — |

### Códigos de tipo de documento SII

| Código | Abreviación | Descripción |
|--------|------------|-------------|
| 33 | FAC-EL | Factura Electrónica |
| 34 | FAC-EE | Factura No Afecta o Exenta Electrónica |
| 56 | N/D-EL | Nota de Débito Electrónica |
| 61 | N/C-EL | Nota de Crédito Electrónica |
| 38 | — | Boleta Exenta Electrónica |
| 39/41 | BOL-EL/BOL-EE | Boleta Electrónica |
| 52 | — | Guía de Despacho |

### Estados de emisión Nubox

| ID | Estado | Descripción |
|----|--------|-------------|
| 1 | Emitido | DTE aceptado por SII |
| 2 | Borrador | No enviado |
| 3 | Anulado | Documento anulado |
| 4 | Esperando SII | Enviado, pendiente respuesta |
| 5 | Rechazado | SII rechazó el documento |
| 6 | Esperando Re-emisión | Requiere corrección |
| 7 | Sin Respuesta SII | Timeout de SII |
| 8 | Reintento Disponible | Se puede reintentar |

## Alineación obligatoria

Antes de implementar, revisar:
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md`
- `docs/tasks/to-do/CODEX_TASK_Financial_Module_v2.md`
- `docs/tasks/to-do/CODEX_TASK_Financial_Intelligence_Layer.md`

## Reglas arquitectónicas

1. **Postgres-first**: nuevas tablas y escrituras en `greenhouse_finance`, BigQuery solo para marts/reporting
2. **Identidades canónicas obligatorias**: `client_id`, `organization_id`, `tax_id` — no crear identidades paralelas
3. **El puente es el RUT**: `organizations.tax_id` ↔ `nubox.client.identification.value`
4. **Nubox es sistema de emisión, no maestro de clientes**: los datos canónicos de cliente viven en Greenhouse, Nubox recibe el payload por emisión
5. **Idempotencia**: toda emisión debe incluir `x-idempotence-id` para prevenir duplicados
6. **No bloquear el flujo**: la emisión puede fallar (SII caído, rechazo) — el estado se trackea pero no bloquea la operación financiera en Greenhouse

## Schemas de respuesta de Nubox (referencia)

### Sales (ventas emitidas)

```json
{
  "id": 25129369,
  "number": "94",
  "type": {
    "id": 3,
    "legalCode": "33",
    "abbreviation": "FAC-EL",
    "name": "Factura electrónica"
  },
  "totalNetAmount": 632546,
  "totalExemptAmount": 0,
  "totalTaxVatAmount": 120184,
  "totalAmount": 752730,
  "emissionDate": "2026-02-02T13:24:52Z",
  "periodMonth": 2,
  "periodYear": 2026,
  "dueDate": "2026-03-02",
  "origin": { "id": 4, "name": "Manual Emision" },
  "paymentForm": { "id": 2, "legalCode": "2", "name": "Crédito" },
  "dataCl": { "trackId": 11670174962, "annulled": false },
  "client": {
    "tradeName": "SKY AIRLINE S A",
    "identification": { "value": "88417000-1" },
    "mainActivity": "Transporte y almacenamiento"
  },
  "emissionStatus": { "id": 1, "name": "Emitido" },
  "links": [
    { "rel": "self", "href": ".../sales/25129369" },
    { "rel": "details", "href": ".../sales/25129369/details" },
    { "rel": "references", "href": ".../sales/25129369/references" }
  ]
}
```

### Purchases (facturas de proveedores recibidas)

```json
{
  "id": 31558251,
  "number": "80917",
  "type": {
    "id": 3,
    "legalCode": "33",
    "abbreviation": "FAC-EL",
    "name": "Factura electrónica"
  },
  "totalNetAmount": 31924,
  "totalExemptAmount": 0,
  "totalTaxVatAmount": 6066,
  "totalAmount": 37990,
  "totalOtherTaxesAmount": 0,
  "totalWithholdingAmount": 0,
  "balance": 37990,
  "emissionDate": "2026-01-31T03:00:00Z",
  "periodMonth": 2,
  "periodYear": 2026,
  "dueDate": "2026-02-28",
  "origin": { "id": 3, "name": "Integración SII" },
  "dataCl": {
    "annulled": false,
    "receiptAt": "2026-02-04",
    "vatUnrecoverableAmount": 0,
    "vatFixedAssetsAmount": 0,
    "vatCommonUseAmount": 0
  },
  "supplier": {
    "identification": { "value": "76596744-9" },
    "tradeName": "CHITA SPA"
  },
  "documentStatus": { "id": 1, "name": "Aceptado" },
  "purchaseType": { "legalCode": "1", "name": "Ventas del Giro" },
  "links": [
    { "rel": "self", "href": ".../purchases/31558251" },
    { "rel": "details", "href": ".../purchases/31558251/details" },
    { "rel": "references", "href": ".../purchases/31558251/references" },
    { "rel": "expenses", "href": ".../expenses/" }
  ]
}
```

### Expenses (egresos/pagos bancarios)

```json
{
  "id": 3507198,
  "folio": 53,
  "type": { "id": 4, "description": "Gastos por compra" },
  "bank": { "id": 11, "description": "Banco Santander-Chile" },
  "paymentMethod": { "id": 4, "description": "Transferencia" },
  "supplier": {
    "identification": { "type": 1, "value": "77805887-1" },
    "tradeName": "BEECONTA SPA"
  },
  "totalAmount": 303450,
  "paymentDate": "2026-02-05",
  "links": [
    { "rel": "self", "href": ".../expenses/3507198" },
    { "rel": "document", "href": ".../purchases/31178446" }
  ]
}
```

### Mapeo de endpoints a tablas Greenhouse

| Nubox endpoint | Greenhouse tabla | Campo puente |
|----------------|-----------------|--------------|
| `/v1/sales` | `greenhouse_finance.income` | `organizations.tax_id` ↔ `client.identification.value` |
| `/v1/purchases` | `greenhouse_finance.expenses` (type=supplier) | `fin_suppliers.tax_id` ↔ `supplier.identification.value` |
| `/v1/expenses` | `greenhouse_finance.bank_statement_rows` / reconciliation | `supplier.identification.value` + `paymentDate` |
| `/v1/incomes` | `greenhouse_finance.income_payments` / reconciliation | payment date + amount matching |

## Implementación

### Fase 1 — Infraestructura y cliente API

**1.1 Cliente Nubox (`src/lib/nubox/client.ts`)**

```typescript
// Singleton con lazy init (mismo patrón que Resend)
// Headers: Authorization Bearer + x-api-key
// Métodos:
//   Sales:     listSales, getSale, getSaleDetails, getSaleReferences, issueSales, getSalePdf, getSaleXml
//   Purchases: listPurchases, getPurchase, getPurchaseDetails, getPurchaseReferences
//   Expenses:  listExpenses, getExpense
//   Incomes:   listIncomes
// Retry con backoff para 429/5xx
// Logging de requests a BigQuery (no-blocking, como email-log)
```

**1.2 Tipos (`src/lib/nubox/types.ts`)**

```typescript
// Sales
// NuboxSale, NuboxSaleDetail, NuboxClient, NuboxIssuanceRequest
// NuboxIssuanceResponse (207 multi-status)
// NuboxEmissionStatus, NuboxDocumentType

// Purchases
// NuboxPurchase, NuboxPurchaseDetail, NuboxSupplier
// NuboxDocumentStatus (Aceptado, Reclamado, etc.)
// NuboxPurchaseType, NuboxDataCl (IVA desglose)

// Expenses & Incomes
// NuboxExpense (bank, paymentMethod, supplier, amount, date)
// NuboxIncome (cobro bancario)

// Mappers
// GreenhouseIncome → NuboxIssuancePayload
// NuboxPurchase → GreenhouseExpense
// NuboxExpense → GreenhouseBankStatementRow
```

**1.3 Env vars en Vercel**

```
NUBOX_API_BASE_URL=https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1
NUBOX_BEARER_TOKEN=NP_SECRET_PROD_...
NUBOX_X_API_KEY=NP_KEY_PROD_...
```

### Fase 2 — Schema y almacenamiento

**2.1 Extender `greenhouse_finance.income`**

Nuevas columnas:
```sql
ALTER TABLE greenhouse_finance.income ADD COLUMN IF NOT EXISTS nubox_document_id BIGINT;
ALTER TABLE greenhouse_finance.income ADD COLUMN IF NOT EXISTS nubox_sii_track_id BIGINT;
ALTER TABLE greenhouse_finance.income ADD COLUMN IF NOT EXISTS nubox_emission_status TEXT;
ALTER TABLE greenhouse_finance.income ADD COLUMN IF NOT EXISTS dte_type_code TEXT;
ALTER TABLE greenhouse_finance.income ADD COLUMN IF NOT EXISTS dte_folio TEXT;
ALTER TABLE greenhouse_finance.income ADD COLUMN IF NOT EXISTS nubox_emitted_at TIMESTAMPTZ;
ALTER TABLE greenhouse_finance.income ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMPTZ;
```

**2.2 Extender `greenhouse_finance.expenses`**

Nuevas columnas:
```sql
ALTER TABLE greenhouse_finance.expenses ADD COLUMN IF NOT EXISTS nubox_purchase_id BIGINT;
ALTER TABLE greenhouse_finance.expenses ADD COLUMN IF NOT EXISTS nubox_document_status TEXT;
ALTER TABLE greenhouse_finance.expenses ADD COLUMN IF NOT EXISTS nubox_supplier_rut TEXT;
ALTER TABLE greenhouse_finance.expenses ADD COLUMN IF NOT EXISTS nubox_supplier_name TEXT;
ALTER TABLE greenhouse_finance.expenses ADD COLUMN IF NOT EXISTS nubox_origin TEXT;
ALTER TABLE greenhouse_finance.expenses ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMPTZ;
```

**2.3 Tabla de log de emisión (`greenhouse_finance.nubox_emission_log`)**

```sql
CREATE TABLE greenhouse_finance.nubox_emission_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id TEXT NOT NULL REFERENCES greenhouse_finance.income(income_id),
  idempotence_id UUID NOT NULL,
  request_payload JSONB NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  nubox_document_id BIGINT,
  emission_status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**2.4 Tabla de sync log (`greenhouse_finance.nubox_sync_log`)**

```sql
CREATE TABLE greenhouse_finance.nubox_sync_log (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('sales', 'purchases', 'expenses', 'incomes')),
  period TEXT NOT NULL,
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_orphaned INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);
```

### Fase 3 — API routes de emisión

**3.1 `POST /api/finance/income/[id]/emit-dte`**

- Validar que el income existe y tiene client con `tax_id` (RUT)
- Validar que no se haya emitido ya (`nubox_document_id IS NULL`)
- Construir payload de emisión mapeando:
  - `organization.tax_id` → `client.identification.value`
  - `organization.organization_name` → `client.tradeName`
  - `client_profile.billing_address` → `client.address`
  - `income.line_items` → `details[]`
  - `income.due_date` → `dueDate`
- Generar `x-idempotence-id` (UUID v4)
- POST a `/v1/sales/issuance`
- Parsear respuesta 207: extraer `nubox_document_id`, `trackId`, status
- Actualizar `income` con campos de Nubox
- Insertar log en `nubox_emission_log`
- Retornar resultado

**3.2 `GET /api/finance/income/[id]/dte-status`**

- Consultar `GET /v1/sales/{nubox_document_id}` para estado actual
- Actualizar `nubox_emission_status` si cambió
- Retornar estado

**3.3 `GET /api/finance/income/[id]/dte-pdf`**

- Proxy a `GET /v1/sales/{nubox_document_id}/pdf?template=TEMPLATE_A4`
- Stream response como `application/pdf`

**3.4 `GET /api/finance/income/[id]/dte-xml`**

- Proxy a `GET /v1/sales/{nubox_document_id}/xml`
- Stream response como `application/xml`

### Fase 4 — Sync de ventas (Nubox sales → Greenhouse income)

**4.1 `POST /api/finance/nubox/sync-sales` (cron o manual)**

- Paginar `GET /v1/sales?period=YYYY-MM` del mes actual y anterior
- Para cada documento:
  - Buscar por `nubox_document_id` en `income` — si existe, actualizar estado
  - Si no existe, buscar organización por RUT (`client.identification.value`)
  - Si organización encontrada, crear `income` con `origin: 'nubox_sync'`
  - Si no, loguear como huérfano para revisión manual
- Marcar `nubox_last_synced_at`
- Insertar registro en `nubox_sync_log`

### Fase 5 — Sync de compras (Nubox purchases → Greenhouse expenses)

**5.1 `POST /api/finance/nubox/sync-purchases` (cron o manual)**

- Paginar `GET /v1/purchases?period=YYYY-MM` del mes actual y anterior
- Para cada factura de proveedor:
  - Buscar por `nubox_purchase_id` en `expenses` — si existe, actualizar estado
  - Si no existe:
    - Buscar proveedor en `fin_suppliers` por RUT (`supplier.identification.value`)
    - Si no existe el proveedor, crear entrada en `fin_suppliers` con datos de Nubox (auto-provisioning)
    - Crear `expense` tipo `supplier` con:
      - `nubox_purchase_id`, `nubox_supplier_rut`, `nubox_supplier_name`
      - `document_number` = folio del proveedor
      - `document_date` = `emissionDate`
      - `due_date` = `dueDate`
      - `subtotal` = `totalNetAmount`
      - `tax_amount` = `totalTaxVatAmount`
      - `total_amount` = `totalAmount`
      - `nubox_origin` = `origin.name` (ej: "Integración SII")
      - `nubox_document_status` = `documentStatus.name`
- Insertar registro en `nubox_sync_log`

**5.2 Enriquecimiento con detalles**

- Para cada purchase importado, opcionalmente fetch `GET /v1/purchases/{id}/details`
- Almacenar líneas de detalle como metadata JSON en el expense
- Útil para asignación de costos (qué se compró, a qué proyecto/cliente atribuir)

### Fase 6 — Sync de pagos (Nubox expenses/incomes → reconciliación)

**6.1 `POST /api/finance/nubox/sync-payments` (cron o manual)**

- Paginar `GET /v1/expenses?period=YYYY-MM` (egresos bancarios)
- Para cada egreso:
  - Tiene link `document` → purchase vinculado
  - Puede usarse para:
    - Marcar el expense correspondiente como `paid`
    - Crear `bank_statement_row` para reconciliación automática
    - Datos clave: banco, método de pago, fecha, monto, proveedor
- Paginar `GET /v1/incomes?period=YYYY-MM` (cobros bancarios)
- Para cada ingreso:
  - Vincular a `income` por monto + cliente + fecha
  - Registrar como `income_payment` o `bank_statement_row`
- Insertar registro en `nubox_sync_log`

### Fase 7 — Cron unificado

**7.1 `POST /api/finance/nubox/sync` (orquestador)**

- Ejecuta sync-sales, sync-purchases, sync-payments en secuencia
- Protegido por `CRON_SECRET`
- Retry individual por fase (si purchases falla, no bloquea sales)

**7.2 Endpoint en `vercel.json` (cron diario)**

```json
{
  "path": "/api/finance/nubox/sync",
  "schedule": "0 8 * * *"
}
```

### Fase 8 — UI

**8.1 Botón "Emitir DTE" en vista de detalle de factura**

En `/finance/income/[id]`:
- Chip de estado DTE junto al estado de pago
- Botón "Emitir Factura Electrónica" (visible si `nubox_document_id IS NULL`)
- Dialog de confirmación con preview del payload
- Indicador de progreso durante emisión
- Resultado: éxito con folio SII o error con detalle

**8.2 Acciones post-emisión**

- Botón "Descargar PDF" → `/api/finance/income/[id]/dte-pdf`
- Botón "Descargar XML" → `/api/finance/income/[id]/dte-xml`
- Botón "Actualizar Estado" → `/api/finance/income/[id]/dte-status`
- Badge de estado: Emitido (verde), Pendiente SII (amarillo), Rechazado (rojo), Anulado (gris)

**8.3 Columna DTE en lista de ingresos**

En `/finance/income`:
- Nueva columna "DTE" con:
  - `—` si no emitido
  - `FAC-EL #94` si emitido (tipo + folio)
  - Color por estado de emisión

**8.4 Indicadores de sync en lista de gastos**

En `/finance/expenses`:
- Badge "Nubox" en expenses importados desde purchases
- Columna "Proveedor (RUT)" con link al proveedor en Greenhouse
- Estado del documento: Aceptado (verde), Reclamado (rojo)
- Indicador de pago: vinculado a expense de Nubox o pendiente

**8.5 Panel de sync status**

En `/finance` (dashboard) o como sección dedicada:
- Último sync: fecha/hora
- Resumen: X ventas, Y compras, Z pagos sincronizados
- Alertas: documentos huérfanos, errores de sync
- Botón "Sincronizar ahora" (trigger manual)

**8.6 Vista de emisión masiva (fase futura)**

- Selección múltiple de ingresos pendientes de emisión
- Emisión batch (hasta 50 por request de Nubox)
- Progreso individual por documento

## Mapeo de datos: Greenhouse → Nubox

```
organization.organization_name    → client.tradeName
organization.tax_id               → client.identification.value
organization.industry             → client.mainActivity
client_profile.billing_address    → client.address
client_profile.finance_contacts   → client.email (primer contacto)

income.invoice_date               → (fecha de emisión)
income.due_date                   → dueDate
income.payment_terms              → paymentForm.id (1=contado, 2=crédito)
income.subtotal                   → calculado desde details
income.tax_rate                   → details[].taxes[].rate (19% IVA)
income.line_items                 → details[] (description, quantity, price)

dte_type_code (usuario elige)     → type.legalCode ("33", "34", "61", etc.)
```

## Mapeo inverso: Nubox sales → Greenhouse income (sync)

```
nubox.id                          → income.nubox_document_id
nubox.number                      → income.dte_folio
nubox.type.legalCode              → income.dte_type_code
nubox.dataCl.trackId              → income.nubox_sii_track_id
nubox.emissionStatus.name         → income.nubox_emission_status
nubox.emissionDate                → income.nubox_emitted_at
nubox.totalNetAmount              → income.subtotal
nubox.totalTaxVatAmount           → income.tax_amount
nubox.totalAmount                 → income.total_amount
nubox.client.identification.value → organizations.tax_id (lookup)
nubox.client.tradeName            → income.client_name (fallback)
nubox.dueDate                     → income.due_date
nubox.paymentForm.id              → income metadata
```

## Mapeo: Nubox purchases → Greenhouse expenses (sync)

```
purchase.id                              → expenses.nubox_purchase_id
purchase.number                          → expenses.document_number (folio proveedor)
purchase.type.legalCode                  → expenses.dte_type_code (nuevo o metadata)
purchase.totalNetAmount                  → expenses.subtotal
purchase.totalTaxVatAmount               → expenses.tax_amount
purchase.totalAmount                     → expenses.total_amount
purchase.emissionDate                    → expenses.document_date
purchase.dueDate                         → expenses.due_date
purchase.supplier.identification.value   → expenses.nubox_supplier_rut → fin_suppliers.tax_id (lookup/create)
purchase.supplier.tradeName              → expenses.supplier_name / fin_suppliers.trade_name
purchase.documentStatus.name             → expenses.nubox_document_status
purchase.origin.name                     → expenses.nubox_origin
purchase.balance                         → (saldo pendiente — si balance=0, está pagado)
purchase.dataCl.receiptAt                → (fecha de acuse de recibo SII)
purchase.dataCl.vatUnrecoverableAmount   → (IVA no recuperable — metadata tributaria)
```

## Mapeo: Nubox expenses → Greenhouse reconciliation (sync)

```
expense.id                               → bank_statement_rows.reference (o metadata)
expense.folio                            → bank_statement_rows.reference
expense.bank.description                 → (match con fin_accounts por nombre de banco)
expense.paymentMethod.description        → bank_statement_rows metadata
expense.supplier.identification.value    → (vincular a expense por supplier RUT)
expense.totalAmount                      → bank_statement_rows.amount (negativo = egreso)
expense.paymentDate                      → bank_statement_rows.transaction_date
expense.links.document.href              → (extraer purchase_id para vincular expense ↔ payment)
```

## Dependencias

- `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN`, `NUBOX_X_API_KEY` en Vercel env vars
- Organizaciones con `tax_id` (RUT) poblado — requerido para emisión
- `fin_client_profiles` con `billing_address` — requerido para DTE válido
- Finance module operativo (Postgres-first, Fase 3 de dual-store cutover)

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| SII caído al emitir | Estado "Esperando SII" + reintento manual, no bloquea income |
| Documento rechazado por SII | Log detallado, estado "Rechazado", usuario corrige y reintenta |
| Duplicación de emisión | `x-idempotence-id` por request + check `nubox_document_id IS NOT NULL` |
| RUT incorrecto | Validación de formato RUT chileno antes de emitir |
| Org sin tax_id | Botón deshabilitado + tooltip explicando que falta RUT |
| Rate limiting de Nubox | Backoff exponencial + cola de emisión para batch |
| Tokens expirados/rotados | Health check en `/api/finance/nubox/sync`, alerta si 401/403 |

## Criterios de aceptación

### Fase 1-2 (infraestructura + schema)
- [ ] Cliente Nubox con retry y logging (sales, purchases, expenses, incomes)
- [ ] Tipos TypeScript completos para los 4 dominios
- [ ] Columnas DTE en `greenhouse_finance.income`
- [ ] Columnas Nubox en `greenhouse_finance.expenses`
- [ ] Tablas `nubox_emission_log` y `nubox_sync_log` creadas
- [ ] Env vars en Vercel

### Fase 3 (emisión de ventas)
- [ ] `POST /api/finance/income/[id]/emit-dte` emite factura y almacena resultado
- [ ] `GET /api/finance/income/[id]/dte-status` actualiza estado desde Nubox
- [ ] `GET /api/finance/income/[id]/dte-pdf` descarga PDF
- [ ] `GET /api/finance/income/[id]/dte-xml` descarga XML
- [ ] Idempotencia verificada (reenviar no duplica)
- [ ] Errores de Nubox se loguean y se muestran al usuario

### Fase 4 (sync ventas)
- [ ] Sync de ventas de Nubox → income
- [ ] Documentos nuevos se crean con `origin: nubox_sync`
- [ ] Documentos existentes se actualizan (estado, folio)
- [ ] Huérfanos se loguean sin romper el sync

### Fase 5 (sync compras)
- [ ] Sync de purchases → expenses (tipo supplier)
- [ ] Auto-provisioning de proveedores en `fin_suppliers` si no existen
- [ ] Detalles de compra almacenados como metadata
- [ ] Balance tracking (pagado vs pendiente)

### Fase 6 (sync pagos)
- [ ] Sync de expenses → bank_statement_rows o payment status
- [ ] Sync de incomes → income_payments
- [ ] Vinculación automática expense ↔ purchase via link `document`

### Fase 7 (cron orquestador)
- [ ] `/api/finance/nubox/sync` ejecuta las 3 fases en secuencia
- [ ] Protegido por `CRON_SECRET`
- [ ] Cron diario configurado en `vercel.json`
- [ ] `nubox_sync_log` registra cada ejecución

### Fase 8 (UI)
- [ ] Botón "Emitir DTE" en detalle de factura
- [ ] Dialog de confirmación con preview
- [ ] Acciones post-emisión (PDF, XML, estado)
- [ ] Columna DTE en lista de ingresos con badges de estado
- [ ] Badge "Nubox" en expenses importados
- [ ] Panel de sync status con trigger manual

## Archivos clave existentes

- `src/lib/finance/postgres-store-slice2.ts` — store de income (agregar campos DTE)
- `src/app/api/finance/income/[id]/route.ts` — detalle de income (agregar subrutas DTE)
- `src/views/greenhouse/finance/income/` — vistas de income (agregar UI de DTE)
- `scripts/setup-postgres-finance-slice2.sql` — DDL base (agregar ALTER)
- `src/lib/nubox/` — **nuevo**: cliente API, tipos, mappers

## Script de discovery

`scripts/nubox-extractor.py` — script Python para probar credenciales y explorar endpoints. Verificado 2026-03-19.
