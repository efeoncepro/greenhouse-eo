# CODEX TASK — Sistema de Emails Transaccionales para Greenhouse

## Estado 2026-03-19

Brief normalizado contra la arquitectura viva de auth y runtime del repo.

La direccion funcional del task se mantiene:
- Resend para envio
- PostgreSQL para tokens y mutaciones de auth
- BigQuery solo para logging y auditoria
- flujos de `forgot password`, `invite`, `accept invite` y `verify email`

Pero la implementacion debe respetar estas reglas actuales:
- Greenhouse no usa `middleware.ts` como boundary de auth
- PostgreSQL se monta con scripts especializados por dominio, no con un `setup-postgres.sql` monolitico
- la capa de auth runtime ya vive sobre `greenhouse_core.client_users` y helpers compartidos de acceso PostgreSQL
- `client_id` sigue siendo el tenant base del auth principal, pero el runtime ya carga tambien `space_id` y `organization_id` como contexto adicional cuando corresponde

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/tasks/to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

## Resumen

Implementar el sistema de emails transaccionales de Efeonce Greenhouse™ que cubre reset de contraseña, invitación de usuarios y verificación de email. Utiliza Resend como servicio de envío, React Email para templates con branding Greenhouse, PostgreSQL como data store transaccional (tokens, user lookup, password updates), y BigQuery como log de auditoría (OLAP).

**Supersede:** Greenhouse Transactional Email Spec v1.0 (que usaba BigQuery para todo). Esta versión alinea el sistema con Services Architecture v1 e Identity & Access V2.

**Decisión de arquitectura:** Se descartó HubSpot como canal de envío porque la Single Send API requiere Marketing Hub Enterprise, y la Transactional Email API requiere Marketing Pro + add-on. Con Marketing Starter, no hay vía programática para disparar emails desde una API Route. Resend resuelve el caso por $0 con integración nativa a Next.js.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/transactional-email`
- **Framework:** Next.js 14+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **Auth library:** NextAuth.js v4 (ya implementada con Microsoft SSO + Google SSO + Credentials)
- **Deploy:** Vercel Pro (auto-deploy desde `main`, preview desde feature branches)
- **OLTP:** PostgreSQL — Cloud SQL instancia `greenhouse-pg-dev`, schema `greenhouse_core`
- **OLAP:** BigQuery — proyecto `efeonce-group`, dataset `greenhouse`
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`

---

## Documentos de referencia

Leer antes de implementar:

- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — modelo RBAC, `client_users`, `user_role_assignments`, session payload
- `GREENHOUSE_ARCHITECTURE_V1.md` — principios base del portal y reglas de auth/runtime
- `MULTITENANT_ARCHITECTURE.md` — boundary de tenant, session resolution y guardas por layout
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles de acceso y patron operativo para PostgreSQL
- `Greenhouse_Services_Architecture_v1.md` — decisión PostgreSQL OLTP + BigQuery OLAP
- `Greenhouse_Portal_Spec_v1.md` — arquitectura base del portal
- `Greenhouse_Nomenclatura_Portal_v3.md` — convenciones de naming, microcopy, constants

---

## Environment variables

Variables que ya existen o se deben agregar en Vercel. El código debe referenciarlas:

| Variable | Descripción | Estado |
|---|---|---|
| `RESEND_API_KEY` | API key de Resend (re_xxxxx) | **Agregar** |
| `EMAIL_FROM` | `greenhouse@efeoncepro.com` | **Agregar** |
| `NEXT_PUBLIC_APP_URL` | `https://greenhouse.efeoncepro.com` | Ya existe |
| `DATABASE_URL` | PostgreSQL connection string (Cloud SQL) | Ya existe |
| `NEXTAUTH_SECRET` | Secret para firmar JWT de sesiones y tokens | Ya existe |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Service account key para BigQuery (base64 encoded) | Ya existe |

**NUNCA hardcodear la `RESEND_API_KEY` en código ni commitear en el repo.**

---

## Alcance completo de la tarea

### PARTE A: Infraestructura PostgreSQL

#### A1. Crear tabla `greenhouse_core.auth_tokens`

Ejecutar en Cloud SQL (`greenhouse-pg-dev`):

```sql
CREATE TABLE IF NOT EXISTS greenhouse_core.auth_tokens (
  token_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES greenhouse_core.client_users(user_id),
  email        TEXT NOT NULL,
  client_id    UUID REFERENCES greenhouse_core.clients(client_id),
  token_type   TEXT NOT NULL CHECK (token_type IN ('reset', 'invite', 'verify')),
  token_hash   TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN DEFAULT false,
  used_at      TIMESTAMPTZ
);

CREATE INDEX idx_auth_tokens_hash ON greenhouse_core.auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_email_type ON greenhouse_core.auth_tokens(email, token_type);
```

**Notas:**
- `user_id` es nullable para invitaciones donde el usuario aún no existe.
- `email` se denormaliza para soportar el flujo de anti-enumeración (se necesita buscar por email sin JOIN a client_users).
- `token_hash` almacena SHA-256 del JWT, nunca el JWT plano.

#### A2. Crear tabla `greenhouse.email_logs` en BigQuery

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.email_logs` (
  log_id         STRING NOT NULL,
  resend_id      STRING,
  email_to       STRING NOT NULL,
  email_type     STRING NOT NULL,
  user_id        STRING,
  client_id      STRING,
  status         STRING NOT NULL,
  error_message  STRING,
  sent_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

Esta tabla es write-only desde el contexto de este sistema. Se usa para analytics y auditoría.

#### A3. Agregar DDL al setup PostgreSQL del dominio

No usar un `scripts/setup-postgres.sql` genérico como fuente principal. Este repo ya opera con scripts especializados por dominio.

Implementación recomendada:
- crear `scripts/setup-postgres-transactional-email.sql`
- crear `scripts/setup-postgres-transactional-email.ts`
- agregar comando canónico en `package.json`, por ejemplo:

```json
{
  "scripts": {
    "setup:postgres:transactional-email": "tsx scripts/setup-postgres-transactional-email.ts"
  }
}
```

El SQL de `auth_tokens` debe vivir en ese archivo dedicado, con comentario:

```sql
-- ══════════════════════════════════════════════════════
-- Transactional Email System — auth_tokens
-- Ref: CODEX_TASK_Transactional_Email_System.md
-- ══════════════════════════════════════════════════════
```

---

### PARTE B: Dependencias y configuración

#### B1. Instalar dependencias

```bash
pnpm add resend @react-email/components react-email
pnpm add -D @types/jsonwebtoken
pnpm add jsonwebtoken bcryptjs
```

**Nota:** `bcryptjs` ya debería estar instalado (se usa en el flujo de Credentials auth). Verificar con `pnpm list bcryptjs`. Si ya existe, no reinstalar.

#### B2. Agregar script de preview de emails a `package.json`

```json
{
  "scripts": {
    "email:dev": "email dev --dir src/emails --port 3001"
  }
}
```

#### B3. Crear helper de Resend

Archivo: `src/lib/resend.ts`

```typescript
import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Efeonce Greenhouse <greenhouse@efeoncepro.com>'
```

#### B4. Crear helper de tokens transaccionales

Archivo: `src/lib/auth-tokens.ts`

Funciones necesarias:

- `generateToken(payload: { user_id?: string, email: string, client_id?: string, type: 'reset' | 'invite' | 'verify' }, expiresInHours: number): string` — Genera JWT firmado con `NEXTAUTH_SECRET`, retorna el JWT string.
- `storeToken(token: string, payload: TokenPayload): Promise<void>` — Calcula SHA-256 del JWT e inserta en `greenhouse_core.auth_tokens`.
- `validateToken(token: string): Promise<TokenRecord | null>` — Decodifica JWT, busca hash en PostgreSQL, verifica expiración y que no fue usado.
- `consumeToken(tokenHash: string): Promise<void>` — Marca `used = true` y `used_at = now()` en PostgreSQL.
- `checkRateLimit(email: string, type: string, maxPerHour: number): Promise<boolean>` — Cuenta tokens creados en la última hora para ese email y tipo.

**Patrón para hash:**

```typescript
import { createHash } from 'crypto'

function hashToken(jwt: string): string {
  return createHash('sha256').update(jwt).digest('hex')
}
```

**Queries contra PostgreSQL**, no BigQuery. Reutilizar la capa de acceso PostgreSQL compartida del repo y sus perfiles runtime/migrator.

No asumir `src/lib/db.ts` como contrato principal. Revisar primero:
- `src/lib/postgres/client.ts`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/identity-store.ts`

---

### PARTE C: Templates React Email

#### C1. Crear layout base

Archivo: `src/emails/components/EmailLayout.tsx`

Estructura visual de todos los emails:

- **Wrapper:** Fondo `#F7F9FC`, max-width 600px, centrado
- **Header:** Fondo Midnight Navy `#022a4e`, logo Efeonce en blanco centrado, padding 24px
- **Body card:** Fondo `#FFFFFF`, padding 40px, border-radius 8px, sombra sutil (`0 1px 3px rgba(0,0,0,0.08)`)
- **Footer:** `DM Sans` 13px, color `#667085`, texto "Efeonce Greenhouse™ · Empower your Growth" con link de soporte

**Props:**

```typescript
interface EmailLayoutProps {
  children: React.ReactNode
  previewText?: string
}
```

#### C2. Crear botón CTA reutilizable

Archivo: `src/emails/components/EmailButton.tsx`

- Background: Core Blue `#0375db`
- Texto: blanco, `Poppins` SemiBold 16px
- Padding: 12px 32px
- Border-radius: 6px
- Hover: no aplica en email, pero usar border fallback para Outlook

#### C3. Crear template PasswordResetEmail

Archivo: `src/emails/PasswordResetEmail.tsx`

| Elemento | Valor |
|---|---|
| **From** | Efeonce Greenhouse `<greenhouse@efeoncepro.com>` |
| **Subject** | Restablece tu contraseña — Greenhouse |
| **Preview text** | Recibimos una solicitud para restablecer tu contraseña |
| **Heading** | ¿Necesitas restablecer tu contraseña? |
| **Body** | Recibimos una solicitud para restablecer la contraseña de tu cuenta en Greenhouse. Haz clic en el botón para crear una nueva contraseña. Este enlace expira en 1 hora. |
| **CTA** | Restablecer contraseña → `{resetUrl}` |
| **Footer note** | Si no solicitaste esto, puedes ignorar este mensaje. Tu contraseña actual no ha sido modificada. |

**Props:**

```typescript
interface PasswordResetEmailProps {
  resetUrl: string
  userName?: string
}
```

#### C4. Crear template InvitationEmail

Archivo: `src/emails/InvitationEmail.tsx`

| Elemento | Valor |
|---|---|
| **Subject** | Te invitaron a Greenhouse — Efeonce |
| **Preview text** | {inviterName} te invitó a Greenhouse |
| **Heading** | Bienvenido a Greenhouse |
| **Body** | {inviterName} te invitó a unirte a {clientName} en Efeonce Greenhouse™. Haz clic en el botón para crear tu cuenta. Este enlace expira en 72 horas. |
| **CTA** | Crear mi cuenta → `{inviteUrl}` |

**Props:**

```typescript
interface InvitationEmailProps {
  inviteUrl: string
  inviterName: string
  clientName: string
  userName?: string
}
```

#### C5. Crear template VerifyEmail

Archivo: `src/emails/VerifyEmail.tsx`

| Elemento | Valor |
|---|---|
| **Subject** | Verifica tu email — Greenhouse |
| **Preview text** | Confirma tu dirección de correo |
| **Heading** | Confirma tu dirección de correo |
| **Body** | Necesitamos verificar que esta dirección de correo te pertenece. Haz clic en el botón para confirmar. Este enlace expira en 24 horas. |
| **CTA** | Verificar email → `{verifyUrl}` |

**Props:**

```typescript
interface VerifyEmailProps {
  verifyUrl: string
  userName?: string
}
```

#### C6. Design tokens constantes

Crear archivo `src/emails/constants.ts` con los tokens de diseño:

```typescript
export const EMAIL_COLORS = {
  background: '#F7F9FC',
  containerBg: '#FFFFFF',
  headerBg: '#022a4e',    // Midnight Navy
  primary: '#0375db',     // Core Blue
  text: '#1A1A2E',
  muted: '#667085',
} as const

export const EMAIL_FONTS = {
  heading: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
} as const
```

---

### PARTE D: API Routes

#### D1. POST `/api/auth/forgot-password`

Archivo: `src/app/api/auth/forgot-password/route.ts`

**Flujo:**

1. Recibe `{ email: string }` del body
2. Validar formato de email
3. Verificar rate limit: máximo 3 solicitudes por email por hora (consultar `greenhouse_core.auth_tokens`)
4. Buscar usuario en `greenhouse_core.client_users` por email (`WHERE email = $1 AND status = 'active'`)
5. **Si no existe, retornar 200 OK igualmente** (previene enumeración de usuarios). No enviar email.
6. Si existe: generar JWT con payload `{ user_id, email, client_id, type: 'reset' }`, expiración 1 hora
7. Almacenar hash del token en `greenhouse_core.auth_tokens`
8. Enviar email via Resend con template `PasswordResetEmail`, URL: `${NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${jwt}`
9. Registrar evento en BigQuery `greenhouse.email_logs`
10. Retornar `{ success: true, message: 'Si tu email está registrado, recibirás un enlace para restablecer tu contraseña.' }`

**Importante:** Siempre retornar el mismo mensaje genérico, exista o no el email.

```typescript
export async function POST(request: Request) {
  const { email } = await request.json()
  
  // Rate limit check
  const withinLimit = await checkRateLimit(email, 'reset', 3)
  if (!withinLimit) {
    return Response.json(
      { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en una hora.' },
      { status: 429 }
    )
  }
  
  // Lookup user in PostgreSQL
  const user = await getUserByEmail(email) // greenhouse_core.client_users
  
  if (user) {
    const token = generateToken({
      user_id: user.user_id,
      email: user.email,
      client_id: user.client_id,
      type: 'reset'
    }, 1) // 1 hour
    
    await storeToken(token, { user_id: user.user_id, email, client_id: user.client_id, type: 'reset' })
    
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`
    
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Restablece tu contraseña — Greenhouse',
      react: PasswordResetEmail({ resetUrl, userName: user.full_name })
    })
    
    await logEmail({ email_to: email, email_type: 'password_reset', user_id: user.user_id, client_id: user.client_id, status: 'sent' })
  }
  
  // Always return same response
  return Response.json({
    success: true,
    message: 'Si tu email está registrado, recibirás un enlace para restablecer tu contraseña.'
  })
}
```

#### D2. GET `/api/auth/reset-password` + POST `/api/auth/reset-password`

**GET** — Página de formulario de nueva contraseña. La validación del token ocurre al cargar la página.

**Pero como usamos Next.js App Router, esto debería ser una page, no una API Route.**

Crear page: `src/app/(blank-layout-pages)/auth/reset-password/page.tsx`

**Flujo de la page (client component):**

1. Leer `token` del query param
2. Si no hay token, mostrar error
3. Validar token via API: `POST /api/auth/validate-token` con `{ token }`
4. Si válido, mostrar formulario de nueva contraseña
5. Al submit: `POST /api/auth/reset-password` con `{ token, password }`

**API Route POST `/api/auth/reset-password`:**

Archivo: `src/app/api/auth/reset-password/route.ts`

```typescript
export async function POST(request: Request) {
  const { token, password } = await request.json()
  
  // 1. Validate token
  const tokenRecord = await validateToken(token)
  if (!tokenRecord || tokenRecord.token_type !== 'reset') {
    return Response.json({ success: false, message: 'Enlace inválido o expirado.' }, { status: 400 })
  }
  
  // 2. Hash new password
  const bcrypt = require('bcryptjs')
  const passwordHash = await bcrypt.hash(password, 12)
  
  // 3. Update password in PostgreSQL
  await updateUserPassword(tokenRecord.user_id, passwordHash) // greenhouse_core.client_users
  
  // 4. Consume token
  await consumeToken(tokenRecord.token_hash)
  
  return Response.json({ success: true, message: 'Contraseña actualizada.' })
}
```

**Helper `updateUserPassword`:**

```sql
UPDATE greenhouse_core.client_users
SET password_hash = $1, updated_at = now()
WHERE user_id = $2
```

#### D3. POST `/api/auth/validate-token`

Archivo: `src/app/api/auth/validate-token/route.ts`

Endpoint auxiliar para que la page de reset valide el token antes de mostrar el formulario.

```typescript
export async function POST(request: Request) {
  const { token } = await request.json()
  const record = await validateToken(token)
  
  if (!record) {
    return Response.json({ valid: false, message: 'Enlace inválido o expirado.' })
  }
  
  return Response.json({ valid: true, tokenType: record.token_type })
}
```

#### D4. POST `/api/admin/invite`

Archivo: `src/app/api/admin/invite/route.ts`

**Requiere:** sesión autenticada con `efeonce_admin` en `roleCodes`.

**Body:**

```typescript
{
  email: string
  full_name: string
  client_id: string           // tenant al que pertenece
  role_codes: string[]        // ej: ['client_executive'] o ['collaborator', 'hr_manager']
  tenant_type: 'client' | 'efeonce_internal'
}
```

**Flujo:**

1. Verificar sesión y que el usuario tiene rol `efeonce_admin`
2. Verificar que `role_codes` existen en `greenhouse_core.roles`
3. Verificar que el email no está ya registrado en `client_users`
4. Crear registro en `greenhouse_core.client_users` con `status = 'pending'`, `auth_mode = 'credentials'`, sin `password_hash`
5. Insertar registros en `greenhouse_core.user_role_assignments` para cada `role_code`
6. Generar token de invitación (tipo `invite`, expiración 72 horas)
7. Enviar email via Resend con template `InvitationEmail`
8. Registrar en BigQuery `email_logs`

**Default roles por `tenant_type`** (alineado con Identity & Access V2):
- Si `tenant_type = 'efeonce_internal'`, agregar `collaborator` a `role_codes` si no está incluido
- Si `tenant_type = 'client'` y no se especifican roles, default a `['client_executive']`

#### D5. POST `/api/auth/accept-invite`

Archivo: `src/app/api/auth/accept-invite/route.ts`

Endpoint que el invitado usa para establecer su contraseña y activar su cuenta.

**Body:** `{ token: string, password: string }`

**Flujo:**

1. Validar token (tipo `invite`)
2. Hash de contraseña con bcrypt (salt rounds = 12)
3. UPDATE `greenhouse_core.client_users` SET `password_hash = $1, status = 'active'` WHERE `user_id = $2`
4. Consumir token
5. Retornar success, redirigir a `/login`

**Page correspondiente:** `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx` — formulario donde el invitado establece su contraseña.

#### D6. POST `/api/auth/verify-email`

Archivo: `src/app/api/auth/verify-email/route.ts`

Flujo similar al reset pero con `type = 'verify'` y expiración de 24 horas. Se dispara cuando un usuario cambia su email o como paso de onboarding.

---

### PARTE E: Páginas UI (blank-layout)

Estas páginas viven bajo `src/app/(blank-layout-pages)/auth/` para usar el layout sin sidebar de Vuexy.

#### E1. Página forgot-password

Archivo: `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`

- Formulario con campo de email
- Botón "Enviar enlace de recuperación"
- Link "Volver al login"
- Al submit: POST a `/api/auth/forgot-password`
- Mostrar mensaje de éxito genérico (siempre el mismo, exista o no el email)
- **Branding:** Logo Greenhouse, colores Midnight Navy / Core Blue
- **Referencia Vuexy:** Buscar la página de forgot-password en la full-version y adaptar al branding Greenhouse

#### E2. Página reset-password

Archivo: `src/app/(blank-layout-pages)/auth/reset-password/page.tsx`

- Lee `token` del query param
- Valida token via `/api/auth/validate-token`
- Si inválido: muestra mensaje de error + link a forgot-password
- Si válido: formulario con campo de nueva contraseña + confirmación
- Validación de contraseña: mínimo 8 caracteres
- Al submit: POST a `/api/auth/reset-password`
- Success: redirige a `/login` con mensaje "Contraseña actualizada"

#### E3. Página accept-invite

Archivo: `src/app/(blank-layout-pages)/auth/accept-invite/page.tsx`

- Lee `token` del query param
- Valida token via `/api/auth/validate-token`
- Si inválido: muestra mensaje de error + instrucción de contactar admin
- Si válido: muestra nombre del invitado (del token) + formulario de contraseña
- Al submit: POST a `/api/auth/accept-invite`
- Success: redirige a `/login` con mensaje "Cuenta creada"

---

### PARTE F: Configuración DNS (manual — Julio)

**Esto NO lo hace el agente. Lo hace Julio manualmente en Hostgator cPanel.**

Después de crear la cuenta en Resend y verificar el dominio `efeoncepro.com`, agregar estos registros DNS:

| Tipo | Host | Valor | Propósito |
|---|---|---|---|
| TXT | `@` | (proporcionado por Resend al verificar dominio) | SPF |
| CNAME | `resend._domainkey` | (proporcionado por Resend) | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@efeoncepro.com` | DMARC |

**Importante:** Verificar que los registros SPF existentes (Google Workspace, HubSpot) se combinen en un solo registro TXT. No puede haber múltiples registros SPF para el mismo dominio.

---

### PARTE G: Helper de logging a BigQuery

Archivo: `src/lib/email-log.ts`

Función `logEmail()` que inserta en BigQuery `greenhouse.email_logs`. Usar el helper de BigQuery existente (`src/lib/bigquery.ts`).

```typescript
import { v4 as uuid } from 'uuid'
import { bigquery } from './bigquery'

interface EmailLogEntry {
  email_to: string
  email_type: 'password_reset' | 'invitation' | 'verification'
  user_id?: string
  client_id?: string
  status: 'sent' | 'failed' | 'bounced'
  resend_id?: string
  error_message?: string
}

export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    await bigquery
      .dataset('greenhouse')
      .table('email_logs')
      .insert([{
        log_id: uuid(),
        ...entry,
        sent_at: new Date().toISOString()
      }])
  } catch (error) {
    // Log failure should not break the email flow
    console.error('Failed to log email event:', error)
  }
}
```

**Importante:** El logging a BigQuery NUNCA debe bloquear ni romper el flujo de envío de email. Si falla el INSERT, se logea el error en console y se continúa.

---

## Estructura de archivos resultante

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── forgot-password/
│   │       │   └── route.ts
│   │       ├── reset-password/
│   │       │   └── route.ts
│   │       ├── validate-token/
│   │       │   └── route.ts
│   │       ├── accept-invite/
│   │       │   └── route.ts
│   │       ├── verify-email/
│   │       │   └── route.ts
│   │       └── [...nextauth]/
│   │           └── route.ts          # ya existe, no modificar
│   ├── (blank-layout-pages)/
│   │   └── auth/
│   │       ├── forgot-password/
│   │       │   └── page.tsx
│   │       ├── reset-password/
│   │       │   └── page.tsx
│   │       ├── accept-invite/
│   │       │   └── page.tsx
│   │       └── access-denied/
│   │           └── page.tsx          # ya existe, no modificar
│   └── (dashboard)/
│       └── admin/
│           └── invite/               # futuro — UI de invitación en admin panel
├── emails/
│   ├── components/
│   │   ├── EmailLayout.tsx
│   │   ├── EmailButton.tsx
│   │   └── EmailFooter.tsx
│   ├── constants.ts
│   ├── PasswordResetEmail.tsx
│   ├── InvitationEmail.tsx
│   └── VerifyEmail.tsx
├── lib/
│   ├── resend.ts                     # NUEVO
│   ├── auth-tokens.ts                # NUEVO
│   ├── email-log.ts                  # NUEVO
│   ├── auth.ts                       # ya existe, no modificar
│   ├── bigquery.ts                   # ya existe, usar para email_logs
│   └── postgres/
│       └── client.ts                 # capa compartida existente, reutilizar
└── types/
    └── next-auth.d.ts                # ya existe, no modificar
scripts/
├── setup-postgres-transactional-email.sql
└── setup-postgres-transactional-email.ts
```

---

## Superficie pública de auth

Greenhouse no usa `middleware.ts` como boundary de autenticación. La protección de rutas ocurre por layout guards y por `getTenantContext()` / `getServerSession()`.

Para este task, el criterio correcto es:
- las páginas bajo `src/app/(blank-layout-pages)/auth/*` deben permanecer públicas
- las API routes de reset/invite/verify deben validar token o payload por sí mismas, sin requerir sesión
- `/api/admin/invite` sí debe requerir sesión válida y rol `efeonce_admin`

No introducir lógica nueva en `middleware.ts` para este sistema salvo que la arquitectura cambie explícitamente.

---

## Criterios de aceptación

**Infraestructura:**
- [ ] Tabla `greenhouse_core.auth_tokens` creada en Cloud SQL con los índices especificados
- [ ] Tabla `greenhouse.email_logs` creada en BigQuery
- [ ] DDL documentado en un setup dedicado tipo `scripts/setup-postgres-transactional-email.sql`
- [ ] Variable `RESEND_API_KEY` configurada en Vercel (no hardcodeada)
- [ ] Variable `EMAIL_FROM` configurada en Vercel

**Reset de contraseña (P0):**
- [ ] Formulario forgot-password envía email via Resend con branding Greenhouse
- [ ] Email contiene botón con link funcional a reset-password
- [ ] Token expira en 1 hora
- [ ] Token es de un solo uso
- [ ] Rate limit de 3 solicitudes por email por hora funciona
- [ ] Anti-enumeración: respuesta idéntica si el email existe o no
- [ ] Nueva contraseña se guarda hasheada (bcrypt, 12 rounds) en `greenhouse_core.client_users`
- [ ] Token consumido queda marcado en `greenhouse_core.auth_tokens`
- [ ] Evento registrado en `greenhouse.email_logs` (BigQuery)

**Invitación de usuario (P1):**
- [ ] Admin puede invitar usuario con roles específicos via `/api/admin/invite`
- [ ] Se crea registro en `client_users` con `status = 'pending'`
- [ ] Se crean registros en `user_role_assignments` para cada `role_code`
- [ ] Email de invitación se envía con template InvitationEmail
- [ ] Token de invitación expira en 72 horas
- [ ] Página accept-invite permite establecer contraseña y activa la cuenta
- [ ] Solo accesible para sesiones con rol `efeonce_admin`

**Verificación de email (P1):**
- [ ] API Route `/api/auth/verify-email` genera token de verificación (24h)
- [ ] Email se envía con template VerifyEmail

**Templates:**
- [ ] Los 3 templates renderizan correctamente en Gmail, Outlook y Apple Mail
- [ ] Branding Greenhouse consistente: Midnight Navy header, Core Blue CTA, Poppins/DM Sans
- [ ] Preview con `pnpm email:dev` funciona en localhost:3001

**Seguridad:**
- [ ] JWT firmado con NEXTAUTH_SECRET
- [ ] Token hasheado (SHA-256) en PostgreSQL, nunca almacenado plano
- [ ] Todos los links apuntan a HTTPS (greenhouse.efeoncepro.com)
- [ ] Las páginas públicas de auth funcionan sin sesión y sin depender de `middleware.ts`
- [ ] `/api/admin/invite` valida rol `efeonce_admin` antes de proceder
- [ ] Logging a BigQuery no rompe el flujo si falla

---

## Lo que NO incluye esta tarea

- Creación de la cuenta en Resend (lo hace Julio manualmente)
- Configuración DNS en Hostgator cPanel (lo hace Julio manualmente, documentado en Parte F)
- UI del panel de admin para invitar usuarios (solo la API Route; la UI es tarea separada)
- Migración de datos de BigQuery `greenhouse.clients` a PostgreSQL `greenhouse_core.client_users` (ya se hizo o es tarea de Identity & Access V2)
- Flujo de cambio de email desde settings (trigerea verify-email pero la UI de settings es tarea separada)

---

## Notas técnicas

- Usar `next-auth` v4.x (ya instalado). No modificar la configuración de auth existente.
- PostgreSQL queries via la capa compartida ya vigente del repo (`src/lib/postgres/client.ts` y helpers de auth/tenant cuando aplique). No crear conexiones nuevas ad-hoc.
- BigQuery queries via el helper existente (`src/lib/bigquery.ts`). Solo INSERT para email_logs.
- El campo `user_id` en Identity & Access V2 es UUID. Todos los FKs en auth_tokens son UUID.
- El JWT payload de los tokens transaccionales es independiente del JWT de sesión de NextAuth. Usan el mismo secret (NEXTAUTH_SECRET) pero son tokens diferentes con payloads diferentes.
- Para Google Fonts en emails (Poppins, DM Sans): usar `@import` web fonts con fallback a `-apple-system, BlinkMacSystemFont, sans-serif`. Los clientes de email que no soporten web fonts caerán al fallback.
- bcrypt salt rounds = 12, consistente con el flujo de Credentials auth existente.
- El `client_id` en este contexto sigue siendo el tenant base del auth principal. El identificador de persona/principal es `user_id`. Si el runtime necesita contexto operativo adicional, resolverlo desde `space_id` y `organization_id` sin cambiar la semántica del token transaccional.
