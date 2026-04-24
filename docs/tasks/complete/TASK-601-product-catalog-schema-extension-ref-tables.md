# TASK-601 — Product Catalog Schema Extension + 4 Reference Tables (TASK-587 Fase A)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `TASK-587` (umbrella) → `TASK-544` (program parent)
- Status real: `Cerrada`
- Closed at: `2026-04-24`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-601-product-catalog-schema-extension`

## Summary

Extiende `greenhouse_commercial.product_catalog` con 16 columnas nullable que el resto del programa TASK-587 consume (rich description, product type, category, unit, tax category, pricing model, classification, recurrencia, owner bridge, marketing URL, image URLs). Crea 4 tablas de referencia con seed: `product_categories`, `product_units`, `tax_categories`, `product_source_kind_mapping`. Ejecuta Discovery one-time contra HS para inventariar valores existentes y sembrar adecuadamente. Backfill desde `greenhouse_finance.products` legacy.

## Why This Task Exists

Foundation de TASK-587. Sin estas columnas y tablas, las Fases B (multi-currency), C (outbound v2), D (inbound rehydration) y E (admin UI) no tienen dónde persistir el modelo extendido. El `source_kind → hs_product_type` mapping table-driven (no hardcoded) permite que operadores ajusten sin deploy. Las tablas ref de categoría/unidad/tax son vocabularios controlados que evitan free-text y habilitan mapping bidi 1:1 con HubSpot enumerations.

## Goal

- `product_catalog` extendido con 16 columnas nullable.
- 4 tablas ref creadas y sembradas (mínimo: cubren los valores actuales en HS portal `48713323` + defaults Chile).
- Tipos Kysely regenerados, `pnpm pg:doctor` green.
- Backfill desde `greenhouse_finance.products` no destructivo.
- Discovery script `scripts/discovery/hubspot-products-inventory.ts` ejecutado y output guardado en `docs/operations/discovery-hubspot-products-inventory-{YYYYMMDD}.md` para semilla de las tablas ref.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (node-pg-migrate flow + Kysely codegen)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` (modelo dos capas)

Reglas obligatorias:

- Migraciones via `pnpm migrate:create` (NUNCA crear archivos manuales con timestamp manipulado).
- Columnas nuevas siempre nullable inicialmente; constraints después con migración separada si requiere.
- `pnpm db:generate-types` después de cada migración aplicada.
- Backfill idempotente: re-correr el script no debe generar duplicados ni overwrites destructivos.

## Normative Docs

- `docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md` (umbrella — referencia para SoT table + Mapping decisions)

## Dependencies & Impact

### Depends on

- `TASK-545` ✅ — Schema foundation del programa parent (provee `product_catalog` base)
- `greenhouse_core.members` table (FK target para `commercial_owner_member_id`)
- `greenhouse_finance.products` legacy (fuente de backfill)
- HubSpot MCP / API access para Discovery script

### Blocks

- `TASK-602` (Multi-Currency) — necesita `product_catalog` existente como FK target
- `TASK-603` (Outbound v2) — necesita ref tables para resolver category/unit/tax codes
- `TASK-604` (Inbound) — necesita columnas para hidratar
- `TASK-605` (Admin UI) — necesita ref tables como source de autocomplete

### Files owned

- `migrations/{timestamp}_task-601-product-catalog-extension.sql` (new — 16 columnas, con prefijo `hubspot_` donde aplica para evitar colisión con `product_type`/`pricing_model` GH-internos)
- `migrations/{timestamp}_task-601-product-catalog-reference-tables.sql` (new — 4 tablas)
- `migrations/{timestamp}_task-601-product-catalog-backfill.sql` (new — backfill desde finance.products)
- `scripts/discovery/hubspot-products-inventory.ts` (new)
- `src/lib/commercial/product-catalog-references.ts` (new — readers de ref tables)
- `src/lib/commercial/product-catalog-references.test.ts` (new)
- `src/types/db.d.ts` (regenerated)
- `docs/operations/discovery-hubspot-products-inventory-{YYYYMMDD}.md` (new — output Discovery)

## Current Repo State

### Already exists

- `greenhouse_commercial.product_catalog` con columnas base ([TASK-545 schema](docs/tasks/complete/TASK-545-product-catalog-schema-materializer-foundation.md))
- `greenhouse_core.members.member_id` ([identity model](docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md))
- `greenhouse_finance.products` legacy con `unit_price`, `cost_of_goods_sold`, `tax_rate`, `is_recurring`, `billing_frequency`, `billing_period_count`, `is_active`
- Tooling `pnpm migrate:create` + `pnpm db:generate-types` ([GREENHOUSE_DATABASE_TOOLING_V1](docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md))

### Gap

- `product_catalog` NO tiene: rich description, product type, category, unit, tax category, pricing model, classification, bundle type, recurrencia normalizada, owner, marketing URL, image URLs.
- NO existen tablas ref: `product_categories`, `product_units`, `tax_categories`, `product_source_kind_mapping`.
- NO existe Discovery tool para inventariar HS products properties.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery script

- `scripts/discovery/hubspot-products-inventory.ts` que:
  - Itera los 74 productos HS via MCP/API
  - Reporta distribución de `categoria_de_item`, `unidad`, `hs_url`, `hs_images`, `hubspot_owner_id`, `hs_pricing_model`, `hs_product_classification`, `hs_bundle_type`, `hs_product_type`
  - Captura productos con `hs_price_*` poblado (validación assumption "0 productos con precio")
  - Output Markdown en `docs/operations/discovery-hubspot-products-inventory-{YYYYMMDD}.md`
- Output decide seed de tablas ref Slice 3.

### Slice 2 — Migration: catalog extension

- `migrations/{ts}_task-601-product-catalog-extension.sql` con 16 columnas nullable.
- **Columnas HS-alignadas (prefijo `hubspot_`** para evitar colisión con `product_type` / `pricing_model` GH-internos existentes, ver Delta 2026-04-24):
  - `description_rich_html TEXT`
  - `hubspot_product_type_code TEXT` (valores HS: `service|inventory|non_inventory`)
  - `category_code TEXT`
  - `unit_code TEXT`
  - `tax_category_code TEXT`
  - `hubspot_pricing_model TEXT DEFAULT 'flat'` (valores HS: `flat|volume|stairstep|graduated`)
  - `hubspot_product_classification TEXT DEFAULT 'standalone'` (valores HS: `standalone|variant|bundle`)
  - `hubspot_bundle_type_code TEXT DEFAULT 'none'` (valores HS: `none|open`)
  - `is_recurring BOOLEAN DEFAULT FALSE`
  - `recurring_billing_period_iso TEXT` (ISO 8601 duration, ej. `P12M` — HS lo expone como string, no enum)
  - `recurring_billing_frequency_code TEXT` (valor HS directo: `weekly|biweekly|monthly|quarterly|per_six_months|annually|per_two_years|per_three_years|per_four_years|per_five_years`)
  - `commercial_owner_member_id TEXT REFERENCES greenhouse_core.members(member_id)`
  - `commercial_owner_assigned_at TIMESTAMPTZ`
  - `owner_gh_authoritative BOOLEAN DEFAULT FALSE`
  - `marketing_url TEXT`
  - `image_urls TEXT[] DEFAULT ARRAY[]::TEXT[]`
- Las columnas GH-internas existentes (`product_type`, `pricing_model`) quedan intactas — siguen su lógica interna.
- Index: `CREATE INDEX IF NOT EXISTS idx_product_catalog_owner ON product_catalog(commercial_owner_member_id) WHERE commercial_owner_member_id IS NOT NULL;`
- `pnpm migrate:up` + auto-regen types.

### Slice 3 — Migration: reference tables + seed

- `migrations/{ts}_task-601-product-catalog-reference-tables.sql`:
  - `greenhouse_commercial.product_categories (code PK, label_es, label_en, hubspot_option_value, active, display_order)`
  - `greenhouse_commercial.product_units (code PK, label_es, label_en, hubspot_option_value, active, display_order)`
  - `greenhouse_finance.tax_categories (code PK, label_es, hubspot_option_value, default_rate_pct, jurisdiction)`
  - `greenhouse_commercial.product_source_kind_mapping (source_kind PK, hubspot_product_type, notes)`
- Seeds (alineados a options reales de HS portal `48713323` confirmadas en Discovery):
  - `product_units` — 12 filas (match 1:1 con HS enumeration `unidad`):
    - `Hora`, `FTE`, `Dia`, `Mes`, `Trimestre`, `Proyecto`, `Entrega`, `Año`, `Licencia`, `Bolsa`, `Creditos`, `Addon`
    - Para cada: `hubspot_option_value` = label exacto HS (mantiene tildes en Spanish)
  - `product_categories` — 5 filas (match 1:1 con HS enumeration `categoria_de_item`):
    - `staff_augmentation` → HS `Staff augmentation`
    - `proyecto_implementacion` → HS `Proyecto o Implementación`
    - `retainer_ongoing` → HS `Retainer (On-Going)`
    - `consultoria_estrategica_ip` → HS `Consultoría Estratégica - IP`
    - `licencia_acceso_tecnologico` → HS `Licencia / Acceso Tecnológico`
  - `tax_categories` — 3 filas Chile:
    - `standard_iva_19` (Chile, 19%, `hubspot_option_value=NULL` hasta que HS portal admin configure options)
    - `exempt` (0%, `hubspot_option_value=NULL`)
    - `non_taxable` (0%, `hubspot_option_value=NULL`)
    - Nota: `hs_tax_category` options array está vacío en el portal actual (confirmed Discovery). Follow-up governance: coordinar con HS admin la creación de options para habilitar mapping bidi.
  - `product_source_kind_mapping` — 5 filas (GH `source_kind` → HS `hs_product_type`):
    - `service → service`
    - `sellable_role → service`
    - `tool → non_inventory`
    - `overhead_addon → non_inventory`
    - `manual → service` (default)

### Slice 4 — Backfill desde finance.products

- `migrations/{ts}_task-601-product-catalog-backfill.sql`:
  - Para cada `greenhouse_finance.products` con `hubspot_product_id`, copiar `is_recurring`, `billing_frequency` (si mapea a un ref code), tax info si aplicable.
  - **No** copiar `unit_price` aquí — eso es responsabilidad de Fase B (TASK-602).
  - Idempotente: usa `ON CONFLICT DO UPDATE WHERE col IS NULL` para no sobrescribir si ya hay valor.

### Slice 5 — Readers + tests

- `src/lib/commercial/product-catalog-references.ts` exporta:
  - `listProductCategories()`, `getProductCategoryByCode(code)`, `getCategoryByHubspotValue(value)`
  - Mismos shapes para units, tax_categories, source_kind_mapping
- Cache simple en memoria (TTL 60s) para evitar query por cada outbound — invalidar en admin update (out of scope hasta Fase E).
- Tests unitarios cubren: listar, lookup directo, lookup reverse via `hubspot_option_value`, manejo de codes inactivos.

## Out of Scope

- Multi-currency prices → TASK-602 (Fase B)
- Outbound contract changes → TASK-603 (Fase C)
- Inbound mapping de HS values a codes → TASK-604 (Fase D)
- Admin UI para editar tablas ref → TASK-605 (Fase E) o follow-up
- FX derivation logic → TASK-602

## Detailed Spec

Spec heavy en [TASK-587 § Detailed Spec](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md) — secciones:

- Currency canonical set (info; usado por Fase B)
- Source kind to product type mapping (seed para Slice 3)
- SoT Direction Table (referencia futura para Fase C/D)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `product_catalog` extendido con 16 columnas nullable (incluye prefijo `hubspot_` en 4 de ellas para evitar colisión con GH-internas existentes `product_type`/`pricing_model`); `\d greenhouse_commercial.product_catalog` muestra todas
- [ ] 4 tablas ref creadas; `SELECT count(*)` por cada una devuelve seed > 0
- [ ] `product_source_kind_mapping` cubre los 5 source kinds (service, sellable_role, tool, overhead_addon, manual)
- [ ] Tipos Kysely regenerados; `npx tsc --noEmit` green
- [ ] Backfill no destructivo: re-correr no cambia datos existentes
- [ ] Discovery output existe en `docs/operations/discovery-hubspot-products-inventory-{YYYYMMDD}.md`
- [ ] Readers en `product-catalog-references.ts` cubren list + lookup directo + lookup reverse
- [ ] Tests passing

## Verification

- `pnpm migrate:status` muestra las 3 migraciones aplicadas
- `pnpm pg:doctor` green
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/commercial/product-catalog-references.test.ts`
- Verificación manual: `psql ... -c "SELECT * FROM greenhouse_commercial.product_source_kind_mapping;"` devuelve 5 filas

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con: schema extendido, ref tables sembradas, output Discovery linkeado
- [ ] `changelog.md`: 16 columnas + 4 tablas ref nuevas
- [ ] Update TASK-587 con nota: Fase A completada
- [ ] Desbloquear TASK-602 (Fase B) — registrar en su Status como `Blocked by: none` cuando quede en posición de iniciar

## Follow-ups

- Si Discovery revela categorías HS no contempladas en seed → completar `product_categories` en migración follow-up
- Admin UI para CRUD de tablas ref → TASK-605 o follow-up separado si emerge necesidad
- `gh_business_line` data quality cleanup (casing inconsistente wave/Wave, multi-BU string) — follow-up separado; TASK-601 solo reporta en Discovery
- Coordinar con HubSpot portal admin la creación de `hs_tax_category` options (array vacío hoy) para habilitar mapping bidi en Fase C/D
- 42/74 productos ya tienen `hs_price_*` poblados + 33/74 con `hs_cost_of_goods_sold` real — propagar a TASK-602 Discovery seed como autoritativos de partida

## Delta 2026-04-24

Post-Discovery (Phase 2 Audit) — correcciones aplicadas antes de implementar:

1. **Prefijo `hubspot_` en 4 columnas HS-alignadas** para evitar colisión con `product_type` (existe, NOT NULL, CHECK `service|deliverable|license|infrastructure`) y `pricing_model` (existe, nullable, CHECK `staff_aug|retainer|project|fixed`). Nuevas columnas HS: `hubspot_product_type_code`, `hubspot_pricing_model`, `hubspot_product_classification`, `hubspot_bundle_type_code`.
2. **Seed `product_units` ajustado de 7 a 12 filas** para match 1:1 con HS enumeration `unidad` options reales (Hora, FTE, Día, Mes, Trimestre, Proyecto, Entrega, Año, Licencia, Bolsa, Créditos, Addon).
3. **Seed `product_categories` especificado** con los 5 valores reales en HS portal `48713323`.
4. **`recurring_billing_period_code TEXT` → `recurring_billing_period_iso TEXT`** — HS guarda ISO 8601 duration string (e.g. `P12M`), no enumeration.
5. **`recurring_billing_frequency_code`** permanece; guarda el string HS directo (no se crea ref table separada — options son fijas de HubSpot API).
6. **`hs_tax_category` options vacío** en portal HS actual → tax_categories seed con `hubspot_option_value=NULL`; follow-up governance coordinar con HS admin.
7. **No-green-field confirmado en HS**: 42/74 productos tienen `hs_price_*` poblados + 33/74 tienen `hs_cost_of_goods_sold` real. No bloquea TASK-601 (solo schema), pero propagar a TASK-602 Discovery seed (Fase B) y TASK-603 COGS unblock (Fase C).
