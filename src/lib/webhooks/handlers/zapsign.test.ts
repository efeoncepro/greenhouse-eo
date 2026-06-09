import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Capture the registered handler.
const handlersByCode: Record<string, (...args: unknown[]) => Promise<void>> = {}

vi.mock('../inbound', () => ({
  registerInboundHandler: (code: string, fn: (...args: unknown[]) => Promise<void>) => {
    handlersByCode[code] = fn
  }
}))

const getSignatureRequestByProviderToken = vi.fn()
const applyProviderSignatureUpdate = vi.fn()
const getDocumentState = vi.fn()
const getMasterAgreementBySignatureDocumentToken = vi.fn()
const syncMasterAgreementSignature = vi.fn()
const storeSystemGeneratedPrivateAsset = vi.fn()
const captureWithDomain = vi.fn()

vi.mock('@/lib/signatures/store', () => ({
  getSignatureRequestByProviderToken: (...args: unknown[]) => getSignatureRequestByProviderToken(...args)
}))
vi.mock('@/lib/signatures/commands', () => ({
  applyProviderSignatureUpdate: (...args: unknown[]) => applyProviderSignatureUpdate(...args)
}))
vi.mock('@/lib/integrations/zapsign/signature-adapter', () => ({
  zapSignSignatureAdapter: { getDocumentState: (...args: unknown[]) => getDocumentState(...args) }
}))
vi.mock('@/lib/commercial/master-agreements-store', () => ({
  getMasterAgreementBySignatureDocumentToken: (...args: unknown[]) =>
    getMasterAgreementBySignatureDocumentToken(...args),
  syncMasterAgreementSignature: (...args: unknown[]) => syncMasterAgreementSignature(...args)
}))
vi.mock('@/lib/storage/greenhouse-assets', () => ({
  storeSystemGeneratedPrivateAsset: (...args: unknown[]) => storeSystemGeneratedPrivateAsset(...args)
}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureWithDomain(...args)
}))

const inboxEvent = { webhook_inbox_event_id: 'e1' } as unknown
const invoke = (payload: unknown) => handlersByCode.zapsign(inboxEvent, JSON.stringify(payload), payload)

beforeEach(async () => {
  for (const fn of [
    getSignatureRequestByProviderToken,
    applyProviderSignatureUpdate,
    getDocumentState,
    getMasterAgreementBySignatureDocumentToken,
    syncMasterAgreementSignature,
    storeSystemGeneratedPrivateAsset,
    captureWithDomain
  ]) {
    fn.mockReset()
  }

  await import('./zapsign')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('zapsign webhook dispatch cascade', () => {
  it('ignores a payload without a document token', async () => {
    await invoke({ status: 'signed' })

    expect(getSignatureRequestByProviderToken).not.toHaveBeenCalled()
    expect(getMasterAgreementBySignatureDocumentToken).not.toHaveBeenCalled()
  })

  it('routes to the signature_requests aggregate (priority) and applies authoritative state', async () => {
    getSignatureRequestByProviderToken.mockResolvedValue({
      signatureRequestId: 'sig-1',
      providerDocumentToken: 'tok-1',
      signedDocumentAssetId: null,
      sourceKind: 'contracting_case',
      sourceRef: 'wcc-1'
    })
    getDocumentState.mockResolvedValue({
      status: 'sent',
      signers: [{ providerSignerToken: 't', email: 'a@b.com', status: 'pending', signedAt: null }],
      signedFileUrl: null,
      rawPayload: { token: 'tok-1' }
    })

    await invoke({ token: 'tok-1', status: 'pending' })

    expect(getDocumentState).toHaveBeenCalledWith('tok-1')
    expect(applyProviderSignatureUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ signatureRequestId: 'sig-1', providerStatus: 'sent', actor: 'system:zapsign' })
    )
    // MSA lane untouched.
    expect(getMasterAgreementBySignatureDocumentToken).not.toHaveBeenCalled()
    expect(syncMasterAgreementSignature).not.toHaveBeenCalled()
  })

  it('downloads + stores the signed PDF in the vault when completed', async () => {
    getSignatureRequestByProviderToken.mockResolvedValue({
      signatureRequestId: 'sig-2',
      providerDocumentToken: 'tok-2',
      signedDocumentAssetId: null,
      sourceKind: 'master_agreement',
      sourceRef: 'msa-9'
    })
    getDocumentState.mockResolvedValue({
      status: 'completed',
      signers: [],
      signedFileUrl: 'https://zapsign/signed.pdf',
      rawPayload: {}
    })
    storeSystemGeneratedPrivateAsset.mockResolvedValue({ assetId: 'asset-signed-1' })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: { get: () => 'application/pdf' }
    } as unknown as Response)

    await invoke({ token: 'tok-2', status: 'signed', signed_file: 'https://zapsign/signed.pdf' })

    expect(fetchSpy).toHaveBeenCalledWith('https://zapsign/signed.pdf', expect.any(Object))
    expect(storeSystemGeneratedPrivateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ ownerAggregateType: 'signature_signed_document', ownerAggregateId: 'sig-2' })
    )
    expect(applyProviderSignatureUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ providerStatus: 'completed', signedDocumentAssetId: 'asset-signed-1' })
    )
  })

  it('falls back to the legacy MSA lane when the aggregate misses', async () => {
    getSignatureRequestByProviderToken.mockResolvedValue(null)
    getMasterAgreementBySignatureDocumentToken.mockResolvedValue({
      msaId: 'msa-1',
      clientId: 'client-1',
      msaNumber: 'MSA-001',
      signedDocumentAssetId: null
    })

    await invoke({ token: 'tok-3', status: 'signed', signers: [{ signed_at: '2026-06-05T10:00:00Z' }] })

    expect(syncMasterAgreementSignature).toHaveBeenCalledWith(
      expect.objectContaining({ msaId: 'msa-1', signatureDocumentToken: 'tok-3', signedAt: '2026-06-05T10:00:00Z' })
    )
    expect(applyProviderSignatureUpdate).not.toHaveBeenCalled()
  })

  it('ignores an unknown document (no aggregate, no MSA)', async () => {
    getSignatureRequestByProviderToken.mockResolvedValue(null)
    getMasterAgreementBySignatureDocumentToken.mockResolvedValue(null)

    await invoke({ token: 'tok-unknown', status: 'signed' })

    expect(applyProviderSignatureUpdate).not.toHaveBeenCalled()
    expect(syncMasterAgreementSignature).not.toHaveBeenCalled()
  })

  it('captures + rethrows so the bus marks the event failed (reconcile recovers)', async () => {
    getSignatureRequestByProviderToken.mockRejectedValue(new Error('pg down'))

    await expect(invoke({ token: 'tok-4', status: 'signed' })).rejects.toThrow(/pg down/)
    expect(captureWithDomain).toHaveBeenCalledWith(expect.any(Error), 'documents', expect.any(Object))
  })
})
