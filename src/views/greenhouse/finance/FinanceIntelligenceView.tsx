'use client'

import { useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import LinkMui from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'

import { TabContext, TabPanel } from '@mui/lab'

import CustomTabList from '@core/components/mui/TabList'

import { GH_PIPELINE_COMMERCIAL } from '@/config/greenhouse-nomenclature'
import { GH_MRR_ARR_DASHBOARD } from '@/lib/copy/finance'

import FinancePeriodClosureDashboardView from './FinancePeriodClosureDashboardView'
import ClientEconomicsView from './ClientEconomicsView'
import CommercialIntelligenceView from './CommercialIntelligenceView'
import MrrArrDashboardView from './MrrArrDashboardView'

type Props = {
  canManageClosure: boolean
  canReopen: boolean
}

const FinanceIntelligenceView = ({ canManageClosure, canReopen }: Props) => {
  const [tab, setTab] = useState('closure')

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant='h5' sx={{ fontWeight: 500 }}>
          Economía operativa
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Cierre de período, P&L operativo y rentabilidad por cliente.
        </Typography>
      </Box>

      <Card variant='outlined'>
        <TabContext value={tab}>
          <CustomTabList onChange={(_e, v) => setTab(v)} variant='scrollable'>
            <Tab value='closure' label='Cierre de período' icon={<i className='tabler-lock' />} iconPosition='start' />
            <Tab value='economics' label='Rentabilidad por cliente' icon={<i className='tabler-chart-bar' />} iconPosition='start' />
            <Tab
              value='quotations'
              label={GH_PIPELINE_COMMERCIAL.outerTabLabel}
              icon={<i className='tabler-file-description' />}
              iconPosition='start'
            />
            <Tab
              value='mrrArr'
              label={GH_MRR_ARR_DASHBOARD.outerTabLabel}
              icon={<i className='tabler-trending-up' />}
              iconPosition='start'
            />
          </CustomTabList>

          <TabPanel value='closure' sx={{ p: 0 }}>
            <FinancePeriodClosureDashboardView canManageClosure={canManageClosure} canReopen={canReopen} />
          </TabPanel>

          <TabPanel value='economics' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <ClientEconomicsView embedded />
          </TabPanel>

          <TabPanel value='quotations' sx={{ p: 0 }}>
            <Stack spacing={3}>
              <Alert
                severity='info'
                icon={<i className='tabler-info-circle' aria-hidden='true' />}
                sx={{ mx: { xs: 2, sm: 3, md: 4 }, mt: { xs: 2, sm: 3, md: 4 } }}
              >
                <Typography component='span' variant='body2'>
                  Vista compartida — owner Comercial. Para revisar forecast, deals y pre-sales sin el marco de
                  Economía operativa, abre la{' '}
                  <LinkMui component={Link} href='/finance/intelligence/pipeline' underline='hover'>
                    lane dedicada
                  </LinkMui>
                  .
                </Typography>
              </Alert>
              <CommercialIntelligenceView />
            </Stack>
          </TabPanel>

          <TabPanel value='mrrArr' sx={{ p: 0 }}>
            <MrrArrDashboardView />
          </TabPanel>
        </TabContext>
      </Card>
    </Stack>
  )
}

export default FinanceIntelligenceView
