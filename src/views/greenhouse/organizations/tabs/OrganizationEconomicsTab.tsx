'use client'

import { useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'

import type { OrganizationDetailData } from '../types'

// ── Types ──

interface EconomicsCurrent {
  organizationId: string
  periodYear: number
  periodMonth: number
  totalRevenueClp: number
  totalLaborCostClp: number
  totalDirectCostsClp: number
  totalIndirectCostsClp: number
  adjustedMarginClp: number
  adjustedMarginPercent: number | null
  activeFte: number | null
  revenuePerFte: number | null
  costPerFte: number | null
  clientCount: number
}

interface ClientBreakdown {
  clientId: string
  clientName: string
  revenueClp: number
  laborCostClp: number
  directCostsClp: number
  marginClp: number
  marginPercent: number | null
  headcountFte: number | null
}

interface IcoSummary {
  avgRpa: number | null
  avgOtdPct: number | null
  avgFtrPct: number | null
  totalTasks: number
  completedTasks: number
}

interface TrendPoint {
  periodYear: number
  periodMonth: number
  totalRevenueClp: number
  totalLaborCostClp: number
  adjustedMarginClp: number
  adjustedMarginPercent: number | null
  activeFte: number | null
}

interface EconomicsResponse {
  current: EconomicsCurrent
  breakdown: ClientBreakdown[]
  ico: IcoSummary | null
  trend: TrendPoint[] | null
}

// ── Helpers ──

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatPercent = (value: number | null): string =>
  value != null ? `${value.toFixed(1)}%` : '—'

const marginColor = (value: number | null): 'success' | 'warning' | 'error' | 'secondary' => {
  if (value == null) return 'secondary'
  if (value >= 30) return 'success'
  if (value >= 15) return 'warning'

  return 'error'
}

// ── Component ──

type Props = {
  detail: OrganizationDetailData
}

const OrganizationEconomicsTab = ({ detail }: Props) => {
  const now = new Date()
  const theme = useTheme()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<EconomicsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const res = await fetch(
          `/api/organizations/${detail.organizationId}/economics?year=${year}&month=${month}&trend=6`
        )

        if (res.ok) setData(await res.json())
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [detail.organizationId, year, month])

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)
  const current = data?.current
  const ico = data?.ico

  // Trend chart data
  const trendChartData = data?.trend?.map(t => ({
    label: `${MONTH_SHORT[t.periodMonth]} ${String(t.periodYear).slice(2)}`,
    ingreso: Math.round(t.totalRevenueClp / 1_000_000),
    costo: Math.round(t.totalLaborCostClp / 1_000_000),
    margen: Math.round(t.adjustedMarginClp / 1_000_000)
  })) ?? []

  return (
    <Grid container spacing={6}>
      {/* Period selectors */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <CustomTextField
            select
            size='small'
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            {MONTH_SHORT.slice(1).map((label, i) => (
              <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            sx={{ minWidth: 100 }}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </CustomTextField>
        </Box>
      </Grid>

      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : !current || current.clientCount === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>No hay datos econ&oacute;micos para este per&iacute;odo</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Los datos aparecer&aacute;n cuando haya ingresos y asignaciones de equipo activas para {detail.organizationName}.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        <>
          {/* KPI row — Financial */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <HorizontalWithSubtitle
              title='Ingreso total'
              stats={formatCLP(current.totalRevenueClp)}
              subtitle={`${current.clientCount} Space${current.clientCount !== 1 ? 's' : ''}`}
              avatarIcon='tabler-cash'
              avatarColor='primary'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <HorizontalWithSubtitle
              title='Costo laboral real'
              stats={formatCLP(current.totalLaborCostClp)}
              subtitle={current.activeFte ? `${current.activeFte.toFixed(1)} FTE activos` : 'Sin FTE'}
              avatarIcon='tabler-users'
              avatarColor='warning'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <HorizontalWithSubtitle
              title='Margen ajustado'
              stats={formatCLP(current.adjustedMarginClp)}
              subtitle={current.adjustedMarginPercent != null ? `${current.adjustedMarginPercent.toFixed(1)}% del ingreso` : '—'}
              avatarIcon='tabler-trending-up'
              avatarColor={marginColor(current.adjustedMarginPercent)}
            />
          </Grid>

          {/* KPI row — ICO (if available) */}
          {ico && (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <HorizontalWithSubtitle
                  title='RPA promedio'
                  stats={ico.avgRpa != null ? ico.avgRpa.toFixed(1) : '—'}
                  subtitle={`${ico.completedTasks} de ${ico.totalTasks} tareas`}
                  avatarIcon='tabler-clock'
                  avatarColor='info'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <HorizontalWithSubtitle
                  title='On-Time Delivery'
                  stats={ico.avgOtdPct != null ? `${ico.avgOtdPct.toFixed(0)}%` : '—'}
                  subtitle='porcentaje promedio'
                  avatarIcon='tabler-calendar-check'
                  avatarColor='success'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <HorizontalWithSubtitle
                  title='First Time Right'
                  stats={ico.avgFtrPct != null ? `${ico.avgFtrPct.toFixed(0)}%` : '—'}
                  subtitle='porcentaje promedio'
                  avatarIcon='tabler-circle-check'
                  avatarColor='success'
                />
              </Grid>
            </>
          )}

          {/* Trend chart */}
          {trendChartData.length > 1 && (
            <Grid size={{ xs: 12 }}>
              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                <CardHeader
                  title='Tendencia econ&oacute;mica'
                  subheader='&Uacute;ltimos 6 meses (millones CLP)'
                  avatar={
                    <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                      <i className='tabler-chart-line' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                    </Avatar>
                  }
                />
                <Divider />
                <CardContent>
                  <AppRecharts>
                    <ResponsiveContainer width='100%' height={300}>
                      <LineChart data={trendChartData}>
                        <CartesianGrid strokeDasharray='3 3' />
                        <XAxis dataKey='label' />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type='monotone'
                          dataKey='ingreso'
                          stroke={theme.palette.primary.main}
                          name='Ingreso'
                          strokeWidth={2}
                        />
                        <Line
                          type='monotone'
                          dataKey='costo'
                          stroke={theme.palette.warning.main}
                          name='Costo laboral'
                          strokeWidth={2}
                        />
                        <Line
                          type='monotone'
                          dataKey='margen'
                          stroke={theme.palette.success.main}
                          name='Margen'
                          strokeWidth={2}
                          strokeDasharray='5 5'
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </AppRecharts>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Client breakdown table */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Rentabilidad por Space'
                subheader={`${MONTH_SHORT[current.periodMonth]} ${current.periodYear}`}
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                    <i className='tabler-report-analytics' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Space</TableCell>
                      <TableCell align='right'>Ingreso</TableCell>
                      <TableCell align='right'>Costo laboral</TableCell>
                      <TableCell align='right'>C. Directos</TableCell>
                      <TableCell align='right'>Margen</TableCell>
                      <TableCell align='center'>Margen %</TableCell>
                      <TableCell align='right'>FTE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.breakdown.map(c => (
                      <TableRow key={c.clientId} hover>
                        <TableCell>
                          <Typography variant='body2' fontWeight={600}>{c.clientName}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(c.revenueClp)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(c.laborCostClp)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(c.directCostsClp)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(c.marginClp)}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color={marginColor(c.marginPercent)}
                            label={formatPercent(c.marginPercent)}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>
                            {c.headcountFte != null ? c.headcountFte.toFixed(1) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default OrganizationEconomicsTab
