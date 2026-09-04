/**
 * Implementación real del `SubjectSessionPort` que `authorize` consume (TASK-1829 ← TASK-1830).
 *
 * Hasta ahora el runtime inyectaba `unauthenticatedSubjectPort` y `authorize` respondía siempre
 * `login_required`. Este port es lo que convierte la sesión propia en la persona del protocolo.
 *
 * Devuelve `null` en TODO caso que no sea una sesión viva y coherente: ausente, revocada, vencida,
 * con el source link revocado o describiendo a otra persona. `authorize` traduce ese `null` a
 * `login_required` y nunca emite un code — no hay camino en el que una sesión rota abra una sesión
 * degradada.
 */

import type { AuthenticatedSubject, SubjectSessionPort } from '../oauth/subject'
import type { OAuthHttpRequest } from '../oauth/http'
import type { AuthServerPersonAuthConfig } from './config'
import { readCookie, resolvePersonSession } from './sessions'
import type { PersonAuthStorePort } from './store/port'

export type PersonSubjectPortDeps = {
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  environmentId: string
  /** `external_idp:<environment>`; una sesión cuyo link no lo declare no es de este emisor. */
  expectedSourceSystem: string
  now?: () => Date
  /** Observabilidad de las sesiones que mueren por link revocado/incoherente (señales TASK-1830). */
  onInvalidSession?: (status: string) => void
}

export const createPersonSubjectPort = (deps: PersonSubjectPortDeps): SubjectSessionPort => ({
  resolve: async (request: OAuthHttpRequest): Promise<AuthenticatedSubject | null> => {
    if (!deps.config.personAuthEnabled) return null

    const now = (deps.now ?? (() => new Date()))()

    const resolution = await resolvePersonSession({
      store: deps.store,
      config: deps.config,
      sessionId: readCookie(request.headers.get('cookie'), deps.config.sessionCookieName),
      expectedEnvironmentId: deps.environmentId,
      expectedSourceSystem: deps.expectedSourceSystem,
      now
    })

    if (resolution.status !== 'active') {
      if (resolution.status === 'link_revoked' || resolution.status === 'link_mismatch') {
        deps.onInvalidSession?.(resolution.status)
      }

      return null
    }

    return {
      subject: resolution.session.subject,
      environmentId: resolution.session.environmentId,
      authLevel: resolution.authLevel,
      authTime: resolution.session.authTime
    }
  }
})
