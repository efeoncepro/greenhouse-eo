import { createHash } from 'node:crypto'
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const ACCOUNT = 'anam-19893546'
const PORTAL_ID = '19893546'
const ROOT = process.cwd()
const EVIDENCE_DIR = resolve(ROOT, '.tmp/anam-deal-company-remediation-2026-07-16')

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.cl',
  'outlook.com',
  'outlook.cl',
  'live.com',
  'live.cl',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com'
])

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

function associationIds(record, objectType) {
  return unique(record.associations?.[objectType]?.results?.map(item => item.id) || [])
}

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
}

function emailDomain(value) {
  const email = String(value || '').trim().toLowerCase()
  const at = email.lastIndexOf('@')

  if (at < 1) return ''

  const domain = normalizeDomain(email.slice(at + 1))

  return FREE_EMAIL_DOMAINS.has(domain) ? '' : domain
}

function writeEvidence(name, value) {
  const path = resolve(EVIDENCE_DIR, name)

  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)

  return path
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function writeCsv(name, rows) {
  const path = resolve(EVIDENCE_DIR, name)

  const headers = [
    'Deal ID',
    'Deal',
    'Owner ID',
    'Owner',
    'Company ID propuesta',
    'Company',
    'Clasificación',
    'Confianza',
    'Evidencia',
    'Requiere revisión humana'
  ]

  const body = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')

  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${body}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)

  return path
}

function markdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function writeApprovalMarkdown(rows) {
  const path = resolve(EVIDENCE_DIR, 'high-confidence-approval-table.md')

  const lines = [
    '# ANAM — Proposed primary Deal→Company associations',
    '',
    '| Deal ID | Deal | Owner | Current Company | Proposed Company ID | Proposed Company | Association | Evidence |',
    '|---:|---|---|---|---:|---|---|---|',
    ...rows.map(row =>
      `| ${markdownCell(row.dealId)} | ${markdownCell(row.dealName)} | ${markdownCell(row.ownerName)} | none | ${markdownCell(row.proposedCompanyId)} | ${markdownCell(row.proposedCompanyName)} | Primary (type 5) | ${markdownCell(row.evidence)} |`
    )
  ]

  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${lines.join('\n')}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)

  return path
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function countBy(items, selector) {
  const counts = new Map()

  for (const item of items) {
    const key = selector(item) || '(vacío)'

    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
}

function fetchAll(objectType, properties, associations = []) {
  const results = []
  let after

  do {
    const params = new URLSearchParams({
      limit: '100',
      archived: 'false',
      properties: properties.join(',')
    })

    if (associations.length) params.set('associations', associations.join(','))
    if (after) params.set('after', after)

    const response = hsApi(`/crm/v3/objects/${objectType}?${params}`)

    results.push(...response.results)
    after = response.paging?.next?.after
  } while (after)

  return results
}

function fetchOwners() {
  const owners = []
  let after

  do {
    const params = new URLSearchParams({ limit: '500', archived: 'false' })

    if (after) params.set('after', after)

    const response = hsApi(`/crm/v3/owners?${params}`)

    owners.push(...response.results)
    after = response.paging?.next?.after
  } while (after)

  return owners
}

function batchReadContacts(contactIds) {
  const contacts = []

  for (const group of chunks(contactIds, 100)) {
    const response = hsApi('/crm/v3/objects/contacts/batch/read', {
      method: 'POST',
      data: {
        inputs: group.map(id => ({ id })),
        properties: ['email', 'firstname', 'lastname'],
        propertiesWithHistory: []
      }
    })

    contacts.push(...response.results)
  }

  return contacts
}

function batchReadContactCompanies(contactIds) {
  const associations = new Map(contactIds.map(id => [String(id), []]))

  for (const group of chunks(contactIds, 100)) {
    const response = hsApi('/crm/v4/associations/contacts/companies/batch/read', {
      method: 'POST',
      data: { inputs: group.map(id => ({ id })) }
    })

    for (const item of response.results || []) {
      associations.set(
        String(item.from.id),
        unique((item.to || []).map(target => target.toObjectId))
      )
    }
  }

  return associations
}

function main() {
  if (ACCOUNT !== 'anam-19893546' || PORTAL_ID !== '19893546') throw new Error('ANAM portal guard failed')

  const account = hsApi('/account-info/v3/details')

  if (String(account.portalId) !== PORTAL_ID) {
    throw new Error(`Wrong HubSpot portal: expected ${PORTAL_ID}, got ${account.portalId}`)
  }

  const deals = fetchAll(
    'deals',
    [
      'dealname',
      'hubspot_owner_id',
      'pipeline',
      'dealstage',
      'createdate',
      'closedate',
      'amount',
      'tipo_de_ingreso',
      'resultado_comercial_reportable_anam'
    ],
    ['companies', 'contacts']
  )

  const companies = fetchAll('companies', [
    'name',
    'domain',
    'website',
    'rut',
    'razon_social',
    'segmento_de_mercado_anam',
    'region_de_chile',
    'sector_estrategico'
  ])

  const missingCompanyDeals = deals.filter(deal => associationIds(deal, 'companies').length === 0)
  const owners = fetchOwners()

  const ownerById = new Map(
    owners.map(owner => [
      String(owner.id),
      [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || String(owner.id)
    ])
  )

  const contactIds = unique(missingCompanyDeals.flatMap(deal => associationIds(deal, 'contacts')))
  const contacts = batchReadContacts(contactIds)
  const contactById = new Map(contacts.map(contact => [String(contact.id), contact]))
  const companiesByContact = batchReadContactCompanies(contactIds)
  const companyById = new Map(companies.map(company => [String(company.id), company]))
  const companiesByDomain = new Map()

  for (const company of companies) {
    for (const domain of unique([
      normalizeDomain(company.properties.domain),
      normalizeDomain(company.properties.website)
    ])) {
      if (!domain) continue

      const ids = companiesByDomain.get(domain) || []

      ids.push(String(company.id))
      companiesByDomain.set(domain, unique(ids))
    }
  }

  const rows = missingCompanyDeals.map(deal => {
    const dealContactIds = associationIds(deal, 'contacts')

    const linkedCompanyIds = unique(
      dealContactIds.flatMap(contactId => companiesByContact.get(String(contactId)) || [])
    )

    const corporateDomains = unique(
      dealContactIds.map(contactId => emailDomain(contactById.get(String(contactId))?.properties?.email))
    )

    const domainCompanyIds = unique(
      corporateDomains.flatMap(domain => companiesByDomain.get(domain) || [])
    )

    let classification = 'hold_no_deterministic_identity'
    let confidence = 'none'
    let proposedCompanyId = ''
    let evidence = 'No deterministic Company identity through associated Contacts.'

    if (linkedCompanyIds.length === 1) {
      classification = 'candidate_contact_company_unique'
      confidence = 'high'
      proposedCompanyId = linkedCompanyIds[0]
      evidence = `${dealContactIds.length} Deal Contact(s) converge on one associated Company.`
    } else if (linkedCompanyIds.length > 1) {
      classification = 'hold_contact_company_conflict'
      confidence = 'conflict'
      evidence = `${dealContactIds.length} Deal Contact(s) resolve to ${linkedCompanyIds.length} different Companies.`
    } else if (corporateDomains.length === 1 && domainCompanyIds.length === 1) {
      classification = 'review_email_domain_unique'
      confidence = 'medium'
      proposedCompanyId = domainCompanyIds[0]
      evidence = `Associated Contact corporate email domain ${corporateDomains[0]} maps to one Company domain.`
    } else if (dealContactIds.length === 0) {
      classification = 'hold_no_contacts'
      evidence = 'Deal has no associated Contacts and title inference is prohibited.'
    } else if (corporateDomains.length > 1 || domainCompanyIds.length > 1) {
      classification = 'hold_email_domain_conflict'
      confidence = 'conflict'
      evidence = `${corporateDomains.length} corporate Contact domain(s) map to ${domainCompanyIds.length} Company record(s).`
    }

    const company = companyById.get(String(proposedCompanyId))

    return {
      dealId: String(deal.id),
      dealName: deal.properties.dealname || '',
      ownerId: deal.properties.hubspot_owner_id || '',
      ownerName: ownerById.get(String(deal.properties.hubspot_owner_id || '')) || 'Sin asignar',
      pipeline: deal.properties.pipeline || '',
      dealStage: deal.properties.dealstage || '',
      amount: deal.properties.amount || '',
      incomeType: deal.properties.tipo_de_ingreso || '',
      commercialOutcome: deal.properties.resultado_comercial_reportable_anam || '',
      closeDate: deal.properties.closedate || '',
      contactIds: dealContactIds,
      contactCompanyIds: linkedCompanyIds,
      corporateDomains,
      domainCompanyIds,
      proposedCompanyId,
      proposedCompanyName: company?.properties?.name || company?.properties?.razon_social || '',
      classification,
      confidence,
      evidence,
      autoEligible: false,
      requiresHumanReview: true
    }
  })

  const highConfidence = rows.filter(row => row.classification === 'candidate_contact_company_unique')
  const mediumConfidence = rows.filter(row => row.classification === 'review_email_domain_unique')
  const holds = rows.filter(row => !['candidate_contact_company_unique', 'review_email_domain_unique'].includes(row.classification))
  const generatedAt = new Date().toISOString()

  const manifest = {
    generatedAt,
    portalId: PORTAL_ID,
    mode: 'read-only-dry-run',
    matchingContract: {
      high: 'All Contacts associated to an unassociated Deal converge on exactly one Company through explicit Contact→Company associations.',
      medium: 'No Contact→Company association exists; one non-free Contact email domain maps to exactly one live Company domain. Review only.',
      prohibited: 'Deal-title inference, fuzzy name matching, owner matching, record creation, duplicate merge and automatic association writes.'
    },
    counts: {
      liveDeals: deals.length,
      liveCompanies: companies.length,
      dealsWithoutCompany: rows.length,
      highConfidence: highConfidence.length,
      mediumConfidence: mediumConfidence.length,
      held: holds.length
    },
    classificationCounts: countBy(rows, row => row.classification),
    highConfidenceOwnerCounts: countBy(highConfidence, row => row.ownerName),
    highConfidenceOutcomeCounts: countBy(highConfidence, row => row.commercialOutcome),
    mediumConfidenceOwnerCounts: countBy(mediumConfidence, row => row.ownerName),
    inputs: rows
  }

  const snapshotPath = writeEvidence('read-only-snapshot.json', {
    generatedAt,
    portalId: PORTAL_ID,
    deals,
    companies,
    contacts,
    companiesByContact: Object.fromEntries(companiesByContact)
  })

  const manifestPath = writeEvidence('association-review-manifest.json', manifest)

  const reviewCsvPath = writeCsv(
    'association-review.csv',
    [...highConfidence, ...mediumConfidence].map(row => [
      row.dealId,
      row.dealName,
      row.ownerId,
      row.ownerName,
      row.proposedCompanyId,
      row.proposedCompanyName,
      row.classification,
      row.confidence,
      row.evidence,
      'Sí'
    ])
  )

  const approvalTablePath = writeApprovalMarkdown(highConfidence)

  console.log(
    JSON.stringify(
      {
        status: 'read-only-dry-run-complete',
        portalId: PORTAL_ID,
        counts: manifest.counts,
        classificationCounts: manifest.classificationCounts,
        highConfidenceOwnerCounts: manifest.highConfidenceOwnerCounts,
        highConfidenceOutcomeCounts: manifest.highConfidenceOutcomeCounts,
        mediumConfidenceOwnerCounts: manifest.mediumConfidenceOwnerCounts,
        manifestSha256: sha256(manifest),
        evidence: { snapshotPath, manifestPath, reviewCsvPath, approvalTablePath }
      },
      null,
      2
    )
  )
}

main()
