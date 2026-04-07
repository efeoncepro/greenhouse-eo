import { Heading, Img, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

const HERO_IMAGE_URL = 'https://greenhouse.efeoncepro.com/images/emails/leave-review.png'

type LeaveStatus = 'approved' | 'rejected' | 'cancelled'

interface LeaveReviewConfirmationEmailProps {
  actorFirstName?: string
  memberName?: string
  leaveTypeName?: string
  startDate?: string
  endDate?: string
  requestedDays?: number
  status?: LeaveStatus
  notes?: string | null
  reason?: string | null
  locale?: 'es' | 'en'
}

const STATUS_STYLES: Record<LeaveStatus, { bg: string; text: string; border: string }> = {
  approved: { bg: '#ECFDF3', text: '#027A48', border: '#A6F4C5' },
  rejected: { bg: '#FEF3F2', text: '#B42318', border: '#FECDCA' },
  cancelled: { bg: '#F2F4F7', text: '#667085', border: '#E4E7EC' }
}

const formatDate = (dateStr: string, locale: 'es' | 'en') => {
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateStr + 'T12:00:00'))
  } catch {
    return dateStr
  }
}

const summaryRow = (label: string, value: React.ReactNode, emphasis = false) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: `1px solid ${EMAIL_COLORS.border}` }}>
    <tbody>
      <tr>
        <td style={{
          padding: '10px 0',
          fontFamily: EMAIL_FONTS.body,
          fontSize: '14px',
          color: EMAIL_COLORS.secondary,
          fontWeight: 500,
          width: '45%',
          verticalAlign: 'top'
        }}>
          {label}
        </td>
        <td style={{
          padding: '10px 0',
          fontFamily: EMAIL_FONTS.heading,
          fontSize: emphasis ? '18px' : '15px',
          color: EMAIL_COLORS.text,
          fontWeight: emphasis ? 700 : 600,
          textAlign: 'right' as const,
          verticalAlign: 'top',
          whiteSpace: 'nowrap' as const
        }}>
          {value}
        </td>
      </tr>
    </tbody>
  </table>
)

const getTranslations = (locale: 'es' | 'en', status: LeaveStatus) => {
  const isEn = locale === 'en'

  return {
    heading: isEn
      ? { approved: 'Leave approved', rejected: 'Leave rejected', cancelled: 'Leave cancelled' }[status]
      : { approved: 'Permiso aprobado', rejected: 'Permiso rechazado', cancelled: 'Permiso cancelado' }[status],
    greeting: (name: string) => isEn ? `Hi ${name},` : `Hola ${name},`,
    body: {
      approved: (member: string, type: string, days: number) =>
        isEn
          ? `We recorded your approval of ${member}'s ${type} request for ${days} ${days === 1 ? 'day' : 'days'}. The team member has been notified and the leave is now on the team calendar.`
          : `Registramos tu aprobación de la solicitud de ${type} de ${member} por ${days} ${days === 1 ? 'día' : 'días'}. El colaborador ya fue notificado y el permiso aparece en el calendario del equipo.`,
      rejected: (member: string, type: string) =>
        isEn
          ? `We recorded your decision on ${member}'s ${type} request. The team member has been notified and may submit a new request if needed.`
          : `Registramos tu decisión sobre la solicitud de ${type} de ${member}. El colaborador fue notificado y puede enviar una nueva solicitud si lo requiere.`,
      cancelled: (member: string, type: string) =>
        isEn
          ? `${member}'s ${type} request has been cancelled. The reserved days have been returned to their available balance.`
          : `La solicitud de ${type} de ${member} fue cancelada. Los días reservados volvieron al saldo disponible del colaborador.`
    }[status],
    cardMember: isEn ? 'Team member' : 'Colaborador',
    cardType: isEn ? 'Type' : 'Tipo',
    cardPeriod: isEn ? 'Period' : 'Periodo',
    cardDays: isEn ? 'Days' : 'Días',
    cardStatus: isEn ? 'Status' : 'Estado',
    statusBadge: isEn
      ? { approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' }[status]
      : { approved: 'Aprobado', rejected: 'Rechazado', cancelled: 'Cancelado' }[status],
    notesHeader: isEn ? 'Your notes' : 'Tus observaciones',
    reasonHeader: isEn ? 'Original request reason' : 'Motivo de la solicitud',
    cta: isEn ? 'View team leave' : 'Ver permisos del equipo',
    fallback: isEn
      ? 'If the button does not work, copy and paste this address into your browser:'
      : 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
    disclaimer: isEn
      ? 'This email confirms an action you took in Greenhouse. If you do not recognize this action, contact the platform administrator immediately.'
      : 'Este correo confirma una acción que realizaste en Greenhouse. Si no reconoces esta acción, contacta al administrador de la plataforma de inmediato.',
    daysUnit: (days: number) => isEn ? (days === 1 ? 'day' : 'days') : (days === 1 ? 'día' : 'días')
  }
}

export default function LeaveReviewConfirmationEmail({
  actorFirstName = 'Julio',
  memberName = 'María González Rojas',
  leaveTypeName = 'Vacaciones',
  startDate = '2026-04-14',
  endDate = '2026-04-18',
  requestedDays = 5,
  status = 'approved',
  notes,
  reason = 'Necesito tomar mis vacaciones pendientes del periodo anterior.',
  locale = 'es'
}: LeaveReviewConfirmationEmailProps) {
  const t = getTranslations(locale, status)
  const styles = STATUS_STYLES[status]
  const appUrl = `${APP_URL}/hr/leave`

  const bodyText = status === 'approved'
    ? (t.body as (a: string, b: string, c: number) => string)(memberName, leaveTypeName, requestedDays)
    : status === 'rejected'
      ? (t.body as (a: string, b: string) => string)(memberName, leaveTypeName)
      : (t.body as (a: string, b: string) => string)(memberName, leaveTypeName)

  const periodDisplay = `${formatDate(startDate, locale)} – ${formatDate(endDate, locale)}`

  return (
    <EmailLayout previewText={t.heading} locale={locale}>
      {/* Hero image */}
      <Img
        src={HERO_IMAGE_URL}
        alt=""
        width={560}
        height={180}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '8px',
          margin: '0 0 24px',
          display: 'block'
        }}
      />

      {/* Heading */}
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px'
      }}>
        {t.heading}
      </Heading>

      {/* Greeting + body */}
      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 24px'
      }}>
        {t.greeting(actorFirstName)} {bodyText}
      </Text>

      {/* Summary card */}
      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px'
      }}>
        {summaryRow(t.cardMember, memberName)}
        {summaryRow(t.cardType, leaveTypeName)}
        {summaryRow(t.cardPeriod, periodDisplay)}
        {summaryRow(t.cardDays, `${requestedDays} ${t.daysUnit(requestedDays)}`, true)}
        {summaryRow(t.cardStatus, (
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: styles.bg,
            color: styles.text,
            border: `1px solid ${styles.border}`,
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '12px',
            fontWeight: 600
          }}>
            {t.statusBadge}
          </span>
        ))}
      </Section>

      {/* Reviewer's own notes (conditional) */}
      {notes && (
        <Section style={{
          borderLeft: `3px solid ${EMAIL_COLORS.border}`,
          padding: '12px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: '0 8px 8px 0',
          margin: '0 0 24px'
        }}>
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '12px',
            fontWeight: 500,
            color: EMAIL_COLORS.muted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.3px',
            margin: '0 0 4px'
          }}>
            {t.notesHeader}
          </Text>
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '14px',
            color: EMAIL_COLORS.secondary,
            lineHeight: '22px',
            fontStyle: 'italic' as const,
            margin: '0'
          }}>
            {notes}
          </Text>
        </Section>
      )}

      {/* Original requester's reason (conditional) */}
      {reason && (
        <Section style={{
          borderLeft: `3px solid ${EMAIL_COLORS.primary}`,
          padding: '12px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: '0 8px 8px 0',
          margin: '0 0 24px'
        }}>
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '12px',
            fontWeight: 500,
            color: EMAIL_COLORS.muted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.3px',
            margin: '0 0 4px'
          }}>
            {t.reasonHeader}
          </Text>
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '14px',
            color: EMAIL_COLORS.secondary,
            lineHeight: '22px',
            fontStyle: 'italic' as const,
            margin: '0'
          }}>
            {reason}
          </Text>
        </Section>
      )}

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{t.cta}</EmailButton>
      </Section>

      {/* Disclaimer */}
      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px'
      }}>
        {t.disclaimer}
      </Text>
    </EmailLayout>
  )
}
