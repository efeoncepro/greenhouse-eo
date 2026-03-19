# CODEX TASK — Financial Module: Gestión Financiera para Greenhouse

## Estado del brief

Este documento queda como brief histórico de la implementación base de `Finance`.

Estado al `2026-03-14`:
- el route group `/finance` ya existe en runtime
- el guard dedicado, sidebar, tablas `fin_*` y la mayor parte de APIs core ya están implementadas
- los cierres operativos reales ya no deben trabajarse desde este documento greenfield

Brief vigente para continuar el módulo:
- `docs/tasks/to-do/CODEX_TASK_Financial_Module_v2.md`

## Resumen

Implementar el **módulo financiero** en el portal Greenhouse como espacio exclusivo para el equipo de finanzas y administración de Efeonce. Permite registrar ingresos por cobro a clientes, egresos por pago a proveedores (nacionales e internacionales), compensación de empleados, obligaciones previsionales chilenas, impuestos, gastos varios, y conciliar movimientos contra estados de cuenta bancarios.

**El problema hoy:** La gestión financiera opera en planillas dispersas. Los ingresos por clientes no se cruzan con los deals de HubSpot. Los pagos a proveedores no tienen registro centralizado con condiciones de pago. No hay conciliación bancaria estructurada ni visibilidad consolidada del flujo de caja.

**La solución:** Un módulo bajo `/finance` (route group propio) con:

1. **Ingresos** — Cobros a clientes con facturas, condiciones de crédito, y enriquecimiento del perfil financiero del cliente sincronizado desde HubSpot
2. **Egresos** — Pagos a proveedores de productos/servicios (nacionales e internacionales), pagos de nómina (link al módulo HR Payroll), pagos previsionales, impuestos/fiscales, y gastos varios
3. **Directorio de proveedores** — Registro de proveedores con datos tributarios, bancarios, condiciones de pago, y categorización
4. **Perfil financiero de clientes** — Extensión de la data de HubSpot con contactos de procurement/finanzas, condiciones de facturación (OC, HES, crédito), y facturas asociadas
5. **Conciliación bancaria** — Importar extractos bancarios, matchear contra ingresos/egresos registrados, e identificar partidas no conciliadas
6. **Dashboard financiero** — Vista consolidada de flujo de caja, cuentas por cobrar, cuentas por pagar, y posición financiera

**Monedas:** Efeonce opera en CLP y USD. Toda transacción registra su moneda original. La conversión a una moneda base (CLP) usa tipo de cambio al momento del registro, almacenado como snapshot.

**Este módulo es independiente del HR Payroll Module** pero se integra con él: las nóminas aprobadas en HR Payroll aparecen como egresos de tipo `payroll` en el módulo financiero. No duplica el cálculo — referencia los totales ya aprobados.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/finance-module`
- **Framework:** Next.js 16+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI 7.x
- **React:** 19.x
- **TypeScript:** 5.9+
- **Deploy:** Vercel
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery dataset:** `greenhouse`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (en el repo) | Modelo de roles, route groups, `roleCodes`, `routeGroups`, enforcement server-side |
| `project_context.md` (en el repo) | Schema real de BigQuery, campos disponibles |
| `authorization.ts` (en el repo) | Sistema de autorización actual |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, colores, tipografía |
| `CODEX_TASK_HR_Payroll_Module_v2.md` (proyecto Claude) | Schema de payroll — integración directa |
| `CODEX_TASK_Agency_Operator_Layer.md` (proyecto Claude) | Roles operator/admin, estructura de sidebar |

---

## Alineación obligatoria con Greenhouse 360 Object Model

Esta task debe ejecutarse alineada con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:

1. **Finance no crea una identidad paralela de cliente**
   - `greenhouse.clients.client_id` es la llave canónica del objeto `Client`
   - `fin_client_profiles` es una tabla de extensión financiera, no un maestro alternativo
   - `client_profile_id` y `hubspot_company_id` pueden sobrevivir como compatibilidad o source references, pero no como identidad primaria del cliente en Greenhouse

2. **Finance no crea una identidad paralela de colaborador**
   - `greenhouse.team_members.member_id` es la llave canónica del objeto `Collaborator`
   - egresos de nómina, previsión o impuestos ligados a persona deben anclarse por `member_id`
   - `payroll_entry_id` es una referencia de Payroll, no el identity anchor del colaborador

3. **Las tablas `fin_*` son válidas como tablas de dominio**
   - pueden vivir como transaction tables o extension tables
   - no deben redefinir `Client`, `Collaborator`, `Project` o futuros `Quote`

4. **Las vistas 360 salen de read models enriquecidos**
   - la solución no es duplicar más datos de cliente o colaborador dentro de Finance
   - la solución es componer `greenhouse.clients`, `team_members`, `hubspot_crm.*`, `payroll_*` y `fin_*` alrededor de objetos canónicos

5. **Si esta task propone una nueva relación con proyectos, deals o cotizaciones**
   - debe tratarla como referencia o enrichment
   - no debe inventar un ID maestro paralelo de proyecto o quote dentro de Finance

6. **Backfills y migraciones**
   - deben ser explícitos y controlados
   - no deben quedar escondidos como lógica pesada en el hot path de cada request

---

## Dependencias previas

### DEBE existir

- [x] Auth con NextAuth.js funcionando con `client_users`, roles, scopes — JWT, 3 providers (Azure AD, Google, credentials), `getTenantContext()` operativo
- [x] Guard server-side para rutas protegidas — `requireXxxTenantContext()` en cada layout y API, patrón idéntico al de `/hr` y `/admin`
- [x] Dataset `greenhouse` creado en BigQuery — ~20 tablas en producción
- [x] Pipeline `hubspot-bigquery` operativo sincronizando `hubspot_crm.companies`, `hubspot_crm.deals`, `hubspot_crm.contacts` — Cloud Function `hubspot-bq-sync` activa, sync diario 03:30 AM. Además existe facade Cloud Run `hubspot-greenhouse-integration` para lecturas real-time
- [x] Service account con permisos BigQuery Data Editor + Job User — credentials via env vars (`GOOGLE_APPLICATION_CREDENTIALS_JSON` / `_BASE64`), singleton client en `src/lib/bigquery.ts`

### Deseable pero no bloqueante

- [x] HR Payroll Module implementado — 4 tablas BQ (`payroll_entries`, `payroll_periods`, `compensation_versions`, `payroll_bonus_config`), API completa bajo `/api/hr/payroll/**`, 2,422 LOC en `src/lib/payroll/`
- [ ] Agency Operator Layer implementado (existe parcial: `/agency/spaces`, `/agency/capacity` — sidebar de finanzas se agrega como sección independiente)

---

## Modelo de acceso

### DECISIÓN ARQUITECTÓNICA: Route group `/finance` propio

Misma lógica que HR Payroll: no meter finanzas dentro de `/admin`. El layout de admin tiene su propia lógica de roles. Finanzas necesita un route group dedicado.

```
src/app/(dashboard)/finance/
  ├── layout.tsx                    # Guard: requiere routeGroup 'finance' o roleCodes incluye 'efeonce_admin'
  ├── page.tsx                      # Dashboard financiero (landing)
  ├── income/
  │   ├── page.tsx                  # Lista de ingresos
  │   └── [id]/page.tsx             # Detalle de ingreso / factura
  ├── expenses/
  │   ├── page.tsx                  # Lista de egresos (tabs: proveedores, nómina, previsión, impuestos, varios)
  │   └── [id]/page.tsx             # Detalle de egreso
  ├── suppliers/
  │   ├── page.tsx                  # Directorio de proveedores
  │   └── [id]/page.tsx             # Perfil de proveedor
  ├── clients/
  │   ├── page.tsx                  # Lista de clientes con perfil financiero
  │   └── [id]/page.tsx             # Perfil financiero del cliente
  └── reconciliation/
      ├── page.tsx                  # Conciliación bancaria
      └── [periodId]/page.tsx       # Conciliación de un período
```

**Implementación:**
1. Crear rol `finance_manager` en `greenhouse.roles` con `route_groups: ['finance']`
2. Crear sublayout `src/app/(dashboard)/finance/layout.tsx` que valide `routeGroups.includes('finance') || roleCodes.includes('efeonce_admin')`
3. Admins con `efeonce_admin` ven todo incluyendo finanzas. El usuario de finanzas solo ve `/finance/*`.
4. Agregar sección "Finanzas" al sidebar, visible solo si el usuario tiene route group `finance` o es admin.

### Sidebar — Sección Finanzas

```
┌─────────────────────────────────┐
│  FINANZAS                       │  ← Solo visible si routeGroup 'finance' o admin
│  ├ Dashboard                    │    Vista consolidada
│  ├ Ingresos                     │    Cobros y facturas emitidas
│  ├ Egresos                      │    Pagos (proveedores, nómina, previsión, impuestos, varios)
│  ├ Proveedores                  │    Directorio
│  ├ Clientes                     │    Perfil financiero (extensión HubSpot)
│  └ Conciliación                 │    Conciliación bancaria
└─────────────────────────────────┘
```

---

## PARTE A: Infraestructura BigQuery

> **Decisión de tipo numérico:** Todas las columnas monetarias usan `NUMERIC` (alias de `NUMERIC(38,9)` en BigQuery) en lugar de `FLOAT64`. FLOAT64 es IEEE 754 y acumula errores de redondeo en operaciones iterativas — inaceptable para un módulo financiero con conciliación bancaria donde las diferencias de centavos importan. El módulo de payroll existente usa `FLOAT64` con `roundCurrency()` como mitigación; este módulo opta por precisión nativa.
>
> **Provisión on-demand:** Seguir el patrón de `src/lib/payroll/schema.ts` con un `ensureFinanceInfrastructure()` que ejecute `CREATE TABLE IF NOT EXISTS` para las 8 tablas + seed del rol `finance_manager` al primer request. No depender de ejecución manual de DDLs.

### A1. Tabla `greenhouse.fin_accounts`

Cuentas bancarias de Efeonce. Estructura mínima para soportar conciliación.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_accounts` (
  account_id STRING NOT NULL,                        -- PK: slug (ej: 'bci-clp-operativa')
  account_name STRING NOT NULL,                      -- "BCI Cuenta Corriente CLP"
  bank_name STRING NOT NULL,                         -- "Banco BCI"
  account_number STRING,                             -- Número de cuenta (parcial, últimos 4 dígitos por seguridad en UI)
  account_number_full STRING,                        -- Número completo (solo visible en export)
  currency STRING NOT NULL,                          -- 'CLP' | 'USD'
  account_type STRING NOT NULL DEFAULT 'checking',   -- 'checking' | 'savings' | 'paypal' | 'wise' | 'other'
  country STRING NOT NULL DEFAULT 'CL',              -- ISO 3166-1 alpha-2
  is_active BOOL DEFAULT TRUE,
  opening_balance NUMERIC DEFAULT 0,                 -- Saldo inicial al empezar a usar el sistema
  opening_balance_date DATE,                         -- Fecha del saldo inicial
  notes STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A2. Tabla `greenhouse.fin_suppliers`

Directorio de proveedores de productos y/o servicios.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_suppliers` (
  supplier_id STRING NOT NULL,                       -- PK: slug (ej: 'adobe-inc')
  
  -- Identificación
  legal_name STRING NOT NULL,                        -- Razón social
  trade_name STRING,                                 -- Nombre de fantasía / nombre comercial
  tax_id STRING,                                     -- RUT (Chile), NIT (Colombia), RFC (México), RUC (Perú), EIN/TIN (USA)
  tax_id_type STRING DEFAULT 'RUT',                  -- 'RUT' | 'NIT' | 'RFC' | 'RUC' | 'EIN' | 'OTHER'
  country STRING NOT NULL DEFAULT 'CL',              -- ISO 3166-1 alpha-2
  
  -- Categorización
  category STRING NOT NULL,                          -- 'software' | 'infrastructure' | 'professional_services' | 'media' | 'creative' | 'hr_services' | 'office' | 'legal_accounting' | 'other'
  service_type STRING,                               -- Descripción libre del servicio/producto principal
  is_international BOOL DEFAULT FALSE,               -- TRUE si el pago es en USD o fuera de Chile
  
  -- Contacto
  primary_contact_name STRING,
  primary_contact_email STRING,
  primary_contact_phone STRING,
  website STRING,
  
  -- Datos bancarios para pago
  bank_name STRING,
  bank_account_number STRING,
  bank_account_type STRING,                          -- 'checking' | 'savings'
  bank_routing STRING,                               -- Código SWIFT/ABA para internacionales
  payment_currency STRING DEFAULT 'CLP',             -- 'CLP' | 'USD'
  
  -- Condiciones de pago
  default_payment_terms INT64 DEFAULT 30,            -- Días de crédito (0 = contado)
  default_payment_method STRING DEFAULT 'transfer',  -- 'transfer' | 'credit_card' | 'paypal' | 'wise' | 'check' | 'cash' | 'other'
  requires_po BOOL DEFAULT FALSE,                    -- ¿Requiere orden de compra?
  
  -- Estado
  is_active BOOL DEFAULT TRUE,
  
  -- Metadata
  notes STRING,                                      -- Notas libres sobre condiciones especiales
  created_by STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A3. Tabla `greenhouse.fin_client_profiles`

Extensión del perfil financiero de clientes sincronizados desde HubSpot. **No duplica** la data de HubSpot — agrega información financiera que HubSpot no tiene.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_client_profiles` (
  client_profile_id STRING NOT NULL,                 -- PK: '{hubspot_company_id}'
  hubspot_company_id STRING NOT NULL,                -- FK → hubspot_crm.companies.hs_object_id
  
  -- Datos tributarios
  tax_id STRING,                                     -- RUT / NIT / RFC / RUC del cliente
  tax_id_type STRING DEFAULT 'RUT',
  legal_name STRING,                                 -- Razón social (puede diferir del nombre comercial en HubSpot)
  billing_address STRING,                            -- Dirección de facturación
  billing_country STRING DEFAULT 'CL',
  
  -- Condiciones de facturación
  payment_terms_days INT64 DEFAULT 30,               -- Días de crédito (0 = contado)
  payment_currency STRING DEFAULT 'CLP',             -- 'CLP' | 'USD'
  requires_po BOOL DEFAULT FALSE,                    -- ¿Necesita Orden de Compra para pagar?
  requires_hes BOOL DEFAULT FALSE,                   -- ¿Necesita Hoja de Entrada de Servicio (HES)?
  current_po_number STRING,                          -- Número de OC vigente
  current_hes_number STRING,                         -- Número de HES vigente
  
  -- Contactos específicos de finanzas/procurement (JSON array)
  -- Estructura: [{ name, email, phone, role, notes }]
  -- role: 'procurement' | 'accounts_payable' | 'finance_director' | 'controller' | 'other'
  finance_contacts JSON,
  
  -- Notas sobre condiciones especiales
  special_conditions STRING,                         -- "Factura debe incluir número de OC en glosa", "Solo acepta factura electrónica", etc.
  
  -- Metadata
  created_by STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A4. Tabla `greenhouse.fin_income`

Ingresos: cobros a clientes. Cada registro es una factura emitida o un pago recibido.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_income` (
  income_id STRING NOT NULL,                         -- PK: 'INC-{YYYYMM}-{seq}' (ej: 'INC-202603-001')
  
  -- Vinculación con cliente
  client_profile_id STRING,                          -- FK → fin_client_profiles (nullable si es ingreso sin cliente)
  hubspot_company_id STRING,                         -- FK directo a HubSpot company
  hubspot_deal_id STRING,                            -- FK a deal específico (opcional)
  client_name STRING NOT NULL,                       -- Nombre del cliente (snapshot al momento del registro)
  
  -- Factura
  invoice_number STRING,                             -- Número de factura (DTE en Chile)
  invoice_date DATE NOT NULL,                        -- Fecha de emisión
  due_date DATE,                                     -- Fecha de vencimiento (invoice_date + payment_terms)
  
  -- Montos
  currency STRING NOT NULL,                          -- 'CLP' | 'USD'
  subtotal NUMERIC NOT NULL,                         -- Monto neto antes de impuestos
  tax_rate NUMERIC DEFAULT 0.19,                     -- IVA (19% Chile, 0% si exento)
  tax_amount NUMERIC NOT NULL,                       -- Monto IVA
  total_amount NUMERIC NOT NULL,                     -- subtotal + tax_amount

  -- Conversión (snapshot al momento del registro)
  exchange_rate_to_clp NUMERIC DEFAULT 1.0,          -- Tipo de cambio a CLP (1.0 si ya es CLP)
  total_amount_clp NUMERIC NOT NULL,                 -- total_amount * exchange_rate_to_clp

  -- Estado de cobro
  payment_status STRING NOT NULL DEFAULT 'pending',  -- 'pending' | 'partial' | 'paid' | 'overdue' | 'written_off'
  amount_paid NUMERIC DEFAULT 0,                     -- Monto cobrado hasta ahora
  -- amount_pending se elimina como columna: calcular en query como total_amount - COALESCE(amount_paid, 0)
  
  -- Pagos recibidos (JSON array de pagos parciales)
  -- Estructura: [{ date, amount, account_id, reference, notes }]
  payments_received JSON,
  
  -- Documentación
  po_number STRING,                                  -- Número de OC del cliente (si aplica)
  hes_number STRING,                                 -- Número de HES (si aplica)
  
  -- Categorización
  service_line STRING,                               -- 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'crm_solutions'
  income_type STRING DEFAULT 'service_fee',          -- 'service_fee' | 'project' | 'retainer' | 'consulting' | 'other'
  description STRING,                                -- Descripción del servicio facturado
  
  -- Conciliación
  is_reconciled BOOL DEFAULT FALSE,
  reconciliation_id STRING,                          -- FK → fin_reconciliation_entries
  
  -- Metadata
  notes STRING,
  created_by STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A5. Tabla `greenhouse.fin_expenses`

Egresos: todos los pagos de Efeonce. Clasificados por tipo.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_expenses` (
  expense_id STRING NOT NULL,                        -- PK: 'EXP-{YYYYMM}-{seq}' (ej: 'EXP-202603-042')
  
  -- Tipo de egreso
  expense_type STRING NOT NULL,                      -- 'supplier' | 'payroll' | 'social_security' | 'tax' | 'miscellaneous'
  
  -- === Campos comunes a todos los tipos ===
  
  description STRING NOT NULL,                       -- Descripción del gasto
  
  -- Montos
  currency STRING NOT NULL,                          -- 'CLP' | 'USD'
  subtotal NUMERIC NOT NULL,                         -- Monto neto
  tax_rate NUMERIC DEFAULT 0,                        -- IVA incluido (si aplica)
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,                     -- subtotal + tax_amount

  -- Conversión (snapshot)
  exchange_rate_to_clp NUMERIC DEFAULT 1.0,
  total_amount_clp NUMERIC NOT NULL,
  
  -- Pago
  payment_date DATE,                                 -- Fecha en que se pagó (null si pendiente)
  payment_status STRING NOT NULL DEFAULT 'pending',  -- 'pending' | 'scheduled' | 'paid' | 'overdue' | 'cancelled'
  payment_method STRING,                             -- 'transfer' | 'credit_card' | 'paypal' | 'wise' | 'check' | 'cash' | 'other'
  payment_account_id STRING,                         -- FK → fin_accounts
  payment_reference STRING,                          -- Número de transferencia, referencia de pago
  
  -- Documento soporte
  document_number STRING,                            -- Número de factura del proveedor / boleta / recibo
  document_date DATE,                                -- Fecha del documento
  due_date DATE,                                     -- Fecha de vencimiento
  
  -- === Campos específicos por tipo ===
  
  -- supplier: Pago a proveedor
  supplier_id STRING,                                -- FK → fin_suppliers
  supplier_name STRING,                              -- Snapshot
  supplier_invoice_number STRING,                    -- Factura del proveedor
  
  -- payroll: Pago de nómina (link a HR Payroll)
  payroll_period_id STRING,                          -- FK → greenhouse.payroll_periods (ej: '2026-03')
  payroll_entry_id STRING,                           -- FK → greenhouse.payroll_entries (para pago individual)
  member_id STRING,                                  -- FK → greenhouse.team_members
  member_name STRING,                                -- Snapshot
  
  -- social_security: Pagos previsionales Chile
  social_security_type STRING,                       -- 'afp' | 'health' | 'unemployment' | 'mutual' | 'caja_compensacion'
  social_security_institution STRING,                -- "AFP Habitat", "Fonasa", "AFC Chile", etc.
  social_security_period STRING,                     -- Período previsional (ej: '2026-02')
  
  -- tax: Impuestos y fiscales
  tax_type STRING,                                   -- 'iva_mensual' | 'ppm' | 'renta_anual' | 'patente' | 'contribuciones' | 'retencion_honorarios' | 'other'
  tax_period STRING,                                 -- Período tributario
  tax_form_number STRING,                            -- Número de formulario (F29, F50, etc.)
  
  -- miscellaneous: Gastos varios
  miscellaneous_category STRING,                     -- 'office' | 'travel' | 'meals' | 'subscriptions' | 'insurance' | 'banking_fees' | 'legal' | 'other'
  
  -- Categorización general
  service_line STRING,                               -- 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'shared' | null
  is_recurring BOOL DEFAULT FALSE,                   -- ¿Es un gasto recurrente?
  recurrence_frequency STRING,                       -- 'monthly' | 'quarterly' | 'annual' | null
  
  -- Conciliación
  is_reconciled BOOL DEFAULT FALSE,
  reconciliation_id STRING,
  
  -- Metadata
  notes STRING,
  created_by STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A6. Tabla `greenhouse.fin_reconciliation_periods`

Períodos de conciliación bancaria.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_reconciliation_periods` (
  period_id STRING NOT NULL,                         -- PK: '{account_id}_{YYYY-MM}' (ej: 'bci-clp-operativa_2026-03')
  account_id STRING NOT NULL,                        -- FK → fin_accounts
  year INT64 NOT NULL,
  month INT64 NOT NULL,
  
  -- Saldos
  opening_balance NUMERIC NOT NULL,                  -- Saldo inicial del período
  closing_balance_bank NUMERIC,                      -- Saldo final según extracto bancario
  closing_balance_system NUMERIC,                    -- Saldo final según registros del sistema
  difference NUMERIC,                                -- closing_balance_bank - closing_balance_system
  
  -- Estado
  status STRING NOT NULL DEFAULT 'open',             -- 'open' | 'in_progress' | 'reconciled' | 'closed'
  
  -- Importación del extracto
  statement_imported BOOL DEFAULT FALSE,
  statement_imported_at TIMESTAMP,
  statement_row_count INT64 DEFAULT 0,
  
  -- Metadata
  reconciled_by STRING,
  reconciled_at TIMESTAMP,
  notes STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A7. Tabla `greenhouse.fin_bank_statement_rows`

Filas importadas de extractos bancarios (CSV de banco).

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_bank_statement_rows` (
  row_id STRING NOT NULL,                            -- PK: '{period_id}_{line_number}'
  period_id STRING NOT NULL,                         -- FK → fin_reconciliation_periods
  
  -- Datos del extracto
  transaction_date DATE NOT NULL,                    -- Fecha de la transacción
  value_date DATE,                                   -- Fecha valor (si difiere)
  description STRING NOT NULL,                       -- Descripción del banco
  reference STRING,                                  -- Referencia / número de transacción
  amount NUMERIC NOT NULL,                            -- Positivo = abono, negativo = cargo
  balance NUMERIC,                                   -- Saldo después de la transacción (si lo tiene el extracto)

  -- Matching
  match_status STRING NOT NULL DEFAULT 'unmatched',  -- 'unmatched' | 'auto_matched' | 'manual_matched' | 'excluded'
  matched_type STRING,                               -- 'income' | 'expense' | null
  matched_id STRING,                                 -- FK → fin_income.income_id o fin_expenses.expense_id
  match_confidence NUMERIC,                          -- 0.0-1.0 para auto-match
  
  -- Metadata
  notes STRING,
  matched_by STRING,
  matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A8. Tabla `greenhouse.fin_exchange_rates`

Registro histórico de tipos de cambio usados. Permite reproducibilidad de conversiones.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.fin_exchange_rates` (
  rate_id STRING NOT NULL,                           -- PK: '{from}_{to}_{date}'
  from_currency STRING NOT NULL,                     -- 'USD'
  to_currency STRING NOT NULL,                       -- 'CLP'
  rate NUMERIC NOT NULL,                              -- 1 USD = X CLP
  rate_date DATE NOT NULL,
  source STRING DEFAULT 'manual',                    -- 'manual' | 'sii' | 'api'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

---

## PARTE B: API Routes

Todas bajo `/app/api/finance/`. Patrón: autenticar → validar route group finance o admin → ejecutar query → retornar JSON.

### Convención de paginación para endpoints GET de lista

Todos los endpoints GET que retornan listas (ingresos, egresos, proveedores, clientes, períodos) deben soportar paginación:

- **Query params:** `?page=1&pageSize=50&sortBy=created_at&sortOrder=desc`
- **Default:** `page=1`, `pageSize=50`, max `pageSize=200`
- **Response shape:**
```json
{
  "items": [...],
  "total": 123,
  "page": 1,
  "pageSize": 50
}
```
- Los endpoints de dashboard (B1) no paginan — retornan agregados.

### B1. Dashboard

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/dashboard/summary` | GET | KPIs: ingresos del mes, egresos del mes, flujo neto, cuentas por cobrar, cuentas por pagar |
| `/api/finance/dashboard/cashflow` | GET | Flujo de caja mensual (12 meses rolling) |
| `/api/finance/dashboard/aging` | GET | Aging de cuentas por cobrar (current, 30d, 60d, 90d+) |
| `/api/finance/dashboard/by-service-line` | GET | Ingresos y egresos por línea de servicio |

### B2. Ingresos

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/income` | GET | Lista de ingresos con filtros (status, cliente, período, moneda) |
| `/api/finance/income` | POST | Crear nuevo ingreso |
| `/api/finance/income/[id]` | GET | Detalle de ingreso |
| `/api/finance/income/[id]` | PUT | Actualizar ingreso |
| `/api/finance/income/[id]/payment` | POST | Registrar pago recibido (parcial o total) |

### B3. Egresos

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/expenses` | GET | Lista de egresos con filtros (tipo, proveedor, período, status) |
| `/api/finance/expenses` | POST | Crear nuevo egreso |
| `/api/finance/expenses/[id]` | GET | Detalle de egreso |
| `/api/finance/expenses/[id]` | PUT | Actualizar egreso |
| `/api/finance/expenses/bulk` | POST | Crear múltiples egresos (para importación previsional) |

### B4. Proveedores

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/suppliers` | GET | Lista de proveedores activos |
| `/api/finance/suppliers` | POST | Crear proveedor |
| `/api/finance/suppliers/[id]` | GET | Perfil de proveedor + historial de pagos |
| `/api/finance/suppliers/[id]` | PUT | Actualizar proveedor |

### B5. Clientes (perfil financiero)

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/clients` | GET | Lista de clientes con data HubSpot + perfil financiero |
| `/api/finance/clients/[id]` | GET | Perfil financiero completo + facturas + contactos |
| `/api/finance/clients/[id]` | PUT | Actualizar perfil financiero |
| `/api/finance/clients/sync` | POST | Refrescar data de HubSpot para un cliente |

**Query de clientes:** Hace JOIN entre `hubspot_crm.companies` y `greenhouse.fin_client_profiles` para mostrar la data unificada.

### B6. Conciliación bancaria

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/reconciliation/periods` | GET | Lista de períodos de conciliación |
| `/api/finance/reconciliation/periods` | POST | Crear nuevo período |
| `/api/finance/reconciliation/periods/[id]` | GET | Detalle de período con filas de extracto |
| `/api/finance/reconciliation/import` | POST | Importar CSV de extracto bancario |
| `/api/finance/reconciliation/auto-match` | POST | Ejecutar matching automático |
| `/api/finance/reconciliation/match` | POST | Matching manual de una fila con un ingreso/egreso |
| `/api/finance/reconciliation/unmatch` | POST | Deshacer matching |

### B7. Tipos de cambio

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/exchange-rates` | GET | Tipos de cambio por rango de fechas |
| `/api/finance/exchange-rates` | POST | Registrar tipo de cambio |
| `/api/finance/exchange-rates/latest` | GET | Último tipo de cambio USD/CLP disponible |

### B8. Cuentas bancarias

| Endpoint | Método | Retorna |
|---|---|---|
| `/api/finance/accounts` | GET | Lista de cuentas bancarias activas |
| `/api/finance/accounts` | POST | Crear cuenta bancaria |
| `/api/finance/accounts/[id]` | PUT | Actualizar cuenta |

---

## PARTE C: Vistas UI

### C1. Dashboard Financiero (`/finance`)

Landing page del módulo financiero. Vista consolidada.

**KPI Cards (fila superior):**

| KPI | Cálculo | Visualización |
|---|---|---|
| Ingresos del mes | SUM(total_amount_clp) WHERE payment_status IN ('paid', 'partial') AND mes actual | Número grande + moneda + trend vs mes anterior |
| Egresos del mes | SUM(total_amount_clp) WHERE payment_status = 'paid' AND mes actual | Número grande + moneda + trend |
| Flujo neto | Ingresos - Egresos del mes | Número con color (verde positivo, rojo negativo) |
| Cuentas por cobrar | SUM(total_amount - COALESCE(amount_paid, 0)) WHERE payment_status IN ('pending', 'overdue', 'partial') | Número + badge con cantidad de facturas pendientes |
| Cuentas por pagar | SUM(total_amount_clp) WHERE expense payment_status = 'pending' | Número + badge con cantidad |

**Charts:**

- **Flujo de caja mensual:** Bar chart con ingresos (verde) vs egresos (rojo) por mes, últimos 12 meses. Línea de flujo neto superpuesta.
- **Aging de cuentas por cobrar:** Stacked bar: Vigente / 1-30d / 31-60d / 61-90d / 90d+. Colores usando semáforos de `GH_COLORS.semaphore`.
- **Distribución de egresos por tipo:** Donut chart (proveedores, nómina, previsión, impuestos, varios).
- **Ingresos por línea de servicio:** Bar chart horizontal por service_line.

### C2. Ingresos (`/finance/income`)

**Vista lista:** Tabla con columnas: Factura #, Cliente, Fecha emisión, Vencimiento, Monto, Moneda, Status, Días pendientes.

**Filtros:** Status (pending/partial/paid/overdue), Cliente (autocompletar), Período (mes/año), Moneda, Línea de servicio.

**Acciones:** Crear nuevo ingreso (botón), Registrar pago (inline en cada fila), Export CSV.

**Formulario de nuevo ingreso:** Modal/drawer con campos: Cliente (select con búsqueda en HubSpot companies), Factura #, Fecha, Moneda (CLP/USD), Monto neto, IVA (auto-calcula al 19% con toggle para exento), Deal asociado (opcional, select de deals del cliente), Línea de servicio, OC # (si aplica), HES # (si aplica), Descripción, Cuenta bancaria destino.

**Vista detalle (`/finance/income/[id]`):** Header con datos de la factura + timeline de pagos recibidos + botón para registrar pago.

### C3. Egresos (`/finance/expenses`)

**Tabs superiores:**

| Tab | Filtro expense_type | Contenido |
|---|---|---|
| Proveedores | `supplier` | Pagos a proveedores de servicios y productos |
| Nómina | `payroll` | Link a HR Payroll — muestra nóminas aprobadas como egresos |
| Previsión | `social_security` | AFP, Fonasa/Isapre, Seguro Cesantía, Mutual, Caja Compensación |
| Impuestos | `tax` | IVA mensual, PPM, Renta anual, Patente, Retenciones |
| Varios | `miscellaneous` | Oficina, viajes, suscripciones, seguros, comisiones bancarias, legales |

**Cada tab tiene la misma estructura de tabla** con columnas adaptadas al tipo.

**Tab Proveedores:** Proveedor, Factura #, Fecha, Vencimiento, Monto, Moneda, Status, Método de pago.

**Tab Nómina:** Si HR Payroll Module existe, muestra un read-only de las nóminas aprobadas con sus totales. Si no existe, permite crear egresos de nómina manualmente.

**Tab Previsión:** Formulario especial para registrar pagos previsionales del mes: seleccionar período, institución (AFP Habitat, Fonasa, AFC Chile, etc.), monto, fecha de pago. Permite crear múltiples registros de una vez (un pago por institución).

**Tab Impuestos:** Tipo de impuesto (select), Período, Formulario (F29, F50, etc.), Monto, Fecha de pago.

**Formulario de nuevo egreso (proveedor):** Proveedor (select con búsqueda), Factura #, Fecha documento, Fecha vencimiento, Moneda, Monto neto, IVA, Línea de servicio, Descripción, Método de pago, Cuenta bancaria origen.

### C4. Proveedores (`/finance/suppliers`)

**Vista lista:** Tabla/cards con: Nombre comercial, Categoría (badge de color), País, Moneda de pago, Condiciones de pago, Status activo/inactivo, # de pagos realizados.

**Filtros:** Categoría, País, Activo/Inactivo, Internacional sí/no.

**Vista detalle (`/finance/suppliers/[id]`):**

- **Header:** Nombre, categoría, país, RUT/Tax ID, website
- **Tab Información:** Datos tributarios, bancarios, condiciones de pago, contacto
- **Tab Historial:** Timeline de pagos realizados a este proveedor (query a fin_expenses WHERE supplier_id)
- **Tab Editar:** Formulario completo de edición

### C5. Clientes — Perfil Financiero (`/finance/clients`)

**Vista lista:** Muestra `hubspot_crm.companies` enriquecido con `fin_client_profiles`. Columnas: Nombre (de HubSpot), RUT, Condiciones de pago, ¿OC?, ¿HES?, Saldo pendiente (sum de facturas pendientes), # Facturas activas.

**Vista detalle (`/finance/clients/[id]`):**

- **Header:** Nombre de HubSpot + razón social legal + RUT
- **Tab Facturación:** Condiciones de crédito, OC/HES flags, números de OC/HES vigentes, condiciones especiales (textarea)
- **Tab Contactos Financieros:** Lista de contactos de procurement/finanzas (CRUD, datos en JSON de fin_client_profiles.finance_contacts): nombre, email, teléfono, rol (procurement / cuentas por pagar / director de finanzas / controller)
- **Tab Facturas:** Lista de facturas emitidas a este cliente (query a fin_income WHERE hubspot_company_id). Con status de cobro, aging.
- **Tab Deals:** Deals de HubSpot de este cliente con monto y stage (read-only, query a hubspot_crm.deals)

### C6. Conciliación Bancaria (`/finance/reconciliation`)

**Vista lista:** Períodos de conciliación por cuenta bancaria. Columnas: Cuenta, Período, Status, Saldo banco, Saldo sistema, Diferencia (resaltada si ≠ 0).

**Vista de conciliación (`/finance/reconciliation/[periodId]`):**

Layout en dos paneles:

- **Panel izquierdo (60%):** Filas del extracto bancario importado. Cada fila tiene: Fecha, Descripción, Monto, Status de match (badge). Las filas matcheadas muestran el ingreso/egreso vinculado. Las no matcheadas se resaltan.

- **Panel derecho (40%):** Lista de ingresos/egresos del período que aún no están conciliados. El usuario puede arrastrar/clickear para vincular.

**Acciones:**
- **Importar extracto:** Upload de CSV → parser que acepta formatos de BCI, Santander, Banco de Chile (los más comunes en Chile). El parser normaliza las columnas.
- **Auto-match:** Botón que ejecuta matching por monto + fecha ± 3 días + referencia parcial. Matchea automáticamente las coincidencias con alta confianza (>0.8).
- **Match manual:** El usuario selecciona una fila del extracto y un ingreso/egreso para vincularlos.
- **Excluir:** Marcar una fila del extracto como "excluida" (comisiones bancarias internas, transferencias entre cuentas propias, etc.).
- **Resumen:** Al final de la página, box con: Saldo inicial + Abonos - Cargos = Saldo final banco vs Saldo sistema. Diferencia resaltada.

---

## PARTE D: Integraciones

### D1. HubSpot → Perfil Financiero de Cliente

El sync diario `hubspot-bigquery` ya trae companies, deals y contacts a BigQuery. El módulo financiero hace JOIN en tiempo de query:

```sql
SELECT
  c.hs_object_id,
  c.name AS company_name,
  c.domain,
  c.country,
  fp.tax_id,
  fp.legal_name,
  fp.payment_terms_days,
  fp.payment_currency,
  fp.requires_po,
  fp.requires_hes,
  fp.current_po_number,
  fp.current_hes_number,
  fp.finance_contacts,
  fp.special_conditions,
  -- Métricas calculadas
  (SELECT SUM(i.total_amount - COALESCE(i.amount_paid, 0)) FROM `greenhouse.fin_income` i WHERE i.hubspot_company_id = c.hs_object_id AND i.payment_status IN ('pending', 'overdue', 'partial')) AS total_receivable,
  (SELECT COUNT(*) FROM `greenhouse.fin_income` i WHERE i.hubspot_company_id = c.hs_object_id AND i.payment_status IN ('pending', 'overdue')) AS pending_invoices_count
FROM `hubspot_crm.companies` c
LEFT JOIN `greenhouse.fin_client_profiles` fp ON fp.hubspot_company_id = c.hs_object_id
WHERE c.hs_archived = false
```

### D2. HR Payroll → Egresos de Nómina

Si el HR Payroll Module está implementado, el módulo financiero consulta `greenhouse.payroll_entries` y `greenhouse.payroll_periods` para mostrar nóminas aprobadas como egresos:

```sql
-- NOTA: payroll_entries NO tiene columna member_name. El nombre se resuelve via JOIN con team_members.
SELECT
  pe.period_id,
  pe.member_id,
  CONCAT(COALESCE(tm.first_name, ''), ' ', COALESCE(tm.last_name, '')) AS member_name,
  pe.currency,
  pe.net_total,
  pe.gross_total,
  pe.chile_total_deductions,
  pp.status AS period_status,
  pp.approved_at
FROM `greenhouse.payroll_entries` pe
JOIN `greenhouse.payroll_periods` pp ON pp.period_id = pe.period_id
JOIN `greenhouse.team_members` tm ON tm.member_id = pe.member_id
WHERE pp.status IN ('approved', 'exported')
```

Si el módulo no existe, los egresos de nómina se crean manualmente con `expense_type = 'payroll'`.

**Regla:** El módulo financiero NUNCA escribe en tablas de payroll. Solo lee. El flujo de aprobación de nómina vive exclusivamente en HR Payroll.

### D3. Conciliación — Parsers de extractos bancarios

El importador de CSV necesita parsers por banco. Los bancos chilenos más comunes tienen formatos distintos:

| Banco | Formato típico | Columnas esperadas |
|---|---|---|
| BCI | CSV con headers, fecha DD/MM/YYYY | Fecha, Descripción, Cargo, Abono, Saldo |
| Santander | CSV semicolon-separated | Fecha, Nro Documento, Descripción, Cargo, Abono, Saldo |
| Banco de Chile | CSV con headers, fecha DD-MM-YYYY | Fecha, Descripción, Monto, Saldo |
| Scotiabank | CSV comma-separated | Date, Description, Debit, Credit, Balance |

Implementar un parser factory: `parseBankStatement(csvContent: string, bankFormat: string): BankStatementRow[]`. El usuario selecciona el formato del banco al importar.

---

## PARTE E: Lógica de Negocio

### E1. Generación de IDs

Todos los IDs financieros usan el patrón `{PREFIX}-{YYYYMM}-{seq}`:

- Ingresos: `INC-202603-001`, `INC-202603-002`...
- Egresos: `EXP-202603-001`, `EXP-202603-002`...

El secuencial se obtiene con `SELECT MAX(seq) + 1 FROM table WHERE period = current`. Si no hay registros en el período, empieza en 001.

### E2. Conversión de moneda

Toda transacción en USD se convierte a CLP al momento del registro:

1. El usuario puede ingresar el tipo de cambio manualmente
2. O el sistema usa el último tipo de cambio registrado en `fin_exchange_rates`
3. El tipo de cambio se guarda como snapshot en la transacción (`exchange_rate_to_clp`)
4. Los totales en CLP (`total_amount_clp`) son el monto de referencia para dashboards y conciliación

**Los dashboards siempre muestran totales en CLP.** Cada transacción individual muestra su moneda original.

### E3. Cálculo de aging (cuentas por cobrar)

```
Vigente:  due_date >= hoy
1-30d:    hoy - due_date BETWEEN 1 AND 30
31-60d:   hoy - due_date BETWEEN 31 AND 60
61-90d:   hoy - due_date BETWEEN 61 AND 90
90d+:     hoy - due_date > 90
```

### E4. Auto-matching de conciliación

El algoritmo de auto-match opera así:

1. Para cada fila no matcheada del extracto:
2. **Paso 1 — Match por referencia (alta confianza):** Si la referencia/descripción del extracto contiene un ID de ingreso/egreso (`INC-*`, `EXP-*`) o un número de factura conocido → confianza **0.95**, auto-match directo.
3. **Paso 2 — Match por monto + fecha + referencia parcial:** Buscar en ingresos/egresos del mismo período con:
   - Mismo monto (tolerancia: ±1 CLP para CLP, ±0.01 USD para USD)
   - Fecha ± 3 días calendario
   - Referencia parcial presente en descripción del extracto → confianza **0.85**, auto-match.
4. **Paso 3 — Match por monto + fecha (baja confianza):** Mismo monto + fecha ± 3 días pero sin match de referencia → confianza **0.70**, marcar como `suggested` pero NO auto-match. El usuario decide.
5. Si hay múltiples candidatos con igual confianza, dejar como `unmatched` para resolución manual.
6. Umbral de auto-match: confianza ≥ 0.8.

### E5. Egresos previsionales — Creación en lote

Los pagos previsionales se hacen una vez al mes a múltiples instituciones. La UI permite crear un "lote previsional" del mes:

1. Seleccionar período (ej: "Febrero 2026")
2. El sistema muestra las instituciones conocidas (de payroll si existe, o de egresos anteriores)
3. El usuario ingresa monto por institución
4. Un botón "Crear todos" genera N registros de egreso con `expense_type = 'social_security'`

---

## PARTE F: Nomenclatura UI (Greenhouse)

Siguiendo las reglas de Nomenclatura v3: capa de datos usa nombres funcionales, capa de experiencia usa tono Greenhouse.

### Navegación

| Ruta | Nombre sidebar | Subtítulo |
|---|---|---|
| `/finance` | **Finanzas** | Vista consolidada |
| `/finance/income` | **Ingresos** | Facturación y cobros |
| `/finance/expenses` | **Egresos** | Pagos y obligaciones |
| `/finance/suppliers` | **Proveedores** | Directorio de proveedores |
| `/finance/clients` | **Clientes** | Perfil financiero |
| `/finance/reconciliation` | **Conciliación** | Conciliación bancaria |

### KPI Labels

| KPI | Label UI |
|---|---|
| Ingresos del mes | **Ingresos del período** |
| Egresos del mes | **Egresos del período** |
| Flujo neto | **Flujo neto** |
| Cuentas por cobrar | **Por cobrar** |
| Cuentas por pagar | **Por pagar** |
| Facturas vencidas | **Vencidas** |

### Status badges

| Status | Label UI | Color (GH_COLORS) |
|---|---|---|
| pending | Pendiente | `semantic.warning` |
| partial | Pago parcial | `semantic.info` |
| paid | Pagado | `semantic.success` |
| overdue | Vencido | `semantic.danger` |
| scheduled | Programado | `semantic.info` |
| cancelled | Anulado | `neutral.textSecondary` |
| written_off | Castigado | `neutral.textSecondary` |

### Empty states

| Página | Copy |
|---|---|
| Dashboard sin data | "Tu módulo financiero está listo. Los datos aparecerán cuando registres tu primer ingreso o egreso." |
| Proveedores vacío | "No hay proveedores registrados. Agrega tu primer proveedor para empezar a trackear pagos." |
| Conciliación sin extracto | "Importa un extracto bancario para comenzar la conciliación del período." |

---

## Orden de ejecución sugerido

### Fase 1: Infraestructura (P0)

1. **Crear `src/lib/finance/schema.ts`** con `ensureFinanceInfrastructure()` (A1-A8): provisión on-demand al primer request, siguiendo patrón de `src/lib/payroll/schema.ts`. Incluir seed del rol `finance_manager`
2. **Crear route group finance:** Layout, guard, rol en `greenhouse.roles`
3. **Crear sección Finanzas en sidebar:** Condicionada al rol
4. **Crear API de cuentas bancarias** (B8): CRUD básico de `fin_accounts`
5. **Crear API de tipos de cambio** (B7): CRUD de `fin_exchange_rates`

### Fase 2: Proveedores + Clientes (P0)

6. **Crear API de proveedores** (B4): CRUD completo
7. **Crear UI de proveedores** (C4): Lista + detalle + formulario
8. **Crear API de clientes** (B5): JOIN HubSpot + perfil financiero
9. **Crear UI de clientes** (C5): Lista + detalle con tabs (facturación, contactos, facturas, deals)

### Fase 3: Ingresos (P0)

10. **Crear API de ingresos** (B2): CRUD + registro de pagos
11. **Crear UI de ingresos** (C2): Lista + formulario + detalle con timeline de pagos
12. **Crear lógica de IDs secuenciales** (E1)
13. **Crear lógica de conversión de moneda** (E2)

### Fase 4: Egresos (P0)

14. **Crear API de egresos** (B3): CRUD + bulk para previsión
15. **Crear UI de egresos** (C3): Tabs por tipo + formularios específicos
16. **Integrar con HR Payroll** (D2): Read-only de nóminas aprobadas en tab Nómina

### Fase 5: Dashboard (P1)

17. **Crear API de dashboard** (B1): KPIs + flujo de caja + aging + distribución
18. **Crear UI de dashboard** (C1): KPI cards + 4 charts

### Fase 6: Conciliación bancaria (P1)

19. **Crear parsers de extractos** (D3): BCI, Santander, Banco de Chile
20. **Crear API de conciliación** (B6): Importación + auto-match + match manual
21. **Crear UI de conciliación** (C6): Panel dual + importador + resumen

### Fase 7: Polish (P2)

22. **Export CSV/Excel** de ingresos, egresos, conciliación
23. **Filtros persistentes** (query params en URL)
24. **Responsive** en 1440px, 1024px, 768px
25. **Skeleton loaders** en cada sección
26. **Error boundaries** independientes por zona

---

## Criterio de aceptación

### Infraestructura

- [ ] 8 tablas creadas en `greenhouse` dataset
- [ ] Route group `finance` protegido — `role: 'client'` recibe 403 en `/finance/*`
- [ ] Usuarios con `routeGroups.includes('finance')` o `roleCodes.includes('efeonce_admin')` acceden
- [ ] Sección Finanzas visible en sidebar solo para usuarios autorizados

### Proveedores

- [ ] CRUD completo de proveedores con categorización
- [ ] Vista de historial de pagos por proveedor
- [ ] Búsqueda por nombre y filtros por categoría/país
- [ ] Datos bancarios almacenados de forma segura

### Clientes

- [ ] JOIN funcional entre HubSpot companies y fin_client_profiles
- [ ] CRUD de contactos financieros (procurement, finanzas)
- [ ] Campos OC/HES con flags y números
- [ ] Condiciones de crédito editables (días, moneda, condiciones especiales)
- [ ] Tab de facturas con aging

### Ingresos

- [ ] Crear factura con vinculación a cliente HubSpot y deal
- [ ] Registrar pagos parciales y totales
- [ ] Status automático: pending → partial → paid, y overdue si pasa due_date
- [ ] Conversión USD→CLP con tipo de cambio snapshot
- [ ] IDs secuenciales por período

### Egresos

- [ ] 5 tipos de egreso con formularios adaptados
- [ ] Tab Nómina lee de HR Payroll si existe (read-only)
- [ ] Creación en lote de egresos previsionales
- [ ] Impuestos con referencia a formulario SII (F29, F50)

### Dashboard

- [ ] 5 KPI cards con data real
- [ ] 4 charts funcionales (flujo de caja, aging, distribución egresos, ingresos por línea)
- [ ] Todos los montos en CLP (moneda base)
- [ ] Trends vs mes anterior

### Conciliación

- [ ] Import de CSV con al menos 3 formatos de banco chileno
- [ ] Auto-match con confianza ≥ 0.8
- [ ] Match/unmatch manual
- [ ] Excluir filas del extracto
- [ ] Resumen con diferencia banco vs sistema
- [ ] Status del período: open → in_progress → reconciled → closed

### UI y diseño

- [ ] Todos los colores de `GH_COLORS` — cero hex hardcodeados
- [ ] Poppins solo para títulos, números hero, sidebar nav, overlines, botones
- [ ] DM Sans para body, descriptores, tabla, badges, captions
- [ ] Semáforos financieros usan colores de marca
- [ ] Responsive funcional en 1440px, 1024px, 768px
- [ ] Skeleton loaders en cada sección
- [ ] Error boundaries independientes por zona

---

## Lo que NO cambia

- **Las tablas de HR Payroll.** El módulo financiero solo lee. No escribe en `payroll_entries`, `payroll_periods`, ni `compensation_versions`.
- **Las tablas de HubSpot CRM.** `hubspot_crm.*` se consume en read-only. El enriquecimiento financiero va en `fin_client_profiles`.
- **La experiencia del cliente.** El cliente externo (`role: 'client'`) nunca ve la sección Finanzas.
- **Los schemas de BigQuery existentes.** `notion_ops.*` y `hubspot_crm.*` no se tocan.

## Lo que SÍ cambia

| Componente | Cambio | Impacto |
|---|---|---|
| `greenhouse` dataset | 8 tablas nuevas `fin_*` | Aditivo — no afecta tablas existentes |
| `greenhouse.roles` | Nuevo rol `finance_manager` | Aditivo |
| Sidebar | Nueva sección "Finanzas" condicionada al rol | Extensión del sidebar existente |
| Middleware | Protección de `/finance/*` | Nuevo matcher |

---

## Notas para el agente

- **Lee los documentos normativos antes de escribir código.** Especialmente `GREENHOUSE_IDENTITY_ACCESS_V1.md` y `Nomenclatura_Portal_v3.md`.
- **El módulo financiero es interno de Efeonce.** Ningún cliente externo ve esta sección. Nunca se filtra por `client_id` — se muestra toda la data financiera de Efeonce.
- **No inventes componentes de UI.** Reutiliza los patrones de stat cards, tablas con filtros, formularios con drawer/modal, y empty states que ya existen en otros módulos.
- **Moneda dual es central.** Cada formulario que involucra dinero debe tener selector CLP/USD. Los dashboards siempre consolidan en CLP.
- **Seguridad de datos bancarios.** Los números de cuenta completos (`account_number_full`, datos bancarios de proveedores) solo se muestran en contextos de edición y export, nunca en listas o cards. En listas mostrar solo últimos 4 dígitos.
- **Conciliación es P1, no P0.** El módulo es valioso sin conciliación. Prioriza ingresos/egresos/proveedores/clientes primero.
- **Validación:** El repo no usa Zod. Seguir el patrón de `src/lib/payroll/shared.ts` con validators custom y una clase `FinanceValidationError` análoga a `PayrollValidationError`. Reutilizar los helpers existentes (`toNumber`, `toDateString`, `toNullableNumber`, `toTimestampString`, `roundCurrency`) de `src/lib/payroll/shared.ts` donde aplique.
- **Provisión de infraestructura:** Crear `src/lib/finance/schema.ts` con `ensureFinanceInfrastructure()` siguiendo el patrón de `src/lib/payroll/schema.ts`. Auto-provisión idempotente con `CREATE TABLE IF NOT EXISTS` para las 8 tablas + seed del rol `finance_manager` en `greenhouse.roles` con `route_group_scope: ['finance']`. No depender de ejecución manual de DDLs.
- **Tipo numérico:** Todas las columnas monetarias usan `NUMERIC` (no `FLOAT64`) por precisión financiera. Ver nota al inicio de Parte A.
- **`amount_pending` es calculado, no almacenado.** No existe como columna en `fin_income`. Calcular siempre en query: `total_amount - COALESCE(amount_paid, 0)`.
- **Payroll entries no tiene `member_name`.** El nombre se resuelve via JOIN con `greenhouse.team_members` (`first_name`, `last_name`). Ver query corregido en D2.
- **Branch naming:** `feature/finance-module`
- **Cada push a `develop` genera preview en Vercel.** Usa ese preview para QA visual antes de merge a `main`.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo.*
