# TASK-604 — HubSpot Products Inbound Rehydration + Owner Bridge + Drift Detection (TASK-587 Fase D)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `TASK-587` (umbrella) → `TASK-544` (program parent)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (TASK-601 + TASK-602 + TASK-603 + TASK-574 cerradas 2026-04-24)
- Branch: `task/TASK-604-hubspot-products-inbound-rehydration`

## Summary

Extiende `HubSpotGreenhouseProductProfile` inbound a v2 (owner, prices by currency, rich description, category/unit/tax hubspot_option_value, hubspot_owner_assigneddate). [sync-hubspot-products.ts](src/lib/hubspot/sync-hubspot-products.ts) rehidrata `commercial_owner_member_id` via `loadHubSpotOwnerBindingByOwnerId` con conflict resolution (HS-wins durante ventana sin UI, tiebreaker `gh_last_write_at` vs `hs_lastmodifieddate`, override `owner_gh_authoritative`). Drift detection ampliado clasifica drift como `pending_overwrite` (prices) vs `manual_drift` (category/unidad) vs `error`.

## Why This Task Exists

Con Fase C (TASK-603) el outbound emite full-fidelity pero el inbound sigue consumiendo shape v1 ([sync-hubspot-products.ts:14-75](src/lib/hubspot/sync-hubspot-products.ts#L14-L75)) — ignora owner, rich description y los campos categoría/unidad que el operador HS eventualmente cambia. Sin mirror inbound correcto:

- Owner seteado por operador HS no llega a GH → dashboards de "productos por comercial" quedan vacíos.
- Drift detection reporta pero no distingue drift esperado (HS muestra stale mientras próximo outbound lo resuelve) de drift de edit manual operativo (requiere acción).
- `commercial_owner_assigned_at` (audit HS, read-only) no se captura, perdemos historia de cambios de ownership.

## Goal

- `HubSpotGreenhouseProductProfile` v2 incluye `owner`, `pricesByCurrency`, `descriptionRichHtml`, `categoryHubspotValue`, `unitHubspotValue`, `taxCategoryHubspotValue`, `hubspotOwnerAssignedAt`, `imageUrls`, `marketingUrl`.
- Inbound rehidrata `commercial_owner_member_id` respetando conflict rules de soft-SoT en owner.
- Drift detection devuelve `{ productId, driftedFields: [{ name, hsValue, ghValue, classification }] }` con clasificación correcta.
- Reverse lookup de category/unit/tax: `hubspot_option_value → code` via ref tables.
- Tests cubren: owner win/loss scenarios, category reverse mapping, drift classification.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (drift detection pattern)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (owner bridge semantics)

Reglas obligatorias:

- **GH SoT de prices/description/classification/category/unit/type/tax/recurrencia**. Inbound lee para drift report, NO updatea `product_catalog` con valores HS.
- **Owner es soft-SoT**: HS wins durante ventana sin UI. Tiebreaker:
  - Si `owner_gh_authoritative=true` → GH wins siempre (ignora HS value)
  - Sino, si `hs_lastmodifieddate > gh_last_write_at` → HS wins, upsert `commercial_owner_member_id`
  - Sino → GH wins, preserve actual
- **`commercial_owner_assigned_at`** es captura directa desde HS audit, read-only. GH nunca escribe outbound.
- **Drift classification**:
  - `pending_overwrite` — HS tiene valor distinto de GH en campo GH-SoT; el siguiente outbound lo resolverá. Log info, no alerta.
  - `manual_drift` — HS tiene valor que GH podría aceptar (ej. `categoria_de_item` nuevo que GH no tiene en ref table). Requiere revisión.
  - `error` — HS tiene valor inválido o irresoluble (ej. owner id sin binding). Alertar.

## Normative Docs

- `docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md` § Owner resolution flow (inbound) + § SoT direction table
- `docs/tasks/complete/TASK-548-product-catalog-drift-detection-admin.md` (drift scaffolding existente — extendido)

## Dependencies & Impact

### Depends on

- `TASK-601` — columnas `commercial_owner_member_id`, `commercial_owner_assigned_at`, `owner_gh_authoritative`, `marketing_url`, `image_urls`, ref FKs
- `TASK-602` — `product_catalog_prices` (no se updatea inbound, pero drift compara)
- `TASK-603` — contract v2 outbound (espejo natural: middleware también expone v2 inbound)
- `src/lib/commercial/hubspot-owner-identity.ts` → `loadHubSpotOwnerBindingByOwnerId`
- `src/lib/commercial/product-catalog-references.ts` → lookup reverse

### Blocks

- `TASK-605` — reconcile weekly scheduler usa drift detection v2

### Files owned

- `src/lib/integrations/hubspot-greenhouse-service.ts` (extend `HubSpotGreenhouseProductProfile` con v2 shape)
- `src/lib/hubspot/sync-hubspot-products.ts` (extend inbound rehydration)
- `src/lib/hubspot/sync-hubspot-products.test.ts` (extend)
- `src/lib/hubspot/drift-detector.ts` (new o extend existente si ya existe en TASK-548 output) [verificar path]
- `src/lib/hubspot/drift-detector.test.ts` (new / extend)
- `services/hubspot-greenhouse-integration/**` (extend post TASK-574) — el middleware debe devolver el shape v2 en `/products` y `/products/{id}`

## Current Repo State

### Already exists

- `HubSpotGreenhouseProductProfile` v1 ([service.ts:363-392](src/lib/integrations/hubspot-greenhouse-service.ts#L363-L392))
- `upsertProductFromHubSpot` v1 ([sync-hubspot-products.ts:14](src/lib/hubspot/sync-hubspot-products.ts#L14))
- `HubSpotGreenhouseOwnerProfile` type ([service.ts:47-82](src/lib/integrations/hubspot-greenhouse-service.ts#L47-L82))
- Reconcile stub ([service.ts:894](src/lib/integrations/hubspot-greenhouse-service.ts#L894))
- Bridge reverse lookup ([hubspot-owner-identity.ts:163-199](src/lib/commercial/hubspot-owner-identity.ts#L163-L199))
- Drift detection base ([TASK-548](docs/tasks/complete/TASK-548-product-catalog-drift-detection-admin.md))

### Gap

- Profile v1 no expone `owner`, `pricesByCurrency`, `descriptionRichHtml`, category/unidad/tax hubspot_option_values, `imageUrls`, `marketingUrl`, `hubspotOwnerAssignedAt`.
- Upsert v1 no resuelve owner ni actualiza las columnas nuevas.
- Drift detection reporta presencia pero no clasifica por field.
- Middleware Cloud Run devuelve shape v1 en GET `/products`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Profile v2 types

- Extender `HubSpotGreenhouseProductProfile` con:
  ```ts
  owner: HubSpotGreenhouseOwnerProfile | null
  pricesByCurrency: Partial<Record<CurrencyCode, number | null>>
  descriptionRichHtml: string | null
  categoryHubspotValue: string | null
  unitHubspotValue: string | null
  taxCategoryHubspotValue: string | null
  imageUrls: string[]
  marketingUrl: string | null
  hubspotOwnerAssignedAt: string | null  // ISO
  ```
- Header version check: `fetchJson` detecta `X-Contract-Version: v2` del middleware

### Slice 2 — Middleware contract v2 inbound

- Middleware Cloud Run `/products` GET devuelve shape v2 (todos los fields HS mapeados a profile v2)
- `hubspot_owner_id` → resolver a `HubSpotGreenhouseOwnerProfile` (usa owner cache del middleware)
- Dual-read: si caller no manda `X-Contract-Version`, devuelve v1 (compat legacy)

### Slice 3 — Inbound rehydration logic

- Extender `upsertProductFromHubSpot`:
  - Reverse map `categoryHubspotValue → category_code` via `getCategoryByHubspotValue`
  - Mismo para unit + tax_category
  - Capturar `imageUrls`, `marketingUrl`, `descriptionRichHtml` (si GH no los tiene — primer sync)
  - Captura `hubspotOwnerAssignedAt` → `commercial_owner_assigned_at` (siempre, read-only)
  - Owner conflict resolution:
    ```ts
    if (profile.owner?.ownerHubspotUserId) {
      const binding = await loadHubSpotOwnerBindingByOwnerId(profile.owner.ownerHubspotUserId)
      if (!binding?.memberId) {
        logWarning('source_sync_runs', 'hubspot_owner_unmapped', { productId, hsOwnerId: profile.owner.ownerHubspotUserId })
      } else {
        const currentRow = await getProductCatalogRow(productId)
        const hsNewer = parseISO(profile.metadata.lastModifiedAt) > currentRow.gh_last_write_at
        if (!currentRow.owner_gh_authoritative && hsNewer) {
          // HS wins: upsert commercial_owner_member_id
          await setCommercialOwner(productId, binding.memberId)
        }
        // else preserve
      }
    }
    ```
- **NO actualizar** `product_catalog_prices` desde inbound (GH SoT). Solo drift report.
- **NO actualizar** description/category/unit/type/classification/pricing_model (GH SoT). Solo drift report.

### Slice 4 — Drift detector v2

- `detectProductDrift(productId, profile): Promise<DriftReport>`:
  - Compara cada field GH-SoT con HS value
  - Clasifica:
    - Price drift → `pending_overwrite` (GH outbound lo resuelve)
    - Category/unit con `hubspot_option_value` desconocido → `manual_drift` (revisar ref table)
    - Category/unit conocido pero distinto → `pending_overwrite`
    - Description plain diferente de plain derivado → `pending_overwrite`
    - Description rich diferente → `pending_overwrite`
    - Owner sin binding → `error`
    - Product type/classification/pricing_model/bundle_type diferentes → `pending_overwrite`
    - Marketing URL / image URLs diferentes → `pending_overwrite`
- Persist drift report en `source_sync_runs` con shape:
  ```json
  { productId, scannedAt, driftedFields: [{ name, hsValue, ghValue, classification }] }
  ```

### Slice 5 — Tests

- Owner HS wins durante ventana (gh_last_write_at older, owner_gh_authoritative=false)
- Owner GH wins (owner_gh_authoritative=true)
- Owner null binding → error log, no crash
- Category `hubspot_option_value` desconocido → `manual_drift` classification
- Price drift → `pending_overwrite` classification
- `commercial_owner_assigned_at` captura siempre desde HS

## Out of Scope

- Admin UI para revisar drift → TASK-605
- Reconcile scheduler → TASK-605
- Reaccionar automáticamente al drift (auto-fix trigger) → TASK-605 o follow-up
- Cambios al outbound → TASK-603 (ya cerrado en ese momento)

## Detailed Spec

Ver [TASK-587 § Owner resolution flow (inbound)](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `HubSpotGreenhouseProductProfile` v2 exporta 9 nuevos campos; tipos Kysely compatibles
- [ ] Middleware devuelve profile v2 cuando `X-Contract-Version: v2`
- [ ] Upsert inbound rehidrata: `commercial_owner_assigned_at`, `image_urls`, `marketing_url`, `description_rich_html` (si GH NULL), owner con conflict resolution correcto
- [ ] Upsert NUNCA escribe a `product_catalog_prices` (verifica test)
- [ ] Upsert NUNCA updatea description/category/unit/type/classification desde HS (verifica test)
- [ ] Drift detector clasifica correctamente 3 categorías (pending_overwrite, manual_drift, error)
- [ ] `source_sync_runs` contiene drift reports con shape esperado
- [ ] Tests owner HS-wins / GH-wins / no-binding passing

## Verification

- `pnpm lint` + `npx tsc --noEmit`
- `pnpm test src/lib/hubspot/sync-hubspot-products.test.ts`
- `pnpm test src/lib/hubspot/drift-detector.test.ts`
- Staging: `pnpm staging:request GET /api/admin/commercial/product-sync-conflicts` muestra shape nuevo

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md`: inbound v2 live, drift classifier deployed, owner bridge activo para productos
- [ ] `changelog.md`: profile v2, drift classification, owner rehydration
- [ ] Update TASK-587: Fase D completada
- [ ] Desbloquear TASK-605

## Follow-ups

- Flip owner SoT a GH-wins cuando admin UI lande (TASK-605) → ajustar conflict resolution en este módulo
- Drift auto-fix trigger (outbound automático cuando drift `pending_overwrite` detectado) → follow-up
