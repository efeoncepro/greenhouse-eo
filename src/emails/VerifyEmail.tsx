import { Heading, Section, Text } from '@react-email/components'

import { getMicrocopy, type VerifyEmailTemplateCopy } from '@/lib/copy'
import { selectEmailTemplateCopy } from '@/lib/email/template-copy'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface VerifyEmailProps {
  verifyUrl: string
  userName?: string
  locale?: 'es' | 'en'
}

const LEGACY_EN_VERIFY_EMAIL_COPY: VerifyEmailTemplateCopy = {
  heading: 'Confirm your email',
  greeting: name => name ? `Hi ${name},` : 'Hi,',
  body: 'we need to verify that this email address belongs to you to complete your Greenhouse account setup.',
  validityPrefix: 'Click the button below to confirm. The link is valid for ',
  validityBold: '24 hours',
  validitySuffix: '.',
  cta: 'Confirm my email',
  disclaimer: 'If you did not create a Greenhouse account, you can safely ignore this email.',
  fallback: 'If the button does not work, copy and paste this address into your browser:',
  previewText: 'Confirm your email to complete your Greenhouse registration'
}

export default function VerifyEmail({
  verifyUrl = 'https://greenhouse.efeoncepro.com/auth/verify-email?token=preview-token',
  userName = 'María González',
  locale = 'es'
}: VerifyEmailProps) {
  const t = selectEmailTemplateCopy(locale, getMicrocopy().emails.auth.verifyEmail, LEGACY_EN_VERIFY_EMAIL_COPY)

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
