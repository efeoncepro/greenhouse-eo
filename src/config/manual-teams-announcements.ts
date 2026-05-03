export interface ManualTeamsAnnouncementDestination {
  key: string
  label: string
  description: string
  channelCode: string
  secretRef: string
  botAppId: string
  azureTenantId: string
  recipientKind: 'chat_group'
  recipientChatId: string
  defaultCtaLabel: string
}

export const MANUAL_TEAMS_ANNOUNCEMENT_DESTINATIONS: Record<string, ManualTeamsAnnouncementDestination> = {
  'eo-team': {
    key: 'eo-team',
    label: 'EO Team',
    description: 'Chat grupal principal del equipo EO para anuncios manuales institucionales.',
    channelCode: 'manual-eo-team-announcement',
    secretRef: 'greenhouse-teams-bot-client-credentials',
    botAppId: 'a1397477-4aae-4f16-a0a2-a213cb1b00b2',
    azureTenantId: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
    recipientKind: 'chat_group',
    recipientChatId: '19:1e085e8a02d24cc7a0244490e5d00fb0@thread.v2',
    defaultCtaLabel: 'Abrir enlace'
  }
}

export const getManualTeamsAnnouncementDestination = (key: string) =>
  MANUAL_TEAMS_ANNOUNCEMENT_DESTINATIONS[key] || null
