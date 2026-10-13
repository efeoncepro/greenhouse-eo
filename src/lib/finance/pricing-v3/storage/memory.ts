import { PricingV3Error } from '../errors'

import {
  assertPointerConfirmed,
  deliverArtifact,
  deliverDocument,
  identifyArtifact,
  identifyDocument,
  parseStoredText,
  pointerDigest
} from './port'
import type { ArtifactRef, DocumentRef, PricingV3Storage, SourceRole, StoredText } from './port'

/**
 * The port with nothing underneath: documents, pointers and artifacts held in memory for the life of the object.
 *
 * It exists for two reasons. It is the second client of the contract, so the contract cannot quietly take the shape
 * of a file system; and it is how the whole path (pointer, sources, calculation, frozen artifact, reading) is proven
 * to run where there is no disk. It is seeded through the port itself, like any other adapter is written to.
 *
 * A document is held under its role and version, an artifact under its replay digest; a `locator`, when the caller
 * gives one, is a second name for the same entry.
 */
export function createMemoryStorage(): PricingV3Storage {
  const documents = new Map<string, StoredText>()
  const documentLocators = new Map<string, string>()
  const artifacts = new Map<string, StoredText>()
  const artifactLocators = new Map<string, string>()
  const pointers = new Map<string, StoredText>()

  const documentKey = (role: SourceRole, version: string) => `${role}\u0000${version}`

  const findDocument = (ref: DocumentRef) => {
    const byLocator = ref.locator === undefined ? undefined : documentLocators.get(ref.locator)

    return documents.get(
      byLocator ?? (ref.version === undefined ? '' : documentKey(ref.role, ref.version))
    )
  }

  const findArtifact = (ref: ArtifactRef) => {
    const byLocator = ref.locator === undefined ? undefined : artifactLocators.get(ref.locator)

    return artifacts.get(byLocator ?? ref.replayDigest ?? '')
  }

  return {
    async readDocument(ref) {
      return deliverDocument(ref, findDocument(ref))
    },

    async findDocument(ref) {
      return findDocument(ref)
    },

    async writeDocument({ role, text, locator }) {
      const stored = parseStoredText(text)
      const identity = identifyDocument(role, stored.value)
      const key = documentKey(role, identity.version)

      if (documents.has(key) || (locator !== undefined && documentLocators.has(locator)))
        throw new PricingV3Error('OUTPUT_EXISTS')

      documents.set(key, stored)
      if (locator !== undefined) documentLocators.set(locator, key)

      return identity
    },

    async readPointer(ref) {
      return pointers.get(ref?.locator ?? '') ?? null
    },

    async replacePointer({ text, confirmDigest, locator }) {
      const next = parseStoredText(text)

      // A text that is not a pointer never becomes one: its own schema rejects it before anything is replaced.
      pointerDigest(next.value)
      assertPointerConfirmed(pointers.get(locator ?? '') ?? null, confirmDigest)
      pointers.set(locator ?? '', next)
    },

    async writeArtifact({ text, locator }) {
      const stored = parseStoredText(text)
      const identity = identifyArtifact(stored.value)

      if (artifacts.has(identity.replayDigest) || (locator !== undefined && artifactLocators.has(locator)))
        throw new PricingV3Error('OUTPUT_EXISTS')

      artifacts.set(identity.replayDigest, stored)
      if (locator !== undefined) artifactLocators.set(locator, identity.replayDigest)

      return identity
    },

    async readArtifact(ref) {
      return deliverArtifact(ref, findArtifact(ref))
    },

    async listArtifacts() {
      const named = new Map([...artifactLocators].map(([locator, key]) => [key, locator]))

      return [...artifacts].map(([key, stored]) => ({
        locator: named.get(key) ?? key,
        artifactVersion: identifyArtifact(stored.value).artifactVersion
      }))
    }
  }
}
