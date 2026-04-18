import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { closeGreenhousePostgres } from '@/lib/db'
import { loadToolCatalogSeedFile, normalizeToolCatalogCsv } from '@/lib/commercial/tool-catalog-seed'
import { syncToolCatalogSkuSequence, upsertToolCatalogEntry } from '@/lib/commercial/tool-catalog-store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv, type PostgresProfile } from './lib/load-greenhouse-tool-env'

interface SeedSummary {
  inserted: number
  updated: number
  unchanged: number
  skipped_placeholder: number
  skipped_empty: number
  rejected: number
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

  const csv = await loadToolCatalogSeedFile()
  const parsed = normalizeToolCatalogCsv(csv)

  const summary: SeedSummary = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped_placeholder: parsed.summary.skippedPlaceholder,
    skipped_empty: parsed.summary.skippedEmpty,
    rejected: parsed.summary.rejected
  }

  const artifact = {
    applied: args.apply,
    summary,
    parseSummary: parsed.summary,
    rejectedRows: parsed.rejectedRows,
    warnings: parsed.rows
      .filter(row => row.warnings.length > 0)
      .map(row => ({
        rowNumber: row.rowNumber,
        toolSku: row.toolSku,
        toolName: row.toolName,
        warnings: row.warnings
      }))
  }

  if (!args.apply) {
    console.log(JSON.stringify(artifact, null, 2))

    if (args.outputPath) {
      await writeArtifact(args.outputPath, artifact)
    }

    return
  }

  for (const row of parsed.rows) {
    const result = await upsertToolCatalogEntry(row)

    if (result.created) {
      summary.inserted += 1
    } else if (result.changed) {
      summary.updated += 1
    } else {
      summary.unchanged += 1
    }
  }

  await syncToolCatalogSkuSequence()

  console.log(JSON.stringify(artifact, null, 2))

  if (args.outputPath) {
    await writeArtifact(args.outputPath, artifact)
  }
}

main()
  .catch(error => {
    console.error('[seed-tool-catalog] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
