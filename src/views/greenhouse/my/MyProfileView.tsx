'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import type { PersonProfileSummary } from '@/types/person-360'
import MyProfileSidebar from './my-profile/MyProfileSidebar'

// Lazy-loaded tabs
const OverviewTab = dynamic(() => import('./my-profile/tabs/OverviewTab'))
const SecurityTab = dynamic(() => import('./my-profile/tabs/SecurityTab'))

type ProfileTab = 'overview' | 'security'

const TAB_CONFIG: { value: ProfileTab; label: string; icon: string }[] = [
  { value: 'overview', label: 'Resumen', icon: 'tabler-user' },
  { value: 'security', label: 'Seguridad', icon: 'tabler-lock' }
]

const MyProfileView = () => {
  const [data, setData] = useState<PersonProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/my/profile')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleTabChange = (_: SyntheticEvent, value: string) => {
    setActiveTab(value as ProfileTab)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!data) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }} role='status'>
          <Typography variant='h6'>No pudimos cargar tu perfil</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            Intenta actualizar la pagina. Si el problema persiste, contacta al administrador.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Sidebar — 4 cols */}
      <Grid size={{ xs: 12, lg: 4 }}>
        <MyProfileSidebar data={data} />
      </Grid>

      {/* Tabs — 8 cols */}
      <Grid size={{ xs: 12, lg: 8 }}>
        <TabContext value={activeTab}>
          <Box sx={{ mb: 4 }}>
            <CustomTabList
              onChange={handleTabChange}
              variant='scrollable'
              pill='true'
              aria-label='Secciones de mi perfil'
            >
              {TAB_CONFIG.map(tab => (
                <Tab
                  key={tab.value}
                  value={tab.value}
                  label={tab.label}
                  icon={<i className={tab.icon} aria-hidden='true' />}
                  iconPosition='start'
                />
              ))}
            </CustomTabList>
          </Box>

          <TabPanel value='overview' className='p-0'>
            {activeTab === 'overview' && <OverviewTab data={data} />}
          </TabPanel>

          <TabPanel value='security' className='p-0'>
            {activeTab === 'security' && <SecurityTab />}
          </TabPanel>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default MyProfileView
