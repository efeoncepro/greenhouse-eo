import { Heading, Section, Text } from '@react-email/components'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

export default function HiringTalentPoolVerificationEmail({
  recipientName,
  profileUrl,
  tokenTtlDays = 30,
  locale = 'es'
}: {
  recipientName?: string
  profileUrl?: string
  tokenTtlDays?: number
  locale?: 'es' | 'en'
}) {
  const en = locale === 'en'
  const first = recipientName?.split(' ')[0]
  const url = profileUrl ?? 'https://greenhouse.efeoncepro.com/public/careers/talent-profile/preview-token'

  return (
    <EmailLayout
      previewText={
        en ? 'Confirm your Efeonce Talent Pool preference.' : 'Confirma tu preferencia del Banco de Talento Efeonce.'
      }
      locale={locale}
      brand='efeonce'
    >
      <Heading
        style={{
          fontFamily: EMAIL_FONTS.heading,
          fontSize: '24px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
          margin: '0 0 12px'
        }}
      >
        {en ? 'Confirm future opportunities' : 'Confirma futuras oportunidades'}
      </Heading>
      <Text style={{ fontSize: '15px', color: EMAIL_COLORS.secondary, lineHeight: '24px' }}>
        {en
          ? `Hi${first ? ` ${first}` : ''}. You asked Efeonce to consider your profile for future opportunities. Confirm and manage that preference from this private link.`
          : `Hola${first ? ` ${first}` : ''}. Pediste que Efeonce considere tu perfil para futuras oportunidades. Confirma y administra esa preferencia desde este enlace privado.`}
      </Text>
      <Section
        style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: '12px',
          padding: '24px',
          margin: '20px 0',
          textAlign: 'center' as const
        }}
      >
        <EmailButton href={url}>{en ? 'Review and confirm' : 'Revisar y confirmar'}</EmailButton>
        <Text style={{ fontSize: '12px', color: EMAIL_COLORS.muted, margin: '14px 0 0' }}>
          {en ? `This link expires in ${tokenTtlDays} days.` : `Este enlace vence en ${tokenTtlDays} días.`}
        </Text>
      </Section>
      <Text
        style={{ fontSize: '12px', color: EMAIL_COLORS.muted, lineHeight: '18px', wordBreak: 'break-all' as const }}
      >
        {en
          ? 'If you did not request this, ignore this email. No future-contact permission will be activated.'
          : 'Si no pediste esto, ignora el correo. No activaremos permiso de contacto futuro.'}{' '}
        {url}
      </Text>
    </EmailLayout>
  )
}
