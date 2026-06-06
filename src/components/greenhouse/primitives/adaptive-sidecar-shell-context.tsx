'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import type { AdaptiveSidecarSide } from './adaptive-sidecar-controller'

export type AdaptiveSidecarShellReflowTarget = 'greenhouse-vertical-navbar'

export interface AdaptiveSidecarShellReservation {
  id: string
  target: AdaptiveSidecarShellReflowTarget
  side: AdaptiveSidecarSide
  width: number
  resizeHandleWidth?: number
  gap?: number | string
  breakpoint?: number
}

interface AdaptiveSidecarShellContextValue {
  reservation: AdaptiveSidecarShellReservation | null
  registerReservation: (reservation: AdaptiveSidecarShellReservation) => void
  unregisterReservation: (id: string) => void
}

const AdaptiveSidecarShellContext = createContext<AdaptiveSidecarShellContextValue | null>(null)

const resolveActiveReservation = (reservations: Map<string, AdaptiveSidecarShellReservation>) => {
  const ordered = [...reservations.values()].filter(item => item.target === 'greenhouse-vertical-navbar')

  if (ordered.length === 0) {
    return null
  }

  return ordered.reduce((current, next) => (next.width > current.width ? next : current), ordered[0])
}

const reservationsMatch = (current: AdaptiveSidecarShellReservation, next: AdaptiveSidecarShellReservation) =>
  current.id === next.id &&
  current.target === next.target &&
  current.side === next.side &&
  current.width === next.width &&
  current.resizeHandleWidth === next.resizeHandleWidth &&
  current.gap === next.gap &&
  current.breakpoint === next.breakpoint

export const AdaptiveSidecarShellProvider = ({ children }: { children: ReactNode }) => {
  const [reservations, setReservations] = useState(() => new Map<string, AdaptiveSidecarShellReservation>())

  const registerReservation = useCallback((reservation: AdaptiveSidecarShellReservation) => {
    setReservations(current => {
      const existing = current.get(reservation.id)

      if (existing && reservationsMatch(existing, reservation)) {
        return current
      }

      const next = new Map(current)

      next.set(reservation.id, reservation)

      return next
    })
  }, [])

  const unregisterReservation = useCallback((id: string) => {
    setReservations(current => {
      if (!current.has(id)) {
        return current
      }

      const next = new Map(current)

      next.delete(id)

      return next
    })
  }, [])

  const value = useMemo<AdaptiveSidecarShellContextValue>(
    () => ({
      reservation: resolveActiveReservation(reservations),
      registerReservation,
      unregisterReservation
    }),
    [registerReservation, reservations, unregisterReservation]
  )

  return <AdaptiveSidecarShellContext.Provider value={value}>{children}</AdaptiveSidecarShellContext.Provider>
}

export const useAdaptiveSidecarShell = () => useContext(AdaptiveSidecarShellContext)
