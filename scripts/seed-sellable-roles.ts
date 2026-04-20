import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { closeGreenhousePostgres } from '@/lib/db'
import {
  EMPLOYMENT_TYPE_SEED,
  loadSellableRolesSeedFile,
  normalizeSellableRolesCsv
} from '@/lib/commercial/sellable-roles-seed'
import {
  insertCostComponentsIfChanged,
  insertPricingRowsIfChanged,
  syncRoleEmploymentCompatibility,
  syncSellableRoleSkuSequence,
  upsertEmploymentType,
  upsertSellableRole
} from '@/lib/commercial/sellable-roles-store'
import {
  publishSellableRoleCostUpdated,
  publishSellableRoleCreated,
  publishSellableRolePricingUpdated
} from '@/lib/commercial/sellable-role-events'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv, type PostgresProfile } from './lib/load-greenhouse-tool-env'

interface SeedSummary {
  inserted: number
  updated: number
  skipped_placeholder: number
  skipped_empty: number
  rejected: number
  needs_review: number
  drift_detected: number
}

const parseProfile = (value: string | undefined): PostgresProfile => {
  switch (value) {
    case undefined:
    case '':
    case 'runtime':
    case 'migrator':
    case 'admin':
    case 'ops':
      return (value || 'runtime') as PostgresProfile
    default:
      throw new Error(`Unsupported profile "${value}". Use runtime, migrator, admin or ops.`)
  }
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const profileArg = args.find(argument => argument.startsWith('--profile='))
  const profile = parseProfile(profileArg?.slice('--profile='.length).trim())

  return {
    apply: args.includes('--apply'),
    outputPath: (() => {
      const index = args.indexOf('--output')

      
return index >= 0 ? args[index + 1] ?? null : null
    })(),
    effectiveFrom: (() => {
      const index = args.indexOf('--effective-from')

      
return index >= 0 ? args[index + 1] ?? null : new Date().toISOString().slice(0, 10)
    })(),
    profile
  }
}

const writeArtifact = async (outputPath: string, payload: unknown) => {
  const directory = path.dirname(outputPath)

  await mkdir(directory, { recursive: true })
  await writeFile(outputPath, JSON.stringify(payload, null, 2))
}

const main = async () => {
  const args = parseArgs()

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile(args.profile)

  const csv = await loadSellableRolesSeedFile()
  const parsed = normalizeSellableRolesCsv(csv)

  const summary: SeedSummary = {
    inserted: 0,
    updated: 0,
    skipped_placeholder: parsed.summary.skippedPlaceholder,
    skipped_empty: parsed.summary.skippedEmpty,
    rejected: parsed.summary.rejected,
    needs_review: parsed.summary.needsReview,
    drift_detected: parsed.summary.driftDetected
  }

  const artifact = {
    applied: args.apply,
    effectiveFrom: args.effectiveFrom,
    summary,
    parseSummary: parsed.summary,
    rejectedRows: parsed.rejectedRows,
    needsReview: parsed.rows
      .filter(row => row.reviewReasons.length > 0)
      .map(row => ({
        rowNumber: row.rowNumber,
        roleSku: row.roleSku,
        roleLabelEs: row.roleLabelEs,
        reviewReasons: row.reviewReasons
      }))
  }

  if (!args.apply) {
    console.log(JSON.stringify(artifact, null, 2))

    if (args.outputPath) {
      await writeArtifact(args.outputPath, artifact)
    }

    return
  }

  // The seeder is intentionally resumable instead of wrapping the whole catalog
  // in one long-lived transaction. Each write path is idempotent, so retries can
  // continue safely after a partial run without holding locks for the full import.
  for (const employmentType of EMPLOYMENT_TYPE_SEED) {
    await upsertEmploymentType(employmentType)
  }

  for (const row of parsed.rows) {
    const roleResult = await upsertSellableRole(row)

    if (roleResult.created) {
      summary.inserted += 1
      await publishSellableRoleCreated({
        roleId: roleResult.roleId,
        roleSku: row.roleSku,
        roleCode: row.roleCode,
        roleLabelEs: row.roleLabelEs,
        category: row.category,
        tier: row.tier
      })
    } else {
      summary.updated += 1
    }

    const costResult = await insertCostComponentsIfChanged(roleResult.roleId, row, args.effectiveFrom)

    await syncRoleEmploymentCompatibility(roleResult.roleId, row.inferredEmploymentTypeCode)

    if (costResult.changed && costResult.entry) {
      await publishSellableRoleCostUpdated({
        roleId: roleResult.roleId,
        roleSku: row.roleSku,
        employmentTypeCode: costResult.entry.employmentTypeCode,
        effectiveFrom: costResult.entry.effectiveFrom,
        totalMonthlyCostUsd: costResult.entry.totalMonthlyCostUsd ?? row.totalMonthlyCostUsd,
        hourlyCostUsd: costResult.entry.hourlyCostUsd ?? row.hourlyCostUsd
      })
    }

    const pricingResults = await insertPricingRowsIfChanged(roleResult.roleId, row.pricingRows, args.effectiveFrom)

    for (const pricingResult of pricingResults) {
      if (!pricingResult.changed) continue

      await publishSellableRolePricingUpdated({
        roleId: roleResult.roleId,
        roleSku: row.roleSku,
        currencyCode: pricingResult.entry.currencyCode,
        effectiveFrom: pricingResult.entry.effectiveFrom,
        hourlyPrice: pricingResult.entry.hourlyPrice,
        fteMonthlyPrice: pricingResult.entry.fteMonthlyPrice,
        marginPct: pricingResult.entry.marginPct
      })
    }
  }

  await syncSellableRoleSkuSequence()

  console.log(JSON.stringify(artifact, null, 2))

  if (args.outputPath) {
    await writeArtifact(args.outputPath, artifact)
  }
}

main()
  .catch(error => {
    console.error('[seed-sellable-roles] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
