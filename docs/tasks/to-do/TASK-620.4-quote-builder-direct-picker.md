# TASK-620.4 — Quote Builder Direct Picker (autocomplete a 4 catalogos: roles + tools + artifacts + services)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~2 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque D)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-620, TASK-620.1, TASK-620.2`
- Branch: `task/TASK-620.4-quote-builder-direct-picker`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

En `QuoteLineItemsEditor.tsx`, agregar un picker autocomplete unificado que busca en los 4 catalogos (sellable_roles + sellable_tools + sellable_artifacts + service_modules) y permite agregar lineas al quote directamente, **sin requerir wrapping en un service module**. Cubre los 3 patrones de venta basicos: persona sola, herramienta sola, persona+herramienta improvisada.

## Why This Task Exists

Hoy un sales rep que quiere vender 5 licencias Adobe Creative Cloud sin servicio de implementacion no tiene como hacerlo limpio — termina creando un service module fantasma o agregando line item con descripcion plana sin tracking. Igual para vender solo 1 Senior Designer o solo 1 Brand Book.

El picker unificado:

- Buscar por nombre/SKU/category en los 4 catalogos
- Cada resultado muestra tipo (icon), pricing canonical (si aplica), business_line
- Click → agrega line item al quote con todo el snapshot correcto (incluye partner attribution si aplica)

## Goal

- Boton "Agregar item" en `QuoteLineItemsEditor` abre dialog/dropdown unificado
- Search input con debounce que consulta endpoint `/api/commercial/catalog-search?q=...&types=role,tool,artifact,service`
- Resultados agrupados por tipo
- Selection → emite line item con snapshot pricing + partner attribution si tool con partner
- Para service_module seleccionado → expand engine produce N lineas (mismo flow existente)
- Para role/tool/artifact: 1 linea sin module_id
- Empty state cuando no hay resultados con CTA "crear ad-hoc bundle" (link a TASK-620.5 modal)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (TASK-620)
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8 (Bloque D)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- snapshot pricing en quote_line_items al agregar (no recalcular si pricing canonical cambia despues)
- partner attribution snapshot via `snapshotPartnerAttributionForLine` (TASK-620.1.1) si tool con partner
- search debounced 300ms para no sobrecargar
- accessibility: combobox ARIA pattern, keyboard navigation, screen reader friendly
- responsive: dialog full-screen en mobile, dropdown en desktop

## Dependencies & Impact

### Depends on

- **`TASK-620`** (sellable_tools, sellable_artifacts schema)
- **`TASK-620.1`** (sellable_tools poblada)
- **`TASK-620.1.1`** (partner attribution funcional)
- **`TASK-620.2`** (sellable_artifacts poblada)
- `service_modules` ya existe + `expandServiceIntoQuoteLines` ya existe
- `QuoteLineItemsEditor.tsx` (existe en `src/views/greenhouse/finance/workspace/`)

### Blocks / Impacts

- **`TASK-620.5`** (ad-hoc bundle) — link desde empty state del picker
- Quote PDF rendering (TASK-629 ya cierra rich html descriptions)
- Margin engine — partner attribution ya snapshot via TASK-620.1.1
- HubSpot sync (TASK-603) — line items con partner attribution se sincronizan correcto

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx` (modificado: agregar picker button)
- `src/views/greenhouse/finance/workspace/QuoteCatalogPicker.tsx` (nuevo)
- `src/lib/commercial/catalog-search.ts` (nuevo)
- `src/app/api/commercial/catalog-search/route.ts` (nuevo)
- `src/lib/finance/quote-line-builder.ts` (nuevo, helper unificado para crear line item desde catalog item)
- `src/types/db.d.ts` (sin cambios, no migracion)

## Current Repo State

### Already exists

- `QuoteLineItemsEditor.tsx` con UI existente
- `expandServiceIntoQuoteLines` para expandir service modules
- 4 catalogos poblados (post TASK-620 / 620.1 / 620.2)

### Gap

- Sin picker unificado
- Sin endpoint de busqueda cross-catalog
- Sin helper para construir line item desde catalog item con snapshot correcto
- Sales rep tiene que agregar lineas planas para tools/artifacts standalone

## Scope

### Slice 1 — Endpoint catalog-search (0.5 dia)

`src/app/api/commercial/catalog-search/route.ts`:

```typescript
interface CatalogSearchQuery {
  q: string                                          // search term
  types?: string                                     // comma-separated: 'role,tool,artifact,service' (default: all)
  businessLine?: string                              // filter
  category?: string                                  // filter
  limit?: number                                     // default 20
}

interface CatalogSearchResult {
  type: 'role' | 'tool' | 'artifact' | 'service_module'
  id: string                                         // role_id / tool_id / artifact_id / module_id
  sku: string
  name: string
  description?: string
  category: string
  businessLine?: string
  pricingPreview?: { currency: string; unitPrice: number }[]    // top 2 currencies
  metadata: Record<string, unknown>                  // tipo-specific (vendor for tools, etc.)
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()
  if (!tenant) return errorResponse

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const types = (searchParams.get('types') ?? 'role,tool,artifact,service').split(',')
  const businessLine = searchParams.get('businessLine') ?? null
  const category = searchParams.get('category') ?? null
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))

  if (q.length < 2) return NextResponse.json({ results: [] })

  const results: CatalogSearchResult[] = []

  if (types.includes('role')) {
    const roles = await searchSellableRoles(q, { businessLine, category, limit })
    results.push(...roles)
  }
  if (types.includes('tool')) {
    const tools = await searchSellableTools(q, { businessLine, category, limit })
    results.push(...tools)
  }
  if (types.includes('artifact')) {
    const artifacts = await searchSellableArtifacts(q, { businessLine, category, limit })
    results.push(...artifacts)
  }
  if (types.includes('service')) {
    const services = await searchServiceModules(q, { businessLine, category, limit })
    results.push(...services)
  }

  // Sort by relevance (exact match in name first, then partial, then sku/category match)
  return NextResponse.json({ results: rankResults(results, q) })
}
```

`src/lib/commercial/catalog-search.ts` con las 4 funciones search per tipo. Usa Postgres full-text search:

```sql
SELECT * FROM sellable_roles
WHERE active = true
  AND (
    name ILIKE '%' || $1 || '%'
    OR role_sku ILIKE '%' || $1 || '%'
    OR category ILIKE '%' || $1 || '%'
  )
LIMIT $2
```

(Si en el futuro requiere mejor relevance, migrar a `tsvector`/`tsquery`.)

### Slice 2 — Picker UI component (1 dia)

`<QuoteCatalogPicker>`:

```typescript
interface QuoteCatalogPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (item: CatalogSearchResult) => Promise<void>
  quoteCurrency: string
  quoteBusinessLine?: string                         // pre-filter by business line del quote
}
```

Layout:

```
┌─ Agregar item al quote ──────────────────────────┐
│ 🔍 [Buscar por nombre, SKU o categoria...]       │
│                                                   │
│ Filtros: [☑ Personas] [☑ Tools] [☑ Artifacts]   │
│          [☑ Servicios] [BL ▼] [Categoria ▼]     │
│                                                   │
│ Resultados (12):                                 │
│                                                   │
│ ── Personas ─────────────────                    │
│ 👤 Senior Designer · ECG-005                     │
│    Design · Tier 3 · $50/h USD                   │
│ 👤 Strategy Lead · ECG-008                       │
│    Strategy · Tier 4 · $75/h USD                 │
│                                                   │
│ ── Herramientas ──────────────                   │
│ 🔧 Adobe Creative Cloud · TOOL-0012              │
│    Adobe partner · $54.99/seat USD               │
│                                                   │
│ ── Artifacts ────────────────                    │
│ 📦 Brand Book Completo · ART-0001                │
│    PDF + Figma · $5,000 USD                      │
│                                                   │
│ ── Servicios ──────────────────                  │
│ 📂 Brand Foundation Package                      │
│    8 components · $24,500 USD typical            │
│                                                   │
│ [Empty state si no hay resultados:]              │
│ 🤔 No encontramos lo que buscas                  │
│ → [Crear bundle ad-hoc] (TASK-620.5)             │
└──────────────────────────────────────────────────┘
```

Keyboard:

- `↑ ↓` para navegar resultados
- `Enter` para seleccionar
- `Esc` para cerrar
- `Tab` para mover entre filtros y search

### Slice 3 — Quote line builder helper (0.25 dia)

`src/lib/finance/quote-line-builder.ts`:

```typescript
export const buildQuoteLineFromCatalogItem = async (
  item: CatalogSearchResult,
  quoteContext: { quotationId: string; versionNumber: number; currency: string; businessLineCode?: string }
): Promise<QuoteLineItem[]> => {
  switch (item.type) {
    case 'role':
      return [await buildLineFromRole(item.id, quoteContext)]
    case 'tool':
      return [await buildLineFromTool(item.id, quoteContext)]
    case 'artifact':
      return [await buildLineFromArtifact(item.id, quoteContext)]
    case 'service_module':
      return await expandServiceIntoQuoteLines(item.id, {
        currency: quoteContext.currency,
        excluded: []
      })
  }
}

const buildLineFromTool = async (toolId, ctx) => {
  const pricing = await resolveToolPricing(toolId, ctx.currency)
  const tool = await getSellableToolById(toolId)
  const line: QuoteLineItem = {
    quotationId: ctx.quotationId,
    versionNumber: ctx.versionNumber,
    label: tool.toolName,
    description: tool.description,
    descriptionRichHtml: tool.descriptionRichHtml,
    quantity: 1,
    unit: tool.unitLabel,
    unitPrice: pricing,
    currency: ctx.currency,
    productType: 'tool_license',
    toolId: tool.toolId
  }
  // Snapshot partner attribution (TASK-620.1.1)
  await snapshotPartnerAttributionForLine(line)
  return line
}

// Similar para role / artifact
```

### Slice 4 — Integracion en QuoteLineItemsEditor (0.25 dia)

```tsx
// QuoteLineItemsEditor.tsx (modificado)
const [pickerOpen, setPickerOpen] = useState(false)

const handleCatalogItemSelected = async (item: CatalogSearchResult) => {
  const newLines = await buildQuoteLineFromCatalogItem(item, {
    quotationId: quote.id,
    versionNumber: quote.currentVersion,
    currency: quote.currency,
    businessLineCode: quote.businessLineCode
  })

  for (const line of newLines) {
    await addLineItemToQuote(line)
  }

  setPickerOpen(false)
  refreshQuote()
}

return (
  <>
    {/* Existing line items table */}

    <Button startIcon={<i className='ri-add-line' />} onClick={() => setPickerOpen(true)}>
      Agregar item del catalogo
    </Button>
    <Button startIcon={<i className='ri-package-line' />} onClick={() => setAdHocBundleOpen(true)}>
      Crear bundle ad-hoc
    </Button>

    <QuoteCatalogPicker
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      onSelect={handleCatalogItemSelected}
      quoteCurrency={quote.currency}
      quoteBusinessLine={quote.businessLineCode}
    />

    {/* TASK-620.5 ad-hoc bundle modal aqui */}
  </>
)
```

## Out of Scope

- Ad-hoc bundle composer (TASK-620.5)
- Bulk add (agregar multiples items de una vez)
- AI-suggested items basados en contexto del quote (futuro)
- Smart filters basados en historial del cliente (futuro)

## Acceptance Criteria

- [ ] endpoint `/api/commercial/catalog-search` funcional con 4 tipos
- [ ] picker UI funcional con search debounced + filtros
- [ ] grouping por tipo en resultados
- [ ] selection agrega line items correctamente con snapshot pricing
- [ ] partner attribution snapshot funcional para tools con partner
- [ ] service module selection expande N lineas via expand engine
- [ ] empty state con link a ad-hoc bundle
- [ ] keyboard navigation completo
- [ ] WCAG 2.2 AA compliant
- [ ] tests passing
- [ ] aplicado en staging + prod despues de QA

## Verification

- `pnpm tsc --noEmit` clean, lint clean, test clean
- Manual QA: crear quote nuevo, agregar 1 role + 1 tool + 1 artifact + 1 service via picker
- Verificar tool con partner: snapshot attribution visible en partner_revenue_dashboard
- Verificar service expansion: N lineas correctas

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `docs/documentation/finance/cotizaciones-gobernanza.md` actualizado con seccion "Picker unificado"
