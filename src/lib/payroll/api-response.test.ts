import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { captureWithDomain } from '@/lib/observability/capture'
import { toPayrollErrorResponse } from './api-response'
import { PayrollValidationError } from './shared'

const mockedCapture = vi.mocked(captureWithDomain)

beforeEach(() => {
  mockedCapture.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TASK-729: toPayrollErrorResponse instrumentation', () => {
  it('does NOT capture to Sentry on PayrollValidationError (4xx, expected flow)', async () => {
    const err = new PayrollValidationError('not found', 404)

    const response = toPayrollErrorResponse(err, 'Some failure.')

    expect(mockedCapture).not.toHaveBeenCalled()
    expect(response.status).toBe(404)
  })

  it('captures unhandled errors with domain="payroll" and extra context', async () => {
    const err = new Error('boom')

    const response = toPayrollErrorResponse(err, 'Unable to calculate payroll.', {
      stage: 'calculate',
      periodId: 'PER-202604',
      actorUserId: 'user-1'
    })

    expect(response.status).toBe(500)
    expect(mockedCapture).toHaveBeenCalledTimes(1)
    expect(mockedCapture).toHaveBeenCalledWith(
      err,
      'payroll',
      expect.objectContaining({
        level: 'error',
        extra: expect.objectContaining({
          fallbackMessage: 'Unable to calculate payroll.',
          stage: 'calculate',
          periodId: 'PER-202604',
          actorUserId: 'user-1'
        })
      })
    )
  })

  it('captures even without extra context (no extra keys leak)', async () => {
    const err = new Error('silent boom')

    toPayrollErrorResponse(err, 'fallback message')

    expect(mockedCapture).toHaveBeenCalledWith(
      err,
      'payroll',
      expect.objectContaining({
        level: 'error',
        extra: { fallbackMessage: 'fallback message' }
      })
    )
  })
})
