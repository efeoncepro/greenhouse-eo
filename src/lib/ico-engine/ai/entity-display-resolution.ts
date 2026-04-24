import 'server-only'

import { getDb } from '@/lib/db'

export type ProjectMatchSource = 'project_record_id' | 'notion_project_id'

export interface ResolveProjectDisplayInput {
  entityId: string
  spaceId: string
}

export interface ResolvedProjectDisplay {
  entityId: string
  displayLabel: string
  matchedBy: ProjectMatchSource
  spaceId: string
  canonicalProjectId: string
  sourceProjectId: string
  aliases: string[]
}

const PROJECT_SCOPED_KEY_SEPARATOR = '::'
const PROJECT_ID_MENTION_PATTERN = /@\[((?:[^\]\\]|\\.)+)\]\((member|space|project):([^)]+)\)/g
const TECHNICAL_ID_PREFIXES = ['project-', 'proj-', 'notion-', 'task-', 'sprint-'] as const

// Lista canónica de placeholders que NO deben aparecer como nombre humano.
// Sincronizada con el CHECK constraint de greenhouse_delivery.{projects,tasks,
// sprints} (migration 20260424082917533_project-title-nullable-sentinel-cleanup).
// Sentinels históricos en BQ ai_signals pueden contener estos strings — el
// sanitizer los rechaza para que la UI no los muestre aunque estén persistidos.
export const PROJECT_DISPLAY_SENTINELS = new Set<string>([
  'sin nombre',
  'sin título',
  'sin titulo',
  'untitled',
  'no title',
  'sem nome',
  'n/a'
])

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeText = (value: string | null | undefined) => value?.trim() ?? ''

const uniqueValues = (values: Array<string | null | undefined>) =>
  [...new Set(values.map(normalizeText).filter(Boolean))]

export const buildScopedEntityKey = (spaceId: string, entityId: string) => `${spaceId}${PROJECT_SCOPED_KEY_SEPARATOR}${entityId}`

export const isTechnicalProjectIdentifier = (value: string | null | undefined) => {
  const normalized = normalizeText(value)

  if (!normalized) return false

  const normalizedLower = normalized.toLowerCase()

  if (TECHNICAL_ID_PREFIXES.some(prefix => normalizedLower.startsWith(prefix))) {
    return true
  }

  if (/^[0-9a-f]{32}$/i.test(normalized)) {
    return true
  }

  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(normalized)) {
    return true
  }

  // Numéricos largos (IDs HubSpot, IDs de integraciones legacy).
  if (/^\d{12,}$/.test(normalized)) {
    return true
  }

  return false
}

export const isProjectDisplaySentinel = (value: string | null | undefined) => {
  const normalized = normalizeText(value)

  if (!normalized) return false

  return PROJECT_DISPLAY_SENTINELS.has(normalized.toLowerCase())
}

const sanitizeProjectDisplayLabel = (value: string | null | undefined) => {
  const normalized = normalizeText(value)

  if (!normalized) return null
  if (isTechnicalProjectIdentifier(normalized)) return null
  if (isProjectDisplaySentinel(normalized)) return null

  return normalized
}

export const resolveProjectDisplayBatch = async (
  inputs: ResolveProjectDisplayInput[]
): Promise<Map<string, ResolvedProjectDisplay>> => {
  const normalizedInputs = inputs
    .map(input => ({
      entityId: normalizeText(input.entityId),
      spaceId: normalizeText(input.spaceId)
    }))
    .filter((input): input is ResolveProjectDisplayInput => Boolean(input.entityId) && Boolean(input.spaceId))

  if (normalizedInputs.length === 0) {
    return new Map()
  }

  const entityIds = [...new Set(normalizedInputs.map(input => input.entityId))]
  const spaceIds = [...new Set(normalizedInputs.map(input => input.spaceId))]
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_delivery.projects')
    .select(['project_record_id', 'notion_project_id', 'project_name', 'space_id'])
    .where('space_id', 'in', spaceIds)
    .where('active', '=', true)
    .where('is_deleted', '=', false)
    .where(({ eb, or }) =>
      or([
        eb('project_record_id', 'in', entityIds),
        eb('notion_project_id', 'in', entityIds)
      ])
    )
    .execute()

  const resolutions = new Map<string, ResolvedProjectDisplay>()

  for (const row of rows) {
    const aliases = uniqueValues([row.project_record_id, row.notion_project_id])
    const displayLabel = sanitizeProjectDisplayLabel(row.project_name)

    if (!displayLabel) {
      continue
    }

    for (const alias of aliases) {
      resolutions.set(buildScopedEntityKey(row.space_id ?? '', alias), {
        entityId: alias,
        displayLabel,
        matchedBy: alias === row.project_record_id ? 'project_record_id' : 'notion_project_id',
        spaceId: row.space_id ?? '',
        canonicalProjectId: row.project_record_id,
        sourceProjectId: row.notion_project_id,
        aliases
      })
    }
  }

  return resolutions
}

export const getResolvedProjectDisplay = (
  resolutions: Map<string, ResolvedProjectDisplay>,
  spaceId: string,
  entityId: string | null | undefined
) => {
  const normalizedEntityId = normalizeText(entityId)

  if (!normalizedEntityId) {
    return null
  }

  return resolutions.get(buildScopedEntityKey(spaceId, normalizedEntityId)) ?? null
}

const sanitizePlainProjectText = (
  segment: string,
  aliases: string[],
  replacementLabel: string
) => {
  if (!segment || aliases.length === 0) {
    return segment
  }

  let next = segment

  for (const alias of aliases) {
    const pattern = new RegExp(`\\b(?:proyecto|project)\\s+${escapeRegex(alias)}\\b`, 'gi')

    next = next.replace(pattern, replacementLabel)
  }

  for (const alias of aliases) {
    if (!isTechnicalProjectIdentifier(alias)) {
      continue
    }

    next = next.replace(new RegExp(`\\b${escapeRegex(alias)}\\b`, 'g'), replacementLabel)
  }

  return next
    .replace(/\b(?:proyecto|project)\s+este proyecto\b/gi, 'este proyecto')
    .replace(/\b(?:el|este|this)\s+este proyecto\b/gi, 'este proyecto')
}

export const sanitizeProjectNarrative = ({
  text,
  signalProjectId,
  spaceId,
  projectResolutions,
  unresolvedFallback = 'este proyecto'
}: {
  text: string | null
  signalProjectId: string | null
  spaceId: string
  projectResolutions: Map<string, ResolvedProjectDisplay>
  unresolvedFallback?: string
}) => {
  if (!text) {
    return text
  }

  const resolvedProject = signalProjectId
    ? getResolvedProjectDisplay(projectResolutions, spaceId, signalProjectId)
    : null

  const replacementLabel = resolvedProject?.displayLabel ?? unresolvedFallback

  const aliases = uniqueValues([
    signalProjectId,
    resolvedProject?.canonicalProjectId,
    resolvedProject?.sourceProjectId,
    ...(resolvedProject?.aliases ?? [])
  ])

  let cursor = 0
  let output = ''

  for (const match of text.matchAll(PROJECT_ID_MENTION_PATTERN)) {
    const index = match.index ?? 0

    if (index > cursor) {
      output += sanitizePlainProjectText(text.slice(cursor, index), aliases, replacementLabel)
    }

    const type = match[2]
    const id = normalizeText(match[3])

    if (type === 'project' && aliases.includes(id)) {
      output += resolvedProject
        ? `@[${replacementLabel}](project:${id})`
        : unresolvedFallback
    } else {
      output += match[0]
    }

    cursor = index + match[0].length
  }

  if (cursor < text.length) {
    output += sanitizePlainProjectText(text.slice(cursor), aliases, replacementLabel)
  }

  return output.replace(/\s{2,}/g, ' ').trim()
}
