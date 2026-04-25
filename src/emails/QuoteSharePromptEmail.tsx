import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface QuoteSharePromptEmailProps {
  shareUrl: string
  quotationNumber: string
  versionNumber: number
  clientName: string
  totalLabel: string
  validUntilLabel: string | null
  senderName: string
  senderRole?: string | null
  senderEmail?: string | null
  customMessage?: string | null
}

/**
 * TASK-631 Fase 2 — Email template that delivers the public quote link.
 *
 * Sales rep clicks "Enviar por email" in the share drawer → this email is
 * sent to the client with the short link. Branded with Efeonce identity,
 * mobile-friendly, single-CTA "Ver propuesta".
 */
export default function QuoteSharePromptEmail({
  shareUrl = 'https://greenhouse.efeoncepro.com/q/A3kF9pX',
  quotationNumber = 'EFG-2026-00184',
  versionNumber = 2,
  clientName = 'Banco Industrial Latinoamericano',
  totalLabel = 'USD 184,500',
  validUntilLabel = '30/05/2026',
  senderName = 'Julio Reyes',
  senderRole = 'Account Lead · Efeonce Globe',
  senderEmail = 'jreyes@efeoncepro.com',
  customMessage = null
}: QuoteSharePromptEmailProps) {
  return (
    <EmailLayout previewText={`Propuesta ${quotationNumber} v${versionNumber} para ${clientName}`}>
      <Section>
        <Heading
          as='h1'
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: 24,
            fontWeight: 600,
            color: EMAIL_COLORS.primary,
            margin: '0 0 16px 0',
            lineHeight: 1.2
          }}
        >
          Tu propuesta está lista
        </Heading>
        <Text
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: 15,
            color: EMAIL_COLORS.text,
            lineHeight: 1.6,
            margin: '0 0 16px 0'
          }}
        >
          Hola {clientName},
        </Text>
        {customMessage ? (
          <Text
            style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: 15,
              color: EMAIL_COLORS.text,
              lineHeight: 1.6,
              margin: '0 0 16px 0',
              whiteSpace: 'pre-wrap'
            }}
          >
            {customMessage}
          </Text>
        ) : (
          <Text
            style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: 15,
              color: EMAIL_COLORS.text,
              lineHeight: 1.6,
              margin: '0 0 16px 0'
            }}
          >
            Te comparto la propuesta comercial{' '}
            <strong>
              {quotationNumber} v{versionNumber}
            </strong>
            . Puedes revisarla, descargarla en PDF y aceptarla directamente desde el link.
          </Text>
        )}
        <Section
          style={{
            background: EMAIL_COLORS.footerBg,
            borderRadius: 8,
            padding: 20,
            margin: '24px 0'
          }}
        >
          <Text
            style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: EMAIL_COLORS.muted,
              margin: '0 0 4px 0'
            }}
          >
            Inversión total
          </Text>
          <Text
            style={{
              fontFamily: EMAIL_FONTS.heading,
              fontSize: 22,
              fontWeight: 600,
              color: EMAIL_COLORS.primary,
              margin: '0 0 12px 0'
            }}
          >
            {totalLabel}
          </Text>
          {validUntilLabel ? (
            <Text
              style={{
                fontFamily: EMAIL_FONTS.body,
                fontSize: 13,
                color: EMAIL_COLORS.muted,
                margin: 0
              }}
            >
              Válida hasta el <strong>{validUntilLabel}</strong>
            </Text>
          ) : null}
        </Section>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <EmailButton href={shareUrl}>Ver propuesta</EmailButton>
        </Section>
        <Text
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: 13,
            color: EMAIL_COLORS.muted,
            lineHeight: 1.5,
            margin: '16px 0 0 0',
            wordBreak: 'break-all'
          }}
        >
          Si el botón no funciona, copia este link en tu navegador:
          <br />
          <a href={shareUrl} style={{ color: EMAIL_COLORS.primary }}>
            {shareUrl}
          </a>
        </Text>
        <Text
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: 14,
            color: EMAIL_COLORS.text,
            lineHeight: 1.5,
            margin: '32px 0 0 0',
            paddingTop: 24,
            borderTop: `1px solid ${EMAIL_COLORS.border}`
          }}
        >
          Cualquier duda, escríbeme directamente.
          <br />
          <strong>{senderName}</strong>
          {senderRole ? (
            <>
              <br />
              <span style={{ color: EMAIL_COLORS.muted, fontSize: 13 }}>{senderRole}</span>
            </>
          ) : null}
          {senderEmail ? (
            <>
              <br />
              <a href={`mailto:${senderEmail}`} style={{ color: EMAIL_COLORS.primary, fontSize: 13 }}>
                {senderEmail}
              </a>
            </>
          ) : null}
        </Text>
      </Section>
    </EmailLayout>
  )
}
