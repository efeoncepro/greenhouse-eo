import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PayrollReceiptEmailProps {
  fullName: string
  periodYear: number
  periodMonth: number
  entryCurrency: 'CLP' | 'USD'
  grossTotal: number
  totalDeductions: number | null
  netTotal: number
  payRegime: 'chile' | 'international'
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const formatMoney = (value: number, currency: 'CLP' | 'USD') =>
  currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toFixed(2)}`

const summaryRow = (label: string, value: string, emphasis = false) => (
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
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
          verticalAlign: 'top',
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
          whiteSpace: 'nowrap',
        }}>
          {value}
        </td>
      </tr>
    </tbody>
  </table>
)

export default function PayrollReceiptEmail({
  fullName,
  periodYear,
  periodMonth,
  entryCurrency,
  grossTotal,
  totalDeductions,
  netTotal,
  payRegime
}: PayrollReceiptEmailProps) {
  const monthName = MONTH_NAMES[periodMonth - 1] ?? String(periodMonth)
  const isChile = payRegime === 'chile'
  const regimeLabel = isChile ? 'Liquidación de remuneraciones' : 'Payment statement'

  const previewText = isChile
    ? `Tu recibo de nómina de ${monthName} ${periodYear} ya está disponible`
    : `Your payment statement for ${monthName} ${periodYear} is ready`

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
        lineHeight: '34px',
      }}>
        {regimeLabel}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        {isChile ? (
          <>
            Hola {firstName}, tu recibo de nómina de <strong>{monthName} {periodYear}</strong> ya está listo.
            Te dejamos el resumen y adjuntamos el PDF para que puedas revisarlo cuando quieras.
          </>
        ) : (
          <>
            Hi {firstName}, your payment statement for <strong>{monthName} {periodYear}</strong> is ready.
            We included a short summary and attached the PDF for your records.
          </>
        )}
      </Text>

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px',
      }}>
        {summaryRow(isChile ? 'Régimen' : 'Regime', isChile ? 'Chile' : 'International')}
        {summaryRow('Moneda', entryCurrency)}
        {summaryRow(isChile ? 'Bruto' : 'Gross', formatMoney(grossTotal, entryCurrency))}
        {summaryRow(isChile ? 'Descuentos' : 'Deductions', formatMoney(totalDeductions ?? 0, entryCurrency))}
        {summaryRow(isChile ? 'Líquido' : 'Net payment', formatMoney(netTotal, entryCurrency), true)}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{isChile ? 'Abrir mi nómina' : 'View my payroll'}</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        {isChile
          ? 'Si no ves el PDF adjunto, revisa la carpeta de descargas de tu correo o ingresa a Greenhouse desde el botón anterior.'
          : 'If you do not see the attached PDF, please check your mail downloads or open Greenhouse using the button above.'}
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        {isChile
          ? `Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde ${APP_URL}`
          : `Greenhouse by Efeonce Group SpA · This is an automated email sent from ${APP_URL}`}
      </Text>
    </EmailLayout>
  )
}
