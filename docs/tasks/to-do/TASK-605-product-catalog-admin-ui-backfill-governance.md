# TASK-605 — Product Catalog Admin UI + Backfill + Reconcile + Governance (TASK-587 Fase E)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `TASK-587` (umbrella) → `TASK-544` (program parent)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (TASK-601 + TASK-602 + TASK-603 + TASK-604 + TASK-574 cerradas 2026-04-24)
- Branch: `task/TASK-605-product-catalog-admin-ui-governance`

## Summary

Cierra el programa TASK-587: admin UI `/admin/catalogo/productos` con list + 5-tab detail (Identidad, Precios, Clasificación, Recurrencia, Metadatos), capability `commercial.product_catalog.manage`, endpoint manual sync, backfill masivo de los 74 productos al contract v2, reconcile weekly scheduler en `ops-worker`, HubSpot field permissions read-only para operadores, runbook actualizado. Flipea owner SoT de soft-HS a GH-wins una vez UI operativa.

## Why This Task Exists

Sin UI admin, el catálogo queda locked a migrations/scripts — ningún operador puede actualizar precios, categorías, owner ni imágenes sin deploy. El backfill masivo es la prueba de validación de contract v2 end-to-end: si los 74 productos sobreviven un full outbound, el programa está listo. El reconcile scheduler cierra el loop: detecta drift y reporta a Ops Health sin acción humana. Las field permissions HS formalizan el SoT en la UI del CRM. El runbook asegura que operadores entienden el nuevo modelo y no intentan editar lo que se sobrescribirá.

## Goal

- Surface `/admin/catalogo/productos` operativa: list + search + filtros + detail con 5 tabs + manual sync button.
- Capability `commercial.product_catalog.manage` registrada y asociada al surface.
- Backfill masivo idempotente ejecutado: los 74 productos HS sincronizados al contract v2, al menos 1 precio autoritativo cada uno.
- Reconcile weekly scheduler activo en `ops-worker` (`/products/reconcile` del middleware + alerta Slack >5 drifts).
- HS field permissions: catalog fields read-only para roles operadores; `hubspot_owner_id` editable (soft-SoT en owner); `gh_*` custom props read-only.
- Owner SoT flip: `owner_gh_authoritative` pasa a `true` por default para productos nuevos creados desde UI.
- Runbook `docs/operations/product-catalog-sync-runbook.md` actualizado con policy SoT final, decisión COGS, field permissions, manual sync flow.
- Spec arquitectura nueva: `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (stack UI + patrones primitives)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + startup policy + routeGroups + views)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` § 4.9 ops-worker (donde vive el scheduler)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` (modelo dos capas)

Reglas obligatorias:

- **Access model explícito**: la task toca `routeGroups`, `views`, `entitlements` y `startup policy`. Discovery obligado.
- **Primitives Vuexy/MUI**: usar componentes existentes, no inventar nuevos ([greenhouse-ux skill](.claude/skills/greenhouse-ux/)).
- **Backfill idempotente**: re-correr el script no produce duplicados ni efectos secundarios.
- **Reconcile pipeline**: no mete carga adicional en `publish-event` — va por `reactive-consumer` lane ([TASK-551](docs/tasks/to-do/TASK-551-outbox-reactive-decoupling.md) aplica).
- **No romper compat**: Admin UI debe funcionar mientras `greenhouse_finance.products` legacy siga vivo (TASK-549 cleanup es independiente).

## Normative Docs

- `docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md` § Slice E + Detailed Spec completo
- `docs/operations/product-catalog-sync-runbook.md` (update al cierre)
- `docs/operations/hubspot-custom-properties-products.md` (update si gh_* changes)
- `src/lib/admin/capabilities.ts` o equivalente canónico de registro [verificar path]

## Dependencies & Impact

### Depends on

- `TASK-601` — schema + ref tables
- `TASK-602` — prices normalizados
- `TASK-603` — outbound v2 live
- `TASK-604` — inbound rehydration + drift classifier
- Entitlements infrastructure existente
- `ops-worker` service running con Cloud Scheduler jobs

### Blocks

- `TASK-549` (Product Catalog Policy Enforcement & Legacy Cleanup) — puede cerrar el programa parent una vez admin UI operativa

### Files owned

- `src/app/admin/catalogo/productos/page.tsx` (new)
- `src/app/admin/catalogo/productos/[productId]/page.tsx` (new)
- `src/app/admin/catalogo/productos/layout.tsx` (new)
- `src/views/greenhouse/admin/catalogo/productos/ProductCatalogList.tsx` (new)
- `src/views/greenhouse/admin/catalogo/productos/ProductCatalogDetail.tsx` (new)
- `src/views/greenhouse/admin/catalogo/productos/tabs/IdentidadTab.tsx` (new)
- `src/views/greenhouse/admin/catalogo/productos/tabs/PreciosTab.tsx` (new)
- `src/views/greenhouse/admin/catalogo/productos/tabs/ClasificacionTab.tsx` (new)
- `src/views/greenhouse/admin/catalogo/productos/tabs/RecurrenciaTab.tsx` (new)
- `src/views/greenhouse/admin/catalogo/productos/tabs/MetadatosTab.tsx` (new)
- `src/app/api/admin/commercial/products/route.ts` (new — list)
- `src/app/api/admin/commercial/products/[id]/route.ts` (new — get/patch)
- `src/app/api/admin/commercial/products/[id]/sync/route.ts` (new — manual trigger)
- `src/app/api/admin/commercial/products/[id]/prices/route.ts` (new — grid update)
- `src/lib/admin/capabilities.ts` (modify — add `commercial.product_catalog.manage`) [verificar path]
- `scripts/backfill/product-catalog-hs-v2.ts` (new — backfill masivo)
- `services/ops-worker/src/reconcile/product-catalog-reconcile.ts` (new — weekly job) [verificar path]
- Cloud Scheduler config (new job): `gcp-scheduler-tasks` skill para provisioning
- `docs/operations/product-catalog-sync-runbook.md` (update)
- `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` (new)

## Current Repo State

### Already exists

- Entitlements system con capabilities + views + routeGroups ([TASK-455 / IDENTITY_ACCESS_V2](docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md))
- `ops-worker` service con scheduled crons en `*/5`, `2-59/5`, `*/15` timezone `America/Santiago` ([CLAUDE.md § Cloud Run ops-worker](CLAUDE.md))
- Admin Center navigation surface existente ([TASK-542 Party Lifecycle Admin Dashboards](docs/tasks/complete/TASK-542-party-lifecycle-admin-dashboards.md))
- Drift reconciler scaffolding ([TASK-548](docs/tasks/complete/TASK-548-product-catalog-drift-detection-admin.md))
- Runbook `docs/operations/product-catalog-sync-runbook.md`

### Gap

- NO existe surface `/admin/catalogo/productos` ni routeGroup commercial catalog
- NO existe capability `commercial.product_catalog.manage`
- NO existe backfill masivo idempotente al contract v2
- Reconcile actual (TASK-548) reporta pero no clasifica por field ni alerta por Slack
- HS portal no tiene field permissions configuradas para roles operadores
- Runbook no refleja: multi-currency, COGS desbloqueado, policy SoT por field

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capability + access model

- Registrar capability `commercial.product_catalog.manage` con acciones `read`, `write`, `sync_manual`
- Declarar `view_code` correspondiente + asociar al routeGroup `commercial` (si existe) o crear subview bajo admin
- Gate de page guard en `/admin/catalogo/productos/**`
- Agregar al menú Admin Center

### Slice 2 — List view

- `/admin/catalogo/productos`:
  - Tabla con columnas: SKU, Name, Business Line, Category, Unit, Product Type, Is Archived, Last Outbound Sync, Drift Status
  - Search global por SKU/name
  - Filtros: Business Line, Category, Source Kind, Archived (toggle), Has Drift
  - Paginación + sorting
  - Click en fila → navigation a detail

### Slice 3 — Detail view + 5 tabs

- `/admin/catalogo/productos/[productId]`:
  - Header: name, SKU, status badges (archived, sync status, drift count), action bar (manual sync, archive toggle)
  - **Tab Identidad**: code (readonly), name, description_rich_html (rich editor — MUI + tiptap o similar, whitelist client + server), marketing_url, image_urls (list editor de URLs con validación HTTPS + thumbnail preview opcional)
  - **Tab Precios**: grid 6 filas (CLP, USD, CLF, COP, MXN, PEN) con columnas Currency, Unit Price, Is Authoritative (toggle), Derived From, Source. Editing UX: toggle `is_authoritative=true` → input habilitado; toggle off → input disabled con preview del derived. Save dispara recompute via `setAuthoritativePrice`
  - **Tab Clasificación**: product_type (autocomplete source_kind_mapping), category (autocomplete product_categories), unit (autocomplete product_units), tax_category (autocomplete tax_categories), pricing_model (readonly `flat`), product_classification (readonly `standalone`), bundle_type (readonly `none`), cost_of_goods_sold (numeric input, visible solo con capability extra `commercial.product_catalog.cost_view` — TBD en Discovery)
  - **Tab Recurrencia**: is_recurring toggle, recurring_billing_frequency_code (autocomplete), recurring_billing_period_code (autocomplete)
  - **Tab Metadatos**: business_line_code (readonly o selector), source_kind (readonly), source_id (readonly), gh_last_write_at (readonly), commercial_owner_member_id (autocomplete miembros por nombre/email — reuse selector de TASK-539/571), owner_gh_authoritative toggle, commercial_owner_assigned_at (readonly), hubspot_sync_status + last_outbound_sync_at + drift_status_json

### Slice 4 — API endpoints

- `GET /api/admin/commercial/products` — list con filtros + paginación
- `GET /api/admin/commercial/products/[id]` — detail completo con prices + owner resolution
- `PATCH /api/admin/commercial/products/[id]` — update campos catalog (no prices — endpoint separado)
- `PUT /api/admin/commercial/products/[id]/prices` — bulk set de 1+ prices autoritativos; dispara derivación
- `POST /api/admin/commercial/products/[id]/sync` — trigger outbound manual; devuelve resultado síncrono con error detail

### Slice 5 — Backfill masivo

- `scripts/backfill/product-catalog-hs-v2.ts`:
  - Itera los 74 productos en `product_catalog`
  - Por cada uno, invoca outbound v2 manual (misma function que UI manual sync)
  - Captura errores, continúa
  - Output: `created` (nuevo field en HS), `updated` (rehidratado), `skipped` (sin cambios), `errors`
- Ejecutar en staging primero (con dry-run flag), luego production
- Criterio de éxito: los 74 tienen al menos 1 precio autoritativo + `gh_last_write_at` actualizado

### Slice 6 — Reconcile scheduler

- `services/ops-worker/src/reconcile/product-catalog-reconcile.ts`:
  - Job semanal (Cloud Scheduler, timezone `America/Santiago`, e.g. Lunes 06:00)
  - Pulls profile v2 de los 74 productos via middleware `/products/reconcile`
  - Invoca `detectProductDrift` por cada uno
  - Persist reports en `source_sync_runs` con `source_system='product_catalog_reconcile'`
  - Si count(`manual_drift`) + count(`error`) > 5 → alerta Slack en canal `#ops-alerts` con top offenders
- `gcp-scheduler-tasks` skill para provisioning del cron

### Slice 7 — HS field permissions

- **Coordinar con admin HubSpot portal**: configurar field permissions para los roles operadores (no super-admin):
  - Read-only: `hs_price_*` (todos 6), `name`, `hs_sku`, `description`, `hs_rich_text_description`, `hs_product_type`, `hs_product_classification`, `hs_pricing_model`, `hs_bundle_type`, `categoria_de_item`, `unidad`, `hs_tax_category`, `recurringbillingfrequency`, `hs_recurring_billing_period`, `hs_status`, `hs_cost_of_goods_sold`, `hs_url`, `hs_images`
  - Read-only ya desde TASK-563: los 5 `gh_*`
  - Editable: `hubspot_owner_id` (soft-SoT en owner hasta flip)
- Documentar configuración en runbook + screenshot de HS admin

### Slice 8 — Owner SoT flip (ajuste TASK-604)

- Productos nuevos creados desde Admin UI: `owner_gh_authoritative=true` por default (GH SoT desde nacimiento)
- Productos existentes: se mantiene `false` por default; admin puede toggle a `true` en tab Metadatos
- Actualizar JSDoc de conflict resolution en `sync-hubspot-products.ts` con decision date

### Slice 9 — Runbook + spec arquitectura

- `docs/operations/product-catalog-sync-runbook.md`:
  - Agregar sección "SoT policy por field" copiando tabla de TASK-587
  - Agregar sección "Decisión COGS desbloqueado (TASK-603)"
  - Agregar sección "HubSpot field permissions operativas"
  - Actualizar "Manual sync flow" con UI paths
- `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` (new):
  - Contrato canónico de 16 fields catalog + COGS
  - Multi-currency model
  - Owner bridge semantics
  - Drift detection + classification
  - Link desde `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`

## Out of Scope

- GCS upload workflow para imágenes (input acepta URLs HTTPS; uploader es follow-up)
- Admin UI de tablas ref (categorías, unidades, tax_categories) — operador edita via SQL por ahora
- Tiered pricing / bundles / variants (YAGNI)
- Drop de `default_unit_price`/`default_currency` de `product_catalog` (TASK-549 cleanup)
- Multi-jurisdicción tax categories (MX/CO/PE) — TASK-562

## Detailed Spec

Ver [TASK-587 Slice E](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md) + SoT table completa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Capability `commercial.product_catalog.manage` registrada; gate operativo en `/admin/catalogo/productos/**`
- [ ] List view renderiza los 74 productos con filtros + search funcionales
- [ ] Detail view muestra 5 tabs; cada tab CRUD-funcional
- [ ] Rich editor sanitiza HTML client-side (además del server-side guard)
- [ ] Grid de precios actualiza autoritativos + recalcula derivados en mismo request
- [ ] Manual sync button dispara outbound síncrono y muestra resultado
- [ ] Backfill masivo ejecutado: 74/74 productos con `gh_last_write_at` actualizado y al menos 1 precio autoritativo
- [ ] Verificación HS sandbox: 16 fields catalog + COGS + 5 `gh_*` poblados en productos sample
- [ ] Reconcile weekly scheduler activo; primera corrida 0 errores
- [ ] Alerta Slack dispara cuando count(manual_drift) + count(error) > 5 (test con inyección controlada)
- [ ] HS field permissions configuradas y documentadas
- [ ] Productos creados vía UI nacen con `owner_gh_authoritative=true`
- [ ] Runbook refleja SoT policy, decisión COGS, field permissions, manual sync flow
- [ ] Spec arquitectura `GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` creada + linked desde parent

## Verification

- `pnpm lint` + `npx tsc --noEmit`
- `pnpm test src/views/greenhouse/admin/catalogo/productos/**`
- `pnpm test src/app/api/admin/commercial/products/**`
- `pnpm build` green (nueva surface)
- Staging UI: smoke test end-to-end (crear producto → sync → verificar en HS)
- Staging backfill: dry-run OK, luego real run
- Cloud Run: logs de `ops-worker` muestran primera ejecución del reconcile job sin errores

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md`: admin UI live, backfill done, reconcile scheduled, field permissions applied, owner SoT flip date
- [ ] `changelog.md`: admin surface, backfill, reconcile job, governance
- [ ] Update TASK-587: Fase E completada → umbrella queda `complete`
- [ ] Update TASK-544: programa parent refleja Fase F cerrada
- [ ] Chequeo impacto cruzado: TASK-549 (cleanup), TASK-524 (invoice bridge), TASK-576 (quote publish), TASK-552 (FX coord)
- [ ] Notificar equipo de admin HubSpot que field permissions quedaron activas

## Follow-ups

- Admin UI de tablas ref (categorías/unidades/tax) si emerge necesidad operativa
- GCS image uploader (TASK-###) — reemplaza input URL por drag-drop
- `gh_module_id` custom HS property — link canonical 360
- Tiered pricing support si emerge use case
- Multi-jurisdicción tax categories (coordina con TASK-562)
