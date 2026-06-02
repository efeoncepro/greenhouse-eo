import { Heading, Section, Text } from '@react-email/components'

import { formatCurrency } from '@/lib/format'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-981 — Contractor remittance ("Comprobante de Pago") notification email.
 *
 * Transactional confirmation sent to the contractor when their payable is paid.
 * Mirrors PayrollReceiptEmail: lean summary + the full TASK-960 PDF attached.
 * NOT a payroll/tax document — jurisdiction-neutral confirmation of an A/P payment.
 * Copy is inline es/en (emails/** is excluded from the copy-token lint rule).
 */
interface ContractorRemittanceEmailProps {
  beneficiaryName: string
  remittanceNumber: string
  netLabel: string
  netAmount: number
  netCurrency: string
  paymentDateLabel: string
  paymentDateValue: string
  locale: 'es' | 'en'
}

const COPY = {
  es: {
    preview: (n: string) => `Tu comprobante de pago ${n} está listo`,
    heading: 'Comprobante de pago',
    greetingPrefix: 'Hola ',
    greetingBody: ', procesamos tu pago. Acá tienes un resumen y adjuntamos el comprobante en PDF para tus registros.',
    numberLabel: 'N° de comprobante',
    cta: 'Ver mis pagos',
    pdfHelp: 'Si no ves el PDF adjunto, revisá las descargas de tu correo o abrí Greenhouse con el botón de arriba.',
    footer: (url: string) => `Greenhouse by Efeonce Group SpA · Correo automático enviado desde ${url}`
  },
  en: {
    preview: (n: string) => `Your payment confirmation ${n} is ready`,
    heading: 'Payment confirmation',
    greetingPrefix: 'Hi ',
    greetingBody: ', we processed your payment. Here is a short summary; the PDF confirmation is attached for your records.',
    numberLabel: 'Confirmation no.',
    cta: 'View my payments',
    pdfHelp: 'If you do not see the attached PDF, check your mail downloads or open Greenhouse using the button above.',
    footer: (url: string) => `Greenhouse by Efeonce Group SpA · Automated email sent from ${url}`
  }
} as const

const formatMoney = (value: number, currency: string) =>
  formatCurrency(
    value,
    currency,
    currency === 'USD' ? { currencySymbol: 'US$' } : {},
    currency === 'USD' ? 'en-US' : undefined
  )

const summaryRow = (label: string, value: string, emphasis = false) => (
  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse',
      borderBottom: `1px solid ${EMAIL_COLORS.border}`
    }}
  >
    <tbody>
      <tr>
        <td
          style={{
            padding: '10px 0',
            fontFamily: EMAIL_FONTS.body,
            fontSize: '14px',
            color: EMAIL_COLORS.secondary,
            fontWeight: 500,
            width: '55%',
            verticalAlign: 'top'
          }}
        >
          {label}
        </td>
        <td
          style={{
            padding: '10px 0',
            fontFamily: EMAIL_FONTS.heading,
            fontSize: emphasis ? '18px' : '15px',
            color: EMAIL_COLORS.text,
            fontWeight: emphasis ? 700 : 600,
            textAlign: 'right',
            verticalAlign: 'top',
            whiteSpace: 'nowrap'
          }}
        >
          {value}
        </td>
      </tr>
    </tbody>
  </table>
)

export default function ContractorRemittanceEmail({
  beneficiaryName = 'María González Rojas',
  remittanceNumber = 'EO-RA-000123',
  netLabel = 'Pago neto',
  netAmount = 847500,
  netCurrency = 'CLP',
  paymentDateLabel = 'Fecha de pago',
  paymentDateValue = '01-06-2026',
  locale = 'es'
}: ContractorRemittanceEmailProps) {
  const t = COPY[locale] ?? COPY.es
  const firstName = beneficiaryName.split(' ')[0] || beneficiaryName
  const appUrl = `${APP_URL}/my/contractor`

  return (
    <EmailLayout previewText={t.preview(remittanceNumber)} lang={locale}>
      <Heading
        style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '26px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
          margin: '0 0 8px',
          lineHeight: '34px'
        }}
      >
        {t.heading}
      </Heading>

      <Text
        style={{
          fontSize: '15px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '24px',
          margin: '0 0 20px'
        }}
      >
        {t.greetingPrefix}
        {firstName}
        {t.greetingBody}
      </Text>

      <Section
        style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '18px 18px 8px',
          margin: '0 0 24px'
        }}
      >
        {summaryRow(t.numberLabel, remittanceNumber)}
        {summaryRow(paymentDateLabel, paymentDateValue)}
        {summaryRow(netLabel, formatMoney(netAmount, netCurrency), true)}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>{t.cta}</EmailButton>
      </Section>

      <Text
        style={{
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
          margin: '0 0 8px',
          borderTop: `1px solid ${EMAIL_COLORS.border}`,
          paddingTop: '20px'
        }}
      >
        {t.pdfHelp}
      </Text>

      <Text
        style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0'
        }}
      >
        {t.footer(APP_URL)}
      </Text>
    </EmailLayout>
  )
}
