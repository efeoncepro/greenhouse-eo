import Module from 'node:module'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

type PatchedModule = typeof Module & {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown
}

type ParsedArgs = {
  spaceId: string | null
  clientId: string | null
  assigneeSourceId: string | null
  year: number
  month: number
  periodField: 'due_date' | 'created_at'
  sampleLimit: number
}

const patchedModule = Module as PatchedModule
const originalLoad = patchedModule._load

patchedModule._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') {
    return {}
  }

  return originalLoad.apply(this, [request, parent, isMain])
}

const parsePositiveInteger = (value: string | undefined, label: string) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: '${value ?? ''}'`)
  }

  return parsed
}

const parseArgs = (): ParsedArgs => {
  const now = new Date()

  const result: ParsedArgs = {
    spaceId: null,
    clientId: null,
    assigneeSourceId: null,
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    periodField: 'due_date',
    sampleLimit: 50
  }

  for (const arg of process.argv.slice(2)) {
    const [flag, value] = arg.split('=')

    if (!flag.startsWith('--') || value === undefined) {
      throw new Error('Usage: pnpm exec tsx scripts/audit-notion-delivery-parity.ts --space-id=<spaceId>|--client-id=<clientId> [--assignee-source-id=<notionUserId>] [--year=2026] [--month=4] [--period-field=due_date|created_at] [--sample-limit=50]')
    }

    switch (flag) {
      case '--space-id':
        result.spaceId = value.trim() || null
        break
      case '--client-id':
        result.clientId = value.trim() || null
        break
      case '--assignee-source-id':
        result.assigneeSourceId = value.trim() || null
        break
      case '--year':
        result.year = parsePositiveInteger(value, 'year')
        break
      case '--month':
        result.month = parsePositiveInteger(value, 'month')
        break
      case '--period-field':
        if (value !== 'due_date' && value !== 'created_at') {
          throw new Error(`Invalid period field '${value}'`)
        }

        result.periodField = value
        break
      case '--sample-limit':
        result.sampleLimit = parsePositiveInteger(value, 'sample limit')
        break
      default:
        throw new Error(`Unknown argument '${flag}'`)
    }
  }

  if (!result.spaceId && !result.clientId) {
    throw new Error('Either --space-id or --client-id is required')
  }

  if (result.month < 1 || result.month > 12) {
    throw new Error(`Invalid month '${result.month}'`)
  }

  return result
}

const resolveSpaceId = async ({
  spaceId,
  clientId
}: Pick<ParsedArgs, 'spaceId' | 'clientId'>) => {
  if (spaceId) {
    return spaceId
  }

  if (!clientId) {
    throw new Error('Missing clientId while resolving spaceId')
  }

  applyGreenhousePostgresProfile('runtime')

  const { getDb } = await import('../src/lib/db')
  const db = await getDb()

  const space = await db
    .selectFrom('greenhouse_core.spaces')
    .select('space_id')
    .where('client_id', '=', clientId)
    .where('active', '=', true)
    .orderBy('created_at', 'asc')
    .executeTakeFirst()

  if (!space) {
    throw new Error(`No active space found for client '${clientId}'`)
  }

  return space.space_id
}

const main = async () => {
  loadGreenhouseToolEnv()

  const args = parseArgs()
  const { auditDeliveryNotionParity } = await import('../src/lib/space-notion/notion-parity-audit')
  const { closeGreenhousePostgres } = await import('../src/lib/postgres/client')

  try {
    const spaceId = await resolveSpaceId(args)

    const result = await auditDeliveryNotionParity({
      spaceId,
      year: args.year,
      month: args.month,
      periodField: args.periodField,
      assigneeSourceId: args.assigneeSourceId,
      sampleLimit: args.sampleLimit
    })

    console.log(`=== Delivery Notion Parity Audit ${result.period.year}-${String(result.period.month).padStart(2, '0')} (${result.periodField}) ===`)
    console.log(`space_id: ${result.spaceId}`)
    console.log(`assignee_source_id: ${result.assigneeSourceId ?? 'all'}`)
    console.log(`raw=${result.summary.rawCount} conformed=${result.summary.conformedCount} matched=${result.summary.matchedCount} diff=${result.summary.diffCount}`)
    console.log(`reference_conformed_synced_at: ${result.conformedSyncedAt ?? 'null'}\n`)
    console.log(JSON.stringify(result, null, 2))

    await closeGreenhousePostgres().catch(() => {})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error('Delivery Notion parity audit failed:', message)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Delivery Notion parity audit failed:', error)
  process.exit(1)
})
