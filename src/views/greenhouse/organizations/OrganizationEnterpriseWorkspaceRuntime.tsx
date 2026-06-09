'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from '@/libs/Recharts'

import {
  formatCurrency as formatGreenhouseCurrency,
  formatDateTime,
  formatNumber
} from '@/lib/format'
import { getMicrocopy } from '@/lib/copy'
import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'
import { DataTableShell } from '@/components/greenhouse/data-table'
import OrganizationLogoAvatarEditor from '@/components/greenhouse/organization-workspace/OrganizationLogoAvatarEditor'
import {
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseKpiDelta,
  GreenhouseStatusDot
} from '@/components/greenhouse/primitives'

import type {
  OrganizationFacet,
  OrganizationWorkspaceProjection
} from '@/components/greenhouse/organization-workspace/types'
import type {
  AccountComplete360,
  AccountEconomicsTrendPoint
} from '@/types/account-complete-360'

import type { OrganizationDetailData, OrganizationFinanceSummary } from './types'

type EnterpriseTone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

const COMMON_ARIA = getMicrocopy('es-CL').aria

type OrgKpis = {
  revenueClp: number
  grossMarginPct: number | null
  headcountFte: number | null
}

type OrganizationProjectsSummary = {
  organizationId: string
  spaces: Array<{
    spaceId: string
    spaceName: string
    clientId: string
    hasNotionSource: boolean
    healthScore: number
    projects: Array<{
      notionPageId: string
      projectName: string
      status: string
      totalTasks: number
      activeTasks: number
      completedTasks: number
      avgRpa: number
      openReviewItems: number
      pageUrl: string | null
    }>
  }>
  totals: {
    totalProjects: number
    activeProjects: number
    totalTasks: number
    activeTasks: number
    completedTasks: number
    avgRpa: number
    overallHealth: 'green' | 'yellow' | 'red'
  }
}

type RuntimeDataState =
  | { status: 'loading'; data360: null; projects: null; financeSummary: null; error: null }
  | {
      status: 'ready'
      data360: AccountComplete360 | null
      projects: OrganizationProjectsSummary | null
      financeSummary: OrganizationFinanceSummary | null
      error: string | null
    }

type Props = {
  organizationId: string
  detail: OrganizationDetailData
  kpis: OrgKpis | null
  projection: OrganizationWorkspaceProjection
  activeFacet: OrganizationFacet | null
  onFacetChange: (facet: OrganizationFacet) => void
  adminActions?: ReactNode
  canEditLogo?: boolean
  onLogoUpdated?: () => void | Promise<void>
  headerBanner?: ReactNode
  drawerSlot?: ReactNode
}

type EnterpriseMetric = {
  label: string
  value: string
  helper: string
  icon: string
  tone: Exclude<EnterpriseTone, 'neutral'>
  delta?: number
  invert?: boolean
}

const FACET_ICONS: Record<OrganizationFacet, string> = {
  identity: 'tabler-user-square-rounded',
  spaces: 'tabler-cube',
  team: 'tabler-users',
  economics: 'tabler-chart-histogram',
  delivery: 'tabler-send',
  finance: 'tabler-report-money',
  crm: 'tabler-briefcase',
  services: 'tabler-tool',
  staffAug: 'tabler-user-check'
}

const FACET_DESCRIPTIONS: Record<OrganizationFacet, string> = {
  identity: 'Ficha legal, marca, HubSpot y mapeos canónicos para que el resto de facets no repita ownership.',
  spaces: 'Spaces operativos, clientes puente y mapeos de trabajo asociados a esta organización.',
  team: 'Roster, dedicación, roles y capacidad visible para entender si delivery y finance tienen base operativa.',
  economics: 'Márgenes, contribución, mix de costos y sensibilidad operacional sin duplicar el ledger de Finanzas.',
  delivery: 'Calidad, throughput, pipeline y proyectos activos. Esta vista es el default recomendado para Agency.',
  finance: 'Resumen financiero para Agency con puente a la vista rica de Finance Clients cuando se requiere operación.',
  crm: 'Contactos, deals, pipeline y sincronización HubSpot como contexto, no como único source of truth.',
  services: 'Catálogo de servicios, cobertura activa y consumo por engagement.',
  staffAug: 'Placements, contratos externos y baseline de capacidad aumentada con estado honesto de implementación.'
}

const STATUS_COLOR: Record<string, EnterpriseTone> = {
  active: 'success',
  inactive: 'neutral',
  prospect: 'warning',
  churned: 'error'
}

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '🇨🇱',
  CO: '🇨🇴',
  VE: '🇻🇪',
  MX: '🇲🇽',
  PE: '🇵🇪',
  US: '🇺🇸',
  AR: '🇦🇷',
  BR: '🇧🇷',
  EC: '🇪🇨'
}

const fmtClp = (n: number | null | undefined): string => {
  if (n == null) return 'Sin datos'

  return formatGreenhouseCurrency(n, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')
}

const fmtPct = (value: number | null | undefined, fallback = 'Sin datos') =>
  value == null ? fallback : `${Math.round(value * 10) / 10}%`

const fmtCompact = (value: number | null | undefined, suffix = '') =>
  value == null ? 'Sin datos' : `${formatNumber(value, { maximumFractionDigits: 1 }, 'es-CL')}${suffix}`

const resolveStatusLabel = (status: string): string => {
  const copy = GH_ORGANIZATION_WORKSPACE.shell.status

  if (status === 'active') return copy.active
  if (status === 'inactive') return copy.inactive
  if (status === 'prospect') return copy.prospect
  if (status === 'churned') return copy.churned

  return copy.unknown
}

const lastClosedPeriod = () => {
  const today = new Date()
  const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

  return {
    year: lastMonth.getFullYear(),
    month: lastMonth.getMonth() + 1,
    asOf: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastMonth.getDate()).padStart(2, '0')}`
  }
}

const metricToneFromMargin = (margin: number | null | undefined): Exclude<EnterpriseTone, 'neutral'> => {
  if (margin == null) return 'secondary'
  if (margin >= 30) return 'success'
  if (margin >= 15) return 'warning'

  return 'error'
}

const facetStateTone = (tone: EnterpriseTone) => (tone === 'neutral' ? 'secondary' : tone)

const getFacetTone = (facet: OrganizationFacet, data360: AccountComplete360 | null, detail: OrganizationDetailData): EnterpriseTone => {
  if (!data360) return 'warning'

  if (facet === 'identity') return data360.identity ? 'success' : 'warning'
  if (facet === 'spaces') return detail.spaceCount > 0 ? 'success' : 'warning'
  if (facet === 'team') return (data360.team?.totalMembers ?? detail.uniquePersonCount) > 0 ? 'success' : 'warning'
  if (facet === 'economics') return data360.economics?.currentPeriod ? metricToneFromMargin(data360.economics.currentPeriod.grossMarginPct) : 'warning'
  if (facet === 'delivery') return data360.delivery?.icoMetrics || data360.delivery?.projectCount ? 'success' : 'warning'
  if (facet === 'finance') return data360.finance ? ((data360.finance.outstandingAmount ?? 0) > 0 ? 'warning' : 'success') : 'warning'
  if (facet === 'crm') return data360.crm?.company ? 'success' : 'warning'
  if (facet === 'services') return (data360.services?.totalActiveCount ?? 0) > 0 ? 'success' : 'warning'
  if (facet === 'staffAug') return (data360.staffAug?.activePlacementCount ?? 0) > 0 ? 'success' : 'info'

  return 'warning'
}

const getFacetCount = (facet: OrganizationFacet, data360: AccountComplete360 | null, detail: OrganizationDetailData): string => {
  if (facet === 'identity') {
    const identityFields = [detail.legalName, detail.taxId, detail.industry, detail.country, detail.hubspotCompanyId, detail.logoUrl, detail.websiteUrl]

    return String(identityFields.filter(Boolean).length)
  }

  if (facet === 'spaces') return String(detail.spaceCount)
  if (facet === 'team') return String(data360?.team?.totalMembers ?? detail.uniquePersonCount)
  if (facet === 'economics') return String(data360?.economics?.byClient?.length ?? 0)
  if (facet === 'delivery') return String(data360?.delivery?.activeProjectCount ?? data360?.delivery?.projectCount ?? 0)
  if (facet === 'finance') return String(data360?.finance?.invoiceCount ?? data360?.finance?.clientProfiles?.length ?? 0)
  if (facet === 'crm') return String((data360?.crm?.dealCount ?? 0) + (data360?.crm?.contactCount ?? 0))
  if (facet === 'services') return String(data360?.services?.totalActiveCount ?? 0)
  if (facet === 'staffAug') return String(data360?.staffAug?.activePlacementCount ?? 0)

  return '0'
}

const buildDistribution = (data360: AccountComplete360 | null, detail: OrganizationDetailData) => {
  const serviceDistribution = data360?.services?.byBusinessLine

  if (serviceDistribution && Object.keys(serviceDistribution).length > 0) {
    return Object.entries(serviceDistribution)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({ name, value, tone: ['primary', 'info', 'warning', 'success', 'error', 'secondary'][index] as EnterpriseTone }))
  }

  const departmentCounts = new Map<string, number>()

  for (const person of detail.people ?? []) {
    const key = person.department || person.roleLabel || person.membershipType || 'Sin clasificar'

    departmentCounts.set(key, (departmentCounts.get(key) ?? 0) + 1)
  }

  return Array.from(departmentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], index) => ({ name, value, tone: ['primary', 'info', 'warning', 'success', 'error', 'secondary'][index] as EnterpriseTone }))
}

const buildDistributionArcs = (items: Array<{ name: string; value: number; tone: EnterpriseTone }>) => {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  let start = 0

  return items.map(item => {
    const pct = total > 0 ? (item.value / total) * 100 : 0
    const gap = total > 0 ? 1.2 : 0

    const arc = {
      ...item,
      percent: pct,
      start: start + gap / 2,
      length: Math.max(pct - gap, 0)
    }

    start += pct

    return arc
  })
}

const chartColorForTone = (tone: EnterpriseTone) => {
  if (tone === 'neutral') return 'var(--mui-palette-text-disabled)'
  if (tone === 'secondary') return 'var(--mui-palette-secondary-main)'

  return `var(--mui-palette-${tone}-main)`
}

const normalizeTrendRows = (trend: AccountEconomicsTrendPoint[] | undefined) =>
  (trend ?? []).map(point => ({
    label: `${String(point.month).padStart(2, '0')}/${String(point.year).slice(-2)}`,
    revenue: point.revenueCLP,
    margin: point.grossMarginCLP
  }))

const OrganizationEnterpriseWorkspaceRuntime = ({
  organizationId,
  detail,
  kpis,
  projection,
  activeFacet,
  onFacetChange,
  adminActions,
  canEditLogo,
  onLogoUpdated,
  headerBanner,
  drawerSlot
}: Props) => {
  const [runtime, setRuntime] = useState<RuntimeDataState>({
    status: 'loading',
    data360: null,
    projects: null,
    financeSummary: null,
    error: null
  })

  const period = useMemo(lastClosedPeriod, [])

  useEffect(() => {
    let cancelled = false

    setRuntime({ status: 'loading', data360: null, projects: null, financeSummary: null, error: null })

    Promise.allSettled([
      fetch(`/api/organization/${organizationId}/360?facets=identity,spaces,team,economics,delivery,finance,crm,services,staffAug&asOf=${period.asOf}&limit=20`, { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<AccountComplete360> : null),
      fetch(`/api/organizations/${organizationId}/projects`, { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<OrganizationProjectsSummary> : null),
      fetch(`/api/organizations/${organizationId}/finance?year=${period.year}&month=${period.month}`, { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<OrganizationFinanceSummary> : null)
    ]).then(results => {
      if (cancelled) return

      const [data360Result, projectsResult, financeResult] = results

      setRuntime({
        status: 'ready',
        data360: data360Result.status === 'fulfilled' ? data360Result.value : null,
        projects: projectsResult.status === 'fulfilled' ? projectsResult.value : null,
        financeSummary: financeResult.status === 'fulfilled' ? financeResult.value : null,
        error: results.some(result => result.status === 'rejected') ? 'partial_fetch_failed' : null
      })
    })

    return () => {
      cancelled = true
    }
  }, [organizationId, period.asOf, period.month, period.year])

  const data360 = runtime.status === 'ready' ? runtime.data360 : null
  const visibleTabs = projection.visibleTabs
  const fallbackFacet: OrganizationFacet = projection.defaultFacet ?? projection.visibleFacets[0] ?? 'identity'
  const effectiveFacet: OrganizationFacet = activeFacet && projection.visibleFacets.includes(activeFacet) ? activeFacet : fallbackFacet
  const activeLabel = visibleTabs.find(tab => tab.facet === effectiveFacet)?.label ?? GH_ORGANIZATION_WORKSPACE.facets.labels[effectiveFacet]
  const activeTone = getFacetTone(effectiveFacet, data360, detail)

  const topMetrics = useMemo<EnterpriseMetric[]>(() => {
    const current = data360?.economics?.currentPeriod
    const finance = data360?.finance

    return [
      {
        label: 'Revenue período',
        value: fmtClp(current?.revenueCLP ?? kpis?.revenueClp),
        helper: current ? `${period.month}/${period.year}` : '360 parcial',
        icon: 'tabler-coins',
        tone: 'secondary'
      },
      {
        label: 'Margen bruto',
        value: fmtPct(current?.grossMarginPct ?? kpis?.grossMarginPct),
        helper: current?.periodClosed ? 'período cerrado' : 'período abierto',
        icon: 'tabler-trending-up',
        tone: metricToneFromMargin(current?.grossMarginPct ?? kpis?.grossMarginPct)
      },
      {
        label: 'FTE total',
        value: fmtCompact(current?.headcountFte ?? data360?.team?.totalFte ?? kpis?.headcountFte),
        helper: `${data360?.team?.totalMembers ?? detail.uniquePersonCount} personas`,
        icon: 'tabler-users',
        tone: 'info'
      },
      {
        label: 'Saldo pendiente',
        value: fmtClp(finance?.outstandingAmount ?? null),
        helper: finance ? `${finance.invoiceCount} facturas` : 'Finance 360 parcial',
        icon: 'tabler-file-invoice',
        tone: finance && finance.outstandingAmount > 0 ? 'warning' : 'primary'
      }
    ]
  }, [data360, detail.uniquePersonCount, kpis, period.month, period.year])

  const facetMetrics = useMemo<EnterpriseMetric[]>(() => {
    const current = data360?.economics?.currentPeriod
    const delivery = data360?.delivery
    const finance = data360?.finance
    const services = data360?.services
    const crm = data360?.crm
    const staffAug = data360?.staffAug

    if (effectiveFacet === 'delivery') {
      return [
        { label: 'OTD%', value: fmtPct(delivery?.icoMetrics?.otdPct), helper: 'entrega en fecha', icon: 'tabler-clock-check', tone: 'success' },
        { label: 'FTR%', value: fmtPct(delivery?.icoMetrics?.ftrPct), helper: 'first time right', icon: 'tabler-target-arrow', tone: 'success' },
        { label: 'Throughput', value: fmtCompact(delivery?.icoMetrics?.throughputCount), helper: 'tareas período', icon: 'tabler-rocket', tone: 'primary' },
        { label: 'Activos bloqueados', value: fmtCompact(delivery?.icoMetrics?.stuckAssetCount), helper: 'requieren revisión', icon: 'tabler-alert-circle', tone: delivery?.icoMetrics?.stuckAssetCount ? 'warning' : 'secondary' }
      ]
    }

    if (effectiveFacet === 'finance') {
      return [
        { label: 'Ingreso YTD', value: fmtClp(finance?.revenueYTD ?? runtime.financeSummary?.totalRevenueClp), helper: 'Finance 360', icon: 'tabler-cash-banknote', tone: 'success' },
        { label: 'Saldo pendiente', value: fmtClp(finance?.outstandingAmount), helper: 'AR summary', icon: 'tabler-alert-circle', tone: finance?.outstandingAmount ? 'warning' : 'success' },
        { label: 'Facturas emitidas', value: fmtCompact(finance?.invoiceCount), helper: 'año comercial', icon: 'tabler-file-invoice', tone: 'info' },
        { label: 'Cobertura DTE', value: fmtPct(finance?.dteCoverage?.coveredPct), helper: `${finance?.dteCoverage?.uncoveredCount ?? 0} sin cubrir`, icon: 'tabler-shield-check', tone: finance?.dteCoverage?.coveredPct && finance.dteCoverage.coveredPct >= 90 ? 'success' : 'warning' }
      ]
    }

    return [
      { label: 'Cobertura facet', value: getFacetCount(effectiveFacet, data360, detail), helper: activeLabel, icon: FACET_ICONS[effectiveFacet], tone: facetStateTone(activeTone) as Exclude<EnterpriseTone, 'neutral'> },
      { label: 'Estado canónico', value: activeTone === 'success' ? 'Listo' : activeTone === 'warning' ? 'Parcial' : 'Planificado', helper: 'visibility via projection', icon: 'tabler-shield-check', tone: facetStateTone(activeTone) as Exclude<EnterpriseTone, 'neutral'> },
      { label: 'Revenue período', value: fmtClp(current?.revenueCLP), helper: 'puente economía', icon: 'tabler-chart-histogram', tone: 'secondary' },
      { label: 'Puentes activos', value: String([finance, services, crm, staffAug].filter(Boolean).length), helper: 'finance · services · CRM · workforce', icon: 'tabler-git-branch', tone: 'info' }
    ]
  }, [activeLabel, activeTone, data360, detail, effectiveFacet, runtime.financeSummary])

  if (projection.degradedMode) {
    return (
      <>
        <SectionShell title={GH_ORGANIZATION_WORKSPACE.shell.degraded.title} subtitle={GH_ORGANIZATION_WORKSPACE.shell.degraded.reasons.unknown}>
          <Typography variant='body2' color='text.secondary'>
            {projection.degradedReason ?? 'unknown'}
          </Typography>
        </SectionShell>
        {drawerSlot}
      </>
    )
  }

  return (
    <>
      <Box data-capture='organization-workspace-enterprise-runtime'>
        <Stack spacing={0} sx={{ bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}` }}>
          <Box data-capture='organization-enterprise-reference-anchor' sx={visuallyHiddenSx}>
            Runtime promoted from approved mockup: /agency/organizations/mockup/enterprise-detail
          </Box>
          {headerBanner}
          <OrganizationMasthead
            detail={detail}
            adminActions={adminActions}
            canEditLogo={canEditLogo}
            onLogoUpdated={onLogoUpdated}
          />
          <MetricRail metrics={topMetrics} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xl: '224px minmax(0, 1fr) 336px' },
              minHeight: { xs: 'auto', xl: 656 },
              borderBlockStart: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <FacetRail
              projection={projection}
              detail={detail}
              data360={data360}
              activeFacet={effectiveFacet}
              onSelect={onFacetChange}
            />
            <Box
              component='main'
              data-capture='organization-enterprise-main-canvas'
              sx={{
                minWidth: 0,
                borderInlineStart: { xl: theme => `1px solid ${theme.palette.divider}` },
                borderInlineEnd: { xl: theme => `1px solid ${theme.palette.divider}` }
              }}
            >
              <Box sx={{ px: { xs: 4, md: 5 }, py: { xs: 4, md: 5 } }}>
                <Stack spacing={4}>
                  <FacetHeader
                    label={activeLabel}
                    description={FACET_DESCRIPTIONS[effectiveFacet]}
                    tone={activeTone}
                    loading={runtime.status === 'loading'}
                  />
                  <MetricStrip metrics={facetMetrics} />
                  {effectiveFacet === 'delivery' ? (
                    <DeliveryCanvas detail={detail} data360={data360} projects={runtime.projects} />
                  ) : effectiveFacet === 'finance' ? (
                    <FinanceCanvas data360={data360} financeSummary={runtime.financeSummary} />
                  ) : (
                    <ContextFacetCanvas facet={effectiveFacet} detail={detail} data360={data360} tone={activeTone} />
                  )}
                  <EvidenceMap facet={effectiveFacet} data360={data360} partial={Boolean(runtime.error)} />
                </Stack>
              </Box>
            </Box>
            <AccountSidecar detail={detail} data360={data360} partial={runtime.status === 'loading' || Boolean(runtime.error)} />
          </Box>
        </Stack>
      </Box>
      {drawerSlot}
    </>
  )
}

const OrganizationMasthead = ({
  detail,
  adminActions,
  canEditLogo,
  onLogoUpdated
}: {
  detail: OrganizationDetailData
  adminActions?: ReactNode
  canEditLogo?: boolean
  onLogoUpdated?: () => void | Promise<void>
}) => {
  const theme = useTheme()
  const flag = detail.country ? (COUNTRY_FLAGS[detail.country] ?? '') : ''
  const statusTone = STATUS_COLOR[detail.status] ?? 'neutral'

  const fallbackInitials =
    detail.organizationName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'OR'

  return (
    <Box data-capture='organization-enterprise-masthead' sx={{ px: { xs: 4, md: 6 }, py: { xs: 4, md: 5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
        <Stack direction='row' spacing={4} alignItems='center' sx={{ minWidth: 0 }}>
          <Box
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
            <OrganizationLogoAvatarEditor
              organizationId={detail.organizationId}
              organizationName={detail.organizationName}
              logoUrl={detail.logoUrl}
              fallbackInitials={fallbackInitials}
              editable={Boolean(canEditLogo)}
              isOperatingEntity={detail.isOperatingEntity}
              size={64}
              onUpdated={onLogoUpdated}
            />
          </Box>
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack direction='row' alignItems='center' spacing={2} flexWrap='wrap'>
              <Typography variant='surfaceHeroTitle' sx={{ overflowWrap: 'anywhere' }}>
                {detail.organizationName}
              </Typography>
              <GreenhouseStatusDot tone={statusTone} label={resolveStatusLabel(detail.status)} halo={statusTone === 'success'} />
            </Stack>
            <Stack direction='row' spacing={2.5} alignItems='center' flexWrap='wrap'>
              {detail.country ? <MetaItem icon='tabler-map-pin' label={`${flag ? `${flag} ` : ''}${detail.country}`} /> : null}
              {detail.industry ? <MetaItem icon='tabler-building-skyscraper' label={detail.industry} /> : null}
              {detail.publicId ? <MetaItem icon='tabler-id' label={detail.publicId} /> : null}
              {detail.websiteUrl ? <MetaItem icon='tabler-world' label={detail.websiteUrl.replace(/^https?:\/\//, '')} tone='primary' /> : null}
              <MetaItem icon='tabler-database' label={detail.hubspotCompanyId ? 'Source: HubSpot + AXIS Core' : 'Source: AXIS Core'} />
            </Stack>
          </Stack>
        </Stack>
        <Stack direction='row' spacing={2} alignItems='center'>
          {adminActions}
          <IconButton
            aria-label={COMMON_ARIA.moreActions}
            size='small'
            sx={{
              border: theme => `1px solid ${theme.palette.divider}`,
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
            }}
          >
            <i className='tabler-dots-vertical' aria-hidden='true' />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  )
}

const MetaItem = ({ icon, label, tone = 'secondary' }: { icon: string; label: string; tone?: 'secondary' | 'primary' }) => (
  <Stack direction='row' spacing={1} alignItems='center' sx={{ color: tone === 'primary' ? 'primary.main' : 'text.secondary', minWidth: 0 }}>
    <i className={icon} aria-hidden='true' />
    <Typography variant='body2' color={tone === 'primary' ? 'primary.main' : 'text.secondary'} sx={{ overflowWrap: 'anywhere' }}>
      {label}
    </Typography>
  </Stack>
)

const MetricRail = ({ metrics }: { metrics: EnterpriseMetric[] }) => (
  <Box sx={{ borderBlockStart: theme => `1px solid ${theme.palette.divider}` }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: `repeat(${metrics.length}, minmax(0, 1fr))` } }}>
      {metrics.map((metric, index) => (
        <Box
          key={metric.label}
          sx={{
            px: { xs: 4, md: 6 },
            py: 3,
            borderInlineStart: { lg: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}` },
            borderBlockStart: { xs: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}`, lg: 0 }
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
                {typeof metric.delta === 'number' ? <GreenhouseKpiDelta value={metric.delta} invert={metric.invert} /> : null}
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
  projection,
  detail,
  data360,
  activeFacet,
  onSelect
}: {
  projection: OrganizationWorkspaceProjection
  detail: OrganizationDetailData
  data360: AccountComplete360 | null
  activeFacet: OrganizationFacet
  onSelect: (facet: OrganizationFacet) => void
}) => (
  <Box component='nav' aria-label={GH_ORGANIZATION_WORKSPACE.shell.tabs.ariaLabel} data-capture='organization-enterprise-facet-rail' sx={{ p: { xs: 3, lg: 4 }, borderBlockEnd: { xs: theme => `1px solid ${theme.palette.divider}`, xl: 0 } }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', xl: '1fr' }, gap: 1 }}>
      {projection.visibleTabs.map(tab => {
        const selected = tab.facet === activeFacet
        const tone = getFacetTone(tab.facet, data360, detail)

        return (
          <ButtonBase
            key={tab.facet}
            data-facet-key={tab.facet}
            onClick={() => onSelect(tab.facet)}
            aria-pressed={selected}
            sx={theme => ({
              width: '100%',
              scrollMarginBlockStart: { xs: 164, lg: 0 },
              justifyContent: 'stretch',
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${selected ? `var(--mui-palette-primary-main)` : 'transparent'}`,
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
              <i className={FACET_ICONS[tab.facet]} aria-hidden='true' />
              <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1, textAlign: 'start' }}>
                <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
                  <Typography variant='body2' color='inherit'>
                    {tab.label}
                  </Typography>
                  <GreenhouseStatusDot tone={tone} ariaLabel={`${tab.label}: ${tone}`} />
                </Stack>
                <Typography variant='caption' color='text.secondary' noWrap>
                  {getFacetCount(tab.facet, data360, detail)} · {data360?._meta.resolvedAt ? '360' : 'parcial'}
                </Typography>
              </Stack>
            </Stack>
          </ButtonBase>
        )
      })}
    </Box>
  </Box>
)

const FacetHeader = ({
  label,
  description,
  tone,
  loading
}: {
  label: string
  description: string
  tone: EnterpriseTone
  loading: boolean
}) => (
  <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' spacing={3}>
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
        <Typography variant='h4'>{label}</Typography>
        <GreenhouseChip
          kind='status'
          size='small'
          variant='label'
          tone={facetStateTone(tone)}
          label={loading ? 'Cargando' : tone === 'success' ? 'Listo' : tone === 'warning' ? 'Parcial' : 'Planificado'}
          sx={{ minInlineSize: 82 }}
        />
      </Stack>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
        {description}
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
            <Typography variant='body2' color='text.secondary'>{metric.label}</Typography>
            <Box sx={{ color: `${metric.tone}.main` }}><i className={metric.icon} aria-hidden='true' /></Box>
          </Stack>
          <Stack direction='row' spacing={1.5} alignItems='baseline' flexWrap='wrap'>
            <Typography variant='h4'>{metric.value}</Typography>
            {typeof metric.delta === 'number' ? <GreenhouseKpiDelta value={metric.delta} invert={metric.invert} variant='tonal' /> : null}
          </Stack>
          <Typography variant='caption' color='text.secondary'>{metric.helper}</Typography>
        </Stack>
      </Box>
    ))}
  </Box>
)

const DeliveryCanvas = ({ detail, data360, projects }: { detail: OrganizationDetailData; data360: AccountComplete360 | null; projects: OrganizationProjectsSummary | null }) => {
  const trendRows = normalizeTrendRows(data360?.economics?.trend)
  const distribution = buildDistribution(data360, detail)

  return (
    <Stack spacing={4} data-capture='organization-enterprise-delivery-canvas'>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.35fr) minmax(320px, 0.9fr)' }, gap: 4 }}>
        <SectionShell title='Tendencia operacional' subtitle='Revenue vs margen como proxy ejecutivo mientras delivery trend se materializa'>
          {trendRows.length > 1 ? (
            <Box sx={{ blockSize: 260 }}>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={trendRows} margin={{ left: -22, right: 18, top: 16, bottom: 0 }}>
                  <XAxis dataKey='label' axisLine={false} tickLine={false} stroke='var(--mui-palette-text-secondary)' />
                  <YAxis axisLine={false} tickLine={false} stroke='var(--mui-palette-text-secondary)' />
                  <RechartsTooltip />
                  <Line type='monotone' dataKey='revenue' stroke='var(--mui-palette-primary-main)' strokeWidth={2.4} dot={{ r: 3 }} />
                  <Line type='monotone' dataKey='margin' stroke='var(--mui-palette-text-disabled)' strokeDasharray='4 4' strokeWidth={2.1} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <PartialState text='Aún no hay tendencia mensual suficiente para graficar delivery.' />
          )}
        </SectionShell>
        <SectionShell title='Distribución CSC' subtitle='Derivada de servicios o equipo disponible'>
          <CapabilityDistributionChart items={distribution} />
        </SectionShell>
      </Box>
      <ProjectTable projects={projects} />
      <RelatedFacetBridge data360={data360} />
    </Stack>
  )
}

const CapabilityDistributionChart = ({ items }: { items: Array<{ name: string; value: number; tone: EnterpriseTone }> }) => {
  const arcs = buildDistributionArcs(items)

  if (items.length === 0) {
    return <PartialState text='Sin distribución suficiente para CSC. Se mostrará cuando existan servicios o equipo clasificado.' />
  }

  return (
    <Box data-capture='organization-enterprise-csc-distribution' sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, alignItems: 'center', justifyItems: 'center', minBlockSize: 284 }}>
      <Box role='img' aria-label={GH_ORGANIZATION_WORKSPACE.enterprise.aria.cscDistribution} sx={{ inlineSize: { xs: 176, md: 188 }, aspectRatio: '1 / 1', position: 'relative', flexShrink: 0 }}>
        <Box component='svg' viewBox='0 0 112 112' sx={{ display: 'block', inlineSize: '100%', blockSize: '100%', overflow: 'visible' }}>
          <circle cx='56' cy='56' r='44' fill='none' stroke='var(--mui-palette-divider)' strokeWidth='14' />
          {arcs.map(arc => (
            <circle
              key={arc.name}
              cx='56'
              cy='56'
              r='44'
              fill='none'
              pathLength='100'
              stroke={chartColorForTone(arc.tone)}
              strokeDasharray={`${arc.length} ${100 - arc.length}`}
              strokeDashoffset={-arc.start}
              strokeLinecap='butt'
              strokeWidth='14'
              transform='rotate(-90 56 56)'
            />
          ))}
        </Box>
        <Box sx={{ position: 'absolute', inset: '27%', borderRadius: '50%', bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}`, display: 'grid', placeItems: 'center', textAlign: 'center', p: 2 }}>
          <Stack spacing={0.25} alignItems='center'>
            <Typography variant='h6'>100%</Typography>
            <Typography variant='caption' color='text.primary'>cobertura</Typography>
          </Stack>
        </Box>
      </Box>
      <Stack spacing={1.25} sx={{ width: '100%', minWidth: 0 }}>
        {arcs.map(item => (
          <Box key={item.name} sx={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr) max-content', columnGap: 2.5, alignItems: 'center', minBlockSize: 28, px: 0.5 }}>
            <Box aria-hidden='true' sx={{ inlineSize: 10, blockSize: 10, borderRadius: '50%', bgcolor: chartColorForTone(item.tone) }} />
            <Typography variant='body2' sx={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</Typography>
            <Typography variant='monoId'>{Math.round(item.percent)}%</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

const ProjectTable = ({ projects }: { projects: OrganizationProjectsSummary | null }) => {
  const rows = projects?.spaces.flatMap(space => space.projects.map(project => ({ ...project, spaceName: space.spaceName }))).slice(0, 8) ?? []

  return (
    <SectionShell title='Proyectos / Sprints activos' subtitle='Priorizados por riesgo de entrega y dependencia financiera'>
      {rows.length === 0 ? (
        <PartialState text='Sin proyectos activos disponibles desde Notion/Delivery para esta organización.' />
      ) : (
        <DataTableShell identifier='organization-enterprise-projects' ariaLabel='Proyectos activos de la organización' density='compact' stickyFirstColumn>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Space</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>RpA</TableCell>
                <TableCell>Progreso</TableCell>
                <TableCell>Review</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(row => {
                const progress = row.totalTasks > 0 ? Math.round((row.completedTasks / row.totalTasks) * 100) : 0

                return (
                  <TableRow key={row.notionPageId} hover>
                    <TableCell><Typography variant='monoId'>{row.notionPageId.slice(0, 8)}</Typography></TableCell>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{row.spaceName}</TableCell>
                    <TableCell><GreenhouseChip size='small' variant='label' tone={row.status === 'done' ? 'success' : 'info'} label={row.status} /></TableCell>
                    <TableCell>{fmtCompact(row.avgRpa)}</TableCell>
                    <TableCell>
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <LinearProgress variant='determinate' value={progress} aria-label={`Progreso ${row.projectName}`} sx={{ flex: 1, minWidth: 56 }} />
                        <Typography variant='caption' color='text.secondary'>{progress}%</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{row.openReviewItems}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </SectionShell>
  )
}

const FinanceCanvas = ({ data360, financeSummary }: { data360: AccountComplete360 | null; financeSummary: OrganizationFinanceSummary | null }) => {
  const finance = data360?.finance
  const rows = financeSummary?.clients ?? []

  return (
    <Stack spacing={4} data-capture='organization-enterprise-finance-canvas'>
      <Box sx={{ p: 3, border: theme => `1px solid ${theme.greenhouseSemantic.warning.tonalBorder}`, borderRadius: theme => `${theme.shape.customBorderRadius.md}px`, bgcolor: theme => theme.greenhouseSemantic.warning.tonalSurface }}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Box sx={{ color: theme => theme.greenhouseSemantic.warning.tonalText }}>
            <i className='tabler-alert-triangle' aria-hidden='true' />
          </Box>
          <Typography variant='body2' sx={{ color: theme => theme.greenhouseSemantic.warning.tonalText }}>
            Finanzas se resume acá para Agency; operación profunda, ledger y aging siguen viviendo en Finance Clients.
          </Typography>
        </Stack>
      </Box>
      <SectionShell title='Clientes financieros asociados' subtitle='Resumen canónico desde client_economics y perfiles financieros'>
        {rows.length === 0 ? (
          <PartialState text='Sin snapshots financieros para este período. La facet queda parcial hasta que Finance materialice el período.' />
        ) : (
          <DataTableShell identifier='organization-enterprise-invoices' ariaLabel='Clientes financieros de la organización' density='compact' stickyFirstColumn>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell align='right'>Revenue</TableCell>
                  <TableCell align='right'>Costo laboral</TableCell>
                  <TableCell align='right'>Margen bruto</TableCell>
                  <TableCell align='right'>FTE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.clientId} hover>
                    <TableCell>{row.clientName}</TableCell>
                    <TableCell align='right'><Typography variant='monoAmount'>{fmtClp(row.totalRevenueClp)}</Typography></TableCell>
                    <TableCell align='right'><Typography variant='monoAmount'>{fmtClp(row.laborCostClp)}</Typography></TableCell>
                    <TableCell align='right'><GreenhouseChip size='small' variant='label' tone={metricToneFromMargin(row.grossMarginPercent)} label={fmtPct(row.grossMarginPercent)} /></TableCell>
                    <TableCell align='right'>{fmtCompact(row.headcountFte)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        )}
      </SectionShell>
      <SectionShell title='Estado de pagos' subtitle='Lectura resumida AR desde Finance 360'>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 3, alignItems: 'center' }}>
          {[
            ['Current', finance?.accountsReceivable?.current],
            ['Overdue 30', finance?.accountsReceivable?.overdue30],
            ['Overdue 60', finance?.accountsReceivable?.overdue60],
            ['Overdue 90', finance?.accountsReceivable?.overdue90]
          ].map(([label, value]) => (
            <Stack key={label} spacing={1}>
              <Typography variant='caption' color='text.secondary'>{label}</Typography>
              <Typography variant='h6'>{fmtClp(typeof value === 'number' ? value : null)}</Typography>
            </Stack>
          ))}
        </Box>
      </SectionShell>
      <RelatedFacetBridge data360={data360} />
    </Stack>
  )
}

const ContextFacetCanvas = ({ facet, detail, data360, tone }: { facet: OrganizationFacet; detail: OrganizationDetailData; data360: AccountComplete360 | null; tone: EnterpriseTone }) => {
  const rows = buildContextRows(facet, detail, data360)

  return (
    <Stack spacing={4} data-capture={`organization-enterprise-${facet}-canvas`}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' }, gap: 4 }}>
        <SectionShell title={`${GH_ORGANIZATION_WORKSPACE.facets.labels[facet]} readiness`} subtitle='Estado canónico, ownership y dependencia visible para todos los consumers'>
          <Stack spacing={3}>
            {rows.map(row => (
              <Stack key={row.title} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Typography variant='body2'>{row.title}</Typography>
                  <Typography variant='caption' color='text.secondary'>{row.description}</Typography>
                </Stack>
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
                  <GreenhouseChip size='small' variant='label' tone={facetStateTone(row.tone)} label={row.state} />
                  <Typography variant='caption' color='text.primary'>{row.owner}</Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </SectionShell>
        <SectionShell title='Consumer contract' subtitle='Cómo esta facet alimenta finance, delivery, CRM y workforce sin duplicar lógica'>
          <Stack spacing={3}>
            {[
              ['Canonical owner', GH_ORGANIZATION_WORKSPACE.facets.labels[facet]],
              ['Coverage', getFacetCount(facet, data360, detail)],
              ['Freshness', data360?._meta.resolvedAt ? '360 fresh' : 'partial'],
              ['State', tone === 'success' ? 'Listo' : tone === 'warning' ? 'Parcial' : 'Planificado']
            ].map(([label, value]) => (
              <Stack key={label} direction='row' spacing={2} justifyContent='space-between'>
                <Typography variant='caption' color='text.primary'>{label}</Typography>
                <Typography variant='caption' color='text.primary'>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </SectionShell>
      </Box>
      <RelatedFacetBridge data360={data360} />
    </Stack>
  )
}

const buildContextRows = (facet: OrganizationFacet, detail: OrganizationDetailData, data360: AccountComplete360 | null) => {
  const rows = {
    identity: [
      ['Legal profile', detail.legalName || 'Legal name pendiente', detail.legalName ? 'Verified' : 'Partial', 'AXIS Core', detail.legalName ? 'success' : 'warning'],
      ['Tax identity', detail.taxId || 'Tax ID pendiente', detail.taxId ? 'Verified' : 'Partial', 'Organization 360', detail.taxId ? 'success' : 'warning'],
      ['Brand asset', detail.logoUrl ? 'Logo asociado' : 'Logo pendiente', detail.logoUrl ? 'Fresh' : 'Partial', 'Brand registry', detail.logoUrl ? 'success' : 'warning'],
      ['CRM mapping', detail.hubspotCompanyId ? 'HubSpot company asociado' : 'HubSpot pendiente', detail.hubspotCompanyId ? 'Healthy' : 'Partial', 'HubSpot', detail.hubspotCompanyId ? 'success' : 'warning']
    ],
    spaces: [
      ['Spaces activos', `${detail.spaceCount} spaces`, detail.spaceCount > 0 ? 'Healthy' : 'Partial', 'Spaces', detail.spaceCount > 0 ? 'success' : 'warning'],
      ['Membresías', `${detail.membershipCount} membresías`, detail.membershipCount > 0 ? 'Healthy' : 'Partial', 'Identity', detail.membershipCount > 0 ? 'success' : 'warning'],
      ['Client bridges', `${data360?.spaces?.filter(space => space.clientId).length ?? 0} bridges`, '360', 'Account 360', 'success'],
      ['Coverage', `${data360?.spaces?.length ?? 0} rows 360`, data360?.spaces ? 'Fresh' : 'Partial', 'Organization 360', data360?.spaces ? 'success' : 'warning']
    ],
    team: [
      ['Miembros', `${data360?.team?.totalMembers ?? detail.uniquePersonCount} personas`, '360', 'Team', 'success'],
      ['FTE', `${fmtCompact(data360?.team?.totalFte)} FTE`, data360?.team?.totalFte ? 'Healthy' : 'Partial', 'Workforce', data360?.team?.totalFte ? 'success' : 'warning'],
      ['Primary contacts', `${detail.people?.filter(person => person.isPrimary).length ?? 0} primarios`, 'Ready', 'Identity', 'success'],
      ['Pagination', data360?.team?.pagination.hasMore ? 'Más miembros disponibles' : 'Muestra completa', '360', 'Account 360', 'success']
    ],
    economics: [
      ['Revenue', fmtClp(data360?.economics?.currentPeriod?.revenueCLP), data360?.economics?.currentPeriod ? 'Fresh' : 'Partial', 'Finance', data360?.economics?.currentPeriod ? 'success' : 'warning'],
      ['Gross margin', fmtPct(data360?.economics?.currentPeriod?.grossMarginPct), '360', 'Economics', metricToneFromMargin(data360?.economics?.currentPeriod?.grossMarginPct)],
      ['Client breakdown', `${data360?.economics?.byClient.length ?? 0} clientes`, 'Ready', 'Finance', data360?.economics?.byClient.length ? 'success' : 'warning'],
      ['Trend', `${data360?.economics?.trend.length ?? 0} puntos`, '360', 'Serving', data360?.economics?.trend.length ? 'success' : 'warning']
    ],
    crm: [
      ['Company', data360?.crm?.company?.name || 'HubSpot company pendiente', data360?.crm?.company ? 'Fresh' : 'Partial', 'HubSpot', data360?.crm?.company ? 'success' : 'warning'],
      ['Deals', `${data360?.crm?.dealCount ?? 0} deals`, '360', 'CRM', data360?.crm?.dealCount ? 'success' : 'warning'],
      ['Open amount', fmtClp(data360?.crm?.openDealAmount ?? null), '360', 'CRM', data360?.crm?.openDealAmount ? 'success' : 'warning'],
      ['Contacts', `${data360?.crm?.contactCount ?? 0} contactos`, '360', 'HubSpot', data360?.crm?.contactCount ? 'success' : 'warning']
    ],
    services: [
      ['Servicios activos', `${data360?.services?.totalActiveCount ?? 0} servicios`, data360?.services?.totalActiveCount ? 'Healthy' : 'Partial', 'Services', data360?.services?.totalActiveCount ? 'success' : 'warning'],
      ['Revenue estimado', fmtClp(data360?.services?.totalRevenue ?? null), '360', 'Services', data360?.services?.totalRevenue ? 'success' : 'warning'],
      ['Business lines', `${Object.keys(data360?.services?.byBusinessLine ?? {}).length} líneas`, '360', 'Service catalog', 'success'],
      ['Catalog rows', `${data360?.services?.activeServices.length ?? 0} registros`, 'Fresh', 'Service catalog', data360?.services?.activeServices.length ? 'success' : 'warning']
    ],
    staffAug: [
      ['Placements', `${data360?.staffAug?.activePlacementCount ?? 0} activos`, data360?.staffAug?.activePlacementCount ? 'Healthy' : 'Planned', 'Staff Aug.', data360?.staffAug?.activePlacementCount ? 'success' : 'info'],
      ['Billing rate', fmtClp(data360?.staffAug?.totalBillingRate ?? null), '360', 'Workforce', data360?.staffAug?.totalBillingRate ? 'success' : 'info'],
      ['Currencies', `${data360?.staffAug?.byCurrency.length ?? 0} monedas`, '360', 'Finance', data360?.staffAug?.byCurrency.length ? 'success' : 'info'],
      ['Skills', `${data360?.staffAug?.placements.filter(placement => placement.requiredSkills?.length).length ?? 0} con skills`, 'Partial', 'Workforce', 'warning']
    ],
    finance: [],
    delivery: []
  } satisfies Record<OrganizationFacet, Array<[string, string, string, string, EnterpriseTone]>>

  return rows[facet].map(([title, description, state, owner, rowTone]) => ({
    title,
    description,
    state,
    owner,
    tone: rowTone
  }))
}

const SectionShell = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`, overflow: 'hidden', bgcolor: 'background.paper' }}>
    <Stack spacing={0}>
      <Box sx={{ px: 4, py: 3, borderBlockEnd: theme => `1px solid ${theme.palette.divider}` }}>
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>{subtitle}</Typography>
      </Box>
      <Box sx={{ p: 4 }}>{children}</Box>
    </Stack>
  </Box>
)

const PartialState = ({ text }: { text: string }) => (
  <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 4, color: 'text.secondary' }}>
    <CircularProgress size={18} aria-label={GH_ORGANIZATION_WORKSPACE.enterprise.aria.loadingOrganizationData} />
    <Typography variant='body2'>{text}</Typography>
  </Stack>
)

const RelatedFacetBridge = ({ data360 }: { data360: AccountComplete360 | null }) => (
  <SectionShell title='Datos relacionados entre facets' subtitle='Puentes visibles para evitar que cada consumer reinvente contexto'>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 0 }}>
      {[
        ['Finanzas', 'Saldo pendiente', fmtClp(data360?.finance?.outstandingAmount ?? null), 'tabler-report-money', data360?.finance?.outstandingAmount ? 'warning' : 'success'],
        ['Equipo', 'Capacidad total', `${fmtCompact(data360?.team?.totalFte)} FTE`, 'tabler-users', 'info'],
        ['Servicios', 'Servicios activos', String(data360?.services?.totalActiveCount ?? 0), 'tabler-tool', 'success'],
        ['Staff Aug.', 'Placements activos', String(data360?.staffAug?.activePlacementCount ?? 0), 'tabler-user-check', 'secondary']
      ].map(([title, helper, value, icon, tone], index) => (
        <Box key={title} sx={{ p: 3, borderInlineStart: { md: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}` }, borderBlockStart: { xs: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}`, md: 0 } }}>
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

const EvidenceMap = ({ facet, data360, partial }: { facet: OrganizationFacet; data360: AccountComplete360 | null; partial: boolean }) => {
  const evidence = [
    `Projection: ${facet}`,
    data360 ? `360 resolver ${data360._meta.resolverVersion}` : '360 parcial',
    data360?._meta.resolvedAt ? `Resolved ${formatDateTime(data360._meta.resolvedAt, { dateStyle: 'short', timeStyle: 'short' }, 'es-CL')}` : 'Sin timestamp',
    partial ? 'Carga parcial detectada' : 'Sin errores de fetch'
  ]

  return (
    <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`, p: 4 }}>
      <Stack spacing={3}>
        <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
          <Typography variant='h6'>Evidence map</Typography>
          <Typography variant='caption' color='text.secondary'>Facet {facet}</Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {evidence.map(item => (
            <Stack key={item} direction='row' spacing={2} alignItems='center'>
              <GreenhouseStatusDot tone={partial && item.includes('parcial') ? 'warning' : 'success'} ariaLabel={`${item}: disponible`} />
              <Typography variant='body2'>{item}</Typography>
            </Stack>
          ))}
        </Box>
      </Stack>
    </Box>
  )
}

const AccountSidecar = ({ detail, data360, partial }: { detail: OrganizationDetailData; data360: AccountComplete360 | null; partial: boolean }) => {
  const readiness: Array<[label: string, ok: boolean]> = [
    ['Identidad legal', Boolean(detail.legalName && detail.taxId)],
    ['Brand asset', Boolean(detail.logoUrl)],
    ['Spaces mapeados', detail.spaceCount > 0],
    ['Equipo base', detail.uniquePersonCount > 0],
    ['CRM integrado', Boolean(detail.hubspotCompanyId)],
    ['Finance profile', Boolean(data360?.finance)],
    ['Services catalog', Boolean(data360?.services?.totalActiveCount)],
    ['Delivery metrics', Boolean(data360?.delivery?.icoMetrics)],
    ['Staff Aug setup', Boolean(data360?.staffAug?.activePlacementCount)]
  ]

  const completed = readiness.filter(([, ok]) => ok).length

  const signals = [
    ['Finance', data360?.finance ? `${data360.finance.invoiceCount} facturas · ${fmtClp(data360.finance.outstandingAmount)}` : 'Finance 360 parcial', 'tabler-currency-dollar', data360?.finance ? 'success' : 'warning'],
    ['Delivery', data360?.delivery ? `${data360.delivery.activeProjectCount} proyectos activos` : 'Delivery 360 parcial', 'tabler-send', data360?.delivery ? 'success' : 'warning'],
    ['CRM', data360?.crm?.company ? `${data360.crm.dealCount} deals · ${data360.crm.contactCount} contactos` : 'HubSpot parcial', 'tabler-briefcase', data360?.crm?.company ? 'success' : 'warning'],
    ['Services', data360?.services ? `${data360.services.totalActiveCount} servicios` : 'Catálogo parcial', 'tabler-package', data360?.services ? 'success' : 'warning']
  ]

  return (
    <Box component='aside' data-capture='organization-enterprise-sidecar' sx={{ bgcolor: 'background.paper', minWidth: 0 }}>
      <Stack spacing={0}>
        <SidecarSection title='Salud de la cuenta' action={partial ? 'Parcial' : '360'}>
          <Stack spacing={2}>
            {[
              ['Financiera', data360?.finance ? 'Disponible' : 'Parcial', data360?.finance ? 'success' : 'warning'],
              ['Operativa', data360?.delivery ? 'Disponible' : 'Parcial', data360?.delivery ? 'success' : 'warning'],
              ['Entrega', data360?.delivery?.icoMetrics ? 'Métrica ICO' : 'Sin tendencia', data360?.delivery?.icoMetrics ? 'success' : 'warning'],
              ['Relacional', detail.hubspotCompanyId ? 'HubSpot' : 'AXIS only', detail.hubspotCompanyId ? 'success' : 'warning']
            ].map(([label, value, tone]) => (
              <Stack key={label} direction='row' justifyContent='space-between' alignItems='center'>
                <Typography variant='body2'>{label}</Typography>
                <GreenhouseStatusDot tone={tone as EnterpriseTone} label={value} />
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
        <SidecarSection title='Readiness' action={`${completed} / ${readiness.length}`}>
          <Stack spacing={2}>
            {readiness.map(([label, ok]) => (
              <Stack key={label} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <GreenhouseStatusDot tone={ok ? 'success' : 'warning'} label={label} />
                <Typography variant='caption' color='text.secondary'>{ok ? 'Completed' : 'Pending'}</Typography>
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
        <SidecarSection title='Procedencia de datos' action='Ver linaje'>
          <Stack spacing={1.5}>
            {[
              ['Sistema fuente', detail.hubspotCompanyId ? 'HubSpot + AXIS Core' : 'AXIS Core'],
              ['Última sincronización', detail.updatedAt ? formatDateTime(detail.updatedAt, { dateStyle: 'short', timeStyle: 'short' }, 'es-CL') : 'Sin timestamp'],
              ['Cobertura 360', data360 ? `${data360._meta.facetsResolved.length}/${data360._meta.facetsRequested.length}` : 'parcial'],
              ['Cache 360', data360 ? Object.values(data360._meta.cacheStatus).join(', ') || 'fresh' : 'parcial']
            ].map(([label, value]) => (
              <Stack key={label} direction='row' justifyContent='space-between' spacing={2}>
                <Typography variant='caption' color='text.secondary'>{label}</Typography>
                <Typography variant='caption' color='text.primary' sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
        <SidecarSection title='Señales recientes' action='Historial'>
          <Stack spacing={3}>
            {signals.map(([title, helper, icon, tone]) => (
              <Stack key={title} direction='row' spacing={2} alignItems='flex-start'>
                <Box sx={{ color: `${tone}.main`, pt: 0.5 }}><i className={icon} aria-hidden='true' /></Box>
                <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant='body2'>{title}</Typography>
                  <Typography variant='caption' color='text.secondary'>{helper}</Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
        <SidecarSection title='Próximas acciones'>
          <Stack spacing={2}>
            {['Revisar Finance Client bridge', 'Completar brand asset si falta', 'Validar delivery trend materializado'].map(item => (
              <Stack key={item} direction='row' spacing={2} alignItems='center'>
                <i className='tabler-calendar-event' aria-hidden='true' />
                <Typography variant='body2'>{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
      </Stack>
    </Box>
  )
}

const SidecarSection = ({ title, action, children }: { title: string; action?: string; children: ReactNode }) => (
  <Box sx={{ px: 4, py: 4, borderBlockEnd: theme => `1px solid ${theme.palette.divider}` }}>
    <Stack spacing={3}>
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
        <Typography variant='h6'>{title}</Typography>
        {action ? <Typography variant='caption' color='primary.main'>{action}</Typography> : null}
      </Stack>
      {children}
    </Stack>
  </Box>
)

export default OrganizationEnterpriseWorkspaceRuntime
