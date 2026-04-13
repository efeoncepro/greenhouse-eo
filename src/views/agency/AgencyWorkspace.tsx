'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'
import EmptyState from '@/components/greenhouse/EmptyState'
import SectionErrorBoundary from '@/components/greenhouse/SectionErrorBoundary'
import { GH_AGENCY } from '@/config/greenhouse-nomenclature'
import type {
  AgencyChartStatusItem,
  AgencyChartWeeklyPoint,
  AgencyPulseKpis,
  AgencySpaceHealth
} from '@/lib/agency/agency-queries'

import AgencyPulseView from './AgencyPulseView'
import AgencySpacesView from './AgencySpacesView'
import AgencyCapacityView from './AgencyCapacityView'
import AgencyIcoEngineView from './AgencyIcoEngineView'
import type { AgencyIcoData } from './AgencyIcoEngineView'

type AgencyTab = 'pulse' | 'spaces' | 'capacidad' | 'ico'

const VALID_TABS: AgencyTab[] = ['pulse', 'spaces', 'capacidad', 'ico']

const TAB_CONFIG: Array<{ value: AgencyTab; label: string; icon: string; ariaLabel: string }> = [
  { value: 'pulse', label: 'Pulse', icon: 'tabler-activity-heartbeat', ariaLabel: 'Pulse: KPIs globales de la agencia' },
  { value: 'spaces', label: 'Spaces', icon: 'tabler-grid-4x4', ariaLabel: 'Spaces: lista de clientes activos' },
  { value: 'capacidad', label: 'Capacidad', icon: 'tabler-chart-bar', ariaLabel: 'Capacidad: utilización del equipo' },
  { value: 'ico', label: 'ICO Engine', icon: 'tabler-cpu', ariaLabel: 'ICO Engine: métricas operativas por Space' }
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [capacityData, setCapacityData] = useState<any>(null)
  const [icoData, setIcoData] = useState<AgencyIcoData | null>(null)
  const [spacesLoading, setSpacesLoading] = useState(false)
  const [capacityLoading, setCapacityLoading] = useState(false)
  const [icoLoading, setIcoLoading] = useState(false)
  const [spacesError, setSpacesError] = useState<string | null>(null)
  const [capacityError, setCapacityError] = useState<string | null>(null)
  const [icoError, setIcoError] = useState<string | null>(null)

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
    if (spacesLoading) return

    setSpacesLoading(true)
    setSpacesError(null)

    try {
      const res = await fetch('/api/agency/spaces')

      if (res.ok) {
        const data = await res.json()

        setSpacesData(data.spaces ?? [])
      }
    } catch {
      setSpacesError('No pudimos cargar los Spaces. Intenta de nuevo.')
    } finally {
      setSpacesLoading(false)
    }
  }, [spacesLoading])

  // Lazy fetch capacity data
  const fetchCapacity = useCallback(async () => {
    if (capacityLoading) return

    setCapacityLoading(true)
    setCapacityError(null)

    try {
      const res = await fetch('/api/team/capacity-breakdown')

      if (res.ok) {
        const data = await res.json()

        setCapacityData(data)
      }
    } catch {
      setCapacityError('No pudimos cargar la capacidad. Intenta de nuevo.')
    } finally {
      setCapacityLoading(false)
    }
  }, [capacityLoading])

  // Lazy fetch ICO data
  const fetchIco = useCallback(async () => {
    if (icoLoading) return

    setIcoLoading(true)
    setIcoError(null)

    try {
      const now = new Date()
      const res = await fetch(`/api/ico-engine/metrics/agency?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)

      if (res.ok) {
        const data = await res.json()

        setIcoData(data)
      } else {
        const body = await res.json().catch(() => null)
        const detail = body?.detail ? ` — ${body.detail}` : ''

        setIcoError(`Error al cargar metricas ICO (HTTP ${res.status})${detail}.`)
      }
    } catch {
      setIcoError('No pudimos cargar las métricas ICO. Intenta de nuevo.')
    } finally {
      setIcoLoading(false)
    }
  }, [icoLoading])

  // Live compute for ICO (when no materialized data exists)
  const handleComputeLive = useCallback(async () => {
    setIcoLoading(true)

    try {
      const now = new Date()
      const res = await fetch(`/api/ico-engine/metrics/agency?year=${now.getFullYear()}&month=${now.getMonth() + 1}&live=true`)

      if (res.ok) {
        const data = await res.json()

        setIcoData(data)
      } else {
        setIcoError(`Error al computar metricas ICO en vivo (HTTP ${res.status}).`)
      }
    } catch {
      setIcoError('No pudimos computar las metricas ICO en vivo. Intenta de nuevo.')
    } finally {
      setIcoLoading(false)
    }
  }, [])

  // Fetch data when switching to lazy tabs (only on first visit — retry is manual)
  useEffect(() => {
    if (activeTab === 'spaces' && spacesData === null && !spacesError) fetchSpaces()
    if (activeTab === 'capacidad' && capacityData === null && !capacityError) fetchCapacity()
    if (activeTab === 'ico' && icoData === null && !icoError) fetchIco()
  }, [activeTab, spacesData, spacesError, capacityData, capacityError, icoData, icoError, fetchSpaces, fetchCapacity, fetchIco])

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
        sx={{ p: 3, border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Typography variant='h5' sx={{ fontFamily: 'Poppins', fontWeight: 700, color: theme => theme.palette.customColors.midnight, mb: 0.5 }}>
          {GH_AGENCY.pulse_title}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {GH_AGENCY.pulse_subtitle}
        </Typography>
      </Card>

      <TabContext value={activeTab}>
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
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
        </Box>

        <div ref={panelRef} tabIndex={-1} style={{ outline: 'none', position: 'relative' }}>
          {/* aria-live region for screen reader announcements (visually hidden) */}
          <Box
            aria-live='polite'
            aria-atomic='true'
            sx={visuallyHiddenSx}
          >
            {spacesLoading ? 'Cargando datos de Spaces...' : ''}
            {capacityLoading ? 'Cargando datos de capacidad...' : ''}
            {icoLoading ? 'Cargando métricas ICO...' : ''}
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
            ) : spacesError ? (
              <EmptyState
                icon='tabler-cloud-off'
                title='No pudimos cargar los Spaces'
                description={spacesError}
                action={<Button variant='outlined' onClick={() => { setSpacesError(null); fetchSpaces() }}>Reintentar</Button>}
              />
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
            ) : capacityError ? (
              <EmptyState
                icon='tabler-cloud-off'
                title='No pudimos cargar la capacidad'
                description={capacityError}
                action={<Button variant='outlined' onClick={() => { setCapacityError(null); fetchCapacity() }}>Reintentar</Button>}
              />
            ) : (
              <SectionErrorBoundary sectionName='agency-capacity-tab' description='No pudimos cargar la capacidad.'>
                <AgencyCapacityView capacity={capacityData} />
              </SectionErrorBoundary>
            )}
          </TabPanel>

          <TabPanel value='ico' className='p-0'>
            {icoLoading ? (
              <Stack spacing={4}>
                <Skeleton variant='rounded' height={80} />
                <Skeleton variant='rounded' height={100} />
                <Skeleton variant='rounded' height={300} />
                <Skeleton variant='rounded' height={400} />
              </Stack>
            ) : icoError ? (
              <EmptyState
                icon='tabler-cloud-off'
                title='No pudimos cargar las métricas ICO'
                description={icoError}
                action={<Button variant='outlined' onClick={() => { setIcoError(null); fetchIco() }}>Reintentar</Button>}
              />
            ) : (
              <SectionErrorBoundary sectionName='agency-ico-tab' description='No pudimos cargar las métricas ICO.'>
                <AgencyIcoEngineView data={icoData} onComputeLive={handleComputeLive} computingLive={icoLoading} />
              </SectionErrorBoundary>
            )}
          </TabPanel>
        </div>
      </TabContext>
    </Stack>
  )
}

export default AgencyWorkspace
