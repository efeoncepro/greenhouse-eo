/**
 * TASK-1288 — Growth AI Visibility · HubSpot industry enum → canonical taxonomy node.
 *
 * `greenhouse_core.organizations.industry` is a MULTI-VOCABULARY field (verified
 * live 2026-06-29): HubSpot industry enum (UPPER_SNAKE, e.g. `AIRLINES_AVIATION`,
 * `FOOD_BEVERAGES`), Chilean CIIU/SII economic-activity names in Spanish, and many
 * NULLs. The enum is the dominant STRUCTURED vocabulary; this map gives it COMPLETE,
 * coverage-tested resolution to a real `industry:*` taxonomy node.
 *
 * It is NOT a parallel category resolver: it is the HubSpot evidence-source adapter
 * for the ONE canonical taxonomy (`taxonomy/catalog.ts`). The HubSpot enum is treated
 * as a cheap, somewhat-unreliable PRIOR (a salesperson fills it by hand) — the
 * authoritative signal is the grounded `brand_intelligence` read (TASK-1288 Slice 4).
 * Free-text / CIIU candidates resolve via `mapCategoryCandidateToTaxonomy` instead.
 *
 * The canonical enum list is the HubSpot/LinkedIn industry vocabulary (~147 values).
 * Every value resolves to a real node — the coverage test
 * (`hubspot-industry-map.test.ts`) fails the build if any enum value is unmapped or
 * points at a non-existent node.
 */

import { CATEGORY_TAXONOMY_NODES_BY_ID } from './catalog'
import { normalizeCategoryCandidate } from './mapper'

/**
 * HubSpot industry enum (UPPER_SNAKE) → canonical `industry:*` node id.
 *
 * Judgment calls (multi-vocabulary, best-fit) are intentional and corrected at
 * runtime by the grounded read; the contract here is COMPLETE coverage, not perfect
 * granularity. Keep alphabetised within each target group for auditability.
 */
export const HUBSPOT_INDUSTRY_NODE_MAP: Record<string, string> = {
  // Technology
  COMPUTER_SOFTWARE: 'industry:technology',
  COMPUTER_HARDWARE: 'industry:technology',
  COMPUTER_NETWORKING: 'industry:technology',
  COMPUTER_NETWORK_SECURITY: 'industry:technology',
  INFORMATION_TECHNOLOGY_AND_SERVICES: 'industry:technology',
  INFORMATION_SERVICES: 'industry:technology',
  INTERNET: 'industry:technology',
  SEMICONDUCTORS: 'industry:technology',
  NANOTECHNOLOGY: 'industry:technology',

  // Telecommunications
  TELECOMMUNICATIONS: 'industry:telecommunications',
  WIRELESS: 'industry:telecommunications',

  // Marketing & communications
  MARKETING_AND_ADVERTISING: 'industry:marketing_communications',
  PUBLIC_RELATIONS_AND_COMMUNICATIONS: 'industry:marketing_communications',
  MARKET_RESEARCH: 'industry:marketing_communications',

  // Professional services
  MANAGEMENT_CONSULTING: 'industry:professional_services',
  OUTSOURCING_OFFSHORING: 'industry:professional_services',
  HUMAN_RESOURCES: 'industry:professional_services',
  STAFFING_AND_RECRUITING: 'industry:professional_services',
  ACCOUNTING: 'industry:professional_services',
  TRANSLATION_AND_LOCALIZATION: 'industry:professional_services',
  DESIGN: 'industry:professional_services',
  GRAPHIC_DESIGN: 'industry:professional_services',
  RESEARCH: 'industry:professional_services',
  PROGRAM_DEVELOPMENT: 'industry:professional_services',
  EXECUTIVE_OFFICE: 'industry:professional_services',
  FACILITIES_SERVICES: 'industry:professional_services',
  SECURITY_AND_INVESTIGATIONS: 'industry:professional_services',
  EVENTS_SERVICES: 'industry:professional_services',
  WRITING_AND_EDITING: 'industry:professional_services',
  PHOTOGRAPHY: 'industry:professional_services',
  BUSINESS_SUPPLIES_AND_EQUIPMENT: 'industry:professional_services',

  // Legal
  LAW_PRACTICE: 'industry:legal',
  LEGAL_SERVICES: 'industry:legal',
  ALTERNATIVE_DISPUTE_RESOLUTION: 'industry:legal',

  // Finance
  BANKING: 'industry:finance',
  FINANCIAL_SERVICES: 'industry:finance',
  INSURANCE: 'industry:finance',
  CAPITAL_MARKETS: 'industry:finance',
  INVESTMENT_BANKING: 'industry:finance',
  INVESTMENT_MANAGEMENT: 'industry:finance',
  VENTURE_CAPITAL_PRIVATE_EQUITY: 'industry:finance',

  // Healthcare
  HOSPITAL_HEALTH_CARE: 'industry:healthcare',
  MEDICAL_PRACTICE: 'industry:healthcare',
  MEDICAL_DEVICES: 'industry:healthcare',
  MENTAL_HEALTH_CARE: 'industry:healthcare',
  HEALTH_WELLNESS_AND_FITNESS: 'industry:healthcare',
  PHARMACEUTICALS: 'industry:healthcare',
  BIOTECHNOLOGY: 'industry:healthcare',
  ALTERNATIVE_MEDICINE: 'industry:healthcare',
  VETERINARY: 'industry:healthcare',

  // Education
  EDUCATION_MANAGEMENT: 'industry:education',
  HIGHER_EDUCATION: 'industry:education',
  PRIMARY_SECONDARY_EDUCATION: 'industry:education',
  E_LEARNING: 'industry:education',
  PROFESSIONAL_TRAINING_COACHING: 'industry:education',
  LIBRARIES: 'industry:education',

  // Retail & distribution
  RETAIL: 'industry:retail',
  WHOLESALE: 'industry:retail',
  IMPORT_AND_EXPORT: 'industry:retail',
  SUPERMARKETS: 'industry:retail',

  // Consumer goods
  CONSUMER_GOODS: 'industry:consumer_goods',
  CONSUMER_ELECTRONICS: 'industry:consumer_goods',
  CONSUMER_SERVICES: 'industry:consumer_goods',
  APPAREL_FASHION: 'industry:consumer_goods',
  COSMETICS: 'industry:consumer_goods',
  LUXURY_GOODS_JEWELRY: 'industry:consumer_goods',
  SPORTING_GOODS: 'industry:consumer_goods',
  FURNITURE: 'industry:consumer_goods',
  TOBACCO: 'industry:consumer_goods',
  TEXTILES: 'industry:consumer_goods',

  // Food & beverage
  FOOD_BEVERAGES: 'industry:food_beverage',
  FOOD_PRODUCTION: 'industry:food_beverage',
  RESTAURANTS: 'industry:food_beverage',
  WINE_AND_SPIRITS: 'industry:food_beverage',
  DAIRY: 'industry:food_beverage',

  // Manufacturing
  MACHINERY: 'industry:manufacturing',
  ELECTRICAL_ELECTRONIC_MANUFACTURING: 'industry:manufacturing',
  MECHANICAL_OR_INDUSTRIAL_ENGINEERING: 'industry:manufacturing',
  INDUSTRIAL_AUTOMATION: 'industry:manufacturing',
  CHEMICALS: 'industry:manufacturing',
  PLASTICS: 'industry:manufacturing',
  BUILDING_MATERIALS: 'industry:manufacturing',
  GLASS_CERAMICS_CONCRETE: 'industry:manufacturing',
  PAPER_FOREST_PRODUCTS: 'industry:manufacturing',
  PACKAGING_AND_CONTAINERS: 'industry:manufacturing',
  RAILROAD_MANUFACTURE: 'industry:manufacturing',
  SHIPBUILDING: 'industry:manufacturing',
  PRINTING: 'industry:manufacturing',

  // Automotive
  AUTOMOTIVE: 'industry:automotive',

  // Aviation
  AIRLINES_AVIATION: 'industry:aviation',
  AVIATION_AEROSPACE: 'industry:aviation',

  // Logistics & transportation
  LOGISTICS_AND_SUPPLY_CHAIN: 'industry:logistics',
  PACKAGE_FREIGHT_DELIVERY: 'industry:logistics',
  TRANSPORTATION_TRUCKING_RAILROAD: 'industry:logistics',
  MARITIME: 'industry:logistics',
  WAREHOUSING: 'industry:logistics',

  // Hospitality & travel
  HOSPITALITY: 'industry:hospitality_travel',
  LEISURE_TRAVEL_TOURISM: 'industry:hospitality_travel',
  RECREATIONAL_FACILITIES_AND_SERVICES: 'industry:hospitality_travel',
  GAMBLING_CASINOS: 'industry:hospitality_travel',

  // Media & entertainment
  ENTERTAINMENT: 'industry:media_entertainment',
  BROADCAST_MEDIA: 'industry:media_entertainment',
  MEDIA_PRODUCTION: 'industry:media_entertainment',
  MOTION_PICTURES_AND_FILM: 'industry:media_entertainment',
  MUSIC: 'industry:media_entertainment',
  ANIMATION: 'industry:media_entertainment',
  ONLINE_MEDIA: 'industry:media_entertainment',
  NEWSPAPERS: 'industry:media_entertainment',
  PUBLISHING: 'industry:media_entertainment',
  PERFORMING_ARTS: 'industry:media_entertainment',
  FINE_ART: 'industry:media_entertainment',
  ARTS_AND_CRAFTS: 'industry:media_entertainment',
  MUSEUMS_AND_INSTITUTIONS: 'industry:media_entertainment',
  COMPUTER_GAMES: 'industry:media_entertainment',
  SPORTS: 'industry:media_entertainment',

  // Real estate
  REAL_ESTATE: 'industry:real_estate',
  COMMERCIAL_REAL_ESTATE: 'industry:real_estate',

  // Construction
  CONSTRUCTION: 'industry:construction',
  CIVIL_ENGINEERING: 'industry:construction',
  ARCHITECTURE_PLANNING: 'industry:construction',

  // Energy & environment
  OIL_ENERGY: 'industry:energy',
  UTILITIES: 'industry:energy',
  RENEWABLES_ENVIRONMENT: 'industry:energy',
  ENVIRONMENTAL_SERVICES: 'industry:energy',
  MINING_METALS: 'industry:energy',

  // Government & public sector
  GOVERNMENT_ADMINISTRATION: 'industry:government',
  GOVERNMENT_RELATIONS: 'industry:government',
  PUBLIC_POLICY: 'industry:government',
  PUBLIC_SAFETY: 'industry:government',
  LAW_ENFORCEMENT: 'industry:government',
  MILITARY: 'industry:government',
  DEFENSE_SPACE: 'industry:government',
  INTERNATIONAL_AFFAIRS: 'industry:government',
  INTERNATIONAL_TRADE_AND_DEVELOPMENT: 'industry:government',
  LEGISLATIVE_OFFICE: 'industry:government',
  POLITICAL_ORGANIZATION: 'industry:government',
  JUDICIARY: 'industry:government',
  THINK_TANKS: 'industry:government',

  // Agriculture & food production (primary)
  FARMING: 'industry:agriculture_food',
  RANCHING: 'industry:agriculture_food',
  FISHERY: 'industry:agriculture_food',

  // Nonprofit & impact
  NON_PROFIT_ORGANIZATION_MANAGEMENT: 'industry:nonprofit_impact',
  PHILANTHROPY: 'industry:nonprofit_impact',
  FUND_RAISING: 'industry:nonprofit_impact',
  CIVIC_SOCIAL_ORGANIZATION: 'industry:nonprofit_impact',
  INDIVIDUAL_FAMILY_SERVICES: 'industry:nonprofit_impact',
  RELIGIOUS_INSTITUTIONS: 'industry:nonprofit_impact'
}

/** The canonical HubSpot industry enum values (keys of the map) — for coverage tests. */
export const HUBSPOT_INDUSTRY_ENUM_VALUES: readonly string[] = Object.keys(HUBSPOT_INDUSTRY_NODE_MAP)

/**
 * Confidence assigned to a HubSpot-enum match. Deliberately moderate (< the grounded
 * read): the enum is a hand-filled, somewhat-unreliable PRIOR — it should pass the run
 * guard (a real node beats the raw string) but be overridable by `brand_intelligence`.
 */
export const HUBSPOT_INDUSTRY_MATCH_CONFIDENCE = 0.7

const NORMALIZED_HUBSPOT_INDEX: Map<string, string> = new Map(
  Object.entries(HUBSPOT_INDUSTRY_NODE_MAP).map(([enumValue, nodeId]) => [
    normalizeCategoryCandidate(enumValue),
    nodeId
  ])
)

export interface HubSpotIndustryNodeMatch {
  nodeId: string
  confidence: number
}

/**
 * Resolve a raw `organizations.industry` value as a HubSpot enum to a canonical node.
 *
 * Tolerant of casing/separators (`AIRLINES_AVIATION`, `airlines aviation`,
 * `Airlines/Aviation` all normalize equally). Returns `null` when the value is not a
 * recognised HubSpot enum (free-text / CIIU / null) — the caller then falls back to the
 * generic taxonomy mapper and ultimately the grounded read.
 */
export const resolveHubSpotIndustryNode = (raw: string | null | undefined): HubSpotIndustryNodeMatch | null => {
  if (!raw) return null

  const normalized = normalizeCategoryCandidate(raw)

  if (normalized.length === 0) return null

  const nodeId = NORMALIZED_HUBSPOT_INDEX.get(normalized)

  if (!nodeId) return null

  // Defensive: never return a node id that is not a real, active taxonomy node.
  const node = CATEGORY_TAXONOMY_NODES_BY_ID.get(nodeId)

  if (!node || node.status !== 'active') return null

  return { nodeId, confidence: HUBSPOT_INDUSTRY_MATCH_CONFIDENCE }
}
