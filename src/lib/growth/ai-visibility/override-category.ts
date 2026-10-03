import 'server-only'

/**
 * TASK-1962 — Growth AI Visibility · Corrección de la categoría de un perfil (gobernado), espejo de
 * `overrideProfileBusinessModel` (TASK-1289).
 *
 * El operador corrige el nodo de la taxonomía canónica de un perfil cuando la clasificación automática se equivocó
 * (caso fuente: Berel clasificado como «Manufactura»; el paquete genérico preguntaba por empresas de manufactura y los
 * motores respondían sobre empleo). La categoría alimenta `{{category}}` de los paquetes de preguntas y la lectura de
 * dominio de categoría: reencuadra todo análisis futuro de la org, por eso capability dedicada + historial append-only.
 *
 * Invariantes:
 *  - Write self-guarda con `can()` (profileId arbitrario).
 *  - El nodo existe en la taxonomía canónica y está `active`; nunca texto libre.
 *  - Override = autoritativo: fuente `operator_override`, confianza 1.0.
 *  - No-op real: mismo nodo ya como override → sin historial ni outbox.
 *  - Perfil + historial + outbox en una transacción.
 */

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { CATEGORY_TAXONOMY_VERSION, getCategoryTaxonomyNode } from './taxonomy'
import { OPERATOR_OVERRIDE_CONFIDENCE } from './override-business-model'

export class OverrideCategoryError extends Error {
  readonly code: 'forbidden' | 'invalid_category' | 'profile_not_found'

  constructor(code: 'forbidden' | 'invalid_category' | 'profile_not_found', message: string) {
    super(message)
    this.name = 'OverrideCategoryError'
    this.code = code
  }
}

export interface OverrideProfileCategoryInput {
  subject: TenantEntitlementSubject
  profileId: string
  /** Nodo de la taxonomía canónica (`sector:paints_coatings`, `industry:retail`…). */
  categoryNodeId: string
  updatedBy: string
  reason?: string | null
}

export interface OverrideProfileCategoryResult {
  changed: boolean
  categoryNodeId: string
  categoryLabel: string
  source: 'operator_override'
}

type ProfileLockRow = {
  profile_id: string
  organization_id: string | null
  category_node_id: string | null
  category_label: string | null
  category_source: string | null
}

export const overrideProfileCategory = async (input: OverrideProfileCategoryInput): Promise<OverrideProfileCategoryResult> => {
  if (!can(input.subject, 'growth.ai_visibility.profile.set_category', 'execute', 'tenant')) {
    throw new OverrideCategoryError('forbidden', 'No tienes acceso para corregir la categoría del perfil AEO.')
  }

  const node = getCategoryTaxonomyNode(input.categoryNodeId)

  if (!node || node.status !== 'active') {
    throw new OverrideCategoryError('invalid_category', 'La categoría indicada no existe en la taxonomía.')
  }

  const label = node.label.es
  const reason = input.reason?.trim() ? input.reason.trim() : null

  return withGreenhousePostgresTransaction(async client => {
    const currentResult = await client.query<ProfileLockRow>(
      `SELECT profile_id, organization_id, category_node_id, category_label, category_source
         FROM greenhouse_growth.grader_profiles
        WHERE profile_id = $1
        FOR UPDATE`,
      [input.profileId]
    )

    const current = currentResult.rows[0]

    if (!current) throw new OverrideCategoryError('profile_not_found', 'El perfil AEO indicado no existe.')

    if (current.category_node_id === node.id && current.category_source === 'operator_override') {
      return { changed: false, categoryNodeId: node.id, categoryLabel: label, source: 'operator_override' }
    }

    await client.query(
      `UPDATE greenhouse_growth.grader_profiles
          SET category_node_id = $2,
              category_label = $3,
              category_source = 'operator_override',
              category_confidence = $4,
              updated_at = NOW()
        WHERE profile_id = $1`,
      [input.profileId, node.id, label, OPERATOR_OVERRIDE_CONFIDENCE]
    )

    await client.query(
      `INSERT INTO greenhouse_growth.grader_category_history
         (profile_id, organization_id, from_node_id, from_label, to_node_id, to_label, to_source, taxonomy_version, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'operator_override', $7, $8, $9)`,
      [input.profileId, current.organization_id, current.category_node_id, current.category_label, node.id, label, CATEGORY_TAXONOMY_VERSION, reason, input.updatedBy]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'growth_ai_visibility_category',
        aggregateId: input.profileId,
        eventType: 'growth.ai_visibility.category_overridden',
        payload: {
          schemaVersion: 1,
          profileId: input.profileId,
          organizationId: current.organization_id,
          fromCategoryNodeId: current.category_node_id,
          toCategoryNodeId: node.id,
          taxonomyVersion: CATEGORY_TAXONOMY_VERSION,
          updatedBy: input.updatedBy,
          reason
        }
      },
      client
    )

    return { changed: true, categoryNodeId: node.id, categoryLabel: label, source: 'operator_override' }
  })
}
