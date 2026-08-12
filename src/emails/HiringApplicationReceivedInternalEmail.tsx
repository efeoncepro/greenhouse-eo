import { Heading, Link, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

/**
 * TASK-1689 (+enriquecido con TASK-1688) — Aviso interno a People: llegó una postulación nueva.
 *
 * Destinatario = buzón interno del equipo (people@efeoncepro.com, configurable), NUNCA el
 * candidato. Contiene los datos del postulante (PII) — por eso este tipo NO es agency-branded
 * y jamás se envía fuera del buzón interno configurado. Incluye el contacto completo de
 * TASK-1688 (teléfono, país de residencia, mensaje, links) con "No informado" honesto para
 * legacy. El CTA lleva al Application 360.
 */
interface HiringApplicationReceivedInternalEmailProps {
  candidateName?: string
  candidateEmail?: string
  candidatePhone?: string | null
  candidateResidenceCountry?: string | null
  candidateMessage?: string | null
  portfolioUrl?: string | null
  linkedinUrl?: string | null
  openingTitle?: string
  applicationPublicId?: string
  source?: string
  applicationUrl?: string
}

const ROW_LABEL_STYLE = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  color: EMAIL_COLORS.muted,
  margin: '0 0 2px',
  lineHeight: '18px',
}

const ROW_VALUE_STYLE = {
  fontSize: '15px',
  color: EMAIL_COLORS.text,
  margin: '0 0 14px',
  lineHeight: '22px',
  wordBreak: 'break-word' as const,
}

const NOT_PROVIDED = 'No informado'

export default function HiringApplicationReceivedInternalEmail({
  candidateName = 'María González',
  candidateEmail = 'maria@ejemplo.com',
  candidatePhone = '+56 9 1234 5678',
  candidateResidenceCountry = 'Chile',
  candidateMessage = 'Me interesa el rol porque llevo 4 años creando contenido para marcas B2B.',
  portfolioUrl = 'https://portafolio.ejemplo.com',
  linkedinUrl = null,
  openingTitle = 'Content Creator',
  applicationPublicId = 'EO-APP-0001',
  source = 'public_careers',
  applicationUrl = 'https://greenhouse.efeoncepro.com/agency/hiring',
}: HiringApplicationReceivedInternalEmailProps) {
  return (
    <EmailLayout previewText={`${candidateName} postuló a ${openingTitle} (${applicationPublicId})`}>
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
        Hiring · Postulación nueva
      </Text>

      <Heading
        style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '22px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
          margin: '0 0 16px',
          lineHeight: '30px',
        }}
      >
        {candidateName} postuló a {openingTitle}
      </Heading>

      <Section
        style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '24px',
          margin: '0 0 24px',
        }}
      >
        <Text style={ROW_LABEL_STYLE}>Correo</Text>
        <Text style={ROW_VALUE_STYLE}>{candidateEmail}</Text>

        <Text style={ROW_LABEL_STYLE}>Teléfono</Text>
        <Text style={{ ...ROW_VALUE_STYLE, ...(candidatePhone ? {} : { color: EMAIL_COLORS.muted }) }}>
          {candidatePhone ?? NOT_PROVIDED}
        </Text>

        <Text style={ROW_LABEL_STYLE}>País de residencia</Text>
        <Text style={{ ...ROW_VALUE_STYLE, ...(candidateResidenceCountry ? {} : { color: EMAIL_COLORS.muted }) }}>
          {candidateResidenceCountry ?? NOT_PROVIDED}
        </Text>

        {portfolioUrl ? (
          <>
            <Text style={ROW_LABEL_STYLE}>Portafolio</Text>
            <Text style={ROW_VALUE_STYLE}>
              <Link href={portfolioUrl} style={{ color: EMAIL_COLORS.primary }}>
                {portfolioUrl}
              </Link>
            </Text>
          </>
        ) : null}

        {linkedinUrl ? (
          <>
            <Text style={ROW_LABEL_STYLE}>LinkedIn</Text>
            <Text style={ROW_VALUE_STYLE}>
              <Link href={linkedinUrl} style={{ color: EMAIL_COLORS.primary }}>
                {linkedinUrl}
              </Link>
            </Text>
          </>
        ) : null}

        <Text style={ROW_LABEL_STYLE}>Postulación</Text>
        <Text style={ROW_VALUE_STYLE}>{applicationPublicId}</Text>

        <Text style={ROW_LABEL_STYLE}>Origen</Text>
        <Text style={{ ...ROW_VALUE_STYLE, margin: '0' }}>{source}</Text>
      </Section>

      {candidateMessage ? (
        <Section
          style={{
            backgroundColor: '#F0F7FF',
            border: `1px solid ${EMAIL_COLORS.border}`,
            borderRadius: '12px',
            padding: '20px 24px',
            margin: '0 0 24px',
          }}
        >
          <Text style={ROW_LABEL_STYLE}>Mensaje del candidato</Text>
          <Text style={{ ...ROW_VALUE_STYLE, margin: '0', whiteSpace: 'pre-wrap' as const }}>{candidateMessage}</Text>
        </Section>
      ) : null}

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={applicationUrl}>Revisar en el Hiring Desk</EmailButton>
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
        Si el botón no funciona, copia y pega esta dirección en tu navegador: {applicationUrl}
      </Text>
    </EmailLayout>
  )
}
