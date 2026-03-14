import { useState, useEffect } from 'react'

/**
 * Lightweight media query hook for responsive behavior outside MUI components.
 * For MUI-context usage, prefer `useMediaQuery` from `@mui/material`.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 600px)')
 * const isTablet = useMediaQuery('(min-width: 601px) and (max-width: 960px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

export default useMediaQuery
