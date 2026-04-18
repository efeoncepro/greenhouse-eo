# TASK-467 — Pricing Catalog Admin UI (Self-Service CRUD)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-464a, TASK-464b, TASK-464c`
- Branch: `task/TASK-467-pricing-catalog-admin-ui`
- Legacy ID: `follow-on de TASK-464 umbrella`
- GitHub Issue: `none`

## Summary

Admin UI consolidada bajo `/admin/pricing-catalog` (o equivalente en Control Tower) para CRUD self-service de todas las tablas "config" de pricing: sellable_roles, tool_catalog, overhead_addons, tier margins, commercial model multipliers, country factors. Permite a finance/admin agregar roles nuevos (ej. "Blockchain Developer") o tools (ej. "Cursor AI") sin intervención de dev. Los SKUs se auto-generan via sequences definidos en TASK-464a/c/e y TASK-465. Incluye effective date tracking + audit log.

## Why This Task Exists

TASK-464a/b/c canoniza los catálogos con seed desde Excel. TASK-464d/e usa los catálogos. Pero **la evolución del catálogo post-seed queda en manos de dev hoy** — editar Excel + re-seed requiere developer touch. En un negocio 85% retainer donde:

- Se incorporan nuevos tipos de servicio (crypto → Blockchain Dev)
- Se adoptan nuevas herramientas (Cursor AI, v0, Claude Projects)
- Se ajustan fees operativos (Deel cambia estructura)
- Se abre nuevo mercado (Argentina → nuevo country factor)
- Tier margins se revisan trimestralmente

…sin admin UI, cada cambio es un dev ticket. TASK-467 elimina ese cuello de botella: finance/admin gestionan su propio catálogo con governance auditable.

## Goal

- `/admin/pricing-catalog` home con 6 sub-secciones (una por tabla)
- CRUD forms respetando schema constraints
- SKU auto-generado via DEFAULT sequence al crear (NO se muestra campo editable — se preview después del submit)
- Effective date en todos los cambios con versioning (changes no afectan quotes ya emitidas)
- Audit log (quién cambió qué, cuándo) via pattern de TASK-348 governance
- Permission-gated a `efeonce_admin` + `finance_manager`
- Import bulk desde Excel re-upload como feature opcional

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (permission gating)

Reglas obligatorias:

- SKUs se auto-generan via sequence (TASK-464a/c + TASK-465 ya define los sequences) — la UI NO pide SKU al crear
- Deprecar/desactivar ≠ borrar: soft delete con `active=FALSE`. Historical integrity: quotes históricas siguen referenciando el rol/tool inactivo via role_sku snapshot
- Effective date obligatorio en cambios de cost/pricing (para no retroactivamente alterar quotes existentes)
- Audit log reusa `quotation_audit_log` pattern o crea `pricing_catalog_audit_log` paralelo
- Copy via `greenhouse-ux-writing` skill
- **🛑 AISLAMIENTO PAYROLL**: esta UI NUNCA escribe en `greenhouse_payroll.*`. Panels que muestran rates vigentes de payroll (afp_rates, previred_indicators) son SOLO lectura (SELECT) para referencia. La UI de pricing catalog NO triggerea recálculos de payroll, NO altera compensation_versions, NO toca lógica de `src/lib/payroll/*`. Antes de cerrar, suite `pnpm test src/lib/payroll/` (baseline: 194 tests / 29 files passing al 2026-04-18 — debe mantenerse intacto) debe pasar sin modificación.

## Normative Docs

- TASK-464a, TASK-464b, TASK-464c (schemas existentes)
- TASK-465 (service catalog — tiene su propio admin UI en esa task; TASK-467 NO lo duplica)
- `src/lib/commercial/governance/audit-log.ts` (pattern reusable)

## Dependencies & Impact

### Depends on

- TASK-464a shipped — `sellable_roles` + sequence
- TASK-464b shipped — governance tables
- TASK-464c shipped — `ai.tool_catalog` extensions + `overhead_addons` + sequence
- Permission infra (tenant authorization) existente

### Blocks / Impacts

- Habilita Efeonce a operar catálogo sin dev
- Desbloquea expansión a nuevos mercados (nuevo country factor)
- Reduce TTM de servicios nuevos (dev ticket → admin action)

### Files owned

- `src/app/(dashboard)/admin/pricing-catalog/page.tsx` (home + routing)
- `src/app/(dashboard)/admin/pricing-catalog/roles/**` (CRUD UI sellable roles)
- `src/app/(dashboard)/admin/pricing-catalog/tools/**`
- `src/app/(dashboard)/admin/pricing-catalog/overheads/**`
- `src/app/(dashboard)/admin/pricing-catalog/tiers/**` (role + service tier margins)
- `src/app/(dashboard)/admin/pricing-catalog/commercial-models/**`
- `src/app/(dashboard)/admin/pricing-catalog/country-factors/**`
- `src/app/api/admin/pricing-catalog/roles/route.ts` + `[id]/route.ts`
- `src/app/api/admin/pricing-catalog/tools/route.ts` + `[id]/route.ts`
- (idem per entity)
- `src/app/api/admin/pricing-catalog/import-excel/route.ts` (bulk import)
- `src/views/greenhouse/admin/pricing-catalog/*.tsx` (view components)
- `src/lib/commercial/pricing-catalog-admin-store.ts` (writers consolidados)
- `migrations/[verificar]-task-467-pricing-catalog-audit-log.sql`

## Current Repo State

### Already exists

- Schemas de TASK-464a/b/c (sellable_roles + governance + tool_catalog + overhead_addons)
- Sequences definidos en TASK-464a/c (SKU auto-gen)
- TASK-348 governance: pattern de audit log + approval policies
- Permission infra

### Gap

- No existe UI para CRUD de ninguna de las tablas de pricing config
- No hay audit log centralizado para pricing changes
- No hay import bulk desde Excel (otro que el seeder)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## UI Plan

Esta task implementa UI descrita en **[TASK-469](TASK-469-commercial-pricing-ui-interface-plan.md)**. Consumir en lugar de re-especificar:

- **Surface H — Admin Pricing Overview**: 4 KPI cards (`HorizontalWithSubtitle`) + 9 `PricingCatalogNavCard` (nueva en §3.9) en Grid 3-columnas.
- **Surface I — Entity List**: reusa `full-version/src/views/apps/ecommerce/products/list/ProductListTable.tsx` + `TableFilters.tsx` + `ProductCard.tsx` stats → `CatalogEntityListTable.tsx` (generic con column factory para 4 entidades: roles/tools/overhead/services).
- **Surface J — Entity Edit**: reusa `ecommerce/products/add/ProductInformation.tsx` + `ProductPricing.tsx` + `ProductOrganize.tsx` como templates. Derivar `RoleInformation.tsx`, `ToolInformation.tsx`, `OverheadInformation.tsx`, `ServiceInformation.tsx` en `src/components/greenhouse/pricing/`.
- **Surface L — Governance Panel**: tabs (tiers / commercial models / country factors / employment types / audit timeline). Simple entity tables reusan `ecommerce/products/category/ProductCategoryTable.tsx` + `AddCategoryDrawer.tsx` → `SimpleEntityTable.tsx` + `QuickEntityFormDrawer.tsx` (TASK-469 §3.7).
- **PriceChangeAuditTimeline**: nuevo componente en §3.8 — MUI Lab `Timeline` con entidad + campo + valor viejo/nuevo + autor + razón.
- **Copy**: `GH_PRICING.adminTitle` y todos los `admin*` (TASK-469 §4).
- **A11y**: tabs con `aria-controls` + `role="tablist"`; audit timeline como `<ol>` semántico; entity list tables con `<caption>` y `aria-sort`.

## Scope

### Slice 1 — Audit log schema

```sql
CREATE TABLE greenhouse_commercial.pricing_catalog_audit_log (
  audit_id text PRIMARY KEY DEFAULT 'pcaud-' || gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN (
    'sellable_role', 'tool_catalog', 'overhead_addon',
    'role_tier_margin', 'service_tier_margin',
    'commercial_model_multiplier', 'country_pricing_factor',
    'fte_hours_guide'
  )),
  entity_id text NOT NULL,                            -- role_id / tool_id / etc.
  entity_sku text,                                    -- 'ECG-034' para trazabilidad humana
  action text NOT NULL CHECK (action IN (
    'created', 'updated', 'deactivated', 'reactivated',
    'cost_updated', 'pricing_updated', 'bulk_imported'
  )),
  actor_user_id text NOT NULL,
  actor_name text NOT NULL,
  change_summary jsonb NOT NULL,                      -- { "fields_changed": ["hourly_cost_usd", "bonus_jit_usd"], "previous_values": {...}, "new_values": {...} }
  effective_from date,                                -- cuándo el cambio rige (puede ser futuro)
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pc_audit_entity ON greenhouse_commercial.pricing_catalog_audit_log (entity_type, entity_id);
CREATE INDEX idx_pc_audit_actor ON greenhouse_commercial.pricing_catalog_audit_log (actor_user_id);
```

### Slice 2 — Home + navigation

- `/admin/pricing-catalog` landing page con 7 tiles:
  - **Roles** (count activos / total) → `/admin/pricing-catalog/roles`
  - **Modalidades de contrato** (employment types) → `/admin/pricing-catalog/employment-types`
  - **Herramientas** → `/admin/pricing-catalog/tools`
  - **Overheads y Fees** → `/admin/pricing-catalog/overheads`
  - **Tiers de margen** → `/admin/pricing-catalog/tiers` (role + service)
  - **Modelos comerciales** → `/admin/pricing-catalog/commercial-models`
  - **Factores por país** → `/admin/pricing-catalog/country-factors`
- Cada tile muestra KPI: count activos, último cambio (fecha + actor), botón "Administrar"

### Slice 3 — CRUD Roles (referencia — otros catálogos siguen mismo patrón)

**List view** `/admin/pricing-catalog/roles`:
- TanStack table con columnas: SKU · Categoría · Rol · Tier · Tipo (Staff/Servicio) · Cost USD/h · Bill USD/h · Active
- Filtros: categoría, tier, staff-able, active
- Búsqueda
- Botón "+ Nuevo rol" primary
- Click row → detail

**Detail + edit view** `/admin/pricing-catalog/roles/[id]`:
- Tab **Info general**: role_label (es/en), category, tier, tipo (staff/service), active toggle, notes
- Tab **Modalidades de contrato**: gestión de `role_employment_compatibility` — lista de employment_types admitidos con toggle allowed + radio default. Agregar nuevos con autocomplete desde `employment_types` catalog.
- Tab **Cost components por modalidad**: sub-tabs por cada employment_type admitido (indefinido_clp / honorarios_clp / contractor_deel_usd / etc). Cada sub-tab: base_salary_usd, 4 bonos, gastos_previsionales (override o inherit de employment_type.previsional_pct_default), fee_deel, fee_eor, hours_per_fte_month → auto-calcula total + hourly cost preview. Cambiar requiere `effective_from` date. **Sinergia con payroll**: cuando employment_type.source_of_truth='greenhouse_payroll_chile_rates', la UI muestra rates vigentes en payroll como comparación ("AFP vigente en payroll: 11.5% — tu valor: X%") sin forzar actualización.
- Tab **Pricing currency**: 6 filas editables (USD/CLP/CLF/COP/MXN/PEN) con margin_pct, hourly_price, fte_monthly_price. Cambiar requiere effective_from.
- Tab **Historia**: audit log del rol (todos los cambios con diff)

**Create new role** `/admin/pricing-catalog/roles/new`:
- Form multi-step:
  - Step 1: info general (role_label, category, tier, tipo) → al submit, INSERT sin SKU → **DEFAULT sequence genera ECG-034+** → se muestra SKU asignado al usuario
  - Step 2: cost components
  - Step 3: pricing por currency (puede auto-calcular desde margin del tier + country factor como default)
- Al finalizar, audit log registra `action='created'`

### Slice 4 — CRUD Tools

**List**: SKU · Categoría · Nombre · Provider · Prorated price USD · Active · Incluye en addon
**Detail + edit**:
- Tab Info: name, category, type, provider (autocomplete contra greenhouse_core.providers), website_url, icon_url, description
- Tab Costos: subscription_amount, billing_cycle, prorating_qty/unit, prorated_cost, prorated_price, applicable_business_lines (multiselect)
- Tab Historia
- **Create new**: form multi-step; al submit DEFAULT sequence → ETG-027+

### Slice 5 — CRUD Overheads

- Similar patrón. Tipos: overhead_fixed / fee_percentage / fee_fixed / fee_fixed_monthly / adjustment_pct
- Form adapta campos según tipo seleccionado
- Visibility toggle (visible_to_client)
- **Create new**: DEFAULT sequence → EFO-010+

### Slice 6 — CRUD Employment Types

**List view** `/admin/pricing-catalog/employment-types`:
- Columnas: code · label · currency · country · previsional? · fee USD · source_of_truth · active
- Click row → detail

**Detail + edit**:
- Info: label_es/en, payment_currency, country_code, applies_previsional, applies_bonuses, source_of_truth
- Rates defaults: previsional_pct_default, fee_monthly_usd_default, fee_pct_default
- Historia audit
- **Sinergia con payroll**: cuando `source_of_truth='greenhouse_payroll_chile_rates'`, panel lateral muestra rates vigentes leídos en SELECT-only de payroll tables (afp_rates, previred_indicators) para que admin valide drift. NO se puede triggerar sync desde aquí — ese es scope de TASK-468.

**Create new**: form simple; code se escribe (no auto-sequence porque son string-based codes manuales)

### Slice 7 — CRUD Tiers / Commercial Models / Country Factors

- Estos son lookup tables chicos (4-11 filas). List view + inline edit (no separate detail page)
- Tier: min/opt/max margin sliders + validation (min ≤ opt ≤ max)
- Country factor: min/opt/max factors + applies_when description
- Cambios con effective_from

### Slice 7 — Import bulk desde Excel

- `/admin/pricing-catalog/import-excel`:
  - Drag-drop Excel upload
  - Parse sheets + preview diff contra DB actual
  - Confirm → ejecuta UPSERT idempotente (mismo seeder logic que TASK-464a/c/b)
  - Audit log registra `action='bulk_imported'` con count de changes
- Permite que Efeonce siga editando en Excel y suba actualizaciones cuando quieran

### Slice 8 — Permission gating + tests

- `requireAdminOrFinanceManager()` helper (nuevo o reuso)
- Todas las rutas bajo `/admin/pricing-catalog/**` gated
- Tests de permission con agent-session de roles distintos
- E2E Playwright: crear rol nuevo → aparece en picker de QuoteCreateDrawer (TASK-464e)

## Out of Scope

- Service catalog admin UI (TASK-465 lo tiene)
- FTE hours guide admin UI (solo 11 filas fijas — rarísimo cambia; hasta Efeonce no lo pida, queda como config seeded)
- Public API para que terceros lean catálogo (internal-only por ahora)
- Workflow de approval para cambios (TASK-348 governance podría extenderse; follow-up)

## Detailed Spec

### SKU auto-generation (referencia a task padre)

Las sequences ya están definidas en TASK-464a/c + TASK-465. TASK-467 solo consume:

```sql
-- TASK-464a defines:
greenhouse_commercial.sellable_role_sku_seq (START 34)
-- TASK-464c defines:
greenhouse_ai.tool_sku_seq (START 27)
greenhouse_commercial.overhead_addon_sku_seq (START 10)
-- TASK-465 defines:
greenhouse_commercial.service_sku_seq (START 8)
```

El admin API hace `INSERT INTO sellable_roles (role_label_es, category, tier, ...) VALUES (...)` **SIN role_sku** → DEFAULT dispara la sequence → SKU `ECG-034` se asigna → se retorna al UI que lo muestra.

### Historia + versioning

Cada tabla tiene `effective_from` en sus componentes versionables (cost_components, pricing_currency). Al editar:
- Si `effective_from <= hoy`: INSERT nueva fila con fecha today; la fila vieja queda como histórica
- Si `effective_from > hoy`: INSERT programado — queries existentes siguen leyendo la fila vigente hasta la fecha
- Queries del pricing engine usan `ORDER BY effective_from DESC LIMIT 1 WHERE effective_from <= quote_date`

Esto permite: "Subo los sueldos en mayo (effective 2026-05-01) pero cotizo hoy con rates actuales."

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/admin/pricing-catalog` landing page carga con 6 tiles
- [ ] CRUD completo de sellable_roles: crear rol nuevo genera SKU ECG-034 automático
- [ ] CRUD completo de tools: nuevo tool genera ETG-027
- [ ] CRUD completo de overheads: nuevo addon genera EFO-010
- [ ] Tiers/commercial/country factors editables inline
- [ ] Cambios de cost/pricing requieren effective_from
- [ ] Audit log registra todos los cambios con diff
- [ ] Permission gate: solo efeonce_admin + finance_manager acceden
- [ ] Import Excel funciona sin duplicar (idempotente)
- [ ] Rol nuevo creado aparece inmediatamente en QuoteCreateDrawer picker (TASK-464e)

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Playwright E2E: flow completo "crear rol" → "cotizar" con ese rol nuevo
- Manual staging: admin agrega "Blockchain Developer" ECG-034 + cost + pricing → finance crea quote con ese rol → precios correctos

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con "catálogo self-service live para Efeonce"
- [ ] Chequeo impacto cruzado con TASK-464e (pickers), TASK-465 (service composition), TASK-462 (MRR/ARR)
- [ ] Documentación funcional en `docs/documentation/finance/administracion-catalogo-pricing.md`

## Follow-ups

- Workflow de approval para cambios críticos (ej. bajar un margin_min requiere aprobación de efeonce_admin)
- Bulk edit (seleccionar 10 roles + ajustar salary +5% todos)
- Preview del impacto de un cambio de rate en quotes vigentes (reporte "cuántas quotes activas afectaría")
- Public read-only API si clients/partners necesitan consumir catálogo

## Open Questions

- ¿Ubicación UI: `/admin/pricing-catalog` o dentro de `/finance/` surface? Propuesta: `/admin/` porque es governance-level (solo admin/finance_manager). Si finance users quieren acceso rápido, agregar shortcut desde `/finance/` menu.
- ¿Workflow de approval en V1 o se difiere? Propuesta: **se difiere** a follow-up — V1 confía en que efeonce_admin sabe lo que hace. Audit log garantiza traceability.
- ¿Rol recién creado pero sin pricing en las 6 currencies queda "incompleto" o se bloquea el CREATE? Propuesta: form multi-step obliga a llenar al menos USD + CLP (dos monedas de Efeonce); las otras 4 (CLF/COP/MXN/PEN) son opcionales y se computan auto desde USD si no las llenan. Evita bloquear creación.
