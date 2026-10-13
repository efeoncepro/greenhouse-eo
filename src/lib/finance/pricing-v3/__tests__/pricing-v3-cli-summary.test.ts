import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { composeResourceQuote } from '../resources/composition'
import { projectCompositionPreview } from '../resources/readiness'
import { quotePriceNotices } from '../resources/price-review'
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

// stdout of compose prepare|quote is the summary of the result plus, under `runNotices`, what describes the run.
const summaryOf = (stdout: string) => {
  const body = JSON.parse(stdout)

  delete body.runNotices

  return body
}

const cli = (...args: string[]) =>
  spawnSync('node', ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts', ...args], { encoding: 'utf8' })

describe('compose prints the derived summary and keeps the detail in the artifact', () => {
  const out = join(dir, 'managed-care.artifact.json')
  const quote = cli('compose', 'quote', ...sources, '--input', operating('managed-care.demand'), '--out', out)
  const artifact = read(out)

  it('quote: stdout is exactly the summary of the artifact it froze', () => {
    expect(quote.status).toBe(3)
    expect(summaryOf(quote.stdout)).toEqual(
      JSON.parse(JSON.stringify(summarizeComposition(artifact.semantic.result, artifact)))
    )
    expect(summaryOf(quote.stdout).replayDigest).toBe(artifact.replayDigest)
  })

  it('quote: the summary is a fraction of the frozen detail, measured on this run', () => {
    expect(quote.stdout.length).toBeLessThan(readFileSync(out, 'utf8').length * 0.15)
  })

  it('prepare: same summary without a digest, because nothing was frozen for replay', () => {
    const prepare = cli('compose', 'prepare', ...sources, '--input', operating('managed-care.demand'))
    const { replayDigest, ...withoutDigest } = summaryOf(quote.stdout)

    expect(prepare.status).toBe(3)
    expect(replayDigest).toBeDefined()
    expect(summaryOf(prepare.stdout)).toEqual(withoutDigest)
  })

  it('replay: verifies the file and answers with its summary, not a second copy of the detail', () => {
    const replay = cli('replay', '--input', out)
    const body = JSON.parse(replay.stdout)

    expect(replay.status).toBe(3)
    expect(Object.keys(body)).toEqual(['verified', 'calculationId', 'summary'])
    expect(body.verified).toBe(true)
    expect(body.summary).toEqual(summaryOf(quote.stdout))
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

describe('a demand dated before newer catalog values says so', () => {
  const current = [
    '--catalog',
    operating('catalog.review-v5'),
    '--policy',
    operating('resources.review-v5'),
    '--credits',
    credits
  ]

  const catalog = read(operating('catalog.review-v5')) as { records: { source: { effectiveFrom: string } }[] }

  const newest = catalog.records
    .map(r => r.source.effectiveFrom)
    .sort()
    .at(-1)!

  it('the committed example keeps an older date: the run reports the newer values it did not use', () => {
    const demand = read(operating('managed-care.demand')) as { brief: { quoteDate: string } }

    // The premise of this case, read from the data: if the example is ever re-dated, pick another stale demand.
    expect(demand.brief.quoteDate < newest).toBe(true)

    const run = cli('compose', 'prepare', ...current, '--input', operating('managed-care.demand'))
    const notice = JSON.parse(run.stdout).runNotices.laterCatalogValues

    expect(run.status).toBe(3)
    expect(notice.quoteDate).toBe(demand.brief.quoteDate)
    expect(notice.newestEffectiveFrom).toBe(newest)
    expect(notice.records).toBe(catalog.records.filter(r => r.source.effectiveFrom > demand.brief.quoteDate).length)
  })

  it('a demand dated at the newest values carries no notice', () => {
    const demand = read(operating('managed-care-colombia.demand')) as { brief: { quoteDate: string } }

    expect(demand.brief.quoteDate >= newest).toBe(true)

    const run = cli('compose', 'prepare', ...current, '--input', operating('managed-care-colombia.demand'))

    expect(run.status).toBe(3)
    expect(JSON.parse(run.stdout).runNotices?.laterCatalogValues).toBeUndefined()
  })
})

describe('the dates of the prices a quote used travel with the run, not with the result', () => {
  // Policy v5 on purpose: its prices carry hard validity windows, so there is something to report. The expectation is
  // derived with the same function the CLI calls, over the artifact the CLI froze.
  const trio = [
    '--catalog',
    operating('catalog.review-v5'),
    '--policy',
    operating('resources.review-v5'),
    '--credits',
    credits
  ]

  const out = join(dir, 'colombia-v5.artifact.json')
  const quote = cli('compose', 'quote', ...trio, '--input', operating('managed-care-colombia.demand'), '--out', out)
  const artifact = read(out)

  const expected = quotePriceNotices(artifact, artifact.semantic.policy, artifact.semantic.demand.brief.quoteDate, {
    catalog: artifact.semantic.catalog,
    credits: artifact.semantic.credits
  })

  it('reports what is due or about to end, exactly as the domain reads it', () => {
    const { priceDates } = JSON.parse(quote.stdout).runNotices

    expect(quote.status).toBe(3)
    expect(expected.dueSoon.length + expected.reviewDue.length + expected.expired.length).toBeGreaterThan(0)
    expect(priceDates.dueSoon).toEqual(JSON.parse(JSON.stringify(expected.dueSoon)))
    expect(priceDates.reviewDue).toEqual(JSON.parse(JSON.stringify(expected.reviewDue)))
    expect(priceDates.expired).toEqual(JSON.parse(JSON.stringify(expected.expired)))
  })

  it('leaves the frozen result and its replay untouched', () => {
    expect(JSON.stringify(artifact)).not.toContain('runNotices')
    expect(JSON.parse(cli('replay', '--input', out).stdout).summary).toEqual(summaryOf(quote.stdout))
  })
})
