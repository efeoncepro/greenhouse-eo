# TASK-281 — Payment Instruments Registry, FX Tracking & Provider Logos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado — pendiente merge a produccion`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-281-payment-instruments`
- GitHub Issue: `TBD`

## Summary

Evolucionar `greenhouse_finance.accounts` de "cuentas bancarias" a un **registro enterprise de instrumentos de pago** que cubra bancos, tarjetas de credito, fintechs (PayPal, Wise, Deel, MercadoPago) y procesadores de nomina (Previred). Agregar **tracking de tipo de cambio al momento del pago** en `income_payments` y `expense_payments` para capturar ganancia/perdida cambiaria real (FX gain/loss). Incluir **logos SVG reales** de bancos chilenos, redes de tarjetas y fintechs en toda la superficie financiera. Administracion desde Admin Center con CRUD completo.

## Why This Task Exists

Efeonce opera en CLP y USD tanto en cobros como en pagos. Hoy:

1. **Instrumentos de pago limitados a bancos**: la tabla `accounts` solo modela cuentas bancarias. PayPal y Wise estan metidos como `account_type` sin metadata propia. Deel, Stripe, MercadoPago, tarjetas de credito corporativas no tienen como registrarse.

2. **FX gain/loss invisible**: cuando se factura en USD a $900/USD y se cobra a $920/USD, la ganancia cambiaria de $20/USD se pierde porque el payment usa el tipo de cambio del documento, no el del dia del cobro. Lo mismo en pagos.

3. **Sin identidad visual**: los dropdowns de instrumento de pago son texto plano. Un logo de BCI, Mastercard o Deel da contexto inmediato y confianza profesional.

4. **Sin administracion centralizada**: no hay surface en Admin Center para gestionar instrumentos de pago. Se crean desde un drawer en Finance sin governance.

## Goal

- Registro de instrumentos de pago con categorias: cuenta bancaria, tarjeta de credito, fintech/wallet, plataforma de pagos, caja/efectivo, procesador de nomina
- Admin Center CRUD con lista, detalle y formulario por categoria
- Tracking de FX al momento del pago con calculo automatico de ganancia/perdida cambiaria
- Posicion de caja multi-moneda (saldo por instrumento en moneda nativa + equivalente CLP)
- Logos SVG de bancos chilenos, redes de tarjetas (Visa, Mastercard, Amex) y fintechs en toda la UI financiera
- Selector de instrumento de pago integrado en drawers de cobro, pago, ventas y compras

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- Evolucion de `accounts` table — NO crear tabla nueva. Agregar columnas, expandir constraints.
- `payment_account_id` FK en `income_payments`, `expense_payments` y `expenses` ya existe — cablear validacion.
- Tipos de cambio se resuelven desde `greenhouse_finance.exchange_rates` via `resolveExchangeRateToClp()` en `src/lib/finance/shared.ts`.
- Logos SVG se almacenan en `public/images/logos/payment/` — no CDN externo, no base64 inline.
- Admin Center sigue patron de `AdminAccountsView.tsx` (list + detail con react-table).
- Nunca almacenar API keys, tokens ni secrets en la base de datos.

## Normative Docs

- `docs/tasks/in-progress/TASK-280-finance-cash-modules-ingresos-egresos.md` — modulos de caja (prerequisito)
- `docs/documentation/finance/modulos-caja-cobros-pagos.md` — documentacion funcional de caja

## Dependencies & Impact

### Depends on

- `TASK-280` — modulos de caja (completado: expense_payments, cash-in, cash-out, cash-position)
- `greenhouse_finance.accounts` — tabla existente a evolucionar
- `greenhouse_finance.income_payments` — agregar columnas FX
- `greenhouse_finance.expense_payments` — agregar columnas FX
- `greenhouse_finance.exchange_rates` — fuente de tipos de cambio diarios
- `src/lib/finance/shared.ts` — `resolveExchangeRateToClp()` existente
- `src/views/greenhouse/admin/accounts/AdminAccountsView.tsx` — patron Admin Center

### Blocks / Impacts

- `TASK-280` cash views — posicion de caja se enriquece con multi-moneda
- Drawers de cobro/pago (RegisterCashInDrawer, RegisterCashOutDrawer) — agregar selector de instrumento
- CreateIncomeDrawer / CreateExpenseDrawer — agregar selector de instrumento
- IncomeDetailView / ExpenseDetailView — mostrar logo del instrumento en pagos
- P&L dashboard — agregar KPI de resultado cambiario
- `TASK-245` Finance Signal Engine — puede detectar anomalias de FX

### Files owned

- `docs/tasks/to-do/TASK-281-payment-instruments-registry-fx-tracking.md`
- `src/app/(dashboard)/admin/payment-instruments/` (nuevo)
- `src/views/greenhouse/admin/PaymentInstrumentsListView.tsx` (nuevo)
- `src/views/greenhouse/admin/PaymentInstrumentDetailView.tsx` (nuevo)
- `src/views/greenhouse/finance/drawers/CreatePaymentInstrumentDrawer.tsx` (nuevo)
- `src/components/greenhouse/PaymentInstrumentChip.tsx` (nuevo — logo + nombre)
- `public/images/logos/payment/` (nuevo — SVGs)
- `src/config/payment-instruments.ts` (nuevo — catalogo de proveedores + logos)
- migraciones para evolucion de accounts + columnas FX en payment tables

## Current Repo State

### Already exists

- `greenhouse_finance.accounts` — tabla con: account_id, account_name, bank_name, account_number, currency, account_type (checking/savings/paypal/wise/other), is_active, opening_balance
- `ACCOUNT_TYPES` enum en `src/lib/finance/contracts.ts`: checking, savings, paypal, wise, other
- `PAYMENT_METHODS` enum: transfer, credit_card, paypal, wise, check, cash, other
- `PAYMENT_PROVIDERS` enum en `expense-taxonomy.ts`: bank, previred, stripe, webpay, paypal, mercadopago, wise, other
- `PAYMENT_RAILS` enum: bank_transfer, card, gateway, wallet, cash, check, payroll_file, previred, other
- `payment_account_id` FK en income_payments, expense_payments, expenses — wiring de schema existe pero sin validacion
- `CreateAccountDrawer.tsx` — drawer basico para crear cuentas bancarias
- Admin Center patron probado en `AdminAccountsView.tsx` (631 LOC)

**Infraestructura FX existente (critica — reutilizar, no recrear):**

- `greenhouse_finance.exchange_rates` — tabla con USD/CLP diario, ambas direcciones (USD→CLP + CLP→USD), auto-synced
- `greenhouse_finance.economic_indicators` — USD_CLP, UF, UTM, IPC, IMM desde Mindicador
- `src/lib/finance/exchange-rates.ts` — capa completa de resolucion FX:
  - `fetchMindicadorUsdToClp(rateDate?)` — dolar observado del Banco Central via `mindicador.cl/api/dolar`, con lookback de 7 dias para feriados/fines de semana
  - `fetchOpenExchangeRateUsdToClp()` — fallback via `open.er-api.com`
  - `fetchUsdToClpFromProviders(rateDate?)` — orquesta Mindicador primero, Open ER como fallback
  - `syncDailyUsdClpExchangeRate(date?)` — fetch + persist dual-store (Postgres + BigQuery)
  - `getLatestStoredExchangeRatePair({ from, to })` — lee ultimo rate persistido (Postgres-first)
  - `buildUsdClpRatePairs({ usdToClp, rateDate, source })` — genera par USD→CLP + CLP→USD
- `src/lib/finance/shared.ts` → `resolveExchangeRateToClp({ currency, requestedRate })` — resolucion canonica: CLP=1, rate manual si se provee, sino ultimo rate persistido, sino error 409
- `GET /api/finance/exchange-rates/latest` — devuelve ultimo tipo de cambio con auto-sync si no hay rate
- `POST /api/finance/exchange-rates/sync` — cron de sync diario
- `GET /api/finance/economic-indicators/latest` — USD_CLP, UF, UTM, IPC del dia
- Timezone canonica: `America/Santiago` para determinar "hoy"
- Rate sources: `mindicador` (primario, dolar observado del Banco Central de Chile), `open-er-api` (fallback)

### Gap

- `accounts` no tiene columnas para categoria, proveedor, identificador, limites, responsable, routing
- No hay concepto de "instrumento de pago" como entidad de primer nivel con categorias ricas
- income_payments y expense_payments no capturan tipo de cambio del momento del pago — usan el rate del documento (factura), no el del dia del cobro/pago
- No se calcula ganancia/perdida cambiaria (FX gain/loss) a pesar de operar en CLP y USD
- La infra FX existe pero no se conecta al momento del pago: `resolveExchangeRateToClp()` resuelve el rate, pero `recordPayment()` y `recordExpensePayment()` no lo llaman
- No hay logos de bancos ni fintechs en la UI
- No hay surface de admin para gestionar instrumentos
- Drawers de cobro/pago no tienen selector de instrumento
- Posicion de caja no muestra saldos por moneda nativa
- Los drawers de registro de pago no muestran el dolar observado del dia como referencia

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Evolucion de accounts + FX en payment tables

**Migracion 1: Evolucionar `accounts` a instrumentos de pago**

Columnas nuevas en `greenhouse_finance.accounts`:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `instrument_category` | TEXT NOT NULL DEFAULT 'bank_account' | bank_account, credit_card, fintech, payment_platform, cash, payroll_processor |
| `provider_slug` | TEXT | Slug canonico del proveedor: bci, banco-chile, banco-estado, mastercard, visa, paypal, wise, deel, stripe, mercadopago, previred |
| `provider_identifier` | TEXT | Email, merchant ID, workspace ID (sin secrets) |
| `card_last_four` | TEXT | Solo para tarjetas de credito |
| `card_network` | TEXT | visa, mastercard, amex, diners — solo para tarjetas |
| `credit_limit` | NUMERIC(14,2) | Solo para tarjetas |
| `responsible_user_id` | TEXT | Quien administra este instrumento |
| `default_for` | TEXT[] | Array de usos: supplier_payment, payroll, tax, client_collection, etc. |
| `display_order` | INT DEFAULT 0 | Orden en dropdowns |
| `metadata_json` | JSONB DEFAULT '{}' | Campos extensibles por proveedor |

Expandir constraint de `account_type`:
- Renombrar a CHECK que incluya: checking, savings, credit_card, paypal, wise, deel, stripe, mercadopago, previred, cash, other

**Migracion 2: FX tracking en payment tables**

Columnas nuevas en `greenhouse_finance.income_payments`:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `exchange_rate_at_payment` | NUMERIC(14,6) | Tipo de cambio USD/CLP del dia del pago |
| `amount_clp` | NUMERIC(14,2) | Monto real en CLP (amount * exchange_rate_at_payment) |
| `fx_gain_loss_clp` | NUMERIC(14,2) | Diferencia vs tipo de cambio del documento |

Mismas columnas en `greenhouse_finance.expense_payments`.

**Backend: conectar infra FX existente a `recordPayment()` y `recordExpensePayment()`**

La infraestructura de tipos de cambio ya esta construida (`exchange-rates.ts`). Hoy `resolveExchangeRateToClp()` se usa al **crear** documentos (income/expenses), pero NO al **registrar pagos**. El fix es conectar esa misma funcion al flujo de registro de pago:

- Al registrar pago en moneda distinta a CLP:
  1. Llamar `resolveExchangeRateToClp({ currency })` — resuelve el dolar observado del dia via Mindicador (ya persistido por cron diario en `exchange_rates`)
  2. Calcular `amount_clp = amount * exchange_rate_at_payment`
  3. Leer `document.exchange_rate_to_clp` del income/expense vinculado (rate al momento de facturacion)
  4. Calcular `fx_gain_loss_clp = amount_clp - (amount * document.exchange_rate_to_clp)`
- Si moneda es CLP: exchange_rate = 1, amount_clp = amount, fx_gain_loss = 0
- Validar payment_account_id contra instrumentos activos
- Si el rate del dia no esta disponible (feriado, error de sync), usar `fetchUsdToClpFromProviders()` como fallback live — la funcion ya orquesta Mindicador + Open ER con lookback de 7 dias

**Nota de re-uso**: NO crear nueva logica de resolucion de FX. Reutilizar `resolveExchangeRateToClp()` de `src/lib/finance/shared.ts` que ya maneja: CLP=1, rate manual override, rate persistido en DB, fallback a providers, error 409 si no hay rate.

### Slice 2 — Catalogo de proveedores + logos SVG

**Archivo: `src/config/payment-instruments.ts`**

Catalogo estatico con metadata de cada proveedor:

```typescript
export const PAYMENT_PROVIDERS_CATALOG = {
  // Bancos chilenos
  bci: { name: 'BCI', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/bci.svg' },
  'banco-chile': { name: 'Banco de Chile', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/banco-chile.svg' },
  'banco-estado': { name: 'BancoEstado', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/banco-estado.svg' },
  santander: { name: 'Santander', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/santander.svg' },
  scotiabank: { name: 'Scotiabank', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/scotiabank.svg' },
  itau: { name: 'Itau', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/itau.svg' },
  bice: { name: 'BICE', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/bice.svg' },
  security: { name: 'Security', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/security.svg' },
  falabella: { name: 'Banco Falabella', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/falabella.svg' },
  ripley: { name: 'Banco Ripley', category: 'bank_account', country: 'CL', logo: '/images/logos/payment/ripley.svg' },

  // Redes de tarjetas
  visa: { name: 'Visa', category: 'credit_card', logo: '/images/logos/payment/visa.svg' },
  mastercard: { name: 'Mastercard', category: 'credit_card', logo: '/images/logos/payment/mastercard.svg' },
  amex: { name: 'American Express', category: 'credit_card', logo: '/images/logos/payment/amex.svg' },

  // Fintechs
  paypal: { name: 'PayPal', category: 'fintech', logo: '/images/logos/payment/paypal.svg' },
  wise: { name: 'Wise', category: 'fintech', logo: '/images/logos/payment/wise.svg' },
  mercadopago: { name: 'MercadoPago', category: 'fintech', logo: '/images/logos/payment/mercadopago.svg' },

  // Plataformas de pago
  deel: { name: 'Deel', category: 'payment_platform', logo: '/images/logos/payment/deel.svg' },
  stripe: { name: 'Stripe', category: 'payment_platform', logo: '/images/logos/payment/stripe.svg' },

  // Procesadores nomina
  previred: { name: 'Previred', category: 'payroll_processor', logo: '/images/logos/payment/previred.svg' },
} as const
```

**Directorio: `public/images/logos/payment/`**

- Obtener logos SVG oficiales de cada proveedor via web scraping o descarga directa
- Normalizar: mismo viewBox (24x24 o 32x32), sin texto excesivo, legibles a 20px
- Fallback: chip con iniciales del proveedor si logo no existe

**Componente: `src/components/greenhouse/PaymentInstrumentChip.tsx`**

- Props: `providerSlug`, `name`, `size` (sm/md)
- Renderiza: logo SVG (via next/image) + nombre del instrumento
- Fallback si no hay logo: Avatar con iniciales

### Slice 3 — Admin Center: Payment Instruments

**Ruta: `/admin/payment-instruments`**

**Vista lista (`PaymentInstrumentsListView.tsx`):**
- KPIs: Total instrumentos, Activos, Por categoria (bancos, tarjetas, fintech)
- Tabla react-table: Logo + Nombre, Categoria (chip), Proveedor, Moneda, Saldo, Default para, Estado
- Filtro por categoria
- Boton "Agregar instrumento"

**Drawer de creacion/edicion (`CreatePaymentInstrumentDrawer.tsx`):**
- Step 1: Seleccionar categoria (bank_account, credit_card, fintech, payment_platform, cash, payroll_processor)
- Step 2: Campos dinamicos segun categoria:
  - **Cuenta bancaria**: Banco (select con logos), Tipo (corriente/ahorro), Numero de cuenta, Moneda
  - **Tarjeta de credito**: Red (Visa/Mastercard/Amex con logos), Banco emisor, Ultimos 4 digitos, Limite de credito
  - **Fintech**: Proveedor (PayPal/Wise/MercadoPago con logos), Email o ID de cuenta, Moneda
  - **Plataforma de pagos**: Proveedor (Deel/Stripe con logos), Workspace/Merchant ID, Moneda
  - **Caja**: Nombre, Responsable, Tope
  - **Procesador nomina**: Proveedor (Previred), RUT empresa, Moneda
- Campos comunes: Nombre del instrumento, Saldo de apertura, Default para (multiselect), Notas

**Vista detalle (`PaymentInstrumentDetailView.tsx`):**
- Sidebar: logo grande, nombre, categoria, proveedor, metadata
- Contenido: ultimas transacciones vinculadas, estado de reconciliacion

### Slice 4 — Integracion en surfaces financieras

**Selector de instrumento en drawers:**
- `RegisterCashInDrawer` — agregar campo "Cuenta de destino" (select con logos de instrumentos activos filtrados por categoria bank_account/fintech)
- `RegisterCashOutDrawer` — agregar campo "Pagado desde" (select con logos)
- `CreateIncomeDrawer` — agregar campo "Cuenta de cobro esperada" (opcional)
- `CreateExpenseDrawer` — agregar campo "Medio de pago" (select con logos)

**Dolar observado del dia en drawers de pago (UX critica):**

Cuando el documento vinculado esta en USD, los drawers de cobro y pago deben mostrar:
- **Chip informativo**: "Dolar observado hoy: $XXX,XX" — obtenido de `GET /api/finance/exchange-rates/latest` al abrir el drawer
- **Rate del documento**: "TC de facturacion: $YYY,YY" — leido del documento seleccionado (`exchange_rate_to_clp`)
- **Delta visual**: si el rate de hoy es mayor al de facturacion → chip verde "Ganancia cambiaria estimada: +$ZZZ"; si es menor → chip rojo "Perdida cambiaria estimada: -$ZZZ"
- El calculo se muestra en tiempo real al ingresar el monto, ANTES de confirmar el pago
- Source: usar `GET /api/finance/exchange-rates/latest` (ya existe, auto-sync si no hay rate)
- El usuario puede override manual del TC si el pago se hizo a un rate distinto (ej. rate pactado con el banco)

Esto le da al usuario transparencia total sobre el impacto cambiario antes de registrar.

**Logos en vistas existentes:**
- `CashInListView` — columna "Cuenta" con PaymentInstrumentChip
- `CashOutListView` — columna "Desde" con PaymentInstrumentChip
- `IncomeListView` — si tiene payment_account_id, mostrar chip
- `ExpensesListView` — si tiene payment_account_id, mostrar chip
- `PaymentHistoryTable` — agregar columna con logo del instrumento
- `IncomeDetailView` / `ExpenseDetailView` — mostrar instrumento en cada pago del historial

### Slice 5 — Posicion de caja multi-moneda + resultado cambiario

**Actualizar `CashPositionView.tsx`:**
- Saldo por instrumento agrupado por moneda nativa (CLP y USD por separado)
- Conversion a CLP equivalente usando tipo de cambio del dia
- Tabla: Instrumento (logo + nombre) | Moneda | Saldo nativo | Equivalente CLP
- KPI nuevo: "Resultado cambiario" = SUM(fx_gain_loss_clp) del periodo (verde si positivo, rojo si negativo)
- Grafico 12 meses: barras en CLP + linea de FX gain/loss acumulado

**Actualizar `GET /api/finance/cash-position`:**
- Agregar query de FX gain/loss: `SUM(fx_gain_loss_clp)` desde income_payments + expense_payments
- Agrupar saldos por instrumento y moneda

## Out of Scope

- Integracion directa con APIs de Deel/Stripe/PayPal (eso es un modulo de integraciones, no de instrumentos)
- Almacenamiento de API keys, tokens o secrets en la base de datos
- Contabilidad formal (libro mayor, asientos contables, plan de cuentas)
- Conciliacion automatica multi-instrumento (la reconciliacion actual sigue operando igual)
- Logos de bancos fuera de Chile (solo bancos chilenos en scope)

## Detailed Spec

### Schema: evolucion de accounts

```sql
-- Nuevas columnas
ALTER TABLE greenhouse_finance.accounts
  ADD COLUMN IF NOT EXISTS instrument_category TEXT NOT NULL DEFAULT 'bank_account'
    CHECK (instrument_category IN ('bank_account', 'credit_card', 'fintech', 'payment_platform', 'cash', 'payroll_processor')),
  ADD COLUMN IF NOT EXISTS provider_slug TEXT,
  ADD COLUMN IF NOT EXISTS provider_identifier TEXT,
  ADD COLUMN IF NOT EXISTS card_last_four TEXT,
  ADD COLUMN IF NOT EXISTS card_network TEXT CHECK (card_network IN ('visa', 'mastercard', 'amex', 'diners')),
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS responsible_user_id TEXT,
  ADD COLUMN IF NOT EXISTS default_for TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}';

-- Backfill instrument_category para registros existentes
UPDATE greenhouse_finance.accounts
SET instrument_category = CASE
  WHEN account_type IN ('checking', 'savings') THEN 'bank_account'
  WHEN account_type = 'paypal' THEN 'fintech'
  WHEN account_type = 'wise' THEN 'fintech'
  ELSE 'bank_account'
END
WHERE instrument_category = 'bank_account' AND account_type NOT IN ('checking', 'savings');

-- Backfill provider_slug desde bank_name para bancos conocidos
UPDATE greenhouse_finance.accounts
SET provider_slug = CASE
  WHEN LOWER(bank_name) LIKE '%bci%' THEN 'bci'
  WHEN LOWER(bank_name) LIKE '%chile%' THEN 'banco-chile'
  WHEN LOWER(bank_name) LIKE '%estado%' THEN 'banco-estado'
  WHEN LOWER(bank_name) LIKE '%santander%' THEN 'santander'
  WHEN LOWER(bank_name) LIKE '%scotiabank%' THEN 'scotiabank'
  WHEN LOWER(bank_name) LIKE '%itau%' OR LOWER(bank_name) LIKE '%itaú%' THEN 'itau'
  WHEN LOWER(bank_name) LIKE '%bice%' THEN 'bice'
  WHEN LOWER(bank_name) LIKE '%security%' THEN 'security'
  WHEN LOWER(bank_name) LIKE '%falabella%' THEN 'falabella'
  WHEN LOWER(bank_name) LIKE '%ripley%' THEN 'ripley'
  ELSE NULL
END
WHERE provider_slug IS NULL AND instrument_category = 'bank_account';
```

### Schema: FX tracking en payment tables

```sql
-- income_payments
ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS exchange_rate_at_payment NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS amount_clp NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fx_gain_loss_clp NUMERIC(14,2);

-- expense_payments
ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS exchange_rate_at_payment NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS amount_clp NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fx_gain_loss_clp NUMERIC(14,2);
```

### FX gain/loss calculo

```
Al registrar pago de documento USD:
  1. rate_at_payment = resolveExchangeRateToClp('USD') → rate del dia
  2. amount_clp = payment.amount * rate_at_payment
  3. rate_at_document = document.exchange_rate_to_clp (rate del dia de facturacion)
  4. amount_clp_at_document_rate = payment.amount * rate_at_document
  5. fx_gain_loss_clp = amount_clp - amount_clp_at_document_rate

Ejemplo:
  Factura USD $10,000 emitida a CLP 900/USD → CLP $9,000,000
  Cobro USD $10,000 el dia que CLP 920/USD
  amount_clp = $10,000 * 920 = $9,200,000
  fx_gain_loss = $9,200,000 - $9,000,000 = +$200,000 (ganancia)
```

### Logo SVG sourcing strategy

1. **Redes de tarjetas** (Visa, Mastercard, Amex): logos oficiales disponibles en brand guidelines publicas
2. **Bancos chilenos**: obtener SVG de sitios web oficiales, limpiar y normalizar
3. **Fintechs** (PayPal, Wise, Deel, Stripe, MercadoPago): logos SVG de press kits oficiales
4. **Previred**: logo de sitio oficial
5. **Normalizacion**: todos los SVGs a viewBox consistente, colores originales, sin backgrounds, legibles a 20px altura
6. **Fallback**: si un logo no se puede obtener limpiamente, usar Avatar con iniciales del proveedor + color de categoria

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Tabla `accounts` evolucionada con instrument_category, provider_slug, y campos por tipo
- [x] income_payments y expense_payments tienen exchange_rate_at_payment, amount_clp, fx_gain_loss_clp
- [x] recordPayment() y recordExpensePayment() calculan FX gain/loss automaticamente para pagos USD
- [x] Admin Center `/admin/payment-instruments` con lista, drawer de creacion por categoria, y detalle
- [x] 20+ logos SVG de proveedores en `public/images/logos/payment/`
- [x] PaymentInstrumentChip componente con logo + nombre, fallback a iniciales
- [x] Drawers de cobro y pago incluyen selector de instrumento con logos
- [x] CreateIncomeDrawer y CreateExpenseDrawer incluyen selector de instrumento
- [x] CashInListView y CashOutListView muestran logo del instrumento en la tabla
- [x] PaymentHistoryTable muestra logo del instrumento por pago
- [x] CashPositionView muestra saldos por instrumento agrupados por moneda
- [x] KPI "Resultado cambiario" visible en CashPositionView
- [x] `pnpm build` y `pnpm lint` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validacion manual:
  - Crear instrumento de cada categoria desde Admin Center
  - Registrar cobro seleccionando instrumento → verificar logo en historial
  - Registrar pago USD → verificar que FX gain/loss se calcula
  - Verificar posicion de caja multi-moneda con saldos CLP y USD separados
  - Verificar logos visibles en cash-in, cash-out, ventas, compras

## Closing Protocol

- [x] Actualizar `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con schema de instrumentos y FX tracking
- [x] Actualizar `GREENHOUSE_EVENT_CATALOG_V1.md` si hay nuevos eventos
- [x] Actualizar `docs/documentation/finance/modulos-caja-cobros-pagos.md` con instrumentos y FX
- [ ] Actualizar `schema-snapshot-baseline.sql` con DDL evolucionado
- [ ] Regenerar `db.d.ts` post-migracion

## Follow-ups

- Integracion directa con APIs de bancos chilenos para importar movimientos automaticamente
- Integracion con Deel API para sincronizar pagos a contractors
- Conciliacion multi-instrumento (matchear extracto de cada cuenta con sus pagos)
- Alertas de FX: notificar cuando el tipo de cambio se mueve mas de X% vs promedio del mes
- Dashboard ejecutivo de exposicion cambiaria (cuanto se tiene en USD vs CLP)

## Open Questions

- Definir si Deel se clasifica como fintech o payment_platform (hoy propuesto como payment_platform porque es mas que un wallet — gestiona contratos y compliance)
- Definir si el resultado cambiario debe ser un outbox event que alimente projections (ej. para client_economics ajustado por FX)
- Definir si los logos deben soportar dark mode (variantes invertidas) o si los logos a color funcionan en ambos temas
