import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1848 — correo de entrega de una edición EMITIDA de Efeonce Insights. Funcional y sobrio:
 * la presentación final (resumen de hallazgos en el cuerpo, piezas visuales) es de TASK-1849.
 *
 * Tres modalidades, un mismo correo:
 *   · portal_link → CTA al informe dentro del portal (el login revalida cuenta y permisos)
 *   · share_link  → CTA al visor compartido con el enlace personal, que vence
 *   · attachment  → el PDF viaja adjunto; se avisa que un archivo enviado no se puede retirar
 *
 * Nunca afirma que el destinatario leyó nada ni rastrea aperturas: el enlace es el que decide.
 */
export type InsightsEditionDeliveryModality = 'portal_link' | 'share_link' | 'attachment'

interface InsightsEditionDeliveryEmailProps {
  recipientName?: string
  organizationName?: string
  reportTitle?: string
  periodLabel?: string
  modality?: InsightsEditionDeliveryModality
  actionUrl?: string
  /** Fecha legible de vencimiento del enlace compartido (sólo share_link). */
  expiresOnLabel?: string
  /** Nota opcional de quien autorizó el envío. */
  message?: string
  locale?: 'es' | 'en'
}

export default function InsightsEditionDeliveryEmail({
  recipientName = 'María González',
  organizationName = 'Organización de ejemplo',
  reportTitle = 'Informe mensual de desempeño',
  periodLabel = '1 al 31 de agosto de 2026',
  modality = 'portal_link',
  actionUrl = 'https://greenhouse.efeoncepro.com/insights',
  expiresOnLabel,
  message,
  locale = 'es'
}: InsightsEditionDeliveryEmailProps) {
  const t =
    locale === 'en'
      ? {
          preview: `${organizationName}: report for ${periodLabel}.`,
          heading: 'Your report is ready',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          intro: `The report «${reportTitle}» for ${organizationName} covering ${periodLabel} is now available.`,
          noteLabel: 'A note from the Efeonce team',
          ctaPortal: 'View the report in Greenhouse',
          ctaShare: 'View the report',
          expiry: (d: string) => `This link is personal and expires on ${d}. Do not forward it: anyone who has it can open the report.`,
          attachment: 'The report is attached as a PDF. Once sent, the file cannot be withdrawn from your inbox.',
          fallback: 'If the button does not work, copy and paste this address into your browser:'
        }
      : {
          preview: `${organizationName}: informe del período ${periodLabel}.`,
          heading: 'Tu informe está listo',
          greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
          intro: `Ya está disponible el informe «${reportTitle}» de ${organizationName} para el período ${periodLabel}.`,
          noteLabel: 'Nota del equipo de Efeonce',
          ctaPortal: 'Ver el informe en Greenhouse',
          ctaShare: 'Ver el informe',
          expiry: (d: string) => `Este enlace es personal y vence el ${d}. No lo reenvíes: quien lo tenga puede abrir el informe.`,
          attachment: 'Adjuntamos el informe en PDF. Una vez enviado, el archivo no se puede retirar de tu correo.',
          fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:'
        }

  const firstName = recipientName?.split(' ')[0]
  const showButton = modality !== 'attachment' && Boolean(actionUrl)

  return (
    <EmailLayout previewText={t.preview} locale={locale} brand='efeonce'>
      <Heading
        style={{ fontFamily: EMAIL_FONTS.heading, fontSize: '24px', fontWeight: 700, color: EMAIL_COLORS.text, margin: '0 0 8px', lineHeight: '32px' }}
      >
        {t.heading}
      </Heading>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 8px' }}>{t.greeting(firstName)}</Text>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 24px' }}>{t.intro}</Text>

      {message ? (
        <Section style={{ borderLeft: `3px solid ${EMAIL_COLORS.primary}`, padding: '4px 0 4px 16px', margin: '0 0 24px' }}>
          <Text style={{ fontSize: '12px', fontWeight: 700, color: EMAIL_COLORS.text, margin: '0 0 4px' }}>{t.noteLabel}</Text>
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.secondary, lineHeight: '22px', margin: 0, whiteSpace: 'pre-line' as const }}>{message}</Text>
        </Section>
      ) : null}

      {showButton ? (
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <EmailButton href={actionUrl}>{modality === 'share_link' ? t.ctaShare : t.ctaPortal}</EmailButton>
        </Section>
      ) : null}

      {modality === 'share_link' && expiresOnLabel ? (
        <Text style={{ fontSize: '13px', color: EMAIL_COLORS.secondary, lineHeight: '20px', margin: '0 0 16px' }}>{t.expiry(expiresOnLabel)}</Text>
      ) : null}

      {modality === 'attachment' ? (
        <Text style={{ fontSize: '13px', color: EMAIL_COLORS.secondary, lineHeight: '20px', margin: '0 0 16px' }}>{t.attachment}</Text>
      ) : null}

      {showButton ? (
        <>
          <Text style={{ fontSize: '12px', color: EMAIL_COLORS.secondary, lineHeight: '18px', margin: '0 0 4px' }}>{t.fallback}</Text>
          <Text style={{ fontSize: '12px', color: EMAIL_COLORS.primary, lineHeight: '18px', margin: 0, wordBreak: 'break-all' as const }}>{actionUrl}</Text>
        </>
      ) : null}
    </EmailLayout>
  )
}
