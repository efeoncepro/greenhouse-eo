import 'server-only'

// TASK-770 — Core source-neutral de materialización de la faceta `member` para un hire de
// Hiring (sin identidad Azure). Hermano del cascade D-2 del SCIM
// (`src/lib/scim/provisioning-internal-collaborator.ts:resolveMemberIdCascade`, module-private
// y OID-shaped): espeja sus lanes aplicables y sus guards de drift, sin exigir `externalId`.
//
// Lanes (en orden):
//   1. por `identity_profile_id` — member existente sobre la MISMA persona → link/reactivar.
//   2. por email legacy (`primary_email` igual, `identity_profile_id` NULL) → backfill + link.
//   3. INSERT nuevo — espejo del INSERT del SCIM (#4): active=TRUE, assignable=TRUE,
//      status='active', workforce_intake_status='pending_intake'. El member queda
//      "operacionalmente no activado": el gate de payroll/capacity es el intake status
//      (PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED, invariante TASK-872), NO la columna active.
//
// Discoverability D-2 por construcción: el member nace con `identity_profile_id` poblado →
// cuando llegue Entra, la lane #1 del cascade SCIM lo encuentra y backfillea `azure_oid`
// sin duplicar (el dominio del incidente 2026-06-01).
//
// Drift → throw HiringActivationIdentityConflictError (NUNCA auto-merge; humano resuelve).
// Corre DENTRO de la tx del caller (recibe PoolClient) — mismo contrato dual-mode TASK-872.

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { syncOperatingEntityMembershipForMember } from '@/lib/account-360/operating-entity-membership'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { HiringActivationIdentityConflictError } from './errors'
import type { MaterializeMemberInput, MaterializeMemberResult } from './types'

interface MemberRow {
  member_id: string
  identity_profile_id: string | null
  azure_oid: string | null
  active: boolean
  workforce_intake_status: string
  primary_email: string | null
}

const MEMBER_LOOKUP_COLUMNS =
  'member_id, identity_profile_id, azure_oid, active, workforce_intake_status, primary_email'

/**
 * Resuelve o crea la faceta member para una persona (identity_profile) seleccionada por
 * Hiring. Idempotente: re-invocar con la misma persona retorna el mismo member.
 */
export const resolveOrCreateMemberForIdentityProfile = async (
  client: PoolClient,
  input: MaterializeMemberInput,
): Promise<MaterializeMemberResult> => {
  const profileId = input.identityProfileId.trim()

  if (!profileId) {
    throw new HiringActivationIdentityConflictError(
      'ambiguous_identity',
      'La persona del handoff no tiene perfil de identidad.',
    )
  }

  // ── Lane 1: member existente sobre la misma persona ──
  const byProfile = await client.query<MemberRow>(
    `SELECT ${MEMBER_LOOKUP_COLUMNS}
       FROM greenhouse_core.members
      WHERE identity_profile_id = $1
      ORDER BY created_at ASC
      LIMIT 2`,
    [profileId],
  )

  if (byProfile.rows.length > 1) {
    // Más de un member sobre la misma persona = anomalía de identidad — nunca elegir uno.
    throw new HiringActivationIdentityConflictError(
      'ambiguous_identity',
      'La persona tiene más de una faceta de colaborador. Pide a People Ops resolver la identidad.',
      { memberIds: byProfile.rows.map((row) => row.member_id) },
    )
  }

  const existing = byProfile.rows[0] ?? null

  if (existing) {
    if (existing.active && existing.workforce_intake_status === 'completed') {
      // Ya es colaborador activo — un internal_hire sobre alguien activo es un conflicto
      // (el destino correcto habría sido internal_reassignment). Humano resuelve.
      throw new HiringActivationIdentityConflictError(
        'member_already_active',
        'La persona ya es colaborador activo. Revisa si el destino correcto era una reasignación interna.',
        { memberId: existing.member_id },
      )
    }

    if (!existing.active) {
      // Re-hire de un ex-colaborador: reactivar espejo de la lane SCIM
      // `reactivated_via_oid_reuse` — vuelve a pending_intake (re-pasa por intake completo).
      await client.query(
        `UPDATE greenhouse_core.members
         SET active = TRUE,
             workforce_intake_status = 'pending_intake',
             hire_date = COALESCE($2::date, hire_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE member_id = $1`,
        [existing.member_id, input.hireDate],
      )

      await syncOperatingEntityMembershipForMember(existing.member_id, { client })

      return { memberId: existing.member_id, outcome: 'reactivated' }
    }

    // Activo pero pending_intake/in_review: reintento del bridge o SCIM llegó primero → link.
    return { memberId: existing.member_id, outcome: 'linked_existing' }
  }

  // ── Lane 2: email legacy sin profile (espejo del cascade #3 del SCIM) ──
  if (input.primaryEmail) {
    const byEmail = await client.query<MemberRow>(
      `SELECT ${MEMBER_LOOKUP_COLUMNS}
         FROM greenhouse_core.members
        WHERE lower(primary_email) = lower($1)
        LIMIT 2`,
      [input.primaryEmail],
    )

    if (byEmail.rows.length > 1) {
      throw new HiringActivationIdentityConflictError(
        'ambiguous_identity',
        'Hay más de un colaborador con el mismo correo. Pide a People Ops resolver la identidad.',
        { memberIds: byEmail.rows.map((row) => row.member_id) },
      )
    }

    const emailMatch = byEmail.rows[0] ?? null

    if (emailMatch) {
      if (emailMatch.identity_profile_id && emailMatch.identity_profile_id !== profileId) {
        // Mismo correo, OTRA persona canónica — drift (espejo email_profile_mismatch). Nunca merge.
        throw new HiringActivationIdentityConflictError(
          'member_conflict',
          'El correo del candidato pertenece a otra persona registrada. Pide a People Ops revisar antes de continuar.',
          { memberId: emailMatch.member_id, memberProfileId: emailMatch.identity_profile_id },
        )
      }

      if (!emailMatch.identity_profile_id) {
        // Member legacy sin profile → backfill del anchor de identidad + link.
        await client.query(
          `UPDATE greenhouse_core.members
           SET identity_profile_id = $2, updated_at = CURRENT_TIMESTAMP
           WHERE member_id = $1`,
          [emailMatch.member_id, profileId],
        )

        return { memberId: emailMatch.member_id, outcome: 'linked_existing' }
      }
    }
  }

  // ── Lane 3: INSERT nuevo (espejo del INSERT #4 del SCIM, sin azure_oid) ──
  const memberId = randomUUID()

  await client.query(
    `INSERT INTO greenhouse_core.members (
       member_id, display_name, primary_email, identity_profile_id,
       role_title, role_title_source, role_title_updated_at,
       hire_date, active, assignable, status, workforce_intake_status,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4,
       $5::text, CASE WHEN $5::text IS NOT NULL THEN 'hr_manual' ELSE 'unset' END,
       CASE WHEN $5::text IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END,
       $6::date, TRUE, TRUE, 'active', 'pending_intake',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     )`,
    [memberId, input.displayName, input.primaryEmail, profileId, input.roleTitle, input.hireDate],
  )

  // Membership sobre la operating entity (mismo paso del primitive SCIM; dual-mode en tx).
  await syncOperatingEntityMembershipForMember(memberId, { client })

  // member.created dispara el checklist de onboarding vía hr_onboarding_auto_create.
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.member,
      aggregateId: memberId,
      eventType: EVENT_TYPES.memberCreated,
      payload: {
        memberId,
        identityProfileId: profileId,
        displayName: input.displayName,
        primaryEmail: input.primaryEmail,
        provisionedBy: 'hiring_activation',
        workforceIntakeStatus: 'pending_intake',
      },
    },
    client,
  )

  return { memberId, outcome: 'created_new' }
}
