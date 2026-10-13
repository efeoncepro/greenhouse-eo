import 'server-only'

import { PricingV3Error } from '@/lib/finance/pricing-v3/errors'
import { SOURCE_ROLES, identifyArtifact, parseStoredText } from '@/lib/finance/pricing-v3/storage'
import type { ArtifactRef, DocumentRef, PricingV3Storage, StoredText } from '@/lib/finance/pricing-v3/storage'

import { isQuoterError } from './errors'
import { activatePointer, readCurrentPointer } from './pointer-store'
import { addQuoteVersion, createQuote, findVersionByReplayDigest, listQuoteVersionRefs, readQuoteCurrent, readQuoteVersion } from './quote-store'
import { findSourceDocument, storeSourceDocument } from './source-documents-store'
import type { QuoterDbClient } from './db'
import type { QuoterErrorCode } from './errors'
import type { VersionOrigin } from './quote-store'
import type { QuoterActor, QuoterCommandContext, QuoterDataOrigin } from './types'

/**
 * The storage port of Pricing V3 over the quoter registry in PostgreSQL (TASK-2025).
 *
 * The same contract the CLI reaches files through (`PricingV3Storage`), so the engine resolves "current", freezes
 * and reads a quote with the same code on the platform. It passes the same conformance battery as the file and
 * memory adapters (`runStorageConformance`), with two declared differences, both rules of the registry:
 *
 *   - it stores only artifacts that calculated: one that did not is refused with `quote_not_calculated`;
 *   - a pointer enters only when the three documents it names are already held (`CURRENT_VERSIONS_MISMATCH`).
 *
 * It writes NOTHING on its own: every operation goes through the stores (`quote-store.ts`,
 * `source-documents-store.ts`, `pointer-store.ts`), inside the transaction of the client it was built with. It opens
 * no connection. What a write records about who acted comes from the context it was built with, which is the
 * context of ONE governed command.
 *
 * Addresses. This adapter does not address by path: a document is asked for by role with a version or a digest, and
 * an artifact by its replay digest. The `locator` of an artifact is a quote: `<quoteId>` (its last version, or the
 * quote a new version is added to) or `<quoteId>@<n>` (that version). A `locator` on a document is ignored.
 */
export type PostgresStorageContext = {
  actor: QuoterActor
  command: QuoterCommandContext
  /** The canonical organization of Efeonce, resolved by the server (`resolveQuoterOwnerOrganizationId`). */
  ownerOrganizationId: string
  /** Decided by the identity that creates, never by a field of the request. */
  dataOrigin: QuoterDataOrigin
  /** Whether what is written was calculated by the platform or frozen locally and registered afterwards. */
  versionOrigin: VersionOrigin
  reason: string
}

// What a rejection of the registry is called on the port. Everything not listed leaves as it is: a domain rejection
// (`quote_not_calculated`, `human_actor_required`…) or a rejection of the engine, each under its own code.
const PORT_CODES: Partial<Record<QuoterErrorCode, 'OUTPUT_EXISTS' | 'CURRENT_VERSIONS_CONFLICT' | 'CURRENT_VERSIONS_MISMATCH'>> = {
  source_document_exists: 'OUTPUT_EXISTS',
  artifact_already_registered: 'OUTPUT_EXISTS',
  version_conflict: 'OUTPUT_EXISTS',
  pointer_conflict: 'CURRENT_VERSIONS_CONFLICT',
  pointer_names_unknown_document: 'CURRENT_VERSIONS_MISMATCH'
}

const onThePort = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work()
  } catch (error) {
    const code = isQuoterError(error) ? PORT_CODES[error.code] : undefined

    // No detail crosses: the port carries codes, and the detail of the registry names quotes and versions.
    if (code) throw new PricingV3Error(code)

    throw error
  }
}

const ARTIFACT_LOCATOR = /^(qtr-[0-9a-f-]{36})(?:@([1-9][0-9]*))?$/

const parseArtifactLocator = (locator: string | undefined) => {
  if (locator === undefined) return undefined

  const match = ARTIFACT_LOCATOR.exec(locator)

  // An address this adapter does not issue names nothing it holds.
  if (!match) throw new PricingV3Error('INPUT_NOT_FOUND')

  return { quoteId: match[1], versionNumber: match[2] === undefined ? undefined : Number(match[2]) }
}

export function createPostgresStorage(client: QuoterDbClient, context: PostgresStorageContext): PricingV3Storage {
  const write = { actor: context.actor, command: context.command }

  const findDocument = async (ref: DocumentRef): Promise<StoredText | undefined> => {
    if (!SOURCE_ROLES.includes(ref.role) || (ref.version === undefined && ref.digest === undefined)) return undefined

    // Matched by its columns, which were derived from the validated value when it was written. The text is not run
    // through today's validator again: a document stored under an older contract stays readable.
    const stored = await findSourceDocument(client, { role: ref.role, version: ref.version, digest: ref.digest })

    return stored ? { text: stored.text, value: JSON.parse(stored.text) as unknown } : undefined
  }

  const findArtifact = async (ref: ArtifactRef) => {
    const address = parseArtifactLocator(ref.locator)

    if (!address) return ref.replayDigest === undefined ? null : findVersionByReplayDigest(client, { replayDigest: ref.replayDigest })
    if (ref.replayDigest !== undefined && address.versionNumber === undefined)
      return findVersionByReplayDigest(client, { replayDigest: ref.replayDigest, quoteId: address.quoteId })

    const versionNumber = address.versionNumber ?? (await readQuoteCurrent(client, address.quoteId))?.latestVersionNumber

    if (versionNumber === undefined || versionNumber === null) return null

    const version = await readQuoteVersion(client, { quoteId: address.quoteId, versionNumber })

    return version && (ref.replayDigest === undefined || version.replayDigest === ref.replayDigest) ? version : null
  }

  return {
    async readDocument(ref) {
      const stored = await findDocument(ref)

      if (!stored) throw new PricingV3Error('INPUT_NOT_FOUND')

      return stored
    },

    findDocument,

    async writeDocument({ role, text }) {
      // Through the port a document is one applied on the platform. A document read from the repository enters by
      // the importer, which names its file and its commit.
      const stored = await onThePort(() =>
        storeSourceDocument(client, { role, text, origin: 'platform_apply', actor: context.actor, reason: context.reason, command: context.command })
      )

      return { version: stored.version, digest: stored.digest }
    },

    async readPointer() {
      const pointer = await readCurrentPointer(client)

      return pointer ? { text: pointer.text, value: JSON.parse(pointer.text) as unknown } : null
    },

    async replacePointer({ text, confirmDigest }) {
      parseStoredText(text)

      // Through the port the pointer is activated on the platform, which is the act of a person: the store refuses
      // any other actor. Mirroring the pointer of the repository is the importer's, with its commit.
      await onThePort(() =>
        activatePointer(client, { text, confirmDigest, origin: 'platform_activation', actor: context.actor, reason: context.reason, command: context.command })
      )
    },

    async writeArtifact({ text, locator }) {
      const address = parseArtifactLocator(locator)
      const identity = identifyArtifact(parseStoredText(text).value)

      await onThePort(() =>
        address
          ? addQuoteVersion(client, { ...write, quoteId: address.quoteId, artifactText: text, origin: context.versionOrigin, reason: context.reason })
          : createQuote(client, {
              ...write,
              ownerOrganizationId: context.ownerOrganizationId,
              dataOrigin: context.dataOrigin,
              artifactText: text,
              origin: context.versionOrigin,
              reason: context.reason
            })
      )

      return identity
    },

    async readArtifact(ref) {
      const version = await findArtifact(ref)

      if (!version) throw new PricingV3Error('INPUT_NOT_FOUND')

      return { text: version.text, value: version.value }
    },

    async listArtifacts() {
      return (await listQuoteVersionRefs(client)).map(row => ({
        locator: `${row.quoteId}@${row.versionNumber}`,
        artifactVersion: row.artifactVersion
      }))
    }
  }
}
