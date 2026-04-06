import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface VerifyEmailProps {
  verifyUrl: string
  userName?: string
  locale?: 'es' | 'en'
}

export default function VerifyEmail({ verifyUrl, userName, locale = 'es' }: VerifyEmailProps) {
  const t = locale === 'en' ? {
    heading: 'Confirm your email',
    greeting: (name?: string) => name ? `Hi ${name},` : 'Hi,',
    body: 'we need to verify that this email address belongs to you to complete your Greenhouse account setup.',
    validityPrefix: 'Click the button below to confirm. The link is valid for ',
    validityBold: '24 hours',
    validitySuffix: '.',
    cta: 'Confirm my email',
    disclaimer: 'If you did not create a Greenhouse account, you can safely ignore this email.',
    fallback: 'If the button does not work, copy and paste this address into your browser:',
    previewText: 'Confirm your email to complete your Greenhouse registration'
  } : {
    heading: 'Confirma tu correo electr\u00f3nico',
    greeting: (name?: string) => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
    body: 'necesitamos verificar que esta direcci\u00f3n de correo te pertenece para completar la configuraci\u00f3n de tu cuenta en Greenhouse.',
    validityPrefix: 'Haz clic en el siguiente bot\u00f3n para confirmar. El enlace es v\u00e1lido por ',
    validityBold: '24 horas',
    validitySuffix: '.',
    cta: 'Confirmar mi correo',
    disclaimer: 'Si no creaste una cuenta en Greenhouse, puedes ignorar este correo de forma segura.',
    fallback: 'Si el bot\u00f3n no funciona, copia y pega esta direcci\u00f3n en tu navegador:',
    previewText: 'Confirma tu correo para completar tu registro en Greenhouse'
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
        <EmailButton href={verifyUrl}>{t.cta}</EmailButton>
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
        <span style={{ wordBreak: 'break-all' as const }}>{verifyUrl}</span>
      </Text>
    </EmailLayout>
  )
}
