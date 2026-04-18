import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { closeGreenhousePostgres } from '@/lib/db'
import { loadOverheadAddonsSeedFile, normalizeOverheadAddonsCsv } from '@/lib/commercial/overhead-addons-seed'
import { syncOverheadAddonSkuSequence, upsertOverheadAddonEntry } from '@/lib/commercial/overhead-addons-store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv, type PostgresProfile } from './lib/load-greenhouse-tool-env'

interface SeedSummary {
  inserted: number
  updated: number
  unchanged: number
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

  const csv = await loadOverheadAddonsSeedFile()
  const parsed = normalizeOverheadAddonsCsv(csv)

  const summary: SeedSummary = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    rejected: parsed.summary.rejected
  }

  const artifact = {
    applied: args.apply,
    summary,
    parseSummary: parsed.summary,
    rejectedRows: parsed.rejectedRows
  }

  if (!args.apply) {
    console.log(JSON.stringify(artifact, null, 2))

    if (args.outputPath) {
      await writeArtifact(args.outputPath, artifact)
    }

    return
  }

  for (const row of parsed.rows) {
    const result = await upsertOverheadAddonEntry(row)

    if (result.created) {
      summary.inserted += 1
    } else if (result.changed) {
      summary.updated += 1
    } else {
      summary.unchanged += 1
    }
  }

  await syncOverheadAddonSkuSequence()

  console.log(JSON.stringify(artifact, null, 2))

  if (args.outputPath) {
    await writeArtifact(args.outputPath, artifact)
  }
}

main()
  .catch(error => {
    console.error('[seed-overhead-addons] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
