import { Heading, Section, Text } from '@react-email/components'

import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1689 — Email de decisión al candidato: seleccionado o no seleccionado.
 *
 * BRAND = Efeonce (la AGENCIA). Dos variantes en un template para que el tono comparta
 * estructura. Craft del rechazo: agradecer de verdad, decir la decisión sin rodeos ni
 * falsas esperanzas, dejar la puerta abierta a futuras vacantes — nunca condescender.
 */
interface HiringDecisionEmailProps {
  recipientName?: string
  openingTitle?: string
  variant?: 'selected' | 'rejected'
  locale?: 'es' | 'en'
}

export default function HiringDecisionEmail({
  recipientName = 'María González',
  openingTitle = 'Content Creator',
  variant = 'selected',
  locale = 'es',
}: HiringDecisionEmailProps) {
  const isSelected = variant === 'selected'

  const t =
    locale === 'en'
      ? isSelected
        ? {
            preview: 'Good news about your application.',
            heading: 'You were selected',
            greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
            body1: (title: string) =>
              `We have good news: you were selected for «${title}» at Efeonce. Congratulations — your profile stood out during the process.`,
            body2: 'Our team will contact you by email with the next steps. You do not need to do anything else for now.',
            closing: 'Welcome aboard — we are glad to have you.',
          }
        : {
            preview: 'An update about your application.',
            heading: 'About your application',
            greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
            body1: (title: string) =>
              `Thank you for the time and interest you put into your application to «${title}» at Efeonce. After reviewing the process, we decided not to move forward with your application on this occasion.`,
            body2:
              'This decision is about this specific search, not about your worth as a professional. We would be glad to see you apply to future openings that match your profile.',
            closing: 'We sincerely appreciate your interest in working with us.',
          }
      : isSelected
        ? {
            preview: 'Buenas noticias sobre tu postulación.',
            heading: 'Quedaste seleccionado/a',
            greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
            body1: (title: string) =>
              `Tenemos buenas noticias: quedaste seleccionado/a para «${title}» en Efeonce. Felicitaciones — tu perfil destacó durante el proceso.`,
            body2: 'Nuestro equipo te contactará por correo con los próximos pasos. Por ahora no necesitas hacer nada más.',
            closing: 'Bienvenido/a — nos alegra tenerte a bordo.',
          }
        : {
            preview: 'Una actualización sobre tu postulación.',
            heading: 'Sobre tu postulación',
            greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
            body1: (title: string) =>
              `Gracias por el tiempo y el interés que pusiste en tu postulación a «${title}» en Efeonce. Después de revisar el proceso, decidimos no avanzar con tu postulación en esta oportunidad.`,
            body2:
              'Esta decisión es sobre esta búsqueda en particular, no sobre tu valor como profesional. Nos encantaría verte postular a futuras vacantes que calcen con tu perfil.',
            closing: 'Agradecemos de verdad tu interés en trabajar con nosotros.',
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

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
        {t.body1(openingTitle)}
      </Text>

      {isSelected ? (
        <Section
          style={{
            backgroundColor: '#ECFDF3',
            border: `1px solid ${EMAIL_COLORS.border}`,
            borderRadius: '12px',
            padding: '20px',
            margin: '0 0 24px',
            textAlign: 'center' as const,
          }}
        >
          <Heading
            style={{
              fontFamily: EMAIL_FONTS.heading,
              fontSize: '18px',
              fontWeight: 700,
              color: EMAIL_COLORS.success,
              margin: '0',
              lineHeight: '26px',
            }}
          >
            {openingTitle}
          </Heading>
        </Section>
      ) : null}

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
        {t.body2}
      </Text>

      <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0' }}>{t.closing}</Text>
    </EmailLayout>
  )
}
