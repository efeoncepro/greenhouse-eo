import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface MagicLinkEmailProps {
  magicLinkUrl: string
  userName?: string
  locale?: 'es' | 'en'
  expiresInMinutes?: number
}

export default function MagicLinkEmail({
  magicLinkUrl = 'https://greenhouse.efeoncepro.com/auth/magic-link/consume?tokenId=preview&token=preview',
  userName = 'María González',
  locale = 'es',
  expiresInMinutes = 15
}: MagicLinkEmailProps) {
  const t = locale === 'en' ? {
    heading: 'Sign in to Greenhouse',
    greeting: (name?: string) => name ? `Hi ${name.split(' ')[0]},` : 'Hi,',
    body: 'use the button below to sign in to Greenhouse. This link works once and expires in',
    validityBold: `${expiresInMinutes} minutes`,
    cta: 'Sign in to Greenhouse',
    disclaimer: 'If you didn’t request this email, you can safely ignore it. Your account is still secure.',
    fallback: 'If the button doesn’t work, copy and paste this address into your browser:',
    previewText: `Magic sign-in link — valid for ${expiresInMinutes} minutes`
  } : {
    heading: 'Acceso a Greenhouse',
    greeting: (name?: string) => name ? `Hola ${name.split(' ')[0]},` : 'Hola,',
    body: 'usa el botón abajo para entrar a Greenhouse. Este enlace funciona una sola vez y expira en',
    validityBold: `${expiresInMinutes} minutos`,
    cta: 'Entrar a Greenhouse',
    disclaimer: 'Si no solicitaste este correo, puedes ignorarlo. Tu cuenta sigue siendo segura.',
    fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
    previewText: `Enlace de acceso mágico — válido por ${expiresInMinutes} minutos`
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
        {t.greeting(userName)} {t.body} <strong>{t.validityBold}</strong>.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
        <EmailButton href={magicLinkUrl}>{t.cta}</EmailButton>
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
        <span style={{ wordBreak: 'break-all' as const }}>{magicLinkUrl}</span>
      </Text>
    </EmailLayout>
  )
}
