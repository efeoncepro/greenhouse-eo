/* eslint-disable no-console */

import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STAGING_REQUEST_SCRIPT = resolve(PROJECT_ROOT, 'scripts/staging-request.mjs')
const ENV_LOCAL_PATH = resolve(PROJECT_ROOT, '.env.local')

const DEFAULT_RECONCILE_BASE_URL =
  'https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app'

const DEFAULT_TIMEOUT_MS = 180_000
const DEFAULT_INTERVAL_MS = 10_000
const DEFAULT_PAGE_LIMIT = 100
const ANTI_PING_PONG_SETTLE_MS = 65_000

interface SellableRoleResponse {
  roleId: string
  roleSku: string
  roleLabelEs: string
  notes: string | null
}

interface ReconcileProductItem {
  hubspotProductId: string
  gh_product_code: string | null
  gh_source_kind: string | null
  gh_last_write_at: string | null
  name: string | null
  sku: string | null
  price: number | null
  description: string | null
  isArchived: boolean
}

interface ReconcileProductsResponse {
  status: 'ok' | 'endpoint_not_deployed'
  items: ReconcileProductItem[]
  nextCursor?: string | null
  message?: string
}

interface ScriptOptions {
  keepRole: boolean
  timeoutMs: number
  intervalMs: number
  suffix: string
}

interface OutboxPublishResponse {
  runId: string
  eventsRead: number
  eventsPublished: number
  eventsFailed: number
  durationMs: number
}

interface ReactiveRunResponse {
  runId: string
  eventsProcessed: number
  eventsFailed: number
  projectionsTriggered: number
  actions?: string[]
}

const sleep = (ms: number) => new Promise(resolvePromise => setTimeout(resolvePromise, ms))

const waitForAntiPingPongWindow = async (label: string) => {
  console.log(`[wait] respecting anti-ping-pong window before ${label} (${ANTI_PING_PONG_SETTLE_MS}ms)`)
  await sleep(ANTI_PING_PONG_SETTLE_MS)
}

const parseEnvFile = (content: string) => {
  const vars: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')

    if (eqIdx === -1) continue
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  }

  return vars
}

const readEnvLocal = async () => {
  try {
    return parseEnvFile(await readFile(ENV_LOCAL_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const normalizeBaseUrl = (value: string | undefined | null) =>
  (value?.trim() || DEFAULT_RECONCILE_BASE_URL).replace(/\/+$/, '')

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const parseArgs = (): ScriptOptions => {
  const args = process.argv.slice(2)

  const options: ScriptOptions = {
    keepRole: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    intervalMs: DEFAULT_INTERVAL_MS,
    suffix: new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '--keep-role') {
      options.keepRole = true
      continue
    }

    if (arg === '--timeout-ms') {
      options.timeoutMs = parsePositiveInt(args[i + 1], options.timeoutMs)
      i += 1
      continue
    }

    if (arg === '--interval-ms') {
      options.intervalMs = parsePositiveInt(args[i + 1], options.intervalMs)
      i += 1
      continue
    }

    if (arg === '--suffix' && args[i + 1]) {
      options.suffix = args[i + 1]
      i += 1
    }
  }

  return options
}

const runStagingRequest = async <T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> => {
  const args = [STAGING_REQUEST_SCRIPT, method, path]

  if (body) {
    args.push(JSON.stringify(body))
  }

  const { stdout, stderr } = await execFileAsync('node', args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    maxBuffer: 1024 * 1024 * 4
  })

  if (stderr.trim().length > 0) {
    process.stderr.write(stderr)
  }

  const trimmed = stdout.trim()

  if (!trimmed) {
    return null as T
  }

  return JSON.parse(trimmed) as T
}

const deleteRoleViaStaging = async (roleId: string) => {
  await execFileAsync('node', [STAGING_REQUEST_SCRIPT, 'DELETE', `/api/admin/pricing-catalog/roles/${roleId}`], {
    cwd: PROJECT_ROOT,
    env: process.env,
    maxBuffer: 1024 * 1024 * 4
  })
}

const drainProductSyncPipelines = async (cycles = 2) => {
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const publishResult = await runStagingRequest<OutboxPublishResponse>(
      'POST',
      '/api/admin/ops/outbox/publish',
      {}
    )

    const reactiveResult = await runStagingRequest<ReactiveRunResponse>(
      'POST',
      '/api/admin/ops/reactive/run',
      {}
    )

    console.log(
      `[drain] cycle ${cycle + 1}/${cycles} publish=${publishResult.eventsPublished}/${publishResult.eventsRead} reactive=${reactiveResult.eventsProcessed} projections=${reactiveResult.projectionsTriggered}`
    )
  }
}

const fetchReconcilePage = async (
  baseUrl: string,
  cursor?: string | null
): Promise<ReconcileProductsResponse> => {
  const url = new URL('/products/reconcile', `${baseUrl}/`)

  url.searchParams.set('includeArchived', 'true')
  url.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT))

  if (cursor) {
    url.searchParams.set('cursor', cursor)
  }

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000)
  })

  if (!response.ok) {
    throw new Error(
      `HubSpot reconcile returned ${response.status}: ${await response.text()}`
    )
  }

  return (await response.json()) as ReconcileProductsResponse
}

const findProductByCode = async (
  baseUrl: string,
  productCode: string
): Promise<ReconcileProductItem | null> => {
  let cursor: string | null | undefined = null

  do {
    const page = await fetchReconcilePage(baseUrl, cursor)

    if (page.status === 'endpoint_not_deployed') {
      throw new Error(
        page.message ??
          'HubSpot reconcile endpoint is not deployed yet; staging E2E cannot verify product outbound.'
      )
    }

    const match =
      page.items.find(item => item.gh_product_code === productCode) ??
      page.items.find(item => item.sku === productCode)

    if (match) {
      return match
    }

    cursor = page.nextCursor ?? null
  } while (cursor)

  return null
}

const waitForProductState = async (
  label: string,
  productCode: string,
  baseUrl: string,
  timeoutMs: number,
  intervalMs: number,
  predicate: (item: ReconcileProductItem | null) => boolean
) => {
  const startedAt = Date.now()
  let lastSeen: ReconcileProductItem | null = null

  while (Date.now() - startedAt <= timeoutMs) {
    await drainProductSyncPipelines()
    lastSeen = await findProductByCode(baseUrl, productCode)

    if (predicate(lastSeen)) {
      return {
        item: lastSeen,
        elapsedMs: Date.now() - startedAt
      }
    }

    console.log(
      `[wait] ${label} still pending for ${productCode} after ${Date.now() - startedAt}ms`
    )
    await sleep(intervalMs)
  }

  throw new Error(
    `${label} did not converge within ${timeoutMs}ms for ${productCode}. Last seen snapshot: ${JSON.stringify(lastSeen, null, 2)}`
  )
}

const formatDuration = (ms: number) => `${(ms / 1000).toFixed(1)}s`

const main = async () => {
  const options = parseArgs()
  const envLocal = await readEnvLocal()

  const reconcileBaseUrl = normalizeBaseUrl(
    process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL ??
      envLocal.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL
  )

  const roleLabelEs = `TASK-563 E2E ${options.suffix}`
  const initialNotes = `TASK-563 create ${options.suffix}`
  const updatedNotes = `TASK-563 update ${options.suffix}`

  let role: SellableRoleResponse | null = null

  console.log('== Product HubSpot outbound E2E ==')
  console.log(`staging helper: ${STAGING_REQUEST_SCRIPT}`)
  console.log(`reconcile base: ${reconcileBaseUrl}`)
  console.log(`suffix: ${options.suffix}`)

  try {
    console.log('\n[1/4] Creating sellable role fixture in staging')
    role = await runStagingRequest<SellableRoleResponse>('POST', '/api/admin/pricing-catalog/roles', {
      roleLabelEs,
      roleLabelEn: null,
      category: 'consultoria',
      tier: '2',
      tierLabel: 'Senior',
      canSellAsStaff: true,
      canSellAsServiceComponent: true,
      notes: initialNotes
    })

    console.log(`created roleId=${role.roleId} roleSku=${role.roleSku}`)

    const created = await waitForProductState(
      'create sync',
      role.roleSku,
      reconcileBaseUrl,
      options.timeoutMs,
      options.intervalMs,
      item =>
        Boolean(item) &&
        item?.gh_source_kind === 'sellable_role' &&
        item?.isArchived === false &&
        item?.description === initialNotes
    )

    console.log(
      `[ok] create synced in ${formatDuration(created.elapsedMs)} -> hubspotProductId=${created.item?.hubspotProductId}`
    )

    await waitForAntiPingPongWindow('update sync')

    console.log('\n[2/4] Updating sellable role notes in staging')
    await runStagingRequest<SellableRoleResponse>('PATCH', `/api/admin/pricing-catalog/roles/${role.roleId}`, {
      notes: updatedNotes
    })

    const updated = await waitForProductState(
      'update sync',
      role.roleSku,
      reconcileBaseUrl,
      options.timeoutMs,
      options.intervalMs,
      item => Boolean(item) && item?.description === updatedNotes && item?.isArchived === false
    )

    console.log(`[ok] update synced in ${formatDuration(updated.elapsedMs)}`)

    await waitForAntiPingPongWindow('archive sync')

    console.log('\n[3/4] Deactivating sellable role in staging')
    await deleteRoleViaStaging(role.roleId)

    const archived = await waitForProductState(
      'archive sync',
      role.roleSku,
      reconcileBaseUrl,
      options.timeoutMs,
      options.intervalMs,
      item => Boolean(item) && item?.isArchived === true
    )

    console.log(`[ok] archive synced in ${formatDuration(archived.elapsedMs)}`)

    console.log('\n[4/4] Summary')
    console.log(
      JSON.stringify(
        {
          roleId: role.roleId,
          roleSku: role.roleSku,
          hubspotProductId: archived.item?.hubspotProductId ?? updated.item?.hubspotProductId ?? created.item?.hubspotProductId ?? null,
          createLatencyMs: created.elapsedMs,
          updateLatencyMs: updated.elapsedMs,
          archiveLatencyMs: archived.elapsedMs,
          notes: [
            'Script validates create/update/archive against staging + HubSpot sandbox.',
            'Anti-ping-pong live webhook replay is still out of scope for this initial smoke.',
            'Batch multi-product remains deferred because the current reactive worker coalesces per (projection, scope), not per batch window.'
          ]
        },
        null,
        2
      )
    )
  } finally {
    if (role && !options.keepRole) {
      try {
        await deleteRoleViaStaging(role.roleId)
        console.log(`cleanup: ensured role ${role.roleId} is deactivated`)
      } catch (error) {
        console.error(
          `cleanup failed for role ${role.roleId}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
