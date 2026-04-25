# TASK-620.5 — Ad-hoc Bundle Composer in Quote (modal inline + flag is_ad_hoc + promote-to-catalog)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~3 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque D)
- Status real: `Diseno cerrado v1.8`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-620, TASK-620.1, TASK-620.2, TASK-620.3, TASK-620.4`
- Branch: `task/TASK-620.5-adhoc-bundle-composer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Modal "Crear bundle ad-hoc" embebido en el quote builder que permite a sales rep componer un bundle inline (sin crear service module persistente del catalogo). El bundle se persiste como `service_modules` con flags `is_ad_hoc=true` + `is_catalog_visible=false`, vinculado al quote_id que lo origino. Sales rep puede luego "promover" un ad-hoc a catalogo persistente con un click (rellenar metadata canonica + visibilidad publica).

## Why This Task Exists

Confirmado por owner (Trade-off A): los bundles ad-hoc deben **persistir** (no ser solo grouping visual) y deben ser **convertibles a catalogo persistente**. Razones operacionales:

- Sales rep arma "Brand Quick Refresh" inline para cliente Acme. Si funciona, lo promueve a catalogo para reusar en otros clientes
- Catalogo actual no se contamina con experimentos efimeros (ad-hocs no aparecen en picker publico)
- Knowledge no se pierde — todos los ad-hocs quedan auditables y reutilizables del lado del rep que los creo
- Constraint rules y composer son los mismos del catalogo persistente (TASK-620.3 reutilizado en mode='ad-hoc')

## Goal

- Modal `<AdHocBundleModal>` en QuoteLineItemsEditor reusa `<ServiceModuleComposer>` con `mode='ad-hoc'`
- Flags nuevas en `service_modules`: `is_ad_hoc boolean`, `is_catalog_visible boolean`, `originated_from_quotation_id`, `promoted_to_catalog_at`, `promoted_by`
- Save: persiste service module con flags + crea recipes + expande lineas en el quote actual
- Picker (TASK-620.4) filter excluye `is_catalog_visible=false` por default — pero sales rep que es owner del quote ve sus propios ad-hocs en seccion "Mis bundles ad-hoc"
- Endpoint "promote to catalog" que cambia flags + obliga a llenar metadata canonica (SKU, business_line, tier, commercial_model)
- Listado "Mis bundles ad-hoc" en perfil del sales rep / vista admin

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (TASK-620)
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8 (Bloque D)
- TASK-620.3 (composer reutilizado, NO duplicado)

Reglas obligatorias:

- ad-hoc bundles invisible al picker publico (`is_catalog_visible=false`)
- ad-hoc bundles tienen `is_ad_hoc=true` para diferenciar en queries
- promotion requiere validacion: SKU unico + metadata completa
- audit log de creacion ad-hoc + promocion + cambios
- ad-hoc no participa en HubSpot sync hasta promocion (evita contaminar catalogo HubSpot)
- WCAG 2.2 AA: modal trap focus, escape closes, ARIA labels

## Dependencies & Impact

### Depends on

- **`TASK-620`** (service_modules + service_module_children)
- **`TASK-620.1`** + **`TASK-620.2`** (sellable_tools + sellable_artifacts)
- **`TASK-620.3`** (`<ServiceModuleComposer>` reusable con prop `mode`)
- **`TASK-620.4`** (picker + helper buildQuoteLineFromCatalogItem)

### Blocks / Impacts

- HubSpot sync: si ad-hoc promovido, sync inicial al promote
- Renewal engine (TASK-624): ad-hocs de retainers necesitan ser promovidos para entrar al renewal cycle
- Reports analytics: tracking de cuantos ad-hocs se promueven (signal de qual catalog gaps existen)

### Files owned

- `migrations/YYYYMMDD_task-620.5-ad-hoc-bundles.sql` (nueva)
- `src/views/greenhouse/finance/workspace/AdHocBundleModal.tsx` (nuevo)
- `src/views/greenhouse/finance/workspace/MyAdHocBundlesPanel.tsx` (nuevo, panel reusable)
- `src/lib/commercial/ad-hoc-bundle-store.ts` (nuevo)
- `src/app/api/commercial/service-modules/[id]/promote-to-catalog/route.ts` (nuevo)
- `src/app/api/commercial/service-modules/ad-hoc/route.ts` (nuevo, list + create)
- `src/lib/commercial/service-catalog-store.ts` (modificado: filter is_catalog_visible)
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx` (modificado: agregar boton + modal)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists (post tasks anteriores)

- `service_modules` table
- `<ServiceModuleComposer>` con prop `mode` (TASK-620.3)
- `<QuoteCatalogPicker>` (TASK-620.4)

### Gap

- `service_modules` no tiene flags ad_hoc / catalog_visible / promotion fields
- Sin modal ad-hoc en quote builder
- Sin endpoint promotion
- Sin panel "mis bundles ad-hoc"
- Picker incluye ad-hocs (deberia excluirlos por default)

## Scope

### Slice 1 — Migracion (0.25 dia)

```sql
-- migrations/YYYYMMDD_task-620.5-ad-hoc-bundles.sql

ALTER TABLE greenhouse_core.service_modules
  ADD COLUMN IF NOT EXISTS is_ad_hoc boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_catalog_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS originated_from_quotation_id text,
  ADD COLUMN IF NOT EXISTS originated_by_user_id text,
  ADD COLUMN IF NOT EXISTS promoted_to_catalog_at timestamptz,
  ADD COLUMN IF NOT EXISTS promoted_by_user_id text;

-- Index para lookup rapido de ad-hocs por owner
CREATE INDEX IF NOT EXISTS idx_service_modules_ad_hoc_by_user
  ON greenhouse_core.service_modules (originated_by_user_id, created_at DESC)
  WHERE is_ad_hoc = true;

-- Index para excluir ad-hocs en picker publico (is_catalog_visible=false)
CREATE INDEX IF NOT EXISTS idx_service_modules_catalog_visible
  ON greenhouse_core.service_modules (is_catalog_visible, business_line_code)
  WHERE is_catalog_visible = true;

-- Constraint: promoted_at requires promoted_by
ALTER TABLE greenhouse_core.service_modules
  ADD CONSTRAINT service_modules_promotion_consistency
    CHECK (
      (promoted_to_catalog_at IS NULL AND promoted_by_user_id IS NULL)
      OR
      (promoted_to_catalog_at IS NOT NULL AND promoted_by_user_id IS NOT NULL)
    );

-- Constraint: ad-hoc requires originated_from quote
ALTER TABLE greenhouse_core.service_modules
  ADD CONSTRAINT service_modules_ad_hoc_origin
    CHECK (
      (is_ad_hoc = false)
      OR
      (is_ad_hoc = true AND originated_from_quotation_id IS NOT NULL AND originated_by_user_id IS NOT NULL)
    );
```

### Slice 2 — Store + endpoints (1 dia)

`src/lib/commercial/ad-hoc-bundle-store.ts`:

```typescript
export const createAdHocBundle = async (input: {
  quotationId: string
  versionNumber: number
  actorUserId: string
  composition: ServiceComposition
}) => {
  // 1. Generate unique SKU para ad-hoc (prefix AHC- para diferenciar)
  const sku = `AHC-${Date.now().toString(36)}`

  // 2. Insert service_module con flags ad-hoc
  const moduleId = `mod-adhoc-${gen_random_uuid()}`
  await runQuery(`
    INSERT INTO greenhouse_core.service_modules (
      module_id, service_sku, name, description, business_line_code,
      tier, commercial_model, default_duration_months,
      is_ad_hoc, is_catalog_visible, originated_from_quotation_id, originated_by_user_id,
      created_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, $9, $10, now(), $10)
  `, [...])

  // 3. Insert recipe rows (roles, tools, artifacts, children) en transaction
  await persistComposition(moduleId, input.composition)

  // 4. Audit
  await recordAudit({
    actorUserId: input.actorUserId,
    action: 'ad_hoc_bundle_created',
    entityType: 'service_module',
    entityId: moduleId,
    details: { quotationId: input.quotationId, versionNumber: input.versionNumber, sku }
  })

  return { moduleId, sku }
}

export const listMyAdHocBundles = async (userId: string, filters?: { businessLine?: string; promoted?: boolean }) => {
  return runQuery(`
    SELECT m.*, q.quotation_number AS originated_quote_number
      FROM greenhouse_core.service_modules m
      LEFT JOIN greenhouse_commercial.quotations q ON q.quotation_id = m.originated_from_quotation_id
     WHERE m.is_ad_hoc = true
       AND m.originated_by_user_id = $1
     ORDER BY m.created_at DESC
  `, [userId])
}

export const promoteAdHocToCatalog = async (input: {
  moduleId: string
  actorUserId: string
  catalogMetadata: {
    serviceSku?: string                   // si null, usar el AHC- existente o generar nuevo
    name?: string                         // override del nombre original
    businessLineCode: string              // requerido
    serviceCategory: string               // requerido
    tier: number                          // requerido
    commercialModel: string               // requerido
    defaultDurationMonths?: number
  }
}) => {
  // Validar que metadata completa
  // Update service_modules:
  //   is_ad_hoc = false
  //   is_catalog_visible = true
  //   promoted_to_catalog_at = now()
  //   promoted_by_user_id = actorUserId
  //   + override metadata fields
  // Audit
  // Trigger HubSpot sync (futuro)
}
```

`POST /api/commercial/service-modules/ad-hoc` — crear ad-hoc.
`GET /api/commercial/service-modules/ad-hoc?ownerOnly=true` — listar mis ad-hocs.
`POST /api/commercial/service-modules/[id]/promote-to-catalog` — promover.

### Slice 3 — Modal + integracion (1 dia)

`<AdHocBundleModal>`:

```typescript
interface AdHocBundleModalProps {
  open: boolean
  onClose: () => void
  quoteId: string
  versionNumber: number
  actorUserId: string
  quoteCurrency: string
  quoteBusinessLine?: string
  onBundleCreated: (moduleId: string) => void   // callback que dispara expansion del nuevo bundle
}
```

Internamente:

```tsx
<Dialog fullWidth maxWidth="lg" open={open} onClose={onClose}>
  <DialogTitle>
    Crear bundle ad-hoc para esta cotización
    <Typography variant="caption">
      Solo visible para ti hasta promoverlo al catálogo
    </Typography>
  </DialogTitle>
  <DialogContent>
    <ServiceModuleComposer
      mode='ad-hoc'
      initialComposition={emptyComposition()}
      onSave={async (composition) => {
        const { moduleId } = await createAdHocBundle({
          quotationId: quoteId,
          versionNumber,
          actorUserId,
          composition
        })
        onBundleCreated(moduleId)
        onClose()
      }}
      onCancel={onClose}
    />
  </DialogContent>
</Dialog>
```

Cuando el bundle se guarda, `onBundleCreated` dispara:

```typescript
const handleBundleCreated = async (moduleId: string) => {
  const newLines = await expandServiceIntoQuoteLines(moduleId, {
    currency: quote.currency,
    excluded: []
  })
  for (const line of newLines) {
    await addLineItemToQuote({ ...line, moduleId })
  }
  refreshQuote()
}
```

Picker (TASK-620.4) actualizado con seccion adicional "Mis bundles ad-hoc":

```
🔍 [Buscar...]

Resultados:
── Catalogo publico ──────────────
[items con is_catalog_visible=true]

── Mis bundles ad-hoc (3) ────────
📂 Brand Quick Refresh · AHC-... · creado para QT-001
📂 Performance Audit Pkg · AHC-... · creado para QT-014
📂 [...]
```

### Slice 4 — Promote-to-catalog flow + panel (0.5 dia)

`<MyAdHocBundlesPanel>`:

```
┌─ Mis bundles ad-hoc (5) ────────────────────────┐
│ Filter: [Todos ▼] [Promovidos] [Solo borrador]  │
│                                                  │
│ 📂 Brand Quick Refresh                          │
│    AHC-x7f3 · creado 2026-04-20                 │
│    Origen: QT-001 v3                            │
│    [Ver composicion] [Promover a catalogo] [⋮] │
│                                                  │
│ 📂 Performance Audit Pkg ✓ Promovido            │
│    SKU: SVC-PERF-AUDIT-T2 · 2026-04-22          │
│    Promovido por: Julio Reyes                   │
│    [Ver en catalogo →]                          │
│ ...                                              │
└──────────────────────────────────────────────────┘
```

Promotion modal:

```
┌─ Promover bundle al catalogo ──────────────────┐
│ Para hacer este bundle reusable, necesitamos   │
│ completar metadata:                            │
│                                                │
│ SKU: [SVC-________] (sera unico, validado)    │
│ Nombre publico: [_______________]              │
│ Business line: [▼]                             │
│ Categoria: [▼]                                 │
│ Tier: [▼ 1-4]                                  │
│ Modelo comercial: [▼]                          │
│ Duracion default: [12 meses ▼]                 │
│                                                │
│           [Cancelar]    [Promover]             │
└────────────────────────────────────────────────┘
```

### Slice 5 — Tests + smoke (0.25 dia)

Tests:

- Create ad-hoc bundle: persiste con flags correctas + audit log
- Picker excluye ad-hocs publicos por default
- Picker incluye mis ad-hocs cuando ownerOnly=true
- Promote: cambia flags + valida metadata + crea audit log
- Promote sin metadata required: 400
- Constraint check: ad-hoc sin originated_from → DB rechaza

## Out of Scope

- Compartir ad-hoc con otro sales rep (Fase 2)
- Bulk promote multiple ad-hocs (Fase 2)
- Templates de ad-hoc reusables (Fase 2)
- Auto-suggest "este ad-hoc se parece a uno del catalogo" (futuro AI)

## Acceptance Criteria

- [ ] migracion aplicada con flags + constraints
- [ ] createAdHocBundle persiste correctamente
- [ ] Modal funcional reusando ServiceModuleComposer en mode='ad-hoc'
- [ ] expansion al quote actual funciona post-create
- [ ] Picker excluye ad-hocs publicos pero muestra propios
- [ ] Promote flow valida metadata + persiste correctamente
- [ ] Panel "mis bundles ad-hoc" lista correctamente
- [ ] audit log entries: created + promoted
- [ ] tests passing
- [ ] aplicado en staging + prod

## Verification

- Crear quote, abrir modal ad-hoc, componer "Brand Quick Refresh" con 3 components, save
- Verificar lineas agregadas al quote correctamente
- Verificar bundle visible solo en "Mis ad-hocs", no en picker publico
- Promote a catalogo con SKU "SVC-BRAND-QUICK", verificar visible en picker publico
- Verificar audit log entries

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con flow screenshots
- [ ] `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` actualizado seccion "Ad-hoc Bundles + Promotion"
- [ ] `docs/documentation/finance/cotizaciones-gobernanza.md` actualizado
