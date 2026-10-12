import { z } from 'zod'

import { CURRENT_SOURCE_ROLES, currentVersionsDigest, identifyCurrentSource } from '../adapters/current-versions'
import { stableJson } from '../adapters/local-snapshot'
import { PricingV3Error, isPricingV3Error } from '../errors'
import type { CurrentSourceRole } from '../adapters/current-versions'
import type { PricingV3ErrorCode } from '../errors'

/**
 * What Pricing V3 needs from the place its documents live, and nothing about that place.
 *
 * Three families and no more: the source documents (catalog, resource policy, credit catalog), the pointer that names
 * the current ones, and the frozen quote artifacts. What a caller hands over for one run (a brief, a demand, a
 * change, the texts of a document) is an argument, not storage, and never crosses this port.
 *
 * One engine, two transports: the CLI reaches files through an adapter of this port and the platform reaches
 * PostgreSQL through another. Every adapter passes the same conformance battery
 * (`__tests__/storage-conformance.ts`), which is what makes them interchangeable.
 *
 * Every operation is asynchronous, because the adapters that are not files cannot be anything else. Calculating,
 * replaying and reading a quote stay synchronous: only the input and output wait.
 *
 * Rejections are the adapter codes already registered (`INPUT_NOT_FOUND`, `INPUT_NOT_JSON`, `OUTPUT_EXISTS`,
 * `OUTPUT_NOT_WRITABLE`, `CURRENT_VERSIONS_CONFLICT`) and carry no detail: the transport that knows which option the
 * caller must correct names it with `namingOption`.
 */
export type SourceRole = CurrentSourceRole

export const SOURCE_ROLES = CURRENT_SOURCE_ROLES

/** What was stored, as it was stored, and the value it parses to. An adapter never re-serializes `text`. */
export type StoredText = { text: string; value: unknown }

export type DocumentIdentity = { version: string; digest: string }

/**
 * Which document. `locator` is the adapter's own address (a path for files, an id for a database); the port never
 * reads it. `version` and `digest` are the identity: when a reference carries one, only that document answers it.
 */
export type DocumentRef = { role: SourceRole; locator?: string } & Partial<DocumentIdentity>

export type ArtifactIdentity = { artifactVersion: string; replayDigest: string; calculationId: string }

export type ArtifactRef = { locator?: string; replayDigest?: string }

export interface PricingV3Storage {
  /**
   * The document the reference names. With an identity in the reference it is that document or `INPUT_NOT_FOUND`,
   * even when the address holds another one: "a document with this identity is not held". Without one it is whatever
   * the address holds (a file the caller named by path). `INPUT_NOT_JSON` when what is there is not JSON.
   */
  readDocument(ref: DocumentRef): Promise<StoredText>

  /**
   * What the address holds, unverified, or `undefined` when nothing readable is there. For the verdicts that need a
   * source even when it is not the one expected: `verifyCurrentVersions` and `resolveCurrentSource` decide, not this.
   */
  findDocument(ref: DocumentRef): Promise<StoredText | undefined>

  /**
   * Stores a new document and returns its identity. Never replaces: a document already held under that identity
   * (role and version) or at that address is `OUTPUT_EXISTS`, whether the content is the same or not.
   */
  writeDocument(input: { role: SourceRole; text: string; locator?: string }): Promise<DocumentIdentity>

  /** The pointer, as stored, or `null` when there is none yet. Its text is opaque: its digest covers every byte. */
  readPointer(ref?: { locator?: string }): Promise<StoredText | null>

  /**
   * Replaces the pointer, all of it or none of it, and only over the pointer the caller read: `confirmDigest` is the
   * digest of the one being replaced, `null` when none is expected to exist. Otherwise `CURRENT_VERSIONS_CONFLICT`.
   */
  replacePointer(input: { text: string; confirmDigest: string | null; locator?: string }): Promise<void>

  /** Stores a frozen artifact, whole. Never replaces: the same address or the same replay digest is `OUTPUT_EXISTS`. */
  writeArtifact(input: { text: string; locator?: string }): Promise<ArtifactIdentity>

  /**
   * The artifact, byte for byte as it was stored. With a replay digest in the reference it is that artifact or
   * `INPUT_NOT_FOUND`. Whether it still reproduces is the verdict of the replay of its lane, not of the port.
   */
  readArtifact(ref: ArtifactRef): Promise<StoredText>

  /** Every artifact held, by its address. */
  listArtifacts(): Promise<{ locator: string; artifactVersion: string }[]>
}

/** The lanes a frozen artifact belongs to; each has its own replay. */
export const ARTIFACT_VERSIONS = [
  'pricing-v3-local-artifact/1',
  'pricing-v3-selection-quote/1',
  'pricing-v3-resource-composition/1'
] as const

// Only the envelope: what the artifact holds is the business of the replay of its lane.
const artifactEnvelopeSchema = z.object({
  artifactVersion: z.enum(ARTIFACT_VERSIONS),
  replayDigest: z.string().regex(/^[a-f0-9]{64}$/),
  calculationId: z.string().min(1).max(200)
})

/**
 * The text of a value whose sha256 is its digest: keys sorted, no whitespace, `undefined` left out. The file adapter
 * keeps the indented text the CLI has always written; an adapter that stores one text per document stores this one.
 */
export const canonicalText = (value: unknown) => stableJson(value)

/** `text` parsed, or `INPUT_NOT_JSON`. Nothing of the parser's message leaves: it can quote the content. */
export const parseStoredText = (text: string): StoredText => {
  try {
    return { text, value: JSON.parse(text) }
  } catch {
    throw new PricingV3Error('INPUT_NOT_JSON')
  }
}

export const identifyDocument = (role: SourceRole, value: unknown): DocumentIdentity =>
  identifyCurrentSource(role, value)

export const identifyArtifact = (value: unknown): ArtifactIdentity => {
  const { artifactVersion, replayDigest, calculationId } = artifactEnvelopeSchema.parse(value)

  return { artifactVersion, replayDigest, calculationId }
}

/** The digest `replacePointer` is confirmed with. A text that is not a pointer is rejected by its own schema. */
export const pointerDigest = (value: unknown) => currentVersionsDigest(value)

// Whether `value` is the document the reference asks for. A reference without an identity asks for whatever is there;
// a value its own contract rejects is no document, so it is never the one asked for.
const holdsIdentity = (ref: DocumentRef, value: unknown) => {
  if (ref.version === undefined && ref.digest === undefined) return true

  let identity: DocumentIdentity

  try {
    identity = identifyDocument(ref.role, value)
  } catch {
    return false
  }

  return (
    (ref.version === undefined || ref.version === identity.version) &&
    (ref.digest === undefined || ref.digest === identity.digest)
  )
}

/** The strict half of `readDocument`, shared by every adapter: the document asked for, or `INPUT_NOT_FOUND`. */
export const deliverDocument = (ref: DocumentRef, stored: StoredText | undefined): StoredText => {
  if (!stored || !holdsIdentity(ref, stored.value)) throw new PricingV3Error('INPUT_NOT_FOUND')

  return stored
}

/** The strict half of `readArtifact`, shared by every adapter. */
export const deliverArtifact = (ref: ArtifactRef, stored: StoredText | undefined): StoredText => {
  if (
    !stored ||
    (ref.replayDigest !== undefined && (stored.value as { replayDigest?: unknown } | null)?.replayDigest !== ref.replayDigest)
  )
    throw new PricingV3Error('INPUT_NOT_FOUND')

  return stored
}

/** The check `replacePointer` makes before it writes: the pointer held is the one the caller confirmed. */
export const assertPointerConfirmed = (held: StoredText | null, confirmDigest: string | null) => {
  if ((held ? pointerDigest(held.value) : null) !== confirmDigest) throw new PricingV3Error('CURRENT_VERSIONS_CONFLICT')
}

const STORAGE_CODES: readonly PricingV3ErrorCode[] = [
  'INPUT_NOT_FOUND',
  'INPUT_NOT_JSON',
  'OUTPUT_EXISTS',
  'OUTPUT_NOT_WRITABLE',
  'CURRENT_VERSIONS_CONFLICT'
]

/**
 * A storage rejection knows what failed, not which option of the caller holds it. The transport does: it runs the
 * operation through here and the rejection leaves naming that option. Anything else passes untouched.
 */
export const namingOption = async <T>(option: string, operation: Promise<T>): Promise<T> => {
  try {
    return await operation
  } catch (error) {
    if (isPricingV3Error(error) && STORAGE_CODES.includes(error.code) && !error.detail.option)
      throw new PricingV3Error(error.code, { ...error.detail, option })

    throw error
  }
}
