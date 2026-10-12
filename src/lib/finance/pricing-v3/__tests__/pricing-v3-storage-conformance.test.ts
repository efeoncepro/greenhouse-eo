// Runs the storage conformance battery against every adapter this repository has (TASK-2024, EPIC-053).
// The battery itself, and what each case proves, live in `storage-conformance.ts`.
import { createMemoryStorage } from '../storage'

import { runStorageConformance } from './storage-conformance'

runStorageConformance({
  name: 'memory',
  // The address is a second name for the entry: the repository path, as the pointer names it.
  empty: () => ({ storage: createMemoryStorage(), locator: path => path })
})
