// The state matrix seeded by the migration is the one TypeScript declares (TASK-2025).
//
// This reads the seed from the text of the migration, so it runs everywhere, without a database. The same comparison
// against the rows a real PostgreSQL holds after applying that migration is in
// `quote-aggregate.local-postgres.test.ts` ("the state matrix in the database is the one TypeScript declares"),
// which is the one that proves the seed was actually inserted.
import { describe, expect, it } from 'vitest'

import { QUOTER_INITIAL_ORIGIN, QUOTER_QUOTE_STATES, QUOTER_TERMINAL_STATES, QUOTER_TRANSITIONS, findQuoterTransition } from '../state-machine'

import { readQuoterMigrationUp } from './migration-sql'

const seed = () => {
  const sql = readQuoterMigrationUp('quoter-quote-aggregate')

  if (!sql) throw new Error('The migration of the quote aggregate does not exist')

  const start = sql.indexOf('INSERT INTO greenhouse_commercial.quoter_state_matrix')
  const block = sql.slice(start, sql.indexOf(';', start))

  return [...block.matchAll(/\('([a-z]+)', '([a-z]+)', (true|false)\)/g)].map(match => ({
    from: match[1],
    to: match[2],
    humanGate: match[3] === 'true'
  }))
}

const key = (transition: { from: string; to: string; humanGate: boolean }) => `${transition.from}>${transition.to}:${transition.humanGate}`

describe('quoter state machine', () => {
  it('the seed of the migration and the matrix of TypeScript are the same pairs', () => {
    expect(seed().map(key).sort()).toEqual(QUOTER_TRANSITIONS.map(key).sort())
  })

  it('no pair is declared twice, and every pair moves between declared states', () => {
    const pairs = QUOTER_TRANSITIONS.map(transition => `${transition.from}>${transition.to}`)

    expect(new Set(pairs).size).toBe(pairs.length)

    for (const transition of QUOTER_TRANSITIONS) {
      expect([QUOTER_INITIAL_ORIGIN, ...QUOTER_QUOTE_STATES]).toContain(transition.from)
      expect(QUOTER_QUOTE_STATES).toContain(transition.to)
    }
  })

  it('a quote is born a draft, nothing leaves a terminal state, and nothing goes back to draft', () => {
    expect(QUOTER_TRANSITIONS.filter(transition => transition.from === QUOTER_INITIAL_ORIGIN).map(transition => transition.to)).toEqual(['draft'])
    expect(QUOTER_TRANSITIONS.filter(transition => QUOTER_TERMINAL_STATES.some(state => state === transition.from))).toEqual([])
    expect(QUOTER_TRANSITIONS.filter(transition => transition.to === 'draft' && transition.from !== QUOTER_INITIAL_ORIGIN)).toEqual([])
    expect(findQuoterTransition('issued', 'draft')).toBeUndefined()
  })

  it('every state that is not terminal can be withdrawn', () => {
    for (const state of QUOTER_QUOTE_STATES.filter(candidate => !QUOTER_TERMINAL_STATES.includes(candidate)))
      expect(findQuoterTransition(state, 'withdrawn'), state).toBeDefined()
  })
})
