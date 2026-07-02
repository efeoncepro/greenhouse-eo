import { describe, expect, it } from 'vitest'

import {
  applyNameNormalizationPolicy,
  resolveNameNormalizationPolicy,
  splitFullName,
} from '../name-normalization'

const POLICY = {
  namePolicy: {
    mode: 'split_full_name',
    sourceField: 'fullName',
    firstNameField: 'firstName',
    lastNameField: 'lastName',
    confidenceField: 'nameParseConfidence',
  },
}

describe('splitFullName', () => {
  it('normalizes whitespace and splits a two-token name', () => {
    expect(splitFullName('  Ana   Silva  ')).toEqual({
      fullName: 'Ana Silva',
      firstName: 'Ana',
      lastName: 'Silva',
      confidence: 'two_tokens',
    })
  })

  it('keeps one-token names without fabricating lastName', () => {
    expect(splitFullName('Madonna')).toEqual({
      fullName: 'Madonna',
      firstName: 'Madonna',
      lastName: null,
      confidence: 'single_token',
    })
  })

  it('uses the first token as firstName and the rest as lastName for multi-token names', () => {
    expect(splitFullName('Maria Jose Perez Soto')).toEqual({
      fullName: 'Maria Jose Perez Soto',
      firstName: 'Maria',
      lastName: 'Jose Perez Soto',
      confidence: 'multi_token',
    })
  })
})

describe('resolveNameNormalizationPolicy', () => {
  it('defaults to off when no policy exists or policy is invalid', () => {
    expect(resolveNameNormalizationPolicy({}).mode).toBe('off')
    expect(resolveNameNormalizationPolicy({ namePolicy: { mode: 'regex_free_for_all' } }).mode).toBe('off')
  })
})

describe('applyNameNormalizationPolicy', () => {
  it('is a no-op when policy is off', () => {
    const fields = { fullName: 'Ana Silva' }

    expect(applyNameNormalizationPolicy({}, fields)).toBe(fields)
  })

  it('adds derived firstName and lastName while preserving fullName', () => {
    expect(applyNameNormalizationPolicy(POLICY, { fullName: '  Ana   Silva  ', email: 'ana@example.com' })).toEqual({
      fullName: 'Ana Silva',
      firstName: 'Ana',
      lastName: 'Silva',
      nameParseConfidence: 'two_tokens',
      email: 'ana@example.com',
    })
  })

  it('does not overwrite explicit firstName or lastName fields', () => {
    expect(
      applyNameNormalizationPolicy(POLICY, {
        fullName: 'Ana Silva',
        firstName: 'Anita',
        lastName: 'Silveira',
      }),
    ).toEqual({
      fullName: 'Ana Silva',
      firstName: 'Anita',
      lastName: 'Silveira',
      nameParseConfidence: 'two_tokens',
    })
  })

  it('does not create lastName for a single-token fullName', () => {
    expect(applyNameNormalizationPolicy(POLICY, { fullName: 'Madonna' })).toEqual({
      fullName: 'Madonna',
      firstName: 'Madonna',
      nameParseConfidence: 'single_token',
    })
  })
})
