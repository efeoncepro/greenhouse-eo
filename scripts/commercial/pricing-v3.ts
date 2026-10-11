import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { ZodError } from 'zod'

import { validateCatalog, searchCatalog, valuesEffectiveAfter } from '../../src/lib/finance/pricing-v3/catalog/catalog'
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
import { summarizeComposition } from '../../src/lib/finance/pricing-v3/resources/summary'
import { applyWorkloadToBrief, dimensionWorkload } from '../../src/lib/finance/pricing-v3/resources/workload'
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

import {
  PRICING_V3_UNCLASSIFIED_ERROR_CODE,
  PricingV3Error,
  isPricingV3Error
} from '../../src/lib/finance/pricing-v3/errors'

import type { calculatePricingV3 } from '../../src/lib/finance/pricing-v3'
import { pricingV3ClientMarkdown, projectPricingV3ForClient } from '../../src/lib/finance/pricing-v3'
import {
  comparePricingV3,
  explainPricingV3,
  replayPricingV3,
  runPricingV3
} from '../../src/lib/finance/pricing-v3/adapters/local-snapshot'

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

const options = {
  input: { type: 'string' },
  out: { type: 'string' },
  left: { type: 'string' },
  right: { type: 'string' },
  format: { type: 'string' },
  query: { type: 'string' },
  catalog: { type: 'string' },
  policy: { type: 'string' },
  credits: { type: 'string' },
  brief: { type: 'string' },
  kind: { type: 'string' },
  date: { type: 'string' },
  impact: { type: 'string' },
  confirm: { type: 'string' },
  help: { type: 'boolean' }
} as const

type ValueOption = Exclude<keyof typeof options, 'help'>

// An unknown flag is echoed only when it reads as a flag name, so a mistyped value cannot ride out as a "name".
const named = (option: string) => (/^[a-z][a-z-]{0,31}$/i.test(option) ? { option } : {})

const parseCli = () => {
  // Non-strict on purpose: an unknown flag arrives as a token we can name, not as Node prose we would have to parse.
  const { positionals, tokens } = parseArgs({ allowPositionals: true, strict: false, tokens: true, options })
  const values: Partial<Record<ValueOption, string>> & { help?: boolean } = {}

  for (const token of tokens) {
    if (token.kind !== 'option') continue
    if (!Object.keys(options).includes(token.name)) throw new PricingV3Error('UNKNOWN_OPTION', named(token.name))
    const option = token.name as keyof typeof options

    if (option === 'help') {
      if (token.value !== undefined) throw new PricingV3Error('INVALID_ARGUMENT', { option })
      values.help = true
    } else {
      // Strict mode refused a value shaped like the next flag; without this, `--input --out x` would read "--out".
      if (token.value === undefined || (!token.inlineValue && token.value.startsWith('-')))
        throw new PricingV3Error('MISSING_ARGUMENT', { option })
      values[option] = token.value
    }
  }

  return { positionals, values }
}

// Only the option name leaves here: a path or a parser message could quote what the caller keeps private.
const readJson = (option: ValueOption, path: string): unknown => {
  let text: string

  try {
    text = readFileSync(path, 'utf8')
  } catch {
    throw new PricingV3Error('INPUT_NOT_FOUND', { option })
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new PricingV3Error('INPUT_NOT_JSON', { option })
  }
}

// The one writer for JSON and text alike: exclusive and private, so nothing this tool freezes is ever overwritten.
const writeNew = (path: string, body: string) => {
  try {
    writeFileSync(path, body, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    // Either way the caller fixes `--out`; the system reason (missing folder, permissions) is not echoed.
    const exists = (error as NodeJS.ErrnoException).code === 'EEXIST'

    throw new PricingV3Error(exists ? 'OUTPUT_EXISTS' : 'OUTPUT_NOT_WRITABLE', { option: 'out' })
  }
}

const ISSUE_LIMIT = 20

/**
 * Derived, never listed: a registered rejection reports its own code. A schema failure contributes path and rule
 * only, because the validator's message can quote the received value. Anything else stays unclassified.
 */
const classify = (error: unknown) =>
  isPricingV3Error(error)
    ? error
    : error instanceof ZodError
      ? new PricingV3Error('SCHEMA_INVALID', {
          issues: error.issues.slice(0, ISSUE_LIMIT).map(issue => ({ path: issue.path.join('.'), rule: issue.code }))
        })
      : undefined

const exitFor = (result: ReturnType<typeof calculatePricingV3>) =>
  result.calculationStatus !== 'calculated' ? 2 : result.reviewStatus === 'requires_review' ? 3 : 0

try {
  const { positionals, values } = parseCli()

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
    compose: ['catalog', 'policy', 'credits', 'input', 'out', 'format', 'brief', 'help'],
    help: ['help']
  }

  // Names the first flag the (sub)command does not take, so the caller can drop exactly that one.
  const permit = (allowed: readonly string[]) => {
    const option = Object.keys(values).find(key => !allowed.includes(key))

    if (option) throw new PricingV3Error('INVALID_ARGUMENT', { option })
  }

  const required = (option: ValueOption) => {
    const value = values[option]

    if (!value) throw new PricingV3Error('MISSING_ARGUMENT', { option })

    return value
  }

  if (command && permitted[command]) permit(permitted[command])

  const catalogPath =
    values.catalog ?? fileURLToPath(new URL('../../data/pricing/v3-catalog/catalog.review-v1.json', import.meta.url))

  const load = (option: ValueOption) => readJson(option, required(option))
  const loadCatalog = () => readJson('catalog', catalogPath)

  const impacts = () => {
    if (!values.impact) return []
    const list = readJson('impact', values.impact)

    if (!Array.isArray(list) || list.length > 100) throw new PricingV3Error('INVALID_ARGUMENT', { option: 'impact' })

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
            'workload --input workload.json [--brief brief.json --out dimensioned-brief.json] | scaffold --input brief.json --policy policy.json | plan --input plan.json --policy policy.json --credits credits.json [--out demand.json] | prepare|quote --input demand.json --policy policy.json --credits credits.json [--out artifact.json] | assess|preview --input artifact.json [--format json|markdown] [--out preview.json|md]',
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
    if (
      !['prepare', 'quote', 'scaffold', 'plan', 'assess', 'preview', 'workload'].includes(subcommand) ||
      positionals.length !== 2
    )
      throw new PricingV3Error('INVALID_ARGUMENT')

    const allowed = ['assess', 'preview'].includes(subcommand)
      ? ['input', 'out', 'format', 'help']
      : subcommand === 'workload'
        ? ['input', 'brief', 'out', 'help']
        : subcommand === 'scaffold'
          ? ['catalog', 'policy', 'input', 'out', 'help']
          : ['catalog', 'policy', 'credits', 'input', 'out', 'help']

    permit(allowed)

    if (subcommand === 'workload') {
      // Volume → dedication. With --brief it writes a new dimensioned brief; it never edits the one it read.
      if (values.out && !values.brief) throw new PricingV3Error('INVALID_ARGUMENT', { option: 'out' })

      const result = values.brief
        ? applyWorkloadToBrief(readJson('brief', values.brief), load('input'))
        : dimensionWorkload(load('input'))

      if (values.out) {
        if (!('brief' in result) || !result.brief) throw new PricingV3Error('WORKLOAD_REQUIRES_VALID_DIMENSIONING')
        writeNew(values.out, json(result.brief))
      }

      process.stdout.write(json(result))
      process.exitCode = result.status === 'prepared' ? 0 : 2
    } else if (subcommand === 'scaffold') {
      const result = scaffoldResourceDemand(loadCatalog(), load('policy'), load('input'))

      if (values.out) writeNew(values.out, json(result.demand))
      process.stdout.write(json(result))
      process.exitCode = 2
    } else if (subcommand === 'plan') {
      const result = prepareOperatingPlan(loadCatalog(), load('policy'), load('credits'), load('input'))

      if (values.out) {
        if (!result.demand) throw new PricingV3Error('PLAN_REQUIRES_VALID_ALLOCATION')
        writeNew(values.out, json(result.demand))
      }

      process.stdout.write(json(result))
      process.exitCode = result.status === 'calculated' ? 3 : 2
    } else if (subcommand === 'assess' || subcommand === 'preview') {
      const artifact = replayResourceComposition(load('input'))

      const result =
        subcommand === 'assess'
          ? assessCompositionReadiness(artifact.semantic.result)
          : projectCompositionPreview(artifact.semantic.result)

      const format = values.format ?? 'json'

      if (!['json', 'markdown'].includes(format) || (subcommand === 'assess' && format !== 'json'))
        throw new PricingV3Error('INVALID_FORMAT', { option: 'format' })
      const output = format === 'markdown' ? compositionPreviewMarkdown(artifact.semantic.result) : json(result)

      if (values.out) writeNew(values.out, output)
      process.stdout.write(output)
      process.exitCode = 3
    } else {
      const artifact = runResourceComposition(loadCatalog(), load('policy'), load('credits'), load('input'))

      const result = artifact.semantic.result

      if (values.out) writeNew(values.out, json(artifact))

      // A demand that kept an old date quotes with the values of that date and nothing fails. The catalog is in hand
      // here, so say it; this notice is about the run, not part of the frozen result.
      const laterCatalogValues = valuesEffectiveAfter(
        artifact.semantic.catalog,
        artifact.semantic.demand.brief.quoteDate
      )

      // Both print the same derived summary; the complete result lives only in the artifact written by --out.
      // `quote` is the one that freezes, so only it reports the digest a later replay must reproduce.
      process.stdout.write(
        json({
          ...summarizeComposition(result, {
            calculationId: artifact.calculationId,
            ...(subcommand === 'quote' ? { replayDigest: artifact.replayDigest } : {})
          }),
          ...(laterCatalogValues ? { laterCatalogValues } : {})
        })
      )
      process.exitCode = result.quote.calculationStatus === 'calculated' ? 3 : 2
    }
  } else if (command === 'resources') {
    if (positionals.length !== 2) throw new PricingV3Error('INVALID_ARGUMENT')

    const allowed: Record<string, string[]> = {
      inspect: ['catalog', 'policy', 'credits', 'date', 'query', 'out', 'help'],
      portfolio: ['catalog', 'policy', 'date', 'input', 'out', 'help'],
      budget: ['catalog', 'input', 'out', 'help'],
      preview: ['catalog', 'policy', 'credits', 'input', 'impact', 'out', 'help'],
      apply: ['catalog', 'policy', 'credits', 'input', 'impact', 'confirm', 'out', 'help']
    }

    if (!allowed[subcommand]) throw new PricingV3Error('INVALID_ARGUMENT')
    permit(allowed[subcommand])

    if (subcommand === 'preview' || subcommand === 'apply') {
      const args = [loadCatalog(), load('policy'), load('credits'), load('input')] as const

      const result =
        subcommand === 'preview'
          ? previewResourceChange(...args, impacts())
          : applyResourceChange(...args, required('confirm'), impacts())

      if (subcommand === 'apply') writeNew(required('out'), json(result.successor))
      else if (values.out) writeNew(values.out, json(result))
      process.stdout.write(json(result))
    } else if (subcommand === 'inspect') {
      const policy = compositionPolicySchema.parse(load('policy'))
      const discovery = inspectOperatingResources(loadCatalog(), policy, required('date'), values.query)

      const result = {
        ...discovery,
        policyDigest: catalogDigest(policy),
        ...(values.credits
          ? { creditCatalogDigest: catalogDigest(creditCatalogSchema.parse(readJson('credits', values.credits))) }
          : {})
      }

      if (values.out) writeNew(values.out, json(result))
      process.stdout.write(json(result))
    } else if (subcommand === 'portfolio') {
      const result = allocateResourcePortfolio(load('input'), load('policy'), loadCatalog(), values.date)

      if (values.out) writeNew(values.out, json(result))
      process.stdout.write(json(result))
      process.exitCode = result.status === 'prepared' ? 3 : 2
    } else {
      if (subcommand !== 'budget') throw new PricingV3Error('INVALID_ARGUMENT')
      const result = planCreditBudget(load('catalog'), load('input'))

      if (values.out) writeNew(values.out, json(result))
      process.stdout.write(json(result))
      process.exitCode = result.calculationStatus === 'calculated' ? 3 : 2
    }
  } else if (command === 'catalog') {
    if (!['search', 'show', 'validate', 'preview', 'apply'].includes(subcommand) || positionals.length !== 2)
      throw new PricingV3Error('INVALID_ARGUMENT')

    const permittedSub: Record<string, string[]> = {
      search: ['catalog', 'query', 'kind', 'date', 'help'],
      show: ['catalog', 'query', 'kind', 'date', 'help'],
      validate: ['catalog', 'help'],
      preview: ['catalog', 'input', 'impact', 'help'],
      apply: ['catalog', 'input', 'impact', 'confirm', 'out', 'help']
    }

    permit(permittedSub[subcommand])
    const catalog = validateCatalog(loadCatalog())

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
      process.stdout.write(json(previewCatalogChange(catalog, load('input'), impacts())))
    else if (subcommand === 'apply') {
      const next = applyCatalogChange(catalog, load('input'), required('confirm'), impacts())

      writeNew(required('out'), json(next))
      process.stdout.write(json({ updated: true, version: next.version, digest: catalogDigest(next), binding: false }))
    } else {
      if (values.date && !briefSchema.shape.quoteDate.safeParse(values.date).success)
        throw new PricingV3Error('INVALID_ARGUMENT', { option: 'date' })
      if (subcommand === 'show') required('query')

      const kinds = [
        'profile',
        'cost',
        'resource',
        'kit',
        'allocation',
        'pricing',
        'talent_factor',
        'market_factor',
        'fx',
        'price_rounding'
      ] as const

      if (values.kind && !kinds.includes(values.kind as (typeof kinds)[number]))
        throw new PricingV3Error('INVALID_ARGUMENT', { option: 'kind' })

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
                r.recordId === required('query') ||
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
    if (positionals.length !== 1) throw new PricingV3Error('INVALID_ARGUMENT')
    const catalog = validateCatalog(loadCatalog())
    const brief = load('input')

    if (command === 'prepare') {
      const selection = resolveBrief(catalog, brief)

      if (values.out) writeNew(values.out, json(selection))
      process.stdout.write(json(selection))
      process.exitCode = selection.status === 'resolved' ? 0 : 2
    } else {
      const artifact = runCatalogQuote(catalog, brief)

      if (values.out) writeNew(values.out, json(artifact))
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
    if (positionals.length !== 1) throw new PricingV3Error('INVALID_ARGUMENT')
    const input = load('input')
    const { result, artifact } = runPricingV3(input)

    if (values.out && command === 'calculate') {
      if (artifact) writeNew(values.out, json(artifact))
    }

    process.stdout.write(
      json({ result, calculationId: artifact?.calculationId ?? null, replayDigest: artifact?.replayDigest ?? null })
    )
    process.exitCode = exitFor(result)
  } else if (['explain', 'replay', 'compare', 'export'].includes(command)) {
    if (positionals.length !== 1) throw new PricingV3Error('INVALID_ARGUMENT')

    if (command === 'compare') {
      const left = load('left')
      const right = load('right')

      const catalogQuote = (value: unknown) =>
        (value as { artifactVersion?: string })?.artifactVersion === QUOTE_VERSION

      if (catalogQuote(left) !== catalogQuote(right)) throw new PricingV3Error('INVALID_COMPARISON')
      process.stdout.write(json(catalogQuote(left) ? compareCatalogQuotes(left, right) : comparePricingV3(left, right)))
    } else {
      const raw = load('input')

      if ((raw as { artifactVersion?: string })?.artifactVersion === COMPOSITION_VERSION) {
        if (command === 'export') throw new PricingV3Error('EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY')
        const artifact = replayResourceComposition(raw)

        process.stdout.write(
          json(
            command === 'replay'
              ? {
                  verified: true,
                  calculationId: artifact.calculationId,
                  // The verified detail is the file the caller already holds; replay answers with its summary.
                  summary: summarizeComposition(artifact.semantic.result, artifact)
                }
              : explainResourceComposition(raw)
          )
        )
        process.exitCode = artifact.semantic.result.quote.calculationStatus === 'calculated' ? 3 : 2
      } else if ((raw as { artifactVersion?: string })?.artifactVersion === QUOTE_VERSION) {
        const frozen = replayCatalogQuote(raw)

        if (command === 'export') {
          if (values.format && !['json', 'markdown'].includes(values.format))
            throw new PricingV3Error('INVALID_ARGUMENT', { option: 'format' })
          const view = projectCatalogQuote(frozen.semantic.result, frozen.calculationId)

          writeNew(required('out'), values.format === 'json' ? json(view) : catalogQuoteMarkdown(view))
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
          if (values.format && !['json', 'markdown'].includes(values.format))
            throw new PricingV3Error('INVALID_ARGUMENT', { option: 'format' })
          const view = projectPricingV3ForClient(artifact)
          const body = values.format === 'json' ? json(view) : pricingV3ClientMarkdown(view)

          writeNew(required('out'), body)
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
  } else throw new PricingV3Error('UNKNOWN_COMMAND')
} catch (error) {
  const failure = classify(error)
  const { option, issues } = failure?.detail ?? {}

  process.stderr.write(
    json({
      error: {
        code: failure?.code ?? PRICING_V3_UNCLASSIFIED_ERROR_CODE,
        // Static by contract: nothing an exception says is ever copied into the report.
        message: 'Operation failed. `code` names the cause; `option` and `issues`, when present, name where to fix it.',
        ...(option ? { option } : {}),
        ...(issues ? { issues } : {})
      },
      binding: false
    })
  )
  process.exitCode = 1
}
