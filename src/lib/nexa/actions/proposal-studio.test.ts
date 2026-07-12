import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1399 — Las acciones gobernadas del Proposal Studio.
 *
 * Lo que se prueba acá NO es la lógica de dominio (esa vive en los commands y ya tiene sus suites).
 * Se prueba lo que Nexa AGREGA, que es exactamente donde puede romper el gobierno:
 *
 *   1. Que el bloque nazca APAGADO y no baste el master flag para encenderlo.
 *   2. Que el scope NO salga del modelo (ninguna acción acepta `ownerOrgId`).
 *   3. Que el preview sea READ-ONLY (proponer no escribe).
 *   4. Que el `audience` sea INEQUÍVOCO antes de confirmar.
 *   5. Que una evidencia `internal` citada en un artefacto `client_facing` NUNCA llegue a ser una
 *      tarjeta de confirmar — el gate que protege el piso de negociación también aplica al chat.
 *   6. Que el `execute` NO pase `idempotencyKey` (la provee el confirm; pasarla haría doble-claim).
 */

import type * as OrgResolution from '@/lib/commercial/tenders/proposals/org-resolution'
import type * as ProposalAuthz from '@/lib/commercial/tenders/proposals/authz'
import type * as ProposalAssets from '@/lib/commercial/tenders/proposals/assets'

vi.mock('server-only', () => ({}))

const mockCan = vi.fn()
const mockResolveOwnerOrg = vi.fn()
const mockResolveClient = vi.fn()
const mockAssertAccess = vi.fn()
const mockCreateProposal = vi.fn()
const mockAttachAsset = vi.fn()
const mockRecordEvidence = vi.fn()
const mockRequestRender = vi.fn()
const mockAssertAdmissible = vi.fn()

vi.mock('@/lib/entitlements/runtime', () => ({ can: (...args: unknown[]) => mockCan(...(args as [])) }))

vi.mock('@/lib/commercial/tenders/proposals/org-resolution', async importOriginal => ({
  ...(await importOriginal<typeof OrgResolution>()),
  resolveProposalStudioOwnerOrg: () => mockResolveOwnerOrg(),
  resolveClientOrganizationByName: (name: string) => mockResolveClient(name)
}))

vi.mock('@/lib/commercial/tenders/proposals/authz', async importOriginal => ({
  ...(await importOriginal<typeof ProposalAuthz>()),
  assertProposalStudioAccessForSubject: (input: unknown) => mockAssertAccess(input)
}))

vi.mock('@/lib/commercial/tenders/proposals/store', () => ({
  createProposal: (input: unknown) => mockCreateProposal(input)
}))

vi.mock('@/lib/commercial/tenders/proposals/assets', async importOriginal => ({
  ...(await importOriginal<typeof ProposalAssets>()),
  attachProposalAsset: (input: unknown) => mockAttachAsset(input),
  recordProposalEvidence: (input: unknown) => mockRecordEvidence(input)
}))

vi.mock('@/lib/commercial/tenders/proposals/render-jobs', () => ({
  requestProposalRender: (input: unknown) => mockRequestRender(input),
  assertProposalRenderAdmissible: (input: unknown) => mockAssertAdmissible(input)
}))

import { ProposalAudienceError, ProposalEntitlementError } from '@/lib/commercial/tenders/proposals/errors'
import { ProposalOrgResolutionError } from '@/lib/commercial/tenders/proposals/org-resolution'

import { requestProposalRenderActionSchema } from '@/lib/commercial/tenders/proposals/action-schemas'

import { isNexaActionBlockedError } from './blocked-error'
import {
  attachProposalRfpAction,
  proposalStudioActions,
  recordProposalEvidenceAction,
  registerProposalAction,
  requestProposalRenderAction
} from './proposal-studio'
import type { NexaActionContext } from './types'

const context: NexaActionContext = {
  userId: 'user-1',
  memberId: 'member-1',
  clientId: null,
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['internal']
}

const OWNER = { organizationId: 'org-efeonce', organizationName: 'Efeonce' }

const MANIFEST = {
  manifestVersion: 1,
  artifactId: 'art-1',
  catalog: { name: 'deck-axis', version: '1.0.0', registryHash: 'abc', ownerOrgId: 'org-efeonce' },
  slides: [{ template: 'cover' }, { template: 'closing' }],
  brandPack: { name: 'axis', hash: 'h' },
  fonts: null,
  validators: [{ name: 'semantic', version: '1', result: 'pass', violations: [] }]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  mockCan.mockReturnValue(true)
  mockResolveOwnerOrg.mockResolvedValue(OWNER)
  mockResolveClient.mockResolvedValue({ organizationId: 'org-sky', organizationName: 'SKY' })
  mockAssertAccess.mockResolvedValue({ actor: { kind: 'member', memberId: 'member-1' } })
})

const enableFlags = () => {
  vi.stubEnv('NEXA_ACTION_RUNTIME_ENABLED', 'true')
  vi.stubEnv('NEXA_PROPOSAL_ACTIONS_ENABLED', 'true')
}

describe('el bloque nace APAGADO', () => {
  it('sin flags, ninguna de las 4 está habilitada', () => {
    for (const action of proposalStudioActions) {
      expect(action.isEnabled()).toBe(false)
    }
  })

  it('el master flag SOLO no alcanza: operar licitaciones exige su propio flag', () => {
    vi.stubEnv('NEXA_ACTION_RUNTIME_ENABLED', 'true')

    for (const action of proposalStudioActions) {
      expect(action.isEnabled()).toBe(false)
    }
  })

  it('con ambos flags, las 4 quedan habilitadas', () => {
    enableFlags()

    for (const action of proposalStudioActions) {
      expect(action.isEnabled()).toBe(true)
    }
  })
})

describe('el scope sale de la SESIÓN, no del modelo', () => {
  it('ninguna acción acepta `ownerOrgId` en su schema: el LLM no puede nombrar la org de otro', () => {
    for (const action of proposalStudioActions) {
      const parsed = action.inputSchema!.safeParse({
        ownerOrgId: 'org-de-otro',
        // payload mínimo inválido a propósito: lo único que importa es que ownerOrgId nunca sobreviva
        proposalId: 'prop-1',
        clientOrganizationName: 'SKY',
        origin: 'private_rfp',
        title: 'Una propuesta',
        assetId: 'asset-1',
        kind: 'rfp_source',
        locator: 'p. 4',
        method: 'cita textual',
        asOf: '2026-07-12',
        classification: 'measured',
        audience: 'internal',
        sourceAssetId: 'asset-1',
        artifactPurpose: 'deck',
        outputTarget: 'pdf-merged',
        evidenceIds: [],
        manifest: MANIFEST
      })

      expect(parsed.success).toBe(true)
      expect(parsed.data).not.toHaveProperty('ownerOrgId')
    }
  })

  it('la org dueña se deriva del entitlement, y el cliente se resuelve por nombre', async () => {
    enableFlags()

    await registerProposalAction.buildPreview(context, {
      clientOrganizationName: 'SKY',
      origin: 'private_rfp',
      title: 'SKY — blog 2026'
    })

    expect(mockResolveOwnerOrg).toHaveBeenCalled()
    expect(mockResolveClient).toHaveBeenCalledWith('SKY')
  })

  it('si el módulo no está contratado en esa org, NO propone: lo dice (gap bloqueante)', async () => {
    enableFlags()
    mockAssertAccess.mockRejectedValueOnce(new ProposalEntitlementError('org-efeonce'))

    await expect(
      registerProposalAction.buildPreview(context, {
        clientOrganizationName: 'SKY',
        origin: 'private_rfp',
        title: 'SKY — blog 2026'
      })
    ).rejects.toSatisfy(isNexaActionBlockedError)
  })

  it('un cliente ambiguo se pregunta, no se adivina', async () => {
    enableFlags()
    mockResolveClient.mockRejectedValueOnce(
      new ProposalOrgResolutionError('Hay varias organizaciones que coinciden con "Sky": SKY, Skyline. ¿Cuál es?')
    )

    const error = await registerProposalAction
      .buildPreview(context, { clientOrganizationName: 'Sky', origin: 'private_rfp', title: 'X' })
      .catch((e: unknown) => e)

    expect(isNexaActionBlockedError(error)).toBe(true)
    expect((error as Error).message).toContain('¿Cuál es?')
  })
})

describe('el manifest viaja VERBATIM (se valida, no se reescribe)', () => {
  it('el schema NO se come los campos que no enumera — si lo hiciera, cambiaría el hash y el mismo deck daría dos jobs', () => {
    // El ResolvedCompositionManifest real lleva `input` (el plan del autor, su procedencia). Zod
    // borra las claves no declaradas por defecto: sin `.passthrough()`, lo persistido no sería lo
    // que el composer resolvió.
    const withProvenance = {
      ...MANIFEST,
      input: { contentType: 'cover', slots: { title: 'SKY' } },
      resolvedAt: '2026-07-12T00:00:00Z'
    }

    const parsed = requestProposalRenderActionSchema.parse({
      proposalId: 'prop-1',
      artifactPurpose: 'deck',
      audience: 'client_facing',
      outputTarget: 'pdf-merged',
      evidenceIds: [],
      manifest: withProvenance
    })

    expect(parsed.manifest).toEqual(withProvenance)
  })

  it('el execute le pasa al command EXACTAMENTE el manifest que recibió', async () => {
    enableFlags()
    mockAssertAdmissible.mockResolvedValue({ projection: { title: 'SKY' }, constraints: {}, evidenceIds: [] })
    mockRequestRender.mockResolvedValue({
      job: { renderJobId: 'prnd-1', state: 'queued', audience: 'internal' },
      idempotent: false
    })

    const manifest = { ...MANIFEST, input: { contentType: 'cover' } }

    await requestProposalRenderAction.execute(context, {
      proposalId: 'prop-1',
      artifactPurpose: 'deck',
      audience: 'internal',
      outputTarget: 'pdf-merged',
      evidenceIds: [],
      manifest
    })

    expect((mockRequestRender.mock.calls[0]![0] as { manifest: unknown }).manifest).toEqual(manifest)
  })
})

describe('proponer NO escribe', () => {
  it('el preview de las 4 no toca ningún command', async () => {
    enableFlags()
    mockAssertAdmissible.mockResolvedValue({
      projection: { title: 'SKY — blog 2026' },
      constraints: { maxPdfMbFromRfp: 20 },
      evidenceIds: ['ev-1']
    })

    await registerProposalAction.buildPreview(context, {
      clientOrganizationName: 'SKY',
      origin: 'private_rfp',
      title: 'SKY — blog 2026'
    })
    await attachProposalRfpAction.buildPreview(context, {
      proposalId: 'prop-1',
      assetId: 'asset-1',
      kind: 'rfp_source'
    })
    await recordProposalEvidenceAction.buildPreview(context, {
      proposalId: 'prop-1',
      sourceAssetId: 'asset-1',
      locator: 'p. 4',
      method: 'cita textual del RFP',
      asOf: '2026-07-12',
      classification: 'measured',
      audience: 'client_facing'
    })
    await requestProposalRenderAction.buildPreview(context, {
      proposalId: 'prop-1',
      artifactPurpose: 'deck',
      audience: 'client_facing',
      outputTarget: 'pdf-merged',
      evidenceIds: ['ev-1'],
      manifest: MANIFEST
    })

    expect(mockCreateProposal).not.toHaveBeenCalled()
    expect(mockAttachAsset).not.toHaveBeenCalled()
    expect(mockRecordEvidence).not.toHaveBeenCalled()
    expect(mockRequestRender).not.toHaveBeenCalled()
  })
})

describe('el audience es INEQUÍVOCO antes de confirmar', () => {
  it('una evidencia interna se anuncia como interna, con la consecuencia explícita', async () => {
    enableFlags()

    const preview = await recordProposalEvidenceAction.buildPreview(context, {
      proposalId: 'prop-1',
      sourceAssetId: 'asset-1',
      locator: 'squad blueprint',
      method: 'loaded cost',
      asOf: '2026-07-12',
      classification: 'measured',
      audience: 'internal'
    })

    expect(preview.title).toContain('INTERNA')
    expect(preview.summary).toContain('no puede aparecer')
    expect(preview.metrics.find(m => m.label === 'Visibilidad')?.value).toContain('Interna')
  })

  it('una evidencia para el comprador se anuncia como tal (nunca ambigua)', async () => {
    enableFlags()

    const preview = await recordProposalEvidenceAction.buildPreview(context, {
      proposalId: 'prop-1',
      sourceAssetId: 'asset-1',
      locator: 'p. 4',
      method: 'cita textual del RFP',
      asOf: '2026-07-12',
      classification: 'measured',
      audience: 'client_facing'
    })

    expect(preview.title).toContain('PARA EL COMPRADOR')
    expect(preview.metrics.find(m => m.label === 'Visibilidad')?.value).toBe('Al comprador')
  })

  it('el agente NO re-clasifica la visibilidad de un documento: se respeta el default seguro por kind', async () => {
    enableFlags()
    mockAttachAsset.mockResolvedValue({ proposalAssetId: 'pa-1', audience: 'internal', idempotent: false })

    await attachProposalRfpAction.execute(context, {
      proposalId: 'prop-1',
      assetId: 'asset-1',
      kind: 'rfp_source'
    })

    expect(mockAttachAsset).toHaveBeenCalledTimes(1)
    expect(mockAttachAsset.mock.calls[0]![0]).not.toHaveProperty('audience')
  })
})

describe('el gate del audience TAMBIÉN aplica al chat', () => {
  it('una evidencia interna citada en un artefacto client_facing NUNCA llega a ser tarjeta de confirmar', async () => {
    enableFlags()

    // Lo que haría el command al encolar: rechazar el artefacto COMPLETO (fail-closed).
    mockAssertAdmissible.mockRejectedValueOnce(
      new ProposalAudienceError(
        'La evidencia "ev-interna" es internal: un artefacto client_facing con una sola evidencia interna se rechaza completo.'
      )
    )

    const error = await requestProposalRenderAction
      .buildPreview(context, {
        proposalId: 'prop-1',
        artifactPurpose: 'deck',
        audience: 'client_facing',
        outputTarget: 'pdf-merged',
        evidenceIds: ['ev-interna'],
        manifest: MANIFEST
      })
      .catch((e: unknown) => e)

    // No es un preview con advertencia: es un NO, con el motivo real del dominio.
    expect(isNexaActionBlockedError(error)).toBe(true)
    expect((error as Error).message).toContain('se rechaza completo')
    expect(mockRequestRender).not.toHaveBeenCalled()
  })

  it('el preview del render corre los MISMOS gates que el command (no una copia)', async () => {
    enableFlags()
    mockAssertAdmissible.mockResolvedValue({
      projection: { title: 'SKY — blog 2026' },
      constraints: { maxPdfMbFromRfp: 20 },
      evidenceIds: ['ev-1', 'ev-2']
    })

    const preview = await requestProposalRenderAction.buildPreview(context, {
      proposalId: 'prop-1',
      artifactPurpose: 'deck',
      audience: 'client_facing',
      outputTarget: 'pdf-merged',
      evidenceIds: ['ev-1', 'ev-2'],
      manifest: MANIFEST
    })

    expect(mockAssertAdmissible).toHaveBeenCalledTimes(1)
    expect(preview.title).toContain('PARA EL COMPRADOR')
    expect(preview.metrics.find(m => m.label === 'Evidencia citada')?.value).toBe('2')
    expect(preview.metrics.find(m => m.label === 'Láminas')?.value).toBe('2')
    expect(preview.metrics.find(m => m.label === 'Límite del RFP')?.value).toBe('20 MB')
  })
})

describe('el execute delega en el command canónico', () => {
  it('register_proposal NO pasa idempotencyKey (la provee el confirm; pasarla haría doble-claim)', async () => {
    enableFlags()
    mockCreateProposal.mockResolvedValue({
      proposal: { proposalId: 'prop-1', title: 'SKY — blog 2026', state: 'intake', origin: 'private_rfp' },
      idempotent: false
    })

    await registerProposalAction.execute(context, {
      clientOrganizationName: 'SKY',
      origin: 'private_rfp',
      title: 'SKY — blog 2026'
    })

    const payload = mockCreateProposal.mock.calls[0]![0] as Record<string, unknown>

    expect(payload).not.toHaveProperty('idempotencyKey')
    // El scope y el actor los pone el servidor, no el modelo.
    expect(payload.ownerOrgId).toBe('org-efeonce')
    expect(payload.clientOrganizationId).toBe('org-sky')
    expect(payload.actor).toEqual({ kind: 'member', memberId: 'member-1' })
  })

  it('el execute RE-CRUZA la puerta (no confía en lo que resolvió el preview)', async () => {
    enableFlags()
    mockRecordEvidence.mockResolvedValue({ evidenceId: 'ev-1', contentHash: 'h' })

    await recordProposalEvidenceAction.execute(context, {
      proposalId: 'prop-1',
      sourceAssetId: 'asset-1',
      locator: 'p. 4',
      method: 'cita textual',
      asOf: '2026-07-12',
      classification: 'measured',
      audience: 'internal'
    })

    expect(mockAssertAccess).toHaveBeenCalledTimes(1)
    expect(mockRecordEvidence.mock.calls[0]![0]).toMatchObject({ ownerOrgId: 'org-efeonce', audience: 'internal' })
  })

  it('un render idempotente devuelve el MISMO artefacto, no genera otro', async () => {
    enableFlags()
    mockAssertAdmissible.mockResolvedValue({
      projection: { title: 'SKY' },
      constraints: {},
      evidenceIds: []
    })
    mockRequestRender.mockResolvedValue({
      job: { renderJobId: 'prnd-1', state: 'queued', audience: 'client_facing' },
      idempotent: true
    })

    const result = await requestProposalRenderAction.execute(context, {
      proposalId: 'prop-1',
      artifactPurpose: 'deck',
      audience: 'client_facing',
      outputTarget: 'pdf-merged',
      evidenceIds: [],
      manifest: MANIFEST
    })

    expect(result.summary).toContain('te devuelvo el mismo')
    expect(result.raw?.idempotent).toBe(true)
  })
})

describe('permisos', () => {
  it('sin la capability de render, la acción no se ofrece (aunque el flag esté ON)', () => {
    enableFlags()
    mockCan.mockImplementation((_subject, capability) => capability !== 'commercial.proposal.render')

    expect(requestProposalRenderAction.isPermitted(context)).toBe(false)
    expect(registerProposalAction.isPermitted(context)).toBe(true)
  })

  it('sin la capability de manage, no se puede registrar ni adjuntar ni evidenciar', () => {
    enableFlags()
    mockCan.mockReturnValue(false)

    expect(registerProposalAction.isPermitted(context)).toBe(false)
    expect(attachProposalRfpAction.isPermitted(context)).toBe(false)
    expect(recordProposalEvidenceAction.isPermitted(context)).toBe(false)
  })
})
