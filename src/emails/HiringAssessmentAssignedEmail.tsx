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
  mode?: 'assignment' | 'access_recovery'
  inProgress?: boolean
  expiresAt?: string
}

export default function HiringAssessmentAssignedEmail({
  recipientName = 'María González',
  openingTitle = 'Content Creator',
  assessmentUrl = 'https://greenhouse.efeoncepro.com/public/assessment/preview-token',
  timeLimitMinutes = null,
  tokenTtlDays = 7,
  locale = 'es',
  mode = 'assignment',
  inProgress = false,
  expiresAt,
}: HiringAssessmentAssignedEmailProps) {
  const isRecovery = mode === 'access_recovery'

  const t =
    locale === 'en'
      ? {
          preview: isRecovery ? 'A new assessment access link is ready.' : 'You have a pending assessment for your application.',
          heading: isRecovery ? 'Your new access link is ready' : 'You have a pending assessment',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          intro: (title: string) => isRecovery
            ? `We generated a new access link for the assessment in your application to «${title}». Any previous link is no longer valid.`
            : `As part of your application to «${title}» at Efeonce, we assigned you an assessment. It helps us get to know how you work — there are no trick questions.`,
          reassurance: 'Pick a calm moment without interruptions. What matters is showing how you think.',
          activeReassurance: 'Continue now: the assessment timer is already running. The deadline below uses Chile time.',
          cardEyebrow: 'Your assessment',
          timeLimit: (min: number) => `Estimated time: ${min} minutes once you start.`,
          expiry: (days: number) => `The access link expires in ${days} days.`,
          activeExpiry: (value: string) => `This assessment is already in progress. Your original deadline remains unchanged; this access is available until ${value} (Chile time).`,
          cta: isRecovery ? 'Open my assessment' : 'Start the assessment',
          // Un ajuste que nadie sabe que puede pedir no es un ajuste. Sin esta línea, sólo
          // preguntan quienes ya se sienten con derecho a hacerlo — que es exactamente el sesgo
          // que el ajuste existe para corregir. Invita sin pedir que se declare una condición.
          accommodations: 'If you need more time or any adjustment to take it, reply to this email and we will arrange it. You do not need to explain why.',
          fallback: 'If the button does not work, copy and paste this address into your browser:',
        }
      : {
          preview: isRecovery ? 'Tu nuevo enlace de acceso a la evaluación está listo.' : 'Tienes una evaluación pendiente de tu postulación.',
          heading: isRecovery ? 'Tu nuevo acceso está listo' : 'Tienes una evaluación pendiente',
          greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
          intro: (title: string) => isRecovery
            ? `Generamos un nuevo enlace para acceder a la evaluación de tu postulación a «${title}». Cualquier enlace anterior dejó de ser válido.`
            : `Como parte de tu postulación a «${title}» en Efeonce, te asignamos una evaluación. Nos ayuda a conocer cómo trabajas — no hay preguntas con trampa.`,
          reassurance: 'Elige un momento tranquilo y sin interrupciones. Lo que importa es mostrar cómo piensas.',
          activeReassurance: 'Continúa ahora: el tiempo de la evaluación ya está corriendo. El plazo indicado corresponde a la hora de Chile.',
          cardEyebrow: 'Tu evaluación',
          timeLimit: (min: number) => `Tiempo estimado: ${min} minutos una vez que comiences.`,
          expiry: (days: number) => `El link de acceso vence en ${days} días.`,
          activeExpiry: (value: string) => `Esta evaluación ya está en curso. Su plazo original no cambia; este acceso estará disponible hasta ${value} (hora de Chile).`,
          cta: isRecovery ? 'Abrir mi evaluación' : 'Comenzar la evaluación',
          accommodations:
            'Si necesitas más tiempo o algún ajuste para rendirla, respóndenos este correo y lo coordinamos. No necesitas explicar por qué.',
          fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
        }

  const firstName = recipientName?.split(' ')[0]

  const expiryLabel = expiresAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Santiago',
      }).format(new Date(expiresAt))
    : null

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
        {inProgress ? t.activeReassurance : t.reassurance}
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

        {!inProgress && typeof timeLimitMinutes === 'number' && timeLimitMinutes > 0 ? (
          <Text style={{ fontSize: '14px', color: EMAIL_COLORS.secondary, lineHeight: '21px', margin: '0 0 6px' }}>
            {t.timeLimit(timeLimitMinutes)}
          </Text>
        ) : null}

        <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0 0 20px' }}>
          {inProgress && expiryLabel ? t.activeExpiry(expiryLabel) : t.expiry(tokenTtlDays)}
        </Text>

        <EmailButton href={assessmentUrl}>{t.cta}</EmailButton>
      </Section>

      {/* El canal por el que se pide un ajuste razonable. Es una respuesta a un humano, NO un
          formulario: nadie debería tener que declarar una condición de salud en un campo antes
          de ser evaluado. Por eso también dice explícitamente que no hay que explicar el motivo
          — y por eso el motivo tampoco se persiste en ninguna parte del sistema. */}
      <Text style={{ fontSize: '13px', color: EMAIL_COLORS.muted, lineHeight: '20px', margin: '0 0 16px' }}>
        {t.accommodations}
      </Text>

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
