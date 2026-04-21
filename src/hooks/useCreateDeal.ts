'use client'

import { useCallback, useRef, useState } from 'react'

// TASK-539: hook for `POST /api/commercial/organizations/:id/deals`.
// Mirrors the pattern used by `usePricingSimulation` — AbortController per
// request, loading/error state, no external cache library. Returns a
// stable `create` function so callers can wire it to a form submit.

export interface CreateDealRequest {
  organizationId: string
  dealName: string
  amount?: number | null
  currency?: string | null
  amountClp?: number | null
  pipelineId?: string | null
  stageId?: string | null
  ownerHubspotUserId?: string | null
  closeDateHint?: string | null
  quotationId?: string | null
  idempotencyKey?: string | null
}

export interface CreateDealResponse {
  attemptId: string
  status:
    | 'pending'
    | 'completed'
    | 'pending_approval'
    | 'rate_limited'
    | 'failed'
    | 'endpoint_not_deployed'
  dealId: string | null
  hubspotDealId: string | null
  organizationPromoted: boolean
  requiresApproval: boolean
  approvalId: string | null
  message: string
}

export interface CreateDealError {
  message: string
  code: string | null
  retryAfterSeconds: number | null
  statusCode: number
}

export interface UseCreateDealResult {
  create: (input: CreateDealRequest) => Promise<CreateDealResponse | null>
  loading: boolean
  error: CreateDealError | null
  reset: () => void
}

const useCreateDeal = (): UseCreateDealResult => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CreateDealError | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setError(null)
    setLoading(false)
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const create = useCallback(async (input: CreateDealRequest): Promise<CreateDealResponse | null> => {
    abortRef.current?.abort()
    const controller = new AbortController()

    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/commercial/organizations/${encodeURIComponent(input.organizationId)}/deals`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dealName: input.dealName,
            amount: input.amount ?? null,
            amountClp: input.amountClp ?? null,
            currency: input.currency ?? null,
            pipelineId: input.pipelineId ?? null,
            stageId: input.stageId ?? null,
            ownerHubspotUserId: input.ownerHubspotUserId ?? null,
            closeDateHint: input.closeDateHint ?? null,
            quotationId: input.quotationId ?? null,
            idempotencyKey: input.idempotencyKey ?? null
          }),
          signal: controller.signal
        }
      )

      if (!response.ok) {
        let message = `HTTP ${response.status}`
        let code: string | null = null
        let retryAfter: number | null = null

        try {
          const body = (await response.json()) as {
            error?: string
            code?: string
            retryAfterSeconds?: number
          }

          message = body.error ?? message
          code = body.code ?? null
          retryAfter = body.retryAfterSeconds ?? null
        } catch {
          // body was not JSON — keep the default message
        }

        const headerRetry = response.headers.get('Retry-After')

        if (!retryAfter && headerRetry) {
          const parsed = Number(headerRetry)

          retryAfter = Number.isFinite(parsed) ? parsed : null
        }

        setError({
          message,
          code,
          retryAfterSeconds: retryAfter,
          statusCode: response.status
        })

        return null
      }

      const data = (await response.json()) as CreateDealResponse

      return data
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return null
      }

      const message = caught instanceof Error ? caught.message : 'Error desconocido'

      setError({
        message,
        code: null,
        retryAfterSeconds: null,
        statusCode: 0
      })

      return null
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [])

  return { create, loading, error, reset }
}

export default useCreateDeal
