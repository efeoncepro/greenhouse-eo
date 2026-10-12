/**
 * Brings the repository's catalog into the quoter registry (TASK-2025, EPIC-053).
 *
 *   pnpm quoter:import documents --reason "<why>" [--apply]
 *   pnpm quoter:import pointer   --reason "<why>" [--apply]
 *   pnpm quoter:import plan
 *
 * In this phase the repository is the authority over the catalog, the resource policy and the credit catalog; the
 * registry is its mirror by digest. `documents` stores what the registry does not hold and NEVER activates anything;
 * `pointer` is the only thing that changes what is current, and it is a separate act. `plan` reads the repository
 * and git and touches no database.
 *
 * Without `--apply` nothing is written: the command says what it would do. A second run with `--apply` writes
 * nothing. There is ONE database for development, staging and production: `--apply` is a change in production and
 * needs the operator's approval at that moment.
 *
 * Only what is committed AND pushed is imported, and every row names the commit it was read at. A document read
 * from a working copy that later changes would burn its (role, version) forever, in a table nothing is deleted from.
 *
 * Output: one JSON document on stdout, with roles, versions, digests, paths and commits. Never the content.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { identifyCurrentSource } from '../../src/lib/finance/pricing-v3/adapters/current-versions'
import { importSourceDocuments, mirrorRepositoryPointer } from '../../src/lib/commercial/quoter/importer'
import { closeGreenhousePostgres, withGreenhousePostgresTransaction } from '../../src/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import type { ImportCandidate } from '../../src/lib/commercial/quoter/importer'
import type { CurrentSourceRole } from '../../src/lib/finance/pricing-v3/adapters/current-versions'
import type { QuoterActor } from '../../src/lib/commercial/quoter/types'

const DOCUMENT_ROOT = 'data/pricing'
const ARTIFACT_ROOTS = ['data/pricing', 'docs/commercial']
const POINTER = 'data/pricing/v3-operating/current.json'
const ROLES: readonly CurrentSourceRole[] = ['catalog', 'policy', 'credits']
const ACTOR: QuoterActor = { kind: 'service', principalId: 'quoter-import' }

class ImportRefused extends Error {
  constructor(readonly code: string, readonly detail: Record<string, unknown> = {}) {
    super(code)
  }
}

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim()

const walk = (dir: string, suffix: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? walk(path, suffix) : entry.name.endsWith(suffix) ? [path] : []
  })

type Provenance = { path: string; committed: boolean; pushed: boolean; commit: string | null }

const provenanceCache = new Map<string, Provenance>()

// A file is importable when it has no change waiting to be committed and the commit that last touched it is in a
// branch of the remote.
const provenanceOf = (path: string): Provenance => {
  const cached = provenanceCache.get(path)

  if (cached) return cached

  const dirty = git('status', '--porcelain', '--', path) !== ''
  const commit = git('log', '-1', '--format=%H', '--', path) || null
  const pushed = commit !== null && git('branch', '-r', '--contains', commit) !== ''
  const provenance = { path, committed: !dirty && commit !== null, pushed, commit }

  provenanceCache.set(path, provenance)

  return provenance
}

// A JSON file is a source document when the contract of exactly one role accepts it.
const roleOf = (value: unknown): CurrentSourceRole | null => {
  const roles = ROLES.filter(role => {
    try {
      identifyCurrentSource(role, value)

      return true
    } catch {
      return false
    }
  })

  return roles.length === 1 ? roles[0] : null
}

type Found = Omit<ImportCandidate, 'sourceCommitSha'> & { version: string; digest: string }

// Every document of the repository: the files that are one, and the versions that exist only inside a frozen
// artifact. A file wins over an embedded copy of the same version; two contents under one version are left for the
// importer to refuse.
const collect = (): Found[] => {
  const found: Found[] = []
  const versions = new Set<string>()

  const add = (role: CurrentSourceRole, text: string, origin: Found['origin'], sourcePath: string) => {
    const identity = identifyCurrentSource(role, JSON.parse(text))
    const key = `${role}\u0000${identity.version}\u0000${identity.digest}`

    if (versions.has(key)) return

    versions.add(key)
    found.push({ role, text, origin, sourcePath, ...identity })
  }

  for (const path of walk(DOCUMENT_ROOT, '.json').sort()) {
    if (path.endsWith('.artifact.json')) continue

    const text = readFileSync(path, 'utf8')
    let value: unknown

    try {
      value = JSON.parse(text)
    } catch {
      continue
    }

    const role = roleOf(value)

    if (role) add(role, text, 'repo_import', path)
  }

  for (const path of ARTIFACT_ROOTS.flatMap(root => walk(root, '.artifact.json')).sort()) {
    const semantic = (JSON.parse(readFileSync(path, 'utf8')) as { semantic?: Record<string, unknown> }).semantic ?? {}

    for (const role of ROLES) {
      if (semantic[role] === undefined || roleOf(semantic[role]) !== role) continue

      // As the artifact carries it: its own key order, written the way the CLI writes a document.
      add(role, `${JSON.stringify(semantic[role], null, 2)}\n`, 'artifact_embedded', path)
    }
  }

  return found
}

const withProvenance = (found: Found[]) => {
  const entries = found.map(entry => ({ entry, provenance: provenanceOf(entry.sourcePath) }))
  const refused = entries.filter(({ provenance }) => !provenance.committed || !provenance.pushed)

  return { entries, refused }
}

const describe = ({ entry, provenance }: { entry: Found; provenance: Provenance }) => ({
  role: entry.role,
  version: entry.version,
  digest: entry.digest,
  origin: entry.origin,
  sourcePath: entry.sourcePath,
  commit: provenance.commit,
  committed: provenance.committed,
  pushed: provenance.pushed
})

const candidatesOrRefuse = () => {
  const { entries, refused } = withProvenance(collect())

  if (refused.length)
    throw new ImportRefused('NOT_COMMITTED_OR_NOT_PUSHED', { files: [...new Set(refused.map(({ provenance }) => provenance.path))] })

  return entries.map(({ entry, provenance }): ImportCandidate => ({
    role: entry.role,
    text: entry.text,
    origin: entry.origin,
    sourcePath: entry.sourcePath,
    sourceCommitSha: provenance.commit!
  }))
}

const option = (args: string[], name: string) => {
  const index = args.indexOf(name)

  return index >= 0 ? args[index + 1] : undefined
}

const main = async () => {
  const [command = 'plan', ...args] = process.argv.slice(2)
  const apply = args.includes('--apply')
  const reason = option(args, '--reason')

  if (!['plan', 'documents', 'pointer'].includes(command)) throw new ImportRefused('UNKNOWN_COMMAND', { command })

  if (command === 'plan') {
    const { entries, refused } = withProvenance(collect())
    const pointer = provenanceOf(POINTER)

    return { command, documents: entries.map(describe), pointer, importable: refused.length === 0 && pointer.committed && pointer.pushed }
  }

  if (!reason || reason.trim().length < 5) throw new ImportRefused('MISSING_ARGUMENT', { option: '--reason' })

  // As the runtime: the role the platform writes these tables as. If the import works, so do its grants.
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  if (command === 'documents') {
    const candidates = candidatesOrRefuse()
    const result = await withGreenhousePostgresTransaction(client => importSourceDocuments(client, candidates, { apply, actor: ACTOR, reason }))
    const count = (status: string) => result.outcomes.filter(outcome => outcome.status === status).length

    return {
      command,
      mode: apply ? 'apply' : 'simulation',
      applied: result.applied,
      summary: { stored: count('stored'), wouldStore: count('would_store'), alreadyPresent: count('already_present'), conflict: count('conflict') },
      outcomes: result.outcomes
    }
  }

  const provenance = provenanceOf(POINTER)

  if (!provenance.committed || !provenance.pushed) throw new ImportRefused('NOT_COMMITTED_OR_NOT_PUSHED', { files: [POINTER] })

  const text = readFileSync(POINTER, 'utf8')

  const result = await withGreenhousePostgresTransaction(client =>
    mirrorRepositoryPointer(client, { text, sourceCommitSha: provenance.commit!, actor: ACTOR, reason }, { apply })
  )

  return { command, mode: apply ? 'apply' : 'simulation', commit: provenance.commit, ...result }
}

main()
  .then(async output => {
    await closeGreenhousePostgres().catch(() => undefined)
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)

    // A conflict, or a pointer whose documents are not held, is a run that did not do what was asked.
    const failed =
      (output as { summary?: { conflict: number } }).summary?.conflict || (output as { status?: string }).status === 'missing_documents'

    process.exit(failed ? 1 : 0)
  })
  .catch(async error => {
    await closeGreenhousePostgres().catch(() => undefined)

    const refused = error instanceof ImportRefused
    const code = refused ? error.code : ((error as { code?: unknown } | null)?.code ?? 'IMPORT_FAILED')

    // Codes and identifiers only: a database message can quote a row.
    process.stderr.write(`${JSON.stringify({ error: String(code), ...(refused ? error.detail : {}) })}\n`)
    process.exit(1)
  })
