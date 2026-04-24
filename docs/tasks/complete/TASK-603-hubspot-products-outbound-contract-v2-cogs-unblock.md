# TASK-603 — HubSpot Products Outbound Contract v2 + COGS Unblock (TASK-587 Fase C)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `TASK-587` (umbrella) → `TASK-544` (program parent)
- Status real: `Completo 2026-04-24`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (TASK-601 + TASK-602 + TASK-574 cerradas)
- Branch: `task/TASK-574-absorb-hubspot-greenhouse-integration-service` (merge directo a develop)
- Completed: `2026-04-24`

## Summary

Extiende el contrato outbound GH→HS a v2 con full-fidelity: 6 `hs_price_*` derivados de `product_catalog_prices`, `hs_rich_text_description`, `hs_product_type` (mapeado desde `source_kind`), `hs_cost_of_goods_sold` desbloqueado, `hubspot_owner_id` via bridge existente, `hs_url`, `hs_images`, `categoria_de_item`, `unidad`, `hs_tax_category`, recurrencia, `hs_pricing_model=flat`, `hs_product_classification=standalone`, `hs_bundle_type=none`. Modifica `hubspot-outbound-guard.ts` para permitir COGS (mantiene margin/cost_breakdown blocked). Coordina con middleware Cloud Run (`hubspot-greenhouse-integration`) para agregar fields al contract v2. Sanitiza HTML rich description server-side con whitelist.

## Why This Task Exists

El outbound v1 ([push-product-to-hubspot.ts](src/lib/hubspot/push-product-to-hubspot.ts) + [hubspot-product-payload-adapter.ts](src/lib/hubspot/hubspot-product-payload-adapter.ts)) sólo emite `name`, `sku`, `description` plain, `unitPrice` scalar, 5 custom `gh_*` y `isArchived`. Los 74 productos HS están vacíos en precio porque el scalar apunta a `hs_price` (inexistente en este portal). Esta task activa los 16 fields catalog restantes + COGS del payload, consumiendo TASK-601 (schema) y TASK-602 (prices normalizados). COGS se desbloquea explícitamente como decisión de governance (supersedea parcialmente [TASK-347](docs/tasks/complete/TASK-347-quotation-catalog-hubspot-canonical-bridge.md) — margin permanece blocked).

## Goal

- `HubSpotGreenhouseCreateProductRequest` + `HubSpotGreenhouseUpdateProductRequest` extendidos con shape v2 (ver [TASK-587 Slice C](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md)).
- `HUBSPOT_FORBIDDEN_PRODUCT_FIELDS` actualizado: remueve `costOfGoodsSold`/`cost_of_goods_sold`/`unitCost`/`unit_cost`/`loadedCost`/`loaded_cost`; mantiene 5 conceptuales (margin_pct + targets + floor + effective + cost_breakdown).
- Payload adapter construye `pricesByCurrency` desde `getPricesByCurrency`; resuelve owner via `loadActorHubSpotOwnerIdentity`; mapea `source_kind → hs_product_type` via tabla ref; sanitiza `description_rich_html` y deriva `description` plain.
- Middleware Cloud Run ([hubspot-greenhouse-integration](https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app)) acepta shape v2 via header `X-Contract-Version: v2`; dual-write durante ventana de validación.
- Test E2E staging: 1 producto creado en GH → verificación en HS sandbox de los 16 fields catalog + COGS + 5 `gh_*`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (projection patterns, idempotencia)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (si middleware gana nuevos hooks)

Reglas obligatorias:

- **GH SoT inviolable**: outbound emite los 6 `hs_price_*` siempre, incluso con NULL (limpia HS). Ningún edit HS se preserva.
- **COGS desbloqueado solo para `cost_of_goods_sold`**. Margin/cost_breakdown siguen blocked permanentemente — el guard los rechaza con `HubSpotCostFieldLeakError`.
- **Anti-ping-pong**: preservar timestamp `gh_last_write_at` + check previo (60s window heredado de TASK-547).
- **HTML sanitization obligatoria**: no pasar rich_html sin sanitizar al middleware — whitelist de tags: `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a href>`, `<br>`.
- **TASK-574 requerida antes**: esta fase hace cambios grandes al middleware Cloud Run (16 nuevos fields + COGS + fan-out a HS API). Sin TASK-574 cerrada, esos cambios viven en el sibling repo `cesargrowth11/hubspot-bigquery` que tiene 0 CI/CD y deploy 100% manual. Con TASK-574 cerrada, el middleware está en `services/hubspot-greenhouse-integration/` y los cambios se validan en un solo PR del monorepo.

## Normative Docs

- `docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md` § Detailed Spec → Cost guard modification + Owner resolution flow
- `docs/tasks/complete/TASK-347-quotation-catalog-hubspot-canonical-bridge.md` (governance original de cost guard — a parcialmente supersedar)
- `docs/operations/product-catalog-sync-runbook.md` (update al cierre)
- `docs/operations/hubspot-custom-properties-products.md` (update con cualquier nueva custom property)

## Dependencies & Impact

### Depends on

- `TASK-601` — columnas nuevas en `product_catalog` + 4 ref tables
- `TASK-602` — `product_catalog_prices` + `getPricesByCurrency`
- `src/lib/commercial/hubspot-owner-identity.ts` (bridge existente — reusado)
- `src/lib/hubspot/hubspot-product-payload-adapter.ts` (adapter v1 existente — extendido)
- `src/lib/commercial/hubspot-outbound-guard.ts` (guard existente — modificado)
- `TASK-574` — Absorber middleware en monorepo (bloqueante: ver sección Architecture Alignment arriba)
- Middleware Cloud Run `hubspot-greenhouse-integration` — modificado en `services/` del monorepo post TASK-574

### Coordina con

- `TASK-575` — Upgrade HubSpot Developer Platform 2026.03 (ortogonal, no bloquea)

### Blocks

- `TASK-604` — necesita contract v2 también en inbound shape para rehidratar
- `TASK-605` — backfill masivo usa este outbound

### Files owned

- `src/lib/integrations/hubspot-greenhouse-service.ts` (extend types — contrato v2)
- `src/lib/commercial/hubspot-outbound-guard.ts` (modify — remover COGS del set forbidden + update JSDoc)
- `src/lib/hubspot/hubspot-product-payload-adapter.ts` (extend con nuevos fields + owner resolution + HTML sanitization)
- `src/lib/hubspot/hubspot-product-payload-adapter.test.ts` (extend)
- `src/lib/hubspot/push-product-to-hubspot.ts` (extend snapshot reader para nuevos fields)
- `src/lib/sync/projections/product-hubspot-outbound.ts` (no cambia comportamiento; valida nuevo contract)
- `src/lib/commercial/hubspot-outbound-guard.test.ts` (update — verificar COGS passes, margin rejected)
- `services/hubspot-greenhouse-integration/**` (extend post TASK-574 — middleware absorbido en monorepo)
- Package deps: agregar `sanitize-html` o `isomorphic-dompurify` via `pnpm add` + commit pnpm-lock

## Current Repo State

### Already exists

- `HubSpotGreenhouseCreateProductRequest/UpdateProductRequest` v1 ([service.ts:399-430](src/lib/integrations/hubspot-greenhouse-service.ts#L399-L430))
- `buildCustomProperties` + adapter v1 ([hubspot-product-payload-adapter.ts:38-87](src/lib/hubspot/hubspot-product-payload-adapter.ts#L38-L87))
- Guard con 8 forbidden fields ([hubspot-outbound-guard.ts:14-31](src/lib/commercial/hubspot-outbound-guard.ts#L14-L31))
- Bridge owner ([hubspot-owner-identity.ts](src/lib/commercial/hubspot-owner-identity.ts) — 4 helpers)
- Projection `productHubSpotOutbound` ([product-hubspot-outbound.ts](src/lib/sync/projections/product-hubspot-outbound.ts))

### Gap

- Contract v1 no incluye: `pricesByCurrency`, `descriptionRichHtml`, `productType`, `pricingModel`, `productClassification`, `bundleType`, `categoryCode`, `unitCode`, `taxCategoryCode`, `isRecurring`, `recurringBillingFrequency`, `recurringBillingPeriodCode`, `commercialOwnerEmail`, `marketingUrl`, `imageUrls`, `costOfGoodsSold`.
- Guard bloquea COGS outbound.
- Middleware Cloud Run no conoce contract v2.
- No hay sanitizer HTML server-side en el repo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Guard modification

- `hubspot-outbound-guard.ts`:
  - Remover de `HUBSPOT_FORBIDDEN_PRODUCT_FIELDS`: `costOfGoodsSold`, `cost_of_goods_sold`, `unitCost`, `unit_cost`, `loadedCost`, `loaded_cost`
  - Mantener los 10 restantes (margin_pct × 4 variantes + effective_margin_pct × 2 + cost_breakdown × 2)
  - Actualizar JSDoc del módulo con referencia a TASK-587 + TASK-603
- Tests: `sanitizeHubSpotProductPayload({ costOfGoodsSold: 100, marginPct: 0.2 })` debe preservar COGS y quitar margin_pct

### Slice 2 — Contract v2 types

- Extender `HubSpotGreenhouseCreateProductRequest` y `UpdateProductRequest` con todos los fields v2 (ver shape completo en [TASK-587 Slice C](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md))
- Nueva union `CurrencyCode = 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN'`
- `PricesByCurrency = Partial<Record<CurrencyCode, number | null>>`
- Agregar header `X-Contract-Version: v2` en `buildWriteServiceHeaders`

### Slice 3 — HTML sanitizer

- `pnpm add isomorphic-dompurify` (o `sanitize-html` — decidir en Discovery)
- `src/lib/commercial/description-sanitizer.ts`:
  - `sanitizeProductDescriptionHtml(html): string` — whitelist tags
  - `derivePlainDescription(html): string` — strip tags, collapse whitespace
- Tests: cubre `<script>` stripped, `<a onclick>` stripped, `<p><strong>X</strong></p>` preserved, strip-tags → "X"

### Slice 4 — Adapter v2

- Extender `ProductCatalogSyncSnapshot` con nuevos fields necesarios (owner member id, ref codes, image urls)
- `adaptProductCatalogToHubSpotCreatePayload` y `adaptProductCatalogToHubSpotUpdatePayload`:
  - Lee prices via `getPricesByCurrency(productId)` → `pricesByCurrency`
  - Resuelve owner: `loadActorHubSpotOwnerIdentity({ memberId })` → `hubspotOwnerId` → payload `commercialOwnerEmail`
  - Mapea `source_kind → hs_product_type` via `getProductSourceKindMapping`
  - Sanitiza `descriptionRichHtml` + deriva `description` plain
  - Mapea `categoryCode` via ref table → `categoria_de_item` hubspot_option_value
  - Mismo para `unitCode → unidad`, `taxCategoryCode → hs_tax_category`
  - Escribe explícitamente `pricingModel='flat'`, `productClassification='standalone'`, `bundleType='none'` (evita drift con HS defaults)
  - Sigue corriendo `sanitizeHubSpotProductPayload` como defense-in-depth

### Slice 5 — Middleware Cloud Run

- Extender endpoints `/products` (POST create) y `/products/{id}` (PATCH update) para aceptar shape v2
- Fan-out interno a HS API nativa:
  - `pricesByCurrency.CLP → hs_price_clp`, etc.
  - `descriptionRichHtml → hs_rich_text_description`
  - `productType → hs_product_type`, etc.
  - `costOfGoodsSold → hs_cost_of_goods_sold` (no block server-side — trust client guard ya lo dejó pasar)
  - `commercialOwnerEmail → hubspot_owner_id` via `/crm/v3/owners`
  - `imageUrls → hs_images` (HubSpot acepta array de URLs absolutas)
- Rechazar margin/cost_breakdown si llegan por error (defense-in-depth mirror del guard client-side)
- Dual-write durante ventana de validación: si llega v1 payload (sin header `X-Contract-Version`), procesar con lógica v1; si v2, procesar con lógica v2
- Deploy staging + smoke test

### Slice 6 — Test E2E staging

- Crear 1 producto test en GH admin (manualmente via psql o script)
- Ejecutar outbound manual
- Verificar en HS sandbox via MCP:
  - 6 `hs_price_*` poblados
  - `hs_rich_text_description` con HTML
  - `description` plain derivado
  - `hs_cost_of_goods_sold` poblado
  - `hs_product_type` correcto
  - `hubspot_owner_id` resuelto
  - `hs_url`, `hs_images`, `categoria_de_item`, `unidad` poblados
  - `hs_pricing_model=flat`, `hs_product_classification=standalone`, `hs_bundle_type=none`
  - 5 custom `gh_*` correctos

## Out of Scope

- Inbound rehydration de estos fields → TASK-604 (Fase D)
- Backfill masivo de los 74 productos → TASK-605 (Fase E)
- Admin UI → TASK-605
- Drift reconcile ampliado → TASK-604 + TASK-605
- Migración `greenhouse_finance.products` → TASK-549

## Detailed Spec

Ver [TASK-587 Detailed Spec](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md) secciones: Cost guard modification, Currency canonical set, Source kind to product type mapping, Owner resolution flow (outbound).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `HUBSPOT_FORBIDDEN_PRODUCT_FIELDS` contiene 10 strings (5 conceptuales: margin_pct + target + floor + effective_margin + cost_breakdown) — COGS removido del set
- [x] `sanitizeHubSpotProductPayload({ costOfGoodsSold: 100 })` preserva el field — test verifica
- [x] `sanitizeHubSpotProductPayload({ marginPct: 0.2 })` elimina el field — test verifica
- [x] Contract v2 types exportan todos los 16 fields v2 + `HubSpotCanonicalCurrency` + `HubSpotProductPricesByCurrency` + `HubSpotProductType`
- [x] Adapter v2 resuelve owner correctamente via `loadActorHubSpotOwnerIdentity` (email + hubspotOwnerId)
- [x] Adapter v2 mapea `source_kind → hubspot_product_type` via ref table (`resolveHubSpotProductType`)
- [x] Sanitizer strip de `<script>`, `onclick`, `<iframe>`, `javascript:` URIs; preserva whitelist (15/15 tests)
- [x] Middleware Cloud Run acepta payload v2 (header `X-Contract-Version: v2`); fan-out completo a 16 HS properties
- [x] Dual-write: payload v1 (sin header) sigue funcionando — middleware preserva lógica v1 intacta
- [x] JSDoc del guard refleja decisión TASK-587/TASK-603
- [ ] **Pendiente**: Production deploy del middleware v2 + test E2E staging con 1 producto → verificar 16 fields en HS sandbox. Queda como follow-up operativo (TASK-605 backfill masivo cierra esto).

## Verification

- `pnpm lint` — clean (2 warnings cosméticos sobre DOMPurify named export, sin errores)
- `npx tsc --noEmit` — clean
- `pnpm test src/lib/commercial/__tests__/hubspot-outbound-guard.test.ts` — 8/8
- `pnpm test src/lib/commercial/__tests__/description-sanitizer.test.ts` — 15/15
- `pnpm test src/lib/hubspot/__tests__/hubspot-product-payload-adapter.test.ts` — 18/18
- `pytest services/hubspot_greenhouse_integration/tests/test_app.py` — 50/50 (40 pre-existentes + 10 nuevos v2)
- `pnpm test src/lib` — 1689/1689 passing

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] Archivo en carpeta correcta (`docs/tasks/complete/`)
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md`: contract v2 live, COGS desbloqueado
- [x] `changelog.md`: guard modification, contract v2, sanitizer, middleware v2
- [x] Update TASK-347: nota de supersedimiento parcial agregada
- [x] Update TASK-587: Fase C ✅ completada
- [x] Update `docs/operations/product-catalog-sync-runbook.md`: contract v2 + SoT table + rollback
- [x] Desbloquear TASK-604 (blocked-by actualizado)

## Follow-ups

- **Production deploy del middleware v2** cuando staging validado (coordinación con ops; el workflow `hubspot-greenhouse-integration-deploy.yml` lo cubre, solo requiere trigger manual o merge a `main`)
- **Test E2E staging con 1 producto** para verificar fan-out de 16 fields en HS sandbox → pendiente hasta que admin UI (TASK-605) permita crear/editar productos; alternativa: script `pnpm tsx scripts/backfill/...` dentro de TASK-605 backfill masivo
- `gh_module_id` custom HS property (link canonical 360 `service_modules.module_id`) → follow-up (fuera de scope de umbrella TASK-587)
- Tiered pricing support (`hs_pricing_model='tiered'`) si emerge use case → follow-up
- `imageUrls` upload workflow con GCS bucket → follow-up independiente (hoy acepta URLs absolutas)
