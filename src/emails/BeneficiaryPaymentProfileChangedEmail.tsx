import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy } from '@/lib/copy'
import { formatDate } from '@/lib/format'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { APP_URL, EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-753 — Email transaccional al beneficiario cuando su perfil de pago
 * cambia (4 eventos canonicos).
 *
 *  - created   → "Solicitud de cambio registrada — pendiente de revision"
 *  - approved  → "Tu cuenta de pago fue aprobada"
 *  - superseded → "Tu cuenta de pago activa fue reemplazada por una nueva"
 *  - cancelled → "Tu solicitud de cambio fue cancelada"
 *
 * SIEMPRE datos enmascarados. NUNCA `account_number_full`.
 * El beneficiario ve solo su cuenta destino. No exponer cuenta pagadora,
 * provider, processor ni origen de fondos empresarial en este email.
 */

export type PaymentProfileEmailKind = 'created' | 'approved' | 'superseded' | 'cancelled'

export interface BeneficiaryPaymentProfileChangedEmailProps {
  fullName: string
  kind: PaymentProfileEmailKind
  bankName: string | null
  accountNumberMasked: string | null
  currency: 'CLP' | 'USD'
  effectiveAt: string | null
  reason: string | null
  requestedByMember: boolean
}

const formatDateLabel = (iso: string | null): string => {
  if (!iso) return getMicrocopy().emails.beneficiaryPaymentProfileChanged.missingDate

  return formatDate(iso, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    fallback: iso
  })
}

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
            fontSize: emphasis ? '17px' : '15px',
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

export default function BeneficiaryPaymentProfileChangedEmail({
  fullName = 'María González Rojas',
  kind = 'approved',
  bankName = null,
  accountNumberMasked = '•••• 4321',
  currency = 'CLP',
  effectiveAt = null,
  reason = null,
  requestedByMember = false
}: BeneficiaryPaymentProfileChangedEmailProps) {
  const t = getMicrocopy().emails.beneficiaryPaymentProfileChanged
  const heading = t.heading[kind]
  const preview = t.previewText[kind]
  const firstName = fullName.split(' ')[0] || fullName
  const intro = t.intro[kind](firstName, requestedByMember)
  const appUrl = `${APP_URL}/my/payment-profile`

  return (
    <EmailLayout previewText={preview} lang='es'>
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
        {heading}
      </Heading>

      <Text
        style={{
          fontSize: '15px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '24px',
          margin: '0 0 20px'
        }}
      >
        {intro}
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
        {bankName ? summaryRow(t.bankLabel, bankName) : null}
        {summaryRow(t.accountLabel, accountNumberMasked ?? t.maskedFallback, true)}
        {summaryRow(t.currencyLabel, currency)}
        {summaryRow(kind === 'cancelled' ? t.cancelledDateLabel : t.effectiveDateLabel, formatDateLabel(effectiveAt))}
        {reason ? summaryRow(t.reasonLabel, reason) : null}
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
        {t.securityNotice}
      </Text>

      {!requestedByMember && kind !== 'cancelled' && (
        <Text
          style={{
            fontSize: '13px',
            color: EMAIL_COLORS.muted,
            lineHeight: '20px',
            margin: '0 0 8px'
          }}
        >
          {t.unrecognizedChangeNotice}
        </Text>
      )}

      <Text
        style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0'
        }}
      >
        {t.automatedFooterPrefix}{APP_URL}
      </Text>
    </EmailLayout>
  )
}
