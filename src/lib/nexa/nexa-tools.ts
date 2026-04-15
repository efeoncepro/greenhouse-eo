import 'server-only'

import type { FunctionDeclaration } from '@google/genai'

import { ROLE_CODES } from '@/config/role-codes'
import { getOrganizationOperationalServing } from '@/lib/account-360/get-organization-operational-serving'
import { getAgencyPulseKpis } from '@/lib/agency/agency-queries'
import { readOrganizationAiSignals, type AiSignalListItem } from '@/lib/ico-engine/ai/read-signals'
import { readOrganizationAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-reader'
import type { OrganizationAiLlmEnrichmentItem } from '@/lib/ico-engine/ai/llm-types'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toNumber as toFinanceNumber } from '@/lib/finance/shared'
import { ensureMemberCapacityEconomicsSchema, readLatestMemberCapacityEconomicsSnapshot } from '@/lib/member-capacity-economics/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { NexaRuntimeContext, NexaToolInvocation, NexaToolName, NexaToolResult } from './nexa-contract'

export interface NexaToolExecutionContext {
  tenant: NexaRuntimeContext
}

interface NexaToolDefinition {
  declaration: FunctionDeclaration
  isAvailable: (tenant: NexaRuntimeContext) => boolean
  execute: (args: Record<string, unknown>, context: NexaToolExecutionContext) => Promise<NexaToolResult>
}

interface PayrollSummaryRow extends Record<string, unknown> {
  period_id: string
  year: number | string
  month: number | string
  status: string
  headcount: number | string
  total_net: number | string
  total_gross: number | string
  calculated_at: string | null
  approved_at: string | null
  exported_at: string | null
}

interface EmailHealthRow extends Record<string, unknown> {
  failed_24h: number | string
  pending_retry_1h: number | string
  sent_24h: number | string
}

interface CapacityTeamRow extends Record<string, unknown> {
  member_count: number | string
  contracted_hours: number | string
  assigned_hours: number | string
  commercial_availability_hours: number | string
  avg_usage_percent: number | string | null
}

interface PendingInvoicesRow extends Record<string, unknown> {
  pending_count: number | string
  overdue_count: number | string
  outstanding_amount_clp: number | string
}

const CURRENT_MONTH_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit'
})

const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
]

const getCurrentSantiagoPeriod = () => {
  const parts = CURRENT_MONTH_FORMATTER.formatToParts(new Date())
  const year = Number(parts.find(part => part.type === 'year')?.value ?? new Date().getFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? new Date().getMonth() + 1)

  return { year, month }
}

const formatPeriodLabel = (year: number, month: number) =>
  `${SPANISH_MONTHS[Math.max(0, Math.min(month - 1, SPANISH_MONTHS.length - 1))]} ${year}`

const asRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const toSafeNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const formatPercent = (value: number | null) => (value == null ? null : `${Math.round(value)}%`)

const hasRouteGroup = (tenant: NexaRuntimeContext, routeGroup: string) => tenant.routeGroups.includes(routeGroup)

const hasRoleCode = (tenant: NexaRuntimeContext, roleCode: string) => tenant.roleCodes.includes(roleCode)

const isInternalOperationsUser = (tenant: NexaRuntimeContext) =>
  hasRouteGroup(tenant, 'internal') || hasRouteGroup(tenant, 'agency') || hasRouteGroup(tenant, 'admin') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

const buildToolUnavailableResult = (toolName: NexaToolName, reason: string): NexaToolResult => ({
  available: false,
  summary: reason,
  source: 'none',
  scopeLabel: 'Sin acceso',
  generatedAt: new Date().toISOString(),
  metrics: [],
  notes: [reason],
  raw: { toolName }
})

const summarizeAiSignals = (signals: AiSignalListItem[]) => {
  const critical = signals.filter(signal => signal.severity === 'critical').length
  const warning = signals.filter(signal => signal.severity === 'warning').length

  return {
    critical,
    warning
  }
}

const summarizeAiLlmEnrichments = (items: OrganizationAiLlmEnrichmentItem[]) => {
  if (items.length === 0) {
    return null
  }

  const latest = items[0]
  const fragments = [`Encontré ${items.length} enriquecimientos LLM recientes`]

  if (latest?.metricName) {
    fragments.push(`el último cubre ${latest.metricName}`)
  }

  if (latest?.recommendedAction) {
    fragments.push(`y recomienda ${latest.recommendedAction}`)
  } else if (latest?.explanationSummary) {
    fragments.push(`con foco en ${latest.explanationSummary}`)
  }

  return `${fragments.join('; ')}.`
}

const checkPayrollTool: NexaToolDefinition = {
  declaration: {
    name: 'check_payroll',
    description: 'Consulta el estado de la nómina actual, incluyendo período, estado, headcount y totales neto/bruto.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  isAvailable: tenant =>
    hasRouteGroup(tenant, 'hr') || hasRouteGroup(tenant, 'finance') || hasRouteGroup(tenant, 'internal') || hasRouteGroup(tenant, 'admin') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN),
  async execute(args, context) {
    void args
    void context

    const rows = await runGreenhousePostgresQuery<PayrollSummaryRow>(
      `
        SELECT
          p.period_id,
          p.year,
          p.month,
          p.status,
          p.calculated_at::text,
          p.approved_at::text,
          p.exported_at::text,
          COUNT(DISTINCT e.member_id) AS headcount,
          COALESCE(SUM(e.net_total), 0) AS total_net,
          COALESCE(SUM(e.gross_total), 0) AS total_gross
        FROM greenhouse_payroll.payroll_periods AS p
        LEFT JOIN greenhouse_payroll.payroll_entries AS e
          ON e.period_id = p.period_id
          AND e.is_active = TRUE
        GROUP BY p.period_id, p.year, p.month, p.status, p.calculated_at, p.approved_at, p.exported_at
        ORDER BY p.year DESC, p.month DESC
        LIMIT 1
      `
    )

    const row = rows[0]

    if (!row) {
      return buildToolUnavailableResult('check_payroll', 'No hay períodos de nómina cargados todavía.')
    }

    const year = toSafeNumber(row.year)
    const month = toSafeNumber(row.month)
    const headcount = toSafeNumber(row.headcount)
    const totalNet = roundCurrency(toSafeNumber(row.total_net))
    const totalGross = roundCurrency(toSafeNumber(row.total_gross))
    const status = String(row.status || 'unknown')
    const periodLabel = formatPeriodLabel(year, month)

    return {
      available: true,
      summary: `${periodLabel} está en estado ${status} con ${headcount} personas y neto total CLP ${totalNet.toLocaleString('es-CL')}.`,
      source: 'postgres',
      scopeLabel: periodLabel,
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: 'Estado', value: status, tone: status === 'exported' ? 'success' : 'info' },
        { label: 'Headcount', value: String(headcount) },
        { label: 'Neto total', value: `CLP ${totalNet.toLocaleString('es-CL')}` },
        { label: 'Bruto total', value: `CLP ${totalGross.toLocaleString('es-CL')}` }
      ],
      raw: {
        periodId: row.period_id,
        year,
        month,
        periodLabel,
        status,
        headcount,
        totalNetClp: totalNet,
        totalGrossClp: totalGross,
        calculatedAt: row.calculated_at,
        approvedAt: row.approved_at,
        exportedAt: row.exported_at
      }
    }
  }
}

const getOtdTool: NexaToolDefinition = {
  declaration: {
    name: 'get_otd',
    description: 'Consulta el OTD operativo actual. Para clientes usa su organización activa; para operación interna usa el pulso global de la agencia.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  isAvailable: tenant => Boolean(tenant.organizationId) || isInternalOperationsUser(tenant),
  async execute(args, context) {
    void args

    const { tenant } = context

    if (tenant.organizationId) {
      const serving = await getOrganizationOperationalServing(tenant.organizationId)

      if (!serving.current || serving.current.otdPct == null) {
        return buildToolUnavailableResult('get_otd', 'No encontré OTD materializado para la organización activa.')
      }

      const aiSignals = await readOrganizationAiSignals(tenant.organizationId, 3).catch(() => [])
      const aiSignalSummary = summarizeAiSignals(aiSignals)
      const aiLlmEnrichments = await readOrganizationAiLlmEnrichments(tenant.organizationId, 3).catch(() => [])
      const aiLlmNote = summarizeAiLlmEnrichments(aiLlmEnrichments)

      const aiSignalNote =
        aiSignals.length > 0
          ? `Encontré ${aiSignals.length} señales AI recientes${aiSignalSummary.critical > 0 ? `, incluyendo ${aiSignalSummary.critical} críticas` : ''}.`
          : null

      const notes = [aiSignalNote, aiLlmNote].filter((note): note is string => Boolean(note))

      const metrics: NexaToolResult['metrics'] = [
        { label: 'OTD', value: formatPercent(serving.current.otdPct) || 'Sin datos', tone: serving.current.otdPct >= 90 ? 'success' : 'warning' },
        { label: 'Activas', value: String(serving.current.tasksActive) },
        { label: 'Completadas', value: String(serving.current.tasksCompleted) }
      ]

      if (aiSignals.length > 0) {
        metrics.push({
          label: 'Señales AI',
          value: String(aiSignals.length),
          tone: aiSignalSummary.critical > 0 ? 'error' : aiSignalSummary.warning > 0 ? 'warning' : 'info'
        })
      }

      if (aiLlmEnrichments.length > 0) {
        metrics.push({
          label: 'LLM',
          value: String(aiLlmEnrichments.length),
          tone: 'info'
        })
      }

      return {
        available: true,
        summary:
          `El OTD actual de ${tenant.organizationName || 'la organización'} es ${formatPercent(serving.current.otdPct)} en ${formatPeriodLabel(serving.current.periodYear, serving.current.periodMonth)}.` +
          (notes.length > 0 ? ` ${notes.join(' ')}` : ''),
        source: 'postgres',
        scopeLabel: tenant.organizationName || 'Organización activa',
        generatedAt: new Date().toISOString(),
        metrics,
        notes: notes.length > 0 ? notes : undefined,
        raw: {
          scope: 'organization',
          organizationId: tenant.organizationId,
          organizationName: tenant.organizationName || null,
          otdPct: serving.current.otdPct,
          periodYear: serving.current.periodYear,
          periodMonth: serving.current.periodMonth,
          tasksActive: serving.current.tasksActive,
          tasksCompleted: serving.current.tasksCompleted,
          throughputCount: serving.current.throughputCount,
          stuckAssetCount: serving.current.stuckAssetCount,
          materializedAt: serving.materializedAt,
          aiSignals: aiSignals.map(signal => ({
            signalId: signal.signalId,
            signalType: signal.signalType,
            metricName: signal.metricName,
            severity: signal.severity,
            currentValue: signal.currentValue,
            expectedValue: signal.expectedValue,
            predictedValue: signal.predictedValue,
            confidence: signal.confidence,
            actionSummary: signal.actionSummary,
            generatedAt: signal.generatedAt
          })),
          aiLlmEnrichments: aiLlmEnrichments.map(item => ({
            signalId: item.signalId,
            spaceId: item.spaceId,
            metricName: item.metricName,
            signalType: item.signalType,
            severity: item.severity,
            qualityScore: item.qualityScore,
            explanationSummary: item.explanationSummary,
            recommendedAction: item.recommendedAction,
            confidence: item.confidence,
            processedAt: item.processedAt
          }))
        }
      }
    }

    const pulse = await getAgencyPulseKpis()

    if (pulse.otdPctGlobal == null) {
      return buildToolUnavailableResult('get_otd', 'No encontré OTD global de agencia disponible.')
    }

    return {
      available: true,
      summary: `El OTD global actual es ${formatPercent(pulse.otdPctGlobal)} con ${pulse.assetsActivos} activos visibles.`,
      source: 'bigquery',
      scopeLabel: 'Agencia',
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: 'OTD', value: formatPercent(pulse.otdPctGlobal) || 'Sin datos', tone: pulse.otdPctGlobal >= 90 ? 'success' : 'warning' },
        { label: 'Activos', value: String(pulse.assetsActivos) },
        { label: 'Spaces', value: String(pulse.totalSpaces) }
      ],
      raw: {
        scope: 'agency',
        otdPct: pulse.otdPctGlobal,
        assetsActive: pulse.assetsActivos,
        feedbackPending: pulse.feedbackPendiente,
        totalSpaces: pulse.totalSpaces,
        totalProjects: pulse.totalProjects,
        lastSyncedAt: pulse.lastSyncedAt
      }
    }
  }
}

const checkEmailsTool: NexaToolDefinition = {
  declaration: {
    name: 'check_emails',
    description: 'Consulta salud del delivery de emails: fallidos en 24h, retry pendiente y enviados en 24h. Solo para admins/ops internos.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        lookbackHours: {
          type: 'number',
          minimum: 1,
          maximum: 168,
          description: 'Ventana opcional de análisis en horas. El resumen operativo sigue usando la ventana estándar de 24 horas.'
        }
      }
    }
  },
  isAvailable: tenant => hasRouteGroup(tenant, 'admin') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN),
  async execute(args, context) {
    void args
    void context

    const rows = await runGreenhousePostgresQuery<EmailHealthRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') AS failed_24h,
          COUNT(*) FILTER (WHERE status = 'failed' AND attempt_number < 3 AND created_at > NOW() - INTERVAL '1 hour') AS pending_retry_1h,
          COUNT(*) FILTER (WHERE status = 'sent' AND created_at > NOW() - INTERVAL '24 hours') AS sent_24h
        FROM greenhouse_notifications.email_deliveries
      `
    )

    const row = rows[0]
    const failed24h = toSafeNumber(row?.failed_24h)
    const pendingRetry1h = toSafeNumber(row?.pending_retry_1h)
    const sent24h = toSafeNumber(row?.sent_24h)

    return {
      available: true,
      summary: `En las últimas 24 horas hubo ${failed24h} fallidos, ${pendingRetry1h} retries pendientes y ${sent24h} envíos exitosos.`,
      source: 'postgres',
      scopeLabel: 'Operación email',
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: 'Fallidos 24h', value: String(failed24h), tone: failed24h > 0 ? 'warning' : 'success' },
        { label: 'Retry 1h', value: String(pendingRetry1h), tone: pendingRetry1h > 0 ? 'warning' : 'default' },
        { label: 'Enviados 24h', value: String(sent24h) }
      ],
      raw: {
        failed24h,
        pendingRetry1h,
        sent24h
      }
    }
  }
}

const getCapacityTool: NexaToolDefinition = {
  declaration: {
    name: 'get_capacity',
    description: 'Consulta capacidad asignada vs contratada. Para operación interna devuelve el agregado de equipo; para colaboradores vinculados devuelve su snapshot personal.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  isAvailable: tenant => isInternalOperationsUser(tenant) || Boolean(tenant.memberId),
  async execute(args, context) {
    void args

    const { tenant } = context

    await ensureMemberCapacityEconomicsSchema()

    if (isInternalOperationsUser(tenant)) {
      const { year, month } = getCurrentSantiagoPeriod()

      const rows = await runGreenhousePostgresQuery<CapacityTeamRow>(
        `
          SELECT
            COUNT(*) AS member_count,
            COALESCE(SUM(s.contracted_hours), 0) AS contracted_hours,
            COALESCE(SUM(s.assigned_hours), 0) AS assigned_hours,
            COALESCE(SUM(s.commercial_availability_hours), 0) AS commercial_availability_hours,
            AVG(s.usage_percent) AS avg_usage_percent
          FROM greenhouse_serving.member_capacity_economics AS s
          INNER JOIN greenhouse_core.members AS m
            ON m.member_id = s.member_id
          WHERE s.period_year = $1
            AND s.period_month = $2
            AND m.active = TRUE
            AND COALESCE(m.assignable, TRUE) = TRUE
        `,
        [year, month]
      )

      const row = rows[0]
      const contractedHours = toSafeNumber(row?.contracted_hours)
      const assignedHours = toSafeNumber(row?.assigned_hours)
      const availabilityHours = toSafeNumber(row?.commercial_availability_hours)
      const memberCount = toSafeNumber(row?.member_count)
      const avgUsagePercent = row?.avg_usage_percent == null ? null : toSafeNumber(row.avg_usage_percent)

      return {
        available: true,
        summary: `El equipo tiene ${assignedHours}h asignadas sobre ${contractedHours}h contratadas, con ${availabilityHours}h comerciales disponibles.`,
        source: 'postgres',
        scopeLabel: formatPeriodLabel(year, month),
        generatedAt: new Date().toISOString(),
        metrics: [
          { label: 'Asignadas', value: `${assignedHours}h` },
          { label: 'Contratadas', value: `${contractedHours}h` },
          { label: 'Uso promedio', value: formatPercent(avgUsagePercent) || 'Sin datos', tone: (avgUsagePercent ?? 0) >= 90 ? 'warning' : 'success' }
        ],
        raw: {
          scope: 'team',
          periodYear: year,
          periodMonth: month,
          memberCount,
          contractedHours,
          assignedHours,
          commercialAvailabilityHours: availabilityHours,
          allocationPercent: contractedHours > 0 ? Math.round((assignedHours / contractedHours) * 100) : 0,
          avgUsagePercent
        }
      }
    }

    if (!tenant.memberId) {
      return buildToolUnavailableResult('get_capacity', 'El usuario no tiene memberId vinculado para leer capacidad personal.')
    }

    const snapshot = await readLatestMemberCapacityEconomicsSnapshot(tenant.memberId)

    if (!snapshot) {
      return buildToolUnavailableResult('get_capacity', 'No encontré snapshot de capacidad para este usuario.')
    }

    return {
      available: true,
      summary: `Tu snapshot más reciente muestra ${snapshot.assignedHours}h asignadas sobre ${snapshot.contractedHours}h contratadas.`,
      source: 'postgres',
      scopeLabel: `${formatPeriodLabel(snapshot.periodYear, snapshot.periodMonth)} · personal`,
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: 'Asignadas', value: `${snapshot.assignedHours}h` },
        { label: 'Contratadas', value: `${snapshot.contractedHours}h` },
        { label: 'Uso', value: formatPercent(snapshot.usagePercent) || 'Sin datos' }
      ],
      raw: {
        scope: 'member',
        memberId: tenant.memberId,
        periodYear: snapshot.periodYear,
        periodMonth: snapshot.periodMonth,
        contractedHours: snapshot.contractedHours,
        assignedHours: snapshot.assignedHours,
        commercialAvailabilityHours: snapshot.commercialAvailabilityHours,
        operationalAvailabilityHours: snapshot.operationalAvailabilityHours,
        usagePercent: snapshot.usagePercent,
        usageKind: snapshot.usageKind,
        costPerHourTarget: snapshot.costPerHourTarget,
        suggestedBillRateTarget: snapshot.suggestedBillRateTarget
      }
    }
  }
}

const pendingInvoicesTool: NexaToolDefinition = {
  declaration: {
    name: 'pending_invoices',
    description: 'Consulta facturas pendientes y vencidas. Para clientes se limita a su clientId; para operación interna devuelve el agregado completo.',
    parametersJsonSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  isAvailable: tenant => hasRouteGroup(tenant, 'finance') || isInternalOperationsUser(tenant) || Boolean(tenant.clientId),
  async execute(args, context) {
    void args

    const { tenant } = context

    await ensureFinanceInfrastructure()

    const projectId = getFinanceProjectId()

    const params = tenant.tenantType === 'client' && tenant.clientId
      ? { clientId: tenant.clientId }
      : undefined

    const rows = await runFinanceQuery<PendingInvoicesRow>(
      `
        SELECT
          COUNT(*) AS pending_count,
          COUNTIF(payment_status = 'overdue') AS overdue_count,
          SUM(
            COALESCE(total_amount_clp, 0) * SAFE_DIVIDE(
              GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0),
              NULLIF(COALESCE(total_amount, 0), 0)
            )
          ) AS outstanding_amount_clp
        FROM \`${projectId}.greenhouse.fin_income\`
        WHERE payment_status IN ('pending', 'overdue', 'partial')
          ${params ? 'AND client_id = @clientId' : ''}
      `,
      params
    )

    const row = rows[0]
    const pendingCount = toFinanceNumber(row?.pending_count)
    const overdueCount = toFinanceNumber(row?.overdue_count)
    const outstandingAmountClp = roundCurrency(toFinanceNumber(row?.outstanding_amount_clp))
    const scopeLabel = tenant.tenantType === 'client' ? tenant.clientName || 'cliente actual' : 'operación total'

    return {
      available: true,
      summary: `${scopeLabel} tiene ${pendingCount} facturas pendientes, ${overdueCount} vencidas y CLP ${outstandingAmountClp.toLocaleString('es-CL')} por cobrar.`,
      source: 'bigquery',
      scopeLabel,
      generatedAt: new Date().toISOString(),
      metrics: [
        { label: 'Pendientes', value: String(pendingCount), tone: pendingCount > 0 ? 'warning' : 'success' },
        { label: 'Vencidas', value: String(overdueCount), tone: overdueCount > 0 ? 'error' : 'success' },
        { label: 'Por cobrar', value: `CLP ${outstandingAmountClp.toLocaleString('es-CL')}` }
      ],
      raw: {
        scope: tenant.tenantType === 'client' ? 'client' : 'global',
        clientId: tenant.tenantType === 'client' ? tenant.clientId : null,
        clientName: tenant.tenantType === 'client' ? tenant.clientName : null,
        pendingCount,
        overdueCount,
        outstandingAmountClp
      }
    }
  }
}

const NEXA_TOOLS: Record<NexaToolName, NexaToolDefinition> = {
  check_payroll: checkPayrollTool,
  get_otd: getOtdTool,
  check_emails: checkEmailsTool,
  get_capacity: getCapacityTool,
  pending_invoices: pendingInvoicesTool
}

export const getNexaToolDeclarations = (tenant: NexaRuntimeContext): FunctionDeclaration[] =>
  (Object.values(NEXA_TOOLS) as NexaToolDefinition[])
    .filter(tool => tool.isAvailable(tenant))
    .map(tool => tool.declaration)

export const executeNexaTool = async ({
  toolCallId,
  toolName,
  args,
  context
}: {
  toolCallId: string
  toolName: string
  args: unknown
  context: NexaRuntimeContext
}): Promise<NexaToolInvocation> => {
  const definition = NEXA_TOOLS[toolName as NexaToolName]

  if (!definition) {
    return {
      toolCallId,
      toolName: toolName as NexaToolName,
      args: asRecord(args),
      result: buildToolUnavailableResult(toolName as NexaToolName, `El tool ${toolName} no está registrado en Nexa.`)
    }
  }

  if (!definition.isAvailable(context)) {
    return {
      toolCallId,
      toolName: toolName as NexaToolName,
      args: asRecord(args),
      result: buildToolUnavailableResult(toolName as NexaToolName, `El usuario actual no tiene permisos para usar ${toolName}.`)
    }
  }

  return {
    toolCallId,
    toolName: toolName as NexaToolName,
    args: asRecord(args),
    result: await definition.execute(asRecord(args), { tenant: context })
  }
}
