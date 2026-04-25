# TASK-620 — Sellable Catalog Unification (sellable_tools + sellable_artifacts + service_module_children schema desde dia 1)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy Alto`
- Effort: `Medio` (~2 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque C, parent del programa de catalogo)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-620-sellable-catalog-unification`
- Legacy ID: `RESEARCH-005 P2.3 (renombrada)`
- GitHub Issue: `none`

## Summary

Migracion fundacional que crea las 4 tablas faltantes para alcanzar el modelo de catalogo unificado: `sellable_tools` (tools standalone con pricing canonico), `sellable_artifacts` (deliverables con pricing hibrido), `tool_partners` (Adobe/Microsoft/HubSpot reseller tracking), y `service_module_children` (nesting de service modules con cycle detection). Schema completo desde dia 1, **incluyendo nesting nativo**, sin migraciones incrementales posteriores.

## Why This Task Exists

Tras conversacion 2026-04-25 con owner se confirmo que Efeonce vende **4 tipos de items**:

1. Persona sola (sellable_role) → ya existe
2. Herramienta sola (sellable_tool) → **NO existe standalone, solo embebida en service_tool_recipe**
3. Persona + herramienta (composicion ad-hoc) → posible solo via service_module
4. Servicio empaquetado con personas + tools + artefactos + sub-servicios → falta artefactos + falta nesting

Adicionalmente Efeonce es partner Adobe / Microsoft / HubSpot — vende licencias de software como reseller y necesita tracking de comisiones.

Esta task NO incluye refactor de service_tool_recipe (eso es TASK-620.1) ni admin UI (TASK-620.3). Solo crea las tablas vacias listas para ser consumidas.

## Goal

- Migracion atomica con 4 tablas + 1 funcion + 1 trigger + indices + sequences
- `sellable_tools` paralelo a `sellable_roles` con pricing por moneda + partner_id
- `sellable_artifacts` con flag `is_priced_directly` (modelo hibrido confirmado)
- `tool_partners` con Adobe/Microsoft/HubSpot seed
- `service_module_children` con `has_cycle` function + trigger BEFORE INSERT/UPDATE + depth check
- Tipos regenerados con `pnpm db:generate-types`

## Architecture Alignment

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8 (Bloque C)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- migracion idempotente (CREATE IF NOT EXISTS)
- nullable first, constraints despues (estrategia node-pg-migrate)
- ownership greenhouse_ops para todas las tablas nuevas
- nesting depth limitado a 3 (parent → child → grandchild)
- ciclos prohibidos por trigger (no solo CHECK constraint)

## Dependencies & Impact

### Depends on

- `greenhouse_commercial.sellable_roles` (existe, modelo a replicar)
- `greenhouse_core.service_modules` (existe, parent de nesting)
- `greenhouse_commercial.product_catalog` (existe, ref para sync HubSpot futuro)

### Blocks / Impacts

- **`TASK-620.1`** (Tools refactor) — necesita `sellable_tools` y `tool_partners` existentes
- **`TASK-620.1.1`** (Tool partner program) — extiende `tool_partners` con commission tracking
- **`TASK-620.2`** (Artifacts catalog) — popula `sellable_artifacts`
- **`TASK-620.3`** (Composer) — usa todas las tablas + nesting
- **`TASK-620.4` y `TASK-620.5`** (Quote builder) — picker desde los 4 catalogos
- TASK-027 (HRIS Document Vault) — puede aprovechar `sellable_artifacts` para artefactos contractuales

### Files owned

- `migrations/YYYYMMDD_task-620-sellable-catalog-unification.sql` (nueva)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- `greenhouse_commercial.sellable_roles` (TASK-464a) — modelo de referencia
- `greenhouse_commercial.sellable_role_cost_components`
- `greenhouse_commercial.sellable_role_pricing_currency`
- `greenhouse_core.service_modules`
- `greenhouse_commercial.service_role_recipe` (FK a sellable_roles)
- `greenhouse_commercial.service_tool_recipe` (FK a `ai.tool_catalog`, no a sellable_tools)
- `greenhouse_commercial.product_catalog`

### Gap

- No existe `sellable_tools` standalone
- No existe `sellable_artifacts`
- No existe `tool_partners`
- No existe `service_module_children` (nesting)
- `service_tool_recipe` apunta a `ai.tool_catalog` (legacy) en vez de `sellable_tools`

## Scope

### Slice 1 — Migracion atomica (1.5 dias)

```sql
-- migrations/YYYYMMDD_task-620-sellable-catalog-unification.sql

-- ============================================================================
-- 1. tool_partners — Adobe / Microsoft / HubSpot reseller tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS greenhouse_commercial.tool_partners (
  partner_id text PRIMARY KEY,
  partner_name text NOT NULL UNIQUE,
  partner_program text NOT NULL,                    -- "Adobe Authorized Reseller", "Microsoft Solutions Partner"
  partner_tier text,                                -- "Gold", "Diamond", "Platinum"
  commission_pct numeric(5,2),                      -- 0-100
  commitment_discount_eligible boolean NOT NULL DEFAULT false,
  agreement_signed_at date,
  agreement_expires_at date,
  partner_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE greenhouse_commercial.tool_partners OWNER TO greenhouse_ops;

-- Seed inicial (los 3 partners confirmados por owner)
INSERT INTO greenhouse_commercial.tool_partners (partner_id, partner_name, partner_program, partner_tier, commission_pct, commitment_discount_eligible)
VALUES
  ('PARTNER-ADOBE', 'Adobe', 'Adobe Authorized Reseller', NULL, 15.00, true),
  ('PARTNER-MICROSOFT', 'Microsoft', 'Microsoft Solutions Partner', NULL, 10.00, true),
  ('PARTNER-HUBSPOT', 'HubSpot', 'HubSpot Solutions Partner', NULL, 20.00, true)
ON CONFLICT (partner_id) DO NOTHING;

-- ============================================================================
-- 2. sellable_tools — paralelo a sellable_roles
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.sellable_tool_sku_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_sellable_tool_sku()
RETURNS text AS $$
BEGIN
  RETURN 'TOOL-' || LPAD(nextval('greenhouse_commercial.sellable_tool_sku_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_tools (
  tool_id text PRIMARY KEY DEFAULT ('tool-' || gen_random_uuid()::text),
  tool_sku text NOT NULL UNIQUE DEFAULT greenhouse_commercial.generate_sellable_tool_sku(),
  tool_name text NOT NULL,
  vendor text,                                      -- "Adobe", "Microsoft", "HubSpot", "Figma" (NULL si interno)
  partner_id text REFERENCES greenhouse_commercial.tool_partners(partner_id) ON DELETE SET NULL,
  category text NOT NULL,                           -- "design", "productivity", "crm", "marketing_automation", "analytics", "infra"
  license_type text NOT NULL                        -- "per_seat", "per_org", "usage_based", "one_time"
    CHECK (license_type IN ('per_seat', 'per_org', 'usage_based', 'one_time')),
  unit_label text NOT NULL DEFAULT 'seat',          -- "seat", "user", "GB/month", "license"
  business_line_code text,                          -- ref a business_lines (cross-domain capability)
  hubspot_product_id text,                          -- linkage al sync HubSpot
  active boolean NOT NULL DEFAULT true,
  capability_tags text[],                           -- ["design", "collaboration", "ai-assisted"]
  description text,
  description_rich_html text,                       -- TipTap-edited (TASK-630)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

ALTER TABLE greenhouse_commercial.sellable_tools OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_sellable_tools_active_category ON greenhouse_commercial.sellable_tools (active, category);
CREATE INDEX IF NOT EXISTS idx_sellable_tools_vendor ON greenhouse_commercial.sellable_tools (vendor);
CREATE INDEX IF NOT EXISTS idx_sellable_tools_partner ON greenhouse_commercial.sellable_tools (partner_id);
CREATE INDEX IF NOT EXISTS idx_sellable_tools_business_line ON greenhouse_commercial.sellable_tools (business_line_code);

-- Pricing por moneda (paralelo a sellable_role_pricing_currency)
CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_tool_pricing_currency (
  pricing_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id text NOT NULL REFERENCES greenhouse_commercial.sellable_tools(tool_id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency IN ('CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN', 'BRL')),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  effective_from date NOT NULL,
  effective_to date,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'partner_pricelist', 'sync_hubspot')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sellable_tool_pricing_dates_valid CHECK (effective_to IS NULL OR effective_to > effective_from)
);

ALTER TABLE greenhouse_commercial.sellable_tool_pricing_currency OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_sellable_tool_pricing_lookup
  ON greenhouse_commercial.sellable_tool_pricing_currency (tool_id, currency, effective_from DESC);

-- Tier pricing (volume / commitment discount) opcional
CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_tool_pricing_tier (
  tier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id text NOT NULL REFERENCES greenhouse_commercial.sellable_tools(tool_id) ON DELETE CASCADE,
  currency text NOT NULL,
  min_quantity int NOT NULL CHECK (min_quantity >= 1),
  max_quantity int CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  unit_price numeric(14,2) NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE greenhouse_commercial.sellable_tool_pricing_tier OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_sellable_tool_pricing_tier_lookup
  ON greenhouse_commercial.sellable_tool_pricing_tier (tool_id, currency, min_quantity);

-- ============================================================================
-- 3. sellable_artifacts — deliverables con pricing hibrido
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.sellable_artifact_sku_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_sellable_artifact_sku()
RETURNS text AS $$
BEGIN
  RETURN 'ART-' || LPAD(nextval('greenhouse_commercial.sellable_artifact_sku_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_artifacts (
  artifact_id text PRIMARY KEY DEFAULT ('art-' || gen_random_uuid()::text),
  artifact_sku text NOT NULL UNIQUE DEFAULT greenhouse_commercial.generate_sellable_artifact_sku(),
  artifact_name text NOT NULL,
  category text NOT NULL,                           -- "brand_book", "video", "social_pack", "report", "playbook"
  deliverable_format text,                          -- "PDF", "Figma file", "Video MP4", "Notion workspace"
  business_line_code text,
  -- HIBRIDO: si is_priced_directly=true, usa los pricing rows; si false, costo absorbido en horas
  is_priced_directly boolean NOT NULL DEFAULT true,
  estimated_hours numeric(8,2),                     -- si is_priced_directly=false, indica horas absorbidas
  description text,
  description_rich_html text,
  hubspot_product_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

ALTER TABLE greenhouse_commercial.sellable_artifacts OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_sellable_artifacts_active_category
  ON greenhouse_commercial.sellable_artifacts (active, category);
CREATE INDEX IF NOT EXISTS idx_sellable_artifacts_business_line
  ON greenhouse_commercial.sellable_artifacts (business_line_code);

-- Pricing por moneda solo aplica si is_priced_directly=true
CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_artifact_pricing_currency (
  pricing_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id text NOT NULL REFERENCES greenhouse_commercial.sellable_artifacts(artifact_id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency IN ('CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN', 'BRL')),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  effective_from date NOT NULL,
  effective_to date,
  scope_assumption text,                            -- "1 brand book ~50 paginas", "video 60s 1080p"
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sellable_artifact_pricing_dates_valid CHECK (effective_to IS NULL OR effective_to > effective_from)
);

ALTER TABLE greenhouse_commercial.sellable_artifact_pricing_currency OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_sellable_artifact_pricing_lookup
  ON greenhouse_commercial.sellable_artifact_pricing_currency (artifact_id, currency, effective_from DESC);

-- ============================================================================
-- 4. service_module_children — nesting depth 3 + cycle detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS greenhouse_commercial.service_module_children (
  parent_module_id text NOT NULL
    REFERENCES greenhouse_core.service_modules(module_id) ON DELETE CASCADE,
  child_module_id text NOT NULL
    REFERENCES greenhouse_core.service_modules(module_id) ON DELETE RESTRICT,
  line_order int NOT NULL,
  quantity numeric(8,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_optional boolean NOT NULL DEFAULT false,
  override_pricing_pct numeric(5,2) CHECK (override_pricing_pct IS NULL OR (override_pricing_pct >= -100 AND override_pricing_pct <= 100)),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_module_id, line_order),
  CONSTRAINT service_module_children_no_self_ref CHECK (parent_module_id != child_module_id)
);

ALTER TABLE greenhouse_commercial.service_module_children OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_service_module_children_child
  ON greenhouse_commercial.service_module_children (child_module_id);

-- Funcion: detecta ciclos en runtime (mejor que CHECK por performance + recursividad)
CREATE OR REPLACE FUNCTION greenhouse_commercial.service_module_has_cycle(
  p_parent_id text,
  p_child_id text
) RETURNS boolean AS $$
DECLARE
  visited text[] := ARRAY[p_parent_id];
  current_level text[] := ARRAY[p_child_id];
  next_level text[];
  depth int := 0;
BEGIN
  -- Si child = parent, ciclo trivial
  IF p_parent_id = p_child_id THEN RETURN true; END IF;

  WHILE array_length(current_level, 1) > 0 AND depth < 10 LOOP
    -- Si algun descendant del child es el parent, hay ciclo
    IF p_parent_id = ANY(current_level) THEN RETURN true; END IF;

    SELECT array_agg(DISTINCT child_module_id) INTO next_level
    FROM greenhouse_commercial.service_module_children
    WHERE parent_module_id = ANY(current_level);

    IF next_level IS NULL OR array_length(next_level, 1) = 0 THEN RETURN false; END IF;

    visited := visited || next_level;
    current_level := next_level;
    depth := depth + 1;
  END LOOP;
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Funcion: profundidad maxima del subarbol (depth check)
CREATE OR REPLACE FUNCTION greenhouse_commercial.service_module_subtree_depth(
  p_module_id text
) RETURNS int AS $$
DECLARE
  current_level text[] := ARRAY[p_module_id];
  next_level text[];
  depth int := 0;
BEGIN
  WHILE array_length(current_level, 1) > 0 AND depth < 10 LOOP
    SELECT array_agg(DISTINCT child_module_id) INTO next_level
    FROM greenhouse_commercial.service_module_children
    WHERE parent_module_id = ANY(current_level);

    IF next_level IS NULL OR array_length(next_level, 1) = 0 THEN RETURN depth; END IF;

    current_level := next_level;
    depth := depth + 1;
  END LOOP;
  RETURN depth;
END;
$$ LANGUAGE plpgsql;

-- Trigger: prevenir ciclos + enforce max depth 3
CREATE OR REPLACE FUNCTION greenhouse_commercial.tg_service_module_children_validate()
RETURNS trigger AS $$
DECLARE
  cycle_detected boolean;
  new_subtree_depth int;
BEGIN
  -- 1. Cycle check
  cycle_detected := greenhouse_commercial.service_module_has_cycle(NEW.parent_module_id, NEW.child_module_id);
  IF cycle_detected THEN
    RAISE EXCEPTION 'Cycle detected: cannot add child % to parent % (creates recursive loop)',
      NEW.child_module_id, NEW.parent_module_id;
  END IF;

  -- 2. Max depth check (parent + child subtree must be <= 2 hops, total tree <= 3 levels)
  new_subtree_depth := 1 + greenhouse_commercial.service_module_subtree_depth(NEW.child_module_id);
  IF new_subtree_depth > 3 THEN
    RAISE EXCEPTION 'Max nesting depth exceeded: adding child % under parent % would create depth %, max allowed is 3',
      NEW.child_module_id, NEW.parent_module_id, new_subtree_depth;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_module_children_validate ON greenhouse_commercial.service_module_children;
CREATE TRIGGER service_module_children_validate
  BEFORE INSERT OR UPDATE ON greenhouse_commercial.service_module_children
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.tg_service_module_children_validate();

-- ============================================================================
-- 5. Granular permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
  greenhouse_commercial.tool_partners,
  greenhouse_commercial.sellable_tools,
  greenhouse_commercial.sellable_tool_pricing_currency,
  greenhouse_commercial.sellable_tool_pricing_tier,
  greenhouse_commercial.sellable_artifacts,
  greenhouse_commercial.sellable_artifact_pricing_currency,
  greenhouse_commercial.service_module_children
TO greenhouse_runtime;

GRANT USAGE, SELECT ON
  greenhouse_commercial.sellable_tool_sku_seq,
  greenhouse_commercial.sellable_artifact_sku_seq
TO greenhouse_runtime;
```

### Slice 2 — Verificacion post-migracion (0.25 dia)

- `pnpm migrate:up` → applies migration
- `pnpm db:generate-types` → regenera `src/types/db.d.ts` con las 7 nuevas tablas
- `pnpm tsc --noEmit` clean
- Smoke test cycle detection: insertar `(A, B)`, intentar `(B, A)` → trigger rechaza
- Smoke test depth: crear cadena `A→B→C→D` → trigger rechaza el 4to nivel

### Slice 3 — Documentacion arquitectonica (0.25 dia)

Actualizar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — agregar 4 tablas al modelo
- `docs/documentation/admin-center/catalogo-productos-fullsync.md` — explicar sellable_tools / sellable_artifacts / partners
- Crear `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (nuevo) con:
  - Diagrama del modelo (4 dimensiones)
  - Reglas de nesting (depth 3, cycle prohibido)
  - HubSpot sync mapping
  - Decision log v1.8

## Out of Scope

- Refactor de `service_tool_recipe` para apuntar a `sellable_tools` (TASK-620.1)
- Admin UI para CRUD de tools / artifacts / partners (TASK-620.3)
- Backfill de tools existentes desde `ai.tool_catalog` (TASK-620.1)
- Composer recursivo de service modules (TASK-620.3)
- Quote builder picker (TASK-620.4 / 620.5)

## Acceptance Criteria

- [ ] migracion aplicada en dev sin errores
- [ ] 4 tablas + 3 pricing tables creadas con FKs correctas
- [ ] funcion `service_module_has_cycle` funcional (manual test)
- [ ] funcion `service_module_subtree_depth` funcional
- [ ] trigger rechaza ciclos (test manual: A→B→A)
- [ ] trigger rechaza depth > 3 (test manual: A→B→C→D)
- [ ] seed de 3 partners (Adobe, Microsoft, HubSpot) presente
- [ ] tipos regenerados con kysely-codegen
- [ ] aplicado en staging + prod despues de QA dev
- [ ] documentacion arquitectura actualizada

## Verification

- `pnpm migrate:status` clean
- `pnpm db:generate-types` ejecutado
- `pnpm tsc --noEmit` clean
- `psql ... -c "SELECT * FROM greenhouse_commercial.tool_partners"` muestra 3 rows
- Test manual del trigger documentado en Handoff.md

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con migracion aplicada por env
- [ ] `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` creado y commiteado
- [ ] `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` actualizado
