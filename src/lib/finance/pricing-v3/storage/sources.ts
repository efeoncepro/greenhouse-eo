import { currentVersionsSchema, resolveCurrentSource, verifyCurrentVersions } from '../adapters/current-versions'
import { PricingV3Error } from '../errors'
import type { CurrentVersions } from '../adapters/current-versions'

import { namingOption } from './port'
import type { DocumentRef, PricingV3Storage, SourceRole } from './port'

/**
 * "The current sources", resolved over the storage port.
 *
 * The pointer names each source by address, version and digest. A source is used because the pointer said so only
 * once the document found there is the one the pointer vouches for; that verdict is `resolveCurrentSource` and
 * `verifyCurrentVersions`, which this file calls and never repeats. What it adds is where the documents come from:
 * the port, so the CLI over files and a server over a database resolve "current" with the same code.
 *
 * Resolving what is current happens when a quote is calculated, never when one is reproduced: a frozen artifact
 * carries its sources inside.
 */

/** The reference of the document the pointer names for a role: where it should be, and which one it must be. */
export const pointedDocumentRef = (pointer: CurrentVersions, role: SourceRole): DocumentRef => ({
  role,
  locator: pointer[role].path,
  version: pointer[role].version,
  digest: pointer[role].digest
})

/**
 * The pointer as its schema parses it. `option` is how the transport named it to the caller (`--current`, or the
 * `--input` of `current show`): a pointer that is not there, or is not JSON, is reported under that name.
 */
export async function readCurrentVersions(
  storage: PricingV3Storage,
  option: string,
  ref?: { locator?: string }
): Promise<CurrentVersions> {
  const stored = await namingOption(option, storage.readPointer(ref))

  if (!stored) throw new PricingV3Error('INPUT_NOT_FOUND', { option })

  return currentVersionsSchema.parse(stored.value)
}

/**
 * Sources by role, each believed only after it was checked against the pointer. The pointer is read once per
 * resolver: every source of one run is resolved against the same pointer, never against two readings of it.
 */
export function createCurrentSourceResolver(storage: PricingV3Storage, ref?: { locator?: string }) {
  let pointer: CurrentVersions | undefined

  return async (role: SourceRole): Promise<unknown> => {
    pointer ??= await readCurrentVersions(storage, 'current', ref)

    // Tolerant on purpose: a source that is gone or broken is a verdict about the pointer, raised below as one
    // rejection that carries no content, not a failure to read.
    const found = await storage.findDocument(pointedDocumentRef(pointer, role))

    return resolveCurrentSource(pointer, role, found?.value)
  }
}

/** The pointer compared with the documents it names, role by role. Versions and digests only: no source content. */
export async function verifyPointedSources(storage: PricingV3Storage, pointer: CurrentVersions) {
  const found = async (role: SourceRole) => (await storage.findDocument(pointedDocumentRef(pointer, role)))?.value

  return verifyCurrentVersions(pointer, {
    catalog: await found('catalog'),
    policy: await found('policy'),
    credits: await found('credits')
  })
}
