'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'

import tableStyles from '@core/styles/table.module.css'

// ── Types ──

interface PnlData {
  revenue?: { netRevenue?: number }
  costs?: { totalExpenses?: number }
  margins?: { grossMargin?: number; grossMarginPercent?: number; ebitda?: number; ebitdaPercent?: number }
  payroll?: { headcount?: number; totalGross?: number }
}

interface ClientEcon {
  clientId: string
  clientName: string
  totalRevenueClp: number
  grossMarginPercent: number | null
  headcountFte: number | null
}

interface TrendPeriod {
  year: number
  month: number
  categories: Record<string, number>
}

// ── Helpers ──

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmtClp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const pct = (v: number | null | undefined) => v != null ? `${Math.round(v)}%` : '—'

const marginColor = (v: number | null | undefined): 'success' | 'warning' | 'error' => {
  if (v == null) return 'secondary' as 'error'
  if (v >= 30) return 'success'
  if (v >= 15) return 'warning'

  return 'error'
}

// ── Client columns ──

const clientColumnHelper = createColumnHelper<ClientEcon>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientColumns: ColumnDef<ClientEcon, any>[] = [
  clientColumnHelper.accessor('clientName', {
    header: 'Cliente',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
  }),
  clientColumnHelper.accessor('totalRevenueClp', {
    header: 'Revenue CLP',
    cell: ({ getValue }) => fmtClp(getValue()),
    meta: { align: 'right' }
  }),
  clientColumnHelper.accessor('grossMarginPercent', {
    header: 'Margen',
    cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color={marginColor(getValue())} label={pct(getValue())} />,
    meta: { align: 'center' }
  }),
  clientColumnHelper.accessor('headcountFte', {
    header: 'FTE',
    cell: ({ getValue }) => getValue() ?? '—',
    meta: { align: 'right' }
  })
]

// ── Component ──

const AgencyEconomicsView = () => {
  const theme = useTheme()
  const [pnl, setPnl] = useState<PnlData | null>(null)
  const [clients, setClients] = useState<ClientEcon[]>([])
  const [trends, setTrends] = useState<TrendPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [clientSorting, setClientSorting] = useState<SortingState>([{ id: 'totalRevenueClp', desc: true }])

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      const [pnlRes, clientsRes, trendsRes] = await Promise.allSettled([
        fetch('/api/finance/dashboard/pnl'),
        fetch(`/api/finance/intelligence/operational-pl?year=${year}&month=${month}&scope=client`),
        fetch('/api/finance/analytics/trends?type=expenses&months=6')
      ])

      if (pnlRes.status === 'fulfilled' && pnlRes.value.ok) setPnl(await pnlRes.value.json())

      if (clientsRes.status === 'fulfilled' && clientsRes.value.ok) {
        const d = await clientsRes.value.json()
        const snapshots = d.snapshots ?? []

        setClients(snapshots.map((s: Record<string, unknown>) => ({
          clientId: String(s.scopeId ?? ''),
          clientName: String(s.scopeName ?? ''),
          totalRevenueClp: Number(s.revenueClp ?? 0),
          grossMarginPercent: s.grossMarginPct != null ? Number(s.grossMarginPct) : null,
          headcountFte: s.headcountFte != null ? Number(s.headcountFte) : null
        })))
      }

      if (trendsRes.status === 'fulfilled' && trendsRes.value.ok) {
        const d = await trendsRes.value.json()

        setTrends(d.periods ?? [])
      }
    } catch (err) { console.error('[AgencyEconomics] load error:', err) } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const top15 = useMemo(() => [...clients].sort((a, b) => b.totalRevenueClp - a.totalRevenueClp).slice(0, 15), [clients])

  const clientTable = useReactTable({
    data: top15,
    columns: clientColumns,
    state: { sorting: clientSorting },
    onSortingChange: setClientSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const revenue = pnl?.revenue?.netRevenue ?? 0
  const costs = pnl?.costs?.totalExpenses ?? 0
  const grossMargin = pnl?.margins?.grossMargin ?? 0
  const ebitda = pnl?.margins?.ebitda ?? 0
  const ebitdaPct = pnl?.margins?.ebitdaPercent

  // Build expense trend chart data
  const trendChart = trends.map(t => ({
    label: `${MONTHS[t.month]} ${String(t.year).slice(2)}`,
    total: Object.values(t.categories).reduce((s, v) => s + v, 0)
  }))

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Economía'
            subheader='P&L, rentabilidad y clientes'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-chart-line' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {/* P&L KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Revenue' stats={fmtClp(revenue)} avatarIcon='tabler-cash' avatarColor='success' subtitle='Ingresos netos del mes' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Costos' stats={fmtClp(costs)} avatarIcon='tabler-receipt' avatarColor='error' subtitle='Costos totales' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Margen bruto' stats={fmtClp(grossMargin)} avatarIcon='tabler-trending-up' avatarColor={grossMargin >= 0 ? 'success' : 'error'} subtitle={pct(pnl?.margins?.grossMarginPercent)} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='EBITDA' stats={fmtClp(ebitda)} avatarIcon='tabler-report-money' avatarColor={ebitda >= 0 ? 'primary' : 'error'} subtitle={ebitdaPct != null ? `${Math.round(ebitdaPct)}%` : '—'} />
      </Grid>

      {/* Expense trend */}
      {trendChart.length > 1 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='Tendencia de gastos' subheader='Últimos 6 meses' />
            <Divider />
            <CardContent>
              <AppRecharts>
                <ResponsiveContainer width='100%' height={280}>
                  <LineChart data={trendChart}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='label' />
                    <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} />
                    <Tooltip formatter={(v) => fmtClp(Number(v))} />
                    <Legend />
                    <Line type='monotone' dataKey='total' stroke={theme.palette.error.main} name='Gastos totales' strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </AppRecharts>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Top clients by revenue */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Top clientes por revenue' subheader='Período actual' />
          <Divider />
          {clients.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>Sin datos de client economics</Typography>
            </CardContent>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {clientTable.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {clientTable.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
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
  )
}

export default AgencyEconomicsView
