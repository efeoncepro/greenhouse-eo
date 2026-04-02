# TASK-181 — Finance Clients: Canonical Source Migration to Organizations

## Delta 2026-04-01

- Auditoría de runtime/schema completada antes de implementar.
- Supuestos corregidos:
  - `Finance Clients` ya es `Postgres-first`; el problema no es un request path `BigQuery-first`, sino que el anchor canónico sigue siendo `greenhouse_core.clients`.
  - `resolveOrganizationForClient()` no vive en `canonical.ts`; vive en `src/lib/account-360/organization-identity.ts` y `canonical.ts` solo lo consume.
  - El blast radius real no se limita a list/detail/sync/drawer; también toca:
    - `src/lib/finance/postgres-store-slice2.ts`
    - consumers de `resolveFinanceClientContext()` como `src/app/api/finance/income/route.ts`
    - readers organization-first que hoy reconcilian `client_economics` por `cp.client_id`
  - `client_profiles.organization_id` ya existe como FK + índice. El gap no es crear el FK sino cortar el runtime y los joins downstream.
  - La arquitectura viva todavía tiene drift documental: `GREENHOUSE_POSTGRES_CANONICAL_360_V1` y `GREENHOUSE_DATA_MODEL_MASTER_V1` siguen describiendo `greenhouse_core.clients` como anchor canónico de client.
- Guardrail nuevo para esta task:
  - no usar un conteo fijo de clientes actuales como acceptance criteria
  - preservar el contrato API visible mientras se redefine internamente el anchor
  - no dejar readers finance/account-360 mezclando `organization_id` en un lado y `client_id` comercial en otro sin bridge explícito

## Delta 2026-04-01 — implementación

- `GET /api/finance/clients` y `GET /api/finance/clients/[id]` quedaron anclados en `greenhouse_core.organizations` con filtro `organization_type IN ('client', 'both')`.
- `POST` / `PUT` de Finance Clients ahora crean o relinkean organización vía `ensureOrganizationForClient(...)` dentro de una transacción compartida con `client_profiles`.
- `resolveFinanceClientContext()` ya resuelve contexto canónico por `organizationId`, `clientId`, `clientProfileId` y `hubspotCompanyId`.
- `syncFinanceClientProfilesFromPostgres()` quedó org-first, preservando `client_id` como bridge operativo.
- `Organization 360` y `client_economics` readers que dependían de `cp.client_id` quedaron reconciliados con bridge explícito `cp.client_id OR cp.organization_id`.
- Los drawers financieros quedaron alineados al nuevo contrato:
  - `CreateIncomeDrawer` acepta clientes sin `clientId` legado y propaga `organizationId`.
  - `CreatePurchaseOrderDrawer` y `CreateHesDrawer` filtran a clientes con `clientId` mientras esos módulos sigan requiriéndolo.
- Se aplicó backfill real para los dos legacy clients huérfanos (`nubox-client-76438378-8`, `nubox-client-91947000-3`) mediante migraciones versionadas y ya materializadas en PostgreSQL.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Implementacion validada` |
| Domain | Finance / Account-360 |
| Sequence | Independiente — prerequisito para consolidacion 360 de entidades B2B |

## Summary

La vista Finance Clients (`/finance/clients`) sigue anclada en `greenhouse_core.clients` (tabla legacy de tenants/Spaces) cuando el maestro canonico B2B del portal ya vive en `greenhouse_core.organizations`. Esta task re-apunta el **source de lectura** de Finance Clients a `greenhouse_core.organizations WHERE organization_type IN ('client', 'both')`, pero sin romper el runtime actual que todavia usa `client_id` como clave operativa en varios consumers financieros y cross-module.

Objetivo operativo de esta lane:
- usar `organizations` como anchor canonico de listado, detalle y create/update de perfiles de cliente
- poblar y mantener `client_profiles.organization_id` como referencia fuerte
- preservar compatibilidad dual-key (`organization_id` + `client_id`) mientras existan consumers que siguen joinando por `client_id`
- mantener el contract visible de `/api/finance/clients`

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
3. **`organization-store.ts`** ya tiene listado/busqueda de organizaciones con filtro por `organization_type`
4. **`client_profiles.organization_id`** ya existe como campo con FK + índice; hoy se usa como bridge parcial
5. **`resolveOrganizationForClient()`** ya resuelve `client_id → organization_id` via spaces, aunque vive en `organization-identity.ts`

## Reality Check — restricciones descubiertas en auditoria

1. El runtime actual de create/sync de client profiles no vive solo en las routes; tambien vive en `src/lib/finance/postgres-store-slice2.ts`.
2. Consumers activos siguen usando `clientId`:
   - drawers `Income`, `Purchase Order`, `HES`
   - stores `purchase-order`, `hes`, `client_economics`
   - summaries financieros de `Organization 360`
3. `greenhouse_core.v_client_active_modules` sigue keyed por `client_id`, no por `organization_id`.
4. La task no puede reinterpretarse como "reemplazar `client_id` por `organization_id` en todo Finance"; eso seria otra lane y rompería consumers existentes.
5. El runtime actual no aplica tenant isolation por `space_id`; la implementacion debe endurecer ese punto de forma compatible con el route group `finance`.

## Blast Radius

### Archivos de alto impacto (requieren rewrite de queries SQL)

| Archivo | Lineas | Cambio |
|---------|--------|--------|
| `src/app/api/finance/clients/route.ts` | 149-216, 359-461 | CTE `base_clients`: anchor `greenhouse_core.clients` → `greenhouse_core.organizations` con filtro `organization_type IN ('client','both')` |
| `src/app/api/finance/clients/[id]/route.ts` | 204-283 | Dual path Postgres + fallback: misma migracion de anchor |
| `src/app/api/finance/clients/sync/route.ts` | 48-85 | MERGE source: `greenhouse.clients` → equivalent org query |
| `src/lib/finance/canonical.ts` | 155-203 | `resolveFinanceClientContext()`: query `greenhouse_core.clients` → `greenhouse_core.organizations` |
| `src/lib/finance/postgres-store-slice2.ts` | 844-1091 | `upsert/sync client_profiles`: dejar de derivar `organization_id` solo via `spaces.client_id` y soportar create/link organization-first |

### Archivos de impacto medio (verificar/adaptar)

| Archivo | Impacto |
|---------|---------|
| `src/views/greenhouse/finance/ClientsListView.tsx` | Navega por `clientProfileId`; el item puede enriquecerse pero no romper el route key |
| `src/views/greenhouse/finance/ClientDetailView.tsx` | Espera `company.clientId` y `financialProfile.clientProfileId`; contract debe mantenerse |
| `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx` | POST body hoy no tiene `organizationId`; create path debe crear/linkear organizacion |
| `src/views/greenhouse/finance/drawers/CreateIncomeDrawer.tsx` | Consume `clientId` y `clientProfileId` desde `/api/finance/clients` |
| `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx` | Consume `clientId` como key operativa |
| `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx` | Consume `clientId` como key operativa |
| `src/lib/finance/postgres-store-slice2.ts` | Client context resolver usa `client_profiles` |
| `src/lib/finance/postgres-store-intelligence.ts` | Metricas financieras enrichment |
| `src/lib/account-360/organization-store.ts` | Org finance summary sigue haciendo join `client_economics -> client_profiles` por `cp.client_id` |
| `src/lib/account-360/organization-economics.ts` | Mismo patrón de join `cp.client_id` para snapshots por organización |
| `src/app/api/finance/income/route.ts` | Consumer directo de `resolveFinanceClientContext()` |
| `src/app/api/finance/income/[id]/route.ts` | Write/update path aprovecha `organizationId` resuelto y depende del resolver canónico |

### Archivos de bajo impacto (indirectos)

| Archivo | Impacto |
|---------|---------|
| `src/lib/account-360/organization-store.ts` | Ya soporta el modelo — sin cambios |
| `src/lib/account-360/organization-identity.ts` | Ya soporta `organization_type` — sin cambios |
| Tests en `read-cutover.test.ts` | Actualizar mock data |
| `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` | Reconciliar anchor canónico de client |
| `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` | Reconciliar anchor/joins del dominio finance |

## Implementation Plan

### Fase 1 — Schema alignment

1. Auditar si `client_profiles.organization_id` esta poblado para todos los perfiles existentes
   - usar `resolveOrganizationForClient()` solo como bridge legacy cuando el perfil venga de `client_id`
   - para perfiles huerfanos o profile-only, crear/linkear una organizacion correspondiente con type `'client'`
2. Introducir un helper reusable `ensureOrganizationForClient(...)` o equivalente
3. Verificar si debe existir constraint/logica de unicidad operativa entre `organization_id` y `client_profile_id`
4. Reconciliar joins downstream que hoy usan `cp.client_id` como clave comercial, no solo el reader principal

### Fase 2 — API queries migration

1. Reescribir CTE `base_clients` en `route.ts` para usar `greenhouse_core.organizations` como anchor
2. Reescribir detail query en `[id]/route.ts`
3. Reescribir `syncFinanceClientProfilesFromPostgres()` y el fallback de `sync/route.ts`
4. Actualizar `resolveFinanceClientContext()` en `canonical.ts`
5. **Preservar API response contract** — campos `legalName`, `taxId`, `paymentTermsDays`, etc. deben seguir en la misma forma
6. **Preservar compatibilidad de identifiers**:
   - `clientProfileId` sigue como key de navegacion
   - `clientId` se conserva mientras haya consumers activos
   - `organizationId` se agrega de forma aditiva como ancla canonica fuerte

### Fase 3 — Create/write path

1. Crear helper reusable `ensureOrganizationForClient(...)` para no duplicar logica entre route y store
2. Actualizar `CreateClientDrawer` para que el POST cree/linkee una organizacion con `organization_type = 'client'`
3. Actualizar `POST /api/finance/clients` para insertar en `organizations` + `client_profiles` dentro de una transacción
4. Verificar que `ensureOrganizationForSupplier()` siga upgradando type a `'both'` cuando corresponda
5. Definir si el `PUT /api/finance/clients/[id]` también puede relinkear organization/client identity sin romper consistencia

### Fase 4 — Validacion

1. Verificar paridad funcional del listado/detalle sin depender de un conteo fijo hardcodeado
2. Verificar que "Sincronizar clientes" funciona con nuevo source
3. Verificar que crear un nuevo perfil de cliente crea la organizacion correctamente
4. Verificar que drawers de Income, PO, HES resuelven clientes correctamente
5. Verificar BigQuery fallback path
6. Verificar readers organization-first (`organization-store`, `organization-economics`) después del cutover
7. Verificar tenant isolation / scope autorizado en el route group `finance`

## Mapping de campos

| Campo actual (clients) | Campo nuevo (organizations) | Notas |
|------------------------|---------------------------|-------|
| `c.client_id` | `o.organization_id` | No reemplazar inline en todos los consumers; exponer ambos durante transicion |
| `c.client_name` | `o.organization_name` | Rename |
| `c.legal_name` | `o.legal_name` | Mismo |
| `c.hubspot_company_id` | `o.hubspot_company_id` | Mismo campo en ambas tablas |
| `c.active` | `o.active` | Mismo |
| `c.tenant_type` | `o.organization_type` | Filtro: `IN ('client','both')` |
| `c.country_code` | `o.country` | Rename |

## Risks

1. **`hubspot_company_id` mapping** — verificar que las orgs tienen este campo poblado (actualmente si, viene del sync)
2. **Service module enrichment** — `v_client_active_modules` esta keyed a `client_id`, no `organization_id`. Necesita bridge explícito o query híbrida.
3. **Backward compatibility** — cambiar `clientId` visible por `organizationId` rompería drawers, stores y consumers cross-module actuales
4. **Proveedores** — la vista de Proveedores (`/finance/suppliers`) ya lee de `greenhouse_core.providers`, deberia tambien migrar a `organizations WHERE organization_type IN ('supplier','both')` en una task separada
5. **Economía por organización** — `client_economics` sigue materializado por `client_id`; si no se define bridge explícito, Organization 360 puede quedar parcialmente inconsistente
6. **Tenant isolation** — la spec original no definia como restringir por `space_id`/scope autorizado; hay que evitar un cutover organization-first que abra visibilidad indevida

## Dependencies & Impact

- **Depende de:** `greenhouse_core.organizations` con `organization_type` poblado (ya existe)
- **Depende de:** `greenhouse_finance.client_profiles.organization_id` efectivamente poblado para los perfiles activos
- **Depende de:** helper nuevo `ensureOrganizationForClient()` o equivalente
- **Depende de:** reconciliación documental de arquitectura canónica (`clients` vs `organizations`)
- **Impacta a:** TASK-174 (data integrity — transacciones en creates de clientes), TASK-179 (reconciliation — client resolution)
- **Archivos owned:**
  - `src/app/api/finance/clients/route.ts`
  - `src/app/api/finance/clients/[id]/route.ts`
  - `src/app/api/finance/clients/sync/route.ts`
  - `src/lib/finance/canonical.ts`
  - `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx`
  - `src/lib/finance/postgres-store-slice2.ts`
