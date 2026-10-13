#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'

import {
  SOURCE,
  MODEL,
  WorkbookError,
  extractWorkbook,
  loadModel,
  summary,
  search,
  findRole,
  readRange,
  audit,
  scenario,
  estimate
} from './lib/pricing-workbook.mjs'

const help = {
  command: 'pnpm --silent pricing:workbook <command>',
  commands: {
    summary: 'Inventario y estado histórico del modelo.',
    search: '--query HubSpot [--kind all|roles|services|tools|addons]',
    role: 'ECG-021 — costos, precio legacy, margen real, advertencias y celdas.',
    sheet: '"Addons - Overheads" --range A1:K10 — valores y fórmulas.',
    audit: 'Conciliación de roles y reglas desconectadas.',
    scenario: 'ECG-021 --input <scenario.json> — sensibilidad USD, nunca cotización.',
    estimate: '--input <plan.json> — combina roles, costos actualizados, overhead y margen sin UI.',
    compare: '--input <plan.json> --margins 0.35,0.40,0.45 — compara escenarios del mismo plan.',
    export: '[--source <xlsx>] [--out <json>] [--overwrite] — extracción; sin out, JSON stdout.'
  },
  options: { model: `JSON alternativo; default ${MODEL}`, source: `Sólo export; default ${SOURCE}` },
  scenarioFields: {
    hoursPerMonth: 80,
    monthlySellableHours: 140,
    allocationMode: 'shared',
    assumeRemainingCapacitySold: true,
    targetMarginFraction: 0.4,
    transactionFeeFraction: 0,
    additionalMonthlyCostsUsd: [{ label: 'Gestión/QA (supuesto)', amount: 400 }],
    setupCostUsd: 0
  },
  access: 'Checkout interno; no DB, credenciales, API, CRM ni escritura al Excel.',
  commercialStatus: 'historical_unapproved'
}

try {
  const { values: flags, positionals } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: Object.fromEntries(
      ['model', 'source', 'out', 'query', 'kind', 'input', 'range', 'margins']
        .map(key => [key, { type: 'string' }])
        .concat(['help', 'overwrite'].map(key => [key, { type: 'boolean' }]))
    )
  })

  const [command, argument, ...extra] = positionals

  if (flags.help || !command) {
    console.log(JSON.stringify(help, null, 2))
  } else {
    const permitted = {
      summary: ['model'],
      search: ['model', 'query', 'kind'],
      role: ['model'],
      sheet: ['model', 'range'],
      audit: ['model'],
      scenario: ['model', 'input'],
      estimate: ['model', 'input'],
      compare: ['model', 'input', 'margins'],
      export: ['source', 'out', 'overwrite']
    }

    if (!permitted[command]) throw new WorkbookError('unknown_command', `Comando desconocido: ${command}. Usar --help.`)
    if (extra.length || (!['role', 'sheet', 'scenario'].includes(command) && argument))
      throw new WorkbookError('unexpected_argument', 'Argumentos posicionales adicionales.')
    for (const key of Object.keys(flags))
      if (!permitted[command].includes(key))
        throw new WorkbookError('unexpected_option', `--${key} no aplica a ${command}.`)
    let output

    if (command === 'export') {
      output = await extractWorkbook(flags.source ?? SOURCE)
      if (flags.out) {
        const destination = path.resolve(flags.out)

        if (path.extname(destination).toLowerCase() !== '.json')
          throw new WorkbookError('invalid_output', 'Export sólo permite archivo .json; nunca modifica XLSX.')
        if (destination === path.resolve(flags.source ?? SOURCE))
          throw new WorkbookError('invalid_output', 'No sobrescribir fuente.')
        await mkdir(path.dirname(destination), { recursive: true })
        const json = `${JSON.stringify(output, null, 2)}\n`

        if (flags.overwrite) {
          // Reemplazo atómico: no truncar el snapshot ni seguir symlinks al Excel fuente.
          const temporary = `${destination}.${randomUUID()}.tmp`

          try {
            await writeFile(temporary, json, { flag: 'wx' })
            await rename(temporary, destination)
          } finally {
            await rm(temporary, { force: true })
          }
        } else await writeFile(destination, json, { flag: 'wx' })
        output = {
          schemaVersion: output.schemaVersion,
          commercialStatus: output.commercialStatus,
          source: output.source,
          exportedTo: destination,
          sheetCount: output.sheets.length
        }
      } else if (flags.overwrite) throw new WorkbookError('invalid_output', '--overwrite requiere --out.')
    } else {
      const model = await loadModel(flags.model ?? MODEL)
      let result

      if (command === 'summary') result = summary(model)
      if (command === 'search') result = search(model, flags.query, flags.kind)
      if (command === 'role') result = findRole(model, argument)
      if (command === 'sheet') result = readRange(model, argument, flags.range)
      if (command === 'audit') result = audit(model)

      if (command === 'scenario') {
        if (!flags.input) throw new WorkbookError('missing_input', 'scenario requiere --input <json>.')
        result = scenario(model, argument, JSON.parse(await readFile(flags.input, 'utf8')))
      }

      if (command === 'estimate') {
        if (!flags.input) throw new WorkbookError('missing_input', 'estimate requiere --input <json>.')
        result = estimate(model, JSON.parse(await readFile(flags.input, 'utf8')))
      }

      if (command === 'compare') {
        if (!flags.input || !flags.margins)
          throw new WorkbookError(
            'missing_input',
            'compare requiere --input y --margins (fracciones separadas por coma).'
          )
        const input = JSON.parse(await readFile(flags.input, 'utf8'))
        const margins = flags.margins.split(',')

        if (margins.length > 20 || margins.some(v => !v.trim() || !Number.isFinite(Number(v))))
          throw new WorkbookError('invalid_margin', 'Especificar hasta 20 márgenes numéricos.')
        result = margins.map(v => estimate(model, { ...input, targetMarginFraction: Number(v) }))
      }

      output = {
        schemaVersion: model.schemaVersion,
        commercialStatus: ['scenario', 'estimate', 'compare'].includes(command)
          ? 'hypothesis_only'
          : 'historical_unapproved',
        source: model.source,
        result
      }
    }

    console.log(JSON.stringify(output, null, 2))
    if (command === 'audit' && output.result.verdict === 'arithmetic_error') process.exitCode = 2
  }
} catch (error) {
  console.error(
    JSON.stringify({
      error: { code: error.code ?? 'invalid_input_or_io', message: error.message },
      commercialStatus: 'not_approved'
    })
  )
  process.exitCode = 1
}
