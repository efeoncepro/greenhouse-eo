import { z } from 'zod'

/**
 * TASK-1399 — Schemas de los payloads que un agente puede PROPONER para el Proposal Studio.
 *
 * Zod vive SOLO en este borde: el runtime de acciones gobernadas de Nexa exige un
 * `inputSchema: ZodType` (`NexaActionDefinition`), y ése es el contrato que hay que cumplir. NO es
 * validación de dominio (esa vive en los commands, y se re-aplica entera en el execute): es el
 * filtro que impide que el LLM proponga un payload que el command ni siquiera aceptaría.
 *
 * ⚠️ REGLA DE DISEÑO, no de estilo: **acá NO hay `ownerOrgId`**. La organización dueña se DERIVA del
 * entitlement (`resolveProposalStudioOwnerOrg`) y el cliente se resuelve POR NOMBRE. Un LLM no puede
 * conocer un UUID, y dejar que lo *proponga* sería una superficie de ataque (proponer el id de otra
 * organización y confiar en que el gate lo atrape). La identidad y el scope salen de la sesión y del
 * entitlement — nunca del modelo. Los ids que SÍ viajan (`proposalId`, `assetId`, `evidenceId`) son
 * ids que el propio sistema acaba de emitir y que el agente vio, no ids que inventa.
 */

import type { RecordProposalEvidenceInput } from './assets'

// ─────────────────────────────────────────────────────────────────────────────
// register_proposal
// ─────────────────────────────────────────────────────────────────────────────

export const registerProposalActionSchema = z
  .object({
    /** El cliente POR NOMBRE ("SKY", "Aguas Andinas"): se resuelve fail-closed contra el catálogo. */
    clientOrganizationName: z.string().min(2),
    origin: z.enum(['public_tender', 'private_rfp', 'direct_sales']),
    /** Obligatorio ⟺ origin='public_tender' (la promoción del radar). */
    publicOpportunityId: z.string().min(1).optional(),
    title: z.string().min(3),
    platform: z.string().optional(),
    /** La ausencia de deadline es EXPLÍCITA — el agente NO puede inventarlo. */
    deadline: z.string().optional(),
    deadlineConfidence: z.enum(['confirmed', 'ambiguous']).optional(),
    deadlineAssumption: z.string().optional(),
    currency: z.string().optional()
  })
  .refine(value => (value.origin === 'public_tender') === Boolean(value.publicOpportunityId), {
    message: 'origin=public_tender ⟺ publicOpportunityId (y ningún otro origin lo admite).',
    path: ['publicOpportunityId']
  })
  .refine(value => !value.deadline || Boolean(value.deadlineConfidence), {
    message: 'Un deadline propuesto exige declarar su confianza (confirmed | ambiguous).',
    path: ['deadlineConfidence']
  })

export type RegisterProposalActionInput = z.infer<typeof registerProposalActionSchema>

// ─────────────────────────────────────────────────────────────────────────────
// attach_proposal_rfp
// ─────────────────────────────────────────────────────────────────────────────

export const attachProposalRfpActionSchema = z.object({
  proposalId: z.string().min(1),
  /** Asset YA subido al store canónico (escaneado). El binario NUNCA viaja por acá. */
  assetId: z.string().min(1),
  kind: z.enum([
    'rfp_source',
    'fillable_template',
    'diagnostic',
    'technical_offer',
    'economic_offer',
    'admissibility_matrix',
    'deck',
    'other_doc'
  ])
})

export type AttachProposalRfpActionInput = z.infer<typeof attachProposalRfpActionSchema>

// ─────────────────────────────────────────────────────────────────────────────
// record_proposal_evidence — LA MÁS PELIGROSA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ El `audience` es el vector de fuga del dominio: una evidencia `internal` lleva loaded cost /
 * piso de negociación. Por eso es OBLIGATORIO y explícito (nunca derivable), y el preview de la
 * acción lo muestra de forma inequívoca antes de que un humano confirme.
 */
export const recordProposalEvidenceActionSchema = z
  .object({
    proposalId: z.string().min(1),
    /** EXACTAMENTE una fuente: un asset ya vinculado a ESTA propuesta, o un snapshot externo. */
    sourceAssetId: z.string().min(1).optional(),
    externalSourceSnapshot: z.record(z.string(), z.unknown()).optional(),
    locator: z.string().min(3),
    method: z.string().min(3),
    asOf: z.string().min(4),
    classification: z.enum(['measured', 'illustrative', 'attested']),
    audience: z.enum(['internal', 'client_facing'])
  })
  .refine(value => Boolean(value.sourceAssetId) !== Boolean(value.externalSourceSnapshot), {
    message: 'La evidencia lleva EXACTAMENTE una fuente: sourceAssetId O externalSourceSnapshot.',
    path: ['sourceAssetId']
  })

export type RecordProposalEvidenceActionInput = z.infer<typeof recordProposalEvidenceActionSchema>

// ─────────────────────────────────────────────────────────────────────────────
// request_proposal_render
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El manifest NO lo inventa el agente: lo produce `resolvePlan` (determinista, sella catálogo +
 * brand pack + fuentes + validadores). El agente lo transporta verbatim; el command re-valida su
 * shape v1 y RECHAZA cualquier manifest con un validador en rojo.
 *
 * ⚠️ `.passthrough()` NO es opcional acá, es LOAD-BEARING. Zod, por defecto, **borra las claves que
 * no declara** — y el `ResolvedCompositionManifest` lleva campos que este schema no enumera (el
 * `input` del autor, que es lo que le permite al manifest explicar de dónde salió). Sin passthrough,
 * el manifest que se persiste NO sería el que el composer resolvió, su `manifestHash` sería otro, y
 * el MISMO deck pedido por la API y por Nexa produciría DOS jobs distintos en vez de uno idempotente.
 * El manifest se valida, no se reescribe.
 *
 * En F0 el plan del deck todavía vive como archivo del repo (gap declarado en la task): por eso esta
 * acción recibe el manifest ya resuelto. Cuando el plan sea una entidad del dominio, la firma se
 * simplifica a `planId` y el agente deja de transportar nada.
 */
export const requestProposalRenderActionSchema = z.object({
  proposalId: z.string().min(1),
  artifactPurpose: z.string().min(3),
  audience: z.enum(['internal', 'client_facing']),
  outputTarget: z.enum(['pdf-merged', 'png-set']),
  /** Ids de evidencia que el artefacto CITA (el gate resuelve su audience real y falla cerrado). */
  evidenceIds: z.array(z.string().min(1)).default([]),
  /** ResolvedCompositionManifest producido por `resolvePlan` — VERBATIM (ver passthrough arriba). */
  manifest: z
    .object({
      manifestVersion: z.number(),
      artifactId: z.string(),
      catalog: z
        .object({
          name: z.string(),
          version: z.string(),
          registryHash: z.string(),
          ownerOrgId: z.string()
        })
        .passthrough(),
      slides: z.array(z.record(z.string(), z.unknown())),
      brandPack: z.object({ name: z.string(), hash: z.string() }).passthrough().nullable(),
      fonts: z
        .array(z.object({ family: z.string(), variant: z.string(), checksum: z.string() }).passthrough())
        .nullable(),
      validators: z.array(
        z
          .object({
            name: z.string(),
            version: z.string(),
            result: z.string(),
            violations: z.array(z.string())
          })
          .passthrough()
      )
    })
    .passthrough()
})

export type RequestProposalRenderActionInput = z.infer<typeof requestProposalRenderActionSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Guard de compile-time: el schema DEBE seguir siendo asignable al input del command.
// Si el command cambia su contrato y el schema queda viejo, esto rompe `tsc` (no runtime).
// (Sólo evidencia: las otras dos difieren a propósito — el ownerOrgId/clientOrganizationId se
// derivan server-side y por eso el schema NO los tiene.)
// ─────────────────────────────────────────────────────────────────────────────

const _evidenceAssignable: (
  input: RecordProposalEvidenceActionInput & { ownerOrgId: string }
) => Omit<RecordProposalEvidenceInput, 'actor'> = input => input

void _evidenceAssignable
