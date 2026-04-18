# TASK-464c — Tool Catalog Extension + Overhead Addons Canonical

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (puede ir en paralelo con 464a y 464b)
- Branch: `task/TASK-464c-tool-catalog-extension-overhead-addons`
- Legacy ID: `parte de TASK-464 umbrella`
- GitHub Issue: `none`

## Summary

Extender — **NO reconstruir** — el tool catalog existente en `greenhouse_ai.tool_catalog` (que ya tiene provider_id FK, subscription pricing y cost model) con las columnas que faltan para cotización comercial: prorrateo, flag `includes_in_addon`, applicable_business_lines. Adicionalmente, crear `greenhouse_commercial.overhead_addons` con los 9 fees/overheads de Efeonce (PM Fee, Setup Staff Aug, Transactional, etc.). Seed desde CSVs del Excel.

## Why This Task Exists

Auditoría previa identificó que `greenhouse_ai.tool_catalog` ya tiene el modelo rico que cualquier pricing engine necesita (provider FK, subscription_amount, billing_cycle, seats, credit_unit_cost). El nombre tiene el prefijo `ai_` pero el modelo es genérico — Efeonce lo usa para Adobe, Figma, HubSpot, Notion, etc. (no solo IA).

**NO hay que reconstruir tooling** — solo:
1. Agregar las columnas de prorrateo que faltan del Excel
2. Poblar/actualizar el catálogo con los 26 tools del Excel
3. Crear la tabla complementaria `overhead_addons` para fees no-tool (PM Fee, Setup Aug, Transactional fees, etc.)
4. Opcionalmente, promover `ai.tool_catalog` a `commercial.tool_catalog` con view retrocompat (decidir en Discovery — puede quedar `ai_` mientras los callers existentes lo referencian ahí)

Los overheads son DIFERENTES de tools: son fees/markups/ajustes que se aplican al subtotal del quote, no items individuales. Ejemplos: "PM Fee 10% del subtotal", "Setup Aug = 1 mes del costo", "AI Infra = 3% o USD 30 mín", "Descuento retención anual -10%".

## Goal

- `greenhouse_ai.tool_catalog` (o promovida a `commercial.tool_catalog`) extendida con prorrateo + applicable_business_lines + includes_in_addon
- Poblado con los 26 tools del Excel via seeder idempotente
- `greenhouse_commercial.overhead_addons` creada con seed de los 9 addons del Excel
- Reader helpers que sirvan al pricing engine (TASK-464d) y UI (TASK-464e)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **NO reconstruir** `greenhouse_ai.tool_catalog` — extender, preservar schema existente y callers (member_tool_licenses, provider_tooling_snapshots)
- Preservar `provider_id` FK a `greenhouse_core.providers` (ya existe)
- Overhead addons viven en `greenhouse_commercial` (son pricing-specific, no AI-specific)
- Seed idempotente desde CSV — Efeonce puede editar Excel y re-seed sin dev

## Normative Docs

- `data/pricing/seed/tool-catalog.csv` (26 tools)
- `data/pricing/seed/overhead-addons.csv` (9 addons)
- Hojas "Herramientas" y "Addons - Overheads" del Excel
- `greenhouse_ai.tool_catalog` schema existente
- `greenhouse_serving.provider_tooling_snapshots` (proof of existing tooling infra)

## Dependencies & Impact

### Depends on

- `greenhouse_ai.tool_catalog` existente con `provider_id`, `subscription_amount`, etc.
- `greenhouse_core.providers` existente
- CSV seeds ya extraídos

### Blocks / Impacts

- TASK-464d — pricing engine consume tools + overheads
- TASK-464e — UI picker lee tool catalog
- TASK-465 — service composition referencia `tool_id` del catalog

### Files owned

- `migrations/[verificar]-task-464c-tool-catalog-extension.sql`
- `migrations/[verificar]-task-464c-overhead-addons-schema.sql`
- `scripts/seed-tool-catalog.ts` (actualiza/upserta desde CSV)
- `scripts/seed-overhead-addons.ts`
- `src/lib/commercial/tool-catalog-store.ts` (reader ampliado)
- `src/lib/commercial/overhead-addons-store.ts`
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_ai.tool_catalog`: tool_id PK, tool_name, tool_category/subcategory, cost_model, credit_unit_cost, credits_included_monthly, subscription_amount, subscription_billing_cycle, subscription_currency, subscription_seats, provider_id FK, fin_supplier_id, is_active, sort_order, vendor, website_url, icon_url, description
- `greenhouse_ai.member_tool_licenses`: licenses por member
- `greenhouse_serving.provider_tooling_snapshots`: materialización mensual con costs
- `greenhouse_core.tool_catalog`: catálogo simple (no tiene pricing)
- `greenhouse_core.providers`: 23 campos incluyendo provider_type

### Gap

- `greenhouse_ai.tool_catalog` NO tiene: `prorating_qty`, `prorating_unit`, `prorated_cost_usd`, `prorated_price_usd`, `applicable_business_lines` (array), `includes_in_addon` (bool), `notes_for_quoting`
- No existe tabla de overhead addons (PM Fee, Setup Aug, etc.)
- Excel tiene info rica sobre prorrateo ("Envato Elements → 4 proyectos/mes → $8.25 prorated") que no está en DB

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extender `greenhouse_ai.tool_catalog`

```sql
-- SKU auto-generation via PostgreSQL sequence para tools nuevos añadidos post-seed.
-- Seed inserta SKUs explícitos del CSV (ETG-001..026). Admin UI inserta sin sku → DEFAULT genera ETG-027+.
CREATE SEQUENCE IF NOT EXISTS greenhouse_ai.tool_sku_seq START WITH 27;

CREATE OR REPLACE FUNCTION greenhouse_ai.generate_tool_sku()
RETURNS text AS $$
BEGIN
  RETURN 'ETG-' || LPAD(nextval('greenhouse_ai.tool_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE greenhouse_ai.tool_catalog
  ADD COLUMN IF NOT EXISTS tool_sku text UNIQUE DEFAULT greenhouse_ai.generate_tool_sku(),  -- 'ETG-001' explícito (seed) o auto 'ETG-027+'
  ADD COLUMN IF NOT EXISTS prorating_qty numeric(10,2),                   -- '4' de "4 proyectos/mes"
  ADD COLUMN IF NOT EXISTS prorating_unit text,                             -- 'proyectos_mes' | 'clientes_activos' | 'usuarios_mes' | 'proyectos'
  ADD COLUMN IF NOT EXISTS prorated_cost_usd numeric(12,4),                 -- pre-calculado desde Excel ($20 desde $80/4)
  ADD COLUMN IF NOT EXISTS prorated_price_usd numeric(12,4),                -- con markup (ej. $23 desde $20×1.15)
  ADD COLUMN IF NOT EXISTS applicable_business_lines text[],                -- ['globe', 'wave'] etc
  ADD COLUMN IF NOT EXISTS includes_in_addon boolean DEFAULT FALSE,         -- flag del Excel ✅/❌
  ADD COLUMN IF NOT EXISTS notes_for_quoting text;
```

Compatibilidad: callers existentes (member_tool_licenses, provider_tooling_snapshots) siguen funcionando — solo agrega columnas opcionales.

**Nota**: dejar la tabla en `greenhouse_ai` por ahora para no romper callers; crear view `greenhouse_commercial.tool_catalog_v` si es útil para los consumers comerciales. Decidir promoción completa al schema commercial en Discovery — es un rename breaking-change que puede ir como follow-up.

### Slice 2 — Schema de overhead addons

```sql
-- SKU auto-generation para addons nuevos añadidos post-seed.
-- Seed inserta SKUs explícitos del CSV (EFO-001..009). Admin UI → DEFAULT genera EFO-010+.
CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.overhead_addon_sku_seq START WITH 10;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_overhead_addon_sku()
RETURNS text AS $$
BEGIN
  RETURN 'EFO-' || LPAD(nextval('greenhouse_commercial.overhead_addon_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE greenhouse_commercial.overhead_addons (
  addon_id text PRIMARY KEY DEFAULT 'ov-' || gen_random_uuid(),
  addon_sku text UNIQUE NOT NULL DEFAULT greenhouse_commercial.generate_overhead_addon_sku(),  -- 'EFO-001' (seed) o auto 'EFO-010+'
  category text NOT NULL,                            -- 'Overhead Operativo' | 'Fee de Gestión Efeonce' | 'Fee Administrativo' | 'Fee Financiero' | 'Overhead General' | 'Descuento / Bono'
  addon_name text NOT NULL,                           -- 'Project Management Fee' etc
  addon_type text NOT NULL CHECK (addon_type IN (
    'overhead_fixed',     -- flat cost in USD
    'fee_percentage',     -- % del subtotal del quote
    'fee_fixed',          -- flat fee USD aplicado 1 vez
    'fee_fixed_monthly',  -- flat fee USD por período
    'adjustment_pct'      -- discount/bonus +/- %
  )),
  unit text,                                          -- 'Mes' | 'Proyecto / Mes' | 'Único (setup)' | '% del monto' | 'Usuario'
  cost_internal_usd numeric(12,2) DEFAULT 0,
  margin_pct numeric(5,4),                            -- 0.15 típico
  final_price_usd numeric(12,2),                      -- si fee flat en USD
  final_price_pct numeric(5,4),                       -- si fee %
  pct_min numeric(5,4),                               -- para rangos como "4–7 %"
  pct_max numeric(5,4),
  minimum_amount_usd numeric(12,2),                   -- para "3% o USD 30 mínimo"
  applicable_to text[],                               -- ['staff_aug', 'servicios_creativos_globe', etc]
  description text,
  conditions text,                                    -- cuándo aplicar (free text)
  visible_to_client boolean DEFAULT TRUE,              -- algunos overheads son internal-only ("Efeonce Operational Overhead base")
  active boolean NOT NULL DEFAULT TRUE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE greenhouse_commercial.overhead_addons OWNER TO greenhouse_ops;
GRANT SELECT ON greenhouse_commercial.overhead_addons TO greenhouse_runtime;
```

### Slice 3 — Seeders

**`seed-tool-catalog.ts`**:
- Lee `data/pricing/seed/tool-catalog.csv`
- Para cada fila con `Nombre de la Herramienta` no vacío:
  - UPSERT por `tool_sku`
  - Si es nueva, INSERT en tool_catalog con: sku, name, category, type → cost_model mapeado, subscription_amount desde "Costo Total (USD)", billing_cycle desde "Frecuencia"
  - Update prorating_qty, prorating_unit, prorated_cost_usd, prorated_price_usd, applicable_business_lines (parse "Globe / Wave" → ['globe', 'wave']), includes_in_addon (parse ✅/❌)
- Intenta resolver `provider_id` por nombre vendor (match fuzzy contra `greenhouse_core.providers.provider_name`); si no encuentra, deja NULL y loguea warning

**`seed-overhead-addons.ts`**:
- Lee `data/pricing/seed/overhead-addons.csv`
- Mapea los 9 addons:
  - EFO-001 Herramientas Creativas → overhead_fixed USD $50/mes
  - EFO-002 MarTech/HubSpot → overhead_fixed USD $80/mes
  - EFO-003 PM Fee → fee_percentage 10% del subtotal
  - EFO-004 Recruiting & Onboarding Staff Aug → fee_fixed USD (1 mes del costo)
  - EFO-005 Renovación Staff Aug → fee_percentage_monthly 5% valor mensual
  - EFO-006 Costos Transaccionales → fee_percentage rango 4-7%
  - EFO-007 AI & Data Infra → fee_percentage 3% con minimum USD 30
  - EFO-008 Efeonce Operational Overhead (base) → fee_percentage 8-10% global, `visible_to_client=FALSE`
  - EFO-009 Fee de Retención/Descuento anual → adjustment_pct -10%

### Slice 4 — Stores

- `tool-catalog-store.ts`:
  - `listToolCatalog({ businessLine?, includesInAddon?, active? })`
  - `getToolBySku(tool_sku)`
  - `getToolsForBusinessLine(businessLineCode)` — filtra por applicable_business_lines
- `overhead-addons-store.ts`:
  - `listOverheadAddons({ applicableTo?, visibleToClient?, active? })`
  - `getOverheadAddonBySku(addon_sku)`
  - `resolveApplicableAddons({ commercialModel, staffingModel, tier, businessLine }) → Addon[]` — resuelve qué overheads default aplican según contexto

## Out of Scope

- UI para editar tools/addons (admin via SQL o seed re-run por ahora)
- Integración de member_tool_licenses con service composition — se deja para TASK-465
- Rename `greenhouse_ai.tool_catalog` → `greenhouse_commercial.tool_catalog` (evaluar en follow-up; breaking change)
- Sync automático con facturas Nubox de proveedores (el Excel ya tiene los costos)

## Detailed Spec

### Tool catalog mapping del Excel

```
CSV column                   → DB field
SKU                          → tool_sku ('ETG-001')
Categoría                    → tool_category
Nombre                       → tool_name
Tipo                         → infer cost_model (SaaS/Licencia → 'subscription', Recurso → 'one_time_resource')
Unidad                       → subscription_billing_cycle (Mes → 'monthly', Año → 'annual', Usuario → 'per_seat')
Costo Total (USD)            → subscription_amount (full) + split per-unit
Frecuencia                   → subscription_billing_cycle
Prorrateo Estimado           → prorating_qty
Tipo de prorrateo            → prorating_unit
Costo Prorrateado (USD)      → prorated_cost_usd
Precio Prorrateado           → prorated_price_usd
Aplicable a                  → applicable_business_lines (parse 'Globe / Wave' → array)
Incluye en Add-on            → includes_in_addon (✅ → true, ❌ → false)
Comentarios                  → notes_for_quoting
```

### Overhead addon types explicados

- `overhead_fixed`: costo fijo USD agregado como línea (ej. "Creative Tools overhead $50/mes")
- `fee_percentage`: calcula como % del subtotal del quote (ej. PM Fee 10% × $10K = $1K)
- `fee_fixed`: flat USD fijo (ej. setup fee $500)
- `fee_fixed_monthly`: flat USD recurrente mensual
- `adjustment_pct`: discount/bonus aplicado al total final (puede ser +/-)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ALTER de `greenhouse_ai.tool_catalog` aplica sin romper columnas existentes
- [ ] `greenhouse_commercial.overhead_addons` creada con grants correctos
- [ ] Seeder de tools inserta/actualiza 26 tools sin duplicar
- [ ] Seeder de overheads inserta 9 addons
- [ ] `getToolBySku('ETG-019')` devuelve Figma con prorating_qty=3, prorated_cost_usd=20, applicable_business_lines=['wave']
- [ ] `getOverheadAddonBySku('EFO-003')` devuelve PM Fee tipo fee_percentage con `final_price_pct=0.10`
- [ ] `resolveApplicableAddons({ staffingModel: 'named_resources', ... })` incluye EFO-004 (Recruiting) y EFO-005 (Renovación)
- [ ] Member tool licenses + provider tooling snapshots NO se rompen (regression test)

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Validación manual: `SELECT tool_sku, tool_name, prorated_price_usd, applicable_business_lines FROM greenhouse_ai.tool_catalog WHERE tool_sku LIKE 'ETG-%' ORDER BY tool_sku;`
- Validación manual: `SELECT addon_sku, addon_name, addon_type, final_price_pct, final_price_usd, visible_to_client FROM greenhouse_commercial.overhead_addons ORDER BY addon_sku;`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-464d (pricing engine), TASK-464e (UI), TASK-465 (service composition), TASK-417 (ai tools — verificar que `greenhouse_ai.tool_catalog` alter no rompe esa task)

## Follow-ups

- Promoción de `greenhouse_ai.tool_catalog` a `greenhouse_commercial.tool_catalog` (rename + view retrocompat) cuando sea seguro
- Sync automático de precios de tools desde provider APIs (ej. Adobe quote, Figma billing API) — follow-up task
- Admin UI para edit tool/addon en vez de re-seed

## Open Questions

- ¿Queda `ai.tool_catalog` con el prefijo `ai_` o promovemos al schema `commercial`? Propuesta: dejar ai_ por esta task (no breaking), evaluar rename en follow-up. Mientras tanto, TASK-464d/e consumen directo desde `ai.tool_catalog`.
- 6 proveedores nuevos que aparecen en el Excel y no están en `greenhouse_core.providers` (ej. Envato, Frame.io, Cloudways) — ¿crear provider rows como parte del seed, o dejar `provider_id=NULL` y que alguien los cree manual después? Propuesta: crear providers automáticamente con `provider_type='tool_vendor'` si no existen.
