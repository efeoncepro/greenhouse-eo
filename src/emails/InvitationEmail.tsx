import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface InvitationEmailProps {
  inviteUrl: string
  inviterName: string
  clientName: string
  userName?: string
}

export default function InvitationEmail({ inviteUrl, inviterName, clientName, userName }: InvitationEmailProps) {
  const greeting = userName ? `Hola ${userName.split(' ')[0]},` : 'Hola,'

  return (
    <EmailLayout previewText={`${inviterName} te invitó a ${clientName} en Greenhouse`}>
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px',
      }}>
        Te han invitado a Greenhouse
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        {greeting} <strong>{inviterName}</strong> te invitó a unirte al equipo de <strong>{clientName}</strong> en Efeonce Greenhouse™, la plataforma de gestión y operaciones.
      </Text>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 28px',
      }}>
        Solo necesitas crear tu contraseña para activar tu cuenta. El enlace es válido por <strong>72 horas</strong>.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
        <EmailButton href={inviteUrl}>Activar mi cuenta</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        Si no esperabas esta invitación, puedes ignorar este correo de forma segura.
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        Si el botón no funciona, copia y pega esta dirección en tu navegador:{' '}
        <span style={{ wordBreak: 'break-all' as const }}>{inviteUrl}</span>
      </Text>
    </EmailLayout>
  )
}
