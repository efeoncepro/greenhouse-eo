'use client'

import { useCallback, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import CustomChip from '@core/components/mui/Chip'

import { getMicrocopy } from '@/lib/copy'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_WORKFORCE_ACTIVATION, GH_WORKFORCE_INTAKE } from '@/lib/copy/workforce'
import CompensationDrawer, { type CompensationSavePayload } from '@/views/greenhouse/payroll/CompensationDrawer'

import CompleteIntakeDrawer, {
  type CompleteIntakeDrawerMember
} from './CompleteIntakeDrawer'
import WorkforceIntakeRemediationDrawer from './WorkforceIntakeRemediationDrawer'

import type {
  ListPendingIntakeMembersCursor,
  PendingIntakeMemberRow,
  WorkforceIntakeStatusFilter
} from '@/lib/workforce/intake-queue/list-pending-members'
import type {
  WorkforceActivationLaneKey,
  WorkforceActivationLaneStatus,
  WorkforceActivationReadiness
} from '@/lib/workforce/activation/types'
import type { ReliabilitySignal } from '@/types/reliability'

interface WorkforceActivationViewProps {
  readonly initialItems: PendingIntakeMemberRow[]
  readonly initialCursor: ListPendingIntakeMembersCursor | null
  readonly initialHasMore: boolean
  readonly initialTotalApprox: number | null
  readonly pendingSignal: ReliabilitySignal | null
  readonly apiPath?: string
  readonly completeIntakeApiBasePath?: string
  readonly intakeApiBasePath?: string
  readonly initialSelectedMemberId?: string | null
}

type ActivationFilter = 'all' | 'ready' | 'compensation' | 'hire_date' | 'relationship' | 'payment' | 'contractor'

const FILTERS: ReadonlyArray<{ key: ActivationFilter; label: string; icon: string }> = [
  { key: 'all', label: GH_WORKFORCE_ACTIVATION.filter_all, icon: 'tabler-list-check' },
  { key: 'ready', label: GH_WORKFORCE_ACTIVATION.filter_ready, icon: 'tabler-circle-check' },
  { key: 'compensation', label: GH_WORKFORCE_ACTIVATION.filter_compensation, icon: 'tabler-wallet-off' },
  { key: 'hire_date', label: GH_WORKFORCE_ACTIVATION.filter_hire_date, icon: 'tabler-calendar-off' },
  { key: 'relationship', label: GH_WORKFORCE_ACTIVATION.filter_relationship, icon: 'tabler-file-off' },
  { key: 'payment', label: GH_WORKFORCE_ACTIVATION.filter_payment, icon: 'tabler-credit-card-off' },
  { key: 'contractor', label: GH_WORKFORCE_ACTIVATION.filter_contractor, icon: 'tabler-user-cog' }
]

const laneStatusMeta: Record<WorkforceActivationLaneStatus, { color: 'success' | 'warning' | 'error' | 'secondary'; icon: string; copyKey: 'available' | 'inReview' | 'blocked' | 'unavailable' }> = {
  ready: { color: 'success', icon: 'tabler-circle-check', copyKey: 'available' },
  warning: { color: 'warning', icon: 'tabler-alert-triangle', copyKey: 'inReview' },
  blocked: { color: 'error', icon: 'tabler-circle-x', copyKey: 'blocked' },
  not_applicable: { color: 'secondary', icon: 'tabler-minus', copyKey: 'unavailable' }
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'GH'

const hasBlockerLane = (row: PendingIntakeMemberRow, lane: WorkforceActivationLaneKey): boolean =>
  Boolean(row.activationReadiness?.blockers.some(blocker => blocker.lane === lane))

const filterRows = (rows: PendingIntakeMemberRow[], filter: ActivationFilter): PendingIntakeMemberRow[] => {
  switch (filter) {
    case 'ready':
      return rows.filter(row => row.activationReadiness?.ready)
    case 'compensation':
      return rows.filter(row => hasBlockerLane(row, 'compensation'))
    case 'hire_date':
      return rows.filter(row => row.activationReadiness?.blockers.some(blocker => blocker.code === 'hire_date_missing'))
    case 'relationship':
      return rows.filter(row => hasBlockerLane(row, 'work_relationship') || hasBlockerLane(row, 'legal_profile'))
    case 'payment':
      return rows.filter(row => hasBlockerLane(row, 'payment_profile'))
    case 'contractor':
      return rows.filter(row => hasBlockerLane(row, 'contractor_engagement'))
    default:
      return rows
  }
}

const buildDrawerMember = (row: PendingIntakeMemberRow | null): CompleteIntakeDrawerMember | null => {
  if (!row) return null

  return {
    memberId: row.memberId,
    displayName: row.displayName,
    primaryEmail: row.primaryEmail,
    workforceIntakeStatus: row.workforceIntakeStatus,
    identityProfileId: row.identityProfileId,
    createdAt: row.createdAt,
    ageDays: row.ageDays
  }
}

const MemberIdentity = ({ row, compact = false }: { row: PendingIntakeMemberRow; compact?: boolean }) => (
  <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 0 }}>
    <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main', width: compact ? 34 : 38, height: compact ? 34 : 38 }}>
      {initials(row.displayName)}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant={compact ? 'body2' : 'body1'} sx={{ fontWeight: 700 }} noWrap>
        {row.displayName}
      </Typography>
      <Typography variant='caption' color='text.secondary' noWrap>
        {row.primaryEmail ?? '—'}
      </Typography>
    </Box>
  </Stack>
)

const SummaryStrip = ({
  items,
  filter,
  onFilterChange
}: {
  items: PendingIntakeMemberRow[]
  filter: ActivationFilter
  onFilterChange: (next: ActivationFilter) => void
}) => {
  const needsRelationship = items.filter(row => hasBlockerLane(row, 'work_relationship') || hasBlockerLane(row, 'legal_profile')).length
  const needsCompensation = items.filter(row => hasBlockerLane(row, 'compensation')).length
  const ready = items.filter(row => row.activationReadiness?.ready).length

  const metrics = [
    { icon: 'tabler-users', color: 'primary', value: items.length, label: GH_WORKFORCE_ACTIVATION.control_people },
    { icon: 'tabler-file-off', color: 'error', value: needsRelationship, label: GH_WORKFORCE_ACTIVATION.control_relationship },
    { icon: 'tabler-wallet-off', color: 'warning', value: needsCompensation, label: GH_WORKFORCE_ACTIVATION.control_compensation },
    { icon: 'tabler-circle-check', color: 'success', value: ready, label: GH_WORKFORCE_ACTIVATION.control_ready }
  ] as const

  return (
    <Card sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
            {metrics.map(metric => (
              <Box
                key={metric.label}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '32px auto 1fr' },
                  gap: 2,
                  alignItems: 'center',
                  justifyItems: { xs: 'center', sm: 'stretch' },
                  textAlign: { xs: 'center', sm: 'left' },
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  px: 2,
                  py: 1.5,
                  minHeight: 62
                }}
              >
                <Avatar variant='rounded' sx={{ bgcolor: `${metric.color}.lighter`, color: `${metric.color}.main`, width: 30, height: 30 }}>
                  <i className={metric.icon} />
                </Avatar>
                <Typography variant='body1' sx={{ fontWeight: 800, lineHeight: 1 }}>
                  {metric.value}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{
                    display: 'block',
                    fontWeight: 700,
                    maxWidth: '100%',
                    lineHeight: 1.25,
                    fontSize: theme => theme.typography.caption.fontSize
                  }}
                >
                  {metric.label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Alert severity='warning' icon={<i className='tabler-shield-lock' />} sx={{ py: 1 }}>
            <Typography variant='body2'>
              {GH_WORKFORCE_ACTIVATION.control_blocker_hint}
            </Typography>
          </Alert>

          <Divider />

          <Stack
            role='group'
            aria-label={GH_WORKFORCE_ACTIVATION.filter_group_aria}
            direction='row'
            spacing={2}
            useFlexGap
            flexWrap={{ xs: 'nowrap', md: 'wrap' }}
            sx={{ overflowX: { xs: 'auto', md: 'visible' }, pb: { xs: 0.5, md: 0 } }}
          >
            {FILTERS.map(item => (
              <Button
                key={item.key}
                size='small'
                variant={filter === item.key ? 'contained' : 'tonal'}
                color={filter === item.key ? 'primary' : 'secondary'}
                startIcon={<i className={item.icon} />}
                onClick={() => onFilterChange(item.key)}
                sx={{ flexShrink: 0, minHeight: 34, py: 0.75, px: 2.5, fontSize: theme => theme.typography.caption.fontSize }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const QueueRow = ({
  row,
  selected,
  onSelect
}: {
  row: PendingIntakeMemberRow
  selected: boolean
  onSelect: () => void
}) => {
  const readiness = row.activationReadiness
  const copy = getMicrocopy()
  const ready = Boolean(readiness?.ready)
  const blockerCount = readiness?.blockerCount ?? row.blockerCount ?? 0
  const firstBlocker = readiness?.blockers[0]?.label ?? GH_WORKFORCE_ACTIVATION.ready_detail
  const secondBlocker = readiness?.blockers[1]?.label ?? readiness?.warnings[0]?.label ?? row.workforceIntakeStatus

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      sx={{
        width: '100%',
        textAlign: 'left',
        border: 0,
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: selected ? 'action.selected' : 'background.paper',
        cursor: 'pointer',
        px: 4,
        py: 3,
        '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' }
      }}
    >
      <Box sx={{ display: 'grid', gap: 3, alignItems: 'center', gridTemplateColumns: { xs: '1fr', md: 'minmax(250px, 1.25fr) 108px minmax(180px, 0.9fr) 92px' } }}>
        <MemberIdentity row={row} />
        <CustomChip round='true' size='small' variant='tonal' label={ready ? copy.states.available : copy.states.blocked} color={ready ? 'success' : 'error'} sx={{ alignSelf: 'flex-start' }} />
        <Box sx={{ minWidth: 0 }}>
          <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={ready ? 'success' : 'error'}
              label={ready ? GH_WORKFORCE_ACTIVATION.blockers_none : GH_WORKFORCE_ACTIVATION.blockers_count(blockerCount)}
            />
            <Typography variant='caption' color='text.secondary' noWrap>
              {firstBlocker}
            </Typography>
          </Stack>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }} noWrap>
            {secondBlocker}
          </Typography>
        </Box>
        <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
          <Typography variant='body2' sx={{ fontWeight: 700 }}>
            {readiness?.readinessScore ?? 0}%
          </Typography>
          <LinearProgress variant='determinate' value={readiness?.readinessScore ?? 0} color={ready ? 'success' : 'primary'} sx={{ width: 82, height: 6, borderRadius: 3 }} />
          <Typography variant='caption' color='text.secondary'>
            {GH_WORKFORCE_ACTIVATION.age_days(row.ageDays)}
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

const ReadinessInspector = ({
  row,
  onComplete,
  onResolve
}: {
  row: PendingIntakeMemberRow | null
  onComplete: () => void
  onResolve: () => void
}) => {
  if (!row || !row.activationReadiness) {
    return (
      <Card sx={{ borderRadius: 2, minWidth: 0 }}>
        <CardContent sx={{ p: 4 }}>
          <EmptyState icon='tabler-user-check' title={GH_WORKFORCE_ACTIVATION.empty_title} description={GH_WORKFORCE_ACTIVATION.empty_body} />
        </CardContent>
      </Card>
    )
  }

  const readiness: WorkforceActivationReadiness = row.activationReadiness
  const copy = getMicrocopy()
  const ready = readiness.ready
  const blockedLabels = readiness.blockers.slice(0, 2).map(blocker => blocker.label).join(', ')

  return (
    <Card sx={{ borderRadius: 2, minWidth: 0, position: { lg: 'sticky' }, top: { lg: 96 } }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={4}>
          <Stack spacing={3}>
            <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3}>
              <MemberIdentity row={row} compact />
              <CustomChip round='true' size='small' variant='tonal' color={ready ? 'success' : 'error'} label={ready ? copy.states.available : copy.states.blocked} />
            </Stack>
            <Box>
              <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                <Typography variant='body2' sx={{ fontWeight: 700 }}>
                  {GH_WORKFORCE_ACTIVATION.readiness_label}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {readiness.readinessScore}%
                </Typography>
              </Stack>
              <LinearProgress variant='determinate' value={readiness.readinessScore} color={ready ? 'success' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Alert severity={ready ? 'success' : 'warning'} icon={<i className={ready ? 'tabler-circle-check' : 'tabler-shield-lock'} />} sx={{ py: 0.75 }}>
              {ready ? GH_WORKFORCE_ACTIVATION.inspector_ready : GH_WORKFORCE_ACTIVATION.inspector_blocked(blockedLabels || GH_WORKFORCE_ACTIVATION.ready_detail)}
            </Alert>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={2}>
            {ready ? (
              <Button fullWidth size='small' variant='contained' startIcon={<i className='tabler-circle-check' />} onClick={onComplete}>
                {GH_WORKFORCE_ACTIVATION.complete}
              </Button>
            ) : (
              <Button fullWidth size='small' variant='contained' startIcon={<i className='tabler-tool' />} onClick={onResolve}>
                {GH_WORKFORCE_ACTIVATION.resolve_blockers}
              </Button>
            )}
            <Button fullWidth size='small' variant='tonal' color='secondary' startIcon={<i className='tabler-route' />} onClick={onResolve}>
              {ready ? GH_WORKFORCE_ACTIVATION.resolve_blockers : GH_WORKFORCE_ACTIVATION.unblock_route}
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={2.5}>
            <Typography variant='body1' sx={{ fontWeight: 700 }}>
              {GH_WORKFORCE_ACTIVATION.critical_lanes}
            </Typography>
            {readiness.lanes.map(item => {
              const meta = laneStatusMeta[item.status]

              return (
                <Box key={item.key} sx={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 2.5 }}>
                  <Box sx={{ color: `${meta.color}.main`, pt: 0.25 }}>
                    <i className={meta.icon} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                      <Typography variant='body2' sx={{ fontWeight: 700 }} noWrap>
                        {item.label}
                      </Typography>
                      <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={copy.states[meta.copyKey]} />
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      {item.owner}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5, lineHeight: 1.35 }}>
                      {item.detail}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const WorkforceActivationView = ({
  initialItems,
  initialCursor,
  initialHasMore,
  initialTotalApprox,
  pendingSignal,
  apiPath = '/api/admin/workforce/activation',
  completeIntakeApiBasePath = '/api/admin/workforce/members',
  intakeApiBasePath = completeIntakeApiBasePath,
  initialSelectedMemberId = null
}: WorkforceActivationViewProps) => {
  const [items, setItems] = useState<PendingIntakeMemberRow[]>(initialItems)
  const [cursor, setCursor] = useState<ListPendingIntakeMembersCursor | null>(initialCursor)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [totalApprox, setTotalApprox] = useState<number | null>(initialTotalApprox)
  const [statusFilter] = useState<WorkforceIntakeStatusFilter>('all')
  const [activationFilter, setActivationFilter] = useState<ActivationFilter>('all')
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedMemberId ?? initialItems[0]?.memberId ?? null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [remediationOpen, setRemediationOpen] = useState(false)
  const [compensationOpen, setCompensationOpen] = useState(false)

  const visibleItems = useMemo(() => filterRows(items, activationFilter), [items, activationFilter])

  const selected = useMemo(
    () => visibleItems.find(item => item.memberId === selectedId) ?? visibleItems[0] ?? null,
    [visibleItems, selectedId]
  )

  const drawerMember = useMemo(() => buildDrawerMember(drawerOpen ? selected : null), [drawerOpen, selected])

  const fetchPage = useCallback(
    async (nextCursor: ListPendingIntakeMembersCursor | null) => {
      const params = new URLSearchParams()

      params.set('statusFilter', statusFilter)

      if (nextCursor) {
        params.set('cursor', encodeURIComponent(JSON.stringify(nextCursor)))
      }

      const response = await fetch(`${apiPath}?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return (await response.json()) as {
        items: PendingIntakeMemberRow[]
        nextCursor: ListPendingIntakeMembersCursor | null
        hasMore: boolean
        totalApprox: number | null
      }
    },
    [apiPath, statusFilter]
  )

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return

    setLoadingMore(true)

    try {
      const data = await fetchPage(cursor)

      setItems(prev => [...prev, ...data.items])
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch {
      toast.error(GH_WORKFORCE_INTAKE.queue_load_error)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, fetchPage])

  const refreshQueue = useCallback(async (preferredMemberId?: string | null) => {
    setRefreshing(true)

    try {
      const data = await fetchPage(null)

      setItems(data.items)
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setTotalApprox(data.totalApprox)
      setSelectedId(prev => {
        const preferred = preferredMemberId ?? prev

        return data.items.some(item => item.memberId === preferred)
          ? preferred
          : data.items[0]?.memberId ?? null
      })
    } catch {
      toast.error(GH_WORKFORCE_INTAKE.queue_load_error)
    } finally {
      setRefreshing(false)
    }
  }, [fetchPage])

  const handleCompletedFromDrawer = useCallback(async () => {
    await refreshQueue(null)
  }, [refreshQueue])

  const handleSaveCompensation = useCallback(async ({ mode, input, versionId }: CompensationSavePayload) => {
    const isUpdate = mode === 'update' && versionId

    const response = await fetch(isUpdate ? `/api/hr/payroll/compensation/${versionId}` : '/api/hr/payroll/compensation', {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))

      throw new Error(payload.error || 'Error al guardar compensación')
    }

    toast.success(isUpdate ? 'Compensación actualizada' : 'Nueva versión de compensación creada')
    await refreshQueue(selected?.memberId ?? null)
  }, [refreshQueue, selected?.memberId])

  const showBanner = pendingSignal !== null && (pendingSignal.severity === 'error' || pendingSignal.severity === 'warning')

  return (
    <Stack spacing={4} sx={{ minWidth: 0, overflowX: 'hidden', p: { xs: 4, md: 6 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' spacing={3}>
        <Box>
          <Stack direction='row' spacing={2} alignItems='center' useFlexGap flexWrap='wrap' sx={{ mb: 1 }}>
            <Typography variant='h5' sx={{ fontSize: { xs: 22, md: 28 }, lineHeight: 1.2 }}>
              {GH_WORKFORCE_ACTIVATION.page_title}
            </Typography>
            <CustomChip round='true' size='small' variant='tonal' color='warning' label={GH_WORKFORCE_ACTIVATION.guard_active} />
          </Stack>
          <Typography variant='body2' color='text.secondary' sx={{ fontSize: { xs: 14, md: 15 }, lineHeight: 1.45 }}>
            {GH_WORKFORCE_ACTIVATION.page_subtitle}
          </Typography>
          {totalApprox !== null ? (
            <Typography variant='caption' color='text.secondary'>
              {totalApprox} pendiente{totalApprox === 1 ? '' : 's'}
            </Typography>
          ) : null}
        </Box>
        <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
          <Button size='small' variant='tonal' color='secondary' startIcon={<i className='tabler-download' />}>
            {GH_WORKFORCE_ACTIVATION.export_blockers}
          </Button>
          <Button size='small' variant='contained' startIcon={<i className='tabler-user-plus' />} href='/people'>
            {GH_WORKFORCE_ACTIVATION.new_activation}
          </Button>
        </Stack>
      </Stack>

      {showBanner ? (
        <Alert severity={pendingSignal!.severity === 'error' ? 'error' : 'warning'} icon={<i className='tabler-alert-triangle' />}>
          <Typography variant='body2' sx={{ fontWeight: 700 }}>
            {pendingSignal!.label}
          </Typography>
          <Typography variant='caption'>{pendingSignal!.summary}</Typography>
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gap: 4, minWidth: 0, alignItems: 'start', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' } }}>
        <Box sx={{ gridColumn: '1 / -1', width: '100%', minWidth: 0 }}>
          <SummaryStrip
            items={items}
            filter={activationFilter}
            onFilterChange={next => {
              const nextItems = filterRows(items, next)

              setActivationFilter(next)
              setSelectedId(nextItems[0]?.memberId ?? null)
            }}
          />
        </Box>

        <Card sx={{ borderRadius: 2, overflow: 'hidden', minWidth: 0 }}>
          <CardContent sx={{ px: 4, py: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between' spacing={3}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='h5'>{GH_WORKFORCE_ACTIVATION.queue_title}</Typography>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                  {GH_WORKFORCE_ACTIVATION.queue_subtitle}
                </Typography>
              </Box>
              <Stack direction='row' spacing={2} alignItems='center'>
                {refreshing ? <CircularProgress size={18} /> : null}
                <CustomChip round='true' size='small' variant='tonal' color='primary' label={GH_WORKFORCE_ACTIVATION.queue_count(visibleItems.length)} />
              </Stack>
            </Stack>
          </CardContent>
          <Divider />
          {visibleItems.length === 0 ? (
            <Box sx={{ p: 6 }}>
              <EmptyState icon='tabler-user-check' title={GH_WORKFORCE_ACTIVATION.empty_title} description={GH_WORKFORCE_ACTIVATION.empty_body} />
            </Box>
          ) : (
            <Box>
              {visibleItems.map(row => (
                <QueueRow key={row.memberId} row={row} selected={selected?.memberId === row.memberId} onSelect={() => setSelectedId(row.memberId)} />
              ))}
            </Box>
          )}
          {hasMore ? (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
              <Button variant='tonal' color='secondary' onClick={handleLoadMore} disabled={loadingMore} startIcon={loadingMore ? <CircularProgress size={16} /> : null}>
                {loadingMore ? GH_WORKFORCE_INTAKE.queue_loading : GH_WORKFORCE_INTAKE.queue_load_more}
              </Button>
            </Box>
          ) : null}
        </Card>

        <ReadinessInspector
          row={selected}
          onComplete={() => setDrawerOpen(true)}
          onResolve={() => setRemediationOpen(true)}
        />
      </Box>

      <CompleteIntakeDrawer
        open={drawerOpen}
        member={drawerMember}
        onClose={() => setDrawerOpen(false)}
        onCompleted={handleCompletedFromDrawer}
        completeIntakeApiBasePath={completeIntakeApiBasePath}
      />
      <WorkforceIntakeRemediationDrawer
        open={remediationOpen}
        member={selected}
        intakeApiBasePath={intakeApiBasePath}
        onClose={() => setRemediationOpen(false)}
        onSaved={async () => {
          await refreshQueue(selected?.memberId ?? null)
        }}
        onOpenCompensation={() => setCompensationOpen(true)}
      />
      {selected ? (
        <CompensationDrawer
          open={compensationOpen}
          onClose={() => setCompensationOpen(false)}
          existingVersion={null}
          memberId={selected.memberId}
          memberName={selected.displayName}
          onSave={handleSaveCompensation}
        />
      ) : null}
    </Stack>
  )
}

export default WorkforceActivationView
