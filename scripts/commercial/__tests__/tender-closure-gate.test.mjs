import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { evaluateTenderWorkspace, validateClosureRecord } from '../lib/tender-closure-gate.mjs'

const makeWorkspace = () => fs.mkdtempSync(path.join(os.tmpdir(), 'greenhouse-tender-gate-'))

const baseRecord = (workspaceDir, status = 'verified') => ({
  schemaVersion: 1,
  deal: 'demo-rfp',
  workspacePath: 'docs/commercial/tenders/demo-rfp',
  status,
  proposalId: status === 'workshop_only' ? null : 'prop-demo',
  registration: status === 'workshop_only'
    ? null
    : {
        proposalId: 'prop-demo',
        surface: 'authenticated_api',
        registeredAt: '2026-08-02T12:00:00.000Z',
        actorKind: 'member',
        actorMemberId: 'member-demo'
      },
  composition: { sourcePlans: ['deck-plan.json'] },
  renderJobs: status === 'workshop_only'
    ? []
    : [{
        renderJobId: 'prnd-demo',
        artifactPurpose: 'deck',
        audience: 'client_facing',
        outputTarget: 'pdf-merged',
        manifestHash: 'a'.repeat(64),
        state: 'completed',
        outputPdfAssetId: 'asset-pdf-demo',
        outputPreviewAssetIds: ['asset-preview-demo']
      }],
  deliverables: status === 'verified'
    ? [{
        proposalAssetId: 'proposal-asset-demo',
        assetId: 'asset-pdf-demo',
        kind: 'deck',
        audience: 'client_facing',
        status: 'final',
        version: 1,
        renderJobId: 'prnd-demo'
      }]
    : [],
  verification: status === 'verified'
    ? {
        method: 'authenticated_portal',
        route: '/admin/commercial/proposals',
        verifiedAt: '2026-08-02T12:10:00.000Z',
        actorMemberId: 'member-demo',
        checks: {
          proposalVisible: true,
          renderJobCompleted: true,
          versionedAssetVisible: true,
          audienceConfirmed: true,
          sourceReviewed: true
        }
      }
    : null
})

test('workshop_only nunca pasa como cierre canónico', () => {
  const repoRoot = makeWorkspace()
  const workspaceDir = path.join(repoRoot, 'docs/commercial/tenders/demo-rfp')

  fs.mkdirSync(workspaceDir, { recursive: true })

  for (const file of ['README.md', 'artifact-manifest.json', 'oferta-tecnica.md']) {
    fs.writeFileSync(path.join(workspaceDir, file), '')
  }

  fs.writeFileSync(path.join(workspaceDir, 'deck-plan.json'), '{}')
  fs.writeFileSync(path.join(workspaceDir, 'proposal-studio.json'), JSON.stringify(baseRecord(workspaceDir, 'workshop_only')))

  const result = evaluateTenderWorkspace({ repoRoot, slug: 'demo-rfp' })

  assert.equal(result.passed, false)
  assert.ok(result.issues.some(issue => issue.code === 'closure_not_verified'))

  const issues = validateClosureRecord({
    slug: 'demo-rfp',
    workspaceDir,
    record: baseRecord(workspaceDir, 'workshop_only')
  })

  assert.ok(issues.some(issue => issue.code === 'missing_source_plan') === false)
  assert.ok(issues.length === 0)
})

test('verified exige evidencia autenticada y asset derivado del job', () => {
  const workspaceDir = makeWorkspace()

  fs.writeFileSync(path.join(workspaceDir, 'deck-plan.json'), '{}')

  const issues = validateClosureRecord({
    slug: 'demo-rfp',
    workspaceDir,
    record: baseRecord(workspaceDir)
  })

  assert.deepEqual(issues, [])
})

test('un PDF local sin Proposal y sin job no puede cerrar', () => {
  const workspaceDir = makeWorkspace()

  fs.writeFileSync(path.join(workspaceDir, 'deck-plan.json'), '{}')
  const record = baseRecord(workspaceDir, 'verified')

  record.proposalId = null
  record.registration = null
  record.renderJobs = []
  record.deliverables = []
  record.verification = null

  const issues = validateClosureRecord({ slug: 'demo-rfp', workspaceDir, record })

  assert.ok(issues.some(issue => issue.code === 'invalid_field'))
  assert.ok(issues.some(issue => issue.code === 'missing_render_job'))
  assert.ok(issues.some(issue => issue.code === 'missing_versioned_deliverable'))
})

test('el asset versionado debe corresponder al PDF del render productivo', () => {
  const workspaceDir = makeWorkspace()

  fs.writeFileSync(path.join(workspaceDir, 'deck-plan.json'), '{}')
  const record = baseRecord(workspaceDir)

  record.deliverables[0].assetId = 'asset-local-pdf'

  const issues = validateClosureRecord({ slug: 'demo-rfp', workspaceDir, record })

  assert.ok(issues.some(issue => issue.code === 'deliverable_asset_mismatch'))
})
