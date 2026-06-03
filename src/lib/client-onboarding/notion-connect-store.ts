import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { createOrAddSecretVersion } from '@/lib/secrets/secret-manager'
import { captureWithDomain } from '@/lib/observability/capture'

import { discoverNotionDatabasesForToken } from './notion-token-connect'

/**
 * TASK-998 — Connect store: persiste el vínculo de un teamspace Notion de cliente
 * usando su token scoped (el token ES el scope).
 *
 * Flujo: valida el token (search) → verifica que los ids elegidos pertenezcan a
 * lo que el token ve (anti-tampering) → guarda el token en GCP Secret Manager →
 * UPSERT `space_notion_sources` con `notion_token_secret_ref` + los 3 db ids.
 *
 * IMPORTANTE — `sync_enabled=FALSE` + escritura SOLO a PG (no replicar a BQ): el
 * pipeline legacy `notion-bq-sync` usa el token COMPARTIDO y daría 404 sobre un
 * teamspace de cliente. Mantenerlo invisible al pipeline legacy hasta que el repo
 * hermano `notion-bigquery` resuelva el token POR space (`notion_token_secret_ref`)
 * y flipee `sync_enabled`. El registro en PG es válido + additivo desde ya.
 */

export interface ConnectNotionTeamspaceInput {
  spaceId: string
  /** Slug del cliente para el secret id (`notion-integration-token-greenhouse-<slug>`). */
  clientSlug: string
  token: string
  tareasDbId: string
  proyectosDbId: string
  sprintsDbId: string
  revisionesDbId?: string | null
  actorUserId: string
}

export interface ConnectNotionTeamspaceResult {
  ok: boolean
  reason?: string
  errorCode?: 'invalid_input' | 'token_invalid' | 'db_not_visible' | 'secret_write_failed' | 'persist_failed'
  secretRef?: string
  sourceId?: string
}

const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]{0,60}$/

export const slugifyForSecret = (raw: string): string =>
  (raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

export const connectNotionTeamspaceForSpace = async (
  input: ConnectNotionTeamspaceInput
): Promise<ConnectNotionTeamspaceResult> => {
  const { spaceId, token, tareasDbId, proyectosDbId, sprintsDbId, revisionesDbId, actorUserId } = input
  const clientSlug = slugifyForSecret(input.clientSlug)

  if (!spaceId || !clientSlug || !SLUG_SHAPE.test(clientSlug) || !tareasDbId || !proyectosDbId || !sprintsDbId) {
    return { ok: false, errorCode: 'invalid_input', reason: 'Faltan datos para conectar el teamspace (space, slug o las 3 DBs).' }
  }

  // 1. Validar token + descubrir DBs visibles (el token = el scope).
  const discovery = await discoverNotionDatabasesForToken(token)

  if (!discovery.ok) {
    return { ok: false, errorCode: 'token_invalid', reason: discovery.reason }
  }

  // 2. Anti-tampering: los ids elegidos DEBEN estar en lo que el token ve.
  const visible = new Set(discovery.databases.map(d => d.databaseId))
  const chosen = [tareasDbId, proyectosDbId, sprintsDbId, ...(revisionesDbId ? [revisionesDbId] : [])]
  const missing = chosen.filter(id => !visible.has(id))

  if (missing.length > 0) {
    return { ok: false, errorCode: 'db_not_visible', reason: 'Alguna DB elegida no es visible para este token. Revisa la selección.' }
  }

  // 3. Guardar el token en Secret Manager (canónico, idempotente).
  const secretId = `notion-integration-token-greenhouse-${clientSlug}`
  const secret = await createOrAddSecretVersion(secretId, token.trim())

  if (!secret.ok) {
    return { ok: false, errorCode: 'secret_write_failed', reason: secret.reason, secretRef: secretId }
  }

  // 4. UPSERT space_notion_sources (PG SSOT). sync_enabled=FALSE (ver header).
  try {
    const rows = await runGreenhousePostgresQuery<{ source_id: string }>(
      `INSERT INTO greenhouse_core.space_notion_sources (
         source_id, space_id,
         notion_db_proyectos, notion_db_tareas, notion_db_sprints, notion_db_revisiones,
         notion_token_secret_ref, sync_enabled, sync_frequency, created_by
       )
       VALUES (
         'sns-' || gen_random_uuid(), $1,
         $2, $3, $4, $5,
         $6, FALSE, 'daily', $7
       )
       ON CONFLICT (space_id) DO UPDATE SET
         notion_db_proyectos = EXCLUDED.notion_db_proyectos,
         notion_db_tareas = EXCLUDED.notion_db_tareas,
         notion_db_sprints = EXCLUDED.notion_db_sprints,
         notion_db_revisiones = EXCLUDED.notion_db_revisiones,
         notion_token_secret_ref = EXCLUDED.notion_token_secret_ref,
         updated_at = CURRENT_TIMESTAMP
       RETURNING source_id`,
      [spaceId, proyectosDbId, tareasDbId, sprintsDbId, revisionesDbId ?? null, secretId, actorUserId]
    )

    return { ok: true, secretRef: secretId, sourceId: rows[0]?.source_id }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', { tags: { source: 'notion_connect_store', stage: 'persist' }, extra: { spaceId } })

    return { ok: false, errorCode: 'persist_failed', reason: 'No pudimos registrar el teamspace. El token quedó guardado; reintenta.', secretRef: secretId }
  }
}
