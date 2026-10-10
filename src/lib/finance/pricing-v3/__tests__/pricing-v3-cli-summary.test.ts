import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { composeResourceQuote } from '../resources/composition'
import { projectCompositionPreview } from '../resources/readiness'
import { summarizeComposition } from '../resources/summary'

const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-cli-summary-'))

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const operating = (name: string) => `data/pricing/v3-operating/${name}.json`
const credits = 'data/pricing/v3-resources/ai-credits.review-v1.json'

const sources = [
  '--catalog',
  operating('catalog.review-v3'),
  '--policy',
  operating('resources.review-v5'),
  '--credits',
  credits
]

const cli = (...args: string[]) =>
  spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

describe('compose prints the derived summary and keeps the detail in the artifact', () => {
  const out = join(dir, 'managed-care.artifact.json')
  const quote = cli('compose', 'quote', ...sources, '--input', operating('managed-care.demand'), '--out', out)
  const artifact = read(out)

  it('quote: stdout is exactly the summary of the artifact it froze', () => {
    expect(quote.status).toBe(3)
    expect(JSON.parse(quote.stdout)).toEqual(
      JSON.parse(JSON.stringify(summarizeComposition(artifact.semantic.result, artifact)))
    )
    expect(JSON.parse(quote.stdout).replayDigest).toBe(artifact.replayDigest)
  })

  it('quote: the summary is a fraction of the frozen detail, measured on this run', () => {
    expect(quote.stdout.length).toBeLessThan(readFileSync(out, 'utf8').length * 0.15)
  })

  it('prepare: same summary without a digest, because nothing was frozen for replay', () => {
    const prepare = cli('compose', 'prepare', ...sources, '--input', operating('managed-care.demand'))
    const { replayDigest, ...withoutDigest } = JSON.parse(quote.stdout)

    expect(prepare.status).toBe(3)
    expect(replayDigest).toBeDefined()
    expect(JSON.parse(prepare.stdout)).toEqual(withoutDigest)
  })

  it('replay: verifies the file and answers with its summary, not a second copy of the detail', () => {
    const replay = cli('replay', '--input', out)
    const body = JSON.parse(replay.stdout)

    expect(replay.status).toBe(3)
    expect(Object.keys(body)).toEqual(['verified', 'calculationId', 'summary'])
    expect(body.verified).toBe(true)
    expect(body.summary).toEqual(JSON.parse(quote.stdout))
  })

  it('needs_input keeps exit 2 and every blocker in the summary', () => {
    // Without --catalog the historical baseline is used, which has no managed-service offer.
    const pending = cli(
      'compose',
      'quote',
      '--policy',
      operating('resources.review-v5'),
      '--credits',
      credits,
      '--input',
      operating('managed-care.demand')
    )

    const summary = JSON.parse(pending.stdout)

    expect(pending.status).toBe(2)
    expect(summary.totals).toBeNull()
    expect(summary.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('preview amounts keep the scale of the currency', () => {
  const scale = (money: string) => money.split('.')[1]?.length ?? 0

  // CLP (no decimals) and USD (two) through the same managed-service branch: the second currency is what proves
  // the scale comes from the kernel's own formatting rather than from a constant.
  const cases = [
    {
      name: 'managed-care (CLP)',
      catalog: 'catalog.review-v3',
      policy: 'resources.review-v5',
      demand: 'managed-care.demand'
    },
    { name: 'service (USD)', catalog: 'catalog.review-v2', policy: 'resources.review-v2', demand: 'service.demand' }
  ]

  it.each(cases)('$name: every item reads at the period scale', ({ catalog, policy, demand }) => {
    const result = composeResourceQuote(
      read(operating(catalog)),
      read(operating(policy)),
      read(credits),
      read(operating(demand))
    )

    const preview = projectCompositionPreview(result)

    expect(preview.commercialUnit).toBe('managed_service')

    for (const period of preview.periods)
      for (const item of period.items) expect(scale(item.net)).toBe(scale(period.net))
  })

  it('the two cases really exercise different scales', () => {
    const scales = cases.map(c =>
      scale(
        composeResourceQuote(
          read(operating(c.catalog)),
          read(operating(c.policy)),
          read(credits),
          read(operating(c.demand))
        ).quote.totals!.net
      )
    )

    expect(new Set(scales).size).toBe(2)
  })
})
