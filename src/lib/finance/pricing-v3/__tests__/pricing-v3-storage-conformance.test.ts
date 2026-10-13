// Runs the storage conformance battery against every adapter this repository has (TASK-2024, EPIC-053).
// The battery itself, and what each case proves, live in `storage-conformance.ts`.
//
// Three subjects: the file adapter over the repository itself (the local mode of the CLI, as it is used), the same
// adapter over an empty folder that the battery fills through the port, and the in-memory adapter. The file adapter
// lives under `scripts/` because nothing under `src/` may reach a disk through the engine; a test may.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterAll } from 'vitest'

import { createFileStorage } from '../../../../../scripts/commercial/pricing-v3-storage-file'
import { createMemoryStorage } from '../storage'

import { runStorageConformance } from './storage-conformance'
import type { StorageUnderTest } from './storage-conformance'

const POINTER = 'data/pricing/v3-operating/current.json'
const ARTIFACT_ROOTS = ['data/pricing', 'docs/commercial']

const folders: string[] = []

afterAll(() => folders.forEach(folder => rmSync(folder, { recursive: true, force: true })))

// The file adapter never creates a folder: a destination that does not exist is OUTPUT_NOT_WRITABLE, as in the CLI.
// The folder of each address is made here, by the test, before the port is asked to write there.
const emptyFolder = (): StorageUnderTest => {
  const root = mkdtempSync(join(tmpdir(), 'pricing-v3-storage-conformance-'))

  folders.push(root)
  mkdirSync(join(root, dirname(POINTER)), { recursive: true })

  return {
    storage: createFileStorage({ root, pointerPath: POINTER, artifactRoots: ARTIFACT_ROOTS }),
    locator: path => {
      mkdirSync(join(root, dirname(path)), { recursive: true })

      return path
    }
  }
}

runStorageConformance({
  name: 'files, over the repository',
  corpus: () => ({
    storage: createFileStorage({ root: resolve('.'), pointerPath: POINTER, artifactRoots: ARTIFACT_ROOTS }),
    locator: path => path
  }),
  empty: emptyFolder
})

runStorageConformance({ name: 'files, over a folder filled through the port', empty: emptyFolder })

runStorageConformance({
  name: 'memory',
  // The address is a second name for the entry: the repository path, as the pointer names it.
  empty: () => ({ storage: createMemoryStorage(), locator: path => path })
})
