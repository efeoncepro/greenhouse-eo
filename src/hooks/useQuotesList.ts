'use client'

import { useQuery } from '@tanstack/react-query'

import { qk, type QuotesListFilters } from '@/lib/react-query'

/**
 * TASK-513 — Migration example #1.
 *
 * `/finance/quotes` antes hacía useState + useEffect + fetch dentro de
 * QuotesListView; cada cambio de filtro disparaba un useEffect manual y al
 * volver a la pantalla siempre re-fetcheaba sin cache.
 *
 * Con react-query el filtro es parte del queryKey: cada combinacion se
 * cachea, los re-mounts son instantaneos cuando los datos siguen frescos
 * (`staleTime: 30s`) y `refetchOnWindowFocus` mantiene la lista al dia
 * cuando el usuario vuelve al tab.
 *
 * Cualquier mutacion sobre quotes (crear, emitir, convertir, etc.) puede
 * invalidar `qk.finance.quotes.all` para que la lista se recargue sin
 * tener que pasarle un callback al componente.
 */
export interface QuoteListItem {
  quoteId: string
  clientName: string | null
  quoteNumber: string | null
  quoteDate: string | null
  dueDate: string | null
  totalAmount: number
  totalAmountClp: number
  currency: string
  status: string
  convertedToIncomeId: string | null
  source: string
  hubspotQuoteId: string | null
  isFromNubox: boolean
  currentVersion: number | null
  effectiveMarginPct: number | null
  marginFloorPct: number | null
  targetMarginPct: number | null
}

interface QuotesListResponse {
  items?: QuoteListItem[]
}

const fetchQuotes = async (filters: QuotesListFilters): Promise<QuoteListItem[]> => {
  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (filters.source) params.set('source', filters.source)

  const res = await fetch(`/api/finance/quotes?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Failed to fetch quotes: ${res.status}`)
  }

  const data = (await res.json()) as QuotesListResponse

  return data.items ?? []
}

const useQuotesList = (filters: QuotesListFilters = {}) => {
  return useQuery({
    queryKey: qk.finance.quotes.list(filters),
    queryFn: () => fetchQuotes(filters)
  })
}

export default useQuotesList
