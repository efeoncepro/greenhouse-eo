'use client'

import { useEffect, useState } from 'react'

import type { OrganizationDetailData } from '@/views/greenhouse/organizations/types'

/**
 * TASK-612 — Shared hook used by facet wrappers that need the legacy
 * `OrganizationDetailData` shape (a few of the existing tabs accept `detail`
 * as a prop). Each facet calls this hook independently; browser caches the
 * GET so multiple facets sharing the same organizationId hit the network once
 * within the same SWR window.
 *
 * This is intentionally lightweight (no SWR dep) — same pattern as legacy
 * `OrganizationView`. When facets migrate to RSC + props (out of V1 scope),
 * this hook can be retired.
 */

type State =
  | { status: 'loading'; detail: null; error: null }
  | { status: 'ready'; detail: OrganizationDetailData; error: null }
  | { status: 'error'; detail: null; error: string }

const useOrganizationDetail = (organizationId: string): State => {
  const [state, setState] = useState<State>({ status: 'loading', detail: null, error: null })

  useEffect(() => {
    let cancelled = false

    setState({ status: 'loading', detail: null, error: null })

    fetch(`/api/organizations/${organizationId}`)
      .then(async response => {
        if (cancelled) return

        if (!response.ok) {
          setState({ status: 'error', detail: null, error: `HTTP ${response.status}` })

          return
        }

        const detail = (await response.json()) as OrganizationDetailData

        if (!cancelled) setState({ status: 'ready', detail, error: null })
      })
      .catch(error => {
        if (cancelled) return

        const message = error instanceof Error ? error.message : 'unknown'

        setState({ status: 'error', detail: null, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [organizationId])

  return state
}

export default useOrganizationDetail
