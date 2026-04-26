# GREENHOUSE_AUTH_SERVER_SESSION_V1

> **Tipo de documento:** Spec de arquitectura canónica
> **Versión:** 1.0
> **Creado:** 2026-04-26 por Claude
> **Última actualización:** 2026-04-26
> **Status:** Vigente — convención obligatoria para todo server component / layout / page nuevo o modificado

---

## 1. Propósito

Definir el patrón canónico de resolución de sesión de NextAuth en **server components, layouts y pages** del portal Greenhouse. Resuelve el problema del antipatrón duplicado `getServerAuthSession() + try/catch + redirect` que enmascaraba errores reales con warnings falsos del framework.

Este documento es la fuente de verdad técnica. Cualquier server component, layout o page que necesite leer la sesión del usuario debe usar los helpers definidos aquí — no debe llamar `getServerAuthSession()` directamente con `try/catch + redirect` ad hoc.

## 2. Problema que este sistema resuelve

### 2.1 Sintoma observable

Logs de `pnpm build` se llenaban con ~10 entradas idénticas:

```
[DashboardLayout] getServerAuthSession failed: Error: Dynamic server usage:
Route /admin/responsibilities couldn't be rendered statically because it
used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
```

Una entrada por ruta bajo `(dashboard)`. El build seguía siendo `Compiled successfully`, pero el ruido era engañoso.

### 2.2 Causa raíz

1. Next.js 16 en build phase intenta **pre-renderizar estáticamente** cada ruta (SSG por default).
2. Llega a `(dashboard)/layout.tsx` y ejecuta el server component.
3. El layout llama `getServerAuthSession()` que internamente invoca `headers()` de Next para leer cookies.
4. Next detecta el uso de API dinámica durante prerender → lanza `Dynamic server usage` con `error.digest === 'DYNAMIC_SERVER_USAGE'`.
5. El `try/catch` en el layout intercepta ese error y lo loggea como `console.error`. Eso es lo que ensucia los logs.

El error **NO es un error real** — es la señal del framework "esta ruta debe ser dynamic, no la prerendericés". Pero el `try/catch` ad hoc lo trataba como falla de auth.

### 2.3 Impacto del antipatrón

| Problema | Consecuencia |
| --- | --- |
| Logs de build con N "errores" falsos | Devs y agentes leyendo el output pierden tiempo; señal degradada |
| Errores reales de auth quedan enmascarados | Si `NEXTAUTH_SECRET` falla en runtime, el log queda enterrado entre warnings de build |
| Patrón duplicado en N layouts/pages | Cada uno reinventa try/catch + redirect; convención inexistente |
| `redirect('/login')` durante build phase | Next lo ignora silenciosamente, pero acumula confusión sobre qué pasó realmente |

## 3. Solución canónica

### 3.1 Helper canónico

Archivo: [`src/lib/auth/require-server-session.ts`](../../src/lib/auth/require-server-session.ts).

Expone 2 funciones públicas + 1 detector privado:

```ts
// Detector privado — re-lanza señal del framework, loggea solo errores reales
const isDynamicServerUsageError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  const digest = (error as { digest?: unknown }).digest
  if (typeof digest === 'string' && digest === 'DYNAMIC_SERVER_USAGE') return true
  return (
    error.message.includes("couldn't be rendered statically") ||
    error.message.includes('Dynamic server usage')
  )
}

// Resolver interno
const resolveServerSession = async () => {
  try {
    return await getServerAuthSession()
  } catch (error) {
    if (isDynamicServerUsageError(error)) throw error  // re-lanza al framework
    console.error('[auth] resolveServerSession failed:', error)
    return null
  }
}

// API pública 1 — auth requerida
export const requireServerSession = async (redirectTo = '/login') => {
  const session = await resolveServerSession()
  if (!session) redirect(redirectTo)
  return session  // Session non-null
}

// API pública 2 — auth opcional
export const getOptionalServerSession = async () => resolveServerSession()
```

### 3.2 Cuándo usar cada uno

| Helper | Caso de uso | Comportamiento si NO hay sesión | Devuelve |
| --- | --- | --- | --- |
| `requireServerSession(redirectTo)` | Layouts y pages que **requieren** usuario autenticado (dashboard, admin, finance, etc.) | Redirige a `redirectTo` (default `/login`) | `Session` non-null |
| `getOptionalServerSession()` | Pages que opcionalmente quieren saber si hay sesión (login page, landing pública) | No redirige — devuelve `null` | `Session \| null` |

### 3.3 Convención obligatoria: `dynamic = 'force-dynamic'`

Cualquier server component / layout / page que consuma sesión **debe** declarar:

```ts
export const dynamic = 'force-dynamic'
```

Razón: NextAuth lee cookies/headers internamente. Sin `force-dynamic`, Next intenta prerender la ruta en build phase y choca con el uso de API dinámica. El `force-dynamic` le dice "no intentes prerender, esta ruta es siempre serverside on-demand".

Sin esta línea, el helper canónico igual maneja el error correctamente (re-lanza al framework), pero Next sigue intentando prerender y emite warnings en cada build. Con `force-dynamic`, el comportamiento es limpio desde el principio.

### 3.4 Patrón canónico end-to-end

```ts
import { requireServerSession } from '@/lib/auth/require-server-session'

export const dynamic = 'force-dynamic'

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await requireServerSession()
  // session.user es non-null acá

  return <Providers session={session}>{children}</Providers>
}

export default Layout
```

Para login/landing pages:

```ts
import { redirect } from 'next/navigation'
import { getOptionalServerSession } from '@/lib/auth/require-server-session'

export const dynamic = 'force-dynamic'

const LoginPage = async () => {
  const session = await getOptionalServerSession()
  if (session) redirect('/auth/landing')  // ya logueado, mandalo al portal
  return <LoginForm />
}
```

## 4. Antipatrón explícitamente prohibido

NUNCA hacer esto en server component, layout o page nuevo:

```ts
// ❌ ANTIPATRÓN — NO USAR
let session
try {
  session = await getServerAuthSession()
} catch (error) {
  console.error('[X] getServerAuthSession failed:', error)
  redirect('/login')
}
if (!session) redirect('/login')
```

Razón: traga el `DYNAMIC_SERVER_USAGE` del framework como si fuera error de auth, ensucia logs, no detecta errores reales, duplica lógica que ya está en el helper canónico.

## 5. API routes — fuera del scope de este patrón

API routes (`route.ts`) **NO usan** los helpers de este sistema. Razones:

- API routes son siempre dynamic por default en App Router (Next no intenta prerender).
- El manejo de error en API routes es distinto: devolver `NextResponse.json({ error }, { status: 401 })`, no `redirect()`.
- API routes ya son explícitas en su naturaleza dynamic.

API routes siguen usando `getServerAuthSession()` directo:

```ts
// API route — patrón válido (NO requiere los helpers de este doc)
export async function GET() {
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}
```

Si en algún momento una API route quiere consumir TenantContext extendido, usa `requireXxxTenantContext()` de `src/lib/tenant/authorization.ts` (otro patrón canónico, separado de este).

## 6. Arquitectura de capas

```
┌─────────────────────────────────────────────────────┐
│ Server Component / Layout / Page                    │
│ - export const dynamic = 'force-dynamic'           │
│ - requireServerSession() o getOptionalServerSession│
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ src/lib/auth/require-server-session.ts             │
│ - resolveServerSession() (interno)                 │
│ - isDynamicServerUsageError() (interno)            │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ src/lib/auth.ts                                     │
│ - getServerAuthSession() — wrapper de NextAuth     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ next-auth (NextAuth v4)                             │
│ - getServerSession(authOptions)                    │
└─────────────────────────────────────────────────────┘
```

Cada capa tiene una responsabilidad única:

- **Server component**: declara dynamic + invoca helper canónico.
- **Helper canónico**: maneja `DYNAMIC_SERVER_USAGE`, decide redirect vs return.
- **`getServerAuthSession`**: wrapper de NextAuth con manejo defensivo de `NEXTAUTH_SECRET` ausente.
- **NextAuth**: lectura de cookies/headers + decoding del JWT.

## 7. Sinergia con otras convenciones

| Convención | Sinergia |
| --- | --- |
| **Identity Access V2** (`routeGroups`, `authorizedViews`) | Una vez resuelto `session`, los layouts validan permisos via `requireXxxTenantContext()` que vive en `src/lib/tenant/authorization.ts` |
| **Agent Auth** (`/api/auth/agent-session`) | Patrón paralelo — emite cookie compatible con NextAuth para que `requireServerSession()` funcione igual con sesiones de agentes |
| **Middleware edge** (TASK-516 follow-up) | Si en el futuro se introduce middleware edge para auth check temprano, los helpers serverside siguen siendo válidos para layouts |
| **Auth.js v5 migration** (TASK-516) | El helper aísla los call sites de la API de NextAuth — migrar v4 → v5 será cambiar **1 archivo** (`require-server-session.ts`) en lugar de N |

## 8. Estructura de archivos canónica

```
src/
  lib/
    auth.ts                         # NextAuth options + getServerAuthSession wrapper
    auth-secrets.ts                 # Secret resolution (NEXTAUTH_SECRET, providers)
    auth-tokens.ts                  # JWT transactional tokens (reset/invite/verify)
    auth/
      require-server-session.ts     # Canónico — este doc
  app/
    page.tsx                        # usa getOptionalServerSession + dynamic
    auth/
      landing/page.tsx              # usa getOptionalServerSession + dynamic
    (blank-layout-pages)/
      login/page.tsx                # usa getOptionalServerSession + dynamic
    (dashboard)/
      layout.tsx                    # usa requireServerSession + dynamic
    api/
      .../route.ts                  # usa getServerAuthSession directo (no helper)
```

## 9. Cómo extender — guía para devs y agentes

### 9.1 Estoy creando un layout/page nuevo que requiere auth

```ts
import { requireServerSession } from '@/lib/auth/require-server-session'

export const dynamic = 'force-dynamic'

const MyLayout = async ({ children }) => {
  const session = await requireServerSession()
  // ...
}
```

Done. Sin try/catch, sin console.error, sin redirect manual de "session is null".

### 9.2 Estoy creando un page público que opcionalmente quiere session

```ts
import { redirect } from 'next/navigation'
import { getOptionalServerSession } from '@/lib/auth/require-server-session'

export const dynamic = 'force-dynamic'

const PublicPage = async () => {
  const session = await getOptionalServerSession()
  if (session) redirect('/auth/landing')
  return <PublicContent />
}
```

### 9.3 Estoy modificando un layout/page existente que tiene el antipatrón

1. Reemplazar import: `getServerAuthSession` → `requireServerSession` o `getOptionalServerSession`.
2. Eliminar el bloque `try/catch + console.error + redirect`.
3. Agregar `export const dynamic = 'force-dynamic'` si no estaba.
4. Validar con `pnpm build` que el warning desaparece.

### 9.4 Estoy creando un API route

NO usar los helpers de este doc. Usar `getServerAuthSession()` directo o `requireXxxTenantContext()` según el caso. Devolver `NextResponse.json` con status code apropiado.

## 10. Validación

Comandos para validar que la convención está bien aplicada:

```bash
# 1. Buscar antipatrones residuales en server components/pages/layouts
grep -rln "getServerAuthSession" src/app --include="*.tsx" | xargs grep -l "try {" 2>/dev/null
# Debe devolver vacío. Si devuelve archivos, esos faltan migrar.

# 2. Buscar layouts/pages que consumen session sin force-dynamic
grep -rln "requireServerSession\|getOptionalServerSession" src/app --include="*.tsx" \
  | xargs grep -L "force-dynamic" 2>/dev/null
# Debe devolver vacío. Si devuelve archivos, agregarles export const dynamic.

# 3. Validar que pnpm build no emite warnings de DYNAMIC_SERVER_USAGE en auth context
pnpm build 2>&1 | grep -c "DashboardLayout.*getServerAuthSession failed"
# Debe devolver 0.
```

## 11. Decisiones cerradas

- **2026-04-26**: helpers canónicos `requireServerSession` + `getOptionalServerSession` adoptados. 4 server components migrados (layout dashboard, page raíz, page landing, page login). CLAUDE.md actualizado con la convención obligatoria. Antipatrón `try/catch + redirect` ad hoc explícitamente prohibido.

## 12. Riesgos vigentes

| Riesgo | Mitigación |
| --- | --- |
| Devs nuevos agregan layouts con el antipatrón viejo | Convención en CLAUDE.md + este doc + sección 10 (validación grep) en code review |
| Migración Auth.js v5 (TASK-516) cambia API de getServerAuthSession | El helper aísla — migración cambia 1 archivo |
| Edge runtime middleware introducido en futuro | Los helpers serverside siguen siendo válidos para layouts; middleware edge complementa, no reemplaza |
| API routes accidentalmente importan los helpers | Doc explícito en sección 5 + revisión humana en PR |

## 13. Referencias

- Helper canónico: [src/lib/auth/require-server-session.ts](../../src/lib/auth/require-server-session.ts).
- Wrapper NextAuth: [src/lib/auth.ts](../../src/lib/auth.ts) (función `getServerAuthSession`).
- Convención en CLAUDE.md: sección "Auth en server components / layouts / pages — patrón canónico".
- TASK-516 (Auth.js v5 migration) — cuando se ejecute, este helper es el único callsite que cambia API.
- TASK-525 (View Transitions API) — coexiste sin interferir.
- Identity Access V2: [GREENHOUSE_IDENTITY_ACCESS_V2.md](GREENHOUSE_IDENTITY_ACCESS_V2.md).
