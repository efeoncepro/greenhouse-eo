'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'

// ── Types ──

interface PnlData {
  revenue?: { netRevenue?: number }
  costs?: { totalCosts?: number }
  margins?: { grossMargin?: number; grossMarginPercent?: number; ebitda?: number; ebitdaPercent?: number }
  payroll?: { headcount?: number; grossTotal?: number }
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

const pct = (v: number | null | undefined) => v != null ? `${Math.round(v * 100)}%` : '—'

const marginColor = (v: number | null | undefined): 'success' | 'warning' | 'error' => {
  if (v == null) return 'secondary' as 'error'
  if (v >= 0.3) return 'success'
  if (v >= 0.15) return 'warning'

  return 'error'
}

// ── Component ──

const AgencyEconomicsView = () => {
  const theme = useTheme()
  const [pnl, setPnl] = useState<PnlData | null>(null)
  const [clients, setClients] = useState<ClientEcon[]>([])
  const [trends, setTrends] = useState<TrendPeriod[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [pnlRes, clientsRes, trendsRes] = await Promise.allSettled([
        fetch('/api/finance/dashboard/pnl'),
        fetch('/api/finance/intelligence/client-economics'),
        fetch('/api/finance/analytics/trends?type=expenses&months=6')
      ])

      if (pnlRes.status === 'fulfilled' && pnlRes.value.ok) setPnl(await pnlRes.value.json())
      if (clientsRes.status === 'fulfilled' && clientsRes.value.ok) {
        const d = await clientsRes.value.json()

        setClients(d.items ?? [])
      }

      if (trendsRes.status === 'fulfilled' && trendsRes.value.ok) {
        const d = await trendsRes.value.json()

        setTrends(d.periods ?? [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const revenue = pnl?.revenue?.netRevenue ?? 0
  const costs = pnl?.costs?.totalCosts ?? 0
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
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell align='right'>Revenue CLP</TableCell>
                    <TableCell align='center'>Margen</TableCell>
                    <TableCell align='right'>FTE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.sort((a, b) => b.totalRevenueClp - a.totalRevenueClp).slice(0, 15).map(c => (
                    <TableRow key={c.clientId} hover>
                      <TableCell><Typography variant='body2' fontWeight={600}>{c.clientName}</Typography></TableCell>
                      <TableCell align='right'>{fmtClp(c.totalRevenueClp)}</TableCell>
                      <TableCell align='center'>
                        <CustomChip round='true' size='small' variant='tonal' color={marginColor(c.grossMarginPercent)} label={pct(c.grossMarginPercent)} />
                      </TableCell>
                      <TableCell align='right'>{c.headcountFte ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default AgencyEconomicsView
