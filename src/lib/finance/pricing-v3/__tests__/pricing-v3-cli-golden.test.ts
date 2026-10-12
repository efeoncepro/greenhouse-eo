// Golden baseline of the Pricing V3 CLI (TASK-2024, EPIC-053).
//
// What `pnpm pricing:v3` answers is a contract people and agents quote with every day: arguments in, and out of it
// stdout, stderr, the exit code and, when the command writes, the name, the bytes and the mode of each file. This
// file pins that contract command by command, so a change underneath the CLI (its storage, later its transport) is
// proven invisible instead of assumed. It is also the baseline the platform transport is measured against.
//
// Two kinds of case:
//   - `golden`: the run is compared with a fixture captured from the CLI before the storage port existed. Every
//     source it names is an immutable versioned file, so the fixture never ages.
//   - `current`: a command run with `--current` must answer exactly what the same command answers with the three
//     sources the pointer names passed by flag. It is compared at run time, with no fixture, because the pointer
//     moves with every catalog version and a fixture of it would turn red on every legitimate release.
//
// To capture again after a DELIBERATE change of what the CLI answers:
//   PRICING_V3_CLI_GOLDEN=capture pnpm vitest run src/lib/finance/pricing-v3/__tests__/pricing-v3-cli-golden.test.ts
// and review the fixture diff line by line. A refactor never captures: its proof is that nothing here moved.
//
// What is normalized, and why (nothing else is):
//   - `"createdAt"` of a frozen artifact: the clock of the run (`execution.createdAt`). Outside the replay digest.
//   - `"updatedAt"` and `"pointerDigest"` of `current set`: the operator's calendar day and the digest that covers
//     it. The test asserts apart that the digest printed is the digest of the pointer written, and the day is today.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { currentVersionsDigest } from '../adapters/current-versions'

const FIXTURES = 'src/lib/finance/pricing-v3/__tests__/fixtures/cli-golden'
const CAPTURE = process.env.PRICING_V3_CLI_GOLDEN === 'capture'

/** stdout, stderr or a written file above this size is pinned by length and sha256 alone, to keep fixtures small. */
const TEXT_LIMIT = 16_000

const TIMEOUT = 60_000

const OP = 'data/pricing/v3-operating'
const CAT = 'data/pricing/v3-catalog'
const PILOT = 'data/pricing/v3-pilot'
const CREDITS = 'data/pricing/v3-resources/ai-credits.review-v1.json'

// Immutable versions, named one by one: a golden case never follows the pointer.
const catalog = (version: number) => `${OP}/catalog.review-v${version}.json`
const policy = (version: number) => `${OP}/resources.review-v${version}.json`

const sources = (catalogVersion: number, policyVersion = catalogVersion) => [
  '--catalog',
  catalog(catalogVersion),
  '--policy',
  policy(policyVersion),
  '--credits',
  CREDITS
]

const SYNTHETIC = `${PILOT}/scenarios/synthetic-co-cl.json`
const NEEDS_INPUT = `${PILOT}/scenarios/colombia-chile-design-needs-input.json`
const HYPOTHESIS = `${PILOT}/scenarios/colombia-chile-design-historical-hypothesis.json`
const LOCAL_ARTIFACT = `${PILOT}/economics/colombia-chile-artifact.json`
const SELECTION_BRIEF = `${CAT}/examples/designer-co-cl.json`
const SELECTION_ARTIFACT = `${CAT}/examples/designer.quote.artifact.json`
const COMPOSITION_ARTIFACT = `${OP}/designer.artifact.json`
const COURTESY = `${OP}/designer-startup-courtesy`
const ADDON = `${OP}/managed-addon-increment`

const roots: string[] = []

afterAll(() => roots.forEach(root => rmSync(root, { recursive: true, force: true })))

const workspace = () => {
  const root = mkdtempSync(join(tmpdir(), 'pricing-v3-cli-golden-'))

  roots.push(root)

  return root
}

const run = (args: string[]) =>
  spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

const normalizeClock = (text: string) =>
  text.replace(/("createdAt": ?)"\d{4}-\d{2}-\d{2}T[\d:.]+Z"/g, '$1"<createdAt>"')

const normalizePointer = (text: string) =>
  text
    .replace(/("updatedAt": ?)"\d{4}-\d{2}-\d{2}"/g, '$1"<updatedAt>"')
    .replace(/("pointerDigest": ?)"[a-f0-9]{64}"/g, '$1"<pointerDigest>"')

type Pinned = { bytes: number; sha256: string; text?: string }

const pin = (text: string): Pinned => ({
  bytes: Buffer.byteLength(text),
  sha256: sha256(text),
  ...(Buffer.byteLength(text) <= TEXT_LIMIT ? { text } : {})
})

type Outcome = {
  args: string[]
  status: number | null
  stdout: Pinned
  stderr: Pinned
  /** Every file under the workspace after the run, seeds included: what was written, and that nothing else was. */
  files: { name: string; mode: string; content: Pinned }[]
}

type Context = { tmp: string }

type Case = {
  id: string
  /** Files the run needs under its workspace, and values derived by an earlier (unrecorded) run. */
  seed?: (context: Context) => void
  args: (context: Context) => string[]
  /** `current set`: the day and the pointer digest are normalized, and asserted apart. */
  pointer?: string
}

const listFiles = (root: string, dir = ''): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const name = dir ? `${dir}/${entry.name}` : entry.name

    return entry.isDirectory() ? listFiles(root, name) : [name]
  })

// A seed made unreadable on purpose is pinned by its mode; its content is not this test's to read either.
const readSeed = (path: string) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return '<unreadable>'
  }
}

const execute = (definition: Case): Outcome => {
  const tmp = workspace()
  const context = { tmp }

  definition.seed?.(context)

  const args = definition.args(context)
  const result = run(args)

  // The tool never echoes a path: an output that named the workspace would need a normalization nobody declared.
  expect(result.stdout.includes(tmp), 'stdout names the workspace').toBe(false)
  expect(result.stderr.includes(tmp), 'stderr names the workspace').toBe(false)

  const normalize = (text: string) => (definition.pointer ? normalizePointer(text) : normalizeClock(text))

  return {
    args: args.map(arg => arg.split(tmp).join('<tmp>')),
    status: result.status,
    stdout: pin(normalize(result.stdout)),
    stderr: pin(normalize(result.stderr)),
    files: listFiles(tmp)
      .sort()
      .map(name => ({
        name,
        mode: (statSync(join(tmp, name)).mode & 0o777).toString(8),
        content: pin(normalize(readSeed(join(tmp, name))))
      }))
  }
}

// ── Seeds ────────────────────────────────────────────────────────────────────────────────────────────────────────

const put = (context: Context, name: string, body: string) => writeFileSync(join(context.tmp, name), body)
const copy = (context: Context, name: string, from: string) => put(context, name, readFileSync(from, 'utf8'))
const at = (context: Context, name: string) => join(context.tmp, name)

/** Runs the CLI for a value a later run needs (a preview digest, a frozen artifact). Never part of the record. */
const derive = (args: string[]) => {
  const result = run(args)

  if (result.status === 1) throw new Error(`seed run failed: ${args.slice(0, 2).join(' ')}`)

  return result
}

const previewDigest = (args: string[]) => JSON.parse(derive(args).stdout).previewDigest as string

const MILESTONES = JSON.stringify([
  { id: 'start', label: 'Al inicio', share: '0.5', when: 'A la firma' },
  { id: 'end', label: 'Al cierre', share: '0.5', when: 'A la entrega' }
])

const CATALOG_CHANGE = ['--input', `${CAT}/examples/illustrative-increase.json`]
const CATALOG_IMPACT = ['--impact', `${CAT}/examples/update-impact-briefs.json`]
const RESOURCE_CHANGE = [...sources(5), '--input', `${OP}/stable-unit-prices.change.json`]

// A pointer that names immutable versions: `current show --input` and `current set --out` over it never age.
const pinnedPointer = () =>
  `${JSON.stringify(
    {
      schemaVersion: 'pricing-v3-current/1',
      updatedAt: '2026-10-11',
      reason: 'Golden baseline: a pointer that names immutable versions.',
      catalog: {
        path: catalog(11),
        version: 'operating-review-2026-10-11-v11',
        digest: '238a60d6eb514f6e15f8c4b7582b7a075222ce4bd02a55ac10e09d7abec3a702'
      },
      policy: {
        path: policy(11),
        version: 'operating-review-2026-10-11-v11',
        digest: '7ed8b92752fa4818fb2de53655e1a5275ce72bc556df9f41f1129d98ae810406'
      },
      credits: {
        path: CREDITS,
        version: 'operator-screenshots-2026-10-09-v1',
        digest: '6886757643bada2b11cc41df2fa9f62a0edc3587ee00da48cbe2443d05f0cc2d'
      }
    },
    null,
    2
  )}\n`

const driftedPointer = () => pinnedPointer().replace('238a60d6', '00000000')

const SET = [...sources(10), '--reason', 'Golden baseline: replace the pointer.']

// ── The matrix ───────────────────────────────────────────────────────────────────────────────────────────────────

const GOLDEN: Case[] = [
  // Usage and argument rejections
  { id: 'help', args: () => ['help'] },
  { id: 'no-command', args: () => [] },
  { id: 'unknown-command', args: () => ['frobnicate'] },
  { id: 'unknown-option', args: () => ['calculate', '--nope', 'x'] },
  { id: 'missing-argument', args: () => ['calculate'] },
  { id: 'invalid-argument', args: () => ['catalog', 'validate', '--query', 'x'] },
  { id: 'keep-blocked-without-out', args: () => ['calculate', '--input', SYNTHETIC, '--keep-blocked'] },

  // calculate | validate
  { id: 'calculate-calculated', args: () => ['calculate', '--input', SYNTHETIC] },
  { id: 'calculate-needs-input', args: () => ['calculate', '--input', NEEDS_INPUT] },
  { id: 'calculate-requires-review', args: () => ['calculate', '--input', HYPOTHESIS] },
  { id: 'calculate-out', args: c => ['calculate', '--input', SYNTHETIC, '--out', at(c, 'quote.artifact.json')] },
  {
    id: 'calculate-out-not-calculated',
    args: c => ['calculate', '--input', NEEDS_INPUT, '--out', at(c, 'quote.artifact.json')]
  },
  {
    id: 'calculate-keep-blocked',
    args: c => ['calculate', '--input', NEEDS_INPUT, '--out', at(c, 'blocked.artifact.json'), '--keep-blocked']
  },
  { id: 'validate', args: () => ['validate', '--input', SYNTHETIC] },
  { id: 'input-not-found', args: c => ['calculate', '--input', at(c, 'missing.json')] },
  {
    id: 'input-not-json',
    seed: c => put(c, 'broken.json', '{ not json'),
    args: c => ['calculate', '--input', at(c, 'broken.json')]
  },
  {
    id: 'output-exists',
    seed: c => put(c, 'taken.json', '{"kept":true}\n'),
    args: c => ['calculate', '--input', SYNTHETIC, '--out', at(c, 'taken.json')]
  },
  {
    id: 'output-not-writable',
    args: c => ['calculate', '--input', SYNTHETIC, '--out', at(c, 'no-such-folder/quote.artifact.json')]
  },

  // replay | explain | compare | export
  { id: 'replay-local', args: () => ['replay', '--input', LOCAL_ARTIFACT] },
  { id: 'explain-local', args: () => ['explain', '--input', LOCAL_ARTIFACT] },
  { id: 'replay-selection', args: () => ['replay', '--input', SELECTION_ARTIFACT] },
  { id: 'explain-selection', args: () => ['explain', '--input', SELECTION_ARTIFACT] },
  { id: 'replay-composition', args: () => ['replay', '--input', COMPOSITION_ARTIFACT] },
  { id: 'explain-composition', args: () => ['explain', '--input', COMPOSITION_ARTIFACT] },
  {
    id: 'replay-mismatch',
    seed: c =>
      put(
        c,
        'tampered.artifact.json',
        readFileSync(SELECTION_ARTIFACT, 'utf8').replace(/"replayDigest": "[a-f0-9]{8}/, '"replayDigest": "00000000')
      ),
    args: c => ['replay', '--input', at(c, 'tampered.artifact.json')]
  },
  { id: 'artifact-not-found', args: c => ['replay', '--input', at(c, 'missing.artifact.json')] },
  {
    id: 'artifact-not-json',
    seed: c => put(c, 'broken.artifact.json', 'not an artifact'),
    args: c => ['explain', '--input', at(c, 'broken.artifact.json')]
  },
  { id: 'compare-local', args: () => ['compare', '--left', LOCAL_ARTIFACT, '--right', LOCAL_ARTIFACT] },
  { id: 'compare-selection', args: () => ['compare', '--left', SELECTION_ARTIFACT, '--right', SELECTION_ARTIFACT] },
  { id: 'compare-mixed', args: () => ['compare', '--left', LOCAL_ARTIFACT, '--right', SELECTION_ARTIFACT] },
  { id: 'compare-right-not-found', args: c => ['compare', '--left', LOCAL_ARTIFACT, '--right', at(c, 'gone.json')] },
  {
    id: 'export-local-markdown',
    seed: c => derive(['calculate', '--input', SYNTHETIC, '--out', at(c, 'quote.artifact.json')]),
    args: c => ['export', '--input', at(c, 'quote.artifact.json'), '--out', at(c, 'draft.md')]
  },
  {
    id: 'export-local-json',
    seed: c => derive(['calculate', '--input', SYNTHETIC, '--out', at(c, 'quote.artifact.json')]),
    args: c => ['export', '--input', at(c, 'quote.artifact.json'), '--out', at(c, 'draft.json'), '--format', 'json']
  },
  {
    id: 'export-output-exists',
    seed: c => {
      derive(['calculate', '--input', SYNTHETIC, '--out', at(c, 'quote.artifact.json')])
      put(c, 'draft.md', 'kept\n')
    },
    args: c => ['export', '--input', at(c, 'quote.artifact.json'), '--out', at(c, 'draft.md')]
  },
  { id: 'export-selection-under-review', args: c => ['export', '--input', SELECTION_ARTIFACT, '--out', at(c, 'x.md')] },
  { id: 'export-composition', args: c => ['export', '--input', COMPOSITION_ARTIFACT, '--out', at(c, 'x.md')] },

  // prepare | quote (selection from a catalog)
  { id: 'prepare', args: () => ['prepare', '--input', SELECTION_BRIEF] },
  { id: 'prepare-out', args: c => ['prepare', '--input', SELECTION_BRIEF, '--out', at(c, 'selection.json')] },
  { id: 'quote', args: () => ['quote', '--input', SELECTION_BRIEF] },
  { id: 'quote-out', args: c => ['quote', '--input', SELECTION_BRIEF, '--out', at(c, 'quote.artifact.json')] },
  { id: 'quote-catalog', args: () => ['quote', '--catalog', catalog(11), '--input', SELECTION_BRIEF] },

  // catalog
  { id: 'catalog-validate-baseline', args: () => ['catalog', 'validate'] },
  { id: 'catalog-validate', args: () => ['catalog', 'validate', '--catalog', catalog(11)] },
  { id: 'catalog-search', args: () => ['catalog', 'search', '--query', 'designer'] },
  { id: 'catalog-search-kind', args: () => ['catalog', 'search', '--catalog', catalog(11), '--kind', 'offer'] },
  {
    id: 'catalog-show',
    args: () => [
      'catalog',
      'show',
      '--catalog',
      catalog(11),
      '--kind',
      'offer',
      '--query',
      'offer:creative-managed-service'
    ]
  },
  {
    id: 'catalog-show-not-found',
    args: () => ['catalog', 'show', '--catalog', catalog(11), '--kind', 'offer', '--query', 'nothing']
  },
  { id: 'catalog-kind-unknown', args: () => ['catalog', 'search', '--kind', 'nope'] },
  { id: 'catalog-not-found', args: c => ['catalog', 'validate', '--catalog', at(c, 'missing.json')] },
  {
    id: 'catalog-not-json',
    seed: c => put(c, 'broken.json', '['),
    args: c => ['catalog', 'validate', '--catalog', at(c, 'broken.json')]
  },
  {
    id: 'catalog-schema-invalid',
    seed: c => put(c, 'empty.json', '{}\n'),
    args: c => ['catalog', 'validate', '--catalog', at(c, 'empty.json')]
  },
  { id: 'catalog-preview', args: () => ['catalog', 'preview', ...CATALOG_CHANGE, ...CATALOG_IMPACT] },
  {
    id: 'catalog-apply',
    args: c => [
      'catalog',
      'apply',
      ...CATALOG_CHANGE,
      ...CATALOG_IMPACT,
      '--confirm',
      previewDigest(['catalog', 'preview', ...CATALOG_CHANGE, ...CATALOG_IMPACT]),
      '--out',
      at(c, 'catalog.next.json')
    ]
  },
  {
    id: 'catalog-apply-conflict',
    args: c => ['catalog', 'apply', ...CATALOG_CHANGE, '--confirm', '0'.repeat(64), '--out', at(c, 'catalog.next.json')]
  },
  {
    id: 'catalog-apply-output-exists',
    seed: c => put(c, 'catalog.next.json', '{"kept":true}\n'),
    args: c => [
      'catalog',
      'apply',
      ...CATALOG_CHANGE,
      '--confirm',
      previewDigest(['catalog', 'preview', ...CATALOG_CHANGE]),
      '--out',
      at(c, 'catalog.next.json')
    ]
  },

  // resources
  { id: 'resources-inspect', args: () => ['resources', 'inspect', ...sources(11), '--date', '2026-10-11'] },
  {
    id: 'resources-inspect-query-out',
    args: c => [
      'resources',
      'inspect',
      '--catalog',
      catalog(11),
      '--policy',
      policy(11),
      '--date',
      '2026-10-11',
      '--query',
      'adobe',
      '--out',
      at(c, 'inspect.json')
    ]
  },
  {
    id: 'resources-portfolio',
    args: c => [
      'resources',
      'portfolio',
      '--catalog',
      catalog(11),
      '--policy',
      policy(11),
      '--input',
      `${OP}/portfolio.example.json`,
      '--date',
      '2026-10-11',
      '--out',
      at(c, 'portfolio.json')
    ]
  },
  {
    id: 'resources-budget',
    args: () => [
      'resources',
      'budget',
      '--catalog',
      CREDITS,
      '--input',
      'data/pricing/v3-resources/examples/higgsfield.request.json'
    ]
  },
  { id: 'resources-policy-missing', args: () => ['resources', 'inspect', '--date', '2026-10-11'] },
  {
    id: 'resources-policy-not-found',
    args: c => ['resources', 'inspect', '--policy', at(c, 'missing.json'), '--date', '2026-10-11']
  },
  { id: 'resources-preview', args: c => ['resources', 'preview', ...RESOURCE_CHANGE, '--out', at(c, 'preview.json')] },
  {
    id: 'resources-apply',
    args: c => [
      'resources',
      'apply',
      ...RESOURCE_CHANGE,
      '--confirm',
      previewDigest(['resources', 'preview', ...RESOURCE_CHANGE]),
      '--out',
      at(c, 'resources.next.json')
    ]
  },
  {
    id: 'resources-apply-output-exists',
    seed: c => put(c, 'resources.next.json', '{"kept":true}\n'),
    args: c => [
      'resources',
      'apply',
      ...RESOURCE_CHANGE,
      '--confirm',
      previewDigest(['resources', 'preview', ...RESOURCE_CHANGE]),
      '--out',
      at(c, 'resources.next.json')
    ]
  },
  {
    id: 'resources-base-conflict',
    args: () => ['resources', 'preview', ...sources(11), '--input', `${OP}/stable-unit-prices.change.json`]
  },

  // compose
  { id: 'compose-workload', args: () => ['compose', 'workload', '--input', `${OP}/managed-care.workload.json`] },
  {
    id: 'compose-workload-brief',
    args: c => [
      'compose',
      'workload',
      '--input',
      `${OP}/managed-care.workload.json`,
      '--brief',
      `${OP}/managed-care.brief.json`,
      '--out',
      at(c, 'dimensioned.brief.json')
    ]
  },
  {
    id: 'compose-scaffold',
    args: c => [
      'compose',
      'scaffold',
      '--catalog',
      catalog(11),
      '--policy',
      policy(11),
      '--input',
      `${OP}/writer.brief.json`,
      '--out',
      at(c, 'demand.json')
    ]
  },
  { id: 'compose-plan', args: () => ['compose', 'plan', ...sources(11), '--input', `${OP}/designer.plan.json`] },
  {
    id: 'compose-plan-out',
    args: c => ['compose', 'plan', ...sources(11), '--input', `${OP}/designer.plan.json`, '--out', at(c, 'demand.json')]
  },
  {
    id: 'compose-prepare',
    args: () => ['compose', 'prepare', ...sources(11), '--input', `${OP}/designer-on-demand.demand.json`]
  },
  {
    id: 'compose-quote',
    args: () => ['compose', 'quote', ...sources(3, 5), '--input', `${OP}/managed-care.demand.json`]
  },
  {
    id: 'compose-quote-out',
    args: c => [
      'compose',
      'quote',
      ...sources(11),
      '--input',
      `${OP}/designer-on-demand.demand.json`,
      '--out',
      at(c, 'quote.artifact.json')
    ]
  },
  {
    id: 'compose-quote-out-not-calculated',
    args: c => [
      'compose',
      'quote',
      ...sources(11),
      '--input',
      `${OP}/designer.demand.json`,
      '--out',
      at(c, 'quote.artifact.json')
    ]
  },
  {
    id: 'compose-quote-keep-blocked',
    args: c => [
      'compose',
      'quote',
      ...sources(11),
      '--input',
      `${OP}/designer.demand.json`,
      '--out',
      at(c, 'blocked.artifact.json'),
      '--keep-blocked'
    ]
  },
  {
    id: 'compose-quote-output-exists',
    seed: c => put(c, 'quote.artifact.json', '{"kept":true}\n'),
    args: c => [
      'compose',
      'quote',
      ...sources(11),
      '--input',
      `${OP}/designer-on-demand.demand.json`,
      '--out',
      at(c, 'quote.artifact.json')
    ]
  },
  { id: 'compose-assess', args: c => ['compose', 'assess', '--input', COMPOSITION_ARTIFACT, '--out', at(c, 'a.json')] },
  { id: 'compose-preview', args: () => ['compose', 'preview', '--input', COMPOSITION_ARTIFACT] },
  {
    id: 'compose-preview-markdown',
    args: c => [
      'compose',
      'preview',
      '--input',
      COMPOSITION_ARTIFACT,
      '--format',
      'markdown',
      '--out',
      at(c, 'preview.md')
    ]
  },
  { id: 'compose-assess-format', args: () => ['compose', 'assess', '--input', COMPOSITION_ARTIFACT, '--format', 'xml'] },
  {
    id: 'compose-split',
    args: c => ['compose', 'split', '--input', COMPOSITION_ARTIFACT, '--tools', 'all', '--out', at(c, 'split.json')]
  },
  { id: 'compose-split-tools-invalid', args: () => ['compose', 'split', '--input', COMPOSITION_ARTIFACT, '--tools', 'a,,b'] },
  {
    id: 'compose-schedule',
    seed: c => put(c, 'milestones.json', MILESTONES),
    args: c => [
      'compose',
      'schedule',
      '--input',
      COMPOSITION_ARTIFACT,
      '--milestones',
      at(c, 'milestones.json'),
      '--out',
      at(c, 'schedule.json')
    ]
  },
  {
    id: 'compose-schedule-invalid',
    seed: c => put(c, 'milestones.json', '[]'),
    args: c => ['compose', 'schedule', '--input', COMPOSITION_ARTIFACT, '--milestones', at(c, 'milestones.json')]
  },
  { id: 'compose-cash', args: () => ['compose', 'cash', '--input', COMPOSITION_ARTIFACT] },
  { id: 'compose-commitments', args: () => ['compose', 'commitments', '--input', COMPOSITION_ARTIFACT] },
  {
    id: 'compose-document-scaffold',
    args: c => [
      'compose',
      'document',
      '--input',
      `${OP}/designer-on-demand.artifact.json`,
      '--out',
      at(c, 'document-brief.json')
    ]
  },
  {
    id: 'compose-document',
    args: c => [
      'compose',
      'document',
      '--input',
      `${OP}/designer-on-demand.artifact.json`,
      '--brief',
      `${OP}/designer-on-demand.document-brief.json`,
      '--out',
      at(c, 'document.json')
    ]
  },
  {
    id: 'compose-document-options',
    args: () => [
      'compose',
      'document',
      '--input',
      `${COURTESY}.artifact.json`,
      '--brief',
      `${COURTESY}.document-brief.json`,
      '--option',
      `motion=${COURTESY}.option-motion.artifact.json`,
      '--option',
      `copywriter=${COURTESY}.option-copywriter.artifact.json`
    ]
  },
  {
    id: 'compose-document-increment',
    args: () => [
      'compose',
      'document',
      '--input',
      `${ADDON}.artifact.json`,
      '--brief',
      `${ADDON}.document-brief.json`,
      '--increment',
      `conversations=${ADDON}.with-addon.artifact.json`
    ]
  },
  {
    id: 'compose-document-option-not-found',
    args: c => [
      'compose',
      'document',
      '--input',
      `${COURTESY}.artifact.json`,
      '--option',
      `motion=${at(c, 'missing.artifact.json')}`
    ]
  },
  {
    id: 'compose-increment',
    args: c => [
      'compose',
      'increment',
      '--input',
      `${ADDON}.with-addon.artifact.json`,
      '--base',
      `${ADDON}.artifact.json`,
      '--out',
      at(c, 'increment.json')
    ]
  },
  {
    id: 'compose-increment-context-differs',
    args: () => ['compose', 'increment', '--input', `${ADDON}.artifact.json`, '--base', COMPOSITION_ARTIFACT]
  },
  {
    id: 'compose-increment-base-not-found',
    args: c => ['compose', 'increment', '--input', `${ADDON}.artifact.json`, '--base', at(c, 'missing.json')]
  },

  // current
  {
    id: 'current-show-input',
    seed: c => put(c, 'pointer.json', pinnedPointer()),
    args: c => ['current', 'show', '--input', at(c, 'pointer.json')]
  },
  {
    id: 'current-show-drifted',
    seed: c => put(c, 'pointer.json', driftedPointer()),
    args: c => ['current', 'show', '--input', at(c, 'pointer.json')]
  },
  { id: 'current-show-not-found', args: c => ['current', 'show', '--input', at(c, 'missing.json')] },
  {
    id: 'current-show-schema-invalid',
    seed: c => put(c, 'pointer.json', '{}\n'),
    args: c => ['current', 'show', '--input', at(c, 'pointer.json')]
  },
  { id: 'current-set-first', pointer: 'pointer.json', args: c => ['current', 'set', ...SET, '--out', at(c, 'pointer.json')] },
  {
    id: 'current-set-replace',
    pointer: 'pointer.json',
    seed: c => put(c, 'pointer.json', pinnedPointer()),
    args: c => [
      'current',
      'set',
      ...SET,
      '--confirm',
      currentVersionsDigest(JSON.parse(pinnedPointer())),
      '--out',
      at(c, 'pointer.json')
    ]
  },
  {
    id: 'current-set-conflict',
    seed: c => put(c, 'pointer.json', pinnedPointer()),
    args: c => ['current', 'set', ...SET, '--confirm', '0'.repeat(64), '--out', at(c, 'pointer.json')]
  },
  {
    id: 'current-set-confirm-required',
    seed: c => put(c, 'pointer.json', pinnedPointer()),
    args: c => ['current', 'set', ...SET, '--out', at(c, 'pointer.json')]
  },
  {
    id: 'current-set-confirm-without-pointer',
    args: c => ['current', 'set', ...SET, '--confirm', '0'.repeat(64), '--out', at(c, 'pointer.json')]
  },
  {
    id: 'current-set-existing-not-json',
    seed: c => put(c, 'pointer.json', 'not a pointer'),
    args: c => ['current', 'set', ...SET, '--confirm', '0'.repeat(64), '--out', at(c, 'pointer.json')]
  },
  {
    id: 'current-set-not-writable',
    args: c => ['current', 'set', ...SET, '--out', at(c, 'no-such-folder/pointer.json')]
  },
  {
    id: 'current-set-source-outside-repository',
    seed: c => copy(c, 'catalog.json', catalog(11)),
    args: c => [
      'current',
      'set',
      '--catalog',
      at(c, 'catalog.json'),
      '--policy',
      policy(11),
      '--credits',
      CREDITS,
      '--reason',
      'Golden baseline.',
      '--out',
      at(c, 'pointer.json')
    ]
  }
]

// A file that exists and cannot be read is reported like one that is not there. Root reads through the mode, so the
// case only means something for an ordinary user.
const UNREADABLE = 'unreadable-file-reads-as-not-found'
const ORDINARY_USER = process.getuid?.() !== 0

if (ORDINARY_USER)
  GOLDEN.push({
    id: UNREADABLE,
    seed: c => {
      put(c, 'locked.json', '{}\n')
      chmodSync(at(c, 'locked.json'), 0o000)
    },
    args: c => ['calculate', '--input', at(c, 'locked.json')]
  })

// ── `--current` ≡ the three sources the pointer names, passed by flag ───────────────────────────────────────────

const POINTER = `${OP}/current.json`

type Pointer = Record<'catalog' | 'policy' | 'credits', { path: string }>

const pointed = (): Pointer => JSON.parse(readFileSync(POINTER, 'utf8'))

const named = (...roles: (keyof Pointer)[]) => roles.flatMap(role => [`--${role}`, pointed()[role].path])

const CURRENT: { id: string; command: string[]; explicit: () => string[]; out?: string }[] = [
  { id: 'catalog validate', command: ['catalog', 'validate'], explicit: () => named('catalog') },
  { id: 'catalog search', command: ['catalog', 'search', '--kind', 'offer'], explicit: () => named('catalog') },
  { id: 'quote', command: ['quote', '--input', SELECTION_BRIEF], explicit: () => named('catalog') },
  {
    id: 'resources inspect',
    command: ['resources', 'inspect', '--date', '2026-10-11'],
    explicit: () => named('catalog', 'policy', 'credits')
  },
  {
    id: 'resources budget',
    command: ['resources', 'budget', '--input', 'data/pricing/v3-resources/examples/higgsfield.request.json'],
    // `resources budget` takes the credit catalog through `--catalog`.
    explicit: () => ['--catalog', pointed().credits.path]
  },
  {
    id: 'resources portfolio',
    command: ['resources', 'portfolio', '--input', `${OP}/portfolio.example.json`, '--date', '2026-10-11'],
    explicit: () => named('catalog', 'policy')
  },
  {
    id: 'compose scaffold',
    command: ['compose', 'scaffold', '--input', `${OP}/writer.brief.json`],
    explicit: () => named('catalog', 'policy')
  },
  {
    id: 'compose plan',
    command: ['compose', 'plan', '--input', `${OP}/designer.plan.json`],
    explicit: () => named('catalog', 'policy', 'credits')
  },
  {
    id: 'compose prepare',
    command: ['compose', 'prepare', '--input', `${OP}/designer-on-demand.demand.json`],
    explicit: () => named('catalog', 'policy', 'credits')
  },
  {
    id: 'compose quote --out',
    command: ['compose', 'quote', '--input', `${OP}/designer-on-demand.demand.json`],
    explicit: () => named('catalog', 'policy', 'credits'),
    out: 'quote.artifact.json'
  }
]

// ── Tests ────────────────────────────────────────────────────────────────────────────────────────────────────────

const fixturePath = (id: string) => join(FIXTURES, `${id}.json`)
const readFixture = (id: string): Outcome => JSON.parse(readFileSync(fixturePath(id), 'utf8'))

describe('Pricing V3 CLI: every command answers what it answered when the baseline was captured', () => {
  it.each(GOLDEN.map(definition => [definition.id, definition] as const))(
    '%s',
    (id, definition) => {
      const outcome = execute(definition)

      if (definition.pointer) {
        // What the normalization hides is asserted here: the digest printed is the digest of the pointer written,
        // and its day is the operator's calendar day.
        const written = JSON.parse(readFileSync(join(roots[roots.length - 1], definition.pointer), 'utf8'))
        const now = new Date()
        const pad = (part: number) => String(part).padStart(2, '0')

        expect(written.updatedAt).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
        expect(outcome.stdout.text).toContain('"<pointerDigest>"')
        expect(currentVersionsDigest(written)).toMatch(/^[a-f0-9]{64}$/)
      }

      if (CAPTURE) {
        // A capture that a second run does not reproduce would pin noise: something undeclared varies.
        expect(execute(definition), 'the run is not deterministic').toEqual(outcome)
        mkdirSync(FIXTURES, { recursive: true })
        writeFileSync(fixturePath(id), `${JSON.stringify(outcome, null, 2)}\n`)

        return
      }

      expect(existsSync(fixturePath(id)), 'no fixture: capture the baseline first').toBe(true)
      expect(outcome).toEqual(readFixture(id))
    },
    TIMEOUT
  )

  it('the fixtures on disk are exactly the cases of the matrix', () => {
    const onDisk = readdirSync(FIXTURES)
      .filter(name => name.endsWith('.json'))
      .map(name => name.slice(0, -'.json'.length))
      .filter(id => ORDINARY_USER || id !== UNREADABLE)
      .sort()

    expect(onDisk).toEqual(GOLDEN.map(definition => definition.id).sort())
    expect(new Set(onDisk).size).toBe(GOLDEN.length)
  })

  it('the matrix covers every command family, every exit code and every disk rejection', () => {
    const fixtures = GOLDEN.map(definition => readFixture(definition.id))

    const families = new Set(
      fixtures.map(({ args }) =>
        ['catalog', 'resources', 'compose', 'current'].includes(args[0]) ? `${args[0]} ${args[1]}` : args[0]
      )
    )

    for (const family of [
      'help',
      'calculate',
      'validate',
      'replay',
      'explain',
      'compare',
      'export',
      'prepare',
      'quote',
      ...['validate', 'search', 'show', 'preview', 'apply'].map(sub => `catalog ${sub}`),
      ...['preview', 'apply', 'inspect', 'portfolio', 'budget'].map(sub => `resources ${sub}`),
      ...[
        'workload',
        'scaffold',
        'plan',
        'prepare',
        'quote',
        'assess',
        'preview',
        'split',
        'schedule',
        'cash',
        'document',
        'increment',
        'commitments'
      ].map(sub => `compose ${sub}`),
      'current show',
      'current set'
    ])
      expect(families, family).toContain(family)

    expect([...new Set(fixtures.map(fixture => fixture.status))].sort()).toEqual([0, 1, 2, 3])

    const codes = new Set(
      fixtures.filter(fixture => fixture.status === 1).map(fixture => JSON.parse(fixture.stderr.text!).error.code)
    )

    for (const code of [
      'INPUT_NOT_FOUND',
      'INPUT_NOT_JSON',
      'OUTPUT_EXISTS',
      'OUTPUT_NOT_WRITABLE',
      'CURRENT_VERSIONS_CONFLICT',
      'REPLAY_MISMATCH',
      'SCHEMA_INVALID'
    ])
      expect(codes, code).toContain(code)
  })

  it('a rejection writes nothing and never reaches stdout; a success never writes to stderr', () => {
    for (const fixture of GOLDEN.map(definition => readFixture(definition.id))) {
      if (fixture.status === 1) expect(fixture.stdout.bytes, fixture.args.join(' ')).toBe(0)
      else expect(fixture.stderr.bytes, fixture.args.join(' ')).toBe(0)
    }
  })

  it('what the tool freezes is private (0600) and the pointer it replaces is not (0644)', () => {
    const modes = (id: string) => Object.fromEntries(readFixture(id).files.map(file => [file.name, file.mode]))

    expect(modes('calculate-out')).toEqual({ 'quote.artifact.json': '600' })
    expect(modes('compose-quote-out')).toEqual({ 'quote.artifact.json': '600' })
    expect(modes('catalog-apply')).toEqual({ 'catalog.next.json': '600' })
    expect(modes('resources-apply')).toEqual({ 'resources.next.json': '600' })
    expect(modes('current-set-first')).toEqual({ 'pointer.json': '644' })
    expect(modes('current-set-replace')).toEqual({ 'pointer.json': '644' })
    // `--out` of a run that did not calculate holds nothing; an existing file is never replaced.
    expect(readFixture('calculate-out-not-calculated').files).toEqual([])
    expect(readFixture('compose-quote-out-not-calculated').files).toEqual([])
    expect(readFixture('output-exists').files[0].content.text).toBe('{"kept":true}\n')
  })
})

describe('Pricing V3 CLI: --current answers what the sources the pointer names answer by flag', () => {
  it.each(CURRENT.map(definition => [definition.id, definition] as const))(
    '%s',
    (_id, definition) => {
      const tmp = workspace()
      const target = (name: string) => (definition.out ? ['--out', join(tmp, `${name}.${definition.out}`)] : [])
      const byPointer = run([...definition.command, '--current', ...target('pointer')])
      const byFlag = run([...definition.command, ...definition.explicit(), ...target('flag')])

      expect(byPointer.stderr).toBe('')
      expect(byPointer.status).toBe(byFlag.status)
      expect(byPointer.stdout).toBe(byFlag.stdout)

      if (definition.out) {
        const written = (name: string) => join(tmp, `${name}.${definition.out}`)

        expect(normalizeClock(readFileSync(written('pointer'), 'utf8'))).toBe(
          normalizeClock(readFileSync(written('flag'), 'utf8'))
        )
        expect(statSync(written('pointer')).mode & 0o777).toBe(0o600)
      }
    },
    TIMEOUT
  )

  it('current show reads the committed pointer, with or without naming it', () => {
    const bare = run(['current'])
    const shown = run(['current', 'show'])
    const byInput = run(['current', 'show', '--input', POINTER])

    expect(shown.status).toBe(0)
    expect(bare.stdout).toBe(shown.stdout)
    expect(byInput.stdout).toBe(shown.stdout)
    expect(JSON.parse(shown.stdout)).toMatchObject({ consistent: true, pointer: pointed() })
  })
})
