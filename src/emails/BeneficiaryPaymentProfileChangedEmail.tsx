import { Heading, Section, Text } from '@react-email/components'

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
 */

export type PaymentProfileEmailKind = 'created' | 'approved' | 'superseded' | 'cancelled'

export interface BeneficiaryPaymentProfileChangedEmailProps {
  fullName: string
  kind: PaymentProfileEmailKind
  providerLabel: string | null
  bankName: string | null
  accountNumberMasked: string | null
  currency: 'CLP' | 'USD'
  effectiveAt: string | null
  reason: string | null
  requestedByMember: boolean
}

const KIND_HEADINGS: Record<PaymentProfileEmailKind, string> = {
  created: 'Solicitud de cambio registrada',
  approved: 'Tu cuenta de pago fue aprobada',
  superseded: 'Tu cuenta de pago fue reemplazada',
  cancelled: 'Tu solicitud de cambio fue cancelada'
}

const KIND_PREVIEWS: Record<PaymentProfileEmailKind, string> = {
  created: 'Tu solicitud está en revisión por finance',
  approved: 'Tu cuenta de pago quedó activa',
  superseded: 'Tu cuenta activa fue reemplazada por una nueva',
  cancelled: 'Tu solicitud fue cancelada'
}

const KIND_INTROS: Record<PaymentProfileEmailKind, (firstName: string, requestedByMember: boolean) => string> = {
  created: (firstName, requestedByMember) =>
    requestedByMember
      ? `Hola ${firstName}, registramos tu solicitud de cambio de cuenta de pago. Finance la revisará en las próximas horas y recibirás otro mail cuando quede activa.`
      : `Hola ${firstName}, finance registró una nueva cuenta de pago para ti. Verifica que los datos sean correctos. Si no reconoces este cambio, responde este mail al equipo de finance de inmediato.`,
  approved: (firstName) =>
    `Hola ${firstName}, tu cuenta de pago quedó activa. Los próximos pagos se ejecutarán a esta cuenta.`,
  superseded: (firstName) =>
    `Hola ${firstName}, tu cuenta de pago activa fue reemplazada por una nueva. La cuenta anterior queda fuera de uso.`,
  cancelled: (firstName) =>
    `Hola ${firstName}, tu solicitud de cambio de cuenta de pago fue cancelada. Si no fuiste tú, contacta a finance.`
}

const formatDateLabel = (iso: string | null): string => {
  if (!iso) return 'Sin fecha registrada'

  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return iso
  }
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
  providerLabel = 'Banco de Chile',
  bankName = null,
  accountNumberMasked = '•••• 4321',
  currency = 'CLP',
  effectiveAt = null,
  reason = null,
  requestedByMember = false
}: BeneficiaryPaymentProfileChangedEmailProps) {
  const heading = KIND_HEADINGS[kind]
  const preview = KIND_PREVIEWS[kind]
  const firstName = fullName.split(' ')[0] || fullName
  const intro = KIND_INTROS[kind](firstName, requestedByMember)
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
        {providerLabel ? summaryRow('Proveedor', providerLabel) : null}
        {bankName ? summaryRow('Banco', bankName) : null}
        {summaryRow('Cuenta', accountNumberMasked ?? '—', true)}
        {summaryRow('Moneda', currency)}
        {summaryRow(kind === 'cancelled' ? 'Fecha de cancelación' : 'Fecha efectiva', formatDateLabel(effectiveAt))}
        {reason ? summaryRow('Motivo', reason) : null}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={appUrl}>Ver mi cuenta de pago</EmailButton>
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
        Por seguridad, NUNCA mostramos el número completo de tu cuenta. Si necesitas verificar el dato, ingresa al portal con tu sesión.
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
          Si no reconoces este cambio, responde este mail o contacta a finance de inmediato.
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
        Greenhouse by Efeonce Group SpA · Este es un correo automático enviado desde {APP_URL}
      </Text>
    </EmailLayout>
  )
}
