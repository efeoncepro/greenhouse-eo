import 'server-only'

import { getDb } from '@/lib/db'

import type { AiSignalRecord } from './types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResolvedSignalContext {
  spaces: Map<string, string>
  members: Map<string, string>
  projects: Map<string, string>
}

// ─── Batch Resolution ───────────────────────────────────────────────────────

export const resolveSignalContext = async (
  signals: AiSignalRecord[]
): Promise<ResolvedSignalContext> => {
  const spaceIds = [...new Set(signals.map(s => s.spaceId))]
  const memberIds = [...new Set(signals.map(s => s.memberId).filter((id): id is string => id !== null))]
  const projectIds = [...new Set(signals.map(s => s.projectId).filter((id): id is string => id !== null))]

  const [spaces, members, projects] = await Promise.all([
    resolveSpaces(spaceIds),
    resolveMembers(memberIds),
    resolveProjects(projectIds)
  ])

  return { spaces, members, projects }
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

const resolveProjects = async (projectIds: string[]): Promise<Map<string, string>> => {
  if (projectIds.length === 0) return new Map()

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_delivery.projects')
    .select(['project_record_id', 'project_name'])
    .where('project_record_id', 'in', projectIds)
    .where('active', '=', true)
    .where('is_deleted', '=', false)
    .execute()

  return new Map(rows.map(r => [r.project_record_id, r.project_name]))
}
