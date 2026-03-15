'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import { GH_AGENCY, GH_AGENCY_NAV, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type {
  AgencyCapacityOverview,
  AgencyChartStatusItem,
  AgencyChartWeeklyPoint,
  AgencyPulseKpis,
  AgencySpaceHealth
} from '@/lib/agency/agency-queries'

import AgencyPulseView from './AgencyPulseView'
import AgencySpacesView from './AgencySpacesView'
import AgencyCapacityView from './AgencyCapacityView'

type AgencyTab = 'pulse' | 'spaces' | 'capacidad'

const VALID_TABS: AgencyTab[] = ['pulse', 'spaces', 'capacidad']

const TAB_CONFIG: Array<{ value: AgencyTab; label: string; icon: string; ariaLabel: string }> = [
  { value: 'pulse', label: 'Pulse', icon: 'tabler-activity-heartbeat', ariaLabel: 'Pulse: KPIs globales de la agencia' },
  { value: 'spaces', label: 'Spaces', icon: 'tabler-grid-4x4', ariaLabel: 'Spaces: lista de clientes activos' },
  { value: 'capacidad', label: 'Capacidad', icon: 'tabler-chart-bar', ariaLabel: 'Capacidad: utilización del equipo' }
]

type Props = {
  pulseKpis: AgencyPulseKpis | null
  pulseSpaces: AgencySpaceHealth[]
  pulseStatusMix: AgencyChartStatusItem[]
  pulseWeeklyActivity: AgencyChartWeeklyPoint[]
  tenantName: string
}

const AgencyWorkspace = ({ pulseKpis, pulseSpaces, pulseStatusMix, pulseWeeklyActivity, tenantName }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialTab = searchParams.get('tab')
  const defaultTab: AgencyTab = VALID_TABS.includes(initialTab as AgencyTab)
    ? (initialTab as AgencyTab)
    : 'pulse'

  const [activeTab, setActiveTab] = useState<AgencyTab>(defaultTab)
  const [spacesData, setSpacesData] = useState<AgencySpaceHealth[] | null>(null)
  const [capacityData, setCapacityData] = useState<AgencyCapacityOverview | null>(null)
  const [spacesLoading, setSpacesLoading] = useState(false)
  const [capacityLoading, setCapacityLoading] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  // Update document.title on tab change
  useEffect(() => {
    const tabLabel = TAB_CONFIG.find(t => t.value === activeTab)?.label ?? 'Pulse'

    document.title = `Agencia \u2014 ${tabLabel} | Greenhouse`
  }, [activeTab])

  // Focus panel on redirect arrival
  useEffect(() => {
    if (isInitialMount.current && initialTab && VALID_TABS.includes(initialTab as AgencyTab)) {
      setTimeout(() => panelRef.current?.focus(), 100)
    }

    isInitialMount.current = false
  }, [initialTab])

  // Lazy fetch spaces data
  const fetchSpaces = useCallback(async () => {
    if (spacesData !== null) return

    setSpacesLoading(true)

    try {
      const res = await fetch('/api/agency/spaces')

      if (res.ok) {
        const data = await res.json()

        setSpacesData(data.spaces ?? [])
      }
    } catch {
      setSpacesData([])
    } finally {
      setSpacesLoading(false)
    }
  }, [spacesData])

  // Lazy fetch capacity data
  const fetchCapacity = useCallback(async () => {
    if (capacityData !== null) return

    setCapacityLoading(true)

    try {
      const res = await fetch('/api/agency/capacity')

      if (res.ok) {
        const data = await res.json()

        setCapacityData(data)
      }
    } catch {
      setCapacityData(null)
    } finally {
      setCapacityLoading(false)
    }
  }, [capacityData])

  // Fetch data when switching to lazy tabs
  useEffect(() => {
    if (activeTab === 'spaces') fetchSpaces()
    if (activeTab === 'capacidad') fetchCapacity()
  }, [activeTab, fetchSpaces, fetchCapacity])

  const handleChange = (_: SyntheticEvent, value: string) => {
    const newTab = value as AgencyTab

    setActiveTab(newTab)

    // URL sync with router.replace (no history entry)
    const params = new URLSearchParams(searchParams.toString())

    if (newTab === 'pulse') {
      params.delete('tab')
    } else {
      params.set('tab', newTab)
    }

    const query = params.toString()

    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <Stack spacing={4}>
      {/* Workspace header */}
      <Card
        elevation={0}
        sx={{ p: 3, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: GH_COLORS.neutral.textPrimary, mb: 0.5 }}>
          {GH_AGENCY.pulse_title}
        </Typography>
        <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
          {GH_AGENCY.pulse_subtitle}
        </Typography>
      </Card>

      <TabContext value={activeTab}>
        <CustomTabList
          onChange={handleChange}
          variant='scrollable'
          aria-label='Secciones del workspace de agencia'
        >
          {TAB_CONFIG.map(tab => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={<i className={tab.icon} aria-hidden='true' />}
              iconPosition='start'
              aria-label={tab.ariaLabel}
            />
          ))}
        </CustomTabList>

        <div ref={panelRef} tabIndex={-1} style={{ outline: 'none' }}>
          {/* aria-live region for screen reader announcements */}
          <Box
            aria-live='polite'
            aria-atomic='true'
            sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
          >
            {spacesLoading ? 'Cargando datos de Spaces...' : ''}
            {capacityLoading ? 'Cargando datos de capacidad...' : ''}
          </Box>

          <TabPanel value='pulse' className='p-0'>
            <AgencyPulseView
              kpis={pulseKpis}
              spaces={pulseSpaces}
              statusMix={pulseStatusMix}
              weeklyActivity={pulseWeeklyActivity}
              tenantName={tenantName}
            />
          </TabPanel>

          <TabPanel value='spaces' className='p-0'>
            {spacesLoading ? (
              <Stack spacing={4}>
                <Skeleton variant='rounded' height={80} />
                <Skeleton variant='rounded' height={100} />
                <Skeleton variant='rounded' height={300} />
              </Stack>
            ) : spacesData ? (
              <SectionErrorBoundary sectionName='agency-spaces-tab' description='No pudimos cargar los Spaces.'>
                <AgencySpacesView spaces={spacesData} />
              </SectionErrorBoundary>
            ) : null}
          </TabPanel>

          <TabPanel value='capacidad' className='p-0'>
            {capacityLoading ? (
              <Stack spacing={4}>
                <Skeleton variant='rounded' height={80} />
                <Skeleton variant='rounded' height={300} />
              </Stack>
            ) : (
              <SectionErrorBoundary sectionName='agency-capacity-tab' description='No pudimos cargar la capacidad.'>
                <AgencyCapacityView capacity={capacityData} />
              </SectionErrorBoundary>
            )}
          </TabPanel>
        </div>
      </TabContext>
    </Stack>
  )
}

export default AgencyWorkspace
