/**
 * TASK-1288 Slice 4 — Growth AI Visibility · Brand Intelligence · Contracts.
 *
 * PURE contract (no IO) of the grounded shared read: ONE read of a brand (LLM over the
 * site's readable content + entity signals) → a structured snapshot that category
 * (TASK-1288), business_model (TASK-1289) and prompts (TASK-1290) DERIVE from.
 *
 * Two-plane model: `candidateCategoryNode` is a real MACRO/MID taxonomy node id (or
 * 'unknown') — NEVER an invented node; the router validates it against the catalog.
 * `fineCategory` is the long-tail descriptor as DATA (e.g. "fabricante de pinturas"),
 * NEVER a node.
 *
 * Provider-agnostic: Anthropic/Gemini/OpenAI are interchangeable adapters; the secret
 * resolves server-side. The read is 1×/brand/version (cached) — never per run.
 */

export const BRAND_INTELLIGENCE_VERSION = 'brand_intelligence_v1' as const

export const BRAND_INTELLIGENCE_PROVIDER_IDS = ['gemini', 'openai', 'anthropic'] as const
export type BrandIntelligenceProviderId = (typeof BRAND_INTELLIGENCE_PROVIDER_IDS)[number]

/**
 * Candidate business model (TASK-1289 will formalize the enum + override). 'unknown' is a
 * valid, honest answer. Kept here so the grounded read can emit the candidate in one pass.
 */
export const BRAND_BUSINESS_MODELS = [
  'consumer_b2c',
  'b2b_service_provider',
  'b2b_product_saas',
  'retail_ecommerce',
  'marketplace',
  'public_institution',
  'unknown'
] as const
export type BrandBusinessModel = (typeof BRAND_BUSINESS_MODELS)[number]

/** A taxonomy node the LLM may pick from (macro `industry` or mid `sector`). */
export interface TaxonomyNodeChoice {
  id: string
  label: string
  examples: string[]
}

/** Provider-agnostic input. Site content + entity are DATA (anti prompt-injection). */
export interface BrandIntelligenceInput {
  brandName: string
  websiteUrl: string | null
  /** Raw HubSpot industry hint (a weak prior — may be wrong/null). */
  hubspotIndustry: string | null
  /** Readable home/about text fetched read-only (the grounding). */
  siteContent: string | null
  /** Optional entity signals summary (KG/Wikidata, TASK-1267). */
  entitySignals: string | null
  /** The MACRO+MID nodes the LLM must choose from (or 'unknown'). */
  allowedNodes: TaxonomyNodeChoice[]
  maxTokens: number
}

/** Raw LLM output. The router validates/sanitizes before exposing. */
export interface BrandIntelligenceRawOutput {
  whatTheBrandDoes: string
  /** A taxonomy node id from `allowedNodes`, or 'unknown'. */
  candidateCategoryNode: string
  /** Long-tail descriptor (free text), NOT a node. */
  fineCategory: string
  candidateBusinessModel: BrandBusinessModel
  /** The concrete signals the model used (provenance). */
  signalsUsed: string[]
  confidence: number
}

export interface BrandIntelligenceUsage {
  inputTokens: number
  outputTokens: number
}

export interface BrandIntelligenceProviderResponse {
  data: BrandIntelligenceRawOutput
  model: string
  usage: BrandIntelligenceUsage
}

/** Provider port. `isConfigured` never throws; `extract` throws on error (router degrades). */
export interface BrandIntelligenceProvider {
  readonly id: BrandIntelligenceProviderId
  isConfigured(): Promise<boolean>
  extract(input: BrandIntelligenceInput): Promise<BrandIntelligenceProviderResponse>
}

export type BrandIntelligenceStatus =
  | 'ok'
  | 'disabled'
  | 'not_configured'
  | 'no_signals'
  | 'schema_invalid'
  | 'provider_error'

/** Validated/sanitized snapshot fields (what the domain persists + derives from). */
export interface BrandIntelligenceFields {
  whatTheBrandDoes: string
  candidateCategoryNode: string
  fineCategory: string
  candidateBusinessModel: BrandBusinessModel
  signalsUsed: string[]
  confidence: number
}

export interface BrandIntelligenceMetadata {
  providerId: BrandIntelligenceProviderId | null
  model: string | null
  version: typeof BRAND_INTELLIGENCE_VERSION
  status: BrandIntelligenceStatus
  latencyMs: number
  usage: BrandIntelligenceUsage | null
}

/** Router result. `fields=null` ⇒ honest degradation (caller falls back to deterministic prior). */
export interface BrandIntelligenceResult {
  fields: BrandIntelligenceFields | null
  metadata: BrandIntelligenceMetadata
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const sanitizeStringArray = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, max)
    : []

const isBusinessModel = (value: unknown): value is BrandBusinessModel =>
  typeof value === 'string' && (BRAND_BUSINESS_MODELS as readonly string[]).includes(value)

/**
 * Validate + sanitize the raw LLM output. The `candidateCategoryNode` is NOT validated
 * against the catalog here (PURE, no catalog import) — the caller (read orchestrator)
 * constrains it to a real node or 'unknown'. Returns null on a malformed shape.
 */
export const sanitizeBrandIntelligenceOutput = (raw: unknown): BrandIntelligenceFields | null => {
  if (typeof raw !== 'object' || raw === null) return null

  const data = raw as Record<string, unknown>

  const whatTheBrandDoes = typeof data.whatTheBrandDoes === 'string' ? data.whatTheBrandDoes.trim() : ''

  const candidateCategoryNode =
    typeof data.candidateCategoryNode === 'string' && data.candidateCategoryNode.trim().length > 0
      ? data.candidateCategoryNode.trim()
      : 'unknown'

  const fineCategory = typeof data.fineCategory === 'string' ? data.fineCategory.trim() : ''

  // A grounded read with no understanding at all is not a usable snapshot.
  if (whatTheBrandDoes.length === 0) return null

  return {
    whatTheBrandDoes: whatTheBrandDoes.slice(0, 2000),
    candidateCategoryNode,
    fineCategory: fineCategory.slice(0, 200),
    candidateBusinessModel: isBusinessModel(data.candidateBusinessModel) ? data.candidateBusinessModel : 'unknown',
    signalsUsed: sanitizeStringArray(data.signalsUsed, 12),
    confidence: clamp01(typeof data.confidence === 'number' ? data.confidence : 0)
  }
}
