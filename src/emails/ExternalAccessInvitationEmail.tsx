import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type ExternalAccessInvitationEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1837 — Invitación a **Efeonce ID** enviada por el sistema.
 *
 * Quien la recibe es una persona EXTERNA (organización cliente) que todavía no tiene identidad en el
 * emisor: el enlace es la única llave, funciona una vez y caduca. Marca Efeonce (no el portal). El
 * cuerpo nunca se persiste (`token_sensitive`). El host del emisor se nombra explícitamente para que
 * la persona pueda verificar a dónde la lleva el botón antes de hacer clic (anti-phishing).
 */

interface ExternalAccessInvitationEmailProps {
  acceptanceUrl: string
  issuerHost: string
  organizationName?: string | null
  locale?: 'es' | 'en'
  expiresInHours?: number
}

const LEGACY_EN_EXTERNAL_ACCESS_INVITATION_COPY: ExternalAccessInvitationEmailTemplateCopy = {
  heading: "You've been invited to Efeonce",
  greeting: 'Hi,',
  body: organizationName =>
    organizationName
      ? `you have been invited to access Efeonce on behalf of ${organizationName}. With this access you can authorize applications that work with your organization.`
      : 'you have been invited to access Efeonce. With this access you can authorize applications that work with your organization.',
  validityPrefix: 'This link works once and expires in',
  validityBold: expiresInHours => `${expiresInHours} hours`,
  cta: 'Accept invitation',
  afterAccept: 'After accepting, we will send a sign-in link to this same address to confirm it is you.',
  issuerNote: issuerHost => `This link takes you to ${issuerHost}, the Efeonce identity service.`,
  disclaimer: 'If you were not expecting this invitation, ignore this email: nobody can get in without this link.',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  previewText: expiresInHours => `You've been invited to Efeonce — link valid for ${expiresInHours} hours`
}

export default function ExternalAccessInvitationEmail({
  acceptanceUrl = 'https://auth.efeonce.org/i/preview-token',
  issuerHost = 'auth.efeonce.org',
  organizationName = null,
  locale = 'es',
  expiresInHours = 72
}: ExternalAccessInvitationEmailProps) {
  const t = selectEmailTemplateCopy(
    locale,
    getMicrocopy().emails.auth.externalAccessInvitation,
    LEGACY_EN_EXTERNAL_ACCESS_INVITATION_COPY
  )

  return (
    <EmailLayout previewText={t.previewText(expiresInHours)} locale={locale} brand='efeonce'>
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
          margin: '0 0 12px'
        }}
      >
        {t.greeting} {t.body(organizationName)}
      </Text>

      <Text
        style={{
          fontSize: '15px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '24px',
          margin: '0 0 20px'
        }}
      >
        {t.validityPrefix} <strong>{t.validityBold(expiresInHours)}</strong>.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 20px' }}>
        <EmailButton href={acceptanceUrl}>{t.cta}</EmailButton>
      </Section>

      <Text
        style={{
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
          margin: '0 0 8px'
        }}
      >
        {t.issuerNote(issuerHost)} {t.afterAccept}
      </Text>

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
        {t.fallback} <span style={{ wordBreak: 'break-all' as const }}>{acceptanceUrl}</span>
      </Text>
    </EmailLayout>
  )
}
