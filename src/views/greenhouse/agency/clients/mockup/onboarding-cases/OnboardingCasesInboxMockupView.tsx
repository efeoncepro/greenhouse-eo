'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { getMicrocopy } from '@/lib/copy'
import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'

type CaseStatus = 'pending' | 'in_progress' | 'blocked'
type CaseOrigin = 'hubspot_deal' | 'manual' | 'adopt'
type StepStatus = 'completed' | 'warning' | 'in_progress' | 'pending' | 'blocked'

type OnboardingStep = {
  label: string
  description: string
  status: StepStatus
  detail: string
}

type OnboardingCase = {
  id: string
  organization: string
  initials: string
  caseCode: string
  status: CaseStatus
  origin: CaseOrigin
  createdAt: string
  overdueLabel: string | null
  nextAction: string
  owner: string
  ownerEmail: string
  slaLabel: string
  slaProgress: number
  dealName: string | null
  dealId: string | null
  dealOwner: string | null
  sourceMeta: string
  steps: OnboardingStep[]
}

const M = getMicrocopy()

const statusCopy: Record<CaseStatus, { label: string; color: 'warning' | 'info' | 'error' }> = {
  pending: { label: M.states.pending, color: 'warning' },
  in_progress: { label: M.states.inProgress, color: 'info' },
  blocked: { label: M.states.blocked, color: 'error' }
}

const originCopy: Record<CaseOrigin, { label: string; color: 'warning' | 'primary' | 'secondary' }> = {
  hubspot_deal: { label: 'HubSpot', color: 'warning' },
  manual: { label: 'Manual', color: 'primary' },
  adopt: { label: 'Adopt', color: 'secondary' }
}

const stepCopy: Record<StepStatus, { label: string; color: 'success' | 'warning' | 'info' | 'secondary' | 'error'; icon: string }> = {
  completed: { label: M.states.completed, color: 'success', icon: 'tabler-check' },
  warning: { label: 'Advertencia', color: 'warning', icon: 'tabler-alert-triangle' },
  in_progress: { label: M.states.inProgress, color: 'info', icon: 'tabler-dots' },
  pending: { label: M.states.pending, color: 'secondary', icon: 'tabler-circle' },
  blocked: { label: M.states.blocked, color: 'error', icon: 'tabler-lock' }
}

const cases: OnboardingCase[] = [
  {
    id: 'case-aceros',
    organization: 'Aceros Chile S.A.',
    initials: 'AC',
    caseCode: 'ONB-2025-0412',
    status: 'in_progress',
    origin: 'hubspot_deal',
    createdAt: '13 may 2025',
    overdueLabel: '2 días vencido',
    nextAction: 'Continuar aprovisionamiento en Microsoft Teams.',
    owner: 'Camila Rojas',
    ownerEmail: 'camila.rojas@greenhouse.cl',
    slaLabel: 'Vence el 20 may 2025, 23:59',
    slaProgress: 74,
    dealName: 'Aceros Chile S.A. - Renovación 2025',
    dealId: '24587912067',
    dealOwner: 'Javiera Pizarro',
    sourceMeta: 'HubSpot deal cerrado el 12 may 2025',
    steps: [
      { label: 'Identidad', description: 'Verificación de identidad y datos legales', status: 'completed', detail: '13 may 2025, 10:22' },
      { label: 'Finanzas', description: 'Validación financiera y crediticia', status: 'completed', detail: '13 may 2025, 10:35' },
      { label: 'Notion', description: 'Provisionar workspace y páginas', status: 'warning', detail: 'Todavía no fluye al portal' },
      { label: 'Teams', description: 'Crear tenant y estructura base', status: 'in_progress', detail: 'Asignado a Camila R.' },
      { label: 'Usuarios', description: 'Invitar usuarios y validar accesos', status: 'pending', detail: 'Sin invitaciones enviadas' },
      { label: 'Preflight', description: 'Chequeos finales y activación', status: 'pending', detail: 'Esperando flujo Notion' }
    ]
  },
  {
    id: 'case-nutriplus',
    organization: 'NutriPlus SpA',
    initials: 'NP',
    caseCode: 'ONB-2025-0409',
    status: 'in_progress',
    origin: 'hubspot_deal',
    createdAt: '12 may 2025',
    overdueLabel: '1 día vencido',
    nextAction: 'Validar contacto financiero antes de activar accesos.',
    owner: 'Felipe Rojas',
    ownerEmail: 'felipe.rojas@greenhouse.cl',
    slaLabel: 'Vence el 18 may 2025, 18:00',
    slaProgress: 62,
    dealName: 'NutriPlus SpA - Content Ops',
    dealId: '24587912041',
    dealOwner: 'Felipe Rojas',
    sourceMeta: 'HubSpot deal cerrado el 11 may 2025',
    steps: [
      { label: 'Identidad', description: 'Datos legales y país', status: 'completed', detail: 'Completo' },
      { label: 'Finanzas', description: 'Contacto financiero', status: 'warning', detail: 'Falta email facturación' },
      { label: 'Notion', description: 'Workspace y bases', status: 'in_progress', detail: 'Sincronizando' },
      { label: 'Teams', description: 'Canal operativo', status: 'pending', detail: 'Pendiente' },
      { label: 'Usuarios', description: 'Invitaciones', status: 'pending', detail: 'Pendiente' },
      { label: 'Preflight', description: 'Validación final', status: 'pending', detail: 'Pendiente' }
    ]
  },
  {
    id: 'case-innova',
    organization: 'InnovaOne Ltda.',
    initials: 'IO',
    caseCode: 'ONB-2025-0405',
    status: 'blocked',
    origin: 'hubspot_deal',
    createdAt: '10 may 2025',
    overdueLabel: '3 días vencido',
    nextAction: 'Resolver bloqueo de contrato marco firmado.',
    owner: 'María Villalobos',
    ownerEmail: 'maria.villalobos@greenhouse.cl',
    slaLabel: 'Venció el 15 may 2025, 12:00',
    slaProgress: 100,
    dealName: 'InnovaOne Ltda. - Always On',
    dealId: '24587911985',
    dealOwner: 'Javiera Pizarro',
    sourceMeta: 'HubSpot deal cerrado el 9 may 2025',
    steps: [
      { label: 'Identidad', description: 'Datos legales', status: 'completed', detail: 'Completo' },
      { label: 'Finanzas', description: 'Perfil financiero', status: 'completed', detail: 'Completo' },
      { label: 'Notion', description: 'Workspace', status: 'completed', detail: 'Fluye al portal' },
      { label: 'Teams', description: 'Canal operativo', status: 'completed', detail: 'Completo' },
      { label: 'Usuarios', description: 'Invitaciones', status: 'blocked', detail: 'Contrato marco pendiente' },
      { label: 'Preflight', description: 'Validación final', status: 'pending', detail: 'Bloqueado' }
    ]
  },
  {
    id: 'case-tecnometal',
    organization: 'Tecnometal SpA',
    initials: 'TM',
    caseCode: 'ONB-2025-0402',
    status: 'pending',
    origin: 'manual',
    createdAt: '9 may 2025',
    overdueLabel: null,
    nextAction: 'Completar datos comerciales del wizard.',
    owner: 'Camila Rojas',
    ownerEmail: 'camila.rojas@greenhouse.cl',
    slaLabel: 'Vence el 22 may 2025, 18:00',
    slaProgress: 18,
    dealName: null,
    dealId: null,
    dealOwner: null,
    sourceMeta: 'Alta manual creada desde el wizard',
    steps: [
      { label: 'Identidad', description: 'Datos legales', status: 'in_progress', detail: 'En edición' },
      { label: 'Finanzas', description: 'Perfil financiero', status: 'pending', detail: 'Pendiente' },
      { label: 'Notion', description: 'Workspace', status: 'pending', detail: 'Pendiente' },
      { label: 'Teams', description: 'Canal operativo', status: 'pending', detail: 'Pendiente' },
      { label: 'Usuarios', description: 'Invitaciones', status: 'pending', detail: 'Pendiente' },
      { label: 'Preflight', description: 'Validación final', status: 'pending', detail: 'Pendiente' }
    ]
  },
  {
    id: 'case-global',
    organization: 'Global Logistics S.A.',
    initials: 'GL',
    caseCode: 'ONB-2025-0398',
    status: 'in_progress',
    origin: 'adopt',
    createdAt: '8 may 2025',
    overdueLabel: null,
    nextAction: 'Cargar poderes del representante legal.',
    owner: 'Felipe Rojas',
    ownerEmail: 'felipe.rojas@greenhouse.cl',
    slaLabel: 'Vence el 21 may 2025, 17:00',
    slaProgress: 44,
    dealName: null,
    dealId: null,
    dealOwner: null,
    sourceMeta: 'Caso adoptado desde organización existente',
    steps: [
      { label: 'Identidad', description: 'Datos legales', status: 'warning', detail: 'Falta poder legal' },
      { label: 'Finanzas', description: 'Perfil financiero', status: 'completed', detail: 'Completo' },
      { label: 'Notion', description: 'Workspace', status: 'in_progress', detail: 'Conectado' },
      { label: 'Teams', description: 'Canal operativo', status: 'pending', detail: 'Pendiente' },
      { label: 'Usuarios', description: 'Invitaciones', status: 'pending', detail: 'Pendiente' },
      { label: 'Preflight', description: 'Validación final', status: 'pending', detail: 'Pendiente' }
    ]
  },
  {
    id: 'case-smarthealth',
    organization: 'SmartHealth SpA',
    initials: 'SH',
    caseCode: 'ONB-2025-0389',
    status: 'blocked',
    origin: 'manual',
    createdAt: '6 may 2025',
    overdueLabel: null,
    nextAction: 'Aclarar información tributaria.',
    owner: 'María Villalobos',
    ownerEmail: 'maria.villalobos@greenhouse.cl',
    slaLabel: 'Vence el 24 may 2025, 12:00',
    slaProgress: 52,
    dealName: null,
    dealId: null,
    dealOwner: null,
    sourceMeta: 'Alta manual creada por Operaciones',
    steps: [
      { label: 'Identidad', description: 'Datos legales', status: 'completed', detail: 'Completo' },
      { label: 'Finanzas', description: 'Validación tributaria', status: 'blocked', detail: 'Falta régimen fiscal' },
      { label: 'Notion', description: 'Workspace', status: 'pending', detail: 'Pendiente' },
      { label: 'Teams', description: 'Canal operativo', status: 'pending', detail: 'Pendiente' },
      { label: 'Usuarios', description: 'Invitaciones', status: 'pending', detail: 'Pendiente' },
      { label: 'Preflight', description: 'Validación final', status: 'pending', detail: 'Pendiente' }
    ]
  }
]

const filters: Array<{ value: 'all' | CaseStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: M.states.pending },
  { value: 'in_progress', label: M.states.inProgress },
  { value: 'blocked', label: M.states.blocked }
]

const getCompletedCount = (item: OnboardingCase) => item.steps.filter(step => step.status === 'completed').length

const OnboardingCasesInboxMockupView = () => {
  const theme = useTheme()
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? '')
  const [statusFilter, setStatusFilter] = useState<'all' | CaseStatus>('all')
  const [originFilter, setOriginFilter] = useState<'all' | CaseOrigin>('all')
  const [query, setQuery] = useState('')

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return cases.filter(item => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesOrigin = originFilter === 'all' || item.origin === originFilter

      const matchesQuery =
        normalized.length === 0 ||
        item.organization.toLowerCase().includes(normalized) ||
        item.caseCode.toLowerCase().includes(normalized) ||
        (item.dealName?.toLowerCase().includes(normalized) ?? false)

      return matchesStatus && matchesOrigin && matchesQuery
    })
  }, [originFilter, query, statusFilter])

  const selected = filteredCases.find(item => item.id === selectedId) ?? filteredCases[0] ?? cases[0]
  const openCases = cases.length
  const inProgress = cases.filter(item => item.status === 'in_progress').length
  const overdue = cases.filter(item => item.overdueLabel).length
  const slaPct = 86
  const completedSteps = getCompletedCount(selected)
  const selectedStatus = statusCopy[selected.status]

  return (
    <Box data-capture='onboarding-cases-mockup' sx={{ pb: 6 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'flex-start' }} gap={3} sx={{ mb: 5 }}>
        <Box>
          <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 1 }}>
            <Typography component={Link} href='/agency' variant='body2' sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}>
              Agencia
            </Typography>
            <Typography variant='body2' color='text.secondary'>/</Typography>
            <Typography variant='body2' color='text.secondary'>Clientes</Typography>
          </Stack>
          <Typography variant='h3' sx={{ fontWeight: 800, letterSpacing: 0 }}>
            Onboarding de clientes
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mt: 1, maxWidth: 720 }}>
            Encuentra casos creados por deals, revisa blockers y abre el timeline sin tipear URLs.
          </Typography>
        </Box>
        <Stack direction='row' spacing={2} alignItems='center'>
              <Button
                component={Link}
                href='/agency/clients/new'
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                sx={{
                  minWidth: 164,
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': { transform: 'translateY(-1px)', boxShadow: 4 }
                }}
              >
                Nuevo cliente
              </Button>
          <Button variant='outlined' startIcon={<i className='tabler-upload' />}>
            Exportar
          </Button>
        </Stack>
      </Stack>

      <Alert
        severity='info'
        icon={<i className='tabler-info-circle' />}
        sx={{ mb: 5, border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`, bgcolor: alpha(theme.palette.primary.main, 0.06) }}
      >
        Este cockpit no reemplaza el wizard: lo hace encontrable. El alta nueva sigue viviendo en <strong>/agency/clients/new</strong>.
      </Alert>

      <Card sx={{ mb: 5, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '1.05fr 1fr 1fr 1.45fr' }
          }}
        >
          <MetricTile icon='tabler-folder' label='Casos abiertos' value={String(openCases)} detail='2 nuevos esta semana' tone='primary' />
          <MetricTile icon='tabler-clock' label='En progreso' value={String(inProgress)} detail='37% del total' tone='info' />
          <MetricTile icon='tabler-alert-octagon' label='Vencidos (SLA)' value={String(overdue)} detail='Requieren atención hoy' tone='error' />
          <MetricTile icon='tabler-activity' label='Cumplimiento SLA (7d)' value={`${slaPct}%`} detail='6 pp vs semana pasada' tone='success' last />
        </Box>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '360px minmax(360px, 1fr) 280px', xl: '400px minmax(420px, 1fr) 310px' },
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          minHeight: 650
        }}
      >
        <Box sx={{ borderRight: { lg: `1px solid ${theme.palette.divider}` } }}>
          <Box sx={{ p: 4, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Stack spacing={3}>
              <CustomTextField
                fullWidth
                size='small'
                placeholder='Buscar cliente, código o deal'
                value={query}
                onChange={event => setQuery(event.target.value)}
                InputProps={{ startAdornment: <i className='tabler-search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <Stack direction='column' spacing={2}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Estado'
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as 'all' | CaseStatus)}
                >
                  {filters.map(option => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Origen'
                  value={originFilter}
                  onChange={event => setOriginFilter(event.target.value as 'all' | CaseOrigin)}
                >
                  <MenuItem value='all'>Todos</MenuItem>
                  <MenuItem value='hubspot_deal'>HubSpot</MenuItem>
                  <MenuItem value='manual'>Manual</MenuItem>
                  <MenuItem value='adopt'>Adopt</MenuItem>
                </CustomTextField>
              </Stack>
              <ButtonGroup variant='outlined' size='small' aria-label={T.onboardingCases.filtersAria}>
                {filters.map(option => (
                  <Button
                    key={option.value}
                    variant={statusFilter === option.value ? 'contained' : 'outlined'}
                    onClick={() => setStatusFilter(option.value)}
                    sx={{ textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
              <Typography variant='caption' color='text.secondary' role='status'>
                {filteredCases.length} caso{filteredCases.length === 1 ? '' : 's'} visibles · Seleccionado: {selected.organization}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ px: 4, py: 2, bgcolor: alpha(theme.palette.action.hover, 0.5), borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant='caption' color='text.secondary' fontWeight={700}>Inbox de casos</Typography>
          </Box>

          {filteredCases.length === 0 ? (
            <Box sx={{ p: 4 }}>
              <EmptyState
                icon='tabler-inbox'
                title='Sin casos para estos filtros'
                description='Cambia el estado, origen o búsqueda para volver a ver casos de onboarding.'
                minHeight={320}
              />
            </Box>
          ) : (
            <Box>
              {filteredCases.map(item => {
                const isSelected = selected.id === item.id
                const status = statusCopy[item.status]
                const origin = originCopy[item.origin]

                return (
                  <Box
                    key={item.id}
                    component='button'
                    type='button'
                    onClick={() => setSelectedId(item.id)}
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '42px minmax(0, 1fr) auto',
                      alignItems: 'start',
                      gap: 2,
                      px: 4,
                      py: 3,
                      textAlign: 'left',
                      border: 0,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${isSelected ? theme.palette.primary.main : 'transparent'}`,
                      transition: 'background-color 140ms ease, transform 140ms ease, border-color 140ms ease',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                      '&:active': { transform: 'scale(0.995)' },
                      '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 }
                    }}
                  >
                    <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main', fontWeight: 700 }}>
                      {item.initials}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={700} noWrap>{item.organization}</Typography>
                      <Typography variant='caption' color='text.secondary'>{item.caseCode}</Typography>
                      <Stack direction='row' spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                        <CustomChip round='true' size='small' variant='tonal' color={status.color} label={status.label} />
                        <CustomChip round='true' size='small' variant='tonal' color={origin.color} label={origin.label} />
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='caption' fontWeight={700}>{item.createdAt}</Typography>
                      {item.overdueLabel ? (
                        <Typography variant='caption' display='block' color='error.main' fontWeight={700}>{item.overdueLabel}</Typography>
                      ) : (
                        <Typography variant='caption' display='block' color='text.secondary'>Dentro de SLA</Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>

        <Box sx={{ p: { xs: 4, md: 5 }, borderRight: { lg: `1px solid ${theme.palette.divider}` } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3} sx={{ mb: 4 }}>
            <Box>
              <Stack direction='row' alignItems='center' spacing={1}>
                <Typography variant='h5' fontWeight={800}>{selected.organization}</Typography>
                <IconButton size='small' component={Link} href={`/agency/clients/${selected.id}/lifecycle`} aria-label={T.onboardingCases.openTimelineAria}>
                  <i className='tabler-external-link' />
                </IconButton>
              </Stack>
              <Typography variant='body2' color='text.secondary'>{selected.caseCode} · Creado el {selected.createdAt}, 10:14</Typography>
            </Box>
            <CustomChip round='true' variant='tonal' color={selectedStatus.color} label={selectedStatus.label} />
          </Stack>

          <Box
            sx={{
              mb: 4,
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette[selectedStatus.color].main, 0.08),
              border: `1px solid ${alpha(theme.palette[selectedStatus.color].main, 0.18)}`
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' gap={2}>
              <Box>
                <Typography variant='subtitle2' fontWeight={800}>
                  {completedSteps} de {selected.steps.length} etapas listas
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  La siguiente decisión está en {selected.nextAction.toLowerCase()}
                </Typography>
              </Box>
              <Box sx={{ minWidth: { sm: 180 } }}>
                <LinearProgress variant='determinate' value={(completedSteps / selected.steps.length) * 100} sx={{ height: 7, borderRadius: 99, mt: 1 }} />
              </Box>
            </Stack>
          </Box>

          <Stack spacing={0}>
            {selected.steps.map((step, index) => {
              const meta = stepCopy[step.status]
              const isLast = index === selected.steps.length - 1

              return (
                <Box key={step.label} sx={{ display: 'grid', gridTemplateColumns: '42px 1fr', columnGap: 3 }}>
                  <Stack alignItems='center'>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        color: `${meta.color}.main`,
                        bgcolor: alpha(theme.palette[meta.color].main, 0.12),
                        border: `1px solid ${alpha(theme.palette[meta.color].main, 0.36)}`
                      }}
                    >
                      <i className={meta.icon} style={{ fontSize: 16 }} />
                    </Box>
                    {!isLast ? <Box sx={{ width: 2, flex: 1, minHeight: 58, bgcolor: alpha(theme.palette.text.secondary, 0.18), mt: 1 }} /> : null}
                  </Stack>
                  <Box sx={{ pb: isLast ? 0 : 4 }}>
                    <Stack direction='row' justifyContent='space-between' gap={3} alignItems='flex-start'>
                      <Box>
                        <Typography variant='h6' sx={{ fontSize: '1rem' }}>{step.label}</Typography>
                        <Typography variant='body2' color='text.secondary'>{step.description}</Typography>
                      </Box>
                      <Stack alignItems='flex-end' spacing={0.75}>
                        <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={meta.label} />
                        <Typography variant='caption' color={step.status === 'warning' || step.status === 'blocked' ? `${meta.color}.main` : 'text.secondary'}>
                          {step.detail}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                </Box>
              )
            })}
          </Stack>

          <Divider sx={{ my: 4 }} />
          <Stack direction='row' alignItems='center' spacing={2} color='text.secondary'>
            <i className='tabler-refresh' />
            <Typography variant='body2'>Actualizado hace 6 min por {selected.owner}</Typography>
          </Stack>
        </Box>

        <Box sx={{ p: 4, bgcolor: alpha(theme.palette.action.hover, 0.2) }}>
          <Stack spacing={4}>
            <ActionSection title='Siguiente acción' icon='tabler-flag'>
              <Typography variant='body2' color='text.secondary'>{selected.nextAction}</Typography>
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  href={`/agency/clients/${selected.id}/lifecycle`}
                  variant='contained'
                  endIcon={<i className='tabler-arrow-right' />}
                  sx={{ transition: 'transform 160ms ease, box-shadow 160ms ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: 3 } }}
                >
                  Abrir timeline
                </Button>
                <Button component={Link} href={`/agency/clients/${selected.id}/lifecycle`} variant='outlined' startIcon={<i className='tabler-bolt' />}>
                  Activar caso
                </Button>
              </Stack>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1.5 }}>
                La activación ocurre en el timeline del caso.
              </Typography>
            </ActionSection>

            <ActionSection title='Owner' icon='tabler-user-circle'>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar sx={{ width: 34, height: 34 }}>{selected.owner.split(' ').map(part => part[0]).join('').slice(0, 2)}</Avatar>
                <Box>
                  <Typography variant='body2' fontWeight={700}>{selected.owner}</Typography>
                  <Typography variant='caption' color='text.secondary'>{selected.ownerEmail}</Typography>
                </Box>
              </Stack>
            </ActionSection>

            <ActionSection title='SLA del caso' icon='tabler-clock'>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>{selected.slaLabel}</Typography>
              <LinearProgress
                variant='determinate'
                value={selected.slaProgress}
                color={selected.overdueLabel ? 'error' : 'success'}
                sx={{ height: 7, borderRadius: 99 }}
              />
              {selected.overdueLabel ? (
                <Typography variant='caption' color='error.main' fontWeight={700} sx={{ display: 'block', mt: 1 }}>
                  {selected.overdueLabel}
                </Typography>
              ) : null}
            </ActionSection>

            <ActionSection title='Fuente' icon='tabler-database'>
              <Stack spacing={1.5}>
                <InfoRow label='Origen' value={selected.sourceMeta} />
                {selected.dealName ? <InfoRow label='Deal' value={selected.dealName} /> : null}
                {selected.dealId ? <InfoRow label='Deal ID' value={selected.dealId} /> : null}
                {selected.dealOwner ? <InfoRow label='Owner deal' value={selected.dealOwner} /> : null}
                <Button size='small' variant='text' endIcon={<i className='tabler-external-link' />} sx={{ alignSelf: 'flex-start', px: 0 }}>
                  Ver en HubSpot
                </Button>
              </Stack>
            </ActionSection>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}

type MetricTileProps = {
  icon: string
  label: string
  value: string
  detail: string
  tone: 'primary' | 'info' | 'error' | 'success'
  last?: boolean
}

const MetricTile = ({ icon, label, value, detail, tone, last = false }: MetricTileProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        p: 4,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 3,
        borderRight: { lg: last ? 0 : `1px solid ${theme.palette.divider}` },
        borderBottom: { xs: last ? 0 : `1px solid ${theme.palette.divider}`, lg: 0 }
      }}
    >
      <Box>
        <Typography variant='body2' color='text.secondary'>{label}</Typography>
        <Typography variant='h4' sx={{ fontWeight: 800, color: `${tone}.main`, lineHeight: 1.1, mt: 0.5 }}>{value}</Typography>
        <Typography variant='caption' color='text.secondary'>{detail}</Typography>
      </Box>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: alpha(theme.palette[tone].main, 0.12),
          color: `${tone}.main`,
          display: 'grid',
          placeItems: 'center'
        }}
      >
        <i className={icon} style={{ fontSize: 24 }} />
      </Box>
    </Box>
  )
}

const ActionSection = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <Box>
    <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 2 }}>
      <i className={icon} />
      <Typography variant='subtitle2' fontWeight={800}>{title}</Typography>
    </Stack>
    {children}
  </Box>
)

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant='caption' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' fontWeight={600}>{value}</Typography>
  </Box>
)

export default OnboardingCasesInboxMockupView
