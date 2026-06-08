'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import EmptyState from '@/components/greenhouse/EmptyState'
import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'
import ViewTransitionLink from '@/components/greenhouse/motion/ViewTransitionLink'
import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import { MOTION_DURATION_S, MOTION_EASE, motionCss } from '@/components/theme/motion-tokens'
import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'
import { getMicrocopy } from '@/lib/copy'
import { GH_CLIENT_ONBOARDING } from '@/lib/copy/client-onboarding'
import { formatDate } from '@/lib/format'

type OnboardingStatus = 'draft' | 'in_progress' | 'blocked'
type ViewMode = 'workbench' | 'matrix'
type OrganizationRisk = 'none' | 'attention' | 'blocked'
type OrganizationWorkbenchFilter = 'all' | 'attention' | 'onboarding' | 'no_space' | 'no_people' | 'active'
type SemanticTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

interface OrganizationListItem {
  organizationId: string
  publicId: string
  organizationName: string
  legalName: string | null
  organizationType: string
  industry: string | null
  country: string | null
  hubspotCompanyId: string | null
  status: string
  active: boolean
  spaceCount: number
  membershipCount: number
  uniquePersonCount: number
  createdAt: string
  updatedAt: string
  onboardingStatus?: OnboardingStatus | null
}

interface ListResponse {
  items: OrganizationListItem[]
  total: number
  page: number
  pageSize: number
}

const microcopy = getMicrocopy()
const onboardingCopy = GH_CLIENT_ONBOARDING.onboardingCases

const organizationListAria = {
  search: 'Buscar organizaciones',
  signals: 'Senales de operacion de organizaciones',
  filters: 'Filtros de organizaciones',
  viewMode: 'Modo de visualizacion',
  workbenchView: 'Vista workbench',
  matrixView: 'Vista matriz',
  matrixTable: 'Matriz comparativa de organizaciones',
  matrixRegion: 'Tabla comparativa desplazable de organizaciones'
}

const filterOrder: OrganizationWorkbenchFilter[] = ['all', 'attention', 'onboarding', 'no_space', 'no_people', 'active']
const framerEaseEmphasized: [number, number, number, number] = [...MOTION_EASE.emphasized.cubicBezier]

const organizationFilterLabels: Record<OrganizationWorkbenchFilter, string> = {
  all: 'Todas',
  attention: 'Atencion',
  onboarding: 'Onboarding',
  no_space: 'Sin Space',
  no_people: 'Sin equipo',
  active: 'Activos'
}

const filterTone: Record<OrganizationWorkbenchFilter, SemanticTone> = {
  all: 'primary',
  attention: 'warning',
  onboarding: 'info',
  no_space: 'warning',
  no_people: 'warning',
  active: 'success'
}

const onboardingMeta: Record<OnboardingStatus, { label: string; tone: 'warning' | 'info' | 'error' }> = {
  draft: { label: onboardingCopy.statusDraft, tone: 'warning' },
  in_progress: { label: microcopy.states.inProgress, tone: 'info' },
  blocked: { label: microcopy.states.blocked, tone: 'error' }
}

const riskMeta: Record<OrganizationRisk, { label: string; tone: 'success' | 'warning' | 'error'; icon: string }> = {
  none: { label: 'Estable', tone: 'success', icon: 'tabler-circle-check' },
  attention: { label: 'Revisar', tone: 'warning', icon: 'tabler-alert-triangle' },
  blocked: { label: 'Bloqueada', tone: 'error', icon: 'tabler-lock-exclamation' }
}

const readinessIcon = {
  complete: 'tabler-circle-check',
  warning: 'tabler-alert-triangle',
  blocked: 'tabler-circle-x',
  empty: 'tabler-circle-dashed'
} as const

const readinessTone = {
  complete: 'success',
  warning: 'warning',
  blocked: 'error',
  empty: 'secondary'
} as const

const statusLabel: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  prospect: 'Prospecto',
  churned: 'Churned'
}

const sourceLabel = (item: OrganizationListItem) => (item.hubspotCompanyId ? 'HubSpot' : 'Portal')

// Feedback tones (success/warning/error/info) tienen triple tonal curado AA en
// `theme.greenhouseSemantic` → se renderizan como chip tonal `label` (señal real:
// verde/ámbar/rojo). Las tones no-feedback (primary/secondary/default) NO tienen token
// tonal curado → `outlined` (texto sobre paper) mantiene contraste AA. Sin esto, un chip
// `secondary` tonal pinta verde sobre tint verde y falla 4.5:1 (axe color-contrast).
const chipVariantForTone = (tone: SemanticTone): 'label' | 'outlined' =>
  tone === 'success' || tone === 'warning' || tone === 'error' || tone === 'info' ? 'label' : 'outlined'

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'O'
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]

  return `${first}${second ?? ''}`.toUpperCase()
}

const riskForOrganization = (item: OrganizationListItem): OrganizationRisk => {
  // `blocked` (rojo/error) se reserva para un bloqueo operacional genuino: un caso de
  // onboarding explícitamente bloqueado. Una cuenta activa sin Space/personas es setup
  // incompleto → `attention` (no es crítico). No se manufactura alarma desde data faltante.
  if (item.onboardingStatus === 'blocked') return 'blocked'
  if (item.onboardingStatus === 'draft' || item.onboardingStatus === 'in_progress') return 'attention'
  if (item.spaceCount === 0 || item.uniquePersonCount === 0) return 'attention'

  return 'none'
}

const matchesFilter = (item: OrganizationListItem, filter: OrganizationWorkbenchFilter) => {
  if (filter === 'all') return true
  if (filter === 'attention') return riskForOrganization(item) !== 'none'
  if (filter === 'onboarding') return item.onboardingStatus === 'draft' || item.onboardingStatus === 'in_progress' || item.onboardingStatus === 'blocked'
  if (filter === 'no_space') return item.spaceCount === 0
  if (filter === 'no_people') return item.uniquePersonCount === 0

  return item.active
}

const getAttentionScore = (item: OrganizationListItem) => {
  const risk = riskForOrganization(item)

  if (risk === 'blocked') return 3
  if (risk === 'attention') return 2
  if (item.onboardingStatus === 'draft' || item.onboardingStatus === 'in_progress') return 1

  return 0
}

const formatDateSignal = (value: string) => {
  if (!value) return 'Sin senal reciente'

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) return 'Sin senal reciente'

  return `Actualizada ${formatDate(parsed, { month: 'short' }, 'es-CL')}`
}

const filterHint = (filter: OrganizationWorkbenchFilter) => {
  if (filter === 'all') return 'Panorama'
  if (filter === 'attention') return 'Riesgo'
  if (filter === 'onboarding') return 'Casos abiertos'
  if (filter === 'no_space') return 'Bloqueo'
  if (filter === 'no_people') return 'Relacion'

  return 'Operativas'
}

const lifecycleLabel = (item: OrganizationListItem) => {
  if (item.active) return 'Cliente activo'
  if (item.status === 'prospect') return 'Prospecto'
  if (item.status === 'churned') return 'Churned'

  return statusLabel[item.status] ?? item.organizationType ?? 'Cuenta'
}

const readinessEntries = (item: OrganizationListItem) => [
  { label: item.active ? 'Cuenta activa' : 'Cuenta no activa', state: item.active ? 'complete' : 'warning' },
  { label: item.spaceCount > 0 ? 'Space operativo' : 'Sin Space', state: item.spaceCount > 0 ? 'complete' : 'warning' },
  { label: item.uniquePersonCount > 0 ? 'Personas vinculadas' : 'Sin personas', state: item.uniquePersonCount > 0 ? 'complete' : 'warning' },
  {
    label: item.onboardingStatus ? onboardingMeta[item.onboardingStatus].label : 'Sin onboarding activo',
    state: item.onboardingStatus === 'blocked' ? 'blocked' : item.onboardingStatus ? 'warning' : 'empty'
  }
] as Array<{ label: string; state: 'complete' | 'warning' | 'blocked' | 'empty' }>

const OrganizationListView = () => {
  const theme = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filter, setFilter] = useState<OrganizationWorkbenchFilter>('attention')
  const [viewMode, setViewMode] = useState<ViewMode>('workbench')
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page + 1),
      pageSize: String(pageSize)
    })

    if (searchDebounced) params.set('search', searchDebounced)

    try {
      const response = await fetch(`/api/organizations?${params}`)

      if (response.ok) setData(await response.json())
    } catch {
      // The page degrades through the empty state when the list cannot be loaded.
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchDebounced])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const pageItems = useMemo(() => data?.items ?? [], [data?.items])

  const filteredOrganizations = useMemo(() => (
    pageItems
      .filter(item => matchesFilter(item, filter))
      .sort((a, b) => getAttentionScore(b) - getAttentionScore(a) || a.organizationName.localeCompare(b.organizationName))
  ), [filter, pageItems])

  useEffect(() => {
    if (!filteredOrganizations.some(item => item.organizationId === selectedId)) {
      setSelectedId(filteredOrganizations[0]?.organizationId ?? '')
    }
  }, [filteredOrganizations, selectedId])

  const selectedOrganization = filteredOrganizations.find(item => item.organizationId === selectedId) ?? filteredOrganizations[0] ?? pageItems[0] ?? null
  const activeClients = pageItems.filter(item => item.active).length
  const onboardingOpen = pageItems.filter(item => item.onboardingStatus === 'draft' || item.onboardingStatus === 'in_progress' || item.onboardingStatus === 'blocked').length
  const withoutSpace = pageItems.filter(item => item.spaceCount === 0 && item.status !== 'inactive').length
  const withoutPeople = pageItems.filter(item => item.uniquePersonCount === 0 && item.status !== 'inactive').length
  const hasLoadedEmpty = !loading && pageItems.length === 0
  const hasFilteredEmpty = !loading && pageItems.length > 0 && filteredOrganizations.length === 0

  return (
    <Stack spacing={{ xs: 3, md: 6 }} data-capture='organization-list-runtime-workbench'>
      <Card
        sx={{
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          border: `1px solid ${theme.palette.divider}`,
          borderTop: `3px solid ${theme.palette.primary.main}`,
          boxShadow: theme.greenhouseElevation.none.boxShadow,
          bgcolor: 'background.paper'
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 4, md: 5 } }}>
          <Stack spacing={{ xs: 2.5, md: 5 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent='space-between'
              spacing={{ xs: 2.5, md: 4 }}
            >
              <Stack direction='row' alignItems='center' spacing={2} sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                    display: { xs: 'none', sm: 'grid' },
                    placeItems: 'center',
                    color: 'primary.main',
                    bgcolor: 'primary.lighterOpacity',
                    flexShrink: 0
                  }}
                >
                  <i className='tabler-building-community' aria-hidden='true' />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='overline' color='primary.main' sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Centro de operación de cuentas
                  </Typography>
                  <Typography variant='surfaceHeroTitle' sx={{ overflowWrap: 'anywhere' }}>
                    Organizaciones
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
                    <Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      Prioriza cuentas con riesgo, relaciones faltantes y onboarding pendiente.
                    </Box>
                    <Box component='span' sx={{ display: { xs: 'inline', sm: 'none' } }}>
                      Riesgo, relaciones y onboarding.
                    </Box>
                  </Typography>
                </Box>
              </Stack>

              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomTextField
                  id='organization-list-runtime-search'
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value)
                    setPage(0)
                  }}
                  placeholder='Buscar cuenta'
                  aria-label={organizationListAria.search}
                  size='small'
                  InputProps={{
                    startAdornment: <Box component='i' className='tabler-search' aria-hidden='true' sx={{ mr: 2 }} />
                  }}
                  sx={{
                    flex: { xs: 1, sm: 'initial' },
                    minWidth: { xs: 0, sm: 280 },
                    '& .MuiInputBase-root': {
                      minHeight: { xs: 36, md: undefined }
                    }
                  }}
                />
                <GreenhouseButton
                  component={ViewTransitionLink}
                  href='/agency/clients/onboarding'
                  kind='primaryAction'
                  leadingIconClassName='tabler-user-plus'
                >
                  <Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Alta de cliente
                  </Box>
                  <Box component='span' sx={{ display: { xs: 'inline', sm: 'none' } }}>
                    Alta
                  </Box>
                </GreenhouseButton>
              </Stack>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                overflow: 'hidden'
              }}
              role='list'
              aria-label={organizationListAria.signals}
            >
              <SignalCell icon='tabler-briefcase' label='Cuentas activas' mobileLabel='Activos' value={activeClients} helper='En esta pagina' tone='primary' loading={loading && !data} />
              <SignalCell icon='tabler-clipboard-list' label='Onboarding abierto' mobileLabel='Onboarding' value={onboardingOpen} helper='Requieren seguimiento' tone='info' loading={loading && !data} />
              <SignalCell icon='tabler-layout-grid' label='Sin Space' value={withoutSpace} helper='Bloquea operacion' tone='warning' loading={loading && !data} />
              <SignalCell icon='tabler-users' label='Sin equipo' value={withoutPeople} helper='Sin personas vinculadas' tone='warning' loading={loading && !data} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          boxShadow: theme.greenhouseElevation.none.boxShadow,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent='space-between'
          spacing={3}
          sx={{ p: { xs: 3, md: 4 } }}
        >
          <Box
            role='tablist'
            aria-label={organizationListAria.filters}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
              flex: 1,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              overflow: 'hidden'
            }}
          >
            {filterOrder.map((filterKey, index) => (
              <FilterSegment
                key={filterKey}
                tone={filterTone[filterKey]}
                filterKey={filterKey}
                value={pageItems.filter(item => matchesFilter(item, filterKey)).length}
                isActive={filter === filterKey}
                onSelect={() => setFilter(filterKey)}
                ariaControls='organization-runtime-workbench-panel'
                activeBarLayoutId='organization-runtime-filter-active-bar'
                index={index}
              />
            ))}
          </Box>

          <ToggleButtonGroup
            exclusive
            size='small'
            value={viewMode}
            onChange={(_, value: ViewMode | null) => {
              if (value) setViewMode(value)
            }}
            aria-label={organizationListAria.viewMode}
          >
            <ToggleButton value='workbench' aria-label={organizationListAria.workbenchView}>
              <i className='tabler-layout-sidebar-left-collapse' aria-hidden='true' />
            </ToggleButton>
            <ToggleButton value='matrix' aria-label={organizationListAria.matrixView}>
              <i className='tabler-table' aria-hidden='true' />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box role='status' aria-live='polite' aria-atomic='true' sx={visuallyHiddenSx}>
          {filteredOrganizations.length} organizaciones visibles para el filtro {organizationFilterLabels[filter]}.
        </Box>

        <Divider />

        <Box id='organization-runtime-workbench-panel'>
          {loading && !data ? (
            <LoadingWorkbench />
          ) : hasLoadedEmpty || hasFilteredEmpty ? (
            <Box sx={{ p: 4 }}>
              <EmptyState
                icon={searchDebounced ? 'tabler-search-off' : 'tabler-building-off'}
                title={searchDebounced || hasFilteredEmpty ? 'Sin organizaciones para este filtro' : 'Sin organizaciones'}
                description={searchDebounced || hasFilteredEmpty
                  ? 'Ajusta la busqueda o vuelve a Todas para recuperar el panorama completo.'
                  : 'Aun no hay organizaciones registradas para mostrar en el workbench.'}
                action={<GreenhouseButton variant='label' onClick={() => { setSearch(''); setFilter('all') }}>Ver todas</GreenhouseButton>}
              />
            </Box>
          ) : viewMode === 'workbench' && selectedOrganization ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.12fr) minmax(340px, 0.88fr)' },
                maxWidth: '100%',
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              <Stack
                divider={<Divider flexItem />}
                sx={{
                  borderRight: { lg: `1px solid ${theme.palette.divider}` },
                  maxWidth: '100%',
                  minWidth: 0
                }}
              >
                {filteredOrganizations.map(item => (
                  <OrganizationRow
                    key={item.organizationId}
                    item={item}
                    selected={item.organizationId === selectedOrganization.organizationId}
                    onSelect={() => setSelectedId(item.organizationId)}
                  />
                ))}
              </Stack>

              <Box
                component={motion.aside}
                key={selectedOrganization.organizationId}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: MOTION_DURATION_S.standard, ease: framerEaseEmphasized }}
                sx={{ p: { xs: 3, md: 4 }, bgcolor: 'action.hover' }}
              >
                <OrganizationContextRail item={selectedOrganization} />
              </Box>
            </Box>
          ) : (
            <MatrixView organizations={filteredOrganizations} />
          )}
        </Box>

        {data ? (
          <>
            <Divider />
            <TablePagination
              component='div'
              count={data.total}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={event => {
                setPageSize(Number(event.target.value))
                setPage(0)
              }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage='Filas por pagina'
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        ) : null}
      </Card>
    </Stack>
  )
}

function SignalCell({
  icon,
  label,
  mobileLabel,
  value,
  helper,
  tone,
  loading
}: {
  icon: string
  label: string
  mobileLabel?: string
  value: number
  helper: string
  tone: 'primary' | 'info' | 'warning' | 'error'
  loading: boolean
}) {
  const theme = useTheme()

  return (
    <Stack
      role='listitem'
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      spacing={{ xs: 1, md: 3 }}
      sx={{
        p: { xs: 1.5, md: 4 },
        minHeight: { xs: 52, md: 112 },
        borderRight: `1px solid ${theme.palette.divider}`,
        '&:last-of-type': { borderRight: 0 }
      }}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0, alignItems: { xs: 'center', md: 'flex-start' }, textAlign: { xs: 'center', md: 'left' } }}>
        <Typography variant='caption' color='text.secondary'>
          <Box component='span' sx={{ display: { xs: 'none', md: 'inline' } }}>
            {label}
          </Box>
          <Box component='span' sx={{ display: { xs: 'inline', md: 'none' } }}>
            {mobileLabel ?? label}
          </Box>
        </Typography>
        <Typography variant='h5'>
          {loading ? <Skeleton width={32} /> : <AnimatedCounter value={value} duration={MOTION_DURATION_S.long} />}
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'none', md: 'block' } }}>
          {helper}
        </Typography>
      </Stack>
      <Box
        sx={{
          width: { xs: 26, md: 42 },
          height: { xs: 26, md: 42 },
          borderRadius: {
            xs: `${theme.shape.customBorderRadius.md}px`,
            md: `${theme.shape.customBorderRadius.lg}px`
          },
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          color: theme => (tone === 'primary' || tone === 'info' ? theme.palette.text.secondary : theme.palette[tone].dark),
          bgcolor: `${tone}.lighterOpacity`,
          flexShrink: 0
        }}
      >
        <i className={icon} aria-hidden='true' />
      </Box>
    </Stack>
  )
}

function FilterSegment({
  tone,
  filterKey,
  value,
  isActive,
  onSelect,
  ariaControls,
  activeBarLayoutId,
  index
}: {
  tone: SemanticTone
  filterKey: OrganizationWorkbenchFilter
  value: number
  isActive: boolean
  onSelect: () => void
  ariaControls: string
  activeBarLayoutId: string
  index: number
}) {
  const theme = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const title = organizationFilterLabels[filterKey]

  return (
    <Box
      component={motion.button}
      type='button'
      role='tab'
      aria-selected={isActive}
      aria-controls={ariaControls}
      aria-label={`${title}: ${value} organizaciones`}
      onClick={onSelect}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.985, transition: { duration: MOTION_DURATION_S.instant } }}
      sx={{
        appearance: 'none',
        border: 0,
        borderTop: {
          xs: index >= 2 ? `1px solid ${theme.palette.divider}` : 0,
          md: index >= 3 ? `1px solid ${theme.palette.divider}` : 0
        },
        borderLeft: {
          xs: index % 2 === 0 ? 0 : `1px solid ${theme.palette.divider}`,
          md: index % 3 === 0 ? 0 : `1px solid ${theme.palette.divider}`
        },
        bgcolor: isActive ? `${tone}.lighterOpacity` : 'background.paper',
        color: 'text.primary',
        cursor: 'pointer',
        minHeight: { xs: 44, md: 64 },
        px: { xs: 2, md: 3 },
        py: { xs: 1.75, md: 2.5 },
        position: 'relative',
        textAlign: 'left',
        transition: `background-color ${motionCss.duration.short} ${motionCss.ease.standard}, box-shadow ${motionCss.duration.short} ${motionCss.ease.standard}`,
        '&:hover': {
          bgcolor: isActive ? `${tone}.lightOpacity` : 'action.hover',
          boxShadow: `inset 0 0 0 1px ${theme.palette[tone].lightOpacity}`
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette[tone].main}`,
          outlineOffset: -2
        }
      }}
    >
      {isActive ? (
        <Box
          component={motion.span}
          layoutId={activeBarLayoutId}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: MOTION_DURATION_S.standard, ease: framerEaseEmphasized }}
          sx={{
            position: 'absolute',
            insetInlineStart: 0,
            insetBlock: 0,
            width: 3,
            bgcolor: `${tone}.main`,
            borderTopRightRadius: `${theme.shape.customBorderRadius.lg}px`,
            borderBottomRightRadius: `${theme.shape.customBorderRadius.lg}px`
          }}
        />
      ) : null}
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ minWidth: 0 }}>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant='h6' color='text.primary'>
            {title}
          </Typography>
          <Typography variant='caption' color='text.primary' sx={{ display: { xs: 'none', sm: 'block' } }}>
            {filterHint(filterKey)}
          </Typography>
        </Stack>
        <Typography variant='h5' sx={{ color: 'text.primary' }}>
          <AnimatedCounter value={value} format='integer' duration={MOTION_DURATION_S.long} />
        </Typography>
      </Stack>
    </Box>
  )
}

function OrgAvatar({ item, size = 'default' }: { item: OrganizationListItem; size?: 'default' | 'rail' | 'matrix' }) {
  const theme = useTheme()
  const risk = riskForOrganization(item)
  const tone: SemanticTone = risk === 'blocked' ? 'error' : risk === 'attention' ? 'warning' : item.hubspotCompanyId ? 'info' : 'primary'
  const dimension = size === 'rail' ? 56 : size === 'matrix' ? 32 : 48
  const mobileDimension = size === 'default' ? 40 : dimension

  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={{
        width: { xs: mobileDimension, md: dimension },
        height: { xs: mobileDimension, md: dimension },
        borderRadius: size === 'matrix' ? `${theme.shape.customBorderRadius.sm}px` : `${theme.shape.customBorderRadius.md}px`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        border: `1px solid ${theme.palette[tone].mainOpacity}`,
        bgcolor: `${tone}.lighterOpacity`,
        color: 'text.primary'
      }}
    >
      <Typography component='span' variant={size === 'matrix' ? 'caption' : 'button'} color='inherit'>
        {getInitials(item.organizationName)}
      </Typography>
    </Box>
  )
}

function OrganizationRow({ item, selected, onSelect }: { item: OrganizationListItem; selected: boolean; onSelect: () => void }) {
  const theme = useTheme()
  const risk = riskMeta[riskForOrganization(item)]

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      aria-pressed={selected}
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        border: 0,
        textAlign: 'left',
        bgcolor: 'background.paper',
        color: 'text.primary',
        cursor: 'pointer',
        p: { xs: 2.5, md: 3 },
        transition: `background-color ${motionCss.duration.short} ${motionCss.ease.standard}, box-shadow ${motionCss.duration.short} ${motionCss.ease.standard}`,
        boxShadow: selected ? `inset 3px 0 0 ${theme.palette.primary.main}` : theme.greenhouseElevation.none.boxShadow,
        '&:hover': {
          bgcolor: selected ? 'action.selected' : 'action.hover'
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2
        }
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={{ xs: 2, md: 3 }}>
          <Stack direction='row' spacing={2.5} alignItems='center' sx={{ minWidth: 0, maxWidth: '100%', flex: 1 }}>
            <OrgAvatar item={item} />
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={{ xs: 0.75, sm: 1.5 }}
                sx={{ minWidth: 0 }}
                useFlexGap
                flexWrap='wrap'
              >
                <Typography variant='h6' color='text.primary' sx={{ overflowWrap: 'anywhere' }}>
                  {item.organizationName}
                </Typography>
                <StatusPill label={risk.label} tone={risk.tone} icon={risk.icon} />
              </Stack>
              <Typography variant='caption' color='text.secondary'>
                {item.publicId} · {item.country ?? 'Sin pais'} · {item.industry ?? 'Sin industria'}
              </Typography>
            </Stack>
          </Stack>

          <Stack spacing={0.5} alignItems='flex-end' sx={{ display: { xs: 'none', md: 'flex' }, maxWidth: 220 }}>
            <Typography variant='caption' color='text.secondary'>
              Ultima senal
            </Typography>
            <Typography variant='h6' sx={{ textAlign: 'right' }}>
              {formatDateSignal(item.updatedAt)}
            </Typography>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'none' },
            gap: 1.25,
            flexWrap: 'wrap'
          }}
        >
          <RowFact label={lifecycleLabel(item)} tone={item.active ? 'success' : 'secondary'} />
          <RowFact
            label={item.onboardingStatus ? onboardingMeta[item.onboardingStatus].label : 'Sin onboarding'}
            tone={item.onboardingStatus ? onboardingMeta[item.onboardingStatus].tone : 'secondary'}
            icon={item.onboardingStatus ? 'tabler-clipboard-list' : 'tabler-clipboard-off'}
          />
          <RowFact
            label={item.spaceCount === 0 ? 'Sin Space' : `${item.spaceCount} Space${item.spaceCount === 1 ? '' : 's'}`}
            tone={item.spaceCount === 0 && item.status !== 'inactive' ? 'warning' : 'info'}
            icon='tabler-layout-grid'
          />
          <RowFact
            label={item.uniquePersonCount === 0 ? 'Sin equipo' : `${item.uniquePersonCount} persona${item.uniquePersonCount === 1 ? '' : 's'}`}
            tone={item.uniquePersonCount === 0 && item.status !== 'inactive' ? 'warning' : 'primary'}
            icon='tabler-users'
          />
        </Box>

        <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'block', md: 'none' } }}>
          Ultima senal: {formatDateSignal(item.updatedAt)}
        </Typography>
      </Stack>
    </Box>
  )
}

function RowFact({ label, tone, icon }: { label: string; tone: SemanticTone; icon?: string }) {
  // Tonal (variant='label') feedback chip: consume `theme.greenhouseSemantic[tone]`
  // (tint + AA ink + soft border) → mantiene el tono semántico REAL con contraste AA.
  // El `outlined` colapsaba warning/success→gris (bordes finos fallan 3:1) y aplanaba la
  // señal: positivo (verde), gap/atención (ámbar) y bloqueo (rojo) deben verse distintos.
  return (
    <GreenhouseChip
      kind='attribute'
      label={label}
      iconClassName={icon}
      size='small'
      tone={tone}
      variant={chipVariantForTone(tone)}
      sx={{
        width: { xs: '100%', sm: 'auto' },
        maxWidth: '100%',
        minWidth: 0,
        '& .MuiChip-label': {
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }}
    />
  )
}

function StatusPill({ label, tone, icon }: { label: ReactNode; tone: SemanticTone; icon?: string }) {
  // Tonal feedback chip (AA via `theme.greenhouseSemantic[tone]`): el badge de riesgo,
  // los chips del rail de readiness y la columna Estado del matrix muestran su tono
  // semántico REAL — verde (positivo) / ámbar (atención) / rojo (bloqueo) distinguibles.
  return (
    <GreenhouseChip
      kind='status'
      label={label}
      iconClassName={icon}
      size='small'
      tone={tone}
      variant={chipVariantForTone(tone)}
    />
  )
}

function OrganizationContextRail({ item }: { item: OrganizationListItem }) {
  const entries = readinessEntries(item)
  const completeCount = entries.filter(entry => entry.state === 'complete').length
  const progress = Math.round((completeCount / entries.length) * 100)
  const risk = riskForOrganization(item)

  return (
    <Stack spacing={4}>
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
        <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 0 }}>
          <OrgAvatar item={item} size='rail' />
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Typography variant='h5' noWrap>
              {item.organizationName}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {item.publicId} · {item.country ?? 'Sin pais'}
            </Typography>
          </Stack>
        </Stack>
        <StatusPill label={riskMeta[risk].label} tone={riskMeta[risk].tone} icon={riskMeta[risk].icon} />
      </Stack>

      <RailSection title='Readiness operacional' subheader='Derivado de datos reales disponibles' icon='tabler-progress-check'>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Typography variant='h6'>Preparacion</Typography>
              <Typography variant='monoId' color='text.secondary'>
                {progress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant='determinate'
              value={progress}
              color={risk === 'blocked' ? 'error' : risk === 'attention' ? 'warning' : 'success'}
              aria-label={`Preparacion operacional de ${item.organizationName}`}
              sx={theme => ({ height: 8, borderRadius: `${theme.shape.customBorderRadius.sm}px` })}
            />
          </Stack>
          <Stack spacing={2}>
            {entries.map(entry => (
              <Stack key={entry.label} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <Typography variant='body2'>{entry.label}</Typography>
                <StatusPill label={readinessLabel(entry.state)} tone={readinessTone[entry.state]} icon={readinessIcon[entry.state]} />
              </Stack>
            ))}
          </Stack>
        </Stack>
      </RailSection>

      <RailSection title='Relaciones clave' subheader='Contexto para entrar al Workspace' icon='tabler-affiliate' tone='info'>
        <Stack direction='row' spacing={3} useFlexGap flexWrap='wrap'>
          <RelationshipMetric label='Spaces' value={item.spaceCount} icon='tabler-layout-grid' />
          <RelationshipMetric label='Personas' value={item.uniquePersonCount} icon='tabler-users' />
          <RelationshipMetric label='Membresias' value={item.membershipCount} icon='tabler-id' />
        </Stack>
      </RailSection>

      <RailSection title='Procedencia y senales' subheader='Sin inventar timeline no disponible' icon='tabler-timeline'>
        <Stack spacing={2.5}>
          <TimelineSignal label='Fuente' detail={sourceLabel(item)} tone={item.hubspotCompanyId ? 'info' : 'secondary'} />
          <TimelineSignal label='Ultima actualizacion' detail={formatDateSignal(item.updatedAt)} tone='primary' />
          <TimelineSignal
            label='Brand asset'
            detail='Logo pendiente de TASK-999; se muestra fallback de iniciales'
            tone='secondary'
          />
        </Stack>
      </RailSection>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <GreenhouseButton
          component={ViewTransitionLink}
          href={`/agency/organizations/${item.organizationId}`}
          kind='primaryAction'
          leadingIconClassName='tabler-layout-dashboard'
        >
          Abrir Workspace
        </GreenhouseButton>
        <GreenhouseButton
          component={ViewTransitionLink}
          href={item.onboardingStatus ? `/agency/clients/${item.organizationId}/lifecycle` : '/agency/clients/onboarding'}
          variant='outlined'
          sx={{
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'text.secondary'
            }
          }}
          leadingIconClassName='tabler-clipboard-list'
        >
          Ver onboarding
        </GreenhouseButton>
      </Stack>
    </Stack>
  )
}

function RailSection({
  title,
  subheader,
  icon,
  tone = 'primary',
  children
}: {
  title: string
  subheader: string
  icon: string
  tone?: 'primary' | 'info'
  children: ReactNode
}) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 4,
        '&:last-of-type': {
          borderBottom: 0,
          pb: 0
        }
      }}
    >
      <Stack direction='row' spacing={2.5} alignItems='center' sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            display: 'grid',
            placeItems: 'center',
            color: `${tone}.main`,
            bgcolor: `${tone}.lighterOpacity`,
            flexShrink: 0
          }}
        >
          <i className={icon} aria-hidden='true' />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h6' color='text.primary'>
            {title}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {subheader}
          </Typography>
        </Box>
      </Stack>
      {children}
    </Box>
  )
}

function RelationshipMetric({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <Stack
      spacing={1}
      sx={theme => ({
        minWidth: 112,
        p: 2.5,
        borderLeft: `2px solid ${theme.palette.divider}`
      })}
    >
      <Stack direction='row' spacing={1} alignItems='center'>
        <i className={icon} aria-hidden='true' />
        <Typography variant='caption' color='text.secondary'>
          {label}
        </Typography>
      </Stack>
      <Typography variant='h5'>
        <AnimatedCounter value={value} duration={MOTION_DURATION_S.long} />
      </Typography>
    </Stack>
  )
}

function TimelineSignal({ label, detail, tone }: { label: string; detail: string; tone: SemanticTone }) {
  return (
    <Stack direction='row' spacing={2.5} alignItems='flex-start'>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: `${tone}.main`,
          mt: 1
        }}
      />
      <Stack spacing={0.25}>
        <Typography variant='h6'>{label}</Typography>
        <Typography variant='caption' color='text.secondary'>
          {detail}
        </Typography>
      </Stack>
    </Stack>
  )
}

function MatrixView({ organizations }: { organizations: OrganizationListItem[] }) {
  return (
    <Box
      role='region'
      aria-label={organizationListAria.matrixRegion}
      tabIndex={0}
      sx={{
        overflowX: 'auto',
        '&:focus-visible': {
          outline: theme => `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2
        }
      }}
    >
      <Table size='small' aria-label={organizationListAria.matrixTable}>
        <TableHead>
          <TableRow>
            <TableCell>Organizacion</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Onboarding</TableCell>
            <TableCell align='right'>Spaces</TableCell>
            <TableCell align='right'>Personas</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Ultima senal</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {organizations.map(item => (
            <TableRow key={item.organizationId} hover>
              <TableCell>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <OrgAvatar item={item} size='matrix' />
                  <Box>
                    <Typography variant='h6'>{item.organizationName}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.publicId}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>
                <StatusPill label={riskMeta[riskForOrganization(item)].label} tone={riskMeta[riskForOrganization(item)].tone} icon={riskMeta[riskForOrganization(item)].icon} />
              </TableCell>
              <TableCell>
                {item.onboardingStatus ? (
                  <StatusPill label={onboardingMeta[item.onboardingStatus].label} tone={onboardingMeta[item.onboardingStatus].tone} />
                ) : (
                  <Typography variant='body2' color='text.secondary'>Sin caso</Typography>
                )}
              </TableCell>
              <TableCell align='right'><Typography variant='monoId'>{item.spaceCount}</Typography></TableCell>
              <TableCell align='right'><Typography variant='monoId'>{item.uniquePersonCount}</Typography></TableCell>
              <TableCell>{sourceLabel(item)}</TableCell>
              <TableCell>{formatDateSignal(item.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

function LoadingWorkbench() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.12fr) minmax(340px, 0.88fr)' }
      }}
      data-capture='organization-list-runtime-loading'
    >
      <Stack divider={<Divider flexItem />}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Stack key={index} direction='row' spacing={3} sx={{ p: { xs: 3, md: 4 } }}>
            <Skeleton variant='rounded' width={48} height={48} />
            <Stack spacing={1.25} sx={{ flex: 1 }}>
              <Skeleton width='42%' />
              <Skeleton width='64%' />
              <Skeleton width='78%' />
            </Stack>
          </Stack>
        ))}
      </Stack>
      <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: 'action.hover' }}>
        <Stack spacing={3}>
          <Skeleton variant='rounded' width={56} height={56} />
          <Skeleton width='56%' />
          <Skeleton width='80%' />
          <Skeleton variant='rounded' height={8} />
          <Skeleton width='92%' />
          <Skeleton width='74%' />
        </Stack>
      </Box>
    </Box>
  )
}

function readinessLabel(state: ReturnType<typeof readinessEntries>[number]['state']) {
  if (state === 'complete') return 'Listo'
  if (state === 'warning') return 'Revisar'
  if (state === 'blocked') return 'Bloqueado'

  return 'Pendiente'
}

export default OrganizationListView
