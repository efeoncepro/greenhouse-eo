import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1375 — Email de entrega de ebook lead magnet (respaldo del download on-screen).
 *
 * GENÉRICO: sirve para CUALQUIER ebook. El contenido (título, bajada, puente, highlights)
 * llega por props desde el consumer, que lo lee del `success_behavior` del propio form —
 * nada está hardcodeado por ebook.
 *
 * BRAND = Efeonce (la AGENCIA), no el portal Greenhouse: lo recibe un prospecto público.
 * El link de descarga es la ruta GATED (`/api/public/growth/forms/{slug}/asset/{handle}`) —
 * el `handle` (submissionId) sólo existe tras completar el form. NO adjunta el PDF (lleva el
 * link). Craft (most-aware): confirmar + ENTREGAR (descarga) + UN puente. Sin sobre-vender.
 */
interface EbookDeliveryEmailProps {
  recipientName?: string
  ebookTitle?: string
  ebookTagline?: string
  downloadUrl?: string
  bridgeLabel?: string
  bridgeUrl?: string
  /** Opcional: bullets "qué vas a encontrar dentro" (por ebook). Si no vienen, se omiten. */
  highlights?: string[]
  locale?: 'es' | 'en'
}

export default function EbookDeliveryEmail({
  recipientName = 'María González',
  ebookTitle = 'El fin de la web',
  ebookTagline = 'Marketing digital + IA. Léelo en 20 minutos, aplícalo esta semana.',
  downloadUrl = 'https://greenhouse.efeoncepro.com/api/public/growth/forms/efeonce-web-agentica-ebook/asset/fsub-preview',
  bridgeLabel = 'Medir mi visibilidad',
  bridgeUrl = 'https://think.efeoncepro.com/brand-visibility',
  highlights,
  locale = 'es',
}: EbookDeliveryEmailProps) {
  const t =
    locale === 'en'
      ? {
          preview: 'Your ebook is ready. Download it and apply it this week.',
          heading: 'Your ebook is ready',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          intro: (title: string) => `Thanks for downloading «${title}». Here it is — ready to read and apply.`,
          rewardEyebrow: 'Your ebook',
          cta: 'Download the ebook',
          insideTitle: "What's inside",
          fallback: 'If the button does not work, copy and paste this address into your browser:',
        }
      : {
          preview: 'Tu ebook está listo. Descárgalo y aplícalo esta semana.',
          heading: 'Tu ebook está listo',
          greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
          intro: (title: string) => `Gracias por descargar «${title}». Aquí lo tienes — listo para leer y aplicar.`,
          rewardEyebrow: 'Tu ebook',
          cta: 'Descargar el ebook',
          insideTitle: 'Qué vas a encontrar dentro',
          fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
        }

  const firstName = recipientName?.split(' ')[0]

  return (
    <EmailLayout previewText={t.preview} locale={locale} brand='efeonce'>
      <Heading
        style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '24px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
          margin: '0 0 8px',
          lineHeight: '32px',
        }}
      >
        {t.heading}
      </Heading>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 8px' }}>
        {t.greeting(firstName)}
      </Text>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 24px' }}>
        {t.intro(ebookTitle)}
      </Text>

      {/* Reward card — el ebook + la descarga (el corazón del email) */}
      <Section
        style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '24px',
          margin: '0 0 28px',
          textAlign: 'center' as const,
        }}
      >
        <Text
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: EMAIL_COLORS.primary,
            margin: '0 0 6px',
          }}
        >
          {t.rewardEyebrow}
        </Text>
        <Heading
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '20px',
            fontWeight: 700,
            color: EMAIL_COLORS.text,
            margin: '0 0 6px',
            lineHeight: '26px',
          }}
        >
          {ebookTitle}
        </Heading>
        {ebookTagline ? (
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0 0 20px' }}>
            {ebookTagline}
          </Text>
        ) : null}
        <EmailButton href={downloadUrl}>{t.cta}</EmailButton>
      </Section>

      {/* Qué vas a encontrar dentro — opcional (por ebook) */}
      {highlights && highlights.length > 0 ? (
        <>
          <Heading
            style={{
              fontFamily: EMAIL_FONTS.heading,
              fontSize: '15px',
              fontWeight: 700,
              color: EMAIL_COLORS.text,
              margin: '0 0 12px',
              lineHeight: '22px',
            }}
          >
            {t.insideTitle}
          </Heading>
          {highlights.map((item, i) => (
            <table key={i} style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 8px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '20px', verticalAlign: 'top', paddingTop: '2px' }}>
                    <Text style={{ fontSize: '15px', color: EMAIL_COLORS.primary, margin: '0', lineHeight: '22px' }}>
                      →
                    </Text>
                  </td>
                  <td>
                    <Text style={{ fontSize: '14px', color: EMAIL_COLORS.secondary, margin: '0', lineHeight: '22px' }}>
                      {item}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </>
      ) : null}

      {/* Puente — un solo next step (opcional, del success_behavior del form) */}
      {bridgeUrl && bridgeLabel ? (
        <Section
          style={{
            backgroundColor: '#F0F7FF',
            border: `1px solid ${EMAIL_COLORS.border}`,
            borderRadius: '12px',
            padding: '20px',
            margin: '28px 0 24px',
            textAlign: 'center' as const,
          }}
        >
          <EmailButton href={bridgeUrl}>{bridgeLabel}</EmailButton>
        </Section>
      ) : null}

      <Text
        style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0',
          wordBreak: 'break-all' as const,
        }}
      >
        {t.fallback} {downloadUrl}
      </Text>
    </EmailLayout>
  )
}
