export interface DeliveryProjectSeedSource {
  spaceId: string
  clientId: string | null
  projectSourceId: string
  projectName: string
  projectStatus: string | null
  startDate: string | null
  endDate: string | null
}

export interface CampaignSeedCandidate {
  spaceId: string
  clientId: string | null
  displayName: string
  campaignType: 'campaign' | 'launch'
  status: 'active' | 'completed'
  plannedStartDate: string | null
  plannedEndDate: string | null
  projectSourceIds: string[]
  sourceProjectNames: string[]
  strategy: 'auto-cluster' | 'manual-seed'
}

const GENERIC_PREFIXES = new Set(['', 'nuevo proyecto', 'sin nombre', 'proyecto'])
const ACTIVE_STATUSES = new Set(['en curso', 'trabajo acumulado', 'backlog', 'planificacion', 'planificación'])

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const toDateOnly = (value: string | null) => (value ? value.slice(0, 10) : null)

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')

export const deriveSeedPrefix = (projectName: string): string | null => {
  const normalized = normalizeText(projectName)

  if (!normalized) return null

  const firstSegment = normalized.split(/\s*-\s*/)[0]?.trim() || normalized
  const collapsed = firstSegment.replace(
    /\b(q[1-4]|h[12]|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|\d{4})\b.*$/i,
    ''
  ).trim()
  const prefix = collapsed || firstSegment

  if (GENERIC_PREFIXES.has(prefix)) {
    return null
  }

  return prefix
}

export const buildAutoCampaignSeedCandidates = (
  projects: DeliveryProjectSeedSource[],
  minProjectsPerCampaign = 2
): CampaignSeedCandidate[] => {
  const grouped = new Map<string, DeliveryProjectSeedSource[]>()

  for (const project of projects) {
    const prefix = deriveSeedPrefix(project.projectName)

    if (!prefix) continue

    const groupKey = `${project.spaceId}::${prefix}`
    const bucket = grouped.get(groupKey) || []

    bucket.push(project)
    grouped.set(groupKey, bucket)
  }

  const candidates: CampaignSeedCandidate[] = []

  for (const [groupKey, bucket] of grouped.entries()) {
    if (bucket.length < minProjectsPerCampaign) {
      continue
    }

    const [spaceId, prefix] = groupKey.split('::')
    const startDates = bucket.map(project => toDateOnly(project.startDate)).filter(Boolean) as string[]
    const endDates = bucket.map(project => toDateOnly(project.endDate)).filter(Boolean) as string[]
    const hasActiveProject = bucket.some(project =>
      project.projectStatus ? ACTIVE_STATUSES.has(normalizeText(project.projectStatus)) : false
    )

    candidates.push({
      spaceId,
      clientId: bucket[0]?.clientId || null,
      displayName: toTitleCase(prefix),
      campaignType: 'campaign',
      status: hasActiveProject ? 'active' : 'completed',
      plannedStartDate: startDates.length > 0 ? startDates.sort()[0] : null,
      plannedEndDate: endDates.length > 0 ? endDates.sort().at(-1) || null : null,
      projectSourceIds: bucket.map(project => project.projectSourceId),
      sourceProjectNames: bucket.map(project => project.projectName).sort(),
      strategy: 'auto-cluster'
    })
  }

  return candidates.sort((left, right) => right.projectSourceIds.length - left.projectSourceIds.length)
}
