import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import {
  OPENING_ASSESSMENT_POLICY_MODES,
  OPENING_ASSESSMENT_TRIGGER_STAGES,
  type OpeningAssessmentPolicy,
  type OpeningAssessmentPolicyMode,
  type OpeningAssessmentTriggerStage,
} from '@/types/hiring-assessment-policy'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { resolveTemplateContentDigest } from './readers'
import {
  findActivePolicyForOpening,
  insertPolicy,
  insertPolicyEvent,
  lockPolicyForUpdate,
  markPolicyDisabled,
  markPolicyEnabled,
  updatePolicyConfig,
} from './store'

/**
 * TASK-1719 Slice 1 — Commands gobernados de la policy de assessment por vacante.
 *
 * ADR D5.1 (nacimiento seguro): **configurar NO es habilitar**. Toda policy nace `draft` +
 * `manual`; el flip a `enabled` exige la capability `hiring.assessment.policy.govern` (la
 * verifica el route handler), opening `published`, digest de contenido observado y audit.
 *
 * ADR D7: el trigger es la ETAPA. Ninguno de estos commands acepta score, match ni atributo
 * inferido como condición de disparo — romperlo exige una decisión nueva, no una excepción.
 */

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const assertMode = (value: unknown): OpeningAssessmentPolicyMode => {
  const mode = trimmed(value) || 'manual'

  if (!OPENING_ASSESSMENT_POLICY_MODES.includes(mode as OpeningAssessmentPolicyMode)) {
    throw new HiringValidationError(
      'El modo de la policy debe ser manual o on_stage_entry.',
      'assessment_policy_invalid_mode',
      400,
    )
  }

  return mode as OpeningAssessmentPolicyMode
}

const assertTriggerStage = (value: unknown): OpeningAssessmentTriggerStage | null => {
  const stage = trimmed(value)

  if (!stage) return null

  if (!OPENING_ASSESSMENT_TRIGGER_STAGES.includes(stage as OpeningAssessmentTriggerStage)) {
    throw new HiringValidationError(
      'La etapa trigger sólo puede ser shortlisted o interview.',
      'assessment_policy_invalid_trigger_stage',
      400,
    )
  }

  return stage as OpeningAssessmentTriggerStage
}

const assertTimeLimit = (value: unknown): number | null => {
  if (value == null || value === '') return null

  const minutes = Math.floor(Number(value))

  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 240) {
    throw new HiringValidationError(
      'El tiempo límite debe estar entre 5 y 240 minutos.',
      'assessment_policy_invalid_time_limit',
      400,
    )
  }

  return minutes
}

const assertBounded = (value: unknown, min: number, max: number, code: string, label: string): number | null => {
  if (value == null || value === '') return null

  const parsed = Math.floor(Number(value))

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new HiringValidationError(`${label} debe estar entre ${min} y ${max}.`, code, 400)
  }

  return parsed
}

/** El opening existe y está en un estado que admite declarar prueba. */
const loadOpening = async (
  client: PoolClient,
  openingId: string,
): Promise<{ openingId: string; publicationStatus: string; status: string }> => {
  const rows = await client.query(
    `SELECT opening_id, publication_status, status
     FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1 LIMIT 1`,
    [openingId],
  )

  const row = rows.rows[0] as { opening_id: string; publication_status: string; status: string } | undefined

  if (!row) throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')

  return { openingId: row.opening_id, publicationStatus: row.publication_status, status: row.status }
}

/** La plantilla existe y está `active`. Una plantilla archivada nunca entra a una policy. */
const assertTemplateActive = async (client: PoolClient, templateId: string): Promise<void> => {
  const rows = await client.query(
    `SELECT status FROM greenhouse_hiring.hiring_assessment_template WHERE template_id = $1 LIMIT 1`,
    [templateId],
  )

  const row = rows.rows[0] as { status: string } | undefined

  if (!row) {
    throw new HiringNotFoundError('La plantilla de evaluación no existe.', 'assessment_template_not_found')
  }

  if (row.status !== 'active') {
    throw new HiringValidationError(
      'La plantilla de evaluación no está activa.',
      'assessment_template_inactive',
      409,
    )
  }
}

export interface ConfigureOpeningAssessmentPolicyInput {
  openingId: string
  templateId: string
  mode?: OpeningAssessmentPolicyMode | string | null
  triggerStage?: OpeningAssessmentTriggerStage | string | null
  timeLimitMinutes?: number | null
  volumeCapPerWindow?: number | null
  volumeWindowMinutes?: number | null
}

/**
 * Crea o reconfigura la policy de un opening. SIEMPRE deja la policy en `draft`: reconfigurar
 * incrementa `policy_version` y borra el digest/habilitación previos, porque una habilitación
 * concedida sobre otra plantilla o etapa no puede heredarse en silencio.
 */
export const configureOpeningAssessmentPolicy = async (
  input: ConfigureOpeningAssessmentPolicyInput,
  actorUserId: string | null,
): Promise<OpeningAssessmentPolicy> => {
  const openingId = trimmed(input.openingId)
  const templateId = trimmed(input.templateId)

  if (!openingId || !templateId) {
    throw new HiringValidationError(
      'openingId y templateId son obligatorios.',
      'assessment_policy_field_required',
      400,
    )
  }

  const mode = assertMode(input.mode)
  const triggerStage = assertTriggerStage(input.triggerStage)
  const timeLimitMinutes = assertTimeLimit(input.timeLimitMinutes)

  const volumeCapPerWindow = assertBounded(
    input.volumeCapPerWindow,
    1,
    100,
    'assessment_policy_invalid_volume_cap',
    'El cap de volumen',
  )

  const volumeWindowMinutes = assertBounded(
    input.volumeWindowMinutes,
    5,
    1440,
    'assessment_policy_invalid_volume_window',
    'La ventana del cap de volumen',
  )

  if (mode === 'on_stage_entry' && !triggerStage) {
    throw new HiringValidationError(
      'Una policy automática debe declarar la etapa que la dispara.',
      'assessment_policy_trigger_stage_required',
      400,
    )
  }

  return withGreenhousePostgresTransaction(async (client) => {
    await loadOpening(client, openingId)
    await assertTemplateActive(client, templateId)

    const existing = await findActivePolicyForOpening(openingId, client)

    if (!existing) {
      // D5.1 al pie de la letra: toda policy NACE `draft` + `manual`. Que `state` empiece en
      // `draft` no alcanza — nacer ya en `on_stage_entry` deja la automatización a un solo flip
      // de distancia y convierte "configurar" en medio paso hacia "habilitar". Pasar a
      // automático es un acto deliberado y separado (reconfigurar, que además re-audita y
      // devuelve la policy a `draft`).
      if (mode !== 'manual') {
        throw new HiringValidationError(
          'La policy nace en modo manual: configúrala primero y luego cámbiala a automática.',
          'assessment_policy_must_be_born_manual',
          409,
        )
      }

      const { policy, created } = await insertPolicy(client, {
        openingId,
        templateId,
        mode,
        triggerStage,
        timeLimitMinutes,
        volumeCapPerWindow,
        volumeWindowMinutes,
        createdBy: actorUserId,
      })

      // Carrera: otra configuración concurrente ganó el slot. No es un error — devolvemos la
      // ganadora sin re-escribir historia (patrón `createScoringRun`).
      if (!created) return policy

      await insertPolicyEvent(client, {
        policyId: policy.policyId,
        policyVersion: policy.policyVersion,
        eventType: 'configured',
        fromState: null,
        toState: 'draft',
        actorUserId,
        detail: { templateId, mode, triggerStage, timeLimitMinutes },
      })

      return policy
    }

    const locked = await lockPolicyForUpdate(client, existing.policyId)

    const updated = await updatePolicyConfig(client, locked.policyId, {
      templateId,
      mode,
      triggerStage,
      timeLimitMinutes,
      volumeCapPerWindow,
      volumeWindowMinutes,
    })

    await insertPolicyEvent(client, {
      policyId: updated.policyId,
      policyVersion: updated.policyVersion,
      eventType: 'reconfigured',
      fromState: locked.state,
      toState: 'draft',
      actorUserId,
      detail: {
        templateId,
        mode,
        triggerStage,
        timeLimitMinutes,
        previousPolicyVersion: locked.policyVersion,
        previousTemplateId: locked.templateId,
      },
    })

    return updated
  })
}

/**
 * Habilita la policy. Gate duro (D5.1): opening `published` + plantilla activa + digest de
 * contenido observado en el momento del flip + audit. La capability
 * `hiring.assessment.policy.govern` la verifica el route handler antes de llegar acá.
 */
export const enableOpeningAssessmentPolicy = async (
  policyId: string,
  actorUserId: string | null,
): Promise<OpeningAssessmentPolicy> => {
  const id = trimmed(policyId)

  if (!id) {
    throw new HiringValidationError('policyId es obligatorio.', 'assessment_policy_field_required', 400)
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const policy = await lockPolicyForUpdate(client, id)

    if (policy.state === 'disabled') {
      throw new HiringValidationError(
        'La policy está deshabilitada: vuelve a configurarla antes de habilitarla.',
        'assessment_policy_disabled',
        409,
      )
    }

    if (policy.state === 'enabled') return policy // idempotente: habilitar dos veces no re-audita

    const opening = await loadOpening(client, policy.openingId)

    if (opening.publicationStatus !== 'published') {
      throw new HiringValidationError(
        'La vacante debe estar publicada antes de habilitar la asignación de su evaluación.',
        'assessment_policy_opening_not_published',
        409,
      )
    }

    await assertTemplateActive(client, policy.templateId)

    const content = await resolveTemplateContentDigest(policy.templateId, client)

    if (content.questionCount === 0) {
      throw new HiringValidationError(
        'La plantilla no resuelve ninguna pregunta activa: no se puede habilitar.',
        'assessment_policy_template_without_questions',
        409,
      )
    }

    const enabled = await markPolicyEnabled(client, policy.policyId, {
      templateContentDigest: content.digest,
      enabledBy: actorUserId,
    })

    await insertPolicyEvent(client, {
      policyId: enabled.policyId,
      policyVersion: enabled.policyVersion,
      eventType: 'enabled',
      fromState: policy.state,
      toState: 'enabled',
      actorUserId,
      detail: {
        mode: enabled.mode,
        triggerStage: enabled.triggerStage,
        templateContentDigest: content.digest,
        moduleCount: content.moduleCount,
        questionCount: content.questionCount,
        // Señal barata de D4: un módulo sin pregunta activa encoge la prueba en silencio.
        emptyModuleCount: content.emptyModuleCount,
      },
    })

    return enabled
  })
}

/**
 * Kill switch canónico (D6): dejar la policy `disabled` detiene la automatización sin tocar
 * el flag del worker y sin borrar nada. Los assessments ya creados se conservan.
 */
export const disableOpeningAssessmentPolicy = async (
  policyId: string,
  actorUserId: string | null,
  reasonCode: string | null = null,
): Promise<OpeningAssessmentPolicy> => {
  const id = trimmed(policyId)

  if (!id) {
    throw new HiringValidationError('policyId es obligatorio.', 'assessment_policy_field_required', 400)
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const policy = await lockPolicyForUpdate(client, id)

    if (policy.state === 'disabled') return policy // idempotente

    const disabled = await markPolicyDisabled(client, policy.policyId)

    await insertPolicyEvent(client, {
      policyId: disabled.policyId,
      policyVersion: disabled.policyVersion,
      eventType: 'disabled',
      fromState: policy.state,
      toState: 'disabled',
      reasonCode: reasonCode ? reasonCode.slice(0, 64) : null,
      actorUserId,
    })

    return disabled
  })
}
