'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import EmptyState from '@/components/greenhouse/EmptyState'
import IcoGlobalKpis from '@/components/agency/IcoGlobalKpis'
import IcoCharts from '@/components/agency/IcoCharts'
import type { RpaTrendBySpace } from '@/components/agency/IcoCharts'
import SpaceIcoScorecard from '@/components/agency/SpaceIcoScorecard'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { SpaceMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import type { AgencyPerformanceReport } from '@/lib/ico-engine/performance-report'

export type AgencyIcoData = {
  periodYear: number
  periodMonth: number
  spaces: SpaceMetricSnapshot[]
  totalSpaces: number
  report: AgencyPerformanceReport | null
}

type Props = {
  data: AgencyIcoData | null
  onComputeLive?: () => void
  computingLive?: boolean
}

const formatPct = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`)
const formatCount = (value: number | null | undefined) => (value == null ? '—' : String(value))
const formatDelta = (value: number | null) => (value === null ? '—' : `${Math.abs(value).toFixed(1)}pp`)

const toUiTrend = (trend: AgencyPerformanceReport['summary']['trend']) =>
  trend === 'improving' ? 'positive' : trend === 'degrading' ? 'negative' : 'neutral'

const AgencyIcoEngineView = ({ data, onComputeLive, computingLive }: Props) => {
  const hasData = data !== null && data.spaces.length > 0

  const [rpaTrend, setRpaTrend] = useState<RpaTrendBySpace[] | undefined>(undefined)
  const [rpaTrendLoading, setRpaTrendLoading] = useState(false)

  const fetchRpaTrend = useCallback(async () => {
    setRpaTrendLoading(true)

    try {
      const res = await fetch('/api/ico-engine/trends/rpa?months=6')

      if (res.ok) {
        const json = await res.json()

        setRpaTrend(json.spaces ?? [])
      }
    } catch {
      setRpaTrend([])
    } finally {
      setRpaTrendLoading(false)
    }
  }, [])

  // Fetch trend data once main ICO data is available
  useEffect(() => {
    if (hasData && rpaTrend === undefined) {
      fetchRpaTrend()
    }
  }, [hasData, rpaTrend, fetchRpaTrend])

  return (
    <Stack spacing={6} sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Card
        elevation={0}
        sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap gap={1}>
          <div>
            <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}>
              {GH_AGENCY.ico_title}
            </Typography>
            <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
              {GH_AGENCY.ico_subtitle}
            </Typography>
          </div>
          {data && (
            <CustomChip
              round='true'
              size='small'
              color='secondary'
              variant='tonal'
              label={GH_AGENCY.ico_period_label(data.periodMonth, data.periodYear)}
              sx={{ fontWeight: 500 }}
            />
          )}
        </Stack>
      </Card>

      {!hasData ? (
        <EmptyState
          icon='tabler-cpu'
          title={GH_AGENCY.ico_empty_title}
          description={GH_AGENCY.ico_empty_description}
          action={
            onComputeLive ? (
              <Button
                variant='contained'
                size='small'
                onClick={onComputeLive}
                disabled={computingLive}
                startIcon={<i className='tabler-bolt' aria-hidden='true' />}
              >
                {computingLive ? 'Calculando...' : GH_AGENCY.ico_compute_live}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* KPIs */}
          <SectionErrorBoundary sectionName='ico-kpis' description='No pudimos calcular los KPIs del ICO Engine.'>
            <IcoGlobalKpis spaces={data.spaces} />
          </SectionErrorBoundary>

          {data.report ? (
            <SectionErrorBoundary sectionName='ico-performance-report' description='No pudimos construir el scorecard mensual de performance.'>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <HorizontalWithSubtitle
                    title='On-Time %'
                    stats={formatPct(data.report.summary.onTimePct)}
                    avatarIcon='tabler-clock-check'
                    avatarColor='success'
                    subtitle={`Mes anterior ${formatPct(data.report.summary.previousOnTimePct)}`}
                    trend={toUiTrend(data.report.summary.trend)}
                    trendNumber={formatDelta(data.report.summary.onTimeDeltaPp)}
                    footer={`Tendencia ${data.report.summary.trend === 'improving' ? 'mejora' : data.report.summary.trend === 'degrading' ? 'retroceso' : 'estable'}`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <HorizontalWithSubtitle
                    title='Late Drops'
                    stats={formatCount(data.report.summary.lateDrops)}
                    avatarIcon='tabler-arrow-down-bar'
                    avatarColor='warning'
                    subtitle='Activos completados fuera de fecha'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <HorizontalWithSubtitle
                    title='Overdue'
                    stats={formatCount(data.report.summary.overdue)}
                    avatarIcon='tabler-alert-circle'
                    avatarColor='error'
                    subtitle='Activos vencidos al cierre del período'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <HorizontalWithSubtitle
                    title='Carry-Over'
                    stats={formatCount(data.report.summary.carryOver)}
                    avatarIcon='tabler-arrow-back-up'
                    avatarColor='secondary'
                    subtitle='Carga arrastrada desde períodos previos'
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Card
                    elevation={0}
                    sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
                  >
                    <Stack spacing={2.5}>
                      <div>
                        <Typography variant='overline' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                          Alerta
                        </Typography>
                        <Typography variant='body1' sx={{ color: GH_COLORS.neutral.textPrimary, fontWeight: 600 }}>
                          {data.report.alertText}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant='overline' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                          Resumen Ejecutivo
                        </Typography>
                        <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                          {data.report.executiveSummary}
                        </Typography>
                      </div>
                    </Stack>
                  </Card>
                </Grid>
                {data.report.taskMix.slice(0, 3).map(segment => (
                  <Grid key={segment.segmentKey} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <HorizontalWithSubtitle
                      title={`Tareas ${segment.segmentLabel}`}
                      stats={formatCount(segment.totalTasks)}
                      avatarIcon='tabler-stack-2'
                      avatarColor='info'
                      subtitle='Carga total del período por segmento'
                    />
                  </Grid>
                ))}
                <Grid size={{ xs: 12 }}>
                  <Card
                    elevation={0}
                    sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
                  >
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
                      <div>
                        <Typography variant='overline' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                          Top Performer del período
                        </Typography>
                        <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary }}>
                          {data.report.topPerformer?.memberName ?? 'Sin ranking elegible'}
                        </Typography>
                        <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                          {data.report.topPerformer
                            ? `${formatPct(data.report.topPerformer.otdPct)} OTD · ${data.report.topPerformer.throughputCount} completadas · RpA ${data.report.topPerformer.rpaAvg?.toFixed(2) ?? '—'}`
                            : `Se requiere throughput >= ${data.report.assumptions.topPerformerMinThroughput} para entrar al ranking.`}
                        </Typography>
                      </div>
                      <Stack spacing={0.5} sx={{ minWidth: { md: 260 } }}>
                        <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                          Supuestos MVP
                        </Typography>
                        <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textPrimary }}>
                          Ranking por OTD del período, con desempate por throughput y RpA.
                        </Typography>
                        <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                          Multi-assignee: {data.report.assumptions.multiAssigneePolicy}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Card>
                </Grid>
              </Grid>
            </SectionErrorBoundary>
          ) : null}

          {/* Charts */}
          <SectionErrorBoundary sectionName='ico-charts' description='No pudimos cargar los gráficos del ICO Engine.'>
            {rpaTrendLoading ? (
              <Skeleton variant='rounded' height={320} />
            ) : (
              <IcoCharts spaces={data.spaces} rpaTrend={rpaTrend} />
            )}
          </SectionErrorBoundary>

          {/* Scorecard Table */}
          <SectionErrorBoundary sectionName='ico-scorecard' description='No pudimos cargar el scorecard por Space.'>
            <SpaceIcoScorecard spaces={data.spaces} />
          </SectionErrorBoundary>
        </>
      )}
    </Stack>
  )
}

export default AgencyIcoEngineView
