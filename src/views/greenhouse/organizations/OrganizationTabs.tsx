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
import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'

import type { OrganizationDetailData, OrganizationTab } from './types'
import OrganizationOverviewTab from './tabs/OrganizationOverviewTab'
import OrganizationPeopleTab from './tabs/OrganizationPeopleTab'
import OrganizationFinanceTab from './tabs/OrganizationFinanceTab'
import OrganizationEconomicsTab from './tabs/OrganizationEconomicsTab'
import OrganizationProjectsTab from './tabs/OrganizationProjectsTab'
import OrganizationIcoTab from './tabs/OrganizationIcoTab'
import OrganizationIntegrationsTab from './tabs/OrganizationIntegrationsTab'

// Consolidated from 7 tabs to 4:
// Operaciones = ICO + Overview
// Finanzas = Finance + Economics
// Equipo = People + Projects
// Configuración = Integrations
const TAB_CONFIG: Array<{ value: OrganizationTab; label: string; icon: string }> = [
  { value: 'ico', label: 'Operaciones', icon: 'tabler-cpu' },
  { value: 'finance', label: 'Finanzas', icon: 'tabler-report-money' },
  { value: 'people', label: 'Equipo', icon: 'tabler-users' },
  { value: 'integrations', label: 'Configuración', icon: 'tabler-settings' }
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
  const initialTab = urlTab && validValues.includes(urlTab) ? urlTab : 'ico'

  const [activeTab, setActiveTab] = useState<OrganizationTab>(initialTab)

  useEffect(() => {
    document.title = `${detail.organizationName} — ${TAB_CONFIG.find(t => t.value === activeTab)?.label ?? 'Organización'} | Greenhouse`
  }, [activeTab, detail.organizationName])

  const handleChange = (_: SyntheticEvent, value: string) => {
    const newTab = value as OrganizationTab

    setActiveTab(newTab)

    const params = new URLSearchParams(searchParams.toString())

    if (newTab === 'ico') {
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
          <Box aria-live='polite' aria-atomic='true' sx={visuallyHiddenSx} />

          {/* Operaciones = ICO delivery + Overview summary */}
          <TabPanel value='ico' className='p-0'>
            {activeTab === 'ico' && (
              <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                  <OrganizationIcoTab detail={detail} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <OrganizationOverviewTab detail={detail} />
                </Grid>
              </Grid>
            )}
          </TabPanel>

          {/* Finanzas = Finance invoices + Economics margin */}
          <TabPanel value='finance' className='p-0'>
            {activeTab === 'finance' && (
              <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                  <OrganizationFinanceTab detail={detail} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <OrganizationEconomicsTab detail={detail} />
                </Grid>
              </Grid>
            )}
          </TabPanel>

          {/* Equipo = People assignments + Projects */}
          <TabPanel value='people' className='p-0'>
            {activeTab === 'people' && (
              <Grid container spacing={6}>
                <Grid size={{ xs: 12 }}>
                  <OrganizationPeopleTab organizationId={detail.organizationId} isAdmin={isAdmin} onAddMembership={onAddMembership} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <OrganizationProjectsTab detail={detail} />
                </Grid>
              </Grid>
            )}
          </TabPanel>

          {/* Configuración = Integrations + IDs + fiscal */}
          <TabPanel value='integrations' className='p-0'>
            {activeTab === 'integrations' && <OrganizationIntegrationsTab detail={detail} />}
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default OrganizationTabs
