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
  },
  // TASK-849 — Production Release Watchdog Alerts. Canal canonico para
  // alertas operativas del watchdog (stale approvals, pending sin jobs,
  // worker revision drift). V1: placeholder apuntando al mismo chat EO
  // Team. Operador puede crear chat dedicado `Production Releases` y
  // actualizar `recipientChatId` via PR cuando emerja necesidad de
  // separar canales.
  'production-release-alerts': {
    key: 'production-release-alerts',
    label: 'Production Release Alerts',
    description: 'Alertas del watchdog production release (stale approvals, concurrency deadlock, worker revision drift).',
    channelCode: 'production-release-watchdog',
    secretRef: 'greenhouse-teams-bot-client-credentials',
    botAppId: 'a1397477-4aae-4f16-a0a2-a213cb1b00b2',
    azureTenantId: 'a80bf6c1-7c45-4d70-b043-51389622a0e4',
    recipientKind: 'chat_group',
    recipientChatId: '19:1e085e8a02d24cc7a0244490e5d00fb0@thread.v2',
    defaultCtaLabel: 'Ver run en GitHub'
  }
}

export const getManualTeamsAnnouncementDestination = (key: string) =>
  MANUAL_TEAMS_ANNOUNCEMENT_DESTINATIONS[key] || null
