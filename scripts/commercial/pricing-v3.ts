import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import type { calculatePricingV3 } from '../../src/lib/finance/pricing-v3'
import { pricingV3ClientMarkdown, projectPricingV3ForClient } from '../../src/lib/finance/pricing-v3'
import {
  comparePricingV3,
  explainPricingV3,
  replayPricingV3,
  runPricingV3
} from '../../src/lib/finance/pricing-v3/adapters/local-snapshot'

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as unknown

const required = (value: string | undefined) => {
  if (!value) throw new Error('MISSING_ARGUMENT')

  return value
}

const exitFor = (result: ReturnType<typeof calculatePricingV3>) =>
  result.calculationStatus !== 'calculated' ? 2 : result.reviewStatus === 'requires_review' ? 3 : 0

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      input: { type: 'string' },
      out: { type: 'string' },
      left: { type: 'string' },
      right: { type: 'string' },
      format: { type: 'string' },
      query: { type: 'string' },
      help: { type: 'boolean' }
    }
  })

  const [command, subcommand] = positionals

  const permitted: Record<string, string[]> = {
    calculate: ['input', 'out', 'help'],
    validate: ['input', 'help'],
    explain: ['input', 'help'],
    replay: ['input', 'help'],
    compare: ['left', 'right', 'help'],
    export: ['input', 'out', 'format', 'help'],
    catalog: ['query', 'help'],
    help: ['help']
  }

  if (command && permitted[command] && Object.keys(values).some(key => !permitted[command].includes(key)))
    throw new Error('INVALID_ARGUMENT')

  if (values.help || !command || command === 'help') {
    process.stdout.write(
      json({
        tool: 'pricing-v3-local',
        binding: false,
        operations: {
          calculate: '--input request-and-snapshot.json [--out frozen-artifact.json]',
          validate: '--input request-and-snapshot.json',
          explain: '--input frozen-artifact.json',
          replay: '--input frozen-artifact.json',
          compare: '--left artifact.json --right artifact.json',
          export: '--input frozen-artifact.json --out draft.md [--format markdown|json]',
          catalog: 'search [--query text] | show --query exact-profile-id'
        },
        limits: [
          'Local prototype. No DB/API/CRM write.',
          'All operational costs and policies must be supplied explicitly.',
          'Pilot catalog is review_only.'
        ]
      })
    )
  } else if (command === 'catalog') {
    if (!['search', 'show'].includes(subcommand) || positionals.length !== 2) throw new Error('INVALID_ARGUMENT')

    const catalog = read(fileURLToPath(new URL('../../data/pricing/v3-pilot/parameters.json', import.meta.url))) as {
      profiles: { profileId: string; name?: string; [key: string]: unknown }[]
    }

    const query = (values.query ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

    const candidates = catalog.profiles.filter(profile =>
      subcommand === 'show'
        ? profile.profileId === values.query
        : JSON.stringify(profile)
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .includes(query)
    )

    process.stdout.write(
      json({
        runtimeUse: 'review_only',
        binding: false,
        resolution: candidates.length === 1 ? 'candidate' : candidates.length ? 'ambiguous' : 'not_found',
        candidates
      })
    )
    if (!candidates.length || (subcommand === 'show' && candidates.length !== 1)) process.exitCode = 2
  } else if (command === 'calculate' || command === 'validate') {
    if (positionals.length !== 1) throw new Error('INVALID_ARGUMENT')
    const input = read(required(values.input))
    const { result, artifact } = runPricingV3(input)

    if (values.out && command === 'calculate') {
      if (artifact) writeFileSync(values.out, json(artifact), { flag: 'wx', mode: 0o600 })
    }

    process.stdout.write(
      json({ result, calculationId: artifact?.calculationId ?? null, replayDigest: artifact?.replayDigest ?? null })
    )
    process.exitCode = exitFor(result)
  } else if (['explain', 'replay', 'compare', 'export'].includes(command)) {
    if (positionals.length !== 1) throw new Error('INVALID_ARGUMENT')

    if (command === 'compare')
      process.stdout.write(json(comparePricingV3(read(required(values.left)), read(required(values.right)))))
    else {
      const artifact = replayPricingV3(read(required(values.input)))

      if (command === 'export') {
        if (values.format && !['json', 'markdown'].includes(values.format)) throw new Error('INVALID_ARGUMENT')
        const view = projectPricingV3ForClient(artifact)
        const body = values.format === 'json' ? json(view) : pricingV3ClientMarkdown(view)

        writeFileSync(required(values.out), body, { flag: 'wx', mode: 0o600 })
        process.stdout.write(
          json({
            documentType: 'draft_estimate',
            binding: false,
            calculationId: artifact.calculationId,
            exported: true
          })
        )
      } else {
        process.stdout.write(
          json(
            command === 'replay'
              ? { verified: true, calculationId: artifact.calculationId, result: artifact.semantic.result }
              : explainPricingV3(artifact)
          )
        )
        process.exitCode = exitFor(artifact.semantic.result)
      }
    }
  } else throw new Error('UNKNOWN_COMMAND')
} catch (error) {
  const safeCodes = [
    'REPLAY_MISMATCH',
    'EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY',
    'MISSING_ARGUMENT',
    'INVALID_ARGUMENT',
    'UNKNOWN_COMMAND',
    'INVALID_INPUT_NO_ARTIFACT'
  ]

  const code = error instanceof Error && safeCodes.includes(error.message) ? error.message : 'ADAPTER_FAILURE'

  process.stderr.write(
    json({
      error: {
        code,
        message: 'Operation failed. Check arguments, readable JSON, frozen version and output availability.'
      },
      binding: false
    })
  )
  process.exitCode = 1
}
