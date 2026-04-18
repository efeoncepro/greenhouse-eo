import 'server-only'

import { getDb } from '@/lib/db'

import type { AiSignalRecord } from './types'
import {
  getResolvedProjectDisplay,
  resolveProjectDisplayBatch,
  type ResolvedProjectDisplay
} from './entity-display-resolution'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResolvedSignalContext {
  spaces: Map<string, string>
  members: Map<string, string>
  projectResolutions: Map<string, ResolvedProjectDisplay>
}

// ─── Batch Resolution ───────────────────────────────────────────────────────

export const resolveSignalContext = async (
  signals: AiSignalRecord[]
): Promise<ResolvedSignalContext> => {
  const spaceIds = [...new Set(signals.map(s => s.spaceId))]
  const memberIds = [...new Set(signals.map(s => s.memberId).filter((id): id is string => id !== null))]

  const projectInputs = signals
    .filter((signal): signal is AiSignalRecord & { projectId: string } => Boolean(signal.projectId))
    .map(signal => ({
      entityId: signal.projectId,
      spaceId: signal.spaceId
    }))

  const [spaces, members, projectResolutions] = await Promise.all([
    resolveSpaces(spaceIds),
    resolveMembers(memberIds),
    resolveProjectDisplayBatch(projectInputs)
  ])

  return { spaces, members, projectResolutions }
}

const resolveSpaces = async (spaceIds: string[]): Promise<Map<string, string>> => {
  if (spaceIds.length === 0) return new Map()

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.spaces')
    .select(['space_id', 'space_name'])
    .where('space_id', 'in', spaceIds)
    .where('active', '=', true)
    .execute()

  return new Map(rows.map(r => [r.space_id, r.space_name]))
}

const resolveMembers = async (memberIds: string[]): Promise<Map<string, string>> => {
  if (memberIds.length === 0) return new Map()

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.members')
    .select(['member_id', 'display_name'])
    .where('member_id', 'in', memberIds)
    .where('active', '=', true)
    .execute()

  return new Map(rows.map(r => [r.member_id, r.display_name]))
}

export const getResolvedProjectLabel = (
  context: ResolvedSignalContext | null | undefined,
  spaceId: string,
  projectId: string | null | undefined
) => {
  if (!context || !projectId) {
    return null
  }

  return getResolvedProjectDisplay(context.projectResolutions, spaceId, projectId)?.displayLabel ?? null
}
