import 'server-only'

import { ROLE_CODES, isRoleCode } from '@/config/role-codes'
import { generateToken, storeToken } from '@/lib/auth-tokens'
import { sendEmail } from '@/lib/email/delivery'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * TASK-1001 — helper canónico SSOT para invitar un usuario al portal cliente.
 *
 * Extraído de `/api/admin/invite` para que el flujo de onboarding (checklist
 * `provision_client_users_access`) y el admin invite legacy compartan una sola
 * primitiva (crear `client_users` + `user_role_assignments` additive + token +
 * email). Diferencias por caller vía `onExisting`:
 *  - `'error'` (admin/invite): email duplicado → throw 409 (comportamiento preservado).
 *  - `'ensure'` (lifecycle): email existente → reusa el user, asegura el rol
 *    additive (ON CONFLICT DO NOTHING), NO duplica fila ni re-envía email (idempotente).
 *
 * NUNCA reemplaza el set de roles (no usa `updateUserRoles`, que es destructivo).
 * Emite `role.assigned` v1 dentro de la misma tx por cada rol recién asignado.
 */
export type InviteOnExisting = 'error' | 'ensure'

export interface InviteClientPortalUserInput {
  email: string
  fullName: string
  clientId: string
  /** Roles a asignar. Cada uno debe existir en ROLE_CODES (validado). */
  roleCodes: string[]
  actorUserId: string | null
  actorName?: string | null
  actorEmail?: string | null
  onExisting: InviteOnExisting
}

export interface InviteClientPortalUserResult {
  userId: string
  email: string
  /** true si se creó una fila `client_users` nueva (false si ya existía — modo 'ensure'). */
  created: boolean
  /** Roles efectivamente insertados en esta invocación (no incluye los ya existentes). */
  rolesAssigned: string[]
  emailSent: boolean
}

export class ClientPortalInviteError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'ClientPortalInviteError'
    this.code = code
    this.statusCode = statusCode
  }
}

export const inviteClientPortalUser = async (
  input: InviteClientPortalUserInput
): Promise<InviteClientPortalUserResult> => {
  const email = input.email?.trim()
  const fullName = input.fullName?.trim()
  const clientId = input.clientId?.trim()

  if (!email || !fullName || !clientId) {
    throw new ClientPortalInviteError('Campos requeridos: email, nombre y cliente.', 'missing_fields', 400)
  }

  const normalizedEmail = email.toLowerCase()

  // Validación dura: todo rol asignado debe existir en ROLE_CODES (CLAUDE.md hard rule).
  // Evita el silent-skip del `SELECT ... FROM roles` cuando llega un rol fantasma.
  for (const roleCode of input.roleCodes) {
    if (!isRoleCode(roleCode)) {
      throw new ClientPortalInviteError(`Rol no reconocido: ${roleCode}`, 'invalid_role', 422)
    }
  }

  const txResult = await withGreenhousePostgresTransaction(async (client) => {
    const existing = await client.query<{ user_id: string }>(
      `SELECT user_id FROM greenhouse_core.client_users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    )

    let userId: string
    let created: boolean

    if (existing.rows.length > 0) {
      if (input.onExisting === 'error') {
        throw new ClientPortalInviteError('Este email ya está registrado.', 'email_already_registered', 409)
      }

      userId = existing.rows[0].user_id
      created = false
    } else {
      const inserted = await client.query<{ user_id: string }>(
        `INSERT INTO greenhouse_core.client_users (email, full_name, client_id, status, auth_mode, created_at)
         VALUES ($1, $2, $3, 'invited', 'credentials', now())
         RETURNING user_id`,
        [normalizedEmail, fullName, clientId]
      )

      userId = inserted.rows[0].user_id
      created = true
    }

    const rolesAssigned: string[] = []

    for (const roleCode of input.roleCodes) {
      const assignmentId = `ura-${userId}-${roleCode}`

      // SELECT ... FROM roles garantiza que el rol exista (defensa adicional al isRoleCode);
      // RETURNING solo devuelve fila cuando se insertó → distingue "recién asignado" de "ya existía".
      const result = await client.query<{ assignment_id: string }>(
        `INSERT INTO greenhouse_core.user_role_assignments
           (assignment_id, user_id, role_code, status, active, assigned_by_user_id, created_at, updated_at)
         SELECT $1, $2, role_code, 'active', true, $3, NOW(), NOW()
         FROM greenhouse_core.roles WHERE role_code = $4
         ON CONFLICT (assignment_id) DO NOTHING
         RETURNING assignment_id`,
        [assignmentId, userId, input.actorUserId, roleCode]
      )

      if (result.rows.length > 0) {
        rolesAssigned.push(roleCode)

        await publishOutboxEvent(
          {
            aggregateType: AGGREGATE_TYPES.roleAssignment,
            aggregateId: assignmentId,
            eventType: EVENT_TYPES.roleAssigned,
            payload: { userId, roleCode, assignedByUserId: input.actorUserId, source: 'client_portal_invite' }
          },
          client
        )
      }
    }

    return { userId, created, rolesAssigned }
  })

  // Email + token solo para usuarios recién creados (modo 'ensure' sobre existente no re-envía → idempotente, sin spam).
  let emailSent = false

  if (txResult.created) {
    const token = await generateToken(
      { user_id: txResult.userId, email: normalizedEmail, client_id: clientId, type: 'invite' },
      72
    )

    await storeToken(token, { user_id: txResult.userId, email: normalizedEmail, client_id: clientId, type: 'invite' })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/auth/accept-invite?token=${token}`

    const delivery = await sendEmail({
      emailType: 'invitation',
      domain: 'identity',
      recipients: [{ email: normalizedEmail, userId: txResult.userId }],
      context: { inviteUrl, inviterName: input.actorName || 'Un administrador' },
      sourceEntity: 'client_users',
      actorEmail: input.actorEmail || undefined
    })

    emailSent = delivery.status !== 'failed'

    if (delivery.status === 'failed') {
      console.error('[inviteClientPortalUser] Email delivery failed:', delivery.error)
    }
  }

  return {
    userId: txResult.userId,
    email: normalizedEmail,
    created: txResult.created,
    rolesAssigned: txResult.rolesAssigned,
    emailSent
  }
}

export const CLIENT_PORTAL_DEFAULT_ROLE = ROLE_CODES.CLIENT_SPECIALIST
