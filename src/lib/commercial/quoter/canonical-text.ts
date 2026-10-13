import 'server-only'

import { createHash } from 'node:crypto'

import { identifyCurrentSource } from '@/lib/finance/pricing-v3/adapters/current-versions'
import { stableJson } from '@/lib/finance/pricing-v3/adapters/local-snapshot'
import { parseStoredText } from '@/lib/finance/pricing-v3/storage'
import type { CurrentSourceRole } from '@/lib/finance/pricing-v3/adapters/current-versions'

/**
 * The one place of the quoter that computes the digest of a stored text and that produces canonical text.
 *
 * Every stored object carries two digests with different jobs. The digest of the TEXT is the sha256 of the bytes
 * kept; the database checks it on insert. The digest of IDENTITY is the one the engine defines (the digest a pointer
 * names, the replay digest of an artifact); the store computes it when it writes.
 *
 * A source document, an artifact and a pointer are stored as the text that was received: nothing here transforms
 * them. A quote calculated with a document carries that document inside, so only the same bytes give, on the
 * platform, the artifact the CLI gives from the file; `stableJson` sorts keys and that order does not come back.
 * Only the data of a client document is stored canonical, where the two digests are the same one.
 */

/** sha256 of the UTF-8 bytes of a text, in lowercase hex: what `encode(sha256(convert_to(t,'UTF8')),'hex')` gives. */
export const textDigest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')

/**
 * A catalog, policy or credit catalog as it is stored: the text as received, its digest, and the identity its own
 * contract gives it (the version it declares and the digest a pointer names it with). `INPUT_NOT_JSON` when the text
 * is not JSON; the rejection of the contract of its role when it is not a document of that role.
 */
export const identifySourceDocument = (role: CurrentSourceRole, text: string) => {
  const { value } = parseStoredText(text)
  const identity = identifyCurrentSource(role, value)

  return { text, textDigest: textDigest(text), version: identity.version, digest: identity.digest, schemaVersion: schemaVersionOf(value) }
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
