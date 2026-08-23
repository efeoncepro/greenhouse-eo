import { Heading, Section, Text } from '@react-email/components'

import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1757 — Aviso al candidato: tu acceso a la evaluación fue reemplazado.
 *
 * BRAND = Efeonce (la AGENCIA).
 *
 * Se manda cuando el operador emite un enlace seguro para entregar en mano: eso **mata la
 * credencial anterior del candidato**, y sin este aviso la persona queda sin acceso, sin saber por
 * qué y con el plazo corriendo. Si además está `inProgress`, puede haber sido expulsada de una
 * evaluación que estaba respondiendo en ese momento.
 *
 * **NUNCA lleva el enlace, ni un token, ni un botón para pedir otro.** El canal existe justamente
 * para entregar la credencial por una vía donde el operador verifica identidad; ponerla acá
 * anularía esa verificación y volvería inútil todo el diseño. El anti-leak test lo hace cumplir.
 *
 * La salida de emergencia ("responde este correo") NO es cortesía de cierre: es la condición que
 * hace legítimo el aviso. Un correo que anuncia una entrega que después no ocurre deja al candidato
 * PEOR que el silencio — ahora sabe que había algo, que se perdió, y sigue sin poder hacer nada.
 */
interface HiringAssessmentAccessRotatedEmailProps {
  recipientName?: string
  openingTitle?: string
  /** Vigencia de la credencial nueva, ya formateada en hora de Chile. */
  expiresAtLabel?: string
  /** Plazo original de la evaluación, sólo cuando la persona ya la había empezado. */
  originalDeadlineLabel?: string | null
  inProgress?: boolean
  locale?: 'es' | 'en'
}

export default function HiringAssessmentAccessRotatedEmail({
  recipientName = 'María González',
  openingTitle = 'Content Creator',
  expiresAtLabel = '21 de agosto, 15:30',
  originalDeadlineLabel = null,
  inProgress = false,
  locale = 'es',
}: HiringAssessmentAccessRotatedEmailProps) {
  const t =
    locale === 'en'
      ? {
          preview: 'We replaced your assessment access.',
          heading: 'We replaced your assessment access',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          intro: (title: string) =>
            `We generated new access to your ${title} assessment. The link you had before no longer works.`,
          eyebrow: 'New access valid until',
          notHere: 'The new access does not travel in this email: it is delivered another way.',
          timerBody: (deadline: string) =>
            `Your assessment timer is already running and does not reset: the original deadline stays at ${deadline} (Chile time).`,
          help: 'If it does not reach you, if it arrives expired, or if you would rather receive it here, reply to this email and we will send it again.',
          closing: 'This does not affect your application or how you will be evaluated.',
        }
      : {
          preview: 'Reemplazamos tu acceso a la evaluación.',
          heading: 'Reemplazamos tu acceso a la evaluación',
          greeting: (n?: string) => (n ? `Hola ${n}:` : 'Hola:'),
          intro: (title: string) =>
            `Generamos un acceso nuevo a tu evaluación de ${title}. El enlace que tenías antes dejó de funcionar.`,
          eyebrow: 'Acceso nuevo vigente hasta',
          notHere: 'El acceso nuevo no viaja en este correo: se entrega por otra vía.',
          timerBody: (deadline: string) =>
            `El tiempo de tu evaluación ya está corriendo y no se reinicia: el plazo original se mantiene hasta ${deadline} (hora de Chile).`,
          help: 'Si no te llega, si te llega vencido o si prefieres recibirlo por acá, responde este correo y lo reponemos.',
          closing: 'Esto no afecta tu postulación ni cómo te vamos a evaluar.',
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
          {t.eyebrow}
        </Text>
        <Heading
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '20px',
            fontWeight: 700,
            color: EMAIL_COLORS.text,
            margin: '0 0 8px',
            lineHeight: '26px',
          }}
        >
          {expiresAtLabel}
        </Heading>
        <Text style={{ fontSize: '13px', color: EMAIL_COLORS.muted, lineHeight: '20px', margin: '0' }}>
          {t.notHere}
        </Text>
      </Section>

      {inProgress && originalDeadlineLabel ? (
        <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
          {t.timerBody(originalDeadlineLabel)}
        </Text>
      ) : null}

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
        {t.help}
      </Text>

      <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0' }}>{t.closing}</Text>
    </EmailLayout>
  )
}
