/**
 * TASK-513 — Canonical query key factory for the Greenhouse portal.
 *
 * Patrones que seguimos:
 * 1. Tuplas tipadas, no strings concatenados, para que `invalidateQueries`
 *    reciba prefijos validos sin tener que adivinar.
 * 2. Una rama por dominio (`finance`, `people`, `agency`, ...). Cada rama
 *    expone `all`, `lists()`, `list(filters)`, `details()`, `detail(id)`
 *    siguiendo la convencion oficial de TanStack.
 * 3. Los consumers DEBEN reusar estas funciones — no inventar keys ad-hoc
 *    en sus hooks. La invalidacion coordinada depende de tener un solo
 *    lugar donde se declaren los keys de cada recurso.
 *
 * Uso:
 *   import { qk } from '@/lib/react-query'
 *
 *   useQuery({
 *     queryKey: qk.finance.quotes.list({ status: 'draft' }),
 *     queryFn: () => fetchQuotes({ status: 'draft' })
 *   })
 *
 *   queryClient.invalidateQueries({ queryKey: qk.finance.quotes.all })
 */

export interface QuotesListFilters {
  status?: string
  source?: string
}

export const queryKeys = {
  finance: {
    quotes: {
      all: ['finance', 'quotes'] as const,
      lists: () => [...queryKeys.finance.quotes.all, 'list'] as const,
      list: (filters: QuotesListFilters | undefined) =>
        [...queryKeys.finance.quotes.lists(), filters ?? {}] as const,
      details: () => [...queryKeys.finance.quotes.all, 'detail'] as const,
      detail: (quoteId: string) => [...queryKeys.finance.quotes.details(), quoteId] as const,
      pricingConfig: ['finance', 'quotes', 'pricing-config'] as const
    }
  },
  people: {
    all: ['people'] as const,
    lists: () => [...queryKeys.people.all, 'list'] as const,
    list: () => [...queryKeys.people.lists()] as const,
    details: () => [...queryKeys.people.all, 'detail'] as const,
    detail: (memberId: string) => [...queryKeys.people.details(), memberId] as const
  }
} as const

/**
 * Short alias for ergonomics. Most consumers will reach for `qk.<domain>...`
 * because it reads like a constant lookup.
 */
export const qk = queryKeys
