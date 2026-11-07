/**
 * Recuperación y revocación de acceso de una persona (TASK-1830 Slice 4).
 *
 * **No hay self-service de reset.** Es la decisión central del ADR: un flujo de recuperación
 * automático es la puerta que se ataca cuando no hay contraseñas que robar. Recuperar es que el
 * operador emita una re-invitación auditada (`issueExternalInvitation` con `reissue`), que la
 * persona la acepte y que TODO lo anterior muera.
 *
 * «Todo lo anterior» son dos mitades en dos dominios distintos, y ninguna sirve sola:
 *
 * - El **source link** del subject viejo lo desactiva `acceptExternalInvitation` (TASK-1631, dueño
 *   de esa tabla, dentro de su transacción con audit y outbox).
 * - La **sesión y las credenciales** de ese subject las revoca este módulo, que es dueño de
 *   `greenhouse_auth`.
 *
 * Si sólo se hiciera lo primero, la sesión viva del subject viejo moriría recién en su próximo
 * request; si sólo lo segundo, el passkey viejo abriría una sesión nueva. Por eso van juntas.
 */

import { sha256Hex } from '../oauth/primitives'
import type { PersonAuthStorePort } from './store/port'

export type RevokePersonAuthStateResult = {
  subject: string
  sessionsRevoked: number
  passkeysRevoked: number
  totpRevoked: boolean
}

export type RevokePersonAuthStateDeps = {
  store: PersonAuthStorePort
  environmentId: string
  now: () => Date
}

/**
 * Revoca TODO el estado de autenticación de un subject: sesiones, passkeys y TOTP. Idempotente —
 * llamarla dos veces devuelve 0 en la segunda, no falla.
 *
 * Es el command que consume el operador (`identity.auth_person.revoke`) y también el que corre solo
 * cuando una re-invitación supersede a un subject anterior.
 */
export const revokePersonAuthState = async (
  deps: RevokePersonAuthStateDeps,
  input: { subject: string; reason: string; actorRef: string | null; correlationId: string | null }
): Promise<RevokePersonAuthStateResult> => {
  const now = deps.now()

  const counts = await deps.store.revokeAuthStateWithAudit({
    environmentId: deps.environmentId,
    subject: input.subject,
    subjectHash: sha256Hex(input.subject),
    now,
    reason: input.reason,
    actorRef: input.actorRef,
    correlationId: input.correlationId
  })

  return { subject: input.subject, ...counts }
}

/** Revoca el estado de todos los subjects que una re-invitación dejó atrás. */
export const revokeSupersededSubjects = async (
  deps: RevokePersonAuthStateDeps,
  input: { subjects: readonly string[]; correlationId: string | null }
): Promise<RevokePersonAuthStateResult[]> => {
  const results: RevokePersonAuthStateResult[] = []

  for (const subject of input.subjects) {
    results.push(
      await revokePersonAuthState(deps, {
        subject,
        reason: 'superseded_by_reinvitation',
        actorRef: 'auth-server',
        correlationId: input.correlationId
      })
    )
  }

  return results
}
