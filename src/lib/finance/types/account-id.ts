import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-708 Slice 0 — Branded AccountId type.
 *
 * Marca a nivel TypeScript que un valor representa un account_id canónico de
 * `greenhouse_finance.accounts`. Las APIs canónicas (recordPayment, recordExpensePayment,
 * orchestrateSettlement, listReconciliationCandidatesByAccount) reciben `AccountId`,
 * NO `string | null`. Pasar un `string` crudo o `null` deja de compilar.
 *
 * El brand es solo en compile time (no runtime). Para construir un AccountId desde
 * un string crudo se usa `parseAccountId(...)` que valida existencia en la base.
 */
export type AccountId = string & { readonly __brand: 'AccountId' }

export class InvalidAccountIdError extends Error {
  constructor(public readonly raw: string, message: string) {
    super(message)
    this.name = 'InvalidAccountIdError'
  }
}

/**
 * Construye un `AccountId` a partir de un string crudo, garantizando que la
 * cuenta existe en `greenhouse_finance.accounts`.
 *
 * Hard rules:
 *   - lanza `InvalidAccountIdError` si `raw` es vacío, null, undefined o no existe.
 *   - tenant isolation NO se valida acá; el caller debe garantizarlo (un account_id
 *     siempre vive bajo un space, pero la pertenencia se verifica en API routes
 *     vía `requireFinanceTenantContext`).
 */
export const parseAccountId = async (raw: string | null | undefined): Promise<AccountId> => {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    throw new InvalidAccountIdError(String(raw), 'AccountId cannot be empty, null or whitespace')
  }

  const trimmed = raw.trim()

  const rows = await runGreenhousePostgresQuery<{ account_id: string }>(
    'SELECT account_id FROM greenhouse_finance.accounts WHERE account_id = $1 LIMIT 1',
    [trimmed]
  )

  if (rows.length === 0) {
    throw new InvalidAccountIdError(trimmed, `AccountId "${trimmed}" does not exist in greenhouse_finance.accounts`)
  }

  return trimmed as AccountId
}

/**
 * Variante sincrónica que asume que el caller ya validó existencia (e.g. el SQL
 * que produjo el row tiene FK a accounts). Usar con precaución: salta la
 * verificación y solo aplica el brand en compile time.
 */
export const trustAccountId = (raw: string): AccountId => raw as AccountId

/**
 * Variante que devuelve `AccountId | null`. Para flujos donde el campo es
 * legítimamente opcional (e.g. lookup que puede no encontrar match).
 */
export const parseAccountIdOptional = async (raw: string | null | undefined): Promise<AccountId | null> => {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return null
  }

  try {
    return await parseAccountId(raw)
  } catch (error) {
    if (error instanceof InvalidAccountIdError) {
      return null
    }

    throw error
  }
}
