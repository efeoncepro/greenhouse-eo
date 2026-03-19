'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import EmptyState from '@/components/greenhouse/EmptyState'
import IcoGlobalKpis from '@/components/agency/IcoGlobalKpis'
import IcoCharts from '@/components/agency/IcoCharts'
import type { RpaTrendBySpace } from '@/components/agency/IcoCharts'
import SpaceIcoScorecard from '@/components/agency/SpaceIcoScorecard'
import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { SpaceMetricSnapshot } from '@/lib/ico-engine/read-metrics'

export type AgencyIcoData = {
  periodYear: number
  periodMonth: number
  spaces: SpaceMetricSnapshot[]
  totalSpaces: number
}

type Props = {
  data: AgencyIcoData | null
  onComputeLive?: () => void
  computingLive?: boolean
}

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
