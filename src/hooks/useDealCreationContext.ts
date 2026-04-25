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

export interface DealCreationContextOption {
  value: string
  label: string
  description: string | null
  displayOrder: number | null
  hidden: boolean
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
  defaultDealType: string | null
  defaultPriority: string | null
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
    dealType: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'single_option' | 'none'
    priority: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'single_option' | 'none'
    owner: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'none'
  }
  readyToCreate: boolean
  blockingIssues: string[]
  dealTypeOptions: DealCreationContextOption[]
  priorityOptions: DealCreationContextOption[]
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
  businessLineCode?: string | null
  enabled?: boolean
}

interface DealCreationContextResponseCompat
  extends Partial<Omit<DealCreationContextResponse, 'defaultsSource' | 'pipelines'>> {
  organizationId: string
  organizationName?: string | null
  hubspotCompanyId?: string | null
  defaultPipelineId?: string | null
  defaultStageId?: string | null
  defaultDealType?: string | null
  defaultPriority?: string | null
  defaultOwnerHubspotUserId?: string | null
  defaultsSource?: Partial<DealCreationContextResponse['defaultsSource']>
  blockingIssues?: string[]
  dealTypeOptions?: DealCreationContextOption[]
  priorityOptions?: DealCreationContextOption[]
  pipelines?: DealCreationContextPipeline[]
}

const normalizeDefaultsSource = (
  source?: DealCreationContextResponseCompat['defaultsSource']
): DealCreationContextResponse['defaultsSource'] => ({
  pipeline: source?.pipeline ?? 'none',
  stage: source?.stage ?? 'none',
  dealType: source?.dealType ?? 'none',
  priority: source?.priority ?? 'none',
  owner: source?.owner ?? 'none'
})

const normalizeContextPayload = (
  body: DealCreationContextResponseCompat
): DealCreationContextResponse => {
  const pipelines = body.pipelines ?? []
  const blockingIssues = Array.isArray(body.blockingIssues) ? body.blockingIssues : []

  return {
    organizationId: body.organizationId,
    organizationName: body.organizationName ?? null,
    hubspotCompanyId: body.hubspotCompanyId ?? null,
    defaultPipelineId: body.defaultPipelineId ?? null,
    defaultStageId: body.defaultStageId ?? null,
    defaultDealType: body.defaultDealType ?? null,
    defaultPriority: body.defaultPriority ?? null,
    defaultOwnerHubspotUserId: body.defaultOwnerHubspotUserId ?? null,
    defaultsSource: normalizeDefaultsSource(body.defaultsSource),
    readyToCreate: body.readyToCreate ?? (blockingIssues.length === 0 && pipelines.length > 0),
    blockingIssues,
    dealTypeOptions: body.dealTypeOptions ?? [],
    priorityOptions: body.priorityOptions ?? [],
    pipelines
  }
}

const useDealCreationContext = (
  { organizationId, businessLineCode, enabled = true }: UseDealCreationContextOptions
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
      const searchParams = new URLSearchParams()

      if (businessLineCode?.trim()) {
        searchParams.set('businessLineCode', businessLineCode.trim())
      }

      const query = searchParams.toString()

      const response = await fetch(
        `/api/commercial/organizations/${encodeURIComponent(organizationId)}/deal-creation-context${query ? `?${query}` : ''}`,
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

      const body = (await response.json()) as DealCreationContextResponseCompat

      setData(normalizeContextPayload(body))
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return

      setError(caught instanceof Error ? caught.message : 'Error desconocido')
      setData(null)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [businessLineCode, organizationId])

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
