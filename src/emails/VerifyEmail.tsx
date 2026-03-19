import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface VerifyEmailProps {
  verifyUrl: string
  userName?: string
}

export default function VerifyEmail({ verifyUrl, userName }: VerifyEmailProps) {
  return (
    <EmailLayout previewText="Confirma tu dirección de correo">
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '22px',
        fontWeight: 600,
        color: EMAIL_COLORS.text,
        margin: '0 0 16px',
      }}>
        Confirma tu dirección de correo
      </Heading>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.text, lineHeight: '24px' }}>
        {userName ? `Hola ${userName},` : 'Hola,'}
      </Text>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.text, lineHeight: '24px' }}>
        Necesitamos verificar que esta dirección de correo te pertenece.
        Haz clic en el botón para confirmar. Este enlace expira en 24 horas.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <EmailButton href={verifyUrl}>Verificar email</EmailButton>
      </Section>
    </EmailLayout>
  )
}
