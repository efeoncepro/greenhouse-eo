import {
  Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text
} from '@react-email/components'

import { getMicrocopy } from '@/lib/copy'

import { APP_URL, EMAIL_COLORS, EMAIL_FONTS, LOGO_URL } from '../constants'

interface EmailLayoutProps {
  children: React.ReactNode
  previewText?: string
  lang?: 'es' | 'en'
  locale?: 'es' | 'en'
  unsubscribeUrl?: string
}

const LEGACY_EN_LAYOUT_COPY = {
  automatedDisclaimer: 'This is an automated email. If you have questions, contact your administrator.',
  unsubscribe: 'Unsubscribe from these emails'
}

export default function EmailLayout({ children, previewText, lang, locale = 'es', unsubscribeUrl }: EmailLayoutProps) {
  const effectiveLang = lang ?? locale
  const layoutCopy = getMicrocopy().emails.layout

  const automatedDisclaimer = effectiveLang === 'en'
    ? LEGACY_EN_LAYOUT_COPY.automatedDisclaimer
    : layoutCopy.automatedDisclaimer

  const unsubscribeLabel = effectiveLang === 'en'
    ? LEGACY_EN_LAYOUT_COPY.unsubscribe
    : layoutCopy.unsubscribe

  return (
    <Html lang={effectiveLang} dir="ltr">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=DM+Sans:wght@400;500&display=swap');`}</style>
      </Head>
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{
        backgroundColor: EMAIL_COLORS.background,
        fontFamily: EMAIL_FONTS.body,
        margin: 0,
        padding: 0,
        WebkitTextSizeAdjust: '100%',
      }}>
        {/* Header with gradient */}
        <Section style={{
          background: `linear-gradient(135deg, ${EMAIL_COLORS.headerBg} 0%, ${EMAIL_COLORS.headerAccent} 100%)`,
          backgroundColor: EMAIL_COLORS.headerBg,
          padding: '28px 0 24px',
          textAlign: 'center' as const,
        }}>
          <Link href={APP_URL} style={{ textDecoration: 'none' }}>
            <Img
              src={LOGO_URL}
              alt={layoutCopy.logoAlt}
              width={160}
              height={37}
              style={{ margin: '0 auto', display: 'block' }}
            />
          </Link>
        </Section>

        {/* Body card */}
        <Container style={{
          maxWidth: '560px',
          margin: '-20px auto 0',
          backgroundColor: EMAIL_COLORS.containerBg,
          borderRadius: '12px',
          padding: '40px 36px 32px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.1)',
          position: 'relative' as const,
        }}>
          {children}
        </Container>

        {/* Footer */}
        <Section style={{
          textAlign: 'center' as const,
          padding: '24px 20px 32px',
          maxWidth: '560px',
          margin: '0 auto',
        }}>
          <Hr style={{
            borderColor: EMAIL_COLORS.border,
            borderTop: 'none',
            margin: '0 0 20px',
          }} />
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '13px',
            color: EMAIL_COLORS.muted,
            lineHeight: '20px',
            margin: '0 0 4px',
          }}>
            {layoutCopy.tagline}
          </Text>
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '12px',
            color: EMAIL_COLORS.muted,
            lineHeight: '18px',
            margin: '0',
          }}>
            {automatedDisclaimer}
          </Text>
          {unsubscribeUrl && (
            <Text style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: '11px',
              color: EMAIL_COLORS.muted,
              lineHeight: '16px',
              margin: '12px 0 0',
            }}>
              <Link href={unsubscribeUrl} style={{ color: EMAIL_COLORS.muted, textDecoration: 'underline' }}>
                {unsubscribeLabel}
              </Link>
            </Text>
          )}
        </Section>
      </Body>
    </Html>
  )
}
