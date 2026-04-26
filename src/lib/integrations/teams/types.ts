import 'server-only'

export type TeamsAdaptiveCardActionOpenUrl = {
  type: 'Action.OpenUrl'
  title: string
  url: string
}

export type TeamsAdaptiveCardTextBlock = {
  type: 'TextBlock'
  text: string
  size?: 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge'
  weight?: 'Lighter' | 'Default' | 'Bolder'
  color?: 'Default' | 'Dark' | 'Light' | 'Accent' | 'Good' | 'Warning' | 'Attention'
  isSubtle?: boolean
  wrap?: boolean
  spacing?: 'None' | 'Small' | 'Default' | 'Medium' | 'Large' | 'ExtraLarge' | 'Padding'
  separator?: boolean
}

export type TeamsAdaptiveCardFactSet = {
  type: 'FactSet'
  facts: Array<{ title: string; value: string }>
  spacing?: 'None' | 'Small' | 'Default' | 'Medium' | 'Large'
  separator?: boolean
}

export type TeamsAdaptiveCardContainer = {
  type: 'Container'
  items: TeamsAdaptiveCardElement[]
  style?: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent'
  spacing?: 'None' | 'Small' | 'Default' | 'Medium' | 'Large'
  separator?: boolean
}

export type TeamsAdaptiveCardElement =
  | TeamsAdaptiveCardTextBlock
  | TeamsAdaptiveCardFactSet
  | TeamsAdaptiveCardContainer

export interface TeamsAdaptiveCard {
  $schema?: string
  type: 'AdaptiveCard'
  version: '1.5'
  body: TeamsAdaptiveCardElement[]
  actions?: TeamsAdaptiveCardActionOpenUrl[]
}

export type TeamsChannelKind = 'azure_logic_app' | 'teams_bot' | 'graph_rsc'

export type TeamsRecipientKind = 'channel' | 'chat_1on1' | 'chat_group' | 'dynamic_user'

export interface TeamsRecipientRoutingRule {
  /**
   * Dot-path into the event payload that yields a Greenhouse member_id.
   * Example: `"payload.assigneeMemberId"` resolves
   *   `{ payload: { assigneeMemberId: 'mem-123' } } => 'mem-123'`.
   */
  from: string
}

export interface TeamsChannelRecord {
  channel_code: string
  channel_kind: TeamsChannelKind
  display_name: string
  description: string | null
  secret_ref: string
  logic_app_resource_id: string | null
  bot_app_id: string | null
  team_id: string | null
  channel_id: string | null
  azure_tenant_id: string | null
  azure_subscription_id: string | null
  azure_resource_group: string | null
  disabled_at: Date | null
  recipient_kind: TeamsRecipientKind
  recipient_user_id: string | null
  recipient_chat_id: string | null
  recipient_routing_rule_json: TeamsRecipientRoutingRule | null
}

export type TeamsSendOutcome =
  | {
      ok: true
      channelCode: string
      channelKind: TeamsChannelKind
      durationMs: number
      attempts: number
    }
  | {
      ok: false
      channelCode: string
      channelKind: TeamsChannelKind
      durationMs: number
      attempts: number
      reason:
        | 'channel_not_found'
        | 'channel_disabled'
        | 'unsupported_channel_kind'
        | 'missing_secret'
        | 'missing_bot_app_config'
        | 'card_too_large'
        | 'http_error'
        | 'transport_error'
        | 'token_acquisition_failed'
        | 'recipient_unresolved'
        | 'recipient_not_in_tenant'
        | 'invalid_routing_rule'
      detail: string
    }

export interface TeamsSendOptions {
  correlationId?: string
  triggeredBy?: string
  sourceObjectId?: string
  /**
   * Override the runner mode tag in source_sync_runs (defaults to 'reactive').
   * Use 'manual' from the admin /test endpoint, 'cron' from scheduled jobs.
   */
  syncMode?: 'reactive' | 'manual' | 'cron' | 'poll'
  /**
   * Event payload for `recipient_kind='dynamic_user'` channels. The sender extracts
   * the member id via the channel's routing rule and resolves it to a Microsoft Graph
   * user before issuing the chat. Ignored for other recipient kinds.
   */
  eventPayload?: Record<string, unknown>
}

export class TeamsCardTooLargeError extends Error {
  constructor(public readonly bytes: number, public readonly limit: number) {
    super(`Adaptive Card payload is ${bytes} bytes, exceeds limit of ${limit} bytes`)
    this.name = 'TeamsCardTooLargeError'
  }
}

export class TeamsTransportError extends Error {
  constructor(message: string, public readonly status?: number, public readonly responseBody?: string) {
    super(message)
    this.name = 'TeamsTransportError'
  }
}
