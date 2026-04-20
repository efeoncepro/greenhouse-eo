import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { closeGreenhousePostgres } from '@/lib/db'
import { listSellableRoles } from '@/lib/commercial/sellable-roles-store'
import {
  loadPricingGovernanceSeedFiles,
  normalizePricingGovernanceSeedData
} from '@/lib/commercial/pricing-governance-seed'
import {
  upsertCommercialModelMultiplier,
  upsertCountryPricingFactor,
  upsertFteHoursGuide,
  upsertRoleTierMargin,
  upsertServiceTierMargin
} from '@/lib/commercial/pricing-governance-store'
import {
  applyGreenhousePostgresProfile,
  loadGreenhouseToolEnv,
  type PostgresProfile
} from './lib/load-greenhouse-tool-env'

interface SeedSummary {
  inserted: number
  updated: number
  skipped_control_row: number
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

  const [seedFiles, catalogRoles] = await Promise.all([
    loadPricingGovernanceSeedFiles(),
    listSellableRoles({ activeOnly: false })
  ])

  const parsed = normalizePricingGovernanceSeedData(seedFiles, {
    catalogRoles: catalogRoles.map(role => ({
      roleLabelEs: role.roleLabelEs,
      tier: role.tier as '1' | '2' | '3' | '4'
    }))
  })

  const summary: SeedSummary = {
    inserted: 0,
    updated: 0,
    skipped_control_row: parsed.summary.skippedControlRows,
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
    needsReviewRows: parsed.needsReviewRows,
    driftRows: parsed.driftRows
  }

  if (!args.apply) {
    console.log(JSON.stringify(artifact, null, 2))

    if (args.outputPath) {
      await writeArtifact(args.outputPath, artifact)
    }

    return
  }

  for (const row of parsed.roleTierMargins) {
    const result = await upsertRoleTierMargin(row, args.effectiveFrom)

    if (result.action === 'inserted') summary.inserted += 1
    if (result.action === 'updated') summary.updated += 1
  }

  for (const row of parsed.serviceTierMargins) {
    const result = await upsertServiceTierMargin(row, args.effectiveFrom)

    if (result.action === 'inserted') summary.inserted += 1
    if (result.action === 'updated') summary.updated += 1
  }

  for (const row of parsed.commercialModelMultipliers) {
    const result = await upsertCommercialModelMultiplier(row, args.effectiveFrom)

    if (result.action === 'inserted') summary.inserted += 1
    if (result.action === 'updated') summary.updated += 1
  }

  for (const row of parsed.countryPricingFactors) {
    const result = await upsertCountryPricingFactor(row, args.effectiveFrom)

    if (result.action === 'inserted') summary.inserted += 1
    if (result.action === 'updated') summary.updated += 1
  }

  for (const row of parsed.fteHoursGuide) {
    const result = await upsertFteHoursGuide(row, args.effectiveFrom)

    if (result.action === 'inserted') summary.inserted += 1
    if (result.action === 'updated') summary.updated += 1
  }

  console.log(JSON.stringify(artifact, null, 2))

  if (args.outputPath) {
    await writeArtifact(args.outputPath, artifact)
  }
}

main()
  .catch(error => {
    console.error('[seed-pricing-governance] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
