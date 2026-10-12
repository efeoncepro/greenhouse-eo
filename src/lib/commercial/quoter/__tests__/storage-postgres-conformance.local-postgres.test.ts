// The storage conformance battery of Pricing V3, against the PostgreSQL adapter (TASK-2025, Slice 5).
//
// The same battery the file and memory adapters pass (`runStorageConformance`, written by TASK-2024). Passing it is
// what makes this adapter interchangeable with them: the engine resolves "current", freezes and reads a quote over
// the registry with the code it runs over files.
//
// Two declared differences, both rules of a registry of quotes: it holds only artifacts that calculated, and a
// pointer enters only over documents it already holds. The battery tests each of them as a refusal.
//
// Every operation of the port runs in a transaction of its own, as one governed command does. Runs only through
// `pnpm quoter:test:local`. Skipped otherwise, and skipped is not green.
import { afterAll, describe, it } from 'vitest'

import { runStorageConformance } from '@/lib/finance/pricing-v3/__tests__/storage-conformance'
import type { PricingV3Storage } from '@/lib/finance/pricing-v3/storage'

import { resolveQuoterOwnerOrganizationId } from '../authz'
import { createPostgresStorage } from '../storage-postgres'

import { createLocalDatabase, inTransaction, localPgEnabled } from './local-pg'
import type { LocalDatabase } from './local-pg'

const databases: LocalDatabase[] = []

afterAll(async () => {
  await Promise.all(databases.map(database => database.drop()))
})

let commands = 0

const empty = async () => {
  const database = await createLocalDatabase()

  databases.push(database)

  const client = await database.connect('greenhouse_app')

  const storage = createPostgresStorage(client, {
    // A person: through the port the pointer is activated on the platform, which only a person does.
    actor: { kind: 'member', memberId: 'member-local-fixture', principalId: 'user-local-fixture' },
    command: { commandExecutionId: `cmd-conformance-${(commands += 1)}` },
    ownerOrganizationId: await resolveQuoterOwnerOrganizationId(client),
    dataOrigin: 'synthetic',
    versionOrigin: 'local',
    reason: 'Conformance battery of the storage port.'
  })

  // One transaction per operation of the port: all of it or none of it.
  const transactional = Object.fromEntries(
    Object.entries(storage).map(([name, operation]) => [
      name,
      (...args: unknown[]) => inTransaction(client, () => (operation as (...input: unknown[]) => Promise<unknown>)(...args))
    ])
  ) as unknown as PricingV3Storage

  // This adapter does not address by path: a document is asked for by its identity, an artifact by its digest.
  return { storage: transactional, locator: () => undefined }
}

if (localPgEnabled)
  runStorageConformance({
    name: 'PostgreSQL, over the quoter registry (local cluster, as greenhouse_app)',
    empty,
    acceptsOnlyCalculated: true,
    pointerNamesOnlyHeldDocuments: true
  })
else
  describe.skip('Pricing V3 storage conformance: PostgreSQL (needs the local cluster: pnpm quoter:test:local)', () => {
    it('is not run without the local cluster', () => undefined)
  })
