import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createHiringOpening, createTalentDemand, updateHiringOpening } from '@/lib/hiring/store'
import { publishOpening } from '@/lib/hiring/publication'
import { editorialOpeningFixture } from '@/lib/hiring/public-careers/editorial-opening.fixture'
import { parsePublicHiringApplication } from '@/lib/hiring/public-careers/schema'
import { submitPublicHiringApplication } from '@/lib/hiring/public-careers/submit-application'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1736 Slice 4 — CANARY del runbook `docs/operations/runbooks/candidate-identity-rollout.md`
 * (Paso 2) ejecutado como live test gobernado en vez de una postulación por HTTP.
 *
 * Por qué NO se postula contra una vacante real: dev/staging/producción comparten UNA instancia de
 * Cloud SQL y el ops-worker que emite los correos del ciclo (`HIRING_LIFECYCLE_EMAILS_ENABLED`) es
 * el MISMO para staging y producción. Un canary por el endpoint público contra `EO-OPN-0009` /
 * `EO-OPN-0061` metería un candidato falso en el pipeline real de una vacante con candidatos en
 * proceso y dispararía el aviso interno a People. Este test ejercita el MISMO command canónico
 * (`submitPublicHiringApplication` — la única puerta que comparten las dos entradas públicas:
 * Careers custom y Growth Forms nativo, por lo que la paridad de entradas se cubre por
 * construcción) contra la MISMA base, sobre una vacante desechable propia, y limpia sus eventos de
 * outbox de inmediato para que ningún correo salga.
 *
 * Cubre los 5 puntos del Paso 2: evidencia con raw intacto, reconciliación de display, audit,
 * identidad preexistente con otro casing (sin duplicar Person) e idempotencia por digest.
 *
 * Sujeto: identidad SINTÉTICA con dominio `.invalid` (ISSUE-159: un fixture jamás ancla en una
 * persona real).
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * OPT-IN OBLIGATORIO (`HIRING_CANARY_T1736=1`). No es paranoia de estilo: con el flag ON este
 * canary escribe filas en dos tablas APPEND-ONLY POR GRANT (`candidate_identity_intake_evidence`
 * y `candidate_identity_display_audit`), sobre las que `greenhouse_runtime` NO tiene DELETE por
 * diseño. Esas filas quedan pinneando por FK toda la cadena — application → facet → Person →
 * opening → demand — así que el test NO PUEDE limpiarse a sí mismo: su residuo sólo lo retira el
 * perfil `ops` en un acto humano. Correrlo por inercia ensucia la base COMPARTIDA con producción.
 */
const canaryOptIn = process.env.HIRING_CANARY_T1736 === '1'
const canaryEnabled = hasPgConfig && canaryOptIn

const CANARY_FIRST_NAME = 'canario'
const CANARY_LAST_NAME = 'sintetico'
const CANARY_SUBMITTED_FULL_NAME = `${CANARY_FIRST_NAME} ${CANARY_LAST_NAME}`
const CANARY_PROPOSED_FULL_NAME = 'Canario Sintetico'

type EvidenceRow = {
  evidence_id: string
  application_id: string
  identity_profile_id: string
  submitted_full_name: string
  normalized_structural: string
  casing_classification: string
  proposed_display_name: string | null
  input_digest: string
  normalization_version: string
}

type AuditRow = {
  audit_id: string
  source: string
  outcome: string
  before_full_name: string | null
  after_full_name: string | null
  created_at: string
}

describe.skipIf(!canaryEnabled)('CANARY TASK-1736 — identidad del intake contra PG real', () => {
  const email = `canary-t1736-${Date.now()}@live-test.invalid`

  const state: {
    demandId?: string
    openingId?: string
    openingPublicId?: string
    profileId?: string
    facetId?: string
    appIds: string[]
  } = { appIds: [] }

  /** Lo que el teardown no pudo borrar. Se reporta fuerte al final; jamás se traga. */
  const residue: string[] = []

  /** Borra los eventos de outbox del sujeto ANTES de que el publisher (cada 2 min) los tome. */
  const purgeOutbox = async (): Promise<void> => {
    const ids = [state.demandId, state.openingId, state.facetId, state.profileId, ...state.appIds].filter(
      Boolean
    ) as string[]

    if (!ids.length) return

    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = ANY($1::text[])`,
      [ids]
    ).catch(() => undefined)
  }

  const readEvidence = async (): Promise<EvidenceRow[]> =>
    runGreenhousePostgresQuery<EvidenceRow>(
      `SELECT evidence_id, application_id, identity_profile_id, submitted_full_name, normalized_structural,
              casing_classification, proposed_display_name, input_digest, normalization_version
         FROM greenhouse_hiring.candidate_identity_intake_evidence
        WHERE identity_profile_id = $1
        ORDER BY created_at ASC`,
      [state.profileId]
    )

  const readAudit = async (): Promise<AuditRow[]> =>
    runGreenhousePostgresQuery<AuditRow>(
      `SELECT audit_id, source, outcome, before_full_name, after_full_name, created_at::text AS created_at
         FROM greenhouse_hiring.candidate_identity_display_audit
        WHERE identity_profile_id = $1
        ORDER BY created_at ASC`,
      [state.profileId]
    )

  const readDisplayName = async (): Promise<string | null> => {
    const rows = await runGreenhousePostgresQuery<{ full_name: string | null }>(
      `SELECT full_name FROM greenhouse_core.identity_profiles WHERE profile_id = $1`,
      [state.profileId]
    )

    return rows[0]?.full_name ?? null
  }

  const submit = async (firstName: string, lastName: string) => {
    const parsed = parsePublicHiringApplication({
      openingPublicId: state.openingPublicId,
      firstName,
      lastName,
      email,
      residenceCountryCode: 'CL',
      consent: true
    })

    expect(parsed).not.toBeNull()

    const result = await submitPublicHiringApplication(parsed!)

    if (result.applicationId && !state.appIds.includes(result.applicationId)) {
      state.appIds.push(result.applicationId)
    }

    // Resolver el sujeto real para poder purgar el outbox por aggregate_id.
    if (!state.profileId) {
      const rows = await runGreenhousePostgresQuery<{ profile_id: string; candidate_facet_id: string | null }>(
        `SELECT p.profile_id, f.candidate_facet_id
           FROM greenhouse_core.identity_profiles p
           LEFT JOIN greenhouse_hiring.candidate_facet f ON f.identity_profile_id = p.profile_id
          WHERE p.canonical_email = $1`,
        [email]
      )

      state.profileId = rows[0]?.profile_id
      state.facetId = rows[0]?.candidate_facet_id ?? undefined
    }

    await purgeOutbox()

    return result
  }

  beforeAll(() => {
    // El flag es Vercel-only en runtime; acá se prende en proceso para ejercitar el write path.
    process.env.HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED = 'true'
  })

  afterAll(async () => {
    if (!canaryEnabled) return

    await purgeOutbox()

    // Lo PRIMERO y lo único garantizado: sacar la vacante sintética del aire. Si el resto del
    // teardown falla, esto ya evitó que un canary quede publicado en careers.
    if (state.openingId) {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_hiring.hiring_opening
            SET published_at = NULL, visibility = 'internal_only'
          WHERE opening_id = $1`,
        [state.openingId]
      ).catch(error => residue.push(`unpublish opening: ${(error as Error).message}`))
    }

    // El resto se intenta en orden FK y se REPORTA. Nada de `.catch(() => undefined)`: fue
    // exactamente ese swallow el que ocultó que la limpieza no había corrido (2026-08-18).
    const tryDelete = async (label: string, sql: string, params: unknown[]): Promise<void> => {
      try {
        await runGreenhousePostgresQuery(sql, params)
      } catch (error) {
        residue.push(`${label}: ${(error as Error).message}`)
      }
    }

    if (state.profileId) {
      await tryDelete(
        'evidence',
        `DELETE FROM greenhouse_hiring.candidate_identity_intake_evidence WHERE identity_profile_id = $1`,
        [state.profileId]
      )
      await tryDelete(
        'audit',
        `DELETE FROM greenhouse_hiring.candidate_identity_display_audit WHERE identity_profile_id = $1`,
        [state.profileId]
      )
    }

    for (const id of state.appIds) {
      await tryDelete('application', `DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`, [
        id
      ])
    }

    if (state.facetId)
      await tryDelete('facet', `DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`, [
        state.facetId
      ])
    if (state.profileId)
      await tryDelete('profile', `DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [
        state.profileId
      ])
    if (state.openingId)
      await tryDelete('opening', `DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [
        state.openingId
      ])
    if (state.demandId)
      await tryDelete('demand', `DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [state.demandId])

    await purgeOutbox()

    if (residue.length) {
      // Ruidoso a propósito: el residuo vive en una base compartida con producción y su retiro
      // es un acto humano con el perfil `ops` (ver §Residuo del runbook de rollout).
      console.warn(
        [
          '[CANARY TASK-1736] RESIDUO NO PURGADO — requiere perfil `ops` (acto humano):',
          `  identity_profile_id: ${state.profileId ?? '(no resuelto)'}`,
          `  application_id(s):   ${state.appIds.join(', ') || '(ninguna)'}`,
          `  opening_id:          ${state.openingId ?? '(ninguno)'} (despublicado)`,
          `  demand_id:           ${state.demandId ?? '(ninguno)'}`,
          ...residue.map(line => `  ! ${line}`)
        ].join('\n')
      )
    }
  })

  it('setup: vacante desechable propia (nunca una vacante real) publicada', async () => {
    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'capacity_gap',
        requestedRole: 'CANARY T1736 (sintética)'
      },
      'user-live-test'
    )

    state.demandId = demand.demandId

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: 'CANARY T1736 interna' },
      'user-live-test'
    )

    state.openingId = opening.openingId

    await updateHiringOpening(
      opening.openingId,
      {
        publicTitle: 'CANARY T1736 (no postular)',
        publicSummary: 'Vacante sintética de canary; se elimina al terminar el test.',
        publicDescription: 'Vacante sintética creada por el canary de TASK-1736. No es una vacante real.',
        publicArea: 'Growth',
        publicSeniority: 'Semi-senior',
        publicWorkMode: 'remote',
        publicHiringRegion: 'Chile',
        publicSkillTags: ['canary'],
        publicContent: editorialOpeningFixture.content,
        publicRemoteEligibleCountries: ['CL']
      },
      'user-live-test'
    )

    const published = await publishOpening(opening.openingId, 'user-live-test')

    state.openingPublicId = published.publicId
    expect(published.publishedAt).not.toBeNull()

    await purgeOutbox()
  })

  it('1+2+3 — evidencia con raw intacto, reconcile aplicado y audit escrito', async () => {
    const result = await submit(CANARY_FIRST_NAME, CANARY_LAST_NAME)

    expect(result.outcome).toBe('accepted')
    expect(state.profileId).toBeTruthy()

    // 1. Evidencia: el raw del postulante queda EXACTO; la propuesta es la capitalizada.
    const evidence = await readEvidence()

    expect(evidence).toHaveLength(1)
    expect(evidence[0].submitted_full_name).toBe(CANARY_SUBMITTED_FULL_NAME)
    expect(evidence[0].casing_classification).toBe('degenerate_lower')
    expect(evidence[0].proposed_display_name).toBe(CANARY_PROPOSED_FULL_NAME)
    expect(evidence[0].application_id).toBe(result.applicationId)

    // 2. Reconcile: la Person queda con el display propuesto, NO con el verbatim.
    expect(await readDisplayName()).toBe(CANARY_PROPOSED_FULL_NAME)

    // 3. Audit: la reconciliación dejó su fila.
    const audit = await readAudit()

    expect(audit).toHaveLength(1)
    expect(audit[0].source).toBe('reconcile')
    expect(audit[0].outcome).toBe('applied')
    expect(audit[0].after_full_name).toBe(CANARY_PROPOSED_FULL_NAME)
  })

  it('4 — mismo email con otro casing: no duplica Person y el audit registra el outcome del CAS', async () => {
    const profileIdBefore = state.profileId

    const result = await submit(CANARY_FIRST_NAME.toUpperCase(), CANARY_LAST_NAME.toUpperCase())

    expect(result.outcome).toBe('accepted')

    // No nace una Person paralela: el email reconcilia sobre la misma identidad.
    const profiles = await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE canonical_email = $1`,
      [email]
    )

    expect(profiles).toHaveLength(1)
    expect(profiles[0].profile_id).toBe(profileIdBefore)

    // La evidencia de ESTA submission se agrega (digest distinto), con su raw en MAYÚSCULAS.
    const evidence = await readEvidence()

    expect(evidence).toHaveLength(2)
    expect(evidence[1].submitted_full_name).toBe(CANARY_SUBMITTED_FULL_NAME.toUpperCase())
    expect(evidence[1].casing_classification).toBe('degenerate_upper')

    // El audit registra el outcome del CAS — jamás last-write-wins silencioso.
    const audit = await readAudit()

    expect(audit.length).toBeGreaterThanOrEqual(2)
    expect(['applied', 'skipped', 'needs_review']).toContain(audit[audit.length - 1].outcome)

    // El display vigente sigue siendo un nombre capitalizado, nunca el verbatim en mayúsculas.
    expect(await readDisplayName()).not.toBe(CANARY_SUBMITTED_FULL_NAME.toUpperCase())
  })

  it('5 — re-submit idéntico: cero filas nuevas de evidencia (dedupe por digest)', async () => {
    const before = await readEvidence()

    await submit(CANARY_FIRST_NAME, CANARY_LAST_NAME)

    const after = await readEvidence()

    expect(after).toHaveLength(before.length)
  })
})
