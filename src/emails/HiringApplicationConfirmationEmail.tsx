import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1689 — Acuse de recibo al candidato: tu postulación llegó.
 *
 * BRAND = Efeonce (la AGENCIA): lo recibe una persona externa que postuló por el sitio
 * público. Craft: confirmar (llegó), orientar (qué sigue) y cerrar — sin prometer plazos
 * que el equipo no controla y sin sobre-vender.
 */
interface HiringApplicationConfirmationEmailProps {
  recipientName?: string
  openingTitle?: string
  openingUrl?: string
  locale?: 'es' | 'en'
}

export default function HiringApplicationConfirmationEmail({
  recipientName = 'María González',
  openingTitle = 'Content Creator',
  openingUrl,
  locale = 'es',
}: HiringApplicationConfirmationEmailProps) {
  const t =
    locale === 'en'
      ? {
          preview: 'We received your application. Here is what happens next.',
          heading: 'We received your application',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          intro: (title: string) =>
            `Thanks for applying to «${title}» at Efeonce. Your application arrived and is now with our team.`,
          nextTitle: 'What happens next',
          nextBody:
            'Our team reviews every application. If your profile matches what we are looking for, we will contact you by email with the next steps.',
          cta: 'View the position',
          closing: 'Thanks for your interest in working with us.',
        }
      : {
          preview: 'Recibimos tu postulación. Esto es lo que sigue.',
          heading: 'Recibimos tu postulación',
          greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
          intro: (title: string) =>
            `Gracias por postular a «${title}» en Efeonce. Tu postulación llegó y ya está con nuestro equipo.`,
          nextTitle: 'Qué sigue',
          nextBody:
            'Nuestro equipo revisa cada postulación. Si tu perfil calza con lo que buscamos, te contactaremos por correo con los próximos pasos.',
          cta: 'Ver la vacante',
          closing: 'Gracias por tu interés en trabajar con nosotros.',
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
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '24px',
          margin: '0 0 24px',
        }}
      >
        <Heading
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '15px',
            fontWeight: 700,
            color: EMAIL_COLORS.text,
            margin: '0 0 8px',
            lineHeight: '22px',
          }}
        >
          {t.nextTitle}
        </Heading>
        <Text style={{ fontSize: '14px', color: EMAIL_COLORS.secondary, lineHeight: '22px', margin: '0' }}>
          {t.nextBody}
        </Text>
      </Section>

      {openingUrl ? (
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <EmailButton href={openingUrl}>{t.cta}</EmailButton>
        </Section>
      ) : null}

      <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0' }}>{t.closing}</Text>
    </EmailLayout>
  )
}
