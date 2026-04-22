'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// TASK-571: hook for `GET /api/commercial/organizations/:id/deal-creation-context`.
// The drawer uses it to populate the Pipeline and Stage selectors with real
// registry data (no HubSpot live calls from the client).

export interface DealCreationContextStage {
  stageId: string
  label: string
  displayOrder: number | null
  isClosed: boolean
  isWon: boolean
  isSelectableForCreate: boolean
  isDefault: boolean
}

export interface DealCreationContextPipeline {
  pipelineId: string
  label: string
  displayOrder: number | null
  active: boolean
  isDefault: boolean
  stages: DealCreationContextStage[]
}

export interface DealCreationContextResponse {
  organizationId: string
  organizationName: string | null
  hubspotCompanyId: string | null
  defaultPipelineId: string | null
  defaultStageId: string | null
  defaultOwnerHubspotUserId: string | null
  defaultsSource: {
    pipeline:
      | 'tenant_policy'
      | 'business_line_policy'
      | 'global_policy'
      | 'single_option'
      | 'first_active'
      | 'none'
    stage:
      | 'tenant_policy'
      | 'business_line_policy'
      | 'global_policy'
      | 'pipeline_default'
      | 'first_open_stage'
      | 'single_option'
      | 'none'
    owner: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'none'
  }
  pipelines: DealCreationContextPipeline[]
}

export interface UseDealCreationContextResult {
  data: DealCreationContextResponse | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

interface UseDealCreationContextOptions {
  organizationId: string | null
  enabled?: boolean
}

const useDealCreationContext = (
  { organizationId, enabled = true }: UseDealCreationContextOptions
): UseDealCreationContextResult => {
  const [data, setData] = useState<DealCreationContextResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchContext = useCallback(async () => {
    if (!organizationId) {
      setData(null)
      setError(null)

      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()

    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/commercial/organizations/${encodeURIComponent(organizationId)}/deal-creation-context`,
        { signal: controller.signal, cache: 'no-store' }
      )

      if (!response.ok) {
        let message = `HTTP ${response.status}`

        try {
          const body = (await response.json()) as { error?: string }

          message = body.error ?? message
        } catch {
          // non-JSON
        }

        setError(message)
        setData(null)

        return
      }

      const body = (await response.json()) as DealCreationContextResponse

      setData(body)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return

      setError(caught instanceof Error ? caught.message : 'Error desconocido')
      setData(null)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [organizationId])

  useEffect(() => {
    if (!enabled) return

    void fetchContext()

    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [enabled, fetchContext])

  return { data, loading, error, reload: fetchContext }
}

export default useDealCreationContext
