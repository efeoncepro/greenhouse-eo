import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { readAgencyPerformanceReport, type AgencyPerformanceReport } from '@/lib/ico-engine/performance-report'
import { getIcoEngineProjectId, runIcoEngineQuery } from '@/lib/ico-engine/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  DeliveryPerformancePublicationPayload,
  NotionPublicationKey,
  PublishDeliveryPerformanceReportResult
} from '@/types/notion-publication'
import { notionRequest } from './notion-client'
import {
  completePublicationRun,
  createPublicationRun,
  findSuccessfulPublicationRunByHash,
  getDefaultSpaceNotionPublicationTarget,
  getSpaceNotionPublicationTarget
} from './notion-publication-store'

const PUBLICATION_KEY: NotionPublicationKey = 'delivery_performance_reports'
const INTEGRATION_KEY = 'notion_delivery_performance_reports'
const REPORT_SCOPE = 'agency'

type QueryDatabaseResponse = {
  results?: Array<{ id: string }>
}

type PageResponse = {
  id: string
}

type BlockListResponse = {
  results?: Array<{ id: string }>
  has_more?: boolean
  next_cursor?: string | null
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
] as const

const formatMonthLabel = (periodMonth: number) => MONTH_NAMES_ES[Math.max(1, Math.min(periodMonth, 12)) - 1]

const buildTitle = (periodYear: number, periodMonth: number) =>
  `Performance Report — ${formatMonthLabel(periodMonth)} ${periodYear}`

const getQuarterLabel = (periodMonth: number) => {
  if (periodMonth <= 3) return 'Q1'
  if (periodMonth <= 6) return 'Q2'
  if (periodMonth <= 9) return 'Q3'

  return 'Q4'
}

const mapTrendLabel = (trend: AgencyPerformanceReport['summary']['trend']) => {
  if (trend === 'improving') return '📈 Mejora'
  if (trend === 'degrading') return '📉 Retroceso'

  return '➡️ Estable'
}

const toNotionPercent = (value: number | null) =>
  value === null ? null : Math.round((value / 100) * 1000) / 1000

const richText = (content: string) => [{ type: 'text', text: { content } }]

const paragraphBlock = (content: string) => ({
  object: 'block',
  type: 'paragraph',
  paragraph: { rich_text: richText(content) }
})

const headingBlock = (level: 1 | 2, content: string) => ({
  object: 'block',
  type: level === 1 ? 'heading_1' : 'heading_2',
  [level === 1 ? 'heading_1' : 'heading_2']: { rich_text: richText(content) }
})

const bulletBlock = (content: string) => ({
  object: 'block',
  type: 'bulleted_list_item',
  bulleted_list_item: { rich_text: richText(content) }
})

const buildBlocks = (report: AgencyPerformanceReport, title: string) => {
  const topPerformerLine = report.topPerformer
    ? `${report.topPerformer.memberName} — ${report.topPerformer.otdPct ?? 0}% OT, ${report.topPerformer.throughputCount} tareas`
    : 'Sin top performer materializado para el período.'

  const taskMixBlocks = report.taskMix.slice(0, 6).map(entry =>
    bulletBlock(`${entry.segmentLabel}: ${entry.totalTasks} tareas`)
  )

  return [
    headingBlock(1, title),
    paragraphBlock(
      `Reporte canónico publicado desde Greenhouse para ${formatMonthLabel(report.periodMonth)} ${report.periodYear}. El período proviene de snapshot mensual congelado.`
    ),
    headingBlock(2, 'Resumen ejecutivo'),
    paragraphBlock(report.executiveSummary),
    headingBlock(2, 'Scorecard'),
    bulletBlock(`On-Time: ${report.summary.onTimePct ?? 0}%`),
    bulletBlock(`Late Drops: ${report.summary.lateDrops}`),
    bulletBlock(`Overdue: ${report.summary.overdue}`),
    bulletBlock(`Carry-Over: ${report.summary.carryOver}`),
    bulletBlock(`Total tareas: ${report.summary.totalTasks}`),
    bulletBlock(`Tareas Efeonce: ${report.summary.efeonceTasks}`),
    bulletBlock(`Tareas Sky: ${report.summary.skyTasks}`),
    headingBlock(2, 'Top performer'),
    bulletBlock(topPerformerLine),
    headingBlock(2, 'Task mix'),
    ...taskMixBlocks,
    headingBlock(2, 'Supuestos'),
    bulletBlock(`Multi-assignee policy: ${report.assumptions.multiAssigneePolicy}`),
    bulletBlock(`Top performer min throughput: ${report.assumptions.topPerformerMinThroughput}`),
    bulletBlock(`Trend stable band: ${report.assumptions.trendStableBandPp} pp`),
    bulletBlock('Source: Greenhouse frozen monthly snapshot')
  ]
}

const buildProperties = (report: AgencyPerformanceReport, title: string) => ({
  Informe: {
    title: richText(title)
  },
  'Resumen Ejecutivo': {
    rich_text: richText(report.executiveSummary)
  },
  Alerta: {
    rich_text: richText(report.alertText)
  },
  'Total Tareas': {
    number: report.summary.totalTasks
  },
  'Tareas Efeonce': {
    number: report.summary.efeonceTasks
  },
  'Tareas Sky': {
    number: report.summary.skyTasks
  },
  'On-Time %': {
    number: toNotionPercent(report.summary.onTimePct)
  },
  'OT Mes Anterior %': {
    number: toNotionPercent(report.summary.previousOnTimePct)
  },
  'Late Drops': {
    number: report.summary.lateDrops
  },
  Overdue: {
    number: report.summary.overdue
  },
  'Carry-Over': {
    number: report.summary.carryOver
  },
  'Top Performer': {
    rich_text: richText(
      report.topPerformer
        ? `${report.topPerformer.memberName} — ${report.topPerformer.otdPct ?? 0}% OT (${report.topPerformer.throughputCount} tareas)`
        : 'Sin top performer'
    )
  },
  Tendencia: {
    select: { name: mapTrendLabel(report.summary.trend) }
  },
  Trimestre: {
    select: { name: getQuarterLabel(report.periodMonth) }
  },
  Periodo: {
    date: {
      start: `${report.periodYear}-${String(report.periodMonth).padStart(2, '0')}-01`,
      end: `${report.periodYear}-${String(report.periodMonth).padStart(2, '0')}-${String(new Date(report.periodYear, report.periodMonth, 0).getDate()).padStart(2, '0')}`
    }
  }
})

const buildPayload = (report: AgencyPerformanceReport): DeliveryPerformancePublicationPayload => {
  const title = buildTitle(report.periodYear, report.periodMonth)

  return {
    title,
    periodYear: report.periodYear,
    periodMonth: report.periodMonth,
    reportScope: REPORT_SCOPE,
    properties: {
      title,
      onTimePct: report.summary.onTimePct,
      previousOnTimePct: report.summary.previousOnTimePct,
      lateDrops: report.summary.lateDrops,
      overdue: report.summary.overdue,
      carryOver: report.summary.carryOver,
      totalTasks: report.summary.totalTasks,
      efeonceTasks: report.summary.efeonceTasks,
      skyTasks: report.summary.skyTasks,
      executiveSummary: report.executiveSummary,
      alertText: report.alertText,
      topPerformer: report.topPerformer
        ? `${report.topPerformer.memberName} — ${report.topPerformer.otdPct ?? 0}% OT (${report.topPerformer.throughputCount} tareas)`
        : 'Sin top performer',
      trendLabel: mapTrendLabel(report.summary.trend),
      quarter: getQuarterLabel(report.periodMonth)
    },
    blocks: buildBlocks(report, title),
    summary: {
      onTimePct: report.summary.onTimePct,
      lateDrops: report.summary.lateDrops,
      overdue: report.summary.overdue,
      carryOver: report.summary.carryOver,
      totalTasks: report.summary.totalTasks,
      efeonceTasks: report.summary.efeonceTasks,
      skyTasks: report.summary.skyTasks,
      trendLabel: mapTrendLabel(report.summary.trend)
    }
  }
}

const buildPayloadHash = (payload: DeliveryPerformancePublicationPayload) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex')

const buildPublicationRunId = () => `EO-NPR-${randomUUID().slice(0, 8).toUpperCase()}`

const getDefaultPeriod = () => {
  const now = new Date()
  const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))

  return {
    periodYear: previousMonthDate.getUTCFullYear(),
    periodMonth: previousMonthDate.getUTCMonth() + 1
  }
}

const assertLockedPeriod = async (periodYear: number, periodMonth: number) => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<{ locked_rows: number }>(`
    SELECT COUNT(*) AS locked_rows
    FROM \`${projectId}.ico_engine.delivery_task_monthly_snapshots\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
      AND snapshot_status = 'locked'
  `, { periodYear, periodMonth })

  if ((rows[0]?.locked_rows ?? 0) <= 0) {
    throw new Error(`No locked delivery snapshot found for ${periodYear}-${String(periodMonth).padStart(2, '0')}`)
  }
}

const queryExistingPage = async (databaseId: string, title: string) => {
  const response = await notionRequest<QueryDatabaseResponse>(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        property: 'Informe',
        title: { equals: title }
      },
      page_size: 1
    })
  })

  return response.results?.[0]?.id ?? null
}

const createPage = async (databaseId: string, properties: Record<string, unknown>) => {
  const response = await notionRequest<PageResponse>('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      icon: { emoji: '📊' },
      properties
    })
  })

  return response.id
}

const updatePageProperties = async (pageId: string, properties: Record<string, unknown>) => {
  await notionRequest<PageResponse>(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  })
}

const listChildBlocks = async (pageId: string) => {
  const blockIds: string[] = []
  let startCursor: string | null = null

  do {
    const searchParams = new URLSearchParams({ page_size: '100' })

    if (startCursor) {
      searchParams.set('start_cursor', startCursor)
    }

    const response = await notionRequest<BlockListResponse>(`/blocks/${pageId}/children`, {
      method: 'GET',
      searchParams
    })

    for (const result of response.results ?? []) {
      if (result.id) {
        blockIds.push(result.id)
      }
    }

    startCursor = response.has_more ? (response.next_cursor ?? null) : null
  } while (startCursor)

  return blockIds
}

const archiveBlocks = async (blockIds: string[]) => {
  for (const blockId of blockIds) {
    await notionRequest(`/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true })
    })
  }
}

const appendChildren = async (pageId: string, blocks: Array<Record<string, unknown>>) => {
  for (let index = 0; index < blocks.length; index += 50) {
    await notionRequest(`/blocks/${pageId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({
        children: blocks.slice(index, index + 50)
      })
    })
  }
}

const replacePageContent = async (pageId: string, blocks: Array<Record<string, unknown>>) => {
  const existingBlockIds = await listChildBlocks(pageId)

  if (existingBlockIds.length > 0) {
    await archiveBlocks(existingBlockIds)
  }

  if (blocks.length > 0) {
    await appendChildren(pageId, blocks)
  }
}

export async function publishDeliveryPerformanceReportToNotion(options?: {
  periodYear?: number
  periodMonth?: number
  spaceId?: string
  force?: boolean
  dryRun?: boolean
  createdBy?: string | null
}): Promise<PublishDeliveryPerformanceReportResult> {
  const defaultPeriod = getDefaultPeriod()
  const periodYear = options?.periodYear ?? defaultPeriod.periodYear
  const periodMonth = options?.periodMonth ?? defaultPeriod.periodMonth

  const target = options?.spaceId
    ? await getSpaceNotionPublicationTarget(options.spaceId, PUBLICATION_KEY)
    : await getDefaultSpaceNotionPublicationTarget(PUBLICATION_KEY)

  if (!target) {
    throw new Error('No active Notion publication target configured for delivery performance reports')
  }

  if (!target.notionDatabaseId) {
    throw new Error(`Publication target ${target.targetId} does not have notion_database_id configured`)
  }

  await assertLockedPeriod(periodYear, periodMonth)

  const report = await readAgencyPerformanceReport(periodYear, periodMonth)
  const payload = buildPayload(report)
  const payloadHash = buildPayloadHash(payload)
  const existingPageId = await queryExistingPage(target.notionDatabaseId, payload.title)

  if (!options?.force) {
    const existing = await findSuccessfulPublicationRunByHash({
      spaceId: target.spaceId,
      publicationKey: PUBLICATION_KEY,
      reportScope: REPORT_SCOPE,
      periodYear,
      periodMonth,
      payloadHash
    })

    if (existing) {
      return {
        publicationRunId: existing.publicationRunId,
        status: 'skipped',
        periodYear,
        periodMonth,
        reportScope: REPORT_SCOPE,
        targetPageId: existing.targetPageId,
        targetDatabaseId: existing.targetDatabaseId,
        spaceId: target.spaceId,
        payloadHash,
        dryRun: Boolean(options?.dryRun),
        message: 'Skipped: identical payload already published to Notion'
      }
    }
  }

  if (options?.dryRun) {
    return {
      publicationRunId: 'dry-run',
      status: 'skipped',
      periodYear,
      periodMonth,
      reportScope: REPORT_SCOPE,
      targetPageId: existingPageId,
      targetDatabaseId: target.notionDatabaseId,
      spaceId: target.spaceId,
      payloadHash,
      dryRun: true,
      message: `Dry run ready for ${payload.title}`
    }
  }

  const publicationRunId = buildPublicationRunId()

  await createPublicationRun({
    publicationRunId,
    integrationKey: INTEGRATION_KEY,
    targetId: target.targetId,
    spaceId: target.spaceId,
    publicationKey: PUBLICATION_KEY,
    reportScope: REPORT_SCOPE,
    periodYear,
    periodMonth,
    targetDatabaseId: target.notionDatabaseId,
    payloadHash,
    createdBy: options?.createdBy ?? 'TASK-202',
    metadata: {
      title: payload.title,
      force: Boolean(options?.force)
    }
  })

  try {
    const properties = buildProperties(report, payload.title)
    const pageId = existingPageId ?? await createPage(target.notionDatabaseId, properties)

    if (existingPageId) {
      await updatePageProperties(pageId, properties)
    }

    await replacePageContent(pageId, payload.blocks)

    await completePublicationRun({
      publicationRunId,
      status: 'succeeded',
      targetPageId: pageId,
      payloadHash,
      resultSummary: `Published ${payload.title} to Notion database ${target.notionDatabaseId}`,
      metadata: {
        summary: payload.summary
      }
    })

    await publishOutboxEvent({
      aggregateType: 'ico_materialization',
      aggregateId: `${REPORT_SCOPE}:${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      eventType: 'notion.delivery_performance_report.published',
      payload: {
        integrationKey: INTEGRATION_KEY,
        publicationRunId,
        publicationKey: PUBLICATION_KEY,
        reportScope: REPORT_SCOPE,
        periodYear,
        periodMonth,
        spaceId: target.spaceId,
        targetPageId: pageId,
        targetDatabaseId: target.notionDatabaseId,
        payloadHash
      }
    })

    return {
      publicationRunId,
      status: 'succeeded',
      periodYear,
      periodMonth,
      reportScope: REPORT_SCOPE,
      targetPageId: pageId,
      targetDatabaseId: target.notionDatabaseId,
      spaceId: target.spaceId,
      payloadHash,
      message: `Published ${payload.title} to Notion`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await completePublicationRun({
      publicationRunId,
      status: 'failed',
      payloadHash,
      errorMessage: message,
      resultSummary: 'Publication failed'
    })

    throw error
  }
}
