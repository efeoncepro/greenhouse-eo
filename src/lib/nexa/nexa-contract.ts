import type { NexaActionProposal } from './actions/types'
import type { NexaTurnTelemetry } from './nexa-turn-telemetry'

export type NexaToolName =
  | 'check_payroll'
  | 'get_otd'
  | 'check_emails'
  | 'get_capacity'
  | 'pending_invoices'
  | 'search_knowledge'
  | 'explain_my_pay'
  | 'propose_action'
  | 'get_insight'
  | 'list_insights'
  | 'quote_price'

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

/**
 * TASK-1182 — conciencia de superficie (Nexa Insight ↔ Conversation Bridge, Slice 2). Hint
 * opcional de "qué está mirando el usuario" cuando abre el chat desde una superficie de dominio.
 * Es CONTEXTO, no permiso: el gate sigue siendo el subject + capability (el reader anti-oracle
 * decide qué se puede leer). `kind` es extensible (forward-compat para otros dominios addressable);
 * V1 solo `nexa_insight`.
 */
export interface NexaFocusRef {
  kind: 'nexa_insight'
  id: string
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
  focusRef?: NexaFocusRef
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
  /**
   * TASK-1137 — propuestas de acción gobernadas (governed action runtime). El LLM propone una
   * `actionKey` registrada vía el tool `propose_action`; el orquestador extrae las propuestas acá
   * para que la UI renderice un confirm-card. NO es un write: ejecutar requiere confirmación humana
   * vía el endpoint determinístico de confirmación (idempotency foundation TASK-655). Solo aparece
   * con `NEXA_ACTION_RUNTIME_ENABLED=true`.
   */
  actionProposals?: NexaActionProposal[]
  /**
   * TASK-1129 — telemetría de turno (observabilidad). El orquestador la adjunta; el endpoint la
   * STRIPEA antes de responder al cliente y la persiste en el ledger `nexa_turn_telemetry`.
   * NO es contenido de conversación y NO se rehidrata al leer un thread.
   */
  turnTelemetry?: NexaTurnTelemetry
}
