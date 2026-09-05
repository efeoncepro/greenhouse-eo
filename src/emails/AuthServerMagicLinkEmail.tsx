import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type MagicLinkEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1830 — Enlace de acceso a **Efeonce ID** (`auth.efeonce.org`), el authorization server propio.
 *
 * Deliberadamente separado de `MagicLinkEmail` (portal Greenhouse): quien lo recibe es una persona
 * EXTERNA que está autorizando una aplicación, no alguien que entra al portal interno. La marca, el
 * destino y la promesa son otras; compartir la plantilla haría que un cambio de copy del portal
 * llegara a clientes de terceros sin que nadie lo decidiera.
 */

interface AuthServerMagicLinkEmailProps {
  magicLinkUrl: string
  locale?: 'es' | 'en'
  expiresInMinutes?: number
}

const LEGACY_EN_AUTH_SERVER_MAGIC_LINK_COPY: MagicLinkEmailTemplateCopy = {
  heading: 'Confirm your Efeonce sign-in',
  greeting: () => 'Hi,',
  body: 'use the button below to confirm this is you and continue. This link works once and expires in',
  validityBold: expiresInMinutes => `${expiresInMinutes} minutes`,
  cta: 'Confirm and continue',
  disclaimer:
    'If you did not request this, ignore this email: without this link nobody can access your account.',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  previewText: expiresInMinutes => `Efeonce sign-in link — valid for ${expiresInMinutes} minutes`
}

export default function AuthServerMagicLinkEmail({
  magicLinkUrl = 'https://auth.efeonce.org/m/preview.preview',
  locale = 'es',
  expiresInMinutes = 15
}: AuthServerMagicLinkEmailProps) {
  const t = selectEmailTemplateCopy(
    locale,
    getMicrocopy().emails.auth.authServerMagicLink,
    LEGACY_EN_AUTH_SERVER_MAGIC_LINK_COPY
  )

  return (
    <EmailLayout previewText={t.previewText(expiresInMinutes)} locale={locale}>
      <Heading
        style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '24px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
          margin: '0 0 8px',
          lineHeight: '32px'
        }}
      >
        {t.heading}
      </Heading>

      <Text
        style={{
          fontSize: '15px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '24px',
          margin: '0 0 20px'
        }}
      >
        {t.greeting()} {t.body} <strong>{t.validityBold(expiresInMinutes)}</strong>.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
        <EmailButton href={magicLinkUrl}>{t.cta}</EmailButton>
      </Section>

      <Text
        style={{
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
          margin: '0 0 8px',
          borderTop: `1px solid ${EMAIL_COLORS.border}`,
          paddingTop: '20px'
        }}
      >
        {t.disclaimer}
      </Text>

      <Text
        style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0'
        }}
      >
        {t.fallback} <span style={{ wordBreak: 'break-all' as const }}>{magicLinkUrl}</span>
      </Text>
    </EmailLayout>
  )
}
