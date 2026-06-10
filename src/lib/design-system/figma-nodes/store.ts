import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { AXIS_FILE_KEY } from '@/components/greenhouse/primitives/GreenhouseFigmaNodeButton'

import { parseFigmaUrl } from './parse-figma-url'

/**
 * Design System ↔ AXIS Figma node SSOT store (TASK-1072 Slice 1).
 *
 * Reemplaza como SOURCE OF TRUTH runtime al map TS hardcodeado
 * `design-system-figma-nodes.ts` (que queda solo como seed). El reader alimenta
 * el shell server-side; el command persiste el vínculo que un diseñador pega
 * desde la UI (capability `design_system.figma_node.link`, Slice 2).
 *
 * Reglas duras: file_key DEBE ser AXIS (fail-closed); re-link = UPDATE in-place
 * + evento de audit append-only (NUNCA DELETE). Server-only.
 */

/** Stable error codes para que la API mapee a `canonicalErrorResponse` (es-CL). */
export type DesignSystemFigmaLinkErrorCode = 'invalid_figma_url' | 'figma_node_not_axis' | 'invalid_surface_key'

export class DesignSystemFigmaLinkError extends Error {
  readonly code: DesignSystemFigmaLinkErrorCode

  constructor(code: DesignSystemFigmaLinkErrorCode, message: string) {
    super(message)
    this.name = 'DesignSystemFigmaLinkError'
    this.code = code
  }
}

export interface DesignSystemFigmaNode {
  fileKey: string
  nodeId: string
  nodeName: string | null
}

/** `Record<surfaceKey, { fileKey, nodeId, nodeName }>` — solo vínculos activos. */
export type DesignSystemFigmaNodeMap = Record<string, DesignSystemFigmaNode>

const SURFACE_KEY_SHAPE = /^\/design-system(\/[A-Za-z0-9/-]+)?$/

const normalizeSurfaceKey = (raw: string): string => {
  const trimmed = (raw ?? '').trim()
  const noTrailing = trimmed === '/' ? trimmed : trimmed.replace(/\/+$/, '')

  return noTrailing
}

type FigmaNodeRow = {
  surface_key: string
  file_key: string
  node_id: string
  node_name: string | null
}

/**
 * Canonical reader: the active surface→node map from the DB (SSOT runtime).
 * Filters soft-unlinked rows (`superseded_at IS NULL`). The TS map is seed-only.
 */
export const getDesignSystemFigmaNodeMap = async (): Promise<DesignSystemFigmaNodeMap> => {
  const rows = await runGreenhousePostgresQuery<FigmaNodeRow>(
    `SELECT surface_key, file_key, node_id, node_name
       FROM greenhouse_core.design_system_figma_nodes
      WHERE superseded_at IS NULL`
  )

  const map: DesignSystemFigmaNodeMap = {}

  for (const row of rows) {
    map[row.surface_key] = { fileKey: row.file_key, nodeId: row.node_id, nodeName: row.node_name }
  }

  return map
}

export interface LinkDesignSystemFigmaNodeInput {
  surfaceKey: string
  /** Raw Figma URL pasted by the designer (tolerates @/<>/quotes/legacy/branch forms). */
  url: string
  actorUserId: string
}

export interface LinkDesignSystemFigmaNodeResult {
  surfaceKey: string
  fileKey: string
  nodeId: string
  /** 'linked' = primer vínculo · 'relinked' = reemplazó un nodo previo. */
  outcome: 'linked' | 'relinked'
  previousNodeId: string | null
}

/**
 * Link (or re-link) a Design System surface to an AXIS Figma node.
 *
 * parse → validar AXIS (fail-closed) → upsert idempotente por surface_key
 * (re-link = supersede del anterior, todo en una sola tx con audit + outbox).
 * Throws `DesignSystemFigmaLinkError` con `code` estable para que la API lo
 * mapee a un error es-CL canónico.
 */
export const linkDesignSystemFigmaNode = async (
  input: LinkDesignSystemFigmaNodeInput
): Promise<LinkDesignSystemFigmaNodeResult> => {
  const surfaceKey = normalizeSurfaceKey(input.surfaceKey)

  if (!SURFACE_KEY_SHAPE.test(surfaceKey)) {
    throw new DesignSystemFigmaLinkError('invalid_surface_key', `Surface key inválido: ${surfaceKey}`)
  }

  const parsed = parseFigmaUrl(input.url)

  if (!parsed) {
    throw new DesignSystemFigmaLinkError('invalid_figma_url', 'No parece un enlace de nodo Figma')
  }

  // Fail-closed allowlist: solo el file AXIS entra al Design System.
  if (parsed.fileKey !== AXIS_FILE_KEY) {
    throw new DesignSystemFigmaLinkError('figma_node_not_axis', 'El nodo debe ser del archivo AXIS')
  }

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    const existing = await client.query<{ node_id: string }>(
      `SELECT node_id FROM greenhouse_core.design_system_figma_nodes
        WHERE surface_key = $1 AND superseded_at IS NULL
        FOR UPDATE`,
      [surfaceKey]
    )

    const previousNodeId = existing.rows[0]?.node_id ?? null
    const outcome: 'linked' | 'relinked' = previousNodeId ? 'relinked' : 'linked'

    await client.query(
      `INSERT INTO greenhouse_core.design_system_figma_nodes
         (surface_key, file_key, node_id, linked_by, linked_at, updated_by, updated_at, superseded_at)
       VALUES ($1, $2, $3, $4, NOW(), $4, NOW(), NULL)
       ON CONFLICT (surface_key) DO UPDATE SET
         file_key = EXCLUDED.file_key,
         node_id = EXCLUDED.node_id,
         linked_by = EXCLUDED.linked_by,
         linked_at = NOW(),
         updated_by = EXCLUDED.updated_by,
         superseded_at = NULL`,
      [surfaceKey, parsed.fileKey, parsed.nodeId, input.actorUserId]
    )

    await client.query(
      `INSERT INTO greenhouse_core.design_system_figma_node_events
         (event_id, surface_key, event_type, file_key, from_node_id, to_node_id, actor_user_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        `dsfn-evt-${randomUUID()}`,
        surfaceKey,
        outcome,
        parsed.fileKey,
        previousNodeId,
        parsed.nodeId,
        input.actorUserId,
        JSON.stringify({ fileName: parsed.fileName })
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.designSystemFigmaNode,
        aggregateId: surfaceKey,
        eventType:
          outcome === 'relinked'
            ? EVENT_TYPES.designSystemFigmaNodeRelinked
            : EVENT_TYPES.designSystemFigmaNodeLinked,
        payload: {
          surfaceKey,
          fileKey: parsed.fileKey,
          nodeId: parsed.nodeId,
          previousNodeId,
          actorUserId: input.actorUserId
        }
      },
      client
    )

    return { surfaceKey, fileKey: parsed.fileKey, nodeId: parsed.nodeId, outcome, previousNodeId }
  })
}
