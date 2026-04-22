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
 * V1 scope: preview multi-sheet para Roles, Tools y Overheads. Los `update`
 * pueden aplicar directo; `create`/`delete` deben pasar por approval workflow.
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
    'provider_id',
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
      tool.providerId,
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

const parseToolRow = (row: ExcelJS.Row): Record<string, unknown> | null => {
  const cells = row.values as Array<ExcelJS.CellValue> | undefined

  if (!cells || cells.length < 10) return null

  const toolId = cells[1]

  if (!toolId || typeof toolId !== 'string') return null

  const toBool = (v: ExcelJS.CellValue): boolean => v === true || v === 'true' || v === 1

  const toStr = (v: ExcelJS.CellValue): string | null => {
    if (v === null || v === undefined || v === '') return null

    return String(v)
  }

  const toNum = (v: ExcelJS.CellValue): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = typeof v === 'number' ? v : Number(v)

    return Number.isFinite(n) ? n : null
  }

  return {
    tool_id: toolId,
    tool_sku: toStr(cells[2]),
    tool_name: toStr(cells[3]),
    provider_id: toStr(cells[4]),
    tool_category: toStr(cells[5]),
    cost_model: toStr(cells[6]),
    subscription_amount: toNum(cells[7]),
    subscription_currency: toStr(cells[8]),
    subscription_billing_cycle: toStr(cells[9]),
    is_active: toBool(cells[10])
  }
}

const parseOverheadRow = (row: ExcelJS.Row): Record<string, unknown> | null => {
  const cells = row.values as Array<ExcelJS.CellValue> | undefined

  if (!cells || cells.length < 10) return null

  const addonId = cells[1]

  if (!addonId || typeof addonId !== 'string') return null

  const toBool = (v: ExcelJS.CellValue): boolean => v === true || v === 'true' || v === 1

  const toStr = (v: ExcelJS.CellValue): string | null => {
    if (v === null || v === undefined || v === '') return null

    return String(v)
  }

  const toNum = (v: ExcelJS.CellValue): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = typeof v === 'number' ? v : Number(v)

    return Number.isFinite(n) ? n : null
  }

  return {
    addon_id: addonId,
    addon_sku: toStr(cells[2]),
    addon_name: toStr(cells[3]),
    category: toStr(cells[4]),
    addon_type: toStr(cells[5]),
    cost_internal_usd: toNum(cells[6]),
    margin_pct: toNum(cells[7]),
    final_price_usd: toNum(cells[8]),
    visible_to_client: toBool(cells[9]),
    active: toBool(cells[10])
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

const getDiffWarnings = (action: PricingCatalogExcelDiffAction): string[] =>
  action === 'create' || action === 'delete' ? ['needs_approval'] : []

export const previewPricingCatalogExcelImport = async (
  buffer: Buffer
): Promise<PricingCatalogExcelPreviewResult> => {
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const result: PricingCatalogExcelPreviewResult = {
    diffs: [],
    metadata: { rolesProcessed: 0, toolsProcessed: 0, overheadsProcessed: 0, errors: [] }
  }

  const rolesSheet = workbook.getWorksheet('Roles')

  if (rolesSheet) {
    const currentRoles = await listSellableRoles({})
    const currentById = new Map(currentRoles.map(role => [role.roleId, role]))
    const seenRoleIds = new Set<string>()

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
        seenRoleIds.add(parsed.role_id as string)

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
          warnings: getDiffWarnings(action)
        })
      } catch (err) {
        result.metadata.errors.push({
          sheet: 'Roles',
          row: rowNumber,
          message: err instanceof Error ? err.message : 'Error parseando fila.'
        })
      }
    })

    currentRoles.forEach(current => {
      if (seenRoleIds.has(current.roleId)) return

      result.diffs.push({
        entityType: 'sellable_role',
        entityId: current.roleId,
        entitySku: current.roleSku,
        action: 'delete',
        currentValues: {
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
        },
        newValues: null,
        fieldsChanged: ['active'],
        warnings: ['needs_approval']
      })
    })
  }

  const toolsSheet = workbook.getWorksheet('Tools')

  if (toolsSheet) {
    const currentTools = await listToolCatalog({})
    const currentById = new Map(currentTools.map(t => [t.toolId, t]))
    const seenToolIds = new Set<string>()

    toolsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return

      try {
        const parsed = parseToolRow(row)

        if (!parsed) {
          result.metadata.errors.push({ sheet: 'Tools', row: rowNumber, message: 'Fila sin tool_id; omitida.' })

          return
        }

        result.metadata.toolsProcessed += 1
        seenToolIds.add(parsed.tool_id as string)

        const current = currentById.get(parsed.tool_id as string)

        const currentValues = current
          ? {
              tool_id: current.toolId,
              tool_sku: current.toolSku,
              tool_name: current.toolName,
              provider_id: current.providerId,
              tool_category: current.toolCategory ?? null,
              cost_model: current.costModel ?? null,
              subscription_amount: current.subscriptionAmount ?? null,
              subscription_currency: current.subscriptionCurrency ?? null,
              subscription_billing_cycle: current.subscriptionBillingCycle ?? null,
              is_active: current.isActive
            }
          : null

        const { action, fieldsChanged } = diffFields(currentValues, parsed)

        result.diffs.push({
          entityType: 'tool_catalog',
          entityId: parsed.tool_id as string,
          entitySku: (parsed.tool_sku as string | null) ?? current?.toolSku ?? null,
          action,
          currentValues,
          newValues: parsed,
          fieldsChanged,
          warnings: getDiffWarnings(action)
        })
      } catch (err) {
        result.metadata.errors.push({
          sheet: 'Tools',
          row: rowNumber,
          message: err instanceof Error ? err.message : 'Error parseando fila.'
        })
      }
    })

    currentTools.forEach(current => {
      if (seenToolIds.has(current.toolId)) return

      result.diffs.push({
        entityType: 'tool_catalog',
        entityId: current.toolId,
        entitySku: current.toolSku,
        action: 'delete',
        currentValues: {
          tool_id: current.toolId,
          tool_sku: current.toolSku,
          tool_name: current.toolName,
          provider_id: current.providerId,
          tool_category: current.toolCategory ?? null,
          cost_model: current.costModel ?? null,
          subscription_amount: current.subscriptionAmount ?? null,
          subscription_currency: current.subscriptionCurrency ?? null,
          subscription_billing_cycle: current.subscriptionBillingCycle ?? null,
          is_active: current.isActive
        },
        newValues: null,
        fieldsChanged: ['is_active'],
        warnings: ['needs_approval']
      })
    })
  }

  const overheadsSheet = workbook.getWorksheet('Overheads')

  if (overheadsSheet) {
    const currentOverheads = await listOverheadAddons({})
    const currentById = new Map(currentOverheads.map(o => [o.addonId, o]))
    const seenOverheadIds = new Set<string>()

    overheadsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return

      try {
        const parsed = parseOverheadRow(row)

        if (!parsed) {
          result.metadata.errors.push({ sheet: 'Overheads', row: rowNumber, message: 'Fila sin addon_id; omitida.' })

          return
        }

        result.metadata.overheadsProcessed += 1
        seenOverheadIds.add(parsed.addon_id as string)

        const current = currentById.get(parsed.addon_id as string)

        const currentValues = current
          ? {
              addon_id: current.addonId,
              addon_sku: current.addonSku,
              addon_name: current.addonName,
              category: current.category ?? null,
              addon_type: current.addonType ?? null,
              cost_internal_usd: current.costInternalUsd ?? null,
              margin_pct: current.marginPct ?? null,
              final_price_usd: current.finalPriceUsd ?? null,
              visible_to_client: current.visibleToClient,
              active: current.active
            }
          : null

        const { action, fieldsChanged } = diffFields(currentValues, parsed)

        result.diffs.push({
          entityType: 'overhead_addon',
          entityId: parsed.addon_id as string,
          entitySku: (parsed.addon_sku as string | null) ?? current?.addonSku ?? null,
          action,
          currentValues,
          newValues: parsed,
          fieldsChanged,
          warnings: getDiffWarnings(action)
        })
      } catch (err) {
        result.metadata.errors.push({
          sheet: 'Overheads',
          row: rowNumber,
          message: err instanceof Error ? err.message : 'Error parseando fila.'
        })
      }
    })

    currentOverheads.forEach(current => {
      if (seenOverheadIds.has(current.addonId)) return

      result.diffs.push({
        entityType: 'overhead_addon',
        entityId: current.addonId,
        entitySku: current.addonSku,
        action: 'delete',
        currentValues: {
          addon_id: current.addonId,
          addon_sku: current.addonSku,
          addon_name: current.addonName,
          category: current.category ?? null,
          addon_type: current.addonType ?? null,
          cost_internal_usd: current.costInternalUsd ?? null,
          margin_pct: current.marginPct ?? null,
          final_price_usd: current.finalPriceUsd ?? null,
          visible_to_client: current.visibleToClient,
          active: current.active
        },
        newValues: null,
        fieldsChanged: ['active'],
        warnings: ['needs_approval']
      })
    })
  }

  return result
}
