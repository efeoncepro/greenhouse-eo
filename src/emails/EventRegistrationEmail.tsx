import { Heading, Link, Section, Text } from '@react-email/components'

import type { EventRegistrationEmailVariant } from '@/lib/email/types'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * Correo de reserva de eventos y webinars de Efeonce (portada del blog).
 *
 * VERSIÓN PROVISIONAL, PENDIENTE DE DISEÑO: el diseño de estos correos todavía no existe. Esta
 * plantilla sólo arma el flujo con el patrón del ebook, sin trabajo de diseño propio; se
 * reemplaza cuando llegue el diseño (los nombres de props y de email types se mantienen).
 *
 * Mismo patrón que `EbookDeliveryEmail`: GENÉRICO para cualquier evento (el contenido llega por
 * props desde el consumer) y BRAND = Efeonce (la AGENCIA), porque lo recibe un prospecto público.
 *
 * Tres variantes de un solo componente:
 * - `confirmed`: el lugar quedó reservado. Si hay `joinUrl`, el botón principal entra a la sala;
 *   si todavía no hay enlace, se avisa que llegará antes del evento y el botón va a la página.
 * - `waitlisted`: lista de espera. NUNCA muestra `joinUrl`, aunque venga en las props.
 * - `reminder`: el evento empieza pronto; botón a la sala (o a la página si falta el enlace).
 *
 * El `.ics` NO lo arma esta plantilla: lo adjunta el consumer. `calendarNote` reemplaza la línea
 * del calendario en `confirmed`; con cadena vacía la línea se omite (p. ej. si no hay adjunto).
 */
export interface EventRegistrationEmailProps {
  variant?: EventRegistrationEmailVariant
  recipientName?: string
  eventTitle?: string
  whenLabel?: string
  durationLabel?: string
  modalityLabel?: string
  /** Enlace privado de la sala. Sólo se usa en `confirmed` y `reminder`. */
  joinUrl?: string
  eventPageUrl?: string
  calendarNote?: string
  locale?: 'es' | 'en'
}

const COPY = {
  es: {
    detailsEyebrow: 'Tu evento',
    whenLabel: 'Cuándo',
    durationLabel: 'Duración',
    modalityLabel: 'Modalidad',
    greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
    joinCta: 'Entrar a la sala',
    eventPageCta: 'Ver el evento',
    eventPageLink: 'Ver la página del evento',
    fallback: 'Si el botón no funciona, copia y pega esta dirección en tu navegador:',
    linkLater: 'Te enviaremos el enlace antes del evento.',
    calendarDefault: 'Adjuntamos el evento para que lo agregues a tu calendario.',
    confirmed: {
      preview: (title: string) => `Tu lugar en «${title}» está reservado.`,
      heading: 'Tu lugar está reservado',
      intro: (title: string) => `Ya tienes tu lugar en «${title}». Te esperamos.`
    },
    waitlisted: {
      preview: (title: string) => `Quedaste en lista de espera para «${title}».`,
      heading: 'Quedaste en lista de espera',
      intro: (title: string) =>
        `Por ahora «${title}» no tiene lugares disponibles, pero quedaste en la lista de espera.`,
      body: 'Si se libera un lugar, te avisamos por este medio con todo lo que necesitas para entrar.'
    },
    reminder: {
      preview: (title: string) => `«${title}» empieza pronto.`,
      heading: 'Empieza pronto',
      intro: (title: string) => `«${title}» está por comenzar. Te dejamos todo a mano para entrar.`
    }
  },
  en: {
    detailsEyebrow: 'Your event',
    whenLabel: 'When',
    durationLabel: 'Duration',
    modalityLabel: 'Format',
    greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
    joinCta: 'Join the room',
    eventPageCta: 'View the event',
    eventPageLink: 'View the event page',
    fallback: 'If the button does not work, copy and paste this address into your browser:',
    linkLater: "We'll send you the link before the event.",
    calendarDefault: 'The event is attached so you can add it to your calendar.',
    confirmed: {
      preview: (title: string) => `Your spot at «${title}» is reserved.`,
      heading: 'Your spot is reserved',
      intro: (title: string) => `You have a spot at «${title}». We look forward to seeing you.`
    },
    waitlisted: {
      preview: (title: string) => `You're on the waitlist for «${title}».`,
      heading: "You're on the waitlist",
      intro: (title: string) => `«${title}» is full for now, but you're on the waitlist.`,
      body: "If a spot opens up, we'll let you know here with everything you need to join."
    },
    reminder: {
      preview: (title: string) => `«${title}» starts soon.`,
      heading: 'Starting soon',
      intro: (title: string) => `«${title}» is about to begin. Here's everything you need to join.`
    }
  }
} as const

const bodyText = { fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px' } as const

export default function EventRegistrationEmail({
  variant = 'confirmed',
  recipientName = 'María González',
  eventTitle = 'Cómo aparecer en las respuestas de ChatGPT',
  whenLabel = 'jueves 12 de noviembre · 10:00 (Chile)',
  durationLabel = '45 minutos',
  modalityLabel = 'En línea',
  joinUrl,
  eventPageUrl = 'https://efeoncepro.com/eventos/como-aparecer-en-chatgpt',
  calendarNote,
  locale = 'es'
}: EventRegistrationEmailProps) {
  const t = locale === 'en' ? COPY.en : COPY.es
  const v = t[variant]
  const firstName = recipientName?.split(' ')[0]

  // La lista de espera nunca expone el enlace privado de la sala.
  const effectiveJoinUrl = variant === 'waitlisted' ? undefined : joinUrl
  const primaryHref = effectiveJoinUrl ?? eventPageUrl
  const primaryLabel = effectiveJoinUrl ? t.joinCta : t.eventPageCta
  const showPrimaryButton = variant !== 'waitlisted'
  const calendarLine = variant === 'confirmed' ? (calendarNote ?? t.calendarDefault) : ''

  const details: Array<[string, string]> = [
    [t.whenLabel, whenLabel],
    [t.durationLabel, durationLabel],
    [t.modalityLabel, modalityLabel]
  ]

  return (
    <EmailLayout previewText={v.preview(eventTitle)} locale={locale} brand='efeonce'>
      <Heading
        style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '24px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
          margin: '0 0 8px',
          lineHeight: '32px'
        }}
      >
        {v.heading}
      </Heading>

      <Text style={{ ...bodyText, margin: '0 0 8px' }}>{t.greeting(firstName)}</Text>

      <Text style={{ ...bodyText, margin: '0 0 24px' }}>{v.intro(eventTitle)}</Text>

      {/* Tarjeta del evento — qué, cuándo, cuánto dura y dónde (el corazón del email) */}
      <Section
        style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '24px',
          margin: '0 0 28px'
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
            textAlign: 'center' as const
          }}
        >
          {t.detailsEyebrow}
        </Text>
        <Heading
          style={{
            fontFamily: EMAIL_FONTS.heading,
            fontSize: '20px',
            fontWeight: 700,
            color: EMAIL_COLORS.text,
            margin: '0 0 16px',
            lineHeight: '26px',
            textAlign: 'center' as const
          }}
        >
          {eventTitle}
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 4px' }}>
          <tbody>
            {details.map(([label, value]) => (
              <tr key={label}>
                <td style={{ width: '96px', verticalAlign: 'top', padding: '4px 0' }}>
                  <Text style={{ fontSize: '13px', color: EMAIL_COLORS.muted, margin: '0', lineHeight: '21px' }}>
                    {label}
                  </Text>
                </td>
                <td style={{ verticalAlign: 'top', padding: '4px 0' }}>
                  <Text
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: EMAIL_COLORS.text,
                      margin: '0',
                      lineHeight: '21px'
                    }}
                  >
                    {value}
                  </Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showPrimaryButton ? (
          <Section style={{ textAlign: 'center' as const, margin: '20px 0 0' }}>
            {variant === 'confirmed' && !effectiveJoinUrl ? (
              <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0 0 16px' }}>
                {t.linkLater}
              </Text>
            ) : null}
            <EmailButton href={primaryHref}>{primaryLabel}</EmailButton>
          </Section>
        ) : null}
      </Section>

      {variant === 'waitlisted' ? <Text style={{ ...bodyText, margin: '0 0 20px' }}>{t.waitlisted.body}</Text> : null}

      {calendarLine ? <Text style={{ ...bodyText, margin: '0 0 20px' }}>{calendarLine}</Text> : null}

      {/* Enlace secundario a la página del evento (cuando el botón no apunta ya a ella) */}
      {primaryHref !== eventPageUrl || variant === 'waitlisted' ? (
        <Text style={{ fontSize: '14px', lineHeight: '21px', margin: '0 0 24px' }}>
          <Link href={eventPageUrl} style={{ color: EMAIL_COLORS.primary, textDecoration: 'underline' }}>
            {t.eventPageLink}
          </Link>
        </Text>
      ) : null}

      {showPrimaryButton ? (
        <Text
          style={{
            fontSize: '12px',
            color: EMAIL_COLORS.muted,
            lineHeight: '18px',
            margin: '0',
            wordBreak: 'break-all' as const
          }}
        >
          {t.fallback} {primaryHref}
        </Text>
      ) : null}
    </EmailLayout>
  )
}
