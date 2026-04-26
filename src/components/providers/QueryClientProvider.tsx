'use client'

import { useState, type ReactNode } from 'react'

import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

/**
 * TASK-513 — Canonical react-query provider for the Greenhouse portal.
 *
 * Decisions:
 * - Defaults sanos (Vercel/Linear/Stripe-style):
 *   - `staleTime: 30s` evita refetch en cada mount sin sacrificar frescura.
 *   - `gcTime: 5min` libera memoria pero mantiene cache mientras navegamos
 *     entre tabs.
 *   - `refetchOnWindowFocus: true` refleja el patron enterprise (vuelves al
 *     tab y los datos quedan al dia sin ceremonia).
 *   - `retry: 1` evita spam de retries en errores transitorios pero da una
 *     segunda chance.
 *   - `throwOnError: false` mantiene el estilo del portal: cada consumer
 *     renderiza su propio error UI con `query.error`.
 *
 * - El `QueryClient` vive dentro de `useState` para que sobreviva renders
 *   sin re-instanciarse, y se crea por arbol React (necesario para Next
 *   App Router server boundaries — un QueryClient por arbol cliente).
 *
 * - Devtools cargan solo cuando `NODE_ENV !== 'production'`. En produccion
 *   el componente queda como no-op.
 */
const QueryClientProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            retry: 1,
            throwOnError: false
          },
          mutations: {
            retry: 0,
            throwOnError: false
          }
        }
      })
  )

  return (
    <TanstackQueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV !== 'production' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition='bottom-left' />
      ) : null}
    </TanstackQueryClientProvider>
  )
}

export default QueryClientProvider
