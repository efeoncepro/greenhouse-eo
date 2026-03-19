import {
  Body, Container, Head, Html, Img, Preview, Section, Text
} from '@react-email/components'

import { EMAIL_COLORS, EMAIL_FONTS } from '../constants'

interface EmailLayoutProps {
  children: React.ReactNode
  previewText?: string
}

export default function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=DM+Sans:wght@400;500&display=swap');`}</style>
      </Head>
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{
        backgroundColor: EMAIL_COLORS.background,
        fontFamily: EMAIL_FONTS.body,
        margin: 0,
        padding: 0,
      }}>
        {/* Header */}
        <Section style={{
          backgroundColor: EMAIL_COLORS.headerBg,
          padding: '24px 0',
          textAlign: 'center' as const,
        }}>
          <Img
            src="https://greenhouse.efeoncepro.com/images/logos/efeonce-wordmark-white.png"
            alt="Efeonce"
            width={140}
            height={32}
            style={{ margin: '0 auto' }}
          />
        </Section>

        {/* Body card */}
        <Container style={{
          maxWidth: '600px',
          margin: '32px auto',
          backgroundColor: EMAIL_COLORS.containerBg,
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          {children}
        </Container>

        {/* Footer */}
        <Section style={{ textAlign: 'center' as const, padding: '0 0 32px' }}>
          <Text style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: '13px',
            color: EMAIL_COLORS.muted,
            lineHeight: '20px',
          }}>
            Efeonce Greenhouse™ · Empower your Growth
          </Text>
        </Section>
      </Body>
    </Html>
  )
}
