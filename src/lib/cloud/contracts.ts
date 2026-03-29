export type CloudHealthStatus = 'ok' | 'degraded' | 'error' | 'not_configured'

export interface CloudHealthCheck {
  name: string
  ok: boolean
  status: CloudHealthStatus
  summary: string
  latencyMs?: number
  details?: Record<string, unknown>
}

export interface CloudHealthSnapshot {
  ok: boolean
  checks: CloudHealthCheck[]
  timestamp: string
}

export type CloudAuthMode = 'wif' | 'service_account_key' | 'mixed' | 'unconfigured'

export interface CloudGcpAuthPosture {
  mode: CloudAuthMode
  summary: string
  oidcAvailable: boolean
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
