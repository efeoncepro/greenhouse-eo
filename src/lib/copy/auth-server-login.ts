/**
 * Subconjunto del copy del emisor que viaja al NAVEGADOR dentro del controlador de login
 * (`persons/login-controller.ts`), igual que `auth-server-step-up.ts` con el suyo.
 *
 * Se DERIVA de `GH_AUTH_SERVER`, no se transcribe: el copy visible del emisor tiene una sola fuente
 * (`src/lib/copy/auth-server.ts`) y una copia paralela acá se desincronizaría sin que nada avise.
 */
import { GH_AUTH_SERVER } from './auth-server'

export const AUTH_LOGIN_COPY = {
  pending: GH_AUTH_SERVER.login_passkey_pending,
  /** Del dispositivo/navegador: NO ofrece reintento, sólo el fallback al enlace por correo. */
  unsupported: GH_AUTH_SERVER.login_passkey_unsupported,
  /** De la ceremonia (falló o se canceló): sí tiene reintento útil. */
  failed: GH_AUTH_SERVER.login_passkey_failed,
  limited: GH_AUTH_SERVER.login_rate_limited_body
} as const
