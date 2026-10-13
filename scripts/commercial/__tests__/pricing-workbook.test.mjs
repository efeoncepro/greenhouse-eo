import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  ROOT,
  SOURCE,
  MODEL,
  loadModel,
  extractWorkbook,
  getRoles,
  findRole,
  search,
  readRange,
  audit,
  scenario,
  estimate
} from '../lib/pricing-workbook.mjs'

const model = await loadModel()
const cli = path.join(ROOT, 'scripts/commercial/pricing-workbook.mjs')

const base = {
  hoursPerMonth: 80,
  monthlySellableHours: 140,
  allocationMode: 'shared',
  assumeRemainingCapacitySold: true,
  targetMarginFraction: 0.4,
  transactionFeeFraction: 0,
  additionalMonthlyCostsUsd: [],
  setupCostUsd: 0
}

const failsWith = (fn, code) => assert.throws(fn, e => e.code === code)

test('extracción completa reproducible; celdas y fórmulas coinciden con Excel sin modificar bytes', async () => {
  const before = await readFile(SOURCE)

  assert.deepEqual(await extractWorkbook(), model)
  assert.deepEqual(await readFile(SOURCE), before)
  assert.equal(model.sheets.length, 13)
  assert.deepEqual(model.sheets.find(s => s.name === 'Factor País').cells.B1, { value: null, mergedTo: 'A1' })
})

test('todos los roles concilian inputs, costo/hora y recargo con resultados del libro', () => {
  const result = audit(model)

  assert.equal(result.rolesChecked, getRoles(model).length)
  assert.equal(result.rolesReconciled, result.rolesChecked)
  assert.ok(result.rolesChecked > 0)
  assert.ok(result.findings.some(f => f.code === 'tier_conflict'))
  const role = findRole(model, 'ECG-021')

  assert.equal(role.monthlyCostUsd, 2049)
  assert.equal(role.legacyMonthlyPriceUsd, 3278.4)
  assert.equal(role.marginOnRecordedCostsFraction, 0.375)
})

test('datos faltantes o errores cacheados no se transforman en costo cero', () => {
  const missing = structuredClone(model)

  missing.sheets.find(s => s.name === 'Precios personal').cells.M22.value = null
  failsWith(() => findRole(missing, 'ECG-021'), 'missing_number')
  const error = structuredClone(model)

  error.sheets[0].cells.A1 = { value: { error: '#REF!' } }
  assert.equal(audit(error).verdict, 'arithmetic_error')
})

test('audit identifica cache desactualizada e inputs financieros que no concilian', () => {
  const changed = structuredClone(model)

  changed.sheets.find(s => s.name === 'Precios personal').cells.F22.value += 100
  assert.ok(audit(changed).findings.some(f => f.code === 'role_arithmetic_drift'))
  failsWith(() => scenario(changed, 'ECG-021', base), 'role_arithmetic_drift')
})

test('búsqueda normaliza acentos y mayúsculas sin inventar roles en filas vacías', () => {
  const found = search(model, 'HUBSPOT', 'roles')

  assert.ok(found.length >= 3)
  assert.ok(found.some(r => r.sku === 'ECG-026'))
  assert.ok(search(model, 'Consultoria', 'services').length)
  assert.equal(search(model, 'zzzzzz').length, 0)
  failsWith(() => findRole(model, 'ECG-999'), 'role_not_found')
})

test('lectura acotada conserva fórmula y resultado; rechaza rangos enormes/invertidos', () => {
  const result = readRange(model, 'Precios personal', 'M22:M22')

  assert.equal(result.cells.M22.value, 2049)
  assert.ok(result.cells.M22.formula)
  failsWith(() => readRange(model, 'Datos', 'A1:ZZ99999'), 'invalid_range')
  failsWith(() => readRange(model, 'Datos', 'D5:A1'), 'invalid_range')
})

test('dedicado absorbe mes completo; compartido usa horas vendibles y declara venta restante', () => {
  const shared = scenario(model, 'ECG-021', base)
  const dedicated = scenario(model, 'ECG-021', { ...base, allocationMode: 'dedicated' })

  assert.equal(shared.monthlyCostBreakdownUsd.allocatedRoleCost, 1170.86)
  assert.equal(dedicated.monthlyCostBreakdownUsd.allocatedRoleCost, 2049)
  assert.equal(dedicated.hypotheticalMonthlyPriceUsd, 3415)
  assert.ok(dedicated.marginOnDeclaredCostsFraction >= 0.4)
  failsWith(() => scenario(model, 'ECG-021', { ...base, assumeRemainingCapacitySold: false }), 'unfunded_capacity')
})

test('fees sobre venta y setup amortizado se financian antes de calcular margen', () => {
  const result = scenario(model, 'ECG-021', {
    ...base,
    allocationMode: 'dedicated',
    transactionFeeFraction: 0.03,
    additionalMonthlyCostsUsd: [{ label: 'Assurance', amount: 300 }],
    setupCostUsd: 600,
    amortizationMonths: 3
  })

  assert.equal(result.monthlyCostBreakdownUsd.totalBeforeTransactionFees, 2549)
  assert.equal(result.monthlyCostBreakdownUsd.setupAmortization, 200)
  assert.ok(result.marginOnDeclaredCostsFraction >= 0.4)
  assert.ok(Math.abs(result.hypotheticalMonthlyPriceUsd - 2549 / 0.57) < 0.011)
  assert.equal(result.commercialStatus, 'hypothesis_only')
})

test('margen concilia con fee monetario redondeado incluso cuando redondear consume el piso', () => {
  const result = scenario(model, 'ECG-021', {
    ...base,
    allocationMode: 'dedicated',
    roleCostOverrideUsd: 0.29,
    roleCostSource: { reference: 'Caso sintético de redondeo', asOf: '2026-10-09' },
    targetMarginFraction: 0.37,
    transactionFeeFraction: 0.03145
  })

  const price = result.hypotheticalMonthlyPriceUsd
  const actual = (price - result.monthlyCostBreakdownUsd.totalBeforeTransactionFees - result.transactionFeeUsd) / price

  assert.equal(result.marginOnDeclaredCostsFraction, actual)
  assert.ok(actual >= 0.37)
})

for (const [label, patch, code] of [
  ['capacidad excedida', { hoursPerMonth: 150 }, 'invalid_capacity'],
  ['horas vendibles mayores al mes', { monthlySellableHours: 181 }, 'invalid_capacity'],
  ['margen como porcentaje entero', { targetMarginFraction: 40 }, 'invalid_margin'],
  ['margen y fee sin denominador', { targetMarginFraction: 0.9, transactionFeeFraction: 0.1 }, 'invalid_margin'],
  ['horas como texto', { hoursPerMonth: '80' }, 'missing_number'],
  ['costo omitido', { additionalMonthlyCostsUsd: undefined }, 'missing_costs'],
  ['costo negativo', { additionalMonthlyCostsUsd: [{ label: 'Tools', amount: -1 }] }, 'invalid_number'],
  ['setup sin recuperación', { setupCostUsd: 600 }, 'missing_number'],
  ['campos mal escritos', { targetMargenFraction: 0.4 }, 'invalid_scenario']
])
  test(`rechaza ${label}`, () => failsWith(() => scenario(model, 'ECG-021', { ...base, ...patch }), code))

test('override de costo exige fuente/fecha válidas y conserva la referencia histórica', () => {
  failsWith(() => scenario(model, 'ECG-021', { ...base, roleCostOverrideUsd: 2400 }), 'missing_cost_source')
  failsWith(
    () =>
      scenario(model, 'ECG-021', {
        ...base,
        roleCostOverrideUsd: 2400,
        roleCostSource: { reference: 'X', asOf: '2026-02-31' }
      }),
    'missing_cost_source'
  )

  const result = scenario(model, 'ECG-021', {
    ...base,
    allocationMode: 'dedicated',
    roleCostOverrideUsd: 2400,
    roleCostSource: { reference: 'Costo declarado de ejemplo', asOf: '2026-10-09' }
  })

  assert.equal(result.hypotheticalMonthlyPriceUsd, 4000)
  assert.equal(result.monthlyCostBreakdownUsd.recordedRoleCost, 2049)
  assert.equal(result.sourceCostStatus, 'operator_declared_not_independently_verified')
})

test('plan multirol calcula margen una vez y no duplica overhead o setup', () => {
  const input = {
    roles: [
      { sku: 'ECG-021', hoursPerMonth: 80, monthlySellableHours: 140, allocationMode: 'dedicated' },
      {
        sku: 'ECG-026',
        hoursPerMonth: 10,
        monthlySellableHours: 140,
        allocationMode: 'shared',
        assumeRemainingCapacitySold: true
      }
    ],
    additionalMonthlyCostsUsd: [{ label: 'Gestión', amount: 100 }],
    setupCostUsd: 300,
    amortizationMonths: 3,
    targetMarginFraction: 0.4,
    transactionFeeFraction: 0
  }

  const result = estimate(model, input)

  assert.equal(result.monthlyCostBreakdownUsd.assignedRoleCosts, 2049 + 262.43)
  assert.equal(result.monthlyCostBreakdownUsd.totalBeforeTransactionFees, 2511.43)
  assert.ok(result.marginOnDeclaredCostsFraction >= 0.4)
  failsWith(
    () => estimate(model, { ...input, roles: [{ ...input.roles[0], targetMarginFraction: 0.1 }] }),
    'invalid_estimate'
  )
})

test('CLI funciona con JSON puro fuera de cwd; errores no generan salida de éxito', () => {
  const result = JSON.parse(
    execFileSync(process.execPath, [cli, 'role', 'ECG-021'], { cwd: tmpdir(), encoding: 'utf8' })
  )

  assert.equal(result.result.monthlyCostUsd, 2049)
  const failed = spawnSync(process.execPath, [cli, 'scenario', 'ECG-021'], { encoding: 'utf8' })

  assert.equal(failed.status, 1)
  assert.equal(failed.stdout, '')
  assert.equal(JSON.parse(failed.stderr).error.code, 'missing_input')
})

test('compare muestra alternativas consistentes; no depende de UI o DB', () => {
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        cli,
        'compare',
        '--input',
        path.join(ROOT, 'data/pricing/examples/crm-capacity-plan.json'),
        '--margins',
        '0.35,0.40,0.45'
      ],
      { encoding: 'utf8' }
    )
  )

  assert.equal(result.result.length, 3)
  assert.ok(result.result[0].hypotheticalMonthlyPriceUsd < result.result[1].hypotheticalMonthlyPriceUsd)
  assert.ok(result.result[1].hypotheticalMonthlyPriceUsd < result.result[2].hypotheticalMonthlyPriceUsd)
})

test('drift o Excel no disponible bloquean consultas; export nunca sobrescribe Excel', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pricing-workbook-'))

  try {
    const filename = path.join(dir, 'model.json')

    await writeFile(filename, JSON.stringify({ ...model, source: { ...model.source, sha256: '0'.repeat(64) } }))
    await assert.rejects(loadModel(filename), e => e.code === 'source_changed')
    await writeFile(
      filename,
      JSON.stringify({ ...model, source: { ...model.source, path: path.join(dir, 'missing.xlsx') } })
    )
    await assert.rejects(loadModel(filename), e => e.code === 'source_unavailable')
    const blocked = spawnSync(process.execPath, [cli, 'export', '--out', SOURCE, '--overwrite'], { encoding: 'utf8' })

    assert.equal(blocked.status, 1)
    assert.equal(JSON.parse(blocked.stderr).error.code, 'invalid_output')
    const saved = spawnSync(process.execPath, [cli, 'export', '--out', filename], { encoding: 'utf8' })

    assert.equal(saved.status, 1)
    assert.equal(JSON.parse(saved.stderr).error.code, 'EEXIST')
    const linkedOutput = path.join(dir, 'linked.json')
    const before = await readFile(SOURCE)

    await symlink(SOURCE, linkedOutput)

    const safeOverwrite = spawnSync(process.execPath, [cli, 'export', '--out', linkedOutput, '--overwrite'], {
      encoding: 'utf8'
    })

    assert.equal(safeOverwrite.status, 0)
    assert.deepEqual(await readFile(SOURCE), before)
    assert.deepEqual(await loadModel(linkedOutput), model)
    assert.deepEqual(await loadModel(MODEL), model)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
