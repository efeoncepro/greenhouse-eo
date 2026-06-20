import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { getFigmaNodeRender } from '@/lib/design-system/figma-nodes/figma-render'
import { AXIS_FILE_KEY } from '@/lib/design-system/figma-nodes/axis-file'
import { parseFigmaUrl } from '@/lib/design-system/figma-nodes/parse-figma-url'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { getAllowedDesignHandoffFile } from './allowlist'
import {
  DesignHandoffError,
  assertValidHandoffTransition,
  isDesignHandoffStatus,
  normalizeDesignHandoffAllowedFileInput,
  normalizeDesignHandoffEvidenceInput,
  normalizeDesignHandoffLinkInput,
  normalizeDesignHandoffPlanningFields,
  normalizeImplementedSurfaceKey
} from './state-machine'
import type {
  AssignDesignHandoffOwnerInput,
  AttachDesignHandoffEvidenceInput,
  CreateDesignHandoffEntryInput,
  DeprecateDesignHandoffAllowedFileInput,
  DesignHandoffAllowedFile,
  DesignHandoffAllowedFileInput,
  DesignHandoffEntry,
  DesignHandoffEntryEvidence,
  DesignHandoffEntryLink,
  DesignHandoffKind,
  DesignHandoffNodeSnapshot,
  DesignHandoffNodeSnapshotStatus,
  DesignHandoffPriority,
  DesignHandoffStatus,
  DesignHandoffTransitionResult,
  LinkDesignHandoffWorkItemInput,
  SetDesignHandoffPlanningFieldsInput,
  TransitionDesignHandoffEntryInput,
  VerifyDesignHandoffFigmaNodeInput
} from './types'

type JsonRecord = Record<string, unknown>

type DesignHandoffEntryRow = {
  entry_id: string
  title: string
  kind: DesignHandoffKind
  file_key: string
  file_label: string | null
  node_id: string
  node_name: string | null
  status: DesignHandoffStatus
  designer_owner_member_id: string | null
  dev_owner_member_id: string | null
  priority: DesignHandoffPriority | null
  target_surface_key: string | null
  due_at: string | null
  blocked_reason: string | null
  implemented_surface_key: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

type AllowedFileRow = {
  file_key: string
  file_label: string
  added_by: string
  added_at: string
  superseded_at: string | null
}

type LinkRow = {
  link_id: string
  entry_id: string
  link_type: DesignHandoffEntryLink['linkType']
  label: string | null
  ref: string
  metadata_json: JsonRecord | null
  created_by: string
  created_at: string
}

type EvidenceRow = {
  evidence_id: string
  entry_id: string
  evidence_type: DesignHandoffEntryEvidence['evidenceType']
  label: string | null
  ref: string
  metadata_json: JsonRecord | null
  created_by: string
  created_at: string
}

type SnapshotRow = {
  snapshot_id: string
  entry_id: string
  file_key: string
  node_id: string
  expected_name: string | null
  observed_name: string | null
  node_status: DesignHandoffNodeSnapshotStatus
  render_url: string | null
  render_hash: string | null
  provider_checked_at: string
  metadata_json: JsonRecord | null
  created_by: string
  created_at: string
}

type LocalEventType =
  | 'registered'
  | 'transitioned'
  | 'archived'
  | 'owner_assigned'
  | 'planning_updated'
  | 'work_item_linked'
  | 'evidence_attached'
  | 'figma_node_verified'

const VALID_KINDS = new Set<DesignHandoffKind>(['page', 'component'])

const metadataRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}

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

const mapAllowedFile = (row: AllowedFileRow): DesignHandoffAllowedFile => ({
  fileKey: row.file_key,
  fileLabel: row.file_label,
  addedBy: row.added_by,
  addedAt: row.added_at,
  supersededAt: row.superseded_at
})

const mapEntry = (row: DesignHandoffEntryRow): DesignHandoffEntry => ({
  entryId: row.entry_id,
  title: row.title,
  kind: row.kind,
  fileKey: row.file_key,
  fileLabel: row.file_label,
  nodeId: row.node_id,
  nodeName: row.node_name,
  status: row.status,
  designerOwnerMemberId: row.designer_owner_member_id,
  devOwnerMemberId: row.dev_owner_member_id,
  priority: row.priority ?? 'normal',
  targetSurfaceKey: row.target_surface_key,
  dueAt: row.due_at,
  blockedReason: row.blocked_reason,
  implementedSurfaceKey: row.implemented_surface_key,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at
})

const mapLink = (row: LinkRow): DesignHandoffEntryLink => ({
  linkId: row.link_id,
  entryId: row.entry_id,
  linkType: row.link_type,
  label: row.label,
  ref: row.ref,
  metadata: metadataRecord(row.metadata_json),
  createdBy: row.created_by,
  createdAt: row.created_at
})

const mapEvidence = (row: EvidenceRow): DesignHandoffEntryEvidence => ({
  evidenceId: row.evidence_id,
  entryId: row.entry_id,
  evidenceType: row.evidence_type,
  label: row.label,
  ref: row.ref,
  metadata: metadataRecord(row.metadata_json),
  createdBy: row.created_by,
  createdAt: row.created_at
})

const mapSnapshot = (row: SnapshotRow): DesignHandoffNodeSnapshot => ({
  snapshotId: row.snapshot_id,
  entryId: row.entry_id,
  fileKey: row.file_key,
  nodeId: row.node_id,
  expectedName: row.expected_name,
  observedName: row.observed_name,
  nodeStatus: row.node_status,
  renderUrl: row.render_url,
  renderHash: row.render_hash,
  providerCheckedAt: row.provider_checked_at,
  metadata: metadataRecord(row.metadata_json),
  createdBy: row.created_by,
  createdAt: row.created_at
})

const ENTRY_SELECT = `
  SELECT e.entry_id, e.title, e.kind, e.file_key, f.file_label, e.node_id, e.node_name,
         e.status, e.designer_owner_member_id, e.dev_owner_member_id, e.priority,
         e.target_surface_key, e.due_at::text AS due_at, e.blocked_reason,
         e.implemented_surface_key, e.created_by, e.updated_by,
         e.created_at::text AS created_at, e.updated_at::text AS updated_at, e.archived_at::text AS archived_at
    FROM greenhouse_core.design_handoff_entries e
    LEFT JOIN greenhouse_core.design_handoff_allowed_files f ON f.file_key = e.file_key
`

const requireEntryForUpdate = async (client: PoolClient, entryId: string): Promise<DesignHandoffEntry> => {
  const rows = await client.query<DesignHandoffEntryRow>(
    `${ENTRY_SELECT}
      WHERE e.entry_id = $1
      FOR UPDATE OF e`,
    [entryId]
  )

  const entry = rows.rows[0] ? mapEntry(rows.rows[0]) : null

  if (!entry) {
    throw new DesignHandoffError('design_handoff_not_found', 'Design handoff not found')
  }

  return entry
}

const insertEvent = async (
  client: PoolClient,
  {
    entry,
    eventType,
    fromStatus,
    actorUserId,
    metadata = {}
  }: {
    entry: DesignHandoffEntry
    eventType: LocalEventType
    fromStatus: DesignHandoffStatus | null
    actorUserId: string
    metadata?: JsonRecord
  }
) => {
  await client.query(
    `INSERT INTO greenhouse_core.design_handoff_entry_events
       (event_id, entry_id, event_type, from_status, to_status, file_key, node_id,
        implemented_surface_key, actor_user_id, metadata_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      `dhe-evt-${randomUUID()}`,
      entry.entryId,
      eventType,
      fromStatus,
      entry.status,
      entry.fileKey,
      entry.nodeId,
      entry.implementedSurfaceKey,
      actorUserId,
      JSON.stringify(metadata)
    ]
  )
}

const publishEntryEvent = async (
  client: PoolClient,
  entry: DesignHandoffEntry,
  eventType: LocalEventType,
  actorUserId: string,
  metadata: JsonRecord = {}
) => {
  const outboxEventType =
    eventType === 'registered'
      ? EVENT_TYPES.designHandoffRegistered
      : eventType === 'archived'
        ? EVENT_TYPES.designHandoffArchived
        : eventType === 'transitioned'
          ? EVENT_TYPES.designHandoffTransitioned
          : eventType === 'owner_assigned'
            ? EVENT_TYPES.designHandoffOwnerAssigned
            : eventType === 'planning_updated'
              ? EVENT_TYPES.designHandoffPlanningUpdated
              : eventType === 'work_item_linked'
                ? EVENT_TYPES.designHandoffWorkItemLinked
                : eventType === 'evidence_attached'
                  ? EVENT_TYPES.designHandoffEvidenceAttached
                  : EVENT_TYPES.designHandoffFigmaNodeVerified

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.designHandoffEntry,
      aggregateId: entry.entryId,
      eventType: outboxEventType,
      payload: {
        schemaVersion: 1,
        entryId: entry.entryId,
        title: entry.title,
        kind: entry.kind,
        fileKey: entry.fileKey,
        nodeId: entry.nodeId,
        status: entry.status,
        implementedSurfaceKey: entry.implementedSurfaceKey,
        actorUserId,
        ...metadata
      }
    },
    client
  )
}

const persistDesignHandoffNodeSnapshot = async (
  client: PoolClient,
  {
    entry,
    render,
    actorUserId,
    metadata = {}
  }: {
    entry: DesignHandoffEntry
    render: Awaited<ReturnType<typeof getFigmaNodeRender>>
    actorUserId: string
    metadata?: JsonRecord
  }
): Promise<DesignHandoffNodeSnapshot> => {
  const nodeStatus: DesignHandoffNodeSnapshotStatus =
    render.status === 'unavailable'
      ? 'unavailable'
      : render.nodeName && entry.nodeName && render.nodeName !== entry.nodeName
        ? 'renamed'
        : 'reachable'

  const renderHash = createHash('sha256')
    .update(JSON.stringify({ imageUrl: render.imageUrl, nodeName: render.nodeName, status: render.status }))
    .digest('hex')

  const snapshotId = `dhns-${randomUUID()}`

  const rows = await client.query<SnapshotRow>(
    `INSERT INTO greenhouse_core.design_handoff_node_snapshots
       (snapshot_id, entry_id, file_key, node_id, expected_name, observed_name, node_status,
        render_url, render_hash, provider_checked_at, created_by, metadata_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11::jsonb)
     RETURNING snapshot_id, entry_id, file_key, node_id, expected_name, observed_name, node_status,
               render_url, render_hash, provider_checked_at::text AS provider_checked_at, metadata_json,
               created_by, created_at::text AS created_at`,
    [
      snapshotId,
      entry.entryId,
      entry.fileKey,
      entry.nodeId,
      entry.nodeName,
      render.nodeName,
      nodeStatus,
      render.imageUrl,
      renderHash,
      actorUserId,
      JSON.stringify({ source: 'figma_render', ...metadata })
    ]
  )

  const snapshot = mapSnapshot(rows.rows[0]!)

  await insertEvent(client, {
    entry,
    eventType: 'figma_node_verified',
    fromStatus: entry.status,
    actorUserId,
    metadata: { snapshotId: snapshot.snapshotId, nodeStatus: snapshot.nodeStatus, ...metadata }
  })
  await publishEntryEvent(client, entry, 'figma_node_verified', actorUserId, {
    snapshotId: snapshot.snapshotId,
    nodeStatus: snapshot.nodeStatus,
    ...metadata
  })

  return snapshot
}

const enrichEntries = async (entries: DesignHandoffEntry[]): Promise<DesignHandoffEntry[]> => {
  if (entries.length === 0) return entries

  const entryIds = entries.map(entry => entry.entryId)

  const [links, evidence, snapshots] = await Promise.all([
    runGreenhousePostgresQuery<LinkRow>(
      `SELECT link_id, entry_id, link_type, label, ref, metadata_json, created_by, created_at::text AS created_at
         FROM greenhouse_core.design_handoff_entry_links
        WHERE entry_id = ANY($1::text[])
        ORDER BY created_at DESC`,
      [entryIds]
    ),
    runGreenhousePostgresQuery<EvidenceRow>(
      `SELECT evidence_id, entry_id, evidence_type, label, ref, metadata_json, created_by, created_at::text AS created_at
         FROM greenhouse_core.design_handoff_entry_evidence
        WHERE entry_id = ANY($1::text[])
        ORDER BY created_at DESC`,
      [entryIds]
    ),
    runGreenhousePostgresQuery<SnapshotRow>(
      `SELECT DISTINCT ON (entry_id)
              snapshot_id, entry_id, file_key, node_id, expected_name, observed_name, node_status,
              render_url, render_hash, provider_checked_at::text AS provider_checked_at, metadata_json,
              created_by, created_at::text AS created_at
         FROM greenhouse_core.design_handoff_node_snapshots
        WHERE entry_id = ANY($1::text[])
        ORDER BY entry_id, provider_checked_at DESC`,
      [entryIds]
    )
  ])

  const linksByEntry = new Map<string, DesignHandoffEntryLink[]>()
  const evidenceByEntry = new Map<string, DesignHandoffEntryEvidence[]>()
  const snapshotsByEntry = new Map<string, DesignHandoffNodeSnapshot>()

  for (const row of links) {
    const list = linksByEntry.get(row.entry_id) ?? []

    list.push(mapLink(row))
    linksByEntry.set(row.entry_id, list)
  }

  for (const row of evidence) {
    const list = evidenceByEntry.get(row.entry_id) ?? []

    list.push(mapEvidence(row))
    evidenceByEntry.set(row.entry_id, list)
  }

  for (const row of snapshots) {
    snapshotsByEntry.set(row.entry_id, mapSnapshot(row))
  }

  return entries.map(entry => ({
    ...entry,
    links: linksByEntry.get(entry.entryId) ?? [],
    evidence: evidenceByEntry.get(entry.entryId) ?? [],
    latestNodeSnapshot: snapshotsByEntry.get(entry.entryId) ?? null
  }))
}

const getImplementationEvidenceSummary = async (client: PoolClient, entryId: string) => {
  const rows = await client.query<{ evidence_type: DesignHandoffEntryEvidence['evidenceType'] }>(
    `SELECT DISTINCT evidence_type
       FROM greenhouse_core.design_handoff_entry_evidence
      WHERE entry_id = $1`,
    [entryId]
  )

  return { evidenceTypes: rows.rows.map(row => row.evidence_type) }
}

export const listDesignHandoffEntries = async (): Promise<DesignHandoffEntry[]> => {
  const rows = await runGreenhousePostgresQuery<DesignHandoffEntryRow>(
    `${ENTRY_SELECT}
      ORDER BY
        CASE e.status
          WHEN 'in_implementation' THEN 1
          WHEN 'in_review' THEN 2
          WHEN 'proposed' THEN 3
          WHEN 'implemented' THEN 4
          ELSE 5
        END,
        e.updated_at DESC`
  )

  return enrichEntries(rows.map(mapEntry))
}

export const getDesignHandoffEntry = async (entryId: string): Promise<DesignHandoffEntry | null> => {
  const rows = await runGreenhousePostgresQuery<DesignHandoffEntryRow>(
    `${ENTRY_SELECT}
      WHERE e.entry_id = $1
      LIMIT 1`,
    [entryId]
  )

  if (!rows[0]) return null

  const [entry] = await enrichEntries([mapEntry(rows[0])])

  return entry ?? null
}

export const upsertDesignHandoffAllowedFile = async (
  input: DesignHandoffAllowedFileInput
): Promise<DesignHandoffAllowedFile> => {
  const normalized = normalizeDesignHandoffAllowedFileInput(input)

  if (normalized.fileKey === AXIS_FILE_KEY) {
    throw new DesignHandoffError('figma_file_not_allowed', 'AXIS belongs to the design-system node linker')
  }

  return withGreenhousePostgresTransaction(async client => {
    const rows = await client.query<AllowedFileRow>(
      `INSERT INTO greenhouse_core.design_handoff_allowed_files
         (file_key, file_label, added_by, added_at, superseded_at, metadata_json)
       VALUES ($1, $2, $3, NOW(), NULL, $4::jsonb)
       ON CONFLICT (file_key) DO UPDATE SET
         file_label = EXCLUDED.file_label,
         added_by = EXCLUDED.added_by,
         added_at = NOW(),
         superseded_at = NULL,
         metadata_json = EXCLUDED.metadata_json
       RETURNING file_key, file_label, added_by, added_at::text AS added_at, superseded_at::text AS superseded_at`,
      [normalized.fileKey, normalized.fileLabel, normalized.actorUserId, JSON.stringify(input.metadata ?? {})]
    )

    const file = mapAllowedFile(rows.rows[0]!)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.designHandoffAllowedFile,
        aggregateId: file.fileKey,
        eventType: EVENT_TYPES.designHandoffAllowedFileUpserted,
        payload: { schemaVersion: 1, fileKey: file.fileKey, fileLabel: file.fileLabel, actorUserId: input.actorUserId }
      },
      client
    )

    return file
  })
}

export const deprecateDesignHandoffAllowedFile = async (
  input: DeprecateDesignHandoffAllowedFileInput
): Promise<DesignHandoffAllowedFile> => {
  const fileKey = input.fileKey.trim()

  if (!fileKey) {
    throw new DesignHandoffError('invalid_allowed_file', 'Design handoff file key is required')
  }

  return withGreenhousePostgresTransaction(async client => {
    const rows = await client.query<AllowedFileRow>(
      `UPDATE greenhouse_core.design_handoff_allowed_files
          SET superseded_at = COALESCE(superseded_at, NOW())
        WHERE file_key = $1
        RETURNING file_key, file_label, added_by, added_at::text AS added_at, superseded_at::text AS superseded_at`,
      [fileKey]
    )

    if (!rows.rows[0]) {
      throw new DesignHandoffError('invalid_allowed_file', 'Design handoff allowed file not found')
    }

    const file = mapAllowedFile(rows.rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.designHandoffAllowedFile,
        aggregateId: file.fileKey,
        eventType: EVENT_TYPES.designHandoffAllowedFileDeprecated,
        payload: { schemaVersion: 1, fileKey: file.fileKey, actorUserId: input.actorUserId }
      },
      client
    )

    return file
  })
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

  const render = await getFigmaNodeRender({ fileKey: parsed.fileKey, nodeId: parsed.nodeId })
  const entryId = `dhe-${randomUUID()}`
  const resolvedNodeName = input.nodeName?.trim() || render.nodeName || parsed.fileName || null

  const title = normalizeTitle({
    title: input.title,
    nodeName: resolvedNodeName,
    nodeId: parsed.nodeId
  })

  const kind = normalizeKind(input.kind)

  return withGreenhousePostgresTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_core.design_handoff_entries
         (entry_id, title, kind, file_key, node_id, node_name, status, priority, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'proposed', 'normal', $7, $7)`,
      [entryId, title, kind, parsed.fileKey, parsed.nodeId, resolvedNodeName, input.actorUserId]
    )

    const entry = await requireEntryForUpdate(client, entryId)

    await insertEvent(client, { entry, eventType: 'registered', fromStatus: null, actorUserId: input.actorUserId })
    await publishEntryEvent(client, entry, 'registered', input.actorUserId)
    await persistDesignHandoffNodeSnapshot(client, {
      entry,
      render,
      actorUserId: input.actorUserId,
      metadata: { trigger: 'create' }
    })

    return entry
  })
}

export const assignDesignHandoffOwner = async (input: AssignDesignHandoffOwnerInput): Promise<DesignHandoffEntry> =>
  withGreenhousePostgresTransaction(async client => {
    const current = await requireEntryForUpdate(client, input.entryId)
    const memberId = input.memberId?.trim() || null
    const column = input.ownerKind === 'designer' ? 'designer_owner_member_id' : 'dev_owner_member_id'

    await client.query(
      `UPDATE greenhouse_core.design_handoff_entries
          SET ${column} = $2,
              updated_by = $3
        WHERE entry_id = $1`,
      [input.entryId, memberId, input.actorUserId]
    )

    const updated = await requireEntryForUpdate(client, input.entryId)

    await insertEvent(client, {
      entry: updated,
      eventType: 'owner_assigned',
      fromStatus: current.status,
      actorUserId: input.actorUserId,
      metadata: { ownerKind: input.ownerKind, memberId }
    })
    await publishEntryEvent(client, updated, 'owner_assigned', input.actorUserId, { ownerKind: input.ownerKind, memberId })

    return updated
  })

export const setDesignHandoffPlanningFields = async (
  input: SetDesignHandoffPlanningFieldsInput
): Promise<DesignHandoffEntry> =>
  withGreenhousePostgresTransaction(async client => {
    const current = await requireEntryForUpdate(client, input.entryId)

    const normalized = normalizeDesignHandoffPlanningFields({
      priority: input.priority ?? current.priority,
      targetSurfaceKey: input.targetSurfaceKey === undefined ? current.targetSurfaceKey : input.targetSurfaceKey,
      dueAt: input.dueAt === undefined ? current.dueAt : input.dueAt,
      blockedReason: input.blockedReason === undefined ? current.blockedReason : input.blockedReason
    })

    await client.query(
      `UPDATE greenhouse_core.design_handoff_entries
          SET priority = $2,
              target_surface_key = $3,
              due_at = $4,
              blocked_reason = $5,
              updated_by = $6
        WHERE entry_id = $1`,
      [
        input.entryId,
        normalized.priority,
        normalized.targetSurfaceKey,
        normalized.dueAt,
        normalized.blockedReason,
        input.actorUserId
      ]
    )

    const updated = await requireEntryForUpdate(client, input.entryId)

    await insertEvent(client, {
      entry: updated,
      eventType: 'planning_updated',
      fromStatus: current.status,
      actorUserId: input.actorUserId,
      metadata: { ...normalized }
    })
    await publishEntryEvent(client, updated, 'planning_updated', input.actorUserId, { ...normalized })

    return updated
  })

export const linkDesignHandoffWorkItem = async (
  input: LinkDesignHandoffWorkItemInput
): Promise<DesignHandoffEntryLink> =>
  withGreenhousePostgresTransaction(async client => {
    const entry = await requireEntryForUpdate(client, input.entryId)
    const normalized = normalizeDesignHandoffLinkInput(input)
    const linkId = `dhl-${randomUUID()}`

    const rows = await client.query<LinkRow>(
      `INSERT INTO greenhouse_core.design_handoff_entry_links
         (link_id, entry_id, link_type, label, ref, created_by, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (entry_id, link_type, ref) DO NOTHING
       RETURNING link_id, entry_id, link_type, label, ref, metadata_json, created_by, created_at::text AS created_at`,
      [
        linkId,
        input.entryId,
        normalized.linkType,
        normalized.label,
        normalized.ref,
        input.actorUserId,
        JSON.stringify(normalized.metadata)
      ]
    )

    const row =
      rows.rows[0] ??
      (
        await client.query<LinkRow>(
          `SELECT link_id, entry_id, link_type, label, ref, metadata_json, created_by, created_at::text AS created_at
             FROM greenhouse_core.design_handoff_entry_links
            WHERE entry_id = $1 AND link_type = $2 AND ref = $3
            LIMIT 1`,
          [input.entryId, normalized.linkType, normalized.ref]
        )
      ).rows[0]

    const link = mapLink(row!)

    await insertEvent(client, {
      entry,
      eventType: 'work_item_linked',
      fromStatus: entry.status,
      actorUserId: input.actorUserId,
      metadata: { linkId: link.linkId, linkType: link.linkType, ref: link.ref }
    })
    await publishEntryEvent(client, entry, 'work_item_linked', input.actorUserId, {
      linkId: link.linkId,
      linkType: link.linkType,
      ref: link.ref
    })

    return link
  })

export const attachDesignHandoffEvidence = async (
  input: AttachDesignHandoffEvidenceInput
): Promise<DesignHandoffEntryEvidence> =>
  withGreenhousePostgresTransaction(async client => {
    const entry = await requireEntryForUpdate(client, input.entryId)
    const normalized = normalizeDesignHandoffEvidenceInput(input)
    const evidenceId = `dhev-${randomUUID()}`

    const rows = await client.query<EvidenceRow>(
      `INSERT INTO greenhouse_core.design_handoff_entry_evidence
         (evidence_id, entry_id, evidence_type, label, ref, created_by, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (entry_id, evidence_type, ref) DO NOTHING
       RETURNING evidence_id, entry_id, evidence_type, label, ref, metadata_json, created_by, created_at::text AS created_at`,
      [
        evidenceId,
        input.entryId,
        normalized.evidenceType,
        normalized.label,
        normalized.ref,
        input.actorUserId,
        JSON.stringify(normalized.metadata)
      ]
    )

    const row =
      rows.rows[0] ??
      (
        await client.query<EvidenceRow>(
          `SELECT evidence_id, entry_id, evidence_type, label, ref, metadata_json, created_by, created_at::text AS created_at
             FROM greenhouse_core.design_handoff_entry_evidence
            WHERE entry_id = $1 AND evidence_type = $2 AND ref = $3
            LIMIT 1`,
          [input.entryId, normalized.evidenceType, normalized.ref]
        )
      ).rows[0]

    const evidence = mapEvidence(row!)

    await insertEvent(client, {
      entry,
      eventType: 'evidence_attached',
      fromStatus: entry.status,
      actorUserId: input.actorUserId,
      metadata: { evidenceId: evidence.evidenceId, evidenceType: evidence.evidenceType, ref: evidence.ref }
    })
    await publishEntryEvent(client, entry, 'evidence_attached', input.actorUserId, {
      evidenceId: evidence.evidenceId,
      evidenceType: evidence.evidenceType,
      ref: evidence.ref
    })

    return evidence
  })

export const verifyDesignHandoffFigmaNode = async (
  input: VerifyDesignHandoffFigmaNodeInput
): Promise<DesignHandoffNodeSnapshot> => {
  const entry = await getDesignHandoffEntry(input.entryId)

  if (!entry) {
    throw new DesignHandoffError('design_handoff_not_found', 'Design handoff not found')
  }

  const render = await getFigmaNodeRender({ fileKey: entry.fileKey, nodeId: entry.nodeId })

  return withGreenhousePostgresTransaction(async client => {
    const current = await requireEntryForUpdate(client, input.entryId)

    return persistDesignHandoffNodeSnapshot(client, { entry: current, render, actorUserId: input.actorUserId })
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
    const current = await requireEntryForUpdate(client, input.entryId)
    const effectiveImplementedSurfaceKey = implementedSurfaceKey ?? current.implementedSurfaceKey

    const evidenceSummary =
      input.evidenceSummary ?? (input.toStatus === 'implemented' ? await getImplementationEvidenceSummary(client, input.entryId) : null)

    assertValidHandoffTransition({
      fromStatus: current.status,
      toStatus: input.toStatus,
      implementedSurfaceKey: effectiveImplementedSurfaceKey,
      evidenceSummary
    })

    await client.query(
      `UPDATE greenhouse_core.design_handoff_entries
          SET status = $2,
              implemented_surface_key = COALESCE($3, implemented_surface_key),
              updated_by = $4
        WHERE entry_id = $1`,
      [input.entryId, input.toStatus, implementedSurfaceKey, input.actorUserId]
    )

    const entry = await requireEntryForUpdate(client, input.entryId)
    const eventType = input.toStatus === 'archived' ? 'archived' : 'transitioned'

    await insertEvent(client, {
      entry,
      eventType,
      fromStatus: current.status,
      actorUserId: input.actorUserId
    })
    await publishEntryEvent(client, entry, eventType, input.actorUserId, { fromStatus: current.status })

    return { entry, fromStatus: current.status, eventType }
  })
}
