'use client'

import { useMemo, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from '@/libs/Recharts'

import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'
import {
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseKpiDelta,
  GreenhouseStatusDot
} from '@/components/greenhouse/primitives'
import { DataTableShell } from '@/components/greenhouse/data-table'
import type { GreenhouseChipTone } from '@/components/greenhouse/primitives'

import {
  accountSignals,
  blockers,
  deliveryMetrics,
  distributionData,
  financeMetrics,
  invoiceRows,
  pipelineData,
  projectRows,
  readinessSteps,
  topMetrics,
  workspaceFacets,
  type EnterpriseFacet,
  type EnterpriseFacetKey,
  type EnterpriseMetric,
  type EnterpriseTone
} from './organization-workspace-enterprise-detail-data'

const toneToChip = (tone: EnterpriseTone): GreenhouseChipTone =>
  tone === 'primary' || tone === 'secondary' || tone === 'success' || tone === 'warning' || tone === 'error' || tone === 'info'
    ? tone
    : 'default'

const toneToStatus = (tone: EnterpriseTone) =>
  tone === 'secondary' ? 'neutral' : tone

const facetStateCopy: Record<EnterpriseFacet['state'], string> = {
  ready: 'Listo',
  attention: 'Revisar',
  partial: 'Parcial',
  planned: 'Planificado'
}

const facetStateTone: Record<EnterpriseFacet['state'], GreenhouseChipTone> = {
  ready: 'success',
  attention: 'warning',
  partial: 'warning',
  planned: 'info'
}

const facetDetails: Record<EnterpriseFacetKey, { heading: string; description: string; evidence: string[] }> = {
  identity: {
    heading: 'Identidad y sistemas fuente',
    description: 'Ficha legal, marca, Notion, HubSpot y mapeos canónicos para que el resto de facets no repita ownership.',
    evidence: ['Legal entity verified', 'Notion healthy', 'HubSpot synced', 'Brand asset attached']
  },
  spaces: {
    heading: 'Espacios operativos',
    description: 'Workspaces y objetos de operación conectados a la organización. El detalle conserva mapeos y recencia.',
    evidence: ['27 active spaces', '21 core memberships', '4 stale mappings', '0 orphan spaces']
  },
  team: {
    heading: 'Equipo y capacidad',
    description: 'Roster, dedicación, roles y capacidad disponible para entender si delivery y finance tienen base operativa.',
    evidence: ['3,842 total FTE', '312 available FTE', '216 active members', '14 leadership roles']
  },
  economics: {
    heading: 'Economía del account',
    description: 'Márgenes, contribución, mix de costos y sensibilidad operacional sin duplicar el ledger de Finanzas.',
    evidence: ['18.7% gross margin', '1.5 pp recovery', 'Data & Analytics at risk', 'Cost attribution fresh']
  },
  delivery: {
    heading: 'Entrega operacional',
    description: 'Calidad, throughput, velocity y proyectos activos. Esta vista es el default recomendado para Agency.',
    evidence: ['92.1% OTD', '87.4% FTR', '126 pts/month', '5 active projects']
  },
  finance: {
    heading: 'Finanzas agency-flavored',
    description: 'Resumen financiero para Agency con puente a la vista rica de Finance Clients cuando se requiere operación.',
    evidence: ['USD 34.5M YTD', 'USD 20.7M pending', '47 DSO', '62 issued invoices']
  },
  crm: {
    heading: 'CRM y pipeline comercial',
    description: 'Contactos, deals, pipeline y sincronización HubSpot como contexto, no como único source of truth.',
    evidence: ['12 active deals', 'HubSpot sync today', '4 stakeholder contacts', '1 renewal opportunity']
  },
  services: {
    heading: 'Servicios y engagements',
    description: 'Catálogo de servicios, cobertura activa y consumo por engagement sin convertir el empty state en una card gigante.',
    evidence: ['41 active services', '97% SLA OK', 'Catalog partially aligned', '2 renewals due']
  },
  staffAug: {
    heading: 'Staff augmentation',
    description: 'Placements, contratos externos y baseline de capacidad aumentada con estado honesto de implementación.',
    evidence: ['8 active placements', '9.6 external FTE', 'Contracts baseline pending', 'No payroll writes']
  }
}

const contextFacetRows: Record<Exclude<EnterpriseFacetKey, 'delivery' | 'finance'>, string[][]> = {
  identity: [
    ['Legal profile', 'Efeonce Group SpA customer record', 'Verified', 'AXIS Core'],
    ['Brand asset', 'Logo and public domain attached', 'Fresh', 'Brand registry'],
    ['CRM mapping', 'HubSpot company + stakeholder contacts', 'Healthy', 'HubSpot'],
    ['Knowledge base', 'Notion operating page linked', 'Healthy', 'Notion']
  ],
  spaces: [
    ['Commercial workspace', '21 core memberships', 'Healthy', 'Spaces'],
    ['Delivery workspace', '5 active project rooms', 'Healthy', 'Operations'],
    ['Finance workspace', '32 finance records mapped', 'Partial', 'Finance Clients'],
    ['Orphan scan', '0 orphan spaces', 'Healthy', 'AXIS Core']
  ],
  team: [
    ['Leadership', '14 accountable roles', 'Healthy', 'Identity'],
    ['Capacity pool', '312 FTE available', 'Healthy', 'Workforce'],
    ['Delivery pod', '216 active members', 'Healthy', 'Operations'],
    ['Succession signal', '2 key-role backups missing', 'Review', 'Talent']
  ],
  economics: [
    ['Gross margin', '18.7% vs 22% target', 'Review', 'Finance'],
    ['Cost attribution', '98% allocated', 'Healthy', 'Accounting'],
    ['Contribution bridge', 'Data & Analytics pressure', 'Review', 'Economics'],
    ['Forecast sensitivity', 'Q2 close needs DSO review', 'Review', 'Finance']
  ],
  crm: [
    ['Pipeline', '12 active deals', 'Healthy', 'HubSpot'],
    ['Renewal', '1 renewal opportunity', 'Healthy', 'CRM'],
    ['Stakeholders', '4 executive contacts', 'Healthy', 'HubSpot'],
    ['Sync recency', 'Today 08:20', 'Fresh', 'Integration']
  ],
  services: [
    ['Catalog coverage', '41 active services', 'Healthy', 'Services'],
    ['SLA posture', '97% OK', 'Healthy', 'Delivery'],
    ['Renewal queue', '2 renewals due', 'Review', 'CRM'],
    ['Catalog alignment', 'Partial mapping', 'Partial', 'Service catalog']
  ],
  staffAug: [
    ['Placements', '8 active placements', 'Healthy', 'Workforce'],
    ['External capacity', '9.6 external FTE', 'Healthy', 'Staff Aug.'],
    ['Contract baseline', 'Pending canonical baseline', 'Partial', 'Contracting'],
    ['Payroll writes', 'No payroll writes enabled', 'Planned', 'Payroll']
  ]
}

const chartStroke = 'var(--mui-palette-primary-main)'
const chartMutedStroke = 'var(--mui-palette-text-disabled)'

const organizationEnterpriseAria = {
  logo: 'Logo de Sky Airline',
  facetNavigation: 'Facets de organización',
  cscDistribution: 'Distribución CSC por capability de entrega',
  projectsTable: 'Proyectos activos de la organización',
  invoicesTable: 'Facturas y deuda de la organización'
}

const contextMetricsFor = (facet: EnterpriseFacet): EnterpriseMetric[] => [
  {
    label: 'Cobertura facet',
    value: facet.count,
    helper: `${facet.labelEs} vinculados`,
    icon: facet.icon,
    tone: facet.health
  },
  {
    label: 'Estado canónico',
    value: facetStateCopy[facet.state],
    helper: 'listo para consumers',
    icon: 'tabler-shield-check',
    tone: facet.health
  },
  {
    label: 'Freshness',
    value: facet.recency,
    helper: 'última señal confiable',
    icon: 'tabler-clock-search',
    tone: facet.state === 'attention' || facet.state === 'partial' ? 'warning' : 'success'
  },
  {
    label: 'Puentes activos',
    value: '4',
    helper: 'finance · delivery · CRM · workforce',
    icon: 'tabler-git-branch',
    tone: 'info'
  }
]

const chartColorForTone = (tone: EnterpriseTone) => {
  if (tone === 'secondary') return 'var(--mui-palette-secondary-main)'

  return `var(--mui-palette-${tone}-main)`
}

const distributionColorForItem = (item: { name: string; tone: string }) => {
  if (item.name === 'Data & Analytics' || item.name === 'Otros') return 'var(--mui-palette-text-disabled)'
  if (item.name === 'Digital Platforms') return 'var(--mui-palette-info-main)'

  return chartColorForTone(item.tone as EnterpriseTone)
}

const distributionChartArcs = distributionData.reduce<{ start: number; arcs: Array<{ name: string; value: number; start: number; length: number; color: string }> }>(
  (acc, item) => {
    const gap = 1.2

    const arc = {
      name: item.name,
      value: item.value,
      start: acc.start + gap / 2,
      length: Math.max(item.value - gap, 0),
      color: distributionColorForItem(item)
    }

    return { start: acc.start + item.value, arcs: [...acc.arcs, arc] }
  },
  { start: 0, arcs: [] }
).arcs

const OrganizationWorkspaceEnterpriseDetailMockupView = () => {
  const [activeFacet, setActiveFacet] = useState<EnterpriseFacetKey>('delivery')

  const activeFacetMeta = useMemo(
    () => workspaceFacets.find(facet => facet.key === activeFacet) ?? workspaceFacets[0],
    [activeFacet]
  )

  const facetDetail = facetDetails[activeFacet]

  const selectedMetrics =
    activeFacet === 'delivery'
      ? deliveryMetrics
      : activeFacet === 'finance'
        ? financeMetrics
        : contextMetricsFor(activeFacetMeta)

  return (
    <Box data-capture='organization-workspace-enterprise-detail-mockup'>
      <Stack spacing={0} sx={{ bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}` }}>
        <Box
          data-capture='organization-enterprise-reference-anchor'
          sx={visuallyHiddenSx}
        >
          Visual target asset: /images/greenhouse/mockups/organization-workspace-enterprise-command-center-reference.png
        </Box>

        <OrganizationMasthead />
        <TopMetricRail metrics={topMetrics} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '224px minmax(0, 1fr) 336px' },
            minHeight: { xs: 'auto', lg: 656 },
            borderBlockStart: theme => `1px solid ${theme.palette.divider}`
          }}
        >
          <FacetRail activeFacet={activeFacet} onSelect={setActiveFacet} />
          <Box
            component='main'
            data-capture='organization-enterprise-main-canvas'
            sx={{
              minWidth: 0,
              borderInlineStart: { lg: theme => `1px solid ${theme.palette.divider}` },
              borderInlineEnd: { lg: theme => `1px solid ${theme.palette.divider}` }
            }}
          >
            <Box sx={{ px: { xs: 4, md: 5 }, py: { xs: 4, md: 5 } }}>
              <Stack spacing={4}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent='space-between'
                  spacing={3}
                >
                  <Stack spacing={1} sx={{ minWidth: 0 }}>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Typography variant='h4'>{facetDetail.heading}</Typography>
                      <GreenhouseChip
                        kind='status'
                        size='small'
                        variant='label'
                        tone={facetStateTone[activeFacetMeta.state]}
                        label={facetStateCopy[activeFacetMeta.state]}
                        sx={{ minInlineSize: 82 }}
                      />
                    </Stack>
                    <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
                      {facetDetail.description}
                    </Typography>
                  </Stack>
                  <Stack direction='row' spacing={2}>
                    <GreenhouseButton kind='filter' variant='outlined' leadingIconClassName='tabler-filter'>
                      Filtros
                    </GreenhouseButton>
                    <GreenhouseButton kind='navigation' variant='text' trailingIconClassName='tabler-external-link'>
                      Vista completa
                    </GreenhouseButton>
                  </Stack>
                </Stack>

                <MetricStrip metrics={selectedMetrics} />

                {activeFacet === 'delivery' ? (
                  <DeliveryCanvas />
                ) : activeFacet === 'finance' ? (
                  <FinanceCanvas />
                ) : (
                  <ContextFacetCanvas activeFacet={activeFacet} facetMeta={activeFacetMeta} detail={facetDetail} />
                )}

                <FacetEvidence detail={facetDetail} activeFacet={activeFacetMeta} />
              </Stack>
            </Box>
          </Box>
          <AccountSidecar />
        </Box>
      </Stack>
    </Box>
  )
}

const OrganizationMasthead = () => {
  const theme = useTheme()

  return (
    <Box data-capture='organization-enterprise-masthead' sx={{ px: { xs: 4, md: 6 }, py: { xs: 4, md: 5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
        <Stack direction='row' spacing={4} alignItems='center' sx={{ minWidth: 0 }}>
          <Box
            aria-label={organizationEnterpriseAria.logo}
            role='img'
            sx={{
              inlineSize: 78,
              blockSize: 78,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              border: `1px solid ${theme.palette.divider}`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: 'background.default'
            }}
          >
            <Typography variant='h4' sx={{ color: 'primary.dark', letterSpacing: 0 }}>
              SKY
            </Typography>
          </Box>
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack direction='row' alignItems='center' spacing={2} flexWrap='wrap'>
              <Typography variant='surfaceHeroTitle' sx={{ overflowWrap: 'anywhere' }}>
                Sky Airline
              </Typography>
              <GreenhouseStatusDot tone='success' label='Activa' halo />
            </Stack>
            <Stack direction='row' spacing={2.5} alignItems='center' flexWrap='wrap'>
              <MetaItem icon='tabler-map-pin' label='Chile (CL)' />
              <MetaItem icon='tabler-building-skyscraper' label='Airlines & Aviation' />
              <MetaItem icon='tabler-id' label='EO-ORG-0011' />
              <MetaItem icon='tabler-world' label='skyairline.com' tone='primary' />
              <MetaItem icon='tabler-database' label='Source: AXIS Core' />
            </Stack>
          </Stack>
        </Stack>
        <Stack direction='row' spacing={2} alignItems='center'>
          {[
            ['tabler-pencil', 'Editar organización'],
            ['tabler-user-plus', 'Agregar relación'],
            ['tabler-download', 'Exportar snapshot'],
            ['tabler-dots-vertical', 'Más acciones']
          ].map(([icon, label]) => (
            <IconButton
              key={label}
              aria-label={label}
              size='small'
              sx={{
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
              }}
            >
              <i className={icon} aria-hidden='true' />
            </IconButton>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

const MetaItem = ({ icon, label, tone = 'secondary' }: { icon: string; label: string; tone?: 'secondary' | 'primary' }) => (
  <Stack direction='row' spacing={1} alignItems='center' sx={{ color: tone === 'primary' ? 'primary.main' : 'text.secondary' }}>
    <i className={icon} aria-hidden='true' />
    <Typography variant='body2' color={tone === 'primary' ? 'primary.main' : 'text.secondary'}>
      {label}
    </Typography>
  </Stack>
)

const TopMetricRail = ({ metrics }: { metrics: EnterpriseMetric[] }) => (
  <Box sx={{ borderBlockStart: theme => `1px solid ${theme.palette.divider}` }}>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', lg: `repeat(${metrics.length}, minmax(0, 1fr))` }
      }}
    >
      {metrics.map((metric, index) => (
        <Box
          key={metric.label}
          sx={{
            px: { xs: 4, md: 6 },
            py: 3,
            borderInlineStart: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}`
          }}
        >
          <Stack direction='row' spacing={3} alignItems='center'>
            <Box
              sx={{
                inlineSize: 38,
                blockSize: 38,
                borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
                display: 'grid',
                placeItems: 'center',
                color: `${metric.tone}.main`,
                bgcolor: `${metric.tone}.lighterOpacity`,
                flexShrink: 0
              }}
            >
              <i className={metric.icon} aria-hidden='true' />
            </Box>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant='caption' color='text.secondary'>
                {metric.label}
              </Typography>
              <Stack direction='row' spacing={1.5} alignItems='baseline' flexWrap='wrap'>
                <Typography variant='h5'>{metric.value}</Typography>
                {typeof metric.delta === 'number' ? (
                  <GreenhouseKpiDelta value={metric.delta} invert={metric.invert} />
                ) : null}
              </Stack>
              <Typography variant='caption' color='text.secondary'>
                {metric.helper}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      ))}
    </Box>
  </Box>
)

const FacetRail = ({
  activeFacet,
  onSelect
}: {
  activeFacet: EnterpriseFacetKey
  onSelect: (facet: EnterpriseFacetKey) => void
}) => (
  <Box
    component='nav'
    aria-label={organizationEnterpriseAria.facetNavigation}
    data-capture='organization-enterprise-facet-rail'
    sx={{ p: { xs: 3, lg: 4 }, borderBlockEnd: { xs: theme => `1px solid ${theme.palette.divider}`, lg: 0 } }}
  >
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: '1fr' },
        gap: 1
      }}
    >
      {workspaceFacets.map(facet => {
        const selected = facet.key === activeFacet

        return (
          <ButtonBase
            key={facet.key}
            data-facet-key={facet.key}
            onClick={() => onSelect(facet.key)}
            aria-pressed={selected}
            sx={theme => ({
              width: '100%',
              scrollMarginBlockStart: { xs: 164, lg: 0 },
              flexShrink: 0,
              justifyContent: 'stretch',
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.34) : 'transparent'}`,
              bgcolor: selected ? 'primary.lighterOpacity' : 'transparent',
              color: selected ? 'primary.dark' : 'text.primary',
              '&:hover': { bgcolor: selected ? 'primary.lighterOpacity' : 'action.hover' },
              '&.Mui-focusVisible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2
              }
            })}
          >
            <Stack direction='row' spacing={2} alignItems='center' sx={{ width: '100%', px: 3, py: 2.5 }}>
              <i className={facet.icon} aria-hidden='true' />
              <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1, textAlign: 'start' }}>
                <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                  <Typography variant='body2' color='inherit'>
                    {facet.labelEs}
                  </Typography>
                  <GreenhouseStatusDot tone={toneToStatus(facet.health)} ariaLabel={`${facet.labelEs}: ${facetStateCopy[facet.state]}`} />
                </Stack>
                <Typography variant='caption' color='text.secondary' noWrap>
                  {facet.count} · {facet.recency}
                </Typography>
              </Stack>
            </Stack>
          </ButtonBase>
        )
      })}
    </Box>
  </Box>
)

const MetricStrip = ({ metrics }: { metrics: EnterpriseMetric[] }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: `repeat(${metrics.length}, minmax(0, 1fr))` },
      border: theme => `1px solid ${theme.palette.divider}`,
      borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
      overflow: 'hidden'
    }}
  >
    {metrics.map((metric, index) => (
      <Box
        key={metric.label}
        sx={{
          p: 4,
          borderInlineStart: { xl: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}` },
          borderBlockStart: { xs: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}`, xl: 0 }
        }}
      >
        <Stack spacing={2}>
          <Stack direction='row' justifyContent='space-between' spacing={2}>
            <Typography variant='body2' color='text.secondary'>
              {metric.label}
            </Typography>
            <Box sx={{ color: `${metric.tone}.main` }}>
              <i className={metric.icon} aria-hidden='true' />
            </Box>
          </Stack>
          <Stack direction='row' spacing={1.5} alignItems='baseline' flexWrap='wrap'>
            <Typography variant='h4'>{metric.value}</Typography>
            {typeof metric.delta === 'number' ? (
              <GreenhouseKpiDelta value={metric.delta} invert={metric.invert} variant='tonal' />
            ) : null}
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {metric.helper}
          </Typography>
        </Stack>
      </Box>
    ))}
  </Box>
)

const DeliveryCanvas = () => (
    <Stack spacing={4} data-capture='organization-enterprise-delivery-canvas'>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.35fr) minmax(320px, 0.9fr)' }, gap: 4 }}>
        <SectionShell title='Velocidad de pipeline' subtitle='Comprometido vs entregado · últimos 6 meses'>
          <Box sx={{ blockSize: 260 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={pipelineData} margin={{ left: -22, right: 18, top: 16, bottom: 0 }}>
                <XAxis dataKey='month' axisLine={false} tickLine={false} stroke='var(--mui-palette-text-secondary)' />
                <YAxis axisLine={false} tickLine={false} stroke='var(--mui-palette-text-secondary)' />
                <RechartsTooltip />
                <Line type='monotone' dataKey='committed' stroke={chartStroke} strokeWidth={2.4} dot={{ r: 3 }} />
                <Line type='monotone' dataKey='delivered' stroke={chartMutedStroke} strokeDasharray='4 4' strokeWidth={2.1} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </SectionShell>

        <SectionShell title='Distribución CSC' subtitle='Esfuerzo por capability de entrega'>
          <CapabilityDistributionChart />
        </SectionShell>
      </Box>

      <ProjectTable />

      <RelatedFacetBridge />

      <Box sx={{ color: 'text.secondary' }}>
        <Typography variant='disclosureText'>
          Reference anchored from Product Design image target: /images/greenhouse/mockups/organization-workspace-enterprise-command-center-reference.png
        </Typography>
      </Box>
    </Stack>
)

const CapabilityDistributionChart = () => (
  <Box
    data-capture='organization-enterprise-csc-distribution'
    sx={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 4,
      alignItems: 'center',
      justifyItems: 'center',
      minBlockSize: 284
    }}
  >
    <Box
      role='img'
      aria-label={organizationEnterpriseAria.cscDistribution}
      sx={{
        inlineSize: { xs: 176, md: 188 },
        aspectRatio: '1 / 1',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <Box
        component='svg'
        viewBox='0 0 112 112'
        sx={{
          display: 'block',
          inlineSize: '100%',
          blockSize: '100%',
          overflow: 'visible'
        }}
      >
        <circle
          cx='56'
          cy='56'
          r='44'
          fill='none'
          stroke='var(--mui-palette-divider)'
          strokeWidth='14'
        />
        {distributionChartArcs.map(arc => (
          <circle
            key={arc.name}
            cx='56'
            cy='56'
            r='44'
            fill='none'
            pathLength='100'
            stroke={arc.color}
            strokeDasharray={`${arc.length} ${100 - arc.length}`}
            strokeDashoffset={-arc.start}
            strokeLinecap='butt'
            strokeWidth='14'
            transform='rotate(-90 56 56)'
          />
        ))}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: '27%',
          borderRadius: '50%',
          bgcolor: 'background.paper',
          border: theme => `1px solid ${theme.palette.divider}`,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          p: 2
        }}
      >
        <Stack spacing={0.25} alignItems='center'>
          <Typography variant='h6'>100%</Typography>
          <Typography variant='caption' color='text.primary'>
            cobertura
          </Typography>
        </Stack>
      </Box>
    </Box>

    <Stack spacing={1.25} sx={{ width: '100%', minWidth: 0 }}>
      {distributionData.map(item => (
        <Box
          key={item.name}
          sx={{
            display: 'grid',
            gridTemplateColumns: '12px minmax(0, 1fr) max-content',
            columnGap: 2.5,
            alignItems: 'center',
            minBlockSize: 28,
            px: 0.5
          }}
        >
          <Box
            aria-hidden='true'
            sx={{
              inlineSize: 10,
              blockSize: 10,
              borderRadius: '50%',
              bgcolor: distributionColorForItem(item)
            }}
          />
          <Typography
            variant='body2'
            sx={{
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {item.name}
          </Typography>
          <Typography variant='monoId'>{item.value}%</Typography>
        </Box>
      ))}
    </Stack>
  </Box>
)

const FinanceCanvas = () => (
  <Stack spacing={4} data-capture='organization-enterprise-finance-canvas'>
    <Box
      sx={{
        p: 3,
        border: theme => `1px solid ${theme.greenhouseSemantic.warning.tonalBorder}`,
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        bgcolor: theme => theme.greenhouseSemantic.warning.tonalSurface
      }}
    >
      <Stack direction='row' spacing={2} alignItems='center'>
        <Box sx={{ color: theme => theme.greenhouseSemantic.warning.tonalText }}>
          <i className='tabler-alert-triangle' aria-hidden='true' />
        </Box>
        <Typography variant='body2' sx={{ color: theme => theme.greenhouseSemantic.warning.tonalText }}>
          Riesgo de margen: el margen neto YTD está por debajo del objetivo. Revisar mix de proyectos y DSO antes de forecast cierre Q2.
        </Typography>
      </Stack>
    </Box>
    <InvoiceTable />
    <PaymentStatus />
    <RelatedFacetBridge />
  </Stack>
)

const ContextFacetCanvas = ({
  activeFacet,
  facetMeta,
  detail
}: {
  activeFacet: Exclude<EnterpriseFacetKey, 'delivery' | 'finance'>
  facetMeta: EnterpriseFacet
  detail: { heading: string; evidence: string[] }
}) => {
  const rows = contextFacetRows[activeFacet]

  return (
    <Stack spacing={4} data-capture={`organization-enterprise-${activeFacet}-canvas`}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' }, gap: 4 }}>
        <SectionShell title={`${facetMeta.labelEs} readiness`} subtitle='Estado canónico, ownership y dependencia visible para todos los consumers'>
          <Stack spacing={3}>
            {rows.map(([title, description, state, owner]) => (
              <Stack key={title} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Typography variant='body2'>{title}</Typography>
                  <Typography variant='caption' color='text.secondary'>{description}</Typography>
                </Stack>
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
                  <GreenhouseChip size='small' variant='label' tone={state === 'Review' || state === 'Partial' ? 'warning' : 'success'} label={state} />
                  <Typography variant='caption' color='text.primary'>{owner}</Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </SectionShell>

        <SectionShell title='Consumer contract' subtitle='Cómo esta facet alimenta finance, delivery, CRM y workforce sin duplicar lógica'>
          <Stack spacing={3}>
            {[
              ['Canonical owner', facetMeta.label],
              ['Coverage', `${facetMeta.count} registros visibles`],
              ['Freshness', facetMeta.recency],
              ['State', facetStateCopy[facetMeta.state]]
            ].map(([label, value]) => (
              <Stack key={label} direction='row' spacing={2} justifyContent='space-between'>
                <Typography variant='caption' color='text.primary'>{label}</Typography>
                <Typography variant='caption' color='text.primary'>{value}</Typography>
              </Stack>
            ))}
            <Box sx={{ borderBlockStart: theme => `1px solid ${theme.palette.divider}`, pt: 3 }}>
              <Stack spacing={2}>
                {detail.evidence.slice(0, 3).map(item => (
                  <Stack key={item} direction='row' spacing={1.5} alignItems='center'>
                    <GreenhouseStatusDot tone='success' ariaLabel={`${item}: disponible`} />
                    <Typography variant='body2'>{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        </SectionShell>
      </Box>

      <RelatedFacetBridge />
    </Stack>
  )
}

const SectionShell = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <Box
    sx={{
      border: theme => `1px solid ${theme.palette.divider}`,
      borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
      overflow: 'hidden',
      bgcolor: 'background.paper'
    }}
  >
    <Stack spacing={0}>
      <Box sx={{ px: 4, py: 3, borderBlockEnd: theme => `1px solid ${theme.palette.divider}` }}>
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {subtitle}
        </Typography>
      </Box>
      <Box sx={{ p: 4 }}>{children}</Box>
    </Stack>
  </Box>
)

const ProjectTable = () => (
  <SectionShell title='Proyectos / Sprints activos' subtitle='Priorizados por riesgo de entrega y dependencia financiera'>
    <DataTableShell identifier='organization-enterprise-projects' ariaLabel={organizationEnterpriseAria.projectsTable} density='compact' stickyFirstColumn>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Nombre</TableCell>
            <TableCell>Espacio</TableCell>
            <TableCell>Fase</TableCell>
            <TableCell>OTD%</TableCell>
            <TableCell>FTR%</TableCell>
            <TableCell>Progreso</TableCell>
            <TableCell>Due date</TableCell>
            <TableCell>Sponsor</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projectRows.map(row => (
            <TableRow key={row.id} hover>
              <TableCell><Typography variant='monoId'>{row.id}</Typography></TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.space}</TableCell>
              <TableCell>{row.phase}</TableCell>
              <TableCell><GreenhouseChip size='small' variant='label' tone={toneToChip(row.tone)} label={row.otd} /></TableCell>
              <TableCell><GreenhouseChip size='small' variant='label' tone={toneToChip(row.tone)} label={row.ftr} /></TableCell>
              <TableCell>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <LinearProgress
                    variant='determinate'
                    value={row.progress}
                    aria-label={`Progreso ${row.name}`}
                    sx={{ flex: 1, minWidth: 56 }}
                  />
                  <Typography variant='caption' color='text.secondary'>{row.progress}%</Typography>
                </Stack>
              </TableCell>
              <TableCell>{row.dueDate}</TableCell>
              <TableCell>{row.sponsor}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  </SectionShell>
)

const InvoiceTable = () => (
  <SectionShell title='Facturas y deuda operacional' subtitle='Resumen agency con salida hacia Finance Clients'>
    <DataTableShell identifier='organization-enterprise-invoices' ariaLabel={organizationEnterpriseAria.invoicesTable} density='compact' stickyFirstColumn>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>Factura</TableCell>
            <TableCell>Proyecto / Servicio</TableCell>
            <TableCell>Emisión</TableCell>
            <TableCell>Vencimiento</TableCell>
            <TableCell align='right'>Monto</TableCell>
            <TableCell align='right'>Saldo</TableCell>
            <TableCell>Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoiceRows.map(row => (
            <TableRow key={row.id} hover>
              <TableCell><Typography variant='monoId'>{row.id}</Typography></TableCell>
              <TableCell>{row.service}</TableCell>
              <TableCell>{row.issuedAt}</TableCell>
              <TableCell>{row.dueAt}</TableCell>
              <TableCell align='right'><Typography variant='monoAmount'>{row.amount}</Typography></TableCell>
              <TableCell align='right'><Typography variant='monoAmount'>{row.balance}</Typography></TableCell>
              <TableCell><GreenhouseChip size='small' variant='label' tone={toneToChip(row.tone)} label={row.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  </SectionShell>
)

const PaymentStatus = () => (
  <SectionShell title='Estado de pagos' subtitle='Lectura resumida para decision support'>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr)) 160px' }, gap: 3, alignItems: 'center' }}>
      {[
        ['Pagado YTD', 'USD 13.8M'],
        ['En curso', 'USD 17.9M'],
        ['Vencido', 'USD 3.1M'],
        ['Próx. 30 días', 'USD 6.2M']
      ].map(([label, value]) => (
        <Stack key={label} spacing={1}>
          <Typography variant='caption' color='text.secondary'>{label}</Typography>
          <Typography variant='h6'>{value}</Typography>
        </Stack>
      ))}
      <Stack spacing={1}>
        <GreenhouseStatusDot tone='success' label='Pagado 40%' />
        <GreenhouseStatusDot tone='primary' label='En curso 52%' />
        <GreenhouseStatusDot tone='error' label='Vencido 8%' />
      </Stack>
    </Box>
  </SectionShell>
)

const RelatedFacetBridge = () => (
  <SectionShell title='Datos relacionados entre facets' subtitle='Puentes visibles para evitar que cada consumer reinvente contexto'>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 0 }}>
      {[
        ['Finanzas', 'Presupuesto YTD', 'USD 24.8M', 'tabler-report-money', 'success'],
        ['Equipo', 'Capacidad disponible', '312 FTE', 'tabler-users', 'info'],
        ['Servicios', 'Servicios activos', '41', 'tabler-tool', 'success'],
        ['Staff Aug.', 'Contratos activos', '8', 'tabler-user-check', 'secondary']
      ].map(([title, helper, value, icon, tone], index) => (
        <Box
          key={title}
          sx={{
            p: 3,
            borderInlineStart: { md: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}` },
            borderBlockStart: { xs: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}`, md: 0 }
          }}
        >
          <Stack spacing={2}>
            <Stack direction='row' spacing={1.5} alignItems='center'>
              <Box sx={{ color: `${tone}.main` }}><i className={icon} aria-hidden='true' /></Box>
              <Typography variant='body2'>{title}</Typography>
            </Stack>
            <Typography variant='caption' color='text.secondary'>{helper}</Typography>
            <Typography variant='h6'>{value}</Typography>
          </Stack>
        </Box>
      ))}
    </Box>
  </SectionShell>
)

const FacetEvidence = ({ detail, activeFacet }: { detail: { evidence: string[] }; activeFacet: EnterpriseFacet }) => (
  <Box
    sx={{
      border: theme => `1px solid ${theme.palette.divider}`,
      borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
      p: 4
    }}
  >
    <Stack spacing={3}>
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
        <Typography variant='h6'>Evidence map</Typography>
        <Typography variant='caption' color='text.secondary'>
          Facet {activeFacet.label} · {activeFacet.recency}
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {detail.evidence.map(item => (
          <Stack key={item} direction='row' spacing={2} alignItems='center'>
            <GreenhouseStatusDot tone='success' ariaLabel={`${item}: disponible`} />
            <Typography variant='body2'>{item}</Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  </Box>
)

const AccountSidecar = () => (
  <Box
    component='aside'
    data-capture='organization-enterprise-sidecar'
    sx={{
      bgcolor: 'background.paper',
      minWidth: 0,
      '& .MuiTypography-caption': {
        color: 'text.primary'
      }
    }}
  >
    <Stack spacing={0}>
      <SidecarSection title='Salud de la cuenta' action='Ver detalle'>
        <Stack spacing={2}>
          {[
            ['Financiera', 'Bueno'],
            ['Operativa', 'Bueno'],
            ['Entrega', 'Bueno'],
            ['Relacional', 'Bueno']
          ].map(([label, value]) => (
            <Stack key={label} direction='row' justifyContent='space-between' alignItems='center'>
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <i className='tabler-circle-dotted' aria-hidden='true' />
                <Typography variant='body2'>{label}</Typography>
              </Stack>
              <GreenhouseStatusDot tone='success' label={value} />
            </Stack>
          ))}
        </Stack>
      </SidecarSection>

      <SidecarSection title='Bloqueadores del ciclo de vida' badge='2'>
        <Stack spacing={3}>
          {blockers.map(blocker => (
            <Stack key={blocker.title} spacing={0.5}>
              <GreenhouseStatusDot tone={toneToStatus(blocker.tone)} label={blocker.title} />
              <Typography variant='caption' color='text.secondary' sx={{ pl: 3 }}>
                {blocker.helper}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </SidecarSection>

      <SidecarSection title='Readiness' action='6 / 9'>
        <Stack spacing={2}>
          {readinessSteps.map(step => (
            <Stack key={step.label} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
              <GreenhouseStatusDot tone={toneToStatus(step.tone)} label={step.label} />
              <Typography variant='caption' color='text.secondary'>{step.state}</Typography>
            </Stack>
          ))}
        </Stack>
      </SidecarSection>

      <SidecarSection title='Procedencia de datos' action='Ver linaje'>
        <Stack spacing={1.5}>
          {[
            ['Sistema fuente', 'AXIS Core'],
            ['Última sincronización', 'Hoy 08:35'],
            ['Cobertura', '98%'],
            ['Cache 360', 'fresh']
          ].map(([label, value]) => (
            <Stack key={label} direction='row' justifyContent='space-between' spacing={2}>
              <Typography variant='caption' color='text.secondary'>{label}</Typography>
              <Typography variant='caption'>{value}</Typography>
            </Stack>
          ))}
        </Stack>
      </SidecarSection>

      <SidecarSection title='Señales recientes' action='Historial'>
        <Stack spacing={3}>
          {accountSignals.map(signal => (
            <Stack key={signal.title} direction='row' spacing={2} alignItems='flex-start'>
              <Box sx={{ color: `${signal.tone}.main`, pt: 0.5 }}>
                <i className={signal.icon} aria-hidden='true' />
              </Box>
              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant='body2'>{signal.title}</Typography>
                <Typography variant='caption' color='text.secondary'>{signal.helper}</Typography>
              </Stack>
              <Typography variant='caption' color='text.secondary'>{signal.date}</Typography>
            </Stack>
          ))}
        </Stack>
      </SidecarSection>

      <SidecarSection title='Próximas acciones'>
        <Stack spacing={2}>
          {['Revisión QBR', 'Aprobación presupuesto Q3', 'Renovación contratos clave'].map((item, index) => (
            <Stack key={item} direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <i className='tabler-calendar-event' aria-hidden='true' />
                <Typography variant='body2'>{item}</Typography>
              </Stack>
              <Typography variant='caption' color='text.secondary'>{['15 Jun', '20 Jun', '31 Jun'][index]}</Typography>
            </Stack>
          ))}
        </Stack>
      </SidecarSection>
    </Stack>
  </Box>
)

const SidecarSection = ({
  title,
  action,
  badge,
  children
}: {
  title: string
  action?: string
  badge?: string
  children: ReactNode
}) => (
  <Box sx={{ px: 4, py: 4, borderBlockEnd: theme => `1px solid ${theme.palette.divider}` }}>
    <Stack spacing={3}>
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Typography variant='h6'>{title}</Typography>
          {badge ? <GreenhouseChip size='small' variant='label' tone='error' label={badge} /> : null}
        </Stack>
        {action ? (
          <Typography variant='caption' color='primary.main'>
            {action}
          </Typography>
        ) : null}
      </Stack>
      {children}
    </Stack>
  </Box>
)

export default OrganizationWorkspaceEnterpriseDetailMockupView
