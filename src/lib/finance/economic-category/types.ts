/**
 * TASK-768 — Finance Expense Economic Category Dimension
 *
 * Tipo canónico para la dimensión analítica/operativa de expenses e income.
 * SEPARADA y ortogonal a la dimensión taxonómica fiscal (`expense_type`,
 * `income_type` legacy).
 *
 * Reglas duras:
 * - NUNCA recomputar `economic_category` en read-time desde un consumer.
 * - NUNCA mapear `expense_type` → `economic_category` en code paths nuevos
 *   (cae en el ACCOUNTING_TYPE_TRANSPARENT_MAP rule del resolver, no en
 *   consumers). El resolver es la única fuente de verdad para el mapping.
 * - Los consumers ANALÍTICOS (KPIs, ICO, P&L gerencial, Member Loaded Cost,
 *   Budget Engine, Cost Attribution) leen `economic_category` directo de la
 *   columna persistida o de la VIEW canónica `expense_payments_normalized`.
 * - Los consumers FISCALES (SII, VAT, IVA engine, regulatory reports)
 *   siguen leyendo `expense_type` (taxonomy contable). Esa columna NO se
 *   modifica por TASK-768.
 */

/**
 * Categoría económica para expenses. 11 valores canónicos.
 *
 * Mapping (ortogonal a `expense_type`):
 *
 * - `labor_cost_internal`        — nómina chilena interna (employee/internal team_member)
 * - `labor_cost_external`        — nómina internacional via Deel/Remote/Global66/transferencia
 *                                  directa a contractor o internacional contributor
 * - `vendor_cost_saas`           — suscripciones SaaS (Adobe, Vercel, Notion, Anthropic, GitHub)
 * - `vendor_cost_professional_services` — servicios profesionales (Beeconta, contadora externa,
 *                                  legal counsel, consultoría)
 * - `regulatory_payment`         — Previred, AFP, Mutual, Isapre, FONASA, TGR, Dirección del Trabajo
 * - `tax`                        — IVA, F29, retenciones SII directas
 * - `financial_cost`             — intereses, cuotas créditos, factoring fees
 * - `bank_fee_real`              — comisiones bancarias operativas reales (mantención cuenta,
 *                                  comisión transferencia local)
 * - `overhead`                   — costos generales no atribuibles a una de las categorías arriba
 * - `financial_settlement`       — settlements internos (placeholder para futuras
 *                                  intercompany_transfer / loan_principal)
 * - `other`                      — fallback explícito; emite reliability signal si count > 0
 */
export const EXPENSE_ECONOMIC_CATEGORIES = [
  'labor_cost_internal',
  'labor_cost_external',
  'vendor_cost_saas',
  'vendor_cost_professional_services',
  'regulatory_payment',
  'tax',
  'financial_cost',
  'bank_fee_real',
  'overhead',
  'financial_settlement',
  'other'
] as const

export type ExpenseEconomicCategory = (typeof EXPENSE_ECONOMIC_CATEGORIES)[number]

/**
 * Categoría económica para income. 8 valores canónicos.
 *
 * - `service_revenue`            — ingreso por servicios prestados (canonical revenue path)
 * - `client_reimbursement`       — reembolso de cliente por gasto pre-aprobado
 * - `factoring_proceeds`         — anticipo de factoring (TASK-571 settlement contract)
 * - `partner_payout_offset`      — offset por partner payout (cuando un partner cobra
 *                                  directamente al cliente y nos transfiere nuestra parte)
 * - `internal_transfer_in`       — transferencia interna entre cuentas Greenhouse
 * - `tax_refund`                 — devolución SII / IVA refund
 * - `financial_income`           — intereses ganados, rendimiento de inversiones
 * - `other`                      — fallback explícito
 */
export const INCOME_ECONOMIC_CATEGORIES = [
  'service_revenue',
  'client_reimbursement',
  'factoring_proceeds',
  'partner_payout_offset',
  'internal_transfer_in',
  'tax_refund',
  'financial_income',
  'other'
] as const

export type IncomeEconomicCategory = (typeof INCOME_ECONOMIC_CATEGORIES)[number]

/**
 * Confidence del resolver. Determina si la fila se persiste directo
 * (high/medium) o se enqueue en manual_queue (low/manual_required).
 */
export const RESOLVER_CONFIDENCE_LEVELS = ['high', 'medium', 'low', 'manual_required'] as const
export type ResolverConfidence = (typeof RESOLVER_CONFIDENCE_LEVELS)[number]

/**
 * Type guards exhaustivos para uso en code paths donde un valor TEXT raw
 * de la DB necesita validarse antes de tratarse como categoría canónica.
 */
export const isExpenseEconomicCategory = (value: unknown): value is ExpenseEconomicCategory =>
  typeof value === 'string' &&
  (EXPENSE_ECONOMIC_CATEGORIES as readonly string[]).includes(value)

export const isIncomeEconomicCategory = (value: unknown): value is IncomeEconomicCategory =>
  typeof value === 'string' &&
  (INCOME_ECONOMIC_CATEGORIES as readonly string[]).includes(value)

export const isResolverConfidence = (value: unknown): value is ResolverConfidence =>
  typeof value === 'string' && (RESOLVER_CONFIDENCE_LEVELS as readonly string[]).includes(value)
