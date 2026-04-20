# TASK-464a — Sellable Roles Catalog Canonical + Seed

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-464a-sellable-roles-catalog-canonical`
- Legacy ID: `parte de TASK-464 umbrella (revenue pricing foundation)`
- GitHub Issue: `none`

## Summary

Canonicalizar el catálogo sellable de Efeonce (SKU ECG-XXX) con su breakdown completo de costo (salario base + 4 bonos + previsional + fee Deel), **employment_type como dimensión** (indefinido_clp / honorarios_clp / contractor_deel_usd / contractor_eor_usd / plazo_fijo_clp / contractor_direct_usd), y precios en 6 monedas (USD/CLP/CLF/COP/MXN/PEN). El source of truth actual es `data/pricing/seed/sellable-roles-pricing.csv`, que hoy contiene **32 roles activos y 54 placeholders**. Esta foundation habilita al pricing engine a saber cuánto cuesta internamente cada rol en cada modalidad de contrato y a qué precio se vende por país.

## Why This Task Exists

Hoy `greenhouse_commercial.role_rate_cards` tiene seed genérico para 6 business lines × seniority con un solo `hourly_rate_cost` por fila. La realidad operativa de Efeonce es más rica:

- 32 roles sellable concretos hoy con SKU único (no "designer" genérico sino "Senior Visual Designer", "Paid Media Manager", "Implementador HubSpot", etc.)
- Cost stack desglosado: base salary + JiT + RpA + AR + Sobrecumplimiento + previsional + Deel
- **Cost varía por employment_type**: Consultor HubSpot siempre honorarios → sin previsional chilena. Senior Designer indefinido CLP → aplica AFP + Salud + Cesantía + SIS (~20%). Paid Media Manager via Deel USD → $49 fee mensual sin previsional.
- Pricing pre-calculado en 6 monedas (multi-país real — Pinturas Berel México, clientes Colombia/Perú)
- Distinción Staff/Servicio por rol (no todos los roles se venden standalone)
- Categoría (Creativo, PR, Performance, Consultoria, Tech) + Tier (1-4) por rol

El catálogo ya está construido y validado por Efeonce (Excel maestro con 33 SKUs + 7 servicios compuestos + 26 tools + 9 overheads). TASK-464a canonicaliza **el catálogo de roles con employment_types**; otras tasks (464b/c/d/e) canonicalizan las piezas restantes. TASK-468 unifica el vocabulario de employment_types con `greenhouse_payroll.compensation_versions.contract_type` como follow-up.

## Goal

- Tablas canónicas: `sellable_roles`, `employment_types`, `sellable_role_cost_components` (multi-row por employment_type), `role_employment_compatibility`, `sellable_role_pricing_currency`
- Seed idempotente de los 32 roles activos actuales desde `data/pricing/seed/sellable-roles-pricing.csv` + inferencia conservadora de `employment_type_code` desde CSV (ver Detailed Spec)
- Reader helpers + eventos outbox
- Foundation lista para TASK-464d (pricing engine refactor) y TASK-468 (unificación con payroll)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Source of truth es el CSV extraído del Excel de Efeonce (`data/pricing/seed/sellable-roles-pricing.csv`)
- SKU `ECG-XXX` se preserva como `role_sku` (identificador estable)
- Separar cost (interno) de pricing (facing-al-cliente) — dos tablas distintas con effective_from
- Efeonce puede actualizar salarios/bonos/monedas sin tocar código (seed regenerable)
- **🛑 AISLAMIENTO PAYROLL**: esta task NO modifica NADA en `greenhouse_payroll.*`. No altera schemas, triggers, tests, ni código de `src/lib/payroll/*`. `compensation_versions.contract_type` (string existente) queda intacto. `chile_afp_rates`, `chile_previred_indicators`, `chile_tax_brackets` NO se modifican. Las nuevas tablas de commercial son standalone con FK SOLO entre sí. La unificación de vocabulario commercial↔payroll es responsabilidad exclusiva de TASK-468 (follow-up). Antes de cerrar esta task, ejecutar `pnpm test src/lib/payroll/` (baseline: 194 tests / 29 files passing al 2026-04-18 — debe mantenerse intacto) y verificar suite completa passing.

## Normative Docs

- `data/pricing/seed/sellable-roles-pricing.csv` (fuente de verdad)
- `data/pricing/efeonce-pricing-model-v1.xlsx` (versión humana editable)
- Hoja "Precios personal" del Excel

## Dependencies & Impact

### Depends on

- `greenhouse_commercial` schema existe
- Excel seed movido al repo (ya hecho)

### Blocks / Impacts

- TASK-464b — tier margins depende de que los roles tengan tier asignado (viene con el seed)
- TASK-464d — pricing engine refactor usa estas tablas
- TASK-464e — UI picker lee de `sellable_roles`
- TASK-465 — service composition referencia `role_sku`

### Files owned

- `migrations/[verificar]-task-464a-sellable-roles-schema.sql`
- `scripts/seed-sellable-roles.ts` (importa CSV → DB idempotente)
- `src/lib/commercial/sellable-roles-store.ts` (readers)
- `src/lib/commercial/sellable-role-events.ts` (publishers)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_commercial.role_rate_cards` — con seed más simple (role_code + seniority + BL + hourly_rate_cost). **Deberá deprecarse** después de migrar consumers a `sellable_role_pricing_currency`.
- `data/pricing/seed/sellable-roles-pricing.csv` con 32 roles activos actuales + 54 placeholders vacíos

### Gap

- No existe la entidad `sellable_roles` con SKU estable + cost breakdown + multi-currency
- `role_rate_cards` actual usa seniority literal (`junior/mid/senior/lead`) — Efeonce no piensa así: la seniority ya está baked en el SKU (`Desarrollador Full Stack Junior` es ECG-013 ≠ `Desarrollador Full Stack Mid` ECG-014)
- No hay tabla `sellable_role_cost_components` con el stack (base + bonos + previsional + deel)
- No hay `sellable_role_pricing_currency` (6 monedas pre-calculadas)

## Seed Normalization Contract

- Source of truth operativo del seed: `data/pricing/seed/sellable-roles-pricing.csv`. El `.xlsx` queda como referencia humana para revisar ambigüedades, no como input runtime del seeder.
- El baseline SQL histórico (`docs/architecture/schema-snapshot-baseline.sql`) está desfasado respecto del lane commercial actual; para esta task, la referencia operativa real es `migrations/20260417103700979_task-345-quotation-canonical-schema-finance-compatibility-bridge.sql`, `migrations/20260417124905235_task-346-quotation-pricing-config.sql` y `src/types/db.d.ts`.
- `SKU`, `Rol`, `Categoría`, `Tipo (Staff/Servicio)` y `Tier` se consideran campos de identidad; si vienen vacíos o inválidos, la fila se rechaza.
- `role_code` se deriva con slug estable desde `Rol`; `tier_code` se extrae de strings del tipo `Tier 3: Estratégico`; `tier_label` se toma de un diccionario fijo (`1..4`), no del texto libre del CSV.
- Costos y hourly rates se recalculan desde el stack (`base + bonos + previsional + Deel`) y se comparan contra las columnas derivadas del CSV. Si hay drift sobre tolerancia, la fila sigue siendo válida pero se registra warning.
- Precios por moneda (`USD`, `CLP`, `CLF`, `COP`, `MXN`, `PEN`) se siembran en `sellable_role_pricing_currency`; una moneda inválida no tumba la fila completa, pero sí se reporta como issue.
- Placeholders, filas vacías o filas de control no se insertan. El seeder debe distinguir explícitamente entre `skipped_empty`, `skipped_placeholder`, `needs_review` y `rejected`.
- El tier del catálogo de roles se resuelve desde `sellable-roles-pricing.csv`; cualquier contradicción posterior con `role-tier-margins.csv` se trata como drift a resolver en TASK-464b, no como razón para mutar el tier aquí.

## Employment Type Inference Policy

- La inferencia de `employment_type_code` es conservadora y nunca debe inventar compatibilidades silenciosas.
- Reglas iniciales permitidas:
  - `fee_deel_usd > 0` y `gastos_previsionales_usd = 0` → `contractor_deel_usd`
  - `gastos_previsionales_usd > 0` y `fee_deel_usd = 0` → `indefinido_clp`
- Casos ambiguos (`fee_deel_usd = 0` y `gastos_previsionales_usd = 0`, `fee_deel_usd > 0` junto con `gastos_previsionales_usd > 0`, o combinaciones no contempladas) quedan en `needs_review`; el rol puede sembrarse, pero `role_employment_compatibility` no debe completarse con supuestos débiles.
- Esta task no debe inferir automáticamente `plazo_fijo_clp`, `honorarios_clp`, `contractor_eor_usd` ni `contractor_direct_usd` sin evidencia adicional o mapeo explícito versionado en el repo.

## Review Queue Policy

- El seeder debe emitir un resumen estándar: `inserted`, `updated`, `skipped_empty`, `skipped_placeholder`, `needs_review`, `rejected`, `drift_detected`.
- Las filas `needs_review` deben quedar exportables como artifact local o log estructurado para revisión manual posterior; no basta con `console.log` opaco.
- Una fila en `needs_review` no debe bloquear la ejecución completa del seed, pero tampoco debe sembrarse con defaults irreversibles.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

```sql
-- SKU auto-generation via PostgreSQL sequence.
-- Seed inserta SKUs explícitos desde el CSV (ECG-001..ECG-033).
-- Admin UI inserta SIN role_sku → DEFAULT dispara nextval → ECG-034, ECG-035...
-- Race-safe + SKUs estables sin recyclage.
CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.sellable_role_sku_seq START WITH 33;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_sellable_role_sku()
RETURNS text AS $$
BEGIN
  RETURN 'ECG-' || LPAD(nextval('greenhouse_commercial.sellable_role_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE greenhouse_commercial.sellable_roles (
  role_id text PRIMARY KEY DEFAULT 'sr-' || gen_random_uuid(),
  role_sku text UNIQUE NOT NULL DEFAULT greenhouse_commercial.generate_sellable_role_sku(),  -- 'ECG-001' explícito (seed) o auto 'ECG-033+' (admin UI)
  role_code text NOT NULL,                          -- slug normalizado, ej. 'creative_operations_lead'
  role_label_es text NOT NULL,                      -- 'Creative Operations Lead'
  role_label_en text,
  category text NOT NULL CHECK (category IN (
    'creativo', 'pr', 'performance', 'consultoria', 'tech'
  )),
  tier text NOT NULL CHECK (tier IN ('1', '2', '3', '4')),
  tier_label text NOT NULL,                          -- 'Commoditizado' etc
  can_sell_as_staff boolean NOT NULL DEFAULT FALSE,  -- Tipo=Staff
  can_sell_as_service_component boolean NOT NULL DEFAULT TRUE,
  active boolean NOT NULL DEFAULT TRUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Employment types catalog (vocabulario + defaults fiscales)
CREATE TABLE greenhouse_commercial.employment_types (
  employment_type_code text PRIMARY KEY,
  label_es text NOT NULL,
  label_en text,
  payment_currency text NOT NULL CHECK (payment_currency IN ('CLP', 'USD', 'EUR', 'GBP')),
  country_code text NOT NULL,                          -- 'CL' | 'INTL' | 'US' | 'MX' etc.
  applies_previsional boolean NOT NULL,                -- TRUE para indefinido/plazo_fijo Chile
  previsional_pct_default numeric(5,4),                -- 0.20 típico Chile; NULL si N/A
  fee_monthly_usd_default numeric(10,2) DEFAULT 0,     -- $49 Deel; $0 default
  fee_pct_default numeric(5,4),                        -- EOR típicamente 10-15%
  applies_bonuses boolean NOT NULL DEFAULT TRUE,
  source_of_truth text NOT NULL DEFAULT 'catalog_manual'  -- 'greenhouse_payroll_chile_rates' | 'catalog_manual'
    CHECK (source_of_truth IN ('catalog_manual', 'greenhouse_payroll_chile_rates', 'provider_api')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Cost components AHORA multi-row por (role, employment_type, effective_from)
CREATE TABLE greenhouse_commercial.sellable_role_cost_components (
  role_id text NOT NULL REFERENCES greenhouse_commercial.sellable_roles(role_id) ON DELETE CASCADE,
  employment_type_code text NOT NULL REFERENCES greenhouse_commercial.employment_types(employment_type_code),
  effective_from date NOT NULL,
  base_salary_usd numeric(12,2) NOT NULL,
  bonus_jit_usd numeric(12,2) DEFAULT 0,
  bonus_rpa_usd numeric(12,2) DEFAULT 0,
  bonus_ar_usd numeric(12,2) DEFAULT 0,
  bonus_sobrecumplimiento_usd numeric(12,2) DEFAULT 0,
  gastos_previsionales_usd numeric(12,2) DEFAULT 0,    -- override por rol; NULL = usar employment_type.previsional_pct_default
  fee_deel_usd numeric(12,2) DEFAULT 0,                 -- override por rol
  fee_eor_usd numeric(12,2) DEFAULT 0,
  total_monthly_cost_usd numeric(12,2) GENERATED ALWAYS AS (
    base_salary_usd + COALESCE(bonus_jit_usd,0) + COALESCE(bonus_rpa_usd,0)
      + COALESCE(bonus_ar_usd,0) + COALESCE(bonus_sobrecumplimiento_usd,0)
      + COALESCE(gastos_previsionales_usd,0) + COALESCE(fee_deel_usd,0)
      + COALESCE(fee_eor_usd,0)
  ) STORED,
  hours_per_fte_month integer NOT NULL DEFAULT 180,
  hourly_cost_usd numeric(12,4) GENERATED ALWAYS AS (
    (base_salary_usd + COALESCE(bonus_jit_usd,0) + COALESCE(bonus_rpa_usd,0)
      + COALESCE(bonus_ar_usd,0) + COALESCE(bonus_sobrecumplimiento_usd,0)
      + COALESCE(gastos_previsionales_usd,0) + COALESCE(fee_deel_usd,0)
      + COALESCE(fee_eor_usd,0)) / 180.0
  ) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, employment_type_code, effective_from)
);

-- Compatibility: qué employment_types admite cada rol + cuál es default
CREATE TABLE greenhouse_commercial.role_employment_compatibility (
  role_id text NOT NULL REFERENCES greenhouse_commercial.sellable_roles(role_id) ON DELETE CASCADE,
  employment_type_code text NOT NULL REFERENCES greenhouse_commercial.employment_types(employment_type_code),
  is_default boolean NOT NULL DEFAULT FALSE,
  allowed boolean NOT NULL DEFAULT TRUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, employment_type_code)
);

-- Unique constraint: solo UN default por rol
CREATE UNIQUE INDEX idx_role_employment_single_default
  ON greenhouse_commercial.role_employment_compatibility (role_id)
  WHERE is_default = TRUE;

CREATE TABLE greenhouse_commercial.sellable_role_pricing_currency (
  role_id text NOT NULL REFERENCES greenhouse_commercial.sellable_roles(role_id) ON DELETE CASCADE,
  currency_code text NOT NULL CHECK (currency_code IN ('USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN')),
  effective_from date NOT NULL,
  margin_pct numeric(5,4) NOT NULL,             -- ej. 0.30 = 30%
  hourly_price numeric(18,4) NOT NULL,
  fte_monthly_price numeric(18,2) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, currency_code, effective_from)
);

--- Grants
ALTER TABLE greenhouse_commercial.sellable_roles OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.employment_types OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.sellable_role_cost_components OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.role_employment_compatibility OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.sellable_role_pricing_currency OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.sellable_role_sku_seq OWNER TO greenhouse_ops;
GRANT SELECT ON greenhouse_commercial.sellable_roles TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.employment_types TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.sellable_role_cost_components TO greenhouse_runtime;  -- solo finance ve el stack, pero SELECT + row-filter en reader
GRANT SELECT ON greenhouse_commercial.role_employment_compatibility TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.sellable_role_pricing_currency TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.sellable_role_sku_seq TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.sellable_role_sku_seq TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.sellable_role_sku_seq TO greenhouse_app;
```

### Seed inicial de `employment_types`

7 tipos canónicos (expandible por TASK-467 admin):

```
indefinido_clp          | Contrato indefinido (CLP)         | CLP | CL   | previsional=TRUE  | pct≈0.20 | fee=0    | bonuses=TRUE  | source_of_truth='greenhouse_payroll_chile_rates'
plazo_fijo_clp          | Contrato a plazo fijo (CLP)       | CLP | CL   | previsional=TRUE  | pct≈0.20 | fee=0    | bonuses=TRUE  | source_of_truth='greenhouse_payroll_chile_rates'
honorarios_clp          | Boleta honorarios (CLP)           | CLP | CL   | previsional=FALSE | NULL     | fee=0    | bonuses=FALSE | source_of_truth='catalog_manual'
contractor_deel_usd     | Contractor via Deel (USD)         | USD | INTL | previsional=FALSE | NULL     | fee=49   | bonuses=TRUE  | source_of_truth='catalog_manual'
contractor_eor_usd      | Contractor via EOR (USD)          | USD | INTL | previsional=FALSE | NULL     | pct=0.12 | bonuses=TRUE  | source_of_truth='catalog_manual'
contractor_direct_usd   | Contractor wire directo (USD)     | USD | INTL | previsional=FALSE | NULL     | fee=0    | bonuses=TRUE  | source_of_truth='catalog_manual'
part_time_clp           | Part-time CLP                     | CLP | CL   | previsional=TRUE  | pct=0.20 | fee=0    | bonuses=TRUE  | source_of_truth='greenhouse_payroll_chile_rates'
```

### Slice 2 — Seeder idempotente (respeta SKUs explícitos del CSV + infiere employment_type)

- Script `scripts/seed-sellable-roles.ts`:
- **Paso 1 — seed `employment_types`** con los 7 tipos canónicos (desde seed hardcoded en el script, o desde un CSV propio opcional en `data/pricing/seed/employment-types.csv`)
- **Paso 2 — seed `sellable_roles`** con `role_sku` EXPLÍCITO del CSV activo (ECG-001..032) → DEFAULT de sequence no se dispara
- **Paso 3 — infiere `employment_type_code` por rol** usando heurística desde columnas del CSV:

  ```
  if (Fee Deel > 0 && Gastos Previsionales == 0)     → 'contractor_deel_usd'
  elif (Gastos Previsionales > 0 && Fee Deel == 0)   → 'indefinido_clp'
  else                                                → 'needs_review'
  ```

  Ejemplo validación contra el CSV:
  - ECG-027 Consultor HubSpot (Fee Deel=49, Moneda=USD) → `contractor_deel_usd` ✓
  - ECG-004 / ECG-017 / ECG-018 (Fee Deel > 0 y Gastos Previsionales > 0) → `needs_review` por ambigüedad ✓
  - ECG-032 Consultor HubSpot Premium (Fee Deel vacío y Gastos Previsionales=0) → `needs_review` hasta mapeo explícito ✓

- **Paso 4 — insert `sellable_role_cost_components`** con `(role_id, employment_type_code, effective_from=today)`
- **Paso 5 — insert `role_employment_compatibility`** con el default inferido + `allowed=TRUE`
- **Paso 6 — insert `sellable_role_pricing_currency`** para las 6 monedas (no cambia lógica original)
- Al final, `SELECT setval('greenhouse_commercial.sellable_role_sku_seq', 33, false)`

**Salida del seed**: log con contadores mínimos `inserted`, `updated`, `skipped_placeholder`, `needs_review`, `drift_detected`
  - Lee `data/pricing/seed/sellable-roles-pricing.csv`
  - Parsea 32 roles activos actuales (filtra filas con `Rol` vacío)
  - Normaliza `category` a lowercase (Creativo → creativo)
  - Deriva `tier` del label "Tier 1: Commoditizado" → '1'
  - Determina `can_sell_as_staff` desde columna "Tipo (Staff/Servicio)" (valor 'Staff' o contiene 'Staff')
  - UPSERT por `role_sku` en `sellable_roles`
  - INSERT en `sellable_role_cost_components` con `effective_from = CURRENT_DATE` si cost breakdown cambió o no existe
  - Solo crea `role_employment_compatibility` cuando el `employment_type_code` fue inferido de forma no ambigua; filas `needs_review` no reciben default silencioso
  - INSERT en `sellable_role_pricing_currency` para las 6 monedas (USD/CLP/CLF/COP/MXN/PEN) si pricing cambió
  - Logs: cuántos roles nuevos, cuántos updated, cuántos sin cambio

### Slice 3 — Readers + events

- `sellable-roles-store.ts`:
  - `listSellableRoles({ category?, tier?, staffOnly?, serviceComponentOnly? })`
  - `getSellableRoleBySku(role_sku)` — usado por pricing engine
  - `getCurrentCost(role_id, employment_type_code?)` — latest effective_from; si employment_type_code omitido, usa el default de `role_employment_compatibility`
  - `getCurrentPricing(role_id, currency_code)` — latest effective_from
  - `listCompatibleEmploymentTypes(role_id)` — devuelve tipos admitidos con flag default
  - `getEmploymentTypeByCode(code)` — reader de `employment_types`
- `sellable-role-events.ts`:
  - `publishSellableRoleCreated`, `publishSellableRoleCostUpdated`, `publishSellableRolePricingUpdated`

### Slice 4 — Deprecación planificada (NO en este corte)

- `role_rate_cards` queda vivo y lo consumen los callers existentes durante la ventana de coexistencia
- TASK-464d (pricing engine refactor) migrará consumers al nuevo modelo
- Una vez TASK-464d ship, `role_rate_cards` se puede deprecar o convertir a view sobre `sellable_role_pricing_currency`

## Out of Scope

- UI para editar roles (se hace en TASK-464e o como follow-up admin)
- Migración de quotes existentes que usan `role_code` legacy — se decide en TASK-464d
- Integración con payroll salary data — el seed es manual desde Excel
- Deprecación efectiva de `role_rate_cards`

## Detailed Spec

### Mapeo CSV → Schema

```
CSV column              → DB field
SKU                     → sellable_roles.role_sku
Rol                     → sellable_roles.role_label_es
Categoría               → sellable_roles.category (lowercase)
Tipo (Staff/Servicio)   → sellable_roles.can_sell_as_staff (bool)
Tier                    → sellable_roles.tier ('1'|'2'|'3'|'4') + tier_label
Salario Base (USD)      → sellable_role_cost_components.base_salary_usd
Bonificación JiT        → sellable_role_cost_components.bonus_jit_usd
Bonificación RpA        → sellable_role_cost_components.bonus_rpa_usd
Bonificación AR         → sellable_role_cost_components.bonus_ar_usd
Bonificación Sobrecumplimiento → sellable_role_cost_components.bonus_sobrecumplimiento_usd
Gastos Previsionales    → sellable_role_cost_components.gastos_previsionales_usd
Fee Deel                → sellable_role_cost_components.fee_deel_usd
Margen en %             → sellable_role_pricing_currency.margin_pct
Precio Hora Agencia USD → sellable_role_pricing_currency.hourly_price (currency=USD)
Precio Hora (CLP)       → idem currency=CLP
Precio Hora (CLF)       → idem CLF
Precio Hora (COP)       → idem COP
Precio Hora (MXN)       → idem MXN
Precio Hora (PEN)       → idem PEN
Precio FTE (USD)        → sellable_role_pricing_currency.fte_monthly_price (USD)
Precio FTE (CLP) ... etc
```

### Role code normalization

Desde `Rol` del CSV → `role_code` stringificado:
- Lowercase
- Espacios → underscore
- Ampersands, slashes, punto → underscore
- Remove accents
- Ejemplos:
  - "Creative Operations Lead" → `creative_operations_lead`
  - "Paid Media Manager" → `paid_media_manager`
  - "Desarrollador Full Stack Senior" → `desarrollador_full_stack_senior`
  - "Project Manager/Account Manager" → `project_manager_account_manager`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente
- [ ] Seed script ejecuta sin error en staging
- [ ] 32 roles activos insertados en `sellable_roles` (rows activas actuales del CSV con `Rol` no-null)
- [ ] Cada role tiene su fila en `sellable_role_cost_components` con `effective_from = seed date`
- [ ] Cada role tiene 6 filas en `sellable_role_pricing_currency` (una por moneda)
- [ ] ECG-032 (Consultor HubSpot Premium) insertado correctamente sin bonos (confirmado real, no placeholder)
- [ ] Re-ejecutar el seeder no duplica filas (idempotente)
- [ ] `getSellableRoleBySku('ECG-008')` devuelve Paid Media Manager con cost USD $17.49/h

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Validación manual: `SELECT role_sku, category, tier, total_monthly_cost_usd, hourly_cost_usd FROM sellable_roles JOIN sellable_role_cost_components USING (role_id) ORDER BY role_sku;` coincide con Excel
- `SELECT currency_code, hourly_price FROM sellable_role_pricing_currency WHERE role_id = (SELECT role_id FROM sellable_roles WHERE role_sku = 'ECG-008')` → 6 filas con precios del Excel

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-464b/c/d/e + TASK-465

## Follow-ups

- Admin UI para editar rates (cuando finance/ops necesite cambiar sin re-seed)
- Historia de cambios de rates (ya soportado por `effective_from` — solo falta el writer path)
- Integración con payroll para auto-actualizar `base_salary_usd` cuando cambia compensación del miembro (follow-up)

## Open Questions

- Role SKUs ECG-033 a ECG-086: hoy están como placeholders vacíos en CSV. Se **skippean** en el seed v1; no se crean filas `active=FALSE` sin data real.
