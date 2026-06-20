import 'server-only'

import { isPpmPositionEnabled } from '@/lib/finance/ppm/flags'
import { getPpmMonthlyPosition, type PpmMonthlyPositionRecord } from '@/lib/finance/ppm-ledger'
import { isRetentionPositionEnabled } from '@/lib/finance/retention/flags'
import { getRetentionMonthlyPosition, type RetentionMonthlyPositionRecord } from '@/lib/finance/retention-ledger'
import { getVatMonthlyPosition, type VatMonthlyPositionRecord } from '@/lib/finance/vat-ledger'

/**
 * TASK-1195 — Posición F29 mensual CONSOLIDADA (child E de la umbrella TASK-1186).
 *
 * Une las 3 líneas mensuales del F29 ya materializadas por entidad legal:
 *   · IVA        (TASK-725  `vat-ledger.ts`)        — débito − crédito = neto IVA
 *   · Retención  (TASK-1188 `retention-ledger.ts`)  — total retención practicada (BHE)
 *   · PPM        (TASK-1189 `ppm-ledger.ts`)        — base × tasa = PPM
 *
 * **Composición pura**: este reader NUNCA recomputa una posición ni emite SQL fiscal
 * nuevo — sólo invoca los 3 readers canónicos y agrega su salida en un VM unificado.
 * No materializa nada, no toca schema. Es el primitive gobernado (un reader, muchos
 * consumers: UI Finance, Nexa, CLI/contador) por Full API Parity.
 *
 * Scope fiscal = operating entity (`legalEntityOrganizationId`), NUNCA `space_id`:
 * el F29 se declara por RUT de la entidad legal, igual que sus 3 líneas.
 *
 * Cada línea puede venir `null` si no hay posición materializada del período
 * (degradación honesta — el consumer distingue "sin materializar" de "cero").
 *
 * `enabledByLine` propaga el flag de rollout de cada línea (IVA sin flag = siempre
 * oficial; retención/PPM gated por `RETENTION_POSITION_ENABLED`/`PPM_POSITION_ENABLED`).
 * Un consumer NUNCA debe totalizar como F29 oficial una línea con `enabled:false`
 * (cifra en shadow, no validada por el contador).
 */

export interface F29LineEnablement {
  /** IVA no tiene flag de rollout: la línea es oficial siempre. */
  vat: boolean
  /** `RETENTION_POSITION_ENABLED` (default OFF → shadow). */
  retention: boolean
  /** `PPM_POSITION_ENABLED` (default OFF → shadow). */
  ppm: boolean
}

export interface F29ConsolidatedMonthlyPosition {
  legalEntityOrganizationId: string
  year: number
  month: number
  /** `YYYY-MM`. */
  periodId: string
  /** Estado oficial vs shadow por línea (rollout flags). */
  enabledByLine: F29LineEnablement
  /** Línea IVA del período (débito/crédito/neto). `null` si no materializada. */
  vat: VatMonthlyPositionRecord | null
  /** Línea retenciones del período (total practicado). `null` si no materializada. */
  retention: RetentionMonthlyPositionRecord | null
  /** Línea PPM del período (base × tasa). `null` si no materializada. */
  ppm: PpmMonthlyPositionRecord | null
}

const padMonth = (month: number) => String(month).padStart(2, '0')

export const buildF29PeriodId = (year: number, month: number) => `${year}-${padMonth(month)}`

/**
 * Compone la posición F29 mensual consolidada para una entidad legal y período.
 *
 * Llama los 3 readers canónicos en paralelo y arma el VM unificado. NO recomputa:
 * la cifra de cada línea es exactamente la que su reader canónico expone.
 */
export async function getF29ConsolidatedMonthlyPosition(params: {
  legalEntityOrganizationId: string
  year: number
  month: number
}): Promise<F29ConsolidatedMonthlyPosition> {
  const { legalEntityOrganizationId, year, month } = params

  const [vat, retention, ppm] = await Promise.all([
    getVatMonthlyPosition({ legalEntityOrganizationId, year, month }),
    getRetentionMonthlyPosition({ legalEntityOrganizationId, year, month }),
    getPpmMonthlyPosition({ legalEntityOrganizationId, year, month })
  ])

  return {
    legalEntityOrganizationId,
    year,
    month,
    periodId: buildF29PeriodId(year, month),
    enabledByLine: {
      vat: true,
      retention: isRetentionPositionEnabled(),
      ppm: isPpmPositionEnabled()
    },
    vat,
    retention,
    ppm
  }
}
