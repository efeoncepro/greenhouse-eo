'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import type { ApexOptions } from 'apexcharts'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import GreenhouseCalendar from '@/components/greenhouse/GreenhouseCalendar'
import LeaveRequestDialog from '@/components/greenhouse/LeaveRequestDialog'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
import { getLeaveReviewCapabilities } from '@/lib/hr-core/leave-review-policy'
import type {
  CreateLeaveRequestInput,
  HrApprovalAction,
  HrLeaveCalendarResponse,
  HrCoreMetadata,
  HrLeaveBackfillInput,
  HrLeaveBalance,
  HrLeaveBalanceAdjustmentInput,
  HrLeaveBalanceAdjustmentRecord,
  HrLeaveBalanceAdjustmentsResponse,
  HrLeaveRequest,
  HrLeaveRequestsResponse,
  HrLeaveBalancesResponse,
  HrLeaveType,
  HrLeaveRequestStatus,
  LeaveDayPeriod
} from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'
import { leaveStatusConfig, getLeaveTypeConfig, formatDate } from './helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const initialBackfillForm = {
  startDate: '',
  endDate: '',
  startPeriod: 'full_day' as LeaveDayPeriod,
  endPeriod: 'full_day' as LeaveDayPeriod,
  reason: '',
  notes: ''
}

const initialAdjustmentForm = {
  daysDelta: '',
  effectiveDate: '',
  reason: '',
  notes: ''
}

const initialReverseForm = {
  reason: '',
  notes: ''
}

const emptyRequests: HrLeaveRequest[] = []
const emptyBalances: HrLeaveBalance[] = []
const emptyAdjustments: HrLeaveBalanceAdjustmentRecord[] = []

const formatPolicyExplainLabel = (policyExplain: NonNullable<HrLeaveBalance['policyExplain']>) => {
  if (policyExplain.policySource === 'not_eligible') {
    return 'Sin acumulación automática'
  }

  if (policyExplain.policySource === 'external_provider') {
    return 'Permiso cubierto por proveedor externo'
  }

  return policyExplain.policyName
}

const getHrLeaveErrorMessage = (payload: { error?: string | null; code?: string | null } | null | undefined, fallback: string) => {
  switch (payload?.code) {
    case 'HR_CORE_SCHEMA_NOT_READY':
      return 'HR Core no está inicializado todavía en este ambiente. Ejecuta el bootstrap de BigQuery antes de usar Permisos.'
    case 'HR_CORE_POSTGRES_SCHEMA_NOT_READY':
      return 'El store PostgreSQL de permisos no está inicializado todavía en este ambiente.'
    case 'HR_CORE_POSTGRES_NOT_CONFIGURED':
      return 'El store PostgreSQL de permisos no está configurado en este ambiente.'
    default:
      return payload?.error || fallback
  }
}

const getCalendarRangeForYear = (year: number) => ({
  from: `${year}-01-01`,
  to: `${year}-12-31`
})

type TeamBalanceSummaryRow = {
  memberId: string
  memberName: string
  balances: HrLeaveBalance[]
  vacationBalance: HrLeaveBalance | null
  policyLabel: string
  availableDays: number | null
  reservedDays: number | null
  adjustmentDays: number | null
  hasNegativeBalance: boolean
  hasReservations: boolean
  hasAdjustments: boolean
}

const buildBalancesByType = (leaveTypes: HrLeaveType[], balances: HrLeaveBalance[]) =>
  leaveTypes.map(leaveType => {
    const matchingBalances = balances.filter(balance => balance.leaveTypeCode === leaveType.leaveTypeCode)
    const totalAllowance = matchingBalances.reduce((sum, balance) => sum + balance.allowanceDays, 0)
    const totalUsed = matchingBalances.reduce((sum, balance) => sum + balance.usedDays, 0)
    const totalAvailable = matchingBalances.reduce((sum, balance) => sum + balance.availableDays, 0)
    const pctUsed = totalAllowance > 0 ? Math.round((totalUsed / totalAllowance) * 100) : 0

    return {
      ...leaveType,
      totalAllowance,
      totalUsed,
      totalAvailable,
      pctUsed,
      memberCount: matchingBalances.length
    }
  })

const buildTeamBalanceRows = (balances: HrLeaveBalance[]) => {
  const rows = new Map<string, TeamBalanceSummaryRow>()

  for (const balance of balances) {
    const existing = rows.get(balance.memberId)

    if (existing) {
      existing.balances.push(balance)
      continue
    }

    rows.set(balance.memberId, {
      memberId: balance.memberId,
      memberName: balance.memberName || balance.memberId,
      balances: [balance],
      vacationBalance: null,
      policyLabel: 'Sin política visible',
      availableDays: null,
      reservedDays: null,
      adjustmentDays: null,
      hasNegativeBalance: false,
      hasReservations: false,
      hasAdjustments: false
    })
  }

  return Array.from(rows.values())
    .map(row => {
      const vacationBalance = row.balances.find(balance => balance.leaveTypeCode === 'vacation') ?? null
      const baseBalance = vacationBalance ?? row.balances[0] ?? null

      return {
        ...row,
        vacationBalance,
        policyLabel: baseBalance?.policyExplain ? formatPolicyExplainLabel(baseBalance.policyExplain) : 'Sin política visible',
        availableDays: vacationBalance?.availableDays ?? null,
        reservedDays: vacationBalance?.reservedDays ?? null,
        adjustmentDays: vacationBalance?.adjustmentDays ?? null,
        hasNegativeBalance: row.balances.some(balance => balance.availableDays < 0),
        hasReservations: row.balances.some(balance => balance.reservedDays > 0),
        hasAdjustments: row.balances.some(balance => (balance.adjustmentDays ?? 0) !== 0)
      }
    })
    .sort((left, right) => left.memberName.localeCompare(right.memberName, 'es'))
}

const getTeamAlertLabels = (row: TeamBalanceSummaryRow) => {
  const alerts: string[] = []

  if (row.hasNegativeBalance) {
    alerts.push('Saldo negativo')
  }

  if (row.hasReservations) {
    alerts.push('Con reservas')
  }

  if (row.hasAdjustments) {
    alerts.push('Con ajustes')
  }

  return alerts
}

const HrLeaveView = () => {
  const theme = useTheme()
  const [tab, setTab] = useState('requests')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null)
  const [reqData, setReqData] = useState<HrLeaveRequestsResponse | null>(null)
  const [balData, setBalData] = useState<HrLeaveBalancesResponse | null>(null)
  const [calData, setCalData] = useState<HrLeaveCalendarResponse | null>(null)
  const [adjustmentsData, setAdjustmentsData] = useState<HrLeaveBalanceAdjustmentsResponse | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([])
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [hasHrAdminAccess, setHasHrAdminAccess] = useState(false)
  const [canManageLeaveBackfills, setCanManageLeaveBackfills] = useState(false)
  const [canManageLeaveAdjustments, setCanManageLeaveAdjustments] = useState(false)
  const [canReverseLeaveAdjustments, setCanReverseLeaveAdjustments] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState<HrLeaveRequestStatus | ''>('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [teamSearch, setTeamSearch] = useState('')
  const [teamAlertFilter, setTeamAlertFilter] = useState<'all' | 'negative' | 'reserved' | 'adjusted'>('all')
  const [teamDetailMemberId, setTeamDetailMemberId] = useState<string | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)

  // Review dialog
  const [reviewReq, setReviewReq] = useState<HrLeaveRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  // Admin backfill dialog
  const [backfillOpen, setBackfillOpen] = useState(false)
  const [backfillSaving, setBackfillSaving] = useState(false)
  const [backfillTarget, setBackfillTarget] = useState<HrLeaveBalance | null>(null)
  const [backfillForm, setBackfillForm] = useState(initialBackfillForm)

  // Admin balance adjustment dialog
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentSaving, setAdjustmentSaving] = useState(false)
  const [adjustmentTarget, setAdjustmentTarget] = useState<HrLeaveBalance | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustmentForm)

  // Admin reverse adjustment dialog
  const [reverseOpen, setReverseOpen] = useState(false)
  const [reverseSaving, setReverseSaving] = useState(false)
  const [reverseTarget, setReverseTarget] = useState<HrLeaveBalanceAdjustmentRecord | null>(null)
  const [reverseForm, setReverseForm] = useState(initialReverseForm)

  const activeLeaveTypes = leaveTypes.filter(leaveType => leaveType.active)
  const canManageLeaveAdminActions = canManageLeaveBackfills || canManageLeaveAdjustments
  const canShowAdjustmentHistory = canManageLeaveAdjustments || canReverseLeaveAdjustments
  const backfillYear = backfillTarget?.year ?? filterYear
  const adjustmentYear = adjustmentTarget?.year ?? filterYear

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ year: String(filterYear) })
      const calendarRange = getCalendarRangeForYear(filterYear)

      if (filterStatus) params.set('status', filterStatus)

      setAdjustmentsError(null)
      setAdjustmentsData(null)

      const [reqRes, balRes, calRes, metaRes] = await Promise.all([
        fetch(`/api/hr/core/leave/requests?${params}`),
        fetch(`/api/hr/core/leave/balances?year=${filterYear}`),
        fetch(`/api/hr/core/leave/calendar?from=${calendarRange.from}&to=${calendarRange.to}`),
        fetch('/api/hr/core/meta')
      ])

      if (reqRes.ok) {
        setReqData(await reqRes.json())
      } else {
        const payload = await reqRes.json().catch(() => null)

        setError(getHrLeaveErrorMessage(payload, 'No fue posible cargar las solicitudes de permiso.'))
      }

      if (balRes.ok) {
        setBalData(await balRes.json())
      } else {
        const payload = await balRes.json().catch(() => null)

        setError(current => current || getHrLeaveErrorMessage(payload, 'No fue posible cargar los saldos de permisos.'))
      }

      if (calRes.ok) {
        setCalData(await calRes.json())
      } else {
        const payload = await calRes.json().catch(() => null)

        setError(current => current || getHrLeaveErrorMessage(payload, 'No fue posible cargar el calendario de permisos.'))
      }

      if (metaRes.ok) {
        const meta = (await metaRes.json()) as HrCoreMetadata

        setLeaveTypes(meta.leaveTypes ?? [])
        setCurrentMemberId(meta.currentMemberId ?? null)
        setHasHrAdminAccess(meta.hasHrAdminAccess === true)
        setCanManageLeaveBackfills(meta.canManageLeaveBackfills === true)
        setCanManageLeaveAdjustments(meta.canManageLeaveAdjustments === true)
        setCanReverseLeaveAdjustments(meta.canReverseLeaveAdjustments === true)

        if (meta.canManageLeaveAdjustments || meta.canReverseLeaveAdjustments) {
          const adjustmentsRes = await fetch(`/api/hr/core/leave/adjustments?year=${filterYear}`)

          if (adjustmentsRes.ok) {
            setAdjustmentsData(await adjustmentsRes.json())
          } else {
            const payload = await adjustmentsRes.json().catch(() => null)

            setAdjustmentsData(null)
            setAdjustmentsError(getHrLeaveErrorMessage(payload, 'No fue posible cargar el historial de ajustes.'))
          }
        } else {
          setAdjustmentsData(null)
        }
      } else {
        setAdjustmentsData(null)
        const payload = await metaRes.json().catch(() => null)

        setError(current => current || getHrLeaveErrorMessage(payload, 'No fue posible cargar los tipos de permiso.'))
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterYear])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (input: CreateLeaveRequestInput) => {
    setCreateSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/hr/core/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const d = await res.json()
        const message = d.error || 'Error al crear solicitud'

        setError(message)

        throw new Error(message)
      }

      setCreateOpen(false)
      await fetchData()
    } finally {
      setCreateSaving(false)
    }
  }

  const handleReview = async (action: HrApprovalAction) => {
    if (!reviewReq) return

    setReviewSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/core/leave/requests/${reviewReq.requestId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: reviewNotes || null })
      })

      if (!res.ok) {
        const d = await res.json()

        setError(d.error || 'Error al procesar')

        return
      }

      setReviewReq(null)
      setReviewNotes('')
      await fetchData()
    } finally {
      setReviewSaving(false)
    }
  }

  const openBackfillDialog = (balance: HrLeaveBalance) => {
    setBackfillTarget(balance)
    setBackfillForm(initialBackfillForm)
    setBackfillOpen(true)
  }

  const openAdjustmentDialog = (balance: HrLeaveBalance) => {
    setAdjustmentTarget(balance)
    setAdjustmentForm(initialAdjustmentForm)
    setAdjustmentOpen(true)
  }

  const openReverseDialog = (adjustment: HrLeaveBalanceAdjustmentRecord) => {
    setReverseTarget(adjustment)
    setReverseForm(initialReverseForm)
    setReverseOpen(true)
  }

  const submitBackfill = async () => {
    if (!backfillTarget) return

    setBackfillSaving(true)
    setError(null)

    try {
      const input: HrLeaveBackfillInput = {
        memberId: backfillTarget.memberId,
        leaveTypeCode: backfillTarget.leaveTypeCode,
        startDate: backfillForm.startDate,
        endDate: backfillForm.endDate,
        startPeriod: backfillForm.startPeriod,
        endPeriod: backfillForm.endPeriod,
        reason: backfillForm.reason.trim(),
        notes: backfillForm.notes.trim() ? backfillForm.notes.trim() : null
      }

      const res = await fetch('/api/hr/core/leave/backfills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible registrar los días ya tomados.')
      }

      setBackfillOpen(false)
      setBackfillTarget(null)
      setBackfillForm(initialBackfillForm)
      await fetchData()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'No fue posible registrar los días ya tomados.'

      setError(message)
    } finally {
      setBackfillSaving(false)
    }
  }

  const submitAdjustment = async () => {
    if (!adjustmentTarget) return

    setAdjustmentSaving(true)
    setError(null)

    try {
      const input: HrLeaveBalanceAdjustmentInput = {
        memberId: adjustmentTarget.memberId,
        leaveTypeCode: adjustmentTarget.leaveTypeCode,
        year: adjustmentTarget.year,
        daysDelta: Number(adjustmentForm.daysDelta),
        effectiveDate: adjustmentForm.effectiveDate,
        reason: adjustmentForm.reason.trim(),
        notes: adjustmentForm.notes.trim() ? adjustmentForm.notes.trim() : null
      }

      const res = await fetch('/api/hr/core/leave/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible ajustar el saldo.')
      }

      setAdjustmentOpen(false)
      setAdjustmentTarget(null)
      setAdjustmentForm(initialAdjustmentForm)
      await fetchData()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'No fue posible ajustar el saldo.'

      setError(message)
    } finally {
      setAdjustmentSaving(false)
    }
  }

  const submitReverseAdjustment = async () => {
    if (!reverseTarget) return

    setReverseSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/core/leave/adjustments/${reverseTarget.adjustmentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reverseForm.reason.trim(),
          notes: reverseForm.notes.trim() ? reverseForm.notes.trim() : null
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible revertir el ajuste.')
      }

      setReverseOpen(false)
      setReverseTarget(null)
      setReverseForm(initialReverseForm)
      await fetchData()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'No fue posible revertir el ajuste.'

      setError(message)
    } finally {
      setReverseSaving(false)
    }
  }

  const summary = reqData?.summary ?? { total: 0, pendingSupervisor: 0, pendingHr: 0, approved: 0 }
  const requests = reqData?.requests ?? emptyRequests
  const balances = balData?.balances ?? emptyBalances
  const adjustments = adjustmentsData?.adjustments ?? emptyAdjustments
  const canSeeTeamBalances = hasHrAdminAccess || canManageLeaveAdminActions || canShowAdjustmentHistory

  const leaveTypeOrder = useMemo(
    () => new Map(leaveTypes.map((leaveType, index) => [leaveType.leaveTypeCode, index])),
    [leaveTypes]
  )

  const myBalances = useMemo(() => {
    if (hasHrAdminAccess) {
      return currentMemberId ? balances.filter(balance => balance.memberId === currentMemberId) : []
    }

    return balances
  }, [balances, currentMemberId, hasHrAdminAccess])

  const myBalancesByType = useMemo(() => buildBalancesByType(leaveTypes, myBalances), [leaveTypes, myBalances])

  const teamBalanceRows = useMemo(() => buildTeamBalanceRows(balances), [balances])

  const filteredTeamBalanceRows = useMemo(() => {
    const searchTerm = teamSearch.trim().toLowerCase()

    return teamBalanceRows.filter(row => {
      const matchesSearch =
        searchTerm.length === 0 ||
        row.memberName.toLowerCase().includes(searchTerm) ||
        row.memberId.toLowerCase().includes(searchTerm)

      if (!matchesSearch) {
        return false
      }

      switch (teamAlertFilter) {
        case 'negative':
          return row.hasNegativeBalance
        case 'reserved':
          return row.hasReservations
        case 'adjusted':
          return row.hasAdjustments
        default:
          return true
      }
    })
  }, [teamAlertFilter, teamBalanceRows, teamSearch])

  const selectedTeamBalanceRow = useMemo(
    () => teamBalanceRows.find(row => row.memberId === teamDetailMemberId) ?? null,
    [teamBalanceRows, teamDetailMemberId]
  )

  const selectedTeamAdjustments = useMemo(
    () => adjustments.filter(adjustment => adjustment.memberId === teamDetailMemberId),
    [adjustments, teamDetailMemberId]
  )

  const selectedTeamBalances = useMemo(() => {
    if (!selectedTeamBalanceRow) {
      return []
    }

    return [...selectedTeamBalanceRow.balances].sort((left, right) => {
      const leftOrder = leaveTypeOrder.get(left.leaveTypeCode) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = leaveTypeOrder.get(right.leaveTypeCode) ?? Number.MAX_SAFE_INTEGER

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }

      return left.leaveTypeName.localeCompare(right.leaveTypeName, 'es')
    })
  }, [leaveTypeOrder, selectedTeamBalanceRow])

  const teamSummary = useMemo(
    () => ({
      members: teamBalanceRows.length,
      negative: teamBalanceRows.filter(row => row.hasNegativeBalance).length,
      reserved: teamBalanceRows.filter(row => row.hasReservations).length,
      adjusted: teamBalanceRows.filter(row => row.hasAdjustments).length
    }),
    [teamBalanceRows]
  )

  const reviewCapabilities = reviewReq
    ? getLeaveReviewCapabilities({
        request: reviewReq,
        actor: { currentMemberId, hasHrAdminAccess }
      })
    : null

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={48} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Button component={Link} href='/hr' variant='tonal' color='secondary' size='small'>
            <i className='tabler-arrow-left' />
          </Button>
          <Box>
            <Typography variant='h4'>Permisos y ausencias</Typography>
            <Typography variant='body2' color='text.secondary'>
              Gestión de solicitudes de permiso
            </Typography>
          </Box>
        </Stack>
        <Button
          variant='contained'
          startIcon={<i className='tabler-calendar-plus' />}
          disabled={loading || activeLeaveTypes.length === 0}
          onClick={() => setCreateOpen(true)}
        >
          Solicitar permiso
        </Button>
      </Stack>

      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

      {/* KPI Row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total solicitudes'
            stats={String(summary.total)}
            avatarIcon='tabler-file-text'
            avatarColor='primary'
            subtitle={`Año ${filterYear}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pendiente supervisor'
            stats={String(summary.pendingSupervisor)}
            avatarIcon='tabler-user-question'
            avatarColor='warning'
            subtitle='Esperando aprobación'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pendiente HR'
            stats={String(summary.pendingHr)}
            avatarIcon='tabler-clock-pause'
            avatarColor='error'
            subtitle='En cola HR'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Aprobadas'
            stats={String(summary.approved)}
            avatarIcon='tabler-circle-check'
            avatarColor='success'
            subtitle='Procesadas exitosamente'
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <TabContext value={tab}>
        <CustomTabList onChange={(_, v) => setTab(v)} variant='scrollable'>
          <Tab value='requests' label='Solicitudes' icon={<i className='tabler-file-text' />} iconPosition='start' />
          <Tab value='calendar' label='Calendario' icon={<i className='tabler-calendar-month' />} iconPosition='start' />
          <Tab
            value='my-balances'
            label={hasHrAdminAccess ? 'Mis saldos' : 'Saldos'}
            icon={<i className='tabler-scale' />}
            iconPosition='start'
          />
          {canSeeTeamBalances && (
            <Tab
              value='team-balances'
              label='Saldos del equipo'
              icon={<i className='tabler-users-group' />}
              iconPosition='start'
            />
          )}
        </CustomTabList>

        {/* Requests Tab */}
        <TabPanel value='requests' sx={{ p: 0 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Solicitudes'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <i className='tabler-calendar-pause' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              {/* Filters */}
              <Stack direction='row' spacing={2} sx={{ mb: 3 }} flexWrap='wrap'>
                <CustomTextField
                  select
                  size='small'
                  label='Estado'
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as HrLeaveRequestStatus | '')}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {Object.entries(leaveStatusConfig).map(([key, conf]) => (
                    <MenuItem key={key} value={key}>{conf.label}</MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  size='small'
                  label='Año'
                  type='number'
                  value={filterYear}
                  onChange={e => setFilterYear(Number(e.target.value))}
                  sx={{ width: 100 }}
                />
              </Stack>

              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Colaborador</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Desde</TableCell>
                      <TableCell>Hasta</TableCell>
                      <TableCell align='center'>Días</TableCell>
                      <TableCell align='center'>Estado</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map(req => {
                      const typeConf = getLeaveTypeConfig(req.leaveTypeCode)
                      const statusConf = leaveStatusConfig[req.status]

                      const canReview = getLeaveReviewCapabilities({
                        request: req,
                        actor: { currentMemberId, hasHrAdminAccess }
                      }).canOpenReview

                      return (
                        <TableRow key={req.requestId} hover>
                          <TableCell>
                            <Stack direction='row' spacing={1.5} alignItems='center'>
                              <Avatar
                                src={req.memberAvatarUrl || undefined}
                                sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
                              >
                                {getInitials(req.memberName || '')}
                              </Avatar>
                              <Stack spacing={0.25}>
                                <Typography variant='body2' fontWeight={500}>{req.memberName}</Typography>
                                {req.sourceKind === 'admin_backfill' && (
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    icon={<i className='tabler-file-plus' />}
                                    label='Carga administrativa'
                                    color='info'
                                  />
                                )}
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <CustomChip
                              round='true'
                              size='small'
                              icon={<i className={typeConf.icon} />}
                              label={typeConf.label}
                              color={typeConf.color}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{formatDate(req.startDate)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{formatDate(req.endDate)}</Typography>
                          </TableCell>
                          <TableCell align='center'>
                            <Typography variant='body2' fontWeight={600}>{req.requestedDays}</Typography>
                          </TableCell>
                          <TableCell align='center'>
                            <CustomChip
                              round='true'
                              size='small'
                              icon={<i className={statusConf.icon} />}
                              label={statusConf.label}
                              color={statusConf.color === 'default' ? 'secondary' : statusConf.color}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {req.reason ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            {canReview && (
                              <Button
                                variant='tonal'
                                size='small'
                                color='primary'
                                onClick={() => { setReviewReq(req); setReviewNotes('') }}
                              >
                                Revisar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                          <Stack alignItems='center' spacing={1}>
                            <i className='tabler-calendar-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                            <Typography color='text.secondary'>No hay solicitudes para los filtros seleccionados.</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value='calendar' sx={{ p: 0 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Calendario operativo de ausencias'
              subheader={
                calData?.holidaySource === 'empty-fallback'
                  ? 'Feriados sin sincronizar desde Nager.Date; usando fallback vacío.'
                  : 'Permisos y feriados derivados desde el calendario operativo canónico.'
              }
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-calendar-month' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <GreenhouseCalendar
                events={calData?.events ?? []}
                initialDate={calData?.from ?? `${filterYear}-01-01`}
              />
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value='my-balances' sx={{ p: 0 }}>
          <Stack spacing={6}>
            {hasHrAdminAccess && !currentMemberId && (
              <Alert severity='info'>
                No pudimos vincular tu ficha para mostrar tus saldos personales. Tu vista del equipo sigue disponible para gestionar permisos.
              </Alert>
            )}

            <Grid container spacing={6}>
              {myBalancesByType.map(bt => {
                const conf = getLeaveTypeConfig(bt.leaveTypeCode)

                const gaugeOptions: ApexOptions = {
                  chart: { parentHeightOffset: 0, sparkline: { enabled: true } },
                  plotOptions: {
                    radialBar: {
                      hollow: { size: '60%' },
                      track: { background: 'var(--mui-palette-action-hover)' },
                      dataLabels: {
                        name: { show: false },
                        value: {
                          show: true,
                          fontSize: '18px',
                          fontWeight: 600,
                          offsetY: 6,
                          formatter: () => `${bt.totalAvailable}`
                        }
                      }
                    }
                  },
                  colors: [theme.palette[conf.color]?.main ?? theme.palette.primary.main]
                }

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={bt.leaveTypeCode}>
                    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                      <CardContent>
                        <Stack alignItems='center' spacing={1}>
                          <CustomChip
                            round='true'
                            size='small'
                            icon={<i className={conf.icon} />}
                            label={conf.label}
                            color={conf.color}
                          />
                          <AppReactApexCharts
                            type='radialBar'
                            height={150}
                            options={gaugeOptions}
                            series={[bt.totalAllowance > 0 ? Math.min(100, Math.round(((bt.totalAllowance - bt.totalUsed) / bt.totalAllowance) * 100)) : 0]}
                          />
                          <Typography variant='body2' color='text.secondary'>
                            {bt.totalUsed} usados de {bt.totalAllowance}
                          </Typography>
                          <Typography variant='caption' color='text.disabled'>
                            {bt.totalAvailable} días disponibles
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
              {myBalancesByType.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                    <CardContent sx={{ py: 6, textAlign: 'center' }}>
                      <Stack alignItems='center' spacing={1}>
                        <i className='tabler-scale' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography color='text.secondary'>No hay saldos personales para mostrar.</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Detalle de mis saldos'
                subheader='Tu disponibilidad actual por tipo de permiso.'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                    <i className='tabler-table' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <CardContent>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Política</TableCell>
                        <TableCell align='center'>Año</TableCell>
                        <TableCell align='center'>Asignados</TableCell>
                        <TableCell align='center'>Usados</TableCell>
                        <TableCell align='center'>Reservados</TableCell>
                        <TableCell align='center'>Ajustes</TableCell>
                        <TableCell align='center'>Disponibles</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myBalances.map(balance => {
                        const conf = getLeaveTypeConfig(balance.leaveTypeCode)

                        return (
                          <TableRow key={balance.balanceId} hover>
                            <TableCell>
                              <CustomChip
                                round='true'
                                size='small'
                                icon={<i className={conf.icon} />}
                                label={conf.label}
                                color={conf.color}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' color='text.secondary'>
                                {balance.policyExplain
                                  ? formatPolicyExplainLabel(balance.policyExplain)
                                  : 'Regla estándar de permisos'}
                              </Typography>
                            </TableCell>
                            <TableCell align='center'>{balance.year}</TableCell>
                            <TableCell align='center'>{balance.allowanceDays}</TableCell>
                            <TableCell align='center'>{balance.usedDays}</TableCell>
                            <TableCell align='center'>{balance.reservedDays}</TableCell>
                            <TableCell align='center'>{balance.adjustmentDays ?? 0}</TableCell>
                            <TableCell align='center'>
                              <Typography variant='body2' fontWeight={600}>
                                {balance.availableDays}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {myBalances.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                            <Stack alignItems='center' spacing={1}>
                              <i className='tabler-scale' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                              <Typography color='text.secondary'>No hay saldos personales para mostrar.</Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {canSeeTeamBalances && (
          <TabPanel value='team-balances' sx={{ p: 0 }}>
            <Stack spacing={6}>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title='Colaboradores visibles'
                    stats={String(teamSummary.members)}
                    avatarIcon='tabler-users-group'
                    avatarColor='primary'
                    subtitle='Roster operativo de permisos'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title='Saldo negativo'
                    stats={String(teamSummary.negative)}
                    avatarIcon='tabler-alert-triangle'
                    avatarColor='error'
                    subtitle='Disponibilidad que revisar'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title='Con reservas'
                    stats={String(teamSummary.reserved)}
                    avatarIcon='tabler-calendar-clock'
                    avatarColor='warning'
                    subtitle='Permisos ya comprometidos'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title='Con ajustes'
                    stats={String(teamSummary.adjusted)}
                    avatarIcon='tabler-history'
                    avatarColor='success'
                    subtitle='Cambios manuales este año'
                  />
                </Grid>
              </Grid>

              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                <CardHeader
                  title='Saldos del equipo'
                  subheader='Consulta disponibilidad, reservas y ajustes por colaborador.'
                  avatar={
                    <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                      <i className='tabler-users-group' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                    </Avatar>
                  }
                />
                <Divider />
                <CardContent>
                  {adjustmentsError && canShowAdjustmentHistory && (
                    <Alert severity='warning' sx={{ mb: 3 }}>
                      {adjustmentsError}
                    </Alert>
                  )}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                    <CustomTextField
                      size='small'
                      label='Buscar colaborador'
                      value={teamSearch}
                      onChange={e => setTeamSearch(e.target.value)}
                      placeholder='Nombre o member id'
                      sx={{ minWidth: { xs: '100%', md: 280 } }}
                    />
                    <CustomTextField
                      select
                      size='small'
                      label='Alertas'
                      value={teamAlertFilter}
                      onChange={e => setTeamAlertFilter(e.target.value as 'all' | 'negative' | 'reserved' | 'adjusted')}
                      sx={{ minWidth: { xs: '100%', md: 220 } }}
                    >
                      <MenuItem value='all'>Todas</MenuItem>
                      <MenuItem value='negative'>Saldo negativo</MenuItem>
                      <MenuItem value='reserved'>Con reservas</MenuItem>
                      <MenuItem value='adjusted'>Con ajustes</MenuItem>
                    </CustomTextField>
                  </Stack>

                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Colaborador</TableCell>
                          <TableCell>Política vacaciones</TableCell>
                          <TableCell align='center'>Disponibles</TableCell>
                          <TableCell align='center'>Reservadas</TableCell>
                          <TableCell align='center'>Ajustes</TableCell>
                          <TableCell>Alertas</TableCell>
                          <TableCell align='right'>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredTeamBalanceRows.map(row => {
                          const alerts = getTeamAlertLabels(row)

                          return (
                            <TableRow key={row.memberId} hover>
                              <TableCell>
                                <Stack direction='row' spacing={1.5} alignItems='center'>
                                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                                    {getInitials(row.memberName)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant='body2' fontWeight={600}>
                                      {row.memberName}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      {row.memberId}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant='body2'>{row.policyLabel}</Typography>
                                  <Typography variant='caption' color='text.secondary'>
                                    {row.balances.length} tipo{row.balances.length === 1 ? '' : 's'} disponible{row.balances.length === 1 ? '' : 's'}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align='center'>{row.availableDays ?? '—'}</TableCell>
                              <TableCell align='center'>{row.reservedDays ?? '—'}</TableCell>
                              <TableCell align='center'>{row.adjustmentDays ?? '—'}</TableCell>
                              <TableCell>
                                <Stack direction='row' spacing={1} flexWrap='wrap'>
                                  {alerts.length > 0 ? (
                                    alerts.map(alertLabel => (
                                      <CustomChip
                                        key={alertLabel}
                                        round='true'
                                        size='small'
                                        color={
                                          alertLabel === 'Saldo negativo'
                                            ? 'error'
                                            : alertLabel === 'Con reservas'
                                              ? 'warning'
                                              : 'info'
                                        }
                                        label={alertLabel}
                                      />
                                    ))
                                  ) : (
                                    <Typography variant='caption' color='text.secondary'>
                                      Sin alertas
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell align='right'>
                                <Button variant='tonal' size='small' onClick={() => setTeamDetailMemberId(row.memberId)}>
                                  Ver detalle
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {filteredTeamBalanceRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                              <Stack alignItems='center' spacing={1}>
                                <i className='tabler-users-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                                <Typography color='text.secondary'>
                                  {teamSearch || teamAlertFilter !== 'all'
                                    ? 'No encontramos colaboradores para esos filtros.'
                                    : 'No hay saldos del equipo para mostrar todavía.'}
                                </Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Stack>
          </TabPanel>
        )}
      </TabContext>

      <Dialog
        open={!!selectedTeamBalanceRow}
        onClose={() => setTeamDetailMemberId(null)}
        maxWidth='lg'
        fullWidth
        closeAfterTransition={false}
      >
        {selectedTeamBalanceRow && (
          <>
            <DialogTitle>
              <Stack spacing={0.5}>
                <Typography variant='h5'>{selectedTeamBalanceRow.memberName}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Revisión administrativa de saldos, reservas y ajustes por tipo de permiso.
                </Typography>
              </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent>
              <Stack spacing={4} sx={{ mt: 1 }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }}>
                      <CardContent>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          Identificador
                        </Typography>
                        <Typography variant='body1' fontWeight={600} sx={{ mt: 0.5 }}>
                          {selectedTeamBalanceRow.memberId}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block', textTransform: 'uppercase' }}>
                          Política visible
                        </Typography>
                        <Typography variant='body2' sx={{ mt: 0.5 }}>
                          {selectedTeamBalanceRow.policyLabel}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                          <CardContent>
                            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                              Días disponibles
                            </Typography>
                            <Typography variant='h4' sx={{ mt: 1 }}>
                              {selectedTeamBalanceRow.availableDays ?? '—'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                          <CardContent>
                            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                              Días reservados
                            </Typography>
                            <Typography variant='h4' sx={{ mt: 1 }}>
                              {selectedTeamBalanceRow.reservedDays ?? '—'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                          <CardContent>
                            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                              Ajustes netos
                            </Typography>
                            <Typography variant='h4' sx={{ mt: 1 }}>
                              {selectedTeamBalanceRow.adjustmentDays ?? '—'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <CardHeader
                    title='Detalle por tipo de permiso'
                    subheader='Desde aquí puedes revisar disponibilidad y operar acciones administrativas sin perder el contexto.'
                  />
                  <Divider />
                  <CardContent>
                    <TableContainer>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Política</TableCell>
                            <TableCell align='center'>Año</TableCell>
                            <TableCell align='center'>Asignados</TableCell>
                            <TableCell align='center'>Usados</TableCell>
                            <TableCell align='center'>Reservados</TableCell>
                            <TableCell align='center'>Ajustes</TableCell>
                            <TableCell align='center'>Disponibles</TableCell>
                            <TableCell align='right'>Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedTeamBalances.map(balance => {
                            const conf = getLeaveTypeConfig(balance.leaveTypeCode)

                            return (
                              <TableRow key={balance.balanceId} hover>
                                <TableCell>
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    icon={<i className={conf.icon} />}
                                    label={conf.label}
                                    color={conf.color}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant='body2' color='text.secondary'>
                                    {balance.policyExplain
                                      ? formatPolicyExplainLabel(balance.policyExplain)
                                      : 'Regla estándar de permisos'}
                                  </Typography>
                                </TableCell>
                                <TableCell align='center'>{balance.year}</TableCell>
                                <TableCell align='center'>{balance.allowanceDays}</TableCell>
                                <TableCell align='center'>{balance.usedDays}</TableCell>
                                <TableCell align='center'>{balance.reservedDays}</TableCell>
                                <TableCell align='center'>{balance.adjustmentDays ?? 0}</TableCell>
                                <TableCell align='center'>
                                  <Typography variant='body2' fontWeight={600}>
                                    {balance.availableDays}
                                  </Typography>
                                </TableCell>
                                <TableCell align='right'>
                                  <Stack
                                    direction={{ xs: 'column', lg: 'row' }}
                                    spacing={1}
                                    justifyContent='flex-end'
                                    alignItems={{ lg: 'center' }}
                                  >
                                    {canManageLeaveBackfills && (
                                      <Button
                                        variant='tonal'
                                        size='small'
                                        onClick={() => {
                                          setTeamDetailMemberId(null)
                                          openBackfillDialog(balance)
                                        }}
                                      >
                                        Registrar días ya tomados
                                      </Button>
                                    )}
                                    {canManageLeaveAdjustments && (
                                      <Button
                                        variant='tonal'
                                        size='small'
                                        color='secondary'
                                        onClick={() => {
                                          setTeamDetailMemberId(null)
                                          openAdjustmentDialog(balance)
                                        }}
                                      >
                                        Ajustar saldo
                                      </Button>
                                    )}
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {canShowAdjustmentHistory && (
                  <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                    <CardHeader
                      title='Historial de ajustes'
                      subheader='Trazabilidad de cambios manuales y reversiones para este colaborador.'
                    />
                    <Divider />
                    <CardContent>
                      {selectedTeamAdjustments.length > 0 ? (
                        <TableContainer>
                          <Table size='small'>
                            <TableHead>
                              <TableRow>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Fecha efectiva</TableCell>
                                <TableCell align='center'>Delta</TableCell>
                                <TableCell>Motivo</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell align='right'>Acciones</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedTeamAdjustments.map(adjustment => {
                                const conf = getLeaveTypeConfig(adjustment.leaveTypeCode)
                                const isReversed = Boolean(adjustment.reversedAt)

                                const canReverseAdjustment =
                                  canReverseLeaveAdjustments &&
                                  adjustment.sourceKind === 'manual_adjustment' &&
                                  !isReversed

                                return (
                                  <TableRow key={adjustment.adjustmentId} hover>
                                    <TableCell>
                                      <CustomChip
                                        round='true'
                                        size='small'
                                        icon={<i className={conf.icon} />}
                                        label={conf.label}
                                        color={conf.color}
                                      />
                                    </TableCell>
                                    <TableCell>{formatDate(adjustment.effectiveDate)}</TableCell>
                                    <TableCell align='center'>
                                      <Typography variant='body2' fontWeight={600}>
                                        {adjustment.daysDelta > 0 ? `+${adjustment.daysDelta}` : adjustment.daysDelta}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Stack spacing={0.25}>
                                        <Typography variant='body2'>{adjustment.reason}</Typography>
                                        {adjustment.notes && (
                                          <Typography variant='caption' color='text.secondary'>
                                            {adjustment.notes}
                                          </Typography>
                                        )}
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <CustomChip
                                        round='true'
                                        size='small'
                                        color={isReversed ? 'secondary' : 'success'}
                                        label={isReversed ? 'Revertido' : 'Activo'}
                                      />
                                    </TableCell>
                                    <TableCell align='right'>
                                      {canReverseAdjustment && (
                                        <Button
                                          variant='tonal'
                                          size='small'
                                          color='warning'
                                          onClick={() => {
                                            setTeamDetailMemberId(null)
                                            openReverseDialog(adjustment)
                                          }}
                                        >
                                          Revertir
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Stack alignItems='center' spacing={1} sx={{ py: 4 }}>
                          <i className='tabler-history-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                          <Typography color='text.secondary'>
                            No hay ajustes manuales registrados para este colaborador.
                          </Typography>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button variant='tonal' color='secondary' onClick={() => setTeamDetailMemberId(null)}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <LeaveRequestDialog
        open={createOpen}
        saving={createSaving}
        leaveTypes={leaveTypes}
        ownerMemberId={currentMemberId}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Review Dialog */}
      <Dialog
        open={!!reviewReq}
        onClose={() => !reviewSaving && setReviewReq(null)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Revisar solicitud</DialogTitle>
        <Divider />
        {reviewReq && (
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar src={reviewReq.memberAvatarUrl || undefined} sx={{ width: 40, height: 40 }}>
                  {getInitials(reviewReq.memberName || '')}
                </Avatar>
                <Box>
                  <Typography variant='subtitle1' fontWeight={600}>{reviewReq.memberName}</Typography>
                  <CustomChip
                    round='true'
                    size='small'
                    icon={<i className={getLeaveTypeConfig(reviewReq.leaveTypeCode).icon} />}
                    label={getLeaveTypeConfig(reviewReq.leaveTypeCode).label}
                    color={getLeaveTypeConfig(reviewReq.leaveTypeCode).color}
                  />
                </Box>
              </Stack>

              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Desde</Typography>
                      <Typography variant='body2' fontWeight={500}>{formatDate(reviewReq.startDate)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Hasta</Typography>
                      <Typography variant='body2' fontWeight={500}>{formatDate(reviewReq.endDate)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Días</Typography>
                      <Typography variant='body2' fontWeight={600}>{reviewReq.requestedDays}</Typography>
                    </Grid>
                  </Grid>
                  {reviewReq.reason && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Motivo</Typography>
                      <Typography variant='body2'>{reviewReq.reason}</Typography>
                    </Box>
                  )}
                  {reviewReq.attachmentUrl && (
                    <Box sx={{ mt: 2.5, pt: 2.5, borderTop: theme => `1px solid ${theme.palette.divider}` }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                        Respaldo adjunto
                      </Typography>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        justifyContent='space-between'
                        alignItems={{ sm: 'center' }}
                        sx={{ mt: 1 }}
                      >
                        <Typography variant='body2' color='text.secondary'>
                          Esta solicitud incluye un documento de respaldo listo para revisión.
                        </Typography>
                        <Button
                          component='a'
                          href={reviewReq.attachmentUrl}
                          target='_blank'
                          rel='noreferrer'
                          variant='tonal'
                          size='small'
                          startIcon={<i className='tabler-paperclip' />}
                        >
                          Abrir respaldo
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <CustomTextField
                fullWidth
                size='small'
                label='Notas (opcional)'
                multiline
                rows={2}
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setReviewReq(null)} disabled={reviewSaving}>
            Cerrar
          </Button>
          {reviewCapabilities?.canCancel && (
            <Button
              variant='tonal'
              color='warning'
              onClick={() => void handleReview('cancel')}
              disabled={reviewSaving}
              startIcon={<i className='tabler-ban' />}
            >
              Cancelar solicitud
            </Button>
          )}
          {reviewCapabilities?.canReject && (
            <Button
              variant='contained'
              color='error'
              onClick={() => void handleReview('reject')}
              disabled={reviewSaving}
              startIcon={<i className='tabler-circle-x' />}
            >
              Rechazar
            </Button>
          )}
          {reviewCapabilities?.canApprove && (
            <Button
              variant='contained'
              color='success'
              onClick={() => void handleReview('approve')}
              disabled={reviewSaving}
              startIcon={<i className='tabler-circle-check' />}
            >
              Aprobar
            </Button>
          )}
          </DialogActions>
      </Dialog>

      <Dialog
        open={backfillOpen}
        onClose={() => !backfillSaving && setBackfillOpen(false)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Registrar días ya tomados</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity='info'>
              Se registrará una solicitud aprobada para {backfillTarget?.memberName || backfillTarget?.memberId} en {backfillYear}.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Desde'
                  type='date'
                  value={backfillForm.startDate}
                  onChange={e => setBackfillForm(current => ({ ...current, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Hasta'
                  type='date'
                  value={backfillForm.endDate}
                  onChange={e => setBackfillForm(current => ({ ...current, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  select
                  size='small'
                  label='Inicio del periodo'
                  value={backfillForm.startPeriod}
                  onChange={e => setBackfillForm(current => ({ ...current, startPeriod: e.target.value as LeaveDayPeriod }))}
                >
                  <MenuItem value='full_day'>Día completo</MenuItem>
                  <MenuItem value='morning'>Mañana</MenuItem>
                  <MenuItem value='afternoon'>Tarde</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  select
                  size='small'
                  label='Fin del periodo'
                  value={backfillForm.endPeriod}
                  onChange={e => setBackfillForm(current => ({ ...current, endPeriod: e.target.value as LeaveDayPeriod }))}
                >
                  <MenuItem value='full_day'>Día completo</MenuItem>
                  <MenuItem value='morning'>Mañana</MenuItem>
                  <MenuItem value='afternoon'>Tarde</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Motivo'
                  value={backfillForm.reason}
                  onChange={e => setBackfillForm(current => ({ ...current, reason: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Notas'
                  value={backfillForm.notes}
                  onChange={e => setBackfillForm(current => ({ ...current, notes: e.target.value }))}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setBackfillOpen(false)} disabled={backfillSaving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={() => void submitBackfill()}
            disabled={backfillSaving || !backfillForm.startDate || !backfillForm.endDate || !backfillForm.reason.trim()}
            startIcon={<i className='tabler-clipboard-plus' />}
          >
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={adjustmentOpen}
        onClose={() => !adjustmentSaving && setAdjustmentOpen(false)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Ajustar saldo</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity='info'>
              Ajuste para {adjustmentTarget?.memberName || adjustmentTarget?.memberId} en {adjustmentYear}.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Delta días'
                  type='number'
                  inputProps={{ step: '0.5' }}
                  value={adjustmentForm.daysDelta}
                  onChange={e => setAdjustmentForm(current => ({ ...current, daysDelta: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Fecha efectiva'
                  type='date'
                  value={adjustmentForm.effectiveDate}
                  onChange={e => setAdjustmentForm(current => ({ ...current, effectiveDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Motivo'
                  value={adjustmentForm.reason}
                  onChange={e => setAdjustmentForm(current => ({ ...current, reason: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Notas'
                  value={adjustmentForm.notes}
                  onChange={e => setAdjustmentForm(current => ({ ...current, notes: e.target.value }))}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setAdjustmentOpen(false)} disabled={adjustmentSaving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={() => void submitAdjustment()}
            disabled={adjustmentSaving || adjustmentForm.daysDelta.trim() === '' || !adjustmentForm.effectiveDate || !adjustmentForm.reason.trim()}
            startIcon={<i className='tabler-adjustments' />}
          >
            Guardar ajuste
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reverseOpen}
        onClose={() => !reverseSaving && setReverseOpen(false)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Revertir ajuste</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity='warning'>
              Esta acción revierte {(reverseTarget?.daysDelta ?? 0) > 0 ? `+${reverseTarget?.daysDelta}` : reverseTarget?.daysDelta} días para{' '}
              {reverseTarget?.memberName || reverseTarget?.memberId}.
            </Alert>
            <CustomTextField
              fullWidth
              size='small'
              label='Motivo de la reversión'
              value={reverseForm.reason}
              onChange={e => setReverseForm(current => ({ ...current, reason: e.target.value }))}
            />
            <CustomTextField
              fullWidth
              size='small'
              label='Notas'
              value={reverseForm.notes}
              onChange={e => setReverseForm(current => ({ ...current, notes: e.target.value }))}
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setReverseOpen(false)} disabled={reverseSaving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='warning'
            onClick={() => void submitReverseAdjustment()}
            disabled={reverseSaving || !reverseForm.reason.trim()}
            startIcon={<i className='tabler-restore' />}
          >
            Confirmar reversión
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default HrLeaveView
