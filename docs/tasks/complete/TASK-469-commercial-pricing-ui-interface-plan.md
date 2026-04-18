# TASK-469 — Commercial Pricing Program — UI Interface Plan & Vuexy Component Inventory

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio` (task de diseño + especificación — no implementa, habilita ejecución eficiente de 6 tasks)
- Type: `design-spec`
- Status real: `Cerrada 2026-04-18`
- Rank: `Antes de TASK-463, 464e, 465, 466, 467`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-469-commercial-pricing-ui-plan`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Plano maestro de interfaces para el programa comercial de pricing (TASK-463..468). Inventaria las superficies UI requeridas, mapea cada una a componentes Vuexy reutilizables del `full-version/`, identifica componentes a adaptar o crear, y fija convenciones (layout, copy, accesibilidad, motion). Cualquier task de UI del programa que toque una de estas superficies consume este plano en lugar de re-especificar.

## Why This Task Exists

Seis tasks paralelas (TASK-463 quote builder, 464e pickers + cost stack, 465 service composition, 466 multi-currency output, 467 admin CRUD, 468 employment types) necesitan UI consistente. Sin un plano maestro:

- se reinventan los mismos componentes en tasks distintas (riesgo de 3 versiones de "picker")
- se pasa por alto la riqueza de `full-version/` (invoice, ecommerce products, wizard-examples, apps settings)
- copy, semaphore, accesibilidad y motion divergen entre superficies
- el componente "CostStackPanel" se implementa 2 veces (quote builder + admin preview)

Este plano fija: **qué Vuexy reusamos tal cual, qué adaptamos a `src/components/greenhouse/pricing/`, qué creamos nuevo**, y provee el contrato (props, variants, copy, a11y floor) para cada pieza.

## Goal

- Inventario completo de 12 superficies UI del programa pricing, cada una con blueprint + component manifest + copy spec + a11y notes
- Tabla "Vuexy reuse vs adapt vs create" por superficie, con paths reales a `full-version/`
- Stack de 9 componentes nuevos en `src/components/greenhouse/pricing/` especificados (props, variants, estados)
- Cross-links desde TASK-463, 464e, 465, 466, 467, 468 apuntando a la sección correspondiente
- Cumple 13-row floor (modern-ui), tone map Greenhouse (ux-writing), y protección payroll (cero cambios en vistas payroll)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — gating del `CostStackPanel` por entitlement
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `src/config/greenhouse-nomenclature.ts` — copy canónico (todo en español tuteo)

Reglas obligatorias:

- **Vuexy-first**: antes de crear un componente nuevo, verificar si existe en `full-version/src/views/` o `full-version/src/components/`. Si existe, copiarlo a `src/components/greenhouse/pricing/` y adaptarlo. Solo crear desde cero cuando no haya equivalente.
- **NUNCA modificar** archivos en `src/@core/`, `src/@layout/`, `src/@menu/`
- **Tokens, no primitives**: componentes consumen `theme.palette.*` y tokens de `greenhouse-nomenclature`, nunca hex crudos
- **Spanish tuteo** en todo UI (tono: casual profesional)
- **13-row floor (modern-ui)**: cada componente aprueba semantic root, keyboard, focus ring, accessible name, contrast, touch target ≥44px, all states designed, no ARIA where HTML works, reduced motion, touch alternatives, reflow 320/200%, tokens only, axe pass
- **🛑 AISLAMIENTO PAYROLL**: ninguna superficie de este programa modifica vistas payroll (`src/views/greenhouse/hr/payroll/**`, `src/components/hr/payroll/**`). El picker de `employment_type` en quote builder es SELECT-only desde `greenhouse_commercial.employment_types`; no navega a payroll ni comparte componentes.

## Normative Docs

- `docs/tasks/to-do/TASK-463-unified-quote-builder-hubspot-bidirectional.md` — builder core
- `docs/tasks/to-do/TASK-464a-sellable-roles-catalog-canonical.md` — schema roles
- `docs/tasks/to-do/TASK-464b-pricing-governance-tables.md` — governance tables
- `docs/tasks/to-do/TASK-464c-tool-catalog-extension-overhead-addons.md` — tool + overhead
- `docs/tasks/to-do/TASK-464d-pricing-engine-full-model-refactor.md` — pricing engine
- `docs/tasks/to-do/TASK-464e-quote-builder-ui-exposure.md` — pickers + cost stack
- `docs/tasks/to-do/TASK-465-service-composition-catalog-ui.md` — service composition
- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md` — preview multi-currency
- `docs/tasks/to-do/TASK-467-pricing-catalog-admin-ui.md` — admin CRUD
- `docs/tasks/to-do/TASK-468-payroll-commercial-employment-types-unification.md` — bridge

## Dependencies & Impact

### Depends on

- Catálogos canónicos existentes vía TASK-464a/b/c/d (schemas `greenhouse_commercial.*`)
- `greenhouse-nomenclature.ts` extendido con labels de pricing (ver §Copy extension en Zone 3)

### Blocks / Impacts

- **Desbloquea ejecución paralela de**: TASK-463, 464e, 465, 466, 467
- **No bloquea**: TASK-464a/b/c/d (schema), TASK-468 (payroll bridge es server-side)

### Files owned

- `docs/tasks/to-do/TASK-469-commercial-pricing-ui-interface-plan.md` (este archivo)
- Spec referenciada por — pero NO codificada por — TASK-463/464e/465/466/467

## Current Repo State

### Already exists

**Vuexy `full-version/` reutilizable** (inventariado 2026-04-18):

Quote builder foundations:
- `full-version/src/views/apps/invoice/add/AddCard.tsx` — line items table + customer card + totals
- `full-version/src/views/apps/invoice/add/AddActions.tsx` — right sidebar (send/preview/save, payment method, payment terms, note)
- `full-version/src/views/apps/invoice/add/AddCustomerDrawer.tsx` — drawer para seleccionar/crear cliente
- `full-version/src/views/apps/invoice/edit/EditCard.tsx` + `EditActions.tsx` — edit flow con mismo layout
- `full-version/src/views/apps/invoice/preview/PreviewCard.tsx` — PDF-style preview
- `full-version/src/views/apps/invoice/preview/PreviewActions.tsx` — sidebar (download, print, send, edit)
- `full-version/src/views/apps/invoice/preview/print.css` — media print styles
- `full-version/src/views/apps/invoice/shared/SendInvoiceDrawer.tsx` — drawer enviar por email
- `full-version/src/views/apps/invoice/shared/AddPaymentDrawer.tsx` — drawer registrar pago
- `full-version/src/views/apps/invoice/list/InvoiceListTable.tsx` — TanStack table filtros + paginación
- `full-version/src/views/apps/invoice/list/InvoiceCard.tsx` — 4 KPI cards resumen
- `full-version/src/views/pages/wizard-examples/create-deal/index.tsx` + `Step*.tsx` — wizard 4 pasos (type/details/usage/review)

Catalog CRUD foundations:
- `full-version/src/views/apps/ecommerce/products/list/ProductListTable.tsx` + `ProductCard.tsx` + `TableFilters.tsx`
- `full-version/src/views/apps/ecommerce/products/add/ProductInformation.tsx` + `ProductPricing.tsx` + `ProductOrganize.tsx` + `ProductInventory.tsx` + `ProductVariants.tsx` + `ProductImage.tsx`
- `full-version/src/views/apps/ecommerce/products/category/AddCategoryDrawer.tsx` + `ProductCategoryTable.tsx`
- `full-version/src/views/apps/ecommerce/settings/index.tsx` + settings tabs

Dashboard widgets:
- `full-version/src/views/dashboards/crm/**` — KPI cards patrón HorizontalWithSubtitle
- `full-version/src/views/dashboards/analytics/**` — Recharts + ApexCharts patterns

**Componentes Greenhouse existentes reusables**:
- `src/components/greenhouse/AnimatedCounter.tsx`
- `src/components/greenhouse/EmptyState.tsx`
- `src/components/card-statistics/HorizontalWithSubtitle.tsx` + variants
- `src/components/TablePaginationComponent.tsx`
- `src/components/DebouncedInput.tsx`
- `src/components/tableUtils.ts`
- `src/libs/FramerMotion.tsx` + `src/libs/Recharts.tsx` + `src/libs/Lottie.tsx`
- `src/hooks/useReducedMotion.ts`

### Gap

- No existe `src/components/greenhouse/pricing/` — carpeta a crear
- Copy para quote builder, cost stack semaphore, margin indicators no está en `greenhouse-nomenclature.ts`
- No hay convención para "sellable item picker" de 4 pestañas (roles/tools/overhead/services)
- Sidebar contextual del builder no existe (commercial model + country factor + currency + save/send)
- No hay "cost stack panel" (breakdown previsional/fee/overhead/margin) en ningún componente reusable
- No hay "service composition editor" (lista de roles asignados a un servicio, drag-to-reorder)
- No hay "price change audit timeline" para pricing governance

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (vacío — se llena al tomar la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Surface Inventory

Documentar 12 superficies UI (§Detailed Spec → Surfaces A..L)

### Slice 2 — Component Manifest

Por cada superficie: tabla Vuexy reuse / adapt / create con paths reales

### Slice 3 — New Component Stack (9 componentes)

Especificación de props, variants, estados de los componentes nuevos en `src/components/greenhouse/pricing/`

### Slice 4 — Copy Extension

Bloque canónico para agregar a `src/config/greenhouse-nomenclature.ts` (GH_PRICING)

### Slice 5 — Cross-links

Bloque `## UI Plan` con pointer a este archivo añadido a TASK-463, 464e, 465, 466, 467, 468

## Out of Scope

- No implementa componentes — este doc especifica; TASK-463/464e/465/466/467 implementan
- No modifica schemas — eso es TASK-464a/b/c/d
- No toca payroll UI — TASK-468 es server-side bridge
- No rediseña surfaces que ya existen en staging (p.ej. Finance > Cotizaciones existente permanece; se extiende, no se reemplaza)

## Detailed Spec

### §1 · 12 Surfaces del Programa

| # | Superficie | Task(s) | Lane (modern-ui) | Ruta estimada |
|---|-----------|---------|------------------|---------------|
| A | Quote Builder page (add + edit) | 463, 464e, 466, 468 | Product (compact) | `/finance/quotes/new`, `/finance/quotes/[id]/edit` |
| B | Sellable Item Picker Drawer (4 tabs) | 464e, 465 | Product | drawer dentro de A |
| C | Cost Stack Panel (gated) | 464e | Product | side panel dentro de A |
| D | Commercial Model + Country Factor Selector | 464e, 466 | Product | sidebar dentro de A |
| E | Quote Preview + Multi-currency | 463, 466 | Product | `/finance/quotes/[id]` |
| F | Send Quote Drawer | 463, 466 | Product | drawer desde E |
| G | Quote List | 463 | Product | `/finance/quotes` |
| H | Pricing Catalog Admin — Overview | 467 | Product | `/admin/pricing` |
| I | Catalog Entity List (roles / tools / overhead / services) | 467 | Product | `/admin/pricing/{entity}` |
| J | Catalog Entity Edit (role/tool/overhead/service) | 467, 465 | Product | `/admin/pricing/{entity}/[id]` |
| K | Service Composition Editor | 465 | Product | dentro de J cuando entity=service |
| L | Pricing Governance Panel (tiers, commercial models, country factors, employment types, audit timeline) | 464b, 467, 468 | Product | `/admin/pricing/governance` |

### §2 · Component Manifest por Surface

#### Surface A — Quote Builder

**Blueprint**:
```
┌─────────────────────────────────────────────────────────────┐
│ BREADCRUMB Finance › Cotizaciones › Nueva                   │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────┐ ┌────────────────────┐ │
│ │ QuoteBuilderCard                 │ │ QuoteBuilderActions│ │
│ │  Header: logo + nº + fechas       │ │  Modelo comercial  │ │
│ │  Espacio / Deal picker            │ │  País / factor     │ │
│ │  ─────────────────────────        │ │  Moneda            │ │
│ │  Sellable Items Table             │ │  Employment type   │ │
│ │    [row] role · emp_type · qty    │ │  Payment terms     │ │
│ │    [row] tool · qty · seats       │ │  ─────────────     │ │
│ │    [row] service · composition    │ │  Guardar borrador  │ │
│ │  + Agregar rol / herramienta /    │ │  Enviar al cliente │ │
│ │    overhead / servicio            │ │  Vista previa      │ │
│ │  ─────────────────────────        │ │                    │ │
│ │  Totals (precio + margen)         │ │                    │ │
│ └──────────────────────────────────┘ └────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CostStackPanel (gated: finance.cost_stack.view)         │ │
│ │  Collapsible: Costo base · Previsional · Fee · Overhead │ │
│ │  Total costo · Margen bruto · Margen % · Tier fit       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa Vuexy | Adapta | Crea nuevo |
|----------|-------------|--------|-----------|
| Layout `Grid 9/3` | — | — | `QuoteBuilderLayout.tsx` (wrapper mínimo) |
| Card principal (header, line items, totals) | `invoice/add/AddCard.tsx` | → `QuoteBuilderCard.tsx` en `src/components/greenhouse/pricing/` | — |
| Sidebar de acciones | `invoice/add/AddActions.tsx` | → `QuoteBuilderActions.tsx` con campos pricing-specific | — |
| Drawer selector cliente | `invoice/add/AddCustomerDrawer.tsx` | → `SpaceDealPickerDrawer.tsx` (busca Space + Deal HubSpot asociado) | — |
| Line items table | `invoice/add/AddCard.tsx` (sección items) | → row-type renderer polimórfico (role / tool / overhead / service) | — |
| Cost stack panel | — | — | ✅ `CostStackPanel.tsx` (ver §3) |
| Margin semaphore | `@core/components/mui/Chip` (CustomChip) | — | ✅ `MarginIndicatorBadge.tsx` (ver §3) |
| Breadcrumb | MUI `Breadcrumbs` | — | — |

**Copy (a agregar a nomenclature)**:
- Titulo page: `"Nueva cotización"` / `"Editar cotización"`
- CTA primary: `"Enviar al cliente"`, `"Guardar borrador"`, `"Vista previa"`
- Empty line items: `"Aún no has agregado ítems a esta cotización"` + CTA `"Agregar rol"`

**A11y**:
- Grid 9/3 debe reflow a stack en mobile (media query, no container)
- Sidebar sticky en desktop, collapsible accordion en mobile
- Line items table: `<caption>` "Ítems de la cotización", `scope="col"` en headers, `aria-sort` en columnas ordenables

---

#### Surface B — Sellable Item Picker Drawer

**Blueprint** (drawer que abre desde "+ Agregar" en Surface A):
```
┌────────────────────────────────────────┐
│ × Agregar ítem                         │
├────────────────────────────────────────┤
│ [Roles] [Tools] [Overhead] [Servicios] │ TabList
├────────────────────────────────────────┤
│ [Buscar por SKU o nombre...]           │
│ Filtros: Tier | Activos                │
│ ─────────────────────────              │
│ ▾ Tier Estratégico                     │
│   ECG-001 Sr Strategist      $5.400    │
│   ECG-002 Sr Researcher      $4.800    │
│ ▾ Tier Especializado                   │
│   ECG-010 Mid Designer       $3.200    │
│ ...                                    │
├────────────────────────────────────────┤
│ Ítems seleccionados: 2                 │
│ [Cancelar] [Agregar seleccionados]     │
└────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa Vuexy | Adapta | Crea nuevo |
|----------|-------------|--------|-----------|
| Drawer shell | MUI `<Drawer anchor="right" />` | — | — |
| TabList 4 tabs | `@core/components/mui/TabList` (CustomTabList) | — | — |
| Search input | `src/components/DebouncedInput.tsx` | — | — |
| Filter chips | `@core/components/mui/Chip` | — | — |
| Virtualized list | TanStack Table | `ecommerce/products/list/ProductListTable.tsx` patrón | — |
| Row renderer (4 variantes) | `ecommerce/products/list/ProductCard.tsx` | → `SellableItemRow.tsx` (variant: role / tool / overhead / service) | — |
| Sticky footer | MUI `Box sx={{ position: 'sticky', bottom: 0 }}` | — | — |

**Variants por tab**:
- **Roles**: columnas SKU · nombre · tier · precio/mes base (referencial) · action
- **Tools**: columnas SKU · nombre · proveedor · modelo (per-seat/flat) · precio/mes · action
- **Overhead**: columnas SKU · nombre · tipo (recurrente/one-off) · precio · action
- **Servicios**: columnas SKU · nombre · duración · composición resumen · precio · action

**Copy**:
- Tab labels: `"Roles"`, `"Herramientas"`, `"Overhead"`, `"Servicios"`
- Search placeholder: `"Buscar por SKU o nombre..."`
- Empty tab: EmptyState con icono `tabler-database-off`, título `"No hay {entidad} activas"`, CTA `"Ir al catálogo"`

---

#### Surface C — Cost Stack Panel (gated)

**Blueprint**:
```
┌─ CostStackPanel ───────────────────────────────┐
│ ▾ Detalle de costo (solo interno)              │  Accordion header
├────────────────────────────────────────────────┤
│ Líneas de cotización                           │
│ ┌──────────────┬──────────┬────────┬────────┐ │
│ │ Ítem         │ Costo    │ Fee    │ Total  │ │
│ ├──────────────┼──────────┼────────┼────────┤ │
│ │ Sr Designer  │ $1.200k  │ +15%   │ $1.380 │ │
│ │ Figma        │    $45k  │ flat   │    $45 │ │
│ │ Overhead PM  │    $80k  │ flat   │    $80 │ │
│ └──────────────┴──────────┴────────┴────────┘ │
│ ─────────────────────────                      │
│ Costo total:            $1.505.000             │
│ Precio cliente:         $2.200.000             │
│ Margen bruto:             $695.000 (31.6%)     │  [Semaphore]
│ Tier fit: Estratégico ✓ (target 30-40%)        │
└────────────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa | Adapta | Crea |
|----------|-------|--------|------|
| Accordion container | MUI `Accordion` | — | — |
| Entitlement gate | `<EntitlementGate capability="finance.cost_stack.view">` (Greenhouse existing) | — | — |
| Breakdown table | MUI `Table` simple | — | ✅ `CostStackPanel.tsx` |
| Margin indicator | — | — | ✅ `MarginIndicatorBadge.tsx` |
| Tier fit chip | `CustomChip` | — | — |

**Props contrato** (ver §3):

```ts
interface CostStackPanelProps {
  lines: Array<{
    itemId: string
    label: string
    costBase: number
    feeAmount: number
    feeType: 'percent' | 'flat'
    total: number
  }>
  totals: {
    totalCost: number
    priceToClient: number
    grossMargin: number
    marginPct: number
  }
  tierFit?: {
    tierCode: 'commoditizado' | 'especializado' | 'estrategico' | 'ip_propietaria'
    label: string
    marginMin: number
    marginOpt: number
    marginMax: number
  }
  currency: 'CLP' | 'USD' | 'EUR' | 'GBP'
  defaultExpanded?: boolean
}
```

**A11y**:
- Panel con `role="region"` + `aria-label="Detalle de costo interno"`
- Semaphore con icono + label (óptimo/atención/crítico), nunca solo color
- Si entitlement no pasa, renderiza `<></>` (no muestra "no tienes acceso" — reduce ruido)

---

#### Surface D — Commercial Model + Country Factor Selector

Parte de `QuoteBuilderActions.tsx` sidebar. Campos:

| Campo | Control | Source |
|-------|---------|--------|
| Modelo comercial | `CustomTextField select` | `greenhouse_commercial.commercial_models` (4 opciones) |
| País/factor | `CustomTextField select` con chip de multiplicador | `greenhouse_commercial.country_pricing_factors` (6) |
| Moneda | `CustomTextField select` | `['CLP', 'USD', 'EUR', 'GBP']` |
| Employment type (por role line) | Inline dropdown en row | `greenhouse_commercial.employment_types` |

**Copy**:
- Labels: `"Modelo comercial"`, `"País del cliente"`, `"Moneda de la cotización"`, `"Tipo de contratación"`
- Helper commercial model: muestra multiplicador → `"On-Demand · +10% sobre tarifa base"`
- Helper country factor: `"Chile PYME · factor 0.9"`

---

#### Surface E — Quote Preview + Multi-currency

**Blueprint**:
```
┌─────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────┐ ┌─────────────────────┐  │
│ │ PreviewCard (brand + line      │ │ PreviewActions       │  │
│ │ items + totals)                 │ │  Moneda: [CLP ▾]     │  │
│ │                                 │ │  Descargar PDF       │  │
│ │  [logo Efeonce]                 │ │  Enviar al cliente   │  │
│ │  Cotización Nº 2026-Q-047       │ │  Imprimir            │  │
│ │  Para: Sky Airline              │ │  Duplicar            │  │
│ │  Fecha: 18-abr-2026             │ │  Editar              │  │
│ │  Expira: 18-may-2026            │ │  Aprobar (if draft)  │  │
│ │                                 │ │                      │  │
│ │  [items table]                  │ │                      │  │
│ │  Subtotal · Impuestos · Total   │ │                      │  │
│ │                                 │ │                      │  │
│ │  Términos · firma               │ │                      │  │
│ └────────────────────────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa Vuexy | Adapta | Crea |
|----------|-------------|--------|------|
| Card preview | `invoice/preview/PreviewCard.tsx` | → `QuotePreviewCard.tsx` | — |
| Sidebar acciones | `invoice/preview/PreviewActions.tsx` | → `QuotePreviewActions.tsx` | — |
| Print styles | `invoice/preview/print.css` | → reuse as-is, class-renamed | — |
| Currency selector | MUI Select | — | ✅ `CurrencySwitcher.tsx` (también usado en A) |
| PDF generation | `@react-pdf/renderer` (instalado) | — | ✅ `QuotePdfDocument.tsx` |

**Multi-currency** (TASK-466):
- El dropdown `CurrencySwitcher` pide al server un re-render de la cotización con `{ currency: 'USD' }`
- La cotización siempre tiene una moneda canónica (la del contrato) + `exchangeRateSnapshot` capturado en el momento del envío
- En preview del cliente: solo muestra moneda canónica
- En preview interno: muestra selector + disclaimer `"Vista interna — la cotización enviada usa CLP (tasa 945,20 al 18-abr)"`

---

#### Surface F — Send Quote Drawer

**Component manifest**:

| Elemento | Reusa | Adapta | Crea |
|----------|-------|--------|------|
| Drawer | MUI `Drawer` | — | — |
| Formulario email | `invoice/shared/SendInvoiceDrawer.tsx` | → `SendQuoteDrawer.tsx` | — |
| React-hook-form | `react-hook-form` (ya instalado) | — | — |
| Fields: To / CC / Subject / Message | `@core/components/mui/TextField` | — | — |
| PDF attachment chip | `CustomChip` | — | — |

**Copy**:
- Title: `"Enviar cotización"`
- Fields: `"Destinatario"`, `"Con copia"`, `"Asunto"`, `"Mensaje"`
- CTA: `"Enviar cotización"` / `"Guardar sin enviar"`
- Success toast: `"Cotización enviada a {email}"`

---

#### Surface G — Quote List

**Blueprint**:
```
┌───────────────────────────────────────────────────────────┐
│ 4 KPI cards: Borradores · Enviadas · Aprobadas · Vencidas │
├───────────────────────────────────────────────────────────┤
│ [filters: Estado · Espacio · Fecha · Modelo comercial]    │
│ [Buscar...]                           [+ Nueva cotización]│
├───────────────────────────────────────────────────────────┤
│ Nº · Espacio · Deal · Modelo · Total · Estado · Acciones  │
│ 2026-Q-047  Sky      Deal-12  On-Going  $2.2M  [Enviada] │
│ 2026-Q-046  Pinturas Deal-11  On-Demand $4.8M  [Borrador]│
│ ...                                                        │
├───────────────────────────────────────────────────────────┤
│ [pagination]                                               │
└───────────────────────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa Vuexy | Adapta | Crea |
|----------|-------------|--------|------|
| 4 KPI cards | `invoice/list/InvoiceCard.tsx` | → `QuoteListStats.tsx` | — |
| Table | `invoice/list/InvoiceListTable.tsx` | → `QuoteListTable.tsx` | — |
| Filters | TableFilters pattern | → `QuoteListFilters.tsx` | — |
| Row actions menu | `OptionMenu` | — | — |

---

#### Surface H — Pricing Catalog Admin — Overview

**Blueprint**:
```
┌────────────────────────────────────────────────────────────────┐
│ Admin › Pricing                                                 │
├────────────────────────────────────────────────────────────────┤
│ 4 KPI cards                                                     │
│  [Roles activos 33]  [Herramientas 26]  [Overhead 9] [Svc 7]    │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │ Roles    │ │ Tools    │ │ Overhead │ │ Services │           │
│ │ vendibles│ │  catalog │ │  add-ons │ │  package │           │
│ │ →        │ │ →        │ │ →        │ │ →        │           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│ │ Role     │ │ Commercl │ │ Country  │                         │
│ │ tiers    │ │ models   │ │ factors  │                         │
│ │ →        │ │ →        │ │ →        │                         │
│ └──────────┘ └──────────┘ └──────────┘                         │
│ ┌──────────┐ ┌──────────┐                                      │
│ │ Employ.  │ │ Audit    │                                      │
│ │ types    │ │ timeline │                                      │
│ │ →        │ │ →        │                                      │
│ └──────────┘ └──────────┘                                      │
└────────────────────────────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa | Adapta | Crea |
|----------|-------|--------|------|
| 4 KPI cards | `HorizontalWithSubtitle` | — | — |
| Entity navigator cards | `HorizontalWithAvatar` con link | → `PricingCatalogNavCard.tsx` | — |
| 3-column Grid | MUI Grid | — | — |

---

#### Surface I — Catalog Entity List

Reusa 1:1 el patrón de `ecommerce/products/list/` para **4 entidades principales** (roles, tools, overhead, services):

| Elemento | Reusa Vuexy | Adapta | Crea |
|----------|-------------|--------|------|
| Table + filters + pagination | `ecommerce/products/list/ProductListTable.tsx` | → `CatalogEntityListTable.tsx` (generic con column factory) | — |
| Table filters | `ecommerce/products/list/TableFilters.tsx` | → `CatalogEntityFilters.tsx` | — |
| 4 KPI cards por entity | `ecommerce/products/list/ProductCard.tsx` | → `CatalogEntityStats.tsx` | — |
| Add/edit drawer | `ecommerce/products/category/AddCategoryDrawer.tsx` | → `QuickEntityFormDrawer.tsx` (para governance tables simples) | — |

Para **3 governance tables** (tiers, commercial models, country factors): reusan `ecommerce/products/category/ProductCategoryTable.tsx` + `AddCategoryDrawer.tsx`.

---

#### Surface J — Catalog Entity Edit

Reusa 1:1 `ecommerce/products/add/` sections como template para edit de roles/tools/overhead/services:

**Para roles** (`role-edit/`):
- `ProductInformation.tsx` → `RoleInformation.tsx` (SKU, nombre_es, descripción, tier_fk)
- `ProductPricing.tsx` → `RolePricingTable.tsx` (multi-row por employment_type × effective_from)
- `ProductOrganize.tsx` → `RoleOrganize.tsx` (capabilities, visible_client_y_n)
- New: `RoleEmploymentCompatibility.tsx` (matriz employment_type × permitido)

**Para tools**:
- `ProductInformation.tsx` → `ToolInformation.tsx` (SKU, proveedor, modelo tarifa)
- `ProductPricing.tsx` → `ToolPricingTable.tsx`
- `ProductImage.tsx` → reutiliza para logo del tool

**Para overhead add-ons**:
- `ProductInformation.tsx` → `OverheadInformation.tsx`
- `ProductPricing.tsx` → `OverheadPricing.tsx`

**Para services**:
- `ProductInformation.tsx` → `ServiceInformation.tsx`
- `ProductPricing.tsx` → `ServicePricing.tsx` (por tier)
- New: `ServiceCompositionEditor.tsx` (ver Surface K)

---

#### Surface K — Service Composition Editor

**Blueprint** (dentro de Surface J cuando entity=service):
```
┌─ Composición del servicio ─────────────────────────────────┐
│ Roles incluidos (drag para reordenar)                      │
│ ≡ Sr Strategist · 0.25 FTE · cycle: monthly · [✕]         │
│ ≡ Mid Designer  · 0.50 FTE · cycle: monthly · [✕]         │
│ ≡ Jr Developer  · 1.00 FTE · cycle: monthly · [✕]         │
│ [+ Agregar rol]                                            │
│ ─────────────────────────                                  │
│ Herramientas incluidas                                     │
│ · Figma · 3 asientos                          [✕]          │
│ · Notion · flat                               [✕]          │
│ [+ Agregar herramienta]                                    │
│ ─────────────────────────                                  │
│ Overhead aplicable                                         │
│ · Project Management 5%                       [✕]          │
│ [+ Agregar overhead]                                       │
└────────────────────────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa | Adapta | Crea |
|----------|-------|--------|------|
| Drag list wrapper | `GreenhouseDragList` (already in repo per skill) | — | — |
| Role row | `ecommerce/products/add/ProductVariants.tsx` patrón | → `ServiceCompositionRoleRow.tsx` | — |
| Tool row | — | — | ✅ `ServiceCompositionToolRow.tsx` |
| Overhead row | — | — | ✅ `ServiceCompositionOverheadRow.tsx` |
| Add-item buttons | MUI `Button outlined` | — | — |

**A11y**:
- Drag: debe tener botón de keyboard alternative (`Mover arriba / Mover abajo`) — WCAG 2.5.7
- `aria-label` en cada icono `≡`: `"Arrastrar para reordenar {nombre del rol}"`

---

#### Surface L — Pricing Governance Panel

**Blueprint** (tabs):
```
┌────────────────────────────────────────────────────────────┐
│ [Tiers] [Modelos comerciales] [Países] [Employment types]  │
│ [Audit timeline]                                           │
├────────────────────────────────────────────────────────────┤
│ Tab "Audit timeline":                                      │
│                                                            │
│  ● 2026-04-18 14:32  Sr Designer                           │
│    Precio base 3.2M → 3.4M CLP                            │
│    Por: maria@efeonce.cl · razón: ajuste Q2 2026           │
│                                                            │
│  ● 2026-04-15 09:10  Figma                                 │
│    Fee 15% → 12% (renegociado con proveedor)               │
│    Por: sistema (nubox sync)                               │
│ ...                                                        │
└────────────────────────────────────────────────────────────┘
```

**Component manifest**:

| Elemento | Reusa | Adapta | Crea |
|----------|-------|--------|------|
| Tab container | `CustomTabList` | — | — |
| Simple entity tables (tiers, commercial models, country factors, employment types) | `ecommerce/products/category/ProductCategoryTable.tsx` | → `SimpleEntityTable.tsx` (generic) | — |
| Audit timeline | MUI Lab `Timeline` + `TimelineItem` | `full-version` dashboards activity timeline | ✅ `PriceChangeAuditTimeline.tsx` |

---

### §3 · New Component Stack (9 componentes)

Todos viven en `src/components/greenhouse/pricing/`.

#### 3.1 `CostStackPanel.tsx`

Ver Surface C para contrato completo.

**Variants**:
- `variant='quote-builder'` — accordion expandible, default collapsed, inline en builder
- `variant='admin-preview'` — siempre expandido, sin accordion, en admin para ver breakdown de un servicio

**Estados**: default, loading (skeleton), empty (sin líneas → null), error (banner)

**Motion**: fade-in del contenido al expandir (150ms ease-out); respeta `useReducedMotion`.

#### 3.2 `MarginIndicatorBadge.tsx`

```ts
interface MarginIndicatorBadgeProps {
  marginPct: number        // 0.32 = 32%
  target: { min: number; opt: number; max: number }
  size?: 'sm' | 'md'
  showLabel?: boolean     // default true → "Óptimo" / "Atención" / "Crítico"
}
```

Reglas:
- `marginPct < target.min` → error (crítico), icon `tabler-alert-triangle`
- `target.min <= marginPct < target.opt` → warning (atención), icon `tabler-alert-circle`
- `target.opt <= marginPct <= target.max` → success (óptimo), icon `tabler-circle-check`
- `marginPct > target.max` → info (sobre-margin — ¿competitivo?), icon `tabler-info-circle`

**A11y**: icon + label + color — nunca solo color.

#### 3.3 `SellableItemPickerDrawer.tsx`

Ver Surface B. Props:
```ts
interface SellableItemPickerDrawerProps {
  open: boolean
  onClose: () => void
  onSelect: (items: SellableSelection[]) => void
  initialTab?: 'roles' | 'tools' | 'overhead' | 'services'
  excludeIds?: string[]  // ya agregados al quote
}
```

#### 3.4 `SellableItemRow.tsx`

Renderer polimórfico. `variant: 'role' | 'tool' | 'overhead' | 'service'`. Usado tanto en el drawer como en la line items table del builder.

#### 3.5 `CurrencySwitcher.tsx`

```ts
interface CurrencySwitcherProps {
  value: 'CLP' | 'USD' | 'EUR' | 'GBP'
  onChange: (currency: Currency) => void
  disabled?: boolean
  exchangeRateSnapshot?: { base: string; rate: number; asOf: string }  // muestra disclaimer si difiere
}
```

#### 3.6 `ServiceCompositionEditor.tsx`

Ver Surface K.

#### 3.7 `QuickEntityFormDrawer.tsx`

Drawer genérico para create/edit de entidades simples de governance (tiers, commercial models, country factors, employment types). Recibe `schema` (Zod) + `initialValues` + `onSubmit`. Usa react-hook-form.

#### 3.8 `PriceChangeAuditTimeline.tsx`

Ver Surface L tab Audit timeline. Props:
```ts
interface PriceChangeAuditTimelineProps {
  changes: Array<{
    id: string
    entityType: 'role' | 'tool' | 'overhead' | 'service' | 'tier' | 'commercial_model' | 'country_factor' | 'employment_type'
    entityLabel: string
    field: string
    oldValue: string
    newValue: string
    changedAt: string
    changedBy: { type: 'user'; name: string; email: string } | { type: 'system'; source: string }
    reason?: string
  }>
  pageSize?: number
  onLoadMore?: () => void
}
```

#### 3.9 `PricingCatalogNavCard.tsx`

Card navegador de entidades de pricing en Surface H. Propias de este surface, no reusable fuera.

---

### §4 · Copy Extension — `GH_PRICING`

Agregar a `src/config/greenhouse-nomenclature.ts`:

```ts
export const GH_PRICING = {
  // Builder
  builderTitleNew: 'Nueva cotización',
  builderTitleEdit: 'Editar cotización',
  builderSaveDraft: 'Guardar borrador',
  builderSendToClient: 'Enviar al cliente',
  builderPreview: 'Vista previa',

  // Pickers
  pickerTabs: {
    roles: 'Roles',
    tools: 'Herramientas',
    overhead: 'Overhead',
    services: 'Servicios'
  },
  pickerSearchPlaceholder: 'Buscar por SKU o nombre...',
  pickerEmpty: 'No hay ítems activos para este filtro',

  // Cost stack
  costStackTitle: 'Detalle de costo (solo interno)',
  costStackTotalCost: 'Costo total',
  costStackPriceToClient: 'Precio cliente',
  costStackGrossMargin: 'Margen bruto',
  costStackTierFit: 'Tier fit',

  // Margin semaphore
  marginLabels: {
    critical: 'Crítico',
    attention: 'Atención',
    optimal: 'Óptimo',
    overshoot: 'Sobre meta'
  },

  // Commercial models
  commercialModelLabel: 'Modelo comercial',
  countryFactorLabel: 'País del cliente',
  currencyLabel: 'Moneda',
  employmentTypeLabel: 'Tipo de contratación',

  // Send drawer
  sendDrawerTitle: 'Enviar cotización',
  sendDrawerTo: 'Destinatario',
  sendDrawerCc: 'Con copia',
  sendDrawerSubject: 'Asunto',
  sendDrawerMessage: 'Mensaje',
  sendDrawerSubmit: 'Enviar cotización',
  sendDrawerSaveOnly: 'Guardar sin enviar',

  // List
  listKpiDrafts: 'Borradores',
  listKpiSent: 'Enviadas',
  listKpiApproved: 'Aprobadas',
  listKpiExpired: 'Vencidas',
  listNew: 'Nueva cotización',

  // Admin
  adminTitle: 'Catálogo de pricing',
  adminRoles: 'Roles vendibles',
  adminTools: 'Catálogo de herramientas',
  adminOverhead: 'Overhead add-ons',
  adminServices: 'Servicios empaquetados',
  adminTiers: 'Tiers de rol',
  adminCommercialModels: 'Modelos comerciales',
  adminCountryFactors: 'Factores de país',
  adminEmploymentTypes: 'Tipos de contratación',
  adminAudit: 'Historial de cambios',

  // Success / error toasts
  toastQuoteSaved: 'Borrador guardado',
  toastQuoteSent: 'Cotización enviada a {email}',
  toastRoleUpdated: '{label} actualizado',
  errorLoadCatalog: 'No pudimos cargar el catálogo. Intenta de nuevo.',
  errorLoadQuote: 'No pudimos cargar esta cotización. Verifica el enlace e intenta de nuevo.'
} as const
```

---

### §5 · Modern-UI 13-row floor — aplicación por componente

Cada uno de los 9 componentes nuevos debe aprobar las 13 filas antes de merge. Resumen por componente:

| Componente | Semantic root | Keyboard | Focus ring | A11y name | Contrast | Target ≥24 | States | Tokens | Reduced motion | Reflow |
|------------|--------------|----------|-----------|-----------|----------|-----------|--------|--------|----------------|--------|
| CostStackPanel | `<section>` + Accordion | ✓ | ✓ | `aria-label` on header | palette dark+light | 44 (accordion) | default/empty/loading/error | ✓ | fade-in 150ms | 320px |
| MarginIndicatorBadge | `<span>` Chip | — | — | label text (no icon-only) | icon+label+color | n/a | 4 tiers | ✓ | none | inline |
| SellableItemPickerDrawer | `<dialog>` | ✓ Esc close | ✓ | `aria-labelledby` title | ≥4.5:1 | 44 rows | default/search/loading/empty | ✓ | slide 200ms | stack mobile |
| SellableItemRow | `<tr>` | ✓ | ✓ on checkbox | `aria-describedby` price | ≥4.5:1 | 44 | 4 variants × selected/default | ✓ | none | wrap columns |
| CurrencySwitcher | `<select>` | ✓ | native | native | — | 44 | default/disabled/warning | ✓ | none | inline |
| ServiceCompositionEditor | `<ul>` drag list | ✓ (up/down alt) | ✓ | `aria-label` per row | — | 44 | default/empty/saving | ✓ | respect reduce | stack mobile |
| QuickEntityFormDrawer | `<dialog>` | ✓ | ✓ | `aria-labelledby` | ≥4.5:1 | 44 | new/edit/saving/error | ✓ | slide 200ms | stack mobile |
| PriceChangeAuditTimeline | `<ol>` MUI Timeline | ✓ | ✓ | `aria-label` per change | ≥4.5:1 | 44 | default/loading/empty/error | ✓ | none | stack |
| PricingCatalogNavCard | `<a>` wrapping card | ✓ | ✓ | card title = link text | ≥4.5:1 | 44 | default/hover/focus | ✓ | ease hover 150ms | stack |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 12 surfaces tienen blueprint + component manifest + copy notes en §2
- [ ] Las 9 piezas nuevas tienen props contract + variants + states en §3
- [ ] Bloque `GH_PRICING` añadido a `src/config/greenhouse-nomenclature.ts` (string literales, sin lógica)
- [ ] Cada task consumidora (TASK-463, 464e, 465, 466, 467, 468) tiene un bloque `## UI Plan` apuntando a §{surface} de este documento
- [ ] 13-row floor table §5 cubre los 9 componentes nuevos
- [ ] El documento declara explícitamente "payroll isolation" en §Architecture Alignment
- [ ] `docs/tasks/README.md` lista TASK-469 en la sección `To do`
- [ ] `TASK_ID_REGISTRY.md` reserva TASK-469

## Verification

No aplica build/test — este es un documento de diseño. Verificación:

- Lectura por 1 developer + 1 designer antes de empezar TASK-463
- Cross-check con `GREENHOUSE_UI_PLATFORM_V1.md` para confirmar no-divergencia
- Cross-check con `greenhouse-nomenclature.ts` actual para confirmar que GH_PRICING no colisiona

## Closing Protocol

- [ ] `Lifecycle` sincronizado al cerrar (`to-do` → `in-progress` → `complete`)
- [ ] Mover archivo a carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] Cross-links insertados en las 6 tasks consumidoras (TASK-463, 464e, 465, 466, 467, 468)
- [ ] Si al implementar una surface descubres un componente nuevo no planeado, agregar Delta aquí antes de seguir
- [ ] `GH_PRICING` commiteado en `greenhouse-nomenclature.ts` como primer slice

## Follow-ups

- Review del documento por un designer senior (idealmente quien maneja Vuexy en el equipo)
- Si post-implementación surgen componentes nuevos no inventariados, crear TASK-469-delta con el listado
- Evaluar migración futura a `@tabler/icons-react` si el volumen de iconos se vuelve alto

## Open Questions

- ¿El `SendQuoteDrawer` debe reusar la infra de `@react-email/components` + Resend existente, o es un endpoint nuevo? → decide TASK-463
- ¿El `CurrencySwitcher` en Surface E (preview) muestra al cliente las tres monedas, o solo la canónica? → diseño dice: solo canónica al cliente, las otras solo en vista interna. Validar con stakeholder.
- ¿Las tablas de governance (tiers, commercial models, country factors) requieren approval workflow (4-eyes) al modificar? → decide TASK-464b
