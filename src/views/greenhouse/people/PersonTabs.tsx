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
import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'

import type { PersonDetail, PersonDetailAssignment } from '@/types/people'
import type { MembershipRowData } from './drawers/EditPersonMembershipDrawer'
import type { PersonTab } from './helpers'
import { TAB_CONFIG, LEGACY_TAB_REDIRECT } from './helpers'
import PersonProfileTab from './tabs/PersonProfileTab'
import PersonActivityTab from './tabs/PersonActivityTab'
import PersonMembershipsTab from './tabs/PersonMembershipsTab'
import PersonEconomyTab from './tabs/PersonEconomyTab'
import PersonAiToolsTab from './tabs/PersonAiToolsTab'

type Props = {
  detail: PersonDetail
  isAdmin?: boolean
  membershipReloadKey?: number
  onNewMembership?: () => void
  onEditMembership?: (membership: MembershipRowData, assignment?: PersonDetailAssignment) => void
  onEditCompensation?: () => void
}

const PersonTabs = ({ detail, isAdmin, membershipReloadKey, onNewMembership, onEditMembership, onEditCompensation }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const visibleTabs = TAB_CONFIG.filter(tab => detail.access.visibleTabs.includes(tab.value))
  const visibleValues = visibleTabs.map(t => t.value)

  // Read initial tab from URL, handle legacy redirects
  const urlTab = searchParams.get('tab')

  const resolvedTab = (urlTab && urlTab in LEGACY_TAB_REDIRECT)
    ? LEGACY_TAB_REDIRECT[urlTab]
    : urlTab as PersonTab | null

  const initialTab = resolvedTab && visibleValues.includes(resolvedTab) ? resolvedTab : visibleTabs[0]?.value ?? 'profile'

  const [activeTab, setActiveTab] = useState<PersonTab>(initialTab)
  const panelRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  const memberName = detail.member.displayName || 'Colaborador'

  // Update document.title on tab change
  useEffect(() => {
    const tabLabel = TAB_CONFIG.find(t => t.value === activeTab)?.label ?? 'Perfil'

    document.title = `${memberName} \u2014 ${tabLabel} | Personas | Greenhouse`
  }, [activeTab, memberName])

  // Redirect legacy tab URLs to new consolidated tabs
  useEffect(() => {
    if (urlTab && urlTab in LEGACY_TAB_REDIRECT) {
      const params = new URLSearchParams(searchParams.toString())

      params.set('tab', LEGACY_TAB_REDIRECT[urlTab])
      router.replace(`${pathname}?${params}`, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus panel on redirect arrival
  useEffect(() => {
    if (isInitialMount.current && urlTab && visibleValues.includes(resolvedTab as PersonTab)) {
      setTimeout(() => panelRef.current?.focus(), 100)
    }

    isInitialMount.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (_: SyntheticEvent, value: string) => {
    const newTab = value as PersonTab

    setActiveTab(newTab)

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
          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
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
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <div ref={panelRef} tabIndex={-1} style={{ outline: 'none' }}>
            <Box aria-live='polite' aria-atomic='true' sx={visuallyHiddenSx} />

            <TabPanel value='profile' className='p-0'>
              {activeTab === 'profile' && (
                <PersonProfileTab detail={detail} />
              )}
            </TabPanel>

            <TabPanel value='activity' className='p-0'>
              {activeTab === 'activity' && (
                <PersonActivityTab memberId={detail.member.memberId} />
              )}
            </TabPanel>

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

            <TabPanel value='economy' className='p-0'>
              {activeTab === 'economy' && (
                <PersonEconomyTab detail={detail} onEditCompensation={onEditCompensation} />
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
