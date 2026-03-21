'use client'

import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import type { OrganizationDetailData, OrganizationTab } from './types'
import OrganizationOverviewTab from './tabs/OrganizationOverviewTab'
import OrganizationPeopleTab from './tabs/OrganizationPeopleTab'
import OrganizationFinanceTab from './tabs/OrganizationFinanceTab'
import OrganizationIcoTab from './tabs/OrganizationIcoTab'
import OrganizationIntegrationsTab from './tabs/OrganizationIntegrationsTab'

const TAB_CONFIG: Array<{ value: OrganizationTab; label: string; icon: string }> = [
  { value: 'overview', label: 'Resumen', icon: 'tabler-layout-dashboard' },
  { value: 'people', label: 'Personas', icon: 'tabler-users' },
  { value: 'finance', label: 'Finanzas', icon: 'tabler-report-money' },
  { value: 'ico', label: 'ICO', icon: 'tabler-cpu' },
  { value: 'integrations', label: 'Integraciones', icon: 'tabler-plug-connected' }
]

type Props = {
  detail: OrganizationDetailData
  isAdmin?: boolean
  onAddMembership?: () => void
}

const OrganizationTabs = ({ detail, isAdmin, onAddMembership }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlTab = searchParams.get('tab') as OrganizationTab | null
  const validValues = TAB_CONFIG.map(t => t.value)
  const initialTab = urlTab && validValues.includes(urlTab) ? urlTab : 'overview'

  const [activeTab, setActiveTab] = useState<OrganizationTab>(initialTab)

  useEffect(() => {
    document.title = `${detail.organizationName} — ${TAB_CONFIG.find(t => t.value === activeTab)?.label ?? 'Organización'} | Greenhouse`
  }, [activeTab, detail.organizationName])

  const handleChange = (_: SyntheticEvent, value: string) => {
    const newTab = value as OrganizationTab

    setActiveTab(newTab)

    const params = new URLSearchParams(searchParams.toString())

    if (newTab === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', newTab)
    }

    const query = params.toString()

    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList
            onChange={handleChange}
            variant='scrollable'
            pill='true'
            aria-label='Secciones de la organización'
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
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Box
            aria-live='polite'
            aria-atomic='true'
            sx={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              p: 0,
              m: '-1px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              border: 0,
              clip: 'rect(0, 0, 0, 0)',
              clipPath: 'inset(50%)'
            }}
          />

          <TabPanel value='overview' className='p-0'>
            {activeTab === 'overview' && <OrganizationOverviewTab detail={detail} />}
          </TabPanel>

          <TabPanel value='people' className='p-0'>
            {activeTab === 'people' && <OrganizationPeopleTab organizationId={detail.organizationId} isAdmin={isAdmin} onAddMembership={onAddMembership} />}
          </TabPanel>

          <TabPanel value='finance' className='p-0'>
            {activeTab === 'finance' && <OrganizationFinanceTab detail={detail} />}
          </TabPanel>

          <TabPanel value='ico' className='p-0'>
            {activeTab === 'ico' && <OrganizationIcoTab detail={detail} />}
          </TabPanel>

          <TabPanel value='integrations' className='p-0'>
            {activeTab === 'integrations' && <OrganizationIntegrationsTab detail={detail} />}
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default OrganizationTabs
