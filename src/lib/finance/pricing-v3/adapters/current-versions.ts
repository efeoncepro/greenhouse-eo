import { ZodError, z } from 'zod'

import { catalogDigest } from './catalog-local'
import { validateCatalog } from '../catalog/catalog'
import { PricingV3Error, isPricingV3Error } from '../errors'
import { compositionPolicySchema } from '../resources/composition-contracts'
import { creditCatalogSchema } from '../resources/credit-budget'

/**
 * Which catalog, resource policy and credit catalog are "the current ones".
 *
 * Every version is an immutable file because frozen quotes depend on the older ones, so "current" cannot be a file
 * name: it is this one pointer, the only mutable document next to them. It names each source by path, version and
 * digest, and is believed only while the three agree with the files — a pointer that drifted is rejected, never
 * followed. Reading and writing stay in the caller; everything here is a function of its arguments.
 */
export const CURRENT_VERSIONS_SCHEMA_VERSION = 'pricing-v3-current/1'

export const CURRENT_SOURCE_ROLES = ['catalog', 'policy', 'credits'] as const

export type CurrentSourceRole = (typeof CURRENT_SOURCE_ROLES)[number]

const sourceSchema = z
  .object({
    // Relative to the repository root, forward slashes, no `.`/`..` segment: a pointer cannot name a file outside it.
    path: z
      .string()
      .max(300)
      .regex(/^(?!.*(?:^|\/)\.{1,2}(?:\/|$))[\w.-]+(?:\/[\w.-]+)*\.json$/),
    version: z.string().min(1).max(80),
    digest: z.string().regex(/^[a-f0-9]{64}$/)
  })
  .strict()

export const currentVersionsSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_VERSIONS_SCHEMA_VERSION),
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().min(1).max(1000),
    catalog: sourceSchema,
    policy: sourceSchema,
    credits: sourceSchema
  })
  .strict()

export type CurrentVersions = z.infer<typeof currentVersionsSchema>

// The same parsers the commands apply, so a digest here equals `catalog validate` and `resources inspect`.
const parsers: Record<CurrentSourceRole, (raw: unknown) => { version: string }> = {
  catalog: raw => validateCatalog(raw),
  policy: raw => compositionPolicySchema.parse(raw),
  credits: raw => creditCatalogSchema.parse(raw)
}

const identify = (role: CurrentSourceRole, document: unknown) => {
  const parsed = parsers[role](document)

  return { version: parsed.version, digest: catalogDigest(parsed) }
}

/** Optimistic lock for replacing the pointer: the caller confirms the digest of the one it read. */
export const currentVersionsDigest = (pointer: unknown) => catalogDigest(currentVersionsSchema.parse(pointer))

export type CurrentSourceStatus = 'match' | 'version_mismatch' | 'digest_mismatch' | 'invalid' | 'unreadable'

function verifySource(pointer: CurrentVersions, role: CurrentSourceRole, document: unknown) {
  const { path, ...expected } = pointer[role]
  let found: ReturnType<typeof identify> | null = null
  let status: CurrentSourceStatus = 'unreadable'

  if (document !== undefined) {
    try {
      found = identify(role, document)
      status =
        found.version !== expected.version
          ? 'version_mismatch'
          : found.digest !== expected.digest
            ? 'digest_mismatch'
            : 'match'
    } catch (error) {
      // A source its own parser rejects is a verdict about the pointer; anything else is not ours to absorb.
      if (!(error instanceof ZodError) && !isPricingV3Error(error)) throw error
      status = 'invalid'
    }
  }

  // What the pointer expected is the pointer itself; only what the file turned out to be is news.
  return { path, status, found }
}

/**
 * Compares the pointer with the documents it names. A role without a document (`undefined`: the caller could not
 * read it) is reported as `unreadable`. Versions and digests are the only things reported: no source content.
 */
export function verifyCurrentVersions(pointerRaw: unknown, documents: Partial<Record<CurrentSourceRole, unknown>>) {
  const pointer = currentVersionsSchema.parse(pointerRaw)

  const sources = {
    catalog: verifySource(pointer, 'catalog', documents.catalog),
    policy: verifySource(pointer, 'policy', documents.policy),
    credits: verifySource(pointer, 'credits', documents.credits)
  }

  return { consistent: CURRENT_SOURCE_ROLES.every(role => sources[role].status === 'match'), sources }
}

/**
 * The gate a consumer crosses before using a source because the pointer said so. It returns the very document it
 * checked, so what was verified is what gets used; any disagreement is one rejection that carries no content.
 */
export function resolveCurrentSource(pointerRaw: unknown, role: CurrentSourceRole, document: unknown) {
  const pointer = currentVersionsSchema.parse(pointerRaw)

  if (verifySource(pointer, role, document).status !== 'match')
    throw new PricingV3Error('CURRENT_VERSIONS_MISMATCH', { option: 'current' })

  return document
}

/** Builds the pointer from the three documents themselves, so it cannot name a version or digest nobody computed. */
export function buildCurrentVersions(input: {
  paths: Record<CurrentSourceRole, string>
  documents: Record<CurrentSourceRole, unknown>
  reason: string
  updatedAt: string
}): CurrentVersions {
  const source = (role: CurrentSourceRole) => ({ path: input.paths[role], ...identify(role, input.documents[role]) })

  return currentVersionsSchema.parse({
    schemaVersion: CURRENT_VERSIONS_SCHEMA_VERSION,
    updatedAt: input.updatedAt,
    reason: input.reason,
    catalog: source('catalog'),
    policy: source('policy'),
    credits: source('credits')
  })
}
