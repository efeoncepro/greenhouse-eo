import { FinanceValidationError } from '@/lib/finance/shared'

/** "-1,162,700" · "335.15" · "1.29" (formato en-US del Office Banking) */
export const parseUsNumber = (raw: unknown): number => {
  const text = String(raw ?? '').trim()

  if (!text) return 0

  const value = Number(text.replace(/,/g, ''))

  if (!Number.isFinite(value)) {
    throw new FinanceValidationError(`Monto inválido en el extracto: "${text}"`)
  }

  return value
}

/** "$ 55.244" · "$ -1.435.296" · "9.403" (formato chileno con miles por punto) */
export const parseClNumber = (raw: unknown): number => {
  const text = String(raw ?? '').replace(/\$/g, '').replace(/\s/g, '').trim()

  if (!text) return 0

  const negative = text.startsWith('-')
  const digits = text.replace(/^-/, '').replace(/\./g, '').replace(',', '.')
  const value = Number(digits)

  if (!Number.isFinite(value)) {
    throw new FinanceValidationError(`Monto inválido en el extracto: "${raw}"`)
  }

  return negative ? -value : value
}

/** "800730.0" · "834963.00" (formato plano de Global66) */
export const parsePlainNumber = (raw: unknown): number => {
  const text = String(raw ?? '').trim()

  if (!text) return 0

  const value = Number(text)

  if (!Number.isFinite(value)) {
    throw new FinanceValidationError(`Monto inválido en el extracto: "${text}"`)
  }

  return value
}

/** DD/MM/YYYY o DD/MM/YY → YYYY-MM-DD */
export const parseDmyDate = (raw: unknown): string => {
  const text = String(raw ?? '').trim()
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)

  if (!match) {
    throw new FinanceValidationError(`Fecha inválida en el extracto: "${text}" (se esperaba DD/MM/AAAA)`)
  }

  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3].length === 2 ? `20${match[3]}` : match[3]

  return `${year}-${month}-${day}`
}

/** "2026-09-03 18:50:37" → YYYY-MM-DD */
export const parseIsoDateTime = (raw: unknown): string => {
  const text = String(raw ?? '').trim()
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)

  if (!match) {
    throw new FinanceValidationError(`Fecha inválida en el extracto: "${text}" (se esperaba AAAA-MM-DD)`)
  }

  return match[1]
}

export const cleanText = (raw: unknown): string => String(raw ?? '').replace(/\s+/g, ' ').trim()

/** Referencias tipo "0", "000000000" o vacías no aportan y se normalizan a null. */
export const cleanReference = (raw: unknown): string | null => {
  const text = cleanText(raw)

  if (!text || /^0+$/.test(text)) return null

  return text
}

/** Matriz de celdas (header:1 de SheetJS) → primera fila cuyo primer valor cumple el predicado. */
export const findRowIndex = (
  grid: unknown[][],
  predicate: (cells: string[]) => boolean,
  from = 0
): number => {
  for (let i = from; i < grid.length; i++) {
    const cells = (grid[i] ?? []).map(cleanText)

    if (predicate(cells)) return i
  }

  return -1
}
