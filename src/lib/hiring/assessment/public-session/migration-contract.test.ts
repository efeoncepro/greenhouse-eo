import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'migrations/20260819072130586_task-1746-assessment-access-recovery.sql'),
  'utf8',
)

describe('TASK-1746 public assessment session migration contract', () => {
  it('adds versioned assessment credentials and binds recovery to the exact version', () => {
    expect(migration).toContain('access_token_version_id UUID')
    expect(migration).toContain('trg_hiring_assessment_access_credential_guard')
    expect(migration).toContain('rotation requires a new version')
    expect(migration).toContain('canonical_token_version_id IS DISTINCT FROM NEW.token_version_id')
  })

  it('stores only a hash for opaque browser sessions and guards immutable identity', () => {
    expect(migration).toContain('hiring_assessment_public_session (')
    expect(migration).toContain("session_token_hash      TEXT NOT NULL UNIQUE CHECK (session_token_hash ~ '^[a-f0-9]{64}$')")
    expect(migration).toContain('assessment public session immutable fields changed')
    expect(migration).not.toMatch(/(?:raw_session|session_token|access_url)\s+(?:TEXT|VARCHAR)/i)
  })

  it('validates live lineage and offers an ops-only bounded purge', () => {
    expect(migration).toContain('trg_hiring_assessment_public_session_validate')
    expect(migration).toContain('assessment_candidate_test_deadline')
    expect(migration).toContain("candidate_consent_status = 'withdrawn'")
    expect(migration).toContain('purge_expired_assessment_public_sessions')
    expect(migration).toContain('FOR UPDATE SKIP LOCKED')
    expect(migration).toContain('FROM PUBLIC, greenhouse_runtime')
    expect(migration).toContain('GRANT UPDATE (status, updated_at)')
  })

  it('separates answer and close deadlines and governs session refresh/cap', () => {
    expect(migration).toContain('assessment_candidate_test_close_deadline')
    expect(migration).toContain("p_started_at + INTERVAL '24 hours'")
    expect(migration).toContain("+ INTERVAL '30 minutes'")
    expect(migration).toContain("WHEN canonical_status IN ('assigned', 'sent') THEN canonical_token_expires_at")
    expect(migration).toContain('WHEN canonical_status IN')
    expect(migration).toContain('OFFSET 2')
    expect(migration).toContain('trg_hiring_assessment_public_session_refresh')
    expect(migration).toContain('AFTER UPDATE OF status, started_at, time_limit_minutes, accommodations_json')
    expect(migration).toContain('s.expires_at IS DISTINCT FROM canonical_expiry')
    expect(migration).toContain('canonical_expiry <= s.created_at')
    expect(migration).toContain('greenhouse.assessment_session_governed_update')
  })

  it('blocks destructive rollback after a session exists', () => {
    expect(migration).toContain('SELECT 1 FROM greenhouse_hiring.hiring_assessment_public_session LIMIT 1')
    expect(migration).toContain('DROP COLUMN IF EXISTS access_token_version_id')
  })

  it('rate-limits anonymous surfaces with a hash-only atomic bucket', () => {
    expect(migration).toContain('hiring_assessment_public_request_bucket (')
    expect(migration).toContain("'exchange_ip', 'exchange_credential'")
    expect(migration).toContain("'session_read_ip', 'session_read_credential'")
    expect(migration).toContain("'session_write_ip', 'session_write_credential'")
    expect(migration).toContain('claim_assessment_public_request_budget')
    expect(migration).toContain('ON CONFLICT (requester_digest, surface, window_started_at) DO UPDATE')
    expect(migration).toContain('hit_count < p_limit')
    expect(migration).toContain('purge_assessment_public_request_buckets')
    expect(migration).toContain('run_assessment_public_access_retention')
    expect(migration).toContain('TO greenhouse_runtime, greenhouse_ops')
    expect(migration).toContain("window_started_at < clock_timestamp() - INTERVAL '24 hours'")
    expect(migration).not.toMatch(/(?:raw_ip|ip_address|access_token|session_token)\s+(?:TEXT|VARCHAR)/i)
  })
})
