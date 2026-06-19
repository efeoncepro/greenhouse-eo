import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AXIS_FILE_KEY } from '@/lib/design-system/figma-nodes/axis-file'
import { parseFigmaUrl } from '@/lib/design-system/figma-nodes/parse-figma-url'

import { getAllowedDesignHandoffFile } from './allowlist'
import {
  DesignHandoffError,
  assertValidHandoffTransition,
  isDesignHandoffStatus,
  normalizeImplementedSurfaceKey
} from './state-machine'
import type {
  CreateDesignHandoffEntryInput,
  DesignHandoffEntry,
  DesignHandoffKind,
  DesignHandoffStatus,
  DesignHandoffTransitionResult,
  TransitionDesignHandoffEntryInput
} from './types'

type DesignHandoffEntryRow = {
  entry_id: string
  title: string
  kind: DesignHandoffKind
  file_key: string
  file_label: string | null
  node_id: string
  node_name: string | null
  status: DesignHandoffStatus
  implemented_surface_key: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

const VALID_KINDS = new Set<DesignHandoffKind>(['page', 'component'])

const normalizeTitle = ({ title, nodeName, nodeId }: { title?: string; nodeName?: string | null; nodeId: string }) => {
  const trimmed = title?.trim() || nodeName?.trim() || `Figma node ${nodeId}`

  if (!trimmed) {
    throw new DesignHandoffError('invalid_design_handoff_input', 'Design handoff title is required')
  }

  return trimmed.slice(0, 180)
}

const normalizeKind = (kind: DesignHandoffKind | undefined): DesignHandoffKind => {
  const next = kind ?? 'page'

  if (!VALID_KINDS.has(next)) {
    throw new DesignHandoffError('invalid_design_handoff_input', 'Invalid design handoff kind')
  }

  return next
}

const mapEntry = (row: DesignHandoffEntryRow): DesignHandoffEntry => ({
  entryId: row.entry_id,
  title: row.title,
  kind: row.kind,
  fileKey: row.file_key,
  fileLabel: row.file_label,
  nodeId: row.node_id,
  nodeName: row.node_name,
  status: row.status,
  implementedSurfaceKey: row.implemented_surface_key,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at
})

const ENTRY_SELECT = `
  SELECT e.entry_id, e.title, e.kind, e.file_key, f.file_label, e.node_id, e.node_name,
         e.status, e.implemented_surface_key, e.created_by, e.updated_by,
         e.created_at, e.updated_at, e.archived_at
    FROM greenhouse_core.design_handoff_entries e
    LEFT JOIN greenhouse_core.design_handoff_allowed_files f ON f.file_key = e.file_key
`

const insertEvent = async (
  client: PoolClient,
  {
    entry,
    eventType,
    fromStatus,
    actorUserId
  }: {
    entry: DesignHandoffEntry
    eventType: 'registered' | 'transitioned' | 'archived'
    fromStatus: DesignHandoffStatus | null
    actorUserId: string
  }
) => {
  await client.query(
    `INSERT INTO greenhouse_core.design_handoff_entry_events
       (event_id, entry_id, event_type, from_status, to_status, file_key, node_id,
        implemented_surface_key, actor_user_id, metadata_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb)`,
    [
      `dhe-evt-${randomUUID()}`,
      entry.entryId,
      eventType,
      fromStatus,
      entry.status,
      entry.fileKey,
      entry.nodeId,
      entry.implementedSurfaceKey,
      actorUserId
    ]
  )
}

const publishHandoffEvent = async (
  client: PoolClient,
  entry: DesignHandoffEntry,
  eventType: 'registered' | 'transitioned' | 'archived',
  actorUserId: string
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.designHandoffEntry,
      aggregateId: entry.entryId,
      eventType:
        eventType === 'registered'
          ? EVENT_TYPES.designHandoffRegistered
          : eventType === 'archived'
            ? EVENT_TYPES.designHandoffArchived
            : EVENT_TYPES.designHandoffTransitioned,
      payload: {
        entryId: entry.entryId,
        title: entry.title,
        kind: entry.kind,
        fileKey: entry.fileKey,
        nodeId: entry.nodeId,
        status: entry.status,
        implementedSurfaceKey: entry.implementedSurfaceKey,
        actorUserId
      }
    },
    client
  )
}

export const listDesignHandoffEntries = async (): Promise<DesignHandoffEntry[]> => {
  const rows = await runGreenhousePostgresQuery<DesignHandoffEntryRow>(
    `${ENTRY_SELECT}
      ORDER BY
        CASE e.status
          WHEN 'in_implementation' THEN 1
          WHEN 'proposed' THEN 2
          WHEN 'implemented' THEN 3
          ELSE 4
        END,
        e.updated_at DESC`
  )

  return rows.map(mapEntry)
}

export const getDesignHandoffEntry = async (entryId: string): Promise<DesignHandoffEntry | null> => {
  const rows = await runGreenhousePostgresQuery<DesignHandoffEntryRow>(
    `${ENTRY_SELECT}
      WHERE e.entry_id = $1
      LIMIT 1`,
    [entryId]
  )

  return rows[0] ? mapEntry(rows[0]) : null
}

export const createDesignHandoffEntry = async (input: CreateDesignHandoffEntryInput): Promise<DesignHandoffEntry> => {
  const parsed = parseFigmaUrl(input.url)

  if (!parsed) {
    throw new DesignHandoffError('invalid_figma_url', 'No parece un enlace de nodo Figma')
  }

  if (parsed.fileKey === AXIS_FILE_KEY) {
    throw new DesignHandoffError('figma_file_not_allowed', 'AXIS belongs to the design-system node linker')
  }

  const allowedFile = await getAllowedDesignHandoffFile(parsed.fileKey)

  if (!allowedFile) {
    throw new DesignHandoffError('figma_file_not_allowed', 'Product Figma file is not allowlisted')
  }

  const entryId = `dhe-${randomUUID()}`

  const title = normalizeTitle({
    title: input.title,
    nodeName: input.nodeName ?? parsed.fileName,
    nodeId: parsed.nodeId
  })

  const kind = normalizeKind(input.kind)
  const nodeName = input.nodeName?.trim() || parsed.fileName || null

  return withGreenhousePostgresTransaction(async client => {
    const rows = await client.query<DesignHandoffEntryRow>(
      `${ENTRY_SELECT}
        WHERE e.entry_id = $1
        LIMIT 1`,
      [entryId]
    )

    if (rows.rows[0]) return mapEntry(rows.rows[0])

    await client.query(
      `INSERT INTO greenhouse_core.design_handoff_entries
         (entry_id, title, kind, file_key, node_id, node_name, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'proposed', $7, $7)`,
      [entryId, title, kind, parsed.fileKey, parsed.nodeId, nodeName, input.actorUserId]
    )

    const createdRows = await client.query<DesignHandoffEntryRow>(
      `${ENTRY_SELECT}
        WHERE e.entry_id = $1
        LIMIT 1`,
      [entryId]
    )

    const entry = mapEntry(createdRows.rows[0]!)

    await insertEvent(client, { entry, eventType: 'registered', fromStatus: null, actorUserId: input.actorUserId })
    await publishHandoffEvent(client, entry, 'registered', input.actorUserId)

    return entry
  })
}

export const transitionDesignHandoffEntry = async (
  input: TransitionDesignHandoffEntryInput
): Promise<DesignHandoffTransitionResult> => {
  if (!isDesignHandoffStatus(input.toStatus)) {
    throw new DesignHandoffError('invalid_design_handoff_transition', 'Invalid status')
  }

  const implementedSurfaceKey = normalizeImplementedSurfaceKey(input.implementedSurfaceKey)

  return withGreenhousePostgresTransaction(async client => {
    const currentRows = await client.query<DesignHandoffEntryRow>(
      `${ENTRY_SELECT}
        WHERE e.entry_id = $1
        FOR UPDATE OF e`,
      [input.entryId]
    )

    const current = currentRows.rows[0] ? mapEntry(currentRows.rows[0]) : null

    if (!current) {
      throw new DesignHandoffError('design_handoff_not_found', 'Design handoff not found')
    }

    assertValidHandoffTransition({
      fromStatus: current.status,
      toStatus: input.toStatus,
      implementedSurfaceKey
    })

    await client.query(
      `UPDATE greenhouse_core.design_handoff_entries
          SET status = $2,
              implemented_surface_key = COALESCE($3, implemented_surface_key),
              updated_by = $4
        WHERE entry_id = $1`,
      [input.entryId, input.toStatus, implementedSurfaceKey, input.actorUserId]
    )

    const updatedRows = await client.query<DesignHandoffEntryRow>(
      `${ENTRY_SELECT}
        WHERE e.entry_id = $1
        LIMIT 1`,
      [input.entryId]
    )

    const entry = mapEntry(updatedRows.rows[0]!)
    const eventType = input.toStatus === 'archived' ? 'archived' : 'transitioned'

    await insertEvent(client, {
      entry,
      eventType,
      fromStatus: current.status,
      actorUserId: input.actorUserId
    })
    await publishHandoffEvent(client, entry, eventType, input.actorUserId)

    return { entry, fromStatus: current.status, eventType }
  })
}
