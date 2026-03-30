# TASK-163 — Finance Document Type Separation: Cotizaciones, Notas de Crédito/Débito

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P0` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Finance / Data Integrity / Nubox |
| Sequence | Independiente, afecta toda la capa financiera |

## Summary

Todos los documentos de Nubox (facturas, cotizaciones, notas de crédito, notas de débito) se almacenan como registros positivos en `greenhouse_finance.income`. Esto causa que los ingresos reportados sean **incorrectos**: cotizaciones inflan el ingreso (no son ventas), notas de crédito suman en vez de restar, y el P&L del portal no refleja la realidad contable.

Los campos `dte_type_code` e `income_type` ya se capturan correctamente en cada registro — el problema es que **nadie los usa** en queries, cálculos ni UI.

## Why This Task Exists

### Problema actual demostrado

```
Nubox sync → TODOS los documentos → greenhouse_finance.income

  Factura (DTE 33):         +$1,000,000 CLP → income   ← correcto
  Nota de Crédito (DTE 61): +$500,000 CLP   → income   ← INCORRECTO (debería restar)
  Nota de Débito (DTE 56):  +$200,000 CLP   → income   ← INCORRECTO (debería sumar al ingreso)
  Cotización (DTE 52):      +$300,000 CLP   → income   ← INCORRECTO (no es ingreso)

  Dashboard muestra: $2,000,000 de ingreso
  Realidad contable: $1,300,000 de ingreso ($1M factura + $200K débito + $100K ajuste crédito)
```

### Impacto en cascada

| Componente | Impacto | Severidad |
|------------|---------|-----------|
| Finance Dashboard KPIs | Income inflado | Crítico |
| P&L endpoint (`/api/finance/dashboard/pnl`) | Revenue incorrecto | Crítico |
| Ratio nómina/ingresos | Denominador inflado → ratio artificialmente bajo | Crítico |
| DSO (Days Sales Outstanding) | Receivables incluyen cotizaciones no cobradas | Alto |
| Client Economics snapshots | Margin distorsionado | Crítico |
| Operational P&L (TASK-069) | Materializa datos incorrectos | Crítico |
| Space Finance badges en Agency | Margin % incorrecto | Alto |
| People finance-impact | Revenue atribuido inflado | Alto |

### Clasificación de documentos SII Chile

| DTE Code | Nombre | Tratamiento correcto en Finance |
|----------|--------|-------------------------------|
| **33** | Factura Electrónica | **Ingreso** — suma al revenue |
| **34** | Factura No Afecta o Exenta | **Ingreso** — suma al revenue |
| **38** | Boleta Electrónica | **Ingreso** — suma al revenue |
| **39** | Boleta No Afecta o Exenta | **Ingreso** — suma al revenue |
| **41** | Boleta Exenta | **Ingreso** — suma al revenue |
| **110** | Factura de Exportación | **Ingreso** — suma al revenue |
| **61** | Nota de Crédito Electrónica | **Ajuste negativo** — resta del revenue |
| **56** | Nota de Débito Electrónica | **Ajuste positivo** — suma al revenue |
| **52** | Cotización | **No es ingreso** — tabla separada |

### Decisiones del Product Owner (definidas)

1. **Cotizaciones** → tabla separada `greenhouse_finance.quotes`. No son ingreso actual sino ingreso probable/futuro. Se excluyen de todos los cálculos de revenue.
2. **Notas de crédito** → restan del ingreso. Se mantienen en `income` como registros con signo negativo o con flag `is_credit_note = true`.
3. **Notas de débito** → suman al ingreso. Se mantienen en `income` como registros positivos (comportamiento actual es correcto para débito).

### Decisión pendiente sobre notas de crédito

Hay dos opciones para implementar la resta:

**Opción A — Registros con monto negativo:**
```sql
-- Nota de crédito se almacena con total_amount negativo
INSERT INTO income (income_id, total_amount, total_amount_clp, income_type, dte_type_code, ...)
VALUES ('INC-NC-001', -500000, -500000, 'credit_note', '61', ...)

-- Dashboard suma naturalmente: $1,000,000 + (-$500,000) = $500,000
```
Ventaja: todas las queries existentes funcionan sin cambios (SUM ya resta).
Desventaja: un monto negativo puede confundir en UI si no se formatea bien.

**Opción B — Flag `is_credit_note` con monto positivo:**
```sql
-- Nota de crédito con monto positivo pero flag
INSERT INTO income (income_id, total_amount, is_credit_note, income_type, dte_type_code, ...)
VALUES ('INC-NC-001', 500000, TRUE, 'credit_note', '61', ...)

-- Dashboard necesita ajustar:
-- SUM(CASE WHEN is_credit_note THEN -total_amount ELSE total_amount END)
```
Ventaja: el monto original del documento se preserva tal cual.
Desventaja: cada query de SUM necesita el CASE WHEN.

**Recomendación:** Opción A (monto negativo). Es el patrón contable estándar. Las queries existentes (`SUM(total_amount)`) automáticamente restan. La UI formatea con signo y color (rojo para negativos). Los documentos de referencia (DTE PDF, folio) mantienen el monto original en los campos de Nubox.

## Architecture Reference

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- SII Chile: Códigos de Tipo de Documento

## Dependencies & Impact

- **Depende de:**
  - Nubox sync pipeline (exists, TASK-006+ complete)
  - Finance Postgres schema (exists)
  - Finance PnL endpoint (exists)
- **Impacta a:**
  - TASK-069 (Operational P&L) — materializa datos corregidos
  - TASK-070 (Finance UI) — muestra datos correctos
  - TASK-071 (Cross-module consumers) — margin badges correctos
  - TASK-138 (Finance Intelligence) — DSO/DPO/ratio correctos
  - TASK-143 (Agency Economics) — P&L por Space correcto
  - Todas las surfaces que muestran revenue

## Scope

### Slice 1 — Quotes table + migration (~3h)

1. Crear tabla `greenhouse_finance.quotes`:

```sql
CREATE TABLE greenhouse_finance.quotes (
  quote_id TEXT PRIMARY KEY,
  client_id TEXT,
  organization_id TEXT,
  client_name TEXT,
  quote_number TEXT,
  quote_date DATE,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'CLP',
  subtotal NUMERIC,
  tax_rate NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  exchange_rate_to_clp NUMERIC,
  total_amount_clp NUMERIC,
  status TEXT DEFAULT 'draft',  -- draft, sent, accepted, rejected, expired, converted
  converted_to_income_id TEXT,  -- link to income when quote becomes invoice
  expiry_date DATE,
  nubox_document_id TEXT,
  nubox_sii_track_id TEXT,
  dte_type_code TEXT DEFAULT '52',
  dte_folio TEXT,
  nubox_last_synced_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

2. Migrar registros existentes de `income` donde `income_type = 'quote'` OR `dte_type_code = '52'`:
   - INSERT INTO quotes SELECT ... FROM income WHERE dte_type_code = '52'
   - DELETE FROM income WHERE dte_type_code = '52'

3. Actualizar sync pipeline para que DTE 52 vaya a `quotes` en vez de `income`

### Slice 2 — Credit note sign inversion (~2h)

1. Actualizar `sync-nubox-to-postgres.ts`:
   - Cuando `dte_type_code = '61'` (nota de crédito): guardar `total_amount` y `total_amount_clp` como **negativos**
   - Cuando `dte_type_code = '56'` (nota de débito): guardar como positivo (ya es correcto)

2. Migrar registros existentes:
   ```sql
   UPDATE greenhouse_finance.income
   SET total_amount = -ABS(total_amount),
       total_amount_clp = -ABS(total_amount_clp),
       subtotal = -ABS(subtotal),
       tax_amount = -ABS(tax_amount)
   WHERE dte_type_code = '61'
     AND total_amount > 0;
   ```

3. Agregar campo `referenced_income_id` a `income` para vincular nota de crédito con su factura original:
   ```sql
   ALTER TABLE greenhouse_finance.income
   ADD COLUMN IF NOT EXISTS referenced_income_id TEXT;
   ```

4. Verificar que `SUM(total_amount_clp)` en todas las queries ahora produce el resultado correcto automáticamente

### Slice 3 — Query and API fixes (~2h)

1. **Income summary** (`/api/finance/income/summary`):
   - Excluir `dte_type_code = '52'` (cotizaciones ya no estarán, pero por safety)
   - Verificar que notas de crédito negativas restan correctamente
   - No requiere CASE WHEN si se usa Opción A (montos negativos)

2. **Income list** (`/api/finance/income`):
   - Agregar filtro por `income_type` (query param `type=service_fee,credit_note,debit_note`)
   - Agregar filtro por `dte_type_code` (query param `dteCode=33,61`)
   - Retornar `income_type` y `dte_type_code` en el response

3. **PnL endpoint** (`/api/finance/dashboard/pnl`):
   - Verificar que `SUM(total_amount_clp)` ya resta notas de crédito (debería funcionar con Opción A)
   - Excluir cotizaciones (ya no estarán en income)

4. **Dashboard summary** (`/api/finance/dashboard/summary`):
   - Mismo tratamiento que PnL
   - Verificar DSO: receivables no deben incluir notas de crédito con saldo negativo

5. **Client economics** (`/api/finance/intelligence/client-economics`):
   - Verificar que revenue se calcula correctamente con notas de crédito negativas

### Slice 4 — UI: document type in Income list (~2h)

1. Agregar columna "Tipo" a la tabla de ingresos:
   - Chip coloreado:
     - `service_fee` (DTE 33/34/38/39) → `Factura` chip azul
     - `credit_note` (DTE 61) → `Nota de crédito` chip rojo
     - `debit_note` (DTE 56) → `Nota de débito` chip warning
   - Montos de notas de crédito en rojo con signo negativo

2. Agregar filtro por tipo de documento:
   - Dropdown: Todos / Facturas / Notas de crédito / Notas de débito

3. KPIs del listado:
   - "Ingreso neto" = SUM(all) — ya incluye negativos
   - "Notas de crédito" = SUM(WHERE credit_note) — mostrar como monto separado
   - "Facturas" = COUNT(WHERE service_fee)

### Slice 5 — Quotes module surface (~2h)

1. Crear página `/finance/quotes` (listado de cotizaciones)
2. API route: `GET /api/finance/quotes` (lee de `greenhouse_finance.quotes`)
3. Vista básica con tabla: quote_number, client_name, total_amount, status, quote_date, expiry_date
4. Status pipeline: draft → sent → accepted/rejected/expired
5. Acción "Convertir a factura" → crea income record y marca `converted_to_income_id`
6. Agregar al sidebar Finance: "Cotizaciones" entre Ingresos y Egresos

### Slice 6 — Outbox events + notifications (~1h)

1. Nuevos event types:
   - `finance.quote.created`
   - `finance.quote.converted`
   - `finance.credit_note.created`

2. Notification mapping:
   - `finance.credit_note.created` → "Nota de crédito registrada: {amount} para {client}" → Finance admins
   - `finance.quote.converted` → "Cotización convertida a factura: {client}" → Finance admins

### Slice 7 — Data migration validation + tests (~1.5h)

1. Script de validación pre/post migración:
   ```sql
   -- Pre: contar registros por tipo
   SELECT dte_type_code, income_type, COUNT(*), SUM(total_amount_clp)
   FROM greenhouse_finance.income
   GROUP BY dte_type_code, income_type;

   -- Post: verificar que income ya no tiene cotizaciones
   SELECT COUNT(*) FROM greenhouse_finance.income WHERE dte_type_code = '52';
   -- debe ser 0

   -- Post: verificar que notas de crédito tienen monto negativo
   SELECT COUNT(*) FROM greenhouse_finance.income
   WHERE dte_type_code = '61' AND total_amount > 0;
   -- debe ser 0
   ```

2. Tests:
   - Sync pipeline con DTE 52 → va a quotes, no a income
   - Sync pipeline con DTE 61 → income con monto negativo
   - Income summary con mix de facturas + notas de crédito → total correcto
   - PnL con notas de crédito → revenue neto correcto
   - Quote conversion → crea income + marca quote como converted

## Out of Scope

- Guías de despacho (DTE 50, 52) — no aplica para Efeonce
- Factura de compra (DTE 46) — se maneja como expense, no income
- Liquidación de factura (DTE 43) — no implementado en Nubox sync
- Multi-organization separation — todas las cotizaciones/facturas son de la misma entidad legal por ahora
- Conciliación automática nota de crédito ↔ factura original (mejora futura)

## Acceptance Criteria

- [ ] Tabla `greenhouse_finance.quotes` creada con schema completo
- [ ] Registros existentes con `dte_type_code = '52'` migrados de income a quotes
- [ ] Sync pipeline envía DTE 52 a quotes, no a income
- [ ] Notas de crédito (DTE 61) almacenadas con monto negativo en income
- [ ] Registros existentes de notas de crédito corregidos (monto negativo)
- [ ] `SUM(total_amount_clp)` en dashboard refleja ingreso neto correcto
- [ ] PnL endpoint calcula revenue neto correctamente
- [ ] Income list muestra tipo de documento con chip coloreado
- [ ] Income list tiene filtro por tipo de documento
- [ ] Notas de crédito se muestran en rojo con signo negativo
- [ ] `/finance/quotes` existe con listado básico y pipeline de status
- [ ] Sidebar Finance incluye "Cotizaciones"
- [ ] Outbox events emitidos para credit_note.created y quote.converted
- [ ] Script de validación pre/post migración ejecutado
- [ ] Tests unitarios para sync, queries y conversión
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/nubox/sync-nubox-to-postgres.ts` | Routing: DTE 52 → quotes, DTE 61 → monto negativo |
| `src/lib/nubox/types.ts` | No cambia (ya captura DTE code) |
| `src/lib/finance/postgres-store-slice2.ts` | Agregar `referenced_income_id`, quote CRUD |
| `src/app/api/finance/income/route.ts` | Agregar filtros por type/dteCode |
| `src/app/api/finance/income/summary/route.ts` | Verificar que SUM resta credit notes |
| `src/app/api/finance/dashboard/pnl/route.ts` | Verificar revenue neto |
| `src/app/api/finance/dashboard/summary/route.ts` | Verificar DSO excluye credit notes negativas |
| `src/app/api/finance/quotes/route.ts` | Nuevo — CRUD para cotizaciones |
| `src/app/(dashboard)/finance/quotes/page.tsx` | Nuevo — página de cotizaciones |
| `src/views/greenhouse/finance/IncomeListView.tsx` | Chips de tipo, filtro, montos rojos |
| `src/views/greenhouse/finance/QuotesListView.tsx` | Nuevo — vista de cotizaciones |
| `src/lib/sync/event-catalog.ts` | Nuevos event types: quote.created, credit_note.created |
| `src/lib/webhooks/consumers/notification-mapping.ts` | Mappings para credit note + quote |
| `scripts/migrate-quotes-from-income.sql` | Script de migración one-time |
