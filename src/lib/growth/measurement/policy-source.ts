import 'server-only'

import { createHash } from 'node:crypto'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { getFormDefinitionByKey, getPublishedVersionBySlug, getHostSurfaceById } from '@/lib/growth/forms/store'
import { getMeetingSurfaceAuthority } from '@/lib/growth/meetings/store'

import { MEASUREMENT_ORIGINS, type MeasurementPolicyScope, type MeasurementPolicySource } from './policy-contract'

const keyPattern = /^[A-Za-z][A-Za-z0-9_]{0,79}$/
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

export const matchingFieldCatalog = (fields: unknown, validation: unknown): MeasurementPolicySource['fields'] => {
  const result: MeasurementPolicySource['fields'] = []

  for (const item of Array.isArray(fields) ? fields : []) {
    const f = record(item)

    if (typeof f.key === 'string' && keyPattern.test(f.key) && ['email','tel','text'].includes(String(f.type))) {
      // Matching phone must have an explicitly international normalizer, not a generic text field.
      if (f.type === 'tel' && f.validator !== 'e164_phone') continue
      result.push({ key: f.key, type: f.type as 'email'|'tel'|'text' })
    }
  }

  const name = record(record(validation).namePolicy)

  if (name.mode === 'split_full_name' && result.some(f => f.key === name.sourceField && f.type === 'text')) {
    for (const key of [name.firstNameField, name.lastNameField]) {
      if (typeof key === 'string' && keyPattern.test(key) && !result.some(f => f.key === key)) result.push({ key, type: 'text', derived: true })
    }
  }

  return result
}

export const resolveMeasurementSource = async (scope: MeasurementPolicyScope): Promise<MeasurementPolicySource | null> => {
  if (scope.sourceKind === 'meeting_booking') {
    const binding = await getMeetingSurfaceAuthority(scope.surfaceId, scope.sourceKey)

    if (!binding) return null
    const origins = MEASUREMENT_ORIGINS.filter(v => binding.origins.includes(v))
    const sourceVersion = createHash('sha256').update(JSON.stringify({ surface: binding.surfaceId, scheduler: binding.schedulerKey, origins: [...binding.origins].sort() })).digest('hex')

    return { scope, name: binding.schedulerKey, sourceVersion, origins,
      fields: [{key:'email',type:'email'},{key:'phone',type:'tel'},{key:'firstName',type:'text'},{key:'lastName',type:'text'}],
      blockingReasons: origins.length ? [] : ['origin_out_of_scope'] }
  }

  const [definition,surface] = await Promise.all([getFormDefinitionByKey(scope.sourceKey),getHostSurfaceById(scope.surfaceId)])

  if (!definition || !surface || surface.status !== 'active') return null
  const version = await getPublishedVersionBySlug(definition.slug)
  const allowed = strings(surface.allowed_form_slugs_json)
  const origins = MEASUREMENT_ORIGINS.filter(v => strings(surface.origin_allowlist_json).includes(v))
  const reasons: string[] = []

  if (definition.status !== 'active' || !version) reasons.push('source_not_published')
  if (!['contact','lead_magnet','diagnostic_intake','quote_request'].includes(definition.form_kind) || definition.risk_profile === 'high') reasons.push('purpose_not_commercial')
  if (allowed.length && !allowed.includes(definition.slug)) reasons.push('surface_out_of_scope')
  if (!origins.length) reasons.push('origin_out_of_scope')

  return { scope, name: definition.name, sourceVersion: version?.form_version_id ?? '', origins,
    fields: matchingFieldCatalog(version?.field_schema_json, version?.validation_schema_json), blockingReasons: reasons }
}

export const listMeasurementSources = async (): Promise<MeasurementPolicySource[]> => {
  const db = await getDb()

  const pairs = await sql<{ source_kind: 'form_submission'|'meeting_booking'; source_key: string; surface_id: string }>`
    SELECT 'form_submission' AS source_kind, d.form_key::text AS source_key, s.surface_id
      FROM greenhouse_growth.form_definition d CROSS JOIN greenhouse_growth.form_host_surface s
      WHERE d.status='active' AND s.status='active'
      AND (s.allowed_form_slugs_json='[]'::jsonb OR s.allowed_form_slugs_json ? d.slug)
      AND s.origin_allowlist_json ?| ARRAY['https://efeoncepro.com','https://think.efeoncepro.com']
    UNION ALL
    SELECT 'meeting_booking', scheduler_key, surface_id FROM greenhouse_growth.meeting_surface_binding WHERE status='active'
  `.execute(db)

  const sources: MeasurementPolicySource[] = []

  // Bound parallel source reads to the shared pool instead of serial N+1 latency or unbounded fanout.
  for (let offset=0;offset<pairs.rows.length;offset+=4) {
    const batch=await Promise.all(pairs.rows.slice(offset,offset+4).map(pair=>resolveMeasurementSource({sourceKind:pair.source_kind,sourceKey:pair.source_key,surfaceId:pair.surface_id})))

    sources.push(...batch.filter((source):source is MeasurementPolicySource=>source!==null))
  }

  return sources
}
