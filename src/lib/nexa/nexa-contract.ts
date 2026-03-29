export type NexaToolName =
  | 'check_payroll'
  | 'get_otd'
  | 'check_emails'
  | 'get_capacity'
  | 'pending_invoices'

export type NexaToolMetricTone = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface NexaToolMetric {
  label: string
  value: string
  tone?: NexaToolMetricTone
}

export interface NexaToolResult {
  available: boolean
  summary: string
  source: 'postgres' | 'bigquery' | 'mixed' | 'none'
  scopeLabel: string
  generatedAt: string
  metrics: NexaToolMetric[]
  notes?: string[]
  raw?: Record<string, unknown>
}

export interface NexaToolInvocation {
  toolCallId: string
  toolName: NexaToolName
  args: Record<string, unknown>
  result: NexaToolResult
}

export interface NexaFeedbackRequest {
  responseId: string
  sentiment: 'positive' | 'negative'
  comment?: string
}

export interface NexaFeedbackResponse {
  ok: boolean
}

export interface NexaThreadMessage {
  messageId: string
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: NexaToolInvocation[]
  suggestions?: string[]
  modelId?: string
  createdAt: string
}

export interface NexaThreadListItem {
  threadId: string
  title: string
  messageCount: number
  lastMessageAt: string
  createdAt: string
}

export interface NexaThreadDetail {
  threadId: string
  messages: NexaThreadMessage[]
}

export interface NexaRuntimeContext {
  userId: string
  clientId: string
  clientName: string
  tenantType: 'client' | 'efeonce_internal'
  role: string
  roleCodes: string[]
  routeGroups: string[]
  timezone: string
  organizationId?: string
  organizationName?: string
  memberId?: string
}

export interface NexaResponse {
  id: string
  role: 'assistant'
  content: string
  suggestions?: string[]
  timestamp: string
  toolInvocations?: NexaToolInvocation[]
  modelId?: string
  threadId?: string
}
