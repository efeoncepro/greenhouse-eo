> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-24 por Claude (Opus 4.7)
> **Ultima actualizacion:** 2026-04-24 por Claude
> **Documentacion tecnica:** [GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md](../../architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md) + [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md)

# Catalogo de productos — sincronizacion full-fidelity con HubSpot

## Que es

Greenhouse mantiene el catalogo de productos de Efeonce como fuente unica de verdad. HubSpot es un espejo operativo del catalogo para que el equipo comercial pueda ver precios, clasificaciones y owners desde el CRM cuando arma quotes o deals. Antes de 2026-04-24, solo 7 campos del catalogo se sincronizaban a HubSpot; el resto quedaba vacio en el CRM. Despues del programa TASK-587, **16 campos + COGS + 5 marcadores custom** fluyen automaticamente y en tiempo real desde Greenhouse hacia HubSpot.

## Por que existe

- **Dealmakers**: cuando arman una quote o ven un deal en HubSpot, necesitan el precio correcto en la moneda del cliente, el owner comercial, la categoria del servicio y la clasificacion tributaria. Antes tenian que abrir Greenhouse en otra pestana para completar la informacion.
- **Reporting ejecutivo**: HubSpot tiene filtros nativos por `hs_product_type` (service/inventory/non_inventory) y por `categoria_de_item`. Sin valores poblados, esos filtros no servian.
- **Quote publishing**: las quotes de HubSpot solo pueden emitirse cuando sus line items tienen precios por moneda poblados. Antes no habia.
- **Governance operativo**: si un operador HubSpot edita un precio por error en el CRM, Greenhouse debe detectarlo, marcar el drift, y sobrescribir en el proximo sync. Antes no habia deteccion.

## Como funciona

### Las dos direcciones del sync

```
                       outbound (GH → HS)
                  ╔═══════════════════════════╗
  Greenhouse      ║                           ║      HubSpot
  (SoT)           ╚═══════════════════════════╝      (espejo)
     ▲                                                   │
     │           inbound (HS → GH, limitado)             │
     ╚═══════════════════════════════════════════════════╝
```

**Outbound (GH es quien escribe)**: cada vez que un operador edita un producto en Greenhouse (via admin UI o script), el portal construye un payload con los 16 campos + COGS + 5 markers `gh_*` y lo envia al middleware Cloud Run. El middleware traduce a las propiedades de HubSpot y hace el PATCH contra la API. HubSpot recibe todo y actualiza el producto.

**Inbound (HS solo escribe limitado)**: el sync diario + el reconcile semanal leen el catalogo completo de HubSpot. La inmensa mayoria de los campos se comparan solo para generar un reporte de drift (no se sobrescriben). Las excepciones son: owner (soft-SoT hasta activar el toggle GH-autoritativo) + imagenes + URL de marketing + descripcion rica (solo si Greenhouse tiene el campo vacio).

### Los 16 campos sincronizados

| Campo | Que es | Quien decide |
|---|---|---|
| Nombre | Titulo del producto | Greenhouse |
| SKU | Codigo unico | Greenhouse, se fija al crear, no cambia |
| Descripcion simple | Texto plano para snippets | Greenhouse |
| Descripcion rica | HTML con formato (bold, listas, links) | Greenhouse |
| 6 precios por moneda | CLP, USD, CLF, COP, MXN, PEN | Greenhouse |
| Tipo de producto | Service, Inventory o Non-Inventory | Greenhouse |
| Categoria | Vocabulario controlado (staff aug, consultoria, etc.) | Greenhouse |
| Unidad | Hora, proyecto, mes, etc. | Greenhouse |
| Categoria tributaria | IVA 19% Chile, etc. | Greenhouse |
| Recurrencia | Si/No + frecuencia + periodo | Greenhouse |
| URL marketing | Link publico al producto | Greenhouse |
| Imagenes | Array de URLs HTTPS | Greenhouse |
| Owner comercial | Quien es dueno del producto | Mixto (HS puede mover el owner y GH lo capta; cuando operador activa toggle en admin UI, GH gana) |
| COGS | Costo de venta (habilitado por decision explicita en TASK-603) | Greenhouse |
| 5 marcadores gh_* | Rastreo interno (SKU, source, timestamp, archived, business line) | Greenhouse (read-only en HS desde TASK-563) |

### Que NO se sincroniza

- **Margen porcentual** y **cost breakdown**: permanentemente bloqueados outbound. Greenhouse no filtra a HubSpot estructura de costos laboral (decision de gobierno heredada de TASK-347).
- **Propiedades que HubSpot considera read-only por diseno**: `hs_product_classification` (Standalone/Variant/Bundle) y `hs_bundle_type` — HubSpot las gestiona internamente, ningun scope las desbloquea. Greenhouse retiene los valores en su DB pero no los empuja.

## Como se usa — Admin UI

### Acceso

Ruta: `/admin/commercial/product-catalog`

Capability requerida: `administracion.product_catalog`. Tambien accede cualquier rol con `routeGroups: admin` (efeonce_admin).

### Vista lista

- Tabla con los 77 productos del portal
- Buscador global por SKU o nombre
- Filtros: tipo de fuente (sellable_role, tool, overhead_addon, service, manual, hubspot_imported), estado (activo/archivado), drift (con drift / sin drift)
- Cada fila muestra precio default, estado de sync, cantidad de campos con drift detectado en el ultimo scan, fecha del ultimo outbound

### Vista detalle

Click en una fila → `/admin/commercial/product-catalog/[productId]` con 5 secciones editables:

- **Identidad**: nombre, descripcion simple, descripcion HTML rica (con whitelist server-side), URL marketing, lista de URLs de imagenes (una por linea)
- **Clasificacion**: tipo de producto, categoria, unidad, categoria tributaria — todos dropdowns poblados desde las ref tables
- **Precios**: grid con las 6 monedas. Escribir un precio en una moneda lo marca como autoritativo (`source=gh_admin`) y automaticamente recalcula las 5 derivadas via FX platform. Si no hay rate disponible para alguna moneda, esa derivada queda null y se reporta en la respuesta.
- **Recurrencia**: toggle activar/desactivar, frecuencia (monthly, yearly, etc.) y periodo ISO 8601 (P1M, P1Y)
- **Metadatos**: owner por member_id, toggle `owner_gh_authoritative` (cuando esta en ON, edits en HubSpot no afectan el owner de Greenhouse), flag archivado, timestamps read-only (last outbound sync, last drift scan, HS audit owner assigned at)

Boton "Sincronizar a HubSpot" arriba a la derecha: dispara outbound manual sincronico, muestra resultado inline (success/failed con razon detallada).

### Drift reportado inline

Si en el ultimo reconcile se detecto drift en este producto, arriba del form aparece un alert amarillo con los campos drifted + clasificacion (pending_overwrite / manual_drift / error). El operador puede ignorarlo (el proximo outbound resolvera los `pending_overwrite`) o tomar accion manual (para `manual_drift` y `error`).

## Los 3 niveles de drift

Si el ultimo scan encontro diferencias entre Greenhouse y HubSpot, los campos en conflicto se clasifican:

- **`pending_overwrite`** (informacional): HubSpot tiene un valor distinto al de Greenhouse. El proximo outbound lo corrige automaticamente. No requiere accion humana, es parte del flujo normal cuando un operador HubSpot edita un campo que Greenhouse posee.
- **`manual_drift`** (revisar): HubSpot tiene un valor en categoria/unidad/tax_category que no existe en las ref tables de Greenhouse. Ejemplo: un operador HubSpot escribio "Retainer" como categoria y esa opcion no esta registrada en Greenhouse. El admin decide: agregarla al ref table o sobrescribir HubSpot con el valor canonico.
- **`error`** (alerta): drift estructuralmente invalido. Ejemplo: owner de HubSpot no tiene binding en `greenhouse_core.members`. Requiere crear el binding manualmente antes de que el sync pueda convergir.

Los reportes de drift se persisten en `greenhouse_sync.source_sync_runs` con `source_system='product_drift_v2'`. Cada fila del admin UI los consume del ultimo reporte por producto.

## Backfill masivo

Cuando se quiere sincronizar los 77 productos de una sola vez (por ejemplo despues de una migracion, cambio de contrato, o primer release de un campo nuevo), se usa el script:

```bash
# Dry-run: muestra que productos se sincronizarian sin tocar HubSpot
pnpm tsx scripts/backfill/product-catalog-hs-v2.ts

# Apply real: escribe a HubSpot
pnpm tsx scripts/backfill/product-catalog-hs-v2.ts --apply
```

El script genera un reporte markdown en `docs/operations/backfill-product-catalog-hs-v2-YYYYMMDD.md` con outcome por producto.

Idempotente: re-correrlo produce el mismo estado (anti-ping-pong de 60 segundos + PATCH idempotente de HubSpot).

## Reconcile semanal automatico

Todos los lunes a las 06:00 America/Santiago, Cloud Scheduler invoca el endpoint `/product-catalog/reconcile-v2` del ops-worker. El job:

1. Lee el catalogo completo de HubSpot via middleware
2. Compara campo por campo contra `product_catalog` de Greenhouse
3. Persiste un drift report por producto
4. Si el total de `manual_drift + error` supera 5 productos, dispara una alerta a Slack (`PRODUCT_CATALOG_RECONCILE_SLACK_WEBHOOK_URL` configurado)

La alerta enlaza directo al admin UI para que operador pueda revisar los drifts.

## Governance

### COGS desbloqueado (TASK-603)

HubSpot ahora recibe `hs_cost_of_goods_sold`. Decision explicita de gobierno para habilitar reporting de margen por producto en HubSpot. Se acoto TASK-347 (que originalmente bloqueaba todo cost/margin outbound): solo COGS se habilita; margin y cost_breakdown siguen permanentemente bloqueados.

### HubSpot field permissions

HubSpot no expone API para configurar field permissions por rol — esto queda como **procedimiento manual** del admin del portal. El runbook [hubspot-product-catalog-field-permissions.md](../../operations/hubspot-product-catalog-field-permissions.md) documenta paso-a-paso:

- Para roles operadores (NO super-admin): los 21 campos catalog quedan read-only en la UI de HubSpot. Un operador ve los valores pero no puede editarlos para evitar confusion (ya que cualquier edit se sobrescribe en el proximo sync).
- Solo `hubspot_owner_id` queda editable (soft-SoT hasta que Greenhouse active el toggle GH-autoritativo).

### Rotacion de tokens

Tres Private Apps activas en el portal 48713323, cada una con su token independiente. El token del app que alimenta la integracion full-fidelity vive en Secret Manager como `hubspot-access-token`. Rotarlo:

1. Rotar en HubSpot UI (Settings → Private Apps → Auth → Rotate token)
2. Agregar version nueva al secret: `printf '%s' "<token>" | gcloud secrets versions add hubspot-access-token --data-file=-`
3. Forzar nueva revision Cloud Run: `gcloud run services update hubspot-greenhouse-integration --region=us-central1 --update-labels=hs-token-rotated=YYYYMMDD`

Detalle completo de todas las apps + procedimiento en [hubspot-apps-inventory.md](../../operations/hubspot-apps-inventory.md).

## Que viene despues

- TipTap rich editor para la descripcion HTML (hoy textarea con sanitizer server-side)
- Autocomplete de members para el owner (hoy input de member_id directo)
- Uploader GCS para imagenes (hoy URLs HTTPS absolutas)
- Flip automatico de `owner_gh_authoritative=true` para productos nuevos creados desde el admin UI

Todos quedan como follow-ups opcionales; el ciclo full-fidelity esta operativo sin ellos.

> **Detalle tecnico:** contrato canonico de 16 campos + SoT direction table + multi-currency model + drift classification en [GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md](../../architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md). Runbook operativo en [product-catalog-sync-runbook.md](../../operations/product-catalog-sync-runbook.md).
