'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
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
import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import { getMicrocopy } from '@/lib/copy'

import {
  organizationEnterpriseMockData,
  organizationFilterLabels,
  type OrganizationEnterpriseMock,
  type OrganizationOnboarding,
  type OrganizationRisk,
  type OrganizationWorkbenchFilter
} from './organization-list-enterprise-mock-data'

type ViewMode = 'workbench' | 'matrix'

const microcopy = getMicrocopy()

const organizationListMockupAria = {
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

const lifecycleLabel: Record<OrganizationEnterpriseMock['lifecycle'], string> = {
  active_client: 'Cliente activo',
  opportunity: 'Oportunidad',
  prospect: 'Prospecto',
  inactive: 'Inactiva'
}

const onboardingMeta: Record<Exclude<OrganizationOnboarding, null>, { label: string; tone: 'success' | 'warning' | 'error' | 'info' }> = {
  draft: { label: microcopy.states.draft, tone: 'warning' },
  in_progress: { label: microcopy.states.inProgress, tone: 'info' },
  blocked: { label: microcopy.states.blocked, tone: 'error' },
  complete: { label: microcopy.states.completed, tone: 'success' }
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

type SemanticTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

const filterTone: Record<OrganizationWorkbenchFilter, SemanticTone> = {
  all: 'primary',
  attention: 'warning',
  onboarding: 'info',
  no_space: 'warning',
  no_people: 'error',
  active: 'success'
}

function matchesFilter(item: OrganizationEnterpriseMock, filter: OrganizationWorkbenchFilter) {
  if (filter === 'all') return true
  if (filter === 'attention') return item.risk !== 'none'
  if (filter === 'onboarding') return item.onboarding === 'draft' || item.onboarding === 'in_progress' || item.onboarding === 'blocked'
  if (filter === 'no_space') return item.spaceCount === 0
  if (filter === 'no_people') return item.peopleCount === 0

  return item.lifecycle === 'active_client'
}

function filterCount(filter: OrganizationWorkbenchFilter) {
  return organizationEnterpriseMockData.filter(item => matchesFilter(item, filter)).length
}

function getAttentionScore(item: OrganizationEnterpriseMock) {
  if (item.risk === 'blocked') return 3
  if (item.risk === 'attention') return 2
  if (item.onboarding === 'draft' || item.onboarding === 'in_progress') return 1

  return 0
}

const OrganizationListEnterpriseMockupView = () => {
  const theme = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const [filter, setFilter] = useState<OrganizationWorkbenchFilter>('attention')
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('workbench')
  const [selectedId, setSelectedId] = useState('org-accountscout')

  const filteredOrganizations = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return organizationEnterpriseMockData
      .filter(item => matchesFilter(item, filter))
      .filter(item => {
        if (!normalized) return true

        return [item.name, item.legalName, item.publicId, item.industry, item.countryLabel]
          .filter(Boolean)
          .some(value => value!.toLowerCase().includes(normalized))
      })
      .sort((a, b) => getAttentionScore(b) - getAttentionScore(a) || a.name.localeCompare(b.name))
  }, [filter, query])

  useEffect(() => {
    if (!filteredOrganizations.some(item => item.organizationId === selectedId)) {
      setSelectedId(filteredOrganizations[0]?.organizationId ?? '')
    }
  }, [filteredOrganizations, selectedId])

  const selectedOrganization = filteredOrganizations.find(item => item.organizationId === selectedId) ?? filteredOrganizations[0] ?? organizationEnterpriseMockData[0]

  const activeClients = organizationEnterpriseMockData.filter(item => item.lifecycle === 'active_client').length
  const onboardingOpen = organizationEnterpriseMockData.filter(item => item.onboarding === 'draft' || item.onboarding === 'in_progress' || item.onboarding === 'blocked').length
  const withoutSpace = organizationEnterpriseMockData.filter(item => item.spaceCount === 0 && item.lifecycle !== 'inactive').length
  const withoutPeople = organizationEnterpriseMockData.filter(item => item.peopleCount === 0 && item.lifecycle !== 'inactive').length

  return (
    <Stack spacing={{ xs: 3, md: 6 }} data-capture='organization-list-enterprise-mockup'>
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
              <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                <Stack direction='row' alignItems='center' spacing={2}>
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
                      Organization Operations Workbench
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
              </Stack>
              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomTextField
                  id='organization-list-enterprise-search'
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder='Buscar cuenta, ID o industria'
                  aria-label={organizationListMockupAria.search}
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
                  component={Link}
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
                gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                overflow: 'hidden'
              }}
              role='list'
              aria-label={organizationListMockupAria.signals}
            >
              <SignalCell icon='tabler-briefcase' label='Clientes activos' mobileLabel='Activos' value={activeClients} helper='Cuentas ya operativas' tone='primary' />
              <SignalCell icon='tabler-clipboard-list' label='Onboarding abierto' mobileLabel='Onboarding' value={onboardingOpen} helper='Requieren seguimiento' tone='info' />
              <SignalCell icon='tabler-layout-grid' label='Sin Space' value={withoutSpace} helper='Bloquea operacion' tone='warning' />
              <SignalCell icon='tabler-users' label='Sin equipo' value={withoutPeople} helper='Sin personas vinculadas' tone='error' />
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
            aria-label={organizationListMockupAria.filters}
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
                title={organizationFilterLabels[filterKey]}
                value={filterCount(filterKey)}
                isActive={filter === filterKey}
                onSelect={() => setFilter(filterKey)}
                ariaControls='organization-workbench-panel'
                activeBarLayoutId='organization-filter-active-bar'
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
            aria-label={organizationListMockupAria.viewMode}
          >
            <ToggleButton value='workbench' aria-label={organizationListMockupAria.workbenchView}>
              <i className='tabler-layout-sidebar-left-collapse' aria-hidden='true' />
            </ToggleButton>
            <ToggleButton value='matrix' aria-label={organizationListMockupAria.matrixView}>
              <i className='tabler-table' aria-hidden='true' />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box role='status' aria-live='polite' aria-atomic='true' sx={visuallyHiddenSx}>
          {filteredOrganizations.length} organizaciones visibles para el filtro {organizationFilterLabels[filter]}.
        </Box>

        <Divider />

        <Box id='organization-workbench-panel'>
          {filteredOrganizations.length === 0 ? (
            <Box sx={{ p: 4 }}>
              <EmptyState
                icon='tabler-search-off'
                title='Sin organizaciones para este filtro'
                description='Ajusta la busqueda o vuelve a Todas para recuperar el panorama completo.'
                action={<GreenhouseButton variant='label' onClick={() => { setQuery(''); setFilter('all') }}>Ver todas</GreenhouseButton>}
              />
            </Box>
          ) : viewMode === 'workbench' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.12fr) minmax(340px, 0.88fr)' },
                minHeight: { xs: 'auto', lg: 560 }
              }}
            >
              <Stack
                divider={<Divider flexItem />}
                sx={{
                  borderRight: { lg: `1px solid ${theme.palette.divider}` }
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
  tone
}: {
  icon: string
  label: string
  mobileLabel?: string
  value: number
  helper: string
  tone: 'primary' | 'info' | 'warning' | 'error'
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
        borderRight: { xs: `1px solid ${theme.palette.divider}`, lg: `1px solid ${theme.palette.divider}` },
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
          <AnimatedCounter value={value} duration={MOTION_DURATION_S.long} />
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
  title,
  value,
  isActive,
  onSelect,
  ariaControls,
  activeBarLayoutId,
  index
}: {
  tone: SemanticTone
  title: string
  value: number
  isActive: boolean
  onSelect: () => void
  ariaControls: string
  activeBarLayoutId: string
  index: number
}) {
  const theme = useTheme()
  const prefersReducedMotion = useReducedMotion()

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
            {filterHint(title)}
          </Typography>
        </Stack>
        <Typography
          variant='h5'
          sx={{
            color: isActive ? `${tone}.dark` : 'text.primary'
          }}
        >
          <AnimatedCounter value={value} format='integer' duration={MOTION_DURATION_S.long} />
        </Typography>
      </Stack>
    </Box>
  )
}

function filterHint(title: string) {
  if (title === 'Todas') return 'Panorama'
  if (title === 'Atencion') return 'Riesgo'
  if (title === 'Onboarding') return 'Casos abiertos'
  if (title === 'Sin Space') return 'Bloqueo'
  if (title === 'Sin equipo') return 'Relacion'

  return 'Operativas'
}

function OrgAvatar({
  item,
  size = 'default'
}: {
  item: OrganizationEnterpriseMock
  size?: 'default' | 'rail' | 'matrix'
}) {
  const theme = useTheme()
  const dimension = size === 'rail' ? 56 : size === 'matrix' ? 32 : 48
  const mobileDimension = size === 'default' ? 40 : dimension

  return (
    <Box
      component='span'
      aria-hidden='true'
      sx={{
        width: { xs: mobileDimension, md: dimension },
        height: { xs: mobileDimension, md: dimension },
        borderRadius:
          size === 'matrix'
            ? `${theme.shape.customBorderRadius.sm}px`
            : `${theme.shape.customBorderRadius.md}px`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        border: `1px solid ${theme.palette[item.avatarTone].mainOpacity}`,
        bgcolor: `${item.avatarTone}.lighterOpacity`,
        color: 'text.primary',
      }}
    >
      <Typography component='span' variant={size === 'matrix' ? 'caption' : 'button'} color='inherit'>
        {item.initials}
      </Typography>
    </Box>
  )
}

function OrganizationRow({
  item,
  selected,
  onSelect
}: {
  item: OrganizationEnterpriseMock
  selected: boolean
  onSelect: () => void
}) {
  const theme = useTheme()
  const risk = riskMeta[item.risk]

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      aria-pressed={selected}
      sx={{
        width: '100%',
        border: 0,
        textAlign: 'left',
        bgcolor: 'background.paper',
        color: 'text.primary',
        cursor: 'pointer',
        p: { xs: 3, md: 4 },
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
      <Stack spacing={2.5}>
        <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3}>
          <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 0, flex: 1 }}>
            <OrgAvatar item={item} />
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Stack direction='row' alignItems='center' spacing={1.5} sx={{ minWidth: 0 }} useFlexGap flexWrap='wrap'>
                <Typography variant='h6' color='text.primary'>{item.name}</Typography>
                <StatusPill label={risk.label} tone={risk.tone} icon={risk.icon} />
              </Stack>
              <Typography variant='caption' color='text.secondary'>
                {item.publicId} · {item.countryCode ?? 'Sin pais'} · {item.industry ?? 'Sin industria'}
              </Typography>
              {item.legalName ? (
                <Typography variant='caption' color='text.secondary'>
                  {item.legalName}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          <Stack spacing={0.5} alignItems='flex-end' sx={{ display: { xs: 'none', md: 'flex' }, maxWidth: 220 }}>
            <Typography variant='caption' color='text.secondary'>
              Ultima senal
            </Typography>
            <Typography variant='h6' sx={{ textAlign: 'right' }}>
              {item.lastActivityLabel}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction='row' spacing={1.25} useFlexGap flexWrap='wrap'>
          <RowFact label={lifecycleLabel[item.lifecycle]} tone={item.lifecycle === 'active_client' ? 'success' : 'secondary'} />
          <RowFact
            label={item.onboarding ? onboardingMeta[item.onboarding].label : 'Sin onboarding'}
            tone={item.onboarding ? onboardingMeta[item.onboarding].tone : 'secondary'}
            icon={item.onboarding ? 'tabler-clipboard-list' : 'tabler-clipboard-off'}
          />
          <RowFact
            label={`${item.spaceCount} Space${item.spaceCount === 1 ? '' : 's'}`}
            tone={item.spaceCount === 0 && item.lifecycle !== 'inactive' ? 'warning' : 'info'}
            icon='tabler-layout-grid'
          />
          <RowFact
            label={`${item.peopleCount} persona${item.peopleCount === 1 ? '' : 's'}`}
            tone={item.peopleCount === 0 && item.lifecycle !== 'inactive' ? 'error' : 'primary'}
            icon='tabler-users'
          />
        </Stack>

        <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'block', md: 'none' } }}>
          Ultima senal: {item.lastActivityLabel}
        </Typography>
      </Stack>
    </Box>
  )
}

const toGreenhouseChipTone = (tone: SemanticTone) => (tone === 'primary' || tone === 'error' ? tone : 'default')

function RowFact({ label, tone, icon }: { label: string; tone: SemanticTone; icon?: string }) {
  return (
    <GreenhouseChip
      kind='attribute'
      label={label}
      iconClassName={icon}
      size='small'
      tone={toGreenhouseChipTone(tone)}
      variant='outlined'
    />
  )
}

function StatusPill({ label, tone, icon }: { label: ReactNode; tone: SemanticTone; icon?: string }) {
  return (
    <GreenhouseChip
      kind='status'
      label={label}
      iconClassName={icon}
      size='small'
      tone={toGreenhouseChipTone(tone)}
      variant='outlined'
    />
  )
}

function OrganizationContextRail({ item }: { item: OrganizationEnterpriseMock }) {
  const completeCount = item.readiness.filter(entry => entry.state === 'complete').length
  const progress = Math.round((completeCount / item.readiness.length) * 100)

  return (
    <Stack spacing={4}>
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
        <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 0 }}>
          <OrgAvatar item={item} size='rail' />
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Typography variant='h5' noWrap>
              {item.name}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {item.publicId} · {item.countryLabel ?? 'Sin pais'}
            </Typography>
          </Stack>
        </Stack>
        <StatusPill label={riskMeta[item.risk].label} tone={riskMeta[item.risk].tone} icon={riskMeta[item.risk].icon} />
      </Stack>

      <RailSection title='Readiness operacional' subheader='Estado resumido de la cuenta seleccionada' icon='tabler-progress-check'>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Typography variant='h6'>
                Preparacion
              </Typography>
              <Typography variant='monoId' color='text.secondary'>
                {progress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant='determinate'
              value={progress}
              color={item.risk === 'blocked' ? 'error' : item.risk === 'attention' ? 'warning' : 'success'}
              aria-label={`Preparacion operacional de ${item.name}`}
              sx={theme => ({ height: 8, borderRadius: `${theme.shape.customBorderRadius.sm}px` })}
            />
          </Stack>
          <Stack spacing={2}>
            {item.readiness.map(entry => (
              <Stack key={entry.label} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <Typography variant='body2'>{entry.label}</Typography>
                <StatusPill
                  label={readinessLabel(entry.state)}
                  tone={readinessTone[entry.state]}
                  icon={readinessIcon[entry.state]}
                />
              </Stack>
            ))}
          </Stack>
        </Stack>
      </RailSection>

      <RailSection title='Relaciones clave' subheader='Contexto para entrar al Workspace' icon='tabler-affiliate' tone='info'>
        <Stack direction='row' spacing={3} useFlexGap flexWrap='wrap'>
          <RelationshipMetric label='Spaces' value={item.spaceCount} icon='tabler-layout-grid' />
          <RelationshipMetric label='Personas' value={item.peopleCount} icon='tabler-users' />
          <RelationshipMetric label='Membresias' value={item.membershipCount} icon='tabler-id' />
        </Stack>
      </RailSection>

      <RailSection title='Timeline corto' subheader='Ultimas senales operativas' icon='tabler-timeline'>
        <Stack spacing={2.5}>
          {item.timeline.map(event => (
            <Stack key={`${event.label}-${event.detail}`} direction='row' spacing={2.5} alignItems='flex-start'>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: `${event.tone}.main`,
                  mt: 1
                }}
              />
              <Stack spacing={0.25}>
                <Typography variant='h6'>
                  {event.label}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {event.detail}
                </Typography>
              </Stack>
            </Stack>
          ))}
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
          href={item.onboarding ? `/agency/clients/${item.organizationId}/lifecycle` : '/agency/clients/onboarding'}
          variant='outlined'
          tone='secondary'
          leadingIconClassName='tabler-clipboard-list'
          sx={{
            color: 'text.primary',
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'text.secondary',
              bgcolor: 'action.hover'
            }
          }}
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
          <Typography variant='h6' color='text.primary'>{title}</Typography>
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

function MatrixView({ organizations }: { organizations: OrganizationEnterpriseMock[] }) {
  return (
    <Box
      role='region'
      aria-label={organizationListMockupAria.matrixRegion}
      tabIndex={0}
      sx={{
        overflowX: 'auto',
        '&:focus-visible': {
          outline: theme => `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2
        }
      }}
    >
      <Table size='small' aria-label={organizationListMockupAria.matrixTable}>
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
                    <Typography variant='h6'>{item.name}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.publicId}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>
                <StatusPill label={riskMeta[item.risk].label} tone={riskMeta[item.risk].tone} icon={riskMeta[item.risk].icon} />
              </TableCell>
              <TableCell>
                {item.onboarding ? (
                  <StatusPill label={onboardingMeta[item.onboarding].label} tone={onboardingMeta[item.onboarding].tone} />
                ) : (
                  <Typography variant='body2' color='text.secondary'>Sin caso</Typography>
                )}
              </TableCell>
              <TableCell align='right'><Typography variant='monoId'>{item.spaceCount}</Typography></TableCell>
              <TableCell align='right'><Typography variant='monoId'>{item.peopleCount}</Typography></TableCell>
              <TableCell>{sourceLabel(item.source)}</TableCell>
              <TableCell>{item.lastActivityLabel}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

function readinessLabel(state: OrganizationEnterpriseMock['readiness'][number]['state']) {
  if (state === 'complete') return 'Listo'
  if (state === 'warning') return 'Revisar'
  if (state === 'blocked') return 'Bloqueado'

  return 'Pendiente'
}

function sourceLabel(source: OrganizationEnterpriseMock['source']) {
  if (source === 'hubspot') return 'HubSpot'
  if (source === 'wizard') return 'Wizard'

  return 'Manual'
}

export default OrganizationListEnterpriseMockupView
