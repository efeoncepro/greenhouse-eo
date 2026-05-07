import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type InvitationEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface InvitationEmailProps {
  inviteUrl: string
  inviterName: string
  clientName: string
  userName?: string
  locale?: 'es' | 'en'
}

const LEGACY_EN_INVITATION_EMAIL_COPY: InvitationEmailTemplateCopy = {
  heading: 'You have been invited to Greenhouse',
  greeting: name => name ? `Hi ${name},` : 'Hi,',
  bodyPrefix: 'invited you to join',
  bodySuffix: "'s team on Efeonce Greenhouse\u2122, the management and operations platform.",
  validityPrefix: 'You just need to create your password to activate your account. The link is valid for ',
  validityBold: '72 hours',
  validitySuffix: '.',
  cta: 'Activate my account',
  disclaimer: 'If you were not expecting this invitation, you can safely ignore this email.',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  previewText: (inviter, client) => `${inviter} invited you to ${client} on Greenhouse`
}

export default function InvitationEmail({
  inviteUrl = 'https://greenhouse.efeoncepro.com/auth/accept-invite?token=preview-token',
  inviterName = 'Julio Reyes',
  clientName = 'Efeonce Group',
  userName = 'María González',
  locale = 'es'
}: InvitationEmailProps) {
  const t = selectEmailTemplateCopy(locale, getMicrocopy().emails.auth.invitation, LEGACY_EN_INVITATION_EMAIL_COPY)

  return (
    <EmailLayout previewText={t.previewText(inviterName, clientName)} locale={locale}>
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
        {t.greeting(userName)} <strong>{inviterName}</strong> {t.bodyPrefix} <strong>{clientName}</strong>{t.bodySuffix}
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
        <EmailButton href={inviteUrl}>{t.cta}</EmailButton>
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
        <span style={{ wordBreak: 'break-all' as const }}>{inviteUrl}</span>
      </Text>
    </EmailLayout>
  )
}
