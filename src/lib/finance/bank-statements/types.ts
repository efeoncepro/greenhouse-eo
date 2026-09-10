/**
 * Bank statement adapters — contrato compartido.
 *
 * Cada adapter convierte un archivo/exporte real de un banco o fintech en filas
 * canónicas de `bank_statement_rows`. Convención de signo (misma que
 * `csv-parser.ts`): `amount` positivo = abono/entrada de caja para el titular,
 * negativo = cargo/salida. Para instrumentos liability (TC) se mantiene la
 * convención de caja: un cargo de la tarjeta es negativo y un pago a la
 * tarjeta es positivo; el materializer de saldos invierte el signo por
 * `account_kind`, no el adapter.
 */

export type BankStatementSourceFormat =
  | 'santander_cartola_xlsx'
  | 'santander_tc_movimientos_xlsx'
  | 'santander_tc_estado_cuenta_text'
  | 'global66_xls'
  | 'bancochile_cuenta_vista_text'

export const BANK_STATEMENT_SOURCE_FORMATS: BankStatementSourceFormat[] = [
  'santander_cartola_xlsx',
  'santander_tc_movimientos_xlsx',
  'santander_tc_estado_cuenta_text',
  'global66_xls',
  'bancochile_cuenta_vista_text'
]

export const BANK_STATEMENT_SOURCE_FORMAT_LABELS: Record<BankStatementSourceFormat, string> = {
  santander_cartola_xlsx: 'Santander — cartola cuenta corriente (XLSX Office Banking)',
  santander_tc_movimientos_xlsx: 'Santander — últimos movimientos tarjeta de crédito (XLSX)',
  santander_tc_estado_cuenta_text: 'Santander — estado de cuenta tarjeta de crédito (texto del PDF)',
  global66_xls: 'Global66 — movimientos de cuenta (XLS)',
  bancochile_cuenta_vista_text: 'Banco de Chile — estado de cuenta Cuenta Vista (texto del PDF)'
}

export interface ParsedStatementRow {
  /** YYYY-MM-DD */
  transactionDate: string
  /** YYYY-MM-DD, cuando el origen distingue fecha contable de fecha operación */
  valueDate?: string | null
  description: string
  reference: string | null
  /** positivo = abono, negativo = cargo (moneda del instrumento) */
  amount: number
  /** saldo running si el origen lo trae por fila; si no, null */
  balance: number | null
}

export interface ParsedStatementMeta {
  accountNumber?: string | null
  currency?: string | null
  /** YYYY-MM-DD */
  periodFrom?: string | null
  /** YYYY-MM-DD */
  periodTo?: string | null
  openingBalance?: number | null
  closingBalance?: number | null
  /** filas leídas del origen antes de filtrar (para auditoría del import) */
  rawRowCount: number
}

export interface ParsedStatement {
  format: BankStatementSourceFormat
  rows: ParsedStatementRow[]
  meta: ParsedStatementMeta
}
