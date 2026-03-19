import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface VerifyEmailProps {
  verifyUrl: string
  userName?: string
}

export default function VerifyEmail({ verifyUrl, userName }: VerifyEmailProps) {
  const greeting = userName ? `Hola ${userName.split(' ')[0]},` : 'Hola,'

  return (
    <EmailLayout previewText="Confirma tu correo para completar tu registro en Greenhouse">
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px',
      }}>
        Confirma tu correo electrónico
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        {greeting} necesitamos verificar que esta dirección de correo te pertenece para completar la configuración de tu cuenta en Greenhouse.
      </Text>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 28px',
      }}>
        Haz clic en el siguiente botón para confirmar. El enlace es válido por <strong>24 horas</strong>.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
        <EmailButton href={verifyUrl}>Confirmar mi correo</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        Si no creaste una cuenta en Greenhouse, puedes ignorar este correo de forma segura.
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        Si el botón no funciona, copia y pega esta dirección en tu navegador:{' '}
        <span style={{ wordBreak: 'break-all' as const }}>{verifyUrl}</span>
      </Text>
    </EmailLayout>
  )
}
