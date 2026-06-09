'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  GREENHOUSE_CHART_CHROME_TOKENS,
  GreenhouseButton,
  GreenhouseChartCard,
  GreenhouseHealthSignalChart,
  GreenhouseMetricBreakdownChartCard,
  GreenhouseStackedDistributionChartCard,
  type GreenhouseChartTab,
  type GreenhouseHealthSignalSegment,
  type GreenhouseMetricBreakdownMetric,
  type GreenhouseMetricBreakdownPoint,
  type GreenhouseStackedDistributionSegment
} from '@/components/greenhouse/primitives'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
      py: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      ...typographyScale.labelSm,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

const weeklyEarningsSeries: GreenhouseMetricBreakdownPoint[] = [
  { label: 'Mo', value: 51 },
  { label: 'Tu', value: 104 },
  { label: 'We', value: 89 },
  { label: 'Th', value: 56 },
  { label: 'Fr', value: 137 },
  { label: 'Sa', value: 73 },
  { label: 'Su', value: 96 }
]

const weeklyEarningsMetrics: GreenhouseMetricBreakdownMetric[] = [
  {
    id: 'earnings',
    label: 'Earnings',
    value: '$545.69',
    icon: 'tabler-currency-dollar',
    tone: 'success',
    progress: 64
  },
  {
    id: 'profit',
    label: 'Profit',
    value: '$256.34',
    icon: 'tabler-chart-pie-2',
    tone: 'info',
    progress: 58
  },
  {
    id: 'expense',
    label: 'Expense',
    value: '$74.19',
    icon: 'tabler-brand-paypal',
    tone: 'error',
    progress: 22
  }
]

const teamHealthSegments: GreenhouseHealthSignalSegment[] = [
  { id: 'stable', label: 'Estable', value: 82, tone: 'success' },
  { id: 'watch', label: 'En observación', value: 13, tone: 'warning' },
  { id: 'critical', label: 'Intervención', value: 5, tone: 'error' }
]

const monthlyEarnings = [
  { label: 'Jan', value: 28000 },
  { label: 'Feb', value: 10000 },
  { label: 'Mar', value: 45000 },
  { label: 'Apr', value: 38000 },
  { label: 'May', value: 15000 },
  { label: 'Jun', value: 30000 },
  { label: 'Jul', value: 35000 },
  { label: 'Aug', value: 28000 },
  { label: 'Sep', value: 8000 }
]

const chartTabs: GreenhouseChartTab[] = [
  {
    id: 'orders',
    label: 'Orders',
    icon: 'tabler-shopping-cart',
    tone: 'success',
    highlightedIndex: 2,
    data: monthlyEarnings
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'tabler-chart-bar',
    tone: 'primary',
    highlightedIndex: 6,
    data: [
      { label: 'Jan', value: 22000 },
      { label: 'Feb', value: 18000 },
      { label: 'Mar', value: 32000 },
      { label: 'Apr', value: 41000 },
      { label: 'May', value: 27000 },
      { label: 'Jun', value: 36000 },
      { label: 'Jul', value: 47000 },
      { label: 'Aug', value: 30000 },
      { label: 'Sep', value: 26000 }
    ]
  },
  {
    id: 'profit',
    label: 'Profit',
    icon: 'tabler-currency-dollar',
    tone: 'secondary',
    highlightedIndex: 3,
    data: [
      { label: 'Jan', value: 14000 },
      { label: 'Feb', value: 9000 },
      { label: 'Mar', value: 28000 },
      { label: 'Apr', value: 31000 },
      { label: 'May', value: 12000 },
      { label: 'Jun', value: 25000 },
      { label: 'Jul', value: 29000 },
      { label: 'Aug', value: 18000 },
      { label: 'Sep', value: 11000 }
    ]
  },
  {
    id: 'income',
    label: 'Income',
    icon: 'tabler-chart-pie-2',
    tone: 'info',
    highlightedIndex: 4,
    data: [
      { label: 'Jan', value: 19000 },
      { label: 'Feb', value: 24000 },
      { label: 'Mar', value: 27000 },
      { label: 'Apr', value: 34000 },
      { label: 'May', value: 39000 },
      { label: 'Jun', value: 33000 },
      { label: 'Jul', value: 31000 },
      { label: 'Aug', value: 36000 },
      { label: 'Sep', value: 21000 }
    ]
  },
  {
    id: 'add',
    label: 'Agregar metrica',
    ariaLabel: 'Agregar otra metrica al reporte',
    icon: 'tabler-plus'
  }
]

const vehicleSegments: GreenhouseStackedDistributionSegment[] = [
  {
    id: 'onTheWay',
    label: 'On the way',
    value: 39.7,
    detail: '2hr 10min',
    icon: 'tabler-car',
    tone: 'neutral'
  },
  {
    id: 'unloading',
    label: 'Unloading',
    value: 28.3,
    detail: '3hr 15min',
    icon: 'tabler-circle-arrow-down',
    tone: 'success'
  },
  {
    id: 'loading',
    label: 'Loading',
    value: 17.4,
    detail: '1hr 24min',
    icon: 'tabler-circle-arrow-up',
    tone: 'info'
  },
  {
    id: 'waiting',
    label: 'Waiting',
    value: 14.6,
    detail: '5hr 19min',
    icon: 'tabler-clock',
    tone: 'ink'
  }
]

const ChartsLabView = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
      maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
      mx: 'auto'
    }}
  >
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
      <GreenhouseButton
        component={Link}
        href={DESIGN_SYSTEM_LAB_TOKENS.routes.root}
        variant='text'
        tone='secondary'
        kind='navigation'
        size='small'
        leadingIcon={<i className='tabler-arrow-left' />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Design System
      </GreenhouseButton>
      <AxisWordmark
        variant='auto'
        height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize}
        sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}
      />
      <Typography variant='overline' color='primary'>
        Charts Lab
      </Typography>
      <Typography variant='h4'>
        Charts enterprise para Greenhouse
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        Laboratorio interno para primitives de visualizacion de datos. Estas piezas adaptan componentes AXIS Figma a
        Recharts, tokens Greenhouse, tooltips accesibles y fallback compacto para lectores de pantalla.
      </Typography>
    </Stack>

    <Box
      data-capture='charts-lab-health-signal'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(0, ${GREENHOUSE_CHART_CHROME_TOKENS.card.compactMaxInlineSize}px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.asideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'center'
      }}
    >
      <Box
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          bgcolor: 'background.paper',
          boxShadow: theme.greenhouseElevation.none.boxShadow,
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset
        })}
      >
        <Stack spacing={3} alignItems='center'>
          <GreenhouseHealthSignalChart
            segments={teamHealthSegments}
            score={82}
            kind='teamHealth'
            dataCapture='greenhouse-health-signal-chart'
            ariaLabel='Salud del equipo: 82 de 100, 13 por ciento en observación, 5 por ciento crítico'
          />
          <Stack spacing={0.75} alignItems='center' textAlign='center'>
            <Typography variant='h5'>Cobertura saludable</Typography>
            <Typography variant='body2' color='text.secondary'>
              Señal compacta para salud, cobertura y continuidad operativa.
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Stack spacing={3} sx={{ py: { xs: 0, lg: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup } }}>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Primitive + variant</Typography>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>GreenhouseHealthSignalChart</InlineCode> owns the filled health signal, segmented donut geometry,
            chart-color mapping and accessible summary. <InlineCode>variant=segmentedDonut</InlineCode> is the canonical
            base for team health, talent health and capacity health kinds.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini reglas de uso</Typography>
          <Typography variant='body2' color='text.secondary'>
            Usarlo solo para señales de salud/cobertura/continuidad con score o distribución real. No usarlo como icono
            decorativo, indicador romántico ni reemplazo de charts de composición amplios.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Mini reglas de cambio</Typography>
          <Typography variant='body2' color='text.secondary'>
            Cualquier nuevo kind debe entrar primero aquí con data-capture, GVC desktop/mobile y segmentos con label accesible.
            Los colores salen del Chart SoT; no se agregan HEX ni tonos locales.
          </Typography>
        </Stack>
      </Stack>
    </Box>

    <Box
      data-capture='charts-lab-weekly-earnings'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(0, ${GREENHOUSE_CHART_CHROME_TOKENS.card.compactMaxInlineSize}px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.asideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <GreenhouseMetricBreakdownChartCard
        title='Earning Reports'
        subtitle='Weekly Earnings Overview'
        heroValue='$468'
        deltaLabel='+4.2%'
        deltaTone='success'
        description={['You informed of this week', 'compared to last week']}
        series={weeklyEarningsSeries}
        metrics={weeklyEarningsMetrics}
        highlightedIndex={4}
        maxValue={150}
        variant='weeklyBarSummary'
        kind='earningReports'
        dataCapture='greenhouse-metric-breakdown-earning-reports'
      />

      <Stack spacing={3} sx={{ py: { xs: 0, lg: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup } }}>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Primitive + variant</Typography>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>GreenhouseMetricBreakdownChartCard</InlineCode> owns the KPI headline, delta chip, weekly Recharts bar,
            metric meters and compact accessible summary. <InlineCode>variant=weeklyBarSummary</InlineCode> covers
            financial or operational snapshots that mix one hero number with a short series.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Library choice</Typography>
          <Typography variant='body2' color='text.secondary'>
            Recharts stays the right engine because the weekly bars need real data, hover semantics and responsive control; MUI
            owns the metric breakdown and progress meters.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Data contract</Typography>
          <Typography variant='body2' color='text.secondary'>
            Consumers pass a hero value, delta, seven-point series and ordered metrics with icon, tone and progress. Domain
            readers own calculation; the primitive owns the visual shell and chart accessibility.
          </Typography>
        </Stack>
      </Stack>
    </Box>

    <Box
      data-capture='charts-lab-vehicles-overview'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(0, ${GREENHOUSE_CHART_CHROME_TOKENS.card.compactMaxInlineSize}px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.asideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <GreenhouseStackedDistributionChartCard
        title='Vehicles overview'
        segments={vehicleSegments}
        variant='stackedStatus'
        kind='vehiclesOverview'
        dataCapture='greenhouse-stacked-distribution-vehicles-overview'
      />

      <Stack spacing={3} sx={{ py: { xs: 0, lg: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup } }}>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Primitive + variant</Typography>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>GreenhouseStackedDistributionChartCard</InlineCode> owns the stacked distribution, row details, tooltip,
            responsive behavior and accessible summary. <InlineCode>variant=stackedStatus</InlineCode> covers operational
            state mixes like vehicles, workloads or capacity lanes.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Library choice</Typography>
          <Typography variant='body2' color='text.secondary'>
            Recharts is the right fit because the card is still a chart: the stacked bar consumes real series data and can expose a
            tooltip, while MUI owns the operational detail rows.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Data contract</Typography>
          <Typography variant='body2' color='text.secondary'>
            Consumers pass ordered segments with label, percentage, optional detail, icon and tone. Domain readers calculate the
            distribution; the primitive keeps the visual and a11y contract stable.
          </Typography>
        </Stack>
      </Stack>
    </Box>

    <Box
      data-capture='charts-lab-earning-reports'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: `minmax(0, ${GREENHOUSE_CHART_CHROME_TOKENS.card.wideMaxInlineSize}px) minmax(${DESIGN_SYSTEM_LAB_TOKENS.layout.narrowAsideMinInlineSize}px, 1fr)`
        },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      <GreenhouseChartCard
        title='Earning Reports'
        subtitle='Yearly Earnings Overview'
        tabs={chartTabs}
        defaultActiveTabId='orders'
        variant='monthlyBar'
        kind='earningReports'
        maxValue={50000}
        dataCapture='greenhouse-chart-card-earning-reports'
      />

      <Stack spacing={3} sx={{ py: { xs: 0, lg: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup } }}>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Primitive + variant</Typography>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>GreenhouseChartCard</InlineCode> owns layout, tabs, Recharts wiring, tooltip, responsive overflow and chart
            accessibility. <InlineCode>variant=monthlyBar</InlineCode> covers the AXIS earning-report composition.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Library choice</Typography>
          <Typography variant='body2' color='text.secondary'>
            Recharts fits this card because labels, hover state and fallback content stay inside React. Apex remains available for
            existing dashboards, but this primitive needs stronger control over semantic tabs and chart accessibility.
          </Typography>
        </Stack>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Data contract</Typography>
          <Typography variant='body2' color='text.secondary'>
            Consumers pass tabs with metric series, icon, tone and optional highlighted bar. Domain logic, readers and API parity
            stay outside the visual primitive.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  </Box>
)

export default ChartsLabView
