import { describe, expect, it } from 'vitest'

import { getTemplateWithModules, listCompetencies, listTemplates } from './store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live regression guard for TASK-1360 Slice 1-2 seeds (competency catalog + Account Manager
// template). Read-only against seeded data; skip in CI without PG.
describe.skipIf(!hasPgConfig)('assessment catalog + templates — live PG (TASK-1360)', () => {
  it('seeds the 16 competencies across 3 orthogonal categories', async () => {
    const all = await listCompetencies()

    expect(all.length).toBeGreaterThanOrEqual(16)
    expect(all.filter((c) => c.category === 'skill').length).toBeGreaterThanOrEqual(9)
    expect(all.filter((c) => c.category === 'attitudinal').length).toBeGreaterThanOrEqual(4)
    expect(all.filter((c) => c.category === 'aptitude').length).toBeGreaterThanOrEqual(3)
    // The 4 operator-requested Account Manager skills exist.
    const keys = new Set(all.map((c) => c.key))

    for (const k of ['seo', 'copywriting', 'leadership', 'vendor_management']) expect(keys.has(k)).toBe(true)
  })

  it('category filter is orthogonal to level (no combined enum)', async () => {
    const skills = await listCompetencies('skill')

    expect(skills.every((c) => c.category === 'skill')).toBe(true)
  })

  it('seeds the Account Manager L2 template with 9 weighted modules summing to 100', async () => {
    const templates = await listTemplates()

    expect(templates.some((t) => t.roleHint === 'account_manager')).toBe(true)

    const amt = await getTemplateWithModules('atpl-account-manager-l2')

    expect(amt).not.toBeNull()
    expect(amt?.name).toBe('Account Manager L2')
    expect(amt?.modules.length).toBe(9)
    const total = (amt?.modules ?? []).reduce((sum, m) => sum + m.weight, 0)

    expect(total).toBe(100)
  })
})
