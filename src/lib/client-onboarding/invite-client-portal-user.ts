import 'server-only'

import { randomUUID } from 'node:crypto'

import { ROLE_CODES, isRoleCode } from '@/config/role-codes'
import { generateToken, storeToken } from '@/lib/auth-tokens'
import { sendEmail } from '@/lib/email/delivery'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * TASK-1001 — helper canónico SSOT para invitar un usuario al portal cliente.
 *
 * Primitiva única de invitación al portal cliente (crear `client_users` +
 * `user_role_assignments` additive + token + email). El consumer canónico es el
 * route gobernado del checklist de onboarding
 * (`/api/admin/clients/[organizationId]/lifecycle/portal-users/invite`, gateado por
 * `client.lifecycle.portal_user.invite`). El route legacy `/api/admin/invite` —
 * duplicado huérfano con gate inline `roleCodes.includes()` y `client_id`/`role_codes`
 * desde el body — fue deprecado y removido en TASK-1178 (deuda admin-coarse).
 *
 * Modos por caller vía `onExisting`:
 *  - `'error'`: email duplicado → throw 409 (modo estricto-no-duplicado).
 *  - `'ensure'` (lifecycle): email existente → reusa el user, asegura el rol
 *    additive (ON CONFLICT DO NOTHING), NO duplica fila ni re-envía email (idempotente).
 *
 * NUNCA reemplaza el set de roles (no usa `updateUserRoles`, que es destructivo).
 * Emite `role.assigned` v1 dentro de la misma tx por cada rol recién asignado.
 */
export type InviteOnExisting = 'error' | 'ensure'

/**
 * TASK-1852 — entrega de la invitación.
 *  - `'immediate'` (default histórico): token + email en el mismo acto, post-commit.
 *  - `'deferred'`: crea la persona (`client_users` + roles, `status='invited'`) SIN mintear token ni
 *    enviar correo. Sirve para provisionar una cohorte antes de que el operador autorice el envío;
 *    la entrega posterior pasa por `deliverClientPortalInvitation`, nunca por SQL ad hoc. Una
 *    persona diferida no puede iniciar sesión: el preview de habilitación la reporta como
 *    `person_invitation_pending`, nunca como activa.
 */
export type InviteDelivery = 'immediate' | 'deferred'

export type InviteDeliveryStatus = 'sent' | 'failed' | 'deferred' | 'not_required'

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
  /** Default `'immediate'`. Ver `InviteDelivery`. */
  delivery?: InviteDelivery
}

export interface InviteClientPortalUserResult {
  userId: string
  email: string
  /** true si se creó una fila `client_users` nueva (false si ya existía — modo 'ensure'). */
  created: boolean
  /** Roles efectivamente insertados en esta invocación (no incluye los ya existentes). */
  rolesAssigned: string[]
  emailSent: boolean
  /** `not_required` cuando la persona ya existía (modo 'ensure'). */
  deliveryStatus: InviteDeliveryStatus
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
      // user_id: NOT NULL sin default en client_users → generar (patrón canónico
      // randomUUID, mismo que SCIM provisioning). auth_mode='invited': un invitado
      // sin password todavía DEBE cumplir el invariant TASK-742
      // (client_users_auth_mode_invariant: 'invited' ⇒ password_hash IS NULL).
      // 'credentials' exigiría password_hash NOT NULL → violaría el CHECK aquí.
      // La activación (accept-invite) flipea a 'credentials' al setear el password.
      const newUserId = randomUUID()

      const inserted = await client.query<{ user_id: string }>(
        `INSERT INTO greenhouse_core.client_users (user_id, email, full_name, client_id, status, auth_mode, created_at)
         VALUES ($1, $2, $3, $4, 'invited', 'invited', now())
         RETURNING user_id`,
        [newUserId, normalizedEmail, fullName, clientId]
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
  let deliveryStatus: InviteDeliveryStatus = 'not_required'

  if (txResult.created) {
    deliveryStatus = (input.delivery ?? 'immediate') === 'deferred'
      ? 'deferred'
      : await deliverInvitationEmail({
          userId: txResult.userId,
          email: normalizedEmail,
          clientId,
          actorName: input.actorName ?? null,
          actorEmail: input.actorEmail ?? null
        })
  }

  return {
    userId: txResult.userId,
    email: normalizedEmail,
    created: txResult.created,
    rolesAssigned: txResult.rolesAssigned,
    emailSent: deliveryStatus === 'sent',
    deliveryStatus
  }
}

/** El secreto (token) se mintea y se entrega en el mismo acto, post-commit; nunca viaja por outbox. */
const deliverInvitationEmail = async (input: {
  userId: string
  email: string
  clientId: string
  actorName: string | null
  actorEmail: string | null
}): Promise<'sent' | 'failed'> => {
  const token = await generateToken(
    { user_id: input.userId, email: input.email, client_id: input.clientId, type: 'invite' },
    72
  )

  await storeToken(token, { user_id: input.userId, email: input.email, client_id: input.clientId, type: 'invite' })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/auth/accept-invite?token=${token}`

  const delivery = await sendEmail({
    emailType: 'invitation',
    domain: 'identity',
    recipients: [{ email: input.email, userId: input.userId }],
    context: { inviteUrl, inviterName: input.actorName || 'Un administrador' },
    sourceEntity: 'client_users',
    actorEmail: input.actorEmail || undefined
  })

  if (delivery.status === 'failed') {
    console.error('[inviteClientPortalUser] Email delivery failed:', delivery.error)

    return 'failed'
  }

  return 'sent'
}

export interface DeliverClientPortalInvitationInput {
  userId: string
  /** client_id canónico resuelto server-side; la persona debe pertenecer a él. */
  clientId: string
  actorName?: string | null
  actorEmail?: string | null
}

export interface DeliverClientPortalInvitationResult {
  userId: string
  email: string
  deliveryStatus: 'sent' | 'failed'
}

/**
 * TASK-1852 — entrega (o reenvío) de la invitación de una persona ya provisionada en modo
 * `deferred`. Sólo aplica a usuarios `status='invited'` con `auth_mode='invited'` del cliente
 * indicado; una persona activa o de otro cliente falla cerrado. No crea ni modifica filas de
 * `client_users`: mintea el token y envía el correo, igual que la entrega inmediata.
 */
export const deliverClientPortalInvitation = async (
  input: DeliverClientPortalInvitationInput
): Promise<DeliverClientPortalInvitationResult> => {
  const userId = input.userId?.trim()
  const clientId = input.clientId?.trim()

  if (!userId || !clientId) {
    throw new ClientPortalInviteError('Campos requeridos: persona y cliente.', 'missing_fields', 400)
  }

  const rows = await runGreenhousePostgresQuery<{ user_id: string; email: string; status: string; auth_mode: string; client_id: string | null }>(
    `SELECT user_id, email, status, auth_mode, client_id
       FROM greenhouse_core.client_users
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  )

  const user = rows[0]

  if (!user || user.client_id !== clientId) {
    throw new ClientPortalInviteError('La persona no pertenece a este cliente.', 'person_not_in_client', 404)
  }

  if (user.status !== 'invited' || user.auth_mode !== 'invited') {
    throw new ClientPortalInviteError('La persona ya activó su acceso; no corresponde reenviar la invitación.', 'invitation_not_pending', 409)
  }

  const deliveryStatus = await deliverInvitationEmail({
    userId: user.user_id,
    email: user.email.toLowerCase(),
    clientId,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null
  })

  return { userId: user.user_id, email: user.email.toLowerCase(), deliveryStatus }
}

export const CLIENT_PORTAL_DEFAULT_ROLE = ROLE_CODES.CLIENT_SPECIALIST
