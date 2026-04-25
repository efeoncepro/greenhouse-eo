# TASK-620.2 — Artifacts Catalog (sellable_artifacts hibrido: priced standalone o absorbido en horas)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo` (~1.5 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque C)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-620`
- Branch: `task/TASK-620.2-artifacts-catalog`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar el catalogo de `sellable_artifacts` (entregables tangibles: brand books, videos, asset packs, playbooks) con modelo de pricing **hibrido**: algunos se venden con precio fijo standalone (`is_priced_directly=true`), otros tienen su costo absorbido en las horas de los roles que los producen (`is_priced_directly=false`). Habilita seedear los artifacts iniciales, exponer endpoints CRUD, y permitir que un service module los referencie como componentes.

## Why This Task Exists

Tras conversacion con owner se confirmo que Efeonce vende **artefactos como deliverable tangible**, no solo horas o servicios. Pero el modelo es hibrido segun el caso:

- **Modelo A (priced directly):** "1 brand book completo - $5,000 USD" — el cliente compra el output, no las horas. Util en deals de "deliverable-based pricing"
- **Modelo B (absorbido):** "Sub-servicio diseno produce 12 social media posts" — los posts son entregables narrativos, su costo esta en las 80 horas del designer. Util en retainers / time-and-material

El schema `sellable_artifacts` (creado en TASK-620) tiene `is_priced_directly boolean` para soportar ambos. Esta task lo cablea operacionalmente.

## Goal

- Endpoints CRUD `/api/commercial/sellable-artifacts`
- Store con resolucion de pricing hibrido (priced directly devuelve precio, absorbido devuelve estimated_hours)
- Admin UI listView + detailView con ambos modos
- Seed inicial de 8-12 artifacts canonicos de Efeonce (brand book, video manifesto, asset pack, etc.)
- Integracion con service_module: artifacts pueden ser componentes de un service via tabla `service_artifact_recipe` (nueva)
- Quote line item soporta `artifact_id` (nuevo campo) para artifacts standalone

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (TASK-620)
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8
- Modelo similar a `service_role_recipe` y `service_tool_recipe`

Reglas obligatorias:

- artifacts con `is_priced_directly=true` requieren al menos 1 row en `sellable_artifact_pricing_currency`
- artifacts con `is_priced_directly=false` requieren `estimated_hours` poblado
- check constraint enforce esta regla
- pricing snapshot en quote line item (no recalcular historicos)
- expand engine: si artifact priced directly → linea separada; si absorbido → solo metadata, no afecta totals

## Dependencies & Impact

### Depends on

- **`TASK-620`** (sellable_artifacts schema + pricing tables)

### Blocks / Impacts

- **`TASK-620.3`** (composer) — picker de artifacts en composer
- **`TASK-620.4`** (quote picker) — artifacts standalone como line items
- **`TASK-620.5`** (ad-hoc bundles) — incluyen artifacts como componentes
- TASK-027 (HRIS Document Vault) — puede reusar concepto de artifacts para contracts

### Files owned

- `migrations/YYYYMMDD_task-620.2-service-artifact-recipe.sql` (nueva, agrega tabla recipe + columna `artifact_id` en quote_line_items)
- `src/lib/commercial/sellable-artifacts-store.ts` (nuevo)
- `src/lib/commercial/sellable-artifacts-seed.ts` (nuevo)
- `src/lib/commercial/service-catalog-expand.ts` (modificado: incluye artifacts en expansion)
- `src/app/api/commercial/sellable-artifacts/route.ts` (nuevo)
- `src/app/api/commercial/sellable-artifacts/[id]/route.ts` (nuevo)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- `sellable_artifacts` table (TASK-620, vacia)
- `sellable_artifact_pricing_currency` table (TASK-620, vacia)
- `service_role_recipe` (existe, modelo a replicar)
- `service_tool_recipe` (existe, modelo a replicar)

### Gap

- No existe `service_artifact_recipe` (link entre service_modules y artifacts)
- No existe column `artifact_id` en `quotation_line_items` (para artifacts standalone)
- No hay store / endpoint / admin UI / seed
- expand engine no incluye artifacts en expansion

## Scope

### Slice 1 — Migracion (0.25 dia)

```sql
-- migrations/YYYYMMDD_task-620.2-service-artifact-recipe.sql

-- 1. Recipe: artifacts que pertenecen a un service module
CREATE TABLE IF NOT EXISTS greenhouse_commercial.service_artifact_recipe (
  module_id text NOT NULL
    REFERENCES greenhouse_core.service_modules(module_id) ON DELETE CASCADE,
  line_order int NOT NULL,
  artifact_id text NOT NULL
    REFERENCES greenhouse_commercial.sellable_artifacts(artifact_id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_optional boolean NOT NULL DEFAULT false,
  override_unit_price_clp numeric(14,2),
  override_unit_price_usd numeric(14,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module_id, line_order)
);

ALTER TABLE greenhouse_commercial.service_artifact_recipe OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS idx_service_artifact_recipe_artifact
  ON greenhouse_commercial.service_artifact_recipe (artifact_id);

-- 2. quote_line_items: agregar artifact_id para tracking
ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN IF NOT EXISTS artifact_id text REFERENCES greenhouse_commercial.sellable_artifacts(artifact_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotation_line_items_artifact
  ON greenhouse_commercial.quotation_line_items (artifact_id) WHERE artifact_id IS NOT NULL;

-- 3. Check constraint: pricing requirements basadas en is_priced_directly
ALTER TABLE greenhouse_commercial.sellable_artifacts
  ADD CONSTRAINT sellable_artifacts_pricing_consistency
    CHECK (
      (is_priced_directly = true AND estimated_hours IS NULL)
      OR
      (is_priced_directly = false AND estimated_hours IS NOT NULL AND estimated_hours > 0)
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON
  greenhouse_commercial.service_artifact_recipe
TO greenhouse_runtime;
```

### Slice 2 — Store + endpoints (0.5 dia)

`src/lib/commercial/sellable-artifacts-store.ts`:

```typescript
export const listSellableArtifacts = async (filters: ArtifactFilters) => { ... }
export const getSellableArtifactById = async (artifactId: string) => { ... }

export const createSellableArtifact = async (input: {
  artifactName: string
  category: string
  deliverableFormat?: string
  businessLineCode?: string
  isPricedDirectly: boolean
  estimatedHours?: number
  pricing?: Array<{ currency: string; unitPrice: number; effectiveFrom: Date; scopeAssumption?: string }>
  description?: string
  descriptionRichHtml?: string
}) => {
  // Valida: si is_priced_directly=true, requiere pricing[]; si false, requiere estimatedHours
  if (input.isPricedDirectly && (!input.pricing || input.pricing.length === 0)) {
    throw new ValidationError('Artifact priced directly requires at least one pricing row')
  }
  if (!input.isPricedDirectly && (!input.estimatedHours || input.estimatedHours <= 0)) {
    throw new ValidationError('Artifact absorbed in hours requires estimated_hours > 0')
  }
  // INSERT artifact + INSERT pricings en transaction
}

export const resolveArtifactPricing = async (artifactId: string, currency: string, asOfDate?: Date) => {
  // Para is_priced_directly=true: resuelve pricing efectivo
  // Para is_priced_directly=false: devuelve { type: 'absorbed', estimatedHours }
}
```

`src/app/api/commercial/sellable-artifacts/route.ts` — GET list + POST create.
`src/app/api/commercial/sellable-artifacts/[id]/route.ts` — GET / PATCH / DELETE soft.

Permisos: solo Finance Admin / Efeonce Admin.

### Slice 3 — Seed inicial (0.25 dia)

`src/lib/commercial/sellable-artifacts-seed.ts` con 8 artifacts canonicos:

```typescript
export const ARTIFACTS_SEED = [
  // Globe (brand)
  { artifactSku: 'ART-0001', artifactName: 'Brand Book Completo', category: 'brand_book', deliverableFormat: 'PDF + Figma', isPricedDirectly: true, businessLineCode: 'globe', pricing: [{ currency: 'USD', unitPrice: 5000 }, { currency: 'CLP', unitPrice: 4_750_000 }], scopeAssumption: '~50 paginas, 4 semanas' },
  { artifactSku: 'ART-0002', artifactName: 'Manual de Identidad Visual', category: 'brand_book', deliverableFormat: 'PDF', isPricedDirectly: true, businessLineCode: 'globe', pricing: [{ currency: 'USD', unitPrice: 2500 }] },
  { artifactSku: 'ART-0003', artifactName: 'Video Manifesto', category: 'video', deliverableFormat: 'MP4 1080p', isPricedDirectly: true, businessLineCode: 'wave', pricing: [{ currency: 'USD', unitPrice: 8000 }], scopeAssumption: 'video 60-90s' },
  { artifactSku: 'ART-0004', artifactName: 'Pack Social Media (12 posts)', category: 'social_pack', deliverableFormat: 'PNG/JPG + Figma', isPricedDirectly: false, estimatedHours: 32 },
  { artifactSku: 'ART-0005', artifactName: 'Reporte Ejecutivo Trimestral', category: 'report', deliverableFormat: 'PDF + Notion', isPricedDirectly: false, estimatedHours: 16 },
  { artifactSku: 'ART-0006', artifactName: 'Campaign Playbook', category: 'playbook', deliverableFormat: 'Notion workspace', isPricedDirectly: true, businessLineCode: 'reach', pricing: [{ currency: 'USD', unitPrice: 3500 }] },
  { artifactSku: 'ART-0007', artifactName: 'Asset Pack Web (10 piezas)', category: 'social_pack', deliverableFormat: 'PNG + Figma', isPricedDirectly: false, estimatedHours: 24 },
  { artifactSku: 'ART-0008', artifactName: 'Final Report Ejecutivo de Cierre', category: 'report', deliverableFormat: 'PDF + Slides', isPricedDirectly: false, estimatedHours: 12 }
]

export const seedArtifacts = async (actorUserId: string) => {
  for (const a of ARTIFACTS_SEED) {
    await createSellableArtifact({ ...a, createdBy: actorUserId })
  }
}
```

CLI script `scripts/seed-sellable-artifacts.ts` para ejecutar en cada env.

### Slice 4 — Expand engine + tests (0.5 dia)

`src/lib/commercial/service-catalog-expand.ts` (modificado):

```typescript
const expandArtifacts = async (
  moduleId: string,
  options: ExpandOptions
): Promise<QuoteLineItem[]> => {
  const recipes = await getServiceArtifactRecipe(moduleId)
  const lines: QuoteLineItem[] = []

  for (const recipe of recipes) {
    if (recipe.isOptional && options.excluded?.includes(recipe.artifactId)) continue

    const artifact = await getSellableArtifactById(recipe.artifactId)
    const pricingResult = await resolveArtifactPricing(recipe.artifactId, options.currency)

    if (pricingResult.type === 'priced_directly') {
      // Linea separada con su propio precio
      const overrideField = `override_unit_price_${options.currency.toLowerCase()}` as keyof typeof recipe
      const unitPrice = recipe[overrideField] ? Number(recipe[overrideField]) : pricingResult.unitPrice

      lines.push({
        label: artifact.artifactName,
        description: artifact.description,
        descriptionRichHtml: artifact.descriptionRichHtml,
        quantity: recipe.quantity,
        unitPrice,
        unit: 'unit',
        artifactId: artifact.artifactId,
        moduleId,
        productType: 'artifact'
      })
    } else {
      // Modelo absorbido: solo metadata, no afecta totals
      lines.push({
        label: `${artifact.artifactName} (incluido)`,
        description: artifact.description,
        quantity: recipe.quantity,
        unitPrice: 0,
        unit: 'incluido',
        artifactId: artifact.artifactId,
        moduleId,
        productType: 'artifact_absorbed',
        notes: `Costo absorbido en horas (~${pricingResult.estimatedHours}h estimadas)`
      })
    }
  }

  return lines
}
```

Tests:

- `sellable-artifacts-store.test.ts` — CRUD + pricing resolution hibrido
- `service-catalog-expand.test.ts` (extended) — expand con artifacts priced + absorbed mixed
- Snapshot test: artifact con pricing override en recipe usa el override

## Out of Scope

- Admin UI completa (TASK-620.3 incluye composer que cubre la edicion)
- HubSpot sync de artifacts (futuro: requeriria nuevo product_type='deliverable')
- AI-generated artifact descriptions (TASK-630.2 cubre)
- Versionado de artifacts (ej. "Brand Book v2 reemplaza v1") — futuro

## Acceptance Criteria

- [ ] migracion aplicada
- [ ] 8 artifacts seedeados en dev
- [ ] endpoints CRUD funcionales
- [ ] check constraint `sellable_artifacts_pricing_consistency` enforced
- [ ] expand engine produce lineas correctas para ambos modos (priced + absorbed)
- [ ] artifacts standalone agregables a quote (TASK-620.4 lo expone en UI)
- [ ] aplicado en staging + prod despues de QA

## Verification

- `pnpm test` con tests nuevos passing
- Manual test endpoint: crear artifact priced → succeed; crear absorbed sin estimated_hours → fail
- Smoke quote: agregar service module con artifact priced + absorbed → verificar lineas en quote

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con seed counts por env
- [ ] `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` actualizado con seccion "Artifacts Hybrid Pricing"
- [ ] `docs/documentation/admin-center/catalogo-productos-fullsync.md` actualizado
