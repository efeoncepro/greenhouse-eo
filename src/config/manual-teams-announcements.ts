interface ManualTeamsAnnouncementDestinationBase {
  key: string
  label: string
  description: string
  channelCode: string
  secretRef: string
  botAppId: string
  azureTenantId: string
  defaultCtaLabel: string
}

export interface ManualTeamsAnnouncementChatGroupDestination extends ManualTeamsAnnouncementDestinationBase {
  recipientKind: 'chat_group'
  recipientChatId: string
}

export interface ManualTeamsAnnouncementChannelDestination extends ManualTeamsAnnouncementDestinationBase {
  recipientKind: 'channel'
  teamId: string
  channelId: string
}

export type ManualTeamsAnnouncementDestination =
  | ManualTeamsAnnouncementChatGroupDestination
  | ManualTeamsAnnouncementChannelDestination

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
  },
  // TASK-849 — Production Release Watchdog Alerts. Canal canonico para
  // alertas operativas del watchdog (stale approvals, pending sin jobs,
  // worker revision drift). Apunta al canal Teams "EO - Admin" (Equipo
  // Efeonce). Mismo canal fisico que `ops-alerts` en
  // `greenhouse_core.teams_notification_channels` — separamos el
  // channelCode para audit trazable de origen (watchdog vs ops-alerts
  // generales).
  'production-release-alerts': {
    key: 'production-release-alerts',
    label: 'Production Release Alerts (EO - Admin)',
    description: 'Alertas del watchdog production release (stale approvals, concurrency deadlock, worker revision drift). Destino: canal "EO - Admin" del Equipo Efeonce.',
    channelCode: 'production-release-watchdog',
    secretRef: 'greenhouse-teams-bot-client-credentials',
    botAppId: 'a1397477-4aae-4f16-a0a2-a213cb1b00b2',
    azureTenantId: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
    recipientKind: 'channel',
    teamId: 'aae47836-8e59-4d9a-bce5-37d12978a1ad',
    channelId: '19:19UgRoht3Vmw0qgzfC71rKlOpHtfEI4Qz1jVdWMGqXE1@thread.tacv2',
    defaultCtaLabel: 'Ver run en GitHub'
  }
}

export const getManualTeamsAnnouncementDestination = (key: string) =>
  MANUAL_TEAMS_ANNOUNCEMENT_DESTINATIONS[key] || null
