import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1689 — Aviso al candidato: tienes una evaluación pendiente.
 *
 * BRAND = Efeonce (la AGENCIA). El link lleva a la ruta pública de taking
 * (`/public/assessment/{token}`). El token del CTA es el vigente al momento del envío
 * (rotado por el consumer si hizo falta re-emitirlo); expira solo — el email lo declara.
 */
interface HiringAssessmentAssignedEmailProps {
  recipientName?: string
  openingTitle?: string
  assessmentUrl?: string
  timeLimitMinutes?: number | null
  tokenTtlDays?: number
  locale?: 'es' | 'en'
}

export default function HiringAssessmentAssignedEmail({
  recipientName = 'María González',
  openingTitle = 'Content Creator',
  assessmentUrl = 'https://greenhouse.efeoncepro.com/public/assessment/preview-token',
  timeLimitMinutes = null,
  tokenTtlDays = 7,
  locale = 'es',
}: HiringAssessmentAssignedEmailProps) {
  const t =
    locale === 'en'
      ? {
          preview: 'You have a pending assessment for your application.',
          heading: 'You have a pending assessment',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          intro: (title: string) =>
            `As part of your application to «${title}» at Efeonce, we assigned you an assessment. It helps us get to know how you work — there are no trick questions.`,
          reassurance: 'Pick a calm moment without interruptions. What matters is showing how you think.',
          cardEyebrow: 'Your assessment',
          timeLimit: (min: number) => `Estimated time: ${min} minutes once you start.`,
          expiry: (days: number) => `The access link expires in ${days} days.`,
          cta: 'Start the assessment',
          fallback: 'If the button does not work, copy and paste this address into your browser:',
        }
      : {
          preview: 'Tienes una evaluación pendiente de tu postulación.',
          heading: 'Tienes una evaluación pendiente',
          greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
          intro: (title: string) =>
            `Como parte de tu postulación a «${title}» en Efeonce, te asignamos una evaluación. Nos ayuda a conocer cómo trabajas — no hay preguntas con trampa.`,
          reassurance: 'Elige un momento tranquilo y sin interrupciones. Lo que importa es mostrar cómo piensas.',
          cardEyebrow: 'Tu evaluación',
          timeLimit: (min: number) => `Tiempo estimado: ${min} minutos una vez que comiences.`,
          expiry: (days: number) => `El link de acceso vence en ${days} días.`,
          cta: 'Comenzar la evaluación',
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

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 8px' }}>
        {t.intro(openingTitle)}
      </Text>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 24px' }}>
        {t.reassurance}
      </Text>

      <Section
        style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '24px',
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
            margin: '0 0 12px',
          }}
        >
          {t.cardEyebrow}
        </Text>

        {typeof timeLimitMinutes === 'number' && timeLimitMinutes > 0 ? (
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.secondary, lineHeight: '21px', margin: '0 0 6px' }}>
            {t.timeLimit(timeLimitMinutes)}
          </Text>
        ) : null}

        <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0 0 20px' }}>
          {t.expiry(tokenTtlDays)}
        </Text>

        <EmailButton href={assessmentUrl}>{t.cta}</EmailButton>
      </Section>

      <Text
        style={{
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
          margin: '0',
          wordBreak: 'break-all' as const,
        }}
      >
        {t.fallback} {assessmentUrl}
      </Text>
    </EmailLayout>
  )
}
