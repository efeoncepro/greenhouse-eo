// Split por país con una consulta por mes y un solo rango (sin dimensión dateRange): la forma sin pérdida "(other)"
// verificada en check-country-2025-01 / check-country-2026-10.
import { and, scope, organic, dims, mets } from './lib.mjs'

const out = []

for (let y = 2023; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
  if ((y === 2023 && m < 7) || (y === 2026 && m > 11)) continue
  const mm = String(m).padStart(2, '0'), last = y === 2026 && m === 11 ? 4 : new Date(Date.UTC(y, m, 0)).getUTCDate()

  out.push({ name: `sm-organic-country-${y}-${mm}`, kind: 'report', body: { dateRanges: [{ startDate: `${y}-${mm}-01`, endDate: `${y}-${mm}-${String(last).padStart(2, '0')}` }], dimensions: dims('country'), metrics: mets('sessions'), dimensionFilter: and(scope, organic) } })
}

export default out
