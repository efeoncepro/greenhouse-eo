/**
 * TASK-1229 — Growth Forms engine: readers canónicos (read path gobernado).
 *
 * El render_contract público sale de acá ya acotado a browser-safe (sin mapping,
 * GUIDs, property names ni secretos). Los listados admin alimentan el cockpit
 * (TASK-1232), Nexa/MCP y CLI sobre el mismo primitive.
 */
import 'server-only'

import type { RenderContract } from './contracts'
import { compileFormVersion } from './policy-compiler'
import {
  type FormDestinationAttemptRow,
  getFormDefinitionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  listAttemptsForSubmission,
  listDestinationsForVersion,
  listFormDefinitions,
  listHostSurfaces,
  listSubmissions,
  listVersionsForForm,
  getSubmissionById,
} from './store'

export interface GetRenderContractOptions {
  surfaceId?: string | null
  origin?: string | null
}

/**
 * Render contract público de la versión publicada de un slug. Aplica la surface
 * policy (origins permitidos) cuando se pasa una surface. Devuelve null si no hay
 * versión publicable o la surface no está autorizada.
 */
export const getPublishedRenderContract = async (
  slug: string,
  options: GetRenderContractOptions = {},
): Promise<RenderContract | null> => {
  const version = await getPublishedVersionBySlug(slug)

  if (!version) return null
  const definition = await getFormDefinitionById(version.form_id)

  if (!definition || definition.status !== 'active') return null

  const destinations = await listDestinationsForVersion(version.form_version_id)
  const compiled = compileFormVersion(definition, version, destinations, { forPublication: false })

  if (!compiled.renderContract) return null

  const contract = compiled.renderContract

  if (options.surfaceId) {
    const surface = await getHostSurfaceById(options.surfaceId)

    if (!surface || surface.status !== 'active') return null
    const allowedSlugs = surface.allowed_form_slugs_json

    if (Array.isArray(allowedSlugs) && allowedSlugs.length > 0 && !allowedSlugs.includes(slug)) return null
    const origins = Array.isArray(surface.origin_allowlist_json) ? (surface.origin_allowlist_json as string[]) : []

    contract.surfacePolicy = { surfaceId: surface.surface_id, allowedOrigins: origins, rendererChannel: surface.renderer_channel as RenderContract['surfacePolicy']['rendererChannel'] }
  }

  return contract
}

// ─── Admin readers ────────────────────────────────────────────────────────────

export interface FormSummaryVm {
  formId: string
  slug: string
  name: string
  formKind: string
  riskProfile: string
  status: string
  latestVersion: number | null
  latestVersionStatus: string | null
}

export const listFormsAdmin = async (): Promise<FormSummaryVm[]> => {
  const definitions = await listFormDefinitions()
  const summaries: FormSummaryVm[] = []

  for (const def of definitions) {
    const versions = await listVersionsForForm(def.form_id)
    const latest = versions[0] ?? null

    summaries.push({
      formId: def.form_id,
      slug: def.slug,
      name: def.name,
      formKind: def.form_kind,
      riskProfile: def.risk_profile,
      status: def.status,
      latestVersion: latest?.version ?? null,
      latestVersionStatus: latest?.status ?? null,
    })
  }

  
return summaries
}

export const getFormDetailAdmin = async (formId: string) => {
  const definition = await getFormDefinitionById(formId)

  if (!definition) return null
  const versions = await listVersionsForForm(formId)
  const destinationsByVersion: Record<string, Awaited<ReturnType<typeof listDestinationsForVersion>>> = {}

  for (const v of versions) {
    destinationsByVersion[v.form_version_id] = await listDestinationsForVersion(v.form_version_id)
  }

  
return { definition, versions, destinationsByVersion }
}

export interface SubmissionSummaryVm {
  submissionId: string
  formId: string
  status: string
  surfaceId: string | null
  rejectionReasonClass: string | null
  createdAt: Date
}

export const listSubmissionsAdmin = async (opts: { formId?: string; limit?: number } = {}): Promise<SubmissionSummaryVm[]> => {
  const rows = await listSubmissions(opts)

  
return rows.map(r => ({
    submissionId: r.submission_id,
    formId: r.form_id,
    status: r.status,
    surfaceId: r.surface_id,
    rejectionReasonClass: r.rejection_reason_class,
    createdAt: r.created_at,
  }))
}

export interface SubmissionDeliveryVm {
  submissionId: string
  status: string
  attempts: Array<Pick<FormDestinationAttemptRow, 'attempt_id' | 'destination_id' | 'provider' | 'status' | 'error_class' | 'retry_count' | 'created_at'>>
}

export const getSubmissionDeliveryStateAdmin = async (submissionId: string): Promise<SubmissionDeliveryVm | null> => {
  const submission = await getSubmissionById(submissionId)

  if (!submission) return null
  const attempts = await listAttemptsForSubmission(submissionId)

  
return {
    submissionId: submission.submission_id,
    status: submission.status,
    attempts: attempts.map(a => ({
      attempt_id: a.attempt_id,
      destination_id: a.destination_id,
      provider: a.provider,
      status: a.status,
      error_class: a.error_class,
      retry_count: a.retry_count,
      created_at: a.created_at,
    })),
  }
}

export const listHostSurfacesAdmin = listHostSurfaces
