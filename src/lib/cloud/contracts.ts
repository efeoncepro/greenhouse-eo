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

export type CloudSecretSource = 'secret_manager' | 'env' | 'unconfigured'

export interface CloudSecretPostureEntry {
  key: string
  envVarName: string
  secretRefEnvVarName: string
  secretRefConfigured: boolean
  source: CloudSecretSource
}

export interface CloudSecretsPosture {
  summary: string
  entries: CloudSecretPostureEntry[]
}

export interface CloudObservabilityPosture {
  summary: string
  sentry: {
    dsnConfigured: boolean
    authTokenConfigured: boolean
    enabled: boolean
  }
  slack: {
    alertsWebhookConfigured: boolean
    enabled: boolean
  }
}
