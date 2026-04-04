'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when the user prefers reduced motion (OS-level setting).
 * Falls back to false during SSR or when matchMedia is unavailable.
 */
const useReducedMotion = (): boolean => {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    setPrefersReduced(mq.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)

    mq.addEventListener('change', handler)

    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

export default useReducedMotion
