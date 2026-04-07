import { Heading, Img, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

const MEDIA_BUCKET = process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET || 'efeonce-group-greenhouse-public-media-prod'
const HERO_IMAGE_URL = `https://storage.googleapis.com/${MEDIA_BUCKET}/emails/leave-decision-v2.png`

type LeaveStatus = 'approved' | 'rejected' | 'cancelled'

interface LeaveRequestDecisionEmailProps {
  memberFirstName?: string
  actorName?: string
  leaveTypeName?: string
  startDate?: string
  endDate?: string
  requestedDays?: number
  status?: LeaveStatus
  notes?: string | null
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

const summaryRow = (label: string, value: string, emphasis = false) => (
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
      ? { approved: 'Request approved', rejected: 'Request not approved', cancelled: 'Request cancelled' }[status]
      : { approved: 'Solicitud aprobada', rejected: 'Solicitud no aprobada', cancelled: 'Solicitud cancelada' }[status],
    greeting: (name: string) => isEn ? `Hi ${name},` : `Hola ${name},`,
    body: {
      approved: (actor: string, type: string, days: number) =>
        isEn
          ? `${actor} approved your ${type} request for ${days} ${days === 1 ? 'day' : 'days'}. It has been added to the team calendar.`
          : `${actor} aprobó tu solicitud de ${type} por ${days} ${days === 1 ? 'día' : 'días'}. Ya está registrada en el calendario del equipo.`,
      rejected: (actor: string, type: string) =>
        isEn
          ? `${actor} reviewed your ${type} request and was unable to approve it at this time. Please review the notes below and feel free to submit a new request if needed.`
          : `${actor} revisó tu solicitud de ${type} y no pudo aprobarla en esta oportunidad. Revisa las observaciones y, si lo necesitas, puedes enviar una nueva solicitud.`,
      cancelled: (type: string) =>
        isEn
          ? `Your ${type} request has been cancelled. The reserved days have been returned to your available balance.`
          : `Tu solicitud de ${type} fue cancelada. Los días reservados volvieron a tu saldo disponible.`
    }[status],
    cardType: isEn ? 'Type' : 'Tipo',
    cardFrom: isEn ? 'From' : 'Desde',
    cardTo: isEn ? 'To' : 'Hasta',
    cardDays: isEn ? 'Days' : 'Días',
    statusBadge: isEn
      ? { approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' }[status]
      : { approved: 'Aprobado', rejected: 'Rechazado', cancelled: 'Cancelado' }[status],
    notesHeader: isEn ? 'Reviewer notes' : 'Observaciones del revisor',
    cta: isEn ? 'View my leave' : 'Ver mis permisos',
    fallback: isEn
      ? 'If the button does not work, copy and paste this address into your browser:'
      : 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
    daysUnit: (days: number) => isEn ? (days === 1 ? 'day' : 'days') : (days === 1 ? 'día' : 'días')
  }
}

export default function LeaveRequestDecisionEmail({
  memberFirstName = 'María',
  actorName = 'Julio Reyes',
  leaveTypeName = 'Vacaciones',
  startDate = '2026-04-14',
  endDate = '2026-04-18',
  requestedDays = 5,
  status = 'approved',
  notes,
  locale = 'es'
}: LeaveRequestDecisionEmailProps) {
  const t = getTranslations(locale, status)
  const styles = STATUS_STYLES[status]
  const actorFirstName = actorName.split(' ')[0] || actorName
  const appUrl = `${APP_URL}/my/leave`

  const bodyText = status === 'approved'
    ? (t.body as (a: string, b: string, c: number) => string)(actorFirstName, leaveTypeName, requestedDays)
    : status === 'rejected'
      ? (t.body as (a: string, b: string) => string)(actorFirstName, leaveTypeName)
      : (t.body as (a: string) => string)(leaveTypeName)

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

      {/* Status badge */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 20px' }}>
        <span style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: '20px',
          backgroundColor: styles.bg,
          color: styles.text,
          border: `1px solid ${styles.border}`,
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px'
        }}>
          {t.statusBadge}
        </span>
      </Section>

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
        {t.greeting(memberFirstName)} {bodyText}
      </Text>

      {/* Summary card */}
      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px'
      }}>
        {summaryRow(t.cardType, leaveTypeName)}
        {summaryRow(t.cardFrom, formatDate(startDate, locale))}
        {summaryRow(t.cardTo, formatDate(endDate, locale))}
        {summaryRow(t.cardDays, `${requestedDays} ${t.daysUnit(requestedDays)}`, true)}
      </Section>

      {/* Reviewer notes (conditional) */}
      {notes && (
        <Section style={{
          borderLeft: `3px solid ${styles.text}`,
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

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{t.cta}</EmailButton>
      </Section>

      {/* Fallback URL */}
      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
        wordBreak: 'break-all' as const
      }}>
        {t.fallback} {appUrl}
      </Text>
    </EmailLayout>
  )
}
