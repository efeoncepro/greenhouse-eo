import 'server-only'

import { createHash } from 'node:crypto'

import { identifyCurrentSource, parseCurrentSource } from '@/lib/finance/pricing-v3/adapters/current-versions'
import { stableJson } from '@/lib/finance/pricing-v3/adapters/local-snapshot'
import type { CurrentSourceRole } from '@/lib/finance/pricing-v3/adapters/current-versions'

/**
 * The one place of the quoter that computes the digest of a stored text and that produces canonical text.
 *
 * Every stored object carries two digests with different jobs. The digest of the TEXT is the sha256 of the bytes
 * kept; the database checks it on insert. The digest of IDENTITY is the one the engine defines (the digest a pointer
 * names, the replay digest of an artifact); the adapter verifies it when it writes and when it reads.
 *
 * A source document and the data of a client document are stored as `stableJson(validated value)`, so the two
 * digests are the same one. An artifact and a pointer are stored as the text that was received: nothing here
 * transforms them, because a frozen quote must read back byte for byte and `stableJson` does not keep key order.
 */

/** sha256 of the UTF-8 bytes of a text, in lowercase hex: what `encode(sha256(convert_to(t,'UTF8')),'hex')` gives. */
export const textDigest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')

/**
 * A catalog, policy or credit catalog as it is stored: the text of the document validated by its own contract.
 * The digest of that text IS the digest the pointer names for it.
 */
export const canonicalSourceDocument = (role: CurrentSourceRole, document: unknown) => {
  const parsed = parseCurrentSource(role, document)
  const text = stableJson(parsed)
  const identity = identifyCurrentSource(role, parsed)

  return { text, version: identity.version, digest: identity.digest, schemaVersion: schemaVersionOf(parsed) }
}

/** The canonical text of a value that is not a source document (the data of a client document, its brief). */
export const canonicalJson = (value: unknown) => {
  const text = stableJson(value)

  return { text, digest: textDigest(text) }
}

const schemaVersionOf = (parsed: unknown): string | null => {
  const declared = (parsed as { schemaVersion?: unknown } | null)?.schemaVersion

  return typeof declared === 'string' ? declared : null
}
