import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { calculatePricingV3 } from '../calculate'
import { comparePricingV3, replayPricingV3, runPricingV3 } from '../adapters/local-snapshot'
import { pricingV3ClientMarkdown, projectPricingV3ForClient } from '../projection'
import type { PricingV3Input } from '../schemas'

const root = resolve('.')
const fixture = resolve('data/pricing/v3-pilot/scenarios/synthetic-co-cl.json')
const sample = (): PricingV3Input => JSON.parse(readFileSync(fixture, 'utf8'))

const calc = (edit?: (input: PricingV3Input) => void) => {
  const input = sample()

  edit?.(input)

  return calculatePricingV3(input)
}

const has = (result: ReturnType<typeof calc>, code: string) => result.diagnostics.some(item => item.code === code)

// Golden numbers are derived independently: monthly human 1000*.5*.8=400;
// tools/platform/assurance/ops=100+50+25+25=200. Price human 400*1.5*1.2=720;
// other price 200*1.5=300. Three months 3060 + setup100*1.5=3210;
// 10% discount321 => net2889; normalized cost1800+100=1900; margin989.
describe('Pricing V3 pure financial kernel', () => {
  it('golden: separates human factor, market, non-linear fees, annual costs/cash and setup', () => {
    const result = calc()

    expect(result.calculationStatus).toBe('calculated')
    expect(result.reviewStatus).toBe('within_policy')
    expect(result.totals).toMatchObject({
      cost: '1900.00',
      undiscountedPrice: '3210.00',
      discount: '321.00',
      net: '2889.00',
      marginAmount: '989.00',
      cashCommitment: '2800.00',
      tax: null,
      grandTotal: null,
      uniformMonthlyNet: '918.00'
    })
    expect(result.lines.filter(line => line.kind === 'setup')).toHaveLength(1)
    expect(result.binding).toBe(false)
  })

  it('specific Colombian cost bypasses talent factor but preserves Chile market factor', () => {
    const result = calc(input => {
      input.snapshot.profiles[0].cost!.amount = '800'
      input.snapshot.profiles[0].cost!.localization = { kind: 'specific', country: 'CO' }
      input.snapshot.talentFactors = []
    })

    expect(result.totals?.net).toBe('2889.00')
    expect(result.lines[0].components[0].trace.costFactor).toBe('1')
    expect(result.lines[0].components[0].trace.marketFactor).toBe('1.2')
  })

  it('does not apply talent or market factors to licenses and fees', () => {
    const component = calc().lines[0].components.find(item => item.kind === 'platform_fee')!

    expect(component.cost).toBe('50')
    expect(component.price).toBe('75')
    expect(component.trace.marketFactor).toBe('1')
  })

  it('dedicated capacity absorbs explicitly committed full FTE cost', () => {
    const result = calc(input => {
      input.request.lines[0].allocationMode = 'dedicated'
      input.request.lines[0].allocationPolicyRef = 'dedicated-explicit'
    })

    expect(result.lines[0].components[0].cost).toBe('800')
    expect(result.lines[0].components[1].cost).toBe('100')
  })

  it('explicit hours and FTE produce identical costs', () => {
    expect(
      calc(input => {
        input.request.lines[0].dedication = { unit: 'hours_per_month', value: '80' }
      }).totals
    ).toEqual(calc().totals)
  })

  it('headcount scales humans; account license assignment remains explicit', () => {
    const result = calc(input => {
      input.request.lines[0].headcount = 2
    })

    expect(result.lines[0].components[0].cost).toBe('800')
    expect(result.lines[0].components[1].cost).toBe('100')
  })

  it('distinguishes target margin from markup and reports final post-discount margin', () => {
    const result = calc(input => {
      input.snapshot.pricingPolicies[0].method = 'target_margin'
    })

    expect(result.totals).toMatchObject({
      undiscountedPrice: '4280.00',
      net: '3852.00',
      cost: '1900.00',
      marginAmount: '1952.00'
    })
  })

  it('human-only pricing basis leaves other components at cost', () => {
    expect(
      calc(input => {
        input.snapshot.pricingPolicies[0].basis = 'human'
      }).totals?.undiscountedPrice
    ).toBe('2860.00')
  })

  it('missing cost is not zero, withholds all totals and lines', () => {
    const result = calc(input => {
      input.snapshot.profiles[0].cost = null
    })

    expect(has(result, 'MISSING_COST')).toBe(true)
    expect(result.calculationStatus).toBe('needs_input')
    expect(result.totals).toBeNull()
    expect(result.lines).toEqual([])
  })

  it.each([
    [
      'MISSING_MARKET_POLICY',
      (input: PricingV3Input) => {
        input.snapshot.marketFactors = []
      }
    ],
    [
      'MISSING_TALENT_FACTOR',
      (input: PricingV3Input) => {
        input.snapshot.talentFactors = []
      }
    ],
    [
      'MISSING_TALENT_COUNTRY',
      (input: PricingV3Input) => {
        input.request.lines[0].talentCountry = null
      }
    ],
    [
      'MISSING_OFFER_MARKET',
      (input: PricingV3Input) => {
        input.request.offerMarketCountry = null
      }
    ],
    [
      'MISSING_POLICY',
      (input: PricingV3Input) => {
        input.snapshot.allocationPolicies = []
      }
    ],
    [
      'MISSING_FX',
      (input: PricingV3Input) => {
        input.request.outputCurrency = 'CLP'
        input.snapshot.fx = []
      }
    ]
  ])('required input %s cannot fall back silently', (code, edit) => {
    const result = calc(edit)

    expect(has(result, code)).toBe(true)
    expect(result.calculationStatus).toBe('needs_input')
    expect(result.totals).toBeNull()
  })

  it('rejects a cost localized in a different talent country', () => {
    expect(
      has(
        calc(input => {
          input.snapshot.profiles[0].cost!.localization = { kind: 'specific', country: 'US' }
        }),
        'COST_COUNTRY_MISMATCH'
      )
    ).toBe(true)
  })

  it('does not replace unknown/stale data with cached historical values', () => {
    const result = calc(input => {
      input.snapshot.profiles[0].cost!.source.effectiveUntil = '2025-12-31'
      input.snapshot.profiles[0].cost!.source.effectiveFrom = '2025-01-01'
    })

    expect(has(result, 'STALE_SOURCE')).toBe(true)
    expect(result.totals).toBeNull()
  })

  it('requires review for estimated/historical data and low margin without changing price', () => {
    const result = calc(input => {
      input.snapshot.mode = 'historical'
      input.snapshot.pricingPolicies[0].minimumMargin = '0.5'
    })

    expect(result.calculationStatus).toBe('calculated')
    expect(result.reviewStatus).toBe('requires_review')
    expect(has(result, 'MARGIN_BELOW_FLOOR')).toBe(true)
    expect(result.totals?.net).toBe('2889.00')
  })

  it('duplicates in loaded cost and a separate fee are invalid', () => {
    const result = calc(input => {
      input.snapshot.profiles[0].cost!.covers.push('platform_fee')
    })

    expect(has(result, 'DUPLICATE_COVERAGE')).toBe(true)
    expect(result.calculationStatus).toBe('invalid')
  })

  it('an unsplit platform fee inside human loaded cost cannot be prorated or receive market adjustment', () => {
    const result = calc(input => {
      input.snapshot.profiles[0].cost!.covers.push('platform_fee')
      input.request.lines[0].assignments = input.request.lines[0].assignments.filter(
        item => item.resourceId !== 'payment-platform'
      )
    })

    expect(has(result, 'NON_HUMAN_LOADED_COST_REQUIRES_SPLIT')).toBe(true)
    expect(result.calculationStatus).toBe('invalid')
    expect(result.totals).toBeNull()
  })

  it('same license across lines must declare shares totaling <=1', () => {
    const shared = sample()
    const second = structuredClone(shared.request.lines[0])

    second.lineId = 'design-2'
    second.assignments.forEach(item => {
      item.allocationId += '-second'
      item.share = '0.5'
    })
    shared.request.lines[0].assignments.forEach(item => {
      item.share = '0.5'
    })
    shared.request.lines.push(second)
    expect(calculatePricingV3(shared).calculationStatus).toBe('calculated')
    shared.request.lines[0].assignments[0].share = '1'
    expect(has(calculatePricingV3(shared), 'DUPLICATE_COVERAGE')).toBe(true)
  })

  it('distinct user slots have distinct licenses; no dedup by tool name', () => {
    const result = calc(input => {
      input.snapshot.resources[0].scope = 'person'
      input.request.lines[0].headcount = 2
      input.request.lines[0].assignments[0].scope = 'person'
      input.request.lines[0].assignments[0].scopeRef = 'user-1'
      input.request.lines[0].assignments.push({
        ...input.request.lines[0].assignments[0],
        allocationId: 'user2-design',
        scopeRef: 'user-2'
      })
    })

    expect(result.calculationStatus).toBe('calculated')
    expect(result.lines[0].components.filter(item => item.kind === 'tool')).toHaveLength(2)
  })

  it('required license coverage must cover every active month', () => {
    const result = calc(input => {
      input.request.lines[0].assignments[0].periodIds = [1]
    })

    expect(result.calculationStatus).toBe('needs_input')
    expect(has(result, 'MISSING_COVERAGE')).toBe(true)
  })

  it('variable monthly resources produce a calendar rather than a misleading uniform fee', () => {
    const result = calc(input => {
      input.snapshot.resources.push({ ...input.snapshot.resources[2], resourceId: 'optional', covers: ['extra'] })
      input.request.lines[0].assignments.push({
        ...input.request.lines[0].assignments[2],
        resourceId: 'optional',
        allocationId: 'extra',
        periodIds: [2]
      })
    })

    expect(result.calculationStatus).toBe('calculated')
    expect(result.totals?.uniformMonthlyNet).toBeNull()
  })

  it('not applicable coverage needs a reason; confirmed zero needs source justification', () => {
    const result = calc(input => {
      input.snapshot.resources[1].amount = '0'
    })

    expect(has(result, 'UNJUSTIFIED_ZERO')).toBe(true)
    expect(
      calc(input => {
        input.snapshot.resources[1].amount = '0'
        input.snapshot.resources[1].source.zeroReason = 'Confirmed client-provided coverage'
      }).calculationStatus
    ).toBe('calculated')
  })

  it('FX conversion and CLP integer rounding preserve sum-of-lines accounting', () => {
    const result = calc(input => {
      input.request.outputCurrency = 'CLP'
    })

    expect(result.totals).toMatchObject({ net: '2889000', cost: '1900000' })
    expect(result.lines.every(line => /^\d+$/.test(line.net))).toBe(true)
  })

  it('exclusive tax comes only from an explicit effective policy', () => {
    const result = calc(input => {
      input.request.taxTreatment = {
        kind: 'exclusive',
        rate: '0.19',
        policyRef: 'synthetic-tax',
        source: input.snapshot.marketFactors[0].source
      }
    })

    expect(result.totals?.tax).toBe('548.91')
    expect(result.totals?.grandTotal).toBe('3437.91')
  })

  it('distributes a one-cent global discount by largest remainder and stable line ID', () => {
    const input = sample()

    input.request.duration.periods = 1
    input.request.lines[0].assignments = []
    input.request.lines[0].notApplicable = []
    input.snapshot.profiles[0].requiredCoverages = ['human_salary']
    input.snapshot.profiles[0].cost!.amount = '0.01'
    input.snapshot.profiles[0].cost!.localization = { kind: 'specific', country: 'CO' }
    input.request.lines[0].dedication.value = '1'
    input.snapshot.marketFactors[0].factor = '1'
    input.snapshot.pricingPolicies[0].rate = '0'
    input.snapshot.pricingPolicies[0].minimumMargin = '0'
    input.request.lines.push(
      { ...structuredClone(input.request.lines[0]), lineId: 'a' },
      { ...structuredClone(input.request.lines[0]), lineId: 'z' }
    )
    input.request.adjustments[0].lineIds = ['design', 'a', 'z']
    input.request.adjustments[0].rate = '0.333333333333333333'
    const result = calculatePricingV3(input)

    expect(result.totals?.discount).toBe('0.01')
    expect(result.lines.find(line => line.parentLineId === 'a')?.discount).toBe('0.01')
    expect(result.totals?.net).toBe('0.02')
  })

  it.each(['NaN', 'Infinity', '-1', '1e3', '1.000000000000000001', ''])(
    'rejects invalid fraction %s as data error rather than throwing',
    value => {
      expect(
        calc(input => {
          input.request.lines[0].dedication.value = value
        }).calculationStatus
      ).toBe('invalid')
    }
  )

  it('rejects unknown request fields, unsupported schema and margin >=1', () => {
    const raw = sample() as unknown as Record<string, unknown>

    raw.secret = 'must not appear in errors'
    const invalid = calculatePricingV3(raw)

    expect(invalid.calculationStatus).toBe('invalid')
    expect(JSON.stringify(invalid)).not.toContain('must not appear')
    expect(
      has(
        calc(input => {
          input.snapshot.pricingPolicies[0].method = 'target_margin'
          input.snapshot.pricingPolicies[0].rate = '1'
        }),
        'INVALID_MARGIN_RATE'
      )
    ).toBe(true)
    expect(
      calculatePricingV3({ ...sample(), request: { ...sample().request, schemaVersion: '99' } }).calculationStatus
    ).toBe('invalid')
  })

  it('the real CO→CL pilot remains incomplete, not a localized historical quote', () => {
    const input = JSON.parse(
      readFileSync(resolve('data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json'), 'utf8')
    )

    const result = calculatePricingV3(input)

    expect(result.calculationStatus).toBe('needs_input')
    expect(has(result, 'MISSING_COST')).toBe(true)
    expect(result.totals).toBeNull()
  })
})

describe('Additional boundary checks', () => {
  it('a historical reference and the current scenario remain separate, across all consulting variants', () => {
    const parameters = JSON.parse(readFileSync(resolve('data/pricing/v3-pilot/parameters.json'), 'utf8'))
    const references = JSON.parse(readFileSync(resolve('data/pricing/v3-pilot/reference-calculations.json'), 'utf8'))

    expect(parameters.operationalEnabledProfiles).toEqual([])
    expect(parameters.priorityScenario).toMatchObject({
      talentCountry: 'CO',
      offerMarketCountry: 'CL',
      costLocalizationStatus: 'pending'
    })

    const consultants = parameters.profiles.filter((profile: { sourceName: string }) =>
      profile.sourceName.startsWith('Consultor HubSpot')
    )

    expect(consultants.map((profile: { profileId: string }) => profile.profileId)).toEqual(['ECG-027', 'ECG-032'])
    expect(JSON.stringify(references)).toContain('needs_input')
    expect(JSON.stringify(references)).not.toContain('within_policy')
  })

  it('explicit minimum allocation and estimated source are traced, rather than silently discounted', () => {
    const result = calc(input => {
      input.snapshot.allocationPolicies[0].minimumBilledFte = '0.75'
      input.snapshot.profiles[0].cost!.source.status = 'estimated'
    })

    expect(result.lines[0].components[0].trace.billedFte).toBe('0.75')
    expect(result.reviewStatus).toBe('requires_review')
  })

  it('does not infer inverse FX, tax applicability or missing resource plans', () => {
    const result = calc(input => {
      input.request.outputCurrency = 'CLP'
      input.snapshot.fx[0] = { ...input.snapshot.fx[0], from: 'CLP', to: 'USD', rate: '0.001' }
      input.snapshot.resources = []
    })

    expect(has(result, 'MISSING_FX')).toBe(true)
    expect(has(result, 'MISSING_RESOURCE')).toBe(true)
    expect(result.totals).toBeNull()
  })

  it('rejects duplicate configuration records and wrong allocation modes', () => {
    expect(
      has(
        calc(input => {
          input.snapshot.profiles.push(structuredClone(input.snapshot.profiles[0]))
        }),
        'DUPLICATE_ID'
      )
    ).toBe(true)
    expect(
      has(
        calc(input => {
          input.request.lines[0].allocationMode = 'dedicated'
        }),
        'POLICY_MISMATCH'
      )
    ).toBe(true)
  })

  it('zero net retains null margin rate and requires review', () => {
    const result = calc(input => {
      input.request.adjustments[0].rate = '1'
    })

    expect(result.totals?.net).toBe('0.00')
    expect(result.totals?.marginRate).toBeNull()
    expect(result.reviewStatus).toBe('requires_review')
  })

  it('rejects impossible dates, fractional license quantities and unsupported financial fields', () => {
    expect(
      calc(input => {
        input.request.quoteDate = '2026-02-30'
      }).calculationStatus
    ).toBe('invalid')
    expect(
      calc(input => {
        input.request.lines[0].assignments[0].quantity = '0.5'
      }).calculationStatus
    ).toBe('invalid')
    const request = { ...sample().request, feePercentOfRevenue: '0.1' }

    expect(calculatePricingV3({ ...sample(), request }).calculationStatus).toBe('invalid')
  })

  it('rounds exactly half a cent HALF_UP without binary float artifacts', () => {
    const result = calc(input => {
      input.snapshot.profiles[0].requiredCoverages = ['human_salary']
      input.request.lines[0].assignments = []
      input.request.duration.periods = 1
      input.request.adjustments = []
      input.snapshot.profiles[0].cost!.amount = '0.01'
      input.snapshot.profiles[0].cost!.localization = { kind: 'specific', country: 'CO' }
      input.snapshot.marketFactors[0].factor = '1'
      input.snapshot.pricingPolicies[0].rate = '0'
    })

    expect(result.totals?.cost).toBe('0.01')
    expect(result.totals?.net).toBe('0.01')
  })

  it('CLI returns review exit 3 with clean JSON; ignores no supplied switches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-review-'))
    const path = join(dir, 'review.json')
    const input = sample()

    input.snapshot.pricingPolicies[0].minimumMargin = '0.6'

    try {
      writeFileSync(path, JSON.stringify(input))

      const cli = (...args: string[]) =>
        spawnSync(
          resolve(root, 'node_modules/.bin/tsx'),
          [resolve(root, 'scripts/commercial/pricing-v3.ts'), ...args],
          { cwd: dir, encoding: 'utf8' }
        )

      const result = cli('calculate', '--input', path)

      expect(result.status).toBe(3)
      expect(result.stderr).toBe('')
      expect(JSON.parse(result.stdout).result.reviewStatus).toBe('requires_review')
      expect(cli('calculate', '--input', path, '--query', 'silently ignored?').status).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('Frozen artifacts, projections and CLI parity', () => {
  it('digest ignores execution timestamp and JSON property order; replay rejects changed inputs/results/version', () => {
    const a = runPricingV3(sample(), '2026-01-01').artifact!
    const b = runPricingV3(sample(), '2026-02-01').artifact!

    expect(a.replayDigest).toBe(b.replayDigest)
    expect(replayPricingV3(a).semantic.result).toEqual(a.semantic.result)

    for (const mutate of [
      (item: typeof a) => {
        item.semantic.input.snapshot.resources[0].amount = '900'
      },
      (item: typeof a) => {
        item.semantic.result.reviewStatus = 'requires_review'
      },
      (item: typeof a) => {
        item.semantic.engineVersion = 'unavailable-version'
      }
    ]) {
      const changed = structuredClone(a)

      mutate(changed)
      expect(() => replayPricingV3(changed)).toThrow('REPLAY_MISMATCH')
    }
  })

  it('client allowlist removes cost, margin, factors, sources, policies and diagnostics', () => {
    const input = sample()

    input.snapshot.profiles[0].cost!.source.reference = 'private-personal-cost-record'
    input.request.lines[0].notApplicable.push({ coverage: 'extra-coverage', reason: 'private-finance-exclusion-note' })
    const artifact = runPricingV3(input).artifact!
    const view = projectPricingV3ForClient(artifact)
    const output = JSON.stringify(view)

    for (const secret of [
      'private-personal-cost-record',
      'private-finance-exclusion-note',
      'cost',
      'margin',
      'factor',
      'source',
      'trace',
      'minimumMargin',
      'diagnostics'
    ])
      expect(output).not.toContain(secret)
    expect(view.documentType).toBe('draft_estimate')
    expect(view.binding).toBe(false)
    expect(pricingV3ClientMarkdown(view)).toContain('Impuestos pendientes')
  })

  it('review and incomplete artifacts cannot export client proposals', () => {
    const input = sample()

    input.snapshot.pricingPolicies[0].minimumMargin = '0.6'
    expect(() => projectPricingV3ForClient(runPricingV3(input).artifact!)).toThrow(
      'EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY'
    )
    input.snapshot.profiles[0].cost = null
    expect(() => projectPricingV3ForClient(runPricingV3(input).artifact!)).toThrow(
      'EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY'
    )
  })

  it('compare flags changed currency/scope/config rather than subtracting incompatible totals', () => {
    const input = sample()
    const a = runPricingV3(input).artifact!

    input.request.outputCurrency = 'CLP'
    const comparison = comparePricingV3(a, runPricingV3(input).artifact!)

    expect(comparison.comparability).toMatchObject({ currencyMatches: false, scopeMatches: false, complete: true })
    expect(comparison.before.totals?.net).toBe('2889.00')
    expect(comparison.after.totals?.net).toBe('2889000')
  })

  it('CLI runs from another cwd, matches core, writes/replays/exports without overwriting', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-'))
    const artifact = join(dir, 'artifact.json')
    const out = join(dir, 'draft.md')

    const cli = (...args: string[]) =>
      spawnSync(resolve(root, 'node_modules/.bin/tsx'), [resolve(root, 'scripts/commercial/pricing-v3.ts'), ...args], {
        cwd: dir,
        encoding: 'utf8'
      })

    try {
      const calculation = cli('calculate', '--input', fixture, '--out', artifact)

      expect(calculation.status).toBe(0)
      expect(calculation.stderr).toBe('')
      expect(JSON.parse(calculation.stdout).result).toEqual(calculatePricingV3(sample()))
      expect(cli('replay', '--input', artifact).status).toBe(0)
      expect(cli('explain', '--input', artifact).status).toBe(0)
      expect(cli('export', '--input', artifact, '--out', out).status).toBe(0)
      expect(readFileSync(out, 'utf8')).not.toContain('margin')
      expect(cli('export', '--input', artifact, '--out', out).status).toBe(1)
      expect(cli('calculate', '--input', join(dir, 'non-existent.json')).stderr).not.toContain(dir)

      const pending = cli(
        'calculate',
        '--input',
        resolve(root, 'data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json')
      )

      expect(pending.status).toBe(2)
      expect(JSON.parse(pending.stdout).result.totals).toBeNull()
      const catalog = cli('catalog', 'search', '--query', 'Consultor HubSpot')

      expect(JSON.parse(catalog.stdout).resolution).toBe('ambiguous')
      expect(JSON.parse(catalog.stdout).candidates).toHaveLength(2)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
