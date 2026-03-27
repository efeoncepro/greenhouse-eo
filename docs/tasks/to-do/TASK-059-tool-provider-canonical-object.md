# TASK-059 — Tool Provider: Objeto Canónico Cross-Module

## Delta 2026-03-26
- TASK-057 cerrada: `direct_overhead_target` ya consume AI tooling + Finance expenses con taxonomía canónica (`DIRECT_OVERHEAD_SCOPES`, `DIRECT_OVERHEAD_KINDS`)
- El acceptance criterion "TASK-057 consume `tool_member_licenses` para `direct_overhead_target`" ya está resuelto con `greenhouse_ai.member_tool_licenses` — cuando TASK-059 migre a `greenhouse_core.tool_member_licenses`, el reader solo necesita cambiar el schema prefix
- La guardia de deduplicación ya existe: Finance expenses con `direct_overhead_kind IN ('tool_license', 'tool_usage')` se excluyen del reader para no duplicar AI tooling

## Estado

Pendiente. Diseño documentado. No bloquea operación actual — el AI Tools module funciona para AI vendors y TASK-057 cubre direct overhead sin necesidad de este objeto.

## Context

Efeonce usa ~15 herramientas de software (Anthropic, Notion, HubSpot, Figma, Frame.io, Freepik, Vercel, GCP, etc.) que hoy viven dispersas en 3 lugares:

1. **`fin_suppliers`** — directorio de pagos. Solo sabe "a quién le pagamos"
2. **AI Tools module** (`AiProvider` + `AiTool`) — catálogo rico pero limitado a "AI vendors"
3. **Integration status** — hardcoded en PersonLeftSidebar (Microsoft, Notion, HubSpot)

Ninguno conecta las 3 dimensiones: **quién lo usa** (People), **cuánto cuesta** (Finance), **para qué cliente** (Services).

## Por qué objeto canónico

Un Tool Provider cruza 10 módulos. No es un registro de Finance ni una feature de People — es una entidad que vive en el core (`greenhouse_core`) y que cada módulo consume desde su perspectiva.

## Modelo de datos propuesto

### Tabla core: `greenhouse_core.tool_providers`

```sql
CREATE TABLE IF NOT EXISTS greenhouse_core.tool_providers (
  provider_id       TEXT PRIMARY KEY,
  public_id         TEXT UNIQUE,
  name              TEXT NOT NULL,
  website           TEXT,

  -- Classification
  category          TEXT NOT NULL CHECK (category IN (
    'ai_platform',        -- Anthropic, OpenAI, Google AI
    'design_production',  -- Figma, Frame.io, Freepik, Canva
    'project_management', -- Notion, Asana, Monday
    'crm_marketing',      -- HubSpot, Semrush
    'infrastructure',     -- Vercel, GCP, AWS, Cloudflare
    'communication',      -- Slack, Microsoft 365, Google Workspace
    'finance_hr',         -- Nubox, BUK
    'development',        -- GitHub, Linear, Sentry
    'other'
  )),

  -- Cost model
  cost_model         TEXT NOT NULL DEFAULT 'subscription' CHECK (cost_model IN (
    'subscription',    -- flat per-seat monthly/annual
    'per_credit',      -- usage-based (tokens, API calls)
    'hybrid',          -- subscription base + usage overage
    'tiered',          -- volume brackets (N included, then $X)
    'flat_org',        -- flat fee per organization (not per-seat)
    'free_tier'        -- free with limits
  )),

  -- Subscription details
  subscription_amount       NUMERIC(14,2),
  subscription_currency     TEXT DEFAULT 'USD',
  subscription_billing      TEXT CHECK (subscription_billing IN ('monthly', 'annual', 'quarterly')),
  subscription_seats         INT,
  subscription_plan_name     TEXT,

  -- Credit/usage details
  credit_unit_name          TEXT,           -- 'tokens', 'API calls', 'downloads'
  credit_unit_cost          NUMERIC(10,6),  -- cost per unit
  credits_included_monthly  INT,            -- included in subscription

  -- Contract
  contract_start_date    DATE,
  contract_end_date      DATE,
  contract_renewal_type  TEXT CHECK (contract_renewal_type IN ('auto', 'manual', 'none')),
  contract_notice_days   INT DEFAULT 30,
  negotiated_discount    NUMERIC(5,2),     -- % discount from list price

  -- Overhead classification
  overhead_type    TEXT NOT NULL DEFAULT 'shared' CHECK (overhead_type IN (
    'direct',   -- per-member: Figma seat, GitHub seat
    'shared',   -- pool: Vercel, GCP, Notion workspace
    'client',   -- billable: HubSpot license for ANAM
    'hybrid'    -- some direct, some shared
  )),

  -- Compliance
  data_classification  TEXT CHECK (data_classification IN ('public', 'internal', 'confidential', 'pii')),
  data_residency       TEXT,    -- 'US', 'EU', 'LATAM'
  certifications       TEXT[],  -- ['SOC2', 'ISO27001', 'GDPR']

  -- Bridges
  fin_supplier_id     TEXT,  -- FK to fin_suppliers (payment tracking)
  hubspot_product_id  TEXT,  -- for client billing via HubSpot

  -- Status
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),

  -- Metadata
  notes       TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `greenhouse_core.tool_member_licenses`

Quién usa qué herramienta. Reemplaza/generaliza `AiToolMemberLicense`.

```sql
CREATE TABLE IF NOT EXISTS greenhouse_core.tool_member_licenses (
  license_id    TEXT PRIMARY KEY,
  provider_id   TEXT NOT NULL REFERENCES greenhouse_core.tool_providers(provider_id),
  member_id     TEXT NOT NULL,

  -- Access
  access_level  TEXT DEFAULT 'full' CHECK (access_level IN ('full', 'limited', 'viewer', 'trial', 'admin')),
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'expired', 'revoked')),

  -- Optional: client attribution
  client_id     TEXT,  -- if this license is for a specific client's work

  -- Dates
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,

  UNIQUE (provider_id, member_id)
);
```

### Tabla: `greenhouse_core.tool_usage_ledger`

Consumo variable (créditos, API calls). Generaliza `AiCreditLedgerEntry`.

```sql
CREATE TABLE IF NOT EXISTS greenhouse_core.tool_usage_ledger (
  entry_id       TEXT PRIMARY KEY,
  provider_id    TEXT NOT NULL REFERENCES greenhouse_core.tool_providers(provider_id),
  member_id      TEXT,
  client_id      TEXT,

  -- Usage
  units_consumed  NUMERIC(14,4) NOT NULL,
  unit_name       TEXT NOT NULL,   -- 'tokens', 'API calls', 'downloads', 'GB'
  cost_usd        NUMERIC(14,6),
  cost_clp        NUMERIC(14,2),

  -- Context
  description     TEXT,
  reference_id    TEXT,  -- task ID, project ID, etc.

  -- Period
  usage_date      DATE NOT NULL,
  period_year     INT NOT NULL,
  period_month    INT NOT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Módulos que interactúan

### Finance (consume + alimenta)

| Interacción | Detalle |
|------------|---------|
| `fin_supplier_id` bridge | Conecta pagos/facturas al provider canónico |
| Expense tracking | `fin_expenses` con `supplier_id` → provider cost attribution |
| Budget | Presupuesto anual por provider vs actual |
| Cost allocation | Distribución a clientes cuando `overhead_type = 'client'` |

### People / Person Intelligence (consume)

| Interacción | Detalle |
|------------|---------|
| `tool_member_licenses` | Qué herramientas usa cada persona |
| `person_operational_360.direct_overhead_target` | Suma de subscription/seats + credit cost per-person |
| PersonHrProfileTab | Sección "Herramientas asignadas" |
| MyProfileView | Self-service "Mis herramientas" |
| Onboarding | Checklist de herramientas a activar |
| Offboarding | Licenses a revocar |

### Capacity Economics (consume)

| Interacción | Detalle |
|------------|---------|
| `direct_overhead_target` | Costo de tools per-member (TASK-057) |
| `loaded_cost_target` | Labor + direct overhead + shared overhead |
| `suggested_bill_rate_target` | Pricing con overhead real |
| Client attribution | Tools billables como costo directo del servicio |

### Services (consume + genera)

| Interacción | Detalle |
|------------|---------|
| Service includes tool | "CRM Solutions incluye licensing HubSpot" |
| Service cost | Costo de herramienta como componente del costo del servicio |
| Service margin | Impacta rentabilidad del servicio |

### Agency Operations (consume)

| Interacción | Detalle |
|------------|---------|
| Platform cost dashboard | Gasto total en herramientas |
| Renewal risk alerts | Contratos por vencer en 30/60/90 días |
| Utilization tracking | Seats pagados vs seats activos |
| Budget health | Actual vs presupuesto |

### Organization / Account 360 (consume)

| Interacción | Detalle |
|------------|---------|
| "¿Qué tools usamos para este cliente?" | Vía `tool_member_licenses.client_id` |
| Compliance | "¿Qué tools procesan datos de este cliente?" vía `data_classification` |
| Cost per org | Herramientas atribuidas por organización |

### HR (consume)

| Interacción | Detalle |
|------------|---------|
| Onboarding workflow | "Activar licenses de: Figma, Notion, Slack, Claude" |
| Offboarding workflow | "Revocar licenses de X herramientas" |
| Loaded cost for budgeting | HR necesita saber el costo cargado real |

### Admin (gestiona)

| Interacción | Detalle |
|------------|---------|
| CRUD providers | Alta, edición, desactivación |
| License management | Asignar/revocar per-member |
| Cost model config | Configurar subscription/credits/hybrid |
| Renewal config | Auto/manual/notice days |

### Notifications / Outbox (emite)

| Evento | Trigger |
|--------|---------|
| `tool_provider.created` | Nuevo provider registrado |
| `tool_license.assigned` | License asignada → refresh person_intelligence |
| `tool_license.revoked` | License revocada → refresh person_intelligence |
| `tool_contract.renewal_approaching` | Alerta 30d antes de vencimiento |
| `tool_budget.threshold_exceeded` | Gasto > 80% del budget |

### AI Tools module (se fusiona)

| Antes | Después |
|-------|---------|
| `AiProvider` | → `tool_providers` con category='ai_platform' |
| `AiTool` | → `tool_providers` (cada tool es un provider entry) |
| `MemberToolLicense` | → `tool_member_licenses` (generalizado) |
| `AiCreditWallet` | Se mantiene como sub-feature para pools de créditos |
| `AiCreditLedger` | → `tool_usage_ledger` (generalizado) |
| AI catalog view | → Tool catalog view (expandido) |

## Migración

### Fase 1 — Schema + bridge (no breaking changes)
1. Crear tablas `tool_providers`, `tool_member_licenses`, `tool_usage_ledger`
2. Migrar datos de `AiProvider` + `AiTool` → `tool_providers`
3. Migrar `MemberToolLicense` → `tool_member_licenses`
4. Bridge `fin_supplier_id` para providers existentes
5. AI Tools module sigue funcionando — lee de las nuevas tablas con backward compat

### Fase 2 — Conectar a TASK-057 (direct overhead)
1. `readMemberToolCosts` lee de `tool_member_licenses` + `tool_usage_ledger`
2. `direct_overhead_target` se calcula con datos reales
3. `loaded_cost_target` refleja costo total

### Fase 3 — Vistas
1. Tool Catalog view (reemplaza AI Tools catalog)
2. Provider detail view (contrato, licenses, consumo, budget)
3. Sección "Herramientas" en PersonHrProfileTab
4. Renewal alerts en Agency Operations

### Fase 4 — Eventos y reactive
1. Outbox events para license changes
2. Projection `person_intelligence` se refresca cuando cambia una license
3. Notification: renewal approaching, budget threshold

## Acceptance Criteria

- [ ] `tool_providers` tabla creada con all 15+ herramientas de Efeonce
- [ ] `tool_member_licenses` con licenses activas per-member
- [ ] Bridge `fin_supplier_id` conectado para providers con pagos
- [ ] TASK-057 consume `tool_member_licenses` para `direct_overhead_target`
- [ ] AI Tools module migrado sin breaking changes
- [ ] Tool catalog view funcional
- [ ] Renewal alerts en Agency Operations
- [ ] `npx tsc --noEmit` limpio

## Dependencies & Impact

- **Depende de:** TASK-057 (direct overhead compute — consumer principal)
- **Depende de:** AI Tools module (fuente de migración)
- **Depende de:** Finance module (supplier bridge)
- **Impacta a:** People (licenses), Capacity Economics (overhead), Services (cost), Agency (dashboard), HR (onboarding/offboarding), Organization (compliance), Admin (CRUD)
- **Archivos owned:**
  - `scripts/migration-tool-providers.sql` (DDL)
  - `src/lib/tool-providers/` (nuevo módulo — store, types, events)
  - `src/app/api/admin/tool-providers/` (CRUD API)
  - `src/views/greenhouse/admin/tool-providers/` (catalog + detail views)

## Estimación

- Fase 1 (schema + migration): 4-6 horas
- Fase 2 (TASK-057 connection): 2-3 horas (ya planificado)
- Fase 3 (vistas): 4-6 horas
- Fase 4 (eventos + reactive): 2-3 horas
- **Total: 12-18 horas**
