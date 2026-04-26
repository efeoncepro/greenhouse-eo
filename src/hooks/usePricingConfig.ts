'use client'

import { useQuery } from '@tanstack/react-query'

import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import { qk } from '@/lib/react-query'

/**
 * TASK-513 — Migration example #2.
 *
 * Antes el QuoteBuilderShell hacía un useEffect + fetch al
 * `/api/finance/quotes/pricing/config` en cada mount. Cada vez que un
 * usuario abria un nuevo quote, re-fetcheaba el catalog completo.
 *
 * Con `staleTime: 5min` el catalog se cachea agresivamente: business
 * lines, commercial models y country factors casi no cambian intra-sesion.
 * El shell ahora consume el query y no necesita gestionar AbortController
 * ni state de loading manual.
 */
export interface PricingConfigCatalog {
  commercialModelMultipliers?: Array<{
    modelCode: CommercialModelCode
    modelLabel: string
    multiplierPct: number
  }>
  countryPricingFactors?: Array<{
    factorCode: string
    factorLabel: string
    factorOpt: number
  }>
  businessLines?: Array<{
    moduleCode: string
    label: string
    isActive?: boolean
    sortOrder?: number
  }>
  employmentTypes?: Array<{
    employmentTypeCode: string
    labelEs: string
    active?: boolean
  }>
}

interface PricingConfigResponse {
  catalog?: PricingConfigCatalog
}

const fetchPricingConfig = async (): Promise<PricingConfigCatalog> => {
  const res = await fetch('/api/finance/quotes/pricing/config')

  if (!res.ok) {
    throw new Error(`Failed to fetch pricing config: ${res.status}`)
  }

  const data = (await res.json()) as PricingConfigResponse

  return data.catalog ?? {}
}

const usePricingConfig = () => {
  return useQuery({
    queryKey: qk.finance.quotes.pricingConfig,
    queryFn: fetchPricingConfig,

    /*
      Catalog data: muta solo cuando finance edita el pricing catalog
      desde Admin Center. 5 minutos cubre la sesion tipica del Quote
      Builder y reduce ~80% los hits al endpoint.
    */
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false
  })
}

export default usePricingConfig
