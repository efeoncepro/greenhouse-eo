/**
 * TASK-850 — Canonical registry of preflight check definitions.
 *
 * Single source of truth that wires the 12 check id → run function.
 * The CLI imports this registry; orchestrator workflows (TASK-851) and
 * dashboard endpoints (TASK-855) consume the same registry — never
 * hand-roll their own set.
 */

import 'server-only'

import { checkAzureWifSubject } from './checks/azure-wif-subject'
import { checkCiGreen } from './checks/ci-green'
import { checkGcpWifSubject } from './checks/gcp-wif-subject'
import { checkPendingWithoutJobs } from './checks/pending-without-jobs'
import { checkPlaywrightSmoke } from './checks/playwright-smoke'
import { checkPostgresHealth } from './checks/postgres-health'
import { checkPostgresMigrations } from './checks/postgres-migrations'
import { checkReleaseBatchPolicy } from './checks/release-batch-policy'
import { checkSentryCriticalIssues } from './checks/sentry-critical-issues'
import { checkStaleApprovals } from './checks/stale-approvals'
import { checkTargetShaExists } from './checks/target-sha-exists'
import { checkVercelReadiness } from './checks/vercel-readiness'
import type { PreflightCheckDefinition } from './runner'

export const PREFLIGHT_CHECK_REGISTRY: readonly PreflightCheckDefinition[] = Object.freeze([
  // 6s default timeout per check unless explicitly higher (subprocess checks).
  { id: 'target_sha_exists', run: checkTargetShaExists },
  { id: 'ci_green', run: checkCiGreen },
  { id: 'playwright_smoke', run: checkPlaywrightSmoke },
  { id: 'release_batch_policy', timeoutMs: 12_000, run: checkReleaseBatchPolicy },
  { id: 'stale_approvals', run: checkStaleApprovals },
  { id: 'pending_without_jobs', run: checkPendingWithoutJobs },
  { id: 'vercel_readiness', run: checkVercelReadiness },
  { id: 'postgres_health', timeoutMs: 35_000, run: checkPostgresHealth },
  { id: 'postgres_migrations', timeoutMs: 35_000, run: checkPostgresMigrations },
  { id: 'gcp_wif_subject', timeoutMs: 12_000, run: checkGcpWifSubject },
  { id: 'azure_wif_subject', timeoutMs: 12_000, run: checkAzureWifSubject },
  { id: 'sentry_critical_issues', run: checkSentryCriticalIssues }
])
