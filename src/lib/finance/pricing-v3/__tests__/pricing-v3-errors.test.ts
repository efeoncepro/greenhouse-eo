import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import {
  PRICING_V3_ADAPTER_ERROR_CODES,
  PRICING_V3_DOMAIN_ERROR_CODES,
  PRICING_V3_UNCLASSIFIED_ERROR_CODE,
  PricingV3Error,
  isPricingV3Error
} from '../errors'

const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-errors-'))

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const cli = (...args: string[]) =>
  spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

type Issue = { path: string; rule: string; limit?: number; allowed?: string[]; expected?: string }
type Report = { code: string; message: string; option?: string; allowed?: string[]; issues?: Issue[] }

/** Every rejection shares one envelope: exit 1, nothing on stdout, and no field beyond the registered detail. */
const rejection = (...args: string[]) => {
  const run = cli(...args)

  expect(run.status).toBe(1)
  expect(run.stdout).toBe('')

  const report = JSON.parse(run.stderr) as { error: Report; binding: boolean }

  expect(Object.keys(report)).toEqual(['error', 'binding'])
  expect(report.binding).toBe(false)
  expect(['code', 'message', 'option', 'allowed', 'issues']).toEqual(expect.arrayContaining(Object.keys(report.error)))

  return { stderr: run.stderr, error: report.error }
}

const file = (name: string, content: string) => {
  const path = join(dir, name)

  writeFileSync(path, content)

  return path
}

// Unique per run and placed only in VALUE positions: if it shows up on stderr, content leaked.
const SENTINEL = `leak-probe-${process.pid}-${Date.now()}`

const expectNoLeak = (stderr: string) => {
  expect(stderr).not.toContain(SENTINEL)
  expect(stderr).not.toContain(dir)
  expect(stderr).not.toContain(process.cwd())
  // Any absolute path, not only the two we happen to know about.
  expect(stderr).not.toMatch(/(^|[\s"'(:=])\/[\w.-]+\//)
}

const brief = 'data/pricing/v3-catalog/examples/designer-co-cl.json'
const compositionArtifact = 'data/pricing/v3-operating/designer.artifact.json'

describe('Pricing V3 CLI rejections name their cause', () => {
  it('distinguishes an unreadable input from one that is not JSON, naming the option', () => {
    const missing = rejection('calculate', '--input', join(dir, 'missing.json'))

    expect(missing.error).toMatchObject({ code: 'INPUT_NOT_FOUND', option: 'input' })

    const invalid = rejection('prepare', '--input', brief, '--catalog', file('not-json.json', `{ "x": ${SENTINEL}`))

    // The option is the one whose file is broken, not the first one read.
    expect(invalid.error).toMatchObject({ code: 'INPUT_NOT_JSON', option: 'catalog' })
  })

  it('never overwrites an output, JSON or text, and keeps it private', () => {
    const json = join(dir, 'selection.json')

    expect(cli('prepare', '--input', brief, '--out', json).status).toBe(0)
    const frozen = readFileSync(json, 'utf8')

    expect(rejection('prepare', '--input', brief, '--out', json).error).toMatchObject({
      code: 'OUTPUT_EXISTS',
      option: 'out'
    })
    expect(readFileSync(json, 'utf8')).toBe(frozen)
    expect(statSync(json).mode & 0o777).toBe(0o600)

    // Text outputs used to bypass the exclusive writer's classification.
    const markdown = join(dir, 'preview.md')
    const preview = ['compose', 'preview', '--input', compositionArtifact, '--format', 'markdown', '--out', markdown]

    expect(cli(...preview).status).toBe(3)
    expect(rejection(...preview).error).toMatchObject({ code: 'OUTPUT_EXISTS', option: 'out' })
    expect(statSync(markdown).mode & 0o777).toBe(0o600)
  })

  it('classifies an output it cannot create without echoing where it tried', () => {
    const unreachable = join(dir, `missing-folder-${SENTINEL}`, 'selection.json')
    const failed = rejection('prepare', '--input', brief, '--out', unreachable)

    expect(failed.error).toMatchObject({ code: 'OUTPUT_NOT_WRITABLE', option: 'out' })
    expectNoLeak(failed.stderr)
  })

  it('names the flag that is misspelled, misplaced or missing, never its value', () => {
    const misspelled = rejection('calculate', `--inptu=${SENTINEL}`)

    expect(misspelled.error).toMatchObject({ code: 'UNKNOWN_OPTION', option: 'inptu' })
    expectNoLeak(misspelled.stderr)

    // `--query` exists and `catalog` takes it, but `catalog validate` does not.
    expect(rejection('catalog', 'validate', '--query', SENTINEL).error).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'query'
    })

    expect(rejection('calculate').error).toMatchObject({ code: 'MISSING_ARGUMENT', option: 'input' })

    // A flag without a value must not swallow the next flag as its value.
    expect(rejection('calculate', '--input', '--out', join(dir, 'never.json')).error).toMatchObject({
      code: 'MISSING_ARGUMENT',
      option: 'input'
    })
  })

  it('rejects an unsupported preview format with its own code', () => {
    expect(rejection('compose', 'preview', '--input', compositionArtifact, '--format', 'pdf').error).toMatchObject({
      code: 'INVALID_FORMAT',
      option: 'format'
    })
  })

  it('surfaces a domain conflict with the code the domain raised', () => {
    const base = [
      'resources',
      'preview',
      '--catalog',
      'data/pricing/v3-operating/catalog.review-v3.json',
      '--policy',
      'data/pricing/v3-operating/resources.review-v4.json',
      '--credits',
      'data/pricing/v3-resources/ai-credits.review-v1.json',
      '--input'
    ]

    const source = 'data/pricing/v3-operating/sprout-professional-plan.change.json'
    const change = JSON.parse(readFileSync(source, 'utf8'))

    // Control: untouched, this change-set previews against its base. The only difference below is the digest.
    expect(cli(...base, source).status).toBe(0)

    const stale = file('stale.change.json', JSON.stringify({ ...change, baseDigest: '0'.repeat(64) }))

    expect(rejection(...base, stale).error.code).toBe('RESOURCE_BASE_CONFLICT')
  })
})

describe('Pricing V3 CLI rejections never carry content', () => {
  it('reports neither the text nor the location of a file that is not JSON', () => {
    const { error, stderr } = rejection('calculate', '--input', file('garbage.json', `"amount": ${SENTINEL} {{`))

    expect(error.code).toBe('INPUT_NOT_JSON')
    expectNoLeak(stderr)
  })

  it('reports a schema failure as paths, rule names and what the contract asked for there, capped', () => {
    const catalog = JSON.parse(readFileSync('data/pricing/v3-catalog/catalog.review-v1.json', 'utf8'))
    const records = Array.from({ length: 60 }, () => SENTINEL)

    const { error, stderr } = rejection(
      'catalog',
      'validate',
      '--catalog',
      file('invalid.catalog.json', JSON.stringify({ ...catalog, version: SENTINEL.repeat(40), records }))
    )

    expect(error.code).toBe('SCHEMA_INVALID')
    expect(error.issues?.length).toBeGreaterThan(0)
    // One issue per bad record would be 60+; the report stays bounded however broken the document is.
    expect(error.issues!.length).toBeLessThan(records.length)

    for (const issue of error.issues!) {
      // Where and which rule, always; beyond them only what the schema itself states at that place.
      expect(Object.keys(issue)).toEqual(expect.arrayContaining(['path', 'rule']))
      expect(['path', 'rule', 'limit', 'allowed', 'expected']).toEqual(expect.arrayContaining(Object.keys(issue)))
      expect(issue.path).toMatch(/^[\w.]*$/)
      expect(issue.rule).toMatch(/^[a-z_]+$/)
    }

    // The version is far longer than the contract takes: the report says the bound, and nothing of what was sent.
    expect(error.issues).toContainEqual({ path: 'version', rule: 'too_big', limit: 120 })
    expectNoLeak(stderr)
  })

  it('names the kinds a catalog holds when asked for one it does not have, and not what was typed', () => {
    const { error, stderr } = rejection('catalog', 'search', '--kind', SENTINEL)

    expect(error).toMatchObject({ code: 'INVALID_ARGUMENT', option: 'kind' })
    expect(error.allowed).toEqual(expect.arrayContaining(['profile', 'pricing', 'kit', 'offer']))
    expectNoLeak(stderr)

    // Every kind it names is one the same command accepts.
    for (const kind of error.allowed!) expect(cli('catalog', 'search', '--kind', kind).stderr).toBe('')
  })
})

describe('Pricing V3 error registry', () => {
  const all = [...PRICING_V3_DOMAIN_ERROR_CODES, ...PRICING_V3_ADAPTER_ERROR_CODES]

  it('keeps every code in exactly one group and the unclassified code in none', () => {
    expect(new Set(all).size).toBe(all.length)
    expect(all).not.toContain(PRICING_V3_UNCLASSIFIED_ERROR_CODE)
  })

  it('makes the message the code, so nothing an error says is prose', () => {
    for (const code of all) {
      const error = new PricingV3Error(code)

      expect(error.message).toBe(code)
      expect(error.detail).toEqual({})
      expect(isPricingV3Error(error)).toBe(true)
    }

    expect(isPricingV3Error(new Error(all[0]))).toBe(false)
  })
})
