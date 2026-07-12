import 'server-only'

/**
 * TASK-1399 — Las acciones gobernadas del Proposal Studio: el ciclo de una propuesta desde el chat.
 *
 *   register_proposal → attach_proposal_rfp → record_proposal_evidence → request_proposal_render
 *
 * Nexa NO es un camino paralelo al Studio: es OTRO CONSUMER del mismo primitive. Cada acción delega
 * en el command canónico (`createProposal`, `attachProposalAsset`, `recordProposalEvidence`,
 * `requestProposalRender`) y pasa por la MISMA puerta (`assertProposalStudioAccessForSubject`:
 * entitlement per-ORG + capability del actor). No hay una sola regla de dominio acá — si la hubiera,
 * sería una regla que la UI y la API no tendrían, y eso es lo que Full API Parity prohíbe.
 *
 * Dos cosas SÍ viven acá, y son las que hacen que esto sea gobernado y no un wrapper:
 *
 * 1. EL SCOPE SALE DE LA SESIÓN, NO DEL MODELO. Ninguna acción recibe `ownerOrgId`: se DERIVA del
 *    entitlement (`resolveProposalStudioOwnerOrg`). Un LLM no puede conocer un UUID, y dejar que lo
 *    proponga sería una superficie de ataque (nombrar la org de otro y confiar en que el gate la
 *    atrape). El cliente entra por NOMBRE y se resuelve fail-closed contra el catálogo.
 *
 * 2. LA HONESTIDAD DEL PREVIEW: qué va a pasar, dicho de forma inequívoca, ANTES de confirmar.
 *    · `record_proposal_evidence` — el `audience` es el vector de fuga del dominio (una evidencia
 *      `internal` lleva loaded cost = piso de negociación). El preview lo grita.
 *    · `request_proposal_render` — corre los MISMOS gates que el command
 *      (`assertProposalRenderAdmissible`) y, si van a rechazar, NO propone: explica (gap
 *      `unavailable`). Nunca una tarjeta que promete un PDF que va a fallar cerrado.
 *
 * El LLM nunca escribe: propone una actionKey registrada, el humano confirma, el endpoint
 * determinístico ejecuta el command dentro de la foundation de idempotencia (TASK-655). Por eso
 * ningún `execute` de acá pasa `idempotencyKey` (la provee el confirm).
 */

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import {
  attachProposalAsset,
  defaultAudienceForKind,
  recordProposalEvidence
} from '@/lib/commercial/tenders/proposals/assets'
import {
  assertProposalStudioAccessForSubject,
  type ProposalAccessNeed
} from '@/lib/commercial/tenders/proposals/authz'
import { ProposalEntitlementError, ProposalForbiddenError } from '@/lib/commercial/tenders/proposals/errors'
import {
  ProposalOrgResolutionError,
  resolveClientOrganizationByName,
  resolveProposalStudioOwnerOrg
} from '@/lib/commercial/tenders/proposals/org-resolution'
import {
  assertProposalRenderAdmissible,
  requestProposalRender,
  type RequestProposalRenderInput
} from '@/lib/commercial/tenders/proposals/render-jobs'
import { createProposal } from '@/lib/commercial/tenders/proposals/store'
import {
  attachProposalRfpActionSchema,
  recordProposalEvidenceActionSchema,
  registerProposalActionSchema,
  requestProposalRenderActionSchema,
  type AttachProposalRfpActionInput,
  type RecordProposalEvidenceActionInput,
  type RegisterProposalActionInput,
  type RequestProposalRenderActionInput
} from '@/lib/commercial/tenders/proposals/action-schemas'
import type { ProposalActor } from '@/lib/commercial/tenders/proposals/types'

import { isNexaActionRuntimeEnabled, isNexaProposalActionsEnabled } from '../flags'
import { NexaActionBlockedError } from './blocked-error'
import type {
  NexaActionContext,
  NexaActionDefinition,
  NexaActionExecutionResult,
  NexaActionPreviewResult
} from './types'

const PROPOSAL_STUDIO_DEEP_LINK = '/commercial/proposals'

const buildSubjectFromContext = (context: NexaActionContext): TenantEntitlementSubject => ({
  userId: context.userId,
  tenantType: context.tenantType,
  roleCodes: context.roleCodes,
  primaryRoleCode: context.roleCodes[0] ?? '',
  routeGroups: context.routeGroups,
  authorizedViews: [],
  memberId: context.memberId
})

/**
 * EL PRÓLOGO DE TODA ACCIÓN: derivar el scope + cruzar la puerta.
 *
 * Devuelve la org dueña (del entitlement, no del modelo) y el actor canónico. Traduce los rechazos
 * del dominio a un gap que Nexa pueda decir en voz alta — en vez de un 500 opaco o, peor, una
 * tarjeta que promete algo que la organización no tiene contratado.
 *
 * Se llama en `buildPreview` **y** en `execute`: el execute NUNCA confía en lo que resolvió el
 * preview (entre ambos pasa una confirmación humana, y el mundo pudo cambiar).
 */
const resolveScopeOrBlock = async (
  context: NexaActionContext,
  need: ProposalAccessNeed
): Promise<{ ownerOrgId: string; ownerOrgName: string; actor: ProposalActor }> => {
  let owner: Awaited<ReturnType<typeof resolveProposalStudioOwnerOrg>>

  try {
    owner = await resolveProposalStudioOwnerOrg()
  } catch (error) {
    if (error instanceof ProposalOrgResolutionError) {
      throw new NexaActionBlockedError(error.message, { deepLink: PROPOSAL_STUDIO_DEEP_LINK })
    }

    throw error
  }

  try {
    const { actor } = await assertProposalStudioAccessForSubject({
      subject: buildSubjectFromContext(context),
      ownerOrgId: owner.organizationId,
      need
    })

    return { ownerOrgId: owner.organizationId, ownerOrgName: owner.organizationName, actor }
  } catch (error) {
    if (error instanceof ProposalEntitlementError) {
      throw new NexaActionBlockedError(
        `${owner.organizationName} no tiene contratado el Proposal Studio, así que no puedo operar propuestas ahí.`
      )
    }

    if (error instanceof ProposalForbiddenError) {
      throw new NexaActionBlockedError('No tienes permiso para esta operación en el Proposal Studio.', {
        deepLink: PROPOSAL_STUDIO_DEEP_LINK
      })
    }

    throw error
  }
}

/** Gate síncrono (decide si Nexa siquiera ofrece la acción). El per-ORG es async → va en el preview. */
const canManageProposals = (context: NexaActionContext): boolean =>
  Boolean(context.userId) && can(buildSubjectFromContext(context), 'commercial.proposal.manage', 'create', 'tenant')

const proposalActionsEnabled = () => isNexaActionRuntimeEnabled() && isNexaProposalActionsEnabled()

// ─────────────────────────────────────────────────────────────────────────────
// 1. register_proposal — abrir la carpeta
// ─────────────────────────────────────────────────────────────────────────────

const ORIGIN_LABELS: Record<RegisterProposalActionInput['origin'], string> = {
  public_tender: 'Licitación pública',
  private_rfp: 'RFP privado',
  direct_sales: 'Venta directa'
}

/** El cliente, por nombre → id canónico. Fail-closed: no inventa organizaciones ni elige por el humano. */
const resolveClientOrBlock = async (name: string) => {
  try {
    return await resolveClientOrganizationByName(name)
  } catch (error) {
    if (error instanceof ProposalOrgResolutionError) {
      throw new NexaActionBlockedError(error.message)
    }

    throw error
  }
}

export const registerProposalAction: NexaActionDefinition<RegisterProposalActionInput> = {
  actionKey: 'register_proposal',
  intent: 'Registrar una propuesta nueva en el Proposal Studio',
  sensitivity: 'medium',
  domain: 'commercial-proposals',
  requiredCapability: 'commercial.proposal.manage',
  inputSchema: registerProposalActionSchema,
  isEnabled: proposalActionsEnabled,
  isPermitted: canManageProposals,
  async buildPreview(context, input): Promise<NexaActionPreviewResult> {
    await resolveScopeOrBlock(context, 'create')

    const client = await resolveClientOrBlock(input.clientOrganizationName)

    // La ausencia de deadline NO se maquilla: se declara. Un deadline inventado pierde el proceso.
    const deadlineLabel = input.deadline
      ? `${input.deadline}${input.deadlineConfidence === 'ambiguous' ? ' (ambigua — hay que confirmarla)' : ''}`
      : 'Sin fecha declarada'

    return {
      title: 'Registrar propuesta',
      summary:
        `Al confirmar, voy a abrir la propuesta “${input.title}” para ${client.organizationName} ` +
        `(${ORIGIN_LABELS[input.origin]}). Queda en estado inicial: todavía no compromete nada ante el comprador.`,
      metrics: [
        { label: 'Cliente', value: client.organizationName },
        { label: 'Origen', value: ORIGIN_LABELS[input.origin] },
        { label: 'Deadline', value: deadlineLabel },
        { label: 'Moneda', value: input.currency ?? 'Sin declarar' }
      ]
    }
  },
  async execute(context, input): Promise<NexaActionExecutionResult> {
    const { ownerOrgId, actor } = await resolveScopeOrBlock(context, 'create')
    const client = await resolveClientOrBlock(input.clientOrganizationName)

    const { proposal, idempotent } = await createProposal({
      ownerOrgId,
      clientOrganizationId: client.organizationId,
      origin: input.origin,
      publicOpportunityId: input.publicOpportunityId,
      title: input.title,
      platform: input.platform,
      deadline: input.deadline,
      deadlineConfidence: input.deadlineConfidence,
      deadlineAssumption: input.deadlineAssumption,
      currency: input.currency,
      actor
    })

    return {
      ok: true,
      summary: idempotent
        ? `Esa propuesta ya estaba registrada (“${proposal.title}”); no dupliqué nada.`
        : `Listo: registré la propuesta “${proposal.title}” para ${client.organizationName}. El siguiente paso es adjuntarle el RFP.`,
      metrics: [
        { label: 'Estado', value: proposal.state },
        { label: 'Cliente', value: client.organizationName }
      ],
      raw: { proposalId: proposal.proposalId, state: proposal.state, idempotent }
    }
  },
  confirmation: {
    title: 'Confirmar registro de la propuesta',
    body: 'Voy a crear la propuesta en el sistema. Revisa el cliente, el origen y la fecha antes de confirmar.',
    confirmLabel: 'Registrar',
    cancelLabel: 'Cancelar'
  },
  deepLinkFallback: PROPOSAL_STUDIO_DEEP_LINK,
  expirationSeconds: 300
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. attach_proposal_rfp — vincular un documento ya subido
// ─────────────────────────────────────────────────────────────────────────────

export const attachProposalRfpAction: NexaActionDefinition<AttachProposalRfpActionInput> = {
  actionKey: 'attach_proposal_rfp',
  intent: 'Vincular un documento ya subido a una propuesta',
  sensitivity: 'medium',
  domain: 'commercial-proposals',
  requiredCapability: 'commercial.proposal.manage',
  inputSchema: attachProposalRfpActionSchema,
  isEnabled: proposalActionsEnabled,
  isPermitted: canManageProposals,
  async buildPreview(context, input): Promise<NexaActionPreviewResult> {
    await resolveScopeOrBlock(context, 'update')

    // El audience NO lo elige el agente: sale del default SEGURO por kind (interno salvo los
    // entregables). Se muestra igual, porque es lo que decide si ese documento puede salir al comprador.
    const audience = defaultAudienceForKind(input.kind)

    return {
      title: 'Vincular documento a la propuesta',
      summary:
        `Al confirmar, voy a vincular ese archivo a la propuesta como “${input.kind}”. Queda marcado ` +
        `${audience === 'internal' ? 'como INTERNO (no puede salir al comprador)' : 'como entregable al comprador'}. ` +
        `No leo el contenido ni lo publico: sólo lo dejo asociado.`,
      metrics: [
        { label: 'Tipo', value: input.kind },
        { label: 'Visibilidad', value: audience === 'internal' ? 'Interna' : 'Al comprador' }
      ]
    }
  },
  async execute(context, input): Promise<NexaActionExecutionResult> {
    const { ownerOrgId, actor } = await resolveScopeOrBlock(context, 'update')

    const result = await attachProposalAsset({
      ownerOrgId,
      proposalId: input.proposalId,
      assetId: input.assetId,
      kind: input.kind,
      actorUserId: context.userId,
      actor
      // Sin `audience`: se respeta el default seguro por kind. Un agente no re-clasifica visibilidad.
    })

    return {
      ok: true,
      summary: result.idempotent
        ? 'Ese documento ya estaba vinculado a la propuesta; no hice nada nuevo.'
        : `Listo: vinculé el documento como “${input.kind}”.`,
      metrics: [{ label: 'Visibilidad', value: result.audience === 'internal' ? 'Interna' : 'Al comprador' }],
      raw: { proposalAssetId: result.proposalAssetId, audience: result.audience, idempotent: result.idempotent }
    }
  },
  confirmation: {
    title: 'Confirmar el documento',
    body: 'Voy a vincular este archivo a la propuesta. Revisa que sea el correcto antes de confirmar.',
    confirmLabel: 'Vincular',
    cancelLabel: 'Cancelar'
  },
  deepLinkFallback: PROPOSAL_STUDIO_DEEP_LINK,
  expirationSeconds: 300
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. record_proposal_evidence — LA MÁS PELIGROSA (el audience es el vector de fuga)
// ─────────────────────────────────────────────────────────────────────────────

const CLASSIFICATION_LABELS: Record<RecordProposalEvidenceActionInput['classification'], string> = {
  measured: 'Medida (dato real)',
  attested: 'Atestiguada (alguien la respalda)',
  illustrative: 'Ilustrativa (NO es una medición)'
}

export const recordProposalEvidenceAction: NexaActionDefinition<RecordProposalEvidenceActionInput> = {
  actionKey: 'record_proposal_evidence',
  intent: 'Registrar una evidencia citable en una propuesta',
  sensitivity: 'high',
  domain: 'commercial-proposals',
  requiredCapability: 'commercial.proposal.manage',
  inputSchema: recordProposalEvidenceActionSchema,
  isEnabled: proposalActionsEnabled,
  isPermitted: canManageProposals,
  async buildPreview(context, input): Promise<NexaActionPreviewResult> {
    await resolveScopeOrBlock(context, 'update')

    // El preview DEBE hacer inequívoco el audience. Una evidencia interna marcada por error como
    // client_facing es la fuga que el dominio entero está diseñado para impedir: lleva loaded cost,
    // o sea el piso de negociación. Que nadie pueda confirmar esto "sin darse cuenta".
    const isInternal = input.audience === 'internal'

    return {
      title: isInternal ? 'Registrar evidencia INTERNA' : 'Registrar evidencia PARA EL COMPRADOR',
      summary:
        `Al confirmar, voy a registrar esta evidencia con su procedencia (${input.method}, ${input.asOf}). ` +
        (isInternal
          ? 'Queda marcada INTERNA: no puede aparecer en ningún artefacto que vea el comprador (si se cita en uno, el render se rechaza completo).'
          : 'Queda marcada PARA EL COMPRADOR: podrá citarse en la oferta. Confirma esto sólo si el dato puede salir de Efeonce.'),
      metrics: [
        { label: 'Visibilidad', value: isInternal ? '⚠ Interna' : 'Al comprador' },
        { label: 'Clasificación', value: CLASSIFICATION_LABELS[input.classification] },
        { label: 'Vigencia (as-of)', value: input.asOf },
        { label: 'Dónde', value: input.locator }
      ]
    }
  },
  async execute(context, input): Promise<NexaActionExecutionResult> {
    const { ownerOrgId, actor } = await resolveScopeOrBlock(context, 'update')

    const result = await recordProposalEvidence({ ...input, ownerOrgId, actor })

    return {
      ok: true,
      summary:
        input.audience === 'internal'
          ? 'Listo: registré la evidencia como interna. No podrá citarse en un artefacto para el comprador.'
          : 'Listo: registré la evidencia. Ya puede citarse en la oferta.',
      metrics: [{ label: 'Visibilidad', value: input.audience === 'internal' ? 'Interna' : 'Al comprador' }],
      raw: { evidenceId: result.evidenceId, contentHash: result.contentHash }
    }
  },
  confirmation: {
    title: 'Confirmar la evidencia',
    body: 'Revisa sobre todo la VISIBILIDAD: una evidencia interna nunca puede salir al comprador.',
    confirmLabel: 'Registrar evidencia',
    cancelLabel: 'Cancelar'
  },
  deepLinkFallback: PROPOSAL_STUDIO_DEEP_LINK,
  expirationSeconds: 300
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. request_proposal_render — pedir el artefacto (el PDF)
// ─────────────────────────────────────────────────────────────────────────────

const toRenderInput = (
  input: RequestProposalRenderActionInput,
  ownerOrgId: string
): Omit<RequestProposalRenderInput, 'actor'> => ({
  ownerOrgId,
  proposalId: input.proposalId,
  artifactPurpose: input.artifactPurpose,
  audience: input.audience,
  outputTarget: input.outputTarget,
  evidenceIds: input.evidenceIds,
  manifest: input.manifest
})

export const requestProposalRenderAction: NexaActionDefinition<RequestProposalRenderActionInput> = {
  actionKey: 'request_proposal_render',
  intent: 'Pedir la generación del artefacto (deck/PDF) de una propuesta',
  sensitivity: 'high',
  domain: 'commercial-proposals',
  requiredCapability: 'commercial.proposal.render',
  inputSchema: requestProposalRenderActionSchema,
  isEnabled: proposalActionsEnabled,
  isPermitted: (context: NexaActionContext) =>
    Boolean(context.userId) &&
    can(buildSubjectFromContext(context), 'commercial.proposal.render', 'execute', 'tenant'),
  async buildPreview(context, input): Promise<NexaActionPreviewResult> {
    const { ownerOrgId, actor } = await resolveScopeOrBlock(context, 'render_execute')

    // Los MISMOS gates que el command, en seco. Si van a rechazar, esto NO se propone: se explica
    // (gap `unavailable`). Nunca una tarjeta que promete un PDF que va a fallar cerrado.
    let admissibility: Awaited<ReturnType<typeof assertProposalRenderAdmissible>>

    try {
      admissibility = await assertProposalRenderAdmissible({ ...toRenderInput(input, ownerOrgId), actor })
    } catch (error) {
      // Los rechazos del dominio ya traen mensaje es-CL seguro (audience, accesibilidad, deadline,
      // validador en rojo). Se los devolvemos al humano tal cual: el motivo ES la respuesta.
      throw new NexaActionBlockedError(
        error instanceof Error && error.message
          ? `No puedo generar ese artefacto: ${error.message}`
          : 'No puedo generar ese artefacto: no pasa los controles de la propuesta.',
        { deepLink: PROPOSAL_STUDIO_DEEP_LINK }
      )
    }

    const { projection, constraints, evidenceIds } = admissibility
    const slideCount = input.manifest.slides.length
    const isClientFacing = input.audience === 'client_facing'

    return {
      title: isClientFacing ? 'Generar el artefacto PARA EL COMPRADOR' : 'Generar un artefacto interno',
      summary:
        `Al confirmar, voy a encolar la generación de “${input.artifactPurpose}” (${slideCount} láminas) ` +
        `para la propuesta “${projection.title}”. Cita ${evidenceIds.length} evidencia` +
        `${evidenceIds.length === 1 ? '' : 's'}, todas permitidas para este destinatario. ` +
        `El archivo se genera aparte y queda disponible para descargar; puede tardar unos minutos.`,
      metrics: [
        { label: 'Destinatario', value: isClientFacing ? 'El comprador' : 'Interno' },
        { label: 'Láminas', value: String(slideCount) },
        { label: 'Evidencia citada', value: String(evidenceIds.length) },
        {
          label: 'Límite del RFP',
          value: constraints.maxPdfMbFromRfp ? `${constraints.maxPdfMbFromRfp} MB` : 'Sin límite declarado'
        }
      ]
    }
  },
  async execute(context, input): Promise<NexaActionExecutionResult> {
    const { ownerOrgId, actor } = await resolveScopeOrBlock(context, 'render_execute')

    const { job, idempotent } = await requestProposalRender({ ...toRenderInput(input, ownerOrgId), actor })

    return {
      ok: true,
      summary: idempotent
        ? 'Ese artefacto ya estaba pedido con el mismo contenido: te devuelvo el mismo, no genero otro.'
        : 'Listo: encolé la generación. Cuando el archivo esté, aparece para descargar en la propuesta.',
      metrics: [
        { label: 'Estado', value: job.state },
        { label: 'Destinatario', value: job.audience === 'client_facing' ? 'El comprador' : 'Interno' }
      ],
      raw: { renderJobId: job.renderJobId, state: job.state, idempotent }
    }
  },
  confirmation: {
    title: 'Confirmar la generación del artefacto',
    body: 'Voy a generar el documento con el contenido y la evidencia que revisaste. Confírmalo para encolarlo.',
    confirmLabel: 'Generar',
    cancelLabel: 'Cancelar'
  },
  deepLinkFallback: PROPOSAL_STUDIO_DEEP_LINK,
  expirationSeconds: 300
}

/** El bloque completo, en el orden real del ciclo (lo consume el registry y la descripción del tool). */
export const proposalStudioActions = [
  registerProposalAction,
  attachProposalRfpAction,
  recordProposalEvidenceAction,
  requestProposalRenderAction
] as const
