import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import { closeGreenhousePostgres, query } from '@/lib/db'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

// ============================================================
// TASK-465: Seed 7 active services into greenhouse_commercial.
//
// Reads:
//   - data/pricing/seed/service-pricing.csv
//   - data/pricing/seed/service-composition.csv
//
// Writes:
//   - greenhouse_core.service_modules (canonical identity via upsertServiceModule)
//   - greenhouse_commercial.service_pricing (EFG-00X preserved via explicit SKU)
//   - greenhouse_commercial.service_role_recipe
//   - greenhouse_commercial.service_tool_recipe
//
// Idempotent: safe to run multiple times. --apply required to write.
// ============================================================

const require = createRequire(import.meta.url)

const stubServerOnlyForScripts = () => {
  const serverOnlyPath = require.resolve('server-only')

  require.cache[serverOnlyPath] = {
    exports: {}
  } as NodeJS.Module
}

// ─── CLI flag parsing ────────────────────────────────────────

interface CliOptions {
  apply: boolean
  csvPricingPath: string
  csvCompositionPath: string
}

const DEFAULT_PRICING_CSV = 'data/pricing/seed/service-pricing.csv'
const DEFAULT_COMPOSITION_CSV = 'data/pricing/seed/service-composition.csv'

const parseCliOptions = (argv: string[]): CliOptions => {
  let apply = false
  let csvPricingPath = DEFAULT_PRICING_CSV
  let csvCompositionPath = DEFAULT_COMPOSITION_CSV

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    switch (arg) {
      case '--apply':
        apply = true
        break
      case '--csv-pricing':
        csvPricingPath = argv[i + 1] ?? DEFAULT_PRICING_CSV
        i += 1
        break
      case '--csv-composition':
        csvCompositionPath = argv[i + 1] ?? DEFAULT_COMPOSITION_CSV
        i += 1
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)

      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown flag: ${arg}`)
        }
    }
  }

  return { apply, csvPricingPath, csvCompositionPath }
}

const printHelp = () => {
  console.log('Usage: pnpm seed:service-catalog [--apply] [--csv-pricing <path>] [--csv-composition <path>]')
  console.log('')
  console.log('Seeds 7 active services (EFG-001..007) into greenhouse_commercial catalog.')
  console.log('')
  console.log('Flags:')
  console.log('  --apply                 Required to write. Without it, prints a dry-run plan.')
  console.log('  --csv-pricing <path>    Override service-pricing.csv path (default: data/pricing/seed/service-pricing.csv)')
  console.log('  --csv-composition <path>  Override service-composition.csv path (default: data/pricing/seed/service-composition.csv)')
  console.log('  -h, --help              Show this help')
}

// ─── CSV parsing ─────────────────────────────────────────────

const splitLines = (csv: string): string[] =>
  csv
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim().length > 0)

const splitCsvLine = (line: string): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)

  return fields.map(field => field.trim())
}

const parseCsvDocument = (csv: string): Array<Record<string, string>> => {
  const lines = splitLines(csv)
  const header = splitCsvLine(lines[0] ?? '')

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    header.forEach((key, index) => {
      row[key] = values[index] ?? ''
    })

    return row
  })
}

// ─── Normalizers ─────────────────────────────────────────────

const normalizeNullableString = (value: string | undefined): string | null => {
  const trimmed = (value || '').trim()

  return trimmed ? trimmed : null
}

const slugifyModuleCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 100)

type ServiceUnit = 'project' | 'monthly'
type ServiceCommercialModel = 'on_going' | 'on_demand' | 'hybrid' | 'license_consulting'
type ServiceTier = '1' | '2' | '3' | '4'

const mapServiceUnit = (raw: string | undefined): ServiceUnit => {
  const normalized = (raw || '').trim().toLowerCase()

  return normalized === 'mes' ? 'monthly' : 'project'
}

const mapCommercialModel = (
  raw: string | undefined,
  serviceType: string | undefined
): ServiceCommercialModel => {
  const normalized = (raw || '').trim().toLowerCase()

  if (normalized === 'on-demand' || normalized === 'on demand') return 'on_demand'
  if (normalized === 'on-going' || normalized === 'on going') return 'on_going'

  // Retainer-like service_type falls back to on_going.
  const typeNormalized = (serviceType || '').trim().toLowerCase()

  if (typeNormalized.includes('retainer')) return 'on_going'

  return 'on_going'
}

const mapTier = (raw: string | undefined): ServiceTier | null => {
  const normalized = (raw || '').replace(/tier/i, '').trim()

  if (normalized === '1' || normalized === '2' || normalized === '3' || normalized === '4') {
    return normalized
  }

  return null
}

const extractDurationMonths = (raw: string | undefined): number | null => {
  const value = (raw || '').trim().toLowerCase()

  if (!value) return null

  // "Mensual" means 1-month recurring retainer (null — duration not bounded).
  if (value === 'mensual' || value.includes('mensual')) return null

  // Try to extract an integer month count (e.g. "6 meses", "3 meses fijos").
  const monthsMatch = value.match(/(\d+)\s*mes/)

  if (monthsMatch) {
    const parsed = Number(monthsMatch[1])

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  return null
}

// ─── CSV row types ───────────────────────────────────────────

interface ServicePricingCsvRow {
  sku: string
  category: string | null
  serviceName: string
  serviceUnit: ServiceUnit
  serviceType: string | null
  commercialModel: ServiceCommercialModel
  tier: ServiceTier
  defaultDurationMonths: number | null
  defaultDescription: string | null
  businessLineCode: string | null
  rowNumber: number
}

interface CompositionCsvRow {
  sku: string
  itemType: 'Rol' | 'Herramienta'
  roleLabel: string | null
  toolName: string | null
  hoursPerPeriod: number | null
  quantity: number
  rowNumber: number
}

const parsePricingCsv = (csv: string): { rows: ServicePricingCsvRow[]; skipped: Array<{ rowNumber: number; reason: string; sku: string | null }> } => {
  const parsed = parseCsvDocument(csv)
  const rows: ServicePricingCsvRow[] = []
  const skipped: Array<{ rowNumber: number; reason: string; sku: string | null }> = []

  parsed.forEach((row, index) => {
    const rowNumber = index + 2 // header = row 1
    const sku = normalizeNullableString(row['SKU'])
    const serviceName = normalizeNullableString(row['Nombre del Servicio'])

    if (!sku) {
      skipped.push({ rowNumber, sku: null, reason: 'Missing SKU' })

      return
    }

    if (!serviceName) {
      skipped.push({ rowNumber, sku, reason: 'Empty service name (placeholder row)' })

      return
    }

    const tier = mapTier(row['Tier'])

    if (!tier) {
      skipped.push({ rowNumber, sku, reason: `Invalid tier: ${row['Tier'] ?? '<empty>'}` })

      return
    }

    rows.push({
      sku,
      category: normalizeNullableString(row['Categoría']),
      serviceName,
      serviceUnit: mapServiceUnit(row['Unidad']),
      serviceType: normalizeNullableString(row['Tipo de Servicio']),
      commercialModel: mapCommercialModel(row['Modelo Comercial'], row['Tipo de Servicio']),
      tier,
      defaultDurationMonths: extractDurationMonths(row['Duración estimada']),
      defaultDescription: normalizeNullableString(row['Descripción breve / Alcance']),
      businessLineCode: normalizeNullableString(row['Unidad / Brand']),
      rowNumber
    })
  })

  return { rows, skipped }
}

const parseCompositionCsv = (csv: string): { rows: CompositionCsvRow[]; skipped: Array<{ rowNumber: number; reason: string; sku: string | null }> } => {
  const parsed = parseCsvDocument(csv)
  const rows: CompositionCsvRow[] = []
  const skipped: Array<{ rowNumber: number; reason: string; sku: string | null }> = []

  parsed.forEach((row, index) => {
    const rowNumber = index + 2
    const sku = normalizeNullableString(row['SKU Servicio'])

    if (!sku || sku.toUpperCase() === 'TOTAL') {
      // TOTAL rows are intentional separators; not an error.
      if (sku && sku.toUpperCase() === 'TOTAL') {
        skipped.push({ rowNumber, sku, reason: 'TOTAL row (intentional)' })
      } else {
        skipped.push({ rowNumber, sku: null, reason: 'Empty SKU' })
      }

      return
    }

    const itemTypeRaw = normalizeNullableString(row['Tipo de ítem'])

    if (itemTypeRaw !== 'Rol' && itemTypeRaw !== 'Herramienta') {
      skipped.push({ rowNumber, sku, reason: `Invalid item type: ${itemTypeRaw ?? '<empty>'}` })

      return
    }

    const quantityRaw = normalizeNullableString(row['Cantidad'])
    const hoursRaw = normalizeNullableString(row['Horas'])

    // Parse quantity: default 1 for Rol (often empty), use parsed value for Herramienta.
    let quantity = 1

    if (quantityRaw) {
      const parsed = Number(quantityRaw)

      if (Number.isFinite(parsed) && parsed > 0) {
        quantity = Math.trunc(parsed)
      }
    }

    if (itemTypeRaw === 'Rol') {
      const roleLabel = normalizeNullableString(row['Rol'])

      if (!roleLabel) {
        skipped.push({ rowNumber, sku, reason: 'Rol row missing role label' })

        return
      }

      const hoursParsed = hoursRaw ? Number(hoursRaw) : NaN

      if (!Number.isFinite(hoursParsed) || hoursParsed <= 0) {
        skipped.push({ rowNumber, sku, reason: `Rol row with invalid hours: ${hoursRaw ?? '<empty>'}` })

        return
      }

      rows.push({
        sku,
        itemType: 'Rol',
        roleLabel,
        toolName: null,
        hoursPerPeriod: hoursParsed,
        quantity,
        rowNumber
      })
    } else {
      const toolName = normalizeNullableString(row['Herramienta'])

      if (!toolName) {
        skipped.push({ rowNumber, sku, reason: 'Herramienta row missing tool name' })

        return
      }

      rows.push({
        sku,
        itemType: 'Herramienta',
        roleLabel: null,
        toolName,
        hoursPerPeriod: null,
        quantity,
        rowNumber
      })
    }
  })

  return { rows, skipped }
}

// ─── Role / tool resolution ──────────────────────────────────

interface ResolvedRole {
  roleId: string
  roleSku: string
}

interface ResolvedTool {
  toolId: string
  toolSku: string
}

const roleCache = new Map<string, ResolvedRole | null>()
const toolCache = new Map<string, ResolvedTool | null>()

const resolveRoleByLabel = async (label: string): Promise<ResolvedRole | null> => {
  const key = label.toLowerCase()

  if (roleCache.has(key)) {
    return roleCache.get(key) ?? null
  }

  const rows = await query<{ role_id: string; role_sku: string }>(
    `SELECT role_id, role_sku
       FROM greenhouse_commercial.sellable_roles
      WHERE lower(role_label_es) = lower($1)
      LIMIT 1`,
    [label]
  )

  const row = rows[0]
  const resolved = row ? { roleId: row.role_id, roleSku: row.role_sku } : null

  roleCache.set(key, resolved)

  return resolved
}

const resolveToolByName = async (name: string): Promise<ResolvedTool | null> => {
  const key = name.toLowerCase()

  if (toolCache.has(key)) {
    return toolCache.get(key) ?? null
  }

  const rows = await query<{ tool_id: string; tool_sku: string | null }>(
    `SELECT tool_id, tool_sku
       FROM greenhouse_ai.tool_catalog
      WHERE lower(tool_name) = lower($1)
      LIMIT 1`,
    [name]
  )

  const row = rows[0]
  const resolved = row && row.tool_sku ? { toolId: row.tool_id, toolSku: row.tool_sku } : null

  toolCache.set(key, resolved)

  return resolved
}

// ─── Seed counters ──────────────────────────────────────────

interface SeedCounters {
  servicesCreated: number
  servicesUpdated: number
  roleRecipeLinesSeeded: number
  toolRecipeLinesSeeded: number
  skipped: Array<{ sku: string | null; reason: string; rowNumber?: number }>
}

// ─── Main seed logic ─────────────────────────────────────────

interface ServicePlan {
  pricing: ServicePricingCsvRow
  moduleCode: string
  roleLines: CompositionCsvRow[]
  toolLines: CompositionCsvRow[]
}

const buildServicePlans = (
  pricingRows: ServicePricingCsvRow[],
  compositionRows: CompositionCsvRow[]
): ServicePlan[] => {
  const bySku = new Map<string, CompositionCsvRow[]>()

  for (const row of compositionRows) {
    const list = bySku.get(row.sku) ?? []

    list.push(row)
    bySku.set(row.sku, list)
  }

  return pricingRows.map(pricing => {
    const lines = bySku.get(pricing.sku) ?? []

    return {
      pricing,
      moduleCode: slugifyModuleCode(pricing.serviceName),
      roleLines: lines.filter(l => l.itemType === 'Rol'),
      toolLines: lines.filter(l => l.itemType === 'Herramienta')
    }
  })
}

const printDryRunPlan = (plans: ServicePlan[]) => {
  console.log('')
  console.log('Dry-run plan (use --apply to commit):')
  console.log('')

  for (const plan of plans) {
    const { pricing, moduleCode, roleLines, toolLines } = plan

    console.log(`[${pricing.sku}] ${pricing.serviceName}`)
    console.log(`  module_code:      ${moduleCode}`)
    console.log(`  category:         ${pricing.category ?? '(none)'}`)
    console.log(`  unit:             ${pricing.serviceUnit}`)
    console.log(`  commercial_model: ${pricing.commercialModel}`)
    console.log(`  tier:             ${pricing.tier}`)
    console.log(`  duration_months:  ${pricing.defaultDurationMonths ?? '(null)'}`)
    console.log(`  business_line:    ${pricing.businessLineCode ?? '(none)'}`)
    console.log(`  role lines:       ${roleLines.length}`)

    for (const line of roleLines) {
      console.log(`    - ${line.roleLabel} (${line.hoursPerPeriod}h x ${line.quantity})`)
    }

    console.log(`  tool lines:       ${toolLines.length}`)

    for (const line of toolLines) {
      console.log(`    - ${line.toolName} (qty ${line.quantity})`)
    }

    console.log('')
  }
}

const seedService = async (
  plan: ServicePlan,
  counters: SeedCounters
): Promise<void> => {
  const { pricing, moduleCode, roleLines, toolLines } = plan

  // Lazy-import service-catalog-store after server-only stub is in place.
  const { upsertServiceModule, replaceRoleRecipe, replaceToolRecipe } = await import(
    '@/lib/commercial/service-catalog-store'
  )

  // 1. Upsert canonical service_modules row.
  const moduleRow = await upsertServiceModule({
    moduleCode,
    moduleName: pricing.serviceName,
    businessLine: pricing.businessLineCode,
    active: true
  })

  const moduleId = moduleRow.module_id

  // 2. UPSERT service_pricing by module_id (preserving EFG-00X SKU from CSV).
  const upsertRows = await query<{ xmax: string }>(
    `INSERT INTO greenhouse_commercial.service_pricing (
       module_id,
       service_sku,
       service_category,
       display_name,
       service_unit,
       service_type,
       commercial_model,
       tier,
       default_duration_months,
       default_description,
       business_line_code,
       active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (module_id) DO UPDATE SET
       service_sku             = EXCLUDED.service_sku,
       service_category        = EXCLUDED.service_category,
       display_name            = EXCLUDED.display_name,
       service_unit            = EXCLUDED.service_unit,
       service_type            = EXCLUDED.service_type,
       commercial_model        = EXCLUDED.commercial_model,
       tier                    = EXCLUDED.tier,
       default_duration_months = EXCLUDED.default_duration_months,
       default_description     = EXCLUDED.default_description,
       business_line_code      = EXCLUDED.business_line_code,
       active                  = EXCLUDED.active,
       updated_at              = CURRENT_TIMESTAMP
     RETURNING xmax`,
    [
      moduleId,
      pricing.sku,
      pricing.category,
      pricing.serviceName,
      pricing.serviceUnit,
      pricing.serviceType,
      pricing.commercialModel,
      pricing.tier,
      pricing.defaultDurationMonths,
      pricing.defaultDescription,
      pricing.businessLineCode,
      true
    ]
  )

  // xmax = '0' means INSERT, non-zero means UPDATE.
  const xmax = upsertRows[0]?.xmax ?? '0'

  if (xmax === '0') {
    counters.servicesCreated += 1
  } else {
    counters.servicesUpdated += 1
  }

  // 3. Resolve + replace role recipe.
  const resolvedRoleLines: Array<{ roleId: string; hoursPerPeriod: number; quantity: number }> = []

  for (const line of roleLines) {
    const label = line.roleLabel!
    const resolved = await resolveRoleByLabel(label)

    if (!resolved) {
      console.warn(`  WARN  [${pricing.sku}] Role not found, skipping: "${label}" (row ${line.rowNumber})`)
      counters.skipped.push({
        sku: pricing.sku,
        rowNumber: line.rowNumber,
        reason: `Role not found: ${label}`
      })
      continue
    }

    resolvedRoleLines.push({
      roleId: resolved.roleId,
      hoursPerPeriod: line.hoursPerPeriod!,
      quantity: line.quantity
    })
  }

  await replaceRoleRecipe(moduleId, resolvedRoleLines)
  counters.roleRecipeLinesSeeded += resolvedRoleLines.length

  // 4. Resolve + replace tool recipe.
  const resolvedToolLines: Array<{ toolId: string; toolSku: string; quantity: number }> = []

  for (const line of toolLines) {
    const name = line.toolName!
    const resolved = await resolveToolByName(name)

    if (!resolved) {
      console.warn(`  WARN  [${pricing.sku}] Tool not found, skipping: "${name}" (row ${line.rowNumber})`)
      counters.skipped.push({
        sku: pricing.sku,
        rowNumber: line.rowNumber,
        reason: `Tool not found: ${name}`
      })
      continue
    }

    resolvedToolLines.push({
      toolId: resolved.toolId,
      toolSku: resolved.toolSku,
      quantity: line.quantity
    })
  }

  await replaceToolRecipe(moduleId, resolvedToolLines)
  counters.toolRecipeLinesSeeded += resolvedToolLines.length
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const options = parseCliOptions(process.argv.slice(2))

  stubServerOnlyForScripts()

  const pricingCsv = await readFile(path.resolve(process.cwd(), options.csvPricingPath), 'utf8')
  const compositionCsv = await readFile(path.resolve(process.cwd(), options.csvCompositionPath), 'utf8')

  const pricingResult = parsePricingCsv(pricingCsv)
  const compositionResult = parseCompositionCsv(compositionCsv)

  console.log('Service catalog seed (TASK-465)')
  console.log(`  mode:                ${options.apply ? 'APPLY' : 'dry-run'}`)
  console.log(`  pricing CSV:         ${options.csvPricingPath}`)
  console.log(`  composition CSV:     ${options.csvCompositionPath}`)
  console.log(`  pricing rows loaded: ${pricingResult.rows.length}`)
  console.log(`  pricing skipped:     ${pricingResult.skipped.length}`)
  console.log(`  composition rows:    ${compositionResult.rows.length}`)
  console.log(`  composition skipped: ${compositionResult.skipped.length}`)

  // Surface meaningful skips (not empty/TOTAL).
  const meaningfulPricingSkips = pricingResult.skipped.filter(s => !s.reason.includes('placeholder') && !s.reason.includes('Missing SKU'))
  const meaningfulCompositionSkips = compositionResult.skipped.filter(s => !s.reason.includes('TOTAL') && !s.reason.includes('Empty SKU'))

  if (meaningfulPricingSkips.length > 0) {
    console.log('')
    console.log('  Pricing rows with warnings:')

    for (const skip of meaningfulPricingSkips) {
      console.log(`    - row ${skip.rowNumber} (sku=${skip.sku ?? '-'}): ${skip.reason}`)
    }
  }

  if (meaningfulCompositionSkips.length > 0) {
    console.log('')
    console.log('  Composition rows with warnings:')

    for (const skip of meaningfulCompositionSkips) {
      console.log(`    - row ${skip.rowNumber} (sku=${skip.sku ?? '-'}): ${skip.reason}`)
    }
  }

  const plans = buildServicePlans(pricingResult.rows, compositionResult.rows)

  if (!options.apply) {
    printDryRunPlan(plans)
    console.log('')
    console.log('Dry-run only. Re-run with --apply to commit.')

    return
  }

  // APPLY path — requires DB access.
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const counters: SeedCounters = {
    servicesCreated: 0,
    servicesUpdated: 0,
    roleRecipeLinesSeeded: 0,
    toolRecipeLinesSeeded: 0,
    skipped: []
  }

  console.log('')
  console.log('Applying seed...')

  for (const plan of plans) {
    console.log(`  [${plan.pricing.sku}] ${plan.pricing.serviceName}`)

    try {
      await seedService(plan, counters)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      console.error(`  FAIL  [${plan.pricing.sku}] ${message}`)
      counters.skipped.push({ sku: plan.pricing.sku, reason: `Seed failure: ${message}` })
    }
  }

  console.log('')
  console.log('Summary:')
  console.log(`  services created:         ${counters.servicesCreated}`)
  console.log(`  services updated:         ${counters.servicesUpdated}`)
  console.log(`  role recipe lines seeded: ${counters.roleRecipeLinesSeeded}`)
  console.log(`  tool recipe lines seeded: ${counters.toolRecipeLinesSeeded}`)
  console.log(`  skipped rows:             ${counters.skipped.length}`)

  if (counters.skipped.length > 0) {
    console.log('')
    console.log('  Skipped detail:')

    for (const skip of counters.skipped) {
      const rowLabel = skip.rowNumber ? ` (row ${skip.rowNumber})` : ''

      console.log(`    - [${skip.sku ?? '-'}]${rowLabel} ${skip.reason}`)
    }
  }
}

main()
  .catch(error => {
    console.error('Service catalog seed failed.')
    console.error(error instanceof Error ? error.stack ?? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => {})
  })
