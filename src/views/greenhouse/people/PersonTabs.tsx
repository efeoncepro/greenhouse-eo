'use client'

import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import Tab from '@mui/material/Tab'
import Grid from '@mui/material/Grid'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import type { PersonDetail, PersonDetailAssignment } from '@/types/people'
import type { PersonTab } from './helpers'
import { TAB_CONFIG } from './helpers'
import PersonAssignmentsTab from './tabs/PersonAssignmentsTab'
import PersonActivityTab from './tabs/PersonActivityTab'
import PersonCompensationTab from './tabs/PersonCompensationTab'
import PersonPayrollTab from './tabs/PersonPayrollTab'

type Props = {
  detail: PersonDetail
  isAdmin?: boolean
  onNewAssignment?: () => void
  onEditAssignment?: (a: PersonDetailAssignment) => void
}

const PersonTabs = ({ detail, isAdmin, onNewAssignment, onEditAssignment }: Props) => {
  const visibleTabs = TAB_CONFIG.filter(tab => detail.access.visibleTabs.includes(tab.value))
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.value ?? 'assignments')

  const handleChange = (_: SyntheticEvent, value: string) => {
    setActiveTab(value as PersonTab)
  }

  if (visibleTabs.length === 0) return null

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            {visibleTabs.map(tab => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={<i className={tab.icon} />}
                iconPosition='start'
              />
            ))}
          </CustomTabList>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TabPanel value={activeTab} className='p-0'>
            {activeTab === 'assignments' ? (
              <PersonAssignmentsTab
                assignments={detail.assignments}
                isAdmin={isAdmin}
                onNewAssignment={onNewAssignment}
                onEditAssignment={onEditAssignment}
              />
            ) : activeTab === 'activity' ? (
              <PersonActivityTab metrics={detail.operationalMetrics} />
            ) : activeTab === 'compensation' ? (
              <PersonCompensationTab compensation={detail.currentCompensation} />
            ) : activeTab === 'payroll' ? (
              <PersonPayrollTab entries={detail.recentPayroll} memberId={detail.member.memberId} />
            ) : null}
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default PersonTabs
