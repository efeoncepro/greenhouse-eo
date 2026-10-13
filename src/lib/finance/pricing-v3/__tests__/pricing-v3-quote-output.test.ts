// `--out` of a command that freezes a quote is always a calculated quote (scripts/commercial/pricing-v3.ts).
//
// The behaviour is the CLI's, so every case runs the real command and looks at what is on disk afterwards: a file
// that exists or does not, what a later command reads from it, and the exit code. The case that motivated the rule
// is run as it happened: a demand that does not calculate quoted with `--out`, then corrected and quoted again with
// the same `--out`.
//
// Nothing is written under data/: demands are copies of a committed example edited in a temporary folder, quoted
// with the versions the example was frozen with (named by path, so the cases do not move with the pointer).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-quote-output-'))

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

const file = (name: string, value: unknown) => {
  const path = join(dir, name)

  writeFileSync(path, JSON.stringify(value))

  return path
}

const cli = (...args: string[]) =>
  spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

const OPERATING = 'data/pricing/v3-operating'
const EXAMPLE = `${OPERATING}/designer-startup-courtesy`

// The versions the example was frozen with, by path: the pointer can move on and these cases stay where they are.
const sources = [
  '--catalog',
  `${OPERATING}/catalog.review-v10.json`,
  '--policy',
  `${OPERATING}/resources.review-v11.json`,
  '--credits',
  'data/pricing/v3-resources/ai-credits.review-v1.json'
]

const demand = read(`${EXAMPLE}.demand.json`)

// The same demand with a tool its line needs left without an allocation: the composer withholds the calculation.
const unallocated = {
  ...demand,
  allocations: demand.allocations.filter((allocation: { toolId: string }) => allocation.toolId !== 'adobe')
}

describe('compose quote: --out holds a calculated quote or nothing', () => {
  const out = join(dir, 'quote.artifact.json')

  const blockedRun = cli(
    'compose',
    'quote',
    ...sources,
    '--input',
    file('unallocated.demand.json', unallocated),
    '--out',
    out
  )

  const blockedLeftAFile = existsSync(out)
  const correctedRun = cli('compose', 'quote', ...sources, '--input', `${EXAMPLE}.demand.json`, '--out', out)

  it('a run that does not calculate reports what it found, writes nothing and says so', () => {
    const summary = JSON.parse(blockedRun.stdout)

    expect(blockedRun.status).toBe(2)
    expect(blockedRun.stderr).toBe('')
    expect(summary.calculationStatus).toBe('needs_input')
    expect(summary.totals).toBeNull()
    // What the operator needs to correct the demand is all there: where, and the prices an allocation can name.
    const blocker = summary.diagnostics.find((d: { code: string }) => d.code === 'RESOURCE_ALLOCATION_REQUIRED')

    expect(blocker).toMatchObject({ code: 'RESOURCE_ALLOCATION_REQUIRED', path: '1:adobe' })
    expect(blocker.candidates.length).toBeGreaterThan(0)
    expect(blocker.candidates).toContain(
      read(`${EXAMPLE}.demand.json`).allocations.find((a: { toolId: string }) => a.toolId === 'adobe').priceId
    )
    expect(blockedLeftAFile).toBe(false)
    expect(summary.runNotices.output).toMatchObject({ option: 'out', written: false, reason: 'QUOTE_NOT_CALCULATED' })
    expect(summary.runNotices.output.statement).toContain('--keep-blocked')
  })

  it('the corrected run takes the same --out: the case that used to end in OUTPUT_EXISTS', () => {
    const summary = JSON.parse(correctedRun.stdout)
    const artifact = read(out)

    expect(correctedRun.status).toBe(3)
    expect(correctedRun.stderr).toBe('')
    expect(summary.calculationStatus).toBe('calculated')
    expect(artifact.semantic.result.quote.calculationStatus).toBe('calculated')
    expect(artifact.replayDigest).toBe(summary.replayDigest)
    // A written quote needs no notice: stdout is the summary it always was.
    expect(summary.runNotices?.output).toBeUndefined()
    // And it is the quote committed for this demand, calculation for calculation.
    expect(artifact.replayDigest).toBe(read(`${EXAMPLE}.artifact.json`).replayDigest)
    expect(cli('replay', '--input', out).status).toBe(3)
  })

  it('a quote on disk is still never overwritten', () => {
    const again = cli('compose', 'quote', ...sources, '--input', `${EXAMPLE}.demand.json`, '--out', out)

    expect(again.status).toBe(1)
    expect(again.stdout).toBe('')
    expect(JSON.parse(again.stderr).error).toMatchObject({ code: 'OUTPUT_EXISTS', option: 'out' })

    // Nor touched by a later run that does not calculate: the file keeps the quote it holds.
    const before = readFileSync(out, 'utf8')

    const blockedAgain = cli(
      'compose',
      'quote',
      ...sources,
      '--input',
      join(dir, 'unallocated.demand.json'),
      '--out',
      out
    )

    expect(blockedAgain.status).toBe(2)
    expect(JSON.parse(blockedAgain.stdout).runNotices.output.written).toBe(false)
    expect(readFileSync(out, 'utf8')).toBe(before)
  })

  it('prepare shares the path and the rule', () => {
    const prepared = join(dir, 'prepared.artifact.json')

    const run = cli(
      'compose',
      'prepare',
      ...sources,
      '--input',
      join(dir, 'unallocated.demand.json'),
      '--out',
      prepared
    )

    expect(run.status).toBe(2)
    expect(existsSync(prepared)).toBe(false)
    expect(JSON.parse(run.stdout).runNotices.output).toMatchObject({ written: false, reason: 'QUOTE_NOT_CALCULATED' })
  })
})

describe('--keep-blocked: the artifact of a run that did not calculate, by request', () => {
  const kept = join(dir, 'blocked.artifact.json')

  const run = cli(
    'compose',
    'quote',
    ...sources,
    '--input',
    file('unallocated.kept.demand.json', unallocated),
    '--out',
    kept,
    '--keep-blocked'
  )

  it('writes it, says what the file is, and keeps the exit of a quote that needs input', () => {
    const summary = JSON.parse(run.stdout)

    expect(run.status).toBe(2)
    expect(summary.runNotices.output).toMatchObject({ option: 'out', written: true, reason: 'KEPT_BLOCKED' })
    expect(read(kept).semantic.result.quote.calculationStatus).toBe('needs_input')
    expect(read(kept).replayDigest).toBe(summary.replayDigest)
  })

  it('the readings that take a blocked artifact still reach it', () => {
    const replay = cli('replay', '--input', kept)
    const explain = cli('explain', '--input', kept)
    const assess = cli('compose', 'assess', '--input', kept)
    const commitments = cli('compose', 'commitments', '--input', kept)

    expect(replay.status).toBe(2)
    expect(JSON.parse(replay.stdout)).toMatchObject({ verified: true, summary: { calculationStatus: 'needs_input' } })
    expect(explain.status).toBe(2)
    expect(explain.stderr).toBe('')
    // Readiness turns each blocker into a gap with an owner.
    expect(JSON.parse(assess.stdout).gaps.map((gap: { code: string }) => gap.code)).toContain(
      'RESOURCE_ALLOCATION_REQUIRED'
    )
    expect(commitments.status).toBe(2)
    expect(JSON.parse(commitments.stdout).calculationStatus).toBe('needs_input')

    // And the readings of a calculated quote refuse it, as they refuse any blocked quote.
    const document = cli('compose', 'document', '--input', kept)

    expect(document.status).toBe(1)
    expect(JSON.parse(document.stderr).error.code).toBe('QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE')
  })

  it('needs --out, and belongs only to the commands that freeze a quote', () => {
    const alone = cli('compose', 'quote', ...sources, '--input', `${EXAMPLE}.demand.json`, '--keep-blocked')

    expect(alone.status).toBe(1)
    expect(alone.stdout).toBe('')
    expect(JSON.parse(alone.stderr).error).toMatchObject({ code: 'INVALID_ARGUMENT', option: 'keep-blocked' })

    for (const other of [
      ['compose', 'plan', ...sources, '--input', `${EXAMPLE}.demand.json`],
      ['compose', 'preview', '--input', `${EXAMPLE}.artifact.json`],
      ['prepare', '--input', 'data/pricing/v3-catalog/examples/designer-co-cl.json']
    ]) {
      const rejected = cli(...other, '--out', join(dir, 'never.json'), '--keep-blocked')

      expect(rejected.status, other.slice(0, 2).join(' ')).toBe(1)
      expect(JSON.parse(rejected.stderr).error).toMatchObject({ code: 'INVALID_ARGUMENT', option: 'keep-blocked' })
    }

    expect(existsSync(join(dir, 'never.json'))).toBe(false)

    // A value is not a switch.
    expect(JSON.parse(cli('compose', 'quote', '--keep-blocked=yes').stderr).error).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'keep-blocked'
    })
  })
})

describe('the other two lanes that freeze a quote follow the same rule', () => {
  it('quote (catalog lane)', () => {
    const brief = read('data/pricing/v3-catalog/examples/designer-co-cl.json')

    const unknownProfile = file('unknown-profile.brief.json', {
      ...brief,
      lines: [{ ...brief.lines[0], profile: 'ECG-999' }]
    })

    const out = join(dir, 'catalog.artifact.json')
    const blocked = cli('quote', '--input', unknownProfile, '--out', out)

    expect(blocked.status).toBe(2)
    expect(JSON.parse(blocked.stdout).calculationStatus).not.toBe('calculated')
    expect(JSON.parse(blocked.stdout).runNotices.output).toMatchObject({
      written: false,
      reason: 'QUOTE_NOT_CALCULATED'
    })
    expect(existsSync(out)).toBe(false)

    const calculated = cli('quote', '--input', 'data/pricing/v3-catalog/examples/designer-co-cl.json', '--out', out)

    expect(calculated.status).toBe(3)
    expect(JSON.parse(calculated.stdout)).not.toHaveProperty('runNotices')
    expect(read(out).replayDigest).toBe(JSON.parse(calculated.stdout).replayDigest)

    const kept = join(dir, 'catalog.blocked.artifact.json')
    const keep = cli('quote', '--input', unknownProfile, '--out', kept, '--keep-blocked')

    expect(keep.status).toBe(2)
    expect(JSON.parse(keep.stdout).runNotices.output).toMatchObject({ written: true, reason: 'KEPT_BLOCKED' })
    expect(cli('explain', '--input', kept).status).toBe(2)
  })

  it('calculate (kernel lane)', () => {
    const needsInput = 'data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json'
    const out = join(dir, 'kernel.artifact.json')
    const blocked = cli('calculate', '--input', needsInput, '--out', out)

    expect(blocked.status).toBe(2)
    expect(JSON.parse(blocked.stdout).result.calculationStatus).toBe('needs_input')
    expect(JSON.parse(blocked.stdout).runNotices.output).toMatchObject({
      written: false,
      reason: 'QUOTE_NOT_CALCULATED'
    })
    expect(existsSync(out)).toBe(false)

    const keep = cli('calculate', '--input', needsInput, '--out', out, '--keep-blocked')

    expect(keep.status).toBe(2)
    expect(JSON.parse(keep.stdout).runNotices.output).toMatchObject({ written: true, reason: 'KEPT_BLOCKED' })
    expect(cli('explain', '--input', out).status).toBe(2)
  })
})

describe('the usage says what --out holds', () => {
  it('names the rule and the flag on the three commands', () => {
    const usage = JSON.parse(cli('help').stdout)

    expect(Object.keys(usage.quoteOutput)).toEqual(['rule', 'keepBlocked'])
    for (const operation of [usage.operations.calculate, usage.operations.quote, usage.operations.compose])
      expect(operation).toContain('[--keep-blocked]')
  })
})
