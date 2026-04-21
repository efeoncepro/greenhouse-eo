'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import useDebounce from '@/hooks/useDebounce'

export type PartyLifecycleStage = 'prospect' | 'opportunity' | 'active_client' | 'inactive'

export interface PartySearchItem {
  kind: 'party' | 'hubspot_candidate'
  organizationId?: string
  commercialPartyId?: string
  hubspotCompanyId?: string
  displayName: string
  lifecycleStage?: PartyLifecycleStage
  domain?: string | null
  lastActivityAt?: string | null
  canAdopt: boolean
}

export interface PartySearchError {
  message: string
  code: string | null
  retryAfterSeconds: number | null
  statusCode: number
}

export interface AdoptPartyResult {
  organizationId: string
  commercialPartyId: string
  lifecycleStage: PartyLifecycleStage
  clientId: string | null
}

interface UsePartiesOptions {
  enabled?: boolean
  debounceMs?: number
  minQueryLength?: number
  includeStages?: PartyLifecycleStage[]
}

interface UsePartiesResult {
  query: string
  setQuery: (value: string) => void
  parties: PartySearchItem[]
  hasMore: boolean
  loading: boolean
  searchError: PartySearchError | null
  adoptingCompanyId: string | null
  retrySearch: () => void
  clearSearch: () => void
  adoptParty: (party: PartySearchItem) => Promise<AdoptPartyResult | null>
}

const DEFAULT_MIN_QUERY_LENGTH = 2

const isPartySearchError = (value: unknown): value is PartySearchError =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'message' in value &&
      'statusCode' in value &&
      typeof (value as PartySearchError).message === 'string' &&
      typeof (value as PartySearchError).statusCode === 'number'
  )

const parseErrorPayload = async (response: Response): Promise<PartySearchError> => {
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
    // Keep defaults when the body is not JSON.
  }

  const headerRetryAfter = response.headers.get('Retry-After')

  if (!retryAfter && headerRetryAfter) {
    const parsed = Number(headerRetryAfter)

    retryAfter = Number.isFinite(parsed) ? parsed : null
  }

  return {
    message,
    code,
    retryAfterSeconds: retryAfter,
    statusCode: response.status
  }
}

const useParties = ({
  enabled = true,
  debounceMs = 250,
  minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
  includeStages
}: UsePartiesOptions = {}): UsePartiesResult => {
  const [query, setQuery] = useState('')
  const [parties, setParties] = useState<PartySearchItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<PartySearchError | null>(null)
  const [adoptingCompanyId, setAdoptingCompanyId] = useState<string | null>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const adoptAbortRef = useRef<AbortController | null>(null)
  const [searchVersion, setSearchVersion] = useState(0)

  const debouncedQuery = useDebounce(query, debounceMs)

  const clearSearch = useCallback(() => {
    searchAbortRef.current?.abort()
    setQuery('')
    setParties([])
    setHasMore(false)
    setLoading(false)
    setSearchError(null)
  }, [])

  const retrySearch = useCallback(() => {
    setSearchVersion(current => current + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      clearSearch()

      return
    }

    const trimmedQuery = debouncedQuery.trim()

    if (trimmedQuery.length < minQueryLength) {
      searchAbortRef.current?.abort()
      setParties([])
      setHasMore(false)
      setLoading(false)
      setSearchError(null)

      return
    }

    const controller = new AbortController()

    searchAbortRef.current?.abort()
    searchAbortRef.current = controller

    setLoading(true)
    setSearchError(null)

    ;(async () => {
      try {
        const params = new URLSearchParams({ q: trimmedQuery })

        if (includeStages && includeStages.length > 0) {
          params.set('includeStages', includeStages.join(','))
        }

        const response = await fetch(`/api/commercial/parties/search?${params.toString()}`, {
          signal: controller.signal
        })

        if (!response.ok) {
          throw await parseErrorPayload(response)
        }

        const payload = (await response.json()) as {
          parties?: PartySearchItem[]
          hasMore?: boolean
        }

        setParties(payload.parties ?? [])
        setHasMore(payload.hasMore === true)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return

        const fallback: PartySearchError = {
          message:
            caught instanceof Error && caught.message.length > 0
              ? caught.message
              : 'No pudimos buscar organizaciones ahora mismo.',
          code: null,
          retryAfterSeconds: null,
          statusCode: 0
        }

        setParties([])
        setHasMore(false)
        setSearchError(isPartySearchError(caught) ? caught : fallback)
      } finally {
        setLoading(false)

        if (searchAbortRef.current === controller) {
          searchAbortRef.current = null
        }
      }
    })()

    return () => controller.abort()
  }, [clearSearch, debouncedQuery, enabled, includeStages, minQueryLength, searchVersion])

  const adoptParty = useCallback(async (party: PartySearchItem): Promise<AdoptPartyResult | null> => {
    if (party.kind !== 'hubspot_candidate' || !party.hubspotCompanyId) {
      return null
    }

    adoptAbortRef.current?.abort()
    const controller = new AbortController()

    adoptAbortRef.current = controller
    setAdoptingCompanyId(party.hubspotCompanyId)

    try {
      const response = await fetch('/api/commercial/parties/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubspotCompanyId: party.hubspotCompanyId }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw await parseErrorPayload(response)
      }

      return (await response.json()) as AdoptPartyResult
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return null
      }

      throw caught
    } finally {
      setAdoptingCompanyId(null)

      if (adoptAbortRef.current === controller) {
        adoptAbortRef.current = null
      }
    }
  }, [])

  return {
    query,
    setQuery,
    parties,
    hasMore,
    loading,
    searchError,
    adoptingCompanyId,
    retrySearch,
    clearSearch,
    adoptParty
  }
}

export default useParties
