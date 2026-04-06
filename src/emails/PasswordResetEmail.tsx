import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PasswordResetEmailProps {
  resetUrl: string
  userName?: string
  locale?: 'es' | 'en'
}

export default function PasswordResetEmail({ resetUrl, userName, locale = 'es' }: PasswordResetEmailProps) {
  const t = locale === 'en' ? {
    heading: 'Reset your password',
    greeting: (name?: string) => name ? `Hi ${name},` : 'Hi,',
    body: 'we received your request to change your Greenhouse account password.',
    validityPrefix: 'Click the button below to choose a new password. The link is valid for ',
    validityBold: '1 hour',
    validitySuffix: ' and can only be used once.',
    cta: 'Change my password',
    disclaimer: 'If you did not make this request, don\u2019t worry \u2014 your current password is still secure and has not been changed. You can ignore this email.',
    fallback: 'If the button does not work, copy and paste this address into your browser:',
    previewText: 'Password reset request \u2014 link valid for 1 hour'
  } : {
    heading: 'Restablece tu contrase\u00f1a',
    greeting: (name?: string) => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
    body: 'recibimos tu solicitud para cambiar la contrase\u00f1a de tu cuenta en Greenhouse.',
    validityPrefix: 'Haz clic en el siguiente bot\u00f3n para elegir una nueva contrase\u00f1a. El enlace es v\u00e1lido por ',
    validityBold: '1 hora',
    validitySuffix: ' y solo puede usarse una vez.',
    cta: 'Cambiar mi contrase\u00f1a',
    disclaimer: 'Si no realizaste esta solicitud, no te preocupes \u2014 tu contrase\u00f1a actual sigue siendo segura y no se ha modificado. Puedes ignorar este correo.',
    fallback: 'Si el bot\u00f3n no funciona, copia y pega esta direcci\u00f3n en tu navegador:',
    previewText: 'Solicitud de cambio de contrase\u00f1a \u2014 enlace v\u00e1lido por 1 hora'
  }

  return (
    <EmailLayout previewText={t.previewText} locale={locale}>
      <Heading style={{
        fontFamily: EMAIL_FONTS.heading,
        fontSize: '24px',
        fontWeight: 700,
        color: EMAIL_COLORS.text,
        margin: '0 0 8px',
        lineHeight: '32px',
      }}>
        {t.heading}
      </Heading>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 20px',
      }}>
        {t.greeting(userName)} {t.body}
      </Text>

      <Text style={{
        fontSize: '15px',
        color: EMAIL_COLORS.secondary,
        lineHeight: '24px',
        margin: '0 0 28px',
      }}>
        {t.validityPrefix}<strong>{t.validityBold}</strong>{t.validitySuffix}
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
        <EmailButton href={resetUrl}>{t.cta}</EmailButton>
      </Section>

      <Text style={{
        fontSize: '13px',
        color: EMAIL_COLORS.muted,
        lineHeight: '20px',
        margin: '0 0 8px',
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
        paddingTop: '20px',
      }}>
        {t.disclaimer}
      </Text>

      <Text style={{
        fontSize: '12px',
        color: EMAIL_COLORS.muted,
        lineHeight: '18px',
        margin: '0',
      }}>
        {t.fallback}{' '}
        <span style={{ wordBreak: 'break-all' as const }}>{resetUrl}</span>
      </Text>
    </EmailLayout>
  )
}
