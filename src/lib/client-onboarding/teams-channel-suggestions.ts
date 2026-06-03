import 'server-only'

import { acquireGraphToken, readBotFrameworkSecret } from '@/lib/integrations/teams/bot-framework/token-cache'

/**
 * TASK-997 Slice 4 — read API de la primitiva External Reference Association para
 * Microsoft Teams. Busca equipos (Teams) por nombre vía Microsoft Graph para que
 * el operador ANCLE el canal existente del cliente en vez de crear uno duplicado.
 *
 * Readiness (degradación honesta): requiere las credenciales del bot
 * (`greenhouse-teams-bot-client-credentials`) + permisos Graph `Group.Read.All`.
 * Si faltan, lanza → el endpoint degrada y la UI cae a "crear canal nuevo".
 * V1: devuelve el equipo (team); el canal por defecto (General) lo resuelve el
 * aprovisionamiento async. Channel-level selection queda como follow-up.
 */
export type TeamsChannelSuggestion = {
  teamId: string
  teamName: string
}

const SECRET_REF =
  process.env.GREENHOUSE_TEAMS_BOT_CLIENT_CREDENTIALS_SECRET_REF?.trim() ||
  'greenhouse-teams-bot-client-credentials'

type GraphGroupSearchResponse = {
  value?: Array<{ id: string; displayName?: string }>
}

export const listTeamsChannelSuggestions = async (
  queryText: string
): Promise<TeamsChannelSuggestion[]> => {
  const q = queryText.trim()

  if (q.length < 2) return []

  const creds = await readBotFrameworkSecret(SECRET_REF)

  if (!creds) throw new Error('teams_bot_credentials_unavailable')

  const token = await acquireGraphToken(creds)

  // Teams = M365 groups con resourceProvisioningOptions que incluye 'Team'.
  const filter = `resourceProvisioningOptions/Any(x:x eq 'Team') and startswith(displayName,'${q.replace(/'/g, "''")}')`
  const url = `https://graph.microsoft.com/v1.0/groups?$filter=${encodeURIComponent(filter)}&$select=id,displayName&$top=25`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      // $filter con startswith sobre displayName requiere consistency eventual.
      ConsistencyLevel: 'eventual'
    },
    signal: AbortSignal.timeout(15_000)
  })

  if (!res.ok) throw new Error(`graph_groups_search_failed_${res.status}`)

  const json = (await res.json()) as GraphGroupSearchResponse

  return (json.value ?? [])
    .filter(group => Boolean(group.id))
    .map(group => ({
      teamId: group.id,
      teamName: group.displayName?.trim() || group.id
    }))
}
