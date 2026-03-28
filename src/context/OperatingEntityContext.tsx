'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────

export interface OperatingEntity {
  organizationId: string
  legalName: string
  taxId: string
  taxIdType: string | null
  legalAddress: string | null
  country: string
}

type OperatingEntityContextValue = {
  operatingEntity: OperatingEntity | null
}

// ─── Context ────────────────────────────────────────────────────────────

const OperatingEntityContext = createContext<OperatingEntityContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────────────────────

type Props = {
  children: ReactNode
  operatingEntity: OperatingEntity | null
}

export const OperatingEntityProvider = ({ children, operatingEntity }: Props) => {
  const value = useMemo(() => ({ operatingEntity }), [operatingEntity])

  return (
    <OperatingEntityContext.Provider value={value}>
      {children}
    </OperatingEntityContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────────────────────

export const useOperatingEntity = (): OperatingEntity | null => {
  const context = useContext(OperatingEntityContext)

  if (context === null) {
    throw new Error('useOperatingEntity must be used within an OperatingEntityProvider')
  }

  return context.operatingEntity
}
