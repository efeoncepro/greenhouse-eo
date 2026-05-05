import 'server-only'

import { query } from '@/lib/db'

import type { RoleTitleContext, RoleTitleResolution, RoleTitleSource } from './types'

/**
 * TASK-785 — Canonical role title resolver.
 *
 * Devuelve el cargo correcto para el contexto solicitado, sin que cada
 * consumer reinvente fallback. Single source of truth para "qué cargo
 * mostrar en X surface".
 *
 * Contexts:
 *   - 'internal_profile'  → cargo laboral Greenhouse (Persona 360, /my/profile, PeopleList).
 *                           Prefer members.role_title; fallback identity_profiles.job_title.
 *   - 'client_assignment' → cargo cliente-facing por asignacion (override > base).
 *   - 'payroll_document'  → cargo laboral efectivo al momento (sin override cliente).
 *                           Para finiquito/recibo. Snapshot al emit.
 *   - 'commercial_cost'   → cargo para cost basis. Prefer catalog (org_role_id) si existe;
 *                           text role_title como label.
 *   - 'staffing'          → cargo operacional para capacity/staffing (members.role_title +
 *                           role_category).
 *   - 'identity_admin'    → identity_profiles.job_title (Entra/Graph). Para admin/identity panel.
 *
 * Toda resolucion devuelve: value + source + sourceLabel + hasDriftWithEntra.
 */

interface MemberRow {
  member_id: string
  role_title: string | null
  role_title_source: string
  identity_job_title: string | null
  [key: string]: unknown
}

const SOURCE_LABEL: Record<RoleTitleSource | 'identity_profile', string> = {
  unset: 'Sin definir',
  entra: 'Microsoft Entra',
  hr_manual: 'HR Greenhouse',
  migration: 'Migracion',
  self_declared_pending: 'Auto-declarado',
  identity_profile: 'Microsoft Entra'
}

interface ResolveOptions {
  memberId: string
  context: RoleTitleContext
  /** Para client_assignment context. */
  assignmentId?: string
}

const isAssignedSource = (s: string): s is RoleTitleSource =>
  s === 'unset' ||
  s === 'entra' ||
  s === 'hr_manual' ||
  s === 'migration' ||
  s === 'self_declared_pending'

/**
 * Resolves role title for a given member + context. Returns null `value`
 * when no source has data — callers decide UI fallback.
 */
export const resolveRoleTitle = async (
  options: ResolveOptions
): Promise<RoleTitleResolution> => {
  const rows = await query<MemberRow>(
    `SELECT
       m.member_id,
       m.role_title,
       m.role_title_source,
       ip.job_title AS identity_job_title
     FROM greenhouse_core.members m
     LEFT JOIN greenhouse_core.identity_profiles ip
       ON ip.profile_id = m.identity_profile_id
     WHERE m.member_id = $1
     LIMIT 1`,
    [options.memberId]
  )

  const row = rows[0]

  if (!row) {
    return {
      value: null,
      source: 'unset',
      sourceLabel: SOURCE_LABEL.unset,
      hasDriftWithEntra: false
    }
  }

  const memberRoleTitle = row.role_title
  const memberSource = isAssignedSource(row.role_title_source) ? row.role_title_source : 'unset'
  const identityJobTitle = row.identity_job_title

  const computeDrift = (): boolean =>
    memberRoleTitle !== null &&
    identityJobTitle !== null &&
    memberRoleTitle !== identityJobTitle &&
    memberSource === 'hr_manual'

  switch (options.context) {
    case 'internal_profile':
    case 'staffing':
    case 'payroll_document':

    case 'commercial_cost': {
      // Prefer members.role_title (HR-managed). Fallback to identity_profiles.job_title.
      if (memberRoleTitle !== null) {
        return {
          value: memberRoleTitle,
          source: memberSource,
          sourceLabel: SOURCE_LABEL[memberSource],
          hasDriftWithEntra: computeDrift()
        }
      }

      if (identityJobTitle !== null) {
        return {
          value: identityJobTitle,
          source: 'entra',
          sourceLabel: SOURCE_LABEL.identity_profile,
          hasDriftWithEntra: false
        }
      }

      return {
        value: null,
        source: 'unset',
        sourceLabel: SOURCE_LABEL.unset,
        hasDriftWithEntra: false
      }
    }

    case 'client_assignment': {
      if (!options.assignmentId) {
        // Fallback to base role title.
        return resolveRoleTitle({ memberId: options.memberId, context: 'internal_profile' })
      }

      const assignmentRows = await query<{ role_title_override: string | null; [key: string]: unknown }>(
        `SELECT role_title_override
           FROM greenhouse_core.client_team_assignments
          WHERE client_team_assignment_id = $1
          LIMIT 1`,
        [options.assignmentId]
      )

      const override = assignmentRows[0]?.role_title_override

      if (override) {
        return {
          value: override,
          source: 'hr_manual',
          sourceLabel: 'Override por asignacion',
          hasDriftWithEntra: false,
          assignmentOverride: override
        }
      }

      // Fallback to base role title.
      const base = await resolveRoleTitle({
        memberId: options.memberId,
        context: 'internal_profile'
      })

      return { ...base, assignmentOverride: null }
    }

    case 'identity_admin': {
      // Entra/Graph value. Used in Admin/identity panel.
      return {
        value: identityJobTitle,
        source: 'entra',
        sourceLabel: SOURCE_LABEL.identity_profile,
        hasDriftWithEntra: computeDrift()
      }
    }

    default: {
      const _exhaustive: never = options.context

      void _exhaustive

      return {
        value: null,
        source: 'unset',
        sourceLabel: SOURCE_LABEL.unset,
        hasDriftWithEntra: false
      }
    }
  }
}
