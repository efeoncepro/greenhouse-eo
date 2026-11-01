import { Heading, Section, Text } from '@react-email/components'

import { ROOMS_INVITATION_EMAIL_COPY as copy } from '@/lib/copy/rooms-invitation-email'

import EmailButton from './components/EmailButton'
import EmailLayout from './components/EmailLayout'
import { EMAIL_COLORS, EMAIL_FONTS } from './constants'

export interface RoomsInvitationOtpEmailProps {
  invitationUrl: string
  roomLabel: string
  code: string
  expiresInMinutes: number
}

export default function RoomsInvitationOtpEmail({ invitationUrl, roomLabel, code, expiresInMinutes }: RoomsInvitationOtpEmailProps) {
  return (
    <EmailLayout brand='efeonce' previewText={copy.preview} locale='es'>
      <Heading style={{ fontFamily: EMAIL_FONTS.heading, color: EMAIL_COLORS.text }}>{copy.heading}</Heading>
      <Text style={{ color: EMAIL_COLORS.secondary }}>{copy.body(roomLabel)}</Text>
      <Section style={{ textAlign: 'center', backgroundColor: EMAIL_COLORS.infoBg }}>
        <Text style={{ color: EMAIL_COLORS.secondary }}>{copy.codeLabel}</Text>
        <Heading style={{ fontFamily: EMAIL_FONTS.heading, color: EMAIL_COLORS.text }}>{code}</Heading>
        <Text style={{ color: EMAIL_COLORS.secondary }}>{copy.validity(expiresInMinutes)}</Text>
      </Section>
      <Section style={{ textAlign: 'center' }}>
        <EmailButton href={invitationUrl}>{copy.cta}</EmailButton>
      </Section>
      <Text style={{ color: EMAIL_COLORS.muted }}>{copy.disclaimer}</Text>
      <Text style={{ color: EMAIL_COLORS.muted }}>
        {copy.fallback} <span style={{ wordBreak: 'break-all' }}>{invitationUrl}</span>
      </Text>
    </EmailLayout>
  )
}
