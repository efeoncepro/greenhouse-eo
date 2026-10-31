import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

import { fixture, ORG, DESIGN, SEO, OWNER, PERIOD, BLOG } from './fixtures.mjs'
import {
  admitReport, attributeInvoice, authorize, commercialOwner, consolidateInvoices, digest, projectBlogUrls,
  projectSource, provisionOperatingSpace, readCachedProjects, refreshContext, requireBlogEvidence, selectContext
} from './prototype.mjs'
import { blogScope, designContext, evaluateVariant, reportIntent, seoContext } from './scenarios.mjs'
import { anchors, verifyAnchors } from './source-anchors.mjs'
import { evaluate } from './evaluate.mjs'

for (const variant of ['A-prime', 'B']) {
  const evaluation = evaluateVariant(variant)

  for (const check of evaluation.checks) {
    test(`${variant}: ${check.id}`, () => assert.deepEqual(check.actual, check.expected))
  }

  test(`${variant}: role/organization alone does not grant a Space`, () => {
    const state = fixture(variant)

    assert.throws(() => authorize(state, 'org-admin-without-membership', seoContext), /forbidden/)
    assert.throws(() => authorize(state, 'seo', { ...seoContext, organizationId: 'org-other' }), /forbidden/)
    state.organizationCapabilities = []
    assert.throws(() => authorize(state, 'seo', seoContext), /forbidden/)
  })

  test(`${variant}: membership capability, active state and refresh are rechecked`, () => {
    const state = fixture(variant)
    const selection = selectContext(state, 'seo', seoContext)

    state.memberships.find(m => m.subjectId === 'seo').capabilities = []
    assert.throws(() => refreshContext(state, selection), /forbidden/)
    state.spaces.find(s => s.id === SEO).active = false
    assert.throws(() => refreshContext(state, selection), /space_unavailable/)
  })

  test(`${variant}: cache distinguishes period, subject and authority revision`, () => {
    const state = fixture(variant)
    const first = readCachedProjects(state, 'both', seoContext, PERIOD)

    assert.notEqual(first.key, readCachedProjects(state, 'seo', seoContext, PERIOD).key)
    assert.notEqual(first.key, readCachedProjects(state, 'both', seoContext, '2026-11').key)
    state.authorityVersion++
    assert.notEqual(first.key, readCachedProjects(state, 'both', seoContext, PERIOD).key)
  })

  test(`${variant}: source duplicate/unknown/foreign-org refuses writes`, () => {
    const state = fixture(variant)
    const before = digest(state.projects)

    assert.throws(() => projectSource(state, { sourceId: 'unknown', projectId: 'new', organizationId: ORG }), /source_ambiguous/)
    assert.throws(() => projectSource(state, { sourceId: 'source-seo', projectId: 'new', organizationId: 'other' }), /forbidden/)
    state.sources.push({ id: 'source-seo', spaceId: DESIGN, enabled: true })
    assert.throws(() => projectSource(state, { sourceId: 'source-seo', projectId: 'new', organizationId: ORG }), /source_ambiguous/)
    assert.equal(digest(state.projects), before)
  })

  test(`${variant}: provisioning validates intent and owner before any mutation`, () => {
    const state = fixture(variant)
    const before = digest(state)
    const gates = { context: true, routing: true, finance: true }
    const input = { organizationId: 'foreign-org', commercialOwner: OWNER, spaceId: 'new-space', bridgeId: 'new-bridge' }

    assert.throws(() => provisionOperatingSpace(state, 'key', input, gates), /forbidden/)
    assert.equal(digest(state), before)
    input.organizationId = ORG
    input.bridgeId = variant === 'A-prime' ? 'new-bridge' : OWNER
    provisionOperatingSpace(state, 'key', input, gates)
    const created = digest(state)

    assert.throws(() => provisionOperatingSpace(state, 'key', { ...input, spaceId: 'another' }, gates), /idempotency_conflict/)
    assert.equal(digest(state), created)
    assert.equal(state.financeProfiles.length, 1)
  })

  test(`${variant}: unknown owner refuses Finance rather than attributing by fallback`, () => {
    const state = fixture(variant)

    assert.throws(() => commercialOwner(state, 'unknown'), /commercial_owner_unresolved/)
    assert.throws(() => attributeInvoice(state, { ...state.invoices[0], clientId: 'unknown' }), /commercial_owner_unresolved/)
    assert.throws(() => attributeInvoice(state, { ...state.invoices[0], organizationId: 'foreign-org' }), /commercial_owner_unresolved/)
    assert.throws(() => attributeInvoice(state, { ...state.invoices[0], serviceId: 'unknown' }), /attribution_conflict/)
  })

  test(`${variant}: duplicate financial identity is not summed and contradictory facts fail`, () => {
    const state = fixture(variant)

    state.invoices.push({ ...state.invoices[0] })
    assert.deepEqual(consolidateInvoices(state), { count: 1, amount: 100 })
    state.invoices.push({ ...state.invoices[0], amount: 200 })
    assert.throws(() => consolidateInvoices(state), /financial_fact_conflict/)
  })

  test(`${variant}: same key/context with changed intent conflicts without mutating the ledger`, () => {
    const state = fixture(variant)

    admitReport(state, 'seo', 'key', reportIntent)
    const before = digest(state.ledger)

    assert.throws(() => admitReport(state, 'both', 'key', { ...reportIntent, ...designContext }), /idempotency_conflict/)
    assert.throws(() => admitReport(state, 'seo', 'key', { ...reportIntent, period: '2026-11' }), /idempotency_conflict/)
    assert.equal(digest(state.ledger), before)
  })

  for (const source of ['ga4', 'gsc', 'aeo_run']) {
    test(`${variant}: missing/stale/unknown ${source} is not an observed zero`, () => {
      const state = fixture(variant)
      const receipt = state.receipts.find(r => r.source === source)

      receipt.period = '2026-09'
      assert.throws(() => requireBlogEvidence(state.receipts, PERIOD, blogScope), new RegExp(`required_source_missing:${source}`))
      receipt.period = PERIOD
      receipt.status = 'not_connected'
      assert.throws(() => requireBlogEvidence(state.receipts, PERIOD, blogScope), /required_source_missing/)
      receipt.status = 'observed'
      receipt.count = null
      assert.throws(() => requireBlogEvidence(state.receipts, PERIOD, blogScope), /required_source_missing/)
    })
  }
}

test('null/cleared scope never becomes whole-organization admission', () => {
  for (const scope of [null, {}, { host: 'airline.example', mode: 'exact-host' }]) {
    assert.throws(() => requireBlogEvidence(fixture('B').receipts, PERIOD, scope), /content_scope_required/)
  }
})

test('URL projection rejects root, lookalike, credentials, ports and invalid URLs', () => {
  const urls = [
    `https://${BLOG}/article`, `https://${BLOG}.evil.example/`, `https://airline.example/blog/`,
    `https://${BLOG}@evil.example/`, `https://user@${BLOG}/`, `https://${BLOG}:8443/`,
    `ftp://${BLOG}/`, 'relative/article', `https://${BLOG.toUpperCase()}/another?query=1#fragment`
  ]

  const projection = projectBlogUrls(urls.map((url, i) => ({ id: i, landingUrl: url })),
    urls.map((url, i) => ({ id: i, page: url })), urls.map(url => ({ citations: [url] })), blogScope)

  assert.deepEqual(projection.ga4FactIds, [0, 8])
  assert.deepEqual(projection.gscFactIds, [0, 8])
  assert.equal(projection.aeoBlogResponses, 2)
  assert.equal(projection.aeoDenominator, 9)
})

test('native AEO cannot be replaced by GA4 AI referrals or duplicate receipt', () => {
  const state = fixture('B')

  state.receipts = state.receipts.filter(r => r.source !== 'aeo_run')
  state.receipts.push({ source: 'ga4_ai_referrals', host: BLOG, period: PERIOD, count: 8, status: 'observed' })
  assert.throws(() => requireBlogEvidence(state.receipts, PERIOD, blogScope), /required_source_missing:aeo_run/)
  state.receipts = fixture('B').receipts
  state.receipts.push({ ...state.receipts[0] })
  assert.throws(() => requireBlogEvidence(state.receipts, PERIOD, blogScope), /required_source_missing:ga4/)
})

test('anchors match actual local code and drift fails closed', () => {
  assert.equal(verifyAnchors().length, anchors.length)
  assert.throws(() => verifyAnchors(() => 'changed code'), /source_anchor_drift/)
})

test('prototype import/side-effect boundary excludes stores, environment, network and arbitrary execution', () => {
  const builtinAllowlist = new Set(['node:assert/strict', 'node:fs', 'node:crypto', 'node:test', 'node:util'])
  const filenames = readdirSync(new URL('.', import.meta.url)).filter(name => name.endsWith('.mjs'))

  for (const filename of filenames) {
    const source = readFileSync(new URL(filename, import.meta.url), 'utf8')
    const imports = [...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(match => match[1])

    for (const specifier of imports) assert.ok(builtinAllowlist.has(specifier) || filenames.some(name => `./${name}` === specifier))
    assert.doesNotMatch(source, /\b(?:import|require|fetch|eval|Function)\s*\(/)
    assert.doesNotMatch(source, /process\s*\.\s*env/)
    assert.doesNotMatch(source, /\b(?:writeFile|appendFile|createWriteStream|connect|spawn|execFile)\s*\(/)
  }
})

test('restricted runner cannot read credentials, write files or spawn children', { skip: !process.permission }, () => {
  assert.equal(process.permission.has('fs.read', new URL('../../../.auth/fixture', import.meta.url).pathname), false)
  assert.equal(process.permission.has('fs.read', new URL('../../../.env', import.meta.url).pathname), false)
  assert.equal(process.permission.has('fs.write', new URL('./fixture.json', import.meta.url).pathname), false)
  assert.equal(process.permission.has('child'), false)
})

test('evaluation is reproducible and preference is conditional, with production gate closed', () => {
  const first = evaluate()

  assert.deepEqual(evaluate(), first)
  assert.equal(first.summary.pass, true)
  assert.equal(first.summary.preferred, 'A-prime')
  assert.equal(first.decision.productionReady, false)
  assert.ok(first.decision.beforeAnySharedProvisioning.includes('U02F finance foundation'))
  assert.equal(first.variants[0].historyDigest, first.variants[1].historyDigest)
})
