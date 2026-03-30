export type CloudHealthStatus = 'ok' | 'degraded' | 'error' | 'not_configured'

export interface CloudHealthCheck {
  name: string
  ok: boolean
  status: CloudHealthStatus
  summary: string
  latencyMs?: number
  details?: Record<string, unknown>
}

export type CloudPostureStatus = 'ok' | 'warning' | 'unconfigured'

export interface CloudPostureCheck {
  name: string
  status: CloudPostureStatus
  summary: string
}

export interface CloudHealthSnapshot {
  ok: boolean
  overallStatus: 'ok' | 'degraded' | 'error'
  summary: string
  runtimeChecks: CloudHealthCheck[]
  postureChecks: CloudPostureCheck[]
  checks: CloudHealthCheck[]
  timestamp: string
}

export type CloudAuthMode = 'wif' | 'service_account_key' | 'mixed' | 'unconfigured'

export interface CloudGcpAuthPosture {
  mode: CloudAuthMode
  summary: string
  oidcAvailable: boolean
  selectedSource: 'wif' | 'service_account_key' | 'ambient_adc'
  workloadIdentityConfigured: boolean
  serviceAccountKeyConfigured: boolean
  serviceAccountEmailConfigured: boolean
  providerConfigured: boolean
}

export interface CloudPostgresPosture {
  configured: boolean
  usesConnector: boolean
  sslEnabled: boolean
  maxConnections: number
  meetsRecommendedPool: boolean
  summary: string
  risks: string[]
}

export interface CloudPostgresAccessProfile {
  profile: 'runtime' | 'migrator' | 'admin'
  configured: boolean
  secretRefConfigured: boolean
  source: CloudSecretSource
  envVarName: string
  secretRefEnvVarName: string
  summary: string
}

export interface CloudPostgresAccessProfilesPosture {
  summary: string
  profiles: CloudPostgresAccessProfile[]
}

export type CloudSecretSource = 'secret_manager' | 'env' | 'unconfigured'

export interface CloudSecretPostureEntry {
  key: string
  envVarName: string
  secretRefEnvVarName: string
  secretRefConfigured: boolean
  source: CloudSecretSource
  classification: 'runtime' | 'tooling'
}

export interface CloudSecretsPosture {
  summary: string
  runtimeSummary: string
  toolingSummary: string
  entries: CloudSecretPostureEntry[]
}

export interface CloudObservabilityPosture {
  summary: string
  sentry: {
    dsnConfigured: boolean
    clientDsnConfigured: boolean
    authTokenConfigured: boolean
    orgConfigured: boolean
    projectConfigured: boolean
    enabled: boolean
    sourceMapsReady: boolean
  }
  slack: {
    alertsWebhookConfigured: boolean
    enabled: boolean
  }
}

export type CloudSentryIncidentLevel = 'error' | 'warning' | 'info' | 'fatal' | 'unknown'
export type CloudSentryIncidentsStatus = 'ok' | 'warning' | 'unconfigured'

export interface CloudSentryIncident {
  id: string
  shortId: string | null
  title: string
  location: string
  level: CloudSentryIncidentLevel
  priority: string | null
  status: string
  count: number
  userCount: number
  firstSeen: string | null
  lastSeen: string | null
  release: string | null
  environment: string | null
  permalink: string | null
}

export interface CloudSentryIncidentsSnapshot {
  status: CloudSentryIncidentsStatus
  enabled: boolean
  available: boolean
  summary: string
  incidents: CloudSentryIncident[]
  fetchedAt: string
  error: string | null
}
