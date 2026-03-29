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
