import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'migrations/20260819072130586_task-1746-assessment-access-recovery.sql'),
  'utf8',
)

describe('TASK-1746 migration contract', () => {
  it('creates a mutable receipt and structurally append-only audit', () => {
    expect(migration).toContain('hiring_assessment_access_recovery (')
    expect(migration).toContain('hiring_assessment_access_recovery_event (')
    expect(migration).toContain('BEFORE UPDATE OR DELETE')
    expect(migration).toContain('prevent_assessment_access_recovery_event_mutation')
    expect(migration).toContain('emit_assessment_access_recovery_event')
    expect(migration).toContain('AFTER INSERT ON greenhouse_hiring.hiring_assessment_access_recovery')
    expect(migration).not.toContain('GRANT SELECT, INSERT ON greenhouse_hiring.hiring_assessment_access_recovery_event')
  })

  it('stores only digests and opaque token versions, never raw bearer fields', () => {
    expect(migration).toContain('idempotency_digest')
    expect(migration).toContain('request_fingerprint')
    expect(migration).toContain('token_version_id')
    expect(migration).not.toMatch(/\b(?:access_token|raw_token|access_url|recipient_email|phone|note)\s+(?:TEXT|VARCHAR)/i)
  })

  it('defers historical bearer cleanup until the safe persistence cutover', () => {
    expect(migration).toContain('Historical bearer cleanup is intentionally NOT performed here')
    expect(migration).not.toMatch(/UPDATE\s+greenhouse_notifications\.email_deliveries/i)
  })

  it('freezes receipt identity and allows only column-scoped lifecycle updates', () => {
    expect(migration).toContain('trg_hiring_assessment_access_recovery_update_guard')
    expect(migration).toContain('GRANT UPDATE (outcome, delivery_id, updated_at)')
    expect(migration).not.toMatch(/GRANT\s+SELECT,\s*INSERT,\s*UPDATE\s+ON\s+greenhouse_hiring\.hiring_assessment_access_recovery/i)
    expect(migration).toContain("OLD.outcome = 'pending_dispatch'")
    expect(migration).toContain('delivery immutable without outcome transition')
    expect(migration).toContain('updated_at cannot regress')
    expect(migration).toMatch(/delivery_id\s+UUID REFERENCES greenhouse_notifications\.email_deliveries \(delivery_id\) ON DELETE RESTRICT/)
  })

  it('validates lineage and derives event identity from the receipt', () => {
    expect(migration).toContain('assessment access recovery lineage inválida')
    expect(migration).toContain('NEW.previous_status <> canonical_assessment_status')
    expect(migration).toContain('final state mismatch')
    expect(migration).toContain('final eligibility mismatch')
    expect(migration).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(migration).toContain('consent withdrawn')
    expect(migration).toContain('assessment → application → candidate facet')
    expect(migration.match(/FOR UPDATE;/g)?.length).toBeGreaterThanOrEqual(4)
    expect(migration).toContain('populate_assessment_access_recovery_event')
    expect(migration).toContain('NEW.assessment_id := receipt.assessment_id')
  })

  it('enforces TTLs, digest shape and privileged retention purge', () => {
    expect(migration).toContain("idempotency_digest ~ '^[a-f0-9]{64}$'")
    expect(migration).toContain("expires_at <= issued_at + INTERVAL '14 days'")
    expect(migration).toContain("expires_at <= issued_at + INTERVAL '24 hours'")
    expect(migration).toContain('purge_assessment_access_recovery')
    expect(migration).toContain('REVOKE ALL ON FUNCTION')
    expect(migration).toContain('FROM PUBLIC, greenhouse_runtime')
    expect(migration).toContain("current_setting('greenhouse.assessment_recovery_retention_purge', true) = 'on'")
    expect(migration).toContain('Down blocked: recovery audit exists')
    expect(migration).toMatch(/OR EXISTS \(SELECT 1 FROM greenhouse_hiring\.hiring_assessment_access_recovery_purge_audit LIMIT 1\)/)
  })

  it('reclassifies live retention and uses built-in hashing', () => {
    expect(migration).toContain('trg_hiring_application_assessment_recovery_retention')
    expect(migration).toContain('trg_candidate_facet_assessment_recovery_retention')
    expect(migration).toContain("THEN 'workforce_record'")
    expect(migration).toContain("receipt.retention_class <> 'workforce_record'")
    expect(migration).toContain('workforce recovery audit uses workforce retention')
    expect(migration).toContain("+ INTERVAL '12 months'")
    expect(migration).toContain("encode(sha256(convert_to(p_application_id, 'UTF8')), 'hex')")
    expect(migration).not.toContain('public.digest')
  })

  it('bounds in-progress recovery by the canonical live deadline', () => {
    expect(migration).toContain('assessment_access_recovery_deadline')
    expect(migration).toContain("p_started_at + INTERVAL '24 hours'")
    expect(migration).toContain("p_accommodations->>'extraMinutes'")
    expect(migration).toContain("+ INTERVAL '30 minutes'")
    expect(migration).toContain('canonical_deadline <= clock_timestamp() OR NEW.expires_at > canonical_deadline')
    expect(migration).toContain('assessment access recovery final deadline exceeded')
  })

  it('seeds separate email and manual-reveal capabilities', () => {
    expect(migration).toContain('hiring.assessment.recover_access_email')
    expect(migration).toContain('hiring.assessment.reveal_access_link')
  })
})
