import { randomUUID } from 'node:crypto'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import { pgGetApplicableCompensationVersionsForPeriod } from './postgres-store'

/**
 * TASK-872 Slice 4 — Anti-regression tests for the payroll engine gate.
 *
 * Validates that the flag PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED toggles the
 * `workforce_intake_status = 'completed'` filter on
 * `pgGetApplicableCompensationVersionsForPeriod`.
 *
 * Behavioral contract:
 * - Flag false (default) → reader returns ALL active members regardless of intake.
 * - Flag true → reader excludes pending_intake / in_review members.
 * - Legacy members default 'completed' → unchanged across flag toggle.
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const RUN_ID = `t872-payroll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const PERIOD_START = '2026-05-01'
const PERIOD_END = '2026-05-31'

const seededMemberIds: string[] = []

const seedMember = async (params: {
  workforceIntakeStatus: 'pending_intake' | 'in_review' | 'completed'
  active?: boolean
}): Promise<string> => {
  const memberId = randomUUID()
  const displayName = `${RUN_ID}-${params.workforceIntakeStatus}-${memberId.slice(0, 8)}`

  await query(
    `INSERT INTO greenhouse_core.members (
       member_id, display_name, primary_email,
       active, assignable, status, workforce_intake_status,
       contract_type, pay_regime,
       created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, TRUE, 'active', $5, 'indefinido', 'chile',
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [memberId, displayName, `${displayName}@efeoncepro.com`, params.active ?? true, params.workforceIntakeStatus]
  )

  // Seed a compensation_version so it appears in the reader output
  const versionId = randomUUID()

  await query(
    `INSERT INTO greenhouse_payroll.compensation_versions (
       version_id, member_id, version, pay_regime, currency, base_salary,
       contract_type, effective_from, effective_to, is_current,
       afp_name, afp_rate, afp_cotizacion_rate, afp_comision_rate,
       health_system, health_plan_uf, unemployment_rate,
       created_at
     )
     VALUES ($1, $2, 1, 'chile', 'CLP', 1000000, 'indefinido', $3::date, NULL, TRUE,
             'Modelo', 11.5, 10, 1.5, 'fonasa', 0, 0.6,
             CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`,
    [versionId, memberId, PERIOD_START]
  )

  seededMemberIds.push(memberId)

  return memberId
}

const cleanupSeededMembers = async () => {
  // Delete compensation_versions first (FK to members)
  for (const memberId of seededMemberIds) {
    try {
      await query(`DELETE FROM greenhouse_payroll.compensation_versions WHERE member_id = $1`, [memberId])
    } catch {
      // best-effort
    }

    try {
      await query(`UPDATE greenhouse_core.members SET active = FALSE WHERE member_id = $1`, [memberId])
    } catch {
      // best-effort
    }
  }
}

/**
 * Pre-flight cleanup: soft-disable any t872 test fixtures left over from prior
 * interrupted runs (vitest crash, ctrl+C, timeout) BEFORE creating new ones.
 *
 * Defense in depth — afterAll cleanup is fragile because it only runs on clean
 * exit. This beforeAll sweep guarantees a clean slate even if previous runs
 * accumulated leftover fixtures.
 */
const cleanupPriorTestFixtures = async () => {
  try {
    await query(
      `DELETE FROM greenhouse_payroll.compensation_versions WHERE member_id IN (
        SELECT member_id FROM greenhouse_core.members
        WHERE display_name LIKE 't872-payroll-%' OR primary_email LIKE 't872-payroll-%@efeoncepro.com'
      )`
    )
  } catch {
    // best-effort
  }

  try {
    await query(
      `UPDATE greenhouse_core.members
       SET active = FALSE, status = 'inactive', updated_at = NOW()
       WHERE active = TRUE
         AND (display_name LIKE 't872-payroll-%' OR primary_email LIKE 't872-payroll-%@efeoncepro.com')`
    )
  } catch {
    // best-effort
  }
}

describe.skipIf(!hasPgConfig)('Payroll workforce intake gate (TASK-872 Slice 4)', () => {
  beforeAll(async () => {
    // Pre-flight: sweep prior leftover t872 fixtures (defensive)
    await cleanupPriorTestFixtures()
  })

  beforeEach(() => {
    delete process.env.PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED
  })

  afterEach(() => {
    delete process.env.PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED
  })

  afterAll(async () => {
    await cleanupSeededMembers()
  })

  describe('flag DEFAULT (env undefined / false)', () => {
    it('includes pending_intake members (legacy behavior preserved)', async () => {
      const pendingId = await seedMember({ workforceIntakeStatus: 'pending_intake' })

      // No flag → legacy: pending_intake should be included
      const rows = await pgGetApplicableCompensationVersionsForPeriod(PERIOD_START, PERIOD_END)
      const memberIds = rows.map(r => r.memberId)

      expect(memberIds).toContain(pendingId)
    })

    it('includes completed members (backward compat — legacy default)', async () => {
      const completedId = await seedMember({ workforceIntakeStatus: 'completed' })

      const rows = await pgGetApplicableCompensationVersionsForPeriod(PERIOD_START, PERIOD_END)
      const memberIds = rows.map(r => r.memberId)

      expect(memberIds).toContain(completedId)
    })
  })

  describe('flag PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true', () => {
    beforeEach(() => {
      process.env.PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED = 'true'
    })

    it('EXCLUDES pending_intake members (Felipe scenario)', async () => {
      const pendingId = await seedMember({ workforceIntakeStatus: 'pending_intake' })

      const rows = await pgGetApplicableCompensationVersionsForPeriod(PERIOD_START, PERIOD_END)
      const memberIds = rows.map(r => r.memberId)

      expect(memberIds).not.toContain(pendingId)
    })

    it('EXCLUDES in_review members (intermediate state)', async () => {
      const reviewId = await seedMember({ workforceIntakeStatus: 'in_review' })

      const rows = await pgGetApplicableCompensationVersionsForPeriod(PERIOD_START, PERIOD_END)
      const memberIds = rows.map(r => r.memberId)

      expect(memberIds).not.toContain(reviewId)
    })

    it('INCLUDES completed members (legacy 7 members + backfilled — no behavioral change)', async () => {
      const completedId = await seedMember({ workforceIntakeStatus: 'completed' })

      const rows = await pgGetApplicableCompensationVersionsForPeriod(PERIOD_START, PERIOD_END)
      const memberIds = rows.map(r => r.memberId)

      expect(memberIds).toContain(completedId)
    })

    it('respects existing filters (inactive members excluded regardless of flag)', async () => {
      const inactivePending = await seedMember({ workforceIntakeStatus: 'pending_intake', active: false })

      const rows = await pgGetApplicableCompensationVersionsForPeriod(PERIOD_START, PERIOD_END)
      const memberIds = rows.map(r => r.memberId)

      // active=FALSE excluded by existing gate; flag doesn't change that
      expect(memberIds).not.toContain(inactivePending)
    })
  })
})
