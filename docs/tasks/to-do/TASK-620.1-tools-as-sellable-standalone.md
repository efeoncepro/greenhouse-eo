# TASK-620.1 — Tools as Sellable Standalone (refactor service_tool_recipe → sellable_tools FK + canonical pricing)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~2 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque C)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-620`
- Branch: `task/TASK-620.1-tools-as-sellable-standalone`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Refactor de `service_tool_recipe` para que apunte a `sellable_tools.tool_id` (FK canonical) en vez de `ai.tool_catalog`. Pricing canonico vive en `sellable_tool_pricing_currency`, override opcional en el recipe. Backfill desde `ai.tool_catalog` populando `sellable_tools` para los tools actualmente en uso. Habilita venta standalone de tools en quotes (caso "Efeonce vende 5 licencias Adobe Creative Cloud sin servicio asociado").

## Why This Task Exists

Hoy `service_tool_recipe.tool_id` apunta a `ai.tool_catalog` (legacy). Cada recipe tiene su propio pricing embebido — si Microsoft sube precio de Copilot 15%, hay que actualizar 30 recipes a mano.

Despues de TASK-620 existe `sellable_tools` con pricing canonico + tier pricing + partner tracking. Esta task lo cablea:

1. Backfill: para cada tool unique en `service_tool_recipe`, crear row en `sellable_tools` con pricing canonico
2. Refactor: `service_tool_recipe.tool_id` ahora FK a `sellable_tools.tool_id`
3. Override: agregar columna `override_unit_price_*` en recipe para casos especiales
4. Quote builder: tools pueden agregarse standalone como line items (sin requerir service module wrapper)

## Goal

- Backfill de `ai.tool_catalog` a `sellable_tools` (preserva tool_sku como UUID match)
- FK refactor en `service_tool_recipe`
- Pricing canonico en `sellable_tool_pricing_currency` + override opcional en recipe
- Endpoint `/api/commercial/sellable-tools` con CRUD basico
- expandServiceIntoQuoteLines lee pricing del canonico (con override si existe)
- Validacion: backfill no rompe quotes historicos (snapshot pricing en quote_line_items)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (creado en TASK-620)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8

Reglas obligatorias:

- backfill idempotente
- snapshot pricing en quote_line_items intacto (no recalcular quotes historicos)
- FK migration con ON DELETE RESTRICT (proteger contra borrados que rompan recipes)
- ai.tool_catalog se mantiene como referencia legacy hasta deprecacion gradual

## Dependencies & Impact

### Depends on

- **`TASK-620`** (sellable_tools schema)
- `ai.tool_catalog` (existe, source de backfill)
- `service_tool_recipe` (existe, target de refactor)
- `quotation_line_items` (existe, snapshot preservado)

### Blocks / Impacts

- **`TASK-620.1.1`** (Tool partner program) — usa los tools clasificados por partner
- **`TASK-620.3`** (composer) — picker de tools desde el catalog
- **`TASK-620.4`** (quote picker) — agrega tools standalone como line items
- HubSpot sync outbound: tools sincronizan como `product_type='tool_license'` (TASK-620.1.1 finaliza esto)

### Files owned

- `migrations/YYYYMMDD_task-620.1-tools-recipe-refactor.sql` (nueva)
- `scripts/backfill-tools-from-ai-catalog.ts` (nuevo)
- `src/lib/commercial/sellable-tools-store.ts` (nuevo)
- `src/lib/commercial/service-catalog-expand.ts` (modificado: lee pricing canonico)
- `src/app/api/commercial/sellable-tools/route.ts` (nuevo)
- `src/app/api/commercial/sellable-tools/[id]/route.ts` (nuevo)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- `ai.tool_catalog` legacy con tools en uso
- `service_tool_recipe.tool_id` apunta a ai.tool_catalog (no a sellable_tools)
- `service_tool_recipe.tool_sku` denormalizado para resilience
- `sellable_tools` schema (vacio post TASK-620)
- `sellable_tool_pricing_currency` schema (vacio post TASK-620)

### Gap

- Tools no son "vendibles standalone" — solo dentro de service modules
- Pricing duplicado en cada recipe
- Sin partner attribution (Adobe vs Microsoft vs HubSpot)
- Quote builder no puede agregar tool sin servicio asociado

## Scope

### Slice 1 — Backfill script (0.5 dia)

`scripts/backfill-tools-from-ai-catalog.ts`:

```typescript
import { runFinanceQuery } from '@/lib/finance/shared'

const inferPartnerId = (vendor: string | null): string | null => {
  const v = (vendor || '').toLowerCase()
  if (v.includes('adobe')) return 'PARTNER-ADOBE'
  if (v.includes('microsoft')) return 'PARTNER-MICROSOFT'
  if (v.includes('hubspot')) return 'PARTNER-HUBSPOT'
  return null
}

export const backfillToolsFromAiCatalog = async (options: { dryRun?: boolean; actorUserId: string }) => {
  // 1. Tools unique usados en service_tool_recipe
  const usedTools = await runFinanceQuery<{ tool_id: string; tool_sku: string }>(`
    SELECT DISTINCT str.tool_id, str.tool_sku
      FROM greenhouse_commercial.service_tool_recipe str
     WHERE NOT EXISTS (
       SELECT 1 FROM greenhouse_commercial.sellable_tools st
        WHERE st.tool_id = str.tool_id
     )
  `)

  console.log(`Found ${usedTools.length} tools to backfill into sellable_tools`)

  if (options.dryRun) return { matched: usedTools.length, created: 0 }

  let created = 0
  for (const tool of usedTools) {
    // Lookup metadata desde ai.tool_catalog
    const meta = await runFinanceQuery<any>(`
      SELECT tool_name, vendor, category, license_type, unit_label, description
        FROM ai.tool_catalog
       WHERE tool_id = $1 LIMIT 1
    `, [tool.tool_id])

    const m = meta[0] || {}
    const partnerId = inferPartnerId(m.vendor)

    await runFinanceQuery(`
      INSERT INTO greenhouse_commercial.sellable_tools
        (tool_id, tool_sku, tool_name, vendor, partner_id, category, license_type, unit_label, description, active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
      ON CONFLICT (tool_id) DO NOTHING
    `, [
      tool.tool_id, tool.tool_sku,
      m.tool_name || tool.tool_sku,
      m.vendor || null, partnerId,
      m.category || 'productivity',
      m.license_type || 'per_seat',
      m.unit_label || 'seat',
      m.description || null,
      options.actorUserId
    ])

    // Pricing canonico desde el recipe mas reciente como baseline (luego operator ajusta)
    const latestPricing = await runFinanceQuery<any>(`
      SELECT DISTINCT ON (currency) currency, unit_price
        FROM greenhouse_commercial.service_tool_recipe_pricing  -- si existe
       WHERE tool_id = $1 ORDER BY currency, created_at DESC
    `, [tool.tool_id]).catch(() => [])

    for (const p of latestPricing) {
      await runFinanceQuery(`
        INSERT INTO greenhouse_commercial.sellable_tool_pricing_currency
          (tool_id, currency, unit_price, effective_from, source)
        VALUES ($1, $2, $3, CURRENT_DATE, 'manual')
        ON CONFLICT DO NOTHING
      `, [tool.tool_id, p.currency, p.unit_price])
    }

    created++
  }

  return { matched: usedTools.length, created }
}
```

### Slice 2 — Migracion FK refactor (0.5 dia)

```sql
-- migrations/YYYYMMDD_task-620.1-tools-recipe-refactor.sql

-- 1. Override pricing en el recipe (opcional)
ALTER TABLE greenhouse_commercial.service_tool_recipe
  ADD COLUMN IF NOT EXISTS override_unit_price_clp numeric(14,2),
  ADD COLUMN IF NOT EXISTS override_unit_price_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS override_reason text;

-- 2. NEW FK constraint a sellable_tools (DESPUES del backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'service_tool_recipe_sellable_tool_fkey'
  ) THEN
    ALTER TABLE greenhouse_commercial.service_tool_recipe
      ADD CONSTRAINT service_tool_recipe_sellable_tool_fkey
      FOREIGN KEY (tool_id)
      REFERENCES greenhouse_commercial.sellable_tools (tool_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 3. ai.tool_catalog NO se elimina — queda como legacy reference durante deprecation gradual
-- Marcado en columna comment:
COMMENT ON TABLE ai.tool_catalog IS
  'LEGACY (post TASK-620.1, 2026-04-25). Tools canonicos viven en greenhouse_commercial.sellable_tools. Esta tabla se mantiene como reference para tools no migradas. Deprecation full: cuando todos los flujos consumidores migren a sellable_tools.';
```

### Slice 3 — Store + endpoints (0.5 dia)

`src/lib/commercial/sellable-tools-store.ts`:

- `listSellableTools({ active?, category?, vendor?, partnerId? })` con paginacion
- `getSellableToolById(toolId)`
- `createSellableTool({...})` — incluye pricing inicial opcional
- `updateSellableTool(toolId, patch)`
- `getSellableToolPricing(toolId, currency, asOfDate?)` — devuelve pricing efectivo para fecha
- `archiveSellableTool(toolId)` — soft delete (active=false)

`src/app/api/commercial/sellable-tools/route.ts` — GET list + POST create.
`src/app/api/commercial/sellable-tools/[id]/route.ts` — GET / PATCH / DELETE (soft).

Permisos: solo Finance Admin / Efeonce Admin pueden CRUD.

### Slice 4 — Pricing resolution en expand (0.25 dia)

`src/lib/commercial/service-catalog-expand.ts`:

```typescript
const resolveToolPricing = async (
  recipe: ServiceToolRecipe,
  currency: string
): Promise<number> => {
  // 1. Override en el recipe?
  const overrideField = `override_unit_price_${currency.toLowerCase()}` as keyof ServiceToolRecipe
  if (recipe[overrideField]) return Number(recipe[overrideField])

  // 2. Pricing canonico de sellable_tools
  const canonical = await getSellableToolPricing(recipe.tool_id, currency)
  return canonical
}
```

### Slice 5 — Tests + smoke (0.25 dia)

Tests:

- `sellable-tools-store.test.ts` — CRUD + pricing resolution (canonical vs override)
- `service-catalog-expand.test.ts` (modificado) — usa el canonical pricing si recipe sin override; usa override si existe

Smoke en dev:

- Run backfill dry-run → verificar count
- Run backfill real → verificar tools creados + pricing baseline
- Verificar quote existente sigue mostrando mismo total (snapshot intacto)
- Crear quote nueva con tool standalone → verifica que toma canonical pricing

## Out of Scope

- Eliminacion de `ai.tool_catalog` (deprecation gradual, separate task futura)
- HubSpot sync de tools como `product_type='tool_license'` (TASK-620.1.1)
- Admin UI de tools (TASK-620.3 incluye)
- Partner program / commissions (TASK-620.1.1)

## Acceptance Criteria

- [ ] backfill script ejecutado en dev sin errores
- [ ] todos los `service_tool_recipe.tool_id` tienen FK valida a `sellable_tools`
- [ ] quotes existentes mantienen mismo total (snapshot preservado)
- [ ] endpoint `/api/commercial/sellable-tools` GET/POST/PATCH funcional
- [ ] pricing resolution: override > canonical, ambos testeados
- [ ] `pnpm tsc --noEmit` clean, `pnpm lint` clean, `pnpm test` clean
- [ ] aplicado en staging + prod despues de QA dev

## Verification

- Backfill dry-run muestra count, real ejecuta limpio
- `SELECT count(*) FROM sellable_tools` aumenta por el numero esperado
- Quote test: total post-migracion == total pre-migracion (snapshot)
- Nueva quote con tool agregado standalone: usa canonical pricing

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con counts por env
- [ ] `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` actualizado con flow de pricing canonical vs override
