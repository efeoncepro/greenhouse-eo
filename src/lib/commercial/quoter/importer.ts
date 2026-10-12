import 'server-only'

import { currentVersionsDigest, currentVersionsSchema } from '@/lib/finance/pricing-v3/adapters/current-versions'
import type { CurrentSourceRole } from '@/lib/finance/pricing-v3/adapters/current-versions'

import { identifySourceDocument } from './canonical-text'
import { activatePointer, readCurrentPointer } from './pointer-store'
import { findSourceDocument, storeSourceDocument } from './source-documents-store'
import type { QuoterDbClient } from './db'
import type { QuoterActor } from './types'

/**
 * Bringing the repository's catalog into the registry (TASK-2025).
 *
 * In this phase the repository is still the authority over the catalog, the resource policy and the credit catalog;
 * the database is its mirror by digest. This file holds the part of the importer that talks to the registry and
 * nothing that touches a disk or git: what to import, read from where, and at which commit, is handed in as
 * candidates by `scripts/commercial/quoter-import.ts`.
 *
 * Two acts, kept apart on purpose: storing documents, which never activates anything, and mirroring the pointer,
 * which is the only thing that changes what is current. Both are idempotent: a second run writes nothing.
 * Nothing is ever replaced: a version already held with another content stops the import before it writes.
 */
export type ImportCandidate = {
  role: CurrentSourceRole
  /** The document exactly as it is in the repository (or as its artifact carries it). */
  text: string
  /** `repo_import`: a file of its own. `artifact_embedded`: it exists only inside a frozen artifact. */
  origin: 'repo_import' | 'artifact_embedded'
  /** The file it was read from, and the commit that file was read at. */
  sourcePath: string
  sourceCommitSha: string
}

export type ImportStatus = 'stored' | 'would_store' | 'already_present' | 'conflict'

export type ImportOutcome = {
  role: CurrentSourceRole
  version: string
  digest: string
  origin: ImportCandidate['origin']
  sourcePath: string
  status: ImportStatus
  /** Why it is a conflict: the same version with another content, in the registry or among the candidates. */
  conflictWith?: 'registry' | 'candidates'
}

export type ImportResult = { applied: boolean; outcomes: ImportOutcome[] }

/**
 * Stores the candidates the registry does not hold, in the transaction of `client`.
 *
 * With `apply: false` nothing is written and what would be is reported. A conflict anywhere (a version already
 * held, or offered twice, with another content) leaves `applied: false` and writes nothing at all: an import is all
 * of it or none of it. The output carries roles, versions, digests and paths; never the content of a document.
 */
export const importSourceDocuments = async (
  client: QuoterDbClient,
  candidates: ImportCandidate[],
  options: { apply: boolean; actor: QuoterActor; reason: string }
): Promise<ImportResult> => {
  const offered = new Map<string, string>()
  const planned: { candidate: ImportCandidate; outcome: ImportOutcome }[] = []

  for (const candidate of candidates) {
    const identified = identifySourceDocument(candidate.role, candidate.text)
    const key = `${candidate.role}\u0000${identified.version}`
    const base = { role: candidate.role, version: identified.version, digest: identified.digest, origin: candidate.origin, sourcePath: candidate.sourcePath }
    const before = offered.get(key)

    if (before !== undefined) {
      // The same version twice in one run: the same document found in two places is not offered twice; another
      // content under the same version is a conflict.
      if (before !== identified.digest) planned.push({ candidate, outcome: { ...base, status: 'conflict', conflictWith: 'candidates' } })

      continue
    }

    offered.set(key, identified.digest)

    const held = await findSourceDocument(client, { role: candidate.role, version: identified.version })

    planned.push({
      candidate,
      outcome: !held
        ? { ...base, status: 'would_store' }
        : held.digest === identified.digest
          ? { ...base, status: 'already_present' }
          : { ...base, status: 'conflict', conflictWith: 'registry' }
    })
  }

  const conflict = planned.some(({ outcome }) => outcome.status === 'conflict')

  if (!options.apply || conflict) return { applied: false, outcomes: planned.map(({ outcome }) => outcome) }

  for (const { candidate, outcome } of planned) {
    if (outcome.status !== 'would_store') continue

    await storeSourceDocument(client, {
      role: candidate.role,
      text: candidate.text,
      origin: candidate.origin,
      sourcePath: candidate.sourcePath,
      sourceCommitSha: candidate.sourceCommitSha,
      actor: options.actor,
      reason: options.reason
    })
    outcome.status = 'stored'
  }

  return { applied: true, outcomes: planned.map(({ outcome }) => outcome) }
}

export type PointerMirrorStatus = 'activated' | 'would_activate' | 'already_current' | 'missing_documents'

export type PointerMirrorResult = {
  status: PointerMirrorStatus
  pointerDigest: string
  previousPointerDigest: string | null
  /** The roles whose document the registry does not hold yet. Import the documents first. */
  missing: CurrentSourceRole[]
}

/**
 * Makes the pointer of the registry the pointer of the repository, in the transaction of `client`.
 *
 * Not the act of a person: the person decided when the file was committed, and the row names that commit. It enters
 * over whatever pointer the registry holds at that moment, read under the same lock that writes it. A pointer that
 * is already the one in force is left alone, and one that names a document not held yet is not attempted.
 */
export const mirrorRepositoryPointer = async (
  client: QuoterDbClient,
  input: { text: string; sourceCommitSha: string; actor: QuoterActor; reason: string },
  options: { apply: boolean }
): Promise<PointerMirrorResult> => {
  const pointer = currentVersionsSchema.parse(JSON.parse(input.text))
  const pointerDigest = currentVersionsDigest(pointer)
  const inForce = await readCurrentPointer(client)
  const base = { pointerDigest, previousPointerDigest: inForce?.digest ?? null }

  if (inForce?.digest === pointerDigest) return { ...base, status: 'already_current', missing: [] }

  const missing: CurrentSourceRole[] = []

  for (const role of ['catalog', 'policy', 'credits'] as const)
    if (!(await findSourceDocument(client, { role, digest: pointer[role].digest }))) missing.push(role)

  if (missing.length) return { ...base, status: 'missing_documents', missing }
  if (!options.apply) return { ...base, status: 'would_activate', missing }

  await activatePointer(client, {
    text: input.text,
    confirmDigest: inForce?.digest ?? null,
    origin: 'repo_mirror',
    actor: input.actor,
    sourceCommitSha: input.sourceCommitSha,
    reason: input.reason
  })

  return { ...base, status: 'activated', missing }
}
