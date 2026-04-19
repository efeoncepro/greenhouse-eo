import 'server-only'

import type { Kysely, Selectable, Transaction } from 'kysely'
import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import type { DB } from '@/types/db'

type DbLike = Kysely<DB> | Transaction<DB>

type ServicePricingRow = Selectable<DB['greenhouse_commercial.service_pricing']>
type ServiceRoleRecipeRow = Selectable<DB['greenhouse_commercial.service_role_recipe']>
type ServiceToolRecipeRow = Selectable<DB['greenhouse_commercial.service_tool_recipe']>
type ServiceModuleRow = Selectable<DB['greenhouse_core.service_modules']>

export type ServiceUnit = 'project' | 'monthly'
export type ServiceCommercialModel =
  | 'on_going'
  | 'on_demand'
  | 'hybrid'
  | 'license_consulting'
export type ServiceTier = '1' | '2' | '3' | '4'

export interface ServiceRoleRecipeEntry {
  moduleId: string
  lineOrder: number
  roleId: string
  roleSku: string
  roleLabelEs: string
  hoursPerPeriod: number
  quantity: number
  isOptional: boolean
  notes: string | null
}

export interface ServiceToolRecipeEntry {
  moduleId: string
  lineOrder: number
  toolId: string
  toolSku: string
  toolName: string | null
  quantity: number
  isOptional: boolean
  passThrough: boolean
  notes: string | null
}

export interface ServiceCatalogEntry {
  moduleId: string
  moduleCode: string
  moduleName: string
  serviceSku: string
  serviceCategory: string | null
  displayName: string | null
  serviceUnit: ServiceUnit
  serviceType: string | null
  commercialModel: ServiceCommercialModel
  tier: ServiceTier
  defaultDurationMonths: number | null
  defaultDescription: string | null
  businessLineCode: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  roleRecipeCount: number
  toolRecipeCount: number
}

export interface ServiceCatalogDetail extends ServiceCatalogEntry {
  roleRecipe: ServiceRoleRecipeEntry[]
  toolRecipe: ServiceToolRecipeEntry[]
}

export interface ListServiceCatalogInput {
  tier?: ServiceTier | null
  category?: string | null
  businessLineCode?: string | null
  activeOnly?: boolean | null
}

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toStringTimestamp = (value: Date | string | null | undefined): string => {
  if (!value) return ''
  if (typeof value === 'string') return value

  return value.toISOString()
}

const getDbOrTx = async (dbOrTx?: DbLike) => dbOrTx ?? (await getDb())

const mapRoleRecipe = (row: {
  module_id: string
  line_order: number
  role_id: string
  hours_per_period: string | number
  quantity: number
  is_optional: boolean
  notes: string | null
  role_sku: string | null
  role_label_es: string | null
}): ServiceRoleRecipeEntry => ({
  moduleId: row.module_id,
  lineOrder: row.line_order,
  roleId: row.role_id,
  roleSku: row.role_sku ?? '',
  roleLabelEs: row.role_label_es ?? '',
  hoursPerPeriod: toNumber(row.hours_per_period) ?? 0,
  quantity: row.quantity,
  isOptional: row.is_optional,
  notes: row.notes
})

const mapToolRecipe = (row: {
  module_id: string
  line_order: number
  tool_id: string
  tool_sku: string
  quantity: number
  is_optional: boolean
  pass_through: boolean
  notes: string | null
  tool_name: string | null
}): ServiceToolRecipeEntry => ({
  moduleId: row.module_id,
  lineOrder: row.line_order,
  toolId: row.tool_id,
  toolSku: row.tool_sku,
  toolName: row.tool_name,
  quantity: row.quantity,
  isOptional: row.is_optional,
  passThrough: row.pass_through,
  notes: row.notes
})

interface AggregatedCatalogRow {
  module_id: string
  service_sku: string
  service_category: string | null
  display_name: string | null
  service_unit: string
  service_type: string | null
  commercial_model: string
  tier: string
  default_duration_months: number | null
  default_description: string | null
  business_line_code: string | null
  active: boolean
  created_at: Date | string
  updated_at: Date | string
  module_code: string
  module_name: string
  role_recipe_count: string | number | null
  tool_recipe_count: string | number | null
}

const mapCatalogEntry = (row: AggregatedCatalogRow): ServiceCatalogEntry => ({
  moduleId: row.module_id,
  moduleCode: row.module_code,
  moduleName: row.module_name,
  serviceSku: row.service_sku,
  serviceCategory: row.service_category,
  displayName: row.display_name,
  serviceUnit: row.service_unit as ServiceUnit,
  serviceType: row.service_type,
  commercialModel: row.commercial_model as ServiceCommercialModel,
  tier: row.tier as ServiceTier,
  defaultDurationMonths: row.default_duration_months,
  defaultDescription: row.default_description,
  businessLineCode: row.business_line_code,
  active: row.active,
  createdAt: toStringTimestamp(row.created_at),
  updatedAt: toStringTimestamp(row.updated_at),
  roleRecipeCount: toNumber(row.role_recipe_count) ?? 0,
  toolRecipeCount: toNumber(row.tool_recipe_count) ?? 0
})

export const listServiceCatalog = async (
  input: ListServiceCatalogInput = {}
): Promise<ServiceCatalogEntry[]> => {
  const db = await getDb()

  let statement = db
    .selectFrom('greenhouse_commercial.service_pricing as sp')
    .innerJoin('greenhouse_core.service_modules as sm', 'sm.module_id', 'sp.module_id')
    .select([
      'sp.module_id',
      'sp.service_sku',
      'sp.service_category',
      'sp.display_name',
      'sp.service_unit',
      'sp.service_type',
      'sp.commercial_model',
      'sp.tier',
      'sp.default_duration_months',
      'sp.default_description',
      'sp.business_line_code',
      'sp.active',
      'sp.created_at',
      'sp.updated_at',
      'sm.module_code',
      'sm.module_name',
      sql<string>`(
        SELECT COUNT(*) FROM greenhouse_commercial.service_role_recipe srr
        WHERE srr.module_id = sp.module_id
      )`.as('role_recipe_count'),
      sql<string>`(
        SELECT COUNT(*) FROM greenhouse_commercial.service_tool_recipe str
        WHERE str.module_id = sp.module_id
      )`.as('tool_recipe_count')
    ])

  if (input.tier) {
    statement = statement.where('sp.tier', '=', input.tier)
  }

  if (input.category) {
    statement = statement.where('sp.service_category', '=', input.category)
  }

  if (input.businessLineCode) {
    statement = statement.where('sp.business_line_code', '=', input.businessLineCode)
  }

  if (input.activeOnly !== false) {
    statement = statement.where('sp.active', '=', true)
  }

  const rows = await statement.orderBy('sp.service_sku', 'asc').execute()

  return rows.map(row => mapCatalogEntry(row as unknown as AggregatedCatalogRow))
}

export const getServiceByModuleId = async (
  moduleId: string,
  dbOrTx?: DbLike
): Promise<ServiceCatalogDetail | null> => {
  const db = await getDbOrTx(dbOrTx)

  const row = await db
    .selectFrom('greenhouse_commercial.service_pricing as sp')
    .innerJoin('greenhouse_core.service_modules as sm', 'sm.module_id', 'sp.module_id')
    .select([
      'sp.module_id',
      'sp.service_sku',
      'sp.service_category',
      'sp.display_name',
      'sp.service_unit',
      'sp.service_type',
      'sp.commercial_model',
      'sp.tier',
      'sp.default_duration_months',
      'sp.default_description',
      'sp.business_line_code',
      'sp.active',
      'sp.created_at',
      'sp.updated_at',
      'sm.module_code',
      'sm.module_name'
    ])
    .where('sp.module_id', '=', moduleId)
    .executeTakeFirst()

  if (!row) return null

  const [roleRecipeRows, toolRecipeRows] = await Promise.all([
    db
      .selectFrom('greenhouse_commercial.service_role_recipe as srr')
      .leftJoin('greenhouse_commercial.sellable_roles as sr', 'sr.role_id', 'srr.role_id')
      .select([
        'srr.module_id',
        'srr.line_order',
        'srr.role_id',
        'srr.hours_per_period',
        'srr.quantity',
        'srr.is_optional',
        'srr.notes',
        'sr.role_sku',
        'sr.role_label_es'
      ])
      .where('srr.module_id', '=', moduleId)
      .orderBy('srr.line_order', 'asc')
      .execute(),
    db
      .selectFrom('greenhouse_commercial.service_tool_recipe as str')
      .leftJoin('greenhouse_ai.tool_catalog as tc', 'tc.tool_id', 'str.tool_id')
      .select([
        'str.module_id',
        'str.line_order',
        'str.tool_id',
        'str.tool_sku',
        'str.quantity',
        'str.is_optional',
        'str.pass_through',
        'str.notes',
        'tc.tool_name'
      ])
      .where('str.module_id', '=', moduleId)
      .orderBy('str.line_order', 'asc')
      .execute()
  ])

  return {
    ...mapCatalogEntry({
      ...row,
      role_recipe_count: roleRecipeRows.length,
      tool_recipe_count: toolRecipeRows.length
    } as unknown as AggregatedCatalogRow),
    roleRecipe: roleRecipeRows.map(mapRoleRecipe),
    toolRecipe: toolRecipeRows.map(mapToolRecipe)
  }
}

export const getServiceBySku = async (
  serviceSku: string,
  dbOrTx?: DbLike
): Promise<ServiceCatalogDetail | null> => {
  const db = await getDbOrTx(dbOrTx)

  const row = await db
    .selectFrom('greenhouse_commercial.service_pricing')
    .select(['module_id'])
    .where('service_sku', '=', serviceSku)
    .executeTakeFirst()

  if (!row) return null

  return getServiceByModuleId(row.module_id, db)
}

export interface UpsertServiceInput {
  moduleCode?: string | null
  moduleName: string
  serviceSku?: string | null
  serviceCategory?: string | null
  displayName?: string | null
  serviceUnit: ServiceUnit
  serviceType?: string | null
  commercialModel: ServiceCommercialModel
  tier: ServiceTier
  defaultDurationMonths?: number | null
  defaultDescription?: string | null
  businessLineCode?: string | null
  active?: boolean
  actorUserId?: string | null
}

const slugifyModuleCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')

interface UpsertedServiceResult {
  moduleId: string
  serviceSku: string
}

/**
 * Atomic creation: UPSERT greenhouse_core.service_modules (canonical identity)
 * then INSERT greenhouse_commercial.service_pricing. Caller must provide a
 * moduleCode or moduleName; a moduleCode is derived from the name if missing.
 */
export const createService = async (
  input: UpsertServiceInput
): Promise<UpsertedServiceResult> => {
  const db = await getDb()

  const moduleName = input.moduleName.trim()

  if (!moduleName) throw new Error('moduleName is required')

  const moduleCode = (input.moduleCode?.trim() || slugifyModuleCode(moduleName)).slice(0, 128)

  if (!moduleCode) throw new Error('moduleCode could not be derived from moduleName')

  return db.transaction().execute(async trx => {
    const existingModule = await trx
      .selectFrom('greenhouse_core.service_modules')
      .select(['module_id'])
      .where('module_code', '=', moduleCode)
      .executeTakeFirst()

    let moduleId: string

    if (existingModule) {
      moduleId = existingModule.module_id
      await trx
        .updateTable('greenhouse_core.service_modules')
        .set({
          module_name: moduleName,
          business_line: input.businessLineCode ?? null,
          module_kind: 'service_module',
          active: input.active ?? true,
          status: input.active === false ? 'inactive' : 'active',
          updated_at: sql`CURRENT_TIMESTAMP`
        })
        .where('module_id', '=', moduleId)
        .execute()
    } else {
      const inserted = await trx
        .insertInto('greenhouse_core.service_modules')
        .values({
          module_id: sql`'sm-' || gen_random_uuid()`,
          module_code: moduleCode,
          module_name: moduleName,
          business_line: input.businessLineCode ?? null,
          module_kind: 'service_module',
          active: input.active ?? true,
          status: input.active === false ? 'inactive' : 'active'
        })
        .returning('module_id')
        .executeTakeFirstOrThrow()

      moduleId = inserted.module_id
    }

    const existingPricing = await trx
      .selectFrom('greenhouse_commercial.service_pricing')
      .select(['module_id', 'service_sku'])
      .where('module_id', '=', moduleId)
      .executeTakeFirst()

    if (existingPricing) {
      throw Object.assign(new Error(`Service pricing already exists for module ${moduleId}`), {
        code: 'SERVICE_PRICING_EXISTS',
        existing: existingPricing
      })
    }

    const insertValues: Record<string, unknown> = {
      module_id: moduleId,
      service_category: input.serviceCategory ?? null,
      display_name: input.displayName ?? null,
      service_unit: input.serviceUnit,
      service_type: input.serviceType ?? null,
      commercial_model: input.commercialModel,
      tier: input.tier,
      default_duration_months: input.defaultDurationMonths ?? null,
      default_description: input.defaultDescription ?? null,
      business_line_code: input.businessLineCode ?? null,
      active: input.active ?? true,
      created_by_user_id: input.actorUserId ?? null,
      updated_by_user_id: input.actorUserId ?? null
    }

    if (input.serviceSku) {
      insertValues.service_sku = input.serviceSku
    }

    const insertedPricing = await trx
      .insertInto('greenhouse_commercial.service_pricing')
      .values(insertValues as never)
      .returning(['service_sku'])
      .executeTakeFirstOrThrow()

    return { moduleId, serviceSku: insertedPricing.service_sku }
  })
}

export interface UpdateServiceInput {
  serviceCategory?: string | null
  displayName?: string | null
  serviceUnit?: ServiceUnit
  serviceType?: string | null
  commercialModel?: ServiceCommercialModel
  tier?: ServiceTier
  defaultDurationMonths?: number | null
  defaultDescription?: string | null
  businessLineCode?: string | null
  active?: boolean
  moduleName?: string | null
  actorUserId?: string | null
}

export const updateService = async (
  moduleId: string,
  input: UpdateServiceInput
): Promise<void> => {
  const db = await getDb()

  await db.transaction().execute(async trx => {
    const patch: Record<string, unknown> = {
      updated_by_user_id: input.actorUserId ?? null,
      updated_at: sql`CURRENT_TIMESTAMP`
    }

    if (input.serviceCategory !== undefined) patch.service_category = input.serviceCategory
    if (input.displayName !== undefined) patch.display_name = input.displayName
    if (input.serviceUnit !== undefined) patch.service_unit = input.serviceUnit
    if (input.serviceType !== undefined) patch.service_type = input.serviceType
    if (input.commercialModel !== undefined) patch.commercial_model = input.commercialModel
    if (input.tier !== undefined) patch.tier = input.tier
    if (input.defaultDurationMonths !== undefined) patch.default_duration_months = input.defaultDurationMonths
    if (input.defaultDescription !== undefined) patch.default_description = input.defaultDescription
    if (input.businessLineCode !== undefined) patch.business_line_code = input.businessLineCode
    if (input.active !== undefined) patch.active = input.active

    if (Object.keys(patch).length > 2) {
      await trx
        .updateTable('greenhouse_commercial.service_pricing')
        .set(patch as never)
        .where('module_id', '=', moduleId)
        .execute()
    }

    const modulePatch: Record<string, unknown> = {}

    if (input.moduleName) modulePatch.module_name = input.moduleName
    if (input.businessLineCode !== undefined) modulePatch.business_line = input.businessLineCode

    if (input.active !== undefined) {
      modulePatch.active = input.active
      modulePatch.status = input.active ? 'active' : 'inactive'
    }

    if (Object.keys(modulePatch).length > 0) {
      modulePatch.updated_at = sql`CURRENT_TIMESTAMP`
      await trx
        .updateTable('greenhouse_core.service_modules')
        .set(modulePatch as never)
        .where('module_id', '=', moduleId)
        .execute()
    }
  })
}

export const softDeleteService = async (moduleId: string): Promise<void> => {
  await updateService(moduleId, { active: false })
}

export interface ServiceRoleRecipeInput {
  roleId: string
  hoursPerPeriod: number
  quantity?: number
  isOptional?: boolean
  notes?: string | null
}

export interface ServiceToolRecipeInput {
  toolId: string
  toolSku: string
  quantity?: number
  isOptional?: boolean
  passThrough?: boolean
  notes?: string | null
}

export const replaceRoleRecipe = async (
  moduleId: string,
  recipe: ServiceRoleRecipeInput[]
): Promise<void> => {
  const db = await getDb()

  await db.transaction().execute(async trx => {
    await trx
      .deleteFrom('greenhouse_commercial.service_role_recipe')
      .where('module_id', '=', moduleId)
      .execute()

    if (recipe.length === 0) return

    const values = recipe.map((line, index) => ({
      module_id: moduleId,
      line_order: index + 1,
      role_id: line.roleId,
      hours_per_period: line.hoursPerPeriod.toString(),
      quantity: line.quantity ?? 1,
      is_optional: line.isOptional ?? false,
      notes: line.notes ?? null
    }))

    await trx
      .insertInto('greenhouse_commercial.service_role_recipe')
      .values(values as never)
      .execute()
  })
}

export const replaceToolRecipe = async (
  moduleId: string,
  recipe: ServiceToolRecipeInput[]
): Promise<void> => {
  const db = await getDb()

  await db.transaction().execute(async trx => {
    await trx
      .deleteFrom('greenhouse_commercial.service_tool_recipe')
      .where('module_id', '=', moduleId)
      .execute()

    if (recipe.length === 0) return

    const values = recipe.map((line, index) => ({
      module_id: moduleId,
      line_order: index + 1,
      tool_id: line.toolId,
      tool_sku: line.toolSku,
      quantity: line.quantity ?? 1,
      is_optional: line.isOptional ?? false,
      pass_through: line.passThrough ?? false,
      notes: line.notes ?? null
    }))

    await trx
      .insertInto('greenhouse_commercial.service_tool_recipe')
      .values(values as never)
      .execute()
  })
}

/**
 * Seeding helper: lookup or create a service_modules row by module_code and
 * return its module_id. Does NOT touch service_pricing (callers do that).
 */
export const upsertServiceModule = async (
  input: {
    moduleCode: string
    moduleName: string
    businessLine?: string | null
    active?: boolean
  },
  dbOrTx?: DbLike
): Promise<ServiceModuleRow> => {
  const db = await getDbOrTx(dbOrTx)

  const existing = await db
    .selectFrom('greenhouse_core.service_modules')
    .selectAll()
    .where('module_code', '=', input.moduleCode)
    .executeTakeFirst()

  if (existing) {
    const updated = await db
      .updateTable('greenhouse_core.service_modules')
      .set({
        module_name: input.moduleName,
        business_line: input.businessLine ?? existing.business_line,
        module_kind: existing.module_kind ?? 'service_module',
        active: input.active ?? existing.active,
        status: (input.active ?? existing.active) ? 'active' : 'inactive',
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where('module_id', '=', existing.module_id)
      .returningAll()
      .executeTakeFirstOrThrow()

    return updated
  }

  return db
    .insertInto('greenhouse_core.service_modules')
    .values({
      module_id: sql`'sm-' || gen_random_uuid()`,
      module_code: input.moduleCode,
      module_name: input.moduleName,
      business_line: input.businessLine ?? null,
      module_kind: 'service_module',
      active: input.active ?? true,
      status: (input.active ?? true) ? 'active' : 'inactive'
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export type {
  ServicePricingRow,
  ServiceRoleRecipeRow,
  ServiceToolRecipeRow
}
