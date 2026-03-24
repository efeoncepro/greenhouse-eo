# Greenhouse Portal — Autenticación e Identidad

> Versión: 2.0
> Fecha: 2026-03-22
> Actualizado: Identity Reconciliation Engine, Person 360 operacional, reconciliation proposals

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

## Identity Reconciliation Engine *(nuevo)*

**Lib**: `src/lib/identity/reconciliation/`

### Propósito

Motor de unificación de identidades entre Notion, HubSpot CRM y Azure AD. Descubre identidades no vinculadas y las reconcilia contra la base de miembros canónica (`identity_profiles`).

### Source Systems

| Sistema | sourceObjectType | Ejemplo de sourceObjectId |
|---------|-----------------|--------------------------|
| `notion` | `user` | Notion user ID |
| `hubspot_crm` | `contact`, `owner` | HubSpot contact/owner ID |
| `azure_ad` | `user` | Azure AD OID |

### Thresholds

- **Auto-link**: Confidence ≥ 0.85 → vinculación automática sin intervención humana
- **Review**: Confidence ≥ 0.40 → propuesta pendiente de revisión por admin
- **No match**: Confidence < 0.40 → descartado

### Matching Engine

Multi-señal matching (`src/lib/identity/reconciliation/matching-engine.ts`):

1. **Email exacto** — Match de email normalizado (lowercase, strip diacritics)
2. **Name similarity** — Levenshtein distance + normalización (strip org suffix, collapse whitespace)
3. **Display name patterns** — Coincidencia de displayName entre sistemas
4. **Cross-reference** — Si un miembro ya tiene `notionUserId`, `hubspotOwnerId`, o `azureOid` en su registro

### Normalización

`normalize.ts` provee:
- `normalizeMatchValue()` — lowercase, strip diacritics, collapse whitespace
- `stripOrgSuffix()` — remover sufijos corporativos de nombres
- `isUuidAsName()` — detectar UUIDs usados como nombres (Notion)
- `levenshtein()` — distancia de edición para fuzzy matching

### Discovery

`discovery-notion.ts` — Descubre usuarios de Notion que aparecen en tareas/proyectos pero no están vinculados a ningún `identity_profile`.

### Proposal Workflow

```
pending → pending_review → admin_approved / rejected
pending → auto_linked (confidence ≥ 0.85)
pending_review → dismissed
```

Cada propuesta (`ReconciliationProposal`) registra: sistema fuente, objeto fuente, candidato sugerido, confianza, señales de match, status, resolución.

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
