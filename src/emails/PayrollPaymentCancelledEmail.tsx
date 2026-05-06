import { Heading, Section, Text } from '@react-email/components'

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

  const previewText = isChile
    ? `Actualización sobre tu pago de ${monthName} ${periodYear}`
    : `Update on your ${monthName} ${periodYear} payment`

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
        {isChile ? 'Actualización sobre tu pago' : 'Payment update'}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px'
      }}>
        {isChile ? (
          <>
            Hola {firstName}, queremos avisarte que detectamos un problema con el pago programado de
            <strong> {monthName} {periodYear}</strong> ({formatMoney(netTotal, entryCurrency)}).
            Lo estamos resolviendo y te contactaremos en los próximos días con la actualización.
          </>
        ) : (
          <>
            Hi {firstName}, we detected an issue with the scheduled payment for
            <strong> {monthName} {periodYear}</strong> ({formatMoney(netTotal, entryCurrency)}).
            We are working on it and will contact you in the next few days with the update.
          </>
        )}
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
            {isChile ? 'Motivo:' : 'Reason:'} {cancellationReason}
          </Text>
        </Section>
      ) : null}

      <Text style={{
        fontSize: '14px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '22px',
        margin: '0 0 20px'
      }}>
        {isChile
          ? 'Disculpa el inconveniente. Tu equipo de operaciones ya está al tanto.'
          : 'Sorry for the inconvenience. Your operations team has been notified.'}
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{isChile ? 'Ver mi nómina' : 'View my payroll'}</EmailButton>
      </Section>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px'
      }}>
        {isChile
          ? `Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ${APP_URL}`
          : `Greenhouse by Efeonce Group SpA · This is an automated email sent from ${APP_URL}`}
      </Text>
    </EmailLayout>
  )
}
