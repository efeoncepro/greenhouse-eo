# TASK-457 — UI Revenue Pipeline Hybrid

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-456 (deal pipeline projection), TASK-454 (lifecyclestage)`
- Branch: `task/TASK-457-ui-revenue-pipeline-hybrid`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplazar la sub-tab "Pipeline" actual (quote-grain, mis-modelada) por un **pipeline comercial unificado** que roles-up deal-grain + standalone-quote-grain según la categoría de la oportunidad (Deal / Contract / Pre-sales), resolviendo el double-counting y alineando la UI con el modelo de forecast correcto.

## Why This Task Exists

La tab "Cotizaciones" de TASK-351 tiene tres sub-tabs: Pipeline, Rentabilidad, Renovaciones. De los tres, **solo Pipeline está mis-modelada**: muestra filas por quote cuando debería mostrar filas por oportunidad comercial (deal para net-new, quote standalone para MSA/SOW/Nubox recurring). Los otros dos sub-tabs (Rentabilidad y Renovaciones) son correctamente quote-level y quedan intactos.

Con TASK-453/456 materializando `deal_pipeline_snapshots` y TASK-454 trayendo `lifecyclestage`, ya tenemos el backend para reframe la UI al modelo híbrido correcto.

## Goal

- Tab "Cotizaciones" renombrada a "Pipeline comercial"
- Sub-tab "Pipeline" muestra filas unificadas: deal-grain + standalone-quote-grain
- Chips visuales por categoría: Deal (primary) / Contrato standalone (info) / Pre-sales (warning)
- Filtros: categoría, stage, BU, owner, lifecyclestage
- Sub-tabs "Rentabilidad" y "Renovaciones" se mantienen sin cambios (quote-level correcto)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Copy en español, tuteo, terminología Greenhouse (nunca "oportunidad genérica" — usar "Deal", "Contrato", "Pre-sales")
- Tenant scope automático via `requireFinanceTenantContext`
- Vuexy primitives (`CustomChip`, `CustomTabList`, `HorizontalWithSubtitle`) — nada custom
- No romper las otras dos sub-tabs (Rentabilidad, Renovaciones)

## Normative Docs

- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx` (TASK-351) — base a extender
- `src/config/greenhouse-nomenclature.ts` — labels

## Dependencies & Impact

### Depends on

- TASK-456 — `deal_pipeline_snapshots` projection
- TASK-454 — lifecyclestage disponible en clients
- TASK-453 — deals canonical (transitive via TASK-456)

### Blocks / Impacts

- Deprecate la sub-tab "Pipeline" actual (quote-grain)
- Reemplaza parcialmente `CommercialIntelligenceView.tsx`

### Files owned

- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx` (refactor)
- `src/views/greenhouse/finance/workspace/PipelineBoardUnified.tsx` (nuevo)
- `src/app/api/finance/commercial-intelligence/revenue-pipeline/route.ts` (nuevo — unified endpoint)
- `src/lib/commercial-intelligence/revenue-pipeline-reader.ts` (nuevo — union logic)

## Current Repo State

### Already exists

- `CommercialIntelligenceView.tsx` con 3 sub-tabs (Pipeline, Rentabilidad, Renovaciones) de TASK-351
- `src/lib/commercial-intelligence/intelligence-store.ts` con `listPipelineSnapshots`
- API `/api/finance/commercial-intelligence/pipeline` (deprecar o mantener como interno)

### Gap

- No hay endpoint que una deal_pipeline + standalone quote_pipeline
- UI actual muestra todo a grain quote sin distinción de categoría
- Sin lifecyclestage surfacing, el classifier pre-sales no funciona

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Union reader + endpoint

- `src/lib/commercial-intelligence/revenue-pipeline-reader.ts`:
  - `listRevenuePipelineUnified({ tenant, filters }) → UnifiedPipelineRow[]`
  - Query logic:
    - Deal rows: `SELECT ... FROM deal_pipeline_snapshots WHERE is_open = TRUE` mapeados como `category='deal'`
    - Standalone quote rows: `SELECT ... FROM quotation_pipeline_snapshots q LEFT JOIN deals d ON q.quotation_id ~ d.hubspot_deal_id WHERE d.deal_id IS NULL` → classified by `client.lifecyclestage`
    - `category = 'contract' | 'pre-sales'` según `lifecyclestage`
  - Ordenamiento: deal rows primero por `close_date`, luego standalone por `expiry_date`
- `GET /api/finance/commercial-intelligence/revenue-pipeline` — expone el reader

### Slice 2 — Componente unificado

- `PipelineBoardUnified.tsx`:
  - 4 KPIs arriba: Pipeline abierto · Pipeline ponderado · Cerrado ganado (MTD) · Cerrado perdido (MTD)
  - Tabla con chip de categoría por fila
  - Columnas: Categoría · ID · Cliente · Stage · Monto CLP · Probabilidad · Vence/Cierra · Acción
  - Filtros: categoría multi-select, stage, lifecyclestage, BU
  - Empty state + loading states con copy localizado
  - Accesibilidad: aria-label por chip, role="table", keyboard nav

### Slice 3 — Reframe view + copy

- Rename tab outer: "Cotizaciones" → "Pipeline comercial"
- Sub-tab "Pipeline" → usa `PipelineBoardUnified` en lugar del actual
- Sub-tabs "Rentabilidad" + "Renovaciones" se mantienen intactas
- Copy changes via `greenhouse-ux-writing`: explicaciones, tooltips, chip labels

## Out of Scope

- Drill-down de deal → quotes asociadas (link al detalle del deal es suficiente)
- Edición de deal stage desde la UI (solo lectura)
- Forecast editable, scenarios what-if
- Export a Excel/PDF (follow-up)

## Detailed Spec

### Unified row shape

```typescript
interface UnifiedPipelineRow {
  id: string              // deal_id or quotation_id
  category: 'deal' | 'contract' | 'pre-sales'
  entityName: string      // deal_name or quotation_number
  clientId: string | null
  clientName: string | null
  stage: string           // dealstage or pipeline_stage
  stageLabel: string      // translated
  amountClp: number | null
  probabilityPct: number
  closeDate: string | null        // deal.close_date
  expiryDate: string | null       // quote.expiry_date
  daysUntilClose: number | null
  isOpen: boolean
  quoteCount: number | null       // deal only
  lifecyclestage: string | null   // standalone only (from client)
  linkUrl: string         // deep link
}
```

### Classification SQL (simplified)

```sql
-- Standalone quotes (no linked deal or deal closed)
SELECT q.*, c.lifecyclestage, 'quote' AS grain
FROM greenhouse_serving.quotation_pipeline_snapshots q
  LEFT JOIN greenhouse_commercial.deals d
    ON q.quotation_id IN (SELECT quotation_id FROM greenhouse_commercial.quotations WHERE hubspot_deal_id = d.hubspot_deal_id)
  LEFT JOIN greenhouse_core.clients c ON q.client_id = c.client_id
WHERE (d.deal_id IS NULL OR d.is_closed = TRUE)
  AND q.is_expired = FALSE;

-- Deal pipeline
SELECT d.*, 'deal' AS grain
FROM greenhouse_serving.deal_pipeline_snapshots d
WHERE d.is_open = TRUE;
```

### Chip + color mapping

| Categoría | Label | Color | Ícono |
|---|---|---|---|
| deal | "Deal" | primary | tabler-target |
| contract | "Contrato" | info | tabler-file-text |
| pre-sales | "Pre-sales" | warning | tabler-user-search |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tab outer renombrada a "Pipeline comercial"
- [ ] Sub-tab "Pipeline" muestra filas con chips de categoría
- [ ] Un deal con 3 quotes aparece como 1 fila "Deal" con `quote_count=3`
- [ ] Quote Nubox-sourced (sin `hubspot_deal_id`) a cliente customer → fila "Contrato"
- [ ] Quote a lead (lifecyclestage='lead') → fila "Pre-sales"
- [ ] Filtros funcionan (categoría, stage, lifecyclestage, BU)
- [ ] KPIs reflejan totales sin double-counting
- [ ] Rentabilidad + Renovaciones intactas

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test` + nuevos tests de classifier
- `pnpm build`
- Validación manual en staging: abrir tab, confirmar filas, chips, filtros

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo de impacto cruzado con TASK-458 (quick label fix ya cerrado)
- [ ] Doc funcional en `docs/documentation/finance/pipeline-comercial.md` actualizado/creado

## Follow-ups

- Drill-down de deal → lista de quotes con document chain per quote
- Forecast revenue editable por stage-weighted amounts
- Snapshot histórico del pipeline (para comparar week-over-week)

## Open Questions

- ¿Qué pasa con quotes que tienen `hubspot_deal_id` de un deal ya `closedlost` en HubSpot? Propuesta: clasificar como `contract` si `status='approved'` (ya firmado), o excluir si `status='rejected'`. Decidir en Discovery.
