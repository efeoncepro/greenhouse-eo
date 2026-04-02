export type NotionGovernanceMatchConfidence = 'HIGH' | 'MEDIUM'

export type NotionDatabaseKind = 'proyectos' | 'tareas' | 'sprints' | 'revisiones'

export interface NotionPropertyDefinition {
  id: string
  type: string
  options?: string[]
  groups?: string[]
  expression?: string
  relationDb?: string
  numberFormat?: string
}

export interface CoreKpiContractField {
  conformedField: string
  databaseKind: NotionDatabaseKind
  targetType: string
  description: string
  required: boolean
}

export interface NotionCoreFieldSuggestion {
  conformedField: string
  databaseKind: NotionDatabaseKind
  targetType: string
  required: boolean
  notionPropertyName: string
  notionType: string
  coercionRule: string
  confidence: NotionGovernanceMatchConfidence
  reason: string
}

export type NotionGovernanceCoverageStatus = 'mapped' | 'suggested' | 'missing'

export interface NotionGovernanceCoverageItem {
  conformedField: string
  databaseKind: NotionDatabaseKind
  targetType: string
  required: boolean
  status: NotionGovernanceCoverageStatus
  notionPropertyName: string | null
  notionType: string | null
  coercionRule: string | null
  source: 'space_property_mappings' | 'schema_suggestion' | 'missing'
  confidence: NotionGovernanceMatchConfidence | null
}

export interface NotionGovernanceDriftChange {
  changeType: 'added' | 'removed' | 'type_changed' | 'database_rebound'
  propertyName?: string
  previousType?: string | null
  currentType?: string | null
  reason: string
}

export type NotionGovernanceDriftStatus = 'compatible' | 'warning' | 'breaking'

export interface NotionGovernanceDriftEvent {
  driftEventId: string
  databaseKind: NotionDatabaseKind
  notionDatabaseId: string
  driftStatus: NotionGovernanceDriftStatus
  detectedAt: string
  resolvedAt: string | null
  changes: NotionGovernanceDriftChange[]
}

export interface NotionGovernanceIssue {
  code: string
  databaseKind?: NotionDatabaseKind
  conformedField?: string
  message: string
}

export interface NotionGovernanceDatabaseStatus {
  databaseKind: NotionDatabaseKind
  configured: boolean
  notionDatabaseId: string | null
  snapshotId: string | null
  schemaVersion: number | null
  databaseTitle: string | null
  lastDiscoveredAt: string | null
  hasDrift: boolean
  driftStatus: NotionGovernanceDriftStatus | null
}

export interface NotionGovernanceSnapshot {
  snapshotId: string
  databaseKind: NotionDatabaseKind
  notionDatabaseId: string
  databaseTitle: string
  schemaVersion: number
  schemaHash: string
  discoveredAt: string
  isCurrent: boolean
  propertyCount: number
  suggestions: NotionCoreFieldSuggestion[]
}

export type NotionGovernanceReadinessStatus = 'ready' | 'warning' | 'blocked' | 'unknown'

export interface NotionGovernanceReadiness {
  readinessId: string
  contractVersion: string
  readinessStatus: NotionGovernanceReadinessStatus
  evaluatedAt: string
  blockingIssues: NotionGovernanceIssue[]
  warnings: NotionGovernanceIssue[]
  databaseStatus: NotionGovernanceDatabaseStatus[]
  coreFieldCoverage: NotionGovernanceCoverageItem[]
  mappingSummary: {
    persistedMappings: number
    mappedCoreFields: number
    suggestedCoreFields: number
    missingCoreFields: number
  }
}

export interface NotionGovernanceSummary {
  spaceId: string
  sourceId: string | null
  canRefreshSchema: boolean
  snapshots: NotionGovernanceSnapshot[]
  driftEvents: NotionGovernanceDriftEvent[]
  readiness: NotionGovernanceReadiness | null
}
