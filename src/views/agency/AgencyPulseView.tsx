'use client'

import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import PulseGlobalHeader from '@/components/agency/PulseGlobalHeader'
import PulseGlobalKpis from '@/components/agency/PulseGlobalKpis'
import PulseGlobalCharts from '@/components/agency/PulseGlobalCharts'
import SpaceHealthTable from '@/components/agency/SpaceHealthTable'
import type { AgencyChartStatusItem, AgencyChartWeeklyPoint, AgencyPulseKpis, AgencySpaceHealth } from '@/lib/agency/agency-queries'

type Props = {
  kpis: AgencyPulseKpis | null
  spaces: AgencySpaceHealth[]
  statusMix: AgencyChartStatusItem[]
  weeklyActivity: AgencyChartWeeklyPoint[]
  tenantName: string
}

const AgencyPulseView = ({ kpis, spaces, statusMix, weeklyActivity }: Props) => (
  <Stack spacing={4}>
    <SectionErrorBoundary sectionName='agency-header' description='No pudimos cargar el encabezado.'>
      <PulseGlobalHeader kpis={kpis} />
    </SectionErrorBoundary>

    <SectionErrorBoundary sectionName='agency-kpis' description='No pudimos cargar los KPIs globales.'>
      <PulseGlobalKpis kpis={kpis} />
    </SectionErrorBoundary>

    <SectionErrorBoundary sectionName='agency-charts' description='No pudimos cargar los gráficos.'>
      <PulseGlobalCharts spaces={spaces} statusMix={statusMix} weeklyActivity={weeklyActivity} />
    </SectionErrorBoundary>

    <SectionErrorBoundary sectionName='agency-health-table' description='No pudimos cargar la tabla de Spaces.'>
      <ExecutiveCardShell title='Health de Spaces' subtitle='Vista rápida del estado operativo de cada Space activo'>
        {spaces.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>No hay Spaces activos registrados.</Typography>
        ) : (
          <SpaceHealthTable spaces={spaces} />
        )}
      </ExecutiveCardShell>
    </SectionErrorBoundary>
  </Stack>
)

export default AgencyPulseView
