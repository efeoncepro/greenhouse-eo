# TASK-465 — Service Composition Catalog + Admin UI + Quote Picker

## Delta 2026-04-18 — Reconciliación con modelo canónico

Antes de arrancar implementación, reconciliación vs el 360 object model del CLAUDE.md (`Servicio → greenhouse_core.service_modules.module_id`) + la regla "módulos de dominio extienden estos objetos, no crean identidades paralelas".

**Problema con la spec original:** crear `greenhouse_commercial.service_catalog` con su propio `service_id` genera una identidad paralela de "servicio" al lado de `greenhouse_core.service_modules` que ya es el canónico. Dos dueños del concepto "servicio", cero fuente de verdad.

**Pivot arquitectónico:**

1. **Identidad canónica = `greenhouse_core.service_modules.module_id`.** Cualquier servicio vendible tiene una fila ahí primero (module_code, module_name, business_line, module_kind, status). `service_modules` es owner del nombre, categoría operativa y BL. Seed reusa los `module_id` que ya existen para los 7 EFG; si no existen, los crea ahí.
2. **Capa comercial extiende, no reemplaza.** Sustituyo `service_catalog` por `greenhouse_commercial.service_pricing` (o un nombre equivalente) con FK `module_id REFERENCES greenhouse_core.service_modules(module_id)`. Esta tabla aporta solo lo comercial: `service_sku` (EFG-XXX), `tier`, `commercial_model`, `service_unit` (project/monthly), `default_duration_months`, `default_description`, `active`. El admin crea/edita filas acá; las altas nuevas insertan en `service_modules` automáticamente si no existen.
3. **Recipes apuntan a identidad canónica.** `service_role_recipe` y `service_tool_recipe` cambian FK: `module_id` en vez de `service_id`.
4. **EFG-XXX es SEED, no límite.** La spec original lista 7 activos + 41 placeholders. El diseño debe ser ilimitado por construcción: admin UI permite agregar N servicios sin dev ni migración. La sequence `service_sku_seq` ya está prevista — solo refuerzo que se documente como extensible.
5. **Trazabilidad en quote**: `quotation_line_items.module_id` (en vez de `service_sku` directo) como FK canónico, con `service_sku` como columna derivada read-only para display. Si se renombra el SKU, el quote histórico sigue atado al `module_id`.
6. **El botón "+ Servicio" del picker drawer** (5to tab, hoy placeholder) consume `service_modules` via JOIN con `service_pricing` — solo activos con pricing configurado aparecen.

**Impacto del pivot en acceptance criteria:**
- Schema cambia: drop `service_catalog`, add `service_pricing` con FK a `service_modules`
- Seed primero UPSERT en `service_modules`, luego INSERT en `service_pricing`
- Admin UI escribe a las dos tablas en una transacción (crear servicio = crear `service_modules` row + `service_pricing` row)
- Recipe FKs migran a `module_id`

El resto de la spec (pricing engine v2 integration, picker drawer, reporting hooks) queda igual — solo el modelo de datos pivota.

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
- Domain: `finance`
- Blocked by: `TASK-464a, TASK-464c (tool catalog extension), TASK-464d (engine v2)`
- Branch: `task/TASK-465-service-composition-catalog-ui`
- Legacy ID: `parte de revenue pricing program`
- GitHub Issue: `none`

## Summary

Canonicalizar el catálogo de servicios compuestos de Efeonce (EFG-XXX SKU) — 7 servicios ya definidos en el Excel + expandible por admin. Cada servicio tiene un recipe de roles (quantity × hours) + tools (quantity) que al seleccionarlo en el cotizador auto-expande a líneas editables. Agrega admin UI para CRUD + service picker en `QuoteCreateDrawer`. Habilita MRR/ARR por servicio (TASK-462) y reportería de margin per service.

## Why This Task Exists

Efeonce vende **servicios compuestos reusables** (Onboarding HubSpot Marketing Pro, Servicio de Diseño Digital Full Funnel, Servicio de Performance y Paid Ads, etc.). Cada servicio tiene una recipe tipo "X horas del Rol A + Y horas del Rol B + Z tools" con pricing calculado desde los tiers y commercial model.

Hoy: viven en Excel, cada cotizador arma desde cero. Resultado:
- Trabajo repetido en cada quote
- Inconsistencia en composición entre AEs
- Imposible reportar MRR per service, margin per service
- No hay reusable templates que evolucionen

TASK-349 tiene "templates de quote" (snapshots de line items anteriores), pero eso es quote-level snapshots, no service-level canonical.

## Goal

- **Extender el modelo canónico**: `greenhouse_core.service_modules` (identidad) + `greenhouse_commercial.service_pricing` (capa comercial) + `service_role_recipe` + `service_tool_recipe`, todos con FK al `module_id` canónico
- Seed de los 7 servicios EFG del Excel como SEED inicial (no límite) — admin UI soporta N servicios
- Admin UI CRUD para finance/admin (crear / editar / activar / desactivar sin dev, sin migración)
- Service picker en `QuoteCreateDrawer` como 5to modo (además de los 4 de TASK-464e: role/person/tool/overhead)
- `quotation_line_items.module_id` FK canónico + `service_sku` columna derivada read-only (trazabilidad robusta a renames)
- Reporting: MRR / profitability / margin por servicio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — **`Servicio → greenhouse_core.service_modules.module_id`** es la identidad canónica; la capa comercial extiende

Reglas obligatorias:

- **Extensión, no identidad paralela**: cualquier fila en `service_pricing` debe tener `module_id` que exista en `service_modules`. Admin UI crea ambos en transacción
- Service al seleccionarse en drawer SNAPSHOT las líneas: cambios futuros al service recipe no afectan quotes emitidas (integrity histórica)
- `service_pricing` NO obliga — el cotizador sigue funcionando sin seleccionar service (Mode B/C/D/E de TASK-464e)
- Admin CRUD gated a `finance_admin` + `efeonce_admin` (roles reales, ver role-codes.ts; la spec antigua decía `finance_manager` inexistente)
- Consume pricing engine v2 (TASK-464d) para calcular total del service (no duplica logic)
- Seed es SEED, no límite: admin agrega EFG-008+ sin dev

## Normative Docs

- `data/pricing/seed/service-composition.csv`
- `data/pricing/seed/service-pricing.csv`
- Hojas "Estructura de Servicios" + "Precios Servicios" del Excel

## Dependencies & Impact

### Depends on

- TASK-464a — `sellable_roles` existe para FK del recipe
- TASK-464c — `ai.tool_catalog` extendido para FK
- TASK-464d — pricing engine v2 para calcular totales
- TASK-464e — `QuoteCreateDrawer` refactoreado (se extiende para agregar service picker)

### Blocks / Impacts

- TASK-462 — MRR/ARR por servicio como dimensión analítica nueva
- TASK-460 — Contract hereda `service_sku` del quote originator
- Reporting comercial: margin per service como KPI ejecutivo

### Files owned

- `migrations/[verificar]-task-465-service-catalog-schema.sql`
- `scripts/seed-service-catalog.ts`
- `src/lib/commercial/service-catalog-store.ts`
- `src/lib/commercial/service-pricing.ts` (usa engine v2 para calcular total)
- `src/lib/commercial/service-events.ts`
- `src/app/api/finance/service-catalog/route.ts` + `[id]/route.ts` (admin CRUD)
- `src/app/api/finance/quotes/from-service/route.ts` (expand service → line items)
- `src/views/greenhouse/finance/ServiceCatalogView.tsx`
- `src/views/greenhouse/finance/workspace/ServicePickerDrawer.tsx`
- Extensión de `QuoteCreateDrawer.tsx` con service picker
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- TASK-349 — template system (quote snapshots)
- TASK-464a — sellable_roles
- TASK-464c — tool_catalog extendido
- CSV seeds en `data/pricing/seed/`

### Gap

- No hay canonical service_catalog — solo quote templates (diferente: quote template es 1 snapshot, service_catalog es recipe evolucionable)
- No hay service picker en drawer
- No hay admin UI para gestionar servicios
- `quotation_line_items` no tiene `service_sku` field

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## UI Plan

Esta task implementa UI descrita en **[TASK-469](TASK-469-commercial-pricing-ui-interface-plan.md)**. Consumir en lugar de re-especificar:

- **Surface K — ServiceCompositionEditor**: nuevo en `src/components/greenhouse/pricing/`. Lista editable de roles + tools + overhead asignados al servicio. Reusa `GreenhouseDragList` wrapper (keyboard alt obligatorio). Props en TASK-469 §3.6.
- **Surface I/J — Services list + edit**: reusa `ecommerce/products/list/ProductListTable.tsx` + `ecommerce/products/add/ProductInformation.tsx` + `ProductPricing.tsx` → `ServiceInformation.tsx` + `ServicePricing.tsx`.
- **Surface B — picker tab "Servicios"**: incluido como 4ta tab en `SellableItemPickerDrawer` (TASK-464e). Esta task solo aporta la columna renderer variant en `SellableItemRow.tsx`.
- **Copy**: `GH_PRICING.adminServices`, `pickerTabs.services`.
- **A11y**: drag list con alternativa keyboard (arriba/abajo) — WCAG 2.5.7.

## Scope

### Slice 1 — Schema

```sql
-- SKU auto-generation para servicios nuevos añadidos via admin UI.
-- Seed inserta SKUs explícitos del CSV (EFG-001..007 activos). Admin UI → DEFAULT genera EFG-008+.
-- Nota: los placeholders EFG-008 a EFG-048 del CSV se SKIPPEAN en el seed (Open Question resuelta),
-- por lo que la sequence puede arrancar en 8 sin colisión.
CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.service_sku_seq START WITH 8;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_service_sku()
RETURNS text AS $$
BEGIN
  RETURN 'EFG-' || LPAD(nextval('greenhouse_commercial.service_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE greenhouse_commercial.service_catalog (
  service_id text PRIMARY KEY DEFAULT 'svc-' || gen_random_uuid(),
  service_sku text UNIQUE NOT NULL DEFAULT greenhouse_commercial.generate_service_sku(),  -- 'EFG-001' (seed) o auto 'EFG-008+'
  service_category text,                                -- 'Implementaciones MarTech' | 'Creatividad y Contenido' | etc.
  service_name text NOT NULL,
  service_unit text NOT NULL CHECK (service_unit IN ('project', 'monthly')),
  service_type text,                                    -- 'Proyecto / Implementación' | 'Retainer' | 'Consultoría Estratégica' | etc.
  commercial_model text NOT NULL CHECK (commercial_model IN (
    'on_going', 'on_demand', 'hybrid', 'license_consulting'
  )),
  tier text NOT NULL CHECK (tier IN ('1', '2', '3', '4')),
  default_duration_months integer,                      -- para retainers
  default_description text,
  active boolean NOT NULL DEFAULT TRUE,
  business_line_code text,                              -- opcional, filtra selector por BL
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_commercial.service_role_recipe (
  service_id text NOT NULL REFERENCES greenhouse_commercial.service_catalog(service_id) ON DELETE CASCADE,
  line_order integer NOT NULL,
  role_id text NOT NULL REFERENCES greenhouse_commercial.sellable_roles(role_id) ON DELETE RESTRICT,
  hours_per_period numeric(8,2) NOT NULL,               -- horas por período (mes para retainer, total para proyecto)
  quantity integer NOT NULL DEFAULT 1,                   -- 2 designers
  is_optional boolean NOT NULL DEFAULT FALSE,            -- si true, el picker permite excluir
  notes text,
  PRIMARY KEY (service_id, line_order)
);

CREATE TABLE greenhouse_commercial.service_tool_recipe (
  service_id text NOT NULL REFERENCES greenhouse_commercial.service_catalog(service_id) ON DELETE CASCADE,
  line_order integer NOT NULL,
  tool_id text NOT NULL,                                -- FK soft a ai.tool_catalog.tool_id (cross-schema no enforce)
  tool_sku text NOT NULL,                                -- 'ETG-001' — soporta seed/lookup legible
  quantity integer NOT NULL DEFAULT 1,
  is_optional boolean NOT NULL DEFAULT FALSE,
  pass_through boolean NOT NULL DEFAULT FALSE,           -- si true, cliente paga 1:1; si false, es cost interno
  notes text,
  PRIMARY KEY (service_id, line_order)
);

-- Agregar service_sku a quotation_line_items para trazabilidad
ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN IF NOT EXISTS service_sku text,
  ADD COLUMN IF NOT EXISTS service_line_order integer;

-- Grants
ALTER TABLE greenhouse_commercial.service_catalog OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.service_role_recipe OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.service_tool_recipe OWNER TO greenhouse_ops;
GRANT SELECT ON greenhouse_commercial.service_catalog TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.service_role_recipe TO greenhouse_runtime;
GRANT SELECT ON greenhouse_commercial.service_tool_recipe TO greenhouse_runtime;
-- Writers (admin CRUD): gated en API por role check, grants SELECT + INSERT + UPDATE en runtime:
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.service_catalog TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.service_role_recipe TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.service_tool_recipe TO greenhouse_runtime;
```

### Slice 2 — Seed

`scripts/seed-service-catalog.ts`:
- Lee `data/pricing/seed/service-pricing.csv` → header per service
- Lee `data/pricing/seed/service-composition.csv` → line items per service (identifica service_sku, line_order, role_sku OR tool_sku, hours o quantity)
- UPSERT idempotente
- Seeder: 7 servicios activos + los 41 placeholders (active=FALSE)

### Slice 3 — Expand service into quote

`POST /api/finance/quotes/from-service`:
- Body: `{ serviceSku, overrides? }` donde overrides puede cambiar hours/quantity
- Lee service_catalog + role_recipe + tool_recipe
- Construye `PricingEngineInputV2.lines[]` con:
  - 1 línea `lineType='role'` por cada fila de role_recipe
  - 1 línea `lineType='tool'` por cada fila de tool_recipe
  - `commercial_model` heredado del service pero override-able
- Devuelve `{ lines: [...] }` que el UI luego envía como payload a `/api/finance/quotes`
- Cada línea devuelta incluye `serviceSku` + `serviceLineOrder` para trazabilidad

### Slice 4 — Admin UI CRUD

`/finance/service-catalog`:
- Lista de servicios con toggle active, category filter, tier filter
- Action: crear nuevo servicio
- Action: editar (scope, recipe, tier, commercial_model, duración default)

`/finance/service-catalog/[id]` (detail + edit):
- Header: service_sku, name, tier, commercial_model, active
- Tab Recipe de Roles: tabla editable (role, hours, quantity, optional)
- Tab Recipe de Herramientas: tabla editable
- Tab Preview: click "Simular precio" → llama engine v2 → muestra costo interno + precio multi-currency
- Admin-only (gated por `efeonce_admin` + `finance_manager`)

### Slice 5 — Service picker en QuoteCreateDrawer

- Nuevo botón "+ Agregar servicio" en `QuoteLineItemsEditor` (además de los 4 de TASK-464e)
- Click abre `ServicePickerDrawer`:
  - Autocomplete / grid de servicios activos filtrados por BL del quote
  - Hover muestra recipe summary (roles + tools)
  - Click "Seleccionar" → invoca `/api/finance/quotes/from-service` → agrega las líneas al editor
  - Usuario puede editar cada línea individualmente después (hours, quantity, override margin)
  - Las líneas quedan marcadas con chip "Desde EFG-XXX" + tooltip
- Un quote puede tener múltiples servicios expandidos (ej. "Onboarding HubSpot" + "Retainer Marketing")

### Slice 6 — Reporting hooks

- Añadir `service_sku` al snapshot de `sales_context_at_sent` (TASK-455) si la quote se originó desde service
- Contract (TASK-460) hereda `originator_service_sku` del quote cuando se crea
- MRR/ARR projection (TASK-462) agrega `service_sku` como dimensión aggregable
- `contract_profitability_snapshots` también expone `service_sku` para reportería "margin per service"

## Out of Scope

- Service versioning (si cambia recipe de un service activo, quotes existentes NO cambian — snapshot ya. Historical comparison queda para follow-up)
- Service bundling ("SOW que contiene varios services") — es TASK-460 contract lifecycle
- Auto-recommend service basado en client industry/lifecyclestage

## Detailed Spec

### Example: Service "Servicio de Diseño Digital Full Funnel" (EFG-002)

Del Excel (Estructura de Servicios sheet):
```
EFG-002 | Creative Operations Lead | 180h
EFG-002 | Senior Visual Designer   | 180h (x2 = 360h total, pero con quantity=2)
EFG-002 | Envato Elements tool     | 1 unit
EFG-002 | Adobe Creative Cloud     | 3 units
EFG-002 | Freepik tool             | 1 unit
EFG-002 | Notion tool              | 3 units
EFG-002 | Microsoft 365 tool       | 3 units
EFG-002 | Deel tool                | 3 units (pass-through por staff aug)
```

Seed inserta:
- `service_catalog` row: sku=EFG-002, category='Creatividad y Contenido', name='Servicio de Diseño Digital Full Funnel', unit='monthly' or 'project', commercial_model='on_demand' (desde CSV Precios Servicios), tier='2'
- `service_role_recipe`: 3 rows (Creative Ops Lead 180h × 1, Senior Visual Designer 180h × 2)
- `service_tool_recipe`: 6 rows

Click en picker: auto-expand a 9 líneas en QuoteLineItemsEditor, engine v2 calcula totales → match el Excel ($7,600 USD total, $7,600,000 CLP).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Schema idempotente
- [ ] Seeder inserta 7 servicios activos + 41 placeholders inactive
- [ ] `POST /from-service` con `EFG-002` devuelve 9 líneas con totales correctos
- [ ] Admin UI permite crear + editar service + recipe
- [ ] QuoteCreateDrawer service picker funciona
- [ ] Quote creada desde service tiene líneas con `service_sku='EFG-002'` + `service_line_order` poblados
- [ ] Service inactive no aparece en picker
- [ ] `pnpm test` cubre CRUD + expand + recipe edit

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Manual staging: crear quote desde EFG-002 → validar totales contra Excel
- Manual staging: admin edita recipe → crear nueva quote desde service → cambios reflejados

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-462 (MRR/ARR per service), TASK-460 (contract herencia), TASK-455 (sales_context)
- [ ] Actualizar arquitectura

## Follow-ups

- Service versioning con diff viewer (qué cambió entre v1 y v2 del recipe)
- Service bundling para SOWs complejos
- AI-recommend service a AE según cliente/lifecyclestage
- Service usage analytics (qué service se cotiza más, cuál gana más)

## Open Questions

- ¿Service snapshot al momento de quote send? Ya cubierto implícitamente por `quotation_line_items` (una vez guardadas, son el snapshot). Confirmar que cambios futuros al recipe NO regeneran líneas de quotes existentes.
- Los 41 placeholders del CSV (EFG-008 a EFG-048 vacíos): ¿los insertamos como `active=FALSE` con `service_name='(pendiente)'` para reservar SKUs? Propuesta: **skip** y que Efeonce los agregue via admin UI cuando estén definidos.
