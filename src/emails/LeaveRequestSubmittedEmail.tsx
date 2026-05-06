import { Heading, Img, Section, Text } from '@react-email/components'

import { getMicrocopy, type LeaveRequestSubmittedEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'
import { formatDate as formatLocaleDate } from '@/lib/format'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

const MEDIA_BUCKET = process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET || 'efeonce-group-greenhouse-public-media-prod'
const HERO_IMAGE_URL = `https://storage.googleapis.com/${MEDIA_BUCKET}/emails/leave-submitted.png`

interface LeaveRequestSubmittedEmailProps {
  memberFirstName?: string
  leaveTypeName?: string
  startDate?: string
  endDate?: string
  requestedDays?: number
  reason?: string | null
  locale?: 'es' | 'en'
}

const formatDate = (dateStr: string, locale: 'es' | 'en') => {
  return formatLocaleDate(dateStr, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    fallback: dateStr
  }, locale === 'en' ? 'en-US' : 'es-CL')
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

const LEGACY_EN_LEAVE_REQUEST_SUBMITTED_EMAIL_COPY: LeaveRequestSubmittedEmailTemplateCopy = {
  heading: 'Request submitted',
  greeting: name => `Hi ${name},`,
  body: (type, days) => `Your ${type} request for ${days} ${days === 1 ? 'day' : 'days'} has been submitted and is pending review. We'll notify you as soon as a decision is made.`,
  cardType: 'Type',
  cardFrom: 'From',
  cardTo: 'To',
  cardDays: 'Days',
  cardStatus: 'Status',
  statusPending: 'Pending review',
  reasonHeader: 'Your reason',
  cta: 'View my leave',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  daysUnit: days => days === 1 ? 'day' : 'days'
}

export default function LeaveRequestSubmittedEmail({
  memberFirstName = 'María',
  leaveTypeName = 'Vacaciones',
  startDate = '2026-04-14',
  endDate = '2026-04-18',
  requestedDays = 5,
  reason,
  locale = 'es'
}: LeaveRequestSubmittedEmailProps) {
  const t = selectEmailTemplateCopy(
    locale,
    getMicrocopy().emails.leave.requestSubmitted,
    LEGACY_EN_LEAVE_REQUEST_SUBMITTED_EMAIL_COPY
  )

  const appUrl = `${APP_URL}/my/leave`

  return (
    <EmailLayout previewText={t.heading} locale={locale}>
      {/* Hero image */}
      <Img
        src={HERO_IMAGE_URL}
        alt=""
        width={560}
        height={305}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '8px',
          margin: '0 0 24px',
          display: 'block'
        }}
      />

      {/* Pending badge */}
      <Section style={{ textAlign: 'center' as const, margin: '0 0 20px' }}>
        <span style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: '20px',
          backgroundColor: '#EFF8FF',
          color: '#175CD3',
          border: '1px solid #B2DDFF',
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px'
        }}>
          {t.statusPending}
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
        {t.greeting(memberFirstName)} {t.body(leaveTypeName, requestedDays)}
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

      {/* Reason (conditional) */}
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
