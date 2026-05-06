import { Heading, Img, Section, Text } from '@react-email/components'

import { getMicrocopy, type LeaveRequestPendingReviewEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'
import { formatDate as formatLocaleDate } from '@/lib/format'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

const MEDIA_BUCKET = process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET || 'efeonce-group-greenhouse-public-media-prod'
const HERO_IMAGE_URL = `https://storage.googleapis.com/${MEDIA_BUCKET}/emails/leave-pending-review.png`

interface LeaveRequestPendingReviewEmailProps {
  reviewerFirstName?: string
  memberName?: string
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

const LEGACY_EN_LEAVE_REQUEST_PENDING_REVIEW_EMAIL_COPY: LeaveRequestPendingReviewEmailTemplateCopy = {
  heading: 'Leave request to review',
  greeting: name => `Hi ${name},`,
  body: (member, type, days) => `${member} submitted a ${type} request for ${days} ${days === 1 ? 'day' : 'days'} and it needs your review. Please approve or reject it from the leave management panel.`,
  cardMember: 'Team member',
  cardType: 'Type',
  cardPeriod: 'Period',
  cardDays: 'Days',
  reasonHeader: 'Request reason',
  cta: 'Review request',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  disclaimer: 'You are receiving this because you are a leave request reviewer in Greenhouse.',
  daysUnit: days => days === 1 ? 'day' : 'days'
}

export default function LeaveRequestPendingReviewEmail({
  reviewerFirstName = 'Julio',
  memberName = 'Andres Carlosama',
  leaveTypeName = 'Permiso por estudio',
  startDate = '2026-04-09',
  endDate = '2026-04-09',
  requestedDays = 0.5,
  reason = 'Debo realizar la sustentación de mi trabajo de fin de master.',
  locale = 'es'
}: LeaveRequestPendingReviewEmailProps) {
  const t = selectEmailTemplateCopy(
    locale,
    getMicrocopy().emails.leave.requestPendingReview,
    LEGACY_EN_LEAVE_REQUEST_PENDING_REVIEW_EMAIL_COPY
  )

  const appUrl = `${APP_URL}/hr/leave`

  const periodDisplay = `${formatDate(startDate, locale)} – ${formatDate(endDate, locale)}`

  return (
    <EmailLayout previewText={`${memberName} — ${leaveTypeName}`} locale={locale}>
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
        {t.greeting(reviewerFirstName)} {t.body(memberName, leaveTypeName, requestedDays)}
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
