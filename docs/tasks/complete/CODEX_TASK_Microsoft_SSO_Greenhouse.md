# CODEX TASK — Microsoft SSO para Greenhouse Portal

## Resumen

Este task queda como referencia histórica del rollout inicial de Microsoft SSO.

Estado real del repo al 2026-03-14:
- Microsoft SSO ya está implementado en NextAuth
- el principal canónico de login es `greenhouse.client_users`, no `greenhouse.clients`
- el portal ya soporta `credentials`, Microsoft Entra ID y Google OAuth sobre el mismo modelo de principal

Si se retoma trabajo sobre este tema, debe tratarse como hardening o extensión incremental del flujo existente, no como implementación desde cero. La identidad Microsoft del usuario se vincula a su principal en `greenhouse.client_users`.

**La App Registration en Azure ya fue creada manualmente.** Las credenciales están en las environment variables de Vercel. Esta tarea se enfoca en: crear la infraestructura en BigQuery, implementar el código de auth en el portal, y todo lo necesario para que el flujo funcione end-to-end.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/microsoft-sso`
- **Framework real actual:** Next.js 16.1.1 (Vuexy starter-kit adaptado)
- **Package manager:** pnpm
- **Auth library:** NextAuth.js ya integrado
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **Data store de auth vigente:** BigQuery tabla `efeonce-group.greenhouse.client_users`
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`

---

## Environment variables disponibles en Vercel

Estas variables ya están (o serán) configuradas en Vercel. El código debe referenciarlas:

| Variable | Descripción |
|---|---|
| `AZURE_AD_CLIENT_ID` | `3626642f-0451-4eb2-8c29-d2211ab3176c` |
| `AZURE_AD_CLIENT_SECRET` | Client secret de la App Registration (en Vercel, no hardcodear) |
| `NEXTAUTH_SECRET` | Secret para firmar tokens JWT |
| `NEXTAUTH_URL` | `https://greenhouse.efeoncepro.com` (producción) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Service account key para BigQuery (base64 encoded) |
| `GCP_PROJECT` | `efeonce-group` |

---

## Alcance completo de la tarea

### PARTE A: Infraestructura BigQuery

#### A1. Crear dataset `greenhouse` si no existe

Usar `gcloud` o la API de BigQuery para crear el dataset:

```bash
bq mk --dataset --location=US efeonce-group:greenhouse
```

Si ya existe, este comando no falla — se puede ejecutar de forma idempotente.

#### A2. No recrear tabla de auth legacy

La versión vigente del repo ya no usa `greenhouse.clients` como tabla de auth. Ese rol fue absorbido por `greenhouse.client_users`.

Si hubiera trabajo incremental pendiente en Microsoft SSO, la base correcta es:
- `greenhouse.client_users`
- `greenhouse.roles`
- `greenhouse.user_role_assignments`
- `greenhouse.user_project_scopes`

El DDL histórico de `greenhouse.clients` se conserva solo como referencia de una fase ya superada:

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.clients` (
  client_id STRING NOT NULL,
  client_name STRING NOT NULL,
  email STRING NOT NULL,
  password_hash STRING,
  auth_provider STRING DEFAULT 'credentials',
  microsoft_oid STRING,
  microsoft_tenant_id STRING,
  microsoft_email STRING,
  notion_project_ids ARRAY<STRING>,
  hubspot_company_id STRING,
  active BOOL DEFAULT TRUE,
  role STRING DEFAULT 'client',
  allowed_email_domains ARRAY<STRING>,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  last_login_at TIMESTAMP,
  last_login_provider STRING
);
```

#### A3. Seed histórico

Este seed también pertenece al modelo anterior y no debe ejecutarse literalmente en el runtime actual:

```sql
INSERT INTO `efeonce-group.greenhouse.clients`
  (client_id, client_name, email, auth_provider, microsoft_email, active, role, notion_project_ids, allowed_email_domains)
VALUES
  ('efeonce-admin', 'Efeonce Group', 'jreyes@efeoncepro.com', 'microsoft_sso', 'jreyes@efeoncepro.com', TRUE, 'admin', [], ['efeoncepro.com', 'efeonce.org']);
```

#### A4. Verificar permisos del service account

El service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` necesita acceso al dataset `greenhouse`. Si el service account ya existe y tiene roles de BigQuery Data Viewer + BigQuery Job User a nivel proyecto, el acceso al dataset es automático. Verificar con:

```bash
bq show --format=prettyjson efeonce-group:greenhouse
```

Si el service account no existe aún, crearlo:

```bash
gcloud iam service-accounts create greenhouse-portal \
  --display-name="Greenhouse Portal" \
  --project=efeonce-group

gcloud projects add-iam-policy-binding efeonce-group \
  --member="serviceAccount:greenhouse-portal@efeonce-group.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding efeonce-group \
  --member="serviceAccount:greenhouse-portal@efeonce-group.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

#### A5. Generar script SQL de referencia

Crear archivo `scripts/setup-bigquery.sql` en el repo con todo el DDL anterior documentado, para referencia futura.

---

### PARTE B: Código de autenticación

#### B1. Instalar dependencias

```bash
pnpm add next-auth @google-cloud/bigquery bcryptjs
pnpm add -D @types/bcryptjs
```

#### B2. Helper de auth: nota de alineación

El helper de auth vigente ya existe en `src/lib/tenant/access.ts` y consulta `client_users` con joins a roles y scopes. No corresponde recrear un helper nuevo sobre `greenhouse.clients`.

Archivo: `src/lib/bigquery.ts`

Funciones necesarias:

- `getClientByEmail(email: string)` — Busca un cliente por email (campo `email` o `microsoft_email`). Retorna el registro completo o null.
- `getClientByMicrosoftOid(oid: string)` — Busca un cliente por su Microsoft Object ID. Retorna el registro completo o null.
- `getClientByEmailDomain(domain: string)` — Busca un cliente cuyo `allowed_email_domains` contenga el dominio dado. Retorna el primer registro activo o null.
- `updateLastLogin(clientId: string, provider: string)` — Actualiza `last_login_at` y `last_login_provider`.
- `linkMicrosoftIdentity(clientId: string, oid: string, tenantId: string, msEmail: string)` — Actualiza los campos `microsoft_oid`, `microsoft_tenant_id`, `microsoft_email` y cambia `auth_provider` a `'both'` si antes era `'credentials'`.

**Patrón para inicializar BigQuery:**

```typescript
import { BigQuery } from '@google-cloud/bigquery'

const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!, 'base64').toString()
)

const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT || 'efeonce-group',
  credentials
})
```

**Query para `getClientByEmailDomain`:**

```sql
SELECT * FROM `efeonce-group.greenhouse.clients`
WHERE @domain IN UNNEST(allowed_email_domains)
  AND active = TRUE
LIMIT 1
```

#### B3. Configurar NextAuth.js con dos providers

Archivo: `src/lib/auth.ts` (exportar `authOptions`) y `src/app/api/auth/[...nextauth]/route.ts` (handler de NextAuth).

**Provider 1: Microsoft Entra ID (Azure AD)**

```typescript
import AzureADProvider from 'next-auth/providers/azure-ad'

AzureADProvider({
  clientId: process.env.AZURE_AD_CLIENT_ID!,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  tenantId: 'common',
  authorization: {
    params: {
      scope: 'openid profile email'
    }
  }
})
```

**Provider 2: Credentials (email + password)**

```typescript
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

CredentialsProvider({
  name: 'Email',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' }
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null

    const client = await getClientByEmail(credentials.email)
    if (!client || !client.active || !client.password_hash) return null

    const valid = await bcrypt.compare(credentials.password, client.password_hash)
    if (!valid) return null

    return {
      id: client.client_id,
      email: client.email,
      name: client.client_name,
      role: client.role,
      projectIds: client.notion_project_ids,
      hubspotCompanyId: client.hubspot_company_id
    }
  }
})
```

#### B4. Callbacks de NextAuth

**`signIn` callback:**

```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    if (account?.provider === 'credentials') return true

    if (account?.provider === 'azure-ad') {
      const msEmail = (profile as any)?.email || user.email
      const msOid = (profile as any)?.oid || (profile as any)?.sub
      const msTenantId = (profile as any)?.tid

      if (!msEmail) return false

      let client = await getClientByMicrosoftOid(msOid)

      if (!client) {
        client = await getClientByEmail(msEmail)
      }

      if (!client) {
        const domain = msEmail.split('@')[1]
        client = await getClientByEmailDomain(domain)
      }

      if (!client || !client.active) {
        return '/auth/access-denied'
      }

      if (!client.microsoft_oid) {
        await linkMicrosoftIdentity(client.client_id, msOid, msTenantId, msEmail)
      }

      await updateLastLogin(client.client_id, 'microsoft_sso')
      return true
    }

    return false
  },

  async jwt({ token, user, account, profile }) {
    if (user) {
      token.clientId = user.id
      token.role = (user as any).role
      token.projectIds = (user as any).projectIds
      token.hubspotCompanyId = (user as any).hubspotCompanyId
      token.provider = account?.provider
    }

    if (account?.provider === 'azure-ad') {
      const msOid = (profile as any)?.oid || (profile as any)?.sub
      const client = await getClientByMicrosoftOid(msOid)
        || await getClientByEmail(token.email as string)

      if (client) {
        token.clientId = client.client_id
        token.role = client.role
        token.projectIds = client.notion_project_ids
        token.hubspotCompanyId = client.hubspot_company_id
        token.provider = 'microsoft_sso'
      }
    }

    return token
  },

  async session({ session, token }) {
    session.user.clientId = token.clientId as string
    session.user.role = token.role as string
    session.user.projectIds = token.projectIds as string[]
    session.user.hubspotCompanyId = token.hubspotCompanyId as string
    session.user.provider = token.provider as string
    return session
  }
}
```

#### B5. Type definitions

Archivo: `src/types/next-auth.d.ts`

```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      clientId: string
      role: string
      projectIds: string[]
      hubspotCompanyId: string
      provider: string
    } & DefaultSession['user']
  }

  interface User {
    role?: string
    projectIds?: string[]
    hubspotCompanyId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    clientId?: string
    role?: string
    projectIds?: string[]
    hubspotCompanyId?: string
    provider?: string
  }
}
```

#### B6. Página de login

**Referencia clave de Vuexy:** La full-version ya trae páginas de login con social login buttons. Buscar en `full-version/src/views/Login.tsx` (o `full-version/src/app/(blank-layout-pages)/login/`) el componente existente como base. Vuexy usa `IconButton` de MUI para los social buttons, con íconos de Iconify y un divisor "or" (`Divider` de MUI con texto centrado). Reusar ese patrón exacto.

Modificar la página de login del starter-kit (buscar en `src/app/(blank-layout-pages)/login/page.tsx` o `src/views/Login.tsx`).

**Patrón de auth de Vuexy:** La configuración de NextAuth sigue la estructura de Vuexy: `src/libs/auth.ts` para authOptions y `src/app/api/auth/[...nextauth]/route.ts` para el handler. Ver la documentación de Vuexy en `documentation/docs/guide/authentication/` para el patrón exacto de credentials y OAuth providers.

**Requisitos de la UI de login:**

- Botón principal: **"Iniciar sesión con Microsoft"** — usar `Button` de MUI (no `IconButton`) con `variant="contained"`, fondo #0078D4 (color oficial Microsoft), texto blanco. Para el ícono de Microsoft, usar Iconify: `<i className='tabler-brand-windows' />` o importar `mdi:microsoft` vía el sistema de íconos de Vuexy. El botón debe ser full-width y estar arriba del formulario.
- Separador visual: usar `<Divider>o</Divider>` de MUI con el patrón que Vuexy ya usa en sus páginas de login para separar social login del formulario.
- Formulario secundario: campos Email + Password usando los `CustomTextField` de Vuexy (buscar en `src/@core/components/mui/TextField`) + botón "Iniciar sesión" con estilo secundario (`variant="outlined"` o `variant="tonal"`).
- Branding: logo de Efeonce Greenhouse en la parte superior. Usar los colores de marca (Deep Azure #023c70).
- Layout: usar el `BlankLayout` de Vuexy que ya envuelve las páginas de auth (sin sidebar, sin header).
- **No mostrar opción de registro.** El acceso se provisiona internamente.
- **No mostrar links de "¿Olvidaste tu contraseña?" por ahora.**
- **Eliminar los social login buttons de Google, Facebook, Twitter, GitHub** que Vuexy trae por defecto. Solo queda Microsoft como provider OAuth.

**Flujo del botón Microsoft:**

```typescript
import { signIn } from 'next-auth/react'

<Button onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}>
  Iniciar sesión con Microsoft
</Button>
```

**Flujo del formulario credentials:**

```typescript
const handleCredentials = async () => {
  const result = await signIn('credentials', {
    email,
    password,
    redirect: false
  })
  if (result?.error) setError('Credenciales incorrectas')
  else router.push('/dashboard')
}
```

#### B7. Página de acceso denegado

Archivo: `src/app/(blank-layout-pages)/auth/access-denied/page.tsx`

- Título: "Acceso no disponible"
- Mensaje: "Tu cuenta de Microsoft no tiene acceso al portal Greenhouse. Si crees que esto es un error, contacta a tu account manager en Efeonce."
- Botón: "Volver al inicio" → redirige a `/login`
- Branding Greenhouse consistente con la página de login.

#### B8. Middleware de protección de rutas

Archivo: `src/middleware.ts`

```typescript
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  const publicPaths = ['/login', '/auth/access-denied']
  if (publicPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!token.clientId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)']
}
```

#### B9. Vista de perfil — identidad Microsoft vinculada

En la vista `/settings` (P2 del roadmap), agregar una sección "Cuenta vinculada" que muestre:

- Si tiene Microsoft vinculado: ícono de Microsoft + email Microsoft + badge "Verificado"
- Si no tiene Microsoft vinculado y entró por credentials: botón "Vincular cuenta Microsoft" que ejecuta `signIn('azure-ad')`
- Texto informativo del método de acceso activo

---

### PARTE C: Environment Variables en Vercel (via CLI)

Codex tiene Vercel CLI instalada. Configurar las variables de entorno para Production, Preview y Development.

#### C1. Linkear proyecto (si no está linkeado)

```bash
cd greenhouse-eo
vercel link --yes
```

#### C2. Configurar variables

```bash
# Microsoft SSO
echo "3626642f-0451-4eb2-8c29-d2211ab3176c" | vercel env add AZURE_AD_CLIENT_ID production preview development
echo "<AZURE_AD_CLIENT_SECRET>" | vercel env add AZURE_AD_CLIENT_SECRET production preview development
echo "$(openssl rand -base64 32)" | vercel env add NEXTAUTH_SECRET production preview development
echo "https://greenhouse.efeoncepro.com" | vercel env add NEXTAUTH_URL production
echo "https://dev-greenhouse.efeoncepro.com" | vercel env add NEXTAUTH_URL preview
echo "http://localhost:3000" | vercel env add NEXTAUTH_URL development
```

**Nota:** Si alguna variable ya existe, Vercel CLI preguntará si se quiere sobreescribir. Responder sí. Las variables `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `GCP_PROJECT` ya deberían existir de configuraciones previas — verificar con `vercel env ls` y no sobreescribirlas.

#### C3. Verificar

```bash
vercel env ls
```

Confirmar que aparecen: `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GCP_PROJECT`.

---

### PARTE D: Archivos de configuración

#### D1. `.env.local.example`

Crear en la raíz del repo:

```bash
# Microsoft SSO
AZURE_AD_CLIENT_ID=3626642f-0451-4eb2-8c29-d2211ab3176c
AZURE_AD_CLIENT_SECRET=<obtener de Vercel o Azure>
NEXTAUTH_SECRET=<generar con: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# BigQuery
GOOGLE_APPLICATION_CREDENTIALS_JSON=<base64 encoded service account key>
GCP_PROJECT=efeonce-group
```

#### D2. Actualizar README

Agregar sección de setup de autenticación con nota de que el redirect URI de localhost (`http://localhost:3000/api/auth/callback/azure-ad`) debe estar registrado en Azure Portal → Greenhouse app → Authentication para desarrollo local.

---

## Estructura de archivos resultante

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   ├── (blank-layout-pages)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── auth/
│   │       └── access-denied/
│   │           └── page.tsx
│   └── (dashboard)/
│       └── settings/
│           └── page.tsx
├── lib/
│   ├── auth.ts
│   └── bigquery.ts
├── middleware.ts
└── types/
    └── next-auth.d.ts
scripts/
└── setup-bigquery.sql
.env.local.example
```

---

## Criterios de aceptación

**Infraestructura:**
- [ ] Dataset `greenhouse` existe en BigQuery proyecto `efeonce-group`
- [ ] Tabla `greenhouse.clients` creada con el schema especificado
- [ ] Registro de prueba insertado para `jreyes@efeoncepro.com` con role `admin`
- [ ] Script SQL documentado en `scripts/setup-bigquery.sql`
- [ ] Variables de entorno configuradas en Vercel via CLI (AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL)

**Auth funcional:**
- [ ] Login con Microsoft redirige a pantalla de consentimiento de Microsoft y retorna al portal
- [ ] Login con email + password valida contra BigQuery y crea sesión
- [ ] Ambos providers coexisten en la misma página de login
- [ ] Usuario Microsoft no registrado en `greenhouse.clients` ve página de acceso denegado
- [ ] Usuario Microsoft registrado obtiene sesión con `client_id`, `role`, `projectIds`

**Vinculación de identidad:**
- [ ] Primera vez que un usuario Microsoft inicia sesión, se guardan `microsoft_oid`, `microsoft_tenant_id`, `microsoft_email`
- [ ] Logins posteriores usan `microsoft_oid` para lookup
- [ ] Campo `auth_provider` se actualiza correctamente
- [ ] `last_login_at` y `last_login_provider` se actualizan en cada login

**Dominio organizacional:**
- [ ] Si un email `usuario@acme.com` inicia sesión por Microsoft y `acme.com` está en `allowed_email_domains`, se le otorga acceso

**Seguridad:**
- [ ] Middleware protege todas las rutas excepto login y access-denied
- [ ] Credenciales de BigQuery nunca expuestas al browser
- [ ] `NEXTAUTH_SECRET` firma todos los JWT

**UI:**
- [ ] Página de login con botón Microsoft (#0078D4) como CTA principal + formulario credentials como fallback
- [ ] Página de acceso denegado con mensaje claro y botón de retorno
- [ ] Sin opción de registro visible
- [ ] Branding Greenhouse (Deep Azure #023c70)

---

## Lo que NO incluye esta tarea

- La creación de la App Registration en Azure Portal (ya fue hecha)
- Agregar el redirect URI de localhost en Azure Portal (documentar en README, se hace manualmente)
- Las vistas del dashboard (KPIs, charts, proyectos) — tareas separadas

---

## Notas técnicas

- Usar `next-auth` v4.x (no v5/Auth.js beta). El provider `azure-ad` está en el paquete principal de v4.
- El campo `oid` en el profile de Microsoft es el Object ID único del usuario. Más estable que email.
- `tid` en el profile es el Tenant ID de la organización.
- `tenantId: 'common'` acepta cualquier directorio Microsoft (multi-tenant).
- El `callbackUrl` después de login debe ser `/dashboard`.
- Email admin: `jreyes@efeoncepro.com`, dominios Efeonce: `efeoncepro.com` y `efeonce.org`.
- Para BigQuery ARRAY<STRING>: usar `UNNEST()` en queries.
