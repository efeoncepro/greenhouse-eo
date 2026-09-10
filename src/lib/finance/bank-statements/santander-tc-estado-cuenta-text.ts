import { FinanceValidationError } from '@/lib/finance/shared'

import { cleanText, parseClNumber, parseDmyDate } from './parse-helpers'
import type { ParsedStatement, ParsedStatementRow } from './types'

/**
 * Santander — "Estado de cuenta en moneda nacional de tarjeta de crédito"
 * (PDF mensual), a partir del texto extraído con layout (`pdftotext -layout`
 * o el texto seleccionado del visor).
 *
 * Filas de operación:
 *   LUGAR   DD/MM/AA  DESCRIPCIÓN [US|CL|EU  monto origen]  $cargo
 *   (vacío) DD/MM/AA  MONTO CANCELADO             $ -1.435.296
 *
 * Cargos → negativos; `MONTO CANCELADO` (pago recibido por la tarjeta) →
 * positivo; comisiones → negativas. `meta` expone período facturado, cupo
 * utilizado (cierre) y el saldo adeudado al inicio del ciclo.
 */
export const detectSantanderTcEstadoCuentaText = (text: string): boolean =>
  /ESTADO DE CUENTA EN MONEDA NACIONAL DE TARJETA DE CR/i.test(text)

const OPERATION_LINE =
  /^\s*(?<place>\S.*?)?\s*(?<date>\d{2}\/\d{2}\/\d{2})\s+(?<desc>.+?)\s+(?:(?<origin>US|CL|EU|AR|MX|BR|GB)\s+[\d.,]+\s+)?\$\s?(?<amount>-?[\d.]+)\s*$/

const isNoiseDescription = (desc: string): boolean =>
  /^(PER[IÍ]ODO DE FACTURACI|SALDO ADEUDADO|MONTO FACTURADO|MONTO PAGADO|PAGAR HASTA)/i.test(desc)

export const parseSantanderTcEstadoCuentaText = (text: string): ParsedStatement => {
  if (!detectSantanderTcEstadoCuentaText(text)) {
    throw new FinanceValidationError('El texto no corresponde a un estado de cuenta de tarjeta de crédito Santander.')
  }

  const rows: ParsedStatementRow[] = []
  let rawRowCount = 0

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(OPERATION_LINE)

    if (!match?.groups) continue

    const desc = cleanText(match.groups.desc)

    if (isNoiseDescription(desc)) continue

    rawRowCount++

    const amount = parseClNumber(match.groups.amount)
    const place = cleanText(match.groups.place ?? '')
    const isPayment = /^MONTO CANCELADO/i.test(desc)

    rows.push({
      transactionDate: parseDmyDate(match.groups.date),
      description: isPayment ? 'Pago tarjeta (MONTO CANCELADO)' : [desc, place ? `(${place})` : ''].filter(Boolean).join(' '),
      reference: null,
      amount: isPayment ? Math.abs(amount) : -Math.abs(amount),
      balance: null
    })
  }

  const period = text.match(/PER[IÍ]ODO FACTURADO\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/i)
  const cupoUtilizado = text.match(/CUPO TOTAL\s+\$\s?[\d.]+\s+\$\s?([\d.]+)/i)
  const previousBill = text.match(/MONTO FACTURADO A PAGAR \(PER[IÍ]ODO ANTERIOR\)\s+\$\s?(-?[\d.]+)/i)
  const cardMatch = text.match(/N[º°] DE TARJETA DE CR[EÉ]DITO\s+(XXXX XXXX XXXX \d{4})/i)

  return {
    format: 'santander_tc_estado_cuenta_text',
    rows,
    meta: {
      accountNumber: cardMatch ? cardMatch[1].replace(/\s/g, '') : null,
      currency: 'CLP',
      periodFrom: period ? parseDmyDate(period[1]) : null,
      periodTo: period ? parseDmyDate(period[2]) : null,
      openingBalance: previousBill ? parseClNumber(previousBill[1]) : null,
      closingBalance: cupoUtilizado ? parseClNumber(cupoUtilizado[1]) : null,
      rawRowCount
    }
  }
}
