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
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { AgencyMetricStatusChip, getAgencyMetricFooterLabel } from '@/components/agency/metric-trust'
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'
import { getMicrocopy } from '@/lib/copy'
import { formatNumber as formatGreenhouseNumber } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()
// ── Types ──

interface MetricValue { metricId: string; value: number | null; zone: string | null }
interface TrustMetricValue extends MetricValue {
  benchmarkType?: 'external' | 'analog' | 'adapted' | 'internal'
  qualityGateStatus?: 'healthy' | 'degraded' | 'broken'
  qualityGateReasons?: string[]
  dataStatus?: 'valid' | 'low_confidence' | 'suppressed' | 'unavailable'
  confidenceLevel?: 'high' | 'medium' | 'low' | 'none'
  trustEvidence?: { sampleSize: number | null }
}
interface CapacityCtx { contractedHoursMonth: number; assignedHoursMonth: number; usedHoursMonth: number | null; availableHoursMonth: number; overcommitted: boolean; roleCategory: string | null; totalFteAllocation: number; expectedThroughput: number; capacityHealth: string; activeAssignmentCount: number; usageKind?: string; usagePercent?: number | null; commercialAvailabilityHours?: number; operationalAvailabilityHours?: number | null }
interface CostCtx { currency: string | null; monthlyBaseSalary: number | null; monthlyTotalComp: number | null; compensationVersionId: string | null; targetCurrency?: string | null; loadedCostTarget?: number | null; costPerHourTarget?: number | null; suggestedBillRateTarget?: number | null }
interface Snapshot { period: { year: number; month: number }; deliveryMetrics: MetricValue[]; derivedMetrics: MetricValue[]; capacity: CapacityCtx; cost: CostCtx; health: 'green' | 'yellow' | 'red'; materializedAt: string | null; engineVersion: string; source: string }
interface IntelligenceResponse { memberId: string; current: Snapshot | null; trend: Snapshot[]; meta: { source: string; materializedAt: string | null; engineVersion: string } }

// ── Helpers ──

const MONTHS = ['', ...GREENHOUSE_COPY.months.short]

const healthConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' }> = {
  green: { label: 'Óptimo', color: 'success' },
  yellow: { label: 'Atención', color: 'warning' },
  red: { label: 'Crítico', color: 'error' }
}

const capHealthConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary' }> = {
  idle: { label: 'Disponible', color: 'secondary' },
  balanced: { label: 'Balanceado', color: 'success' },
  high: { label: 'Alta carga', color: 'warning' },
  overloaded: { label: 'Sobrecargado', color: 'error' }
}

const zoneColor = (z: string | null): 'success' | 'warning' | 'error' | 'secondary' => {
  if (z === 'optimal') return 'success'
  if (z === 'attention') return 'warning'
  if (z === 'critical') return 'error'

  return 'secondary'
}

const getMetric = (metrics: MetricValue[], id: string): MetricValue | undefined =>
  metrics.find(m => m.metricId === id)

const getTrustMetric = (metrics: TrustMetricValue[] | null, id: string): TrustMetricValue | undefined =>
  metrics?.find(metric => metric.metricId === id)

const fmtNum = (v: number | null | undefined, suffix = ''): string =>
  v != null ? `${Math.round(v * 10) / 10}${suffix}` : '—'

const fmtClp = (v: number | null | undefined): string =>
  v != null ? `$${formatGreenhouseNumber(Math.round(v), 'es-CL')}` : '—'

const fmtMoney = (v: number | null | undefined, currency: string | null | undefined): string => {
  if (v == null) return '—'
  if (currency === 'USD') return `US$${formatGreenhouseNumber(Math.round(v), 'en-US')}`

  return `$${formatGreenhouseNumber(Math.round(v), 'es-CL')}`
}

const fmtUsage = (kind: string | undefined, usedHours: number | null | undefined, usagePercent: number | null | undefined): string => {
  if (kind === 'hours') return fmtNum(usedHours, 'h')
  if (kind === 'percent' && usagePercent != null) return fmtNum(usagePercent, '%')

  return '—'
}

const fmtPeriod = (year: number, month: number): string =>
  `${MONTHS[month]} ${year}`

// ── Metric display config ──

interface MetricDisplay { id: string; label: string; icon: string; format: (v: number | null) => string; source: 'derived' | 'delivery' }

const KPI_ROW_1: MetricDisplay[] = [
  { id: 'quality_index', label: 'Calidad', icon: 'tabler-award', format: v => fmtNum(v, '/100'), source: 'derived' },
  { id: 'dedication_index', label: 'Dedicación', icon: 'tabler-flame', format: v => fmtNum(v, '/100'), source: 'derived' },
  { id: 'utilization_pct', label: 'Utilización', icon: 'tabler-gauge', format: v => fmtNum(v, '%'), source: 'derived' },
  { id: 'rpa', label: 'RPA', icon: 'tabler-chart-line', format: v => v != null ? v.toFixed(1) : '—', source: 'delivery' }
]

const KPI_ROW_2: MetricDisplay[] = [
  { id: 'otd_pct', label: 'OTD', icon: 'tabler-clock-check', format: v => fmtNum(v, '%'), source: 'delivery' },
  { id: 'ftr_pct', label: 'FTR', icon: 'tabler-circle-check', format: v => fmtNum(v, '%'), source: 'delivery' },
  { id: 'cost_per_asset', label: 'Costo/Activo', icon: 'tabler-coin', format: v => fmtClp(v), source: 'derived' },
  { id: 'cost_per_hour', label: 'Costo/Hora', icon: 'tabler-clock-dollar', format: v => fmtClp(v), source: 'derived' }
]

const DELIVERY_METRICS: Array<{ id: string; label: string }> = [
  { id: 'rpa', label: 'RPA' },
  { id: 'otd_pct', label: 'Entrega a tiempo' },
  { id: 'ftr_pct', label: 'Primera entrega correcta' },
  { id: 'cycle_time', label: 'Tiempo de ciclo' },
  { id: 'throughput', label: 'Throughput' },
  { id: 'pipeline_velocity', label: 'Velocidad pipeline' },
  { id: 'stuck_assets', label: 'Assets estancados' }
]

// ── Component ──

type Props = { memberId: string }

const PersonIntelligenceTab = ({ memberId }: Props) => {
  const theme = useTheme()
  const [data, setData] = useState<IntelligenceResponse | null>(null)
  const [icoTrustMetrics, setIcoTrustMetrics] = useState<TrustMetricValue[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [intelligenceRes, icoRes] = await Promise.allSettled([
          fetch(`/api/people/${memberId}/intelligence?trend=6`),
          fetch(`/api/people/${memberId}/ico`)
        ])

        if (intelligenceRes.status === 'fulfilled' && intelligenceRes.value.ok) {
          setData(await intelligenceRes.value.json())
        }

        if (icoRes.status === 'fulfilled' && icoRes.value.ok) {
          const payload = await icoRes.value.json()

          setIcoTrustMetrics(Array.isArray(payload.metrics) ? payload.metrics : [])
        } else {
          setIcoTrustMetrics(null)
        }
      } catch {
        // Non-blocking
        setIcoTrustMetrics(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [memberId])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  if (!data?.current) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <i className='tabler-brain' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
          <Typography variant='h6' sx={{ mt: 2 }}>Sin datos de inteligencia operativa</Typography>
          <Typography variant='body2' color='text.secondary'>Los datos se generarán automáticamente cuando haya métricas ICO y asignaciones activas.</Typography>
        </CardContent>
      </Card>
    )
  }

  const { current, trend } = data
  const hc = healthConfig[current.health] ?? healthConfig.green

  // Build KPI card helper
  const buildKpi = (cfg: MetricDisplay) => {
    const metrics = cfg.source === 'derived' ? current.derivedMetrics : current.deliveryMetrics
    const m = getMetric(metrics, cfg.id)

    return {
      title: cfg.label,
      stats: cfg.format(m?.value ?? null),
      avatarIcon: cfg.icon,
      avatarColor: zoneColor(m?.zone ?? null) as 'success' | 'warning' | 'error' | 'secondary' | 'primary' | 'info',
      subtitle: m?.zone === 'optimal' ? 'Óptimo' : m?.zone === 'attention' ? 'Atención' : m?.zone === 'critical' ? 'Crítico' : '—'
    }
  }

  // Trend chart data
  const chartData = trend.map(t => {
    const qi = getMetric(t.derivedMetrics, 'quality_index')?.value
    const di = getMetric(t.derivedMetrics, 'dedication_index')?.value
    const ut = getMetric(t.derivedMetrics, 'utilization_pct')?.value

    return {
      label: `${MONTHS[t.period.month]} '${String(t.period.year).slice(2)}`,
      calidad: qi != null ? Math.round(qi) : null,
      dedicacion: di != null ? Math.round(di) : null,
      utilizacion: ut != null ? Math.round(ut) : null
    }
  })

  const cap = current.capacity
  const cost = current.cost
  const capCfg = capHealthConfig[cap.capacityHealth] ?? capHealthConfig.idle

  return (
    <Grid container spacing={6}>
      {/* Health Hero */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CustomChip round='true' variant='tonal' color={hc.color} label={hc.label} sx={{ fontSize: '1rem', px: 3, py: 0.5 }} />
          <Typography variant='body2' color='text.secondary'>
            {fmtPeriod(current.period.year, current.period.month)} · {current.source}
          </Typography>
        </Box>
      </Grid>

      {/* KPI Row 1 */}
      {KPI_ROW_1.map((cfg, i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <HorizontalWithSubtitle {...buildKpi(cfg)} />
        </Grid>
      ))}

      {/* KPI Row 2 */}
      {KPI_ROW_2.map((cfg, i) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
          <HorizontalWithSubtitle {...buildKpi(cfg)} />
        </Grid>
      ))}

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Tendencia'
              subheader='Últimos 6 períodos'
              avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-chart-dots' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
            />
            <Divider />
            <CardContent>
              <AppRecharts>
                <ResponsiveContainer width='100%' height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='label' />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}`} />
                    <Tooltip formatter={(v) => `${v}`} />
                    <Legend />
                    <Line type='monotone' dataKey='calidad' stroke={theme.palette.success.main} strokeWidth={2} name='Calidad' dot={{ r: 4 }} />
                    <Line type='monotone' dataKey='dedicacion' stroke={theme.palette.warning.main} strokeWidth={2} name='Dedicación' dot={{ r: 4 }} />
                    <Line type='monotone' dataKey='utilizacion' stroke={theme.palette.info.main} strokeWidth={2} name='Utilización' strokeDasharray='5 5' dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </AppRecharts>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Capacity + Cost */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Capacidad'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-gauge' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
            action={<CustomChip round='true' size='small' variant='tonal' color={capCfg.color} label={capCfg.label} />}
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>FTE total</Typography>
                <Typography variant='h6'>{cap.totalFteAllocation.toFixed(1)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Rol</Typography>
                <Typography variant='h6' sx={{ textTransform: 'capitalize' }}>{cap.roleCategory ?? '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Contratadas</Typography>
                <Typography variant='body1' fontWeight={600}>{cap.contractedHoursMonth}h</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Asignadas</Typography>
                <Typography variant='body1' fontWeight={600}>{cap.assignedHoursMonth}h</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Uso operativo</Typography>
                <Typography variant='body1' fontWeight={600}>{fmtUsage(cap.usageKind, cap.usedHoursMonth, cap.usagePercent)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Disponible comercial</Typography>
                <Typography variant='body1' fontWeight={600} color={cap.availableHoursMonth < 0 ? 'error.main' : 'success.main'}>{cap.availableHoursMonth}h</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Throughput esperado</Typography>
                <Typography variant='body1'>{cap.expectedThroughput} assets/mes</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Asignaciones activas</Typography>
                <Typography variant='body1'>{cap.activeAssignmentCount}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Costo'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-coin' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Compensación mensual</Typography>
                <Typography variant='h6'>{fmtMoney(cost.monthlyTotalComp, cost.currency)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Moneda</Typography>
                <Typography variant='h6'>{cost.currency ?? '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Salario base</Typography>
                <Typography variant='body1' fontWeight={600}>{fmtMoney(cost.monthlyBaseSalary, cost.currency)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Costo por activo</Typography>
                <Typography variant='body1' fontWeight={600}>{fmtClp(getMetric(current.derivedMetrics, 'cost_per_asset')?.value ?? null)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Costo por hora</Typography>
                <Typography variant='body1' fontWeight={600}>{fmtClp(cost.costPerHourTarget ?? getMetric(current.derivedMetrics, 'cost_per_hour')?.value ?? null)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant='caption' color='text.secondary'>Tarifa sugerida</Typography>
                <Typography variant='body1' fontWeight={600}>{fmtClp(cost.suggestedBillRateTarget ?? null)}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Delivery Metrics Grid */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Métricas ICO de delivery'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-cpu' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              {DELIVERY_METRICS.map(dm => {
                const m = getMetric(current.deliveryMetrics, dm.id)
                const trustMetric = getTrustMetric(icoTrustMetrics, dm.id)
                const trustFooter = trustMetric ? getAgencyMetricFooterLabel(trustMetric) : null

                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3 }} key={dm.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      <Typography variant='caption' color='text.secondary'>{dm.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant='h6'>{fmtNum(m?.value ?? null)}</Typography>
                        {m?.zone && (
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color={zoneColor(m.zone)}
                            label={m.zone === 'optimal' ? 'Óptimo' : m.zone === 'attention' ? 'Atención' : 'Crítico'}
                          />
                        )}
                      </Box>
                      {trustMetric && <AgencyMetricStatusChip metric={trustMetric} />}
                      {trustFooter && (
                        <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.4 }}>
                          {trustFooter}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PersonIntelligenceTab
