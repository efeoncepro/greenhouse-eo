import 'server-only'

import type { PoolClient } from 'pg'

import { readBotFrameworkSecret } from '@/lib/integrations/teams/bot-framework/token-cache'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1010 — materializa el canal de Teams anclado en el wizard a
 * `greenhouse_core.teams_notification_channels`, scopeado al Space (columna `space_id`
 * agregada en `20260604171604517`). Espeja `writeSpaceNotionSourcesFromIntent` (Notion):
 * UPSERT idempotente por `channel_code` determinístico + SAVEPOINT para no envenenar la tx
 * del composer. El canal se postea vía el Bot Framework (`channel_kind='teams_bot'`), que
 * usa las credenciales compartidas del bot (NO un secret por cliente).
 */

// Secret compartido del bot (mismo que usa teams-channels-reader / el sender).
const BOT_SECRET_REF = 'greenhouse-teams-bot-client-credentials'

export interface TeamsChannelAnchor {
  teamId: string
  teamName: string
  channelId?: string | null
  channelName?: string | null
}

// channel_code es PK y debe matchear ^[a-z0-9-]+$. Determinístico por Space → idempotente.
const channelCodeForSpace = (spaceId: string): string =>
  `client-teams-${spaceId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`

export const writeTeamsChannelFromAnchor = async (
  spaceId: string,
  anchor: TeamsChannelAnchor,
  client?: PoolClient
): Promise<{ ok: boolean; channelCode?: string; reason?: string }> => {
  // El CHECK `teams_notification_channels_kind_bot_check` exige channel_id para 'teams_bot'.
  // Si el wizard solo ancló el equipo (sin canal específico), degradamos honesto: NO escribimos
  // (el ítem `provision_communication_channels` queda para completar el canal). La resolución
  // del canal General vía Graph es readiness aparte (operator-gated, TASK-1010 scope).
  if (!anchor.channelId) {
    return { ok: false, reason: 'channel_pending' }
  }

  const bot = await readBotFrameworkSecret(BOT_SECRET_REF)

  if (!bot) {
    return { ok: false, reason: 'bot_secret_unavailable' }
  }

  const channelCode = channelCodeForSpace(spaceId)
  const displayName = `Teams — ${anchor.teamName}${anchor.channelName ? ` · ${anchor.channelName}` : ''}`.slice(0, 200)

  const sql = `INSERT INTO greenhouse_core.teams_notification_channels (
         channel_code, channel_kind, display_name, secret_ref,
         bot_app_id, team_id, channel_id, azure_tenant_id,
         recipient_kind, provisioning_status, space_id
       ) VALUES ($1, 'teams_bot', $2, $3, $4, $5, $6, $7, 'channel', 'ready', $8)
       ON CONFLICT (channel_code) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         bot_app_id = EXCLUDED.bot_app_id,
         team_id = EXCLUDED.team_id,
         channel_id = EXCLUDED.channel_id,
         azure_tenant_id = EXCLUDED.azure_tenant_id,
         provisioning_status = 'ready',
         space_id = EXCLUDED.space_id,
         updated_at = CURRENT_TIMESTAMP
       RETURNING channel_code`

  const params = [channelCode, displayName, BOT_SECRET_REF, bot.clientId, anchor.teamId, anchor.channelId, bot.tenantId, spaceId]

  // Dentro de la tx del composer: SAVEPOINT para que un fallo no envenene la tx padre
  // (bug class TASK-998) — el caller degrada (teamsConnected=false) y sigue creando el cliente.
  if (client) {
    await client.query('SAVEPOINT teams_chan_write')

    try {
      const code = (await client.query<{ channel_code: string }>(sql, params)).rows[0]?.channel_code

      await client.query('RELEASE SAVEPOINT teams_chan_write')

      return { ok: true, channelCode: code }
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT teams_chan_write')
      captureWithDomain(err, 'integrations.teams', { tags: { source: 'teams_connect_store', stage: 'persist' }, extra: { spaceId } })

      return { ok: false, reason: 'persist_failed' }
    }
  }

  try {
    const code = (await runGreenhousePostgresQuery<{ channel_code: string }>(sql, params))[0]?.channel_code

    return { ok: true, channelCode: code }
  } catch (err) {
    captureWithDomain(err, 'integrations.teams', { tags: { source: 'teams_connect_store', stage: 'persist' }, extra: { spaceId } })

    return { ok: false, reason: 'persist_failed' }
  }
}
