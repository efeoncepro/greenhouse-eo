# HubSpot Custom Properties — Product Catalog Sync (TASK-547)

> Runbook operativo para crear y validar las 5 custom properties que Greenhouse necesita en HubSpot para soportar el bridge outbound `product_catalog → HubSpot Products`.
>
> **Audience:** admin de HubSpot / operador de CRM con acceso a la skill `hubspot-ops`.
>
> **Objeto:** HubSpot `product`.
>
> **Group name:** `greenhouse_sync` (compartido con otras properties `gh_*` de TASK-524/539).

## Por qué necesitamos estas properties

Greenhouse es la fuente de verdad del catálogo; HubSpot distribuye como line items en deals. Para cerrar el loop bidireccional sin drift necesitamos 5 señales persistidas en HubSpot:

| Propiedad | Propósito |
|---|---|
| `gh_product_code` | SKU canónico (ECG/ETG/EFO/EFG/PRD) para joinear con `greenhouse_commercial.product_catalog`. |
| `gh_source_kind` | Catálogo fuente en Greenhouse (sellable_role, tool, overhead_addon, service, manual, hubspot_imported). |
| `gh_last_write_at` | Timestamp del último push outbound. **Load-bearing** para anti-ping-pong: el sync inbound skippea cambios recibidos dentro de 60s de este valor. |
| `gh_archived_by_greenhouse` | Distingue archival operativo desde Greenhouse (role desactivado, addon oculto, etc) vs archival manual en HubSpot. |
| `gh_business_line` | BU owner del producto (globe, efeonce_digital, reach, wave, crm_solutions). Segmentación CRM. |

Todas (excepto `gh_business_line`) son **read-only** desde la UI de HubSpot — operadores HubSpot no las deben tocar; Greenhouse las gestiona.

## Cuándo correr

- **Antes de habilitar el feature flag `GREENHOUSE_PRODUCT_SYNC_*` en staging.**
- Una vez por portal (sandbox → production), en orden.
- Idempotente: correr dos veces no crea duplicados, solo salta las que ya existan.

## Prerequisitos

- Credenciales admin del portal HubSpot correspondiente.
- Skill `hubspot-ops` habilitada en la shell del operador.
- Acceso al repo Greenhouse EO (para leer `scripts/create-hubspot-product-custom-properties.ts`).

## Proceso

### 1. Revisar las definiciones

```bash
pnpm tsx scripts/create-hubspot-product-custom-properties.ts
```

Imprime el JSON de las 5 propiedades. Cada entry incluye `name`, `label`, `description`, `type`, `fieldType`, `groupName`, `formField`, `displayOrder`, y `readOnlyValue`.

### 2. Aplicar en sandbox

Usar la skill `hubspot-ops` para crear cada property. La skill:
- Lista las properties existentes en el portal destino
- Compara contra las 5 de `PRODUCT_HUBSPOT_CUSTOM_PROPERTIES`
- Crea solo las que falten (idempotencia garantizada por el helper `planCustomPropertyCreation`)

Comando de referencia (ajustar al signature exacto de `hubspot-ops`):
```bash
hubspot-ops create-property --portal sandbox --object-type product --spec-file scripts/create-hubspot-product-custom-properties.ts
```

### 3. Validar en sandbox

1. En HubSpot UI, navegar a **Settings → Objects → Products → Manage properties**.
2. Filtrar por group `Greenhouse Sync`.
3. Confirmar que las 5 propiedades aparecen con los labels correctos.
4. Verificar que `gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse` tienen el flag "read-only" activo.

### 4. Smoke test del bridge

Con las properties creadas, activar el feature flag y verificar que:
- Un create de `sellable_role` en Greenhouse → ≤2 min después, un product nuevo en HubSpot con `gh_product_code` = el SKU correspondiente.
- El `gh_last_write_at` del product refleja la hora del push.

Si el smoke test falla, consultar los logs del `ops-worker` Cloud Run (proyección `product_hubspot_outbound`) y la tabla `greenhouse_commercial.product_catalog.hubspot_sync_error` para el detalle.

### 5. Aplicar en production

Repetir pasos 2-4 contra el portal productivo. Idealmente detrás de:
- Al menos 48h de validación en sandbox sin errores.
- Ventana de mantenimiento coordinada con el equipo operativo (por si algo drifta).

## Rollback

Las properties no se pueden "borrar" limpio desde HubSpot una vez que hay valores persistidos. Si hay que detener el bridge:

1. Desactivar el feature flag (`GREENHOUSE_PRODUCT_SYNC_*` = `false` en Vercel/ops-worker).
2. Las properties quedan en HubSpot pero no se actualizan.
3. Si se requiere "limpieza" real, archivar las properties desde HubSpot UI — esto las oculta pero preserva los valores históricos.

## Relación con TASK-548 (Drift Detection)

El drift cron de TASK-548 consumirá `GET /products/reconcile` para comparar:
- `gh_owned_fields_checksum` (Greenhouse-local) contra los valores HubSpot.
- `gh_last_write_at` para decidir si el drift es "stale" o reciente.

Sin estas properties, TASK-548 no puede operar. Por eso este runbook es prerequisito.

## Troubleshooting

**"Property creation failed: already exists"** → la skill debería haberlo filtrado vía `planCustomPropertyCreation`. Si ocurre, correr el plan en dry-run para confirmar qué hay en HubSpot antes del apply.

**Smoke test: products aparecen sin `gh_product_code`** → verificar que la Cloud Run `hubspot-greenhouse-integration` forward las `customProperties` del payload. El cliente envía `customProperties: { gh_product_code, ... }`; el servicio debe traducirlo a HubSpot "properties" API.

**`gh_last_write_at` quedó como texto, no datetime** → verificar que el `type: 'datetime'` + `fieldType: 'date'` se aplicaron. HubSpot parsea ISO 8601 en la property si el tipo está bien configurado.

**El sync inbound re-envía pushes que Greenhouse acaba de hacer** → el guard anti-ping-pong (TASK-548 lo consume) necesita leer `gh_last_write_at`. Confirmar que:
1. La property existe y es `datetime`.
2. El Cloud Run setea el valor al persistir (no solo leer).
3. El inbound respeta la ventana de 60s.

## Follow-ups (post TASK-547)

- Agregar property `gh_checksum` que persista el `gh_owned_fields_checksum` en HubSpot — habilitaría a TASK-548 detectar drift sin necesidad del endpoint `/products/reconcile`.
- Documentar el archival lifecycle cuando un product queda huérfano por cambios de source (ej. role deleted).
- Automatizar este runbook en el Admin Center para operadores sin skill CLI.
