# HubSpot Product Catalog — Field Permissions Manual Ops

> **Tipo de documento:** Procedimiento operativo (TASK-605 Slice 7 / TASK-587 Fase E)
> **Owner:** Admin del portal HubSpot Efeonce
> **Última revisión:** 2026-04-24 — programa TASK-587 cerrado
> **Por qué es manual:** HubSpot **no expone API** para configurar field permissions a nivel de rol. Esta capa solo se administra via la UI web del portal. Es limitación del producto, no nuestra.

## Contexto

Post-TASK-587 (Fase E), Greenhouse es **SoT inviolable** del catálogo sincronizado. El portal HubSpot recibe los 16 fields catalog + COGS + 5 `gh_*` y **no debe permitir** que operadores comerciales los editen — cualquier edit en HS se sobrescribe en el próximo outbound vía contract v2 (TASK-603).

Configurar field permissions read-only en el portal previene confusión operativa: el operador comercial ve los valores correctos pero no puede editarlos engañosamente. La SoT queda formalizada en la UX del CRM.

## Excepciones operativas

- **`hubspot_owner_id` queda EDITABLE** para operadores comerciales (soft-SoT en owner). El bridge inbound (TASK-604) hidrata `commercial_owner_member_id` cuando un operador HS reasigna owner. Hasta que TASK-605 admin UI activate `owner_gh_authoritative=true` por producto, HS gana en owner.
- **`gh_*` (5 custom)** ya están read-only desde TASK-563 — verificar que sigan así (no requiere acción nueva).

## Procedimiento manual

### Paso 1 — Acceder a la configuración de roles

1. Login en HubSpot con cuenta **super-admin** (no operador): https://app.hubspot.com
2. Navegar a **Settings (⚙️)** → **Users & Teams** → **Roles**
3. Para cada rol que represente un operador comercial (NO super-admin), abrir el rol y editar permissions

### Paso 2 — Configurar field permissions por rol

Para los siguientes 21 fields del objeto `products`, configurar como **Read-only** (Greenhouse SoT):

#### Pricing (6 fields)

```
hs_price_clp
hs_price_usd
hs_price_clf
hs_price_cop
hs_price_mxn
hs_price_pen
```

#### Identity + description (4 fields)

```
name
hs_sku
description
hs_rich_text_description
```

#### Classification (4 fields)

```
hs_product_type
hs_product_classification
hs_pricing_model
hs_bundle_type
```

#### Categorización (3 fields)

```
categoria_de_item
unidad
hs_tax_category
```

#### Recurrencia (3 fields)

```
hs_recurring
recurringbillingfrequency
hs_recurring_billing_period
```

#### Status + cost (2 fields)

```
hs_status
hs_cost_of_goods_sold
```

#### Marketing (2 fields)

```
hs_url
hs_images
```

#### Custom GH (5 fields — ya configurados desde TASK-563, validar)

```
gh_product_code
gh_source_kind
gh_last_write_at
gh_archived_by_greenhouse
gh_business_line
```

### Paso 3 — Mantener editable

Solo **uno** de los fields del objeto `products` queda editable para operadores:

```
hubspot_owner_id
```

Razón: soft-SoT en owner. Operador HS puede reasignar; el inbound v2 (TASK-604) lo capta y rehidrata `commercial_owner_member_id` con conflict resolution.

### Paso 4 — Validación post-config

Para verificar que las permisos quedaron aplicadas:

1. Crear (o usar) una cuenta de **rol operador** (NO admin) en el portal
2. Ingresar como ese rol
3. Abrir cualquier producto (ej. https://app.hubspot.com/contacts/48713323/objects/0-7/)
4. Validar:
   - Campo `name` → debe aparecer **no editable** (read-only / lock icon)
   - Campo `hs_price_clp` → debe aparecer **no editable**
   - Campo `hubspot_owner_id` → debe aparecer **editable**
   - Cualquier `gh_*` → debe aparecer **no editable**

### Paso 5 — Documentación

Después de configurar:

1. Tomar screenshot de la pantalla "Edit role permissions" mostrando los fields read-only
2. Adjuntar a este documento o a `docs/operations/screenshots/hubspot-field-permissions-YYYYMMDD.png`
3. Actualizar el Changelog en `docs/operations/product-catalog-sync-runbook.md` con: "Field permissions configuradas para rol X el YYYY-MM-DD"

## Smoke test automatizado (post-config)

Una vez aplicadas las permissions, podemos validar **automáticamente** que el outbound NO recibe rechazos cuando empuja los 16 fields:

```bash
# Disparar manual sync de un producto desde admin UI
# UI → /admin/commercial/product-catalog → Click producto → "Sincronizar a HubSpot"

# Verificar que el outbound no fue bloqueado:
# Cloud Run logs del middleware deben mostrar "200 OK" para /products/{id} PATCH
gcloud run services logs read hubspot-greenhouse-integration \
  --region us-central1 --project efeonce-group --limit 20 | grep "PATCH /products"
```

Si los outbounds vuelven a fallar con permission errors, las field permissions están bloqueando incluso el SA del integration service — no es lo deseado. Verificar que el rol del SA del integration tiene permission de write sobre TODOS los fields (super-admin).

## Cuándo re-validar

- **Después de cualquier cambio** en roles de HubSpot
- **Antes de onboarding** de un nuevo operador comercial
- **Si aparecen drift reports `manual_drift`** persistentes (puede indicar que un operador editó un field que debería ser read-only)
- **Trimestralmente** como hygiene check

## Limitación documentada

HubSpot no provee:

- API para configurar field permissions programáticamente
- Audit trail de qué rol pudo editar qué field y cuándo
- Webhook que notifique cuando un operador intenta editar un field bloqueado

Por estas limitaciones, este procedimiento queda **inevitablemente manual**. Si HubSpot agregara una API en el futuro, esta página se reemplazaría por un script de provisioning.

## Referencias

- [GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md](../architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md) — contrato canónico de los 16 fields
- [product-catalog-sync-runbook.md](product-catalog-sync-runbook.md) — runbook operativo
- [TASK-605](../tasks/complete/TASK-605-product-catalog-admin-ui-backfill-governance.md) — task que documentó este procedimiento
- [TASK-563](../tasks/complete/) — origen de los 5 `gh_*` custom properties
