'use client'

import { useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import type { PersonDetail, PersonDetailAssignment } from '@/types/people'
import type { MembershipRowData } from './drawers/EditPersonMembershipDrawer'
import type { PersonTab } from './helpers'
import { TAB_CONFIG } from './helpers'
import PersonActivityTab from './tabs/PersonActivityTab'
import PersonCompensationTab from './tabs/PersonCompensationTab'
import PersonPayrollTab from './tabs/PersonPayrollTab'
import PersonFinanceTab from './tabs/PersonFinanceTab'
import PersonMembershipsTab from './tabs/PersonMembershipsTab'
import PersonHrProfileTab from './tabs/PersonHrProfileTab'
import PersonAiToolsTab from './tabs/PersonAiToolsTab'

type Props = {
  detail: PersonDetail
  isAdmin?: boolean
  membershipReloadKey?: number
  onNewMembership?: () => void
  onEditMembership?: (membership: MembershipRowData, assignment?: PersonDetailAssignment) => void
}

const PersonTabs = ({ detail, isAdmin, membershipReloadKey, onNewMembership, onEditMembership }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const visibleTabs = TAB_CONFIG.filter(tab => detail.access.visibleTabs.includes(tab.value))
  const visibleValues = visibleTabs.map(t => t.value)

  // Read initial tab from URL, fallback to first visible
  const urlTab = searchParams.get('tab') as PersonTab | null
  const initialTab = urlTab && visibleValues.includes(urlTab) ? urlTab : visibleTabs[0]?.value ?? 'memberships'

  const [activeTab, setActiveTab] = useState<PersonTab>(initialTab)
  const panelRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  const memberName = detail.member.displayName || 'Colaborador'

  // Update document.title on tab change
  useEffect(() => {
    const tabLabel = TAB_CONFIG.find(t => t.value === activeTab)?.label ?? 'Perfil'

    document.title = `${memberName} \u2014 ${tabLabel} | Personas | Greenhouse`
  }, [activeTab, memberName])

  // Focus panel on redirect arrival (e.g., from /hr/payroll/member/[id]?tab=payroll)
  useEffect(() => {
    if (isInitialMount.current && urlTab && visibleValues.includes(urlTab)) {
      setTimeout(() => panelRef.current?.focus(), 100)
    }

    isInitialMount.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (_: SyntheticEvent, value: string) => {
    const newTab = value as PersonTab

    setActiveTab(newTab)

    // URL sync with router.replace (no history entry)
    const params = new URLSearchParams(searchParams.toString())

    if (newTab === visibleTabs[0]?.value) {
      params.delete('tab')
    } else {
      params.set('tab', newTab)
    }

    const query = params.toString()

    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  if (visibleTabs.length === 0) return null

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList
            onChange={handleChange}
            variant='scrollable'
            pill='true'
            aria-label='Secciones del perfil del colaborador'
          >
            {visibleTabs.map(tab => (
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
          <div ref={panelRef} tabIndex={-1} style={{ outline: 'none' }}>
            {/* Screen reader announcement for async tab loading */}
            <Box
              aria-live='polite'
              aria-atomic='true'
              sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
            />

            <TabPanel value='memberships' className='p-0'>
              {activeTab === 'memberships' && (
                <PersonMembershipsTab
                  memberId={detail.member.memberId}
                  assignments={detail.assignments}
                  isAdmin={isAdmin}
                  reloadKey={membershipReloadKey}
                  onAddMembership={onNewMembership}
                  onEditMembership={onEditMembership}
                />
              )}
            </TabPanel>

            <TabPanel value='activity' className='p-0'>
              {activeTab === 'activity' && (
                <PersonActivityTab metrics={detail.operationalMetrics} />
              )}
            </TabPanel>

            <TabPanel value='compensation' className='p-0'>
              {activeTab === 'compensation' && (
                <PersonCompensationTab compensation={detail.currentCompensation} />
              )}
            </TabPanel>

            <TabPanel value='payroll' className='p-0'>
              {activeTab === 'payroll' && (
                <PersonPayrollTab entries={detail.recentPayroll} memberId={detail.member.memberId} />
              )}
            </TabPanel>

            <TabPanel value='finance' className='p-0'>
              {activeTab === 'finance' && (
                <PersonFinanceTab memberId={detail.member.memberId} />
              )}
            </TabPanel>

            <TabPanel value='hr-profile' className='p-0'>
              {activeTab === 'hr-profile' && (
                <PersonHrProfileTab memberId={detail.member.memberId} />
              )}
            </TabPanel>

            <TabPanel value='ai-tools' className='p-0'>
              {activeTab === 'ai-tools' && (
                <PersonAiToolsTab memberId={detail.member.memberId} />
              )}
            </TabPanel>
          </div>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default PersonTabs
