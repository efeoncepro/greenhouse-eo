import { createHash, randomUUID } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'

export const DATAFORSEO_RESEARCH_CHECKPOINT_VERSION = 1

export type DataForSeoResearchCheckpointStep = {
  key: string
  endpoint: string
  requestFingerprint: string
  completedAt: string
  expiresAt: string | null
  costUsd: number
  cursor: {
    offset?: number
    offsetToken?: string
    searchAfterToken?: string
  } | null
  taskIds: string[]
  tasks: unknown[]
}

export type DataForSeoResearchCheckpoint = {
  version: typeof DATAFORSEO_RESEARCH_CHECKPOINT_VERSION
  runId: string
  kind: 'keyword-research' | 'ai-research'
  planFingerprint: string
  organizationId: string
  createdAt: string
  updatedAt: string
  actualCostUsd: number
  stoppedReason: string | null
  steps: Record<string, DataForSeoResearchCheckpointStep>
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)])
    )
  }

  return value
}

export const fingerprintDataForSeoResearch = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex')

export const evaluateDataForSeoResearchBudget = (input: {
  actualCostUsd: number
  nextEstimatedCostUsd: number
  maxUsd: number
}) => {
  const projectedCostUsd = Number((input.actualCostUsd + input.nextEstimatedCostUsd).toFixed(6))
  const remainingUsd = Number(Math.max(0, input.maxUsd - input.actualCostUsd).toFixed(6))

  return {
    allowed: projectedCostUsd <= input.maxUsd,
    projectedCostUsd,
    remainingUsd
  }
}

export const createDataForSeoResearchCheckpoint = (input: {
  kind: DataForSeoResearchCheckpoint['kind']
  plan: unknown
  organizationId: string
  now?: Date
}): DataForSeoResearchCheckpoint => {
  const timestamp = (input.now ?? new Date()).toISOString()

  return {
    version: DATAFORSEO_RESEARCH_CHECKPOINT_VERSION,
    runId: randomUUID(),
    kind: input.kind,
    planFingerprint: fingerprintDataForSeoResearch(input.plan),
    organizationId: input.organizationId,
    createdAt: timestamp,
    updatedAt: timestamp,
    actualCostUsd: 0,
    stoppedReason: null,
    steps: {}
  }
}

const isCheckpoint = (value: unknown): value is DataForSeoResearchCheckpoint => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const row = value as Partial<DataForSeoResearchCheckpoint>

  return (
    row.version === DATAFORSEO_RESEARCH_CHECKPOINT_VERSION &&
    typeof row.runId === 'string' &&
    (row.kind === 'keyword-research' || row.kind === 'ai-research') &&
    typeof row.planFingerprint === 'string' &&
    typeof row.organizationId === 'string' &&
    typeof row.actualCostUsd === 'number' &&
    Boolean(row.steps && typeof row.steps === 'object' && !Array.isArray(row.steps))
  )
}

export const loadDataForSeoResearchCheckpoint = async (input: {
  path: string
  kind: DataForSeoResearchCheckpoint['kind']
  plan: unknown
  organizationId: string
}) => {
  const parsed = JSON.parse(await readFile(input.path, 'utf8')) as unknown

  if (!isCheckpoint(parsed)) throw new Error('El checkpoint DataForSEO tiene un formato o versión inválida.')
  if (parsed.kind !== input.kind) throw new Error(`El checkpoint pertenece a ${parsed.kind}, no a ${input.kind}.`)

  if (parsed.organizationId !== input.organizationId) {
    throw new Error('El checkpoint pertenece a otra organización; no se puede reutilizar entre tenants.')
  }

  if (parsed.planFingerprint !== fingerprintDataForSeoResearch(input.plan)) {
    throw new Error('El checkpoint no coincide con el plan actual; cambia --resume o restaura los mismos inputs.')
  }

  return parsed
}

export const writeDataForSeoResearchCheckpoint = async (
  path: string,
  checkpoint: DataForSeoResearchCheckpoint,
  now = new Date()
) => {
  const next = { ...checkpoint, updatedAt: now.toISOString() }
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`

  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  await rename(temporaryPath, path)

  return next
}

export const isReusableDataForSeoCheckpointStep = (
  step: DataForSeoResearchCheckpointStep | undefined,
  request: unknown,
  now = new Date()
) => {
  if (!step || step.requestFingerprint !== fingerprintDataForSeoResearch(request)) return false
  if (!step.expiresAt) return true

  return Date.parse(step.expiresAt) > now.getTime()
}

export const recordDataForSeoCheckpointStep = (
  checkpoint: DataForSeoResearchCheckpoint,
  input: Omit<DataForSeoResearchCheckpointStep, 'requestFingerprint'> & { request: unknown }
) => ({
  ...checkpoint,
  actualCostUsd: Number((checkpoint.actualCostUsd + input.costUsd).toFixed(6)),
  stoppedReason: null,
  steps: {
    ...checkpoint.steps,
    [input.key]: {
      key: input.key,
      endpoint: input.endpoint,
      requestFingerprint: fingerprintDataForSeoResearch(input.request),
      completedAt: input.completedAt,
      expiresAt: input.expiresAt,
      costUsd: input.costUsd,
      cursor: input.cursor,
      taskIds: input.taskIds,
      tasks: input.tasks
    }
  }
})

export const stopDataForSeoResearchCheckpoint = (checkpoint: DataForSeoResearchCheckpoint, stoppedReason: string) => ({
  ...checkpoint,
  stoppedReason
})
