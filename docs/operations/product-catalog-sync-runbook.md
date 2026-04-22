# Product Catalog Sync Runbook

Runbook operativo del loop Greenhouse ↔ HubSpot Products.

Fuente técnica: `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`

## Componentes

- materializer local: `source-to-product-catalog`
- outbound HubSpot: `productHubSpotOutbound`
- drift detector: `POST /product-catalog/drift-detect` en `ops-worker`
- surface admin: `/admin/commercial/product-sync-conflicts`

## Scheduler canónico

- job: `ops-product-catalog-drift-detect`
- schedule: `0 3 * * *`
- timezone: `America/Santiago`

## Señales normales

- `source_sync_runs.source_system = 'product_catalog_drift_detect'`
- rows `pending` o `resolved_*` en `greenhouse_commercial.product_sync_conflicts`
- eventos `commercial.product_sync_conflict.detected` y `.resolved`

## Diagnóstico rápido

1. Verificar si hubo corrida:
   - revisar `source_sync_runs` por `source_system='product_catalog_drift_detect'`
2. Si el run quedó `cancelled`:
   - validar si `GET /products/reconcile` sigue `endpoint_not_deployed`
3. Si hay conflictos nuevos:
   - abrir `/admin/commercial/product-sync-conflicts`
   - priorizar `sku_collision` y `orphan_in_hubspot`
4. Si el outbound no converge:
   - revisar `hubspot_sync_status`, `hubspot_sync_error`, `hubspot_sync_attempt_count`

## Respuesta recomendada por conflicto

- `orphan_in_hubspot`
  Decidir entre adopción manual o archivado remoto.
- `orphan_in_greenhouse`
  Reintentar `Reenviar estado Greenhouse`.
- `field_drift`
  Mantener Greenhouse si el catálogo local es autoritativo; aceptar HubSpot solo para `manual` o `hubspot_imported`.
- `sku_collision`
  Tratar como bug estructural; limpiar catálogo antes de reactivar pushes.
- `archive_mismatch`
  Confirmar el estado correcto y reaplicar desde la superficie admin.

## Alertas

- Slack si se detectan más de `10` conflictos en 24h
- Slack si hay más de `3` `sku_collision` sin resolver

## Comandos útiles

```bash
# TypeScript
pnpm exec tsc --noEmit --pretty false

# Tests focales del detector/admin
pnpm exec vitest run \
  src/lib/commercial/product-catalog/drift-reconciler.test.ts \
  src/app/api/admin/commercial/product-sync-conflicts/route.test.ts \
  'src/app/api/admin/commercial/product-sync-conflicts/[conflictId]/resolve/route.test.ts'

# Smoke E2E inicial outbound (TASK-563)
pnpm tsx scripts/e2e-product-hubspot-outbound.ts
```

## Smoke staging

- Reporte operativo: `docs/operations/product-hubspot-outbound-e2e-report.md`
- El smoke actual cubre `create -> update -> archive` vía staging + sandbox.
- Batch multi-product sigue deferido hasta que el worker reactive soporte algo más que coalescing por scope.

## Escalación

- si el servicio externo no expone `/products/reconcile`, escalar al repo `hubspot-greenhouse-integration`
- si aparecen colisiones de SKU repetidas, abrir issue de higiene del catálogo comercial
- si una resolución admin no deja audit trail, tratarlo como incidente del lane de governance
