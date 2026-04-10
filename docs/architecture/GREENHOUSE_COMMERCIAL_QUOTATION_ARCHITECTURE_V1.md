# Greenhouse EO — Commercial Quotation Module Architecture V1

> **Version:** 1.0
> **Created:** 2026-04-09
> **Audience:** Backend engineers, product owners, agents implementing quotation features
> **Related:** `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`, `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

---

## 1. Vision y proposito

El modulo de cotizaciones es el puente entre **lo que cuesta operar** (payroll, overhead, assignments) y **lo que se le cobra al cliente** (precio, condiciones, documentos). Cierra el ciclo `cotizado → vendido → ejecutado → medido` que hoy tiene un gap entre finance (que mide margen post-facto) y operaciones (que asigna personas sin pricing formal).

### Principios de diseno

1. **El costo viene del sistema, no del usuario** — el costo loaded por persona se deriva de payroll + overhead. El comercial solo define precio y margen; no inventa costos.
2. **HubSpot es CRM, Greenhouse es pricing** — los deals y productos se sincronizan bidireccionalmente, pero costo/margen nunca salen de Greenhouse.
3. **El catalogo es local-first** — productos viven en PG con sync opcional a HubSpot. No depender del CRM para cotizar.
4. **La cotizacion genera la cadena documental** — Cotizacion → OC → HES → Factura. Cada eslabon tiene su lifecycle independiente.
5. **Descuentos saludables por construccion** — el sistema calcula el impacto del descuento sobre el margen y bloquea o alerta antes de generar perdida.

---

## 2. Modelos de pricing

Efeonce opera con 4 business lines y 3 modelos de pricing:

| Modelo | Que se vende | Ejemplo | Facturacion |
|--------|-------------|---------|-------------|
| **Staff Augmentation** | Personas nombradas con tarifa/hora | "Maria Gonzalez, Lead Dev, $85/h, 160h/mes" | Mensual anticipada |
| **Retainer** | Paquete de capacidad sin nombrar personas | "Agencia creativa, 80h produccion/mes, $9.6M/mes" | Mensual, requiere HES en clientes enterprise |
| **Proyecto On-demand** | Entregable con scope cerrado | "Rediseno sitio web, $15M total en 4 hitos" | Por hito, requiere HES |

Los 3 modelos comparten la misma estructura de datos (quotation + line items). Lo que cambia es:
- `line_type` de los items (person vs role vs deliverable)
- Lo que se muestra en el PDF
- El billing frequency (monthly vs milestone vs one_time)

---

## 3. Schema: `greenhouse_commercial`

Nuevo schema dedicado. Ownership: `greenhouse_ops`.

### 3.1. Margin targets (configuracion por business line)

```sql
CREATE TABLE greenhouse_commercial.margin_targets (
  target_id        TEXT PRIMARY KEY DEFAULT 'mt-' || gen_random_uuid(),
  business_line_code TEXT NOT NULL,       -- EO-BL-WAVE, EO-BL-GLOBE, etc.
  target_margin_pct  NUMERIC(5,2) NOT NULL,
  floor_margin_pct   NUMERIC(5,2) NOT NULL,
  effective_from     DATE NOT NULL,
  effective_until    DATE,                -- null = vigente indefinidamente
  created_by         TEXT NOT NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT margin_targets_floor_lte_target CHECK (floor_margin_pct <= target_margin_pct)
);

CREATE INDEX idx_margin_targets_bl_date ON greenhouse_commercial.margin_targets (business_line_code, effective_from);
```

Valores iniciales sugeridos:

| Business Line | Target | Floor |
|--------------|--------|-------|
| Wave | 28% | 20% |
| Reach | 18% | 10% |
| Globe | 40% | 25% |
| Efeonce Digital | 35% | 20% |

### 3.2. Product catalog

```sql
CREATE TABLE greenhouse_commercial.product_catalog (
  product_id          TEXT PRIMARY KEY DEFAULT 'prd-' || gen_random_uuid(),
  hubspot_product_id  TEXT,               -- nullable; null = solo local
  product_code        TEXT NOT NULL UNIQUE, -- "EO-PRD-RETAINER-CREATIVO-80H"
  product_name        TEXT NOT NULL,
  product_type        TEXT NOT NULL CHECK (product_type IN ('service', 'deliverable', 'license', 'infrastructure')),
  pricing_model       TEXT CHECK (pricing_model IN ('staff_aug', 'retainer', 'project', 'fixed')),
  business_line_code  TEXT,               -- sugerencia, no constraint
  default_currency    TEXT NOT NULL DEFAULT 'CLP' CHECK (default_currency IN ('CLP', 'USD', 'CLF')),
  default_unit_price  NUMERIC(14,2),
  default_unit        TEXT NOT NULL DEFAULT 'hour' CHECK (default_unit IN ('hour', 'month', 'unit', 'project')),
  suggested_role_code TEXT,               -- rol sugerido para costeo
  suggested_hours     NUMERIC(8,2),
  description         TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sync_status         TEXT NOT NULL DEFAULT 'local_only' CHECK (sync_status IN ('synced', 'local_only', 'pending_sync')),
  sync_direction      TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'greenhouse_only', 'hubspot_only')),
  last_synced_at      TIMESTAMPTZ,
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_catalog_hs ON greenhouse_commercial.product_catalog (hubspot_product_id) WHERE hubspot_product_id IS NOT NULL;
CREATE INDEX idx_product_catalog_bl ON greenhouse_commercial.product_catalog (business_line_code) WHERE business_line_code IS NOT NULL;
```

**Tres capas de productos:**
1. **Sync desde HubSpot** — `hubspot_product_id` != null, `sync_status = 'synced'`
2. **Creado en Greenhouse, synced a HubSpot** — `hubspot_product_id` != null, `sync_status = 'synced'`, originado local
3. **Solo local** — `hubspot_product_id` is null, `sync_status = 'local_only'`

### 3.3. Product overhead defaults

Overhead directo por defecto asociado a un producto del catalogo (licencias incluidas):

```sql
CREATE TABLE greenhouse_commercial.product_overhead_defaults (
  default_id    TEXT PRIMARY KEY DEFAULT 'pod-' || gen_random_uuid(),
  product_id    TEXT NOT NULL REFERENCES greenhouse_commercial.product_catalog(product_id),
  label         TEXT NOT NULL,            -- "Licencia Adobe Creative Cloud"
  monthly_cost  NUMERIC(14,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4. Quotations

```sql
CREATE TABLE greenhouse_commercial.quotations (
  quotation_id         TEXT PRIMARY KEY DEFAULT 'qt-' || gen_random_uuid(),
  quotation_number     TEXT NOT NULL UNIQUE, -- "GH-2026-0042"
  organization_id      TEXT NOT NULL,        -- FK logico → greenhouse_core.organizations
  space_id             TEXT,                 -- nullable, para contexto de space especifico
  client_id            TEXT,                 -- nullable, para lookup de costos
  business_line_code   TEXT NOT NULL,
  pricing_model        TEXT NOT NULL CHECK (pricing_model IN ('staff_aug', 'retainer', 'project')),

  -- Status
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
  current_version      INTEGER NOT NULL DEFAULT 1,

  -- Moneda y tipo de cambio
  currency             TEXT NOT NULL DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD', 'CLF')),
  exchange_rates       JSONB NOT NULL DEFAULT '{}',
  exchange_snapshot_date DATE,

  -- Margen
  target_margin_pct    NUMERIC(5,2),         -- heredado de margin_targets, sobreescribible
  margin_floor_pct     NUMERIC(5,2),         -- heredado, sobreescribible

  -- Descuentos globales
  global_discount_type TEXT CHECK (global_discount_type IN ('percentage', 'fixed_amount')),
  global_discount_value NUMERIC(14,2),       -- % o monto segun type

  -- Totales (calculados, denormalizados para queries rapidas)
  total_cost           NUMERIC(14,2),
  total_price_before_discount NUMERIC(14,2),
  total_discount       NUMERIC(14,2),
  total_price          NUMERIC(14,2),
  effective_margin_pct NUMERIC(5,2),

  -- Validez y condiciones
  valid_until          DATE,
  contract_duration_months INTEGER,
  billing_frequency    TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'milestone', 'one_time')),
  payment_terms_days   INTEGER NOT NULL DEFAULT 30,
  conditions_text      TEXT,                 -- texto libre para el PDF
  internal_notes       TEXT,                 -- solo admin, no va al PDF

  -- Escalamiento
  escalation_mode      TEXT DEFAULT 'none' CHECK (escalation_mode IN ('none', 'automatic_ipc', 'negotiated')),
  escalation_pct       NUMERIC(5,2),         -- solo si mode = negotiated
  escalation_frequency_months INTEGER,       -- meses entre ajustes
  escalation_base_date DATE,

  -- Integraciones
  hubspot_deal_id      TEXT,                 -- sync bidireccional

  -- Auditoria
  created_by           TEXT NOT NULL,
  approved_by          TEXT,
  sent_at              TIMESTAMPTZ,
  approved_at          TIMESTAMPTZ,
  expired_at           TIMESTAMPTZ,
  converted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotations_org ON greenhouse_commercial.quotations (organization_id);
CREATE INDEX idx_quotations_status ON greenhouse_commercial.quotations (status);
CREATE INDEX idx_quotations_hs_deal ON greenhouse_commercial.quotations (hubspot_deal_id) WHERE hubspot_deal_id IS NOT NULL;
```

### 3.5. Quotation versions

```sql
CREATE TABLE greenhouse_commercial.quotation_versions (
  version_id           TEXT PRIMARY KEY DEFAULT 'qv-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  version_number       INTEGER NOT NULL,
  snapshot_json        JSONB NOT NULL,       -- copia completa de line items al crear version
  diff_from_previous   JSONB,               -- delta calculado automaticamente
  total_cost           NUMERIC(14,2),
  total_price          NUMERIC(14,2),
  total_discount       NUMERIC(14,2),
  effective_margin_pct NUMERIC(5,2),
  created_by           TEXT NOT NULL,
  notes                TEXT,                 -- "Ajuste de tarifa por pedido del cliente"
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quotation_id, version_number)
);
```

### 3.6. Quotation line items

```sql
CREATE TABLE greenhouse_commercial.quotation_line_items (
  line_item_id         TEXT PRIMARY KEY DEFAULT 'qli-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  version_number       INTEGER NOT NULL,

  -- Origen
  product_id           TEXT REFERENCES greenhouse_commercial.product_catalog(product_id),
  hubspot_line_item_id TEXT,                -- sync bidireccional
  line_type            TEXT NOT NULL CHECK (line_type IN ('person', 'role', 'deliverable', 'direct_cost')),
  sort_order           INTEGER NOT NULL DEFAULT 0,

  -- Presentacion (lo que aparece en el PDF)
  label                TEXT NOT NULL,
  description          TEXT,

  -- Asignacion (staff aug)
  member_id            TEXT,                 -- nullable; solo staff aug con persona nombrada
  role_code            TEXT,                 -- para retainer/proyecto sin persona
  fte_allocation       NUMERIC(4,2),         -- 0.50, 1.00
  hours_estimated      NUMERIC(8,2),
  unit                 TEXT NOT NULL DEFAULT 'hour' CHECK (unit IN ('hour', 'month', 'unit', 'project')),
  quantity             NUMERIC(10,2) NOT NULL DEFAULT 1,

  -- Costeo (calculado desde payroll + overhead; no editable por comercial)
  unit_cost            NUMERIC(14,2),        -- costo loaded por unidad
  cost_breakdown       JSONB,               -- { salary, employer_costs, direct_overhead, structural_overhead }
  subtotal_cost        NUMERIC(14,2),        -- unit_cost * quantity

  -- Pricing (editable por comercial)
  unit_price           NUMERIC(14,2),        -- manual o calculado con margen
  subtotal_price       NUMERIC(14,2),        -- unit_price * quantity

  -- Descuento por item
  discount_type        TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value       NUMERIC(14,2),
  discount_amount      NUMERIC(14,2),        -- monto calculado del descuento
  subtotal_after_discount NUMERIC(14,2),     -- subtotal_price - discount_amount

  -- Margen
  margin_pct           NUMERIC(5,2),         -- nullable; hereda de cotizacion si null
  effective_margin_pct NUMERIC(5,2),         -- derivado: (price_after_discount - cost) / price_after_discount

  -- Moneda (hereda de cotizacion; override para items multi-moneda)
  currency             TEXT,

  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qli_quotation ON greenhouse_commercial.quotation_line_items (quotation_id, version_number);
```

### 3.7. Purchase orders (OC)

```sql
CREATE TABLE greenhouse_commercial.purchase_orders (
  po_id                TEXT PRIMARY KEY DEFAULT 'po-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  po_number            TEXT NOT NULL,        -- numero de OC del cliente
  po_date              DATE NOT NULL,
  po_amount            NUMERIC(14,2) NOT NULL,
  po_currency          TEXT NOT NULL DEFAULT 'CLP',
  po_document_asset_id TEXT,                 -- FK logico → media assets (PDF subido)
  status               TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'active', 'completed', 'cancelled')),
  received_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes                TEXT,
  created_by           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_quotation ON greenhouse_commercial.purchase_orders (quotation_id);
```

### 3.8. Service entries (HES)

```sql
CREATE TABLE greenhouse_commercial.service_entries (
  entry_id             TEXT PRIMARY KEY DEFAULT 'hes-' || gen_random_uuid(),
  quotation_id         TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  po_id                TEXT REFERENCES greenhouse_commercial.purchase_orders(po_id),
  period_label         TEXT NOT NULL,        -- "Abril 2026" o "Hito 1: Discovery"
  period_start         DATE,
  period_end           DATE,
  amount_authorized    NUMERIC(14,2) NOT NULL, -- puede diferir del cotizado
  currency             TEXT NOT NULL DEFAULT 'CLP',
  hes_number           TEXT,
  hes_document_asset_id TEXT,                -- FK logico → media assets (PDF subido)
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'invoiced')),
  invoice_trigger      BOOLEAN NOT NULL DEFAULT FALSE,
  nubox_invoice_id     TEXT,                 -- se llena al facturar
  received_at          TIMESTAMPTZ,
  invoiced_at          TIMESTAMPTZ,
  notes                TEXT,
  created_by           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hes_quotation ON greenhouse_commercial.service_entries (quotation_id);
CREATE INDEX idx_hes_status ON greenhouse_commercial.service_entries (status);
```

---

## 4. Costeo automatico

### 4.1. Costo loaded por persona

El sistema deriva el costo desde `member_capacity_economics` (ya materializado):

```
unit_cost = cost_per_hour_target
          = (loaded_cost_target / contracted_hours_month)
```

Donde `loaded_cost_target` ya incluye:
- Salario bruto
- Cargas empleador (AFP, salud, seguro cesantia, mutual)
- Bonificaciones
- Overhead directo prorrateado (licencias, equipo)
- Overhead estructural prorrateado (oficina, infra compartida)

Fuente: `greenhouse_hr.member_capacity_economics` via `src/lib/member-capacity-economics/store.ts`.

### 4.2. Dos capas de overhead

| Capa | Atribucion | Ejemplos | Como se calcula |
|------|-----------|----------|----------------|
| **Overhead directo** | Por persona, real y trazable | Adobe ($55/mes), Figma ($15/mes), GitHub Copilot ($19/mes), equipo amortizado | Suma de licencias/tools asignadas al miembro |
| **Overhead estructural** | Por BU o global, prorrateado | Oficina, internet, contador, seguros | Total overhead BU / personas activas BU / horas mes |

Ambas capas ya estan incluidas en `loaded_cost_target`. El `cost_breakdown` JSONB del line item desglosa:

```json
{
  "salary_component": 1200000,
  "employer_costs": 324000,
  "direct_overhead": 55000,
  "structural_overhead": 180000,
  "loaded_total": 1759000,
  "cost_per_hour": 10994,
  "source_period": "2026-04",
  "currency": "CLP"
}
```

### 4.3. Costeo de roles genericos (sin persona asignada)

Para retainers y proyectos donde se cotiza un "Disenador Senior" sin nombrar persona:

1. El sistema busca el costo promedio de personas con ese `role_code` en la BU correspondiente
2. Si no hay datos, usa un rate card configurable por BU + seniority
3. El admin puede sobreescribir el unit_cost manualmente

```sql
CREATE TABLE greenhouse_commercial.role_rate_cards (
  rate_card_id       TEXT PRIMARY KEY DEFAULT 'rrc-' || gen_random_uuid(),
  business_line_code TEXT NOT NULL,
  role_code          TEXT NOT NULL,
  seniority_level    TEXT NOT NULL,         -- junior, mid, senior, lead
  hourly_rate_cost   NUMERIC(14,2) NOT NULL, -- costo estimado/hora
  currency           TEXT NOT NULL DEFAULT 'CLP',
  effective_from     DATE NOT NULL,
  effective_until    DATE,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_line_code, role_code, seniority_level, effective_from)
);
```

---

## 5. Descuentos: modelo y guardrails

### 5.1. Tipos de descuento

| Nivel | Tipo | Ejemplo |
|-------|------|---------|
| **Por line item** | Porcentaje | "10% descuento en horas de QA" |
| **Por line item** | Monto fijo | "$200.000 de descuento en este item" |
| **Por cotizacion** | Porcentaje | "5% descuento global" |
| **Por cotizacion** | Monto fijo | "$500.000 descuento total" |

Los descuentos se **acumulan**: si un item tiene 10% descuento y la cotizacion tiene 5% adicional, el item final tiene ambos aplicados.

Orden de aplicacion:
1. Calcular `subtotal_price` de cada item (`unit_price * quantity`)
2. Aplicar descuento por item → `subtotal_after_discount`
3. Sumar todos los `subtotal_after_discount` → `total_price_before_global_discount`
4. Aplicar descuento global → `total_price`

### 5.2. CRUD de descuentos

Los descuentos son campos del line item y de la cotizacion, no entidades separadas. El CRUD es:

- **Crear:** al agregar un line item, opcionalmente se define `discount_type` + `discount_value`
- **Leer:** el sistema calcula y persiste `discount_amount` y `subtotal_after_discount`
- **Actualizar:** el comercial puede cambiar el descuento en cualquier momento mientras la cotizacion esta en `draft`
- **Eliminar:** poner `discount_type = null` y `discount_value = null`

Para descuento global: mismos campos en la tabla `quotations` (`global_discount_type`, `global_discount_value`).

### 5.3. Guardrail de salud: el discount health checker

Cada vez que se modifica un descuento (item o global), el sistema recalcula y evalua:

```typescript
interface DiscountHealthResult {
  healthy: boolean
  quotationMarginPct: number
  marginFloorPct: number
  marginTargetPct: number
  deltaFromFloor: number           // puede ser negativo
  deltaFromTarget: number
  alerts: DiscountAlert[]
}

type DiscountAlert =
  | { level: 'error'; code: 'margin_below_zero'; message: string; affectedItems: string[] }
  | { level: 'error'; code: 'margin_below_floor'; message: string; requiredApproval: 'finance' }
  | { level: 'warning'; code: 'margin_below_target'; message: string; deltaFromTarget: number }
  | { level: 'warning'; code: 'item_negative_margin'; message: string; itemId: string }
  | { level: 'info'; code: 'discount_exceeds_threshold'; message: string; discountPct: number }
```

**Reglas de bloqueo:**

| Condicion | Nivel | Efecto |
|-----------|-------|--------|
| Margen efectivo < 0% (perdida) | `error` | **Bloquea envio.** No se puede enviar la cotizacion. |
| Margen efectivo < floor de la BL | `error` | **Requiere aprobacion de Finance** para enviar. |
| Margen efectivo < target de la BL | `warning` | Alerta visual pero permite enviar. |
| Un item individual tiene margen < 0% | `warning` | Flag rojo en el item. No bloquea si el total es sano. |
| Descuento total > 25% del subtotal | `info` | Nota informativa: "Descuento significativo (28%)". |

El health check se ejecuta:
- Al guardar un draft (calculo en backend)
- En tiempo real en la UI (calculo en frontend con los mismos datos)
- Antes de cambiar status a `sent` (validacion server-side bloqueante)

---

## 6. Multi-moneda

### 6.1. Monedas soportadas

| Moneda | ISO | Rol | Fuente de conversion |
|--------|-----|-----|---------------------|
| CLP | CLP | Moneda operativa interna (costos Chile) | Base |
| USD | USD | Moneda operativa intl + cotizacion extranjero | `economic_indicators` (ya sincronizado) |
| UF | CLF | Moneda de cotizacion Chile (indexada) | `economic_indicators` (ya sincronizado) |

### 6.2. Snapshot de tipo de cambio

Al crear o enviar una cotizacion, se fija el tipo de cambio del dia:

```json
{
  "clp_usd": 920.50,
  "clf_clp": 38245.60,
  "snapshot_date": "2026-04-09",
  "source": "economic_indicators"
}
```

Esto asegura que los numeros de la cotizacion no cambian si el dolar sube al dia siguiente. Al facturar (HES → Nubox), se usa el tipo de cambio **del dia de facturacion** — la diferencia cambiaria se registra en finance.

### 6.3. Presentacion por moneda

- **Capa interna (admin):** siempre ve costo en CLP (moneda base de payroll Chile). Si el costo es USD (persona internacional), se convierte al TC del snapshot.
- **Capa cliente (PDF):** ve precio en la moneda de la cotizacion (CLP, USD, o UF). Los montos se formatean con `Intl.NumberFormat` segun la moneda.

---

## 7. Escalamiento (IPC / ajuste periodico)

```sql
-- Campos en quotations
escalation_mode              TEXT    -- 'none' | 'automatic_ipc' | 'negotiated'
escalation_pct               NUMERIC -- solo si mode = 'negotiated'
escalation_frequency_months  INTEGER -- meses entre ajustes (tipico: 12)
escalation_base_date         DATE    -- desde cuando cuenta
```

**Modo `automatic_ipc`:** al cumplirse el `escalation_frequency_months` desde la `base_date`, el sistema:
1. Consulta el IPC acumulado desde la base date (fuente: `economic_indicators`)
2. Genera una nueva version de la cotizacion con precios ajustados
3. Notifica al comercial para revision y envio

**Modo `negotiated`:** aplica el `escalation_pct` fijo al cumplirse la frecuencia. Mismo flujo de nueva version.

**Modo `none`:** sin ajuste. El precio se mantiene hasta renegociacion manual.

---

## 8. Versionamiento y diff

### 8.1. Crear una nueva version

Al editar una cotizacion que ya fue enviada (o para crear una revision):

1. El sistema clona todos los `quotation_line_items` del `current_version`
2. Incrementa `current_version` en la cotizacion
3. Crea un registro en `quotation_versions` con:
   - `snapshot_json`: copia completa de los line items de la version anterior
   - `diff_from_previous`: null (se calcula despues del edit)

4. El comercial edita los items de la nueva version
5. Al guardar, el sistema calcula el diff automaticamente

### 8.2. Calculo del diff

```typescript
interface VersionDiff {
  added: Array<{ label: string; unitPrice: number; quantity: number }>
  removed: Array<{ label: string; unitPrice: number; quantity: number }>
  changed: Array<{
    label: string
    field: string
    oldValue: string | number
    newValue: string | number
    deltaPct: number | null
  }>
  impact: {
    previousTotal: number
    currentTotal: number
    deltaPct: number
    previousMargin: number
    currentMargin: number
    marginDelta: number
  }
}
```

### 8.3. Que versiones se muestran

- **PDF:** siempre la version vigente (la ultima enviada o la del current_version)
- **Vista admin:** timeline de versiones con diff entre cada par consecutivo
- **HubSpot:** el deal amount se actualiza con el total de la version vigente

---

## 9. Integraciones

### 9.1. HubSpot — deals y line items

**Sync bidireccional de deals:**

| Campo | Direccion | Detalle |
|-------|-----------|---------|
| Deal amount | GH → HS | `total_price` de la cotizacion |
| Deal stage | Bidireccional | Mapping: draft→proposal, sent→proposal_sent, approved→closed_won, rejected→closed_lost |
| Deal line items | GH ↔ HS | Linked a `product_catalog` via `hubspot_product_id` |
| Deal contacts | HS → GH | El deal ya tiene contactos; se leen para contexto |
| Notes/attachments | GH → HS | PDF se adjunta como engagement note |

**Sync bidireccional de productos:**

| Evento | Direccion | Accion |
|--------|-----------|--------|
| Producto creado en HS | HS → GH | Crear en `product_catalog` con `sync_status = 'synced'` |
| Producto creado en GH (con sync) | GH → HS | Crear en HubSpot, guardar `hubspot_product_id` |
| Producto actualizado | Bidireccional | Actualizar nombre, precio default, descripcion |
| Producto eliminado en HS | HS → GH | Marcar `active = false` en GH (soft delete) |

**Infraestructura:** reutiliza el Cloud Run `hubspot-greenhouse-integration` service. Se agregan endpoints:
- `POST /deals/sync` — sync deal desde/hacia Greenhouse
- `POST /products/sync` — sync producto (ya parcialmente existente)

### 9.2. Nubox — facturacion

Trigger: cuando un `service_entry` cambia a `status = 'invoiced'` con `invoice_trigger = true`:

1. Greenhouse compila los datos de facturacion:
   - RUT cliente (desde `organization.tax_id`)
   - Detalle de items (desde `quotation_line_items` de la version vigente)
   - Monto autorizado (desde `service_entry.amount_authorized`)
   - Moneda y tipo de cambio del dia de facturacion
2. Llama a Nubox API `POST /v1/sales` (endpoint ya documentado en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`)
3. Registra el `nubox_invoice_id` en el service entry
4. Crea un registro en `greenhouse_finance.income` (flujo existente)
5. Publica evento `commercial.invoice.generated` al outbox

---

## 10. Generacion de PDF

### 10.1. Stack tecnico

- **Renderizado:** React Email components (mismo stack que los emails transaccionales)
- **Generacion PDF:** `@react-pdf/renderer` o Puppeteer headless sobre el HTML de React Email
- **Storage:** `greenhouse-media` bucket (mismo que logos y attachments)
- **Entrega:** descarga directa desde Greenhouse + attachment a deal de HubSpot

### 10.2. Formatos por pricing model

Tres templates comparten el mismo shell visual (header con logo, numero, fecha, cliente):

| Modelo | Que muestra al cliente | Que NO muestra |
|--------|----------------------|---------------|
| Staff Aug | Nombre persona (o "Por asignar"), rol, dedicacion, tarifa/hora, subtotal | Costo interno, margen, overhead, salary |
| Retainer | Conceptos de servicio, horas incluidas, fee mensual | Personas, costos, margen |
| Proyecto | Fases, entregables, precio por fase, forma de pago | Horas estimadas por rol, costos internos |

### 10.3. Secciones del PDF

1. **Header:** logo Efeonce, numero cotizacion, version, fecha, validez
2. **Cliente:** nombre organizacion, contacto, direccion (si disponible)
3. **Cuerpo:** segun pricing model (ver arriba)
4. **Totales:** subtotal, descuentos (si aplica), total, moneda
5. **Condiciones:** texto libre (`conditions_text`) + condiciones default por BL
6. **Footer:** datos fiscales Efeonce, contacto comercial

---

## 11. Cadena documental completa

```
COTIZACION          OC                  HES                 FACTURA
──────────          ──                  ───                 ───────

Draft
  │
  ├── v1, v2...
  │
Enviada ──────→  [Cliente evalua]
  │
  ├── Aprobada
  │     │
  │     └────→  OC recibida ─────→  HES periodo 1 ───→  Factura Nubox
  │              (PDF upload)        (PDF upload)         (DTE emitido)
  │              po_number           amount_authorized     → finance.income
  │              po_amount           hes_number
  │                                       │
  │                                  HES periodo 2 ───→  Factura Nubox
  │                                  HES periodo 3 ───→  Factura Nubox
  │                                  ...
  │
  ├── Rechazada → [fin o nueva version]
  │
  └── Expirada → [fin o renovacion]
```

**Rama simple (sin OC/HES):**

```
Cotizacion aprobada → Servicio activo → Facturar mensual directo via Nubox
```

**Rama enterprise (con OC + HES):**

```
Cotizacion aprobada → OC recibida → Mes 1: HES → Facturar
                                     Mes 2: HES → Facturar
                                     ...
```

El sistema detecta cual rama aplica segun si `purchase_orders` tiene registros para esa cotizacion.

---

## 12. Eventos outbox

| Evento | Trigger | Consumers |
|--------|---------|-----------|
| `commercial.quotation.created` | Crear draft | Notifications → Account Lead |
| `commercial.quotation.sent` | Enviar al cliente | HubSpot sync (deal stage), Notifications |
| `commercial.quotation.approved` | Marcar aprobada | HubSpot sync, crear service module, crear assignments |
| `commercial.quotation.rejected` | Marcar rechazada | HubSpot sync, Notifications |
| `commercial.quotation.version_created` | Crear nueva version | HubSpot sync (update amount) |
| `commercial.purchase_order.received` | Registrar OC | Notifications → Finance |
| `commercial.service_entry.received` | Registrar HES | Notifications → Finance |
| `commercial.service_entry.invoiced` | Facturar | Nubox integration, finance.income |
| `commercial.product.created` | Crear producto | HubSpot sync (si sync habilitado) |
| `commercial.product.updated` | Actualizar producto | HubSpot sync |
| `commercial.discount.health_alert` | Descuento riesgoso | Notifications → Finance |

---

## 13. Permisos

| Accion | Roles permitidos |
|--------|-----------------|
| Ver cotizaciones de su organizacion | Account Lead, Ops Lead, Finance, Efeonce Admin |
| Crear cotizacion draft | Account Lead, Ops Lead |
| Editar line items y precios | Account Lead, Finance |
| Ver costos y margenes (capa interna) | Finance, Efeonce Admin |
| Aplicar descuentos | Account Lead, Finance |
| Enviar cotizacion (generar PDF) | Account Lead |
| Aprobar cotizacion debajo del floor | Solo Finance |
| Registrar OC recibida | Account Lead, Ops Lead |
| Registrar HES recibida | Ops Lead, Delivery Lead |
| Trigger facturacion (Nubox) | Finance |
| CRUD de product catalog | Finance, Efeonce Admin |
| CRUD de margin targets | Efeonce Admin |
| CRUD de role rate cards | Finance, Efeonce Admin |

---

## 14. API routes

```
/api/commercial/quotations                    GET (list), POST (create)
/api/commercial/quotations/[id]               GET, PUT, DELETE
/api/commercial/quotations/[id]/send          POST (generar PDF + cambiar status)
/api/commercial/quotations/[id]/approve       POST
/api/commercial/quotations/[id]/reject        POST
/api/commercial/quotations/[id]/version       POST (crear nueva version)
/api/commercial/quotations/[id]/versions      GET (historial de versiones + diffs)
/api/commercial/quotations/[id]/pdf           GET (descargar PDF de version vigente)
/api/commercial/quotations/[id]/health        GET (discount health check)
/api/commercial/quotations/[id]/line-items    GET, POST
/api/commercial/quotations/[id]/line-items/[itemId]  PUT, DELETE

/api/commercial/purchase-orders               GET (list by quotation)
/api/commercial/purchase-orders/[id]          GET, POST, PUT

/api/commercial/service-entries               GET (list by quotation/PO)
/api/commercial/service-entries/[id]          GET, POST, PUT
/api/commercial/service-entries/[id]/invoice  POST (trigger facturacion)

/api/commercial/products                      GET (catalog), POST
/api/commercial/products/[id]                 GET, PUT, DELETE
/api/commercial/products/[id]/sync            POST (sync a HubSpot)

/api/commercial/margin-targets                GET, POST
/api/commercial/margin-targets/[id]           PUT

/api/commercial/rate-cards                    GET, POST
/api/commercial/rate-cards/[id]               PUT, DELETE
```

---

## 15. Relacion con modulos existentes

```
                    ┌─────────────────┐
                    │    Payroll +     │
                    │  Capacity Econ   │
                    │ (costo loaded)   │
                    └────────┬────────┘
                             │ unit_cost
                             ▼
┌──────────┐     ┌───────────────────────┐     ┌──────────────┐
│ HubSpot  │◄───►│  COMMERCIAL MODULE    │────►│   Nubox      │
│ (deals,  │     │                       │     │ (facturacion)│
│ products)│     │  product_catalog      │     └──────────────┘
└──────────┘     │  quotations           │              │
                 │  line_items           │              ▼
                 │  purchase_orders      │     ┌──────────────┐
                 │  service_entries      │     │   Finance    │
                 │  margin_targets       │────►│   (income,   │
                 │  rate_cards           │     │    P&L)      │
                 └───────────────────────┘     └──────────────┘
                             │
                             │ assignments
                             ▼
                    ┌─────────────────┐
                    │   Agency /      │
                    │   Space 360     │
                    │ (team, delivery)│
                    └─────────────────┘
```

---

## 16. Glosario

| Termino | Significado |
|---------|------------|
| **Cotizacion** | Oferta formal de precio a un cliente. Tiene versiones, line items y status |
| **OC (Orden de Compra)** | Documento del cliente que aprueba la cotizacion. Tiene numero, monto y PDF |
| **HES (Hoja de Entrada de Servicio)** | Documento del cliente que confirma la entrega del servicio en un periodo. Autoriza la facturacion |
| **Line item** | Un renglon de la cotizacion. Puede ser persona, rol, entregable o costo directo |
| **Producto** | Item del catalogo reutilizable. Puede estar synced con HubSpot |
| **Costo loaded** | Costo total de una persona: salario + cargas empleador + overhead directo + overhead estructural |
| **Margin target** | Margen objetivo por business line. Se hereda a cotizaciones como default |
| **Margin floor** | Margen minimo aceptable. Debajo de el, se requiere aprobacion de Finance |
| **Rate card** | Tarifa de referencia por rol + seniority + BL. Se usa cuando no hay persona asignada |
| **Escalamiento** | Ajuste periodico de precios por IPC o porcentaje negociado |
| **Discount health** | Evaluacion automatica del impacto del descuento sobre el margen |
