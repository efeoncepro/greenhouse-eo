import { Heading, Section, Text } from '@react-email/components'

import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1689 — Aviso al candidato: tu postulación avanzó de etapa.
 *
 * BRAND = Efeonce (la AGENCIA). `stageLabel` llega YA traducido a nombre público
 * candidate-facing por la política de dominio (`src/lib/hiring/notifications`) — este
 * template NUNCA recibe un nombre de etapa interna del pipeline.
 */
interface HiringStageAdvancedEmailProps {
  recipientName?: string
  openingTitle?: string
  stageLabel?: string
  locale?: 'es' | 'en'
}

export default function HiringStageAdvancedEmail({
  recipientName = 'María González',
  openingTitle = 'Content Creator',
  stageLabel = 'Entrevista',
  locale = 'es',
}: HiringStageAdvancedEmailProps) {
  const t =
    locale === 'en'
      ? {
          preview: 'Good news: your application moved forward.',
          heading: 'Your application moved forward',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          intro: (title: string) => `Good news: your application to «${title}» at Efeonce moved to the next step.`,
          stageEyebrow: 'Current stage',
          nextBody: 'Our team will contact you by email with the details of this step. You do not need to do anything else for now.',
          closing: 'Thanks for being part of the process.',
        }
      : {
          preview: 'Buenas noticias: tu postulación avanzó.',
          heading: 'Tu postulación avanzó',
          greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
          intro: (title: string) => `Buenas noticias: tu postulación a «${title}» en Efeonce avanzó a la siguiente etapa.`,
          stageEyebrow: 'Etapa actual',
          nextBody: 'Nuestro equipo te contactará por correo con los detalles de este paso. Por ahora no necesitas hacer nada más.',
          closing: 'Gracias por ser parte del proceso.',
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
        {t.intro(openingTitle)}
      </Text>

      <Section
        style={{
          backgroundColor: '#F0F7FF',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '20px',
          margin: '0 0 24px',
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
          {t.stageEyebrow}
        </Text>
        <Heading
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '20px',
            fontWeight: 700,
            color: EMAIL_COLORS.text,
            margin: '0',
            lineHeight: '26px',
          }}
        >
          {stageLabel}
        </Heading>
      </Section>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
        {t.nextBody}
      </Text>

      <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0' }}>{t.closing}</Text>
    </EmailLayout>
  )
}
