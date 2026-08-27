import { Heading, Img, Text } from '@react-email/components'

import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

const MEDIA_BUCKET = process.env.GREENHOUSE_PUBLIC_MEDIA_BUCKET || 'efeonce-group-greenhouse-public-media-prod'
const SELECTED_ILLUSTRATION_IMAGE_URL = `https://storage.googleapis.com/${MEDIA_BUCKET}/emails/hiring-selected-email-mail-icon-v4.png`

const EMPHASIS_STYLE = {
  color: EMAIL_COLORS.text,
  fontWeight: 700,
} as const

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
  /**
   * TASK-1762 — `not_selected` NO es una variante suave de `rejected`, y por eso tiene su propio
   * cuerpo. En un descarte hubo un juicio sobre la persona; en una «sin selección» por capacidad
   * no lo hubo — la vacante se llenó. Reusar el agradecimiento del descarte le contaría una
   * historia falsa a alguien a quien nadie descartó.
   */
  variant?: 'selected' | 'rejected' | 'not_selected'
  /**
   * TASK-1762 — sólo con consentimiento de contacto futuro VIGENTE se promete el Banco de Talento.
   * Sin él, el correo no hace la promesa ni crea un opt-in implícito: afirmar «mantendremos tu
   * perfil» sin base es prometer un tratamiento de datos que nadie autorizó.
   */
  talentPoolConsent?: boolean
  locale?: 'es' | 'en'
}

export default function HiringDecisionEmail({
  recipientName = 'María González',
  openingTitle = 'Content Creator',
  variant = 'selected',
  talentPoolConsent = false,
  locale = 'es',
}: HiringDecisionEmailProps) {
  const isSelected = variant === 'selected'
  const isNotSelected = variant === 'not_selected'
  const firstName = recipientName?.split(' ')[0]

  const notSelectedCopy =
    locale === 'en'
      ? {
          preview: (title: string) => `An update about your application to ${title}.`,
          heading: 'About your application',
          greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
          body1: (title: string) =>
            `Thank you for the time and interest you put into your application to «${title}» at Efeonce. The position has been filled: this time we chose another candidate.`,
          body2: talentPoolConsent
            ? 'It was not a decision about your work. Since you agreed to it, we will keep your profile so we can reach out when an opening closer to your experience opens up.'
            : 'It was not a decision about your work: there was a limited number of openings and they are now taken. We would be glad to see you apply to future openings closer to your profile.',
          body3: null,
          closing: 'Thank you for the interest you put into this process.',
        }
      : {
          preview: (title: string) => `Una actualización sobre tu postulación a ${title}.`,
          heading: 'Sobre tu postulación',
          greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
          body1: (title: string) =>
            `Gracias por el tiempo y el interés que pusiste en tu postulación a «${title}» en Efeonce. La vacante ya quedó cubierta: esta vez elegimos a otra persona.`,
          // La diferencia entre las dos frases NO es de tono: la primera promete un tratamiento de
          // datos y la segunda no. Sólo se promete cuando hay consentimiento vigente.
          body2: talentPoolConsent
            ? 'No fue una decisión sobre tu trabajo. Como nos diste tu autorización, mantendremos tu perfil para escribirte cuando se abra una vacante más cercana a tu experiencia.'
            : 'No fue una decisión sobre tu trabajo: había un número acotado de cupos y ya quedaron tomados. Nos encantaría verte postular a futuras vacantes que se acerquen más a tu perfil.',
          body3: null,
          closing: 'Gracias por el interés que pusiste en este proceso.',
        }

  const binaryCopy =
    locale === 'en'
      ? isSelected
        ? {
            preview: (title: string) => `The next step is your offer letter for ${title}.`,
            heading: firstName ? `We chose you, ${firstName}!` : 'We chose you!',
            greeting: null,
            body1: (title: string) =>
              `After reviewing your application and everything you shared with us throughout the process, we are delighted to confirm that we chose you for «${title}» at Efeonce.`,
            body2:
              'Thank you for the time, dedication, and openness you brought to each stage. Getting to know your experience and what you can bring to the team made this decision especially meaningful.',
            body3:
              'The next step is to prepare and send you the offer letter. Once you have reviewed and accepted it, we will proceed with the employment agreement. Our team will write to this same email address; you do not need to take any action for now.',
            closing: 'We are very happy to take this next step with you. We will be in touch soon.',
          }
        : {
            preview: (title: string) => `An update about your application to ${title}.`,
            heading: 'About your application',
            greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi,'),
            body1: (title: string) =>
              `Thank you for the time and interest you put into your application to «${title}» at Efeonce. After completing the process, we decided not to move forward on this occasion.`,
            body2:
              'This decision is about this particular search and the specific fit we needed right now. We would be glad to see you apply to future openings closer to your profile.',
            body3: null,
            closing: 'We sincerely appreciate your interest in working with us.',
          }
      : isSelected
        ? {
            preview: (title: string) => `El próximo paso será recibir tu carta oferta para ${title}.`,
            heading: firstName ? `¡Te elegimos, ${firstName}!` : '¡Te elegimos!',
            greeting: null,
            body1: (title: string) =>
              `Después de revisar tu postulación y todo lo que compartiste con nosotros durante el proceso, nos alegra confirmarte que te elegimos para «${title}» en Efeonce.`,
            body2:
              'Gracias por el tiempo, la dedicación y la apertura que mostraste en cada etapa. Conocer tu experiencia y lo que puedes aportar al equipo hizo que esta decisión fuera especialmente significativa.',
            body3:
              'El próximo paso es preparar y enviarte la carta oferta. Cuando la revises y aceptes, avanzaremos con la firma del contrato. Nuestro equipo te escribirá a este mismo correo; por ahora, no necesitas realizar ninguna acción.',
            closing: 'Nos alegra mucho dar este paso contigo. Hablamos pronto.',
          }
        : {
            preview: (title: string) => `Una actualización sobre tu postulación a ${title}.`,
            heading: 'Sobre tu postulación',
            greeting: (n?: string) => (n ? `Hola ${n},` : 'Hola,'),
            body1: (title: string) =>
              `Gracias por el tiempo y el interés que pusiste en tu postulación a «${title}» en Efeonce. Después de completar el proceso, decidimos no avanzar en esta oportunidad.`,
            body2:
              'La decisión responde a esta búsqueda en particular y al calce específico que necesitábamos ahora. Nos encantaría verte postular a futuras vacantes que se acerquen más a tu perfil.',
            body3: null,
            closing: 'Agradecemos de verdad tu interés en trabajar con nosotros.',
          }

  const t = isNotSelected ? notSelectedCopy : binaryCopy

  return (
    <EmailLayout previewText={t.preview(openingTitle)} locale={locale} brand='efeonce'>
      {isSelected ? (
        <Img
          src={SELECTED_ILLUSTRATION_IMAGE_URL}
          alt=""
          width={360}
          height={180}
          style={{
            width: '100%',
            maxWidth: '360px',
            height: 'auto',
            margin: '0 auto 16px',
            display: 'block',
          }}
        />
      ) : null}

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

      {t.greeting ? (
        <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 8px' }}>
          {t.greeting(firstName)}
        </Text>
      ) : null}

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
        {isSelected ? (
          locale === 'en' ? (
            <>
              After reviewing your application and everything you shared with us throughout the process, we are
              delighted to confirm that{' '}
              <strong style={EMPHASIS_STYLE}>we chose you for «{openingTitle}» at Efeonce</strong>.
            </>
          ) : (
            <>
              Después de revisar tu postulación y todo lo que compartiste con nosotros durante el proceso, nos
              alegra confirmarte que{' '}
              <strong style={EMPHASIS_STYLE}>te elegimos para «{openingTitle}» en Efeonce</strong>.
            </>
          )
        ) : (
          t.body1(openingTitle)
        )}
      </Text>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
        {t.body2}
      </Text>

      {isSelected ? (
        <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px', margin: '0 0 16px' }}>
          {locale === 'en' ? (
            <>
              <strong style={EMPHASIS_STYLE}>The next step is to prepare and send you the offer letter.</strong>{' '}
              <strong style={EMPHASIS_STYLE}>
                Once you have reviewed and accepted it, we will proceed with the employment agreement.
              </strong>{' '}
              Our team will write to this same email address; you do not need to take any action for now.
            </>
          ) : (
            <>
              <strong style={EMPHASIS_STYLE}>El próximo paso es preparar y enviarte la carta oferta.</strong>{' '}
              <strong style={EMPHASIS_STYLE}>
                Cuando la revises y aceptes, avanzaremos con la firma del contrato.
              </strong>{' '}
              Nuestro equipo te escribirá a este mismo correo; por ahora, no necesitas realizar ninguna acción.
            </>
          )}
        </Text>
      ) : null}

      <Text style={{ fontSize: '14px', color: EMAIL_COLORS.muted, lineHeight: '21px', margin: '0' }}>{t.closing}</Text>

      <Text
        style={{
          fontSize: '14px',
          color: EMAIL_COLORS.secondary,
          lineHeight: '21px',
          margin: '20px 0 0',
        }}
      >
        <strong style={EMPHASIS_STYLE}>{locale === 'en' ? 'Talent Team' : 'Equipo de Talento'}</strong>
        <br />
        Efeonce
      </Text>
    </EmailLayout>
  )
}
