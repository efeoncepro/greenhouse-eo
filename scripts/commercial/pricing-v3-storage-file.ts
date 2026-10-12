import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'

import { PricingV3Error } from '../../src/lib/finance/pricing-v3/errors'
import {
  assertPointerConfirmed,
  deliverArtifact,
  deliverDocument,
  identifyArtifact,
  identifyDocument,
  parseStoredText,
  pointerDigest
} from '../../src/lib/finance/pricing-v3/storage'
import type { PricingV3Storage, StoredText } from '../../src/lib/finance/pricing-v3/storage'

/**
 * The file adapter of the Pricing V3 storage port, and the only place the CLI touches a disk.
 *
 * It is the local mode of `pnpm pricing:v3`: versioned JSON files in the repository, read and written exactly as the
 * CLI always did. It lives under `scripts/` on purpose: no module under `src/` imports it, so nothing that runs on
 * the platform can reach a file system through the engine.
 *
 * A `locator` is a path. A relative one is relative to `root` (the pointer names its sources that way, so it reads
 * the same on every machine); the CLI passes the path of a flag already resolved against its working directory.
 */
export type FileStorageOptions = {
  /** What a relative locator is relative to: the repository root. */
  root: string
  /** The pointer this storage answers for when no other is named. Relative to `root`. */
  pointerPath: string
  /** Folders, relative to `root`, that `listArtifacts` walks for `*.artifact.json`. */
  artifactRoots?: readonly string[]
}

const ARTIFACT_SUFFIX = '.artifact.json'

// Whatever the system says about a missing or unreadable file stays here: the caller learns that it is not there.
const read = (path: string): StoredText => {
  let text: string

  try {
    text = readFileSync(path, 'utf8')
  } catch {
    throw new PricingV3Error('INPUT_NOT_FOUND')
  }

  return parseStoredText(text)
}

// The one writer for everything this tool keeps: exclusive and private, so nothing it freezes is ever overwritten.
const writeExclusive = (path: string, body: string) => {
  try {
    writeFileSync(path, body, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    // Either way the caller fixes the destination; the system reason (missing folder, permissions) is not echoed.
    const exists = (error as NodeJS.ErrnoException).code === 'EEXIST'

    throw new PricingV3Error(exists ? 'OUTPUT_EXISTS' : 'OUTPUT_NOT_WRITABLE')
  }
}

export function createFileStorage({ root, pointerPath, artifactRoots = [] }: FileStorageOptions): PricingV3Storage {
  const locate = (locator: string) => (isAbsolute(locator) ? locator : join(root, locator))

  // A file cannot be addressed by identity alone: without a path there is nothing to read or to write.
  const addressed = (locator: string | undefined, missing: 'INPUT_NOT_FOUND' | 'OUTPUT_NOT_WRITABLE') => {
    if (locator === undefined) throw new PricingV3Error(missing)

    return locate(locator)
  }

  const readIfPossible = (locator: string | undefined) => {
    if (locator === undefined) return undefined

    try {
      return read(locate(locator))
    } catch {
      // A source that is gone or broken is a verdict for whoever asked, not a failure to raise here.
      return undefined
    }
  }

  const pointerAt = (locator: string | undefined) => {
    const path = locate(locator ?? pointerPath)

    return { path, held: existsSync(path) ? read(path) : null }
  }

  // Locators of the artifacts under a folder, relative to `root` and with forward slashes on every system. A root
  // that does not exist yet holds nothing.
  const walk = (dir: string): string[] =>
    existsSync(join(root, dir))
      ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => {
          const path = `${dir}/${entry.name}`

          return entry.isDirectory() ? walk(path) : entry.name.endsWith(ARTIFACT_SUFFIX) ? [path] : []
        })
      : []

  return {
    async readDocument(ref) {
      return deliverDocument(ref, read(addressed(ref.locator, 'INPUT_NOT_FOUND')))
    },

    async findDocument(ref) {
      return readIfPossible(ref.locator)
    },

    async writeDocument({ role, text, locator }) {
      const identity = identifyDocument(role, parseStoredText(text).value)

      writeExclusive(addressed(locator, 'OUTPUT_NOT_WRITABLE'), text)

      return identity
    },

    async readPointer(ref) {
      return pointerAt(ref?.locator).held
    },

    async replacePointer({ text, confirmDigest, locator }) {
      // A text that is not a pointer never becomes one: its own schema rejects it before anything is replaced.
      pointerDigest(parseStoredText(text).value)

      const { path, held } = pointerAt(locator)

      assertPointerConfirmed(held, confirmDigest)

      // The pointer is the one file this tool replaces. A sibling temp file plus rename means a reader sees the old
      // pointer or the new one, never half of either. Not private like the other outputs: it is a tracked file with
      // no amounts.
      const staging = join(dirname(path), `.current.${process.pid}.tmp`)

      try {
        writeFileSync(staging, text, { flag: 'wx', mode: 0o644 })
        renameSync(staging, path)
      } catch {
        rmSync(staging, { force: true })

        throw new PricingV3Error('OUTPUT_NOT_WRITABLE')
      }
    },

    async writeArtifact({ text, locator }) {
      const identity = identifyArtifact(parseStoredText(text).value)

      writeExclusive(addressed(locator, 'OUTPUT_NOT_WRITABLE'), text)

      return identity
    },

    async readArtifact(ref) {
      return deliverArtifact(ref, read(addressed(ref.locator, 'INPUT_NOT_FOUND')))
    },

    async listArtifacts() {
      return artifactRoots
        .flatMap(walk)
        .sort()
        .map(locator => ({
          locator,
          artifactVersion: identifyArtifact(read(locate(locator)).value).artifactVersion
        }))
    }
  }
}

// ── Outside the port ─────────────────────────────────────────────────────────────────────────────────────────────
//
// What a caller hands over for one run (a brief, a demand, a change, the texts of a document) and what a reading
// leaves behind (`--out` of a preview, a split, a schedule, the data of a document) are arguments and outputs of the
// command line, not storage. They are files too, so they are read and written here, with the same two primitives.

/** A JSON file a flag names. Only the flag leaves here: a path or a parser message could quote what is private. */
export const readArgumentFile = (option: string, path: string): unknown => {
  try {
    return read(path).value
  } catch (error) {
    throw error instanceof PricingV3Error ? new PricingV3Error(error.code, { option }) : error
  }
}

/** JSON or text alike, to `--out`: exclusive and private, like everything this tool writes. */
export const writeOutputFile = (path: string, body: string) => {
  try {
    writeExclusive(path, body)
  } catch (error) {
    throw error instanceof PricingV3Error ? new PricingV3Error(error.code, { option: 'out' }) : error
  }
}
