# CODEX TASK — Agregar Google SSO a Greenhouse Portal

## Resumen

Agregar Google como tercer provider de autenticación en el portal Greenhouse. **Microsoft SSO y Credentials ya están implementados y funcionando.** Esta tarea agrega Google SSO sobre la infraestructura existente sin modificar lo que ya funciona.

---

## Contexto — lo que ya existe

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/google-sso` (crear desde la rama actual, NO desde `main` si `feature/microsoft-sso` aún no fue mergeada)
- **Auth implementada:** NextAuth.js v4 con 2 providers (Azure AD + Credentials)
- **Archivos existentes que se modifican:**
  - `src/lib/auth.ts` — authOptions con providers y callbacks
  - `src/lib/bigquery.ts` — helpers de consulta
  - `src/views/Login.tsx` (o la page de login en `src/app/(blank-layout-pages)/login/`)
  - `src/types/next-auth.d.ts` — type extensions
  - `src/app/(blank-layout-pages)/auth/access-denied/page.tsx` — ya existe
  - `src/middleware.ts` — ya existe, no necesita cambios
- **Tabla BigQuery:** `efeonce-group.greenhouse.clients` ya existe con campos de Microsoft

---

## Alcance de la tarea

### 1. Agregar columnas a la tabla BigQuery

Ejecutar ALTER TABLE para agregar los campos de Google a la tabla existente:

```sql
ALTER TABLE `efeonce-group.greenhouse.clients`
ADD COLUMN IF NOT EXISTS google_sub STRING,
ADD COLUMN IF NOT EXISTS google_email STRING;
```

Agregar este SQL al archivo `scripts/setup-bigquery.sql` existente como sección separada con comentario.

### 2. Instalar dependencia (si no existe)

El provider de Google ya viene incluido en `next-auth`. No se necesita instalar nada adicional. Verificar con:

```bash
pnpm list next-auth
```

### 3. Agregar Google Provider a NextAuth

**Referencia Vuexy:** La full-version ya trae `GoogleProvider` implementado en `src/libs/auth.ts`. Usar ese archivo como referencia para el patrón de configuración. La full-version también usa `PrismaAdapter` para Google, pero **NO usamos Prisma** — nosotros usamos BigQuery con JWT strategy. Tomar solo el provider, no el adapter.

En `src/lib/auth.ts` (o `src/libs/auth.ts` si Codex siguió la convención de Vuexy), agregar el provider de Google al array `providers` existente, junto a los que ya están (Azure AD y Credentials):

```typescript
import GoogleProvider from 'next-auth/providers/google'

// Agregar al array providers (NO reemplazar los existentes):
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!
})
```

### 4. Agregar funciones al helper de BigQuery

En `src/lib/bigquery.ts`, agregar estas dos funciones (sin modificar las existentes):

```typescript
export async function getClientByGoogleSub(sub: string) {
  const [rows] = await bigquery.query({
    query: `
      SELECT * FROM \`efeonce-group.greenhouse.clients\`
      WHERE google_sub = @sub AND active = TRUE
      LIMIT 1
    `,
    params: { sub }
  })
  return rows[0] || null
}

export async function linkGoogleIdentity(
  clientId: string,
  sub: string,
  googleEmail: string
) {
  await bigquery.query({
    query: `
      UPDATE \`efeonce-group.greenhouse.clients\`
      SET google_sub = @sub,
          google_email = @googleEmail,
          auth_provider = CASE
            WHEN auth_provider = 'credentials' THEN 'both'
            ELSE auth_provider
          END
      WHERE client_id = @clientId
    `,
    params: { sub, googleEmail, clientId }
  })
}
```

### 5. Actualizar callback `signIn` en auth.ts

En el callback `signIn` de `src/lib/auth.ts`, agregar el bloque de Google **antes** del `return false` final. No modificar el bloque de `azure-ad` ni `credentials` que ya existen:

```typescript
// Agregar DESPUÉS del bloque if (account?.provider === 'azure-ad') { ... }
// y ANTES del return false

if (account?.provider === 'google') {
  const googleEmail = (profile as any)?.email || user.email
  const googleSub = (profile as any)?.sub

  if (!googleEmail) return false

  // Buscar por Google ID (vinculación previa)
  let client = await getClientByGoogleSub(googleSub)

  // Si no hay vinculación previa, buscar por email
  if (!client) {
    client = await getClientByEmail(googleEmail)
  }

  // Si no hay registro, buscar por dominio (Google Workspace)
  if (!client) {
    const domain = googleEmail.split('@')[1]
    client = await getClientByEmailDomain(domain)
  }

  if (!client || !client.active) {
    return '/auth/access-denied'
  }

  // Vincular identidad Google si es primera vez
  if (!client.google_sub) {
    await linkGoogleIdentity(client.client_id, googleSub, googleEmail)
  }

  await updateLastLogin(client.client_id, 'google_sso')
  return true
}
```

### 6. Actualizar callback `jwt` en auth.ts

En el callback `jwt`, agregar el bloque de Google **después** del bloque de `azure-ad`:

```typescript
// Agregar DESPUÉS del bloque if (account?.provider === 'azure-ad') { ... }

if (account?.provider === 'google') {
  const googleSub = (profile as any)?.sub
  const client = await getClientByGoogleSub(googleSub)
    || await getClientByEmail(token.email as string)

  if (client) {
    token.clientId = client.client_id
    token.role = client.role
    token.projectIds = client.notion_project_ids
    token.hubspotCompanyId = client.hubspot_company_id
    token.provider = 'google_sso'
  }
}
```

El callback `session` no necesita cambios — ya pasa `token.provider` a la sesión.

### 7. Agregar botón de Google en la página de login

**Referencia Vuexy:** La full-version ya tiene un botón de "Login with Google" implementado en `src/views/Login.tsx`. Buscar en ese archivo el componente/botón de Google y reutilizar su patrón visual (ícono, estilo, onClick handler). La full-version usa `signIn('google')` de `next-auth/react` — mismo patrón que necesitamos.

Si la tarea de Microsoft SSO ya modificó la página de login y eliminó los social buttons de Vuexy, recuperar el patrón del botón de Google desde la full-version (`full-version/src/views/Login.tsx`) y adaptarlo.

En la página de login existente, agregar un botón de Google **debajo** del botón de Microsoft y **arriba** del divisor "o":

```typescript
// Botón de Google — debajo del de Microsoft
<Button
  fullWidth
  variant='outlined'
  sx={{
    color: 'text.primary',
    borderColor: 'divider',
    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
  }}
  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
  startIcon={<i className='tabler-brand-google' />}
>
  Iniciar sesión con Google
</Button>
```

**Jerarquía visual resultante:**

```
[ 🪟  Iniciar sesión con Microsoft ]    ← Botón contained azul #0078D4 (ya existe)
[ G   Iniciar sesión con Google    ]    ← Botón outlined gris (NUEVO)

──────────── o ────────────            ← Divider (ya existe)

[Email                            ]    ← (ya existe)
[Password                         ]    ← (ya existe)
[   Iniciar sesión                ]    ← (ya existe)
```

Para el ícono de Google, usar el sistema de íconos de Vuexy (Iconify): `tabler-brand-google` o `mdi:google`. Verificar cuál está disponible en el proyecto.

### 8. Actualizar vista de perfil (/settings)

En la sección "Cuenta vinculada" de `/settings`, agregar una fila para Google (debajo de la de Microsoft):

- Si tiene Google vinculado (`google_sub` no es null): ícono de Google + `google_email` + badge "Verificado"
- Si no tiene Google vinculado: botón "Vincular cuenta Google" que ejecuta `signIn('google')`

### 9. Configurar variables de entorno en Vercel

```bash
echo "<GOOGLE_CLIENT_ID>" | vercel env add GOOGLE_CLIENT_ID production preview development
echo "<GOOGLE_CLIENT_SECRET>" | vercel env add GOOGLE_CLIENT_SECRET production preview development
```

**IMPORTANTE:** Los valores de `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` se obtienen de GCP Console. Si no existen aún, crearlos siguiendo los pasos del punto 10.

**No confundir** con `GOOGLE_APPLICATION_CREDENTIALS_JSON` que es el service account de BigQuery (ya existe).

### 10. Crear OAuth Client en GCP Console

La creación del OAuth Client de Google generalmente requiere la UI de GCP Console (no se puede hacer completamente por CLI).

**Si ya existe un OAuth consent screen configurado en el proyecto `efeonce-group`:**

1. Ir a https://console.cloud.google.com/apis/credentials?project=efeonce-group
2. Clic en **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Greenhouse Portal`
5. Authorized redirect URIs — agregar estas 3:
   - `https://greenhouse.efeoncepro.com/api/auth/callback/google`
   - `https://dev-greenhouse.efeoncepro.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
6. Clic en **Create**
7. Copiar **Client ID** y **Client Secret** → usar en el paso 9

**Si NO existe un OAuth consent screen:**

Primero configurarlo:

1. Ir a https://console.cloud.google.com/apis/credentials/consent?project=efeonce-group
2. User Type: **"External"**
3. App name: `Efeonce Greenhouse`
4. User support email: `jreyes@efeoncepro.com`
5. Authorized domains: agregar `efeoncepro.com`
6. Developer contact email: `jreyes@efeoncepro.com`
7. Scopes: agregar `email`, `profile`, `openid`
8. Guardar
9. **Publicar la app** (sacarla de modo "Testing") para que cualquier cuenta Google pueda usarla
10. Luego volver al paso de crear el OAuth client ID

**Documentar estos pasos en el README del proyecto** para referencia futura.

### 11. Actualizar `.env.local.example`

Agregar las variables de Google al archivo existente:

```bash
# Google SSO (OAuth — para login, NO confundir con service account)
GOOGLE_CLIENT_ID=<obtener de GCP Console>
GOOGLE_CLIENT_SECRET=<obtener de GCP Console>
```

---

## Criterios de aceptación

- [ ] Columnas `google_sub` y `google_email` agregadas a `greenhouse.clients`
- [ ] Google Provider agregado a NextAuth sin afectar Microsoft ni Credentials
- [ ] Login con Google redirige a consentimiento de Google y retorna al portal
- [ ] Usuario Google no registrado ve página de acceso denegado (la que ya existe)
- [ ] Usuario Google registrado (por email o `allowed_email_domains`) obtiene sesión correcta
- [ ] Primera vez que un usuario Google inicia sesión, se guardan `google_sub` y `google_email`
- [ ] Logins posteriores usan `google_sub` para lookup
- [ ] Botón de Google visible en la página de login, debajo de Microsoft, arriba del divisor
- [ ] Vista de perfil muestra identidad Google vinculada
- [ ] Variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` configuradas en Vercel
- [ ] Todo lo que existía antes (Microsoft SSO, Credentials, middleware, access-denied) sigue funcionando

---

## Lo que NO se modifica

- El bloque de Azure AD en `signIn` callback
- El bloque de Credentials en `authorize`
- El middleware (`src/middleware.ts`)
- La página de acceso denegado (se reutiliza la existente)
- El callback `session` (ya pasa `provider` al cliente)
- Las variables de entorno existentes en Vercel

---

## Notas técnicas

- El provider de Google en next-auth v4 se importa como `next-auth/providers/google`.
- El campo `sub` en el profile de Google es el ID único del usuario. Más estable que el email.
- Google acepta cualquier cuenta por defecto (personal o Google Workspace). No requiere configuración multi-tenant como Azure AD.
- El `allowed_email_domains` funciona igual para Google Workspace: si `acme.com` está registrado, cualquier `@acme.com` que entre por Google obtiene acceso.
- El OAuth consent screen de GCP debe estar en modo "Published" (no "Testing") para que usuarios fuera de la organización puedan usarlo. En modo Testing solo permite 100 usuarios de prueba.
