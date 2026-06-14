'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import MetricSummaryCard from '@/components/greenhouse/primitives/MetricSummaryCard'
import MetricTrendCard, { type MetricTrendPoint } from '@/components/greenhouse/primitives/MetricTrendCard'

/**
 * Lab interno del Adaptive Card density contract (TASK-1115). INTERNAL ONLY — los clientes nunca lo ven.
 * Specimen vivo: el MISMO card a tres anchos fijos (full / condensed / peek), con `density='auto'`, para
 * verificar la **condensación honesta** (cada modo es una versión real más chica; el dato clave —el value—
 * nunca desaparece; nunca clip/overflow). El card se adapta a SU propio ancho (container query), NO al shell:
 * cuando una región del Composition Shell condensa, su query dispara sola. Verificado desktop+mobile vía GVC.
 */

// Anchos elegidos para caer en cada fit mode (breakpoints CARD_DENSITY_BREAKPOINTS: condensed 360 / peek 200).
const WIDTHS: { mode: string; label: string; width: number }[] = [
  { mode: 'full', label: 'full · ≥ 360px', width: 460 },
  { mode: 'condensed', label: 'condensed · 200–359px', width: 280 },
  { mode: 'peek', label: 'peek · < 200px', width: 150 }
]

const TREND_SERIES: MetricTrendPoint[] = [
  { label: 'Ene', value: 82.1 },
  { label: 'Feb', value: 84.6 },
  { label: 'Mar', value: 83.2 },
  { label: 'Abr', value: 86.0 },
  { label: 'May', value: 87.4 }
]

const SpecimenRow = ({ title, render }: { title: string; render: (width: number) => ReactNode }) => (
  <Stack spacing={3} data-capture={`card-density-row-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <Typography variant='subtitle2'>{title}</Typography>
    <Stack direction='row' spacing={5} alignItems='flex-start' flexWrap='wrap' useFlexGap>
      {WIDTHS.map(w => (
        <Stack key={w.mode} spacing={2}>
          <Typography variant='caption' color='text.secondary'>
            {w.label}
          </Typography>
          {/* Contenedor de ancho fijo = el card resuelve su fit mode desde este ancho (container query). */}
          <Box sx={{ width: w.width }}>{render(w.width)}</Box>
        </Stack>
      ))}
    </Stack>
  </Stack>
)

const CardDensityLabView = () => (
  <Stack spacing={8} sx={{ p: { xs: 4, md: 6 } }} data-capture='card-density-lab'>
    <Box>
      <Typography variant='h4'>Adaptive Card — density contract</Typography>
      <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
        Capacidad hermana del Composition Shell (TASK-1115). El mismo card a tres anchos con{' '}
        <code>density=&apos;auto&apos;</code>: <strong>full</strong> (todo), <strong>condensed</strong> (versión
        real más chica), <strong>peek</strong> (solo el dato clave). El card responde a su propio ancho
        (container query), no al shell. El value nunca desaparece; nunca clipea.
      </Typography>
    </Box>

    <SpecimenRow
      title='MetricSummaryCard (KPI)'
      render={() => (
        <MetricSummaryCard
          density='auto'
          title='RpA Global'
          value='1.27'
          subtitle='benchmark adaptado · dato confiable'
          icon='tabler-target-arrow'
          iconColor='primary'
          tooltip='Rondas por aprobación'
          statusLabel='Confiable'
          statusTone='success'
          statusIcon='tabler-circle-check'
        />
      )}
    />

    <SpecimenRow
      title='MetricTrendCard (KPI + tendencia)'
      render={() => (
        <MetricTrendCard
          density='auto'
          title='OTD%'
          metricName='On-Time Delivery'
          periodLabel='Mensual · May 2026'
          value={87.4}
          series={TREND_SERIES}
          tone='success'
          format='percentage'
          deltaUnit='pts'
        />
      )}
    />
  </Stack>
)

export default CardDensityLabView
