import { Heading, Img, Section, Text } from '@react-email/components'

import { getMicrocopy, type LeaveRequestDecisionEmailTemplateCopy } from '@/lib/copy'
import { selectEmailIntlDateLocale, selectEmailTemplateCopy } from '@/lib/email/template-copy'
import { formatDate as formatLocaleDate } from '@/lib/format'

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
  return formatLocaleDate(dateStr, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    fallback: dateStr
  }, selectEmailIntlDateLocale(locale))
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

const LEGACY_EN_LEAVE_REQUEST_DECISION_EMAIL_COPY: LeaveRequestDecisionEmailTemplateCopy = {
  heading: {
    approved: 'Request approved',
    rejected: 'Request not approved',
    cancelled: 'Request cancelled'
  },
  greeting: name => `Hi ${name},`,
  body: {
    approved: (actor, type, days) => `${actor} approved your ${type} request for ${days} ${days === 1 ? 'day' : 'days'}. It has been added to the team calendar.`,
    rejected: (actor, type) => `${actor} reviewed your ${type} request and was unable to approve it at this time. Please review the notes below and feel free to submit a new request if needed.`,
    cancelled: type => `Your ${type} request has been cancelled. The reserved days have been returned to your available balance.`
  },
  cardType: 'Type',
  cardFrom: 'From',
  cardTo: 'To',
  cardDays: 'Days',
  statusBadge: {
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled'
  },
  notesHeader: 'Reviewer notes',
  cta: 'View my leave',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  daysUnit: days => days === 1 ? 'day' : 'days'
}

const buildBodyText = (
  t: LeaveRequestDecisionEmailTemplateCopy,
  status: LeaveStatus,
  actorFirstName: string,
  leaveTypeName: string,
  requestedDays: number
) => {
  switch (status) {
    case 'approved':
      return t.body.approved(actorFirstName, leaveTypeName, requestedDays)
    case 'rejected':
      return t.body.rejected(actorFirstName, leaveTypeName)
    case 'cancelled':
      return t.body.cancelled(leaveTypeName)
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
  const t = selectEmailTemplateCopy(
    locale,
    getMicrocopy().emails.leave.requestDecision,
    LEGACY_EN_LEAVE_REQUEST_DECISION_EMAIL_COPY
  )

  const styles = STATUS_STYLES[status]
  const actorFirstName = actorName.split(' ')[0] || actorName
  const appUrl = `${APP_URL}/my/leave`
  const heading = t.heading[status]
  const bodyText = buildBodyText(t, status, actorFirstName, leaveTypeName, requestedDays)

  return (
    <EmailLayout previewText={heading} locale={locale}>
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
          {t.statusBadge[status]}
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
        {heading}
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
