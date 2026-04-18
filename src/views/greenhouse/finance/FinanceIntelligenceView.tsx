'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'

import { TabContext, TabPanel } from '@mui/lab'

import CustomTabList from '@core/components/mui/TabList'

import FinancePeriodClosureDashboardView from './FinancePeriodClosureDashboardView'
import ClientEconomicsView from './ClientEconomicsView'
import CommercialIntelligenceView from './CommercialIntelligenceView'

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
            <Tab value='quotations' label='Cotizaciones' icon={<i className='tabler-file-description' />} iconPosition='start' />
          </CustomTabList>

          <TabPanel value='closure' sx={{ p: 0 }}>
            <FinancePeriodClosureDashboardView canManageClosure={canManageClosure} canReopen={canReopen} />
          </TabPanel>

          <TabPanel value='economics' sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <ClientEconomicsView embedded />
          </TabPanel>

          <TabPanel value='quotations' sx={{ p: 0 }}>
            <CommercialIntelligenceView />
          </TabPanel>
        </TabContext>
      </Card>
    </Stack>
  )
}

export default FinanceIntelligenceView
