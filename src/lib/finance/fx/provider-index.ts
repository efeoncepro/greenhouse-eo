// Central registry mapping FxProviderCode → adapter instance.
//
// Consumers (sync orchestrator, admin endpoint, backfill script) look up
// adapters by code from here. Adding a new provider:
//   1. Create src/lib/finance/fx/providers/<name>.ts exporting `<name>Adapter`
//   2. Add its code to `FX_PROVIDER_CODES` in provider-adapter.ts
//   3. Register it here.

import type { FxProviderAdapter, FxProviderCode } from './provider-adapter'
import { mindicadorAdapter } from './providers/mindicador'
import { openErApiAdapter } from './providers/open-er-api'
import { banxicoSieAdapter } from './providers/banxico-sie'
import { datosGovCoTrmAdapter } from './providers/datos-gov-co-trm'
import { apisNetPeSunatAdapter } from './providers/apis-net-pe-sunat'
import { bcrpAdapter } from './providers/bcrp'
import { fawazAhmedAdapter } from './providers/fawaz-ahmed'
import { frankfurterAdapter } from './providers/frankfurter'
import { clfFromIndicatorsAdapter } from './providers/clf-from-indicators'

const PROVIDER_INDEX: Record<Exclude<FxProviderCode, 'manual'>, FxProviderAdapter> = {
  mindicador: mindicadorAdapter,
  open_er_api: openErApiAdapter,
  banxico_sie: banxicoSieAdapter,
  datos_gov_co_trm: datosGovCoTrmAdapter,
  apis_net_pe_sunat: apisNetPeSunatAdapter,
  bcrp: bcrpAdapter,
  fawaz_ahmed: fawazAhmedAdapter,
  frankfurter: frankfurterAdapter,
  clf_from_indicators: clfFromIndicatorsAdapter
}

export const getFxProviderAdapter = (code: FxProviderCode): FxProviderAdapter | null => {
  if (code === 'manual') return null

  return PROVIDER_INDEX[code] ?? null
}

export const listAllFxProviderAdapters = (): FxProviderAdapter[] => Object.values(PROVIDER_INDEX)
