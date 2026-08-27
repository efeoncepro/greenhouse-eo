import 'server-only'

import { z } from 'zod'

import { can } from '@/lib/entitlements/runtime'
import {
  confirmHiringApplicationDecision,
  proposeHiringApplicationDecision,
} from '@/lib/hiring'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { HIRING_DECISION_CAUSES, HIRING_DECISIONS } from '@/types/hiring'

import { isNexaHiringActionsEnabled } from '../flags'

import { NexaActionBlockedError } from './blocked-error'
import type {
  NexaActionContext,
  NexaActionDefinition,
  NexaActionExecutionResult,
  NexaActionPreviewResult,
} from './types'

/**
 * TASK-1773 — cerrar una postulación desde la Conversational Experience.
 *
 * Nexa NO es un camino paralelo al portal: es OTRO CONSUMER del mismo primitive. Delega en
 * `confirmHiringApplicationDecision`, que a su vez delega en `decideHiringApplication`. No hay ni una
 * regla de dominio acá — si la hubiera, sería una regla que la UI y la API no tendrían.
 *
 * 🔴 **Autoridad DELIBERADAMENTE más angosta que la del portal: Nexa sólo puede cerrar una postulación
 * que todavía NO tiene desenlace. Re-decidir es humano.**
 *
 * El porqué es mecánico, no filosófico. El guard de esta task es un digest del estado que `propose`
 * calcula y `confirm` revalida; pero el contrato de acciones de Nexa (`NexaActionPreviewResult` =
 * `{title, summary, metrics}`) **no puede cargar estado del preview al execute**, así que la huella no
 * sobrevive el viaje. Sin ella, una confirmación tardía podría pisar en silencio una decisión que otra
 * persona tomó entre medio — y el command permite re-decidir a propósito, porque un humano puede cambiar
 * de opinión.
 *
 * En vez de debilitar el guard o de tocar el contrato compartido de Nexa —que cargan otras seis
 * acciones—, la acción se niega a re-decidir. El caso peligroso queda imposible desde el agente y el
 * caso benigno queda cubierto: si alguien decide entre el preview y el confirm, el bloqueo de
 * `alreadyClosed` lo detecta al revalidar. Es el mismo resultado que habría dado la huella.
 *
 * 🔴 El cierre MASIVO por capacidad NO se federa (`TASK-1762`, 2026-08-23). Esta acción decide UNA
 * postulación; de una cohorte, un agente lee y explica, nunca dispara.
 */

const HIRING_DESK_DEEP_LINK = '/agency/hiring'

const hiringDecisionActionSchema = z.object({
  applicationId: z.string().trim().min(1),
  decision: z.enum(HIRING_DECISIONS as unknown as [string, ...string[]]),
  cause: z.enum(HIRING_DECISION_CAUSES as unknown as [string, ...string[]]).nullish(),
  reasonSummary: z.string().trim().min(1),
})

type HiringDecisionActionInput = z.infer<typeof hiringDecisionActionSchema>

const buildSubjectFromContext = (context: NexaActionContext): TenantEntitlementSubject => ({
  userId: context.userId,
  tenantType: context.tenantType,
  roleCodes: context.roleCodes,
  primaryRoleCode: context.roleCodes[0] ?? '',
  routeGroups: context.routeGroups,
  authorizedViews: [],
  memberId: context.memberId,
})

/** La capability real, la misma del portal y del lane `app`. No una paralela. */
const canDecide = (context: NexaActionContext): boolean =>
  context.tenantType === 'efeonce_internal' &&
  can(buildSubjectFromContext(context), 'hiring.application.decide', 'execute', 'tenant')

/** Prólogo compartido por preview y execute: propone y bloquea si ya hay desenlace. */
const proposeOrBlock = async (input: HiringDecisionActionInput) => {
  const proposal = await proposeHiringApplicationDecision({
    applicationId: input.applicationId,
    decision: input.decision as HiringDecisionActionInput['decision'] as never,
    cause: (input.cause ?? null) as never,
  })

  if (proposal.alreadyClosed) {
    throw new NexaActionBlockedError(
      'Esta postulación ya tiene un desenlace declarado. Cambiarlo es una decisión que se toma en el Hiring Desk, no desde el chat.',
      { deepLink: HIRING_DESK_DEEP_LINK },
    )
  }

  return proposal
}

export const decideHiringApplicationAction: NexaActionDefinition<HiringDecisionActionInput> = {
  actionKey: 'decide_hiring_application',
  intent: 'Cerrar una postulación declarando su desenlace',
  sensitivity: 'high',
  domain: 'hiring',
  requiredCapability: 'hiring.application.decide',
  inputSchema: hiringDecisionActionSchema,
  isEnabled: isNexaHiringActionsEnabled,
  isPermitted: canDecide,
  async buildPreview(_context, input): Promise<NexaActionPreviewResult> {
    const proposal = await proposeOrBlock(input)

    return {
      title: 'Cerrar postulación',
      summary:
        `Al confirmar, esta postulación queda cerrada con el desenlace “${input.decision}”` +
        `${input.cause ? ` y la causa “${input.cause}”` : ''}. El cierre es una decisión sobre una persona: ` +
        'queda en el historial con tu nombre y dispara la comunicación que corresponda.',
      metrics: [
        { label: 'Etapa actual', value: proposal.current.stage },
        { label: 'Desenlace propuesto', value: input.decision },
        { label: 'Causa', value: input.cause ?? 'Sin causa (sólo aplica a no seleccionado)' },
      ],
    }
  },
  async execute(context, input): Promise<NexaActionExecutionResult> {
    // Re-propone en el punto de mutación: si alguien decidió entre el preview y el confirm,
    // `alreadyClosed` bloquea acá. Es lo que reemplaza al digest en este carril.
    const proposal = await proposeOrBlock(input)

    const result = await confirmHiringApplicationDecision({
      applicationId: proposal.applicationId,
      effectDigest: proposal.effectDigest,
      input: {
        decision: input.decision as never,
        cause: (input.cause ?? null) as never,
        reason: { summary: input.reasonSummary },
        idempotencyKey: `nexa-${proposal.effectDigest}`,
      },
      actorUserId: context.userId,
    })

    return {
      ok: true,
      summary: result.idempotentReplay
        ? 'Esta postulación ya se había cerrado con esta misma decisión.'
        : `Postulación cerrada con el desenlace “${input.decision}”.`,
      metrics: [{ label: 'Desenlace', value: input.decision }],
    }
  },
  confirmation: {
    title: 'Confirmar el cierre de la postulación',
    body: 'Vas a cerrar esta postulación con el desenlace indicado. Queda en el historial con tu nombre y no se deshace desde el chat.',
    confirmLabel: 'Cerrar postulación',
    cancelLabel: 'Cancelar',
  },
  deepLinkFallback: HIRING_DESK_DEEP_LINK,
  // Ventana corta a propósito: es una decisión sobre una persona y el estado puede moverse.
  expirationSeconds: 300,
}
