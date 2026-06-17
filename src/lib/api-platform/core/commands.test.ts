import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as IdempotencyModule from './idempotency'

vi.mock('server-only', () => ({}))

// The orchestrator never touches Postgres in these tests — the store I/O is mocked.
vi.mock('@/lib/db', () => ({ query: vi.fn() }))

// `commands.ts` imports the read-route harness at module load; stub it so we don't pull
// the whole ecosystem auth graph. These tests exercise `executeApiPlatformCommand` directly.
vi.mock('./ecosystem-auth', () => ({ runEcosystemReadRoute: vi.fn() }))

// Mock the store I/O but keep the pure helpers (fingerprint, decision, key parsing) real.
const mockClaim = vi.fn()
const mockRecordAudit = vi.fn()
const mockLoad = vi.fn()
const mockComplete = vi.fn()
const mockFail = vi.fn()
const mockIncrementReplay = vi.fn()

vi.mock('./idempotency', async importOriginal => {
  const actual = await importOriginal<typeof IdempotencyModule>()

  return {
    ...actual,
    claimCommandExecution: (...args: unknown[]) => mockClaim(...args),
    recordCommandAudit: (...args: unknown[]) => mockRecordAudit(...args),
    loadCommandExecutionByKey: (...args: unknown[]) => mockLoad(...args),
    completeCommandExecution: (...args: unknown[]) => mockComplete(...args),
    failCommandExecution: (...args: unknown[]) => mockFail(...args),
    incrementReplayCount: (...args: unknown[]) => mockIncrementReplay(...args)
  }
})

const { executeApiPlatformCommand } = await import('./commands')

const {
  computeRequestFingerprint,
  resolveIdempotencyDecision,
  parseIdempotencyKey,
  IDEMPOTENCY_REPLAYED_HEADER
} = await import('./idempotency')

const PRINCIPAL = {
  lane: 'ecosystem' as const,
  principalKind: 'consumer' as const,
  principalId: 'consumer-1',
  consumerId: 'consumer-1'
}

const SCOPE = { greenhouseScopeType: 'internal' as const }

const PATH = '/api/platform/ecosystem/webhook-subscriptions'
const BODY = { targetUrl: 'https://hooks.example.com' }

const buildRequest = (idempotencyKey?: string) =>
  new Request(`https://example.com${PATH}`, {
    method: 'POST',
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}
  })

const run = (data: unknown, status = 201) => vi.fn().mockResolvedValue({ data, status })

beforeEach(() => {
  vi.clearAllMocks()
  // The orchestrator calls `.catch()` on these (best-effort audit writes) → they must
  // resolve a promise by default, otherwise `undefined.catch` throws.
  mockComplete.mockResolvedValue(undefined)
  mockFail.mockResolvedValue(undefined)
  mockIncrementReplay.mockResolvedValue(undefined)
})

describe('resolveIdempotencyDecision (pure)', () => {
  const fp = 'fp-abc'

  it('returns conflict when no row exists (cleanup race)', () => {
    expect(resolveIdempotencyDecision(null, fp).kind).toBe('conflict')
  })

  it('returns conflict when the stored fingerprint differs (key reused with new payload)', () => {
    const decision = resolveIdempotencyDecision(
      { commandExecutionId: 'c1', status: 'completed', requestFingerprint: 'other', responseStatus: 201, responseBody: {} },
      fp
    )

    expect(decision.kind).toBe('conflict')
  })

  it('returns replay for completed + matching fingerprint', () => {
    const decision = resolveIdempotencyDecision(
      { commandExecutionId: 'c1', status: 'completed', requestFingerprint: fp, responseStatus: 201, responseBody: { ok: true } },
      fp
    )

    expect(decision).toEqual({ kind: 'replay', responseStatus: 201, responseBody: { ok: true } })
  })

  it('returns in_progress for processing + matching fingerprint', () => {
    const decision = resolveIdempotencyDecision(
      { commandExecutionId: 'c1', status: 'processing', requestFingerprint: fp, responseStatus: null, responseBody: null },
      fp
    )

    expect(decision.kind).toBe('in_progress')
  })
})

describe('computeRequestFingerprint (pure)', () => {
  it('is stable across object key ordering', () => {
    const a = computeRequestFingerprint({ method: 'POST', path: PATH, body: { x: 1, y: 2 } })
    const b = computeRequestFingerprint({ method: 'POST', path: PATH, body: { y: 2, x: 1 } })

    expect(a).toBe(b)
  })

  it('differs when the payload differs', () => {
    const a = computeRequestFingerprint({ method: 'POST', path: PATH, body: { x: 1 } })
    const b = computeRequestFingerprint({ method: 'POST', path: PATH, body: { x: 2 } })

    expect(a).not.toBe(b)
  })

  it('differs when the path differs', () => {
    const a = computeRequestFingerprint({ method: 'POST', path: PATH, body: BODY })
    const b = computeRequestFingerprint({ method: 'POST', path: `${PATH}/other`, body: BODY })

    expect(a).not.toBe(b)
  })
})

describe('parseIdempotencyKey (pure)', () => {
  it('returns null when the header is absent', () => {
    expect(parseIdempotencyKey(buildRequest())).toBeNull()
  })

  it('returns null when the header is blank', () => {
    expect(parseIdempotencyKey(buildRequest('   '))).toBeNull()
  })

  it('trims and returns a valid key', () => {
    expect(parseIdempotencyKey(buildRequest('  K1  '))).toBe('K1')
  })

  it('throws 400 when the key is too long', () => {
    expect(() => parseIdempotencyKey(buildRequest('x'.repeat(256)))).toThrowError()
  })
})

describe('executeApiPlatformCommand — no key (audit only)', () => {
  it('audits, runs the handler once, and records completion', async () => {
    mockRecordAudit.mockResolvedValue('EO-APC-AUDIT1')
    const handler = run({ subscriptionId: 'sub-1' })

    const result = await executeApiPlatformCommand({
      principal: PRINCIPAL,
      scope: SCOPE,
      routeKey: 'platform.ecosystem.webhook-subscriptions.create',
      request: buildRequest(),
      body: BODY,
      run: handler
    })

    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    expect(mockClaim).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({ commandExecutionId: 'EO-APC-AUDIT1', responseStatus: 201 })
    )
    expect(result.data).toEqual({ subscriptionId: 'sub-1' })
    // No key → no replay header.
    expect(result.headers?.[IDEMPOTENCY_REPLAYED_HEADER]).toBeUndefined()
  })
})

describe('executeApiPlatformCommand — keyed', () => {
  it('runs the handler on a fresh claim (first call)', async () => {
    mockClaim.mockResolvedValue({ claimed: true, commandExecutionId: 'EO-APC-FRESH1' })
    const handler = run({ subscriptionId: 'sub-1' })

    const result = await executeApiPlatformCommand({
      principal: PRINCIPAL,
      scope: SCOPE,
      routeKey: 'platform.ecosystem.webhook-subscriptions.create',
      request: buildRequest('K1'),
      body: BODY,
      run: handler
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(mockComplete).toHaveBeenCalledTimes(1)
    expect(mockLoad).not.toHaveBeenCalled()
    expect(result.data).toEqual({ subscriptionId: 'sub-1' })
  })

  it('re-runs the handler on retry-after-failure (claim re-grabs the failed row)', async () => {
    // The store re-claims a `failed` row with matching fingerprint → from the
    // orchestrator's view this is identical to a fresh claim: it owns execution.
    mockClaim.mockResolvedValue({ claimed: true, commandExecutionId: 'EO-APC-RETRY1' })
    const handler = run({ subscriptionId: 'sub-1' })

    await executeApiPlatformCommand({
      principal: PRINCIPAL,
      scope: SCOPE,
      routeKey: 'platform.ecosystem.webhook-subscriptions.create',
      request: buildRequest('K1'),
      body: BODY,
      run: handler
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({ commandExecutionId: 'EO-APC-RETRY1' })
    )
  })

  it('replays the stored response without running the handler (same key + payload, completed)', async () => {
    const fingerprint = computeRequestFingerprint({ method: 'POST', path: PATH, body: BODY })

    mockClaim.mockResolvedValue({ claimed: false })
    mockLoad.mockResolvedValue({
      commandExecutionId: 'EO-APC-DONE1',
      status: 'completed',
      requestFingerprint: fingerprint,
      responseStatus: 201,
      responseBody: { data: { subscriptionId: 'sub-1' }, meta: { foo: 'bar' }, status: 201 }
    })

    const handler = run({ subscriptionId: 'SHOULD-NOT-RUN' })

    const result = await executeApiPlatformCommand({
      principal: PRINCIPAL,
      scope: SCOPE,
      routeKey: 'platform.ecosystem.webhook-subscriptions.create',
      request: buildRequest('K1'),
      body: BODY,
      run: handler
    })

    expect(handler).not.toHaveBeenCalled()
    expect(mockIncrementReplay).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual({ subscriptionId: 'sub-1' })
    expect(result.meta).toEqual({ foo: 'bar' })
    expect(result.status).toBe(201)
    expect(result.headers?.[IDEMPOTENCY_REPLAYED_HEADER]).toBe('true')
  })

  it('rejects with 409 idempotency_conflict on key reuse with a different payload', async () => {
    mockClaim.mockResolvedValue({ claimed: false })
    mockLoad.mockResolvedValue({
      commandExecutionId: 'EO-APC-DONE1',
      status: 'completed',
      requestFingerprint: 'a-totally-different-fingerprint',
      responseStatus: 201,
      responseBody: { data: {}, meta: null, status: 201 }
    })

    const handler = run({})

    await expect(
      executeApiPlatformCommand({
        principal: PRINCIPAL,
        scope: SCOPE,
        routeKey: 'platform.ecosystem.webhook-subscriptions.create',
        request: buildRequest('K1'),
        body: BODY,
        run: handler
      })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'idempotency_conflict' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects with 409 idempotency_in_progress when another request owns the key', async () => {
    const fingerprint = computeRequestFingerprint({ method: 'POST', path: PATH, body: BODY })

    mockClaim.mockResolvedValue({ claimed: false })
    mockLoad.mockResolvedValue({
      commandExecutionId: 'EO-APC-RUNNING1',
      status: 'processing',
      requestFingerprint: fingerprint,
      responseStatus: null,
      responseBody: null
    })

    await expect(
      executeApiPlatformCommand({
        principal: PRINCIPAL,
        scope: SCOPE,
        routeKey: 'platform.ecosystem.webhook-subscriptions.create',
        request: buildRequest('K1'),
        body: BODY,
        run: run({})
      })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'idempotency_in_progress' })
  })

  it('marks the execution failed and rethrows when the handler throws', async () => {
    mockClaim.mockResolvedValue({ claimed: true, commandExecutionId: 'EO-APC-FAIL1' })
    const boom = new Error('handler exploded')
    const handler = vi.fn().mockRejectedValue(boom)

    await expect(
      executeApiPlatformCommand({
        principal: PRINCIPAL,
        scope: SCOPE,
        routeKey: 'platform.ecosystem.webhook-subscriptions.create',
        request: buildRequest('K1'),
        body: BODY,
        run: handler
      })
    ).rejects.toBe(boom)

    expect(mockFail).toHaveBeenCalledWith(
      expect.objectContaining({ commandExecutionId: 'EO-APC-FAIL1' })
    )
    expect(mockComplete).not.toHaveBeenCalled()
  })
})
