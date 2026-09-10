import { FinanceValidationError } from '@/lib/finance/shared'

import { cleanText, parseClNumber } from './parse-helpers'
import type { ParsedStatement, ParsedStatementRow } from './types'

/**
 * Banco de Chile — "Estado de Cuenta CUENTA VISTA" (PDF mensual, FAN
 * Emprende), a partir del texto con layout (`pdftotext -layout`, clave = 4
 * últimos dígitos del RUT del titular sin DV).
 *
 *   DD/MM   DETALLE DE TRANSACCION   SUCURSAL   [N° DOCTO]   [CARGOS]   [DEPOSITOS]   SALDO
 *
 * El PDF trae el año sólo en el rango DESDE/HASTA; cada fila lleva DD/MM. Las
 * filas SALDO INICIAL / SALDO FINAL van a `meta`. Cargos → negativos; el
 * saldo running de cada fila se conserva en `balance`.
 */
export const detectBancoChileCuentaVistaText = (text: string): boolean =>
  /CUENTA VISTA/i.test(text) && /DETALLE DE TRANSACCION/i.test(text) && /SALDO INICIAL/i.test(text)

const RANGE = /DESDE\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s+HASTA\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i
const MOVEMENT_LINE = /^\s*(?<day>\d{2})\/(?<month>\d{2})\s+(?<rest>.+?)\s+(?<amounts>(?:-?[\d.]+\s+){1,2}-?[\d.]+)\s*$/
const BALANCE_LINE = /^\s*(?<day>\d{2})\/(?<month>\d{2})\s+SALDO (?<kind>INICIAL|FINAL)\s+(?<balance>-?[\d.]+)\s*$/i

export const parseBancoChileCuentaVistaText = (text: string): ParsedStatement => {
  if (!detectBancoChileCuentaVistaText(text)) {
    throw new FinanceValidationError('El texto no corresponde a un estado de cuenta de Cuenta Vista Banco de Chile.')
  }

  const range = text.match(RANGE)

  if (!range) {
    throw new FinanceValidationError('No se encontró el rango DESDE/HASTA del estado de cuenta.')
  }

  const periodFrom = `${range[3]}-${range[2]}-${range[1]}`
  const periodTo = `${range[6]}-${range[5]}-${range[4]}`
  const yearFrom = Number(range[3])
  const yearTo = Number(range[6])

  const yearFor = (month: number) => (yearFrom !== yearTo && month === Number(range[2]) && Number(range[2]) === 12 ? yearFrom : yearTo)

  const rows: ParsedStatementRow[] = []
  let openingBalance: number | null = null
  let closingBalance: number | null = null
  let rawRowCount = 0
  let previousBalance: number | null = null

  for (const line of text.split(/\r?\n/)) {
    const balanceMatch = line.match(BALANCE_LINE)

    if (balanceMatch?.groups) {
      const value = parseClNumber(balanceMatch.groups.balance)

      if (balanceMatch.groups.kind.toUpperCase() === 'INICIAL') {
        openingBalance = value
        previousBalance = value
      } else closingBalance = value

      continue
    }

    const match = line.match(MOVEMENT_LINE)

    if (!match?.groups) continue

    const numbers = match.groups.amounts.trim().split(/\s+/).map(parseClNumber)
    const rawParts = match.groups.rest.trim().split(/\s{2,}/).map(cleanText).filter(Boolean)
    const description = rawParts[0] || 'Movimiento'
    const reference = rawParts.length > 2 && /^\d+$/.test(rawParts[rawParts.length - 1]) ? rawParts[rawParts.length - 1] : null

    rawRowCount++

    // Con dos números la primera columna es el monto y la última el saldo
    // running; con uno solo, es el monto (el saldo se perdió en el layout).
    const magnitude = Math.abs(numbers[0])
    const reportedBalance = numbers.length >= 2 ? numbers[numbers.length - 1] : null
    const isDeposit = /TRASPASO DE:|DEPOSITO|ABONO|TRANSFERENCIA DE/i.test(description)
    const isCharge = /TRASPASO A:|CARGO|PAGO|GIRO|COMISION|TRANSFERENCIA A/i.test(description)

    let sign: 1 | -1

    if (isDeposit && !isCharge) sign = 1
    else if (isCharge && !isDeposit) sign = -1
    else if (previousBalance != null && reportedBalance != null) sign = reportedBalance >= previousBalance ? 1 : -1
    else sign = 1

    const amount = sign * magnitude

    // El saldo impreso se conserva sólo cuando cierra con el anterior; si el
    // layout lo desplazó (ej. "0" en la columna), se omite antes que mentir.
    const consistentBalance = reportedBalance != null && previousBalance != null && Math.abs(previousBalance + amount - reportedBalance) < 1
      ? reportedBalance
      : previousBalance != null
        ? Math.round((previousBalance + amount) * 100) / 100
        : reportedBalance

    previousBalance = consistentBalance

    const month = Number(match.groups.month)

    rows.push({
      transactionDate: `${yearFor(month)}-${match.groups.month}-${match.groups.day}`,
      description,
      reference: reference && /^\d+$/.test(reference) ? reference : null,
      amount: Math.round(amount * 100) / 100,
      balance: consistentBalance
    })
  }

  const account = text.match(/N[°º] DE CUENTA\s*:\s*(\S+)/i)

  return {
    format: 'bancochile_cuenta_vista_text',
    rows,
    meta: {
      accountNumber: account ? account[1] : null,
      currency: 'CLP',
      periodFrom,
      periodTo,
      openingBalance,
      closingBalance,
      rawRowCount
    }
  }
}
