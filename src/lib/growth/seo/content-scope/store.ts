import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import {
  SEO_CONTENT_SCOPE_MAX_LABEL_LENGTH,
  type SeoContentScopeRuleV1,
  type SeoContentScopeV1,
  contentScopeKey,
  parseSeoContentScopeRules
} from './contracts'

/**
 * TASK-2033 — lectura y escritura del alcance de contenido (`greenhouse_growth.seo_content_scope_versions`).
 *
 * Único acceso a la tabla: `readSeoContentScope` (reader) y `setSeoContentScope` (command). Cualquier
 * consumer —CLI hoy; App API, Ecosystem API y MCP cuando se expongan— pasa por estos dos, sin lógica propia.
 *
 * El alcance vigente es la versión de mayor número. Fijar las mismas reglas y la misma etiqueta que la
 * vigente no escribe (idempotente). Volver al sitio completo es una versión nueva con cero reglas.
 */

export class SeoContentScopeInputError extends Error {
  readonly errors: string[]

  constructor(errors: string[]) {
    super(errors.join(' '))
    this.name = 'SeoContentScopeInputError'
    this.errors = errors
  }
}

interface ScopeRow extends Record<string, unknown> {
  organization_id: string
  version: number
  label: string
  rules_json: unknown
  created_at: Date | string
}

const toIso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : value)

const mapRow = (row: ScopeRow): SeoContentScopeV1 => {
  const parsed = parseSeoContentScopeRules(row.rules_json)

  // La columna sólo se escribe por el command, que ya validó. Si aun así llega algo inválido, NO se
  // degrada a «sitio completo»: medir el dominio entero en silencio es justo el error que esta tabla evita.
  if (!parsed.ok) {
    throw new Error(`Alcance de contenido ilegible para ${row.organization_id} v${row.version}: ${parsed.errors.join(' ')}`)
  }

  return {
    organizationId: row.organization_id,
    version: Number(row.version),
    label: row.label,
    rules: parsed.rules,
    createdAt: toIso(row.created_at)
  }
}

const LATEST_SQL = `SELECT organization_id, version, label, rules_json, created_at
       FROM greenhouse_growth.seo_content_scope_versions
      WHERE organization_id = $1
      ORDER BY version DESC
      LIMIT 1`

/** Alcance vigente de la organización; `null` si nunca se fijó uno. Una versión sin reglas vuelve con `rules: []`. */
export const readSeoContentScope = async (organizationId: string, client?: Pick<PoolClient, 'query'>): Promise<SeoContentScopeV1 | null> => {
  const rows = client
    ? (await client.query<ScopeRow>(LATEST_SQL, [organizationId])).rows
    : await runGreenhousePostgresQuery<ScopeRow>(LATEST_SQL, [organizationId])

  return rows[0] ? mapRow(rows[0]) : null
}

export interface SetSeoContentScopeInput {
  organizationId: string
  label: string
  /** Sin validar: el command valida y rechaza. Lista vacía = sitio completo. */
  rules: unknown
  /** Por qué cambia el alcance (queda en la versión). Mínimo 10 caracteres. */
  reason: string
  actor: { kind: string; userId: string | null }
}

export interface SetSeoContentScopeResult {
  scope: SeoContentScopeV1
  /** `false` cuando las reglas y la etiqueta ya eran las vigentes: no se escribió nada. */
  changed: boolean
  previous: SeoContentScopeV1 | null
}

export const setSeoContentScope = async (input: SetSeoContentScopeInput): Promise<SetSeoContentScopeResult> => {
  const errors: string[] = []
  const label = typeof input.label === 'string' ? input.label.trim() : ''
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  const parsed = parseSeoContentScopeRules(input.rules)

  if (!input.organizationId) errors.push('Falta la organización.')
  if (label.length === 0) errors.push('Falta la etiqueta del alcance.')
  if (label.length > SEO_CONTENT_SCOPE_MAX_LABEL_LENGTH) errors.push(`La etiqueta supera ${SEO_CONTENT_SCOPE_MAX_LABEL_LENGTH} caracteres.`)
  // La etiqueta se imprime en «Qué mide este informe», que no admite cifras (el validador del plan las rechaza).
  if (/\d/.test(label)) errors.push('La etiqueta no lleva cifras: se imprime en el informe, donde esa línea no admite números.')
  if (reason.length < 10) errors.push('El motivo del cambio debe tener al menos 10 caracteres.')
  if (!input.actor?.kind) errors.push('Falta el actor del cambio.')
  if (!parsed.ok) errors.push(...parsed.errors)

  if (errors.length > 0 || !parsed.ok) throw new SeoContentScopeInputError(errors)

  const rules: SeoContentScopeRuleV1[] = parsed.rules

  return withGreenhousePostgresTransaction(async client => {
    // Un escritor por organización: sin el lock, dos cambios simultáneos calcularían la misma versión.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('greenhouse_growth.seo_content_scope'), hashtext($1::text))`, [input.organizationId])

    const organization = await client.query(`SELECT 1 FROM greenhouse_core.organizations WHERE organization_id = $1`, [input.organizationId])

    if (organization.rows.length === 0) throw new SeoContentScopeInputError([`La organización ${input.organizationId} no existe.`])

    const previous = await readSeoContentScope(input.organizationId, client)

    if (previous && contentScopeKey(previous.label, previous.rules) === contentScopeKey(label, rules)) {
      return { scope: previous, changed: false, previous }
    }

    // Sin alcance previo, pedir «sitio completo» tampoco escribe: ya se mide así.
    if (!previous && rules.length === 0) {
      return { scope: { organizationId: input.organizationId, version: 0, label, rules, createdAt: new Date().toISOString() }, changed: false, previous: null }
    }

    const inserted = await client.query<ScopeRow>(
      `INSERT INTO greenhouse_growth.seo_content_scope_versions
         (organization_id, version, label, rules_json, reason, created_by_actor_kind, created_by_user_id)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
       RETURNING organization_id, version, label, rules_json, created_at`,
      [input.organizationId, (previous?.version ?? 0) + 1, label, JSON.stringify(rules), reason, input.actor.kind, input.actor.userId]
    )

    return { scope: mapRow(inserted.rows[0]!), changed: true, previous }
  })
}
