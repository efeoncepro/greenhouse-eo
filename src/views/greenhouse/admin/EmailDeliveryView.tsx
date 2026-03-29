'use client'

import { useState } from 'react'

import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import { TabContext, TabPanel } from '@mui/lab'

import CustomTabList from '@core/components/mui/TabList'

import EmailDeliveryHistoryTab from './EmailDeliveryHistoryTab'
import EmailDeliverySubscriptionsTab from './EmailDeliverySubscriptionsTab'

const EmailDeliveryView = () => {
  const [tab, setTab] = useState('history')

  return (
    <TabContext value={tab}>
      <Grid container spacing={6}>
        <Grid size={12}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CustomTabList onChange={(_, value: string) => setTab(value)}>
              <Tab label='Historial' value='history' icon={<i className='tabler-mail-check' />} iconPosition='start' />
              <Tab label='Suscripciones' value='subscriptions' icon={<i className='tabler-mail-star' />} iconPosition='start' />
            </CustomTabList>
          </Card>
        </Grid>
        <Grid size={12}>
          <TabPanel value='history' sx={{ p: 0 }}>
            <EmailDeliveryHistoryTab />
          </TabPanel>
          <TabPanel value='subscriptions' sx={{ p: 0 }}>
            <EmailDeliverySubscriptionsTab />
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default EmailDeliveryView
