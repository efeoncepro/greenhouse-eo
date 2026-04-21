import 'server-only'

import ExcelJS from 'exceljs'

import { listSellableRoles } from './sellable-roles-store'
import { listToolCatalog } from './tool-catalog-store'
import { listOverheadAddons } from './overhead-addons-store'

const HEADER_FILL = 'FF023C70'
const HEADER_FONT = 'FFFFFFFF'

/**
 * pricing-catalog-excel — helpers para export/import del pricing catalog
 * (TASK-471 slice 6).
 *
 * Export: genera un workbook multi-sheet (Roles, Tools, Overheads, Metadata)
 *         con el estado vigente del catálogo. Formato downloadable vía
 *         `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
 *
 * Import: parsea un workbook y devuelve un diff contra el estado actual de DB.
 *         NO persiste. El caller decide qué diffs aplicar via el endpoint de apply.
 *
 * V1 scope: solo Roles soporta import apply (columna whitelist tight). Tools y
 * overheads se exportan pero su import queda "preview-only" (follow-up).
 */

export interface ExcelExportMetadata {
  exportedAt: string
  exportedBy: string
  schemaVersion: string
}

export const buildPricingCatalogWorkbook = async (
  metadata: ExcelExportMetadata
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'Greenhouse EO — Pricing Catalog Export'
  workbook.created = new Date()
  workbook.company = 'Efeonce Group'

  // ── Metadata sheet ──
  const metaSheet = workbook.addWorksheet('Metadata')

  metaSheet.addRow(['Field', 'Value'])
  metaSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  })
  metaSheet.addRow(['exportedAt', metadata.exportedAt])
  metaSheet.addRow(['exportedBy', metadata.exportedBy])
  metaSheet.addRow(['schemaVersion', metadata.schemaVersion])
  metaSheet.getColumn(1).width = 24
  metaSheet.getColumn(2).width = 50

  // ── Roles sheet ──
  const roles = await listSellableRoles({})
  const rolesSheet = workbook.addWorksheet('Roles')

  const rolesHeaders = [
    'role_id',
    'role_sku',
    'role_code',
    'role_label_es',
    'role_label_en',
    'role_category',
    'role_tier',
    'tier_label',
    'can_sell_as_staff',
    'can_sell_as_service_component',
    'active',
    'notes'
  ]

  rolesSheet.addRow(rolesHeaders)
  rolesSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  })
  roles.forEach(role => {
    rolesSheet.addRow([
      role.roleId,
      role.roleSku,
      role.roleCode,
      role.roleLabelEs,
      role.roleLabelEn ?? '',
      role.category,
      role.tier ?? '',
      role.tierLabel ?? '',
      role.canSellAsStaff,
      role.canSellAsServiceComponent,
      role.active,
      role.notes ?? ''
    ])
  })
  rolesHeaders.forEach((_, idx) => {
    rolesSheet.getColumn(idx + 1).width = 20
  })

  // ── Tools sheet ──
  const tools = await listToolCatalog({})
  const toolsSheet = workbook.addWorksheet('Tools')

  const toolsHeaders = [
    'tool_id',
    'tool_sku',
    'tool_name',
    'tool_category',
    'cost_model',
    'subscription_amount',
    'subscription_currency',
    'subscription_billing_cycle',
    'is_active'
  ]

  toolsSheet.addRow(toolsHeaders)
  toolsSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  })
  tools.forEach(tool => {
    toolsSheet.addRow([
      tool.toolId,
      tool.toolSku,
      tool.toolName,
      tool.toolCategory ?? '',
      tool.costModel ?? '',
      tool.subscriptionAmount ?? 0,
      tool.subscriptionCurrency ?? '',
      tool.subscriptionBillingCycle ?? '',
      tool.isActive
    ])
  })
  toolsHeaders.forEach((_, idx) => {
    toolsSheet.getColumn(idx + 1).width = 20
  })

  // ── Overheads sheet ──
  const overheads = await listOverheadAddons({})
  const overheadsSheet = workbook.addWorksheet('Overheads')

  const overheadsHeaders = [
    'addon_id',
    'addon_sku',
    'addon_name',
    'category',
    'addon_type',
    'cost_internal_usd',
    'margin_pct',
    'final_price_usd',
    'visible_to_client',
    'active'
  ]

  overheadsSheet.addRow(overheadsHeaders)
  overheadsSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  })
  overheads.forEach(addon => {
    overheadsSheet.addRow([
      addon.addonId,
      addon.addonSku,
      addon.addonName,
      addon.category ?? '',
      addon.addonType ?? '',
      addon.costInternalUsd ?? 0,
      addon.marginPct ?? 0,
      addon.finalPriceUsd ?? 0,
      addon.visibleToClient,
      addon.active
    ])
  })
  overheadsHeaders.forEach((_, idx) => {
    overheadsSheet.getColumn(idx + 1).width = 20
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return Buffer.from(buffer)
}

// ── Import + diff ──────────────────────────────────────────────────────

export type PricingCatalogExcelDiffAction = 'create' | 'update' | 'delete' | 'noop'

export interface PricingCatalogExcelDiff {
  entityType: 'sellable_role' | 'tool_catalog' | 'overhead_addon'
  entityId: string | null
  entitySku: string | null
  action: PricingCatalogExcelDiffAction
  currentValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  fieldsChanged: string[]
  warnings: string[]
}

export interface PricingCatalogExcelPreviewResult {
  diffs: PricingCatalogExcelDiff[]
  metadata: {
    rolesProcessed: number
    toolsProcessed: number
    overheadsProcessed: number
    errors: Array<{ sheet: string; row: number; message: string }>
  }
}

const parseRoleRow = (row: ExcelJS.Row): Record<string, unknown> | null => {
  const cells = row.values as Array<ExcelJS.CellValue> | undefined

  if (!cells || cells.length < 12) return null

  // cells[0] is always undefined (1-indexed). Headers order matches rolesHeaders above.
  const roleId = cells[1]

  if (!roleId || typeof roleId !== 'string') return null

  const toBool = (v: ExcelJS.CellValue): boolean => v === true || v === 'true' || v === 1

  const toStr = (v: ExcelJS.CellValue): string | null => {
    if (v === null || v === undefined || v === '') return null

    return String(v)
  }

  return {
    role_id: roleId,
    role_sku: toStr(cells[2]),
    role_code: toStr(cells[3]),
    role_label_es: toStr(cells[4]),
    role_label_en: toStr(cells[5]),
    role_category: toStr(cells[6]),
    role_tier: toStr(cells[7]),
    tier_label: toStr(cells[8]),
    can_sell_as_staff: toBool(cells[9]),
    can_sell_as_service_component: toBool(cells[10]),
    active: toBool(cells[11]),
    notes: toStr(cells[12])
  }
}

const diffFields = (
  current: Record<string, unknown> | null,
  next: Record<string, unknown>
): { action: PricingCatalogExcelDiffAction; fieldsChanged: string[] } => {
  if (!current) return { action: 'create', fieldsChanged: Object.keys(next) }

  const fieldsChanged: string[] = []

  for (const key of Object.keys(next)) {
    if (current[key] !== next[key]) fieldsChanged.push(key)
  }

  return { action: fieldsChanged.length === 0 ? 'noop' : 'update', fieldsChanged }
}

export const previewPricingCatalogExcelImport = async (
  buffer: Buffer
): Promise<PricingCatalogExcelPreviewResult> => {
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const result: PricingCatalogExcelPreviewResult = {
    diffs: [],
    metadata: { rolesProcessed: 0, toolsProcessed: 0, overheadsProcessed: 0, errors: [] }
  }

  // Roles only for V1 import preview. Tools + overheads export-only.
  const rolesSheet = workbook.getWorksheet('Roles')

  if (rolesSheet) {
    const currentRoles = await listSellableRoles({})
    const currentById = new Map(currentRoles.map(role => [role.roleId, role]))

    rolesSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return // header

      try {
        const parsed = parseRoleRow(row)

        if (!parsed) {
          result.metadata.errors.push({
            sheet: 'Roles',
            row: rowNumber,
            message: 'Fila sin role_id; omitida.'
          })

          return
        }

        result.metadata.rolesProcessed += 1

        const current = currentById.get(parsed.role_id as string)

        const currentValues = current
          ? {
              role_id: current.roleId,
              role_sku: current.roleSku,
              role_code: current.roleCode,
              role_label_es: current.roleLabelEs,
              role_label_en: current.roleLabelEn ?? null,
              role_category: current.category,
              role_tier: current.tier ?? null,
              tier_label: current.tierLabel ?? null,
              can_sell_as_staff: current.canSellAsStaff,
              can_sell_as_service_component: current.canSellAsServiceComponent,
              active: current.active,
              notes: current.notes ?? null
            }
          : null

        const { action, fieldsChanged } = diffFields(currentValues, parsed)

        result.diffs.push({
          entityType: 'sellable_role',
          entityId: parsed.role_id as string,
          entitySku: (parsed.role_sku as string | null) ?? current?.roleSku ?? null,
          action,
          currentValues,
          newValues: parsed,
          fieldsChanged,
          warnings: []
        })
      } catch (err) {
        result.metadata.errors.push({
          sheet: 'Roles',
          row: rowNumber,
          message: err instanceof Error ? err.message : 'Error parseando fila.'
        })
      }
    })
  }

  return result
}
