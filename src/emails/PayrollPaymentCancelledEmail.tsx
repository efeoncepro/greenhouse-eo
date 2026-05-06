import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type PayrollPaymentCancelledEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'
import { formatCurrency } from '@/lib/format'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PayrollPaymentCancelledEmailProps {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  netTotal: number
  payRegime: 'chile' | 'international'
  cancellationReason: string | null
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatMoney = (value: number, currency: 'CLP' | 'USD') =>
  formatCurrency(value, currency, currency === 'USD' ? { currencySymbol: 'US$' } : {}, currency === 'USD' ? 'en-US' : undefined)

const LEGACY_EN_PAYROLL_PAYMENT_CANCELLED_EMAIL_COPY: PayrollPaymentCancelledEmailTemplateCopy = {
  previewText: periodLabel => `Update on your ${periodLabel} payment`,
  heading: 'Payment update',
  bodyPrefix: 'Hi ',
  bodyPeriodPrefix: ', we detected an issue with the scheduled payment for',
  bodyAmountPrefix: ' (',
  bodyAmountSuffix: '). We are working on it and will contact you in the next few days with the update.',
  reasonLabel: 'Reason:',
  apology: 'Sorry for the inconvenience. Your operations team has been notified.',
  cta: 'View my payroll',
  automatedFooter: appUrl => `Greenhouse by Efeonce Group SpA · This is an automated email sent from ${appUrl}`
}

export default function PayrollPaymentCancelledEmail({
  fullName = 'María González Rojas',
  periodYear = 2026,
  periodMonth = 5,
  entryCurrency = 'CLP',
  netTotal = 1480000,
  payRegime = 'chile',
  cancellationReason = null
}: PayrollPaymentCancelledEmailProps) {
  const monthName = MONTH_NAMES[periodMonth - 1] ?? String(periodMonth)
  const isChile = payRegime === 'chile'
  const t = selectEmailTemplateCopy(isChile ? 'es' : 'en', getMicrocopy().emails.payroll.paymentCancelled, LEGACY_EN_PAYROLL_PAYMENT_CANCELLED_EMAIL_COPY)
  const periodLabel = `${monthName} ${periodYear}`
  const previewText = t.previewText(periodLabel)

  const appUrl = `${APP_URL}/my/payroll`
  const firstName = fullName.split(' ')[0] || fullName
  const amountLabel = formatMoney(netTotal, entryCurrency)

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
        {t.bodyPrefix}{firstName}{t.bodyPeriodPrefix}<strong> {monthName} {periodYear}</strong>{t.bodyAmountPrefix}{amountLabel}{t.bodyAmountSuffix}
      </Text>

      {cancellationReason ? (
        <Section style={{
          backgroundColor: '#FEF2F2',
          border: `1px solid #FCA5A5`,
          borderRadius: '12px',
          padding: '14px 18px',
          margin: '0 0 24px'
        }}>
          <Text style={{
            fontSize: '13px',
            color: '#7F1D1D',
            lineHeight: '20px',
            margin: '0',
            fontWeight: 500
          }}>
            {t.reasonLabel} {cancellationReason}
          </Text>
        </Section>
      ) : null}

      <Text style={{
        fontSize: '14px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '22px',
        margin: '0 0 20px'
      }}>
        {t.apology}
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{t.cta}</EmailButton>
      </Section>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px'
      }}>
        {t.automatedFooter(APP_URL)}
      </Text>
    </EmailLayout>
  )
}
