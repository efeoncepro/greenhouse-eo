import type {
  CompactNextAction,
  CompactReadinessItem,
  CompactRecentSignal,
  CompactSignalDriver,
  OrganizationWorkspaceCompactSignalSourceValues,
  OrganizationWorkspaceHealthState
} from './compact-signals-types'
import type { OrganizationFacet } from './facet-capability-mapping'

const hasFacet = (
  values: OrganizationWorkspaceCompactSignalSourceValues,
  facet: OrganizationFacet
): boolean => values.projection.visibleFacets.includes(facet)

const hasProjectDetailRows = (
  values: OrganizationWorkspaceCompactSignalSourceValues
): boolean => (values.projects?.totals.totalProjects ?? 0) > 0

const fmtNumber = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? '0' : new Intl.NumberFormat('es-CL').format(value)

const fmtClpCompact = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return '$0'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard'
  }).format(value)
}

const readinessItem = (
  item: CompactReadinessItem
): CompactReadinessItem => item

export const buildCompactReadiness = (
  values: OrganizationWorkspaceCompactSignalSourceValues
): CompactReadinessItem[] => {
  const { detail, account360, projects, lifecycleCase } = values
  const readiness: CompactReadinessItem[] = []

  if (hasFacet(values, 'identity')) {
    readiness.push(readinessItem({
      id: 'identity.legal',
      label: 'Identidad legal',
      state: detail?.legalName && detail.taxId ? 'complete' : 'pending',
      source: 'organization_360',
      facet: 'identity',
      helper: detail?.legalName && detail.taxId ? 'Nombre legal y tax ID disponibles.' : 'Falta completar nombre legal o tax ID.'
    }))

    readiness.push(readinessItem({
      id: 'identity.brand',
      label: 'Brand asset',
      state: detail?.logoUrl ? 'complete' : 'pending',
      source: 'organization_360',
      facet: 'identity',
      helper: detail?.logoUrl ? 'Logo canónico asociado.' : 'Sin logo canónico asociado.'
    }))
  }

  readiness.push(readinessItem({
    id: 'data.coverage',
    label: 'Cobertura 360',
    state: account360 ? (account360._meta.errors.length > 0 ? 'pending' : 'complete') : 'unknown',
    source: 'account_360',
    helper: account360
      ? `${account360._meta.facetsResolved.length}/${account360._meta.facetsRequested.length} facets resueltos.`
      : 'Account 360 no disponible en esta lectura.'
  }))

  if (hasFacet(values, 'delivery')) {
    readiness.push(readinessItem({
      id: 'delivery.metrics',
      label: 'Delivery metrics',
      state: account360?.delivery?.icoMetrics || projects?.totals.totalProjects ? 'complete' : 'pending',
      source: projects ? 'projects' : 'account_360',
      facet: 'delivery',
      helper: projects
        ? `${projects.totals.activeProjects} proyectos activos, health ${projects.totals.overallHealth}.`
        : 'Sin métricas de proyectos disponibles.'
    }))
  }

  if (hasFacet(values, 'finance')) {
    readiness.push(readinessItem({
      id: 'finance.profile',
      label: 'Finance profile',
      state: account360?.finance || values.financeSummary?.clientCount ? 'complete' : 'pending',
      source: values.financeSummary ? 'finance_summary' : 'account_360',
      facet: 'finance',
      helper: values.financeSummary
        ? `${values.financeSummary.clientCount} client profile(s) en el período.`
        : 'Finance summary no disponible.'
    }))
  }

  if (hasFacet(values, 'services')) {
    readiness.push(readinessItem({
      id: 'services.catalog',
      label: 'Services catalog',
      state: (account360?.services?.totalActiveCount ?? 0) > 0 ? 'complete' : 'pending',
      source: 'account_360',
      facet: 'services',
      helper: `${account360?.services?.totalActiveCount ?? 0} servicios activos.`
    }))
  }

  if (hasFacet(values, 'staffAug')) {
    readiness.push(readinessItem({
      id: 'staffAug.setup',
      label: 'Staff Aug setup',
      state: (account360?.staffAug?.activePlacementCount ?? 0) > 0 ? 'complete' : 'pending',
      source: 'account_360',
      facet: 'staffAug',
      helper: `${account360?.staffAug?.activePlacementCount ?? 0} placements activos.`
    }))
  }

  readiness.push(readinessItem({
    id: 'lifecycle.onboarding',
    label: 'Lifecycle',
    state: lifecycleCase?.status === 'blocked' ? 'blocked' : lifecycleCase ? 'pending' : 'complete',
    source: 'client_lifecycle',
    helper: lifecycleCase ? `Caso ${lifecycleCase.caseKind} en estado ${lifecycleCase.status}.` : 'Sin caso operativo abierto.'
  }))

  return readiness
}

export const buildCompactHealth = (
  values: OrganizationWorkspaceCompactSignalSourceValues,
  readiness: CompactReadinessItem[]
): { overallState: OrganizationWorkspaceHealthState; score: number | null; drivers: CompactSignalDriver[] } => {
  const drivers: CompactSignalDriver[] = []
  const completed = readiness.filter(item => item.state === 'complete').length
  const blocked = readiness.some(item => item.state === 'blocked')
  const pending = readiness.some(item => item.state === 'pending')
  const score = readiness.length > 0 ? Math.round((completed / readiness.length) * 100) : null

  if (values.account360?.finance && hasFacet(values, 'finance')) {
    const outstanding = values.account360.finance.outstandingAmount ?? 0

    drivers.push({
      id: 'finance.outstanding',
      label: 'Saldo pendiente',
      value: fmtClpCompact(outstanding),
      severity: outstanding > 0 ? 'warning' : 'success',
      source: 'account_360',
      facet: 'finance'
    })
  }

  const projectTotals = values.projects?.totals ?? null

  if (projectTotals && projectTotals.totalProjects > 0 && hasFacet(values, 'delivery')) {
    drivers.push({
      id: 'delivery.projectHealth',
      label: 'Health delivery',
      value: projectTotals.overallHealth,
      severity: projectTotals.overallHealth === 'red' ? 'error' : projectTotals.overallHealth === 'yellow' ? 'warning' : 'success',
      source: 'projects',
      facet: 'delivery'
    })
  } else if (values.account360?.delivery && hasFacet(values, 'delivery')) {
    const stuckAssets = values.account360.delivery.icoMetrics?.stuckAssetCount ?? 0

    drivers.push({
      id: 'delivery.360Health',
      label: 'Delivery 360',
      value: `${fmtNumber(values.account360.delivery.activeProjectCount)} activos`,
      severity: stuckAssets > 0 ? 'warning' : 'success',
      source: 'account_360',
      facet: 'delivery'
    })
  }

  if (values.lifecycleCase) {
    drivers.push({
      id: 'lifecycle.openCase',
      label: 'Lifecycle abierto',
      value: values.lifecycleCase.status,
      severity: values.lifecycleCase.status === 'blocked' ? 'error' : 'warning',
      source: 'client_lifecycle'
    })
  }

  const overallState: OrganizationWorkspaceHealthState = blocked
    ? 'blocked'
    : drivers.some(driver => driver.severity === 'error')
      ? 'risk'
      : pending || drivers.some(driver => driver.severity === 'warning')
        ? 'watch'
        : readiness.length > 0
          ? 'good'
          : 'unknown'

  return { overallState, score, drivers }
}

export const buildCompactRecentSignals = (
  values: OrganizationWorkspaceCompactSignalSourceValues,
  limit = 6
): CompactRecentSignal[] => {
  const signals: CompactRecentSignal[] = []

  if (values.account360?._meta.warnings.length) {
    for (const warning of values.account360._meta.warnings.slice(0, 2)) {
      signals.push({
        id: `account360.warning.${signals.length}`,
        title: 'Account 360 warning',
        body: warning,
        severity: 'warning',
        source: 'account_360',
        observedAt: values.account360._meta.resolvedAt
      })
    }
  }

  if (values.account360?.finance && hasFacet(values, 'finance')) {
    signals.push({
      id: 'finance.summary',
      title: 'Finance',
      body: `${values.account360.finance.invoiceCount} facturas · ${fmtClpCompact(values.account360.finance.outstandingAmount)} pendiente.`,
      severity: values.account360.finance.outstandingAmount > 0 ? 'warning' : 'success',
      source: 'account_360',
      facet: 'finance',
      observedAt: values.account360._meta.resolvedAt
    })
  }

  const projectTotals = values.projects?.totals ?? null

  if (projectTotals && projectTotals.totalProjects > 0 && hasFacet(values, 'delivery')) {
    signals.push({
      id: 'delivery.projects',
      title: 'Delivery',
      body: `${projectTotals.activeProjects} proyectos activos · ${fmtNumber(projectTotals.activeTasks)} tareas activas.`,
      severity: projectTotals.overallHealth === 'red' ? 'error' : projectTotals.overallHealth === 'yellow' ? 'warning' : 'success',
      source: 'projects',
      facet: 'delivery',
      observedAt: null
    })
  } else if (values.account360?.delivery && hasFacet(values, 'delivery')) {
    signals.push({
      id: 'delivery.account360',
      title: 'Delivery',
      body: `${values.account360.delivery.activeProjectCount} proyectos activos · ${fmtNumber(values.account360.delivery.taskCounts.active)} tareas activas.`,
      severity: values.account360.delivery.icoMetrics?.stuckAssetCount ? 'warning' : 'success',
      source: 'account_360',
      facet: 'delivery',
      observedAt: values.account360._meta.resolvedAt
    })
  }

  if (values.account360?.crm?.company && hasFacet(values, 'crm')) {
    signals.push({
      id: 'crm.company',
      title: 'CRM',
      body: `${values.account360.crm.dealCount} deals · ${values.account360.crm.contactCount} contactos.`,
      severity: 'success',
      source: 'account_360',
      facet: 'crm',
      observedAt: values.account360._meta.resolvedAt
    })
  }

  if (values.account360?.services && hasFacet(values, 'services')) {
    signals.push({
      id: 'services.active',
      title: 'Services',
      body: `${values.account360.services.totalActiveCount} servicios activos.`,
      severity: values.account360.services.totalActiveCount > 0 ? 'success' : 'warning',
      source: 'account_360',
      facet: 'services',
      observedAt: values.account360._meta.resolvedAt
    })
  }

  if (values.lifecycleCase) {
    signals.push({
      id: 'lifecycle.case',
      title: 'Lifecycle',
      body: `Caso ${values.lifecycleCase.caseKind} ${values.lifecycleCase.status}.`,
      severity: values.lifecycleCase.status === 'blocked' ? 'error' : 'warning',
      source: 'client_lifecycle',
      observedAt: values.lifecycleCase.updatedAt
    })
  }

  return signals.slice(0, limit)
}

export const buildCompactNextActions = (
  values: OrganizationWorkspaceCompactSignalSourceValues,
  limit = 5
): CompactNextAction[] => {
  const actions: CompactNextAction[] = []
  const baseHref = `/agency/organizations/${values.projection.organizationId}`

  if (hasFacet(values, 'finance') && !values.account360?.finance) {
    actions.push({
      id: 'finance.completeProfile',
      label: 'Completar facet Finanzas',
      kind: 'complete',
      source: 'account_360',
      facet: 'finance',
      href: `${baseHref}?facet=finance`,
      dueAt: null
    })
  }

  if (hasFacet(values, 'delivery') && !hasProjectDetailRows(values) && (values.account360?.delivery?.projectCount ?? 0) === 0) {
    actions.push({
      id: 'delivery.verifySource',
      label: 'Verificar fuente de proyectos',
      kind: 'review',
      source: 'projects',
      facet: 'delivery',
      href: `${baseHref}?facet=delivery`,
      dueAt: null
    })
  } else if (hasFacet(values, 'delivery') && !hasProjectDetailRows(values) && (values.account360?.delivery?.projectCount ?? 0) > 0) {
    actions.push({
      id: 'delivery.materializeDetail',
      label: 'Revisar detalle Notion de proyectos',
      kind: 'review',
      source: 'account_360',
      facet: 'delivery',
      href: `${baseHref}?facet=delivery`,
      dueAt: null
    })
  }

  if (hasFacet(values, 'identity') && !values.detail?.logoUrl) {
    actions.push({
      id: 'identity.attachLogo',
      label: 'Asociar brand asset',
      kind: 'complete',
      source: 'organization_360',
      facet: 'identity',
      href: `${baseHref}?facet=identity`,
      dueAt: null
    })
  }

  if (values.lifecycleCase) {
    actions.push({
      id: 'lifecycle.reviewCase',
      label: values.lifecycleCase.status === 'blocked' ? 'Resolver bloqueo de onboarding' : 'Revisar caso de onboarding',
      kind: values.lifecycleCase.status === 'blocked' ? 'review' : 'monitor',
      source: 'client_lifecycle',
      href: `/admin/clients/${values.projection.organizationId}/lifecycle`,
      dueAt: values.lifecycleCase.targetCompletionDate
    })
  }

  if (hasFacet(values, 'services') && !values.account360?.services?.totalActiveCount) {
    actions.push({
      id: 'services.refreshCatalog',
      label: 'Revisar catálogo de servicios',
      kind: 'refresh',
      source: 'account_360',
      facet: 'services',
      href: `${baseHref}?facet=services`,
      dueAt: null
    })
  }

  return actions.slice(0, limit)
}
