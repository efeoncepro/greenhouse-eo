import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DeckPlan } from '../../types'
import { bindDeckSlotsWith } from '../core'
import type { DeckBindingSources } from '../types'

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T

const plan = read<DeckPlan>(path.join(__dirname, '../../__tests__/fixtures/golden-proposal.json'))
const sources = read<DeckBindingSources>(path.join(__dirname, 'fixtures/sources-proposal.json'))

// El mismo par que usa `pnpm brand:deck-plan -- --bind --sources` en el manual: el plan golden de propuesta de
// TASK-1929 con las fuentes de una propuesta de ejemplo (logo del cliente, nueve logos autorizados y dos cifras).
describe('golden: propuesta ligada con fuentes de ejemplo', () => {
  it('compone y deja cada slot de datos con su rastro', () => {
    const result = bindDeckSlotsWith(plan, sources)

    expect(result.ok).toBe(true)
    expect(result.bindings.map(entry => [entry.recipeId, entry.slot, entry.status, entry.source ?? entry.reason])).toEqual([
      ['cover-proposal-orbit', 'clientLogo', 'bound', 'account-360'],
      ['content-clients', 'logos', 'bound', 'proposal-evidence'],
      ['content-clients', 'proofs', 'bound', 'proposal-evidence'],
      ['content-pricing', 'amounts', 'unbound', 'no-frozen-quote']
    ])
  })
})
