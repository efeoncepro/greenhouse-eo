import { mkdtemp, chmod, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import type { GoogleAdsClient } from '../../src/lib/growth/google-ads/client'
import { buildWritePlan } from '../../src/lib/growth/google-ads/writes'
import { GoogleAdsError } from '../../src/lib/growth/google-ads/contracts'

import { validateCredential } from './auth'
import { runGoogleAdsCli } from './cli'
import { applyOnce } from './journal'

describe('Google Ads CLI boundaries', () => {
  it('discovers the read/write catalog without a credential', async () => {
    const tokenProvider = vi.fn(async () => { throw Error('must not run') })
    const r = await runGoogleAdsCli(['discover'], { tokenProvider })

    expect(r.exitCode).toBe(0)
    expect(r.output).toMatchObject({ data: { readOnly: false, contractVersion: 'google-ads-agent.v1' } })
    expect(tokenProvider).not.toHaveBeenCalled()
  })

  it.each([
    ['campaigns', 'list', '--customer-id', '123'], ['campaigns', 'list', '--token', 'private'],
    ['report', 'get', '--query', 'SELECT private'], ['write', 'apply', '--input', 'private.json'],
    ['ads', 'delete'], ['campaigns', 'list', '--days', '10'], ['report', 'get', '--days', '91'],
    ['report', 'get', '--since', '', '--until', ''], ['account', 'get', '--pages', '0'], ['toString']
  ].map(args => ({ args })))('rejects invalid arguments before authentication $args', async ({ args }) => {
    const tokenProvider = vi.fn(async () => 'never')
    const r = await runGoogleAdsCli(args, { tokenProvider })

    expect(r.exitCode).not.toBe(0)
    expect(tokenProvider).not.toHaveBeenCalled()
    expect(JSON.stringify(r.output)).not.toContain('private.json')
  })

  it('compiles preview input without a network operation', async () => {
    const tokenProvider = vi.fn(async () => 'never')
    const r = await runGoogleAdsCli(['write', 'plan', '--input', 'private.json'], { tokenProvider, readInput: async () => ({ operation: 'campaign.update', resourceName: 'customers/6862539491/campaigns/1', fields: { status: 'PAUSED' } }) })

    expect(r.exitCode).toBe(0)
    expect(tokenProvider).not.toHaveBeenCalled()
    expect(r.output).toMatchObject({ data: { endpoint: 'campaigns:mutate' } })
  })

  it('rejects credential metadata for a different user or target', () => {
    expect(() => validateCredential({ authorized_email: 'other@example.com', target_customer_id: '123' })).toThrow()
  })

  it.each(['ya29.SYNTHETIC_MARKER', 'GOCSPX-SYNTHETIC_MARKER', '1//SYNTHETIC_MARKER'])('does not print credentials accidentally placed in a name', async name => {
    const r = await runGoogleAdsCli(['write', 'plan', '--input', 'private.json'], { readInput: async () => ({ operation: 'campaignBudget.create', fields: { name, amountMicros: '1000000' } }) })

    expect(r.exitCode).toBe(2)
    expect(JSON.stringify(r.output)).not.toContain(name)
  })

  it('never calls a mismatching readback verified', async () => {
    const plan = buildWritePlan({ operation: 'campaign.update', resourceName: 'customers/6862539491/campaigns/1', fields: { status: 'PAUSED' } })
    const client = { readback: vi.fn(async () => ({ verification: { complete: true, matched: false } })) } as unknown as GoogleAdsClient
    const r = await runGoogleAdsCli(['write', 'verify', '--receipt', 'private.json'], { client, readInput: async () => ({ plan, result: { resourceName: 'customers/6862539491/campaigns/1' } }) })

    expect(r.exitCode).toBe(8)
    expect(r.output.ok).toBe(false)
  })
})

describe('Durable write dispatch', () => {
  const input = { operation: 'campaignBudget.create', fields: { name: 'Budget', amountMicros: '1000000' } }

  it('reserves a digest before dispatch and blocks a second apply', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ads-journal-'))

    await chmod(directory, 0o700)
    const calls = { verifyIdentity: vi.fn(async () => ({})), executeWrite: vi.fn(async (_input: unknown, o: { validateOnly: boolean }) => ({ validated: o.validateOnly, resourceName: 'customers/6862539491/campaignBudgets/1' })) }
    const client = calls as unknown as GoogleAdsClient

    try {
      const plan = buildWritePlan(input)
      const first = await applyOnce(input, plan.digest, client, directory)

      expect(JSON.parse(await readFile(first.receiptPath, 'utf8')).state).toBe('accepted')
      await expect(applyOnce(input, plan.digest, client, directory)).rejects.toMatchObject({ code: 'WRITE_DIGEST_ALREADY_RESERVED' })
      expect(calls.executeWrite).toHaveBeenCalledTimes(2) // one validation, one mutation
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  it('retains unknown after a timeout and never retries the mutation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ads-journal-'))

    await chmod(directory, 0o700)
    const executeWrite = vi.fn().mockResolvedValueOnce({ validated: true }).mockRejectedValueOnce(new GoogleAdsError('TRANSPORT_OUTCOME_UNKNOWN', 5))
    const client = { verifyIdentity: async () => ({}), executeWrite } as unknown as GoogleAdsClient

    try {
      const plan = buildWritePlan(input)

      await expect(applyOnce(input, plan.digest, client, directory)).rejects.toMatchObject({ code: 'WRITE_RESULT_UNKNOWN_NO_RETRY', exitCode: 7 })
      expect(JSON.parse(await readFile(join(directory, plan.digest + '.json'), 'utf8')).state).toBe('unknown')
      expect(executeWrite).toHaveBeenCalledTimes(2)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
