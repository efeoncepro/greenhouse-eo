import type { FirstPartyStore, FirstPartyClient, FirstPartyCode, FirstPartyAccessHandle, FirstPartyLoginTransaction } from './types'

/** Deterministic protocol harness, never used by the production runtime. */
export class MemoryFirstPartyStore implements FirstPartyStore {
  readonly registrationAudit: { clientId: string; actor: string; product: string }[] = []
  readonly clients = new Map<string, FirstPartyClient>()
  readonly codes = new Map<string, FirstPartyCode>()
  readonly handles = new Map<string, FirstPartyAccessHandle>()
  readonly transactions = new Map<string, FirstPartyLoginTransaction>()
  async insertLoginTransaction(transaction: FirstPartyLoginTransaction) { this.transactions.set(transaction.transactionHash, transaction) }
  async getLoginTransaction(hash: string) { return this.transactions.get(hash) ?? null }
  async consumeLoginTransaction(hash: string, now: Date) {
    const tx = this.transactions.get(hash)

    if (!tx || tx.consumedAt || tx.expiresAt <= now) return false
    tx.consumedAt = now

    return true
  }
  async getClient(id: string) { return this.clients.get(id) ?? null }
  async insertClient(client: FirstPartyClient) {
    if (this.clients.has(client.clientId)) return false
    this.clients.set(client.clientId, client)
    this.registrationAudit.push({ clientId: client.clientId, actor: client.createdBy, product: client.product })

    return true
  }
  async insertCode(code: FirstPartyCode) {
    if (this.codes.has(code.codeHash)) throw new Error('duplicate_first_party_code')
    this.codes.set(code.codeHash, code)
  }
  async consumeCode(hash: string, clientId: string, now: Date) {
    const code = this.codes.get(hash)

    if (!code || code.clientId !== clientId) return null

    if (code.consumedAt) { code.invalidatedAt ??= now;

return { status: 'reused' as const, code } }

    if (code.expiresAt <= now) return { status: 'expired' as const, code }
    code.consumedAt = now

    return { status: 'consumed' as const, code }
  }
  async insertAccessHandle(handle: FirstPartyAccessHandle) {
    const code = this.codes.get(handle.codeHash)

    if (!code?.consumedAt || code.invalidatedAt) return false
    this.handles.set(handle.tokenHash, handle)

    return true
  }
  async getAccessHandle(hash: string) { return this.handles.get(hash) ?? null }
  async revokeAccessHandle(hash: string, clientId: string, now: Date) {
    const handle = this.handles.get(hash)

    if (handle?.clientId === clientId) handle.revokedAt ??= now
  }
  async revokeCodeHandles(codeHash: string, now: Date) {
    for (const handle of this.handles.values()) if (handle.codeHash === codeHash) handle.revokedAt ??= now
  }
}
