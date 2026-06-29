/**
 * TASK-1288 Slice 4 — Growth AI Visibility · Brand Intelligence · Barrel.
 */

export * from './contracts'
export * from './prompt'
export { runBrandIntelligence, getRegisteredBrandIntelligenceProvider } from './router'
export { fetchSiteContent, htmlToReadableText } from './fetch-site-content'
export {
  getActiveBrandIntelligence,
  persistBrandIntelligence,
  type BrandIntelligenceSnapshot
} from './store'
export {
  readBrandIntelligenceForProfile,
  brandIntelligenceToGroundedCandidate,
  getResolvableCategoryNodeChoices,
  type ReadBrandIntelligenceInput,
  type ReadBrandIntelligenceResult
} from './read-brand-intelligence'
