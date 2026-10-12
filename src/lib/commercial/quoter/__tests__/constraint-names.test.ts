// The names the database rejects with, and the codes the quoter answers with (TASK-2025).
//
// This reads the text of the migrations, so it only SIGNALS: it catches a `RAISE` that was given a new name without
// an entry in `QUOTER_CONSTRAINT_CODES`, or an entry that no migration declares any more. What VERIFIES that a rule
// is refused under its name, and that the store turns it into its code, is the run against real PostgreSQL:
// `pnpm quoter:test:local` (`*.local-postgres.test.ts`), where every name asserted is the one the server reported.
import { describe, expect, it } from 'vitest'

import { QUOTER_CONSTRAINT_CODES, QUOTER_ERROR_CODES, QuoterError, quoterErrorFromDatabase } from '../errors'

import { readQuoterMigrations } from './migration-sql'

const sql = readQuoterMigrations().join('\n')

// Names a trigger raises with, and names a table declares.
const raised = [...sql.matchAll(/CONSTRAINT = '([a-z0-9_]+)'/g)].map(match => match[1])
const declared = [...sql.matchAll(/CONSTRAINT ([a-z0-9_]+)\s+(?:PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY)/g)].map(match => match[1])

describe('named rejections of the quoter database', () => {
  it('the migrations exist and raise by name', () => {
    expect(raised.length).toBeGreaterThan(0)
    expect(declared.length).toBeGreaterThan(0)
  })

  it('every name a trigger raises with has its code', () => {
    expect([...new Set(raised)].filter(name => !(name in QUOTER_CONSTRAINT_CODES))).toEqual([])
  })

  it('every name with a code is one a migration raises or declares', () => {
    const known = new Set([...raised, ...declared])

    expect(Object.keys(QUOTER_CONSTRAINT_CODES).filter(name => !known.has(name))).toEqual([])
  })

  it('every code is one of the closed registry', () => {
    expect(Object.values(QUOTER_CONSTRAINT_CODES).filter(code => !QUOTER_ERROR_CODES.includes(code))).toEqual([])
  })

  it('a rejection is read from the name the driver reports, never from its message', () => {
    const rejected = Object.assign(new Error('el mensaje del servidor, en el idioma que sea'), {
      code: '23514',
      constraint: 'quoter_state_transitions_issue_needs_recipient'
    })

    const mapped = quoterErrorFromDatabase(rejected, { quoteId: 'qtr-fixture' })

    expect(mapped).toBeInstanceOf(QuoterError)
    expect(mapped).toMatchObject({ code: 'recipient_required', detail: { quoteId: 'qtr-fixture', constraint: 'quoter_state_transitions_issue_needs_recipient' } })

    // A constraint of another domain, or no constraint at all, is not a rejection of the quoter.
    expect(quoterErrorFromDatabase(Object.assign(new Error('x'), { code: '23505', constraint: 'organizations_pkey' }))).toBeNull()
    expect(quoterErrorFromDatabase(new Error('connection terminated'))).toBeNull()
  })
})
