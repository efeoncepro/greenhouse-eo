'use client'

import { useCallback, useEffect, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import EmptyState from '@/components/greenhouse/EmptyState'
import IcoGlobalKpis from '@/components/agency/IcoGlobalKpis'
import IcoAdvisoryBlock from '@/components/agency/IcoAdvisoryBlock'
import IcoCharts from '@/components/agency/IcoCharts'
import type { RpaTrendBySpace } from '@/components/agency/IcoCharts'
import SpaceIcoScorecard from '@/components/agency/SpaceIcoScorecard'

import { GH_AGENCY } from '@/config/greenhouse-nomenclature'
import type { SpaceMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import type { AgencyPerformanceReport } from '@/lib/ico-engine/performance-report'
import type { AgencyAiLlmSummary } from '@/lib/ico-engine/ai/llm-types'

export type AgencyIcoData = {
  periodYear: number
  periodMonth: number
  spaces: SpaceMetricSnapshot[]
  totalSpaces: number
  report: AgencyPerformanceReport | null
  aiLlm?: AgencyAiLlmSummary | null
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

const trendChipColor = (trend: AgencyPerformanceReport['summary']['trend']): 'success' | 'secondary' | 'error' =>
  trend === 'improving' ? 'success' : trend === 'degrading' ? 'error' : 'secondary'

const trendChipLabel = (trend: AgencyPerformanceReport['summary']['trend']): string =>
  trend === 'improving' ? 'Mejorando' : trend === 'degrading' ? 'Retroceso' : 'Estable'

const AgencyIcoEngineView = ({ data, onComputeLive, computingLive }: Props) => {
  const theme = useTheme()
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
        sx={{ p: 3, border: `1px solid ${theme.palette.customColors.lightAlloy}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap gap={1}>
          <div>
            <Typography variant='h5' sx={{ fontWeight: 700, color: theme.palette.customColors.midnight, mb: 0.5 }}>
              {GH_AGENCY.ico_title}
            </Typography>
            <Typography variant='body2' sx={{ color: theme.palette.text.secondary }}>
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

          {/* Performance Report — Progressive Disclosure */}
          {data.report ? (
            <SectionErrorBoundary sectionName='ico-performance-report' description='No pudimos construir el scorecard mensual de performance.'>
              <Stack spacing={3}>
                {/* Accordion 1: Salud de entrega */}
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <Accordion disableGutters elevation={0}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <i className='tabler-heartbeat' style={{ fontSize: 20 }} />
                        <Typography variant='h6'>Salud de entrega</Typography>
                        <CustomChip
                          size='small'
                          round='true'
                          variant='tonal'
                          color={trendChipColor(data.report.summary.trend)}
                          label={trendChipLabel(data.report.summary.trend)}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
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
                            subtitle='Carga creada este mes con entrega futura'
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                          <HorizontalWithSubtitle
                            title='Overdue Carried Forward'
                            stats={formatCount(data.report.summary.overdueCarriedForward)}
                            avatarIcon='tabler-clock-exclamation'
                            avatarColor='warning'
                            subtitle='Deuda vencida de períodos anteriores'
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Card>

                {/* Accordion 2: Volumen y composicion */}
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <Accordion disableGutters elevation={0}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <i className='tabler-chart-pie' style={{ fontSize: 20 }} />
                        <Typography variant='h6'>Volumen y composición</Typography>
                        <CustomChip
                          size='small'
                          round='true'
                          variant='tonal'
                          color='info'
                          label={`${formatCount(data.report.summary.totalTasks)} tareas`}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={6}>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                          <HorizontalWithSubtitle
                            title='Tareas Efeonce'
                            stats={formatCount(data.report.summary.efeonceTasks)}
                            avatarIcon='tabler-building-factory'
                            avatarColor='info'
                            subtitle='Carga segmentada como operación interna'
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                          <HorizontalWithSubtitle
                            title='Tareas Sky'
                            stats={formatCount(data.report.summary.skyTasks)}
                            avatarIcon='tabler-plane'
                            avatarColor='primary'
                            subtitle='Carga segmentada como Sky / client team'
                          />
                        </Grid>
                        {data.report.taskMix
                          .filter(segment => !['efeonce', 'sky'].includes(segment.segmentKey))
                          .slice(0, 3)
                          .map(segment => (
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
                          <Tooltip
                            title={`Ranking por OTD del período, desempate por throughput y RpA. Multi-assignee: ${data.report.assumptions.multiAssigneePolicy}. Min throughput: ${data.report.assumptions.topPerformerMinThroughput}.`}
                            arrow
                            placement='top'
                          >
                            <Card
                              elevation={0}
                              sx={{ p: 3, border: `1px solid ${theme.palette.customColors.lightAlloy}`, borderRadius: 3, bgcolor: 'background.paper' }}
                            >
                              <Stack direction='row' spacing={2} alignItems='center'>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: theme.palette.background.default }}>
                                  <i className='tabler-trophy' style={{ fontSize: 20 }} />
                                </Box>
                                <div>
                                  <Typography variant='overline' sx={{ color: theme.palette.text.secondary }}>
                                    Top Performer del período
                                  </Typography>
                                  <Typography variant='h6' sx={{ fontWeight: 700, color: theme.palette.customColors.midnight }}>
                                    {data.report.topPerformer?.memberName ?? 'Sin ranking elegible'}
                                  </Typography>
                                  <Typography variant='body2' sx={{ color: theme.palette.text.secondary }}>
                                    {data.report.topPerformer
                                      ? `${formatPct(data.report.topPerformer.otdPct)} OTD · ${data.report.topPerformer.throughputCount} completadas · RpA ${data.report.topPerformer.rpaAvg?.toFixed(2) ?? '—'}`
                                      : `Se requiere throughput >= ${data.report.assumptions.topPerformerMinThroughput} para entrar al ranking.`}
                                  </Typography>
                                </div>
                              </Stack>
                            </Card>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Card>

                {/* Accordion 3: Resumen ejecutivo */}
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <Accordion disableGutters elevation={0}>
                    <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <i className='tabler-report' style={{ fontSize: 20 }} />
                        <Typography variant='h6'>Resumen ejecutivo</Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2.5}>
                        <div>
                          <Typography variant='overline' sx={{ color: theme.palette.text.secondary }}>
                            Alerta
                          </Typography>
                          <Typography variant='body1' sx={{ color: theme.palette.customColors.midnight, fontWeight: 600 }}>
                            {data.report.alertText}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant='overline' sx={{ color: theme.palette.text.secondary }}>
                            Resumen Ejecutivo
                          </Typography>
                          <Typography variant='body2' sx={{ color: theme.palette.text.secondary }}>
                            {data.report.executiveSummary}
                          </Typography>
                        </div>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Card>
              </Stack>
            </SectionErrorBoundary>
          ) : null}

          {/* Advisory AI Block — LLM enrichment surfacing */}
          {data.aiLlm && (
            <SectionErrorBoundary sectionName='ico-advisory' description='No pudimos cargar las señales de Nexa Insights.'>
              <IcoAdvisoryBlock aiLlm={data.aiLlm} />
            </SectionErrorBoundary>
          )}
        </>
      )}
    </Stack>
  )
}

export default AgencyIcoEngineView
