import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
export const SOURCE = path.join(ROOT, 'data/pricing/efeonce-pricing-model-v1.xlsx')
export const MODEL = path.join(ROOT, 'data/pricing/extracted/workbook-v1.json')
export const SCHEMA = 'efeonce.pricing-workbook.v1'

const normalize = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const round = value => Math.round((value + Number.EPSILON) * 100) / 100
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

export class WorkbookError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const fail = (code, message) => {
  throw new WorkbookError(code, message)
}

const finite = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail('missing_number', `${label}: se requiere un número finito, no null/texto.`)

  return value
}

const nonnegative = (value, label) => {
  finite(value, label)
  if (value < 0) fail('invalid_number', `${label}: debe ser >= 0.`)

  return value
}

export const worksheet = (model, name) =>
  model.sheets.find(sheet => sheet.name === name) ?? fail('sheet_not_found', name)
const valueAt = (sheet, address) => sheet.cells[address]?.value ?? null
const cellRef = (sheet, address) => ({ sheet: sheet.name, cell: address })
const numberAt = (sheet, address) => finite(valueAt(sheet, address), `${sheet.name}!${address}`)

const rows = sheet =>
  [...new Set(Object.keys(sheet.cells).map(address => Number(address.match(/\d+$/)[0])))].sort((a, b) => a - b)

export function validateModel(model) {
  if (
    model?.schemaVersion !== SCHEMA ||
    !Array.isArray(model.sheets) ||
    !/^[a-f0-9]{64}$/.test(model.source?.sha256 ?? '') ||
    typeof model.source?.path !== 'string'
  ) {
    fail('invalid_model', 'Extracción incompatible o sin procedencia SHA256.')
  }

  for (const sheet of model.sheets) {
    if (typeof sheet.name !== 'string' || !sheet.cells || typeof sheet.cells !== 'object')
      fail('invalid_model', 'Hoja inválida.')
    for (const address of Object.keys(sheet.cells))
      if (!/^[A-Z]+[1-9]\d*$/.test(address)) fail('invalid_model', `Coordenada inválida: ${address}`)
  }

  for (const name of ['Datos', 'Precios personal', 'Tier Datos', 'Tiers', 'Precios Servicios', 'Addons - Overheads'])
    worksheet(model, name)

  return model
}

export async function loadModel(filename = MODEL) {
  const model = validateModel(JSON.parse(await readFile(filename, 'utf8')))
  const source = path.resolve(ROOT, model.source.path)
  let bytes

  try {
    bytes = await readFile(source)
  } catch {
    fail('source_unavailable', 'No se puede verificar el Excel fuente. Recuperarlo antes de usar la extracción.')
  }

  if (digest(bytes) !== model.source.sha256)
    fail('source_changed', 'El Excel cambió: volver a exportar y revisar diferencias. No usar este JSON como vigente.')

  return model
}

// Sólo lectura: ExcelJS no recalcula ni guarda el archivo. Fórmulas son datos, nunca código.
export async function extractWorkbook(filename = SOURCE) {
  const { default: ExcelJS } = await import('exceljs')
  const bytes = await readFile(filename)
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(bytes)

  const scalar = value => {
    if (value == null) return null
    if (value instanceof Date) return value.toISOString()
    if (typeof value !== 'object') return value
    if (value.error) return { error: value.error }
    if (value.richText) return value.richText.map(run => run.text).join('')
    if ('text' in value) return value.text

    return value
  }

  return validateModel({
    schemaVersion: SCHEMA,
    commercialStatus: 'historical_unapproved',
    source: {
      path: path.relative(ROOT, path.resolve(filename)),
      sha256: digest(bytes),
      creator: workbook.creator ?? null,
      createdAt: workbook.created?.toISOString() ?? null,
      modifiedAt: workbook.modified?.toISOString() ?? null
    },
    calculation:
      'Cached Excel results preserved; known role equations independently audited; no general formula evaluation.',
    sheets: workbook.worksheets.map(sheet => {
      const cells = {}

      sheet.eachRow(row =>
        row.eachCell(cell => {
          if (cell.isMerged && cell.master.address !== cell.address) {
            cells[cell.address] = { value: null, mergedTo: cell.master.address }

            return
          }

          const formula = cell.formula
          const entry = { value: scalar(formula ? cell.result : cell.value) }

          if (formula) entry.formula = formula
          if (cell.value?.sharedFormula) entry.sharedFormula = cell.value.sharedFormula
          cells[cell.address] = entry
        })
      )

      return { name: sheet.name, rowCount: sheet.rowCount, columnCount: sheet.columnCount, cells }
    })
  })
}

const COMPONENTS = {
  F: 'salaryBase',
  G: 'bonusJiT',
  H: 'bonusRpA',
  I: 'bonusAR',
  J: 'bonusOverachievement',
  K: 'employmentCharges',
  L: 'deelFee'
}

export function getRoles(model) {
  const sheet = worksheet(model, 'Precios personal')
  const tierSheet = worksheet(model, 'Tier Datos')
  const policySheet = worksheet(model, 'Tiers')
  const baseHours = numberAt(worksheet(model, 'Datos'), 'O3')

  if (baseHours <= 0) fail('invalid_model', 'Horas base deben ser > 0.')
  const tierRows = rows(tierSheet).filter(r => r > 1)
  const policyRows = rows(policySheet).filter(r => r > 1)

  return rows(sheet)
    .filter(r => r > 1 && valueAt(sheet, `C${r}`))
    .map(r => {
      const label = valueAt(sheet, `C${r}`)
      const tierLabel = valueAt(sheet, `E${r}`)
      const tierRow = tierRows.find(t => normalize(valueAt(tierSheet, `A${t}`)) === normalize(tierLabel))

      if (!tierRow) fail('invalid_model', `Tier no encontrado: ${tierLabel}`)
      const policyRow = policyRows.find(t => normalize(valueAt(policySheet, `A${t}`)) === normalize(label))

      const components = Object.fromEntries(
        Object.entries(COMPONENTS).map(([col, key]) => [key, valueAt(sheet, `${col}${r}`)])
      )

      const inputCost = Object.entries(components).reduce(
        (sum, [key, value]) => sum + (value === null ? 0 : nonnegative(value, `${label}.${key}`)),
        0
      )

      const cost = nonnegative(numberAt(sheet, `M${r}`), `${label}.monthlyCostUsd`)
      const legacyPrice = nonnegative(numberAt(sheet, `W${r}`), `${label}.legacyMonthlyPriceUsd`)
      const markup = numberAt(tierSheet, `B${tierRow}`)
      const warningCodes = ['historical_costs_not_current', 'overheads_and_talent_assurance_not_included']

      if (components.employmentCharges === 0) warningCodes.push('employment_charges_zero_requires_validation')
      if (Object.values(components).some(v => v === null))
        warningCodes.push('blank_cost_components_sum_as_zero_in_excel')
      if (valueAt(sheet, `D${r}`) === 'Servicio') warningCodes.push('service_classification_not_verified_as_salary')

      return {
        sku: valueAt(sheet, `A${r}`),
        label,
        category: valueAt(sheet, `B${r}`),
        type: valueAt(sheet, `D${r}`),
        tierLabel,
        policyTier: policyRow ? valueAt(policySheet, `B${policyRow}`) : null,
        componentsUsd: components,
        monthlyCostUsd: cost,
        computedInputCostUsd: round(inputCost),
        workbookLaborHoursPerMonth: baseHours,
        cachedHourlyCostUsd: numberAt(sheet, `N${r}`),
        legacyMarkupFraction: markup,
        cachedMarginLabelFraction: numberAt(sheet, `Q${r}`),
        legacyHourlyPriceUsd: numberAt(sheet, `P${r}`),
        legacyMonthlyPriceUsd: legacyPrice,
        computedLegacyMonthlyPriceUsd: round(inputCost * (1 + markup)),
        marginOnRecordedCostsFraction: legacyPrice > 0 ? (legacyPrice - cost) / legacyPrice : null,
        warnings: warningCodes,
        provenance: {
          row: r,
          source: cellRef(sheet, `C${r}`),
          cost: cellRef(sheet, `M${r}`),
          price: cellRef(sheet, `W${r}`),
          markup: cellRef(tierSheet, `B${tierRow}`)
        }
      }
    })
}

export function findRole(model, sku) {
  return (
    getRoles(model).find(role => normalize(role.sku) === normalize(sku)) ??
    fail('role_not_found', `SKU no encontrado: ${sku}. Usar search --query.`)
  )
}

export function search(model, query, kind = 'all') {
  const kinds = {
    roles: ['Precios personal', 'C'],
    services: ['Precios Servicios', 'C'],
    tools: ['Herramientas', 'C'],
    addons: ['Addons - Overheads', 'C']
  }

  if (!query?.trim()) fail('invalid_query', 'Especificar --query con texto o SKU.')
  if (kind !== 'all' && !kinds[kind]) fail('invalid_kind', 'kind: all|roles|services|tools|addons')

  return Object.entries(kinds)
    .filter(([key]) => kind === 'all' || kind === key)
    .flatMap(([key, [name, column]]) => {
      const sheet = worksheet(model, name)

      return rows(sheet)
        .filter(r => r > 1 && valueAt(sheet, `${column}${r}`))
        .flatMap(r => {
          const label = valueAt(sheet, `${column}${r}`),
            sku = valueAt(sheet, `A${r}`)

          if (!normalize(`${label} ${sku}`).includes(normalize(query))) return []

          return [{ kind: key, sku, label, provenance: cellRef(sheet, `${column}${r}`) }]
        })
    })
}

export function readRange(model, name, range) {
  const sheet = worksheet(model, name)

  if (!range) fail('invalid_range', 'Especificar --range A1:K10 (máximo 1000 celdas).')
  const match = /^([A-Z]+)([1-9]\d*):([A-Z]+)([1-9]\d*)$/.exec(range.toUpperCase())

  if (!match) fail('invalid_range', 'Rango A1:B10 requerido.')
  const columnNumber = col => [...col].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0)
  const [, a, r1, b, r2] = match

  const first = columnNumber(a),
    last = columnNumber(b),
    start = Number(r1),
    end = Number(r2)

  if (last < first || end < start || (last - first + 1) * (end - start + 1) > 1000 || last > 16384 || end > 1048576)
    fail('invalid_range', 'Rango invertido, fuera de Excel o superior a 1000 celdas.')

  return {
    name,
    range,
    cells: Object.fromEntries(
      Object.entries(sheet.cells).filter(([address]) => {
        const [, col, row] = /^([A-Z]+)(\d+)$/.exec(address)

        return columnNumber(col) >= first && columnNumber(col) <= last && Number(row) >= start && Number(row) <= end
      })
    )
  }
}

export function audit(model) {
  const roles = getRoles(model)
  const findings = []
  const add = (code, severity, message, evidence) => findings.push({ code, severity, message, evidence })

  const formulas = model.sheets.flatMap(s =>
    Object.entries(s.cells)
      .filter(([, c]) => c.formula)
      .map(([a, c]) => ({ sheet: s.name, cell: a, ...c }))
  )

  const errors = model.sheets.flatMap(s =>
    Object.entries(s.cells)
      .filter(([, c]) => c.value?.error)
      .map(([a]) => cellRef(s, a))
  )

  if (errors.length) add('cached_excel_errors', 'error', 'Errores cacheados de Excel.', errors)

  const mismatches = roles.filter(
    r =>
      Math.abs(r.monthlyCostUsd - r.computedInputCostUsd) > 0.011 ||
      Math.abs(r.legacyMonthlyPriceUsd - r.computedLegacyMonthlyPriceUsd) > 0.011 ||
      Math.abs(r.cachedHourlyCostUsd - r.monthlyCostUsd / r.workbookLaborHoursPerMonth) > 0.0001 ||
      Math.abs(r.legacyHourlyPriceUsd * r.workbookLaborHoursPerMonth - r.legacyMonthlyPriceUsd) > 0.011 ||
      Math.abs(r.cachedMarginLabelFraction - r.legacyMarkupFraction) > 0.0001
  )

  if (mismatches.length)
    add(
      'role_arithmetic_drift',
      'error',
      'Resultados cacheados no concilian con inputs/reglas de roles.',
      mismatches.map(r => r.provenance)
    )
  add(
    'markup_is_not_margin',
    'warning',
    'El libro denomina margen al recargo sobre costo. Recargo 60% equivale a margen 37,5% sobre costos registrados.',
    roles.filter(r => r.legacyMarkupFraction === 0.6).map(r => ({ sku: r.sku, ...r.provenance.markup }))
  )

  const conflicts = roles.filter(
    r => r.policyTier !== null && Number(String(r.tierLabel).match(/\d+/)?.[0]) !== r.policyTier
  )

  if (conflicts.length)
    add(
      'tier_conflict',
      'warning',
      'Tier de precios difiere de la política en Tiers.',
      conflicts.map(r => ({ sku: r.sku, priceTier: r.tierLabel, policyTier: r.policyTier }))
    )

  for (const name of ['Tiers', 'Factor País']) {
    if (!formulas.some(c => c.formula.includes(`'${name}'!`) || c.formula.includes(`${name}!`)))
      add('disconnected_rule_sheet', 'warning', `${name} no alimenta fórmulas del libro.`, [{ sheet: name }])
  }

  if (!formulas.some(c => c.sheet === 'Precios personal' && c.formula.includes('Addons - Overheads')))
    add(
      'personnel_addons_not_applied',
      'warning',
      'Gestión, continuidad, transacciones y overhead no están integrados en precios del personal.',
      [{ sheet: 'Addons - Overheads', range: 'C2:K10' }]
    )
  add(
    'labor_hours_not_sellable_hours',
    'warning',
    'Horas laborales base no equivalen a capacidad vendible. Declarar capacidad para escenarios.',
    [{ sheet: 'Datos', cell: 'O3', value: roles[0]?.workbookLaborHoursPerMonth }]
  )
  const serviceSheet = worksheet(model, 'Precios Servicios')

  const zeroServices = rows(serviceSheet).filter(
    r =>
      r > 1 &&
      valueAt(serviceSheet, `C${r}`) &&
      (valueAt(serviceSheet, `H${r}`) === 0 || valueAt(serviceSheet, `J${r}`) === 0)
  )

  if (zeroServices.length)
    add(
      'unpriced_services',
      'warning',
      'Servicios con costo/precio cero: incompletos, no gratuitos.',
      zeroServices.map(r => ({ label: valueAt(serviceSheet, `C${r}`), sheet: serviceSheet.name, range: `H${r}:J${r}` }))
    )
  add(
    'historical_fx_requires_refresh',
    'warning',
    'Las conversiones del Excel son históricas; no se aplican en escenarios USD.',
    [{ sheet: 'Tipos de Cambio' }]
  )

  return {
    verdict: findings.some(f => f.severity === 'error') ? 'arithmetic_error' : 'historical_model_requires_validation',
    rolesChecked: roles.length,
    rolesReconciled: roles.length - mismatches.length,
    formulaCount: formulas.length,
    missingCachedFormulaResults: formulas.filter(c => c.value === null).length,
    findings
  }
}

function calculateTotals(input, assignedRoleCost) {
  const margin = nonnegative(input.targetMarginFraction, 'targetMarginFraction')
  const transaction = nonnegative(input.transactionFeeFraction, 'transactionFeeFraction')

  if (margin >= 1 || margin + transaction >= 1)
    fail('invalid_margin', 'Margen + fee sobre venta deben sumar menos de 1. Usar fracciones, p.ej. 0.40.')
  if (!Array.isArray(input.additionalMonthlyCostsUsd))
    fail('missing_costs', 'Declarar additionalMonthlyCostsUsd como array (vacío sólo como supuesto explícito).')
  const names = new Set()

  const extra = input.additionalMonthlyCostsUsd.map(item => {
    if (!item || typeof item.label !== 'string' || !item.label.trim() || names.has(normalize(item.label)))
      fail('invalid_cost', 'Cada gasto debe tener label único.')
    names.add(normalize(item.label))

    return { label: item.label, amount: nonnegative(item.amount, `${item.label}.amount`) }
  })

  const setup = nonnegative(input.setupCostUsd, 'setupCostUsd')
  const months = setup > 0 ? finite(input.amortizationMonths, 'amortizationMonths') : 1

  if (!Number.isInteger(months) || months <= 0) fail('invalid_amortization', 'Amortización: meses enteros > 0.')
  const setupMonthly = round(setup / months)
  const cost = round(assignedRoleCost + extra.reduce((sum, line) => sum + line.amount, 0) + setupMonthly)
  // Fee transaccional consume porcentaje de venta, no de costo.
  let price = Math.ceil((cost / (1 - margin - transaction)) * 100) / 100
  let transactionFee = round(price * transaction)

  // El margen mostrado usa la comisión redondeada que figura en el desglose.
  if ((price - cost - transactionFee) / price < margin - 1e-12) {
    price = Math.ceil(((cost + 0.005) / (1 - margin - transaction)) * 100) / 100
    transactionFee = round(price * transaction)
  }

  if (!Number.isFinite(price) || !Number.isFinite(cost) || price <= 0 || !Number.isSafeInteger(Math.round(price * 100)))
    fail('invalid_number', 'Escenario excede precisión monetaria o no tiene costo.')

  return {
    commercialStatus: 'hypothesis_only',
    currency: 'USD',
    monthlyCostBreakdownUsd: {
      assignedRoleCosts: round(assignedRoleCost),
      additionalCosts: extra,
      setupAmortization: setupMonthly,
      totalBeforeTransactionFees: cost
    },
    hypotheticalMonthlyPriceUsd: price,
    transactionFeeUsd: transactionFee,
    marginOnDeclaredCostsFraction: (price - cost - transactionFee) / price,
    calculation: {
      priceFormula: 'declaredCost / (1 - targetMarginFraction - transactionFeeFraction)',
      capacityFormula: 'dedicated: full monthly role cost; shared: monthly role cost * requestedHours / sellableHours'
    },
    warnings: [
      'not_an_approved_price_or_quote',
      'cost_inputs_require_independent_validation',
      'declared_costs_may_not_cover_all_overheads',
      'taxes_client_licenses_and_provider_usage_not_calculated',
      ...(setup > 0 ? ['setup_recovery_requires_amortization_term_or_separate_charge'] : [])
    ]
  }
}

// Análisis de sensibilidad; no produce PricingEngineOutputV2 ni una cotización.
export function scenario(model, sku, input) {
  const role = findRole(model, sku)

  if (!input || typeof input !== 'object' || Array.isArray(input))
    fail('invalid_scenario', 'Input debe ser objeto JSON.')

  const allowed = [
    'hoursPerMonth',
    'monthlySellableHours',
    'targetMarginFraction',
    'allocationMode',
    'assumeRemainingCapacitySold',
    'additionalMonthlyCostsUsd',
    'setupCostUsd',
    'amortizationMonths',
    'transactionFeeFraction',
    'roleCostOverrideUsd',
    'roleCostSource'
  ]

  for (const key of Object.keys(input))
    if (!allowed.includes(key)) fail('invalid_scenario', `Campo desconocido: ${key}`)
  const hours = finite(input.hoursPerMonth, 'hoursPerMonth')
  const sellable = finite(input.monthlySellableHours, 'monthlySellableHours')

  if (hours <= 0 || sellable <= 0 || hours > sellable || sellable > role.workbookLaborHoursPerMonth)
    fail('invalid_capacity', '0 < horas solicitadas <= horas vendibles <= horas laborales del libro.')
  if (!['dedicated', 'shared'].includes(input.allocationMode))
    fail('invalid_allocation', 'allocationMode: dedicated|shared')
  if (input.allocationMode === 'shared' && input.assumeRemainingCapacitySold !== true)
    fail(
      'unfunded_capacity',
      'Capacidad compartida requiere asumir explícitamente venta del resto; si no, usar dedicated.'
    )
  let monthlyRoleCost = role.monthlyCostUsd

  if (input.roleCostOverrideUsd !== undefined) {
    monthlyRoleCost = nonnegative(input.roleCostOverrideUsd, 'roleCostOverrideUsd')
    const source = input.roleCostSource

    if (
      !source ||
      typeof source.reference !== 'string' ||
      !source.reference.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(source.asOf ?? '') ||
      Number.isNaN(Date.parse(source.asOf)) ||
      new Date(source.asOf).toISOString().slice(0, 10) !== source.asOf
    )
      fail('missing_cost_source', 'Override exige roleCostSource.reference y asOf (YYYY-MM-DD válido).')
  } else {
    if (input.roleCostSource !== undefined) fail('invalid_cost_source', 'roleCostSource requiere roleCostOverrideUsd.')
    if (Math.abs(role.monthlyCostUsd - role.computedInputCostUsd) > 0.011)
      fail(
        'role_arithmetic_drift',
        'Costo cacheado difiere de inputs. Auditar/revisar Excel o declarar override con fuente.'
      )
  }

  if (monthlyRoleCost <= 0) fail('unverified_cost', 'Costo mensual del rol cero: no permite escenario sostenible.')
  const allocation = input.allocationMode === 'dedicated' ? 1 : hours / sellable
  const labor = monthlyRoleCost * allocation
  const totals = calculateTotals(input, round(labor))

  return {
    ...totals,
    role: { sku: role.sku, label: role.label },
    assumptions: input,
    sourceCostStatus:
      input.roleCostOverrideUsd !== undefined
        ? 'operator_declared_not_independently_verified'
        : 'historical_not_verified',
    monthlyCostBreakdownUsd: {
      ...totals.monthlyCostBreakdownUsd,
      recordedRoleCost: role.monthlyCostUsd,
      scenarioRoleCost: monthlyRoleCost,
      allocatedRoleCost: round(labor)
    },
    capacityAllocationFraction: allocation,
    historicalReferenceWarnings: role.warnings,
    warnings: [
      ...totals.warnings,
      ...(input.roleCostOverrideUsd === undefined ? ['historical_costs_not_current'] : []),
      ...(input.allocationMode === 'shared' ? ['remaining_capacity_sale_assumed_not_verified'] : [])
    ],
    provenance: role.provenance
  }
}

export function estimate(model, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    fail('invalid_estimate', 'Input debe ser objeto JSON.')

  const allowed = [
    'roles',
    'additionalMonthlyCostsUsd',
    'setupCostUsd',
    'amortizationMonths',
    'targetMarginFraction',
    'transactionFeeFraction'
  ]

  for (const key of Object.keys(input))
    if (!allowed.includes(key)) fail('invalid_estimate', `Campo desconocido: ${key}`)
  if (!Array.isArray(input.roles) || !input.roles.length)
    fail('invalid_estimate', 'roles debe contener al menos un perfil.')

  const lines = input.roles.map(line => {
    if (!line || typeof line.sku !== 'string') fail('invalid_estimate', 'Cada rol requiere sku.')

    const roleFields = [
      'sku',
      'hoursPerMonth',
      'monthlySellableHours',
      'allocationMode',
      'assumeRemainingCapacitySold',
      'roleCostOverrideUsd',
      'roleCostSource'
    ]

    for (const key of Object.keys(line))
      if (!roleFields.includes(key)) fail('invalid_estimate', `Campo desconocido en rol: ${key}`)
    const { sku, ...assumptions } = line

    return scenario(model, sku, {
      ...assumptions,
      additionalMonthlyCostsUsd: [],
      setupCostUsd: 0,
      targetMarginFraction: 0,
      transactionFeeFraction: 0
    })
  })

  const totalRoleCost = lines.reduce((sum, line) => sum + line.monthlyCostBreakdownUsd.allocatedRoleCost, 0)
  const totals = calculateTotals(input, totalRoleCost)

  return {
    ...totals,
    assumptions: input,
    roleLines: lines,
    sourceCostStatus: lines.every(line => line.sourceCostStatus === 'operator_declared_not_independently_verified')
      ? 'operator_declared_not_independently_verified'
      : 'includes_historical_costs',
    warnings: [...new Set(lines.flatMap(line => line.warnings).concat(totals.warnings))]
  }
}

export function summary(model) {
  return {
    sheets: model.sheets.map(s => ({
      name: s.name,
      rows: s.rowCount,
      columns: s.columnCount,
      capturedCells: Object.keys(s.cells).length
    })),
    populatedRoles: getRoles(model).length,
    warnings: [
      'historical_unapproved',
      'cached_results_are_not_full_recalculation',
      'use_canonical_catalog_for_current_quotes'
    ],
    canonicalEngine: 'src/lib/finance/pricing/pricing-engine-v2.ts'
  }
}
