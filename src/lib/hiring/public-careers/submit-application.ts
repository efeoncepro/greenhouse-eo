import 'server-only'

import { createHash } from 'node:crypto'

import { createIdentityProfile } from '@/lib/account-360/organization-store'
import { createHiringApplication, reconcileCandidateFacet } from '@/lib/hiring/store'
import { resolvePublishedOpeningIdByPublicId } from '@/lib/hiring/publication'
import { isHiringError } from '@/lib/hiring/errors'

import {
  attachPublicCareersCvToApplication,
  attachScannedPublicCareersCvAssetToApplication,
  type ScannedPublicCareersCvAssetReference,
} from './cv-upload'
import type { NormalizedApplicationInput } from './schema'

export type SubmitApplicationOutcome = 'accepted' | 'not_open'

export interface SubmitApplicationResult {
  outcome: SubmitApplicationOutcome
  /** public_id de la application (solo presente en `accepted`; NUNCA revela dedupe/estado interno). */
  applicationPublicId: string | null
  /** application_id interno para trazabilidad server-side; nunca se retorna al browser. */
  applicationId: string | null
}

type SubmitPublicHiringApplicationOptions = {
  cvFile?: File | null
  cvAsset?: ScannedPublicCareersCvAssetReference | null
}

const getDuplicateApplicationId = (error: unknown): string | null => {
  if (!isHiringError(error) || error.code !== 'hiring_application_duplicate') return null

  const details = 'details' in error ? error.details : null

  if (!details || typeof details !== 'object') return null

  const applicationId = (details as { applicationId?: unknown }).applicationId

  return typeof applicationId === 'string' && applicationId ? applicationId : null
}

/**
 * TASK-1367 — Command canónico del apply público. propose→persist gobernado:
 * reconcile Person (email-first, idempotente) → candidate_facet (source=public_careers, consent
 * granted, links) → hiring_application (dedupe UNIQUE). Es MULTI-STEP IDEMPOTENTE (3 commits; ver
 * Delta de la spec): un retry reconcilia la misma Person/facet y el dedupe (409) se traduce a
 * `accepted` genérico (nunca revela "ya postulaste"). Efectos pesados (scoring/email/handoff) NO acá.
 *
 * `opening_id` interno se resuelve del `public_id` con el mismo gate de publicación; si el opening no
 * está abierto → `not_open` (el caller responde genérico).
 */
export const submitPublicHiringApplication = async (
  input: NormalizedApplicationInput,
  options: SubmitPublicHiringApplicationOptions = {},
): Promise<SubmitApplicationResult> => {
  const openingId = await resolvePublishedOpeningIdByPublicId(input.openingPublicId)

  if (!openingId) {
    return { outcome: 'not_open', applicationPublicId: null, applicationId: null }
  }

  // 1. Person (email-first reconcile; idempotente — devuelve el profile existente si el email ya existe).
  const identityProfileId = await createIdentityProfile({
    sourceSystem: 'public_careers',
    sourceObjectType: 'candidate',
    sourceObjectId: input.email,
    fullName: input.fullName,
    canonicalEmail: input.email,
  })

  // 2. candidate_facet (upsert por identity_profile_id; consent granted + attribution + links).
  const facet = await reconcileCandidateFacet(
    {
      identityProfileId,
      source: 'public_careers',
      consentStatus: 'granted',
      consentPolicyVersion: input.consentPolicyVersion ?? undefined,
      consentCapturedAt: new Date().toISOString(),
      sourceAttribution: 'public_careers',
      availability: input.availability ?? undefined,
      portfolioUrl: input.portfolioUrl ?? undefined,
      linkedinUrl: input.linkedinUrl ?? undefined,
    },
    null,
  )

  // 3. hiring_application (dedupe estructural UNIQUE(opening_id, identity_profile_id)).
  // Idempotency key para audit/traza; el enforcement real es el UNIQUE del store.
  const dedupeFingerprint = createHash('sha256').update(`${openingId}|${input.email}`).digest('hex')

  const attachCv = async (applicationId: string) => {
    if (options.cvAsset) {
      await attachScannedPublicCareersCvAssetToApplication({
        asset: options.cvAsset,
        applicationId,
        openingId,
        openingPublicId: input.openingPublicId,
        identityProfileId,
        candidateFacetId: facet.candidateFacetId,
      })

      return
    }

    if (!options.cvFile) return

    await attachPublicCareersCvToApplication({
      file: options.cvFile,
      applicationId,
      openingId,
      openingPublicId: input.openingPublicId,
      identityProfileId,
      candidateFacetId: facet.candidateFacetId,
    })
  }

  try {
    const application = await createHiringApplication(
      {
        openingId,
        identityProfileId,
        candidateFacetId: facet.candidateFacetId,
        source: 'public_careers',
        dedupeFingerprint,
      },
      null,
    )

    await attachCv(application.applicationId)

    return { outcome: 'accepted', applicationPublicId: application.publicId, applicationId: application.applicationId }
  } catch (error) {
    // Duplicado → MISMO success genérico (nunca revela "ya postulaste"). Otros errores propagan.
    if (isHiringError(error) && error.code === 'hiring_application_duplicate') {
      const applicationId = getDuplicateApplicationId(error)

      if (applicationId) {
        await attachCv(applicationId)
      }

      return { outcome: 'accepted', applicationPublicId: null, applicationId }
    }

    throw error
  }
}
