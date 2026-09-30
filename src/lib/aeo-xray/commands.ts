import 'server-only'
import { resolveAeoXrayIntent } from '@/lib/axis/aeo-xray/aeo-xray'
import { xrayStore, type XrayStore } from './store'
import { XrayError, type XrayAuthority } from './types'
import { digestXrayToken, generateXrayToken, xrayContentHash, xrayShareUrl } from './token'

const uuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

const revision = (v: unknown): v is number => Number.isInteger(v) && Number(v) > 0
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max

const guard = (valid: unknown) => {
  if (!valid) throw new XrayError('invalid_input', 400)
}

const authority = (a: XrayAuthority) => guard(text(a.organizationId, 200) && text(a.actorUserId, 200))

export function validateXrayIntent(intent: unknown) {
  guard(Buffer.byteLength(JSON.stringify(intent) ?? '') <= 1900000)
  const resolved = resolveAeoXrayIntent(intent)

  if (resolved.status !== 'resolved') throw new XrayError('invalid_input', 400)

  return resolved
}

export function createXrayCommands(
  store: XrayStore,
  assertAssets = async (a: XrayAuthority, caseId: string, manifest: ReturnType<typeof validateXrayIntent>) => {
    if (manifest.assets.length > 0) {
      const { assertXrayAssets } = await import('./assets')

      await assertXrayAssets(a, caseId, manifest)
    }
  }
) {
  return {
    async createXrayCase(a: XrayAuthority, input: { title: string; prospectReference: string; intent: unknown }) {
      authority(a)
      guard(text(input.title, 200) && text(input.prospectReference, 200))
      validateXrayIntent(input.intent)

      return store.transaction(a, async s => {
        const c = await s.insertCase(input.title.trim(), input.prospectReference.trim())

        await s.writeDraft(c.caseId, 1, input.intent)
        await s.event(c.caseId, 'case_created', c.caseId)

        return { ...c, draft: { caseId: c.caseId, revision: 1, intent: input.intent } }
      })
    },
    async listXrayCases(a: XrayAuthority) {
      authority(a)

      return store.transaction(a, s => s.listCases())
    },
    async readXrayCase(a: XrayAuthority, caseId: string) {
      authority(a)
      guard(uuid(caseId))

      return store.transaction(a, async s => {
        const c = await s.findCase(caseId)

        if (!c) throw new XrayError('not_found', 404)

        return { ...c, draft: await s.draft(caseId) }
      })
    },
    async updateXrayDraft(a: XrayAuthority, caseId: string, input: { expectedRevision: number; intent: unknown }) {
      authority(a)
      guard(uuid(caseId) && revision(input.expectedRevision))
      validateXrayIntent(input.intent)

      return store.transaction(a, async s => {
        if (!(await s.findCase(caseId))) throw new XrayError('not_found', 404)
        const d = await s.draft(caseId)

        if (!d) throw new XrayError('not_found', 404)
        if (d.revision !== input.expectedRevision) throw new XrayError('revision_conflict', 409)
        await s.writeDraft(caseId, d.revision + 1, input.intent)
        await s.event(caseId, 'draft_updated', caseId)

        return { caseId, revision: d.revision + 1, intent: input.intent }
      })
    },
    async issueXrayEdition(
      a: XrayAuthority,
      caseId: string,
      input: { expectedRevision: number; idempotencyKey: string }
    ) {
      authority(a)
      guard(
        uuid(caseId) &&
          revision(input.expectedRevision) &&
          text(input.idempotencyKey, 200) &&
          input.idempotencyKey.length >= 8
      )

      return store.transaction(a, async s => {
        if (!(await s.findCase(caseId))) throw new XrayError('not_found', 404)
        const existing = await s.findEdition(caseId, input.idempotencyKey, input.expectedRevision)

        if (existing) {
          if (existing.draftRevision !== input.expectedRevision || existing.idempotencyKey !== input.idempotencyKey)
            throw new XrayError('idempotency_conflict', 409)

          return { edition: existing, idempotent: true }
        }

        const d = await s.draft(caseId)

        if (!d) throw new XrayError('not_found', 404)
        if (d.revision !== input.expectedRevision) throw new XrayError('revision_conflict', 409)
        const manifest = validateXrayIntent(d.intent)

        if (manifest.artifacts.some(artifact => !artifact.experience)) throw new XrayError('not_ready', 409)

        await assertAssets(a, caseId, manifest)
        const e = await s.insertEdition(caseId, d.revision, input.idempotencyKey, manifest, xrayContentHash(manifest))

        await s.event(caseId, 'edition_issued', e.editionId)

        return { edition: e, idempotent: false }
      })
    },
    async withdrawXrayEdition(a: XrayAuthority, editionId: string) {
      authority(a)
      guard(uuid(editionId))

      return store.transaction(a, async s => {
        const e = await s.edition(editionId)

        if (!e) throw new XrayError('not_found', 404)

        if (!e.withdrawnAt) {
          await s.withdraw(editionId)
          await s.event(e.caseId, 'edition_withdrawn', editionId)
        }

        return { editionId, withdrawn: true }
      })
    },
    async createXrayShare(a: XrayAuthority, editionId: string, input: { expiresInDays?: number; label?: string } = {}) {
      authority(a)
      guard(uuid(editionId))
      const days = input.expiresInDays ?? 30

      guard(Number.isInteger(days) && days >= 1 && days <= 90)
      guard(input.label === undefined || text(input.label, 120))

      return store.transaction(a, async s => {
        const e = await s.edition(editionId)

        if (!e) throw new XrayError('not_found', 404)
        if (e.withdrawnAt) throw new XrayError('not_ready', 409)
        const grants = await s.grants(editionId)

        if (grants.filter(g => !g.revokedAt && Date.parse(g.expiresAt) > Date.now()).length >= 20)
          throw new XrayError('quota_exceeded', 429)
        const token = generateXrayToken()
        const grant = await s.insertGrant(editionId, digestXrayToken(token), days, input.label?.trim() ?? null)

        await s.event(e.caseId, 'share_created', grant.grantId)

        return { grant, token, url: xrayShareUrl(token) }
      })
    },
    async listXrayShares(a: XrayAuthority, editionId: string) {
      authority(a)
      guard(uuid(editionId))

      return store.transaction(a, async s => {
        if (!(await s.edition(editionId))) throw new XrayError('not_found', 404)

        return s.grants(editionId)
      })
    },
    async revokeXrayShare(a: XrayAuthority, grantId: string) {
      authority(a)
      guard(uuid(grantId))

      return store.transaction(a, async s => {
        const g = await s.grant(grantId)

        if (!g) throw new XrayError('not_found', 404)
        const e = await s.edition(g.editionId)

        if (!e) throw new XrayError('not_found', 404)

        if (!g.revokedAt) {
          await s.revoke(grantId)
          await s.event(e.caseId, 'share_revoked', grantId)
        }

        return { grantId, revoked: true }
      })
    }
  }
}

export const {
  createXrayCase,
  listXrayCases,
  readXrayCase,
  updateXrayDraft,
  issueXrayEdition,
  withdrawXrayEdition,
  createXrayShare,
  listXrayShares,
  revokeXrayShare
} = createXrayCommands(xrayStore)
