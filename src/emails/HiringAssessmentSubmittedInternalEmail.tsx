import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

interface HiringAssessmentSubmittedInternalEmailProps {
  candidateName?: string
  openingTitle?: string
  applicationPublicId?: string
  submittedAtLabel?: string
  timeLimitMinutes?: number | null
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
}

export default function HiringAssessmentSubmittedInternalEmail({
  candidateName = 'María González',
  openingTitle = 'Content Creator',
  applicationPublicId = 'EO-APP-0001',
  submittedAtLabel = '15 ago 2026, 18:30',
  timeLimitMinutes = 90,
  applicationUrl = 'https://greenhouse.efeoncepro.com/agency/hiring',
}: HiringAssessmentSubmittedInternalEmailProps) {
  return (
    <EmailLayout previewText={`${candidateName} completó la evaluación para ${openingTitle}`}>
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
        Hiring · Evaluación completada
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
        {candidateName} completó el test
      </Heading>

      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.text, lineHeight: '23px', margin: '0 0 20px' }}>
        Las respuestas quedaron listas para revisión. Este resultado es evidencia de apoyo y no toma decisiones
        automáticamente.
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
        <Text style={ROW_LABEL_STYLE}>Vacante</Text>
        <Text style={ROW_VALUE_STYLE}>{openingTitle}</Text>

        <Text style={ROW_LABEL_STYLE}>Postulación</Text>
        <Text style={ROW_VALUE_STYLE}>{applicationPublicId}</Text>

        <Text style={ROW_LABEL_STYLE}>Completado</Text>
        <Text style={ROW_VALUE_STYLE}>{submittedAtLabel}</Text>

        <Text style={ROW_LABEL_STYLE}>Tiempo asignado</Text>
        <Text style={{ ...ROW_VALUE_STYLE, margin: '0' }}>
          {timeLimitMinutes ? `${timeLimitMinutes} minutos` : 'Sin límite configurado'}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
        <EmailButton href={applicationUrl}>Revisar evaluación</EmailButton>
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
