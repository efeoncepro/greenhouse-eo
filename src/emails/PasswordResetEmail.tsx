import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PasswordResetEmailProps {
  resetUrl: string
  userName?: string
}

export default function PasswordResetEmail({ resetUrl, userName }: PasswordResetEmailProps) {
  return (
    <EmailLayout previewText="Recibimos una solicitud para restablecer tu contraseña">
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '22px',
        fontWeight: 600,
        color: EMAIL_COLORS.text,
        margin: '0 0 16px',
      }}>
        ¿Necesitas restablecer tu contraseña?
      </Heading>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.text, lineHeight: '24px' }}>
        {userName ? `Hola ${userName},` : 'Hola,'}
      </Text>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.text, lineHeight: '24px' }}>
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en Greenhouse.
        Haz clic en el botón para crear una nueva contraseña. Este enlace expira en 1 hora.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <EmailButton href={resetUrl}>Restablecer contraseña</EmailButton>
      </Section>

      <Text style={{ fontSize: '13px', color: EMAIL_COLORS.muted, lineHeight: '20px' }}>
        Si no solicitaste esto, puedes ignorar este mensaje. Tu contraseña actual no ha sido modificada.
      </Text>
    </EmailLayout>
  )
}
