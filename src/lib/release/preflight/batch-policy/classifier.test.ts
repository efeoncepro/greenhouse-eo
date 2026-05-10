import { describe, expect, it } from 'vitest'

import { classifyReleaseBatch, decisionToSeverity } from './classifier'

describe('classifyReleaseBatch', () => {
  it('returns ship for empty diff', () => {
    const result = classifyReleaseBatch({ changedFiles: [], commitBodyText: '' })

    expect(result.decision).toBe('ship')
    expect(result.filesChanged).toBe(0)
    expect(result.reasons[0]).toContain('Diff vacio')
  })

  it('returns ship for docs-only diff', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['docs/architecture/X.md', 'README.md', 'CLAUDE.md'],
      commitBodyText: 'docs: update'
    })

    expect(result.decision).toBe('ship')
    expect(result.domains.docs).toBe(3)
    expect(result.sensitivePathsMatched).toHaveLength(0)
    expect(result.irreversibilityFlags).toHaveLength(0)
  })

  it('returns ship for ui-only diff', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['src/components/Button.tsx', 'src/views/dashboard/Dashboard.tsx'],
      commitBodyText: 'feat(ui): button'
    })

    expect(result.decision).toBe('ship')
    expect(result.domains.ui).toBe(2)
  })

  it('returns requires_break_glass for migrations alone (irreversible)', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['migrations/20260510_x.sql'],
      commitBodyText: 'feat(db): migration'
    })

    expect(result.decision).toBe('requires_break_glass')
    expect(result.domains.db_migrations).toBe(1)
    expect(result.irreversibilityFlags.some(f => f.includes('db_migrations'))).toBe(true)
  })

  it('returns split_batch for payroll + finance independent mix without coupling marker', () => {
    const result = classifyReleaseBatch({
      changedFiles: [
        'src/lib/payroll/store.ts',
        'src/lib/finance/expense-payments-reader.ts'
      ],
      commitBodyText: 'feat: payroll + finance unrelated'
    })

    expect(result.decision).toBe('split_batch')
    expect(result.reasons.some(r => r.includes('payroll') && r.includes('finance'))).toBe(true)
  })

  it('returns requires_break_glass for payroll + finance with [release-coupled] marker (irreversibility wins over split)', () => {
    const result = classifyReleaseBatch({
      changedFiles: [
        'src/lib/payroll/store.ts',
        'src/lib/finance/expense-payments-reader.ts'
      ],
      commitBodyText:
        'feat: payroll + finance coupled [release-coupled: nuevo flow finiquito requiere ambos]'
    })

    // Coupling marker bypasses split_batch; payroll+finance both irreversible
    // → requires_break_glass.
    expect(result.decision).toBe('requires_break_glass')
  })

  it('returns split_batch for auth_access + cloud_release without coupling', () => {
    const result = classifyReleaseBatch({
      changedFiles: [
        'src/lib/auth/require-server-session.ts',
        '.github/workflows/deploy.yml'
      ],
      commitBodyText: 'fix: auth + workflows'
    })

    expect(result.decision).toBe('split_batch')
  })

  it('returns ship for tests-only diff', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['src/lib/payroll/store.test.ts', 'tests/e2e/smoke/payroll.spec.ts'],
      commitBodyText: 'test: increase coverage'
    })

    // .test/.spec patterns win over payroll path → tests domain
    expect(result.decision).toBe('ship')
    expect(result.domains.tests).toBe(2)
  })

  it('flags sensitive paths in evidence even when decision is ship', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['src/components/Button.tsx', 'src/lib/finance/x.ts'],
      commitBodyText: 'mixed'
    })

    // finance is irreversible → requires_break_glass (single domain)
    expect(result.decision).toBe('requires_break_glass')
    expect(result.sensitivePathsMatched).toContain('src/lib/finance/x.ts')
  })

  it('classifies entitlements-catalog.ts as auth_access (not generic config)', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['src/config/entitlements-catalog.ts'],
      commitBodyText: 'feat: capabilities'
    })

    expect(result.domains.auth_access).toBe(1)
    expect(result.decision).toBe('requires_break_glass')
  })

  it('classifies vercel.json as cloud_release', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['vercel.json'],
      commitBodyText: 'chore: vercel'
    })

    expect(result.domains.cloud_release).toBe(1)
    expect(result.decision).toBe('requires_break_glass')
  })

  it('classifies unknown paths as unclassified', () => {
    const result = classifyReleaseBatch({
      changedFiles: ['weirdpath.txt'],
      commitBodyText: 'misc'
    })

    expect(result.domains.unclassified).toBe(1)
    expect(result.decision).toBe('ship')
  })
})

describe('decisionToSeverity', () => {
  it('ship → ok', () => {
    expect(decisionToSeverity('ship', false)).toBe('ok')
    expect(decisionToSeverity('ship', true)).toBe('ok')
  })

  it('split_batch → error always (cannot override structural mix)', () => {
    expect(decisionToSeverity('split_batch', false)).toBe('error')
    expect(decisionToSeverity('split_batch', true)).toBe('warning')
  })

  it('requires_break_glass → error unless overridden', () => {
    expect(decisionToSeverity('requires_break_glass', false)).toBe('error')
    expect(decisionToSeverity('requires_break_glass', true)).toBe('warning')
  })
})
