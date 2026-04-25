import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface QuoteSharePromptEmailProps {
  shareUrl: string
  quotationNumber: string
  versionNumber: number
  clientName: string
  recipientName?: string | null
  totalLabel: string
  validUntilLabel: string | null
  senderName: string
  senderRole?: string | null
  senderEmail?: string | null
  customMessage?: string | null
  hasPdfAttached?: boolean
  pdfFileName?: string | null
}

const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes || !Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * TASK-631 Fase 4 — Email template with PDF attachment support + org context.
 *
 * Now displays:
 * - "Propuesta para [empresa]" header (always visible — context for forward)
 * - Personalized greeting using `recipientName`
 * - PDF attachment notice when `hasPdfAttached`
 * - Custom message + standard copy concatenated (never overrides)
 */
export default function QuoteSharePromptEmail({
  shareUrl = 'https://greenhouse.efeoncepro.com/q/A3kF9pX',
  quotationNumber = 'EFG-2026-00184',
  versionNumber = 2,
  clientName = 'Banco Industrial Latinoamericano',
  recipientName = 'María Elena Vargas',
  totalLabel = 'USD 184,500',
  validUntilLabel = '30/05/2026',
  senderName = 'Julio Reyes',
  senderRole = 'Account Lead · Efeonce Globe',
  senderEmail = 'jreyes@efeoncepro.com',
  customMessage = null,
  hasPdfAttached = false,
  pdfFileName = null
}: QuoteSharePromptEmailProps) {
  const firstName = recipientName?.split(' ')[0] ?? null
  const greeting = firstName ? `Hola ${firstName},` : 'Hola,'

  return (
    <EmailLayout previewText={`Propuesta ${quotationNumber} v${versionNumber} para ${clientName}`}>
      <Section>
        <Text
          style={{
            fontFamily: EMAIL_FONTS.body,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: EMAIL_COLORS.muted,
            margin: '0 0 4px 0'
          }}
        >
          Propuesta para
        </Text>
        <Heading
          as='h1'
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: 24,
            fontWeight: 600,
            color: EMAIL_COLORS.primary,
            margin: '0 0 24px 0',
            lineHeight: 1.2
          }}
        >
          {clientName}
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
          {greeting}
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
        ) : null}

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
          </strong>{' '}
          que preparamos para tu equipo en {clientName}.
          {hasPdfAttached
            ? ' Adjuntamos el PDF para tu conveniencia y también puedes revisarla y aceptarla directamente desde el link.'
            : ' Puedes revisarla, descargarla en PDF y aceptarla directamente desde el link.'}
        </Text>

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

        {hasPdfAttached && pdfFileName ? (
          <Text
            style={{
              fontFamily: EMAIL_FONTS.body,
              fontSize: 13,
              color: EMAIL_COLORS.muted,
              lineHeight: 1.5,
              margin: '0 0 16px 0',
              padding: '8px 12px',
              background: EMAIL_COLORS.footerBg,
              borderRadius: 6,
              borderLeft: `3px solid ${EMAIL_COLORS.primary}`
            }}
          >
            📎 Adjunto: <strong>{pdfFileName}</strong>
          </Text>
        ) : null}

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

// Re-export for templates.ts plain-text builder consumption
export { formatBytes }
