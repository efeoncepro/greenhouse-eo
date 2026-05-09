'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_AGENCY } from '@/lib/copy/agency'
import type {
  SampleSprintProjectionDegradedReason,
  SampleSprintRuntimeItem,
  SampleSprintRuntimeProjection,
  SampleSprintRuntimeSignal
} from '@/lib/commercial/sample-sprints/runtime-projection-types'

import SampleSprintsMockupView, {
  type RuntimeSampleSprintOptions,
  type Signal,
  type Sprint,
  type SprintKind,
  type SprintStatus,
  type TeamMember
} from './SampleSprintsExperienceView'

type WorkspaceMode = 'list' | 'declare' | 'detail' | 'approve' | 'progress' | 'outcome'

type EngagementKind = 'pilot' | 'trial' | 'poc' | 'discovery'

type SampleSprintItem = {
  serviceId: string
  publicId: string | null
  name: string
  engagementKind: EngagementKind
  status: string
  pipelineStage: string
  spaceId: string
  spaceName: string
  clientName: string | null
  organizationName: string | null
  startDate: string | null
  targetEndDate: string | null
  expectedInternalCostClp: number
  decisionDeadline: string | null
  approvalStatus: string | null
  latestSnapshotDate: string | null
  outcomeKind: string | null
  createdAt: string | null
}

type SampleSprintDetail = SampleSprintItem & {
  successCriteria: Record<string, unknown>
  proposedTeam: Array<{ memberId: string; proposedFte: number; role?: string | null }>
  approval: {
    approvalId: string
    status: string
    capacityWarning: { hasWarning: boolean } | null
  } | null
  latestSnapshots: Array<{
    snapshotId: string
    snapshotDate: string
    metrics: Record<string, unknown>
    qualitativeNotes: string | null
  }>
  outcome: { outcomeId: string; outcomeKind: string; decisionDate: string } | null
  auditEvents: Array<{
    auditId: string
    eventKind: string
    reason: string | null
    createdAt: string | null
  }>
}

type Options = {
  spaces: Array<{
    spaceId: string
    spaceName: string
    // TASK-837 follow-up — clientId required para resolver company del Deal
    // vía crm.companies.client_id. Source of truth: store.SampleSprintOptions.
    clientId: string | null
    clientName: string | null
    organizationId: string | null
    organizationName: string | null
  }>
  members: Array<{
    memberId: string
    displayName: string
    roleTitle: string | null
  }>
  conversionTargets: Array<{
    serviceId: string
    publicId: string | null
    name: string
    spaceName: string | null
  }>
  quotations: Array<{
    quotationId: string
    quotationNumber: string
    clientName: string | null
    status: string
    totalAmountClp: number | null
  }>
}

type Props = {
  mode: WorkspaceMode
  serviceId?: string
}

const ENGAGEMENT_KIND_LABEL: Record<EngagementKind, string> = {
  pilot: 'Operations Sprint',
  trial: 'Extension Sprint',
  poc: 'Validation Sprint',
  discovery: 'Discovery Sprint'
}

const getClientLabel = (item: SampleSprintItem) => item.organizationName || item.clientName || item.spaceName || 'Cliente sin nombre'

const getSprintStatus = (item: SampleSprintItem): SprintStatus => {
  if (item.outcomeKind === 'converted') return 'converted'
  if (['cancelled', 'cancelled_by_client', 'cancelled_by_provider'].includes(item.outcomeKind ?? '')) return 'cancelled'
  if (item.outcomeKind === 'dropped') return 'dropped'
  if (item.status === 'pending_approval') return 'pending_approval'
  if (item.status === 'active' && item.latestSnapshotDate) return 'reporting'
  if (item.status === 'active') return 'active'
  if (item.status === 'converted') return 'converted'
  if (item.status === 'cancelled') return 'cancelled'

  return 'active'
}

const getPhase = (item: SampleSprintItem): Sprint['phase'] => {
  if (item.outcomeKind) return 'Decisión'
  if (item.latestSnapshotDate) return 'Reporte'
  if (item.status === 'active') return 'Operación'

  return 'Kickoff'
}

const getDaysSince = (value: string | null) => {
  if (!value) return 0

  const target = new Date(value)

  if (Number.isNaN(target.getTime())) return 0

  return Math.max(0, Math.floor((Date.now() - target.getTime()) / 86400000))
}

/**
 * TASK-835 — toda derivación de progressPct, actualClp, team y signals
 * vive server-side en `src/lib/commercial/sample-sprints/runtime-projection.ts`.
 * El Workspace consume el `runtime` field del payload — ya no deriva localmente.
 */

const initialsFrom = (value: string) => value
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('') || 'SS'

const teamFromRuntimeDetail = (
  runtimeTeam: SampleSprintRuntimeProjection['selected'] extends infer S
    ? S extends { team: infer T } ? T : never
    : never
): TeamMember[] => {
  if (!Array.isArray(runtimeTeam) || runtimeTeam.length === 0) return []

  return runtimeTeam.map(member => {
    const displayName = member.displayName ?? member.memberId

    return {
      name: displayName,
      role: member.roleTitle ?? member.commitmentRole ?? 'Sin rol declarado',
      initials: initialsFrom(displayName),
      allocation: Number.isFinite(member.proposedFte) ? member.proposedFte : 0,
      availability: 0
    }
  })
}

const toSprint = (item: SampleSprintItem, runtimeItem?: SampleSprintRuntimeItem): Sprint => ({
  id: item.serviceId,
  client: getClientLabel(item),
  name: item.name,
  kind: item.engagementKind as SprintKind,
  subtype: ENGAGEMENT_KIND_LABEL[item.engagementKind],
  status: getSprintStatus(item),
  owner: getClientLabel(item),
  startDate: item.startDate ?? item.createdAt ?? new Date().toISOString().slice(0, 10),
  decisionDate: item.decisionDeadline ?? item.targetEndDate ?? item.startDate ?? item.createdAt ?? new Date().toISOString().slice(0, 10),
  budgetClp: item.expectedInternalCostClp,
  actualClp: runtimeItem?.actualClp ?? null,
  conversionProbability: item.outcomeKind === 'converted' ? 100 : item.status === 'active' ? 55 : 0,
  progressPct: runtimeItem?.progressPct ?? null,
  lastSnapshotDays: runtimeItem?.daysSinceLastSnapshot ?? getDaysSince(item.latestSnapshotDate),
  phase: getPhase(item),
  outcome: item.outcomeKind ?? undefined,
  signal: runtimeItem?.signalSeverity ?? 'info',
  team: []
})

const mapRuntimeSignals = (runtimeSignals: readonly SampleSprintRuntimeSignal[] | undefined): Signal[] => {
  if (!Array.isArray(runtimeSignals)) return []

  return runtimeSignals.map(signal => ({
    code: `commercial.engagement.${signal.kind.replace(/-/g, '_')}`,
    label: signal.label,
    severity: signal.severity === 'success' ? 'info' : signal.severity,
    count: signal.count,
    runbook: signal.runbook,
    description: signal.description
  }))
}

const getDegradedCopy = (code: SampleSprintProjectionDegradedReason['code']) => {
  const dict = GH_AGENCY.sampleSprints.degraded

  return dict[code]
}

const readJsonResponse = async <T,>(response: Response): Promise<T | null> => {
  const text = await response.text()

  if (!text.trim()) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

const useSampleSprints = (mode: WorkspaceMode, serviceId?: string) => {
  const [items, setItems] = useState<SampleSprintItem[]>([])
  const [detail, setDetail] = useState<SampleSprintDetail | null>(null)
  const [options, setOptions] = useState<Options | null>(null)
  const [runtime, setRuntime] = useState<SampleSprintRuntimeProjection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        if (mode === 'list' || mode === 'declare') {
          const response = await fetch('/api/agency/sample-sprints?includeOptions=true', { cache: 'no-store' })

          const payload = await readJsonResponse<{
            items?: SampleSprintItem[]
            options?: Options
            runtime?: SampleSprintRuntimeProjection
            error?: string
          }>(response)

          if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar Sample Sprints.')
          if (!mounted) return

          setItems(payload?.items ?? [])
          setOptions(payload?.options ?? null)
          setRuntime(payload?.runtime ?? null)
        } else if (serviceId) {
          const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(serviceId)}`, { cache: 'no-store' })

          const payload = await readJsonResponse<(SampleSprintDetail & {
            runtime?: SampleSprintRuntimeProjection
            error?: string
          })>(response)

          if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el Sample Sprint.')
          if (!payload) throw new Error('La respuesta del Sample Sprint llegó vacía.')
          if (!mounted) return

          setDetail(payload)
          setRuntime(payload.runtime ?? null)

          const optionsResponse = await fetch('/api/agency/sample-sprints?includeOptions=true', { cache: 'no-store' })
          const optionsPayload = await readJsonResponse<{ options?: Options }>(optionsResponse)

          if (mounted && optionsResponse.ok) {
            setOptions(optionsPayload?.options ?? null)
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la información.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [mode, serviceId])

  return { items, detail, options, runtime, loading, error }
}

const surfaceByMode: Record<WorkspaceMode, 'command' | 'declare' | 'detail' | 'approval' | 'progress' | 'outcome'> = {
  list: 'command',
  declare: 'declare',
  detail: 'detail',
  approve: 'approval',
  progress: 'progress',
  outcome: 'outcome'
}

const DegradedBanner = ({ degraded }: { degraded: SampleSprintProjectionDegradedReason[] }) => {
  if (degraded.length === 0) return null

  return (
    <Alert
      severity='warning'
      variant='outlined'
      role='status'
      aria-live='polite'
      aria-label={GH_AGENCY.sampleSprints.aria.degradedBanner}
    >
      <AlertTitle>{GH_AGENCY.sampleSprints.degraded.bannerTitle}</AlertTitle>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
        {GH_AGENCY.sampleSprints.degraded.bannerHint}
      </Typography>
      <Stack component='ul' spacing={0.5} sx={{ pl: 2.5, m: 0 }}>
        {degraded.map((reason, idx) => {
          const copy = getDegradedCopy(reason.code)

          return (
            <Typography component='li' variant='body2' key={`${reason.code}-${idx}`}>
              <strong>{copy.title}.</strong> {copy.description}
            </Typography>
          )
        })}
      </Stack>
    </Alert>
  )
}

const RuntimeWorkspaceView = ({
  items,
  detail,
  options,
  runtime,
  mode
}: {
  items: SampleSprintItem[]
  detail: SampleSprintDetail | null
  options: RuntimeSampleSprintOptions | null
  runtime: SampleSprintRuntimeProjection | null
  mode: WorkspaceMode
}) => {
  const runtimeItems = detail ? [detail] : items

  // Index runtime items by serviceId — ya viene desde server-side, evitamos doble lookup.
  const runtimeIndex = new Map<string, SampleSprintRuntimeItem>()

  for (const ri of runtime?.items ?? []) runtimeIndex.set(ri.serviceId, ri)

  const sprints = runtimeItems.map(item => {
    const sprint = toSprint(item, runtimeIndex.get(item.serviceId))

    // Inyectar team enriquecido server-side para el sprint seleccionado.
    if (detail && item.serviceId === detail.serviceId && runtime?.selected?.serviceId === detail.serviceId) {
      return { ...sprint, team: teamFromRuntimeDetail(runtime.selected.team) }
    }

    return sprint
  })

  const signals = mapRuntimeSignals(runtime?.signals)

  return (
    <SampleSprintsMockupView
      variant='runtime'
      sprints={sprints}
      signals={signals}
      initialSelectedSprintId={detail?.serviceId ?? runtimeItems[0]?.serviceId}
      initialActiveSurface={surfaceByMode[mode]}
      runtimeOptions={options}
    />
  )
}

const SampleSprintsWorkspace = ({ mode, serviceId }: Props) => {
  const { items, detail, options, runtime, loading, error } = useSampleSprints(mode, serviceId)

  return (
    <Stack spacing={4}>
      {loading ? <LinearProgress /> : null}
      {error ? <Alert severity='error'>{error}</Alert> : null}
      {!loading && !error && runtime?.degraded?.length ? (
        <DegradedBanner degraded={runtime.degraded} />
      ) : null}
      {!loading && !error ? (
        <RuntimeWorkspaceView items={items} detail={detail} options={options} runtime={runtime} mode={mode} />
      ) : null}
    </Stack>
  )
}

export default SampleSprintsWorkspace
