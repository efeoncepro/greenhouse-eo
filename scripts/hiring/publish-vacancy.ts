import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { executeHiringVacancyPublicationCommand } from '@/lib/hiring/vacancy-publication-operator'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

type CliArgs = {
  file: string | null
  mode: 'dryRun' | 'execute' | 'publish'
  idempotencyKey: string | null
}

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = { file: null, mode: 'dryRun', idempotencyKey: null }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--file') {
      args.file = argv[index + 1] ?? null
      index += 1
      continue
    }

    if (arg === '--execute') {
      args.mode = 'execute'
      continue
    }

    if (arg === '--publish') {
      args.mode = 'publish'
      continue
    }

    if (arg === '--dry-run') {
      args.mode = 'dryRun'
      continue
    }

    if (arg === '--idempotency-key') {
      args.idempotencyKey = argv[index + 1] ?? null
      index += 1
      continue
    }
  }

  return args
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (!args.file) {
    throw new Error('Usage: pnpm hiring:publish-vacancy --file <brief.json> [--dry-run|--execute|--publish] [--idempotency-key <key>]')
  }

  const briefPath = resolve(process.cwd(), args.file)
  const raw = await readFile(briefPath, 'utf8')
  const brief = JSON.parse(raw) as Record<string, unknown>
  const mode = args.mode
  const idempotencyKey = args.idempotencyKey ?? (typeof brief.idempotencyKey === 'string' ? brief.idempotencyKey : null)
  const headers = new Headers()

  if (mode !== 'dryRun') {
    loadGreenhouseToolEnv()
    applyGreenhousePostgresProfile('ops')
  }

  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey)

  const request = new Request('http://localhost/api/hiring/vacancy-publications', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...brief, mode, idempotencyKey }),
  })

  const result = await executeHiringVacancyPublicationCommand({
    request,
    actorUserId: process.env.GREENHOUSE_OPERATOR_USER_ID ?? 'cli-hiring-operator',
    body: { ...brief, mode, idempotencyKey },
  })

  process.stdout.write(`${JSON.stringify(result.data, null, 2)}\n`)
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
