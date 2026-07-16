import { createHash } from 'node:crypto'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const ACCOUNT = 'anam-19893546'
const PORTAL_ID = '19893546'
const ROOT = process.cwd()
const EVIDENCE_DIR = resolve(ROOT, '.tmp/anam-deal-company-remediation-2026-07-16')
const MANIFEST_PATH = resolve(EVIDENCE_DIR, 'association-review-manifest.json')
const EXPECTED_MANIFEST_FILE_SHA256 = 'c6ed856db0466156fae2085a16bf6181bbd75dc0ca71f1701e64afbf346e1726'
const HELD_COMPANIES_PATH = resolve(ROOT, '.tmp/anam-sector-geography-2026-07-16/held-records.json')
const LEDGER_PATH = resolve(EVIDENCE_DIR, 'association-execution-ledger.json')
const UI_READBACK_LEDGER_PATH = resolve(EVIDENCE_DIR, 'association-ui-import-readback-ledger.json')
const PRIMARY_ASSOCIATION_TYPE_ID = 5
const BATCH_SIZE = 10
const VERIFY_ONLY = process.argv.includes('--verify-only')
const IMPORT_ID = process.argv.find(argument => argument.startsWith('--import-id='))?.split('=')[1] || null

if (!VERIFY_ONLY && !process.argv.includes('--apply')) {
  throw new Error('Refusing to write without explicit --apply; use --verify-only for read-back')
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function parseHsJson(output) {
  const responseIndex = output.indexOf('Response:')
  const arrayIndex = output.indexOf('[', responseIndex >= 0 ? responseIndex : 0)
  const objectIndex = output.indexOf('{', responseIndex >= 0 ? responseIndex : 0)
  const jsonIndex = [arrayIndex, objectIndex].filter(index => index >= 0).sort((a, b) => a - b)[0]

  if (jsonIndex === undefined) throw new Error(`HubSpot CLI did not return JSON: ${output.slice(0, 500)}`)

  return JSON.parse(output.slice(jsonIndex))
}

function hsApi(endpoint, { method = 'GET', data } = {}) {
  const args = ['api', endpoint, '--account', ACCOUNT]

  if (method !== 'GET') args.push('--method', method)
  if (data !== undefined) args.push('--data', JSON.stringify(data))

  const result = spawnSync('hs', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024
  })

  const output = `${result.stdout || ''}\n${result.stderr || ''}`

  if (result.status !== 0) {
    throw new Error(`HubSpot CLI failed (${method} ${endpoint}): ${output.slice(-5000)}`)
  }

  return parseHsJson(output)
}

function chunks(items, size) {
  const output = []

  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size))

  return output
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))]
}

function writeLedger(ledger, path = LEDGER_PATH) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)
}

function getDealCompanyAssociations(dealId) {
  const response = hsApi(`/crm/v4/objects/deals/${dealId}/associations/companies?limit=500`)

  return (response.results || []).map(result => ({
    companyId: String(result.toObjectId),
    typeIds: unique((result.associationTypes || []).map(type => type.typeId))
  }))
}

function assertCompaniesExist(companyIds) {
  for (const group of chunks(companyIds, 100)) {
    const response = hsApi('/crm/v3/objects/companies/batch/read', {
      method: 'POST',
      data: {
        inputs: group.map(id => ({ id })),
        properties: ['name', 'razon_social'],
        propertiesWithHistory: []
      }
    })

    const returned = new Set((response.results || []).map(company => String(company.id)))

    for (const id of group) {
      if (!returned.has(String(id))) throw new Error(`Target Company ${id} was not returned by direct batch read`)
    }
  }
}

function main() {
  if (ACCOUNT !== 'anam-19893546' || PORTAL_ID !== '19893546') throw new Error('ANAM portal guard failed')

  if (sha256File(MANIFEST_PATH) !== EXPECTED_MANIFEST_FILE_SHA256) {
    throw new Error('Approved association manifest hash drifted; refusing execution')
  }

  const account = hsApi('/account-info/v3/details')

  if (String(account.portalId) !== PORTAL_ID) {
    throw new Error(`Wrong HubSpot portal: expected ${PORTAL_ID}, got ${account.portalId}`)
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const approved = manifest.inputs.filter(row => row.classification === 'candidate_contact_company_unique')

  if (approved.length !== 34) throw new Error(`Approved cohort drifted: expected 34, got ${approved.length}`)

  if (approved.some(row => row.autoEligible !== false || row.requiresHumanReview !== true)) {
    throw new Error('Manifest review contract drifted')
  }

  const held = JSON.parse(readFileSync(HELD_COMPANIES_PATH, 'utf8'))

  const duplicateCompanyIds = new Set(
    held.duplicateCompanyKeys.flatMap(item => item.hubSpotCompanyIds).map(String)
  )

  for (const row of approved) {
    if (duplicateCompanyIds.has(String(row.proposedCompanyId))) {
      throw new Error(`Deal ${row.dealId} targets held duplicate Company ${row.proposedCompanyId}`)
    }
  }

  assertCompaniesExist(unique(approved.map(row => row.proposedCompanyId)))

  if (VERIFY_ONLY) {
    const verified = approved.map(row => {
      const associations = getDealCompanyAssociations(row.dealId)
      const target = associations.find(item => item.companyId === String(row.proposedCompanyId))

      if (!target || !target.typeIds.includes(String(PRIMARY_ASSOCIATION_TYPE_ID))) {
        throw new Error(`Primary association readback failed for Deal ${row.dealId}`)
      }

      if (associations.length !== 1) {
        throw new Error(`Deal ${row.dealId} has ${associations.length} distinct Companies after UI import`)
      }

      return {
        dealId: row.dealId,
        companyId: row.proposedCompanyId,
        associations
      }
    })

    const ledger = {
      verifiedAt: new Date().toISOString(),
      status: 'verified',
      executionSurface: 'authenticated HubSpot UI multi-object import',
      importId: IMPORT_ID,
      portalId: PORTAL_ID,
      account: ACCOUNT,
      manifestPath: MANIFEST_PATH,
      manifestFileSha256: EXPECTED_MANIFEST_FILE_SHA256,
      expectedPairs: approved.length,
      verifiedPairs: verified.length,
      associationType: {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: PRIMARY_ASSOCIATION_TYPE_ID,
        label: 'Primary'
      },
      verified
    }

    writeLedger(ledger, UI_READBACK_LEDGER_PATH)
    console.log(
      JSON.stringify(
        {
          status: ledger.status,
          portalId: PORTAL_ID,
          importId: IMPORT_ID,
          approvedPairs: approved.length,
          verified: verified.length,
          ledgerPath: UI_READBACK_LEDGER_PATH,
          ledgerFileSha256: sha256File(UI_READBACK_LEDGER_PATH)
        },
        null,
        2
      )
    )
    
return
  }

  const before = approved.map(row => ({
    dealId: row.dealId,
    proposedCompanyId: row.proposedCompanyId,
    associations: getDealCompanyAssociations(row.dealId)
  }))

  const drifted = before.filter(item => item.associations.length !== 0)

  if (drifted.length) {
    throw new Error(`${drifted.length} approved Deal(s) gained a Company association after dry run; refusing execution`)
  }

  const ledger = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'in_progress',
    portalId: PORTAL_ID,
    account: ACCOUNT,
    approval: 'Operator approved exact 34-row Primary association table in current Codex thread.',
    manifestPath: MANIFEST_PATH,
    manifestFileSha256: EXPECTED_MANIFEST_FILE_SHA256,
    associationType: {
      associationCategory: 'HUBSPOT_DEFINED',
      associationTypeId: PRIMARY_ASSOCIATION_TYPE_ID,
      label: 'Primary'
    },
    before,
    batches: [],
    verified: [],
    rollbackPairs: approved.map(row => ({
      dealId: row.dealId,
      companyId: row.proposedCompanyId,
      associationTypeId: PRIMARY_ASSOCIATION_TYPE_ID
    }))
  }

  writeLedger(ledger)

  try {
    for (const [batchIndex, batch] of chunks(approved, BATCH_SIZE).entries()) {
      const response = hsApi('/crm/v4/associations/deals/companies/batch/create', {
        method: 'POST',
        data: {
          inputs: batch.map(row => ({
            from: { id: row.dealId },
            to: { id: row.proposedCompanyId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: PRIMARY_ASSOCIATION_TYPE_ID
              }
            ]
          }))
        }
      })

      const verification = batch.map(row => {
        const associations = getDealCompanyAssociations(row.dealId)
        const target = associations.find(item => item.companyId === String(row.proposedCompanyId))

        if (!target || !target.typeIds.includes(String(PRIMARY_ASSOCIATION_TYPE_ID))) {
          throw new Error(`Primary association readback failed for Deal ${row.dealId}`)
        }

        if (associations.length !== 1) {
          throw new Error(`Deal ${row.dealId} has ${associations.length} distinct Companies after write`)
        }

        return {
          dealId: row.dealId,
          companyId: row.proposedCompanyId,
          associations
        }
      })

      ledger.batches.push({
        batch: batchIndex + 1,
        size: batch.length,
        status: response.status || 'COMPLETE',
        requestedPairs: batch.map(row => ({ dealId: row.dealId, companyId: row.proposedCompanyId }))
      })
      ledger.verified.push(...verification)
      writeLedger(ledger)
    }

    ledger.status = 'verified'
    ledger.completedAt = new Date().toISOString()
    writeLedger(ledger)
  } catch (error) {
    ledger.status = 'failed_or_partial'
    ledger.completedAt = new Date().toISOString()
    ledger.error = String(error.message || error)
    ledger.observedAfterFailure = approved.map(row => ({
      dealId: row.dealId,
      proposedCompanyId: row.proposedCompanyId,
      associations: getDealCompanyAssociations(row.dealId)
    }))
    writeLedger(ledger)
    throw error
  }

  console.log(
    JSON.stringify(
      {
        status: ledger.status,
        portalId: PORTAL_ID,
        approvedPairs: approved.length,
        batches: ledger.batches.map(batch => ({ batch: batch.batch, size: batch.size, status: batch.status })),
        verified: ledger.verified.length,
        ledgerPath: LEDGER_PATH,
        ledgerFileSha256: sha256File(LEDGER_PATH)
      },
      null,
      2
    )
  )
}

main()
