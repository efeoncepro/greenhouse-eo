# CODEX TASK — SCIM User Provisioning: Entra ID → Greenhouse

## Estado 2026-03-19

Este brief se conserva como framing original del provisioning SCIM con Entra.

Para implementacion nueva y decisiones tecnicas, usar como baseline:
- `docs/tasks/to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md`

En particular, no implementar literalmente desde esta version:
- provisioning write path principal en BigQuery
- `GREENHOUSE_IDENTITY_ACCESS_V1.md` como referencia principal de auth
- modelado de autorizacion basado en un `role` unico o en defaults legacy fuera del modelo V2

Ante conflicto, prevalecen:
- `docs/tasks/to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/tasks/to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md`

## Resumen

Implementar provisioning automático de usuarios desde Microsoft Entra ID (Azure AD) hacia el portal Greenhouse usando el protocolo SCIM 2.0. Cuando un usuario se crea en el Active Directory de un cliente o de Efeonce, se crea automáticamente en Greenhouse. Cuando se desactiva o elimina en Entra, se desactiva en Greenhouse. Sin intervención manual.

**Estado real del repo al 2026-03-14:** La auth del portal ya no vive en `greenhouse.clients`. El principal canónico es `greenhouse.client_users`, con autorización derivada desde `greenhouse.user_role_assignments` y `greenhouse.user_project_scopes`. Microsoft SSO, Google SSO y `credentials` ya están activos sobre ese modelo.

**El problema hoy:** No existe aún provisioning SCIM desde Entra hacia el modelo actual de Greenhouse. Si alguien deja la empresa del cliente, la revocación del acceso sigue dependiendo de procesos manuales o de mutaciones administrativas fuera de SCIM.

**La solución:** Greenhouse expone un SCIM 2.0 server como API Routes en Next.js. En Microsoft Entra, la app registrada existente se configura con provisioning automático apuntando al SCIM endpoint. Entra hace POST cuando hay alta, PATCH cuando hay cambio o baja, y GET para discovery y reconciliación.

**Decisión arquitectónica clave:** Microsoft Entra es la fuente de verdad para identidad y estado de cuenta. Greenhouse sigue siendo la fuente de verdad para autorización y contexto operativo, pero esa autorización no se resuelve desde un campo `role` único en el usuario, sino desde roles y scopes separados.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/scim-provisioning`
- **Framework:** Next.js (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **Auth library:** NextAuth.js (ya implementada con Microsoft SSO + credentials)
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery dataset:** `greenhouse`
- **Azure AD Client ID:** `3626642f-0451-4eb2-8c29-d2211ab3176c`
- **Azure AD Tenant (Efeonce):** `a80bf6c1-7c45-4d70-b043-51389622a0e4`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (en el repo) | Modelo de roles, route groups, enforcement server-side |
| `project_context.md` (en el repo) | Schema real de tablas, estrategia de identidad |
| `CODEX_TASK_Microsoft_SSO_Greenhouse.md` (proyecto Claude) | Contexto histórico del rollout SSO; el principal vigente es `greenhouse.client_users` |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, colores, tipografía para UI admin |

---

## Dependencias previas

### DEBE existir (verificar en el repo)

- [ ] Auth con NextAuth.js funcionando con Microsoft SSO (`azure-ad` provider)
- [ ] Tabla de usuarios en BigQuery `greenhouse.client_users` con campos `microsoft_oid`, `microsoft_tenant_id`, `microsoft_email`, `active`
- [ ] Middleware de protección de rutas funcionando
- [ ] App Registration en Azure Portal creada y funcionando para SSO

### Verificar antes de implementar

- [ ] **Schema actual de tabla de usuarios:** Ejecutar `SELECT column_name, data_type FROM efeonce-group.greenhouse.INFORMATION_SCHEMA.COLUMNS WHERE table_name IN ('clients', 'client_users')` para confirmar qué tabla y campos existen. El SCIM server necesita mapear a campos reales.
- [ ] **Sistema de identidad actual:** Verificar si el repo usa `clients` o ya migró a `client_users`. Verificar en `project_context.md` y `bigquery.ts`.
- [ ] **Route groups existentes:** Verificar en `authorization.ts` cómo se definen route groups y permisos de admin — las rutas SCIM necesitan auth por bearer token, no por sesión NextAuth.

### Correcciones de alineación para ejecutar este task hoy

- No crear ni actualizar auth sobre `greenhouse.clients`; usar `greenhouse.client_users`.
- No modelar autorización solo con `role` y `notion_project_ids` en la fila del usuario; crear o reconciliar también `user_role_assignments` y `user_project_scopes`.
- No usar `client_id` como identificador de usuario SCIM; cada usuario necesita un ID estable propio. En este repo, `user_id` ya cumple ese rol interno.
- Si se decide agregar `scim_id`, debe vivir en `greenhouse.client_users` como identificador externo estable, nunca reemplazar `user_id`.
- `greenhouse.clients` puede seguir aportando metadata de tenant para defaults operativos, pero no debe volver a ser el principal de login.

---

## Arquitectura

### Fuente de verdad

| Dominio | Fuente de verdad | Ejemplos |
|---------|-------------------|----------|
| Identidad | Microsoft Entra | Quién existe, si está activo, email, nombre, tenant |
| Autorización | Greenhouse | Qué puede ver, rol en portal, `notion_project_ids`, `hubspot_company_id` |
| Contexto operativo | Greenhouse | Preferencias, historial de login, configuración de notificaciones |

### Flujo de provisioning

```
[Entra ID] — SCIM POST /Users → [Greenhouse SCIM Server] → [BigQuery: crear usuario + asignar contexto via tenant_mapping]
[Entra ID] — SCIM PATCH /Users/{id} active=false → [Greenhouse SCIM Server] → [BigQuery: desactivar usuario]
[Entra ID] — SCIM GET /Users?filter=... → [Greenhouse SCIM Server] → [BigQuery: consultar usuarios]
```

### Tabla de tenant mapping

Nueva tabla `greenhouse.tenant_mapping` que conecta la identidad (Entra tenant) con el contexto operativo (Greenhouse):

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.tenant_mapping` (
  tenant_id STRING NOT NULL,              -- Microsoft Entra Tenant ID
  tenant_name STRING NOT NULL,            -- Nombre legible ("Sky Airline", "Efeonce Group")
  client_id STRING NOT NULL,              -- client_id en Greenhouse
  default_role STRING DEFAULT 'client',   -- Rol por defecto para usuarios de este tenant
  default_notion_project_ids ARRAY<STRING>, -- Proyectos asignados por defecto
  hubspot_company_id STRING,              -- Company en HubSpot
  allowed_email_domains ARRAY<STRING>,    -- Dominios del tenant (para validación cruzada)
  auto_provision BOOL DEFAULT TRUE,       -- Si Entra puede crear usuarios automáticamente
  active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

**Lógica corregida para el runtime actual:** El mapping puede resolver defaults de tenant, pero el create/update real debe terminar en:
- `greenhouse.client_users`
- `greenhouse.user_role_assignments`
- `greenhouse.user_project_scopes`

El bearer token SCIM autentica la integración, pero por sí solo no identifica de forma confiable al tenant cliente. Si se necesita mapping por tenant Entra, debe modelarse explícitamente; si no, el fallback razonable es dominio permitido del tenant.

---

## PARTE A: SCIM Server (API Routes en Next.js)

### A1. Autenticación SCIM

Los requests de Entra llegan con un bearer token estático (no OAuth, no sesión). Este token se genera una vez y se configura en Entra como "Secret Token".

**Archivo:** `src/app/api/scim/v2/auth.ts`

```typescript
// Validar bearer token en requests SCIM
// El token se almacena en env var SCIM_BEARER_TOKEN
// Generar con: openssl rand -base64 48

export function validateScimAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)
  return token === process.env.SCIM_BEARER_TOKEN
}
```

**Environment variable nueva:**

| Variable | Descripción |
|----------|-------------|
| `SCIM_BEARER_TOKEN` | Token estático para autenticar requests de Entra. Generar con `openssl rand -base64 48`. Configurar en Vercel para production y preview. |

### A2. ServiceProviderConfig (discovery)

**Ruta:** `GET /api/scim/v2/ServiceProviderConfig`

Entra llama a este endpoint para descubrir qué capacidades soporta el SCIM server. No requiere auth.

```typescript
// src/app/api/scim/v2/ServiceProviderConfig/route.ts
export async function GET() {
  return Response.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: "https://greenhouse.efeoncepro.com/docs/scim",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 100 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "OAuth Bearer Token",
        description: "Authentication scheme using the OAuth Bearer Token Standard",
        specUri: "http://www.rfc-editor.org/info/rfc6750",
        primary: true
      }
    ]
  })
}
```

### A3. Schemas endpoint

**Ruta:** `GET /api/scim/v2/Schemas`

Retorna el schema SCIM soportado. Entra lo usa para mapear atributos.

```typescript
// src/app/api/scim/v2/Schemas/route.ts
export async function GET() {
  return Response.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: 1,
    Resources: [
      {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:Schema"],
        id: "urn:ietf:params:scim:schemas:core:2.0:User",
        name: "User",
        description: "Greenhouse Portal User",
        attributes: [
          {
            name: "userName",
            type: "string",
            multiValued: false,
            required: true,
            caseExact: false,
            mutability: "readWrite",
            returned: "default",
            uniqueness: "server"
          },
          {
            name: "displayName",
            type: "string",
            multiValued: false,
            required: false,
            mutability: "readWrite",
            returned: "default"
          },
          {
            name: "active",
            type: "boolean",
            multiValued: false,
            required: false,
            mutability: "readWrite",
            returned: "default"
          },
          {
            name: "emails",
            type: "complex",
            multiValued: true,
            required: true,
            mutability: "readWrite",
            returned: "default",
            subAttributes: [
              { name: "value", type: "string", multiValued: false, required: true },
              { name: "type", type: "string", multiValued: false, required: false },
              { name: "primary", type: "boolean", multiValued: false, required: false }
            ]
          },
          {
            name: "name",
            type: "complex",
            multiValued: false,
            required: false,
            mutability: "readWrite",
            returned: "default",
            subAttributes: [
              { name: "givenName", type: "string", multiValued: false },
              { name: "familyName", type: "string", multiValued: false }
            ]
          },
          {
            name: "externalId",
            type: "string",
            multiValued: false,
            required: false,
            mutability: "readWrite",
            returned: "default"
          }
        ]
      }
    ]
  })
}
```

### A4. Users endpoints (CRUD)

**Archivo principal:** `src/app/api/scim/v2/Users/route.ts` y `src/app/api/scim/v2/Users/[id]/route.ts`

#### GET /api/scim/v2/Users — List/Filter users

Entra llama esto para reconciliar. Soportar filtro por `userName` y `externalId`.

```typescript
// src/app/api/scim/v2/Users/route.ts

export async function GET(request: Request) {
  if (!validateScimAuth(request)) {
    return Response.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 })
  }

  const url = new URL(request.url)
  const filter = url.searchParams.get('filter') // e.g. 'userName eq "user@domain.com"'
  const startIndex = parseInt(url.searchParams.get('startIndex') || '1')
  const count = parseInt(url.searchParams.get('count') || '100')

  // Parsear filtro SCIM básico: 'userName eq "value"' o 'externalId eq "value"'
  // Entra solo usa eq para estos campos
  let users = []
  if (filter) {
    const match = filter.match(/(\w+)\s+eq\s+"([^"]+)"/)
    if (match) {
      const [, field, value] = match
      users = await queryScimUsers(field, value)
    }
  } else {
    users = await listScimUsers(startIndex, count)
  }

  return Response.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: users.length,
    startIndex,
    itemsPerPage: count,
    Resources: users.map(toScimUser)
  })
}
```

#### POST /api/scim/v2/Users — Create user

Cuando Entra crea un usuario y ese usuario está en el scope de la Enterprise App, Entra envía POST.

```typescript
export async function POST(request: Request) {
  if (!validateScimAuth(request)) {
    return Response.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 })
  }

  const body = await request.json()

  // Extraer campos SCIM
  const userName = body.userName                              // UPN del usuario
  const displayName = body.displayName || ''
  const givenName = body.name?.givenName || ''
  const familyName = body.name?.familyName || ''
  const email = body.emails?.find((e: any) => e.primary)?.value || body.userName
  const externalId = body.externalId                          // Microsoft Object ID
  const active = body.active !== false                        // default true

  // Verificar si ya existe
  const existing = await getScimUserByExternalId(externalId)
  if (existing) {
    return Response.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User already exists",
      status: 409
    }, { status: 409 })
  }

  // Buscar tenant mapping para asignar contexto operativo
  // Extraer dominio del email para buscar tenant
  const emailDomain = email.split('@')[1]
  const tenantMapping = await getTenantMappingByDomain(emailDomain)

  if (!tenantMapping || !tenantMapping.auto_provision) {
    return Response.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: `No tenant mapping found for domain ${emailDomain}, or auto-provisioning is disabled`,
      status: 400
    }, { status: 400 })
  }

  // Crear usuario en BigQuery con contexto operativo del tenant
  const newUser = await createGreenhouseUser({
    email,
    displayName: displayName || `${givenName} ${familyName}`.trim(),
    givenName,
    familyName,
    microsoftOid: externalId,
    microsoftEmail: email,
    clientId: tenantMapping.client_id,
    roleCode: tenantMapping.default_role,
    projectScopeIds: tenantMapping.default_notion_project_ids || [],
    hubspotCompanyId: tenantMapping.hubspot_company_id || null,
    authProvider: 'microsoft_sso',
    active
  })

  return Response.json(toScimUser(newUser), { status: 201 })
}
```

#### GET /api/scim/v2/Users/[id] — Get single user

```typescript
// src/app/api/scim/v2/Users/[id]/route.ts

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!validateScimAuth(request)) {
    return Response.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 })
  }

  const user = await getScimUserById(params.id)
  if (!user) {
    return Response.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: 404
    }, { status: 404 })
  }

  return Response.json(toScimUser(user))
}
```

#### PATCH /api/scim/v2/Users/[id] — Update/Deactivate user

Este es el endpoint crítico para bajas. Entra envía PATCH con `active: false` cuando un usuario se desactiva.

```typescript
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!validateScimAuth(request)) {
    return Response.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 })
  }

  const body = await request.json()
  // body.Operations es un array de operaciones SCIM
  // Ejemplo de desactivación:
  // { "Operations": [{ "op": "Replace", "path": "active", "value": "False" }] }

  const user = await getScimUserById(params.id)
  if (!user) {
    return Response.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: 404
    }, { status: 404 })
  }

  const updates: Record<string, any> = {}

  for (const op of body.Operations || []) {
    const path = op.path?.toLowerCase()
    const value = op.value

    switch (path) {
      case 'active':
        // Entra envía "False" como string o false como boolean
        updates.active = String(value).toLowerCase() === 'true'
        break
      case 'displayname':
        updates.displayName = value
        break
      case 'name.givenname':
        updates.givenName = value
        break
      case 'name.familyname':
        updates.familyName = value
        break
      case 'emails[type eq "work"].value':
        updates.email = value
        break
      // Entra a veces envía sin path, con value como objeto
      default:
        if (!path && typeof value === 'object') {
          if ('active' in value) updates.active = value.active
          if ('displayName' in value) updates.displayName = value.displayName
        }
        break
    }
  }

  const updatedUser = await updateGreenhouseUser(params.id, updates)
  return Response.json(toScimUser(updatedUser))
}
```

#### DELETE /api/scim/v2/Users/[id] — Hard delete (opcional)

Entra puede enviar DELETE en ciertos modos. Implementar como soft delete (set `active = false`), no como borrado real.

```typescript
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!validateScimAuth(request)) {
    return Response.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 })
  }

  // Soft delete: desactivar, no borrar
  await updateGreenhouseUser(params.id, { active: false })
  return new Response(null, { status: 204 })
}
```

### A5. SCIM Response formatter

**Archivo:** `src/lib/scim.ts`

```typescript
// Función para convertir un registro de BigQuery a formato SCIM User
export function toScimUser(user: GreenhouseUser): ScimUser {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.scim_id || user.user_id,   // ID interno estable del principal
    externalId: user.microsoft_oid,         // Microsoft Object ID
    userName: user.microsoft_email || user.email,
    displayName: user.display_name || user.client_name,
    name: {
      givenName: user.given_name || '',
      familyName: user.family_name || ''
    },
    emails: [
      {
        value: user.microsoft_email || user.email,
        type: "work",
        primary: true
      }
    ],
    active: user.active,
    meta: {
      resourceType: "User",
      created: user.created_at,
      lastModified: user.updated_at || user.last_login_at
    }
  }
}
```

### A6. BigQuery helpers para SCIM

**Archivo:** `src/lib/scim-queries.ts`

Funciones necesarias (todas server-side, nunca expuestas al browser):

| Función | Query BigQuery | Retorna |
|---------|----------------|---------|
| `getScimUserByExternalId(oid)` | `WHERE microsoft_oid = @oid` | Un usuario o null |
| `getScimUserById(id)` | `WHERE scim_id = @id OR user_id = @id` | Un usuario o null |
| `queryScimUsers(field, value)` | Filtro dinámico por `userName` o `externalId` | Array de usuarios |
| `listScimUsers(startIndex, count)` | `LIMIT @count OFFSET @startIndex` | Array de usuarios |
| `createGreenhouseUser(data)` | `INSERT INTO greenhouse.client_users ...` | Usuario creado |
| `updateGreenhouseUser(id, updates)` | `UPDATE greenhouse.client_users SET ... WHERE scim_id = @id` | Usuario actualizado |
| `getTenantMappingByDomain(domain)` | `WHERE @domain IN UNNEST(allowed_email_domains) AND active = TRUE` | Mapping o null |
| `getTenantMappingByTenantId(tid)` | `WHERE tenant_id = @tid AND active = TRUE` | Mapping o null |

**Importante:** Si se agrega `scim_id`, se usa como ID estable en respuestas SCIM. Si no existe aún, `user_id` ya es el identificador interno correcto del principal. `client_id` nunca debe usarse como ID de usuario.

---

## PARTE B: Schema BigQuery

### B1. Agregar campo `scim_id` a la tabla de usuarios

Verificar primero qué tabla existe (`clients` o `client_users`). Agregar:

```sql
-- Si la tabla es greenhouse.client_users (verificar en el repo)
ALTER TABLE `efeonce-group.greenhouse.client_users`
  ADD COLUMN IF NOT EXISTS scim_id STRING,
  ADD COLUMN IF NOT EXISTS given_name STRING,
  ADD COLUMN IF NOT EXISTS family_name STRING,
  ADD COLUMN IF NOT EXISTS display_name STRING,
  ADD COLUMN IF NOT EXISTS provisioned_by STRING DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP();
```

**Nota:** `scim_id` se genera como UUID v4 al crear el usuario via SCIM. Para usuarios existentes (creados antes de SCIM), generar un `scim_id` con un script de backfill.

### B2. Crear tabla `greenhouse.tenant_mapping`

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.tenant_mapping` (
  tenant_id STRING NOT NULL,
  tenant_name STRING NOT NULL,
  client_id STRING NOT NULL,
  default_role STRING DEFAULT 'client',
  default_notion_project_ids ARRAY<STRING>,
  hubspot_company_id STRING,
  allowed_email_domains ARRAY<STRING>,
  auto_provision BOOL DEFAULT TRUE,
  active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### B3. Seed data para tenant mapping

```sql
-- Efeonce internal (admin users)
INSERT INTO `efeonce-group.greenhouse.tenant_mapping`
  (tenant_id, tenant_name, client_id, default_role, allowed_email_domains, auto_provision)
VALUES
  ('a80bf6c1-7c45-4d70-b043-51389622a0e4', 'Efeonce Group', 'efeonce-admin', 'admin', ['efeoncepro.com', 'efeonce.org'], TRUE);

-- Agregar más tenants de clientes cuando se onboardeen
```

### B4. Crear tabla `greenhouse.scim_sync_log`

Para auditoría y debugging de provisioning:

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.scim_sync_log` (
  log_id STRING NOT NULL,
  operation STRING NOT NULL,       -- 'CREATE', 'UPDATE', 'DEACTIVATE', 'DELETE', 'GET', 'LIST'
  scim_id STRING,
  external_id STRING,              -- Microsoft OID
  email STRING,
  tenant_id STRING,
  request_body STRING,             -- JSON del request (sanitizado, sin tokens)
  response_status INT64,
  error_message STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### B5. Script SQL consolidado

Crear archivo `scripts/setup-scim.sql` en el repo con todo el DDL anterior. Documentar con comentarios.

---

## PARTE C: Configuración de Azure Entra (via Azure CLI)

### C1. Prerrequisitos

```bash
# Instalar Azure CLI si no está
# Login con cuenta admin de Efeonce
az login --tenant a80bf6c1-7c45-4d70-b043-51389622a0e4
```

### C2. Script de configuración de provisioning

**Archivo:** `scripts/setup-entra-scim.sh`

Este script configura provisioning SCIM en la Enterprise App existente de Greenhouse usando Microsoft Graph API via `az rest`.

```bash
#!/bin/bash
set -euo pipefail

# ============================================
# CONFIGURACIÓN
# ============================================
TENANT_ID="a80bf6c1-7c45-4d70-b043-51389622a0e4"
APP_CLIENT_ID="3626642f-0451-4eb2-8c29-d2211ab3176c"
SCIM_ENDPOINT="https://greenhouse.efeoncepro.com/api/scim/v2"
# SCIM_BEARER_TOKEN se lee de env o se pide interactivamente
SCIM_TOKEN="${SCIM_BEARER_TOKEN:?'Set SCIM_BEARER_TOKEN env var first'}"

echo "=== Greenhouse SCIM Provisioning Setup ==="
echo "Tenant: $TENANT_ID"
echo "App: $APP_CLIENT_ID"
echo "SCIM Endpoint: $SCIM_ENDPOINT"
echo ""

# ============================================
# PASO 1: Obtener el Service Principal ID
# ============================================
echo ">> Buscando Service Principal para la app..."
SP_RESPONSE=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals?\$filter=appId eq '$APP_CLIENT_ID'" \
  --headers "Content-Type=application/json")

SP_ID=$(echo "$SP_RESPONSE" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0]['id'] if v else '')")

if [ -z "$SP_ID" ]; then
  echo "ERROR: No se encontró Service Principal para app $APP_CLIENT_ID"
  echo "Crear primero: az ad sp create --id $APP_CLIENT_ID"
  exit 1
fi

echo "   Service Principal ID: $SP_ID"

# ============================================
# PASO 2: Crear synchronization job
# ============================================
echo ">> Creando synchronization job..."

# Primero verificar si ya existe un job
EXISTING_JOBS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/synchronization/jobs" \
  --headers "Content-Type=application/json" 2>/dev/null || echo '{"value":[]}')

JOB_COUNT=$(echo "$EXISTING_JOBS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('value',[])))")

if [ "$JOB_COUNT" -gt "0" ]; then
  JOB_ID=$(echo "$EXISTING_JOBS" | python3 -c "import sys,json; print(json.load(sys.stdin)['value'][0]['id'])")
  echo "   Job existente encontrado: $JOB_ID"
else
  # Crear job basado en template customappsso
  JOB_RESPONSE=$(az rest --method POST \
    --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/synchronization/jobs" \
    --headers "Content-Type=application/json" \
    --body '{"templateId": "customappsso"}')

  JOB_ID=$(echo "$JOB_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  echo "   Job creado: $JOB_ID"
fi

# ============================================
# PASO 3: Validar credenciales SCIM
# ============================================
echo ">> Validando credenciales contra SCIM endpoint..."

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/synchronization/jobs/$JOB_ID/validateCredentials" \
  --headers "Content-Type=application/json" \
  --body "{
    \"credentials\": [
      { \"key\": \"BaseAddress\", \"value\": \"$SCIM_ENDPOINT\" },
      { \"key\": \"SecretToken\", \"value\": \"$SCIM_TOKEN\" }
    ]
  }"

echo "   Credenciales válidas ✓"

# ============================================
# PASO 4: Guardar credenciales
# ============================================
echo ">> Guardando credenciales en el job..."

az rest --method PUT \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/synchronization/secrets" \
  --headers "Content-Type=application/json" \
  --body "{
    \"value\": [
      { \"key\": \"BaseAddress\", \"value\": \"$SCIM_ENDPOINT\" },
      { \"key\": \"SecretToken\", \"value\": \"$SCIM_TOKEN\" }
    ]
  }"

echo "   Credenciales guardadas ✓"

# ============================================
# PASO 5: Iniciar provisioning
# ============================================
echo ">> Iniciando synchronization job..."

az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/synchronization/jobs/$JOB_ID/start" \
  --headers "Content-Type=application/json"

echo "   Job iniciado ✓"

# ============================================
# PASO 6: Verificar estado
# ============================================
echo ">> Verificando estado del job..."

JOB_STATUS=$(az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/synchronization/jobs/$JOB_ID" \
  --headers "Content-Type=application/json")

STATUS=$(echo "$JOB_STATUS" | python3 -c "import sys,json; j=json.load(sys.stdin); print(j.get('status',{}).get('code','unknown'))")
echo "   Estado: $STATUS"

echo ""
echo "=== Setup completo ==="
echo ""
echo "Próximos pasos:"
echo "1. Ir a Azure Portal > Enterprise Applications > Greenhouse > Provisioning"
echo "2. Verificar que Provisioning Mode = Automatic"
echo "3. En Mappings, verificar attribute mappings de usuarios"
echo "4. Asignar usuarios/grupos al scope de la app"
echo "5. El primer sync completo ocurre en ~40 minutos"
echo ""
echo "Para forzar sync de un usuario específico:"
echo "  az rest --method POST --url 'https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/synchronization/jobs/$JOB_ID/provisionOnDemand' ..."
```

### C3. Notas sobre Azure CLI vs Portal

| Acción | ¿Automatizable con CLI? | Nota |
|--------|-------------------------|------|
| Crear/encontrar Service Principal | ✅ `az rest` con Graph API | — |
| Crear synchronization job | ✅ `az rest` con Graph API | Template `customappsso` para non-gallery apps |
| Guardar credenciales SCIM | ✅ `az rest` con Graph API | Bearer token + endpoint URL |
| Validar conexión | ✅ `az rest` con Graph API | Equivalente a "Test Connection" del portal |
| Iniciar/parar job | ✅ `az rest` con Graph API | — |
| Provision on demand (1 usuario) | ✅ `az rest` con Graph API | Útil para testing |
| Editar attribute mappings | ⚠️ Posible pero complejo | Requiere GET schema → modificar → PUT. Más fácil en portal la primera vez |
| Asignar usuarios/grupos al scope | ✅ `az rest` con Graph API | `POST /servicePrincipals/{id}/appRoleAssignments` |

**Recomendación:** Usar el script para setup inicial (pasos 1-6), y el portal web para ajustar attribute mappings la primera vez. Después de la primera configuración, todo el mantenimiento es via CLI.

---

## PARTE D: Environment Variables

### D1. Variables nuevas en Vercel

```bash
# Generar token SCIM
SCIM_TOKEN=$(openssl rand -base64 48)

# Agregar a Vercel
echo "$SCIM_TOKEN" | vercel env add SCIM_BEARER_TOKEN production preview
```

### D2. Actualizar `.env.local.example`

Agregar al archivo existente:

```bash
# SCIM Provisioning
SCIM_BEARER_TOKEN=<generar con: openssl rand -base64 48>
```

---

## PARTE E: Middleware y seguridad

### E1. Excluir rutas SCIM del middleware de NextAuth

Las rutas SCIM usan bearer token propio, no sesión NextAuth. Agregar a la lista de rutas públicas en `middleware.ts`:

```typescript
const publicPaths = [
  '/login',
  '/auth/access-denied',
  '/api/scim/v2',          // SCIM endpoints usan su propio auth
]
```

### E2. Rate limiting

Implementar rate limiting básico en las rutas SCIM para proteger contra abuse:

- Max 100 requests por minuto por IP
- Entra hace ~1 request cada 40 minutos en operación normal, con ráfagas durante initial sync

Usar headers `Retry-After` si se excede el límite.

### E3. Logging

Todos los requests SCIM deben loguearse en `greenhouse.scim_sync_log`:
- Loguear operación, email, external_id, status code
- **NO loguear el bearer token**
- Loguear request body sanitizado (sin headers de auth)

---

## Estructura de archivos resultante

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts    (existente)
│   │   └── scim/
│   │       └── v2/
│   │           ├── ServiceProviderConfig/
│   │           │   └── route.ts
│   │           ├── Schemas/
│   │           │   └── route.ts
│   │           ├── Users/
│   │           │   ├── route.ts           (GET list + POST create)
│   │           │   └── [id]/
│   │           │       └── route.ts       (GET + PATCH + DELETE)
│   │           └── auth.ts               (bearer token validation)
│   └── ...
├── lib/
│   ├── bigquery.ts                        (existente)
│   ├── scim.ts                            (SCIM response formatter + types)
│   └── scim-queries.ts                    (BigQuery queries para SCIM)
├── middleware.ts                           (modificar: excluir /api/scim/v2)
└── types/
    └── scim.d.ts                          (tipos SCIM)
scripts/
├── setup-bigquery.sql                     (existente)
├── setup-scim.sql                         (DDL para tenant_mapping + scim_sync_log + ALTER users)
└── setup-entra-scim.sh                    (Azure CLI script para configurar provisioning)
.env.local.example                         (agregar SCIM_BEARER_TOKEN)
```

---

## Criterios de aceptación

**SCIM Server:**
- [ ] `GET /api/scim/v2/ServiceProviderConfig` retorna config válida sin auth
- [ ] `GET /api/scim/v2/Schemas` retorna schema de User
- [ ] `GET /api/scim/v2/Users` con bearer token retorna lista de usuarios en formato SCIM
- [ ] `GET /api/scim/v2/Users?filter=userName eq "email@domain.com"` filtra correctamente
- [ ] `POST /api/scim/v2/Users` crea usuario en BigQuery con contexto de `tenant_mapping`
- [ ] `PATCH /api/scim/v2/Users/{id}` con `active: false` desactiva usuario
- [ ] `DELETE /api/scim/v2/Users/{id}` hace soft delete (active = false)
- [ ] Todos los endpoints retornan 401 sin bearer token válido
- [ ] Todos los endpoints retornan responses con schema SCIM 2.0 válido

**Tenant Mapping:**
- [ ] Tabla `greenhouse.tenant_mapping` creada con seed de Efeonce
- [ ] POST de usuario con dominio `efeoncepro.com` resuelve al mapping de Efeonce y crea con role `admin`
- [ ] POST de usuario con dominio sin mapping retorna 400

**BigQuery:**
- [ ] Campo `scim_id` agregado a tabla de usuarios
- [ ] Backfill de `scim_id` para usuarios existentes
- [ ] Tabla `scim_sync_log` creada y recibiendo logs
- [ ] Script `setup-scim.sql` en el repo

**Azure CLI:**
- [ ] Script `setup-entra-scim.sh` ejecutable end-to-end
- [ ] Provisioning job creado y corriendo en Entra
- [ ] `SCIM_BEARER_TOKEN` en Vercel env vars

**Seguridad:**
- [ ] Rutas SCIM excluidas del middleware NextAuth
- [ ] Bearer token nunca logueado
- [ ] Rate limiting básico implementado

**Integración end-to-end:**
- [ ] Crear usuario en Entra → aparece en Greenhouse activo (esperar hasta 40 min para sync automático, o usar provision on demand)
- [ ] Desactivar usuario en Entra → usuario se desactiva en Greenhouse
- [ ] Usuario desactivado no puede hacer login en el portal

---

## Lo que NO incluye esta tarea

- UI de admin para gestionar tenant mappings (futuro — hoy se hace con INSERT en BigQuery)
- SCIM Groups (solo Users por ahora — agregar cuando haya necesidad de sincronizar grupos/equipos)
- Webhook push instantáneo (Entra sincroniza cada ~40 min; para urgencias usar `provisionOnDemand` via CLI)
- Modificaciones a la App Registration en Azure Portal (ya existe, solo se agrega provisioning)
- Attribute mappings customizados en Entra (usar defaults la primera vez, ajustar manualmente en portal)

---

## Notas técnicas

- **SCIM 2.0 RFC:** 7642 (Definitions), 7643 (Core Schema), 7644 (Protocol). Entra implementa un subset — no necesitamos compliance completo.
- **Entra sync interval:** ~40 minutos. El primer sync (initial cycle) puede tardar más según la cantidad de usuarios.
- **Entra attribute mappings default:** `userPrincipalName` → `userName`, `mail` → `emails[type eq "work"].value`, `objectId` → `externalId`, `Switch([IsSoftDeleted]...)` → `active`. Estos defaults funcionan para nuestro caso.
- **`externalId` = Microsoft Object ID (`oid`):** Este es el campo que Entra usa como clave de reconciliación. Debe coincidir con `microsoft_oid` en la tabla de usuarios.
- **Bearer token vs OAuth:** Entra soporta ambos para SCIM. Bearer estático es más simple y suficiente. Si en el futuro necesitamos rotación automática, migrar a OAuth.
- **Vercel cold starts:** Las rutas SCIM pueden tener cold starts de ~1-2s. Entra tolera esto — tiene timeouts generosos para SCIM.
- **UUID para `scim_id`:** Usar `crypto.randomUUID()` (disponible en Node.js 19+ y Vercel Edge). Si la versión de Node no lo soporta, usar `uuid` package.

---

## Orden de implementación sugerido

1. **Schema BigQuery** (B1-B5) — crear tablas, agregar campos, seed data
2. **SCIM types y formatter** (A5) — definir interfaces TypeScript
3. **BigQuery queries** (A6) — funciones de consulta
4. **SCIM auth** (A1) — validación de bearer token
5. **ServiceProviderConfig + Schemas** (A2, A3) — endpoints de discovery
6. **Users CRUD** (A4) — endpoints principales
7. **Middleware update** (E1) — excluir rutas SCIM
8. **Logging** (E3) — sync log
9. **Environment vars** (D1-D2) — token en Vercel
10. **Azure CLI script** (C2) — configurar Entra
11. **Test end-to-end** — crear/desactivar usuario en Entra, verificar en Greenhouse

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*

*Spec técnica para implementación por Codex / Claude Code. La fuente de verdad de identidad es Microsoft Entra; Greenhouse es fuente de verdad de autorización.*
