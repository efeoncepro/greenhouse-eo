import { Heading, Section, Text } from '@react-email/components'

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
  currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`

const formatDateLabel = (iso: string | null, isChile: boolean): string => {
  if (!iso) return isChile ? 'En los próximos días' : 'In the next few days'

  const d = new Date(iso)

  return d.toLocaleDateString(isChile ? 'es-CL' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
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

  const previewText = isChile
    ? `Tu pago de ${monthName} ${periodYear} está programado`
    : `Your ${monthName} ${periodYear} payment is scheduled`

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
        {isChile ? 'Tu pago está programado' : 'Your payment is scheduled'}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px'
      }}>
        {isChile ? (
          <>
            Hola {firstName}, tu pago de <strong>{monthName} {periodYear}</strong> fue aprobado por Tesorería
            y está programado para ejecutarse próximamente. Te enviaremos el recibo definitivo apenas se
            confirme el pago.
          </>
        ) : (
          <>
            Hi {firstName}, your payment for <strong>{monthName} {periodYear}</strong> has been approved by
            Treasury and is scheduled to be executed shortly. We will send you the final receipt as soon as
            the payment is confirmed.
          </>
        )}
      </Text>

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px'
      }}>
        {summaryRow(isChile ? 'Período' : 'Period', `${monthName} ${periodYear}`)}
        {summaryRow(
          isChile ? 'Fecha programada' : 'Scheduled for',
          formatDateLabel(scheduledFor, isChile)
        )}
        {processorLabel
          ? summaryRow(isChile ? 'Procesador' : 'Processor', processorLabel)
          : null}
        {summaryRow(
          isChile ? 'Monto neto' : 'Net amount',
          formatMoney(netTotal, entryCurrency),
          true
        )}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{isChile ? 'Ver mi nómina' : 'View my payroll'}</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px'
      }}>
        {isChile
          ? 'Esta notificación es solo informativa. El recibo formal con detalle de bruto, descuentos y neto se enviará cuando el pago se ejecute.'
          : 'This is an informational notice. The formal receipt with full breakdown will be sent once the payment is executed.'}
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0'
      }}>
        {isChile
          ? `Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ${APP_URL}`
          : `Greenhouse by Efeonce Group SpA · This is an automated email sent from ${APP_URL}`}
      </Text>
    </EmailLayout>
  )
}
