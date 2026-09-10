import 'server-only'

import { readBotFrameworkSecret, acquireGraphToken } from '@/lib/integrations/teams/bot-framework/token-cache'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-998 — Teams self-serve: lista teams + canales que el bot puede ver vía Graph,
 * para que el operador vincule el canal del cliente en el checklist de onboarding.
 *
 * A diferencia de Notion (la API no enumera teamspaces → token-por-cliente), el bot
 * Graph YA puede listar teams + canales con los permisos actuales (verificado live:
 * "Berel - Efeonce" › "Squad Berel"). Sin permisos Azure nuevos. Read-only: no envía
 * mensajes ni muta nada. El canal elegido se registra en teams_notification_channels.
 */

const BOT_SECRET_REF = 'greenhouse-teams-bot-client-credentials'
const GRAPH_API = 'https://graph.microsoft.com/v1.0'

export interface TeamForLinking {
  teamId: string
  displayName: string
}

export interface TeamChannelForLinking {
  channelId: string
  displayName: string
}

export interface TeamsListResult {
  ok: boolean
  reason?: string
  teams: TeamForLinking[]
}

export interface TeamChannelsResult {
  ok: boolean
  reason?: string
  channels: TeamChannelForLinking[]
}

const acquireToken = async (): Promise<string | null> => {
  const blob = await readBotFrameworkSecret(BOT_SECRET_REF)

  if (!blob) return null

  try {
    return await acquireGraphToken({ tenantId: blob.tenantId, clientId: blob.clientId, clientSecret: blob.clientSecret })
  } catch (err) {
    captureWithDomain(err, 'integrations.teams', { tags: { source: 'teams_channels_reader', stage: 'token' } })

    return null
  }
}

/**
 * Lista los teams que el bot puede ver (`GET /v1.0/teams`). Read-only.
 */
export const listTeamsForLinking = async (): Promise<TeamsListResult> => {
  const token = await acquireToken()

  if (!token) {
    return { ok: false, reason: 'No pudimos autenticar el bot de Teams. Verifica las credenciales.', teams: [] }
  }

  try {
    const res = await fetch(`${GRAPH_API}/teams?$top=50&$select=id,displayName`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000)
    })

    if (!res.ok) {
      return { ok: false, reason: `Microsoft Graph respondió ${res.status} al listar los equipos.`, teams: [] }
    }

    const json = (await res.json()) as { value?: Array<{ id?: string; displayName?: string }> }

    const teams = (json.value ?? [])
      .filter(t => t.id)
      .map(t => ({ teamId: String(t.id), displayName: t.displayName?.trim() || String(t.id) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))

    return { ok: true, teams }
  } catch (err) {
    captureWithDomain(err, 'integrations.teams', { tags: { source: 'teams_channels_reader', stage: 'list_teams' } })

    return { ok: false, reason: 'No pudimos conectar con Microsoft Graph. Intenta de nuevo.', teams: [] }
  }
}

/**
 * Lista los canales de un team (`GET /v1.0/teams/{id}/channels`). Read-only.
 */
export const listTeamChannelsForLinking = async (teamId: string): Promise<TeamChannelsResult> => {
  const id = (teamId || '').trim()

  if (!id) return { ok: false, reason: 'Falta el equipo.', channels: [] }

  const token = await acquireToken()

  if (!token) {
    return { ok: false, reason: 'No pudimos autenticar el bot de Teams. Verifica las credenciales.', channels: [] }
  }

  try {
    const res = await fetch(`${GRAPH_API}/teams/${encodeURIComponent(id)}/channels?$select=id,displayName`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000)
    })

    if (!res.ok) {
      return { ok: false, reason: `Microsoft Graph respondió ${res.status} al listar los canales.`, channels: [] }
    }

    const json = (await res.json()) as { value?: Array<{ id?: string; displayName?: string }> }

    const channels = (json.value ?? [])
      .filter(c => c.id)
      .map(c => ({ channelId: String(c.id), displayName: c.displayName?.trim() || String(c.id) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))

    return { ok: true, channels }
  } catch (err) {
    captureWithDomain(err, 'integrations.teams', { tags: { source: 'teams_channels_reader', stage: 'list_channels' } })

    return { ok: false, reason: 'No pudimos conectar con Microsoft Graph. Intenta de nuevo.', channels: [] }
  }
}

export interface GroupChatInspection {
  ok: boolean
  /** `verified` = the bot app is installed in the chat; `unverified` = Graph could not confirm (permission/404). */
  membership: 'verified' | 'unverified'
  chatType?: string | null
  topic?: string | null
  reason?: string
}

const CHAT_ID_PATTERN = /^19:[A-Za-z0-9_-]+@thread\.v2$/

export const isTeamsGroupChatId = (value: string): boolean => CHAT_ID_PATTERN.test(value.trim())

/**
 * TASK-1852 — inspección read-only de un chat grupal (`GET /v1.0/chats/{id}` +
 * `GET /v1.0/chats/{id}/installedApps?$expand=teamsApp`). No envía nada. Sirve para decidir
 * `provisioning_status`: sólo `verified` (el bot está instalado en el chat) permite `ready`;
 * si Graph no tiene permiso o el chat no es visible, el canal queda `pending_setup` con razón,
 * nunca `ready` por inferencia.
 */
export const inspectGroupChatForLinking = async (chatId: string, botAppId: string): Promise<GroupChatInspection> => {
  const id = (chatId || '').trim()

  if (!isTeamsGroupChatId(id)) return { ok: false, membership: 'unverified', reason: 'El identificador no es un chat grupal de Teams (19:…@thread.v2).' }

  const token = await acquireToken()

  if (!token) return { ok: false, membership: 'unverified', reason: 'No pudimos autenticar el bot de Teams. Verifica las credenciales.' }

  try {
    const chatRes = await fetch(`${GRAPH_API}/chats/${encodeURIComponent(id)}?$select=id,chatType,topic`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000)
    })

    if (!chatRes.ok) {
      return { ok: true, membership: 'unverified', reason: `Microsoft Graph respondió ${chatRes.status} al leer el chat; la pertenencia del bot no se pudo confirmar.` }
    }

    const chat = (await chatRes.json()) as { chatType?: string; topic?: string | null }

    const appsRes = await fetch(`${GRAPH_API}/chats/${encodeURIComponent(id)}/installedApps?$expand=teamsApp($select=id,externalId,displayName)`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000)
    })

    if (!appsRes.ok) {
      return { ok: true, membership: 'unverified', chatType: chat.chatType ?? null, topic: chat.topic ?? null,
        reason: `Microsoft Graph respondió ${appsRes.status} al listar las apps del chat; la pertenencia del bot no se pudo confirmar.` }
    }

    const apps = (await appsRes.json()) as { value?: Array<{ teamsApp?: { externalId?: string | null; id?: string } }> }
    const installed = (apps.value ?? []).some(app => app.teamsApp?.externalId === botAppId || app.teamsApp?.id === botAppId)

    return installed
      ? { ok: true, membership: 'verified', chatType: chat.chatType ?? null, topic: chat.topic ?? null }
      : { ok: true, membership: 'unverified', chatType: chat.chatType ?? null, topic: chat.topic ?? null,
          reason: 'El bot de Greenhouse no aparece instalado en este chat; agrégalo desde Teams antes de marcarlo listo.' }
  } catch (err) {
    captureWithDomain(err, 'integrations.teams', { tags: { source: 'teams_channels_reader', stage: 'inspect_chat' } })

    return { ok: false, membership: 'unverified', reason: 'No pudimos conectar con Microsoft Graph. Intenta de nuevo.' }
  }
}

