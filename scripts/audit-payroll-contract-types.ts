import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

import { query, closeGreenhousePostgres } from '@/lib/db'
import {
  PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM,
  normalizeEmploymentTypeAliasValue
} from '@/lib/commercial/employment-type-alias-normalization'

type PayrollContractTypeCountRow = {
  contract_type: string | null
  total: string | number
}

type EmploymentTypeAliasRow = {
  source_value: string
  source_value_normalized: string
  employment_type_code: string | null
  resolution_status: string
  confidence: string
  active: boolean
  notes: string | null
}

const getArgValue = (flag: string) => {
  const index = process.argv.indexOf(flag)

  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const main = async () => {
  const outputPath = getArgValue('--output')

  const contractTypeRows = await query<PayrollContractTypeCountRow>(
    `SELECT contract_type, COUNT(*)::bigint AS total
     FROM greenhouse_payroll.compensation_versions
     GROUP BY 1
     ORDER BY COUNT(*) DESC, contract_type ASC`
  )

  const aliasRows = await query<EmploymentTypeAliasRow>(
    `SELECT source_value, source_value_normalized, employment_type_code,
            resolution_status, confidence, active, notes
     FROM greenhouse_commercial.employment_type_aliases
     WHERE source_system = $1
       AND active = TRUE
     ORDER BY source_value_normalized ASC`,
    [PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM]
  )

  const aliasByNormalized = new Map(aliasRows.map(row => [row.source_value_normalized, row]))

  const items = contractTypeRows.map(row => {
    const rawValue = String(row.contract_type ?? '').trim()
    const normalizedValue = normalizeEmploymentTypeAliasValue(rawValue)
    const alias = aliasByNormalized.get(normalizedValue) ?? null
    const total = Number(row.total ?? 0)

    return {
      contractType: rawValue,
      normalizedContractType: normalizedValue,
      total,
      matched: Boolean(alias),
      employmentTypeCode: alias?.employment_type_code ?? null,
      resolutionStatus: alias?.resolution_status ?? 'needs_review',
      confidence: alias?.confidence ?? 'low',
      notes: alias?.notes ?? null
    }
  })

  const summary = {
    sourceSystem: PAYROLL_CONTRACT_TYPE_SOURCE_SYSTEM,
    totalDistinctValues: items.length,
    totalRows: items.reduce((acc, item) => acc + item.total, 0),
    resolvedDistinctValues: items.filter(item => item.matched && item.employmentTypeCode).length,
    needsReviewDistinctValues: items.filter(item => !item.matched || !item.employmentTypeCode).length,
    needsReviewRows: items
      .filter(item => !item.matched || !item.employmentTypeCode)
      .reduce((acc, item) => acc + item.total, 0)
  }

  const report = { summary, items }

  console.log(JSON.stringify(report, null, 2))

  if (outputPath) {
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`\nWrote audit artifact to ${outputPath}`)
  }

  await closeGreenhousePostgres()
}

main().catch(async error => {
  console.error(error)
  await closeGreenhousePostgres().catch(() => undefined)
  process.exit(1)
})
