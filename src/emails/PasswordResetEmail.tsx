import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type PasswordResetEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface PasswordResetEmailProps {
  resetUrl: string
  userName?: string
  locale?: 'es' | 'en'
}

const LEGACY_EN_PASSWORD_RESET_EMAIL_COPY: PasswordResetEmailTemplateCopy = {
  heading: 'Reset your password',
  greeting: name => name ? `Hi ${name},` : 'Hi,',
  body: 'we received your request to change your Greenhouse account password.',
  validityPrefix: 'Click the button below to choose a new password. The link is valid for ',
  validityBold: '1 hour',
  validitySuffix: ' and can only be used once.',
  cta: 'Change my password',
  disclaimer: 'If you did not make this request, don\u2019t worry \u2014 your current password is still secure and has not been changed. You can ignore this email.',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  previewText: 'Password reset request \u2014 link valid for 1 hour'
}

export default function PasswordResetEmail({
  resetUrl = 'https://greenhouse.efeoncepro.com/auth/reset-password?token=preview-token',
  userName = 'María González',
  locale = 'es'
}: PasswordResetEmailProps) {
  const t = selectEmailTemplateCopy(locale, getMicrocopy().emails.auth.passwordReset, LEGACY_EN_PASSWORD_RESET_EMAIL_COPY)

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
