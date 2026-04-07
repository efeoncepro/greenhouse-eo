import 'server-only'

import { ROLE_CODES } from '@/config/role-codes'
import { sendEmail } from '@/lib/email/delivery'
import {
  getMemberNotificationRecipients,
  getProfileNotificationRecipient,
  getRoleCodeNotificationRecipients,
  getUserNotificationRecipient,
  type PersonNotificationRecipient,
} from '@/lib/notifications/person-recipient-resolver'
import type { ProjectionDefinition } from '../projection-registry'
import { buildNotificationRecipientKey, NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const PAYROLL_OPS_RECIPIENTS = [
  { memberId: 'julio-reyes', contactEmail: 'jreyes@efeoncepro.com', fullName: 'Julio Reyes' },
  { memberId: 'humberly-henriquez', contactEmail: 'hhumberly@efeoncepro.com', fullName: 'Humberly Henriquez' }
] as const

const getAdminRecipients = async () => getRoleCodeNotificationRecipients([ROLE_CODES.EFEONCE_ADMIN])

const getFinanceRecipients = async () => getRoleCodeNotificationRecipients([ROLE_CODES.FINANCE_ADMIN, ROLE_CODES.EFEONCE_ADMIN])

const getHrReviewRecipients = async () =>
  getRoleCodeNotificationRecipients([ROLE_CODES.HR_MANAGER, ROLE_CODES.HR_PAYROLL, ROLE_CODES.EFEONCE_ADMIN])

const getPayrollOpsRecipients = async (): Promise<PersonNotificationRecipient[]> => {
  const recipientsByMemberId = await getMemberNotificationRecipients(
    PAYROLL_OPS_RECIPIENTS.map(recipient => recipient.memberId),
    {
      fallbacks: Object.fromEntries(
        PAYROLL_OPS_RECIPIENTS.map(recipient => [
          recipient.memberId,
          { email: recipient.contactEmail, fullName: recipient.fullName }
        ])
      )
    }
  )

  return PAYROLL_OPS_RECIPIENTS
    .map(recipient => recipientsByMemberId.get(recipient.memberId) ?? null)
    .filter((recipient): recipient is PersonNotificationRecipient => recipient !== null)
}

const wasNotificationAlreadySent = async ({
  recipientKey,
  category,
  eventId
}: {
  recipientKey: string
  category: string
  eventId: string | null
}) => {
  if (!eventId) {
    return false
  }

  const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
    `SELECT EXISTS (
       SELECT 1
       FROM greenhouse_notifications.notification_log
       WHERE user_id = $1
         AND category = $2
         AND status = 'sent'
         AND metadata ->> 'eventId' = $3
     ) AS exists`,
    [recipientKey, category, eventId]
  )

  return rows[0]?.exists === true
}

const formatPayrollPeriodLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))

export const notificationProjection: ProjectionDefinition = {
  name: 'notification_dispatch',
  description: 'Dispatch notifications for key domain events',
  domain: 'notifications',

  triggerEvents: [
    'service.created',
    'identity.reconciliation.approved',
    'finance.dte.discrepancy_found',
    'identity.profile.linked',
    'payroll_period.calculated',
    'leave_request.created',
    'leave_request.escalated_to_hr',
    'leave_request.approved',
    'leave_request.rejected',
    'leave_request.cancelled',
    'leave_request.payroll_impact_detected',
    'access.view_override_changed',
    'accounting.margin_alert.triggered'
  ],

  extractScope: (payload) => {
    const eventType = payload._eventType as string | undefined

    if (!eventType) return null

    return { entityType: 'notification', entityId: eventType }
  },

  refresh: async (scope, payload) => {
    await ensureNotificationSchema()

    const eventType = scope.entityId

    if (eventType === 'service.created') {
      const recipients = await getAdminRecipients()

      if (recipients.length === 0) return null

      await NotificationService.dispatch({
        category: 'system_event',
        title: `Nuevo servicio: ${(payload.name as string) || 'Sin nombre'}`,
        body: `Línea: ${(payload.lineaDeServicio as string) || '—'}`,
        actionUrl: '/agency/services',
        metadata: payload,
        recipients
      })

      return `notified ${recipients.length} admins about service.created`
    }

    if (eventType === 'identity.reconciliation.approved') {
      const recipients = await getAdminRecipients()

      if (recipients.length === 0) return null

      await NotificationService.dispatch({
        category: 'system_event',
        title: 'Reconciliación de identidad aprobada',
        body: 'Perfil vinculado correctamente',
        actionUrl: '/admin/identity',
        metadata: payload,
        recipients
      })

      return 'notified admins about reconciliation.approved'
    }

    if (eventType === 'finance.dte.discrepancy_found') {
      const recipients = await getFinanceRecipients()

      if (recipients.length === 0) return null

      await NotificationService.dispatch({
        category: 'ico_alert',
        title: 'Discrepancia DTE detectada',
        body: 'Se encontró una discrepancia en la reconciliación de documentos tributarios',
        actionUrl: '/finance/dte-reconciliation',
        metadata: payload,
        recipients
      })

      return `notified ${recipients.length} finance users about DTE discrepancy`
    }

    if (eventType === 'identity.profile.linked') {
      const profileId = typeof payload.profileId === 'string' && payload.profileId.trim() ? payload.profileId : null
      const userId = typeof payload.userId === 'string' && payload.userId.trim() ? payload.userId : null

      const recipient = profileId
        ? await getProfileNotificationRecipient(profileId)
        : userId
          ? await getUserNotificationRecipient(userId)
          : null

      if (!recipient) return null

      await NotificationService.dispatch({
        category: 'assignment_change',
        title: 'Perfil vinculado exitosamente',
        body: 'Tu identidad fue verificada y vinculada a tu perfil de equipo',
        actionUrl: '/people/me',
        metadata: payload,
        recipients: [recipient]
      })

      return `notified ${buildNotificationRecipientKey(recipient)} about profile.linked`
    }

    if (eventType === 'payroll_period.calculated') {
      const periodId = typeof payload.periodId === 'string' ? payload.periodId : null
      const year = typeof payload.year === 'number' ? payload.year : null
      const month = typeof payload.month === 'number' ? payload.month : null
      const eventId = typeof payload._eventId === 'string' ? payload._eventId : null

      if (!periodId || !year || !month) return null

      const recipients = await getPayrollOpsRecipients()

      const eligibleUsers = (
        await Promise.all(
          recipients.map(async recipient => ({
            ...recipient,
            recipientKey: buildNotificationRecipientKey(recipient),
            alreadySent: await wasNotificationAlreadySent({
              recipientKey: buildNotificationRecipientKey(recipient) ?? 'unknown-recipient',
              category: 'payroll_ops',
              eventId
            })
          }))
        )
      ).filter(recipient => recipient.recipientKey && !recipient.alreadySent)

      if (eligibleUsers.length === 0) {
        return `payroll_period.calculated already notified for event ${eventId ?? 'without-event-id'}`
      }

      await NotificationService.dispatch({
        category: 'payroll_ops',
        title: `Nómina ${formatPayrollPeriodLabel(year, month)} calculada`,
        body: 'El período oficial quedó calculado y está listo para revisión operativa.',
        actionUrl: '/hr/payroll',
        metadata: {
          ...payload,
          eventId,
          notificationScope: 'payroll_ops'
        },
        recipients: eligibleUsers.map(recipient => ({
          identityProfileId: recipient.identityProfileId,
          memberId: recipient.memberId,
          userId: recipient.userId,
          email: recipient.email,
          fullName: recipient.fullName
        }))
      })

      return `notified ${eligibleUsers.length} payroll ops users about payroll_period.calculated`
    }

    if (eventType === 'leave_request.created') {
      const requestId = typeof payload.requestId === 'string' ? payload.requestId : null
      const supervisorMemberId = typeof payload.supervisorMemberId === 'string' ? payload.supervisorMemberId : null
      const memberId = typeof payload.memberId === 'string' ? payload.memberId : null
      const memberName = typeof payload.memberName === 'string' ? payload.memberName : 'Colaborador'
      const memberEmail = typeof payload.memberEmail === 'string' ? payload.memberEmail : null
      const leaveTypeName = typeof payload.leaveTypeName === 'string' ? payload.leaveTypeName : 'Permiso'
      const startDate = typeof payload.startDate === 'string' ? payload.startDate : ''
      const endDate = typeof payload.endDate === 'string' ? payload.endDate : ''
      const requestedDays = typeof payload.requestedDays === 'number' ? payload.requestedDays : 0
      const reason = typeof payload.reason === 'string' ? payload.reason : null

      const reviewerRecipients = supervisorMemberId
        ? [...(await getMemberNotificationRecipients([supervisorMemberId])).values()].filter(
          (recipient): recipient is PersonNotificationRecipient => recipient !== null
        )
        : await getHrReviewRecipients()

      if (!requestId) return null

      // In-app notification to reviewer (existing behavior)
      if (reviewerRecipients.length > 0) {
        await NotificationService.dispatch({
          category: 'leave_review',
          title: `${memberName} solicitó ${leaveTypeName}`,
          body: startDate && endDate
            ? `Revisar tramo ${startDate} al ${endDate}.`
            : 'Hay una solicitud pendiente de revisión.',
          actionUrl: '/hr/leave',
          metadata: payload,
          recipients: reviewerRecipients
        })
      }

      // ── Email to the REQUESTER: confirmation of submission ──
      const memberFirstName = memberName.split(' ')[0] || memberName

      if (memberEmail) {
        const memberRecipientMap = memberId ? await getMemberNotificationRecipients([memberId]) : new Map()
        const memberRecipient = memberId ? memberRecipientMap.get(memberId) ?? null : null

        await sendEmail({
          emailType: 'leave_request_submitted',
          domain: 'hr',
          recipients: [{ email: memberEmail, name: memberName, userId: memberRecipient?.userId }],
          context: {
            memberFirstName,
            leaveTypeName,
            startDate,
            endDate,
            requestedDays,
            reason
          },
          sourceEventId: requestId,
          sourceEntity: 'leave_request_submitted'
        }).catch(err => {
          console.warn('[notifications] Failed to send leave_request_submitted email:', err instanceof Error ? err.message : err)
        })
      }

      // ── Email to REVIEWERS: pending review notification ──
      for (const reviewer of reviewerRecipients) {
        if (!reviewer.email) continue

        const reviewerFirstName = (reviewer.fullName || '').split(' ')[0] || 'Revisor'

        await sendEmail({
          emailType: 'leave_request_pending_review',
          domain: 'hr',
          recipients: [{ email: reviewer.email, name: reviewer.fullName, userId: reviewer.userId }],
          context: {
            reviewerFirstName,
            memberName,
            leaveTypeName,
            startDate,
            endDate,
            requestedDays,
            reason
          },
          sourceEventId: requestId,
          sourceEntity: 'leave_request_pending_review'
        }).catch(err => {
          console.warn('[notifications] Failed to send leave_request_pending_review email:', err instanceof Error ? err.message : err)
        })
      }

      return `notified ${reviewerRecipients.length} recipients about leave_request.created`
    }

    if (eventType === 'leave_request.escalated_to_hr') {
      const requestId = typeof payload.requestId === 'string' ? payload.requestId : null
      const memberName = typeof payload.memberName === 'string' ? payload.memberName : 'Colaborador'
      const leaveTypeName = typeof payload.leaveTypeName === 'string' ? payload.leaveTypeName : 'Permiso'
      const startDate = typeof payload.startDate === 'string' ? payload.startDate : ''
      const endDate = typeof payload.endDate === 'string' ? payload.endDate : ''
      const requestedDays = typeof payload.requestedDays === 'number' ? payload.requestedDays : 0
      const reason = typeof payload.reason === 'string' ? payload.reason : null
      const recipients = await getHrReviewRecipients()

      if (!requestId || recipients.length === 0) return null

      // In-app notification (existing behavior)
      await NotificationService.dispatch({
        category: 'leave_review',
        title: `${leaveTypeName} pendiente HR`,
        body: `${memberName} ya pasó la etapa de jefatura y espera resolución final.`,
        actionUrl: '/hr/leave',
        metadata: payload,
        recipients
      })

      // ── Email to HR REVIEWERS: escalated request needs review ──
      for (const reviewer of recipients) {
        if (!reviewer.email) continue

        const reviewerFirstName = (reviewer.fullName || '').split(' ')[0] || 'Revisor'

        await sendEmail({
          emailType: 'leave_request_pending_review',
          domain: 'hr',
          recipients: [{ email: reviewer.email, name: reviewer.fullName, userId: reviewer.userId }],
          context: {
            reviewerFirstName,
            memberName,
            leaveTypeName,
            startDate,
            endDate,
            requestedDays,
            reason
          },
          sourceEventId: requestId,
          sourceEntity: 'leave_request_pending_review'
        }).catch(err => {
          console.warn('[notifications] Failed to send leave_request_pending_review email (escalated):', err instanceof Error ? err.message : err)
        })
      }

      return `notified ${recipients.length} HR recipients about leave_request.escalated_to_hr`
    }

    if (
      eventType === 'leave_request.approved' ||
      eventType === 'leave_request.rejected' ||
      eventType === 'leave_request.cancelled'
    ) {
      const memberId = typeof payload.memberId === 'string' ? payload.memberId : null
      const requestId = typeof payload.requestId === 'string' ? payload.requestId : null
      const leaveTypeName = typeof payload.leaveTypeName === 'string' ? payload.leaveTypeName : 'permiso'
      const memberName = typeof payload.memberName === 'string' ? payload.memberName : 'Colaborador'
      const memberEmail = typeof payload.memberEmail === 'string' ? payload.memberEmail : null
      const actorName = typeof payload.actorName === 'string' ? payload.actorName : 'Greenhouse'
      const actorUserId = typeof payload.actorUserId === 'string' ? payload.actorUserId : null
      const startDate = typeof payload.startDate === 'string' ? payload.startDate : ''
      const endDate = typeof payload.endDate === 'string' ? payload.endDate : ''
      const requestedDays = typeof payload.requestedDays === 'number' ? payload.requestedDays : 0
      const notes = typeof payload.notes === 'string' ? payload.notes : null
      const reason = typeof payload.reason === 'string' ? payload.reason : null

      const leaveStatus = eventType === 'leave_request.approved'
        ? 'approved' as const
        : eventType === 'leave_request.rejected'
          ? 'rejected' as const
          : 'cancelled' as const

      const recipientMap = memberId ? await getMemberNotificationRecipients([memberId]) : new Map()
      const recipient = memberId ? recipientMap.get(memberId) ?? null : null

      if (!requestId || !recipient) return null

      const title =
        eventType === 'leave_request.approved'
          ? `${leaveTypeName} aprobado`
          : eventType === 'leave_request.rejected'
            ? `${leaveTypeName} rechazado`
            : `${leaveTypeName} cancelado`

      const body =
        eventType === 'leave_request.approved'
          ? 'Tu solicitud fue aprobada y ya impacta la planificación operativa.'
          : eventType === 'leave_request.rejected'
            ? 'Tu solicitud fue rechazada. Revisa el detalle y las notas del revisor.'
            : 'La solicitud quedó cancelada y ya no se considera pendiente.'

      // In-app notification (existing behavior)
      await NotificationService.dispatch({
        category: 'leave_status',
        title,
        body,
        actionUrl: '/my/leave',
        metadata: payload,
        recipients: [recipient]
      })

      // ── Dedicated email to the REQUESTER ──
      const memberFirstName = memberName.split(' ')[0] || memberName

      if (memberEmail) {
        await sendEmail({
          emailType: 'leave_request_decision',
          domain: 'hr',
          recipients: [{ email: memberEmail, name: memberName, userId: recipient.userId }],
          context: {
            memberFirstName,
            actorName,
            leaveTypeName,
            startDate,
            endDate,
            requestedDays,
            status: leaveStatus,
            notes
          },
          sourceEventId: requestId,
          sourceEntity: 'leave_request_decision',
          actorEmail: actorUserId ?? undefined
        }).catch(err => {
          console.warn('[notifications] Failed to send leave_request_decision email:', err instanceof Error ? err.message : err)
        })
      }

      // ── Dedicated email to the REVIEWER ──
      if (actorUserId && leaveStatus !== 'cancelled') {
        const actorRecipient = await getUserNotificationRecipient(actorUserId).catch(() => null)

        if (actorRecipient?.email) {
          const actorFirstName = actorName.split(' ')[0] || actorName

          await sendEmail({
            emailType: 'leave_review_confirmation',
            domain: 'hr',
            recipients: [{ email: actorRecipient.email, name: actorRecipient.fullName || actorName, userId: actorUserId }],
            context: {
              actorFirstName,
              memberName,
              leaveTypeName,
              startDate,
              endDate,
              requestedDays,
              status: leaveStatus,
              notes,
              reason
            },
            sourceEventId: requestId,
            sourceEntity: 'leave_review_confirmation',
            actorEmail: actorRecipient.email
          }).catch(err => {
            console.warn('[notifications] Failed to send leave_review_confirmation email:', err instanceof Error ? err.message : err)
          })
        }
      }

      return `notified ${buildNotificationRecipientKey(recipient)} about ${eventType}`
    }

    if (eventType === 'leave_request.payroll_impact_detected') {
      const payrollImpactMode = typeof payload.payrollImpactMode === 'string' ? payload.payrollImpactMode : 'none'
      const periodId = typeof payload.periodId === 'string' ? payload.periodId : null
      const requestId = typeof payload.requestId === 'string' ? payload.requestId : null

      if (!periodId || !requestId || payrollImpactMode === 'none') return null

      const payrollRecipients = await getPayrollOpsRecipients()

      const financeRecipients = payrollImpactMode === 'deferred_adjustment_required'
        ? await getFinanceRecipients()
        : []

      if (payrollRecipients.length > 0) {
        await NotificationService.dispatch({
          category: 'payroll_ops',
          title: `Permiso aprobado con impacto en nómina ${periodId}`,
          body: payrollImpactMode === 'deferred_adjustment_required'
            ? 'El período ya fue exportado y requiere ajuste diferido.'
            : 'Conviene recalcular la nómina oficial con la ausencia aprobada.',
          actionUrl: '/hr/payroll',
          metadata: payload,
          recipients: payrollRecipients
        })
      }

      if (financeRecipients.length > 0) {
        await NotificationService.dispatch({
          category: 'finance_alert',
          title: `Ajuste financiero diferido por permiso ${periodId}`,
          body: 'La ausencia aprobada afecta un período exportado y puede mover costos imputados.',
          actionUrl: '/finance/intelligence',
          metadata: payload,
          recipients: financeRecipients
        })
      }

      return `notified payroll/finance recipients about leave_request.payroll_impact_detected`
    }

    if (eventType === 'accounting.margin_alert.triggered') {
      const recipients = await getFinanceRecipients()

      if (recipients.length === 0) return null

      const scopeName = typeof payload.scopeName === 'string' ? payload.scopeName : 'scope sin nombre'
      const scopeType = typeof payload.scopeType === 'string' ? payload.scopeType : 'scope'
      const actualPct = typeof payload.actualPct === 'number' ? payload.actualPct : null
      const thresholdPct = typeof payload.thresholdPct === 'number' ? payload.thresholdPct : null

      await NotificationService.dispatch({
        category: 'system_event',
        title: `Alerta de margen en ${scopeName}`,
        body: actualPct != null && thresholdPct != null
          ? `El margen de ${scopeType} cayó a ${actualPct}% y quedó bajo el umbral ${thresholdPct}%.`
          : `Se detectó una caída de margen en ${scopeName}.`,
        actionUrl: '/finance/intelligence',
        metadata: payload,
        recipients
      })

      return `notified ${recipients.length} finance users about margin alert`
    }

    if (eventType === 'access.view_override_changed') {
      const userId = typeof payload.userId === 'string' && payload.userId.trim() ? payload.userId : null

      if (!userId) return null

      const recipient = await getUserNotificationRecipient(userId, {
        email: typeof payload.userEmail === 'string' ? payload.userEmail : undefined,
        fullName: typeof payload.userName === 'string' ? payload.userName : undefined
      })

      if (!recipient) return null

      const grantedViews = Array.isArray(payload.grantedViews)
        ? payload.grantedViews
            .map(entry => ({
              label: typeof entry === 'object' && entry !== null && 'label' in entry && typeof entry.label === 'string' ? entry.label : null,
              routePath: typeof entry === 'object' && entry !== null && 'routePath' in entry && typeof entry.routePath === 'string' ? entry.routePath : null
            }))
            .filter(entry => entry.label)
        : []

      const revokedViews = Array.isArray(payload.revokedViews)
        ? payload.revokedViews
            .map(entry => ({
              label: typeof entry === 'object' && entry !== null && 'label' in entry && typeof entry.label === 'string' ? entry.label : null
            }))
            .filter(entry => entry.label)
        : []

      const grantedLabels = grantedViews.map(entry => entry.label as string)
      const revokedLabels = revokedViews.map(entry => entry.label as string)

      const title =
        grantedLabels.length > 0 && revokedLabels.length > 0
          ? 'Tu acceso al portal fue actualizado'
          : grantedLabels.length > 0
            ? 'Se habilitaron nuevas vistas en tu portal'
            : 'Se actualizaron tus vistas disponibles'

      const bodyParts: string[] = []

      if (grantedLabels.length > 0) {
        bodyParts.push(`Ahora puedes ver ${grantedLabels.slice(0, 3).join(', ')}`)
      }

      if (revokedLabels.length > 0) {
        bodyParts.push(`Ya no verás ${revokedLabels.slice(0, 3).join(', ')}`)
      }

      const actionUrl =
        grantedViews.find(entry => entry.routePath)?.routePath
        || '/dashboard'

      await NotificationService.dispatch({
        category: 'system_event',
        title,
        body: bodyParts.join('. '),
        actionUrl,
        metadata: {
          ...payload,
          notificationScope: 'view_access'
        },
        recipients: [recipient]
      })

      return `notified ${buildNotificationRecipientKey(recipient)} about access.view_override_changed`
    }

    return null
  },

  maxRetries: 1
}
