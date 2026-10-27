import { isDeepStrictEqual } from 'node:util'

import { fixture, ORG, DESIGN, SEO, OWNER, DESIGN_SERVICE, SEO_SERVICE, PERIOD, BLOG } from './fixtures.mjs'
import {
  admitReport, attributeInvoice, commercialOwner, consolidateInvoices, digest, financialCandidates,
  legacyCacheKey, legacyCompanyCandidates, legacyProjects, legacySessionCandidates, legacySourceCandidates,
  projectBlogUrls, projectSource, provisionOperatingSpace, readCachedProjects, readProjects,
  refreshContext, requireBlogEvidence, resolveServiceRoute, selectContext
} from './prototype.mjs'

export const blogScope = { host: BLOG, mode: 'exact-host' }
export const seoContext = { organizationId: ORG, spaceId: SEO, serviceId: SEO_SERVICE }
export const designContext = { organizationId: ORG, spaceId: DESIGN, serviceId: DESIGN_SERVICE }
export const reportIntent = { ...seoContext, period: PERIOD, scope: blogScope }

const codeFrom = operation => {
  try {
    operation()

    return 'unexpected_success'
  } catch (error) {
    return error.message
  }
}

export function evaluateVariant(variant) {
  const state = fixture(variant)
  const beforeHistory = digest(state.history)
  const checks = []
  const check = (id, actual, expected) => checks.push({ id, pass: isDeepStrictEqual(actual, expected), actual, expected })
  const seoClient = state.spaces.find(s => s.id === SEO).clientId

  const legacy = {
    designProjectIds: legacyProjects(state, OWNER).map(p => p.id),
    seoProjectIds: legacyProjects(state, seoClient).map(p => p.id),
    designSourceChoices: legacySourceCandidates(state, OWNER).length,
    seoSessionChoices: legacySessionCandidates(state, seoClient).length,
    companySpaceChoices: legacyCompanyCandidates(state, 'company-fixture').length,
    invoiceCandidateIds: financialCandidates(state, state.invoices[0], false).map(s => s.id).sort(),
    organizationCacheCollision: legacyCacheKey(designContext, 'team') === legacyCacheKey(seoContext, 'team')
  }

  check('legacy-client-isolation-counterexample', legacy.designProjectIds,
    variant === 'A-prime' ? ['project-design'] : ['project-design', 'project-seo'])
  check('legacy-source-ambiguity', legacy.designSourceChoices, variant === 'A-prime' ? 1 : 2)
  check('legacy-session-ambiguity', legacy.seoSessionChoices, variant === 'A-prime' ? 1 : 2)
  check('legacy-company-routing-ambiguous-for-both', legacy.companySpaceChoices, 2)
  check('legacy-org-cache-collision-for-both', legacy.organizationCacheCollision, true)
  check('legacy-finance-false-unique-design-with-A-prime', legacy.invoiceCandidateIds,
    variant === 'A-prime' ? [DESIGN_SERVICE] : [DESIGN_SERVICE, SEO_SERVICE])

  check('deny-seo-reading-design', codeFrom(() => readProjects(state, 'seo', designContext)), 'forbidden')
  check('deny-designer-reading-seo', codeFrom(() => readProjects(state, 'designer', seoContext)), 'forbidden')
  check('explicit-design-read', readProjects(state, 'both', designContext).map(p => p.id), ['project-design'])
  check('explicit-seo-read', readProjects(state, 'both', seoContext).map(p => p.id), ['project-seo'])
  check('refresh-retains-selected-space', refreshContext(state, selectContext(state, 'both', seoContext)).spaceId, SEO)
  const designCache = readCachedProjects(state, 'both', designContext, PERIOD)
  const seoCache = readCachedProjects(state, 'both', seoContext, PERIOD)

  check('space-cache-isolation', designCache.key !== seoCache.key, true)
  check('source-replay-stable', projectSource(state, {
    sourceId: 'source-seo', projectId: 'project-seo', organizationId: ORG
  }).spaceId, SEO)
  check('source-cannot-reattribute-design-project', codeFrom(() => projectSource(state, {
    sourceId: 'source-seo', projectId: 'project-design', organizationId: ORG
  })), 'history_owner_conflict')
  check('service-routing-explicit', resolveServiceRoute(state, ORG, SEO_SERVICE).spaceId, SEO)
  state.routing.push({ serviceId: SEO_SERVICE, spaceId: DESIGN })
  check('ambiguous-service-route-blocked', codeFrom(() => resolveServiceRoute(state, ORG, SEO_SERVICE)), 'routing_ambiguous')
  state.routing.pop()

  check('commercial-owner-common', commercialOwner(state, seoClient), OWNER)
  check('finance-candidates-normalized-before-selection', financialCandidates(state, state.invoices[0], true).map(s => s.id).sort(),
    [DESIGN_SERVICE, SEO_SERVICE])
  check('unclassified-invoice-stays-unresolved', attributeInvoice(state, state.invoices[0]).status, 'unresolved')
  check('explicit-seo-attribution-survives-bridge', attributeInvoice(state, {
    ...state.invoices[0], serviceId: SEO_SERVICE
  }).serviceId, SEO_SERVICE)
  check('consolidated-canonical-invoice-once', consolidateInvoices(state), { count: 1, amount: 100 })

  check('three-observed-zero-sources-valid', requireBlogEvidence(state.receipts, PERIOD, blogScope).observedZero, true)
  check('missing-native-AEO-blocked', codeFrom(() => requireBlogEvidence(
    state.receipts.filter(r => r.source !== 'aeo_run'), PERIOD, blogScope
  )), 'required_source_missing:aeo_run')

  const projection = projectBlogUrls([
    { id: 'ga4-blog', landingUrl: `https://${BLOG}/article?utm_source=test` },
    { id: 'ga4-root', landingUrl: 'https://airline.example/' }
  ], [
    { id: 'gsc-blog', page: `https://${BLOG}/article` },
    { id: 'gsc-root', page: 'https://airline.example/offers' }
  ], [
    { id: 'response-1', citations: [`https://${BLOG}/article`, `https://${BLOG}/article`] },
    { id: 'response-2', citations: ['https://airline.example/'] },
    { id: 'response-3', citations: [] },
    { id: 'response-4', citations: ['https://other.example/'] }
  ], blogScope)

  check('blog-projection-keeps-full-panel-denominator', projection, {
    ga4FactIds: ['ga4-blog'], gscFactIds: ['gsc-blog'], aeoCitationRows: 2, aeoBlogResponses: 1, aeoDenominator: 4
  })

  const edition = admitReport(state, 'seo', 'key-report', reportIntent)

  state.services.find(s => s.id === SEO_SERVICE).spaceId = DESIGN
  state.routing.find(r => r.serviceId === SEO_SERVICE).spaceId = DESIGN
  check('historical-retry-before-current-mapping', admitReport(state, 'seo', 'key-report', reportIntent).id, edition.id)
  check('new-admission-requires-current-mapping', codeFrom(() => admitReport(state, 'seo', 'new-key', reportIntent)),
    'service_context_mismatch')
  check('same-key-other-account-never-returns-edition', codeFrom(() => admitReport(state, 'designer', 'key-report', {
    ...reportIntent, ...designContext
  })), 'forbidden')
  state.memberships.find(m => m.subjectId === 'both' && m.spaceId === SEO).active = false
  state.authorityVersion += 1
  check('revoked-cache-denied-before-hit', codeFrom(() => readCachedProjects(state, 'both', seoContext, PERIOD)), 'forbidden')
  state.memberships.find(m => m.subjectId === 'seo').active = false
  check('revoked-historical-retry-denied', codeFrom(() => admitReport(state, 'seo', 'key-report', reportIntent)), 'forbidden')

  const initial = fixture(variant)

  initial.spaces = initial.spaces.filter(s => s.id === DESIGN)
  initial.clients = initial.clients.filter(c => c.kind === 'commercial')
  const input = { organizationId: ORG, commercialOwner: OWNER, spaceId: SEO, bridgeId: seoClient }

  check('provisioning-blocked-without-finance-foundation', codeFrom(() => provisionOperatingSpace(initial, 'provision', input, {
    context: true, routing: true, finance: false
  })), 'foundations_required')
  provisionOperatingSpace(initial, 'provision', input, { context: true, routing: true, finance: true })
  provisionOperatingSpace(initial, 'provision', input, { context: true, routing: true, finance: true })
  check('child-provisioning-replay-no-commercial-duplicate', {
    organizations: initial.organizations.length, owners: initial.clients.filter(c => c.kind === 'commercial').length,
    financeProfiles: initial.financeProfiles.length, spaces: initial.spaces.length,
    operationalBridges: initial.clients.filter(c => c.kind === 'operating').length
  }, { organizations: 1, owners: 1, financeProfiles: 1, spaces: 2, operationalBridges: variant === 'A-prime' ? 1 : 0 })
  check('inactive-child-still-in-legacy-company-query', legacyCompanyCandidates(initial, 'company-fixture').length, 2)
  check('design-history-byte-equal', digest(state.history), beforeHistory)
  check('provisioning-does-not-rewrite-design-history', digest(initial.history), beforeHistory)

  return { variant, legacy, checks, historyDigest: beforeHistory, pass: checks.every(c => c.pass) }
}
