# TASK-164 — Purchase Orders (OC) & Service Entry Sheets (HES) Module

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Implementado + DDL ejecutado` |
| Closed | `2026-03-30` |
| Rank | — |
| Domain | Finance / Commercial |
| Sequence | Puede ejecutarse en paralelo con TASK-163 |

## Summary

Crear el módulo de Órdenes de Compra (OC/PO) y Hojas de Entrada de Servicio (HES) como objetos financieros independientes. Hoy `po_number` y `hes_number` son campos de texto libre en cada factura — no hay tracking de la OC ni de la HES como entidades con lifecycle, saldo disponible ni vencimiento. Clientes corporativos chilenos (especialmente los que usan SAP u otros ERP) requieren OC + HES aprobada antes de procesar el pago; sin este módulo, no hay visibilidad del pipeline de facturación.

## Why This Task Exists

### Situación actual

```
Cliente envía OC por email → alguien anota el número en la factura → se pierde el tracking

Problemas:
- No se sabe cuánto saldo queda de una OC
- No se sabe cuándo vence
- No se sabe si una factura ya consumió parte de la OC
- Si hay OC duplicadas nadie lo detecta
- El campo po_number en income es texto libre — sin validación ni link
```

### Flujo operativo real de una agencia

```
1. Cliente aprueba presupuesto/propuesta
2. Cliente emite Orden de Compra (PO/OC) con:
   - Número de OC
   - Monto autorizado
   - Período de vigencia
   - Servicios/conceptos cubiertos
   - Requerimiento de HES (Hoja de Entrada de Servicio) si aplica
3. Agencia factura contra la OC (puede ser 1 o N facturas)
4. Cada factura consume parte del saldo de la OC
5. Cuando el saldo se agota o la OC vence, se necesita una nueva
```

### Valor del módulo

| Capacidad | Beneficio |
|-----------|-----------|
| Saldo de OC en tiempo real | Saber cuánto más se puede facturar sin nueva OC |
| Alerta de vencimiento | Renovar OC antes de que expire y no poder facturar |
| Link OC → Facturas | Auditoría completa de qué se facturó contra cada OC |
| OC como prerequisito | Bloquear facturación si cliente requiere OC y no hay vigente |
| HES tracking | Registrar si el cliente requiere HES y su estado |
| Vista en Space 360 | Account Lead ve estado de OCs de su cliente |

## Dependencies & Impact

- **Depende de:**
  - Finance module existente (income table con `po_number`)
  - Client profiles (para saber qué clientes requieren OC/HES)
  - TASK-163 (para que income tenga los tipos correctos)
- **Impacta a:**
  - Income creation — puede vincular a OC
  - Quotes (TASK-163) — cotización → OC → factura es el flujo completo
  - Space 360 (TASK-142) — tab Services/Finance muestra OCs
  - Client lifecycle (TASK-158) — OC vigente es señal de relación activa
  - Agency Intelligence — OC por vencer es señal de acción

## Scope

### Slice 1 — Data model + CRUD (~3h)

**Tabla `greenhouse_finance.purchase_orders`:**

```sql
CREATE TABLE greenhouse_finance.purchase_orders (
  po_id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  organization_id TEXT,
  space_id TEXT,

  -- Montos
  authorized_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  exchange_rate_to_clp NUMERIC,
  authorized_amount_clp NUMERIC NOT NULL,

  -- Consumo
  invoiced_amount_clp NUMERIC DEFAULT 0,       -- SUM de facturas vinculadas
  remaining_amount_clp NUMERIC,                 -- authorized - invoiced (computed)
  invoice_count INT DEFAULT 0,                  -- COUNT de facturas vinculadas

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'active',        -- active, consumed, expired, cancelled
  issue_date DATE NOT NULL,
  expiry_date DATE,
  received_at TIMESTAMPTZ DEFAULT now(),

  -- HES
  hes_required BOOLEAN DEFAULT FALSE,
  hes_number TEXT,
  hes_date DATE,
  hes_status TEXT DEFAULT 'not_required',       -- not_required, pending, received, approved

  -- Contexto
  description TEXT,
  service_scope TEXT,                            -- qué servicios cubre
  contact_name TEXT,                             -- quién autorizó
  contact_email TEXT,
  notes TEXT,
  attachment_url TEXT,                           -- link al PDF/scan de la OC

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT po_number_client_unique UNIQUE (po_number, client_id)
);

CREATE INDEX idx_po_client_status ON greenhouse_finance.purchase_orders (client_id, status);
CREATE INDEX idx_po_expiry ON greenhouse_finance.purchase_orders (expiry_date) WHERE status = 'active';
```

**API Routes:**

```
GET    /api/finance/purchase-orders              — lista con filtros (client, status, expiring)
POST   /api/finance/purchase-orders              — crear nueva OC
GET    /api/finance/purchase-orders/[id]          — detalle con facturas vinculadas
PUT    /api/finance/purchase-orders/[id]          — actualizar
POST   /api/finance/purchase-orders/[id]/cancel   — cancelar OC
```

### Slice 2 — Link OC → Facturas (~2h)

1. Agregar campo `purchase_order_id` a `greenhouse_finance.income`:
   ```sql
   ALTER TABLE greenhouse_finance.income
   ADD COLUMN IF NOT EXISTS purchase_order_id TEXT
     REFERENCES greenhouse_finance.purchase_orders(po_id);
   ```

2. Al crear/actualizar una factura con `purchase_order_id`:
   - Validar que la OC existe, está `active`, y tiene saldo suficiente
   - Actualizar `invoiced_amount_clp` y `invoice_count` en la OC
   - Si `invoiced_amount_clp >= authorized_amount_clp` → cambiar status a `consumed`

3. Al crear factura: si el client profile tiene `po_required = true` y no se provee `purchase_order_id`:
   - Warning (no bloqueo en v1): "Este cliente requiere OC para facturar"

4. Agregar campo `po_required` a `greenhouse_finance.client_profiles`:
   ```sql
   ALTER TABLE greenhouse_finance.client_profiles
   ADD COLUMN IF NOT EXISTS po_required BOOLEAN DEFAULT FALSE;
   ```

### Slice 3 — Saldo y estado automático (~1.5h)

1. Función `reconcilePurchaseOrderBalance(poId)`:
   - `invoiced_amount_clp = SUM(income.total_amount_clp WHERE purchase_order_id = poId)`
   - `remaining_amount_clp = authorized_amount_clp - invoiced_amount_clp`
   - `invoice_count = COUNT(income WHERE purchase_order_id = poId)`
   - Si consumed → status = 'consumed'

2. Cron o check periódico: OCs con `expiry_date < CURRENT_DATE AND status = 'active'` → status = 'expired'

3. Alerta de vencimiento: OCs con `expiry_date` en los próximos 30 días → notificación

### Slice 4 — UI: Purchase Orders page (~2h)

1. Página `/finance/purchase-orders`
2. Vista con tabla:
   - PO#, Cliente, Monto autorizado, Facturado, Saldo, Status, Vence, HES
   - Status chips: `active` verde, `consumed` info, `expired` error, `cancelled` secondary
   - Saldo con progress bar (facturado / autorizado)
   - Facturas vinculadas expandibles

3. Sidebar Finance: agregar "Órdenes de compra" después de "Cotizaciones"

4. Drawer/dialog para crear nueva OC con campos del modelo

### Slice 5 — Integration con Income creation (~1h)

1. En el form de crear factura:
   - Si el cliente tiene OCs activas, mostrar selector de OC
   - Al seleccionar OC, mostrar saldo disponible
   - Warning si no hay OC y `po_required = true`

2. En Income detail view:
   - Mostrar OC vinculada con link
   - Mostrar saldo restante de la OC

### Slice 6 — Outbox events + notifications + Intelligence (~1h)

1. Eventos:
   - `finance.purchase_order.created`
   - `finance.purchase_order.consumed` (saldo agotado)
   - `finance.purchase_order.expiring` (vence en 30 días)
   - `finance.purchase_order.expired`

2. Notifications:
   - `purchase_order.expiring` → "OC {po_number} de {client} vence en {days} días" → Account Lead + Finance
   - `purchase_order.consumed` → "OC {po_number} de {client} consumida — saldo $0" → Finance

3. Agency Intelligence (futuro):
   - OC por vencer sin renovación → señal de riesgo en Space 360
   - OC consumed sin nueva OC → alerta de facturación bloqueada

### Slice 7 — HES (Hoja de Entrada de Servicio) como objeto independiente (~3h)

La HES es un documento comercial chileno que certifica que un servicio fue recibido y aprobado por el cliente. Es un paso intermedio entre la ejecución del servicio y el pago de la factura. Clientes corporativos (especialmente los que usan SAP u otros ERP) **no pagan sin HES aprobada**.

**Flujo completo:**
```
OC emitida por cliente
  → servicio ejecutado por la agencia
    → HES emitida (certifica recepción del servicio)
      → cliente aprueba HES
        → agencia emite factura contra la OC + HES
          → cliente paga factura
```

**Por qué es objeto independiente (no campo en OC):**
- Una OC puede tener múltiples HES (una por cada entrega/período)
- Una HES puede cubrir una factura o parte de una factura
- La HES tiene su propio lifecycle (emitida → enviada → aprobada → rechazada)
- El tracking de HES determina si se puede facturar

**Tabla `greenhouse_finance.service_entry_sheets`:**

```sql
CREATE TABLE greenhouse_finance.service_entry_sheets (
  hes_id TEXT PRIMARY KEY,
  hes_number TEXT NOT NULL,
  purchase_order_id TEXT REFERENCES greenhouse_finance.purchase_orders(po_id),
  client_id TEXT NOT NULL,
  organization_id TEXT,
  space_id TEXT,

  -- Servicio certificado
  service_description TEXT NOT NULL,
  service_period_start DATE,
  service_period_end DATE,
  deliverables_summary TEXT,           -- qué se entregó/ejecutó

  -- Montos
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  amount_clp NUMERIC NOT NULL,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, submitted, approved, rejected, cancelled
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,                       -- nombre del aprobador en el cliente
  rejection_reason TEXT,

  -- Link a factura
  income_id TEXT,                         -- factura emitida contra esta HES
  invoiced BOOLEAN DEFAULT FALSE,

  -- Contexto
  client_contact_name TEXT,
  client_contact_email TEXT,
  attachment_url TEXT,                    -- PDF/scan de la HES firmada
  notes TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT hes_number_client_unique UNIQUE (hes_number, client_id)
);

CREATE INDEX idx_hes_client_status ON greenhouse_finance.service_entry_sheets (client_id, status);
CREATE INDEX idx_hes_po ON greenhouse_finance.service_entry_sheets (purchase_order_id);
```

**API Routes:**

```
GET    /api/finance/hes                     — lista con filtros (client, status, po)
POST   /api/finance/hes                     — crear nueva HES
GET    /api/finance/hes/[id]                — detalle
PUT    /api/finance/hes/[id]                — actualizar
POST   /api/finance/hes/[id]/submit         — enviar al cliente
POST   /api/finance/hes/[id]/approve        — marcar como aprobada
POST   /api/finance/hes/[id]/reject         — marcar como rechazada (con razón)
```

**Lifecycle:**

```
draft → submitted → approved → (invoiced)
                  → rejected → draft (corregir y reenviar)
                             → cancelled
```

**UI: página `/finance/hes`:**
- Tabla: HES#, Cliente, OC#, Monto, Período, Status, Aprobada por, Facturada
- Status chips: draft gris, submitted info, approved verde, rejected rojo
- Drawer para crear HES vinculada a una OC
- Acción "Aprobar" registra aprobador y fecha
- Acción "Emitir factura" crea income vinculado a la HES + OC

**Integration con facturación:**
- Al crear factura: si cliente requiere HES, mostrar selector de HES aprobadas
- Warning si se intenta facturar sin HES aprobada cuando `hes_required = true` en OC
- Campo `hes_id` en `greenhouse_finance.income`:
  ```sql
  ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS hes_id TEXT
    REFERENCES greenhouse_finance.service_entry_sheets(hes_id);
  ```

**Outbox events:**
- `finance.hes.submitted` — HES enviada al cliente
- `finance.hes.approved` — HES aprobada → puede facturar
- `finance.hes.rejected` — HES rechazada → acción requerida

**Notifications:**
- `hes.approved` → "HES {number} aprobada por {client} — lista para facturar" → Finance + Account
- `hes.rejected` → "HES {number} rechazada: {reason}" → Finance + Account

### Slice 8 — Client profile flags para OC/HES requirements (~30min)

Agregar campos a `greenhouse_finance.client_profiles` o `greenhouse_core.clients`:

```sql
ALTER TABLE greenhouse_finance.client_profiles
ADD COLUMN IF NOT EXISTS po_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hes_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_terms_days INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS billing_notes TEXT;
```

Estos flags determinan:
- `po_required = true` → warning al facturar sin OC
- `hes_required = true` → warning al facturar sin HES aprobada
- `payment_terms_days` → para calcular fecha de vencimiento automática
- `billing_notes` → instrucciones especiales de facturación

Visible en:
- Client profile detail
- Space 360 Finance tab
- Form de creación de factura (como contexto)

## Relación con otros objetos financieros

```
Flujo comercial completo:

  Cotización (TASK-163)
    → aceptada por cliente
    → cliente emite Orden de Compra (TASK-164)
      → servicio ejecutado
        → Hoja de Entrada de Servicio (HES) emitida (TASK-164)
          → cliente aprueba HES
            → agencia factura contra OC + HES (Income)
              → cliente paga factura (Income Payment)
                → reconciliación bancaria (Reconciliation)

Cada paso tiene su tabla, su lifecycle, y su tracking.
```

```
Objetos y sus relaciones:

  Quote ──accepted──→ Purchase Order
                        ├── HES 1 (ene) ──→ Invoice 1
                        ├── HES 2 (feb) ──→ Invoice 2
                        └── HES 3 (mar) ──→ Invoice 3 (pending)

  PO saldo: $15M autorizado, $10M facturado, $5M restante
  HES pendientes: 1 (mar, sin aprobar → no se puede facturar)
```

## Out of Scope

- Aprobación interna de OC/HES (workflow interno) — mejora futura
- OCR/parsing automático de PDF de OC/HES — mejora futura
- Multi-currency en OC (v1: normalizado a CLP) — mejora futura
- Facturación parcial automática contra OC — v1: link manual
- Firma electrónica de HES — mejora futura
- Integración con SAP/ERP del cliente — mejora futura

## Acceptance Criteria

### Órdenes de Compra
- [ ] Tabla `purchase_orders` creada con schema completo
- [ ] CRUD API funcional con validación
- [ ] `purchase_order_id` en `income` vincula facturas a OC
- [ ] Saldo de OC se actualiza automáticamente al facturar
- [ ] Status cambia a `consumed` cuando saldo se agota
- [ ] Status cambia a `expired` cuando vence
- [ ] Alerta 30 días antes de vencimiento
- [ ] `/finance/purchase-orders` muestra lista con progress bars de consumo
- [ ] Form de factura permite seleccionar OC activa
- [ ] Warning si `po_required` y no hay OC
- [ ] Sidebar Finance incluye "Órdenes de compra"

### Hojas de Entrada de Servicio (HES)
- [ ] Tabla `service_entry_sheets` creada con schema completo
- [ ] CRUD API funcional con lifecycle (draft → submitted → approved/rejected)
- [ ] HES vinculada a OC (`purchase_order_id`)
- [ ] `hes_id` en `income` vincula facturas a HES
- [ ] No se puede facturar sin HES aprobada cuando `hes_required = true`
- [ ] `/finance/hes` muestra lista con status chips
- [ ] Acción "Aprobar" registra aprobador y fecha
- [ ] Sidebar Finance incluye "HES"

### Client Profile Flags
- [ ] `po_required` y `hes_required` en client_profiles
- [ ] Flags visibles en client detail y form de facturación

### General
- [ ] Outbox events emitidos (PO: expiring/consumed, HES: submitted/approved/rejected)
- [ ] Notifications configuradas
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## File Reference

| Archivo | Cambio |
|---------|--------|
| `scripts/setup-postgres-purchase-orders.sql` | DDL nueva tabla (nuevo) |
| `src/lib/finance/purchase-order-store.ts` | CRUD + balance reconciliation (nuevo) |
| `src/app/api/finance/purchase-orders/route.ts` | List + Create (nuevo) |
| `src/app/api/finance/purchase-orders/[id]/route.ts` | Detail + Update (nuevo) |
| `src/app/(dashboard)/finance/purchase-orders/page.tsx` | Página (nuevo) |
| `src/views/greenhouse/finance/PurchaseOrdersListView.tsx` | Vista (nuevo) |
| `src/lib/finance/postgres-store-slice2.ts` | Agregar `purchase_order_id` a income |
| `src/views/greenhouse/finance/IncomeListView.tsx` | Selector de OC en creation |
| `src/lib/sync/event-catalog.ts` | Nuevos event types |
| `src/lib/webhooks/consumers/notification-mapping.ts` | Mappings PO expiring/consumed + HES approved/rejected |
| `src/lib/finance/hes-store.ts` | HES CRUD + lifecycle (nuevo) |
| `src/app/api/finance/hes/route.ts` | HES List + Create (nuevo) |
| `src/app/api/finance/hes/[id]/route.ts` | HES Detail + Update (nuevo) |
| `src/app/api/finance/hes/[id]/approve/route.ts` | HES Approve (nuevo) |
| `src/app/api/finance/hes/[id]/reject/route.ts` | HES Reject (nuevo) |
| `src/app/(dashboard)/finance/hes/page.tsx` | Página HES (nuevo) |
| `src/views/greenhouse/finance/HesListView.tsx` | Vista HES (nuevo) |
