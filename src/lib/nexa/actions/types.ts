// TASK-1137 — Nexa governed action runtime: contracts.
//
// A NexaActionProposal is NOT a write. It is the read-only, permission-checked, preview-built
// artifact that Nexa surfaces to a human who must explicitly confirm before anything mutates.
// The LLM can only PROPOSE a registered actionKey (never an endpoint, URL, or SQL); the human
// confirms; a deterministic server endpoint executes the bound command via the API Platform
// command/idempotency foundation (TASK-655). "Actions are governed, not inferred."
//
// This file is pure types + one version const (no `server-only`): the proposal contract travels
// to the client on `NexaResponse.actionProposals`. The registry-side types (NexaActionDefinition,
// NexaActionContext) are erased at runtime and live here for cohesion.

export const NEXA_ACTION_PROPOSAL_CONTRACT_VERSION = 'nexa-action-proposal.v1' as const

export type NexaActionSensitivity = 'low' | 'medium' | 'high'

export interface NexaActionPreviewMetric {
  label: string
  value: string
}

/**
 * The governed proposal surfaced to the human. Carries everything the UI needs to render a
 * confirm card and everything the confirm endpoint needs to execute idempotently. NEVER a write.
 */
export interface NexaActionProposal {
  contractVersion: typeof NEXA_ACTION_PROPOSAL_CONTRACT_VERSION
  /** Server-generated UUID identifying this proposal instance. Binds the idempotency key. */
  proposalId: string
  /** Registered, deterministic action key. The LLM cannot invent this. */
  actionKey: string
  /** Human-readable intent (es-CL). */
  intent: string
  sensitivity: NexaActionSensitivity
  /** What WILL happen, shown BEFORE confirmation. Built from fresh, real data. */
  preview: {
    title: string
    summary: string
    metrics: NexaActionPreviewMetric[]
  }
  /** Copy for the human confirmation surface. */
  confirmation: {
    title: string
    body: string
    confirmLabel: string
    cancelLabel: string
  }
  /** How the human confirms. The LLM never calls this; only the human-triggered UI does. */
  execution: {
    /** Deterministic confirm endpoint, e.g. /api/nexa/actions/mark_notifications_read/confirm. */
    confirmEndpoint: string
    /** Server-generated idempotency key bound to this proposal; the UI echoes it on confirm. */
    idempotencyKey: string
  }
  /** ISO timestamp; a proposal past this must be re-requested (stale → re-resolve). */
  expiresAt: string
}

/**
 * Honest degradation when the resolver cannot produce a proposal (unknown/unsupported action,
 * no permission, runtime disabled, or no canonical command binding). Nexa offers a deep-link/CTA
 * or states the gap — it NEVER invents an endpoint or executes.
 */
export type NexaActionGapReason =
  | 'unknown_action'
  | 'not_permitted'
  | 'runtime_disabled'
  | 'no_command_binding'
  | 'unavailable'

export interface NexaActionGap {
  reason: NexaActionGapReason
  /** es-CL explanation safe to show the user. */
  message: string
  /** Optional CTA the human can follow instead (complements TASK-435 CTAs, never replaces them). */
  deepLink?: string
}

// ── Registry-side (server) types ─────────────────────────────────────────────

/** Minimal session-derived context an action needs. Never trusts client-supplied identity. */
export interface NexaActionContext {
  userId: string
  memberId?: string
  clientId: string | null
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  routeGroups: string[]
}

export interface NexaActionPreviewResult {
  title: string
  summary: string
  metrics: NexaActionPreviewMetric[]
}

export interface NexaActionExecutionResult {
  ok: boolean
  /** es-CL summary of what happened, safe to surface. */
  summary: string
  metrics?: NexaActionPreviewMetric[]
  raw?: Record<string, unknown>
}

/**
 * A registered action. The registry maps actionKey → this definition. The LLM never sees the
 * command binding — only the key. The resolver enforces enablement + permission deterministically.
 */
export interface NexaActionDefinition {
  actionKey: string
  intent: string
  sensitivity: NexaActionSensitivity
  /** Domain this action belongs to (audit/telemetry). NEVER finance/payroll/legal/security in V1 pilots. */
  domain: string
  /** Domain capability backing the action beyond the runtime capability, or null for self-actions. */
  requiredCapability: string | null
  /** Runtime/feature gate (flag + per-action allowlist). False → resolver returns runtime_disabled gap. */
  isEnabled: () => boolean
  /** Deterministic permission check from session context. False → not_permitted gap. */
  isPermitted: (context: NexaActionContext) => boolean
  /** Builds a fresh, real-data preview. Read-only — NEVER mutates. */
  buildPreview: (context: NexaActionContext) => Promise<NexaActionPreviewResult>
  /** The bound command. Runs ONLY from the confirm endpoint, inside the idempotency foundation. */
  execute: (context: NexaActionContext) => Promise<NexaActionExecutionResult>
  confirmation: {
    title: string
    body: string
    confirmLabel: string
    cancelLabel: string
  }
  /** Deep-link offered when the action can't be proposed (gap fallback). */
  deepLinkFallback?: string
  /** Proposal validity window in seconds. */
  expirationSeconds: number
}
