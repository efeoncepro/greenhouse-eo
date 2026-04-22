# Product Sync Conflicts

Surface administrativa para vigilar y resolver drift entre el catálogo comercial de Greenhouse y HubSpot Products.

- Ruta principal: `/admin/commercial/product-sync-conflicts`
- Detalle: `/admin/commercial/product-sync-conflicts/[conflictId]`
- Fuente técnica: `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`

## Qué muestra

- lista filtrable de conflictos detectados por el reconciler nocturno
- resumen operativo por tipo de conflicto
- detalle con diff Greenhouse vs HubSpot
- acciones permitidas según el tipo de conflicto y el `source_kind`

## Tipos de conflicto

- `Orphan en HubSpot`: existe un producto remoto que Greenhouse no puede anclar localmente.
- `Orphan en Greenhouse`: existe un producto local activo sin ancla remota válida.
- `Drift de campos`: Greenhouse y HubSpot difieren en campos Greenhouse-owned.
- `Colisión de SKU`: dos productos locales comparten el mismo `product_code`.
- `Archive mismatch`: el estado archivado no coincide entre ambos lados.

## Qué puede hacer un admin

- `Adoptar producto HubSpot`
  Usa el snapshot remoto para crear una fila local nueva con `source_kind='hubspot_imported'`.
- `Archivar en HubSpot`
  Marca el producto remoto como archivado y conserva la decisión Greenhouse.
- `Reenviar estado Greenhouse`
  Reaplica el estado local hacia HubSpot cuando Greenhouse es la fuente autoritativa.
- `Aceptar valor de HubSpot`
  Solo disponible para productos `manual` o `hubspot_imported`; trae a Greenhouse el valor remoto de los campos soportados.
- `Ignorar conflicto`
  Cierra el caso sin mutar ninguno de los dos lados.

## Reglas operativas

- toda resolución exige motivo operativo
- cada resolución deja audit trail en `pricing_catalog_audit_log`
- los conflictos ya resueltos no admiten nuevas acciones desde esta surface
- si el reconciler externo todavía no expone `/products/reconcile`, no se crean conflictos falsos; el corte queda degradado y se actualiza el `last_drift_check_at`

## Qué NO hace esta surface

- no recalcula métricas inline
- no cambia ownership de campos fuera de las acciones soportadas
- no resuelve automáticamente colisiones de SKU
- no introduce tenant scoping nuevo en tablas globales del catálogo; el acceso se controla por surface admin + capability
