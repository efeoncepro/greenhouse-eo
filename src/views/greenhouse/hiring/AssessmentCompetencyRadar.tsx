'use client'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import AppRecharts from '@/libs/styles/AppRecharts'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from '@/libs/Recharts'

import {
  competencyRadarLabelLines,
  isAssessmentRadarComplete,
  type AssessmentCompetencyRadarRow
} from './assessment-competency-radar'

interface RadarCopy {
  scoreLegend: string
  targetLegend: string
  partialTitle: string
  partialBody: string
  score: string
  objective: string
  pending: string
}

interface AssessmentCompetencyRadarProps {
  rows: AssessmentCompetencyRadarRow[]
  copy: RadarCopy
  ariaLabel: string
}

interface RadarTickProps {
  x?: number
  y?: number
  payload?: { value?: string }
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit'
}

const RadarTick = ({ x = 0, y = 0, payload, textAnchor = 'middle' }: RadarTickProps) => {
  const lines = String(payload?.value ?? '').split('|')

  return (
    <text
      className='recharts-polar-angle-axis-tick-value'
      x={x}
      y={y}
      dy={lines.length > 1 ? -(lines.length - 1) * 7 : 4}
      textAnchor={textAnchor}
      fill='var(--mui-palette-text-secondary)'
    >
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : '1.15em'}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

const LegendLine = ({ dashed = false, color }: { dashed?: boolean; color: string }) => (
  <Box
    aria-hidden='true'
    sx={{
      inlineSize: 28,
      borderBlockStart: 3,
      borderColor: color,
      borderStyle: dashed ? 'dashed' : 'solid',
      borderInline: 0,
      borderBlockEnd: 0
    }}
  />
)

export default function AssessmentCompetencyRadar({ rows, copy, ariaLabel }: AssessmentCompetencyRadarProps) {
  const theme = useTheme()
  const complete = isAssessmentRadarComplete(rows)
  const pendingCount = rows.filter(row => row.pending || row.score == null).length

  const data = rows.map(row => ({
    ...row,
    axisLabel: competencyRadarLabelLines(row.competencyKey, row.competencyName).join('|')
  }))

  return (
    <Stack component='figure' spacing={2.5} sx={{ m: 0 }} data-capture='assessment-competency-radar'>
      {!complete ? (
        <Box
          role='status'
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            gap: 1.5,
            alignItems: 'start',
            p: 2,
            borderRadius: 1,
            color: 'info.dark',
            bgcolor: 'info.lightOpacity'
          }}
        >
          <i className='tabler-chart-radar' aria-hidden='true' />
          <Box>
            <Typography variant='subtitle2'>{copy.partialTitle}</Typography>
            <Typography variant='body2'>{copy.partialBody.replace('{count}', String(pendingCount))}</Typography>
          </Box>
        </Box>
      ) : null}

      <Stack direction='row' spacing={2.5} alignItems='center' flexWrap='wrap' useFlexGap>
        {complete ? (
          <Stack direction='row' spacing={1} alignItems='center'>
            <LegendLine color={theme.palette.primary.main} />
            <Typography variant='caption' color='text.secondary'>
              {copy.scoreLegend}
            </Typography>
          </Stack>
        ) : null}
        <Stack direction='row' spacing={1} alignItems='center'>
          <LegendLine dashed color={theme.palette.warning.main} />
          <Typography variant='caption' color='text.secondary'>
            {copy.targetLegend}
          </Typography>
        </Stack>
      </Stack>

      <Box role='img' aria-label={ariaLabel} sx={{ blockSize: { xs: 340, sm: 390 }, minInlineSize: 0 }}>
        <AppRecharts style={{ width: '100%', height: '100%' }}>
          <ResponsiveContainer width='100%' height='100%'>
            <RadarChart data={data} outerRadius='65%' margin={{ top: 30, right: 48, bottom: 30, left: 48 }}>
              <PolarGrid stroke={theme.palette.divider} />
              <PolarAngleAxis dataKey='axisLabel' tick={<RadarTick />} tickLine={false} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                labelFormatter={(_label, payload) => {
                  const datum = payload?.[0]?.payload as { competencyName?: string } | undefined

                  return datum?.competencyName ?? ''
                }}
                formatter={(value, name) => [`${Math.round(Number(value ?? 0))}/100`, String(name)]}
              />
              <Radar
                dataKey='target'
                name={copy.targetLegend}
                stroke={theme.palette.warning.main}
                fill='transparent'
                strokeWidth={2}
                strokeDasharray='7 6'
                dot={{ r: 2, fill: theme.palette.warning.main }}
                isAnimationActive={false}
              />
              {complete ? (
                <Radar
                  dataKey='score'
                  name={copy.scoreLegend}
                  stroke={theme.palette.primary.main}
                  fill={theme.palette.primary.main}
                  fillOpacity={0.18}
                  strokeWidth={3}
                  dot={{ r: 3, fill: theme.palette.primary.main }}
                  isAnimationActive={false}
                />
              ) : null}
            </RadarChart>
          </ResponsiveContainer>
        </AppRecharts>
      </Box>

      <Grid container spacing={1.5} component='figcaption'>
        {rows.map((row, index) => (
          <Grid key={row.competencyId} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Stack
              direction='row'
              spacing={1.25}
              alignItems='flex-start'
              sx={{ p: 1.5, blockSize: '100%', border: 1, borderColor: 'divider', borderRadius: 1 }}
            >
              <Box
                aria-hidden='true'
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  flex: '0 0 auto',
                  inlineSize: 24,
                  blockSize: 24,
                  borderRadius: '50%',
                  bgcolor: 'primary.lightOpacity',
                  color: 'primary.main',
                  typography: 'caption',
                  fontWeight: 800
                }}
              >
                {index + 1}
              </Box>
              <Box sx={{ minInlineSize: 0 }}>
                <Typography variant='body2' fontWeight={700}>
                  {row.competencyName}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {row.score == null ? copy.pending : `${copy.score} ${row.score}/100`} · {copy.objective} {row.target}
                  /100
                </Typography>
              </Box>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}
