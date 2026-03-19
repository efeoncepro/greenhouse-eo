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
  return (
    <EmailLayout previewText={`${inviterName} te invitó a Greenhouse`}>
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '22px',
        fontWeight: 600,
        color: EMAIL_COLORS.text,
        margin: '0 0 16px',
      }}>
        Bienvenido a Greenhouse
      </Heading>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.text, lineHeight: '24px' }}>
        {userName ? `Hola ${userName},` : 'Hola,'}
      </Text>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.text, lineHeight: '24px' }}>
        {inviterName} te invitó a unirte a <strong>{clientName}</strong> en Efeonce Greenhouse™.
        Haz clic en el botón para crear tu cuenta. Este enlace expira en 72 horas.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <EmailButton href={inviteUrl}>Crear mi cuenta</EmailButton>
      </Section>
    </EmailLayout>
  )
}
