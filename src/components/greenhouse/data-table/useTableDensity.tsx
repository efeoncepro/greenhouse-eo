'use client'

// TASK-743 — Density resolution hook + provider.
// Resolution order (precedence high → low):
//   1. Explicit prop on <DataTableShell density="...">
//   2. Cookie `gh-table-density` (user preference, 365d)
//   3. Container query auto-degrade (read by <DataTableShell>)
//   4. Theme default (`comfortable`)

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  DEFAULT_TABLE_DENSITY,
  DENSITY_TOKENS,
  TABLE_DENSITY_COOKIE,
  TABLE_DENSITY_COOKIE_MAX_AGE_DAYS,
  type DensityTokens,
  type TableDensity,
  degradeDensityForWidth,
  isTableDensity
} from './density'

interface TableDensityContextValue {
  density: TableDensity
  tokens: DensityTokens
  containerWidth: number | null
  autoDegraded: boolean
  setUserPreferredDensity: (density: TableDensity | null) => void
  userPreferredDensity: TableDensity | null
}

const TableDensityContext = createContext<TableDensityContextValue | null>(null)

const readCookieDensity = (): TableDensity | null => {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(new RegExp(`(?:^|; )${TABLE_DENSITY_COOKIE}=([^;]+)`))

  if (!match) return null

  const value = decodeURIComponent(match[1])

  return isTableDensity(value) ? value : null
}

const writeCookieDensity = (density: TableDensity | null) => {
  if (typeof document === 'undefined') return

  if (density == null) {
    document.cookie = `${TABLE_DENSITY_COOKIE}=; path=/; max-age=0`

    return
  }

  const maxAgeSeconds = TABLE_DENSITY_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60

  document.cookie = `${TABLE_DENSITY_COOKIE}=${density}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
}

export interface UseTableDensityResolutionInput {
  prop?: TableDensity
  containerWidth: number | null
}

export interface UseTableDensityResolutionResult {
  density: TableDensity
  tokens: DensityTokens
  autoDegraded: boolean
  desiredDensity: TableDensity
  userPreferredDensity: TableDensity | null
  setUserPreferredDensity: (density: TableDensity | null) => void
}

export const useTableDensityResolution = ({
  prop,
  containerWidth
}: UseTableDensityResolutionInput): UseTableDensityResolutionResult => {
  const [userPreferredDensity, setUserPreferredDensityState] = useState<TableDensity | null>(null)

  useEffect(() => {
    setUserPreferredDensityState(readCookieDensity())
  }, [])

  const setUserPreferredDensity = useCallback((density: TableDensity | null) => {
    writeCookieDensity(density)
    setUserPreferredDensityState(density)
  }, [])

  const desiredDensity: TableDensity = useMemo(() => {
    if (prop) return prop
    if (userPreferredDensity) return userPreferredDensity

    return DEFAULT_TABLE_DENSITY
  }, [prop, userPreferredDensity])

  const { density, degraded } = useMemo(
    () => degradeDensityForWidth(desiredDensity, containerWidth),
    [desiredDensity, containerWidth]
  )

  const tokens = DENSITY_TOKENS[density]

  return {
    density,
    tokens,
    autoDegraded: degraded,
    desiredDensity,
    userPreferredDensity,
    setUserPreferredDensity
  }
}

export const TableDensityProvider = ({
  value,
  children
}: {
  value: TableDensityContextValue
  children: React.ReactNode
}) => <TableDensityContext.Provider value={value}>{children}</TableDensityContext.Provider>

export const useTableDensity = (): TableDensityContextValue => {
  const ctx = useContext(TableDensityContext)

  if (!ctx) {
    return {
      density: DEFAULT_TABLE_DENSITY,
      tokens: DENSITY_TOKENS[DEFAULT_TABLE_DENSITY],
      containerWidth: null,
      autoDegraded: false,
      userPreferredDensity: null,
      setUserPreferredDensity: () => {
        // no-op outside provider
      }
    }
  }

  return ctx
}

export type { TableDensityContextValue }
