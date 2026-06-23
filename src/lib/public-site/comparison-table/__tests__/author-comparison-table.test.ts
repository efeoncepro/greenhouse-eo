import { beforeEach, describe, expect, it, vi } from 'vitest'

// Neutralize the server-only guard + isolate the Secret Manager dependency so the
// command's orchestration is unit-testable (the heavy secret/fetch paths are gated).
vi.mock('server-only', () => ({}))
vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecretByRef: vi.fn(async () => null),
}))

import { COMPARISON_TABLE_SCHEMA_VERSION } from '../manifest-schema'
import {
  authorComparisonTable,
  ComparisonTableAuthorError,
  COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION,
  COMPARISON_TABLE_BRIDGE_ROUTE,
} from '../author-comparison-table'

const validManifest = {
  schemaVersion: COMPARISON_TABLE_SCHEMA_VERSION,
  columnA: { title: 'AGENCIA TRADICIONAL' },
  columnB: { isBest: true, bestLabel: 'BEST OPTION' },
  rows: [{ dimension: 'Producción', cellA: 'ad-hoc', cellB: '7 fases', cellBIcon: 'check' }],
}

describe('authorComparisonTable', () => {
  beforeEach(() => {
    // Isolate from any ambient .env (the command reads these directly).
    delete process.env.PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED
    delete process.env.PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET
    delete process.env.PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD
  })

  it('dry_run builds a signed plan without writing (redacted signature, no network)', async () => {
    const plan = await authorComparisonTable({
      pageId: '249582',
      manifest: validManifest,
      actor: 'user-agent-e2e-001',
      environment: 'staging',
    })

    expect(plan.mode).toBe('dry_run')
    expect(plan.sendsWordPressWrite).toBe(false)
    expect(plan.contractVersion).toBe(COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION)
    expect(plan.route).toBe(COMPARISON_TABLE_BRIDGE_ROUTE)
    expect(plan.greenhouseManifestId).toContain('249582')
    expect(plan.contentHash).toMatch(/^[0-9a-f]{64}$/)
    // signature header is redacted, never leaked
    expect(plan.redactedHeaders['X-Greenhouse-Signature']).toContain('…redacted')
    expect(plan.result).toBeUndefined()
  })

  it('rejects an invalid manifest before signing/writing', async () => {
    await expect(
      authorComparisonTable({
        pageId: '249582',
        manifest: { schemaVersion: 'comparisonTable.v1', rows: [] },
        actor: 'u',
        environment: 'staging',
      })
    ).rejects.toMatchObject({ code: 'comparison_table_manifest_invalid', statusCode: 422 })
  })

  it('execute is gated: throws comparison_table_writes_disabled when flag is OFF', async () => {
    await expect(
      authorComparisonTable({
        pageId: '249582',
        manifest: validManifest,
        actor: 'u',
        environment: 'staging',
        mode: 'execute',
      })
    ).rejects.toMatchObject({ code: 'comparison_table_writes_disabled', statusCode: 409 })
  })

  it('execute with flag ON but no secret throws comparison_table_shared_secret_missing', async () => {
    process.env.PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED = 'true'
    await expect(
      authorComparisonTable({
        pageId: '249582',
        manifest: validManifest,
        actor: 'u',
        environment: 'staging',
        mode: 'execute',
      })
    ).rejects.toMatchObject({ code: 'comparison_table_shared_secret_missing' })
  })

  it('ComparisonTableAuthorError carries issues for invalid manifests', async () => {
    try {
      await authorComparisonTable({
        pageId: 'p',
        manifest: { schemaVersion: COMPARISON_TABLE_SCHEMA_VERSION, columnA: { title: '' }, columnB: {}, rows: [] },
        actor: 'u',
        environment: 'staging',
      })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ComparisonTableAuthorError)

      if (error instanceof ComparisonTableAuthorError) {
        expect(error.issues?.length).toBeGreaterThan(0)
      }
    }
  })
})
