import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { validateCatalog, searchCatalog } from '../../src/lib/finance/pricing-v3/catalog/catalog'
import { resolveBrief } from '../../src/lib/finance/pricing-v3/catalog/resolve'
import { briefSchema } from '../../src/lib/finance/pricing-v3/catalog/contracts'
import { QUOTE_VERSION } from '../../src/lib/finance/pricing-v3/catalog/quote'
import { projectCatalogQuote, catalogQuoteMarkdown } from '../../src/lib/finance/pricing-v3/catalog/client'
import {
  allocateResourcePortfolio,
  inspectOperatingResources,
  prepareOperatingPlan,
  scaffoldResourceDemand
} from '../../src/lib/finance/pricing-v3/resources/operating'
import {
  assessCompositionReadiness,
  compositionPreviewMarkdown,
  projectCompositionPreview
} from '../../src/lib/finance/pricing-v3/resources/readiness'
import { planCreditBudget, creditCatalogSchema } from '../../src/lib/finance/pricing-v3/resources/credit-budget'
import { compositionPolicySchema } from '../../src/lib/finance/pricing-v3/resources/composition-contracts'
import {
  previewResourceChange,
  applyResourceChange
} from '../../src/lib/finance/pricing-v3/adapters/resource-maintenance'
import {
  COMPOSITION_VERSION,
  runResourceComposition,
  replayResourceComposition,
  explainResourceComposition
} from '../../src/lib/finance/pricing-v3/adapters/resource-composition'
import {
  catalogDigest,
  compareCatalogQuotes,
  runCatalogQuote,
  replayCatalogQuote,
  explainCatalogQuote,
  previewCatalogChange,
  applyCatalogChange
} from '../../src/lib/finance/pricing-v3/adapters/catalog-local'

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
      catalog: { type: 'string' },
      policy: { type: 'string' },
      credits: { type: 'string' },
      kind: { type: 'string' },
      date: { type: 'string' },
      impact: { type: 'string' },
      confirm: { type: 'string' },
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
    catalog: ['catalog', 'query', 'kind', 'date', 'input', 'impact', 'confirm', 'out', 'help'],
    prepare: ['catalog', 'input', 'out', 'help'],
    quote: ['catalog', 'input', 'out', 'help'],
    resources: ['catalog', 'policy', 'credits', 'date', 'query', 'input', 'out', 'impact', 'confirm', 'help'],
    compose: ['catalog', 'policy', 'credits', 'input', 'out', 'format', 'help'],
    help: ['help']
  }

  if (command && permitted[command] && Object.keys(values).some(key => !permitted[command].includes(key)))
    throw new Error('INVALID_ARGUMENT')

  const catalogPath =
    values.catalog ?? fileURLToPath(new URL('../../data/pricing/v3-catalog/catalog.review-v1.json', import.meta.url))

  const writeNew = (path: string, value: unknown) => writeFileSync(path, json(value), { flag: 'wx', mode: 0o600 })

  const impacts = () => {
    if (!values.impact) return []
    const list = read(values.impact)

    if (!Array.isArray(list) || list.length > 100) throw new Error('INVALID_ARGUMENT')

    return list
  }

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
          prepare: '--input brief.json [--catalog catalog.json] [--out selection.json]',
          quote: '--input brief.json [--catalog catalog.json] [--out quote.artifact.json]',
          resources:
            'budget --input request.json --catalog credits.json | inspect --policy policy.json --date YYYY-MM-DD [--query text] | portfolio --input portfolio.json --policy policy.json [--date YYYY-MM-DD] | preview|apply --input change.json --policy policy.json --credits credits.json [--impact demands.json]; apply --confirm previewDigest --out new-version.json',
          compose:
            'scaffold --input brief.json --policy policy.json | plan --input plan.json --policy policy.json --credits credits.json [--out demand.json] | prepare|quote --input demand.json --policy policy.json --credits credits.json [--out artifact.json] | assess|preview --input artifact.json [--format json|markdown] [--out preview.json|md]',
          catalog:
            'search|show|validate|preview|apply [--catalog file] [--query text] [--kind kind] [--date YYYY-MM-DD]; preview/apply --input change.json [--impact briefs.json]; apply --confirm previewDigest --out new-version.json'
        },
        limits: [
          'Local prototype. No DB/API/CRM write.',
          'Catalog resolver supplies explicitly versioned records; simulation never approves operational prices.',
          'Pilot catalog is review_only.'
        ]
      })
    )
  } else if (command === 'compose') {
    if (!['prepare', 'quote', 'scaffold', 'plan', 'assess', 'preview'].includes(subcommand) || positionals.length !== 2)
      throw new Error('INVALID_ARGUMENT')

    const allowed = ['assess', 'preview'].includes(subcommand)
      ? ['input', 'out', 'format', 'help']
      : subcommand === 'scaffold'
        ? ['catalog', 'policy', 'input', 'out', 'help']
        : ['catalog', 'policy', 'credits', 'input', 'out', 'help']

    if (Object.keys(values).some(key => !allowed.includes(key))) throw new Error('INVALID_ARGUMENT')

    if (subcommand === 'scaffold') {
      const result = scaffoldResourceDemand(
        read(catalogPath),
        read(required(values.policy)),
        read(required(values.input))
      )

      if (values.out) writeNew(values.out, result.demand)
      process.stdout.write(json(result))
      process.exitCode = 2
    } else if (subcommand === 'plan') {
      const result = prepareOperatingPlan(
        read(catalogPath),
        read(required(values.policy)),
        read(required(values.credits)),
        read(required(values.input))
      )

      if (values.out) {
        if (!result.demand) throw new Error('PLAN_REQUIRES_VALID_ALLOCATION')
        writeNew(values.out, result.demand)
      }

      process.stdout.write(json(result))
      process.exitCode = result.status === 'calculated' ? 3 : 2
    } else if (subcommand === 'assess' || subcommand === 'preview') {
      const artifact = replayResourceComposition(read(required(values.input)))

      const result =
        subcommand === 'assess'
          ? assessCompositionReadiness(artifact.semantic.result)
          : projectCompositionPreview(artifact.semantic.result)

      const format = values.format ?? 'json'

      if (!['json', 'markdown'].includes(format) || (subcommand === 'assess' && format !== 'json'))
        throw new Error('INVALID_FORMAT')
      const output = format === 'markdown' ? compositionPreviewMarkdown(artifact.semantic.result) : json(result)

      if (values.out) writeFileSync(values.out, output, { flag: 'wx', mode: 0o600 })
      process.stdout.write(output)
      process.exitCode = 3
    } else {
      const artifact = runResourceComposition(
        read(catalogPath),
        read(required(values.policy)),
        read(required(values.credits)),
        read(required(values.input))
      )

      const result = artifact.semantic.result

      if (values.out) writeNew(values.out, artifact)
      process.stdout.write(
        json(
          subcommand === 'prepare'
            ? {
                calculationId: artifact.calculationId,
                selections: result.selections,
                attributions: result.attributions,
                creditBudgets: result.creditBudgets,
                diagnostics: result.quote.diagnostics,
                assumptions: result.quote.resolution.assumptions,
                calculationStatus: result.quote.calculationStatus,
                binding: false
              }
            : { calculationId: artifact.calculationId, replayDigest: artifact.replayDigest, ...result }
        )
      )
      process.exitCode = result.quote.calculationStatus === 'calculated' ? 3 : 2
    }
  } else if (command === 'resources') {
    if (positionals.length !== 2) throw new Error('INVALID_ARGUMENT')

    const allowed: Record<string, string[]> = {
      inspect: ['catalog', 'policy', 'credits', 'date', 'query', 'out', 'help'],
      portfolio: ['catalog', 'policy', 'date', 'input', 'out', 'help'],
      budget: ['catalog', 'input', 'out', 'help'],
      preview: ['catalog', 'policy', 'credits', 'input', 'impact', 'out', 'help'],
      apply: ['catalog', 'policy', 'credits', 'input', 'impact', 'confirm', 'out', 'help']
    }

    if (!allowed[subcommand] || Object.keys(values).some(key => !allowed[subcommand].includes(key)))
      throw new Error('INVALID_ARGUMENT')

    if (subcommand === 'preview' || subcommand === 'apply') {
      const args = [
        read(catalogPath),
        read(required(values.policy)),
        read(required(values.credits)),
        read(required(values.input))
      ] as const

      const result =
        subcommand === 'preview'
          ? previewResourceChange(...args, impacts())
          : applyResourceChange(...args, required(values.confirm), impacts())

      if (subcommand === 'apply') writeNew(required(values.out), result.successor)
      else if (values.out) writeNew(values.out, result)
      process.stdout.write(json(result))
    } else if (subcommand === 'inspect') {
      const policy = compositionPolicySchema.parse(read(required(values.policy)))
      const discovery = inspectOperatingResources(read(catalogPath), policy, required(values.date), values.query)

      const result = {
        ...discovery,
        policyDigest: catalogDigest(policy),
        ...(values.credits
          ? { creditCatalogDigest: catalogDigest(creditCatalogSchema.parse(read(values.credits))) }
          : {})
      }

      if (values.out) writeNew(values.out, result)
      process.stdout.write(json(result))
    } else if (subcommand === 'portfolio') {
      const result = allocateResourcePortfolio(
        read(required(values.input)),
        read(required(values.policy)),
        read(catalogPath),
        values.date
      )

      if (values.out) writeNew(values.out, result)
      process.stdout.write(json(result))
      process.exitCode = result.status === 'prepared' ? 3 : 2
    } else {
      if (subcommand !== 'budget') throw new Error('INVALID_ARGUMENT')
      const result = planCreditBudget(read(required(values.catalog)), read(required(values.input)))

      if (values.out) writeNew(values.out, result)
      process.stdout.write(json(result))
      process.exitCode = result.calculationStatus === 'calculated' ? 3 : 2
    }
  } else if (command === 'catalog') {
    if (!['search', 'show', 'validate', 'preview', 'apply'].includes(subcommand) || positionals.length !== 2)
      throw new Error('INVALID_ARGUMENT')

    const permittedSub: Record<string, string[]> = {
      search: ['catalog', 'query', 'kind', 'date', 'help'],
      show: ['catalog', 'query', 'kind', 'date', 'help'],
      validate: ['catalog', 'help'],
      preview: ['catalog', 'input', 'impact', 'help'],
      apply: ['catalog', 'input', 'impact', 'confirm', 'out', 'help']
    }

    if (Object.keys(values).some(key => !permittedSub[subcommand].includes(key))) throw new Error('INVALID_ARGUMENT')
    const catalog = validateCatalog(read(catalogPath))

    if (subcommand === 'validate')
      process.stdout.write(
        json({
          valid: true,
          digest: catalogDigest(catalog),
          version: catalog.version,
          records: catalog.records.length,
          mode: catalog.mode
        })
      )
    else if (subcommand === 'preview')
      process.stdout.write(json(previewCatalogChange(catalog, read(required(values.input)), impacts())))
    else if (subcommand === 'apply') {
      const next = applyCatalogChange(catalog, read(required(values.input)), required(values.confirm), impacts())

      writeNew(required(values.out), next)
      process.stdout.write(json({ updated: true, version: next.version, digest: catalogDigest(next), binding: false }))
    } else {
      if (values.date && !briefSchema.shape.quoteDate.safeParse(values.date).success)
        throw new Error('INVALID_ARGUMENT')
      if (subcommand === 'show') required(values.query)

      const kinds = [
        'profile',
        'cost',
        'resource',
        'kit',
        'allocation',
        'pricing',
        'talent_factor',
        'market_factor',
        'fx'
      ] as const

      if (values.kind && !kinds.includes(values.kind as (typeof kinds)[number])) throw new Error('INVALID_ARGUMENT')

      const rows = searchCatalog(
        catalog,
        subcommand === 'search' ? (values.query ?? '') : '',
        (values.kind ?? 'profile') as (typeof kinds)[number],
        values.date
      )

      const candidates =
        subcommand === 'search'
          ? rows
          : rows.filter(
              r =>
                r.recordId === required(values.query) ||
                ('profileId' in r.value && r.value.profileId === values.query) ||
                ('resourceId' in r.value && r.value.resourceId === values.query) ||
                ('kitId' in r.value && r.value.kitId === values.query)
            )

      process.stdout.write(
        json({
          binding: false,
          mode: catalog.mode,
          version: catalog.version,
          digest: catalogDigest(catalog),
          resolution: candidates.length === 1 ? 'candidate' : candidates.length ? 'ambiguous' : 'not_found',
          candidates
        })
      )
      if (!candidates.length) process.exitCode = 2
    }
  } else if (command === 'prepare' || command === 'quote') {
    if (positionals.length !== 1) throw new Error('INVALID_ARGUMENT')
    const catalog = validateCatalog(read(catalogPath))
    const brief = read(required(values.input))

    if (command === 'prepare') {
      const selection = resolveBrief(catalog, brief)

      if (values.out) writeNew(values.out, selection)
      process.stdout.write(json(selection))
      process.exitCode = selection.status === 'resolved' ? 0 : 2
    } else {
      const artifact = runCatalogQuote(catalog, brief)

      if (values.out) writeNew(values.out, artifact)
      const result = artifact.semantic.result

      process.stdout.write(
        json({
          calculationId: artifact.calculationId,
          replayDigest: artifact.replayDigest,
          calculationStatus: result.calculationStatus,
          reviewStatus: result.reviewStatus,
          totals: result.totals,
          diagnostics: result.diagnostics,
          assumptions: result.resolution.assumptions,
          periods: result.periods.map(p => ({
            periodId: p.periodId,
            totals: p.result.totals,
            diagnostics: p.result.diagnostics
          }))
        })
      )
      process.exitCode =
        result.calculationStatus !== 'calculated' ? 2 : result.reviewStatus === 'requires_review' ? 3 : 0
    }
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

    if (command === 'compare') {
      const left = read(required(values.left))
      const right = read(required(values.right))

      const catalogQuote = (value: unknown) =>
        (value as { artifactVersion?: string })?.artifactVersion === QUOTE_VERSION

      if (catalogQuote(left) !== catalogQuote(right)) throw new Error('INVALID_COMPARISON')
      process.stdout.write(json(catalogQuote(left) ? compareCatalogQuotes(left, right) : comparePricingV3(left, right)))
    } else {
      const raw = read(required(values.input))

      if ((raw as { artifactVersion?: string })?.artifactVersion === COMPOSITION_VERSION) {
        if (command === 'export') throw new Error('EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY')
        const artifact = replayResourceComposition(raw)

        process.stdout.write(
          json(
            command === 'replay'
              ? { verified: true, calculationId: artifact.calculationId, result: artifact.semantic.result }
              : explainResourceComposition(raw)
          )
        )
        process.exitCode = artifact.semantic.result.quote.calculationStatus === 'calculated' ? 3 : 2
      } else if ((raw as { artifactVersion?: string })?.artifactVersion === QUOTE_VERSION) {
        const frozen = replayCatalogQuote(raw)

        if (command === 'export') {
          if (values.format && !['json', 'markdown'].includes(values.format)) throw new Error('INVALID_ARGUMENT')
          const view = projectCatalogQuote(frozen.semantic.result, frozen.calculationId)

          writeFileSync(required(values.out), values.format === 'json' ? json(view) : catalogQuoteMarkdown(view), {
            flag: 'wx',
            mode: 0o600
          })
          process.stdout.write(
            json({
              exported: true,
              documentType: 'draft_estimate',
              binding: false,
              calculationId: frozen.calculationId
            })
          )
        } else {
          process.stdout.write(
            json(
              command === 'replay'
                ? { verified: true, calculationId: frozen.calculationId, result: frozen.semantic.result }
                : explainCatalogQuote(raw)
            )
          )
          process.exitCode =
            frozen.semantic.result.calculationStatus !== 'calculated'
              ? 2
              : frozen.semantic.result.reviewStatus === 'requires_review'
                ? 3
                : 0
        }
      } else {
        const artifact = replayPricingV3(raw)

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
    }
  } else throw new Error('UNKNOWN_COMMAND')
} catch (error) {
  const safeCodes = [
    'REPLAY_MISMATCH',
    'INVALID_COMPARISON',
    'CATALOG_BASE_CONFLICT',
    'CATALOG_PREVIEW_CONFLICT',
    'CATALOG_RECORD_CONFLICT',
    'CATALOG_VERSION_REQUIRED',
    'DUPLICATE_CHANGE',
    'UPDATED_SOURCE_REFERENCE_REQUIRED',
    'CATALOG_DIMENSION_CONFLICT',
    'INVALID_RETIREMENT',
    'RETIRED_CATALOG_RECORD',
    'CATALOG_IDENTITY_CONFLICT',
    'DUPLICATE_CATALOG_DIMENSION',
    'INVALID_CHANGE_RECORD',
    'EFFECTIVE_DATE_CONFLICT',
    'DUPLICATE_CATALOG_RECORD',
    'OVERLAPPING_CATALOG_RECORD',
    'DUPLICATE_KIT_REQUIREMENT',
    'DUPLICATE_COST_COVERAGE',
    'CHANGE_ALREADY_APPLIED',
    'EXPORT_SELECTION_QUOTE_NOT_SUPPORTED',
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
