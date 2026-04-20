import 'server-only'

import type { Kysely, Transaction } from 'kysely'
import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import type { DB } from '@/types/db'
import type {
  ClauseLibraryRow,
  MasterAgreementClauseCategory,
  MasterAgreementClauseLanguage,
  MasterAgreementClauseRow
} from '@/lib/commercial/master-agreements-types'

type JsonRecord = Record<string, unknown>

type ClauseLibraryDbRow = {
  clause_id: string
  clause_code: string
  version: number
  language: string
  category: string
  title: string
  summary: string | null
  body_template: string
  default_variables: unknown
  required: boolean
  active: boolean
  sort_order: number
  created_at: string | Date
  updated_at: string | Date
}

type MasterAgreementClauseDbRow = {
  msa_clause_id: string
  msa_id: string
  clause_id: string
  clause_code: string
  clause_version: number
  clause_language: string
  category: string
  title: string
  summary: string | null
  body_template: string
  body_override: string | null
  default_variables: unknown
  variables_json: unknown
  included: boolean
  sort_order: number
  effective_from: string | Date | null
  effective_to: string | Date | null
  notes: string | null
  updated_at: string | Date
}

type MsaRuntimeVariables = {
  paymentTermsDays?: number | null
  governingLaw?: string | null
  jurisdiction?: string | null
}

type DbLike = Kysely<DB> | Transaction<DB>

export class MasterAgreementClauseValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'MasterAgreementClauseValidationError'
    this.statusCode = statusCode
  }
}

const CLAUSE_CATEGORIES: readonly MasterAgreementClauseCategory[] = [
  'legal',
  'payment',
  'privacy',
  'security',
  'ip',
  'sla',
  'general'
]

const CLAUSE_LANGUAGES: readonly MasterAgreementClauseLanguage[] = ['es', 'en']

const isCategory = (value: string): value is MasterAgreementClauseCategory =>
  (CLAUSE_CATEGORIES as readonly string[]).includes(value)

const isLanguage = (value: string): value is MasterAgreementClauseLanguage =>
  (CLAUSE_LANGUAGES as readonly string[]).includes(value)

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toIsoTs = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : String(value)

const asRecord = (value: unknown): JsonRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as JsonRecord
}

const normalizeOptionalString = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? ''

  return normalized.length > 0 ? normalized : null
}

const mapClauseLibraryRow = (row: ClauseLibraryDbRow): ClauseLibraryRow => ({
  clauseId: row.clause_id,
  clauseCode: row.clause_code,
  version: Number(row.version),
  language: isLanguage(row.language) ? row.language : 'es',
  category: isCategory(row.category) ? row.category : 'general',
  title: row.title,
  summary: row.summary,
  bodyTemplate: row.body_template,
  defaultVariables: asRecord(row.default_variables),
  required: Boolean(row.required),
  active: Boolean(row.active),
  sortOrder: Number(row.sort_order),
  createdAt: toIsoTs(row.created_at),
  updatedAt: toIsoTs(row.updated_at)
})

const buildRuntimeVariables = (runtime?: MsaRuntimeVariables | null): JsonRecord => ({
  payment_terms_days: runtime?.paymentTermsDays ?? null,
  governing_law: runtime?.governingLaw ?? null,
  paymentTermsDays: runtime?.paymentTermsDays ?? null,
  governingLaw: runtime?.governingLaw ?? null,
  jurisdiction: runtime?.jurisdiction ?? null
})

export const renderClauseTemplate = (
  template: string,
  variables?: JsonRecord | null,
  runtime?: MsaRuntimeVariables | null
) => {
  const merged = {
    ...asRecord(variables),
    ...buildRuntimeVariables(runtime)
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = merged[key]

    return value === null || value === undefined || value === '' ? '—' : String(value)
  })
}

const mapMasterAgreementClauseRow = (
  row: MasterAgreementClauseDbRow,
  runtime?: MsaRuntimeVariables | null
): MasterAgreementClauseRow => {
  const defaultVariables = asRecord(row.default_variables)
  const variables = asRecord(row.variables_json)
  const bodyTemplate = row.body_override?.trim() || row.body_template

  return {
    msaClauseId: row.msa_clause_id,
    msaId: row.msa_id,
    clauseId: row.clause_id,
    clauseCode: row.clause_code,
    clauseVersion: Number(row.clause_version),
    clauseLanguage: isLanguage(row.clause_language) ? row.clause_language : 'es',
    category: isCategory(row.category) ? row.category : 'general',
    title: row.title,
    summary: row.summary,
    bodyTemplate: row.body_template,
    bodyOverride: row.body_override,
    resolvedBody: renderClauseTemplate(bodyTemplate, { ...defaultVariables, ...variables }, runtime),
    defaultVariables,
    variables,
    included: Boolean(row.included),
    sortOrder: Number(row.sort_order),
    effectiveFrom: toIsoDate(row.effective_from),
    effectiveTo: toIsoDate(row.effective_to),
    notes: row.notes,
    updatedAt: toIsoTs(row.updated_at)
  }
}

export const listClauseLibrary = async ({
  activeOnly = true,
  language,
  category,
  dbOrTx
}: {
  activeOnly?: boolean
  language?: MasterAgreementClauseLanguage
  category?: MasterAgreementClauseCategory
  dbOrTx?: DbLike
} = {}): Promise<ClauseLibraryRow[]> => {
  const db = dbOrTx ?? (await getDb())
  const conditions = [sql<boolean>`TRUE`]

  if (activeOnly) {
    conditions.push(sql<boolean>`active = TRUE`)
  }

  if (language) {
    conditions.push(sql<boolean>`language = ${language}`)
  }

  if (category) {
    conditions.push(sql<boolean>`category = ${category}`)
  }

  const result = await sql<ClauseLibraryDbRow>`
    SELECT
      clause_id,
      clause_code,
      version,
      language,
      category,
      title,
      summary,
      body_template,
      default_variables,
      required,
      active,
      sort_order,
      created_at,
      updated_at
    FROM greenhouse_commercial.clause_library
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY sort_order ASC, clause_code ASC, version DESC, language ASC
  `.execute(db)

  return result.rows.map(mapClauseLibraryRow)
}

const assertClauseInput = (input: {
  clauseCode?: string
  category?: string
  title?: string
  bodyTemplate?: string
  language?: string
  version?: number
}) => {
  if (!normalizeOptionalString(input.clauseCode)) {
    throw new MasterAgreementClauseValidationError('clauseCode es requerido.')
  }

  if (!input.category || !isCategory(input.category)) {
    throw new MasterAgreementClauseValidationError(`category inválida. Debe ser: ${CLAUSE_CATEGORIES.join(', ')}.`)
  }

  if (!normalizeOptionalString(input.title)) {
    throw new MasterAgreementClauseValidationError('title es requerido.')
  }

  if (!normalizeOptionalString(input.bodyTemplate)) {
    throw new MasterAgreementClauseValidationError('bodyTemplate es requerido.')
  }

  if (input.language && !isLanguage(input.language)) {
    throw new MasterAgreementClauseValidationError(`language inválido. Debe ser: ${CLAUSE_LANGUAGES.join(', ')}.`)
  }

  if (input.version !== undefined && (!Number.isInteger(input.version) || Number(input.version) <= 0)) {
    throw new MasterAgreementClauseValidationError('version debe ser un entero positivo.')
  }
}

export const createClause = async (input: {
  clauseCode: string
  category: MasterAgreementClauseCategory
  title: string
  summary?: string | null
  bodyTemplate: string
  language?: MasterAgreementClauseLanguage
  version?: number
  defaultVariables?: JsonRecord
  required?: boolean
  active?: boolean
  sortOrder?: number
  actorUserId: string
}, dbOrTx?: DbLike) => {
  assertClauseInput(input)

  const db = dbOrTx ?? (await getDb())

  const result = await sql<ClauseLibraryDbRow>`
    INSERT INTO greenhouse_commercial.clause_library (
      clause_code,
      version,
      language,
      category,
      title,
      summary,
      body_template,
      default_variables,
      required,
      active,
      sort_order,
      created_by,
      updated_by
    )
    VALUES (
      ${input.clauseCode.trim()},
      ${input.version ?? 1},
      ${input.language ?? 'es'},
      ${input.category},
      ${input.title.trim()},
      ${normalizeOptionalString(input.summary) ?? null},
      ${input.bodyTemplate.trim()},
      ${JSON.stringify(input.defaultVariables ?? {})}::jsonb,
      ${input.required ?? false},
      ${input.active ?? true},
      ${input.sortOrder ?? 100},
      ${input.actorUserId},
      ${input.actorUserId}
    )
    RETURNING
      clause_id,
      clause_code,
      version,
      language,
      category,
      title,
      summary,
      body_template,
      default_variables,
      required,
      active,
      sort_order,
      created_at,
      updated_at
  `.execute(db)

  return mapClauseLibraryRow(result.rows[0])
}

export const updateClause = async (
  clauseId: string,
  input: {
    category?: MasterAgreementClauseCategory
    title?: string
    summary?: string | null
    bodyTemplate?: string
    defaultVariables?: JsonRecord
    required?: boolean
    active?: boolean
    sortOrder?: number
    actorUserId: string
  },
  dbOrTx?: DbLike
) => {
  const updates: Array<ReturnType<typeof sql>> = []

  if (input.category) {
    updates.push(sql`category = ${input.category}`)
  }

  if (input.title !== undefined) {
    const title = normalizeOptionalString(input.title)

    if (!title) {
      throw new MasterAgreementClauseValidationError('title es requerido.')
    }

    updates.push(sql`title = ${title}`)
  }

  if (input.summary !== undefined) {
    updates.push(sql`summary = ${normalizeOptionalString(input.summary) ?? null}`)
  }

  if (input.bodyTemplate !== undefined) {
    const bodyTemplate = normalizeOptionalString(input.bodyTemplate)

    if (!bodyTemplate) {
      throw new MasterAgreementClauseValidationError('bodyTemplate es requerido.')
    }

    updates.push(sql`body_template = ${bodyTemplate}`)
  }

  if (input.defaultVariables !== undefined) {
    updates.push(sql`default_variables = ${JSON.stringify(input.defaultVariables ?? {})}::jsonb`)
  }

  if (input.required !== undefined) {
    updates.push(sql`required = ${input.required}`)
  }

  if (input.active !== undefined) {
    updates.push(sql`active = ${input.active}`)
  }

  if (input.sortOrder !== undefined) {
    updates.push(sql`sort_order = ${input.sortOrder}`)
  }

  if (updates.length === 0) {
    return null
  }

  updates.push(sql`updated_by = ${input.actorUserId}`)
  updates.push(sql`updated_at = NOW()`)

  const db = dbOrTx ?? (await getDb())

  const result = await sql<ClauseLibraryDbRow>`
    UPDATE greenhouse_commercial.clause_library
    SET ${sql.join(updates, sql`, `)}
    WHERE clause_id = ${clauseId}
    RETURNING
      clause_id,
      clause_code,
      version,
      language,
      category,
      title,
      summary,
      body_template,
      default_variables,
      required,
      active,
      sort_order,
      created_at,
      updated_at
  `.execute(db)

  return result.rows[0] ? mapClauseLibraryRow(result.rows[0]) : null
}

export const deactivateClause = async (clauseId: string, actorUserId: string, dbOrTx?: DbLike) =>
  updateClause(clauseId, { active: false, actorUserId }, dbOrTx)

export const listMasterAgreementClauses = async ({
  msaId,
  runtime,
  dbOrTx
}: {
  msaId: string
  runtime?: MsaRuntimeVariables | null
  dbOrTx?: DbLike
}) => {
  const db = dbOrTx ?? (await getDb())

  const result = await sql<MasterAgreementClauseDbRow>`
    SELECT
      mac.msa_clause_id,
      mac.msa_id,
      mac.clause_id,
      mac.clause_code,
      mac.clause_version,
      mac.clause_language,
      cl.category,
      cl.title,
      cl.summary,
      cl.body_template,
      cl.default_variables,
      mac.body_override,
      mac.variables_json,
      mac.included,
      mac.sort_order,
      mac.effective_from,
      mac.effective_to,
      mac.notes,
      mac.updated_at
    FROM greenhouse_commercial.master_agreement_clauses AS mac
    INNER JOIN greenhouse_commercial.clause_library AS cl
      ON cl.clause_id = mac.clause_id
    WHERE mac.msa_id = ${msaId}
    ORDER BY mac.sort_order ASC, mac.created_at ASC
  `.execute(db)

  return result.rows.map(row => mapMasterAgreementClauseRow(row, runtime))
}

export const replaceMasterAgreementClauses = async ({
  msaId,
  clauses,
  actorUserId,
  dbOrTx
}: {
  msaId: string
  clauses: Array<{
    clauseId: string
    bodyOverride?: string | null
    variables?: JsonRecord
    included?: boolean
    sortOrder?: number
    effectiveFrom?: string | null
    effectiveTo?: string | null
    notes?: string | null
  }>
  actorUserId: string
  dbOrTx?: DbLike
}) => {
  if (clauses.length === 0) {
    throw new MasterAgreementClauseValidationError('Debes seleccionar al menos una cláusula para el MSA.')
  }

  const uniqueClauseIds = Array.from(new Set(clauses.map(item => item.clauseId)))

  if (uniqueClauseIds.length !== clauses.length) {
    throw new MasterAgreementClauseValidationError('No puedes repetir la misma cláusula dentro de un MSA.')
  }

  const db = dbOrTx ?? (await getDb())

  const execute = async (trx: DbLike) => {
    const libraryResult = await sql<ClauseLibraryDbRow>`
      SELECT
        clause_id,
        clause_code,
        version,
        language,
        category,
        title,
        summary,
        body_template,
        default_variables,
        required,
        active,
        sort_order,
        created_at,
        updated_at
      FROM greenhouse_commercial.clause_library
      WHERE clause_id IN (${sql.join(uniqueClauseIds.map(id => sql`${id}`), sql`, `)})
    `.execute(trx)

    const libraryById = new Map(libraryResult.rows.map(row => [row.clause_id, row]))

    if (libraryById.size !== uniqueClauseIds.length) {
      throw new MasterAgreementClauseValidationError('Una o más cláusulas seleccionadas no existen.', 404)
    }

    await sql`
      DELETE FROM greenhouse_commercial.master_agreement_clauses
      WHERE msa_id = ${msaId}
    `.execute(trx)

    for (let index = 0; index < clauses.length; index += 1) {
      const item = clauses[index]
      const clause = libraryById.get(item.clauseId)

      if (!clause) continue

      await sql`
        INSERT INTO greenhouse_commercial.master_agreement_clauses (
          msa_id,
          clause_id,
          clause_code,
          clause_version,
          clause_language,
          sort_order,
          included,
          body_override,
          variables_json,
          effective_from,
          effective_to,
          notes,
          created_by,
          updated_by
        )
        VALUES (
          ${msaId},
          ${clause.clause_id},
          ${clause.clause_code},
          ${clause.version},
          ${clause.language},
          ${item.sortOrder ?? (index + 1) * 10},
          ${item.included ?? true},
          ${normalizeOptionalString(item.bodyOverride) ?? null},
          ${JSON.stringify(item.variables ?? {})}::jsonb,
          ${normalizeOptionalString(item.effectiveFrom) ?? null}::date,
          ${normalizeOptionalString(item.effectiveTo) ?? null}::date,
          ${normalizeOptionalString(item.notes) ?? null},
          ${actorUserId},
          ${actorUserId}
        )
      `.execute(trx)
    }

    return true
  }

  if (dbOrTx) {
    return execute(dbOrTx)
  }

  return db.transaction().execute(trx => execute(trx))
}
