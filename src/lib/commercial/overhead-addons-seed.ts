import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const OVERHEAD_ADDON_TYPES = [
  'overhead_fixed',
  'fee_percentage',
  'fee_fixed',
  'resource_month',
  'adjustment_pct'
] as const
export type OverheadAddonType = (typeof OVERHEAD_ADDON_TYPES)[number]

export interface OverheadAddonSeedRow {
  rowNumber: number
  addonSku: string
  category: string
  addonName: string
  addonType: OverheadAddonType
  unit: string | null
  costInternalUsd: number
  marginPct: number | null
  finalPriceUsd: number | null
  finalPricePct: number | null
  pctMin: number | null
  pctMax: number | null
  minimumAmountUsd: number | null
  applicableTo: string[]
  description: string | null
  conditions: string | null
  visibleToClient: boolean
  active: boolean
  notes: string | null
  warnings: string[]
}

export interface OverheadAddonSeedSummary {
  totalRows: number
  activeRows: number
  rejected: number
}

export interface OverheadAddonRejectedRow {
  rowNumber: number
  addonSku: string | null
  addonName: string | null
  reason: string
}

export interface OverheadAddonSeedParseResult {
  rows: OverheadAddonSeedRow[]
  summary: OverheadAddonSeedSummary
  rejectedRows: OverheadAddonRejectedRow[]
}

const OVERHEAD_ADDONS_CSV_PATH = path.join(process.cwd(), 'data/pricing/seed/overhead-addons.csv')

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

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

const normalizeNullableString = (value: string | undefined) => {
  const trimmed = (value || '').trim()

  return trimmed ? trimmed : null
}

const parseNullableNumber = (value: string | undefined): number | null => {
  const trimmed = (value || '').trim()

  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed.replace(/\s+/g, ''))

  return Number.isFinite(parsed) ? parsed : null
}

const parseApplicableTo = (value: string | undefined) => {
  const normalized = slugify(value || '')
  const tags = new Set<string>()

  if (normalized.includes('globe')) tags.add('globe')
  if (normalized.includes('wave')) tags.add('wave')
  if (normalized.includes('efeonce')) tags.add('internal_ops')
  if (normalized.includes('todos')) tags.add('all_projects')
  if (normalized.includes('retainer')) tags.add('retainers')
  if (normalized.includes('staff_augmentation')) tags.add('staff_augmentation')
  if (normalized.includes('servicios_internacionales')) tags.add('international_services')
  if (normalized.includes('servicios_creativos')) tags.add('creative_services')

  return Array.from(tags)
}

const parseFormula = (value: string, addonSku: string): {
  addonType: OverheadAddonType
  finalPriceUsd: number | null
  finalPricePct: number | null
  pctMin: number | null
  pctMax: number | null
  minimumAmountUsd: number | null
} | null => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return {
      addonType: 'overhead_fixed',
      finalPriceUsd: Number(normalized),
      finalPricePct: null,
      pctMin: null,
      pctMax: null,
      minimumAmountUsd: null
    }
  }

  const percentageMatch = normalized.match(/^(-?\d+(\.\d+)?)\s*%\s+del\s+subtotal$/)

  if (percentageMatch) {
    const pct = Number(percentageMatch[1]) / 100

    return {
      addonType: pct < 0 ? 'adjustment_pct' : 'fee_percentage',
      finalPriceUsd: null,
      finalPricePct: pct,
      pctMin: null,
      pctMax: null,
      minimumAmountUsd: null
    }
  }

  const monthlyResourcePctMatch = normalized.match(/^(\d+(\.\d+)?)\s*%\s+del\s+valor\s+mensual\s+del\s+recurso$/)

  if (monthlyResourcePctMatch) {
    return {
      addonType: 'fee_percentage',
      finalPriceUsd: null,
      finalPricePct: Number(monthlyResourcePctMatch[1]) / 100,
      pctMin: null,
      pctMax: null,
      minimumAmountUsd: null
    }
  }

  if (/^1\s+mes\s+del\s+costo\s+del\s+recurso$/.test(normalized)) {
    return {
      addonType: 'resource_month',
      finalPriceUsd: null,
      finalPricePct: null,
      pctMin: null,
      pctMax: null,
      minimumAmountUsd: null
    }
  }

  const variableRangeMatch = normalized.match(/^(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)\s*%\s+variable$/)

  if (variableRangeMatch) {
    return {
      addonType: 'fee_percentage',
      finalPriceUsd: null,
      finalPricePct: null,
      pctMin: Number(variableRangeMatch[1]) / 100,
      pctMax: Number(variableRangeMatch[3]) / 100,
      minimumAmountUsd: null
    }
  }

  const globalRangeMatch = normalized.match(/^(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)\s*%\s+global$/)

  if (globalRangeMatch) {
    return {
      addonType: 'fee_percentage',
      finalPriceUsd: null,
      finalPricePct: null,
      pctMin: Number(globalRangeMatch[1]) / 100,
      pctMax: Number(globalRangeMatch[3]) / 100,
      minimumAmountUsd: null
    }
  }

  const minimumMatch = normalized.match(/^(\d+(\.\d+)?)\s*%\s+del\s+proyecto\s+o\s+usd\s+(\d+(\.\d+)?)\s+minimo$/)

  if (minimumMatch) {
    return {
      addonType: 'fee_percentage',
      finalPriceUsd: null,
      finalPricePct: Number(minimumMatch[1]) / 100,
      pctMin: null,
      pctMax: null,
      minimumAmountUsd: Number(minimumMatch[3])
    }
  }

  const adjustmentMatch = normalized.match(/^-(\d+(\.\d+)?)\s*%$/)

  if (adjustmentMatch) {
    return {
      addonType: 'adjustment_pct',
      finalPriceUsd: null,
      finalPricePct: Number(`-${adjustmentMatch[1]}`) / 100,
      pctMin: null,
      pctMax: null,
      minimumAmountUsd: null
    }
  }

  if (addonSku === 'EFO-004') {
    return {
      addonType: 'resource_month',
      finalPriceUsd: null,
      finalPricePct: null,
      pctMin: null,
      pctMax: null,
      minimumAmountUsd: null
    }
  }

  return null
}

export const normalizeOverheadAddonsCsv = (csv: string): OverheadAddonSeedParseResult => {
  const rows = parseCsvDocument(csv)
  const normalizedRows: OverheadAddonSeedRow[] = []
  const rejectedRows: OverheadAddonRejectedRow[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const addonSku = normalizeNullableString(row.SKU)
    const addonName = normalizeNullableString(row['Nombre del Add-On'])

    if (!addonSku || !addonName) {
      rejectedRows.push({
        rowNumber,
        addonSku,
        addonName,
        reason: 'addon_sku y nombre son obligatorios.'
      })
      
return
    }

    const parsedFormula = parseFormula(row['Precio Final (USD)'] || '', addonSku)

    if (!parsedFormula) {
      rejectedRows.push({
        rowNumber,
        addonSku,
        addonName,
        reason: `No se pudo parsear la fórmula "${row['Precio Final (USD)'] || ''}".`
      })
      
return
    }

    normalizedRows.push({
      rowNumber,
      addonSku,
      category: row.Categoría.trim(),
      addonName,
      addonType: parsedFormula.addonType,
      unit: normalizeNullableString(row.Unidad),
      costInternalUsd: parseNullableNumber(row['Costo Interno (USD)']) ?? 0,
      marginPct: parseNullableNumber(row['Margen Agencia (%)']),
      finalPriceUsd: parsedFormula.finalPriceUsd,
      finalPricePct: parsedFormula.finalPricePct,
      pctMin: parsedFormula.pctMin,
      pctMax: parsedFormula.pctMax,
      minimumAmountUsd: parsedFormula.minimumAmountUsd,
      applicableTo: parseApplicableTo(row['Aplicable a']),
      description: normalizeNullableString(row['Descripción / Cuándo aplicar']),
      conditions: normalizeNullableString(row['Descripción / Cuándo aplicar']),
      visibleToClient: addonSku !== 'EFO-008',
      active: true,
      notes: normalizeNullableString(row.Comentarios),
      warnings: []
    })
  })

  return {
    rows: normalizedRows,
    summary: {
      totalRows: rows.length,
      activeRows: normalizedRows.length,
      rejected: rejectedRows.length
    },
    rejectedRows
  }
}

export const loadOverheadAddonsSeedFile = async () => readFile(OVERHEAD_ADDONS_CSV_PATH, 'utf8')
