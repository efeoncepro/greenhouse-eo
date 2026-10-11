import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
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
import { quotePriceNotices } from '../../src/lib/finance/pricing-v3/resources/price-review'
import { splitQuotedPrice } from '../../src/lib/finance/pricing-v3/resources/price-split'
import { commitmentExposure } from '../../src/lib/finance/pricing-v3/resources/commitment-exposure'
import { presentPaymentSchedule, readEngagementCash } from '../../src/lib/finance/pricing-v3/resources/engagement-view'
import {
  composeQuoteDocument,
  scaffoldQuoteDocumentBrief
} from '../../src/lib/finance/pricing-v3/resources/quote-document'
import type {
  QuoteDocumentIncrement,
  QuoteDocumentOption
} from '../../src/lib/finance/pricing-v3/resources/quote-document'
import { readQuoteIncrement } from '../../src/lib/finance/pricing-v3/resources/quote-increment'
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
  CURRENT_SOURCE_ROLES,
  buildCurrentVersions,
  currentVersionsDigest,
  currentVersionsSchema,
  resolveCurrentSource,
  verifyCurrentVersions
} from '../../src/lib/finance/pricing-v3/adapters/current-versions'
import type { CurrentSourceRole, CurrentVersions } from '../../src/lib/finance/pricing-v3/adapters/current-versions'

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
  reason: { type: 'string' },
  tools: { type: 'string' },
  milestones: { type: 'string' },
  label: { type: 'string' },
  // The two flags that repeat, once per optional add-on of a quote document: `--option <key>=<artifact.json>` for
  // the frozen quote of the add-on alone and `--increment <key>=<artifact.json>` for the frozen quote of the service
  // with the add-on in it.
  option: { type: 'string', multiple: true },
  increment: { type: 'string', multiple: true },
  base: { type: 'string' },
  current: { type: 'boolean' },
  'keep-blocked': { type: 'boolean' },
  help: { type: 'boolean' }
} as const

const SWITCHES = ['current', 'keep-blocked', 'help'] as const

/** Flags that repeat. Both name an optional add-on of a quote document, so they share one list and one order. */
const REPEATABLE = ['option', 'increment'] as const

type Repeatable = (typeof REPEATABLE)[number]

const isRepeatable = (option: string): option is Repeatable => REPEATABLE.some(name => name === option)

type Switch = (typeof SWITCHES)[number]
type ValueOption = Exclude<keyof typeof options, Switch>

const isSwitch = (option: keyof typeof options): option is Switch => SWITCHES.some(name => name === option)

// An unknown flag is echoed only when it reads as a flag name, so a mistyped value cannot ride out as a "name".
const named = (option: string) => (/^[a-z][a-z-]{0,31}$/i.test(option) ? { option } : {})

const parseCli = () => {
  // Non-strict on purpose: an unknown flag arrives as a token we can name, not as Node prose we would have to parse.
  const { positionals, tokens } = parseArgs({ allowPositionals: true, strict: false, tokens: true, options })
  const values: Partial<Record<ValueOption, string>> & Partial<Record<Switch, boolean>> = {}
  // Every `--option` and `--increment`, in the order given. `values.option` and `values.increment` only say the
  // flag was used, like any other.
  const repeated: { flag: Repeatable; value: string }[] = []

  for (const token of tokens) {
    if (token.kind !== 'option') continue
    if (!Object.keys(options).includes(token.name)) throw new PricingV3Error('UNKNOWN_OPTION', named(token.name))
    const option = token.name as keyof typeof options

    if (isSwitch(option)) {
      if (token.value !== undefined) throw new PricingV3Error('INVALID_ARGUMENT', { option })
      values[option] = true
    } else {
      // Strict mode refused a value shaped like the next flag; without this, `--input --out x` would read "--out".
      if (token.value === undefined || (!token.inlineValue && token.value.startsWith('-')))
        throw new PricingV3Error('MISSING_ARGUMENT', { option })
      values[option] = token.value
      if (isRepeatable(option)) repeated.push({ flag: option, value: token.value })
    }
  }

  return { positionals, values, repeated }
}

// Only the option name leaves here: a path or a parser message could quote what the caller keeps private.
const readJson = (option: ValueOption | 'current', path: string): unknown => {
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

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const currentPointerPath = join(repositoryRoot, 'data/pricing/v3-operating/current.json')

// A source the pointer names may be gone or broken; that is a verdict for the verifier, not a failure to raise here.
const readIfPossible = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

// The pointer is the one file this tool replaces. A sibling temp file plus rename means a reader sees the old pointer
// or the new one, never half of either. Not private like the other outputs: it is a tracked file with no amounts.
const replacePointer = (path: string, body: string) => {
  const staging = join(dirname(path), `.current.${process.pid}.tmp`)

  try {
    writeFileSync(staging, body, { flag: 'wx', mode: 0o644 })
    renameSync(staging, path)
  } catch {
    rmSync(staging, { force: true })

    throw new PricingV3Error('OUTPUT_NOT_WRITABLE', { option: 'out' })
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
  const { positionals, values, repeated } = parseCli()

  const [command, subcommand] = positionals

  const permitted: Record<string, string[]> = {
    calculate: ['input', 'out', 'keep-blocked', 'help'],
    validate: ['input', 'help'],
    explain: ['input', 'help'],
    replay: ['input', 'help'],
    compare: ['left', 'right', 'help'],
    export: ['input', 'out', 'format', 'help'],
    catalog: ['catalog', 'current', 'query', 'kind', 'date', 'input', 'impact', 'confirm', 'out', 'help'],
    prepare: ['catalog', 'current', 'input', 'out', 'help'],
    quote: ['catalog', 'current', 'input', 'out', 'keep-blocked', 'help'],
    resources: [
      'catalog',
      'policy',
      'credits',
      'current',
      'date',
      'query',
      'input',
      'out',
      'impact',
      'confirm',
      'help'
    ],
    compose: [
      'catalog',
      'policy',
      'credits',
      'current',
      'input',
      'out',
      'format',
      'brief',
      'tools',
      'label',
      'milestones',
      'option',
      'increment',
      'base',
      'keep-blocked',
      'help'
    ],
    current: ['catalog', 'policy', 'credits', 'reason', 'confirm', 'input', 'out', 'help'],
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

  // The flag only changes what `--out` does: alone it would be ignored in silence.
  if (values['keep-blocked'] && !values.out) throw new PricingV3Error('INVALID_ARGUMENT', { option: 'keep-blocked' })

  /**
   * The one writer of a quote artifact, for the three commands that freeze one (`calculate`, `quote` and
   * `compose prepare|quote`). `--out` is always a calculated quote: a run that did not calculate writes nothing
   * there, so the corrected run can take the same path instead of failing with OUTPUT_EXISTS against a file that was
   * never a quote. What the run found is still printed in full, with a notice that says nothing was written.
   *
   * A blocked artifact has readers of its own (`explain`, `replay`, `compose assess`, `compose commitments`), so it
   * stays reachable, by request: `--keep-blocked` writes it, and the notice says what the file is. Returns the
   * notice to print under `runNotices.output`, or nothing when `--out` holds what it always holds.
   */
  const freezeQuote = (artifact: unknown, calculated: boolean) => {
    if (!values.out) return undefined

    if (!calculated && !values['keep-blocked'])
      return {
        option: 'out',
        written: false,
        reason: 'QUOTE_NOT_CALCULATED',
        statement:
          'Nothing was written to --out: the quote did not calculate, and --out only ever holds a calculated quote. Resolve what this output reports and run again with the same --out. To keep the blocked artifact for explain, replay, compose assess or compose commitments, add --keep-blocked and give it a path of its own.'
      }

    writeNew(values.out, json(artifact))

    return calculated
      ? undefined
      : {
          option: 'out',
          written: true,
          reason: 'KEPT_BLOCKED',
          statement:
            'Written because --keep-blocked asked for it: the file holds a quote that did not calculate. It is not a quote and no reading of a calculated quote accepts it; the corrected run needs another --out.'
        }
  }

  const catalogPath =
    values.catalog ?? fileURLToPath(new URL('../../data/pricing/v3-catalog/catalog.review-v1.json', import.meta.url))

  let pointer: CurrentVersions | undefined

  // Opt-in (`--current`): a source the caller did not name comes from the pointer, and only once the file read
  // here is the one the pointer vouches for. An explicit flag never reaches this, so it always wins.
  const fromCurrent = (option: CurrentSourceRole) => {
    // `resources budget` takes the credit catalog through `--catalog`; everywhere else a flag names its own source.
    const role = command === 'resources' && subcommand === 'budget' ? 'credits' : option

    pointer ??= currentVersionsSchema.parse(readJson('current', currentPointerPath))

    return resolveCurrentSource(pointer, role, readIfPossible(join(repositoryRoot, pointer[role].path)))
  }

  const pointed = (option: ValueOption): option is CurrentSourceRole =>
    Boolean(values.current) && values[option] === undefined && CURRENT_SOURCE_ROLES.some(role => role === option)

  const load = (option: ValueOption) => (pointed(option) ? fromCurrent(option) : readJson(option, required(option)))
  const loadCatalog = () => (pointed('catalog') ? fromCurrent('catalog') : readJson('catalog', catalogPath))

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
          calculate: '--input request-and-snapshot.json [--out frozen-artifact.json [--keep-blocked]]',
          validate: '--input request-and-snapshot.json',
          explain: '--input frozen-artifact.json',
          replay: '--input frozen-artifact.json',
          compare: '--left artifact.json --right artifact.json',
          export: '--input frozen-artifact.json --out draft.md [--format markdown|json]',
          prepare: '--input brief.json [--catalog catalog.json] [--out selection.json]',
          quote: '--input brief.json [--catalog catalog.json] [--out quote.artifact.json [--keep-blocked]]',
          resources:
            'budget --input request.json --catalog credits.json | inspect --policy policy.json --date YYYY-MM-DD [--query text] | portfolio --input portfolio.json --policy policy.json [--date YYYY-MM-DD] | preview|apply --input change.json --policy policy.json --credits credits.json [--impact demands.json]; apply --confirm previewDigest --out new-version.json',
          compose:
            'workload --input workload.json [--brief brief.json --out dimensioned-brief.json] | scaffold --input brief.json --policy policy.json | plan --input plan.json --policy policy.json --credits credits.json [--out demand.json] | prepare|quote --input demand.json --policy policy.json --credits credits.json [--out artifact.json [--keep-blocked]] | assess|preview --input artifact.json [--format json|markdown] [--out preview.json|md] | split --input artifact.json --tools id,id|all [--label text] [--out split.json] | schedule --input artifact.json --milestones milestones.json [--out schedule.json] | cash --input artifact.json [--out cash.json] | commitments --input artifact.json [--out commitments.json] | document --input artifact.json [--brief document-brief.json] [--out data.json] [--option key=option.artifact.json]... [--increment key=with-add-on.artifact.json]... | increment --input with-add-on.artifact.json --base base.artifact.json [--out increment.json]',
          catalog:
            'search|show|validate|preview|apply [--catalog file] [--query text] [--kind kind] [--date YYYY-MM-DD]; preview/apply --input change.json [--impact briefs.json]; apply --confirm previewDigest --out new-version.json',
          current:
            '[show] [--input pointer.json] | set --catalog catalog.json --policy policy.json --credits credits.json --reason text [--confirm pointerDigest] [--out pointer.json]'
        },
        currentVersions: {
          pointer: 'data/pricing/v3-operating/current.json',
          flag: '--current fills each of --catalog, --policy and --credits the caller did not pass, on every operation that takes them. It is verified first (version and digest); an explicit flag wins. For `resources budget` it fills --catalog with the credit catalog.',
          withoutFlag: 'Unchanged: no --catalog means the historical baseline, and --policy/--credits stay mandatory.'
        },
        quoteOutput: {
          rule: '`--out` of `calculate`, `quote` and `compose prepare|quote` is always a calculated quote. A run that does not calculate (exit 2) writes nothing there and says so under `runNotices.output`; what it found is printed in full, and the corrected run takes the same --out.',
          keepBlocked:
            '--keep-blocked writes the artifact of a run that did not calculate, for the readings that take one (explain, replay, compose assess, compose commitments). It needs --out, and a path of its own: the file is not a quote.'
        },
        quoteDocument: {
          command:
            '`compose document` turns a frozen quote into version 2 of the data of the A4 quote template (docs/commercial/templates/cotizacion-a4). Render it with `node scripts/documents/render-cotizacion-a4.mjs --data data.json --out folder`. Exit 3: the document is a draft of a quote under review.',
          withoutBrief:
            'Prints the scaffold of the document brief (every line of the quote under its key, with its default label and group, and the texts to fill) and exits 2. --out keeps the brief alone.',
          brief:
            'Texts and presentation only (pricing-v3-quote-document-brief/1). Every amount, the currency, the tax and the date of the document come from the frozen quote; a brief that carries one is rejected. Lines must add up to the net of the quote, and the tax printed is the frozen tax of the quote, which must correspond to its rate within the rounding of its months; otherwise no data is emitted.',
          options:
            '--option <key>=<artifact.json>, repeatable (at most 8): the frozen quote of one optional add-on alone, verified by replay like --input. Its price is the net of one of its periods: it must be calculated, in the currency of the quote, with the same net in every period and no cost the client pays apart. The brief names exactly the options passed (`options.<key>`: label, unit, detail). They are printed in a block of their own and enter no line, net, tax or total of the quote.',
          courtesy:
            'A line the quote waives completely (net zero through a discount or an agreed net) prints nothing. `lines.<key>.courtesy: true` in the brief prints it with net zero and its reference value, the price it had before the waiver, taken from the frozen quote. The scaffold lists those keys under `waived`. The mark on a line with a net is rejected.'
        },
        quoteIncrement: {
          command:
            '`compose increment --input with-add-on.artifact.json --base base.artifact.json` prices an add-on that extends a quote as the difference between two frozen quotes: the base, and the base with the add-on in it. It prints, per compared period and in total, the increment of net, cost and margin, its margin rate, and what changed (lines added or with more dedication, tools whose cost moved, third-party costs added). Both artifacts are verified by replay. Exit 3. It is an internal reading: it holds cost and margin.',
          why: 'The quote of an add-on alone is a new line: when the add-on only adds dedication to people who are already lines of the base, it takes again every cost charged once per line (the platform fee, a part of the base tools), so its cost is overstated and its margin understated. In the quote of the base with the add-on in it each person is one line with the summed dedication, and nothing is charged twice.',
          comparable:
            'The two quotes are subtracted only when the difference can mean the add-on alone; otherwise the run is rejected with the rule that failed and nothing is approximated. Both calculated (QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES); same currency, offer, commercial unit, account, tax treatment, form and code of engagement, market, quote date, mode and contingency declaration (QUOTE_INCREMENT_CONTEXT_DIFFERS); same catalog, resource policy and credit catalog, by version and by content (QUOTE_INCREMENT_VERSIONS_DIFFER); the same periods, or a single representative period of a base that is the same in every period (QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE); every line, third-party cost and tool of the base still in the quote with the add-on, each line with its profile, country, allocation mode and basis and at least its people and dedication (QUOTE_INCREMENT_BASE_NOT_CONTAINED); and a net that grows in every compared period (QUOTE_INCREMENT_NET_NOT_POSITIVE).',
          document:
            '`compose document --increment <key>=<with-add-on.artifact.json>`, repeatable: an optional add-on priced as an increment over the quote of the document. It shares the limit of 8, the block and the brief (`options.<key>`: label, unit, detail) with --option. The price printed is the net the add-on adds in one period, which must be the same in every compared period; the cost and the margin of the increment never reach the document. Like an option, it enters no line, net, tax or total of the quote.'
        },
        limits: [
          'Local prototype. No DB/API/CRM write.',
          'Catalog resolver supplies explicitly versioned records; simulation never approves operational prices.',
          'Pilot catalog is review_only.'
        ]
      })
    )
  } else if (command === 'current') {
    const action = subcommand ?? 'show'

    if (!['show', 'set'].includes(action) || positionals.length > 2) throw new PricingV3Error('INVALID_ARGUMENT')
    permit(action === 'show' ? ['input', 'help'] : ['catalog', 'policy', 'credits', 'reason', 'confirm', 'out', 'help'])

    if (action === 'show') {
      // `--input` inspects a pointer that is not the committed one, e.g. the one `set --out` just wrote for review.
      const shown = currentVersionsSchema.parse(
        values.input ? readJson('input', values.input) : readJson('current', currentPointerPath)
      )

      const read = (role: CurrentSourceRole) => readIfPossible(join(repositoryRoot, shown[role].path))

      const verification = verifyCurrentVersions(shown, {
        catalog: read('catalog'),
        policy: read('policy'),
        credits: read('credits')
      })

      process.stdout.write(
        json({ binding: false, pointerDigest: currentVersionsDigest(shown), ...verification, pointer: shown })
      )
      process.exitCode = verification.consistent ? 0 : 2
    } else {
      const reason = required('reason')

      // Stored relative to the repository so the pointer reads the same on every machine; a source outside it
      // could not be found again from another checkout.
      const repositoryPath = (role: CurrentSourceRole) => {
        const path = relative(repositoryRoot, resolve(required(role)))

        if (path.startsWith('..') || isAbsolute(path)) throw new PricingV3Error('INVALID_ARGUMENT', { option: role })

        return path.split(sep).join('/')
      }

      const now = new Date()
      const pad = (part: number) => String(part).padStart(2, '0')

      const next = buildCurrentVersions({
        paths: {
          catalog: repositoryPath('catalog'),
          policy: repositoryPath('policy'),
          credits: repositoryPath('credits')
        },
        documents: { catalog: load('catalog'), policy: load('policy'), credits: load('credits') },
        reason,
        // The operator's calendar day, not UTC: near midnight they differ and this field is read by people.
        updatedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      })

      const target = values.out ?? currentPointerPath

      const replaced = existsSync(target)
        ? currentVersionsDigest(readJson(values.out ? 'out' : 'current', target))
        : null

      // Same lock as `catalog apply`: replacing requires having read exactly what is being replaced. A first
      // pointer has nothing to confirm, so a digest offered for one means the caller expected a file that is gone.
      if (replaced === null ? values.confirm !== undefined : required('confirm') !== replaced)
        throw new PricingV3Error('CURRENT_VERSIONS_CONFLICT', { option: 'confirm' })

      replacePointer(target, json(next))
      process.stdout.write(
        json({ updated: true, binding: false, replaced, pointerDigest: currentVersionsDigest(next), pointer: next })
      )
    }
  } else if (command === 'compose') {
    if (
      ![
        'prepare',
        'quote',
        'scaffold',
        'plan',
        'assess',
        'preview',
        'split',
        'schedule',
        'cash',
        'commitments',
        'document',
        'increment',
        'workload'
      ].includes(subcommand) ||
      positionals.length !== 2
    )
      throw new PricingV3Error('INVALID_ARGUMENT')

    const allowed = ['assess', 'preview'].includes(subcommand)
      ? ['input', 'out', 'format', 'help']
      : subcommand === 'split'
        ? ['input', 'out', 'tools', 'label', 'help']
        : subcommand === 'schedule'
          ? ['input', 'out', 'milestones', 'help']
          : ['cash', 'commitments'].includes(subcommand)
            ? ['input', 'out', 'help']
            : subcommand === 'document'
              ? ['input', 'brief', 'option', 'increment', 'out', 'help']
              : subcommand === 'increment'
                ? ['input', 'base', 'out', 'help']
                : subcommand === 'workload'
                ? ['input', 'brief', 'out', 'help']
                : subcommand === 'scaffold'
                  ? ['catalog', 'policy', 'current', 'input', 'out', 'help']
                  : subcommand === 'plan'
                    ? ['catalog', 'policy', 'credits', 'current', 'input', 'out', 'help']
                    : ['catalog', 'policy', 'credits', 'current', 'input', 'out', 'keep-blocked', 'help']

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
    } else if (subcommand === 'split') {
      // Which tools are shown apart is the operator's presentation choice: there is no default set to fall back on.
      const requested = required('tools')
        .split(',')
        .map(id => id.trim())

      if (
        requested.some(id => !id) ||
        new Set(requested).size !== requested.length ||
        (requested.includes('all') && requested.length > 1)
      )
        throw new PricingV3Error('INVALID_ARGUMENT', { option: 'tools' })
      if (
        values.label !== undefined &&
        (!values.label.trim() || values.label.length > 120 || /[\r\n]/.test(values.label))
      )
        throw new PricingV3Error('INVALID_ARGUMENT', { option: 'label' })

      // Same check as `replay`: nothing is derived from an artifact that does not reproduce its own digest.
      const artifact = replayResourceComposition(load('input'))

      const result = splitQuotedPrice(artifact.semantic.result, artifact, {
        tools: requested[0] === 'all' ? 'all' : requested,
        ...(values.label ? { label: values.label } : {})
      })

      if (values.out) writeNew(values.out, json(result))
      process.stdout.write(json(result))
      // A composition is always under review, exactly as `assess` and `preview` report it; a rejection exits 1.
      process.exitCode = 3
    } else if (subcommand === 'schedule' || subcommand === 'cash') {
      // Readings of a frozen quote, like `split`: verified by replay first, the total never changes.
      const artifact = replayResourceComposition(load('input'))

      const outcome =
        subcommand === 'schedule'
          ? presentPaymentSchedule(
              artifact.semantic.result,
              artifact,
              // The reader validates the list; a file that is not an array is its `milestones:empty`-family issue.
              readJson('milestones', required('milestones')) as Parameters<typeof presentPaymentSchedule>[2]
            )
          : readEngagementCash(artifact.semantic.result, artifact)

      if (!outcome.ok)
        throw new PricingV3Error(outcome.code, {
          ...(subcommand === 'schedule' ? { option: 'milestones' } : {}),
          issues: outcome.issues
        })

      if (values.out) writeNew(values.out, json(outcome.reading))
      process.stdout.write(json(outcome.reading))
      process.exitCode = 3
    } else if (subcommand === 'document') {
      // A reading of a frozen quote, like `split` and `schedule`: verified by replay first, and every figure of the
      // document comes from the verified result. The brief only brings the texts and the presentation of the lines.
      const artifact = replayResourceComposition(load('input'))

      // The flag an option of the document was passed with, from the place the reader gave it in the list: an
      // option rejected by the document is corrected under `--option` or under `--increment`.
      const flagOf = (issues: { path: string }[]) => {
        const place = /^options\.(\d+)(\.|$)/.exec(issues[0]?.path ?? '')

        return (place && repeated[Number(place[1])]?.flag) || 'option'
      }

      // What the caller corrects: the brief (its texts, its line keys, its milestones), an option or the quote itself.
      const reject = (outcome: { code: PricingV3Error['code']; issues: { path: string; rule: string }[] }) =>
        new PricingV3Error(outcome.code, {
          option: ['QUOTE_DOCUMENT_BRIEF_INVALID', 'SCHEDULE_MILESTONES_INVALID'].includes(outcome.code)
            ? 'brief'
            : outcome.code === 'QUOTE_DOCUMENT_OPTION_INVALID'
              ? flagOf(outcome.issues)
              : 'input',
          issues: outcome.issues
        })

      // `--option <key>=<artifact.json>`, once per optional add-on: the frozen quote of the option alone, under the
      // key the brief names it by. Each is verified by replay exactly like `--input`; what an option must be for a
      // document to print it, and how many a document takes, are the reader's rules, and its rejections name the
      // option by its place in this list.
      //
      // `--increment <key>=<artifact.json>` is an option too, priced another way: the artifact is the frozen quote
      // of the service with the add-on in it, and the price is what it adds to the quote of the document. Whether
      // the two can be subtracted is the rule of the increment reader; a pair that cannot is rejected here with its
      // code, under the place the flag has in the same list.
      const optionQuotes: (QuoteDocumentOption | QuoteDocumentIncrement)[] = repeated.map(
        ({ flag, value: argument }, index) => {
          const separator = argument.indexOf('=')
          const key = argument.slice(0, separator)
          const path = argument.slice(separator + 1)

          if (
            separator < 1 ||
            !path ||
            !/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(key) ||
            repeated.findIndex(other => other.value.startsWith(`${key}=`)) !== index
          )
            throw new PricingV3Error('INVALID_ARGUMENT', { option: flag })

          let frozen: ReturnType<typeof replayResourceComposition>

          try {
            frozen = replayResourceComposition(readJson(flag, path))
          } catch (error) {
            // With several artifacts in one run, the report says which flag holds the one that failed.
            const failure = classify(error)

            if (!failure) throw error

            throw new PricingV3Error(failure.code, { ...failure.detail, option: flag })
          }

          if (flag === 'option') return { key, result: frozen.semantic.result, identity: frozen }

          const outcome = readQuoteIncrement(artifact, frozen)

          if (!outcome.ok)
            throw new PricingV3Error(outcome.code, {
              option: flag,
              issues: outcome.issues.map(issue => ({ path: `options.${index}.${issue.path}`, rule: issue.rule }))
            })

          return { key, increment: outcome.reading }
        }
      )

      if (values.brief) {
        const outcome = composeQuoteDocument(
          artifact.semantic.result,
          artifact,
          readJson('brief', values.brief),
          optionQuotes
        )

        if (!outcome.ok) throw reject(outcome)

        // Version 2 of the data of the A4 quote template, and nothing around it: the template rejects unknown keys.
        if (values.out) writeNew(values.out, json(outcome.reading))
        process.stdout.write(json(outcome.reading))
        process.exitCode = 3
      } else {
        // No brief yet: the scaffold to fill, with the keys of this quote. Missing input, so exit 2 like `scaffold`;
        // `--out` keeps the brief alone, ready to edit.
        const outcome = scaffoldQuoteDocumentBrief(artifact.semantic.result, artifact, optionQuotes)

        if (!outcome.ok) throw reject(outcome)

        if (values.out) writeNew(values.out, json(outcome.reading.brief))
        process.stdout.write(json(outcome.reading))
        process.exitCode = 2
      }
    } else if (subcommand === 'increment') {
      // A reading of two frozen quotes: the base, and the base with an add-on in it. Each is verified by replay
      // before anything is subtracted, and the report of a failure says which of the two flags holds the artifact.
      const verified = (option: 'input' | 'base') => {
        try {
          return replayResourceComposition(readJson(option, required(option)))
        } catch (error) {
          const failure = classify(error)

          if (!failure) throw error

          throw new PricingV3Error(failure.code, { ...failure.detail, option })
        }
      }

      const withAddOn = verified('input')
      const outcome = readQuoteIncrement(verified('base'), withAddOn)

      // What the caller corrects is the quote with the add-on, which is built to extend the base; the base only
      // when nothing but the base is at fault.
      if (!outcome.ok)
        throw new PricingV3Error(outcome.code, {
          option: outcome.issues.length && outcome.issues.every(issue => issue.path === 'base') ? 'base' : 'input',
          issues: outcome.issues
        })

      if (values.out) writeNew(values.out, json(outcome.reading))
      process.stdout.write(json(outcome.reading))
      // Two compositions under review, read together: like every reading of one. A rejection exits 1.
      process.exitCode = 3
    } else if (subcommand === 'commitments') {
      // Needs the frozen policy, demand and catalog besides the result: alternatives and declared contract terms
      // live there. It reports; whether a commitment is acceptable is the operator's call.
      const reading = commitmentExposure(replayResourceComposition(load('input')))

      if (values.out) writeNew(values.out, json(reading))
      process.stdout.write(json(reading))
      process.exitCode = reading.calculationStatus === 'calculated' ? 3 : 2
    } else {
      const artifact = runResourceComposition(loadCatalog(), load('policy'), load('credits'), load('input'))

      const result = artifact.semantic.result
      const output = freezeQuote(artifact, result.quote.calculationStatus === 'calculated')

      // A demand that kept an old date quotes with the values of that date and nothing fails. The catalog is in hand
      // here, so say it; this notice is about the run, not part of the frozen result.
      const laterCatalogValues = valuesEffectiveAfter(
        artifact.semantic.catalog,
        artifact.semantic.demand.brief.quoteDate
      )

      // Dates of the prices this quote used: a review that is due warns, a validity about to end is named before it
      // blocks the next quote. Like the notice above, it describes the run and never enters the frozen result.
      const dates = quotePriceNotices(artifact, artifact.semantic.policy, artifact.semantic.demand.brief.quoteDate, {
        catalog: artifact.semantic.catalog,
        credits: artifact.semantic.credits
      })

      const priceDates =
        dates.reviewDue.length || dates.dueSoon.length || dates.expired.length
          ? {
              withinDays: dates.withinDays,
              reviewDue: dates.reviewDue,
              dueSoon: dates.dueSoon,
              expired: dates.expired
            }
          : null

      // Both print the same derived summary; the complete result lives only in the artifact written by --out.
      // `quote` is the one that freezes, so only it reports the digest a later replay must reproduce.
      process.stdout.write(
        json({
          ...summarizeComposition(result, {
            calculationId: artifact.calculationId,
            ...(subcommand === 'quote' ? { replayDigest: artifact.replayDigest } : {})
          }),
          // Everything under `runNotices` describes this run against today's sources, and what it did with `--out`;
          // the rest is the summary of the result and is what a replay of the frozen artifact prints again.
          ...(laterCatalogValues || priceDates || output
            ? {
                runNotices: {
                  ...(laterCatalogValues ? { laterCatalogValues } : {}),
                  ...(priceDates ? { priceDates } : {}),
                  ...(output ? { output } : {})
                }
              }
            : {})
        })
      )
      process.exitCode = result.quote.calculationStatus === 'calculated' ? 3 : 2
    }
  } else if (command === 'resources') {
    if (positionals.length !== 2) throw new PricingV3Error('INVALID_ARGUMENT')

    const allowed: Record<string, string[]> = {
      inspect: ['catalog', 'policy', 'credits', 'current', 'date', 'query', 'out', 'help'],
      portfolio: ['catalog', 'policy', 'current', 'date', 'input', 'out', 'help'],
      budget: ['catalog', 'current', 'input', 'out', 'help'],
      preview: ['catalog', 'policy', 'credits', 'current', 'input', 'impact', 'out', 'help'],
      apply: ['catalog', 'policy', 'credits', 'current', 'input', 'impact', 'confirm', 'out', 'help']
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
      const withCredits = Boolean(values.credits || values.current)
      const credits = withCredits ? creditCatalogSchema.parse(load('credits')) : undefined
      const discovery = inspectOperatingResources(loadCatalog(), policy, required('date'), values.query, credits)

      const result = {
        ...discovery,
        policyDigest: catalogDigest(policy),
        ...(credits ? { creditCatalogDigest: catalogDigest(credits) } : {})
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
      search: ['catalog', 'current', 'query', 'kind', 'date', 'help'],
      show: ['catalog', 'current', 'query', 'kind', 'date', 'help'],
      validate: ['catalog', 'current', 'help'],
      preview: ['catalog', 'current', 'input', 'impact', 'help'],
      apply: ['catalog', 'current', 'input', 'impact', 'confirm', 'out', 'help']
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
        'price_rounding',
        'engagement_factor',
        'third_party_policy',
        'contingency_reserve'
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
      const result = artifact.semantic.result
      const output = freezeQuote(artifact, result.calculationStatus === 'calculated')

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
          })),
          ...(output ? { runNotices: { output } } : {})
        })
      )
      process.exitCode =
        result.calculationStatus !== 'calculated' ? 2 : result.reviewStatus === 'requires_review' ? 3 : 0
    }
  } else if (command === 'calculate' || command === 'validate') {
    if (positionals.length !== 1) throw new PricingV3Error('INVALID_ARGUMENT')
    const input = load('input')
    const { result, artifact } = runPricingV3(input)

    // An input the contract rejects yields no artifact at all, with or without `--keep-blocked`.
    const output =
      command === 'calculate' && artifact ? freezeQuote(artifact, result.calculationStatus === 'calculated') : undefined

    process.stdout.write(
      json({
        result,
        calculationId: artifact?.calculationId ?? null,
        replayDigest: artifact?.replayDigest ?? null,
        ...(output ? { runNotices: { output } } : {})
      })
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
