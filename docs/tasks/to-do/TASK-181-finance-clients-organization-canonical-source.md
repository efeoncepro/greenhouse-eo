# TASK-181 — Finance Clients: Canonical Source Migration to Organizations

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseno` |
| Domain | Finance / Account-360 |
| Sequence | Independiente — prerequisito para consolidacion 360 de entidades B2B |

## Summary

La vista Finance Clients (`/finance/clients`) lee de `greenhouse_core.clients` (la tabla de tenants/Spaces del portal) en lugar de leer de `greenhouse_core.organizations` (el maestro canonico de entidades B2B). La tabla `organizations` ya tiene el campo `organization_type` con valores `'client'` | `'supplier'` | `'both'` | `'other'`, y la infraestructura de Account-360 ya soporta este modelo. Esta task re-apunta el pipeline completo de Finance Clients para que su fuente canonica sea `greenhouse_core.organizations WHERE organization_type IN ('client', 'both')`.

## Why This Task Exists

### Problema — Fuente de datos incorrecta

```
Estado actual:
  /finance/clients
    → GET /api/finance/clients
      → FROM greenhouse_core.clients c         ← tabla de TENANTS del portal
        LEFT JOIN greenhouse_finance.client_profiles cp ON cp.client_id = c.client_id

Estado correcto:
  /finance/clients
    → GET /api/finance/clients
      → FROM greenhouse_core.organizations o   ← maestro canonico B2B
        WHERE o.organization_type IN ('client', 'both')
        LEFT JOIN greenhouse_finance.client_profiles cp ON cp.organization_id = o.organization_id
```

**Consecuencias del estado actual:**
- Finance muestra "clientes" que son en realidad tenants del portal (Spaces), no entidades B2B
- No aprovecha el campo `organization_type` que ya discrimina client/supplier/both
- Organizaciones de tipo 'client' que no son Spaces del portal no aparecen en Finance
- Organizaciones que son simultaneamente cliente y proveedor (`'both'`) no se ven en la vista de clientes
- El modelo 360 queda roto: `Organization` es la entidad B2B canonica pero Finance la ignora

### Infraestructura existente que lo soporta

1. **`organization_type` ya existe** en `greenhouse_core.organizations` — valores: `'client'`, `'supplier'`, `'both'`, `'other'`
2. **`organization-identity.ts`** ya tiene logica de type upgrade (`client` → `both` cuando una org es cliente y proveedor)
3. **`organization-store.ts`** tiene `listOrganizations()` con filtro por `organization_type`
4. **`client_profiles.organization_id`** ya existe como campo (nullable) — solo falta hacerlo el FK primario
5. **`resolveOrganizationForClient()`** en `canonical.ts` ya resuelve `client_id → organization_id` via spaces

## Blast Radius

### Archivos de alto impacto (requieren rewrite de queries SQL)

| Archivo | Lineas | Cambio |
|---------|--------|--------|
| `src/app/api/finance/clients/route.ts` | 149-216, 359-461 | CTE `base_clients`: anchor `greenhouse_core.clients` → `greenhouse_core.organizations` con filtro `organization_type IN ('client','both')` |
| `src/app/api/finance/clients/[id]/route.ts` | 204-283 | Dual path Postgres + fallback: misma migracion de anchor |
| `src/app/api/finance/clients/sync/route.ts` | 48-85 | MERGE source: `greenhouse.clients` → equivalent org query |
| `src/lib/finance/canonical.ts` | 155-203 | `resolveFinanceClientContext()`: query `greenhouse_core.clients` → `greenhouse_core.organizations` |

### Archivos de impacto medio (verificar/adaptar)

| Archivo | Impacto |
|---------|---------|
| `src/views/greenhouse/finance/ClientsListView.tsx` | Sin cambio si API contract se preserva |
| `src/views/greenhouse/finance/ClientDetailView.tsx` | Sin cambio si API contract se preserva |
| `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx` | POST body debe crear/linkear org en vez de client |
| `src/views/greenhouse/finance/drawers/CreateIncomeDrawer.tsx` | Consume lista de clientes — verificar |
| `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx` | Consume lista de clientes — verificar |
| `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx` | Consume lista de clientes — verificar |
| `src/lib/finance/postgres-store-slice2.ts` | Client context resolver usa `client_profiles` |
| `src/lib/finance/postgres-store-intelligence.ts` | Metricas financieras enrichment |

### Archivos de bajo impacto (indirectos)

| Archivo | Impacto |
|---------|---------|
| `src/lib/account-360/organization-store.ts` | Ya soporta el modelo — sin cambios |
| `src/lib/account-360/organization-identity.ts` | Ya soporta `organization_type` — sin cambios |
| Tests en `read-cutover.test.ts` | Actualizar mock data |

## Implementation Plan

### Fase 1 — Schema alignment

1. Asegurar que `client_profiles.organization_id` este poblado para todos los perfiles existentes
   - Usar `resolveOrganizationForClient()` para backfill via spaces bridge
   - Para perfiles huerfanos (sin client_id en spaces), crear la organizacion correspondiente con type `'client'`
2. Verificar que todas las organizaciones con `organization_type = 'client'` o `'both'` tengan `client_profile` asociado
3. Crear indice si no existe: `CREATE INDEX ON greenhouse_finance.client_profiles (organization_id)`

### Fase 2 — API queries migration

1. Reescribir CTE `base_clients` en `route.ts` para usar `greenhouse_core.organizations` como anchor
2. Reescribir detail query en `[id]/route.ts`
3. Reescribir MERGE source en `sync/route.ts`
4. Actualizar `resolveFinanceClientContext()` en `canonical.ts`
5. **Preservar API response contract** — campos `legalName`, `taxId`, `paymentTermsDays`, etc. deben seguir en la misma forma

### Fase 3 — Create/write path

1. Actualizar `CreateClientDrawer` para que el POST cree/linkee una organizacion con `organization_type = 'client'`
2. Actualizar `POST /api/finance/clients` para insertar en `organizations` + `client_profiles`
3. Verificar que `ensureOrganizationForSupplier()` siga upgradando type a `'both'` cuando corresponda

### Fase 4 — Validacion

1. Verificar que la vista muestra los mismos 13 clientes actuales
2. Verificar que "Sincronizar clientes" funciona con nuevo source
3. Verificar que crear un nuevo perfil de cliente crea la organizacion correctamente
4. Verificar que drawers de Income, PO, HES resuelven clientes correctamente
5. Verificar BigQuery fallback path

## Mapping de campos

| Campo actual (clients) | Campo nuevo (organizations) | Notas |
|------------------------|---------------------------|-------|
| `c.client_id` | `o.organization_id` | PK cambia |
| `c.client_name` | `o.organization_name` | Rename |
| `c.legal_name` | `o.legal_name` | Mismo |
| `c.hubspot_company_id` | `o.hubspot_company_id` | Mismo campo en ambas tablas |
| `c.active` | `o.active` | Mismo |
| `c.tenant_type` | `o.organization_type` | Filtro: `IN ('client','both')` |
| `c.country_code` | `o.country` | Rename |

## Risks

1. **`hubspot_company_id` mapping** — verificar que las orgs tienen este campo poblado (actualmente si, viene del sync)
2. **Service module enrichment** — `v_client_active_modules` esta keyed a `client_id`, no `organization_id`. Necesita view alternativa o JOIN via spaces
3. **Backward compatibility** — si hay consumers externos del API response, el cambio de `clientId` a `organizationId` en el response seria breaking
4. **Proveedores** — la vista de Proveedores (`/finance/suppliers`) ya lee de `greenhouse_core.providers`, deberia tambien migrar a `organizations WHERE organization_type IN ('supplier','both')` en una task separada

## Dependencies & Impact

- **Depende de:** `greenhouse_core.organizations` con `organization_type` poblado (ya existe)
- **Depende de:** `greenhouse_finance.client_profiles.organization_id` backfilled (Fase 1)
- **Impacta a:** TASK-174 (data integrity — transacciones en creates de clientes), TASK-179 (reconciliation — client resolution)
- **Archivos owned:**
  - `src/app/api/finance/clients/route.ts`
  - `src/app/api/finance/clients/[id]/route.ts`
  - `src/app/api/finance/clients/sync/route.ts`
  - `src/lib/finance/canonical.ts`
  - `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx`
