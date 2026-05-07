'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import EmptyState from '@/components/greenhouse/EmptyState'
import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { CardHeaderWithBadge } from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { getMicrocopy } from '@/lib/copy'
import { formatCurrency as formatGreenhouseCurrency, formatDate as formatGreenhouseDate } from '@/lib/format'

export type SprintStatus = 'pending_approval' | 'active' | 'reporting' | 'converted' | 'cancelled' | 'dropped'
export type SprintKind = 'pilot' | 'trial' | 'poc' | 'discovery'
export type HealthSeverity = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'

export type TeamMember = {
  name: string
  role: string
  initials: string
  allocation: number
  availability: number
}

export type Sprint = {
  id: string
  client: string
  name: string
  kind: SprintKind
  subtype: string
  status: SprintStatus
  owner: string
  startDate: string
  decisionDate: string
  budgetClp: number
  actualClp: number
  conversionProbability: number
  progressPct: number
  lastSnapshotDays: number
  phase: 'Kickoff' | 'Operación' | 'Reporte' | 'Decisión'
  outcome?: string
  signal: HealthSeverity
  team: TeamMember[]
}

export type Signal = {
  code: string
  label: string
  severity: HealthSeverity
  count: number
  runbook: string
  description: string
}

export type RuntimeSampleSprintOptions = {
  spaces: Array<{
    spaceId: string
    spaceName: string
    clientName: string | null
    organizationId: string | null
    organizationName: string | null
  }>
  members: Array<{
    memberId: string
    displayName: string
    roleTitle: string | null
  }>
  conversionTargets: Array<{
    serviceId: string
    publicId: string | null
    name: string
    spaceName: string | null
  }>
  quotations: Array<{
    quotationId: string
    quotationNumber: string
    clientName: string | null
    status: string
    totalAmountClp: number | null
  }>
}

type RuntimeSampleSprintDetail = {
  serviceId: string
  publicId: string | null
  name: string
  spaceId: string
  proposedTeam: Array<{ memberId: string; proposedFte: number; role?: string | null }>
}

const sprintKinds: Record<SprintKind, { label: string; icon: string; color: HealthSeverity }> = {
  pilot: { label: 'Operations Sprint', icon: 'tabler-rocket', color: 'primary' },
  trial: { label: 'Extension Sprint', icon: 'tabler-arrows-split', color: 'info' },
  poc: { label: 'Validation Sprint', icon: 'tabler-circle-check', color: 'success' },
  discovery: { label: 'Discovery Sprint', icon: 'tabler-compass', color: 'secondary' }
}

const copy = getMicrocopy()

const statusMeta: Record<SprintStatus, { label: string; color: HealthSeverity; icon: string }> = {
  pending_approval: { label: `${copy.states.pending} aprobación`, color: 'warning', icon: 'tabler-clock-exclamation' },
  active: { label: copy.states.active, color: 'success', icon: 'tabler-player-play' },
  reporting: { label: 'En reporte', color: 'info', icon: 'tabler-file-analytics' },
  converted: { label: 'Convertido', color: 'primary', icon: 'tabler-arrow-up-right' },
  cancelled: { label: copy.states.cancelled, color: 'error', icon: 'tabler-circle-x' },
  dropped: { label: 'Descartado', color: 'secondary', icon: 'tabler-archive' }
}

const domainAria = {
  conversionRate: 'Conversion rate trailing seis meses',
  sampleSprintsTabs: 'Superficies mockup de Sample Sprints',
  budgetUsed: 'Budget usado',
  costAgainstBudget: 'Costo acumulado contra presupuesto',
  capacityByMember: 'Capacity warning por miembro',
  commercialHealthRatio: 'Commercial health steady ratio',
  memberAllocation: 'Asignación del miembro'
}

const teamPool: TeamMember[] = [
  { name: 'Valentina Hoyos', role: 'Content Lead', initials: 'VH', allocation: 0.45, availability: 0.05 },
  { name: 'Melkin Hernández', role: 'Automation Ops', initials: 'MH', allocation: 0.35, availability: 0.25 },
  { name: 'Daniela Ferreira', role: 'Delivery Manager', initials: 'DF', allocation: 0.25, availability: 0.4 },
  { name: 'Andrés Carlosama', role: 'CRM Architect', initials: 'AC', allocation: 0.3, availability: 0.2 }
]

const mockSprints: Sprint[] = [
  {
    id: 'SS-1042',
    client: 'Sky Airline',
    name: 'Content Lead Sprint',
    kind: 'pilot',
    subtype: 'Operations Sprint',
    status: 'active',
    owner: 'Valentina Hoyos',
    startDate: '2026-05-04',
    decisionDate: '2026-05-29',
    budgetClp: 6400000,
    actualClp: 3750000,
    conversionProbability: 74,
    progressPct: 62,
    lastSnapshotDays: 4,
    phase: 'Operación',
    signal: 'warning',
    team: teamPool.slice(0, 3)
  },
  {
    id: 'SS-1038',
    client: 'Aguas Andinas',
    name: 'HubSpot Service Recovery',
    kind: 'discovery',
    subtype: 'Discovery Sprint',
    status: 'reporting',
    owner: 'Daniela Ferreira',
    startDate: '2026-04-20',
    decisionDate: '2026-05-17',
    budgetClp: 4200000,
    actualClp: 4100000,
    conversionProbability: 58,
    progressPct: 88,
    lastSnapshotDays: 11,
    phase: 'Reporte',
    signal: 'error',
    team: [teamPool[2], teamPool[3]]
  },
  {
    id: 'SS-1031',
    client: 'Nexa',
    name: 'Automation Proof of Concept',
    kind: 'poc',
    subtype: 'Validation Sprint',
    status: 'converted',
    owner: 'Melkin Hernández',
    startDate: '2026-03-24',
    decisionDate: '2026-04-19',
    budgetClp: 5200000,
    actualClp: 4650000,
    conversionProbability: 92,
    progressPct: 100,
    lastSnapshotDays: 2,
    phase: 'Decisión',
    outcome: 'converted',
    signal: 'success',
    team: [teamPool[1], teamPool[3]]
  },
  {
    id: 'SS-1027',
    client: 'Loyal',
    name: 'Commercial Fit Sprint',
    kind: 'trial',
    subtype: 'Extension Sprint',
    status: 'pending_approval',
    owner: 'Andrés Carlosama',
    startDate: '2026-05-13',
    decisionDate: '2026-06-07',
    budgetClp: 3100000,
    actualClp: 0,
    conversionProbability: 41,
    progressPct: 0,
    lastSnapshotDays: 0,
    phase: 'Kickoff',
    signal: 'info',
    team: [teamPool[0], teamPool[3]]
  }
]

const reliabilitySignals: Signal[] = [
  {
    code: 'commercial.engagement.overdue_decision',
    label: 'Decisiones vencidas',
    severity: 'error',
    count: 1,
    runbook: 'Cerrar outcome o ajustar deadline con aprobación',
    description: 'Engagements en reporting cerrados hace más de 14 días sin outcome.'
  },
  {
    code: 'commercial.engagement.budget_overrun',
    label: 'Budget overrun',
    severity: 'warning',
    count: 1,
    runbook: 'Revisar costo real vs presupuesto aprobado',
    description: 'Costo real sobre 120% del costo interno esperado.'
  },
  {
    code: 'commercial.engagement.zombie',
    label: 'Zombies',
    severity: 'error',
    count: 0,
    runbook: 'Registrar outcome antes de extender operación',
    description: 'Sample Sprints activos por más de 90 días sin transición.'
  },
  {
    code: 'commercial.engagement.unapproved_active',
    label: 'Activos sin approval',
    severity: 'error',
    count: 0,
    runbook: 'Volver a pending_approval o registrar aprobación retroactiva',
    description: 'Servicios no regulares activos sin approval aprobada.'
  },
  {
    code: 'commercial.engagement.conversion_rate_drop',
    label: 'Conversión bajo umbral',
    severity: 'warning',
    count: 1,
    runbook: 'Revisar outcomes trailing 6m y criterios de success',
    description: 'Conversion rate trailing bajo el threshold configurado.'
  },
  {
    code: 'commercial.engagement.stale_progress',
    label: 'Progreso stale',
    severity: 'warning',
    count: 1,
    runbook: 'Registrar snapshot semanal con contexto operacional',
    description: 'Engagement activo sin snapshot hace más de 10 días.'
  }
]

const phaseSteps = ['Kickoff', 'Operación', 'Reporte', 'Decisión']

const formatCurrency = (value: number) => {
  return formatGreenhouseCurrency(value, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')
}

const formatDate = (value: string) => {
  return formatGreenhouseDate(value, { day: '2-digit', month: 'short' }, 'es-CL')
}

const parseRecord = (value: string, fallback: Record<string, unknown>) => {
  try {
    const parsed = JSON.parse(value)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : fallback
  } catch {
    return fallback
  }
}

const buildCriteria = (value: string) => ({
  summary: value.trim(),
  checklist: value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
})

const getDaysToDecision = (date: string) => {
  const now = new Date('2026-05-07T00:00:00')
  const target = new Date(`${date}T00:00:00`)

  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

type SampleSprintsExperienceVariant = 'mockup' | 'runtime'

type SampleSprintsMockupViewProps = {
  sprints?: Sprint[]
  signals?: Signal[]
  variant?: SampleSprintsExperienceVariant
  initialSelectedSprintId?: string
  runtimeOptions?: RuntimeSampleSprintOptions | null
}

const SampleSprintsMockupView = ({
  sprints = mockSprints,
  signals = reliabilitySignals,
  variant = 'mockup',
  initialSelectedSprintId,
  runtimeOptions = null
}: SampleSprintsMockupViewProps = {}) => {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const [activeSurface, setActiveSurface] = useState('command')
  const [selectedSprintId, setSelectedSprintId] = useState(initialSelectedSprintId ?? sprints[0]?.id ?? '')
  const [kindFilter, setKindFilter] = useState<'all' | SprintKind>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | SprintStatus>('all')
  const [approvalOverride, setApprovalOverride] = useState('')
  const [snapshotNotes, setSnapshotNotes] = useState('Semana con avance fuerte en playbook de operación. Falta cerrar evidencia de ahorro de tiempo.')
  const selectedSprint = sprints.find(sprint => sprint.id === selectedSprintId) ?? sprints[0] ?? null

  const filteredSprints = useMemo(() => {
    return sprints.filter(sprint => {
      const matchesKind = kindFilter === 'all' || sprint.kind === kindFilter
      const matchesStatus = statusFilter === 'all' || sprint.status === statusFilter

      return matchesKind && matchesStatus
    })
  }, [kindFilter, sprints, statusFilter])

  const groupedByClient = useMemo(() => {
    return filteredSprints.reduce<Record<string, Sprint[]>>((acc, sprint) => {
      acc[sprint.client] = acc[sprint.client] ?? []
      acc[sprint.client].push(sprint)

      return acc
    }, {})
  }, [filteredSprints])

  const activeCount = sprints.filter(sprint => sprint.status === 'active' || sprint.status === 'reporting').length
  const closedCount = sprints.filter(sprint => ['converted', 'cancelled', 'dropped'].includes(sprint.status)).length
  const convertedCount = sprints.filter(sprint => sprint.status === 'converted').length
  const conversionRate = variant === 'mockup' ? 64 : closedCount > 0 ? Math.round((convertedCount / closedCount) * 100) : 0
  const gtmInvestment = sprints.reduce((sum, sprint) => sum + (variant === 'mockup' ? sprint.actualClp : sprint.budgetClp), 0)
  const warningCount = signals.filter(signal => signal.count > 0).length
  const heroSecondaryChip = variant === 'mockup' ? 'Sin backend conectado' : 'Backend conectado'
  const heroPrimaryChip = variant === 'mockup' ? 'Mockup navegable' : 'Experiencia aprobada'
  const investmentLabel = variant === 'mockup' ? 'GTM investment' : 'Budget esperado'

  return (
    <Stack spacing={6}>
      <Card
        sx={{
          overflow: 'hidden',
          border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
          background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 42%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`
        }}
      >
        <CardContent sx={{ p: { xs: 5, md: 8 } }}>
          <Grid container spacing={6} alignItems='center'>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={3}>
                <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <CustomChip round='true' size='small' color='primary' variant='tonal' icon={<i className='tabler-sparkles' />} label={heroPrimaryChip} />
                  <CustomChip round='true' size='small' color='secondary' variant='tonal' icon={<i className={variant === 'mockup' ? 'tabler-database-off' : 'tabler-database'} />} label={heroSecondaryChip} />
                </Stack>
                <Box>
                  <Typography variant='h4' sx={{ mb: 1 }}>
                    Sample Sprints command center
                  </Typography>
                  <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 760 }}>
                    Prototipo 2026 para declarar, gobernar, operar y cerrar Sample Sprints con trazabilidad de outcome,
                    capacidad y señales de salud comercial.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {variant === 'runtime' ? (
                    <Button component={Link} href='/agency/sample-sprints/new' variant='contained' startIcon={<i className='tabler-plus' />}>
                      Declarar Sprint
                    </Button>
                  ) : (
                    <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setActiveSurface('declare')}>
                      Declarar Sprint
                    </Button>
                  )}
                  <Button variant='tonal' color='secondary' startIcon={<i className='tabler-shield-check' />} onClick={() => setActiveSurface('approval')}>
                    Revisar approval
                  </Button>
                  <Button variant='text' startIcon={<i className='tabler-activity-heartbeat' />} onClick={() => setActiveSurface('health')}>
                    Ver Commercial Health
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: theme => theme.shape.customBorderRadius.lg,
                  bgcolor: alpha(theme.palette.background.paper, 0.72),
                  border: theme => `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                  backdropFilter: 'blur(12px)'
                }}
              >
                <Stack spacing={3}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='overline' color='text.secondary'>
                      Lectura ejecutiva
                    </Typography>
                    <CustomChip round='true' size='small' color='warning' variant='tonal' label={`${warningCount} señales`} />
                  </Stack>
                  <Stack direction='row' spacing={4} flexWrap='wrap' useFlexGap>
                    <HeroMetric label='Activos' value={String(activeCount)} icon='tabler-player-play' />
                    <HeroMetric label='Conversión 6m' value={`${conversionRate}%`} icon='tabler-trending-up' />
                    <HeroMetric label={investmentLabel} value={formatCurrency(gtmInvestment)} icon='tabler-cash-banknote' compact />
                  </Stack>
                    <LinearProgress
                    variant='determinate'
                    value={conversionRate}
                    aria-label={domainAria.conversionRate}
                    sx={{ height: 8, borderRadius: 9999 }}
                  />
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TabContext value={activeSurface}>
        <Card>
          <CardContent sx={{ pb: 0 }}>
            <CustomTabList
              onChange={(_, value) => setActiveSurface(value)}
              variant='scrollable'
              scrollButtons='auto'
              aria-label={domainAria.sampleSprintsTabs}
            >
              <Tab value='command' label='Command center' icon={<i className='tabler-layout-dashboard' />} iconPosition='start' />
              <Tab value='detail' label='Detalle' icon={<i className='tabler-timeline' />} iconPosition='start' />
              <Tab value='declare' label='Declaración' icon={<i className='tabler-forms' />} iconPosition='start' />
              <Tab value='approval' label='Approval' icon={<i className='tabler-shield-check' />} iconPosition='start' />
              <Tab value='progress' label='Progreso' icon={<i className='tabler-notes' />} iconPosition='start' />
              <Tab value='outcome' label='Outcome' icon={<i className='tabler-flag-check' />} iconPosition='start' />
              <Tab value='health' label='Commercial Health' icon={<i className='tabler-activity-heartbeat' />} iconPosition='start' />
            </CustomTabList>
          </CardContent>
        </Card>

        <TabPanel value='command' sx={{ p: 0, pt: 6 }}>
          <CommandCenter
            selectedSprintId={selectedSprintId}
            setSelectedSprintId={setSelectedSprintId}
            setActiveSurface={setActiveSurface}
            groupedByClient={groupedByClient}
            kindFilter={kindFilter}
            setKindFilter={setKindFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            variant={variant}
            metrics={{
              total: sprints.length,
              conversionRate,
              investment: gtmInvestment,
              warningCount
            }}
          />
        </TabPanel>

        <TabPanel value='detail' sx={{ p: 0, pt: 6 }}>
          {selectedSprint ? <DetailSurface sprint={selectedSprint} reducedMotion={reducedMotion} variant={variant} /> : <NoSprintSelected variant={variant} />}
        </TabPanel>

        <TabPanel value='declare' sx={{ p: 0, pt: 6 }}>
          {variant === 'runtime' ? <RuntimeDeclareWizard options={runtimeOptions} /> : <DeclareWizard />}
        </TabPanel>

        <TabPanel value='approval' sx={{ p: 0, pt: 6 }}>
          {selectedSprint ? (
            variant === 'runtime' ? (
              <RuntimeApprovalWizard sprint={selectedSprint} />
            ) : (
              <ApprovalWizard sprint={selectedSprint} approvalOverride={approvalOverride} setApprovalOverride={setApprovalOverride} />
            )
          ) : <NoSprintSelected variant={variant} />}
        </TabPanel>

        <TabPanel value='progress' sx={{ p: 0, pt: 6 }}>
          {selectedSprint ? (
            variant === 'runtime' ? (
              <RuntimeProgressWizard sprint={selectedSprint} />
            ) : (
              <ProgressWizard sprint={selectedSprint} snapshotNotes={snapshotNotes} setSnapshotNotes={setSnapshotNotes} />
            )
          ) : <NoSprintSelected variant={variant} />}
        </TabPanel>

        <TabPanel value='outcome' sx={{ p: 0, pt: 6 }}>
          {selectedSprint ? (variant === 'runtime' ? <RuntimeOutcomeWizard sprint={selectedSprint} options={runtimeOptions} /> : <OutcomeWizard sprint={selectedSprint} />) : <NoSprintSelected variant={variant} />}
        </TabPanel>

        <TabPanel value='health' sx={{ p: 0, pt: 6 }}>
          <CommercialHealthSurface signals={signals} variant={variant} />
        </TabPanel>
      </TabContext>
    </Stack>
  )
}

const HeroMetric = ({ label, value, icon, compact = false }: { label: string; value: string; icon: string; compact?: boolean }) => (
  <Stack spacing={1} sx={{ minWidth: compact ? 160 : 96 }}>
    <Stack direction='row' spacing={1} alignItems='center'>
      <i className={icon} style={{ fontSize: 18 }} aria-hidden='true' />
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
    </Stack>
    <Typography variant={compact ? 'h6' : 'h4'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
  </Stack>
)

const CommandCenter = ({
  groupedByClient,
  selectedSprintId,
  setSelectedSprintId,
  setActiveSurface,
  kindFilter,
  setKindFilter,
  statusFilter,
  setStatusFilter,
  variant,
  metrics
}: {
  groupedByClient: Record<string, Sprint[]>
  selectedSprintId: string
  setSelectedSprintId: (id: string) => void
  setActiveSurface: (surface: string) => void
  kindFilter: 'all' | SprintKind
  setKindFilter: (kind: 'all' | SprintKind) => void
  statusFilter: 'all' | SprintStatus
  setStatusFilter: (status: 'all' | SprintStatus) => void
  variant: SampleSprintsExperienceVariant
  metrics: {
    total: number
    conversionRate: number
    investment: number
    warningCount: number
  }
}) => {
  const allSprints = Object.values(groupedByClient).flat()

  const nextDecisionSprints = [...allSprints]
    .filter(sprint => sprint.decisionDate)
    .sort((a, b) => getDaysToDecision(a.decisionDate) - getDaysToDecision(b.decisionDate))
    .slice(0, 3)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 6, xl: 3 }}>
        <HorizontalWithSubtitle
          title='Sample Sprints'
          stats={String(metrics.total)}
          avatarIcon='tabler-rocket'
          avatarColor='primary'
          subtitle={variant === 'mockup' ? 'Activos e históricos del piloto' : 'Engagements reales del runtime'}
          trend='positive'
          trendNumber={metrics.total > 0 ? `${metrics.total} total` : 'Sin registros'}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 3 }}>
        <HorizontalWithSubtitle
          title='Conversion rate'
          stats={`${metrics.conversionRate}%`}
          avatarIcon='tabler-chart-arcs'
          avatarColor='success'
          subtitle='Trailing 6 meses'
          statusLabel={metrics.conversionRate > 0 ? 'Con muestra' : 'Sin muestra'}
          statusColor={metrics.conversionRate > 0 ? 'success' : 'secondary'}
          statusIcon={metrics.conversionRate > 0 ? 'tabler-circle-check' : 'tabler-chart-bar-off'}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 3 }}>
        <HorizontalWithSubtitle
          title={variant === 'mockup' ? 'GTM investment' : 'Budget esperado'}
          stats={formatCurrency(metrics.investment)}
          avatarIcon='tabler-cash'
          avatarColor='warning'
          subtitle={variant === 'mockup' ? 'Reclasificado fuera del cliente' : 'Costo interno esperado'}
          titleTooltip={variant === 'mockup' ? 'Mock de TASK-806 gtm_investment_pnl' : 'Suma de expected_internal_cost_clp desde los services reales'}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6, xl: 3 }}>
        <HorizontalWithSubtitle
          title='Riesgos abiertos'
          stats={String(metrics.warningCount)}
          avatarIcon='tabler-alert-triangle'
          avatarColor='error'
          subtitle='Signals no steady'
          statusLabel={metrics.warningCount > 0 ? 'Revisar hoy' : 'Steady'}
          statusColor={metrics.warningCount > 0 ? 'warning' : 'success'}
          statusIcon={metrics.warningCount > 0 ? 'tabler-bell-ringing' : 'tabler-circle-check'}
        />
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardHeaderWithBadge
            title='Sprints por cliente'
            badgeValue={Object.values(groupedByClient).flat().length}
            subheader='Agrupación operacional para detectar pilotos simultáneos y outcomes pendientes.'
            avatarIcon='tabler-building-community'
            action={
              <Button component={variant === 'runtime' ? Link : 'button'} href={variant === 'runtime' ? '/agency/sample-sprints/new' : undefined} size='small' variant='contained' startIcon={<i className='tabler-plus' />}>
                Nuevo Sprint
              </Button>
            }
          />
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 5 }}>
              <CustomTextField
                select
                label='Tipo'
                value={kindFilter}
                onChange={event => setKindFilter(event.target.value as 'all' | SprintKind)}
                sx={{ minWidth: { xs: '100%', sm: 220 } }}
              >
                <MenuItem value='all'>Todos los tipos</MenuItem>
                {Object.entries(sprintKinds).map(([kind, meta]) => (
                  <MenuItem key={kind} value={kind}>
                    {meta.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label='Estado'
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as 'all' | SprintStatus)}
                sx={{ minWidth: { xs: '100%', sm: 220 } }}
              >
                <MenuItem value='all'>Todos los estados</MenuItem>
                {Object.entries(statusMeta).map(([status, meta]) => (
                  <MenuItem key={status} value={status}>
                    {meta.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Stack>

            <Stack spacing={4}>
              {Object.keys(groupedByClient).length === 0 ? (
                <EmptyState
                  icon='tabler-rocket-off'
                  title='No hay Sample Sprints con estos filtros'
                  description='Cambia el tipo o estado, o declara un nuevo Sprint para iniciar el flujo aprobado.'
                  action={
                    <Button component={variant === 'runtime' ? Link : 'button'} href={variant === 'runtime' ? '/agency/sample-sprints/new' : undefined} size='small' variant='contained' startIcon={<i className='tabler-plus' />}>
                      Declarar Sprint
                    </Button>
                  }
                  minHeight={260}
                />
              ) : Object.entries(groupedByClient).map(([client, sprints]) => (
                <Box key={client}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
                    <Typography variant='subtitle1'>{client}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {sprints.length} Sprint{sprints.length > 1 ? 's' : ''}
                    </Typography>
                  </Stack>
                  <Stack spacing={2}>
                    {sprints.map(sprint => (
                      <SprintRow
                        key={sprint.id}
                        sprint={sprint}
                        selected={selectedSprintId === sprint.id}
                        onSelect={() => {
                          setSelectedSprintId(sprint.id)
                          setActiveSurface('detail')
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6}>
          <Card>
            <CardHeader
              title='Decisiones próximas'
              subheader='Ordenadas por impacto y fecha.'
              avatar={
                <CustomAvatar skin='light' color='warning' variant='rounded'>
                  <i className='tabler-calendar-exclamation' />
                </CustomAvatar>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={3}>
                {nextDecisionSprints.length === 0 ? (
                  <EmptyState
                    icon='tabler-calendar-off'
                    title='Sin decisiones próximas'
                    description='Cuando existan deadlines, aparecerán ordenados por fecha e impacto.'
                    minHeight={220}
                  />
                ) : nextDecisionSprints.map(sprint => (
                  <Stack key={sprint.id} direction='row' spacing={3} alignItems='center'>
                    <SignalDot severity={sprint.signal} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
                        {sprint.client}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {getDaysToDecision(sprint.decisionDate)} días para decidir
                      </Typography>
                    </Box>
                    <CustomChip round='true' size='small' color={statusMeta[sprint.status].color} variant='tonal' label={statusMeta[sprint.status].label} />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title='Estado vacío diseñado'
              subheader={variant === 'mockup' ? 'Ejemplo para filtros sin resultados.' : 'Estado operacional cuando no hay coincidencias.'}
              avatar={
                <CustomAvatar skin='light' color='secondary' variant='rounded'>
                  <i className='tabler-filter-off' />
                </CustomAvatar>
              }
            />
            <CardContent>
              <EmptyState
                icon='tabler-search-off'
                title='No hay Sprints con estos filtros'
                description='Cambia el tipo o estado para volver a ver engagements operativos.'
                action={<Button size='small' variant='tonal' onClick={() => {
                  setKindFilter('all')
                  setStatusFilter('all')
                }}>Limpiar filtros</Button>}
                minHeight={220}
              />
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

const SprintRow = ({ sprint, selected, onSelect }: { sprint: Sprint; selected: boolean; onSelect: () => void }) => {
  const kind = sprintKinds[sprint.kind]
  const status = statusMeta[sprint.status]
  const budgetPct = sprint.budgetClp > 0 ? Math.min(100, Math.round((sprint.actualClp / sprint.budgetClp) * 100)) : sprint.progressPct

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      sx={{
        width: '100%',
        border: theme => `1px solid ${selected ? alpha(theme.palette.primary.main, 0.5) : theme.palette.divider}`,
        bgcolor: selected ? 'primary.lightOpacity' : 'background.paper',
        borderRadius: theme => theme.shape.customBorderRadius.lg,
        p: 3,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color 150ms cubic-bezier(0.2, 0, 0, 1), background-color 150ms cubic-bezier(0.2, 0, 0, 1)',
        '&:focus-visible': {
          outline: theme => `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        },
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover'
        }
      }}
    >
      <Grid container spacing={3} alignItems='center'>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack direction='row' spacing={3} alignItems='center'>
            <CustomAvatar skin='light' color={kind.color} variant='rounded'>
              <i className={kind.icon} />
            </CustomAvatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='body2' sx={{ fontWeight: 700 }} noWrap>
                {sprint.name}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {sprint.id} · {kind.label}
              </Typography>
            </Box>
          </Stack>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <CustomChip round='true' size='small' color={status.color} variant='tonal' icon={<i className={status.icon} />} label={status.label} />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Typography variant='caption' color='text.secondary'>
            Decisión
          </Typography>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {formatDate(sprint.decisionDate)}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Typography variant='caption' color='text.secondary'>
            Budget usado
          </Typography>
          <LinearProgress variant='determinate' value={budgetPct} sx={{ mt: 1, height: 6, borderRadius: 9999 }} aria-label={`${domainAria.budgetUsed} ${budgetPct}%`} />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <AvatarGroup max={4} sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            {sprint.team.map(member => (
              <Tooltip key={member.name} title={`${member.name} · ${member.role}`}>
                <CustomAvatar skin='light' color='primary' sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                  {member.initials}
                </CustomAvatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Grid>
      </Grid>
    </Box>
  )
}

const DetailSurface = ({ sprint, reducedMotion, variant }: { sprint: Sprint; reducedMotion: boolean; variant: SampleSprintsExperienceVariant }) => {
  const activeStep = phaseSteps.indexOf(sprint.phase)
  const costProgress = sprint.budgetClp > 0 ? Math.min(100, (sprint.actualClp / sprint.budgetClp) * 100) : sprint.progressPct

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardHeader
            title={sprint.name}
            subheader={`${sprint.client} · ${sprint.id}`}
            avatar={
              <CustomAvatar skin='light' color={sprintKinds[sprint.kind].color} variant='rounded'>
                <i className={sprintKinds[sprint.kind].icon} />
              </CustomAvatar>
            }
            action={<CustomChip round='true' color={statusMeta[sprint.status].color} variant='tonal' label={statusMeta[sprint.status].label} />}
          />
          <Divider />
          <CardContent>
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <DecisionTile label='Fase actual' value={sprint.phase} icon='tabler-timeline-event' />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <DecisionTile label='Días a decisión' value={`${getDaysToDecision(sprint.decisionDate)} días`} icon='tabler-calendar-due' />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <DecisionTile label='Probabilidad' value={`${sprint.conversionProbability}%`} icon='tabler-trending-up' />
              </Grid>
            </Grid>

            <Box sx={{ mt: 6 }}>
              <Stepper activeStep={activeStep} alternativeLabel={!reducedMotion}>
                {phaseSteps.map(step => (
                  <Step key={step}>
                    <StepLabel>{step}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Grid container spacing={5} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant='outlined' sx={{ boxShadow: 0 }}>
                  <CardHeaderWithBadge title='Equipo asignado' badgeValue={sprint.team.length} avatarIcon='tabler-users-group' />
                  <CardContent>
                    <Stack spacing={3}>
                      {sprint.team.map(member => (
                        <MemberLoadRow key={member.name} member={member} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant='outlined' sx={{ boxShadow: 0 }}>
                  <CardHeader title='Costo acumulado' subheader='Lectura mock de GTM investment' />
                  <CardContent>
                    <Stack spacing={3}>
                      <Typography variant='h4' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(variant === 'mockup' ? sprint.actualClp : sprint.budgetClp)}
                      </Typography>
                      <LinearProgress
                        value={costProgress}
                        variant='determinate'
                        sx={{ height: 8, borderRadius: 9999 }}
                        aria-label={domainAria.costAgainstBudget}
                      />
                      <Typography variant='body2' color='text.secondary'>
                        {variant === 'mockup'
                          ? `Presupuesto aprobado: ${formatCurrency(sprint.budgetClp)}. Esta lectura será neutralizada del margen cliente cuando TASK-806 conecte la VIEW.`
                          : `Costo interno esperado: ${formatCurrency(sprint.budgetClp)}. El runtime conserva el monto aprobado en el service.`}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6}>
          <ActivityFeed />
          <Card>
            <CardHeader title='Snapshots' subheader='Cadencia semanal esperada.' />
            <CardContent>
              <Stack spacing={3}>
                {(variant === 'mockup'
                  ? ['Semana 1 · kickoff validado', 'Semana 2 · playbook operacional', 'Semana 3 · evidencia pendiente']
                  : [
                      sprint.lastSnapshotDays > 0 ? `Último snapshot hace ${sprint.lastSnapshotDays} días` : 'Sin snapshot registrado',
                      `Fase actual · ${sprint.phase}`,
                      `Progreso operacional · ${sprint.progressPct}%`
                    ]).map((item, index) => (
                  <Stack key={item} direction='row' spacing={2}>
                    <SignalDot severity={index === 2 ? 'warning' : 'success'} />
                    <Typography variant='body2'>{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

const DecisionTile = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <Box sx={{ p: 4, border: theme => `1px solid ${theme.palette.divider}`, borderRadius: theme => theme.shape.customBorderRadius.lg }}>
    <Stack direction='row' spacing={2} alignItems='center'>
      <CustomAvatar skin='light' color='primary' variant='rounded' size={34}>
        <i className={icon} />
      </CustomAvatar>
      <Box>
        <Typography variant='caption' color='text.secondary'>
          {label}
        </Typography>
        <Typography variant='subtitle1'>{value}</Typography>
      </Box>
    </Stack>
  </Box>
)

const DeclareWizard = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12, lg: 8 }}>
      <Card>
        <CardHeader
          title='Declarar Sample Sprint'
          subheader='Crea el engagement en pending_approval con criterio de éxito y costo esperado.'
          avatar={
            <CustomAvatar skin='light' color='primary' variant='rounded'>
              <i className='tabler-forms' />
            </CustomAvatar>
          }
        />
        <Divider />
        <CardContent>
          <Stepper activeStep={1} sx={{ mb: 6 }}>
            {['Cliente', 'Diseño', 'Equipo', 'Confirmación'].map(step => (
              <Step key={step}>
                <StepLabel>{step}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField select label='Cliente' defaultValue='sky' fullWidth>
                <MenuItem value='sky'>Sky Airline</MenuItem>
                <MenuItem value='aguas'>Aguas Andinas</MenuItem>
                <MenuItem value='nexa'>Nexa</MenuItem>
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField select label='Tipo de Sprint' defaultValue='pilot' fullWidth>
                {Object.entries(sprintKinds).map(([kind, meta]) => (
                  <MenuItem key={kind} value={kind}>
                    {meta.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField label='Costo interno esperado' defaultValue='6400000' helperText='Se usa para capacity warning y GTM investment.' fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField label='Deadline de decisión' defaultValue='2026-05-29' helperText='El outcome queda vencido si no se registra a tiempo.' fullWidth />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                multiline
                minRows={4}
                label='Criterios de éxito'
                defaultValue='Validar reducción de tiempo operativo, adopción del equipo y factibilidad de convertir a retainer mensual.'
                fullWidth
              />
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
            <Button variant='tonal' color='secondary'>
              Guardar borrador
            </Button>
            <Button variant='contained' startIcon={<i className='tabler-send' />}>
              Solicitar aprobación
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
      <SideGuidance
        title='Guardrails de declaración'
        icon='tabler-shield'
        items={[
          'No se materializa costo hasta approval aprobado.',
          'El equipo propuesto debe tener owner y capacidad visible.',
          'El Sprint nace como service con engagement_kind no regular.'
        ]}
      />
    </Grid>
  </Grid>
)

const ApprovalWizard = ({
  sprint,
  approvalOverride,
  setApprovalOverride
}: {
  sprint: Sprint
  approvalOverride: string
  setApprovalOverride: (value: string) => void
}) => {
  const hasCapacityRisk = sprint.team.some(member => member.availability < 0.1)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardHeader
            title='Aprobar engagement'
            subheader={`${sprint.client} · ${sprint.name}`}
            avatar={
              <CustomAvatar skin='light' color='warning' variant='rounded'>
                <i className='tabler-shield-check' />
              </CustomAvatar>
            }
          />
          <CardContent>
            {hasCapacityRisk ? (
              <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
                Hay miembros con disponibilidad bajo 10%. Puedes aprobar, pero el override queda auditado.
              </Alert>
            ) : null}

            <TableContainer sx={{ mt: 5 }}>
              <Table size='small' aria-label={domainAria.capacityByMember}>
                <TableHead>
                  <TableRow>
                    <TableCell>Miembro</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell align='right'>Asignado</TableCell>
                    <TableCell align='right'>Disponible</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sprint.team.map(member => (
                    <TableRow key={member.name}>
                      <TableCell>
                        <Stack direction='row' spacing={2} alignItems='center'>
                          <CustomAvatar skin='light' color='primary' size={32}>
                            {member.initials}
                          </CustomAvatar>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {member.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell align='right'>{Math.round(member.allocation * 100)}%</TableCell>
                      <TableCell align='right'>{Math.round(member.availability * 100)}%</TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          color={member.availability < 0.1 ? 'warning' : 'success'}
                          variant='tonal'
                          label={member.availability < 0.1 ? 'Requiere override' : 'Disponible'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <CustomTextField
              sx={{ mt: 5 }}
              multiline
              minRows={3}
              label='Razón de override'
              placeholder='Explica por qué se aprueba pese al warning de capacidad.'
              value={approvalOverride}
              onChange={event => setApprovalOverride(event.target.value)}
              error={hasCapacityRisk && approvalOverride.length > 0 && approvalOverride.length < 10}
              helperText={hasCapacityRisk ? 'Requerido si existe warning. Mínimo 10 caracteres para auditoría.' : 'Opcional cuando no hay warning.'}
              fullWidth
            />
          </CardContent>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-x' />}>
                Rechazar
              </Button>
              <Button variant='contained' startIcon={<i className='tabler-check' />} disabled={hasCapacityRisk && approvalOverride.length < 10}>
                Aprobar Sprint
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <SideGuidance
          title='Qué queda auditado'
          icon='tabler-history'
          items={['Snapshot completo de capacidad.', 'Aprobador y fecha de decisión.', 'Razón de override si aplica.']}
        />
      </Grid>
    </Grid>
  )
}

const ProgressWizard = ({
  sprint,
  snapshotNotes,
  setSnapshotNotes
}: {
  sprint: Sprint
  snapshotNotes: string
  setSnapshotNotes: (value: string) => void
}) => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12, lg: 8 }}>
      <Card>
        <CardHeader
          title='Registrar snapshot semanal'
          subheader={`${sprint.client} · último snapshot hace ${sprint.lastSnapshotDays} días`}
          avatar={
            <CustomAvatar skin='light' color='info' variant='rounded'>
              <i className='tabler-notes' />
            </CustomAvatar>
          }
          action={<CustomChip round='true' size='small' color={sprint.lastSnapshotDays > 10 ? 'warning' : 'success'} variant='tonal' label={sprint.lastSnapshotDays > 10 ? 'Stale progress' : 'Al día'} />}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <CustomTextField label='Fecha snapshot' defaultValue='2026-05-09' helperText='Único por service y día.' fullWidth />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <CustomTextField select label='Estado semanal' defaultValue='on_track' fullWidth>
                <MenuItem value='on_track'>En ruta</MenuItem>
                <MenuItem value='attention'>Requiere atención</MenuItem>
                <MenuItem value='blocked'>Bloqueado</MenuItem>
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <CustomTextField label='Avance estimado' defaultValue={`${sprint.progressPct}%`} fullWidth />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                multiline
                minRows={5}
                label='Notas cualitativas'
                value={snapshotNotes}
                onChange={event => setSnapshotNotes(event.target.value)}
                helperText='Resume evidencia, riesgos y próxima acción. Esto alimentará el reporte final.'
                fullWidth
              />
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
            <Button variant='tonal' color='secondary'>Guardar borrador</Button>
            <Button variant='contained' startIcon={<i className='tabler-device-floppy' />}>Registrar snapshot</Button>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
      <SideGuidance
        title='Cadencia saludable'
        icon='tabler-calendar-stats'
        items={['Un snapshot por semana mantiene trazabilidad.', 'Más de 10 días genera reliability signal.', 'Las notas deben poder sostener el outcome final.']}
      />
    </Grid>
  </Grid>
)

const OutcomeWizard = ({ sprint }: { sprint: Sprint }) => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12, lg: 8 }}>
      <Card>
        <CardHeader
          title='Registrar outcome'
          subheader='Cierre transaccional: outcome, lineage, audit log y outbox event.'
          avatar={
            <CustomAvatar skin='light' color='primary' variant='rounded'>
              <i className='tabler-flag-check' />
            </CustomAvatar>
          }
        />
        <Divider />
        <CardContent>
          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
            Si eliges convertido, el backend futuro disparará convertEngagement y emitirá service.engagement.converted v1.
          </Alert>
          <Grid container spacing={5} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField select label='Outcome' defaultValue='converted' fullWidth>
                <MenuItem value='converted'>Convertido</MenuItem>
                <MenuItem value='adjusted'>Ajustado</MenuItem>
                <MenuItem value='dropped'>Descartado</MenuItem>
                <MenuItem value='cancelled_by_client'>Cancelado por cliente</MenuItem>
                <MenuItem value='cancelled_by_provider'>Cancelado por proveedor</MenuItem>
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CustomTextField label='Cotización siguiente' defaultValue='Q-2026-0142' helperText='Opcional, para pricing post-conversión.' fullWidth />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                multiline
                minRows={4}
                label='Rationale de decisión'
                defaultValue={`${sprint.client} validó el valor operacional y pidió propuesta mensual con continuidad del equipo.`}
                helperText='Siempre requerido. Mínimo 10 caracteres.'
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 4, border: theme => `1px dashed ${theme.palette.divider}`, borderRadius: theme => theme.shape.customBorderRadius.lg }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <CustomAvatar skin='light' color='secondary' variant='rounded'>
                      <i className='tabler-upload' />
                    </CustomAvatar>
                    <Box>
                      <Typography variant='subtitle2'>Reporte final</Typography>
                      <Typography variant='body2' color='text.secondary'>Mock del asset uploader canónico TASK-721.</Typography>
                    </Box>
                  </Stack>
                  <Button variant='tonal' startIcon={<i className='tabler-paperclip' />}>Adjuntar reporte</Button>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
            <Button variant='tonal' color='secondary'>Guardar sin cerrar</Button>
            <Button variant='contained' startIcon={<i className='tabler-arrow-up-right' />}>Convertir engagement</Button>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
      <ActivityFeed title='Preview de eventos' />
    </Grid>
  </Grid>
)

const RuntimeDeclareWizard = ({ options }: { options: RuntimeSampleSprintOptions | null }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [memberId, setMemberId] = useState('')
  const [proposedFte, setProposedFte] = useState(0.25)

  const [form, setForm] = useState({
    name: '',
    spaceId: options?.spaces[0]?.spaceId ?? '',
    engagementKind: 'pilot' as SprintKind,
    startDate: new Date().toISOString().slice(0, 10),
    decisionDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    expectedDurationDays: 21,
    expectedInternalCostClp: 0,
    successCriteria: ''
  })

  useEffect(() => {
    if (!form.spaceId && options?.spaces[0]?.spaceId) {
      setForm(current => ({ ...current, spaceId: options.spaces[0].spaceId }))
    }
  }, [form.spaceId, options?.spaces])

  const selectedSpace = options?.spaces.find(space => space.spaceId === form.spaceId)
  const canSubmit = Boolean(form.name.trim() && form.spaceId && form.successCriteria.trim())

  const saveDraft = () => {
    window.localStorage.setItem('greenhouse.sample-sprints.declare-draft', JSON.stringify({ ...form, memberId, proposedFte }))
    setFeedback({ severity: 'success', message: 'Borrador guardado en este navegador.' })
  }

  const submit = () => {
    if (!canSubmit) {
      setFeedback({ severity: 'error', message: 'Completa nombre, cliente y criterios de éxito antes de solicitar aprobación.' })

      return
    }

    setFeedback(null)
    startTransition(async () => {
      const response = await fetch('/api/agency/sample-sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          organizationId: selectedSpace?.organizationId ?? null,
          successCriteria: buildCriteria(form.successCriteria),
          proposedTeam: memberId ? [{ memberId, proposedFte }] : []
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback({ severity: 'error', message: payload?.error || 'No fue posible declarar el Sample Sprint.' })

        return
      }

      router.push(`/agency/sample-sprints/${payload.serviceId}`)
    })
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardHeader
            title='Declarar Sample Sprint'
            subheader='Crea el engagement en pending_approval con criterio de éxito y costo esperado.'
            avatar={<CustomAvatar skin='light' color='primary' variant='rounded'><i className='tabler-forms' /></CustomAvatar>}
          />
          <Divider />
          <CardContent>
            <Stepper activeStep={1} sx={{ mb: 6 }}>
              {['Cliente', 'Diseño', 'Equipo', 'Confirmación'].map(step => <Step key={step}><StepLabel>{step}</StepLabel></Step>)}
            </Stepper>
            {feedback ? <Alert severity={feedback.severity} sx={{ mb: 5 }}>{feedback.message}</Alert> : null}
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField label='Nombre del Sprint' value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField select label='Cliente / Space' value={form.spaceId} onChange={event => setForm({ ...form, spaceId: event.target.value })} fullWidth required>
                  {(options?.spaces ?? []).map(space => (
                    <MenuItem key={space.spaceId} value={space.spaceId}>
                      {space.organizationName || space.clientName || space.spaceName} · {space.spaceName}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField select label='Tipo de Sprint' value={form.engagementKind} onChange={event => setForm({ ...form, engagementKind: event.target.value as SprintKind })} fullWidth>
                  {Object.entries(sprintKinds).map(([kind, meta]) => <MenuItem key={kind} value={kind}>{meta.label}</MenuItem>)}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <CustomTextField label='Inicio' type='date' value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <CustomTextField label='Decisión' type='date' value={form.decisionDeadline} onChange={event => setForm({ ...form, decisionDeadline: event.target.value })} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField label='Costo interno esperado' type='number' value={form.expectedInternalCostClp} onChange={event => setForm({ ...form, expectedInternalCostClp: Number(event.target.value) })} helperText='Se usa para capacity warning y GTM investment.' fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField label='Duración estimada' type='number' value={form.expectedDurationDays} onChange={event => setForm({ ...form, expectedDurationDays: Number(event.target.value) })} helperText='Días operativos esperados.' fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField select label='Miembro propuesto' value={memberId} onChange={event => setMemberId(event.target.value)} fullWidth>
                  <MenuItem value=''>Sin asignar</MenuItem>
                  {(options?.members ?? []).map(member => <MenuItem key={member.memberId} value={member.memberId}>{member.displayName}{member.roleTitle ? ` · ${member.roleTitle}` : ''}</MenuItem>)}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField label='FTE propuesto' type='number' value={proposedFte} onChange={event => setProposedFte(Number(event.target.value))} inputProps={{ min: 0.05, max: 1, step: 0.05 }} fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField multiline minRows={4} label='Criterios de éxito' value={form.successCriteria} onChange={event => setForm({ ...form, successCriteria: event.target.value })} helperText='Define evidencia, outcome esperado y condición de conversión.' fullWidth required />
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
              <Button variant='tonal' color='secondary' onClick={saveDraft} disabled={pending}>Guardar borrador</Button>
              <Button variant='contained' startIcon={<i className='tabler-send' />} onClick={submit} disabled={pending || !canSubmit}>
                {pending ? 'Solicitando...' : 'Solicitar aprobación'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <SideGuidance title='Guardrails de declaración' icon='tabler-shield' items={['No se materializa costo hasta approval aprobado.', 'El equipo propuesto debe tener owner y capacidad visible.', 'El Sprint nace como service con engagement_kind no regular.']} />
      </Grid>
    </Grid>
  )
}

const RuntimeApprovalWizard = ({ sprint }: { sprint: Sprint }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [detail, setDetail] = useState<RuntimeSampleSprintDetail | null>(null)
  const [approvalOverride, setApprovalOverride] = useState('')
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error' | 'info'; message: string } | null>(null)
  const hasCapacityRisk = sprint.team.some(member => member.availability < 0.1)
  const proposedMembers = detail?.proposedTeam.map(member => ({ memberId: member.memberId, proposedFte: member.proposedFte })) ?? []

  useEffect(() => {
    let mounted = true

    fetch(`/api/agency/sample-sprints/${encodeURIComponent(sprint.id)}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (mounted) setDetail(payload)
      })
      .catch(() => {
        if (mounted) setFeedback({ severity: 'error', message: 'No fue posible cargar el detalle de approval.' })
      })

    return () => {
      mounted = false
    }
  }, [sprint.id])

  const submit = (action: 'approve' | 'reject') => {
    if (action === 'reject' && approvalOverride.trim().length < 10) {
      setFeedback({ severity: 'error', message: 'Escribe una razón de rechazo de al menos 10 caracteres.' })

      return
    }

    if (action === 'approve' && hasCapacityRisk && approvalOverride.trim().length < 10) {
      setFeedback({ severity: 'error', message: 'El warning de capacidad requiere razón de override.' })

      return
    }

    setFeedback(null)
    startTransition(async () => {
      const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(sprint.id)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'approve'
          ? { proposedMembers, capacityOverrideReason: approvalOverride || null }
          : { rejectionReason: approvalOverride })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback({ severity: 'error', message: payload?.error || `No fue posible ${action === 'approve' ? 'aprobar' : 'rechazar'} el engagement.` })

        return
      }

      router.refresh()
      setFeedback({ severity: 'success', message: action === 'approve' ? 'Sample Sprint aprobado.' : 'Sample Sprint rechazado.' })
    })
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardHeader title='Aprobar engagement' subheader={`${sprint.client} · ${sprint.name}`} avatar={<CustomAvatar skin='light' color='warning' variant='rounded'><i className='tabler-shield-check' /></CustomAvatar>} />
          <CardContent>
            {feedback ? <Alert severity={feedback.severity} sx={{ mb: 5 }}>{feedback.message}</Alert> : null}
            {hasCapacityRisk ? <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>Hay miembros con disponibilidad bajo 10%. Puedes aprobar, pero el override queda auditado.</Alert> : null}
            <TableContainer sx={{ mt: 5 }}>
              <Table size='small' aria-label={domainAria.capacityByMember}>
                <TableHead><TableRow><TableCell>Miembro</TableCell><TableCell>Rol</TableCell><TableCell align='right'>Asignado</TableCell><TableCell align='right'>Disponible</TableCell><TableCell>Estado</TableCell></TableRow></TableHead>
                <TableBody>
                  {sprint.team.map(member => (
                    <TableRow key={member.name}>
                      <TableCell><Stack direction='row' spacing={2} alignItems='center'><CustomAvatar skin='light' color='primary' size={32}>{member.initials}</CustomAvatar><Typography variant='body2' sx={{ fontWeight: 600 }}>{member.name}</Typography></Stack></TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell align='right'>{Math.round(member.allocation * 100)}%</TableCell>
                      <TableCell align='right'>{Math.round(member.availability * 100)}%</TableCell>
                      <TableCell><CustomChip round='true' size='small' color={member.availability < 0.1 ? 'warning' : 'success'} variant='tonal' label={member.availability < 0.1 ? 'Requiere override' : 'Disponible'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <CustomTextField sx={{ mt: 5 }} multiline minRows={3} label='Razón de override o rechazo' value={approvalOverride} onChange={event => setApprovalOverride(event.target.value)} helperText='Requerido para rechazar o aprobar con warning. Mínimo 10 caracteres.' fullWidth />
          </CardContent>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-x' />} onClick={() => submit('reject')} disabled={pending}>Rechazar</Button>
              <Button variant='contained' startIcon={<i className='tabler-check' />} onClick={() => submit('approve')} disabled={pending || (hasCapacityRisk && approvalOverride.length < 10)}>Aprobar Sprint</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <SideGuidance title='Qué queda auditado' icon='tabler-history' items={['Snapshot completo de capacidad.', 'Aprobador y fecha de decisión.', 'Razón de override o rechazo si aplica.']} />
      </Grid>
    </Grid>
  )
}

const RuntimeProgressWizard = ({ sprint }: { sprint: Sprint }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null)
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10))
  const [state, setState] = useState('on_track')
  const [progressPct, setProgressPct] = useState(sprint.progressPct)
  const [snapshotNotes, setSnapshotNotes] = useState('Semana con avance fuerte en playbook de operación. Falta cerrar evidencia de ahorro de tiempo.')

  const submit = () => {
    setFeedback(null)
    startTransition(async () => {
      const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(sprint.id)}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotDate,
          metricsJson: { deliveryProgressPct: progressPct, weeklyState: state },
          qualitativeNotes: snapshotNotes || null
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback({ severity: 'error', message: payload?.error || 'No fue posible registrar el snapshot.' })

        return
      }

      router.refresh()
      setFeedback({ severity: 'success', message: 'Snapshot semanal registrado.' })
    })
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardHeader
            title='Registrar snapshot semanal'
            subheader={`${sprint.client} · último snapshot hace ${sprint.lastSnapshotDays} días`}
            avatar={<CustomAvatar skin='light' color='info' variant='rounded'><i className='tabler-notes' /></CustomAvatar>}
            action={<CustomChip round='true' size='small' color={sprint.lastSnapshotDays > 10 ? 'warning' : 'success'} variant='tonal' label={sprint.lastSnapshotDays > 10 ? 'Stale progress' : 'Al día'} />}
          />
          <Divider />
          <CardContent>
            {feedback ? <Alert severity={feedback.severity} sx={{ mb: 5 }}>{feedback.message}</Alert> : null}
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField label='Fecha snapshot' type='date' value={snapshotDate} onChange={event => setSnapshotDate(event.target.value)} helperText='Único por service y día.' fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField select label='Estado semanal' value={state} onChange={event => setState(event.target.value)} fullWidth>
                  <MenuItem value='on_track'>En ruta</MenuItem>
                  <MenuItem value='attention'>Requiere atención</MenuItem>
                  <MenuItem value='blocked'>Bloqueado</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CustomTextField label='Avance estimado' type='number' value={progressPct} onChange={event => setProgressPct(Number(event.target.value))} inputProps={{ min: 0, max: 100 }} fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField multiline minRows={5} label='Notas cualitativas' value={snapshotNotes} onChange={event => setSnapshotNotes(event.target.value)} helperText='Resume evidencia, riesgos y próxima acción. Esto alimentará el reporte final.' fullWidth />
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
              <Button variant='tonal' color='secondary' onClick={() => window.localStorage.setItem(`greenhouse.sample-sprints.progress-draft.${sprint.id}`, JSON.stringify({ snapshotDate, state, progressPct, snapshotNotes }))} disabled={pending}>Guardar borrador</Button>
              <Button variant='contained' startIcon={<i className='tabler-device-floppy' />} onClick={submit} disabled={pending || !snapshotDate}>{pending ? 'Registrando...' : 'Registrar snapshot'}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <SideGuidance title='Cadencia saludable' icon='tabler-calendar-stats' items={['Un snapshot por semana mantiene trazabilidad.', 'Más de 10 días genera reliability signal.', 'Las notas deben poder sostener el outcome final.']} />
      </Grid>
    </Grid>
  )
}

const RuntimeOutcomeWizard = ({ sprint, options }: { sprint: Sprint; options: RuntimeSampleSprintOptions | null }) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null)
  const [file, setFile] = useState<UploadedFileValue | null>(null)

  const [form, setForm] = useState({
    outcomeKind: 'converted',
    decisionDate: new Date().toISOString().slice(0, 10),
    decisionRationale: `${sprint.client} validó el valor operacional y pidió propuesta mensual con continuidad del equipo.`,
    cancellationReason: '',
    nextServiceId: '',
    nextQuotationId: '',
    metrics: '{"clientImpact":"documented"}'
  })

  const submit = () => {
    if (form.decisionRationale.trim().length < 10) {
      setFeedback({ severity: 'error', message: 'El rationale de decisión debe tener al menos 10 caracteres.' })

      return
    }

    setFeedback(null)
    startTransition(async () => {
      const response = await fetch(`/api/agency/sample-sprints/${encodeURIComponent(sprint.id)}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reportAssetId: file?.assetId ?? null,
          metrics: parseRecord(form.metrics, {})
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback({ severity: 'error', message: payload?.error || 'No fue posible registrar el outcome.' })

        return
      }

      router.refresh()
      setFeedback({ severity: 'success', message: 'Outcome registrado.' })
    })
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardHeader title='Registrar outcome' subheader='Cierre transaccional: outcome, lineage, audit log y outbox event.' avatar={<CustomAvatar skin='light' color='primary' variant='rounded'><i className='tabler-flag-check' /></CustomAvatar>} />
          <Divider />
          <CardContent>
            {feedback ? <Alert severity={feedback.severity} sx={{ mb: 5 }}>{feedback.message}</Alert> : null}
            <Alert severity='info' icon={<i className='tabler-info-circle' />}>Si eliges convertido, el backend ejecuta convertEngagement y emite service.engagement.converted v1.</Alert>
            <Grid container spacing={5} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField select label='Outcome' value={form.outcomeKind} onChange={event => setForm({ ...form, outcomeKind: event.target.value })} fullWidth>
                  <MenuItem value='converted'>Convertido</MenuItem>
                  <MenuItem value='adjusted'>Ajustado</MenuItem>
                  <MenuItem value='dropped'>Descartado</MenuItem>
                  <MenuItem value='cancelled_by_client'>Cancelado por cliente</MenuItem>
                  <MenuItem value='cancelled_by_provider'>Cancelado por proveedor</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField label='Fecha decisión' type='date' value={form.decisionDate} onChange={event => setForm({ ...form, decisionDate: event.target.value })} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField select label='Servicio siguiente' value={form.nextServiceId} onChange={event => setForm({ ...form, nextServiceId: event.target.value })} disabled={form.outcomeKind !== 'converted'} fullWidth>
                  <MenuItem value=''>Sin servicio</MenuItem>
                  {(options?.conversionTargets ?? []).map(item => <MenuItem key={item.serviceId} value={item.serviceId}>{item.publicId ?? item.serviceId} · {item.name}</MenuItem>)}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <CustomTextField select label='Cotización siguiente' value={form.nextQuotationId} onChange={event => setForm({ ...form, nextQuotationId: event.target.value })} disabled={form.outcomeKind !== 'converted'} fullWidth>
                  <MenuItem value=''>Sin cotización</MenuItem>
                  {(options?.quotations ?? []).map(item => <MenuItem key={item.quotationId} value={item.quotationId}>{item.quotationNumber} · {item.clientName ?? 'Sin cliente'}</MenuItem>)}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField multiline minRows={4} label='Rationale de decisión' value={form.decisionRationale} onChange={event => setForm({ ...form, decisionRationale: event.target.value })} helperText='Siempre requerido. Mínimo 10 caracteres.' fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField multiline minRows={3} label='Razón de cancelación' disabled={!form.outcomeKind.startsWith('cancelled')} value={form.cancellationReason} onChange={event => setForm({ ...form, cancellationReason: event.target.value })} fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField multiline minRows={4} label='Métricas JSON' value={form.metrics} onChange={event => setForm({ ...form, metrics: event.target.value })} fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <GreenhouseFileUploader contextType='sample_sprint_report_draft' value={file} onChange={setFile} title='Reporte final' helperText='Adjunta evidencia, reporte o resumen usado para la decisión terminal.' metadataLabel={`Sample Sprint ${sprint.id}`} maxSizeBytes={25 * 1024 * 1024} />
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
              <Button variant='tonal' color='secondary' onClick={() => window.localStorage.setItem(`greenhouse.sample-sprints.outcome-draft.${sprint.id}`, JSON.stringify(form))} disabled={pending}>Guardar sin cerrar</Button>
              <Button variant='contained' startIcon={<i className='tabler-arrow-up-right' />} onClick={submit} disabled={pending}>{pending ? 'Registrando...' : form.outcomeKind === 'converted' ? 'Convertir engagement' : 'Registrar outcome'}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <ActivityFeed title='Preview de eventos' />
      </Grid>
    </Grid>
  )
}

const NoSprintSelected = ({ variant }: { variant: SampleSprintsExperienceVariant }) => (
  <Card>
    <CardContent>
      <EmptyState
        icon='tabler-pointer-question'
        title='Selecciona un Sample Sprint'
        description='El command center mantiene la jerarquía aprobada y abre cada superficie desde un Sprint real.'
        action={variant === 'runtime' ? <Button component={Link} href='/agency/sample-sprints/new' variant='contained'>Declarar Sprint</Button> : undefined}
        minHeight={320}
      />
    </CardContent>
  </Card>
)

const CommercialHealthSurface = ({
  signals = reliabilitySignals,
  variant = 'mockup'
}: {
  signals?: Signal[]
  variant?: SampleSprintsExperienceVariant
}) => {
  const activeSignalCount = signals.filter(signal => signal.count > 0).length
  const healthRatio = signals.length > 0 ? Math.round(((signals.length - activeSignalCount) / signals.length) * 100) : 100

  return (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12, lg: 4 }}>
      <Card sx={{ height: '100%' }}>
        <CardHeader
          title='Commercial Health'
          subheader='Subsystem mock para /admin/operations.'
          avatar={
            <CustomAvatar skin='light' color='primary' variant='rounded'>
              <i className='tabler-activity-heartbeat' />
            </CustomAvatar>
          }
        />
        <CardContent>
          <Stack spacing={4}>
            <Typography variant='h2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {activeSignalCount}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Señales no steady. El rollup usa severidad máxima: cualquier error vuelve el subsystem rojo.
            </Typography>
            <LinearProgress value={healthRatio} variant='determinate' color={activeSignalCount > 0 ? 'warning' : 'success'} sx={{ height: 8, borderRadius: 9999 }} aria-label={domainAria.commercialHealthRatio} />
            {variant === 'runtime' ? (
              <Button component={Link} href='/admin/ops-health' variant='tonal' startIcon={<i className='tabler-activity-heartbeat' />}>
                Abrir Ops Health
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, lg: 8 }}>
      <Card>
        <CardHeaderWithBadge title='Reliability signals' badgeValue={signals.length} avatarIcon='tabler-radar' />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            {signals.map(signal => (
              <Grid key={signal.code} size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 4, border: theme => `1px solid ${theme.palette.divider}`, borderRadius: theme => theme.shape.customBorderRadius.lg, height: '100%' }}>
                  <Stack spacing={3}>
                    <Stack direction='row' justifyContent='space-between' spacing={2}>
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <SignalDot severity={signal.count > 0 ? signal.severity : 'success'} />
                        <Typography variant='subtitle2'>{signal.label}</Typography>
                      </Stack>
                      <CustomChip
                        round='true'
                        size='small'
                        color={signal.count > 0 ? signal.severity : 'success'}
                        variant='tonal'
                        label={signal.count > 0 ? String(signal.count) : 'steady'}
                      />
                    </Stack>
                    <Typography variant='body2' color='text.secondary'>{signal.description}</Typography>
                    <Typography variant='caption' color='text.secondary'>{signal.code}</Typography>
                    <Divider />
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {signal.runbook}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
  )
}

const MemberLoadRow = ({ member }: { member: TeamMember }) => (
  <Stack spacing={1.5}>
    <Stack direction='row' justifyContent='space-between' alignItems='center'>
      <Stack direction='row' spacing={2} alignItems='center'>
        <CustomAvatar skin='light' color='primary' size={32}>
          {member.initials}
        </CustomAvatar>
        <Box>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>{member.name}</Typography>
          <Typography variant='caption' color='text.secondary'>{member.role}</Typography>
        </Box>
      </Stack>
      <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(member.allocation * 100)}%
      </Typography>
    </Stack>
    <LinearProgress value={member.allocation * 100} variant='determinate' sx={{ height: 6, borderRadius: 9999 }} aria-label={`${domainAria.memberAllocation} ${member.name}`} />
  </Stack>
)

const ActivityFeed = ({ title = 'Audit feed' }: { title?: string }) => (
  <Card>
    <CardHeader
      title={title}
      subheader='Append-only mock para TASK-808.'
      avatar={
        <CustomAvatar skin='light' color='secondary' variant='rounded'>
          <i className='tabler-history' />
        </CustomAvatar>
      }
    />
    <CardContent>
      <Stack spacing={3}>
        {[
          ['service.engagement.phase_completed', 'Valentina cerró Operación', 'Hace 2 días'],
          ['service.engagement.progress_snapshot_recorded', 'Snapshot semanal registrado', 'Hace 4 días'],
          ['service.engagement.capacity_overridden', 'Override de capacidad auditado', 'Hace 9 días']
        ].map(([event, label, when]) => (
          <Stack key={event} direction='row' spacing={2}>
            <SignalDot severity={event.includes('overridden') ? 'warning' : 'info'} />
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>{label}</Typography>
              <Typography variant='caption' color='text.secondary'>{event} · {when}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </CardContent>
  </Card>
)

const SideGuidance = ({ title, icon, items }: { title: string; icon: string; items: string[] }) => (
  <Card>
    <CardHeader
      title={title}
      avatar={
        <CustomAvatar skin='light' color='primary' variant='rounded'>
          <i className={icon} />
        </CustomAvatar>
      }
    />
    <CardContent>
      <Stack spacing={3}>
        {items.map(item => (
          <Stack key={item} direction='row' spacing={2}>
            <i className='tabler-check' style={{ fontSize: 18, color: 'var(--mui-palette-success-main)' }} aria-hidden='true' />
            <Typography variant='body2'>{item}</Typography>
          </Stack>
        ))}
      </Stack>
    </CardContent>
  </Card>
)

const SignalDot = ({ severity }: { severity: HealthSeverity }) => (
  <Box
    aria-hidden='true'
    sx={{
      width: 10,
      height: 10,
      mt: 1,
      flex: '0 0 auto',
      borderRadius: 9999,
      bgcolor: `${severity}.main`,
      boxShadow: theme => `0 0 0 4px ${alpha(theme.palette[severity === 'secondary' ? 'secondary' : severity].main, 0.12)}`
    }}
  />
)

export default SampleSprintsMockupView
