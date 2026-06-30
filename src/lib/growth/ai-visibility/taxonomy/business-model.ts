/**
 * TASK-1289 — Growth AI Visibility · Business model classification (the buyer-intent axis).
 *
 * `business_model` is the axis the prompt generator (TASK-1290) reads to choose the
 * buyer-intent FRAMING of a brand's prompts. It is ORTHOGONAL to the category: an airline
 * and a B2B SaaS can both be `industry:technology`-adjacent, but their buyers behave nothing
 * alike. ISSUE-110's root cause was the engine assuming EVERY brand is a B2B agency/provider
 * (Efeonce's own ICP) → consumer brands like SKY scored a false-0.
 *
 * SoT of the enum = `BRAND_BUSINESS_MODELS` (the grounded `brand_intelligence` read already
 * emits the candidate). This module re-exports it as the canonical `BUSINESS_MODELS` and adds
 * the DETERMINISTIC classifier (the spine): a cascade
 *   1. grounded candidate (authoritative — the LLM read what the brand actually does), then
 *   2. a CONSERVATIVE category→model heuristic (only strong-signal nodes), then
 *   3. honest `unknown` (NEVER defaulted to agency — that is exactly the bug being fixed).
 *
 * The category heuristic deliberately ABSTAINS on genuinely ambiguous macros (finance,
 * healthcare, manufacturing, generic technology) — a paint manufacturer (Grupo Berel) sells
 * to consumers, a steel mill sells B2B, and `industry:manufacturing` cannot tell them apart.
 * The grounded read resolves those; the operator override (TASK-1289 Slice 3) is the backstop.
 */

import { getCategoryTaxonomyNode } from './catalog'
import { BRAND_BUSINESS_MODELS, type BrandBusinessModel } from '../brand-intelligence/contracts'

/** Canonical business model enum (SoT = the grounded read's candidate enum). Includes 'unknown'. */
export const BUSINESS_MODELS = BRAND_BUSINESS_MODELS
export type BusinessModel = BrandBusinessModel

export const UNKNOWN_BUSINESS_MODEL: BusinessModel = 'unknown'

/** Provenance of a resolved business model (mirrors `category_source`'s honest provenance). */
export type BusinessModelSource = 'brand_intelligence' | 'category_heuristic' | 'operator_override' | 'unknown'

/**
 * Minimum confidence for a grounded `brand_intelligence` candidate to be treated as
 * authoritative (mirror of `GROUNDED_CANDIDATE_MIN_CONFIDENCE` for category).
 */
export const GROUNDED_BUSINESS_MODEL_MIN_CONFIDENCE = 0.6

/** Confidence assigned to a category-heuristic match (deliberately moderate — it is a prior). */
export const CATEGORY_HEURISTIC_CONFIDENCE = 0.5

/**
 * Conservative category-node → business-model map. ONLY nodes whose business model is
 * unambiguous appear here; ambiguous macros (finance, healthcare, education, technology,
 * manufacturing, real_estate, construction, logistics, energy, agriculture, nonprofit) are
 * intentionally ABSENT → they resolve to `unknown` (the grounded read / operator decide).
 */
const CATEGORY_NODE_BUSINESS_MODEL: Record<string, BusinessModel> = {
  // Consumer (B2C) — predominantly consumer-facing brands.
  'industry:aviation': 'consumer_b2c',
  'industry:automotive': 'consumer_b2c',
  'industry:telecommunications': 'consumer_b2c',
  'industry:consumer_goods': 'consumer_b2c',
  'industry:food_beverage': 'consumer_b2c',
  'industry:hospitality_travel': 'consumer_b2c',
  'industry:media_entertainment': 'consumer_b2c',
  'sector:passenger_airlines': 'consumer_b2c',
  'sector:supermarkets_grocery': 'consumer_b2c',
  'sector:apparel_fashion': 'consumer_b2c',
  'sector:beauty_personal_care': 'consumer_b2c',
  'sector:restaurants_foodservice': 'consumer_b2c',
  'sector:beverages': 'consumer_b2c',
  'sector:retail_consumer_banking': 'consumer_b2c',
  // Retail / ecommerce — online commerce intent (browse/cart/checkout).
  'sector:ecommerce_marketplaces': 'retail_ecommerce',
  'category:ecommerce_platform': 'retail_ecommerce',
  // Marketplace — multi-sided.
  'category:marketplace_platform': 'marketplace',
  // B2B service provider — agencies, professional/legal/marketing services (Efeonce's own ICP).
  'industry:marketing_communications': 'b2b_service_provider',
  'industry:professional_services': 'b2b_service_provider',
  'industry:legal': 'b2b_service_provider',
  'sector:marketing_services': 'b2b_service_provider',
  'sector:creative_agency': 'b2b_service_provider',
  'category:digital_agency': 'b2b_service_provider',
  'category:hubspot_consulting': 'b2b_service_provider',
  'category:inbound_marketing': 'b2b_service_provider',
  'category:public_relations': 'b2b_service_provider',
  'category:web_development': 'b2b_service_provider',
  'category:growth_operating_system': 'b2b_service_provider',
  'category:aeo_ai_visibility': 'b2b_service_provider',
  // B2B product / SaaS — software platforms sold to businesses.
  'sector:b2b_saas': 'b2b_product_saas',
  'sector:martech': 'b2b_product_saas',
  'sector:devtools': 'b2b_product_saas',
  'sector:ai_automation': 'b2b_product_saas',
  'sector:data_analytics': 'b2b_product_saas',
  'sector:cybersecurity': 'b2b_product_saas',
  'sector:cloud_it_services': 'b2b_product_saas',
  'sector:fintech': 'b2b_product_saas',
  'sector:healthtech': 'b2b_product_saas',
  'sector:hrtech': 'b2b_product_saas',
  'sector:proptech': 'b2b_product_saas',
  'sector:legaltech': 'b2b_product_saas',
  'sector:edtech': 'b2b_product_saas',
  'sector:cleantech': 'b2b_product_saas',
  // Public institution.
  'industry:government': 'public_institution',
  'market:public_sector': 'public_institution'
}

const isBusinessModel = (value: unknown): value is BusinessModel =>
  typeof value === 'string' && (BUSINESS_MODELS as readonly string[]).includes(value)

/** Grounded candidate (from the `brand_intelligence` snapshot). */
export interface GroundedBusinessModelCandidate {
  businessModel: BusinessModel
  confidence: number
}

export interface ClassifyBusinessModelInput {
  /** Grounded `brand_intelligence` candidate — authoritative when confident. */
  groundedCandidate?: GroundedBusinessModelCandidate | null
  /** Resolved canonical category node id (the deterministic prior). */
  categoryNodeId?: string | null
}

export interface ClassifiedBusinessModel {
  /** A real business model, or `unknown` (honest). NEVER defaulted to agency. */
  businessModel: BusinessModel
  confidence: number
  source: BusinessModelSource
}

const UNKNOWN_RESULT: ClassifiedBusinessModel = {
  businessModel: UNKNOWN_BUSINESS_MODEL,
  confidence: 0,
  source: 'unknown'
}

/**
 * Deterministic classifier (the spine). Grounded candidate wins when confident; otherwise a
 * conservative category heuristic; otherwise honest `unknown`. Pure + total for one input.
 */
export const classifyBusinessModel = (input: ClassifyBusinessModelInput): ClassifiedBusinessModel => {
  // 1. Grounded brand_intelligence (authoritative).
  const grounded = input.groundedCandidate

  if (
    grounded &&
    isBusinessModel(grounded.businessModel) &&
    grounded.businessModel !== 'unknown' &&
    grounded.confidence >= GROUNDED_BUSINESS_MODEL_MIN_CONFIDENCE
  ) {
    return {
      businessModel: grounded.businessModel,
      confidence: grounded.confidence,
      source: 'brand_intelligence'
    }
  }

  // 2. Conservative category heuristic (only strong-signal nodes; ambiguous → unknown).
  const nodeId = input.categoryNodeId?.trim() || null

  if (nodeId) {
    const node = getCategoryTaxonomyNode(nodeId)
    const heuristic = node && node.status === 'active' ? CATEGORY_NODE_BUSINESS_MODEL[node.id] : undefined

    if (heuristic) {
      return {
        businessModel: heuristic,
        confidence: CATEGORY_HEURISTIC_CONFIDENCE,
        source: 'category_heuristic'
      }
    }
  }

  // 3. Honest unknown — NEVER guess agency.
  return UNKNOWN_RESULT
}
