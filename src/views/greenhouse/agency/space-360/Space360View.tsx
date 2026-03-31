'use client'

import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

import { EmptyState, ExecutiveMiniStatCard } from '@/components/greenhouse'
import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'
import type { Space360Detail } from '@/lib/agency/space-360'

import OverviewTab from './tabs/OverviewTab'
import TeamTab from './tabs/TeamTab'
import ServicesTab from './tabs/ServicesTab'
import DeliveryTab from './tabs/DeliveryTab'
import FinanceTab from './tabs/FinanceTab'
import IcoTab from './tabs/IcoTab'
import { formatMoney, formatPct, formatRatio, titleize } from './shared'

type TabValue = 'overview' | 'team' | 'services' | 'delivery' | 'finance' | 'ico'

const TAB_CONFIG: Array<{ value: TabValue; label: string; icon: string }> = [
  { value: 'overview', label: 'Resumen', icon: 'tabler-layout-dashboard' },
  { value: 'team', label: 'Equipo', icon: 'tabler-users' },
  { value: 'services', label: 'Servicios', icon: 'tabler-briefcase' },
  { value: 'delivery', label: 'Delivery', icon: 'tabler-list-check' },
  { value: 'finance', label: 'Finanzas', icon: 'tabler-report-money' },
  { value: 'ico', label: 'ICO', icon: 'tabler-cpu' }
]

type Props = {
  detail: Space360Detail | null
  requestedId: string
}

const Space360View = ({ detail, requestedId }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') as TabValue | null
  const [tab, setTab] = useState<TabValue>(urlTab && TAB_CONFIG.some(item => item.value === urlTab) ? urlTab : 'overview')

  useEffect(() => {
    document.title = `${detail?.clientName || requestedId} — Space 360 | Greenhouse`
  }, [detail?.clientName, requestedId])

  const handleTabChange = (_event: SyntheticEvent, value: string) => {
    const nextValue = value as TabValue

    setTab(nextValue)

    const params = new URLSearchParams(searchParams.toString())

    if (nextValue === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', nextValue)
    }

    const query = params.toString()

    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  if (!detail) {
    return (
      <EmptyState
        icon='tabler-building-community-off'
        title='Space no encontrado'
        description='No encontramos un Space o clientId operativo con ese identificador.'
        action={<Button component={Link} href='/agency?tab=spaces' variant='contained'>Volver a Spaces</Button>}
      />
    )
  }

  return (
    <Stack spacing={6}>
      <Card elevation={0}>
        <CardContent sx={{ display: 'grid', gap: 3 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ xs: 'flex-start', lg: 'center' }} justifyContent='space-between' gap={3}>
            <Box>
              <Stack direction='row' flexWrap='wrap' gap={1} alignItems='center' sx={{ mb: 1.5 }}>
                <Typography variant='h4'>{detail.spaceName || detail.clientName}</Typography>
                <CustomChip round='true' size='small' color={detail.badges.health.color} variant='tonal' label={`Health ${detail.badges.health.label}`} />
                <CustomChip round='true' size='small' color={detail.badges.risk.color} variant='tonal' label={`Risk ${detail.badges.risk.label}`} />
                {detail.resolutionStatus === 'client_only' ? (
                  <CustomChip round='true' size='small' color='warning' variant='tonal' label='Sin vínculo canónico a Space' />
                ) : null}
              </Stack>
              <Typography variant='body1' color='text.secondary'>
                {detail.organizationName || 'Sin organización'} · {detail.businessLines.length > 0 ? detail.businessLines.map(titleize).join(' · ') : 'Sin business line'} · {detail.clientId}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {detail.spaceId ? `spaceId ${detail.spaceId}` : 'Operando con clientId como clave del Space'}{detail.organizationPublicId ? ` · ${detail.organizationPublicId}` : ''}
              </Typography>
            </Box>

            <Stack direction='row' gap={2} flexWrap='wrap'>
              <Button component={Link} href='/agency?tab=spaces' variant='outlined'>Volver a Spaces</Button>
              {detail.organizationId ? <Button component={Link} href={`/agency/organizations/${detail.organizationId}`} variant='outlined'>Ver organización</Button> : null}
              <Button component={Link} href='/finance/intelligence' variant='contained'>Abrir economía</Button>
            </Stack>
          </Stack>

          {detail.dataStatus === 'partial' ? (
            <Alert severity='warning'>
              Esta 360 ya consume serving y módulos reales, pero sigue parcial en las zonas donde aún faltan vínculos canónicos, snapshots o motores dedicados.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
          <ExecutiveMiniStatCard title='Revenue' value={formatMoney(detail.kpis.revenueClp)} detail='Último snapshot o summary disponible' icon='tabler-wallet' tone='success' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
          <ExecutiveMiniStatCard title='Margin' value={formatPct(detail.kpis.marginPct)} detail={detail.finance.snapshot ? `P&L ${detail.finance.snapshot.scopeType}` : 'Summary Agency'} icon='tabler-chart-pie' tone={detail.kpis.marginPct != null && detail.kpis.marginPct < 15 ? 'error' : detail.kpis.marginPct != null && detail.kpis.marginPct < 30 ? 'warning' : 'success'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
          <ExecutiveMiniStatCard title='OTD' value={formatPct(detail.kpis.otdPct)} detail='ICO latest snapshot' icon='tabler-clock-check' tone={detail.kpis.otdPct != null && detail.kpis.otdPct < 70 ? 'error' : detail.kpis.otdPct != null && detail.kpis.otdPct < 90 ? 'warning' : 'success'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
          <ExecutiveMiniStatCard title='RpA' value={formatRatio(detail.kpis.rpaAvg)} detail='ICO latest snapshot' icon='tabler-chart-line' tone={detail.kpis.rpaAvg != null && detail.kpis.rpaAvg > 2.5 ? 'error' : detail.kpis.rpaAvg != null && detail.kpis.rpaAvg > 1.5 ? 'warning' : 'success'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
          <ExecutiveMiniStatCard title='Cobertura' value={`${detail.kpis.assignedMembers}`} detail={`${detail.kpis.activeServices} servicios · ${detail.kpis.activePlacements} placements`} icon='tabler-users-group' tone='info' />
        </Grid>
      </Grid>

      <TabContext value={tab}>
        <CustomTabList onChange={handleTabChange} variant='scrollable' pill='true' aria-label='Secciones de Space 360'>
          {TAB_CONFIG.map(item => (
            <Tab key={item.value} value={item.value} label={item.label} icon={<i className={item.icon} aria-hidden='true' />} iconPosition='start' />
          ))}
        </CustomTabList>

        <Box aria-live='polite' aria-atomic='true' sx={visuallyHiddenSx}>
          Tab actual: {TAB_CONFIG.find(item => item.value === tab)?.label}
        </Box>

        <TabPanel value='overview' className='p-0'>
          <OverviewTab detail={detail} />
        </TabPanel>
        <TabPanel value='team' className='p-0'>
          <TeamTab detail={detail} />
        </TabPanel>
        <TabPanel value='services' className='p-0'>
          <ServicesTab detail={detail} />
        </TabPanel>
        <TabPanel value='delivery' className='p-0'>
          <DeliveryTab detail={detail} />
        </TabPanel>
        <TabPanel value='finance' className='p-0'>
          <FinanceTab detail={detail} />
        </TabPanel>
        <TabPanel value='ico' className='p-0'>
          <IcoTab detail={detail} />
        </TabPanel>
      </TabContext>
    </Stack>
  )
}

export default Space360View
