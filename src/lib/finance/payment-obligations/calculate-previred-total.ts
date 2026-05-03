/**
 * TASK-759 V2 — Cálculo canónico del monto Previred a pagar a partir de
 * payroll entries.
 *
 * EXTRAÍDO de materialize-payroll.ts para que sea pure-testable. Cualquier
 * cambio a la fórmula DEBE ir aquí + actualizar el test de regresión.
 *
 * **REGLA DURA**: Previred recibe la suma TOTAL de cotizaciones previsionales
 * que Greenhouse paga al processor — empleador + empleado descontado del
 * bruto + APV opcional. SII (impuesto único, retención honorarios) NO va aquí.
 *
 * Componentes (7 columnas de payroll_entries):
 *  - Empleado descontado del bruto:
 *      • chile_afp_amount (AFP)
 *      • chile_health_amount (FONASA / ISAPRE)
 *      • chile_unemployment_amount (AFC empleado)
 *      • chile_apv_amount (APV opcional)
 *  - Empleador sobre el bruto:
 *      • chile_employer_cesantia_amount (AFC empleador)
 *      • chile_employer_mutual_amount (Mutual)
 *      • chile_employer_sis_amount (SIS)
 *
 * NO incluye:
 *  - chile_employer_total_cost (alias agregado, lleva double-counting si se mezcla)
 *  - sii_retention_amount (SII, no Previred)
 *  - net_total / gross_total (montos al colaborador, no al processor)
 */

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

export interface PreviredEntryInput {
  chile_afp_amount: number | string | null
  chile_health_amount: number | string | null
  chile_unemployment_amount: number | string | null
  chile_apv_amount: number | string | null
  chile_employer_cesantia_amount: number | string | null
  chile_employer_mutual_amount: number | string | null
  chile_employer_sis_amount: number | string | null
}

export interface PreviredEntryBreakdown {
  afpEmployee: number
  healthEmployee: number
  unemploymentEmployee: number
  apvEmployee: number
  cesantiaEmployer: number
  mutualEmployer: number
  sisEmployer: number
  total: number
}

export const calculatePreviredEntryBreakdown = (e: PreviredEntryInput): PreviredEntryBreakdown => {
  const afpEmployee = toNum(e.chile_afp_amount)
  const healthEmployee = toNum(e.chile_health_amount)
  const unemploymentEmployee = toNum(e.chile_unemployment_amount)
  const apvEmployee = toNum(e.chile_apv_amount)
  const cesantiaEmployer = toNum(e.chile_employer_cesantia_amount)
  const mutualEmployer = toNum(e.chile_employer_mutual_amount)
  const sisEmployer = toNum(e.chile_employer_sis_amount)

  return {
    afpEmployee,
    healthEmployee,
    unemploymentEmployee,
    apvEmployee,
    cesantiaEmployer,
    mutualEmployer,
    sisEmployer,
    total:
      afpEmployee +
      healthEmployee +
      unemploymentEmployee +
      apvEmployee +
      cesantiaEmployer +
      mutualEmployer +
      sisEmployer
  }
}

export const calculatePreviredTotal = (entries: PreviredEntryInput[]): number =>
  entries.reduce((sum, e) => sum + calculatePreviredEntryBreakdown(e).total, 0)
