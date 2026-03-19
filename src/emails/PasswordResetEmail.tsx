import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PasswordResetEmailProps {
  resetUrl: string
  userName?: string
}

export default function PasswordResetEmail({ resetUrl, userName }: PasswordResetEmailProps) {
  const greeting = userName ? `Hola ${userName.split(' ')[0]},` : 'Hola,'

  return (
    <EmailLayout previewText="Solicitud de cambio de contraseña — enlace válido por 1 hora">
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px',
      }}>
        Restablece tu contraseña
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        {greeting} recibimos tu solicitud para cambiar la contraseña de tu cuenta en Greenhouse.
      </Text>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 28px',
      }}>
        Haz clic en el siguiente botón para elegir una nueva contraseña. El enlace es válido por <strong>1 hora</strong> y solo puede usarse una vez.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
        <EmailButton href={resetUrl}>Cambiar mi contraseña</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        Si no realizaste esta solicitud, no te preocupes — tu contraseña actual sigue siendo segura y no se ha modificado. Puedes ignorar este correo.
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        Si el botón no funciona, copia y pega esta dirección en tu navegador:{' '}
        <span style={{ wordBreak: 'break-all' as const }}>{resetUrl}</span>
      </Text>
    </EmailLayout>
  )
}
