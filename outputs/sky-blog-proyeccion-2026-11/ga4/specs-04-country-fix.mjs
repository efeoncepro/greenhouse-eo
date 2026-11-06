// Corrección del split por país: la consulta yearMonth×country (todos los países) trae metadata.dataLossFromOtherRow=true
// y la suma de filas queda 3-25 % bajo el total deduplicado. Aquí: sólo los 4 países (cardinalidad baja) y "Other" = total − suma.
import { and, scope, organic, dims, mets } from './lib.mjs'

const inC = { filter: { fieldName: 'country', inListFilter: { values: ['Chile', 'Peru', 'Argentina', 'Brazil'] } } }
const FULL = [{ startDate: '2023-01-01', endDate: '2026-11-04' }]

export default [
  { name: 'series-organic-scope-country4-monthly', kind: 'report', body: { dateRanges: FULL, dimensions: dims('yearMonth', 'country'), metrics: mets('sessions'), dimensionFilter: and(scope, organic, inC) } },
  { name: 'check-country-2026-10', kind: 'report', body: { dateRanges: [{ startDate: '2026-10-01', endDate: '2026-10-31' }], dimensions: dims('country'), metrics: mets('sessions'), dimensionFilter: and(scope, organic) } },
  { name: 'check-country-2025-01', kind: 'report', body: { dateRanges: [{ startDate: '2025-01-01', endDate: '2025-01-31' }], dimensions: dims('country'), metrics: mets('sessions'), dimensionFilter: and(scope, organic) } }
]
