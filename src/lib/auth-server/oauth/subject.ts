/**
 * Port de la persona autenticada que `authorize` consume (TASK-1829).
 *
 * TASK-1830 entrega la implementación real (sesión `greenhouse_auth.sessions`, cookie `__Host-efeonce_auth`,
 * passkeys/magic link/TOTP). Hasta entonces el runtime inyecta `unauthenticatedSubjectPort` y `authorize`
 * responde `login_required`: NUNCA se emite un code para una persona que este emisor no autenticó.
 */

import type { OAuthHttpRequest } from './http'

export type AuthenticatedSubject = {
  /** Server-resolved context, never read directly from a query parameter. */
  authorizationContextId?: string | null
  /** Sujeto opaco y estable por persona dentro de este issuer (`sub`). */
  subject: string
  /** `environment_id` bajo el que se autenticó (debe coincidir con el del emisor). */
  environmentId: string
  /** `primary` = login base; `step_up` = segundo factor reciente (exigido por scopes de escritura). */
  authLevel: 'primary' | 'step_up'
  authTime: Date
}

export interface SubjectSessionPort {
  resolve(request: OAuthHttpRequest, authorization?: { clientId: string; audience: string }): Promise<AuthenticatedSubject | null>
}

export const unauthenticatedSubjectPort: SubjectSessionPort = {
  resolve: async () => null
}

/** Port de prueba: sujeto fijo. Sólo para tests in-process; jamás en el runtime. */
export const createStaticSubjectPort = (subject: AuthenticatedSubject | null): SubjectSessionPort => ({
  resolve: async () => subject
})
