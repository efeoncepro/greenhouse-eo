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
  ORGANIZATION_ENTERPRISE_WORKSPACE_CHART_SERIES,
  ORGANIZATION_ENTERPRISE_WORKSPACE_TOKENS,
  organizationEnterpriseCategoricalColor
} from '@/components/greenhouse/organization-workspace/organization-enterprise-workspace-controller'
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
import type {
  OrganizationWorkspaceCompactSignals,
  OrganizationWorkspaceSignalSeverity
} from '@/lib/organization-workspace/compact-signals-types'

import type { OrganizationDetailData, OrganizationFinanceSummary } from './types'

type EnterpriseTone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

const COMMON_ARIA = getMicrocopy('es-CL').aria
const ENTERPRISE_COPY = GH_ORGANIZATION_WORKSPACE.enterprise
const ENTERPRISE_TOKENS = ORGANIZATION_ENTERPRISE_WORKSPACE_TOKENS

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
  | { status: 'loading'; data360: null; projects: null; financeSummary: null; compactSignals: null; error: null }
  | {
      status: 'ready'
      data360: AccountComplete360 | null
      projects: OrganizationProjectsSummary | null
      financeSummary: OrganizationFinanceSummary | null
      compactSignals: OrganizationWorkspaceCompactSignals | null
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

type CapabilityDistributionItem = {
  name: string
  value: number
  tone: EnterpriseTone
  color: string
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
  if (n == null) return ENTERPRISE_COPY.states.noData

  return formatGreenhouseCurrency(n, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')
}

const fmtPct = (value: number | null | undefined, fallback = ENTERPRISE_COPY.states.noData) =>
  value == null ? fallback : `${Math.round(value * 10) / 10}%`

const fmtCompact = (value: number | null | undefined, suffix = '') =>
  value == null ? ENTERPRISE_COPY.states.noData : `${formatNumber(value, { maximumFractionDigits: 1 }, 'es-CL')}${suffix}`

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

const facetStateLabel = (tone: EnterpriseTone) => {
  if (tone === 'success') return ENTERPRISE_COPY.states.ready
  if (tone === 'warning') return ENTERPRISE_COPY.states.partial

  return ENTERPRISE_COPY.states.planned
}

const deltaPoints = (current: number | null | undefined, previous: number | null | undefined) => {
  if (current == null || previous == null) return undefined

  const rounded = Math.round((current - previous) * 10) / 10

  return Math.abs(rounded) < 0.05 ? undefined : rounded
}

const deltaPercentChange = (current: number | null | undefined, previous: number | null | undefined) => {
  if (current == null || previous == null || previous === 0) return undefined

  const rounded = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10

  return Math.abs(rounded) < 0.05 ? undefined : rounded
}

const formatWebsiteLabel = (websiteUrl: string | null | undefined) => {
  if (!websiteUrl) return null

  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`)
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')

    return `${parsed.hostname.replace(/^www\./, '')}${path}`
  } catch {
    return websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  }
}

const previousEconomicsTrendPoint = (
  trend: AccountEconomicsTrendPoint[] | undefined,
  currentYear: number,
  currentMonth: number
) =>
  [...(trend ?? [])]
    .filter(point => point.year < currentYear || (point.year === currentYear && point.month < currentMonth))
    .sort((a, b) => b.year - a.year || b.month - a.month)[0] ?? null

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
      .slice(0, ENTERPRISE_TOKENS.density.distributionMaxItems)
      .map(([name, value], index) => ({
        name,
        value,
        tone: ['primary', 'info', 'warning', 'success', 'error', 'secondary'][index] as EnterpriseTone,
        color: organizationEnterpriseCategoricalColor(index)
      }))
  }

  const departmentCounts = new Map<string, number>()

  for (const person of detail.people ?? []) {
    const key = person.department || person.roleLabel || person.membershipType || 'Sin clasificar'

    departmentCounts.set(key, (departmentCounts.get(key) ?? 0) + 1)
  }

  return Array.from(departmentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, ENTERPRISE_TOKENS.density.distributionMaxItems)
    .map(([name, value], index) => ({
      name,
      value,
      tone: ['primary', 'info', 'warning', 'success', 'error', 'secondary'][index] as EnterpriseTone,
      color: organizationEnterpriseCategoricalColor(index)
    }))
}

const buildDistributionArcs = (items: CapabilityDistributionItem[]) => {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  let start = 0

  return items.map(item => {
    const pct = total > 0 ? (item.value / total) * 100 : 0
    const gap = total > 0 ? ENTERPRISE_TOKENS.chart.csc.gapDegrees : 0

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

const compactToneFromSeverity = (severity: OrganizationWorkspaceSignalSeverity): EnterpriseTone => {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  if (severity === 'success') return 'success'

  return 'info'
}

const compactIconForSource = (source: OrganizationWorkspaceCompactSignals['recentSignals'][number]['source']) => {
  if (source === 'finance_summary' || source === 'account_360') return 'tabler-report-money'
  if (source === 'projects') return 'tabler-send'
  if (source === 'client_lifecycle') return 'tabler-progress-check'
  if (source === 'organization_360') return 'tabler-building'
  if (source === 'workspace_projection') return 'tabler-shield-check'

  return 'tabler-activity'
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
    compactSignals: null,
    error: null
  })

  const period = useMemo(lastClosedPeriod, [])

  useEffect(() => {
    let cancelled = false

    setRuntime({ status: 'loading', data360: null, projects: null, financeSummary: null, compactSignals: null, error: null })

    Promise.allSettled([
      fetch(`/api/organization/${organizationId}/360?facets=identity,spaces,team,economics,delivery,finance,crm,services,staffAug&asOf=${period.asOf}&limit=${ENTERPRISE_TOKENS.density.account360Limit}`, { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<AccountComplete360> : null),
      fetch(`/api/organizations/${organizationId}/projects`, { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<OrganizationProjectsSummary> : null),
      fetch(`/api/organizations/${organizationId}/finance?year=${period.year}&month=${period.month}`, { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<OrganizationFinanceSummary> : null),
      fetch(`/api/organizations/${organizationId}/workspace/compact-signals?year=${period.year}&month=${period.month}&asOf=${period.asOf}`, { cache: 'no-store' }).then(response => response.ok ? response.json() as Promise<OrganizationWorkspaceCompactSignals> : null)
    ]).then(results => {
      if (cancelled) return

      const [data360Result, projectsResult, financeResult, compactSignalsResult] = results

      setRuntime({
        status: 'ready',
        data360: data360Result.status === 'fulfilled' ? data360Result.value : null,
        projects: projectsResult.status === 'fulfilled' ? projectsResult.value : null,
        financeSummary: financeResult.status === 'fulfilled' ? financeResult.value : null,
        compactSignals: compactSignalsResult.status === 'fulfilled' ? compactSignalsResult.value : null,
        error: results.some(result => result.status === 'rejected') ? 'partial_fetch_failed' : null
      })
    })

    return () => {
      cancelled = true
    }
  }, [organizationId, period.asOf, period.month, period.year])

  const data360 = runtime.status === 'ready' ? runtime.data360 : null
  const visibleTabs = projection.visibleTabs
  const fallbackFacet: OrganizationFacet = projection.visibleFacets.includes('delivery') ? 'delivery' : projection.defaultFacet ?? projection.visibleFacets[0] ?? 'identity'
  const effectiveFacet: OrganizationFacet = activeFacet && projection.visibleFacets.includes(activeFacet) ? activeFacet : fallbackFacet
  const activeLabel = visibleTabs.find(tab => tab.facet === effectiveFacet)?.label ?? GH_ORGANIZATION_WORKSPACE.facets.labels[effectiveFacet]
  const activeTone = getFacetTone(effectiveFacet, data360, detail)

  const topMetrics = useMemo<EnterpriseMetric[]>(() => {
    const current = data360?.economics?.currentPeriod
    const finance = data360?.finance
    const previousEconomics = previousEconomicsTrendPoint(data360?.economics?.trend, current?.year ?? period.year, current?.month ?? period.month)
    const revenueValue = current?.revenueCLP ?? kpis?.revenueClp
    const marginValue = current?.grossMarginPct ?? kpis?.grossMarginPct
    const fteValue = current?.headcountFte ?? data360?.team?.totalFte ?? kpis?.headcountFte

    return [
      {
        label: 'Revenue período',
        value: fmtClp(revenueValue),
        helper: current ? `${period.month}/${period.year}` : '360 parcial',
        icon: 'tabler-coins',
        tone: 'secondary',
        delta: deltaPercentChange(revenueValue, previousEconomics?.revenueCLP)
      },
      {
        label: 'Margen bruto',
        value: fmtPct(marginValue),
        helper: current?.periodClosed ? 'período cerrado' : 'período abierto',
        icon: 'tabler-trending-up',
        tone: metricToneFromMargin(marginValue),
        delta: deltaPoints(marginValue, previousEconomics?.grossMarginPct)
      },
      {
        label: 'FTE total',
        value: fmtCompact(fteValue),
        helper: `${data360?.team?.totalMembers ?? detail.uniquePersonCount} personas`,
        icon: 'tabler-users',
        tone: 'info',
        delta: deltaPercentChange(fteValue, previousEconomics?.headcountFte)
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
      const ico = delivery?.icoMetrics
      const previousIco = delivery?.previousIcoMetrics

      return [
        {
          label: 'OTD%',
          value: fmtPct(ico?.otdPct),
          helper: 'Objetivo >= 90%',
          icon: 'tabler-clock-check',
          tone: 'success',
          delta: deltaPoints(ico?.otdPct, previousIco?.otdPct)
        },
        {
          label: 'FTR%',
          value: fmtPct(ico?.ftrPct),
          helper: 'Objetivo >= 85%',
          icon: 'tabler-target-arrow',
          tone: 'success',
          delta: deltaPoints(ico?.ftrPct, previousIco?.ftrPct)
        },
        {
          label: 'Throughput',
          value: fmtCompact(ico?.throughputCount),
          helper: 'pts/mes, objetivo 120',
          icon: 'tabler-rocket',
          tone: 'primary',
          delta: deltaPercentChange(ico?.throughputCount, previousIco?.throughputCount)
        },
        {
          label: 'RpA',
          value: fmtCompact(ico?.rpaAvg),
          helper: 'revisiones por activo',
          icon: 'tabler-route',
          tone: 'warning',
          delta: deltaPercentChange(ico?.rpaAvg, previousIco?.rpaAvg),
          invert: true
        }
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
      { label: 'Estado canónico', value: facetStateLabel(activeTone), helper: 'visibility via projection', icon: 'tabler-shield-check', tone: facetStateTone(activeTone) as Exclude<EnterpriseTone, 'neutral'> },
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
            data360={data360}
            adminActions={adminActions}
            canEditLogo={canEditLogo}
            onLogoUpdated={onLogoUpdated}
          />
          <MetricRail metrics={topMetrics} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                xl: `${ENTERPRISE_TOKENS.layout.facetRailInlineSize}px minmax(0, 1fr) ${ENTERPRISE_TOKENS.layout.sidecarInlineSize}px`
              },
              minHeight: { xs: 'auto', xl: ENTERPRISE_TOKENS.layout.minDesktopBlockSize },
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
                    description={ENTERPRISE_COPY.facetDescriptions[effectiveFacet]}
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
            <AccountSidecar
              detail={detail}
              data360={data360}
              compactSignals={runtime.status === 'ready' ? runtime.compactSignals : null}
              partial={runtime.status === 'loading' || Boolean(runtime.error)}
            />
          </Box>
        </Stack>
      </Box>
      {drawerSlot}
    </>
  )
}

const OrganizationMasthead = ({
  detail,
  data360,
  adminActions,
  canEditLogo,
  onLogoUpdated
}: {
  detail: OrganizationDetailData
  data360: AccountComplete360 | null
  adminActions?: ReactNode
  canEditLogo?: boolean
  onLogoUpdated?: () => void | Promise<void>
}) => {
  const theme = useTheme()
  const flag = detail.country ? (COUNTRY_FLAGS[detail.country] ?? '') : ''
  const statusTone = STATUS_COLOR[detail.status] ?? 'neutral'
  const websiteLabel = formatWebsiteLabel(detail.websiteUrl ?? data360?.identity?.websiteUrl ?? data360?.crm?.company?.website)

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
              inlineSize: ENTERPRISE_TOKENS.chrome.logoFrameSize,
              blockSize: ENTERPRISE_TOKENS.chrome.logoFrameSize,
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
              size={ENTERPRISE_TOKENS.chrome.logoAvatarSize}
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
              {websiteLabel ? <MetaItem icon='tabler-world' label={websiteLabel} tone='primary' /> : null}
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
                inlineSize: ENTERPRISE_TOKENS.chrome.metricIconSize,
                blockSize: ENTERPRISE_TOKENS.chrome.metricIconSize,
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
              scrollMarginBlockStart: { xs: ENTERPRISE_TOKENS.density.facetScrollMarginMobile, lg: 0 },
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
          label={
            loading
              ? ENTERPRISE_COPY.states.loading
              : facetStateLabel(tone)
          }
          sx={{ minInlineSize: 82 }}
        />
      </Stack>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
        {description}
      </Typography>
    </Stack>
    <Stack direction='row' spacing={2}>
      <GreenhouseButton kind='filter' variant='outlined' leadingIconClassName='tabler-filter'>
        {ENTERPRISE_COPY.actions.filters}
      </GreenhouseButton>
      <GreenhouseButton kind='navigation' variant='text' trailingIconClassName='tabler-external-link'>
        {ENTERPRISE_COPY.actions.viewFull}
      </GreenhouseButton>
    </Stack>
  </Stack>
)

const MetricStrip = ({ metrics }: { metrics: EnterpriseMetric[] }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: `repeat(${metrics.length}, minmax(0, 1fr))` },
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
          borderInlineStart: { md: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}` },
          borderBlockStart: { xs: index === 0 ? 0 : theme => `1px solid ${theme.palette.divider}`, md: 0 }
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
        <SectionShell title={ENTERPRISE_COPY.sections.operationalTrend.title} subtitle={ENTERPRISE_COPY.sections.operationalTrend.subtitle}>
          {trendRows.length > 1 ? (
            <Box sx={{ blockSize: ENTERPRISE_TOKENS.chart.trendHeight }}>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={trendRows} margin={{ left: -22, right: 18, top: 16, bottom: 0 }}>
                  <XAxis dataKey='label' axisLine={false} tickLine={false} stroke='var(--mui-palette-text-secondary)' />
                  <YAxis axisLine={false} tickLine={false} stroke='var(--mui-palette-text-secondary)' />
                  <RechartsTooltip />
                  <Line type='monotone' dataKey='revenue' stroke={ORGANIZATION_ENTERPRISE_WORKSPACE_CHART_SERIES.trend.revenue} strokeWidth={2.4} dot={{ r: 3 }} />
                  <Line type='monotone' dataKey='margin' stroke={ORGANIZATION_ENTERPRISE_WORKSPACE_CHART_SERIES.trend.margin} strokeDasharray='4 4' strokeWidth={2.1} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <PartialState text={ENTERPRISE_COPY.empty.operationalTrend} />
          )}
        </SectionShell>
        <SectionShell title={ENTERPRISE_COPY.sections.cscDistribution.title} subtitle={ENTERPRISE_COPY.sections.cscDistribution.subtitle}>
          <CapabilityDistributionChart items={distribution} />
        </SectionShell>
      </Box>
      <DeliverySummaryGrid delivery={data360?.delivery ?? null} />
      <ProjectTable projects={projects} />
      <RelatedFacetBridge data360={data360} />
    </Stack>
  )
}

const DeliverySummaryGrid = ({ delivery }: { delivery: AccountComplete360['delivery'] | null }) => (
  <SectionShell title={ENTERPRISE_COPY.sections.delivery360.title} subtitle={ENTERPRISE_COPY.sections.delivery360.subtitle}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 3 }}>
      {[
        { label: ENTERPRISE_COPY.metrics.projects, value: fmtCompact(delivery?.projectCount), helper: `${fmtCompact(delivery?.activeProjectCount)} ${ENTERPRISE_COPY.metrics.active}`, icon: 'tabler-folders', tone: delivery?.projectCount ? 'success' : 'warning' },
        { label: ENTERPRISE_COPY.metrics.tasks, value: fmtCompact(delivery?.taskCounts.total), helper: `${fmtCompact(delivery?.taskCounts.active)} ${ENTERPRISE_COPY.metrics.taskActive}`, icon: 'tabler-list-check', tone: delivery?.taskCounts.total ? 'success' : 'warning' },
        { label: ENTERPRISE_COPY.metrics.sprints, value: fmtCompact(delivery?.sprintCount), helper: ENTERPRISE_COPY.metrics.deliveryRuntime, icon: 'tabler-flag', tone: delivery?.sprintCount ? 'success' : 'info' },
        { label: ENTERPRISE_COPY.metrics.stuckAssets, value: fmtCompact(delivery?.icoMetrics?.stuckAssetCount), helper: fmtPct(delivery?.icoMetrics?.stuckAssetPct), icon: 'tabler-alert-circle', tone: delivery?.icoMetrics?.stuckAssetCount ? 'warning' : 'success' }
      ].map(item => (
        <Stack key={item.label} spacing={2} sx={{ minWidth: 0 }}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Box sx={{ color: `${item.tone}.main` }}>
              <i className={item.icon} aria-hidden='true' />
            </Box>
            <Typography variant='body2' color='text.secondary'>{item.label}</Typography>
          </Stack>
          <Typography variant='h5'>{item.value}</Typography>
          <Typography variant='caption' color='text.secondary'>{item.helper}</Typography>
        </Stack>
      ))}
    </Box>
  </SectionShell>
)

const CapabilityDistributionChart = ({ items }: { items: CapabilityDistributionItem[] }) => {
  const arcs = buildDistributionArcs(items)
  const cscTokens = ENTERPRISE_TOKENS.chart.csc

  if (items.length === 0) {
    return <PartialState text={ENTERPRISE_COPY.empty.cscDistribution} />
  }

  return (
    <Box data-capture='organization-enterprise-csc-distribution' sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, alignItems: 'center', justifyItems: 'center', minBlockSize: cscTokens.minBlockSize }}>
      <Box role='img' aria-label={ENTERPRISE_COPY.aria.cscDistribution} sx={{ inlineSize: { xs: cscTokens.inlineSizeXs, md: cscTokens.inlineSizeMd }, aspectRatio: '1 / 1', position: 'relative', flexShrink: 0 }}>
        <Box component='svg' viewBox={`0 0 ${cscTokens.viewBoxSize} ${cscTokens.viewBoxSize}`} sx={{ display: 'block', inlineSize: '100%', blockSize: '100%', overflow: 'visible' }}>
          <circle cx={cscTokens.center} cy={cscTokens.center} r={cscTokens.radius} fill='none' stroke='var(--mui-palette-divider)' strokeWidth={cscTokens.strokeWidth} />
          {arcs.map(arc => (
            <circle
              key={arc.name}
              cx={cscTokens.center}
              cy={cscTokens.center}
              r={cscTokens.radius}
              fill='none'
              pathLength='100'
              stroke={arc.color}
              strokeDasharray={`${arc.length} ${100 - arc.length}`}
              strokeDashoffset={-arc.start}
              strokeLinecap='butt'
              strokeWidth={cscTokens.strokeWidth}
              transform={`rotate(-90 ${cscTokens.center} ${cscTokens.center})`}
            />
          ))}
        </Box>
        <Box sx={{ position: 'absolute', inset: cscTokens.innerInset, borderRadius: '50%', bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}`, display: 'grid', placeItems: 'center', textAlign: 'center', p: 2 }}>
          <Stack spacing={0.25} alignItems='center'>
            <Typography variant='h6'>100%</Typography>
            <Typography variant='caption' color='text.primary'>{ENTERPRISE_COPY.sections.cscDistribution.coverage}</Typography>
          </Stack>
        </Box>
      </Box>
      <Stack spacing={1.25} sx={{ width: '100%', minWidth: 0 }}>
        {arcs.map(item => (
          <Box key={item.name} sx={{ display: 'grid', gridTemplateColumns: `${cscTokens.legendTrackSize}px minmax(0, 1fr) max-content`, columnGap: 2.5, alignItems: 'center', minBlockSize: cscTokens.legendRowMinBlockSize, px: 0.5 }}>
            <Box aria-hidden='true' sx={{ inlineSize: cscTokens.legendMarkerSize, blockSize: cscTokens.legendMarkerSize, borderRadius: '50%', bgcolor: item.color }} />
            <Typography variant='body2' sx={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</Typography>
            <Typography variant='monoId'>{Math.round(item.percent)}%</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

const ProjectTable = ({ projects }: { projects: OrganizationProjectsSummary | null }) => {
  const rows = projects?.spaces.flatMap(space => space.projects.map(project => ({ ...project, spaceName: space.spaceName }))).slice(0, ENTERPRISE_TOKENS.density.projectRows) ?? []

  return (
    <SectionShell title={ENTERPRISE_COPY.sections.activeProjects.title} subtitle={ENTERPRISE_COPY.sections.activeProjects.subtitle}>
      {rows.length === 0 ? (
        <PartialState text={ENTERPRISE_COPY.empty.activeProjects} />
      ) : (
        <DataTableShell identifier='organization-enterprise-projects' ariaLabel={ENTERPRISE_COPY.sections.activeProjects.ariaLabel} density='compact' stickyFirstColumn>
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
      <SectionShell title={ENTERPRISE_COPY.sections.financeClients.title} subtitle={ENTERPRISE_COPY.sections.financeClients.subtitle}>
        {rows.length === 0 ? (
          <PartialState text={ENTERPRISE_COPY.empty.financeSnapshots} />
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
      <SectionShell title={ENTERPRISE_COPY.sections.financePayments.title} subtitle={ENTERPRISE_COPY.sections.financePayments.subtitle}>
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
        <SectionShell title={`${GH_ORGANIZATION_WORKSPACE.facets.labels[facet]} readiness`} subtitle={ENTERPRISE_COPY.sections.contextReadiness.subtitle}>
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
        <SectionShell title={ENTERPRISE_COPY.sections.consumerContract.title} subtitle={ENTERPRISE_COPY.sections.consumerContract.subtitle}>
          <Stack spacing={3}>
            {[
              ['Canonical owner', GH_ORGANIZATION_WORKSPACE.facets.labels[facet]],
              ['Coverage', getFacetCount(facet, data360, detail)],
              ['Freshness', data360?._meta.resolvedAt ? '360 fresh' : 'partial'],
              [
                'State',
                facetStateLabel(tone)
              ]
            ].map(([label, value]) => (
              <Stack key={label} direction='row' spacing={2} justifyContent='space-between'>
                <Typography variant='caption' color='text.primary'>{label}</Typography>
                <Typography variant='caption' color='text.primary'>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </SectionShell>
      </Box>
      <FacetRecordsSection facet={facet} detail={detail} data360={data360} />
      <RelatedFacetBridge data360={data360} />
    </Stack>
  )
}

const FacetRecordsSection = ({ facet, detail, data360 }: { facet: OrganizationFacet; detail: OrganizationDetailData; data360: AccountComplete360 | null }) => {
  if (facet === 'spaces') return <SpacesRecordsSection detail={detail} data360={data360} />
  if (facet === 'team') return <TeamRecordsSection detail={detail} data360={data360} />
  if (facet === 'economics') return <EconomicsRecordsSection data360={data360} />
  if (facet === 'crm') return <CrmRecordsSection data360={data360} />
  if (facet === 'services') return <ServicesRecordsSection data360={data360} />
  if (facet === 'staffAug') return <StaffAugRecordsSection data360={data360} />

  return <IdentityRecordsSection detail={detail} />
}

const IdentityRecordsSection = ({ detail }: { detail: OrganizationDetailData }) => (
  <SectionShell title='Identidad relacionada' subtitle='Spaces y contactos primarios asociados a la organización'>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 4 }}>
      <CompactKeyValueList
        rows={(detail.spaces ?? []).slice(0, ENTERPRISE_TOKENS.density.organizationRecordRows).map(space => ({
          id: space.spaceId,
          label: space.spaceName,
          value: space.status,
          helper: space.publicId || space.spaceType
        }))}
        empty={ENTERPRISE_COPY.empty.spaces}
      />
      <CompactKeyValueList
        rows={(detail.people ?? []).slice(0, ENTERPRISE_TOKENS.density.organizationRecordRows).map(person => ({
          id: person.membershipId,
          label: person.fullName || person.canonicalEmail || person.profileId,
          value: person.isPrimary ? 'Primario' : person.membershipType,
          helper: person.roleLabel || person.department || person.canonicalEmail || 'Sin rol'
        }))}
        empty={ENTERPRISE_COPY.empty.team}
      />
    </Box>
  </SectionShell>
)

const SpacesRecordsSection = ({ detail, data360 }: { detail: OrganizationDetailData; data360: AccountComplete360 | null }) => {
  const rows = data360?.spaces?.length
    ? data360.spaces.map(space => ({
      id: space.spaceId,
      name: space.spaceName,
      type: space.spaceType,
      client: space.clientName || space.clientId || 'Sin cliente',
      status: space.status,
      modules: String(space.activeModuleCount)
    }))
    : (detail.spaces ?? []).map(space => ({
      id: space.spaceId,
      name: space.spaceName,
      type: space.spaceType,
      client: space.clientId || 'Sin cliente',
      status: space.status,
      modules: '—'
    }))

  return (
    <SectionShell title='Spaces relacionados' subtitle='Lista real de spaces que alimentan delivery, finanzas y servicios'>
      {rows.length === 0 ? <PartialState text={ENTERPRISE_COPY.empty.spaces} /> : (
        <DataTableShell identifier='organization-enterprise-spaces' ariaLabel='Spaces relacionados de la organización' density='compact'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Space</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align='right'>Módulos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, ENTERPRISE_TOKENS.density.recordRows).map(row => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.client}</TableCell>
                  <TableCell><GreenhouseChip size='small' variant='label' tone={row.status === 'active' ? 'success' : 'info'} label={row.status} /></TableCell>
                  <TableCell align='right'>{row.modules}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </SectionShell>
  )
}

const TeamRecordsSection = ({ detail, data360 }: { detail: OrganizationDetailData; data360: AccountComplete360 | null }) => {
  const rows = data360?.team?.members?.length
    ? data360.team.members.map(member => ({
      id: member.profileId,
      name: member.name,
      role: member.jobTitle || member.membershipType,
      department: member.department || 'Sin departamento',
      fte: fmtCompact(member.fteAllocation),
      primary: member.isPrimary
    }))
    : (detail.people ?? []).map(person => ({
      id: person.profileId,
      name: person.fullName || person.canonicalEmail || person.profileId,
      role: person.roleLabel || person.membershipType,
      department: person.department || 'Sin departamento',
      fte: fmtCompact(person.assignedFte),
      primary: person.isPrimary
    }))

  return (
    <SectionShell title='Equipo relacionado' subtitle='Personas y capacidad asociada a esta organización'>
      {rows.length === 0 ? <PartialState text={ENTERPRISE_COPY.empty.team} /> : (
        <DataTableShell identifier='organization-enterprise-team' ariaLabel='Equipo relacionado de la organización' density='compact'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Persona</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Departamento</TableCell>
                <TableCell align='right'>FTE</TableCell>
                <TableCell>Contacto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, ENTERPRISE_TOKENS.density.recordRows).map(row => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell align='right'>{row.fte}</TableCell>
                  <TableCell>{row.primary ? <GreenhouseChip size='small' variant='label' tone='success' label='Primario' /> : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </SectionShell>
  )
}

const EconomicsRecordsSection = ({ data360 }: { data360: AccountComplete360 | null }) => {
  const rows = data360?.economics?.byClient ?? []

  return (
    <SectionShell title='Profitability por cliente' subtitle='Breakdown económico canónico del período resuelto'>
      {rows.length === 0 ? <PartialState text={ENTERPRISE_COPY.empty.economics} /> : (
        <DataTableShell identifier='organization-enterprise-economics' ariaLabel='Profitability por cliente' density='compact'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell align='right'>Revenue</TableCell>
                <TableCell align='right'>Costo</TableCell>
                <TableCell align='right'>Margen</TableCell>
                <TableCell align='right'>FTE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, ENTERPRISE_TOKENS.density.recordRows).map(row => (
                <TableRow key={row.clientId} hover>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell align='right'><Typography variant='monoAmount'>{fmtClp(row.revenueCLP)}</Typography></TableCell>
                  <TableCell align='right'><Typography variant='monoAmount'>{fmtClp(row.costCLP)}</Typography></TableCell>
                  <TableCell align='right'><GreenhouseChip size='small' variant='label' tone={metricToneFromMargin(row.marginPct)} label={fmtPct(row.marginPct)} /></TableCell>
                  <TableCell align='right'>{fmtCompact(row.fte)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </SectionShell>
  )
}

const CrmRecordsSection = ({ data360 }: { data360: AccountComplete360 | null }) => {
  const rows = data360?.crm?.dealsPipeline ?? []

  return (
    <SectionShell title='Pipeline CRM' subtitle='Deals vinculados a la organización desde HubSpot'>
      {rows.length === 0 ? <PartialState text={ENTERPRISE_COPY.empty.crm} /> : (
        <DataTableShell identifier='organization-enterprise-crm' ariaLabel='Pipeline CRM de la organización' density='compact'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Deal</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell align='right'>Monto</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Cierre</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, ENTERPRISE_TOKENS.density.recordRows).map((row, index) => (
                <TableRow key={`${row.dealName}-${index}`} hover>
                  <TableCell>{row.dealName}</TableCell>
                  <TableCell>{row.stage || 'Sin stage'}</TableCell>
                  <TableCell align='right'><Typography variant='monoAmount'>{fmtClp(row.amount)}</Typography></TableCell>
                  <TableCell>{row.ownerName || 'Sin owner'}</TableCell>
                  <TableCell>{row.closeDate ? formatDateTime(row.closeDate, { dateStyle: 'short' }, 'es-CL') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </SectionShell>
  )
}

const ServicesRecordsSection = ({ data360 }: { data360: AccountComplete360 | null }) => {
  const rows = data360?.services?.activeServices ?? []

  return (
    <SectionShell title='Servicios activos' subtitle='Catálogo operativo asociado a los spaces de la organización'>
      {rows.length === 0 ? <PartialState text={ENTERPRISE_COPY.empty.services} /> : (
        <DataTableShell identifier='organization-enterprise-services' ariaLabel='Servicios activos de la organización' density='compact'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Servicio</TableCell>
                <TableCell>Línea</TableCell>
                <TableCell>Modalidad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align='right'>Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, ENTERPRISE_TOKENS.density.recordRows).map(row => (
                <TableRow key={row.serviceId} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.businessLine || row.servicoEspecifico || 'Sin línea'}</TableCell>
                  <TableCell>{row.modalidad || row.billingFrequency || '—'}</TableCell>
                  <TableCell><GreenhouseChip size='small' variant='label' tone={row.status === 'active' ? 'success' : 'info'} label={row.status} /></TableCell>
                  <TableCell align='right'><Typography variant='monoAmount'>{fmtClp(row.totalCost)}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </SectionShell>
  )
}

const StaffAugRecordsSection = ({ data360 }: { data360: AccountComplete360 | null }) => {
  const rows = data360?.staffAug?.placements ?? []

  return (
    <SectionShell title='Placements Staff Aug' subtitle='Asignaciones laborales relacionadas con la organización'>
      {rows.length === 0 ? <PartialState text={ENTERPRISE_COPY.empty.staffAug} /> : (
        <DataTableShell identifier='organization-enterprise-staff-aug' ariaLabel='Placements Staff Aug de la organización' density='compact'>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Persona</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell align='right'>Rate</TableCell>
                <TableCell>Contrato</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, ENTERPRISE_TOKENS.density.recordRows).map(row => (
                <TableRow key={row.placementId} hover>
                  <TableCell>{row.memberName || 'Sin persona'}</TableCell>
                  <TableCell><GreenhouseChip size='small' variant='label' tone={row.status === 'active' ? 'success' : 'info'} label={row.status} /></TableCell>
                  <TableCell>{row.providerType || '—'}</TableCell>
                  <TableCell align='right'><Typography variant='monoAmount'>{fmtClp(row.billingRate)}</Typography></TableCell>
                  <TableCell>{row.contractStart ? formatDateTime(row.contractStart, { dateStyle: 'short' }, 'es-CL') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </SectionShell>
  )
}

const CompactKeyValueList = ({ rows, empty }: { rows: Array<{ id: string; label: string; value: string; helper: string }>; empty: string }) => {
  if (rows.length === 0) return <PartialState text={empty} />

  return (
    <Stack spacing={2}>
      {rows.map(row => (
        <Stack key={row.id} direction='row' spacing={2} justifyContent='space-between' alignItems='center'>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant='body2'>{row.label}</Typography>
            <Typography variant='caption' color='text.secondary'>{row.helper}</Typography>
          </Stack>
          <Typography variant='caption' color='text.primary' sx={{ textAlign: 'right' }}>{row.value}</Typography>
        </Stack>
      ))}
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

const AccountSidecar = ({
  detail,
  data360,
  compactSignals,
  partial
}: {
  detail: OrganizationDetailData
  data360: AccountComplete360 | null
  compactSignals: OrganizationWorkspaceCompactSignals | null
  partial: boolean
}) => {
  const readiness = compactSignals?.readiness.length
    ? compactSignals.readiness.map(item => ({
      label: item.label,
      ok: item.state === 'complete',
      status: item.state === 'complete' ? 'Completed' : item.state === 'blocked' ? 'Blocked' : item.state === 'unknown' ? 'Unknown' : 'Pending'
    }))
    : [
      { label: 'Identidad legal', ok: Boolean(detail.legalName && detail.taxId), status: Boolean(detail.legalName && detail.taxId) ? 'Completed' : 'Pending' },
      { label: 'Brand asset', ok: Boolean(detail.logoUrl), status: detail.logoUrl ? 'Completed' : 'Pending' },
      { label: 'Spaces mapeados', ok: detail.spaceCount > 0, status: detail.spaceCount > 0 ? 'Completed' : 'Pending' },
      { label: 'Equipo base', ok: detail.uniquePersonCount > 0, status: detail.uniquePersonCount > 0 ? 'Completed' : 'Pending' },
      { label: 'CRM integrado', ok: Boolean(detail.hubspotCompanyId), status: detail.hubspotCompanyId ? 'Completed' : 'Pending' },
      { label: 'Finance profile', ok: Boolean(data360?.finance), status: data360?.finance ? 'Completed' : 'Pending' },
      { label: 'Services catalog', ok: Boolean(data360?.services?.totalActiveCount), status: data360?.services?.totalActiveCount ? 'Completed' : 'Pending' },
      { label: 'Delivery metrics', ok: Boolean(data360?.delivery?.icoMetrics), status: data360?.delivery?.icoMetrics ? 'Completed' : 'Pending' },
      { label: 'Staff Aug setup', ok: Boolean(data360?.staffAug?.activePlacementCount), status: data360?.staffAug?.activePlacementCount ? 'Completed' : 'Pending' }
    ]

  const completed = readiness.filter(item => item.ok).length

  const healthRows = compactSignals?.health.drivers.length
    ? compactSignals.health.drivers.map(driver => ({
      label: driver.label,
      value: driver.value,
      tone: compactToneFromSeverity(driver.severity)
    }))
    : [
      { label: 'Financiera', value: data360?.finance ? ENTERPRISE_COPY.states.available : ENTERPRISE_COPY.states.partial, tone: data360?.finance ? 'success' : 'warning' },
      { label: 'Operativa', value: data360?.delivery ? ENTERPRISE_COPY.states.available : ENTERPRISE_COPY.states.partial, tone: data360?.delivery ? 'success' : 'warning' },
      { label: 'Entrega', value: data360?.delivery?.icoMetrics ? 'Métrica ICO' : 'Sin tendencia', tone: data360?.delivery?.icoMetrics ? 'success' : 'warning' },
      { label: 'Relacional', value: detail.hubspotCompanyId ? 'HubSpot' : 'AXIS only', tone: detail.hubspotCompanyId ? 'success' : 'warning' }
    ]

  const signals = compactSignals?.recentSignals.length
    ? compactSignals.recentSignals.map(signal => ({
      title: signal.title,
      helper: signal.body,
      icon: compactIconForSource(signal.source),
      tone: compactToneFromSeverity(signal.severity)
    }))
    : [
      { title: 'Finance', helper: data360?.finance ? `${data360.finance.invoiceCount} facturas · ${fmtClp(data360.finance.outstandingAmount)}` : 'Finance 360 parcial', icon: 'tabler-currency-dollar', tone: data360?.finance ? 'success' : 'warning' },
      { title: 'Delivery', helper: data360?.delivery ? `${data360.delivery.activeProjectCount} proyectos activos` : 'Delivery 360 parcial', icon: 'tabler-send', tone: data360?.delivery ? 'success' : 'warning' },
      { title: 'CRM', helper: data360?.crm?.company ? `${data360.crm.dealCount} deals · ${data360.crm.contactCount} contactos` : 'HubSpot parcial', icon: 'tabler-briefcase', tone: data360?.crm?.company ? 'success' : 'warning' },
      { title: 'Services', helper: data360?.services ? `${data360.services.totalActiveCount} servicios` : 'Catálogo parcial', icon: 'tabler-package', tone: data360?.services ? 'success' : 'warning' }
    ]

  const provenanceRows = compactSignals
    ? [
      ['Sistema fuente', compactSignals.provenance.filter(item => item.status === 'available').map(item => item.label).slice(0, ENTERPRISE_TOKENS.density.sidecarProvenanceLimit).join(' + ') || ENTERPRISE_COPY.states.partial],
      ['Última sincronización', formatDateTime(compactSignals.computedAt, { dateStyle: 'short', timeStyle: 'short' }, 'es-CL')],
      ['Cobertura 360', `${completed}/${readiness.length}`],
      ['Estado lectura', compactSignals.status]
    ]
    : [
      ['Sistema fuente', detail.hubspotCompanyId ? 'HubSpot + AXIS Core' : 'AXIS Core'],
      ['Última sincronización', detail.updatedAt ? formatDateTime(detail.updatedAt, { dateStyle: 'short', timeStyle: 'short' }, 'es-CL') : 'Sin timestamp'],
      ['Cobertura 360', data360 ? `${data360._meta.facetsResolved.length}/${data360._meta.facetsRequested.length}` : 'parcial'],
      ['Cache 360', data360 ? Object.values(data360._meta.cacheStatus).join(', ') || 'fresh' : 'parcial']
    ]

  const nextActions = compactSignals?.nextActions.length
    ? compactSignals.nextActions.map(action => ({ label: action.label, icon: action.kind === 'monitor' ? 'tabler-radar' : 'tabler-calendar-event' }))
    : [
      { label: 'Revisar Finance Client bridge', icon: 'tabler-calendar-event' },
      { label: 'Completar brand asset si falta', icon: 'tabler-calendar-event' },
      { label: 'Validar delivery trend materializado', icon: 'tabler-calendar-event' }
    ]

  const healthAction = compactSignals
    ? compactSignals.health.score == null ? compactSignals.status : `${compactSignals.health.score}%`
    : partial ? ENTERPRISE_COPY.states.partial : '360'

  return (
    <Box component='aside' data-capture='organization-enterprise-sidecar' sx={{ bgcolor: 'background.paper', minWidth: 0 }}>
      <Stack spacing={0}>
        <SidecarSection title={ENTERPRISE_COPY.sections.sidecarHealth} action={healthAction}>
          <Stack spacing={2}>
            {healthRows.map(({ label, value, tone }) => (
              <Stack key={label} direction='row' justifyContent='space-between' alignItems='center'>
                <Typography variant='body2'>{label}</Typography>
                <GreenhouseStatusDot tone={tone as EnterpriseTone} label={value} />
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
        <SidecarSection title={ENTERPRISE_COPY.sections.sidecarReadiness} action={`${completed} / ${readiness.length}`}>
          <Stack spacing={2}>
            {readiness.map(({ label, ok, status }) => (
              <Stack key={label} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <GreenhouseStatusDot tone={ok ? 'success' : 'warning'} label={label} />
                <Typography variant='caption' color='text.secondary'>{status}</Typography>
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
        <SidecarSection title={ENTERPRISE_COPY.sections.sidecarProvenance} action={ENTERPRISE_COPY.sections.sidecarLineageAction}>
          <Stack spacing={1.5}>
            {provenanceRows.map(([label, value]) => (
              <Stack key={label} direction='row' justifyContent='space-between' spacing={2}>
                <Typography variant='caption' color='text.secondary'>{label}</Typography>
                <Typography variant='caption' color='text.primary' sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
        </SidecarSection>
        <SidecarSection title={ENTERPRISE_COPY.sections.sidecarRecentSignals} action={ENTERPRISE_COPY.sections.sidecarHistoryAction}>
          <Stack spacing={3}>
            {signals.map(({ title, helper, icon, tone }) => (
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
        <SidecarSection title={ENTERPRISE_COPY.sections.sidecarNextActions}>
          <Stack spacing={2}>
            {nextActions.map(action => (
              <Stack key={action.label} direction='row' spacing={2} alignItems='center'>
                <i className={action.icon} aria-hidden='true' />
                <Typography variant='body2'>{action.label}</Typography>
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
