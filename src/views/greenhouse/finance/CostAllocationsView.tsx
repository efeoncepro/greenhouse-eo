'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import dynamic from 'next/dynamic'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { TabContext, TabPanel } from '@mui/lab'
import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import type { ApexOptions } from 'apexcharts'
import classnames from 'classnames'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommercialCostAttributionHealthSummary {
  periodYear: number
  periodMonth: number
  allocationCount: number
  memberCount: number
  clientCount: number
  membersWithCommercialAttribution: number
  membersWithInternalLoad: number
  totalBaseLaborCostTarget: number
  totalCommercialLaborCostTarget: number
  totalInternalOperationalCostTarget: number
  totalCommercialLoadedCostTarget: number
  totalAttributedOverheadTarget: number
  unexplainedLaborDeltaTarget: number
  healthy: boolean
}

interface ClientRow {
  clientId: string
  organizationId: string
  clientName: string
  laborCostClp: number
  overheadCostClp: number
  loadedCostClp: number
  headcountFte: number
  memberCount: number
  /** TASK-708: expense_direct_client (cargos directos a este cliente) */
  expenseDirectClientClp?: number
  /** TASK-708: expense_direct_member_via_fte (cargos a miembros prorrateados aquí) */
  expenseDirectMemberViaFteClp?: number
}

interface CostAttributionV2Coverage {
  hasLaborData: boolean
  hasDirectClientData: boolean
  hasDirectMemberViaFteData: boolean
}

interface ExplainMember {
  memberId: string
  fteContribution: number
  allocationRatio: number
  commercialLaborCostTarget: number
  commercialDirectOverheadTarget: number
  commercialSharedOverheadTarget: number
  commercialLoadedCostTarget: number
  sourceOfTruth: string
  ruleVersion: string
}

interface CommercialCostAttributionClientExplain {
  periodYear: number
  periodMonth: number
  clientId: string
  clientName: string
  memberCount: number
  headcountFte: number
  commercialLaborCostTarget: number
  commercialDirectOverheadTarget: number
  commercialSharedOverheadTarget: number
  commercialLoadedCostTarget: number
  sourceOfTruths: string[]
  ruleVersions: string[]
  members: ExplainMember[]
}

interface Allocation {
  allocationId: string
  expenseId: string
  clientId: string
  clientName: string
  allocationPercent: number
  allocatedAmountClp: number
  periodYear: number
  periodMonth: number
  allocationMethod: string
  notes: string | null
  createdAt: string | null
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const MONTHS = GREENHOUSE_COPY.months.long

const METHOD_LABELS: Record<string, string> = {
  manual: 'Manual',
  fte_proportional: 'Proporcional FTE',
  revenue_proportional: 'Proporcional Revenue',
  equal_split: 'Division equitativa'
}

const formatClp = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)

const formatClpShort = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

// ---------------------------------------------------------------------------
// Drill-down sub-component
// ---------------------------------------------------------------------------

const ClientDrillDown = ({
  data,
  loading
}: {
  data: CommercialCostAttributionClientExplain | null
  loading: boolean
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!data) return null

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      {/* Stat boxes */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 160, p: 2, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
          <Typography variant='h5'>{data.headcountFte.toFixed(1)}</Typography>
          <Typography variant='caption' color='text.secondary'>FTE total</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 160, p: 2, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
          <Typography variant='h5'>{formatClp(data.commercialLaborCostTarget)}</Typography>
          <Typography variant='caption' color='text.secondary'>Costo laboral</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 160, p: 2, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
          <Typography variant='h5'>{formatClp(data.commercialLoadedCostTarget)}</Typography>
          <Typography variant='caption' color='text.secondary'>Costo cargado</Typography>
        </Box>
      </Box>

      {/* Member table */}
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Miembro</TableCell>
              <TableCell align='right'>FTE</TableCell>
              <TableCell align='right'>Asignacion %</TableCell>
              <TableCell align='right'>Laboral</TableCell>
              <TableCell align='right'>OH directo</TableCell>
              <TableCell align='right'>OH compartido</TableCell>
              <TableCell align='right'>Costo cargado</TableCell>
              <TableCell align='center'>Fuente</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.members.map(m => (
              <TableRow key={m.memberId}>
                <TableCell>
                  <Typography variant='body2' sx={{ fontSize: '0.75rem' }}>
                    {m.memberId}
                  </Typography>
                </TableCell>
                <TableCell align='right'>{m.fteContribution.toFixed(3)}</TableCell>
                <TableCell align='right'>{(m.allocationRatio * 100).toFixed(1)}%</TableCell>
                <TableCell align='right'>{formatClp(m.commercialLaborCostTarget)}</TableCell>
                <TableCell align='right'>{formatClp(m.commercialDirectOverheadTarget)}</TableCell>
                <TableCell align='right'>{formatClp(m.commercialSharedOverheadTarget)}</TableCell>
                <TableCell align='right'>
                  <Typography variant='body2' fontWeight={600}>
                    {formatClp(m.commercialLoadedCostTarget)}
                  </Typography>
                </TableCell>
                <TableCell align='center'>
                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label={m.sourceOfTruth} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CostAllocationsView = () => {
  const now = new Date()
  const theme = useTheme()
  const mode = theme.palette.mode

  // Shared period state
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Tab state
  const [tab, setTab] = useState<'attribution' | 'overrides'>('attribution')

  // Tab 1 — Attribution state
  const [healthData, setHealthData] = useState<CommercialCostAttributionHealthSummary | null>(null)
  const [prevHealthData, setPrevHealthData] = useState<CommercialCostAttributionHealthSummary | null>(null)
  const [clientRows, setClientRows] = useState<ClientRow[]>([])
  const [v2Coverage, setV2Coverage] = useState<CostAttributionV2Coverage | null>(null)
  const [attributionLoading, setAttributionLoading] = useState(false)
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [clientExplainCache, setClientExplainCache] = useState<Record<string, CommercialCostAttributionClientExplain | null>>({})
  const [explainLoading, setExplainLoading] = useState(false)
  const [clientSorting, setClientSorting] = useState<SortingState>([{ id: 'loadedCostClp', desc: true }])

  // Tab 2 — Overrides (existing CRUD) state
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [overridesLoading, setOverridesLoading] = useState(false)
  const [overridesLoaded, setOverridesLoaded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allocSorting, setAllocSorting] = useState<SortingState>([])

  // Form state (Tab 2)
  const [formExpenseId, setFormExpenseId] = useState('')
  const [formClientId, setFormClientId] = useState('')
  const [formClientName, setFormClientName] = useState('')
  const [formPercent, setFormPercent] = useState('100')
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState('manual')
  const [formNotes, setFormNotes] = useState('')

  // ---------------------------------------------------------------------------
  // Tab 1 data fetch
  // ---------------------------------------------------------------------------

  const loadAttribution = useCallback(async () => {
    setAttributionLoading(true)
    setExpandedClientId(null)
    setClientExplainCache({})

    try {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year

      const [healthRes, clientsRes, v2Res, prevHealthRes] = await Promise.all([
        fetch(`/api/cost-intelligence/commercial-cost-attribution/health?year=${year}&month=${month}`),
        fetch(`/api/cost-intelligence/commercial-cost-attribution/by-client?year=${year}&month=${month}`),
        fetch(`/api/cost-intelligence/commercial-cost-attribution/by-client-v2?year=${year}&month=${month}`),
        fetch(`/api/cost-intelligence/commercial-cost-attribution/health?year=${prevYear}&month=${prevMonth}`)
      ])

      if (healthRes.ok) {
        setHealthData(await healthRes.json())
      }

      if (prevHealthRes.ok) {
        setPrevHealthData(await prevHealthRes.json())
      } else {
        setPrevHealthData(null)
      }

      // V1 (labor allocation source-of-truth) — merged with V2 (TASK-708)
      // for completeness. V2 brings expense_direct_client +
      // expense_direct_member_via_fte dimensions ignored by V1.
      const v1Clients: ClientRow[] = clientsRes.ok ? (await clientsRes.json()).clients || [] : []

      if (v2Res.ok) {
        const v2Data = await v2Res.json() as {
          clients: Array<{
            clientId: string
            clientName: string
            totalClp: number
            byDimension: { labor: number; expenseDirectClient: number; expenseDirectMemberViaFte: number }
          }>
          coverage: CostAttributionV2Coverage
        }

        setV2Coverage(v2Data.coverage)

        // Merge: enrich V1 rows with V2 expense dimensions (matching by clientId)
        // and add V2-only clients that V1 didn't see (e.g. clients with only
        // expense_direct attribution but no labor allocation yet).
        const merged = new Map<string, ClientRow>()

        for (const v1 of v1Clients) {
          merged.set(v1.clientId, { ...v1 })
        }

        for (const v2 of v2Data.clients) {
          const existing = merged.get(v2.clientId)
          const directExpenses = v2.byDimension.expenseDirectClient + v2.byDimension.expenseDirectMemberViaFte

          if (existing) {
            existing.expenseDirectClientClp = v2.byDimension.expenseDirectClient
            existing.expenseDirectMemberViaFteClp = v2.byDimension.expenseDirectMemberViaFte
            existing.loadedCostClp = (existing.loadedCostClp || 0) + directExpenses

            // Prefer canonical name from v2 (greenhouse_core.clients) when available
            if (v2.clientName && v2.clientName !== v2.clientId) {
              existing.clientName = v2.clientName
            }
          } else {
            merged.set(v2.clientId, {
              clientId: v2.clientId,
              organizationId: '',
              clientName: v2.clientName || v2.clientId,
              laborCostClp: v2.byDimension.labor,
              overheadCostClp: 0,
              loadedCostClp: v2.totalClp,
              headcountFte: 0,
              memberCount: 0,
              expenseDirectClientClp: v2.byDimension.expenseDirectClient,
              expenseDirectMemberViaFteClp: v2.byDimension.expenseDirectMemberViaFte
            })
          }
        }

        setClientRows(Array.from(merged.values()).sort((a, b) => b.loadedCostClp - a.loadedCostClp))
      } else {
        setClientRows(v1Clients)
        setV2Coverage(null)
      }
    } catch {
      // Non-blocking
    } finally {
      setAttributionLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    void loadAttribution()
  }, [loadAttribution])

  // ---------------------------------------------------------------------------
  // Tab 2 lazy load
  // ---------------------------------------------------------------------------

  const loadOverrides = useCallback(async () => {
    setOverridesLoading(true)

    try {
      const res = await fetch(`/api/finance/intelligence/allocations?year=${year}&month=${month}`)

      if (res.ok) {
        const data = await res.json()

        setAllocations(data.items || [])
      }
    } catch {
      // Non-blocking
    } finally {
      setOverridesLoading(false)
      setOverridesLoaded(true)
    }
  }, [year, month])

  useEffect(() => {
    if (tab === 'overrides' && !overridesLoaded) {
      void loadOverrides()
    }
  }, [tab, overridesLoaded, loadOverrides])

  // Reset overrides loaded flag when period changes
  useEffect(() => {
    setOverridesLoaded(false)
  }, [year, month])

  // ---------------------------------------------------------------------------
  // Drill-down fetch
  // ---------------------------------------------------------------------------

  const fetchExplain = useCallback(async (clientId: string) => {
    if (clientExplainCache[clientId] !== undefined) return

    setExplainLoading(true)

    try {
      const res = await fetch(`/api/cost-intelligence/commercial-cost-attribution/explain/${year}/${month}/${clientId}`)

      if (res.ok) {
        const data: CommercialCostAttributionClientExplain = await res.json()

        setClientExplainCache(prev => ({ ...prev, [clientId]: data }))
      } else {
        setClientExplainCache(prev => ({ ...prev, [clientId]: null }))
      }
    } catch {
      setClientExplainCache(prev => ({ ...prev, [clientId]: null }))
    } finally {
      setExplainLoading(false)
    }
  }, [year, month, clientExplainCache])

  const handleToggleExpand = useCallback((clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null)
    } else {
      setExpandedClientId(clientId)
      void fetchExplain(clientId)
    }
  }, [expandedClientId, fetchExplain])

  // ---------------------------------------------------------------------------
  // Tab 2 CRUD
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/finance/intelligence/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: formExpenseId,
          clientId: formClientId,
          clientName: formClientName,
          allocationPercent: Number(formPercent) / 100,
          allocatedAmountClp: Number(formAmount),
          periodYear: year,
          periodMonth: month,
          allocationMethod: formMethod,
          notes: formNotes || null
        })
      })

      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        void loadOverrides()
      }
    } catch {
      // Non-blocking
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (allocationId: string) => {
    try {
      await fetch(`/api/finance/intelligence/allocations?allocationId=${allocationId}`, { method: 'DELETE' })
      void loadOverrides()
    } catch {
      // Non-blocking
    }
  }

  const resetForm = () => {
    setFormExpenseId('')
    setFormClientId('')
    setFormClientName('')
    setFormPercent('100')
    setFormAmount('')
    setFormMethod('manual')
    setFormNotes('')
  }

  // ---------------------------------------------------------------------------
  // Tab 1 — Client TanStack table
  // ---------------------------------------------------------------------------

  const clientColumnHelper = createColumnHelper<ClientRow>()

   
  const clientColumns: ColumnDef<ClientRow, any>[] = useMemo(() => [
    clientColumnHelper.accessor('clientName', {
      header: 'Cliente',
      cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
    }),
    clientColumnHelper.accessor('headcountFte', {
      header: 'FTE',
      cell: ({ getValue }) => (getValue() as number).toFixed(1),
      meta: { align: 'center' }
    }),
    clientColumnHelper.accessor('memberCount', {
      header: 'Personas',
      cell: ({ getValue }) => getValue(),
      meta: { align: 'center' }
    }),
    clientColumnHelper.accessor('laborCostClp', {
      header: 'Costo laboral',
      cell: ({ getValue }) => formatClp(getValue() as number),
      meta: { align: 'right' }
    }),
    clientColumnHelper.accessor('overheadCostClp', {
      header: 'Overhead',
      cell: ({ getValue }) => formatClp(getValue() as number),
      meta: { align: 'right' }
    }),
    clientColumnHelper.accessor('loadedCostClp', {
      header: 'Costo cargado',
      cell: ({ getValue }) => (
        <Typography variant='body2' fontWeight={600}>{formatClp(getValue() as number)}</Typography>
      ),
      meta: { align: 'right' }
    }),
    {
      id: 'expand',
      header: '',
      cell: ({ row }: { row: { original: ClientRow } }) => (
        <IconButton size='small' onClick={() => handleToggleExpand(row.original.clientId)}>
          <i className={expandedClientId === row.original.clientId ? 'tabler-chevron-up' : 'tabler-chevron-down'} />
        </IconButton>
      ),
      enableSorting: false,
      meta: { align: 'center' }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [expandedClientId])

  const clientTable = useReactTable({
    data: clientRows,
    columns: clientColumns,
    state: { sorting: clientSorting },
    onSortingChange: setClientSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  // ---------------------------------------------------------------------------
  // Tab 2 — Allocation TanStack table (existing)
  // ---------------------------------------------------------------------------

  const allocColumnHelper = createColumnHelper<Allocation>()

   
  const allocColumns: ColumnDef<Allocation, any>[] = [
    allocColumnHelper.accessor('clientName', { header: 'Cliente', cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography> }),
    allocColumnHelper.accessor('expenseId', { header: 'Expense ID', cell: ({ getValue }) => <Typography variant='body2' sx={{ fontSize: '0.75rem' }}>{getValue().slice(0, 12)}...</Typography> }),
    allocColumnHelper.accessor('allocationMethod', { header: 'Metodo', cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color='info' label={METHOD_LABELS[getValue()] || getValue()} />, meta: { align: 'center' } }),
    allocColumnHelper.accessor('allocationPercent', { header: '%', cell: ({ getValue }) => `${(getValue() * 100).toFixed(1)}%`, meta: { align: 'right' } }),
    allocColumnHelper.accessor('allocatedAmountClp', { header: 'Monto CLP', cell: ({ getValue }) => formatClpShort(getValue()), meta: { align: 'right' } }),
    allocColumnHelper.accessor('notes', { header: 'Notas', cell: ({ getValue }) => <Typography variant='caption' color='text.secondary'>{getValue() || '\u2014'}</Typography> }),
    { id: 'actions', header: 'Acciones', cell: ({ row }: { row: { original: Allocation } }) => <Button size='small' color='error' onClick={() => handleDelete(row.original.allocationId)}><i className='tabler-trash' /></Button>, enableSorting: false, meta: { align: 'center' } }
  ]

  const allocTable = useReactTable({
    data: allocations,
    columns: allocColumns,
    state: { sorting: allocSorting },
    onSortingChange: setAllocSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const totalAllocated = allocations.reduce((s, a) => s + a.allocatedAmountClp, 0)

  // ---------------------------------------------------------------------------
  // Tab 1 — Donut chart
  // ---------------------------------------------------------------------------

  const totalLabor = clientRows.reduce((s, c) => s + c.laborCostClp, 0)
  const totalOverhead = healthData ? healthData.totalAttributedOverheadTarget : clientRows.reduce((s, c) => s + c.overheadCostClp, 0)

  // Split overhead into direct/shared via ratio from health data when available
  const directOverheadEstimate = totalOverhead * 0.6
  const sharedOverheadEstimate = totalOverhead * 0.4
  const totalLoaded = healthData?.totalCommercialLoadedCostTarget ?? clientRows.reduce((s, c) => s + c.loadedCostClp, 0)

  const donutSeries = [totalLabor, directOverheadEstimate, sharedOverheadEstimate]
  const donutLabels = ['Costo laboral', 'Overhead directo', 'Overhead compartido']

  const donutColors = [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.info.main
  ]

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    stroke: { width: 2 },
    labels: donutLabels,
    colors: donutColors,
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`
    },
    legend: {
      fontSize: '13px',
      position: 'bottom',
      labels: { colors: theme.palette.text.secondary },
      itemMargin: { horizontal: 8 }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            name: { fontSize: '0.9rem', color: theme.palette.text.secondary },
            value: { fontSize: '1.3rem', fontWeight: 700, color: theme.palette.text.primary },
            total: {
              show: true,
              fontSize: '0.8rem',
              label: 'Costo cargado total',
              color: theme.palette.text.primary,
              formatter: () => formatClp(totalLoaded)
            }
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 576,
        options: {
          chart: { height: 240 },
          plotOptions: {
            pie: {
              donut: {
                labels: {
                  name: { fontSize: '0.8rem' },
                  value: { fontSize: '1rem' },
                  total: { fontSize: '0.7rem' }
                }
              }
            }
          }
        }
      }
    ]
  }

  // ---------------------------------------------------------------------------
  // Period-over-period deltas for KPI cards
  // ---------------------------------------------------------------------------

  const MONTH_ABBR = GREENHOUSE_COPY.months.short
  const prevLabel = prevHealthData ? MONTH_ABBR[(prevHealthData.periodMonth - 1) % 12] : null

  const costDelta = (current: number, previous: number | undefined | null): { pct: number; direction: 'positive' | 'negative' | 'neutral'; label: string } | null => {
    if (previous == null || previous <= 0 || current === 0) return null

    const pct = Math.round(((current - previous) / previous) * 100)

    return {
      pct,
      direction: pct === 0 ? 'neutral' : pct > 0 ? 'negative' : 'positive', // cost increase = negative
      label: `${Math.abs(pct)}% vs ${prevLabel}`
    }
  }

  const countDelta = (current: number, previous: number | undefined | null): { pct: number; direction: 'positive' | 'negative' | 'neutral'; label: string } | null => {
    if (previous == null || previous <= 0 || current === 0) return null

    const pct = Math.round(((current - previous) / previous) * 100)

    return {
      pct,
      direction: pct === 0 ? 'neutral' : pct > 0 ? 'positive' : 'negative', // more clients/members = positive
      label: `${Math.abs(pct)}% vs ${prevLabel}`
    }
  }

  const clientsDelta = countDelta(healthData?.clientCount ?? 0, prevHealthData?.clientCount)
  const membersDelta = countDelta(healthData?.membersWithCommercialAttribution ?? 0, prevHealthData?.membersWithCommercialAttribution)
  const laborDelta = costDelta(healthData?.totalCommercialLaborCostTarget ?? totalLabor, prevHealthData?.totalCommercialLaborCostTarget)
  const loadedDelta = costDelta(totalLoaded, prevHealthData?.totalCommercialLoadedCostTarget)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Grid container spacing={6}>
      {/* Header with shared period selectors */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Cost Intelligence'
            subheader='Atribucion comercial de costos y asignaciones manuales'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-arrows-split-2' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <CustomTextField
                  select
                  size='small'
                  label='Ano'
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  sx={{ minWidth: 100 }}
                >
                  {[2024, 2025, 2026].map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  size='small'
                  label='Mes'
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  sx={{ minWidth: 140 }}
                >
                  {MONTHS.map((m, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                  ))}
                </CustomTextField>
              </Box>
            }
          />
        </Card>
      </Grid>

      {/* Tabs */}
      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <TabContext value={tab}>
            <CustomTabList onChange={(_e, v) => setTab(v as 'attribution' | 'overrides')} variant='scrollable'>
              <Tab
                value='attribution'
                label='Atribucion comercial'
                icon={<i className='tabler-chart-pie' />}
                iconPosition='start'
              />
              <Tab
                value='overrides'
                label='Ajustes manuales'
                icon={<i className='tabler-adjustments-horizontal' />}
                iconPosition='start'
              />
            </CustomTabList>

            {/* ============================================================= */}
            {/* TAB 1 — Commercial attribution                                */}
            {/* ============================================================= */}
            <TabPanel value='attribution' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              {attributionLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={4}>
                  {/* KPI cards */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HorizontalWithSubtitle
                      title='Clientes'
                      stats={String(Math.max(healthData?.clientCount ?? 0, clientRows.length))}
                      avatarIcon='tabler-building-store'
                      avatarColor='primary'
                      trend={clientsDelta?.direction}
                      trendNumber={clientsDelta?.label}
                      subtitle='Con atribucion activa'
                      footer={prevHealthData ? `${prevLabel}: ${prevHealthData.clientCount}` : undefined}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HorizontalWithSubtitle
                      title='Personas'
                      stats={String(healthData?.membersWithCommercialAttribution ?? 0)}
                      avatarIcon='tabler-users'
                      avatarColor='info'
                      trend={membersDelta?.direction}
                      trendNumber={membersDelta?.label}
                      subtitle={`de ${healthData?.memberCount ?? 0} miembros`}
                      footer={prevHealthData ? `${prevLabel}: ${prevHealthData.membersWithCommercialAttribution}` : undefined}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HorizontalWithSubtitle
                      title='Costo laboral'
                      stats={formatClp(healthData?.totalCommercialLaborCostTarget ?? totalLabor)}
                      avatarIcon='tabler-coin'
                      avatarColor='warning'
                      trend={laborDelta?.direction}
                      trendNumber={laborDelta?.label}
                      subtitle='Atribuido a clientes'
                      statusLabel={healthData?.healthy ? 'Atribuido' : 'Incompleto'}
                      statusColor={healthData?.healthy ? 'success' : 'warning'}
                      statusIcon={healthData?.healthy ? 'tabler-circle-check' : 'tabler-alert-triangle'}
                      footer={prevHealthData ? `${prevLabel}: ${formatClp(prevHealthData.totalCommercialLaborCostTarget)}` : undefined}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <HorizontalWithSubtitle
                      title='Costo cargado'
                      stats={formatClp(totalLoaded)}
                      avatarIcon='tabler-chart-arrows-vertical'
                      avatarColor='success'
                      trend={loadedDelta?.direction}
                      trendNumber={loadedDelta?.label}
                      subtitle='Labor + overhead'
                      footer={prevHealthData ? `${prevLabel}: ${formatClp(prevHealthData.totalCommercialLoadedCostTarget)}` : undefined}
                    />
                  </Grid>

                  {/* Health alert */}
                  {healthData && (
                    <Grid size={{ xs: 12 }}>
                      {healthData.healthy ? (
                        <Alert severity='success' variant='outlined'>
                          Atribucion saludable: {healthData.allocationCount} asignaciones cubren {healthData.clientCount} clientes
                          y {healthData.membersWithCommercialAttribution} miembros.
                        </Alert>
                      ) : (
                        <Alert severity='warning' variant='outlined'>
                          Atribucion incompleta: delta no explicado de {formatClp(healthData.unexplainedLaborDeltaTarget)}.
                          {healthData.membersWithInternalLoad > 0
                            ? ` ${healthData.membersWithInternalLoad} miembros con carga interna no atribuida.`
                            : ''}
                        </Alert>
                      )}
                    </Grid>
                  )}

                  {/* TASK-708: V2 coverage transparency — honest degradation */}
                  {v2Coverage && (!v2Coverage.hasLaborData || !v2Coverage.hasDirectClientData || !v2Coverage.hasDirectMemberViaFteData) && (
                    <Grid size={{ xs: 12 }}>
                      <Alert severity='info' variant='outlined' icon={<i className='tabler-info-circle' />}>
                        <Typography variant='body2' sx={{ fontWeight: 600, mb: 0.5 }}>
                          Cobertura por dimensión de costo (V2):
                        </Typography>
                        <Typography variant='caption' display='block' component='div'>
                          • <strong>Labor allocation</strong> (staffing × payroll): {v2Coverage.hasLaborData ? '✓ disponible' : '⚠ pendiente — cierre del período no materializó client_labor_cost_allocation'}
                          <br />
                          • <strong>Gastos directos a cliente</strong> (Metricool→Motogas, etc.): {v2Coverage.hasDirectClientData ? '✓ atribuido' : '— sin gastos directos a cliente este período'}
                          <br />
                          • <strong>Gastos directos a miembro vía staffing</strong> (Adobe team, payroll): {v2Coverage.hasDirectMemberViaFteData ? '✓ prorrateado' : '— sin gastos a miembros con staffing activo este período'}
                        </Typography>
                      </Alert>
                    </Grid>
                  )}

                  {/* Client table + Donut chart */}
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Card variant='outlined'>
                      <CardHeader
                        title='Costo por cliente'
                        titleTypographyProps={{ variant: 'h6' }}
                      />
                      {clientRows.length === 0 ? (
                        <CardContent>
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant='h6' sx={{ mb: 1 }}>Sin datos de atribucion</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              No hay atribuciones comerciales para este periodo.
                            </Typography>
                          </Box>
                        </CardContent>
                      ) : (
                        <div className='overflow-x-auto'>
                          <table className={tableStyles.table}>
                            <thead>
                              {clientTable.getHeaderGroups().map(hg => (
                                <tr key={hg.id}>
                                  {hg.headers.map(header => (
                                    <th
                                      key={header.id}
                                      onClick={header.column.getToggleSortingHandler()}
                                      className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                                      style={{
                                        textAlign:
                                          (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                            ? 'right'
                                            : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                              ? 'center'
                                              : 'left'
                                      }}
                                    >
                                      {flexRender(header.column.columnDef.header, header.getContext())}
                                      {{ asc: ' \u2191', desc: ' \u2193' }[header.column.getIsSorted() as string] ?? null}
                                    </th>
                                  ))}
                                </tr>
                              ))}
                            </thead>
                            <tbody>
                              {clientTable.getRowModel().rows.map(row => (
                                <React.Fragment key={row.id}>
                                  <tr
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleToggleExpand(row.original.clientId)}
                                  >
                                    {row.getVisibleCells().map(cell => (
                                      <td
                                        key={cell.id}
                                        style={{
                                          textAlign:
                                            (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                              ? 'right'
                                              : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                                ? 'center'
                                                : 'left'
                                        }}
                                      >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                      </td>
                                    ))}
                                  </tr>
                                  {/* Drill-down collapse */}
                                  <tr>
                                    <td colSpan={clientColumns.length} style={{ padding: 0, border: 'none' }}>
                                      <Collapse in={expandedClientId === row.original.clientId} unmountOnExit>
                                        <ClientDrillDown
                                          data={clientExplainCache[row.original.clientId] ?? null}
                                          loading={explainLoading && expandedClientId === row.original.clientId && clientExplainCache[row.original.clientId] === undefined}
                                        />
                                      </Collapse>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>
                    <Card variant='outlined'>
                      <CardHeader
                        title='Composicion de costos'
                        titleTypographyProps={{ variant: 'h6' }}
                      />
                      <CardContent>
                        {totalLoaded > 0 ? (
                          <AppReactApexCharts
                            type='donut'
                            height={280}
                            width='100%'
                            series={donutSeries}
                            options={donutOptions}
                          />
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <i className='tabler-chart-donut-3' style={{ fontSize: 48, opacity: 0.3 }} />
                            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                              Sin datos para el grafico
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </TabPanel>

            {/* ============================================================= */}
            {/* TAB 2 — Manual overrides (existing CRUD, preserved)           */}
            {/* ============================================================= */}
            <TabPanel value='overrides' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Grid container spacing={4}>
                {/* Action bar */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant='contained' size='small' onClick={() => setDialogOpen(true)}>
                      <i className='tabler-plus' style={{ marginRight: 4 }} /> Nueva
                    </Button>
                  </Box>
                </Grid>

                {/* Summary */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, textAlign: 'center', py: 3 }}>
                    <Typography variant='h4'>{allocations.length}</Typography>
                    <Typography variant='body2' color='text.secondary'>Asignaciones activas</Typography>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, textAlign: 'center', py: 3 }}>
                    <Typography variant='h4'>{formatClpShort(totalAllocated)}</Typography>
                    <Typography variant='body2' color='text.secondary'>Total asignado</Typography>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, textAlign: 'center', py: 3 }}>
                    <Typography variant='h4'>
                      {new Set(allocations.map(a => a.clientId)).size}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>Clientes con asignaciones</Typography>
                  </Card>
                </Grid>

                {/* Table */}
                <Grid size={{ xs: 12 }}>
                  <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                    {overridesLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                      </Box>
                    ) : allocations.length === 0 ? (
                      <CardContent>
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant='h6' sx={{ mb: 1 }}>Sin asignaciones para este periodo</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Crea una asignacion para distribuir gastos entre clientes.
                          </Typography>
                        </Box>
                      </CardContent>
                    ) : (
                      <div className='overflow-x-auto'>
                        <table className={tableStyles.table}>
                          <thead>
                            {allocTable.getHeaderGroups().map(hg => (
                              <tr key={hg.id}>
                                {hg.headers.map(header => (
                                  <th
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                                    style={{
                                      textAlign:
                                        (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                          ? 'right'
                                          : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                            ? 'center'
                                            : 'left'
                                    }}
                                  >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {{ asc: ' \u2191', desc: ' \u2193' }[header.column.getIsSorted() as string] ?? null}
                                  </th>
                                ))}
                              </tr>
                            ))}
                          </thead>
                          <tbody>
                            {allocTable.getRowModel().rows.map(row => (
                              <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                  <td
                                    key={cell.id}
                                    style={{
                                      textAlign:
                                        (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                          ? 'right'
                                          : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                            ? 'center'
                                            : 'left'
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </TabContext>
        </Card>
      </Grid>

      {/* Create Dialog (Tab 2) */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Nueva asignacion de costo</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
          <CustomTextField
            label='Expense ID'
            value={formExpenseId}
            onChange={e => setFormExpenseId(e.target.value)}
            placeholder='EXP-...'
            required
          />
          <CustomTextField
            label='Client ID'
            value={formClientId}
            onChange={e => setFormClientId(e.target.value)}
            placeholder='CLT-...'
            required
          />
          <CustomTextField
            label='Nombre del cliente'
            value={formClientName}
            onChange={e => setFormClientName(e.target.value)}
            required
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CustomTextField
              label='Porcentaje (%)'
              type='number'
              value={formPercent}
              onChange={e => setFormPercent(e.target.value)}
              sx={{ flex: 1 }}
            />
            <CustomTextField
              label='Monto CLP'
              type='number'
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>
          <CustomTextField
            select
            label='Metodo de asignacion'
            value={formMethod}
            onChange={e => setFormMethod(e.target.value)}
          >
            <MenuItem value='manual'>Manual</MenuItem>
            <MenuItem value='fte_proportional'>Proporcional FTE</MenuItem>
            <MenuItem value='revenue_proportional'>Proporcional Revenue</MenuItem>
            <MenuItem value='equal_split'>Division equitativa</MenuItem>
          </CustomTextField>
          <CustomTextField
            label='Notas (opcional)'
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={saving || !formExpenseId || !formClientId || !formClientName || !formAmount}
          >
            {saving ? 'Guardando...' : 'Crear asignacion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default CostAllocationsView
