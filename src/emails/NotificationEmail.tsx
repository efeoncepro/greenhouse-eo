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
  locale?: 'es' | 'en'
}

export default function NotificationEmail({
  title = 'Nuevo activo disponible para revisión',
  body = 'El equipo de diseño subió 3 nuevos archivos al proyecto Campaña Q2. Requieren tu aprobación antes del viernes.',
  actionUrl = 'https://greenhouse.efeoncepro.com/delivery',
  actionLabel,
  recipientName = 'María González',
  locale = 'es'
}: NotificationEmailProps) {
  const t = locale === 'en' ? {
    greeting: (name?: string) => name ? `Hi ${name},` : 'Hi,',
    defaultAction: 'View in Greenhouse',
    fallback: 'If the button does not work, copy and paste this address into your browser:'
  } : {
    greeting: (name?: string) => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
    defaultAction: 'Ver en Greenhouse',
    fallback: 'Si el bot\u00f3n no funciona, copia y pega esta direcci\u00f3n en tu navegador:'
  }

  return (
    <EmailLayout previewText={title} locale={locale}>
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
        {t.greeting(recipientName)}
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
          <EmailButton href={actionUrl}>{actionLabel || t.defaultAction}</EmailButton>
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
          {t.fallback} {actionUrl}
        </Text>
      )}
    </EmailLayout>
  )
}
