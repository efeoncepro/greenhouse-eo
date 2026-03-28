import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface NotificationEmailProps {
  title: string
  body?: string
  actionUrl?: string
  actionLabel?: string
  recipientName?: string
}

export default function NotificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
  recipientName
}: NotificationEmailProps) {
  const greeting = recipientName ? `Hola ${recipientName.split(' ')[0]},` : 'Hola,'

  return (
    <EmailLayout previewText={title}>
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px'
      }}>
        {title}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px'
      }}>
        {greeting}
      </Text>

      {body && (
        <Text style={{
          fontSize: '15px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '24px',
          margin: '0 0 28px'
        }}>
          {body}
        </Text>
      )}

      {actionUrl && (
        <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
          <EmailButton href={actionUrl}>{actionLabel || 'Ver en Greenhouse'}</EmailButton>
        </Section>
      )}

      {actionUrl && (
        <Text style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0',
          wordBreak: 'break-all'
        }}>
          Si el botón no funciona, copia y pega esta dirección en tu navegador: {actionUrl}
        </Text>
      )}
    </EmailLayout>
  )
}
