export {
  loadChileTaxCodes,
  clearChileTaxCodesCache
} from './catalog'

export {
  resolveChileTaxCode,
  tryResolveChileTaxCode,
  ChileTaxCodeNotFoundError
} from './resolver'

export {
  computeChileTaxAmounts,
  computeChileTaxSnapshot,
  validateChileTaxSnapshot,
  ChileTaxComputeError
} from './compute'

export type {
  ChileTaxAmounts,
  ChileTaxCodeId,
  ChileTaxSnapshot,
  TaxCodeKind,
  TaxCodeLookupContext,
  TaxCodeRecord,
  TaxComputeInput,
  TaxRecoverability,
  TaxSnapshotInput
} from './types'

export { CHILE_TAX_CODE_IDS, TAX_CODE_KINDS, TAX_RECOVERABILITY_VALUES } from './types'
