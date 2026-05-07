'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'

import SampleSprintsMockupView, {
  type HealthSeverity,
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

const getProgressPct = (item: SampleSprintItem) => {
  if (item.outcomeKind) return 100
  if (item.latestSnapshotDate) return 72
  if (item.status === 'active') return 42
  if (item.status === 'pending_approval') return 8

  return 20
}

const getSignalSeverity = (item: SampleSprintItem): HealthSeverity => {
  if (item.status === 'pending_approval') return 'warning'
  if (getDaysSince(item.latestSnapshotDate) > 10 && item.status === 'active') return 'warning'
  if (item.outcomeKind === 'cancelled_by_client' || item.outcomeKind === 'cancelled_by_provider') return 'error'
  if (item.outcomeKind === 'converted') return 'success'

  return 'info'
}

const initialsFrom = (value: string) => value
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('') || 'SS'

const teamFromItem = (item: SampleSprintItem): TeamMember[] => [{
  name: getClientLabel(item),
  role: 'Engagement owner',
  initials: initialsFrom(getClientLabel(item)),
  allocation: item.status === 'pending_approval' ? 0.15 : 0.35,
  availability: item.status === 'pending_approval' ? 0.85 : 0.45
}]

const toSprint = (item: SampleSprintItem): Sprint => ({
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
  actualClp: 0,
  conversionProbability: item.outcomeKind === 'converted' ? 100 : item.status === 'active' ? 55 : 0,
  progressPct: getProgressPct(item),
  lastSnapshotDays: getDaysSince(item.latestSnapshotDate),
  phase: getPhase(item),
  outcome: item.outcomeKind ?? undefined,
  signal: getSignalSeverity(item),
  team: teamFromItem(item)
})

const buildRuntimeSignals = (items: SampleSprintItem[]): Signal[] => {
  const overdueDecision = items.filter(item => item.decisionDeadline && new Date(item.decisionDeadline) < new Date() && !item.outcomeKind).length
  const pendingApproval = items.filter(item => item.status === 'pending_approval').length
  const staleProgress = items.filter(item => item.status === 'active' && getDaysSince(item.latestSnapshotDate) > 10).length
  const unapprovedActive = items.filter(item => item.status === 'active' && item.approvalStatus && item.approvalStatus !== 'approved').length
  const closed = items.filter(item => item.outcomeKind).length
  const converted = items.filter(item => item.outcomeKind === 'converted').length
  const conversionRate = closed > 0 ? converted / closed : 1

  return [
    {
      code: 'commercial.engagement.overdue_decision',
      label: 'Decisiones vencidas',
      severity: 'error',
      count: overdueDecision,
      runbook: 'Cerrar outcome o ajustar deadline con aprobación',
      description: 'Engagements sin outcome después del deadline de decisión.'
    },
    {
      code: 'commercial.engagement.pending_approval',
      label: 'Aprobación pendiente',
      severity: 'warning',
      count: pendingApproval,
      runbook: 'Revisar capacidad y aprobar o rechazar el Sprint',
      description: 'Sample Sprints declarados que aún no pasan a operación.'
    },
    {
      code: 'commercial.engagement.stale_progress',
      label: 'Progreso stale',
      severity: 'warning',
      count: staleProgress,
      runbook: 'Registrar snapshot semanal con contexto operacional',
      description: 'Engagement activo sin snapshot reciente.'
    },
    {
      code: 'commercial.engagement.unapproved_active',
      label: 'Activos sin approval',
      severity: 'error',
      count: unapprovedActive,
      runbook: 'Volver a pending_approval o registrar aprobación retroactiva',
      description: 'Servicios no regulares activos sin aprobación aprobada.'
    },
    {
      code: 'commercial.engagement.conversion_rate_drop',
      label: 'Conversión bajo umbral',
      severity: 'warning',
      count: conversionRate < 0.35 ? 1 : 0,
      runbook: 'Revisar outcomes trailing 6m y criterios de success',
      description: 'Conversion rate trailing bajo el threshold configurado.'
    }
  ]
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
          const payload = await readJsonResponse<{ items?: SampleSprintItem[]; options?: Options; error?: string }>(response)

          if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar Sample Sprints.')
          if (!mounted) return

          setItems(payload?.items ?? [])
          setOptions(payload?.options ?? null)
        } else if (serviceId) {
          const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(serviceId)}`, { cache: 'no-store' })
          const payload = await readJsonResponse<(SampleSprintDetail & { error?: string })>(response)

          if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el Sample Sprint.')
          if (!payload) throw new Error('La respuesta del Sample Sprint llegó vacía.')
          if (!mounted) return

          setDetail(payload)

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

  return { items, detail, options, loading, error }
}

const surfaceByMode: Record<WorkspaceMode, 'command' | 'declare' | 'detail' | 'approval' | 'progress' | 'outcome'> = {
  list: 'command',
  declare: 'declare',
  detail: 'detail',
  approve: 'approval',
  progress: 'progress',
  outcome: 'outcome'
}

const RuntimeWorkspaceView = ({
  items,
  detail,
  options,
  mode
}: {
  items: SampleSprintItem[]
  detail: SampleSprintDetail | null
  options: RuntimeSampleSprintOptions | null
  mode: WorkspaceMode
}) => {
  const runtimeItems = detail ? [detail] : items

  return (
    <SampleSprintsMockupView
      variant='runtime'
      sprints={runtimeItems.map(toSprint)}
      signals={buildRuntimeSignals(runtimeItems)}
      initialSelectedSprintId={detail?.serviceId ?? runtimeItems[0]?.serviceId}
      initialActiveSurface={surfaceByMode[mode]}
      runtimeOptions={options}
    />
  )
}

const SampleSprintsWorkspace = ({ mode, serviceId }: Props) => {
  const { items, detail, options, loading, error } = useSampleSprints(mode, serviceId)

  return (
    <Stack spacing={4}>
      {loading ? <LinearProgress /> : null}
      {error ? <Alert severity='error'>{error}</Alert> : null}
      {!loading && !error ? <RuntimeWorkspaceView items={items} detail={detail} options={options} mode={mode} /> : null}
    </Stack>
  )
}

export default SampleSprintsWorkspace
