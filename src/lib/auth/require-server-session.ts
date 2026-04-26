import 'server-only'

import { redirect } from 'next/navigation'

import { getServerAuthSession } from '@/lib/auth'

/**
 * Detecta el error que Next.js 16 lanza cuando una ruta es prerenderizada
 * estáticamente y consume APIs dinámicas (cookies/headers/searchParams)
 * vía NextAuth.
 *
 * Este NO es un error real — es la señal del framework para marcar la ruta
 * como dynamic. Debe re-lanzarse para que Next lo maneje correctamente, no
 * loggearse como error de auth.
 *
 * Shape del error:
 * - error.digest === 'DYNAMIC_SERVER_USAGE' (cuando viene del prerender)
 * - error.message contiene "Dynamic server usage" o "couldn't be rendered statically"
 *
 * Ver: https://nextjs.org/docs/messages/dynamic-server-error
 */
const isDynamicServerUsageError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false

  const digest = (error as { digest?: unknown }).digest

  if (typeof digest === 'string' && digest === 'DYNAMIC_SERVER_USAGE') return true

  return (
    error.message.includes("couldn't be rendered statically") ||
    error.message.includes('Dynamic server usage')
  )
}

/**
 * Resolver canónico de sesión para server components/layouts/pages.
 *
 * Reemplaza el patrón duplicado:
 * ```ts
 * let session
 * try {
 *   session = await getServerAuthSession()
 * } catch (error) {
 *   console.error('[X] getServerAuthSession failed:', error)
 *   // ...
 * }
 * ```
 *
 * Comportamiento:
 * 1. Re-lanza errores `DYNAMIC_SERVER_USAGE` de Next (señal de framework, NO error).
 * 2. Loggea otros errores con `[auth]` prefix.
 * 3. Devuelve session o null sin redirigir — la decisión de redirect queda al caller.
 */
const resolveServerSession = async () => {
  try {
    return await getServerAuthSession()
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      throw error
    }

    console.error('[auth] resolveServerSession failed:', error)

    return null
  }
}

/**
 * Helper canónico para layouts y server components que **requieren** sesión activa.
 *
 * Comportamiento:
 * - Si hay sesión → la devuelve.
 * - Si no hay sesión (o hubo error real) → redirige a `redirectTo` (default `/login`).
 * - Si Next.js está prerenderizando → re-lanza `DYNAMIC_SERVER_USAGE` para que
 *   marque la ruta como dynamic (no loggea, no redirige).
 *
 * Uso típico en layout/page:
 * ```ts
 * export const dynamic = 'force-dynamic' // si Next intenta prerenderizar
 *
 * const Layout = async ({ children }) => {
 *   const session = await requireServerSession()
 *   // ... session.user es non-null acá
 * }
 * ```
 */
export const requireServerSession = async (redirectTo = '/login') => {
  const session = await resolveServerSession()

  if (!session) {
    redirect(redirectTo)
  }

  return session
}

/**
 * Helper canónico para pages que **opcionalmente** quieren saber si hay sesión
 * pero no requieren autenticación (ej. login page, landing pública).
 *
 * Comportamiento:
 * - Devuelve session o null. Nunca redirige.
 * - Maneja `DYNAMIC_SERVER_USAGE` igual que `requireServerSession`.
 * - Loggea errores reales con `[auth]` prefix.
 *
 * Uso típico:
 * ```ts
 * export const dynamic = 'force-dynamic'
 *
 * const LoginPage = async () => {
 *   const session = await getOptionalServerSession()
 *   if (session) redirect('/auth/landing') // ya está logueado, mandalo al portal
 *   return <LoginForm />
 * }
 * ```
 */
export const getOptionalServerSession = async () => resolveServerSession()
