'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import classnames from 'classnames'

import type { ThemeColor } from '@core/types'
import CustomAvatar from '@core/components/mui/Avatar'

import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, FunnelChart, Funnel, Cell, Tooltip, LabelList } from '@/libs/Recharts'

// ── Types ──

export interface FunnelStage {
  name: string
  value: number
  color?: string
  status?: 'success' | 'warning' | 'error'
}

export interface GreenhouseFunnelCardProps {
  title: string
  subtitle?: string
  avatarIcon?: string
  avatarColor?: ThemeColor
  data: FunnelStage[]
  height?: number
  showConversionBadges?: boolean
  showFooterSummary?: boolean
  onStageClick?: (stage: FunnelStage, index: number) => void
  loading?: boolean
}

// ── Palette ──

const DEFAULT_STAGE_TOKENS: ThemeColor[] = ['primary', 'info', 'warning', 'error', 'success']

// ── Conversion helpers ──

interface ConversionInsight {
  totalConversionPct: number | null
  criticalStage: { name: string; dropPct: number } | null
  isHealthy: boolean
}

const computeConversions = (data: FunnelStage[]): { rates: (number | null)[]; insight: ConversionInsight } => {
  const rates: (number | null)[] = []

  let worstDrop = 0
  let worstName = ''

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rates.push(null)
      continue
    }

    const prev = data[i - 1].value
    const curr = data[i].value

    if (prev > 0) {
      const rate = Math.round((curr / prev) * 100)
      const drop = 100 - rate

      rates.push(rate)

      if (drop > worstDrop) {
        worstDrop = drop
        worstName = data[i].name
      }
    } else {
      rates.push(null)
    }
  }

  const first = data[0]?.value ?? 0
  const last = data[data.length - 1]?.value ?? 0
  const totalConversionPct = first > 0 ? Math.round((last / first) * 1000) / 10 : null
  const isHealthy = worstDrop <= 20

  return {
    rates,
    insight: {
      totalConversionPct,
      criticalStage: worstDrop > 0 ? { name: worstName, dropPct: Math.round(worstDrop) } : null,
      isHealthy
    }
  }
}

// ── Custom tooltip ──

interface TooltipPayloadItem {
  name: string
  value: number
  payload: { name: string; value: number; fill: string; pctOfTotal: number; conversionRate: number | null }
}

const CustomFunnelTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload?.length) return null

  const item = payload[0].payload

  return (
    <Box className='recharts-custom-tooltip'>
      <Typography variant='subtitle2' fontWeight={600}>{item.name}</Typography>
      <Typography variant='body2'>{item.value.toLocaleString('es-CL')} registros</Typography>
      <Typography variant='body2' color='text.secondary'>{item.pctOfTotal}% del total</Typography>
      {item.conversionRate != null && (
        <Typography variant='body2' color='text.secondary'>
          {item.conversionRate}% conversión vs etapa anterior
        </Typography>
      )}
    </Box>
  )
}

// ── Custom label ──

const CustomFunnelLabel = (props: {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  name?: string
}) => {
  const { x = 0, y = 0, width = 0, height = 0, value, name } = props

  if (height < 18) return null

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      textAnchor='middle'
      dominantBaseline='central'
      fill='#fff'
      fontSize={height < 30 ? 11 : 13}
      fontWeight={600}
      fontFamily='var(--font-dm-sans), sans-serif'
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
    >
      {name} · {(value ?? 0).toLocaleString('es-CL')}
    </text>
  )
}

// ── Component ──

const GreenhouseFunnelCard = ({
  title,
  subtitle,
  avatarIcon = 'tabler-filter',
  avatarColor = 'primary',
  data,
  height = 280,
  showConversionBadges = true,
  showFooterSummary = true,
  onStageClick,
  loading = false
}: GreenhouseFunnelCardProps) => {
  const theme = useTheme()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const { rates, insight } = useMemo(() => computeConversions(data), [data])

  const totalValue = data.reduce((sum, s) => sum + s.value, 0)

  // Resolve colors: status → theme semantic, color → direct hex, default → sequential palette
  const resolveColor = (stage: FunnelStage, index: number): string => {
    if (stage.status) return theme.palette[stage.status].main
    if (stage.color) return stage.color

    const token = DEFAULT_STAGE_TOKENS[index % DEFAULT_STAGE_TOKENS.length]

    return theme.palette[token].main
  }

  // Enrich data for Recharts + tooltip
  const chartData = data.map((stage, i) => ({
    name: stage.name,
    value: Math.max(stage.value, 1), // Minimum 1 for visual rendering (0 → collapsed)
    actualValue: stage.value,
    fill: resolveColor(stage, i),
    pctOfTotal: totalValue > 0 ? Math.round((stage.value / totalValue) * 100) : 0,
    conversionRate: rates[i] ?? null
  }))

  // Screen reader description
  const srDescription = data.map((s, i) => {
    const pct = rates[i] != null ? ` (${rates[i]}% conversión)` : ' (100%)'

    return `${s.name}: ${s.value.toLocaleString('es-CL')} registros${pct}`
  }).join('. ')

  const chartHeight = isMobile ? 200 : height

  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardHeader
        title={title}
        subheader={subtitle ?? `${data.length} etapas · ${totalValue.toLocaleString('es-CL')} registros`}
        avatar={
          <CustomAvatar variant='rounded' skin='light' color={avatarColor}>
            <i className={classnames(avatarIcon, 'text-[22px]')} />
          </CustomAvatar>
        }
      />

      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
            {[100, 85, 70, 55, 40].map((w, i) => (
              <Skeleton key={i} variant='rectangular' width={`${w}%`} height={chartHeight / 6} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : data.length === 0 ? (
          <Box role='status' sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant='body2' color='text.secondary'>Sin etapas configuradas</Typography>
          </Box>
        ) : (
          <figure
            role='img'
            aria-label={`Embudo ${title}: ${data.length} etapas, conversión total ${insight.totalConversionPct ?? 0}%`}
            style={{ margin: 0, position: 'relative' }}
          >
            <AppRecharts>
              <ResponsiveContainer width='100%' height={chartHeight}>
                <FunnelChart>
                  <Tooltip content={<CustomFunnelTooltip />} />
                  <Funnel
                    dataKey='value'
                    nameKey='name'
                    data={chartData}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={800}
                    animationEasing='ease-out'
                  >
                    <LabelList
                      dataKey='name'
                      position='center'
                      content={<CustomFunnelLabel />}
                    />
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.fill}
                        style={onStageClick ? { cursor: 'pointer' } : undefined}
                        onClick={onStageClick ? () => onStageClick(data[i], i) : undefined}
                      />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </AppRecharts>

            {/* Conversion badges between stages */}
            {showConversionBadges && !isMobile && rates.length > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 16,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  py: 2,
                  pointerEvents: 'none'
                }}
              >
                {rates.slice(1).map((rate, i) => (
                  <Typography key={i} variant='caption' color='text.secondary' sx={{ fontSize: '0.7rem' }}>
                    → {rate ?? 0}%
                  </Typography>
                ))}
              </Box>
            )}

            {/* Screen reader accessible description */}
            <figcaption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              {srDescription}
            </figcaption>
          </figure>
        )}
      </CardContent>

      {/* Footer summary */}
      {showFooterSummary && data.length >= 2 && !loading && (
        <>
          <Divider />
          <CardContent sx={{ py: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                Conversión total: <strong>{insight.totalConversionPct ?? 0}%</strong>
              </Typography>
              {insight.isHealthy ? (
                <Chip size='small' variant='outlined' color='success' icon={<i className='tabler-circle-check' style={{ fontSize: 14 }} />} label='Flujo saludable' />
              ) : insight.criticalStage ? (
                <Chip size='small' variant='outlined' color='error' icon={<i className='tabler-alert-triangle' style={{ fontSize: 14 }} />} label={`${insight.criticalStage.name} (−${insight.criticalStage.dropPct}%)`} />
              ) : null}
            </Box>
          </CardContent>
        </>
      )}
    </Card>
  )
}

export default GreenhouseFunnelCard
