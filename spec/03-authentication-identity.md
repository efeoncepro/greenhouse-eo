# Greenhouse Portal — Autenticación e Identidad

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: SCIM 2.0 provisioning, Identity Reconciliation Engine (50+ tipos agregados), canonical person states, Google Secret Manager, Vercel OIDC, JWT minting local, View Access governance, Integration auth, Cron auth

---

## Visión general

Greenhouse usa **NextAuth.js 4.24** con estrategia **JWT** para autenticación. Soporta tres proveedores de login que convergen en un mismo modelo de identidad canónica:

1. **Credentials** — Email + contraseña (bcrypt). Modo legacy para usuarios sin SSO.
2. **Microsoft Entra ID (Azure AD)** — OAuth 2.0 para usuarios internos Efeonce y clientes con cuentas Microsoft.
3. **Google OAuth** — OAuth 2.0 para usuarios con cuentas Google.

## Proveedores de autenticación

### Credentials

- Lookup por email en `client_users` (case-insensitive)
- Verificación con `bcryptjs`
- El usuario debe tener `active=true` AND `status='active'`
- Actualiza `lastLoginAt` y `lastLoginProvider='credentials'`

### Microsoft Entra ID

- Client ID y Secret vía variables de entorno
- Tenant: `common` (multi-tenant Azure AD)
- Scopes: `openid profile email`
- Flujo de resolución:
  1. Extraer OID, email, tenant ID, display name del token Microsoft
  2. Lookup por Microsoft OID → `getTenantAccessRecordByMicrosoftOid()`
  3. Fallback a email → `getTenantAccessRecordByEmail()`
  4. Fallback a alias interno → `getTenantAccessRecordByInternalMicrosoftAlias()`
  5. Fallback a dominio permitido → `getTenantAccessRecordByAllowedEmailDomain()`
  6. Verificar elegibilidad → `isEligibleForExternalSSOSignIn()`
  7. Linkear identidad si es necesario → `linkMicrosoftIdentity()`
  8. Actualizar last login → `updateTenantLastLogin()`

### Google OAuth

- Mismo patrón que Microsoft pero con `googleSub` como identificador
- Scopes: `openid email`
- Linkeo vía `linkGoogleIdentity()`

## Identity linking

Cuando un usuario hace login por SSO por primera vez, Greenhouse vincula la identidad SSO al registro `client_users` existente:

- **Microsoft**: Guarda `microsoftOid`, `microsoftEmail`, `microsoftTenantId`
- **Google**: Guarda `googleSub`, `googleEmail`
- **Transición de authMode**: Si el usuario tenía `credentials`, pasa a `both`
- **Transición de status**: Si era `invited`, pasa a `active`
- **Persistencia**: Postgres-first con fallback a BigQuery

## Estructura del token JWT

El token contiene todo el contexto de autorización necesario para evitar round-trips:

```typescript
{
  sub: string             // User ID
  userId: string          // User ID (duplicado por compatibilidad)
  email: string           // Email principal
  name: string            // Nombre completo
  avatarUrl: string | null
  clientId: string        // Tenant ID
  clientName: string      // Nombre del tenant
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]     // Roles asignados
  primaryRoleCode: string // Rol principal (mayor prioridad)
  routeGroups: string[]   // Grupos de rutas autorizados
  projectScopes: string[] // Proyectos accesibles
  campaignScopes: string[]// Campañas accesibles
  businessLines: string[] // Líneas de negocio del tenant
  serviceModules: string[]// Módulos de servicio del tenant
  projectIds: string[]    // Alias de projectScopes
  featureFlags: string[]  // Feature flags habilitados
  timezone: string        // Zona horaria (default: 'UTC')
  portalHomePath: string  // Ruta home del tenant
  authMode: string        // 'credentials' | 'sso' | 'both'
  provider: string        // 'credentials' | 'microsoft_sso' | 'google_sso'
  microsoftEmail: string | null
  googleEmail: string | null
}
```

## Sesión (Session)

El objeto `session.user` mapea todos los campos del token JWT. La sesión se reconstruye desde la base de datos en cada refresh de token para asegurar permisos actualizados.

## Sistema de roles

### Prioridad de roles

Los roles se evalúan por prioridad (de mayor a menor):

1. `efeonce_admin`
2. `employee`
3. `finance_manager`
4. `finance_admin`
5. `finance_analyst`
6. `hr_payroll`
7. `hr_manager`
8. `efeonce_operations`
9. `efeonce_account`
10. `people_viewer`
11. `ai_tooling_admin`
12. `collaborator`
13. `client_executive`
14. `client_manager`
15. `client_specialist`

El `primaryRoleCode` es el rol de mayor prioridad que el usuario tiene asignado.

### Familias de roles

| Familia | Roles | Audiencia |
|---------|-------|-----------|
| **admin** | efeonce_admin | Administradores del sistema |
| **internal** | efeonce_operations, efeonce_account, hr_payroll, hr_manager, employee, finance_*, people_viewer, ai_tooling_admin, collaborator | Equipo Efeonce |
| **client** | client_executive, client_manager, client_specialist | Usuarios de cuentas cliente |

## Route Groups (Scoping de acceso)

Cada rol mapea a uno o más **route groups**, que determinan qué superficies puede acceder el usuario:

| Route Group | Descripción | Roles que lo habilitan |
|-------------|-------------|----------------------|
| `client` | Portal cliente | client_executive, client_manager, client_specialist |
| `internal` | Área interna Efeonce | efeonce_*, hr_payroll, employee, finance_* |
| `admin` | Administración del sistema | efeonce_admin |
| `agency` | Vista agency (requiere internal o admin) | efeonce_admin, efeonce_operations, efeonce_account |
| `hr` | HR operations | hr_payroll, hr_manager |
| `finance` | Finanzas | finance_manager, finance_admin, finance_analyst |
| `employee` | Self-service de empleado | employee |
| `people` | Directorio de personas | people_viewer |
| `ai_tooling` | Gestión de AI tools | ai_tooling_admin |
| `my` | Recursos personales | collaborator |

## Autorización en API Routes

Cada API route usa un helper de autorización específico:

```typescript
// Patrón estándar en cada route.ts
export async function GET(request: NextRequest) {
  const { tenant, errorResponse } = await requireClientTenantContext()
  if (errorResponse) return errorResponse  // 401 o 403

  // Lógica de negocio con tenant.clientId, tenant.roleCodes, etc.
}
```

### Helpers disponibles

| Helper | Requiere | Retorna |
|--------|----------|---------|
| `requireTenantContext()` | Sesión válida | Tenant o 401 |
| `requireClientTenantContext()` | Sesión + tenantType=client | Tenant o 403 |
| `requireInternalTenantContext()` | routeGroup: internal | Tenant o 403 |
| `requireAgencyTenantContext()` | routeGroup: internal o admin | Tenant o 403 |
| `requireAdminTenantContext()` | routeGroup: admin + role: efeonce_admin | Tenant o 403 |
| `requireHrTenantContext()` | routeGroup: hr o role: efeonce_admin | Tenant o 403 |
| `requireEmployeeTenantContext()` | routeGroup: employee/hr o role: efeonce_admin | Tenant o 403 |
| `requirePeopleTenantContext()` | routeGroup: people o internal+HR/admin | Tenant o 403 |
| `requireFinanceTenantContext()` | routeGroup: finance o role: efeonce_admin | Tenant o 403 |
| `requireAiToolingTenantContext()` | routeGroup: ai_tooling o role: efeonce_admin | Tenant o 403 |
| `requireIntegrationRequest()` | Integration API key | Tenant o 401 |
| `requireCronAuth()` | CRON_SECRET verificado | Succes o 401 |

### Predicados de autorización

```typescript
isClientTenant(tenant)              // Es tenant tipo client con clientId
hasRoleCode(tenant, code)           // Tiene un rol específico
hasRouteGroup(tenant, group)        // Tiene acceso a un route group
canAccessProject(tenant, projectId) // Puede ver un proyecto específico
canAccessPeopleModule(tenant)       // Puede acceder al módulo People
```

## Resolución de acceso desde base de datos

### Lookup principal

La función `getTenantAccessRecordByEmail(email)` hace un JOIN complejo de 8+ tablas en BigQuery para construir el contexto completo:

1. `client_users` — Datos base del usuario
2. `clients` — Datos del tenant
3. `user_role_assignments` — Roles (con filtro temporal)
4. `roles` — Definiciones de roles con route groups
5. `user_project_scopes` — Proyectos accesibles
6. `user_campaign_scopes` — Campañas accesibles
7. `client_service_modules` — Módulos de servicio del tenant
8. `client_feature_flags` — Feature flags habilitados

### Lookups alternativos

| Función | Busca por | Uso |
|---------|----------|-----|
| `getTenantAccessRecordByMicrosoftOid(oid)` | Microsoft Object ID | SSO Microsoft |
| `getTenantAccessRecordByGoogleSub(sub)` | Google Subject ID | SSO Google |
| `getTenantAccessRecordByInternalMicrosoftAlias(email, name, ...)` | Alias de email + similitud de nombre | Usuarios internos Efeonce |
| `getTenantAccessRecordByAllowedEmailDomain(domain)` | Dominio de email permitido | Auto-provisioning por dominio |

## Páginas de autenticación

| Ruta | Función |
|------|---------|
| `/login` | Página de login con formulario credentials y botones SSO |
| `/auth/landing` | Landing page post-autenticación para redirección |
| `/auth/access-denied` | Página de error para acceso denegado |

## Configuración de sesión

- **Strategy**: JWT (no database sessions)
- **Cookie**: `greenhouse-eo-portal`
- **Pages**: signIn → `/login`, error → `/auth/access-denied`
- **Max Age**: Default NextAuth (30 días)

## Seguridad

1. **force-dynamic en todas las API routes** — Previene caching de respuestas con datos de sesión
2. **Contraseñas hasheadas con bcrypt** — Nunca en texto plano
3. **SSO linkeo unidireccional** — El portal vincula identidades SSO al registro existente, no al revés
4. **Domain allowlist** — Los tenants pueden configurar dominios de email permitidos para auto-provisioning
5. **Token refresh con re-lookup** — Cada refresh del JWT re-consulta la base de datos para permisos actualizados
6. **Feature flags por tenant** — Solo flags con status `enabled` o `staged` se cargan en sesión

---

## SCIM 2.0 Provisioning *(nuevo)*

**Lib**: `src/lib/scim/`

### Propósito

Sincronización de usuarios y grupos desde directorios corporativos (Microsoft Entra, Okta) mediante protocolo SCIM 2.0. Habilita auto-provisioning y deprovisioning en tiempo real.

### Autenticación

- **Bearer Token**: Configurado por tenant en `scim_tenant_mappings`
- **Endpoint raíz**: `/api/scim/v2/`
- **Validación**: `requireScimTenantAuth()` verifica token contra `scim_api_tokens` en BD

### Endpoints SCIM

| Recurso | Métodos | Descripción |
|---------|---------|-------------|
| `/Users` | GET, POST | Listar/crear usuarios |
| `/Users/[id]` | GET, PUT, PATCH, DELETE | CRUD de usuario |
| `/Groups` | GET, POST | Listar/crear grupos |
| `/Groups/[id]` | GET, PUT, PATCH, DELETE | CRUD de grupo |
| `/Schemas` | GET | Definiciones de schemas |
| `/ServiceProviderConfig` | GET | Configuración del proveedor |

### Provisioning Flow

1. **CREATE** (`POST /Users`) — Crea `client_users` con email, displayName, active=true
2. **UPDATE** (`PATCH /Users/[id]`) — Sincroniza campos: name, emails, displayName, active
3. **DISABLE** (`PATCH` active=false) — Marca usuario inactivo sin borrar
4. **DELETE** (`DELETE /Users/[id]`) — Soft-delete o purga según política

### Microsoft Entra Integration

- Tenant mapeo: `scim_tenant_mappings.azure_tenant_id` → `greenhouse_client_id`
- Sincronización bidireccional habilitada via `scim_tenant_mappings.auto_sync=true`
- Atributos sincronizados: email, displayName, givenName, familyName, mobile, locale, timezone

### Formatters

`formatters.ts` — Conversión SCIM ↔ Greenhouse:
- `toScimUser()` — `client_users` → UserResource
- `toGreenhouseUser()` — UserResource → `client_users`
- `toScimGroup()` — Grupo → GroupResource
- `toGreenhouseGroup()` — GroupResource → Grupo

---

## Identity Reconciliation Engine *(actualizado)*

**Lib**: `src/lib/identity/reconciliation/`

### Propósito

Motor de unificación de identidades entre Notion, HubSpot CRM, Azure AD, SCIM y sistemas externos. Descubre identidades no vinculadas y las reconcilia contra la base de identidades canónica (`identity_profiles`).

### Source Systems

| Sistema | sourceObjectType | Ejemplo de sourceObjectId | Atributos |
|---------|-----------------|--------------------------|-----------|
| `notion` | `user` | Notion user ID | email, name, displayName |
| `hubspot_crm` | `contact`, `owner` | HubSpot contact/owner ID | email, firstName, lastName |
| `azure_ad` | `user` | Azure AD OID | email, displayName, givenName, familyName |
| `scim` | `user`, `group` | SCIM user/group ID | email, name, groupMemberships |
| `internal_system` | `user` | ID interno | email, identifier |

### Event Catalog (50+ tipos agregados)

Eventos publicados en outbox para cada operación de identidad:

- `identity.profile.created` — Nueva identidad creada
- `identity.profile.updated` — Identidad actualizada
- `identity.link.created` — Vínculo nuevo entre identidades
- `identity.link.broken` — Vínculo removido
- `identity.reconciliation.proposed` — Propuesta de reconciliación
- `identity.reconciliation.approved` — Propuesta aprobada
- `identity.reconciliation.rejected` — Propuesta rechazada
- `identity.state.changed` — Cambio de estado canónico

### Canonical Person States *(nuevo)*

Estados operacionales de una persona en el sistema:

| Estado | Descripción | Implicación |
|--------|-------------|-----------|
| `active` | Identidad principal vinculada, perfil completo | Totalmente operativo |
| `missing_principal` | Sin identidad principal (e.g., solo contacto CRM) | Candidato para reconciliación |
| `degraded_link` | Links parciales o débiles a fuentes | Confianza baja en identidad |
| `inactive` | Usuario desactivado, pero registro persiste | Histórico disponible |

### Resolution Sources *(nuevo)*

Prioridad de fuentes al resolver identidad:

1. `person_360` — Identidad primaria materializada
2. `direct_user` — Usuario directo en `client_users`
3. `direct_member` — Miembro en `team_members`
4. `fallback` — Inferencia por email o nombre

### Thresholds

- **Auto-link**: Confidence ≥ 0.85 → vinculación automática sin intervención humana
- **Review**: Confidence ≥ 0.40 → propuesta pendiente de revisión por admin
- **No match**: Confidence < 0.40 → descartado

### Matching Engine

Multi-señal matching (`src/lib/identity/reconciliation/matching-engine.ts`):

1. **Email exacto** — Match de email normalizado (lowercase, strip diacritics)
2. **Name similarity** — Levenshtein distance + normalización (strip org suffix, collapse whitespace)
3. **Display name patterns** — Coincidencia de displayName entre sistemas
4. **Cross-reference** — Si un miembro ya tiene `notionUserId`, `hubspotOwnerId`, `azureOid`, o `scimId` en su registro
5. **Fuzzy matching** — Token-level similitud (firstname, lastname)

### Normalización

`normalize.ts` provee:
- `normalizeMatchValue()` — lowercase, strip diacritics, collapse whitespace
- `stripOrgSuffix()` — remover sufijos corporativos de nombres (e.g., " (Efeonce)")
- `isUuidAsName()` — detectar UUIDs usados como nombres (Notion)
- `levenshtein()` — distancia de edición para fuzzy matching
- `tokenizeName()` — split firstName/lastName

### Discovery

`discovery-notion.ts` — Descubre usuarios de Notion que aparecen en tareas/proyectos pero no están vinculados a ningún `identity_profile`.

`apply-link.ts` — Aplica linkeos descubiertos con validación y auditoría.

### Proposal Workflow

```
pending → pending_review → admin_approved / rejected
pending → auto_linked (confidence ≥ 0.85)
pending_review → dismissed
```

Cada propuesta (`ReconciliationProposal`) registra: sistema fuente, objeto fuente, candidato sugerido, confianza, señales de match, status, resolución, auditoría.

### Orquestación

```typescript
runIdentityReconciliation(opts?: { dryRun?: boolean, syncRunId?: string }): Promise<ReconciliationRunResult>
```

Retorna: `{ discoveredCount, alreadyLinkedCount, autoLinkedCount, pendingReviewCount, noMatchCount, errors, durationMs }`

### Person 360 — Estado operacional

La vista materializada `greenhouse_serving.person_360` está activa en producción. Consolida facets (member, user, crm_contact) con `identity_profile` como ancla canónica (`EO-ID{NNNN}`).

Para obtener estadísticas actualizadas de cobertura y reconciliación, ejecutar:

```bash
pnpm audit:person-360
```

El script reporta: total de identity profiles, miembros vinculados, usuarios vinculados, contactos CRM vinculados, y contactos pendientes de reconciliación.

---

## Google Secret Manager *(nuevo)*

**Lib**: `src/lib/secrets/`

### Propósito

Resolución de credenciales y secretos almacenados en Google Cloud Secret Manager. Integración con Vercel para runtime serverless.

### Cliente

`SecretClient` — API unificada para acceder secretos:
- `getSecret(name)` — Obtener valor de secreto
- `listSecrets(prefix?)` — Listar secretos disponibles
- `cacheStrategy` — Caching en memoria con TTL configurable

### Autenticación

- **OIDC**: Vercel OIDC (`@vercel/oidc`) → Google Cloud Identity Federation
- **Local**: Service account JSON vía `GOOGLE_APPLICATION_CREDENTIALS`
- **Fallback**: Variables de entorno (.env.local)

### Secrets utilizados

| Nombre | Descripción | Entorno |
|--------|-------------|---------|
| `scim-api-token-{tenant-id}` | Bearer token SCIM por tenant | Prod/Staging |
| `hubspot-private-app-token` | Token de acceso HubSpot | Prod/Staging |
| `nubox-api-key` | API key de Nubox | Prod/Staging |

---

## Vercel OIDC *(nuevo)*

**Lib**: `@vercel/oidc`

### Propósito

Autenticación serverless en Vercel hacia Google Cloud sin credenciales explícitas. Habilita Cloud SQL Connector sin TCP directo.

### Flujo

1. Vercel genera JWT firmado con identidad del deployment
2. Google Cloud asume el token vía `assumeRole()` → credencial temporal
3. Credencial se usa para Cloud SQL Connector, BigQuery, Secret Manager, etc.

### Configuración

```
VERCEL_OIDC_TOKEN_ENDPOINT = 'https://api.vercel.com/v2/oidc/token'
GOOGLE_CLOUD_WORKLOAD_IDENTITY_FEDERATION_CREDENTIAL_FILE = <path>
```

---

## JWT Minting para Admin Local *(nuevo)*

**Script**: `scripts/mint-local-admin-jwt.js`

### Propósito

Generar JWT válido para usuario admin local en desarrollo sin necesidad de provider externo.

### Uso

```bash
node scripts/mint-local-admin-jwt.js --email admin@greenhouse.local --name "Admin Local"
```

Retorna JWT codificado que puede usarse en `Authorization: Bearer <token>` para testing de API routes.

### Alcance

Token contiene roles `efeonce_admin`, routeGroups `[admin]`, acceso a todos los recursos.

---

## View Access Governance *(nuevo)*

**Lib**: `src/lib/access/view-access-registry.ts`

### Propósito

Control granular de quién puede acceder a cada vista (dashboard, persona, proyecto, etc.). Reemplaza cheques dispersos con registry centralizado.

### Registro

```typescript
{
  viewPath: string            // e.g., '/people/[memberId]'
  requiredRouteGroups?: string[]
  requiredRoles?: string[]
  requiredScopes?: 'projectScope' | 'campaignScope' | 'clientScope'
  scopeResolver?: (tenant, params) => boolean
}
```

### Evaluación

```typescript
canAccessView(tenant, viewPath, params?): boolean
```

Retorna false si:
- Tenant carece de routeGroups requeridos
- Tenant carece de roles requeridos
- scopeResolver falla (e.g., no tiene acceso al proyecto específico)

---

## Integration Auth *(nuevo)*

**Helper**: `requireIntegrationRequest()`

### Propósito

Autenticar solicitudes desde sistemas externos (HubSpot, Nubox, Zapier) mediante API keys integrados en la BD.

### Flujo

1. Sistema externo incluye header `Authorization: Bearer <api_key>`
2. `requireIntegrationRequest()` valida key en `greenhouse_core.integration_api_keys`
3. Retorna tenant asociado o 401

### Alcance

API keys tienen scopes limitados:
- `read:tenants` — Leer lista de tenants
- `read:capabilities` — Leer catálogo de capabilities
- `write:capabilities` — Sincronizar capabilities
- `read:integrations` — Leer estado de integraciones

---

## Cron Auth *(nuevo)*

**Helper**: `require-cron-auth.ts`

### Propósito

Verificar que solicitudes cron internas (desde Vercel Cron) vienen de una fuente autorizada.

### Validación

- Header `Authorization: Bearer <CRON_SECRET>` o query param `secret=<CRON_SECRET>`
- `CRON_SECRET` debe estar definido en variables de entorno
- Vercel firma automáticamente requests cron con el secret

### Rutas protegidas

```
POST /api/cron/outbox-publish
POST /api/cron/ico-materialize
POST /api/cron/sync-conformed
POST /api/finance/nubox/sync
```

Retorna 401 si secret inválido o ausente.
