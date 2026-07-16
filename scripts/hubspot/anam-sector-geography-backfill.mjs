import { createHash } from 'node:crypto'
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

import XLSX from 'xlsx'

const ACCOUNT = 'anam-19893546'
const PORTAL_ID = '19893546'
const APPLY = process.argv.includes('--apply')
const VERIFY_ONLY = process.argv.includes('--verify-only')
const ROOT = process.cwd()

const SOURCE = resolve(
  ROOT,
  'docs/architecture/kortex/hubspot-as-a-service/anam-source-attachments-2026-07-16/pablo-puga/2026-04-01_segmentacion-clientes.xlsx'
)

const EVIDENCE_DIR = resolve(ROOT, '.tmp/anam-sector-geography-2026-07-16')

const SEGMENTS = [
  ['Alimentos', 'alimentos'],
  ['Transporte', 'transporte'],
  ['Consultoras', 'consultoras'],
  ['Otros Rubros', 'otros_rubros'],
  ['Bebidas', 'bebidas'],
  ['Forestal', 'forestal'],
  ['Salud', 'salud'],
  ['Ing. y Construcción', 'ingenieria_y_construccion'],
  ['Laboratorios', 'laboratorios'],
  ['Mineria', 'mineria'],
  ['Particulares', 'particulares'],
  ['Organismos Públicos', 'organismos_publicos'],
  ['Acuicola', 'acuicola'],
  ['Productos Quimicos', 'productos_quimicos'],
  ['Retail', 'retail'],
  ['Sanitarias', 'sanitarias'],
  ['Turismo', 'turismo'],
  ['Educación', 'educacion'],
  ['Vitivinícola', 'vitivinicola'],
  ['Energía', 'energia'],
  ['Desconocido', 'desconocido'],
  ['Textiles', 'textiles']
]

const SEGMENT_VALUE = new Map(SEGMENTS)

const REGION_VALUE = new Map([
  [1, 'Región de Tarapacá'],
  [2, 'Región de Antofagasta'],
  [3, 'Región de Atacama'],
  [4, 'Región de Coquimbo'],
  [5, 'Región de Valparaíso'],
  [6, "Región del Libertador General Bernardo O'Higgins"],
  [7, 'Región del Maule'],
  [8, 'Región del Biobío'],
  [9, 'Región de La Araucanía'],
  [10, 'Región de Los Lagos'],
  [11, 'Región de Aysén del General Carlos Ibáñez del Campo'],
  [12, 'Región de Magallanes y de la Antártica Chilena'],
  [13, 'Región Metropolitana de Santiago'],
  [14, 'Región de Los Ríos'],
  [15, 'Región de Arica y Parinacota'],
  [16, 'Región de Ñuble']
])

const STRATEGIC_SECTOR = new Map([
  ['Mineria', 'Minería'],
  ['Sanitarias', 'Sanitarias'],
  ['Energía', 'Energía'],
  ['Acuicola', 'Acuícola']
])

const PROPERTY_PAYLOAD = {
  groupName: 'companyinformation',
  name: 'segmento_de_mercado_anam',
  label: 'Segmento de mercado',
  type: 'enumeration',
  fieldType: 'select',
  description:
    'Segmentación operativa de clientes proveniente de LabWare. No reemplaza la industria nativa ni el sector estratégico.',
  formField: true,
  options: SEGMENTS.map(([label, value], displayOrder) => ({
    label,
    value,
    displayOrder,
    hidden: false
  }))
}

function parseHsJson(output) {
  const responseIndex = output.indexOf('Response:')
  const jsonIndex = output.indexOf('{', responseIndex >= 0 ? responseIndex : 0)

  if (jsonIndex < 0) throw new Error(`HubSpot CLI did not return JSON: ${output.slice(0, 500)}`)

  return JSON.parse(output.slice(jsonIndex))
}

function hsApi(endpoint, { method = 'GET', data, allowNotFound = false } = {}) {
  const args = ['api', endpoint, '--account', ACCOUNT]

  if (method !== 'GET') args.push('--method', method)
  if (data !== undefined) args.push('--data', JSON.stringify(data))

  const result = spawnSync('hs', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  })

  const output = `${result.stdout || ''}\n${result.stderr || ''}`

  if (result.status !== 0) {
    if (allowNotFound && output.includes('404 Not Found')) return null
    throw new Error(`HubSpot CLI failed (${method} ${endpoint}): ${output.slice(-5000)}`)
  }

  return parseHsJson(output)
}

function normalizeBasic(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeLegalName(value) {
  return normalizeBasic(value)
    .replace(
      /\b(sociedad por acciones|sociedad anonima cerrada|sociedad anonima|empresa individual de responsabilidad limitada|responsabilidad limitada)\b/g,
      ' '
    )
    .replace(/\b(s p a|spa|s a|sa|ltda|limitada|e i r l|eirl|inc|corp|corporation)\b/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function writeEvidence(name, value) {
  const path = resolve(EVIDENCE_DIR, name)

  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)

  return path
}

function csvCell(value) {
  const text = String(value ?? '')

  return `"${text.replace(/"/g, '""')}"`
}

function writeImportCsv(name, headers, rows) {
  const path = resolve(EVIDENCE_DIR, name)
  const body = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')

  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${body}\n`, { mode: 0o600 })
  chmodSync(path, 0o600)

  return path
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function chunks(items, size) {
  const result = []

  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))

  return result
}

function countBy(items, selector) {
  return Object.fromEntries(
    [...items.reduce((counts, item) => {
      const key = selector(item)

      counts.set(key, (counts.get(key) || 0) + 1)

      return counts
    }, new Map())].sort(([left], [right]) => left.localeCompare(right, 'es'))
  )
}

function fetchCompanies() {
  const companies = []
  let after

  do {
    const query = new URLSearchParams({
      limit: '100',
      properties:
        'name,domain,industry,state,segmento_de_mercado_anam,region_de_chile,sector_estrategico,hs_lastmodifieddate'
    })

    if (after) query.set('after', after)

    const page = hsApi(`/crm/v3/objects/companies?${query}`)

    companies.push(...page.results)
    after = page.paging?.next?.after
  } while (after)

  return companies
}

function readWorkbook() {
  const workbook = XLSX.readFile(SOURCE)
  const sheet = workbook.Sheets.Hoja1

  if (!sheet) throw new Error('Expected worksheet Hoja1 was not found')

  return XLSX.utils
    .sheet_to_json(sheet, { defval: '' })
    .filter(row => row.CeCo_Clientes || row.Razón_Social || row.Nombre_Fantasía)
}

function buildPlan(companies, sourceRows) {
  const sourceByKey = new Map()

  sourceRows.forEach((row, rowOffset) => {
    ;['Razón_Social', 'Nombre_Fantasía', 'Descripción_CeCo'].forEach(field => {
      const key = normalizeLegalName(row[field])

      if (!key) return
      if (!sourceByKey.has(key)) sourceByKey.set(key, new Map())

      sourceByKey.get(key).set(rowOffset + 2, { row, rowNumber: rowOffset + 2 })
    })
  })

  const companiesByKey = new Map()

  companies.forEach(company => {
    const key = normalizeLegalName(company.properties.name)

    if (!companiesByKey.has(key)) companiesByKey.set(key, [])
    companiesByKey.get(key).push(company)
  })

  const ambiguousSource = []
  const duplicateCompanyKeys = []
  const unmatched = []
  const eligible = []

  companies.forEach(company => {
    const key = normalizeLegalName(company.properties.name)
    const sourceMatches = [...(sourceByKey.get(key) || new Map()).values()]

    if (sourceMatches.length === 0) {
      unmatched.push({ id: company.id, normalizedKey: key })
      
return
    }

    const valuePairs = new Map(
      sourceMatches.map(match => [
        `${match.row['Segmentación Mercado2']}|${match.row.Región}`,
        match
      ])
    )

    if (valuePairs.size !== 1) {
      ambiguousSource.push({
        id: company.id,
        normalizedKey: key,
        candidateValues: [...valuePairs.keys()]
      })
      
return
    }

    const companyMatches = companiesByKey.get(key) || []

    if (companyMatches.length !== 1) {
      duplicateCompanyKeys.push({
        id: company.id,
        normalizedKey: key,
        hubSpotCompanyIds: companyMatches.map(item => item.id)
      })
      
return
    }

    const source = [...valuePairs.values()][0]
    const segmentLabel = source.row['Segmentación Mercado2']
    const segmentValue = SEGMENT_VALUE.get(segmentLabel)
    const regionCode = Number(source.row.Región)
    const regionValue = REGION_VALUE.get(regionCode)

    if (!segmentValue || !regionValue) {
      throw new Error(
        `Invalid controlled value for Company ${company.id}: segment=${segmentLabel}, region=${source.row.Región}`
      )
    }

    eligible.push({
      id: company.id,
      normalizedKey: key,
      sourceRowNumbers: sourceMatches.map(match => match.rowNumber),
      sourceCeCo: source.row.CeCo_Clientes,
      sourceSegmentLabel: segmentLabel,
      sourceRegionCode: regionCode,
      before: {
        segmento_de_mercado_anam: company.properties.segmento_de_mercado_anam || null,
        region_de_chile: company.properties.region_de_chile || null,
        sector_estrategico: company.properties.sector_estrategico || null,
        hs_lastmodifieddate: company.properties.hs_lastmodifieddate || null
      },
      proposed: {
        segmento_de_mercado_anam: segmentValue,
        region_de_chile: regionValue,
        ...(STRATEGIC_SECTOR.has(segmentLabel)
          ? { sector_estrategico: STRATEGIC_SECTOR.get(segmentLabel) }
          : {})
      }
    })
  })

  return { eligible, ambiguousSource, duplicateCompanyKeys, unmatched }
}

function assertPlan(plan, companies, sourceRows) {
  const strategic = plan.eligible.filter(item => item.proposed.sector_estrategico)

  if (PORTAL_ID !== '19893546' || ACCOUNT !== 'anam-19893546') throw new Error('ANAM portal guard failed')
  if (companies.length !== 1023) throw new Error(`Company inventory drift: expected 1023, found ${companies.length}`)
  if (sourceRows.length !== 2611) throw new Error(`Workbook drift: expected 2611 rows, found ${sourceRows.length}`)

  if (plan.eligible.length !== 471) {
    throw new Error(`Safe unique-Company cohort drift: expected 471, found ${plan.eligible.length}`)
  }

  if (strategic.length !== 65) {
    throw new Error(`Strategic cohort drift: expected 65, found ${strategic.length}`)
  }

  const conflicts = plan.eligible.filter(item =>
    ['segmento_de_mercado_anam', 'region_de_chile', 'sector_estrategico'].some(property => {
      const before = item.before[property]
      const proposed = item.proposed[property]

      return before && proposed && before !== proposed
    })
  )

  if (conflicts.length > 0) {
    throw new Error(`Existing-value conflict on ${conflicts.length} Companies; aborting before write`)
  }
}

function ensureProperty() {
  let property = hsApi('/crm/v3/properties/companies/segmento_de_mercado_anam', {
    allowNotFound: true
  })

  if (!property) {
    if (!APPLY) return null
    property = hsApi('/crm/v3/properties/companies', {
      method: 'POST',
      data: PROPERTY_PAYLOAD
    })
  }

  const optionPairs = property.options.map(option => [option.label, option.value])

  if (
    property.name !== PROPERTY_PAYLOAD.name ||
    property.label !== PROPERTY_PAYLOAD.label ||
    property.type !== PROPERTY_PAYLOAD.type ||
    property.fieldType !== PROPERTY_PAYLOAD.fieldType ||
    JSON.stringify(optionPairs) !== JSON.stringify(SEGMENTS)
  ) {
    throw new Error('Property readback does not match the approved schema')
  }

  return property
}

function batchUpdate(items, selector, label) {
  const pending = items.filter(item => {
    const proposed = selector(item)

    return Object.entries(proposed).some(([property, value]) => item.before[property] !== value)
  })

  const batches = chunks(pending, 100)

  batches.forEach((batch, index) => {
    hsApi('/crm/v3/objects/companies/batch/update', {
      method: 'POST',
      data: {
        inputs: batch.map(item => ({ id: item.id, properties: selector(item) }))
      }
    })
    console.log(`${label}: batch ${index + 1}/${batches.length} accepted (${batch.length} Companies)`)
  })

  return pending.length
}

function verify(items) {
  const readback = []

  chunks(items, 100).forEach(batch => {
    const response = hsApi('/crm/v3/objects/companies/batch/read', {
      method: 'POST',
      data: {
        properties: ['segmento_de_mercado_anam', 'region_de_chile', 'sector_estrategico'],
        inputs: batch.map(item => ({ id: item.id }))
      }
    })

    readback.push(...response.results)
  })

  const byId = new Map(readback.map(company => [company.id, company]))
  const failures = []

  items.forEach(item => {
    const company = byId.get(item.id)

    if (!company) {
      failures.push({ id: item.id, reason: 'missing_readback' })
      
return
    }

    Object.entries(item.proposed).forEach(([property, expected]) => {
      const actual = company.properties[property] || null

      if (actual !== expected) failures.push({ id: item.id, property, expected, actual })
    })
  })

  if (failures.length > 0) {
    writeEvidence('readback-failures.json', failures)
    throw new Error(`Readback failed for ${failures.length} property values`)
  }

  return readback
}

function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true, mode: 0o700 })

  const propertyBefore = hsApi('/crm/v3/properties/companies/segmento_de_mercado_anam', {
    allowNotFound: true
  })

  const companies = fetchCompanies()
  const sourceRows = readWorkbook()
  const plan = buildPlan(companies, sourceRows)

  assertPlan(plan, companies, sourceRows)

  const strategic = plan.eligible.filter(item => item.proposed.sector_estrategico)

  const snapshot = {
    generatedAt: new Date().toISOString(),
    portalId: PORTAL_ID,
    account: ACCOUNT,
    propertyBefore,
    companies: plan.eligible.map(item => ({ id: item.id, before: item.before }))
  }

  const manifest = {
    generatedAt: snapshot.generatedAt,
    portalId: PORTAL_ID,
    source: SOURCE,
    matchingContract:
      'Exact normalized Company name to legal/fantasy/description name; controlled legal suffixes removed; one consistent source segment+region; one live HubSpot Company per normalized key.',
    counts: {
      sourceRows: sourceRows.length,
      liveCompanies: companies.length,
      eligibleSegmentAndRegion: plan.eligible.length,
      eligibleStrategicSector: strategic.length,
      ambiguousSource: plan.ambiguousSource.length,
      duplicateCompanyRecordsHeld: plan.duplicateCompanyKeys.length,
      unmatched: plan.unmatched.length
    },
    segmentCounts: countBy(plan.eligible, item => item.sourceSegmentLabel),
    regionCounts: countBy(plan.eligible, item => String(item.sourceRegionCode)),
    strategicCounts: countBy(strategic, item => item.proposed.sector_estrategico),
    inputs: plan.eligible
  }

  // Verification must never overwrite the immutable pre-change evidence used
  // for rollback. It only adds the post-change readback below.
  const snapshotPath = resolve(EVIDENCE_DIR, 'before-snapshot.json')
  const manifestPath = resolve(EVIDENCE_DIR, 'change-manifest.json')
  const heldPath = resolve(EVIDENCE_DIR, 'held-records.json')
  const segmentRegionCsvPath = resolve(EVIDENCE_DIR, 's2-company-segment-region.csv')
  const strategicSectorCsvPath = resolve(EVIDENCE_DIR, 's3-company-strategic-sector.csv')

  if (!VERIFY_ONLY) {
    writeEvidence('before-snapshot.json', snapshot)
    writeEvidence('change-manifest.json', manifest)
    writeEvidence('held-records.json', {
      ambiguousSource: plan.ambiguousSource,
      duplicateCompanyKeys: plan.duplicateCompanyKeys,
      unmatched: plan.unmatched
    })
    writeImportCsv(
      's2-company-segment-region.csv',
      ['Record ID', 'Segmento de mercado', 'Región de Chile'],
      plan.eligible.map(item => [
        item.id,
        item.sourceSegmentLabel,
        item.proposed.region_de_chile
      ])
    )
    writeImportCsv(
      's3-company-strategic-sector.csv',
      ['Record ID', 'Sector estratégico'],
      strategic.map(item => [item.id, item.proposed.sector_estrategico])
    )
  }

  console.log(
    JSON.stringify(
      {
        mode: VERIFY_ONLY ? 'verify-only' : APPLY ? 'apply' : 'plan',
        portalId: PORTAL_ID,
        property: {
          internalName: PROPERTY_PAYLOAD.name,
          label: PROPERTY_PAYLOAD.label,
          existsBefore: Boolean(propertyBefore)
        },
        counts: manifest.counts,
        strategicCounts: manifest.strategicCounts,
        manifestSha256: sha256(manifest),
        evidence: {
          snapshotPath,
          manifestPath,
          heldPath,
          segmentRegionCsvPath,
          strategicSectorCsvPath
        }
      },
      null,
      2
    )
  )

  if (VERIFY_ONLY) {
    const property = ensureProperty()
    const readback = verify(plan.eligible)
    const readbackPath = writeEvidence('after-readback.json', readback)

    console.log(
      JSON.stringify(
        {
          status: 'verified',
          property: {
            name: property.name,
            label: property.label,
            optionCount: property.options.length
          },
          verifiedCompanies: readback.length,
          readbackPath
        },
        null,
        2
      )
    )
    
return
  }

  if (!APPLY) return

  const property = ensureProperty()

  const segmentAndRegionWrites = batchUpdate(
    plan.eligible,
    item => ({
      segmento_de_mercado_anam: item.proposed.segmento_de_mercado_anam,
      region_de_chile: item.proposed.region_de_chile
    }),
    'S2 segment+region'
  )

  const strategicWrites = batchUpdate(
    strategic,
    item => ({ sector_estrategico: item.proposed.sector_estrategico }),
    'S3 strategic sector'
  )

  const readback = verify(plan.eligible)
  const readbackPath = writeEvidence('after-readback.json', readback)

  console.log(
    JSON.stringify(
      {
        status: 'verified',
        property: {
          name: property.name,
          label: property.label,
          optionCount: property.options.length
        },
        writes: {
          segmentAndRegionCompanies: segmentAndRegionWrites,
          strategicSectorCompanies: strategicWrites
        },
        verifiedCompanies: readback.length,
        readbackPath
      },
      null,
      2
    )
  )
}

main()
