'use client'

import { useEffect, useRef, useState } from 'react'

import type { PricingEngineInputV2, PricingEngineOutputV2 } from '@/lib/finance/pricing/contracts'

export interface UsePricingSimulationOptions {

  /** Milisegundos de debounce antes de disparar el fetch (default 500ms) */
  debounceMs?: number

  /** Endpoint a consumir — default `/api/finance/quotes/pricing/simulate` */
  endpoint?: string

  /** Si false, no dispara fetch (útil mientras el usuario completa el input mínimo) */
  enabled?: boolean
}

export interface UsePricingSimulationResult {
  output: PricingEngineOutputV2 | null
  loading: boolean
  error: string | null

  /** Última vez que el fetch terminó (exitoso o no). Null si nunca ha corrido. */
  lastUpdatedAt: number | null
}

/**
 * Hook que debouncea un input del engine v2 y llama al endpoint `simulate` para
 * obtener el output del engine. Usa AbortController para cancelar requests en vuelo
 * cuando el input cambia. Retorna `loading` para skeletons y `error` si la simulación falla.
 *
 * Si `enabled === false`, retorna el último valor conocido sin disparar fetch.
 */
export const usePricingSimulation = (
  input: PricingEngineInputV2 | null,
  options: UsePricingSimulationOptions = {}
): UsePricingSimulationResult => {
  const { debounceMs = 500, endpoint = '/api/finance/quotes/pricing/simulate', enabled = true } = options

  const [output, setOutput] = useState<PricingEngineOutputV2 | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const serializedInput = input ? JSON.stringify(input) : null

  useEffect(() => {
    if (!enabled || !input || input.lines.length === 0) {
      return
    }

    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()

      abortRef.current = controller

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }

          throw new Error(body.error ?? `Simulate failed: HTTP ${response.status}`)
        }

        const result = (await response.json()) as PricingEngineOutputV2

        if (!controller.signal.aborted) {
          setOutput(result)
          setLastUpdatedAt(Date.now())
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Simulate failed.')
        setLastUpdatedAt(Date.now())
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      if (abortRef.current) abortRef.current.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedInput, enabled, debounceMs, endpoint])

  return { output, loading, error, lastUpdatedAt }
}

export default usePricingSimulation
