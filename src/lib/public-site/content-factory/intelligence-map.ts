import { createHash } from 'node:crypto'

import { inspectPublicSiteBridge, type PublicSiteBridgeInspectionReport } from '../bridge-inspection'

export type ContentFactoryEditorModel = 'gutenberg_blocks' | 'elementor_document' | 'classic_or_unknown'

export type ContentFactoryNativeKind = 'blockName' | 'widgetType' | 'themeMeta' | 'asset' | 'seo' | 'hubspot'

export type ContentFactoryRisk = 'low' | 'medium' | 'high'

export type ContentFactoryInspectionTarget = {
  wordpressPostId: number
  label?: string
}

export type ContentFactoryInspectionModule = {
  nativeKind: ContentFactoryNativeKind
  key: string
  count?: number
  settingsKeys?: string[]
  anchors?: string[]
  risk?: ContentFactoryRisk
}

export type ContentFactoryInspectionObject = {
  wordpressPostId: number
  url?: string
  slug: string
  title: string
  postType: 'post' | 'page' | 'landing'
  wordpressPostType?: string
  status: string
  editorModel: ContentFactoryEditorModel
  modifiedGmt?: string
  contentFingerprint?: string
  modules: ContentFactoryInspectionModule[]
  summary: {
    elementorElements?: number
    elementorWidgets?: number
    gutenbergBlocks?: number
    topLevelBlocks?: number
    topLevelElements?: number
    semanticAnchorsCount: number
    ohioMetaKeysCount: number
  }
  freshness: {
    scannedAt: string
    sourceEndpoint: 'greenhouse_wp_bridge'
    sourceInspectionGeneratedAt: string
    bridgeVersion?: string
  }
  accessIssues: Array<{
    endpoint: 'health' | 'elementorDocument' | 'blockDocument' | 'ohioWidgetCatalog'
    status: number
    code: string
  }>
}

export type ContentFactoryInspectionMap = {
  contractVersion: 'contentFactoryInspectionMap.v1'
  scannedAt: string
  source: 'greenhouse_wp_bridge'
  bridgeVersion?: string
  baseUrl: string
  targets: ContentFactoryInspectionTarget[]
  objects: ContentFactoryInspectionObject[]
  runtime: {
    site: unknown
    theme: unknown
    capabilities: unknown
    security: unknown
  }
  catalog: {
    ohioWidgets: Array<{ name?: string; title?: string }>
    hubspotWidgets: Array<{ name?: string; title?: string }>
    totalWidgets: number
    ohioCount: number
    hubspotCount: number
  } | null
  safetyPolicy: {
    writesWordPressContent: false
    publishesContent: false
    clearsCache: false
    createsBackup: false
    sendsSecretsToOutput: false
  }
}

export type BuildContentFactoryInspectionMapOptions = {
  scannedAt?: string
  targets?: ContentFactoryInspectionTarget[]
}

export type InspectContentFactoryInspectionMapOptions = {
  targets: ContentFactoryInspectionTarget[]
  includeCatalog?: boolean
  baseUrl?: string
}

const DEFAULT_CONTENT_FACTORY_TARGETS: ContentFactoryInspectionTarget[] = [
  { wordpressPostId: 249766, label: 'latest_gutenberg_post_sample' },
  { wordpressPostId: 244079, label: 'hubspot_elementor_landing_sample' }
]

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())).map(value => value.trim()))).sort()

const normalizeCountMap = (value: unknown): Record<string, number> => {
  if (Array.isArray(value)) {
    return Object.fromEntries(
      value
        .map(item => asRecord(item))
        .map(item => [asString(item.name ?? item.key), asNumber(item.count)] as const)
        .filter(([key, count]) => Boolean(key) && count > 0)
    )
  }

  return Object.fromEntries(
    Object.entries(asRecord(value))
      .map(([key, count]) => [key, asNumber(count)] as const)
      .filter(([key, count]) => Boolean(key) && count > 0)
  )
}

const inferRisk = (nativeKind: ContentFactoryNativeKind, key: string): ContentFactoryRisk => {
  if (nativeKind === 'themeMeta' || nativeKind === 'seo') return 'medium'
  if (nativeKind === 'hubspot') return 'medium'
  if (key === 'core/freeform') return 'medium'
  if (key.includes('script') || key.includes('html')) return 'high'

  return 'low'
}

const fingerprint = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')

const collectEndpointIssues = (report: PublicSiteBridgeInspectionReport): ContentFactoryInspectionObject['accessIssues'] => {
  const issues: ContentFactoryInspectionObject['accessIssues'] = []

  if (!report.endpoints.health.ok) {
    issues.push({ endpoint: 'health', status: report.endpoints.health.status, code: 'bridge_health_unavailable' })
  }

  if (!report.endpoints.elementorDocument.ok) {
    issues.push({
      endpoint: 'elementorDocument',
      status: report.endpoints.elementorDocument.status,
      code: 'elementor_document_unavailable'
    })
  }

  if (report.endpoints.blockDocument && !report.endpoints.blockDocument.ok) {
    issues.push({
      endpoint: 'blockDocument',
      status: report.endpoints.blockDocument.status,
      code: 'block_document_unavailable'
    })
  }

  if (report.endpoints.ohioWidgetCatalog && !report.endpoints.ohioWidgetCatalog.ok) {
    issues.push({
      endpoint: 'ohioWidgetCatalog',
      status: report.endpoints.ohioWidgetCatalog.status,
      code: 'ohio_widget_catalog_unavailable'
    })
  }

  return issues
}

const normalizePost = (report: PublicSiteBridgeInspectionReport) => {
  const elementorPost = asRecord(report.endpoints.elementorDocument.summary.post)
  const blockPost = asRecord(report.endpoints.blockDocument?.summary.post)
  const post = Object.keys(elementorPost).length > 0 ? elementorPost : blockPost

  return {
    id: asNumber(post.id, report.pageId),
    type: asString(post.type, 'unknown'),
    status: asString(post.status, 'unknown'),
    slug: asString(post.slug, `wordpress-post-${report.pageId}`),
    title: asString(post.title, `WordPress object ${report.pageId}`),
    modified: asString(post.modified)
  }
}

const collectBlockModules = (report: PublicSiteBridgeInspectionReport): ContentFactoryInspectionModule[] => {
  const blockSummary = asRecord(report.endpoints.blockDocument?.summary.blocksSummary)
  const byBlockName = normalizeCountMap(blockSummary.byBlockName)
  const topLevelBlocks = Array.isArray(blockSummary.topLevelBlocks) ? blockSummary.topLevelBlocks.map(asRecord) : []

  return Object.entries(byBlockName).map(([key, count]) => {
    const relatedBlocks = topLevelBlocks.filter(block => asString(block.blockName) === key)

    const settingsKeys = uniqueSorted(
      relatedBlocks.flatMap(block => (Array.isArray(block.attrs) ? block.attrs.map(attr => String(attr)) : []))
    )

    const anchors = uniqueSorted(
      relatedBlocks.flatMap(block => [
        asString(block.anchor),
        ...(Array.isArray(block.classes) ? block.classes.map(className => String(className)) : [])
      ])
    )

    return {
      nativeKind: 'blockName',
      key,
      count,
      ...(settingsKeys.length ? { settingsKeys } : {}),
      ...(anchors.length ? { anchors } : {}),
      risk: inferRisk('blockName', key)
    }
  })
}

const collectElementorModules = (report: PublicSiteBridgeInspectionReport): ContentFactoryInspectionModule[] => {
  const elementsSummary = asRecord(report.endpoints.elementorDocument.summary.elementsSummary)
  const byWidgetType = normalizeCountMap(elementsSummary.byWidgetType)

  const topLevelElements = Array.isArray(elementsSummary.topLevelElements)
    ? elementsSummary.topLevelElements.map(asRecord)
    : []

  return Object.entries(byWidgetType).flatMap(([key, count]) => {
    const relatedElements = topLevelElements.filter(element => asString(element.widgetType) === key)

    const anchors = uniqueSorted(
      relatedElements.flatMap(element =>
        Array.isArray(element.cssClasses) ? element.cssClasses.map(className => String(className)) : []
      )
    )

    const widgetModule: ContentFactoryInspectionModule = {
      nativeKind: 'widgetType',
      key,
      count,
      ...(anchors.length ? { anchors } : {}),
      risk: inferRisk('widgetType', key)
    }

    if (key.includes('hubspot')) {
      return [
        widgetModule,
        {
          nativeKind: 'hubspot',
          key,
          count,
          ...(anchors.length ? { anchors } : {}),
          risk: inferRisk('hubspot', key)
        }
      ]
    }

    return [widgetModule]
  })
}

const collectThemeMetaModules = (report: PublicSiteBridgeInspectionReport): ContentFactoryInspectionModule[] =>
  report.endpoints.elementorDocument.summary.ohioMetaKeys.map(key => ({
    nativeKind: 'themeMeta',
    key,
    count: 1,
    risk: inferRisk('themeMeta', key)
  }))

const resolveEditorModel = (report: PublicSiteBridgeInspectionReport): ContentFactoryEditorModel => {
  const elementor = asRecord(report.endpoints.elementorDocument.summary.elementor)
  const editor = asRecord(report.endpoints.blockDocument?.summary.editor)

  if (elementor.hasData === true) return 'elementor_document'
  if (editor.hasBlocks === true) return 'gutenberg_blocks'

  return 'classic_or_unknown'
}

const normalizeObject = (report: PublicSiteBridgeInspectionReport): ContentFactoryInspectionObject => {
  const post = normalizePost(report)
  const editorModel = resolveEditorModel(report)
  const bridgeVersion = asString(asRecord(report.endpoints.health.summary.plugin).version) || undefined
  const elementorSummary = asRecord(report.endpoints.elementorDocument.summary.elementsSummary)
  const blockSummary = asRecord(report.endpoints.blockDocument?.summary.blocksSummary)

  const semanticAnchorsCount =
    report.endpoints.elementorDocument.summary.semanticAnchors.length +
    (report.endpoints.blockDocument?.summary.semanticAnchors.length ?? 0)

  const modules = [
    ...collectBlockModules(report),
    ...collectElementorModules(report),
    ...collectThemeMetaModules(report)
  ].sort((left, right) => `${left.nativeKind}:${left.key}`.localeCompare(`${right.nativeKind}:${right.key}`))

  const postType =
    post.type === 'post' ? 'post' : editorModel === 'elementor_document' && post.type === 'page' ? 'landing' : 'page'

  const contentFingerprint = fingerprint({
    wordpressPostId: report.pageId,
    modified: post.modified,
    editorModel,
    modules: modules.map(module => ({
      nativeKind: module.nativeKind,
      key: module.key,
      count: module.count,
      settingsKeys: module.settingsKeys,
      anchors: module.anchors
    }))
  })

  return {
    wordpressPostId: post.id,
    url: `${report.baseUrl}/${post.slug}/`,
    slug: post.slug,
    title: post.title,
    postType,
    wordpressPostType: post.type,
    status: post.status,
    editorModel,
    ...(post.modified ? { modifiedGmt: post.modified } : {}),
    contentFingerprint,
    modules,
    summary: {
      elementorElements: asNumber(elementorSummary.totalElements),
      elementorWidgets: asNumber(asRecord(elementorSummary.byElType).widget),
      gutenbergBlocks: asNumber(blockSummary.totalBlocks),
      topLevelBlocks: asNumber(blockSummary.topLevelBlockCount),
      topLevelElements: Array.isArray(elementorSummary.topLevelElements) ? elementorSummary.topLevelElements.length : 0,
      semanticAnchorsCount,
      ohioMetaKeysCount: report.endpoints.elementorDocument.summary.ohioMetaKeys.length
    },
    freshness: {
      scannedAt: report.generatedAt,
      sourceEndpoint: 'greenhouse_wp_bridge',
      sourceInspectionGeneratedAt: report.generatedAt,
      ...(bridgeVersion ? { bridgeVersion } : {})
    },
    accessIssues: collectEndpointIssues(report)
  }
}

export const buildContentFactoryInspectionMapFromBridgeReports = (
  reports: PublicSiteBridgeInspectionReport[],
  options: BuildContentFactoryInspectionMapOptions = {}
): ContentFactoryInspectionMap => {
  if (!reports.length) {
    throw new Error('content_factory_inspection_reports_required')
  }

  const primaryReport = reports[0]
  const scannedAt = options.scannedAt ?? new Date().toISOString()
  const health = primaryReport.endpoints.health.summary
  const catalogReport = reports.find(report => report.endpoints.ohioWidgetCatalog?.ok && report.endpoints.ohioWidgetCatalog)
  const catalogSummary = catalogReport?.endpoints.ohioWidgetCatalog?.summary
  const bridgeVersion = asString(asRecord(health.plugin).version) || undefined

  return {
    contractVersion: 'contentFactoryInspectionMap.v1',
    scannedAt,
    source: 'greenhouse_wp_bridge',
    ...(bridgeVersion ? { bridgeVersion } : {}),
    baseUrl: primaryReport.baseUrl,
    targets:
      options.targets ??
      reports.map(report => ({
        wordpressPostId: report.pageId
      })),
    objects: reports.map(normalizeObject),
    runtime: {
      site: health.site,
      theme: health.theme,
      capabilities: health.capabilities,
      security: health.security
    },
    catalog: catalogSummary
      ? {
          ohioWidgets: catalogSummary.ohioWidgets,
          hubspotWidgets: catalogSummary.hubspotWidgets,
          totalWidgets: catalogSummary.totalWidgets,
          ohioCount: catalogSummary.ohioCount,
          hubspotCount: catalogSummary.hubspotCount
        }
      : null,
    safetyPolicy: {
      writesWordPressContent: false,
      publishesContent: false,
      clearsCache: false,
      createsBackup: false,
      sendsSecretsToOutput: false
    }
  }
}

export const inspectContentFactoryInspectionMap = async (
  options: InspectContentFactoryInspectionMapOptions
): Promise<ContentFactoryInspectionMap> => {
  if (!options.targets.length) {
    throw new Error('content_factory_inspection_targets_required')
  }

  const reports: PublicSiteBridgeInspectionReport[] = []

  for (let index = 0; index < options.targets.length; index += 1) {
    const target = options.targets[index]

    reports.push(
      await inspectPublicSiteBridge({
        pageId: target.wordpressPostId,
        includeBlockDocument: true,
        includeCatalog: options.includeCatalog === false ? false : index === 0,
        baseUrl: options.baseUrl
      })
    )
  }

  return buildContentFactoryInspectionMapFromBridgeReports(reports, {
    targets: options.targets
  })
}

export const getDefaultContentFactoryInspectionTargets = () => [...DEFAULT_CONTENT_FACTORY_TARGETS]
