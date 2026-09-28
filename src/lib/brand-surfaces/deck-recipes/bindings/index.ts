import 'server-only'

/**
 * `bindDeckSlots(plan, context)` — datos reales en los slots del deck «La órbita» (TASK-1930).
 *
 * Único contrato del binding. Recibe un plan de TASK-1929 y un contexto que el consumer ya autorizó (TASK-1932 con
 * `assertProposalStudioAccessForSubject`, TASK-1921 o la CLI local) y devuelve el plan con los slots de datos ligados,
 * el rastro por slot y los issues. Lee SÓLO readers canónicos y no escribe nada:
 *
 * - la `Proposal`, por `getProposalById` (siempre acotada a su organización dueña);
 * - su evidencia, por la proyección allowlisted `buildProposalRenderProjection` (sin contenido crudo, costos ni URLs);
 * - el logo del cliente, por `readOrganizationLogoVariants` (Account 360);
 * - fuera de una `Proposal`, los assets de respaldo de los hechos, por `getAssetById`.
 *
 * El núcleo (`bindDeckSlotsWith`) es puro sobre esas fuentes. Un error de lectura se reporta con `captureWithDomain` y
 * sale como `DeckBindingReadError` sin detalle crudo.
 */

import { readOrganizationLogoVariants } from '@/lib/account-360/organization-logo-variants-reader'
import { buildProposalRenderProjection } from '@/lib/commercial/tenders/proposals/render-projection'
import { getProposalById } from '@/lib/commercial/tenders/proposals/store'
import { captureWithDomain } from '@/lib/observability/capture'

import type { DeckPlan } from '../types'

import { bindDeckSlotsWith } from './core'
import type { DeckBindingContext, DeckBindingSources, DeckSlotBindingResult, DeckSlotFact } from './types'

export { bindDeckSlotsWith, DECK_SLOT_BINDING_ISSUE_CODES, type DeckSlotBindingIssueCode } from './core'
export { DECK_SLOT_BINDING_MAP, LOGO_WALL_MIN, SAMPLE_MARKS, bindingRulesOf, isExclusion } from './map'
export { MONEY_PLACEHOLDER } from './binders/money'
export * from './types'

/** El contexto no sirve para ligar (forma inválida o propuesta que no existe en esa organización). */
export class DeckBindingContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeckBindingContextError'
  }
}

/** Una fuente canónica no se pudo leer. El detalle va a Sentry, nunca al mensaje. */
export class DeckBindingReadError extends Error {
  constructor() {
    super('No se pudieron leer las fuentes de datos del deck. Intenta de nuevo en unos minutos.')
    this.name = 'DeckBindingReadError'
  }
}

const FACT_KINDS = new Set(['figure', 'logo', 'quote', 'photo', 'sample-data'])
const AUDIENCES = new Set(['internal', 'client_facing'])
const UNUSABLE_ASSET_STATUSES = new Set(['deleted', 'quarantined'])

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

/** La forma del contexto, antes de tocar la base. */
export const normalizeDeckBindingContext = (input: unknown): DeckBindingContext => {
  if (!isObject(input)) throw new DeckBindingContextError('El contexto del binding es un objeto.')

  if (!AUDIENCES.has(String(input.audience))) throw new DeckBindingContextError('`audience` es `internal` o `client_facing`.')

  const facts = input.facts ?? []

  if (!Array.isArray(facts)) throw new DeckBindingContextError('`facts` es una lista de hechos.')

  facts.forEach((fact, index) => {
    if (!isObject(fact) || !FACT_KINDS.has(String(fact.kind)) || !nonEmpty(fact.factId) || !nonEmpty(fact.evidenceRef)) {
      throw new DeckBindingContextError(`El hecho ${index + 1} necesita \`kind\`, \`factId\` y \`evidenceRef\`.`)
    }

    if (!isObject(fact.target) || !nonEmpty(fact.target.recipeId)) {
      throw new DeckBindingContextError(`El hecho «${fact.factId}» necesita \`target.recipeId\`.`)
    }

    const needsSlot = fact.kind === 'figure' || fact.kind === 'logo' || fact.kind === 'photo'

    if (needsSlot && !nonEmpty(fact.target.slot)) throw new DeckBindingContextError(`El hecho «${fact.factId}» necesita \`target.slot\`.`)
  })

  const audience = input.audience as DeckBindingContext['audience']
  const typedFacts = facts as DeckSlotFact[]

  if (input.kind === 'proposal') {
    if (!nonEmpty(input.ownerOrgId) || !nonEmpty(input.proposalId)) {
      throw new DeckBindingContextError('Un contexto de propuesta lleva `ownerOrgId` y `proposalId`.')
    }

    return { kind: 'proposal', ownerOrgId: input.ownerOrgId, proposalId: input.proposalId, audience, facts: typedFacts }
  }

  if (input.kind === 'brand') return { kind: 'brand', audience, facts: typedFacts }

  throw new DeckBindingContextError('`kind` es `proposal` o `brand`.')
}

const readOrFail = async <T>(what: string, extra: Record<string, unknown>, read: () => Promise<T>): Promise<T> => {
  try {
    return await read()
  } catch (error) {
    captureWithDomain(error, 'commercial', { tags: { source: 'deck_slot_bindings', read: what }, extra })
    throw new DeckBindingReadError()
  }
}

/** Lee las fuentes canónicas del contexto. */
export const loadDeckBindingSources = async (input: unknown): Promise<DeckBindingSources> => {
  const context = normalizeDeckBindingContext(input)
  const facts = context.facts ?? []

  if (context.kind === 'proposal') {
    const scope = { ownerOrgId: context.ownerOrgId, proposalId: context.proposalId }
    const proposal = await readOrFail('proposal', scope, () => getProposalById(scope))

    if (!proposal) throw new DeckBindingContextError('La propuesta no existe en esa organización.')

    // La autoría ve toda la evidencia; la regla de audiencia la aplica el binder y la verifica el gate canónico.
    const [projection, logo] = await Promise.all([
      readOrFail('evidence', scope, () => buildProposalRenderProjection({ ...scope, audience: 'internal' })),
      readOrFail('client_logo', scope, () => readOrganizationLogoVariants(proposal.clientOrganizationId))
    ])

    return {
      audience: context.audience,
      proposal: {
        proposalId: proposal.proposalId,
        clientOrganizationId: proposal.clientOrganizationId,
        evidence: projection.allowedEvidence.map(entry => ({
          evidenceId: entry.evidenceId,
          classification: entry.classification,
          audience: entry.audience,
          locator: entry.locator,
          method: entry.method,
          asOf: entry.asOf,
          sourceAssetId: entry.sourceAssetId
        }))
      },
      clientLogo: logo,
      intentAssets: {},
      facts
    }
  }

  // Sin `Proposal`: cada `evidenceRef` tiene que ser un asset vivo.
  const { getAssetById } = await import('@/lib/storage/greenhouse-assets')
  const refs = [...new Set(facts.map(fact => fact.evidenceRef.trim()))]
  const intentAssets: DeckBindingSources['intentAssets'] = {}

  for (const ref of refs) {
    const asset = await readOrFail('intent_asset', { assetRef: ref }, () => getAssetById(ref))

    if (asset && !UNUSABLE_ASSET_STATUSES.has(asset.status)) {
      intentAssets[ref] = { asOf: asset.uploadedAt ?? asset.createdAt ?? new Date(0).toISOString() }
    }
  }

  return { audience: context.audience, proposal: null, clientLogo: null, intentAssets, facts }
}

export const bindDeckSlots = async (plan: DeckPlan, context: unknown): Promise<DeckSlotBindingResult> =>
  bindDeckSlotsWith(plan, await loadDeckBindingSources(context))
