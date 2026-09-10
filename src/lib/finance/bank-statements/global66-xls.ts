import { FinanceValidationError } from '@/lib/finance/shared'

import type { WorkbookGrid } from './xlsx-grid'
import { cleanReference, cleanText, findRowIndex, parseIsoDateTime, parsePlainNumber } from './parse-helpers'
import type { ParsedStatement, ParsedStatementRow } from './types'

/**
 * Global66 Empresas — export "Movimientos de cuenta CLP|MXN|USD" (XLS).
 *
 *   Tipo de transacción | Fecha de la transacción | Monto debitado | Monto acreditado |
 *   Costo de tipo de cambio | ID Fees Asociados | Últimos 4 dígitos | Nombre tercero o Comercio |
 *   DNI del tercero | Número de cuenta del tercero | País destino | Tipo de cambio |
 *   ID de la transacción | Comentario de la transacción
 *
 * `amount = acreditado − debitado`. Las filas "Costo tipo de cambio" son
 * débitos reales de la billetera (el fee se descuenta aparte del envío), por
 * eso se conservan como movimientos. El export viene del más reciente al más
 * antiguo; se emite en orden cronológico. `periodFrom/To` sale de la fila
 * "Periodo consultado".
 */
const isGlobal66Sheet = (sheet: WorkbookGrid): boolean =>
  /^Movimientos de cuenta/i.test(sheet.sheetName) ||
  findRowIndex(sheet.grid, cells => /^Tipo de transacci/i.test(cells[0] ?? '')) >= 0

export const detectGlobal66Xls = (sheets: WorkbookGrid[]): boolean => sheets.some(isGlobal66Sheet)

export const parseGlobal66Xls = (sheets: WorkbookGrid[]): ParsedStatement => {
  const sheet = sheets.find(isGlobal66Sheet)

  if (!sheet) {
    throw new FinanceValidationError('El archivo no tiene la cabecera "Tipo de transacción" de un export Global66.')
  }

  const { grid } = sheet
  const headerIndex = findRowIndex(grid, cells => /^Tipo de transacci/i.test(cells[0] ?? ''))
  const header = grid[headerIndex].map(cleanText)
  const col = (prefix: RegExp) => header.findIndex(cell => prefix.test(cell))
  const dateCol = col(/^Fecha de la transacci/i)
  const debitCol = col(/^Monto debitado/i)
  const creditCol = col(/^Monto acreditado/i)
  const thirdPartyCol = col(/^Nombre tercero/i)
  const countryCol = col(/^Pa[ií]s destino/i)
  const counterpartyAccountCol = col(/^N[úu]mero de cuenta del tercero/i)
  const idCol = col(/^ID de la transacci/i)
  const commentCol = col(/^Comentario/i)

  const rows: ParsedStatementRow[] = []
  let rawRowCount = 0

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i].map(cleanText)

    if (!cells[0] || !cells[dateCol]) continue

    rawRowCount++

    const type = cells[0]
    const thirdParty = thirdPartyCol >= 0 ? cells[thirdPartyCol] : ''
    const country = countryCol >= 0 ? cells[countryCol] : ''
    const counterpartyAccount = counterpartyAccountCol >= 0 ? cells[counterpartyAccountCol] : ''
    const comment = commentCol >= 0 ? cells[commentCol] : ''

    // "Envío a cuenta bancaria Andres carlosama" ya incluye al tercero; no repetir.
    const descriptionParts = [
      type,
      thirdParty && !type.toLowerCase().includes(thirdParty.toLowerCase().split(' ')[0]) ? thirdParty : '',
      country ? `[${country}]` : '',
      // La cuenta destino distingue traspasos propios (Santander 92044661 vs Banco de Chile 308526005).
      counterpartyAccount ? `→ cta ${counterpartyAccount}` : '',
      comment ? `— ${comment}` : ''
    ].filter(Boolean)

    rows.push({
      transactionDate: parseIsoDateTime(cells[dateCol]),
      description: descriptionParts.join(' '),
      reference: idCol >= 0 ? cleanReference(cells[idCol]) : null,
      amount: parsePlainNumber(cells[creditCol]) - parsePlainNumber(cells[debitCol]),
      balance: null
    })
  }

  rows.reverse()

  const period = grid
    .flat()
    .map(cleanText)
    .map(cell => cell.match(/Periodo consultado:\s*(\d{4}-\d{2}-\d{2})\s+al\s+(\d{4}-\d{2}-\d{2})/i))
    .find(Boolean)

  const currencyMatch = sheet.sheetName.match(/Movimientos de cuenta\s+([A-Z]{3})/i)

  return {
    format: 'global66_xls',
    rows,
    meta: {
      currency: currencyMatch ? currencyMatch[1].toUpperCase() : null,
      periodFrom: period ? period[1] : null,
      periodTo: period ? period[2] : null,
      rawRowCount
    }
  }
}
