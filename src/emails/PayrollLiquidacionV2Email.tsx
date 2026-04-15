import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

// TASK-412 — email template for payroll reliquidation (v2) notifications.
// Sent to the collaborator when a previously-closed liquidación has been
// reopened and superseded by a new version. The reopen reason is
// intentionally omitted — we only acknowledge that the liquidación was
// updated and point to the v2 receipt.

interface PayrollLiquidacionV2EmailProps {
  fullName: string
  periodYear: number
  periodMonth: number
  previousNetTotal: number
  newNetTotal: number
  currency: 'CLP' | 'USD'
  receiptUrl?: string
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

export default function PayrollLiquidacionV2Email({
  fullName = 'María González Rojas',
  periodYear = 2026,
  periodMonth = 3,
  previousNetTotal = 1480000,
  newNetTotal = 1550000,
  currency = 'CLP',
  receiptUrl
}: PayrollLiquidacionV2EmailProps) {
  const monthName = MONTH_NAMES[periodMonth - 1] ?? String(periodMonth)
  const firstName = fullName.split(' ')[0] || fullName
  const appUrl = `${APP_URL}/my/payroll`
  const downloadUrl = receiptUrl ?? appUrl

  const previewText = `Tu liquidación de ${monthName} ${periodYear} fue actualizada`

  const netDelta = newNetTotal - previousNetTotal

  const deltaLabel =
    netDelta > 0
      ? `+${formatMoney(Math.abs(netDelta), currency)}`
      : netDelta < 0
        ? `−${formatMoney(Math.abs(netDelta), currency)}`
        : 'Sin cambios netos'

  return (
    <EmailLayout previewText={previewText} lang='es'>
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '26px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '34px'
      }}>
        Actualizamos tu liquidación
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px'
      }}>
        Hola {firstName}, tu liquidación de <strong>{monthName} {periodYear}</strong> fue actualizada
        con una versión nueva. Esta versión reemplaza a la anterior y ya está disponible para que la
        revises en Greenhouse.
      </Text>

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px'
      }}>
        {summaryRow('Período', `${monthName} ${periodYear}`)}
        {summaryRow('Moneda', currency)}
        {summaryRow('Líquido anterior', formatMoney(previousNetTotal, currency))}
        {summaryRow('Líquido actualizado', formatMoney(newNetTotal, currency), true)}
        {summaryRow('Diferencia', deltaLabel)}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={downloadUrl}>Ver liquidación actualizada</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px'
      }}>
        Si tienes dudas sobre este ajuste, contacta al equipo de Personas — quedamos atentos para
        ayudarte a revisar los detalles.
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0'
      }}>
        Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde {APP_URL}
      </Text>
    </EmailLayout>
  )
}
