import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type PayrollReceiptEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'
import { formatCurrency } from '@/lib/format'

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
  formatCurrency(value, currency, currency === 'USD' ? { currencySymbol: 'US$' } : {}, currency === 'USD' ? 'en-US' : undefined)

const LEGACY_EN_PAYROLL_RECEIPT_EMAIL_COPY: PayrollReceiptEmailTemplateCopy = {
  previewText: periodLabel => `Your payment statement for ${periodLabel} is ready`,
  heading: 'Payment statement',
  greetingPrefix: 'Hi ',
  greetingPeriodPrefix: ', your payment statement for ',
  greetingSuffix: ' is ready. We included a short summary and attached the PDF for your records.',
  regimeLabel: 'Regime',
  regimeValue: 'International',
  currencyLabel: 'Moneda',
  grossLabel: 'Gross',
  deductionsLabel: 'Deductions',
  netLabel: 'Net payment',
  cta: 'View my payroll',
  pdfHelp: 'If you do not see the attached PDF, please check your mail downloads or open Greenhouse using the button above.',
  automatedFooter: appUrl => `Greenhouse by Efeonce Group SpA · This is an automated email sent from ${appUrl}`
}

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
  fullName = 'María González Rojas',
  periodYear = 2026,
  periodMonth = 3,
  entryCurrency = 'CLP',
  grossTotal = 1850000,
  totalDeductions = 370000,
  netTotal = 1480000,
  payRegime = 'chile'
}: PayrollReceiptEmailProps) {
  const monthName = MONTH_NAMES[periodMonth - 1] ?? String(periodMonth)
  const isChile = payRegime === 'chile'
  const t = selectEmailTemplateCopy(isChile ? 'es' : 'en', getMicrocopy().emails.payroll.receipt, LEGACY_EN_PAYROLL_RECEIPT_EMAIL_COPY)
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
        lineHeight: '34px',
      }}>
        {t.heading}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        {t.greetingPrefix}{firstName}{t.greetingPeriodPrefix}<strong>{monthName} {periodYear}</strong>{t.greetingSuffix}
      </Text>

      <Section style={{
        backgroundColor: '#F8FAFC',
        border: `1px solid ${EMAIL_COLORS.border}`,
        borderRadius: '12px',
        padding: '18px 18px 8px',
        margin: '0 0 24px',
      }}>
        {summaryRow(t.regimeLabel, t.regimeValue)}
        {summaryRow(t.currencyLabel, entryCurrency)}
        {summaryRow(t.grossLabel, formatMoney(grossTotal, entryCurrency))}
        {summaryRow(t.deductionsLabel, formatMoney(totalDeductions ?? 0, entryCurrency))}
        {summaryRow(t.netLabel, formatMoney(netTotal, entryCurrency), true)}
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
        paddingTop: '20px',
      }}>
        {t.pdfHelp}
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        {t.automatedFooter(APP_URL)}
      </Text>
    </EmailLayout>
  )
}
