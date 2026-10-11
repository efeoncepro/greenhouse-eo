/**
 * Closed registry of every rejection the Pricing V3 domain and its adapters can raise.
 *
 * A consumer (CLI today; API, MCP or UI adapters later) reports `error.code` for any `PricingV3Error` without keeping
 * its own allowlist: a code that is not registered here does not compile, so the registry and the throw sites cannot
 * drift apart. Result diagnostics (`MISSING_COST`, `MARGIN_BELOW_FLOOR`, ...) are not errors and do not belong here.
 */
export const PRICING_V3_DOMAIN_ERROR_CODES = [
  'CATALOG_BASE_CONFLICT',
  'CATALOG_DIMENSION_CONFLICT',
  'CATALOG_IDENTITY_CONFLICT',
  'CATALOG_PREVIEW_CONFLICT',
  'CATALOG_RECORD_CONFLICT',
  'CATALOG_VERSION_REQUIRED',
  'CHANGE_ALREADY_APPLIED',
  'DUPLICATE_CATALOG_DIMENSION',
  'DUPLICATE_CATALOG_RECORD',
  'DUPLICATE_CHANGE',
  'DUPLICATE_COST_COVERAGE',
  'DUPLICATE_KIT_REQUIREMENT',
  'EFFECTIVE_DATE_CONFLICT',
  'INVALID_CHANGE_RECORD',
  'INVALID_COMPARISON',
  'INVALID_PRICE_ROUNDING_MULTIPLE',
  'INVALID_PROFILE',
  'INVALID_RESOURCE_POLICY_REFERENCE',
  'INVALID_RETIREMENT',
  'OVERLAPPING_CATALOG_RECORD',
  'PREVIEW_REQUIRES_CALCULATED_SIMULATION',
  'PRICE_ROUNDING_CURRENCY_NOT_REGISTERED',
  'REPLAY_MISMATCH',
  'RESOURCE_BASE_CONFLICT',
  'RESOURCE_NEW_VERSION_REQUIRED',
  'RESOURCE_PREVIEW_CONFLICT',
  'RESOURCE_SOURCE_RECONFIRMATION_REQUIRED',
  'RETIRED_CATALOG_RECORD',
  'SPLIT_ATTRIBUTION_NOT_TRACEABLE',
  'SPLIT_REQUIRES_CALCULATED_QUOTE',
  'SPLIT_TOOL_NOT_ATTRIBUTED',
  'UPDATED_SOURCE_REFERENCE_REQUIRED'
] as const

/** Rejections that belong to the transport: arguments, files and formats. They never describe pricing content. */
export const PRICING_V3_ADAPTER_ERROR_CODES = [
  'CURRENT_VERSIONS_CONFLICT',
  'CURRENT_VERSIONS_MISMATCH',
  'EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY',
  'INPUT_NOT_FOUND',
  'INPUT_NOT_JSON',
  'INVALID_ARGUMENT',
  'INVALID_FORMAT',
  'MISSING_ARGUMENT',
  'OUTPUT_EXISTS',
  'OUTPUT_NOT_WRITABLE',
  'PLAN_REQUIRES_VALID_ALLOCATION',
  'SCHEMA_INVALID',
  'UNKNOWN_COMMAND',
  'UNKNOWN_OPTION',
  'WORKLOAD_REQUIRES_VALID_DIMENSIONING'
] as const

/** Reported only for a failure nobody classified. Seeing it means a missing case in the adapter, not a caller error. */
export const PRICING_V3_UNCLASSIFIED_ERROR_CODE = 'ADAPTER_FAILURE'

export type PricingV3ErrorCode =
  | (typeof PRICING_V3_DOMAIN_ERROR_CODES)[number]
  | (typeof PRICING_V3_ADAPTER_ERROR_CODES)[number]

/**
 * The only context an error may carry. It names where the problem is, never what the content was: salaries, costs,
 * file paths and raw parser or validator messages stay out of the error surface by construction.
 */
export type PricingV3ErrorDetail = {
  /** Command-line option (or equivalent transport field) the caller must correct, without its value. */
  option?: string
  /** Structural locations inside the rejected document, with the validator's rule name and nothing else. */
  issues?: { path: string; rule: string }[]
}

export class PricingV3Error extends Error {
  readonly code: PricingV3ErrorCode
  readonly detail: PricingV3ErrorDetail

  constructor(code: PricingV3ErrorCode, detail: PricingV3ErrorDetail = {}) {
    // The message is the code itself so a log line or a `toThrow` assertion never depends on prose.
    super(code)
    this.name = 'PricingV3Error'
    this.code = code
    this.detail = detail
  }
}

export const isPricingV3Error = (error: unknown): error is PricingV3Error => error instanceof PricingV3Error
