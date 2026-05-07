import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type PayrollPaymentCommittedEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'
import { formatCurrency, formatDate } from '@/lib/format'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PayrollPaymentCommittedEmailProps {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  netTotal: number
  payRegime: 'chile' | 'international'
  scheduledFor: string | null
  processorLabel: string | null
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatMoney = (value: number, currency: 'CLP' | 'USD') =>
  formatCurrency(value, currency, currency === 'USD' ? { currencySymbol: 'US$' } : {}, currency === 'USD' ? 'en-US' : undefined)

const formatDateLabel = (iso: string | null, isChile: boolean): string => {
  const t = selectEmailTemplateCopy(isChile ? 'es' : 'en', getMicrocopy().emails.payroll.paymentCommitted, LEGACY_EN_PAYROLL_PAYMENT_COMMITTED_EMAIL_COPY)

  if (!iso) return t.fallbackScheduledFor

  return formatDate(iso, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }, isChile ? 'es-CL' : 'en-US')
}

const LEGACY_EN_PAYROLL_PAYMENT_COMMITTED_EMAIL_COPY: PayrollPaymentCommittedEmailTemplateCopy = {
  previewText: periodLabel => `Your ${periodLabel} payment is scheduled`,
  heading: 'Your payment is scheduled',
  greetingPrefix: 'Hi ',
  greetingPeriodPrefix: ', your payment for ',
  greetingSuffix: ' has been approved by Treasury and is scheduled to be executed shortly. We will send you the final receipt as soon as the payment is confirmed.',
  periodLabel: 'Period',
  scheduledForLabel: 'Scheduled for',
  processorLabel: 'Processor',
  netLabel: 'Net amount',
  cta: 'View my payroll',
  informationalNotice: 'This is an informational notice. The formal receipt with full breakdown will be sent once the payment is executed.',
  automatedFooter: appUrl => `Greenhouse by Efeonce Group SpA · This is an automated email sent from ${appUrl}`,
  fallbackScheduledFor: 'In the next few days'
}

const summaryRow = (label: string, value: string, emphasis = false) => (
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    borderBottom: `1px solid ${EMAIL_COLORS.border}`
  }}>
    <tbody>
      <tr>
        <td style={{
          padding: '10px 0',
          fontFamily: EMAIL_FONTS.body,
          fontSize: '14px',
          color: EMAIL_COLORS.secondary,
          fontWeight: 500,
          width: '55%',
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
          textAlign: 'right',
          verticalAlign: 'top',
          whiteSpace: 'nowrap'
        }}>
          {value}
        </td>
      </tr>
    </tbody>
  </table>
)

export default function PayrollPaymentCommittedEmail({
  fullName = 'María González Rojas',
  periodYear = 2026,
  periodMonth = 5,
  entryCurrency = 'CLP',
  netTotal = 1480000,
  payRegime = 'chile',
  scheduledFor = null,
  processorLabel = null
}: PayrollPaymentCommittedEmailProps) {
  const monthName = MONTH_NAMES[periodMonth - 1] ?? String(periodMonth)
  const isChile = payRegime === 'chile'
  const t = selectEmailTemplateCopy(isChile ? 'es' : 'en', getMicrocopy().emails.payroll.paymentCommitted, LEGACY_EN_PAYROLL_PAYMENT_COMMITTED_EMAIL_COPY)
  const periodLabel = `${monthName} ${periodYear}`
  const previewText = t.previewText(periodLabel)

  const appUrl = `${APP_URL}/my/payroll`
  const firstName = fullName.split(' ')[0] || fullName

  return (
    <EmailLayout previewText={previewText} lang={isChile ? 'es' : 'en'}>
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '26px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '34px'
      }}>
        {t.heading}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px'
      }}>
        {t.greetingPrefix}{firstName}{t.greetingPeriodPrefix}<strong>{monthName} {periodYear}</strong>{t.greetingSuffix}
      </Text>

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px'
      }}>
        {summaryRow(t.periodLabel, periodLabel)}
        {summaryRow(
          t.scheduledForLabel,
          formatDateLabel(scheduledFor, isChile)
        )}
        {processorLabel
          ? summaryRow(t.processorLabel, processorLabel)
          : null}
        {summaryRow(
          t.netLabel,
          formatMoney(netTotal, entryCurrency),
          true
        )}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{t.cta}</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px'
      }}>
        {t.informationalNotice}
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0'
      }}>
        {t.automatedFooter(APP_URL)}
      </Text>
    </EmailLayout>
  )
}
