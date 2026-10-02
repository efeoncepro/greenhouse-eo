import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProposalById = vi.fn()
const buildProposalRenderProjection = vi.fn()
const readOrganizationLogoVariants = vi.fn()
const getAssetById = vi.fn()
const captureWithDomain = vi.fn()

vi.mock('@/lib/commercial/tenders/proposals/store', () => ({ getProposalById: (...args: unknown[]) => getProposalById(...args) }))

vi.mock('@/lib/commercial/tenders/proposals/render-projection', async importOriginal => ({
  ...(await importOriginal<object>()),
  buildProposalRenderProjection: (...args: unknown[]) => buildProposalRenderProjection(...args)
}))

vi.mock('@/lib/account-360/organization-logo-variants-reader', () => ({
  readOrganizationLogoVariants: (...args: unknown[]) => readOrganizationLogoVariants(...args)
}))

vi.mock('@/lib/storage/greenhouse-assets', () => ({ getAssetById: (...args: unknown[]) => getAssetById(...args) }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: (...args: unknown[]) => captureWithDomain(...args) }))

const { bindDeckSlots, DeckBindingContextError, DeckBindingReadError, loadDeckBindingSources } = await import('..')

const proposalContext = { kind: 'proposal', ownerOrgId: 'EO-ORG-0007', proposalId: 'prop-1', audience: 'client_facing' }

beforeEach(() => {
  vi.clearAllMocks()
  getProposalById.mockResolvedValue({ proposalId: 'prop-1', clientOrganizationId: 'org-cliente' })
  buildProposalRenderProjection.mockResolvedValue({
    allowedEvidence: [
      { evidenceId: 'prev-1', classification: 'measured', audience: 'client_facing', locator: 'caso publicado', method: 'métricas', asOf: '2026-08-01', contentHash: 'x', sourceAssetId: null, hasExternalSnapshot: false }
    ]
  })
  readOrganizationLogoVariants.mockResolvedValue({ logoAssetId: 'asset-logo', logoOnDarkAssetId: 'asset-logo-dark' })
})

describe('loadDeckBindingSources — readers canónicos', () => {
  it('lee la propuesta acotada a su organización, toda su evidencia y el logo de su cliente', async () => {
    const sources = await loadDeckBindingSources(proposalContext)

    expect(getProposalById).toHaveBeenCalledWith({ ownerOrgId: 'EO-ORG-0007', proposalId: 'prop-1' })
    expect(buildProposalRenderProjection).toHaveBeenCalledWith({ ownerOrgId: 'EO-ORG-0007', proposalId: 'prop-1', audience: 'internal' })
    expect(readOrganizationLogoVariants).toHaveBeenCalledWith('org-cliente')
    expect(sources.proposal?.evidence).toEqual([
      { evidenceId: 'prev-1', classification: 'measured', audience: 'client_facing', locator: 'caso publicado', method: 'métricas', asOf: '2026-08-01', sourceAssetId: null }
    ])
    expect(sources.audience).toBe('client_facing')
  })

  it('una propuesta de otra organización no liga nada', async () => {
    getProposalById.mockResolvedValue(null)

    await expect(loadDeckBindingSources(proposalContext)).rejects.toBeInstanceOf(DeckBindingContextError)
    expect(buildProposalRenderProjection).not.toHaveBeenCalled()
  })

  it('un error de lectura va a Sentry por dominio y sale sin detalle crudo', async () => {
    buildProposalRenderProjection.mockRejectedValue(new Error('connection refused 10.0.0.1'))

    const error = await loadDeckBindingSources(proposalContext).catch(caught => caught)

    expect(error).toBeInstanceOf(DeckBindingReadError)
    expect((error as Error).message).not.toContain('10.0.0.1')
    expect(captureWithDomain).toHaveBeenCalledWith(expect.any(Error), 'commercial', expect.objectContaining({ tags: expect.objectContaining({ source: 'deck_slot_bindings' }) }))
  })

  it('fuera de una propuesta sólo cuentan los assets vivos', async () => {
    getAssetById.mockImplementation(async (id: string) =>
      id === 'asset-vivo' ? { status: 'attached', uploadedAt: '2026-03-01', createdAt: '2026-02-01' } : { status: 'deleted', uploadedAt: null, createdAt: null }
    )

    const sources = await loadDeckBindingSources({
      kind: 'brand',
      audience: 'client_facing',
      facts: [
        { kind: 'figure', factId: 'a', target: { recipeId: 'content-focus', slot: 'proof' }, value: '62 %', label: 'x', evidenceRef: 'asset-vivo' },
        { kind: 'figure', factId: 'b', target: { recipeId: 'content-focus', slot: 'proof' }, value: '62 %', label: 'x', evidenceRef: 'asset-borrado' }
      ]
    })

    expect(sources.proposal).toBeNull()
    expect(sources.intentAssets).toEqual({ 'asset-vivo': { asOf: '2026-03-01' } })
    expect(getProposalById).not.toHaveBeenCalled()
  })

  it('rechaza un contexto mal formado antes de tocar la base', async () => {
    await expect(loadDeckBindingSources({ kind: 'proposal', audience: 'client_facing' })).rejects.toBeInstanceOf(DeckBindingContextError)
    await expect(loadDeckBindingSources({ kind: 'brand', audience: 'publico' })).rejects.toBeInstanceOf(DeckBindingContextError)
    await expect(
      loadDeckBindingSources({ kind: 'brand', audience: 'internal', facts: [{ kind: 'figure', factId: 'a', evidenceRef: 'x', target: { recipeId: 'content-focus' } }] })
    ).rejects.toBeInstanceOf(DeckBindingContextError)
    expect(getProposalById).not.toHaveBeenCalled()
    expect(getAssetById).not.toHaveBeenCalled()
  })
})

describe('bindDeckSlots — de punta a punta sobre los readers', () => {
  it('liga el logo del cliente y una cifra con evidencia de la propuesta', async () => {
    const result = await bindDeckSlots(
      { document: 'proposal', slides: [{ recipeId: 'cover-proposal-orbit', slots: {} }, { recipeId: 'content-focus', slots: {} }] },
      { ...proposalContext, facts: [{ kind: 'figure', factId: 'f', target: { recipeId: 'content-focus', slot: 'proof' }, value: '62 %', label: 'aprobados', evidenceRef: 'prev-1' }] }
    )

    expect(result.plan.slides[0]!.slots!.clientLogo).toMatchObject({ assetId: 'asset-logo-dark' })
    expect(result.plan.slides[1]!.slots!.proof).toMatchObject({ value: '62 %', source: 'caso publicado' })
  })
})
