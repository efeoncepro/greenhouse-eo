import { readFile, writeFile } from 'node:fs/promises'

import '@/lib/growth/seo/register-provider-spend'

import {
  DATAFORSEO_CATALOG,
  findDataForSeoEndpoint,
  searchDataForSeoCatalog,
  type DataForSeoCatalogEndpoint
} from '@/lib/ai/dataforseo-catalog'
import {
  buildDataForSeoAiResearchRequests,
  dataForSeoAiResearchRowsToCsv,
  normalizeDataForSeoAiResearchResponse,
  parseDataForSeoAiResearchPanel,
  type DataForSeoAiResearchRow
} from '@/lib/ai/dataforseo-ai-research'
import {
  buildDataForSeoPresetPayload,
  DATAFORSEO_CLI_PRESETS,
  isDataForSeoCliPreset
} from '@/lib/ai/dataforseo-cli-presets'
import {
  buildDataForSeoSerpCompareTasks,
  dataForSeoSerpCompareRowsToCsv,
  estimateDataForSeoSerpCompareCost,
  normalizeDataForSeoSerpCompareResponse,
  parseDataForSeoSerpComparePanel,
  type DataForSeoSerpComparePanel
} from '@/lib/ai/dataforseo-serp-compare'
import {
  buildKeywordOverviewTasks,
  buildKeywordResearchDiscoveryRequests,
  buildKeywordResearchPlan,
  buildKeywordResearchValidationRequests,
  buildNextResearchPageTasks,
  DATAFORSEO_RESEARCH_ENDPOINTS,
  enrichKeywordResearchWithCompetitors,
  enrichKeywordResearchWithSerp,
  extractResearchCursor,
  extractKeywordResearchRows,
  applyKeywordResearchGovernance,
  keywordResearchRowsToCsv,
  mergeKeywordResearchRows,
  selectKeywordResearchCandidates,
  selectKeywordResearchFinalists,
  type DataForSeoKeywordFinalistInput,
  type DataForSeoKeywordResearchRow
} from '@/lib/ai/dataforseo-keyword-research'
import {
  createDataForSeoResearchCheckpoint,
  evaluateDataForSeoResearchBudget,
  fingerprintDataForSeoResearch,
  isReusableDataForSeoCheckpointStep,
  loadDataForSeoResearchCheckpoint,
  recordDataForSeoCheckpointStep,
  stopDataForSeoResearchCheckpoint,
  writeDataForSeoResearchCheckpoint,
  type DataForSeoResearchCheckpoint
} from '@/lib/ai/dataforseo-research-checkpoint'
import { requestDataForSeo, type DataForSeoRequestInput } from '@/lib/ai/dataforseo'
import { resolveAeoBudget } from '@/lib/growth/ai-visibility/budget'
import { enforceSeoRunEntitlement } from '@/lib/growth/seo/entitlement'

import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

type FlagValue = string | boolean | string[]
type Flags = Record<string, FlagValue>

export const CLI_EXIT = {
  ok: 0,
  usage: 2,
  blocked: 3,
  providerError: 4,
  transportError: 5,
  noData: 6,
  pending: 7
} as const

const parseArgs = (argv: string[]) => {
  const positional: string[] = []
  const flags: Flags = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (token === '--') continue

    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }

    const [rawName, inline] = token.slice(2).split('=', 2)
    const next = argv[index + 1]
    const value = inline ?? (next && !next.startsWith('--') ? argv[++index] : true)
    const previous = flags[rawName]

    flags[rawName] =
      previous === undefined
        ? value
        : Array.isArray(previous)
          ? [...previous, String(value)]
          : [String(previous), String(value)]
  }

  return { positional, flags }
}

const flag = (flags: Flags, name: string): string | undefined => {
  const value = flags[name]

  return Array.isArray(value) ? value.at(-1) : typeof value === 'string' ? value : undefined
}

const flagValues = (flags: Flags, name: string) => {
  const value = flags[name]

  if (Array.isArray(value)) return value
  if (typeof value === 'string') return [value]

  return []
}

const numberFlag = (flags: Flags, name: string): number | undefined => {
  const value = flag(flags, name)

  if (value === undefined) return undefined

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) throw new Error(`--${name} debe ser numérico.`)

  return parsed
}

const boolFlag = (flags: Flags, name: string) => flags[name] === true

const printJson = (value: unknown) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)

const printEndpoints = (endpoints: DataForSeoCatalogEndpoint[], json: boolean) => {
  if (json) return printJson(endpoints)

  for (const endpoint of endpoints) {
    const access = endpoint.execution.status === 'executable' ? 'ready' : 'catalog'

    console.log(`${endpoint.id.padEnd(74)} ${endpoint.method.padEnd(4)} ${access.padEnd(7)} ${endpoint.path}`)
  }

  console.log(`\n${endpoints.length} endpoint(s). Usa --json para salida machine-readable.`)
}

const help = () => {
  console.log(`DataForSEO CLI — catálogo oficial + ejecución gobernada

Descubrimiento
  pnpm dataforseo -- catalog info [--json]
  pnpm dataforseo -- catalog list [--family serp] [--status executable|catalog_only] [--json]
  pnpm dataforseo -- catalog search <términos> [--json]
  pnpm dataforseo -- catalog describe <id|path> [--json]
  pnpm dataforseo:catalog:sync
  pnpm dataforseo:catalog:check

Consultas rápidas
  pnpm dataforseo -- quick ai-mode --keyword "..." --market PE --locale es-PE --dry-run
  pnpm dataforseo -- quick chatgpt-response --prompt "..." --model <modelo-vivo> --web-search --market CL --dry-run
  pnpm dataforseo -- quick chatgpt-scraper|gemini-scraper --keyword "..." --market MX --dry-run
  pnpm dataforseo -- quick ai-keyword-volume --keyword "uno,dos" --market CL --dry-run
  pnpm dataforseo -- quick llm-mentions --target ejemplo.com --platform google --market CL --dry-run
  pnpm dataforseo -- quick organic --keyword "..." --market US --locale en-US --target example.com --depth 20 --load-ai-overview --yes --max-usd 0.01
  pnpm dataforseo -- quick keyword-overview --keyword "uno,dos" --market PE --org <uuid> --estimated-usd <n> --max-usd <n> --yes
  pnpm dataforseo -- quick ranked-keywords|competitors|backlinks|onpage-instant|onpage-audit --target <dominio|url> ...

Research compuesto
  pnpm dataforseo -- research --keyword "seed uno,seed dos" --market CL --target ejemplo.com --dry-run
  pnpm dataforseo -- research --keyword "..." --market MX --org <uuid> --max-usd <n> --checkpoint run.json --yes --out research.json --csv research.csv
  Usa Suggestions + Related; --include-ideas agrega expansión categorial sólo para seeds homogéneas.
  SERP usa --serp-mode standard por defecto; live y --load-ai-overview son opt-in.
  Antes de SERP exige --finalists-file decisiones.json o --approve-ranked-finalists explícito.
  --max-pages, --page-size, --cache-max-age-hours y --resume controlan paginación y recuperación.

Comparación SERP reproducible
  pnpm dataforseo -- serp-compare --query "..." --targets falabella.com,paris.cl --devices desktop,mobile --market CL --depth 20 --dry-run
  pnpm dataforseo -- serp-compare --panel panel.json --max-usd 0.02 --yes --out comparison.json --csv comparison.csv
  Una captura por query/dispositivo se reutiliza para todos los targets; --load-ai-overview duplica el costo SERP.

Research AI compuesto
  pnpm dataforseo -- ai-research --panel panel.json --dry-run
  pnpm dataforseo -- ai-research --panel panel.json --org <uuid> --max-usd <n> --checkpoint ai-run.json --yes --out ai.json --csv ai.csv
  El panel versionado separa API de consumer surface y fija modelos, queries y estimación por task.

Ejecución genérica
  pnpm dataforseo -- run <id|path> --file payload.json|--json-input '[{...}]'|--stdin --dry-run
  pnpm dataforseo -- task wait <task-get-id|path> --task-id <uuid> --org <uuid> --timeout-ms 120000

Guardas
  Sin --yes, toda operación pagada queda en preview. Un POST pagado exige --estimated-usd y --max-usd,
  salvo presets con estimación oficial conocida. --max-usd compara la estimación; no es un tope del proveedor.
  Research revalida entitlement y saldo antes de cada request; el costo real acumulado queda en checkpoint.
  Todo POST de una familia distinta de SERP exige --org y entitlement; los GET de catálogo/polling no gastan.
  LLM Responses exige max_output_tokens y LLM Mentions exige platform explícita para no mezclar superficies.
  Nunca se imprime login, password ni raw body de errores HTTP.`)
}

const readStdin = async () => {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))

  return Buffer.concat(chunks).toString('utf8')
}

const readPayload = async (flags: Flags): Promise<Record<string, unknown>[]> => {
  const inline = flag(flags, 'json-input')
  const file = flag(flags, 'file')
  const raw = inline ?? (file ? await readFile(file, 'utf8') : boolFlag(flags, 'stdin') ? await readStdin() : '')

  if (!raw.trim()) throw new Error('Falta payload: usa --file, --json-input o --stdin.')

  const parsed = JSON.parse(raw) as unknown
  const tasks = Array.isArray(parsed) ? parsed : [parsed]

  if (!tasks.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    throw new Error('El payload debe ser un objeto JSON o un arreglo de objetos.')
  }

  return tasks as Record<string, unknown>[]
}

const summarizeTaskCodes = (tasks: unknown[]) =>
  tasks.map(task => {
    const row = task && typeof task === 'object' ? (task as Record<string, unknown>) : {}

    return {
      id: typeof row.id === 'string' ? row.id : null,
      statusCode: typeof row.status_code === 'number' ? row.status_code : null,
      statusMessage: typeof row.status_message === 'string' ? row.status_message : null,
      resultCount: typeof row.result_count === 'number' ? row.result_count : null,
      cost: typeof row.cost === 'number' ? row.cost : null,
      hasResult: Array.isArray(row.result) ? row.result.length > 0 : row.result !== null && row.result !== undefined
    }
  })

export const classifyDataForSeoOutcome = (input: {
  httpOk: boolean
  taskCodes: ReturnType<typeof summarizeTaskCodes>
}) => {
  if (!input.httpOk) return { kind: 'transport_error' as const, exitCode: CLI_EXIT.transportError }

  if (input.taskCodes.some(task => task.statusCode !== null && [20100, 40601, 40602].includes(task.statusCode))) {
    return { kind: 'pending' as const, exitCode: CLI_EXIT.pending }
  }

  if (input.taskCodes.some(task => task.statusCode !== null && task.statusCode >= 40000)) {
    return { kind: 'provider_task_error' as const, exitCode: CLI_EXIT.providerError }
  }

  if (input.taskCodes.length > 0 && input.taskCodes.every(task => task.statusCode === 20000 && !task.hasResult)) {
    return { kind: 'no_data' as const, exitCode: CLI_EXIT.noData }
  }

  return { kind: 'success' as const, exitCode: CLI_EXIT.ok }
}

const resolveEndpointWithTaskId = (endpoint: DataForSeoCatalogEndpoint, taskId?: string) => {
  if (!taskId) return endpoint.path

  if (/\{[^}]+\}/.test(endpoint.path)) return endpoint.path.replace(/\{[^}]+\}/, encodeURIComponent(taskId))
  if (/\$id\b/.test(endpoint.path)) return endpoint.path.replace(/\$id\b/, encodeURIComponent(taskId))
  if (endpoint.mode === 'task_get') return `${endpoint.path.replace(/\/$/, '')}/${encodeURIComponent(taskId)}`

  return endpoint.path
}

const validatePayload = (endpoint: DataForSeoCatalogEndpoint, tasks: Record<string, unknown>[]) => {
  if (endpoint.batchLimit !== null && tasks.length > endpoint.batchLimit) {
    throw new Error(`El batch tiene ${tasks.length} tasks y el límite oficial es ${endpoint.batchLimit}.`)
  }

  const missing = endpoint.requestFields
    .filter(field => field.required && !/\bif\b/i.test(field.description))
    .filter(field => tasks.some(task => task[field.name] === undefined))
    .map(field => field.name)

  if (missing.length > 0) throw new Error(`Faltan campos obligatorios: ${[...new Set(missing)].join(', ')}.`)
}

export const validateAiOptimizationSafety = (endpoint: DataForSeoCatalogEndpoint, tasks: Record<string, unknown>[]) => {
  if (!endpoint.path.startsWith('/v3/ai_optimization/') || endpoint.method !== 'POST') return

  if (endpoint.path.includes('/llm_responses/') && tasks.some(task => task.max_output_tokens === undefined)) {
    throw new Error('LLM Responses exige max_output_tokens explícito para acotar la generación.')
  }

  if (
    endpoint.path.includes('/llm_mentions/') &&
    tasks.some(task => !['chat_gpt', 'google'].includes(String(task.platform)))
  ) {
    throw new Error('LLM Mentions exige platform explícita: chat_gpt o google; no se mezclan superficies.')
  }
}

export const partitionDataForSeoTasks = (tasks: Record<string, unknown>[], batchSize?: number) => {
  if (tasks.length === 0) return [[]]
  if (batchSize === undefined) return [tasks]
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('requestBatchSize debe ser un entero positivo.')

  return Array.from({ length: Math.ceil(tasks.length / batchSize) }, (_, index) =>
    tasks.slice(index * batchSize, (index + 1) * batchSize)
  )
}

const execute = async (input: {
  endpoint: DataForSeoCatalogEndpoint
  tasks: Record<string, unknown>[]
  flags: Flags
  estimatedCostUsd: number | null
  defaultConsumer?: 'seo' | 'aeo'
  taskId?: string
  surface?: string
  previewExtra?: Record<string, unknown>
  buildResult?: (tasks: unknown[]) => unknown
  buildCsv?: (result: unknown) => string
  requestBatchSize?: number
}) => {
  const { endpoint, tasks, flags } = input
  const organizationId = flag(flags, 'org')
  const dryRun = boolFlag(flags, 'dry-run') || !boolFlag(flags, 'yes')
  const maxUsd = numberFlag(flags, 'max-usd')
  const estimatedUsd = numberFlag(flags, 'estimated-usd') ?? input.estimatedCostUsd
  const resolvedEndpoint = resolveEndpointWithTaskId(endpoint, input.taskId)
  const isPaidPost = endpoint.method === 'POST' && !endpoint.free
  const requestBatches = partitionDataForSeoTasks(tasks, input.requestBatchSize)

  if (endpoint.execution.status !== 'executable' || !endpoint.execution.internalFamily) {
    console.error(
      `${endpoint.id}: catalog_only — ${endpoint.execution.reason}\nHabilitación: ${endpoint.execution.enablement}`
    )
    process.exitCode = CLI_EXIT.blocked

    return
  }

  if (!dryRun && endpoint.method === 'POST' && endpoint.execution.internalFamily !== 'serp' && !organizationId) {
    throw new Error(`La familia ${endpoint.execution.internalFamily} exige --org; no se inventan organizaciones.`)
  }

  if (/\{[^}]+\}|\$id\b/.test(resolvedEndpoint)) {
    throw new Error(`${endpoint.id} exige un identificador de task; usa task wait ... --task-id <id>.`)
  }

  validatePayload(endpoint, tasks)
  validateAiOptimizationSafety(endpoint, tasks)

  const consumer =
    flag(flags, 'consumer') ??
    input.defaultConsumer ??
    (endpoint.execution.internalFamily === 'ai_optimization' ? 'aeo' : 'seo')

  const preview = {
    ok: true,
    dryRun,
    surface: input.surface ?? 'dataforseo-cli',
    endpoint: { id: endpoint.id, method: endpoint.method, path: resolvedEndpoint },
    family: endpoint.execution.internalFamily,
    organizationId: endpoint.method === 'POST' ? (organizationId ?? null) : null,
    consumer,
    taskCount: tasks.length,
    requestCount: requestBatches.length,
    requestBatchSize: input.requestBatchSize ?? null,
    tasks,
    batchLimit: endpoint.batchLimit,
    estimatedCostUsd: estimatedUsd,
    estimateStatus: estimatedUsd === null ? 'unavailable' : 'available',
    maxUsd: maxUsd ?? null,
    source: { documentationUrl: endpoint.documentationUrl, sourceModifiedAt: endpoint.sourceModifiedAt },
    ...input.previewExtra
  }

  if (dryRun) {
    printJson(preview)
    if (!boolFlag(flags, 'yes')) console.error('Preview solamente. Agrega --yes para ejecutar.')

    return
  }

  if (isPaidPost) {
    if (estimatedUsd === null) throw new Error('Costo no estimable automáticamente: declara --estimated-usd.')
    if (maxUsd === undefined) throw new Error('Una operación pagada exige --max-usd.')
    if (estimatedUsd > maxUsd) throw new Error(`Costo estimado USD ${estimatedUsd} supera --max-usd ${maxUsd}.`)
  }

  const responseTasks: unknown[] = []

  const requestResults: Array<{
    index: number
    taskCount: number
    httpStatus: number
    latencyMs: number
    costUsd: number | null
    breakerOpen: boolean
  }> = []

  let allHttpOk = true
  let totalLatencyMs = 0
  let totalCostUsd: number | null = 0
  let budgetConsumedUsd = 0

  for (const [index, batch] of requestBatches.entries()) {
    const incrementalEstimate =
      estimatedUsd === null || tasks.length === 0 ? null : (estimatedUsd / tasks.length) * batch.length

    if (
      isPaidPost &&
      maxUsd !== undefined &&
      incrementalEstimate !== null &&
      budgetConsumedUsd + incrementalEstimate > maxUsd
    ) {
      throw new Error(
        `Costo observado/estimado USD ${budgetConsumedUsd + incrementalEstimate} supera --max-usd ${maxUsd} antes del request ${index + 1}.`
      )
    }

    if (endpoint.method === 'POST' && organizationId) {
      const gate = await enforceSeoRunEntitlement(organizationId, {
        estimatedCostUsd: incrementalEstimate ?? undefined,
        consumesAuditAllowance: false
      })

      if (!gate.allowed) {
        printJson({
          ...preview,
          ok: false,
          blockedReason: gate.blockedReason,
          budgetRemainingUsd: gate.budgetRemainingUsd,
          stoppedBeforeRequest: index + 1
        })
        process.exitCode = CLI_EXIT.blocked

        return
      }
    }

    const request = {
      family: endpoint.execution.internalFamily,
      consumer: consumer as 'seo' | 'aeo',
      method: endpoint.method,
      endpoint: resolvedEndpoint,
      tasks: batch,
      ...(endpoint.method === 'POST' && organizationId ? { organizationId } : {}),
      ...(numberFlag(flags, 'timeout-ms') ? { timeoutMs: numberFlag(flags, 'timeout-ms') } : {})
    } as DataForSeoRequestInput

    const response = await requestDataForSeo(request)

    responseTasks.push(...response.tasks)
    allHttpOk &&= response.ok
    totalLatencyMs += response.latencyMs
    budgetConsumedUsd += response.cost ?? incrementalEstimate ?? 0
    totalCostUsd = totalCostUsd === null || response.cost === null ? null : totalCostUsd + response.cost
    requestResults.push({
      index: index + 1,
      taskCount: batch.length,
      httpStatus: response.httpStatus,
      latencyMs: response.latencyMs,
      costUsd: response.cost,
      breakerOpen: response.breakerOpen ?? false
    })
  }

  const taskCodes = summarizeTaskCodes(responseTasks)
  const outcome = classifyDataForSeoOutcome({ httpOk: allHttpOk, taskCodes })
  const normalizedResult = input.buildResult?.(responseTasks)

  const artifact = {
    ok: outcome.kind === 'success',
    outcome: outcome.kind,
    queriedAt: new Date().toISOString(),
    surface: input.surface ?? 'dataforseo-cli',
    request: preview,
    response: {
      httpStatus: requestResults.at(-1)?.httpStatus ?? 0,
      latencyMs: totalLatencyMs,
      breakerOpen: requestResults.some(request => request.breakerOpen),
      requests: requestResults,
      taskCodes,
      costUsd: totalCostUsd,
      tasks: responseTasks
    },
    ...(normalizedResult === undefined ? {} : { result: normalizedResult })
  }

  const output = flag(flags, 'out')
  const csv = flag(flags, 'csv')

  if (output) await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' })

  if (csv && input.buildCsv && normalizedResult !== undefined) {
    await writeFile(csv, input.buildCsv(normalizedResult), { flag: 'wx' })
  }

  printJson(artifact)
  process.exitCode = outcome.exitCode
}

const parseCommaSeparated = (values: string[]) =>
  values
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean)

const loadSerpComparePanel = async (flags: Flags): Promise<DataForSeoSerpComparePanel> => {
  const panelPath = flag(flags, 'panel')

  if (panelPath) return parseDataForSeoSerpComparePanel(JSON.parse(await readFile(panelPath, 'utf8')))

  return parseDataForSeoSerpComparePanel({
    version: 1,
    market: flag(flags, 'market') ?? 'CL',
    locale: flag(flags, 'locale'),
    queries: parseCommaSeparated([...flagValues(flags, 'query'), ...flagValues(flags, 'keyword')]),
    targets: parseCommaSeparated([...flagValues(flags, 'target'), ...flagValues(flags, 'targets')]),
    devices: parseCommaSeparated(flagValues(flags, 'devices').length > 0 ? flagValues(flags, 'devices') : ['desktop']),
    depth: numberFlag(flags, 'depth') ?? 10,
    loadAiOverview: boolFlag(flags, 'load-ai-overview')
  })
}

const runSerpCompare = async (flags: Flags) => {
  const panel = await loadSerpComparePanel(flags)
  const endpoint = findDataForSeoEndpoint('/v3/serp/google/organic/live/advanced')

  if (!endpoint) throw new Error('El catálogo no contiene Google Organic live/advanced.')

  return execute({
    endpoint,
    tasks: buildDataForSeoSerpCompareTasks(panel),
    flags,
    estimatedCostUsd: estimateDataForSeoSerpCompareCost(panel),
    defaultConsumer: 'seo',
    surface: 'dataforseo-serp-compare',
    previewExtra: { panel },
    requestBatchSize: 1,
    buildResult: tasks => ({ panel, rows: normalizeDataForSeoSerpCompareResponse({ tasks, panel }) }),
    buildCsv: result =>
      dataForSeoSerpCompareRowsToCsv(
        (result as { rows: ReturnType<typeof normalizeDataForSeoSerpCompareResponse> }).rows
      )
  })
}

type ResearchStepArtifact = {
  key: string
  name: string
  endpoint: string
  taskCount: number
  outcome: ReturnType<typeof classifyDataForSeoOutcome>['kind']
  costUsd: number
  reused: boolean
  taskCodes: ReturnType<typeof summarizeTaskCodes>
  tasks: unknown[]
}

class ResearchStoppedError extends Error {
  constructor(
    message: string,
    readonly exitCode: number = CLI_EXIT.blocked
  ) {
    super(message)
  }
}

type ResearchExecutionContext = {
  organizationId: string
  maxUsd: number
  checkpointPath: string
  checkpoint: DataForSeoResearchCheckpoint
  cacheMaxAgeHours: number
}

const persistResearchStop = async (context: ResearchExecutionContext, reason: string) => {
  context.checkpoint = stopDataForSeoResearchCheckpoint(context.checkpoint, reason)
  context.checkpoint = await writeDataForSeoResearchCheckpoint(context.checkpointPath, context.checkpoint)
}

const guardResearchSpend = async (
  context: ResearchExecutionContext,
  estimatedCostUsd: number,
  consumer: 'seo' | 'aeo'
) => {
  const budget = evaluateDataForSeoResearchBudget({
    actualCostUsd: context.checkpoint.actualCostUsd,
    nextEstimatedCostUsd: estimatedCostUsd,
    maxUsd: context.maxUsd
  })

  if (!budget.allowed) {
    const reason = `El siguiente request (USD ${estimatedCostUsd}) llevaría el acumulado a USD ${budget.projectedCostUsd}, sobre --max-usd ${context.maxUsd}.`

    await persistResearchStop(context, reason)
    throw new ResearchStoppedError(reason)
  }

  if (consumer === 'aeo') {
    const aeoBudget = await resolveAeoBudget(context.organizationId)

    if (!aeoBudget.tier || estimatedCostUsd > aeoBudget.budgetRemainingUsd) {
      const reason = !aeoBudget.tier
        ? 'Entitlement AEO bloqueó el siguiente request: no_entitlement.'
        : `Presupuesto AEO restante USD ${aeoBudget.budgetRemainingUsd} no cubre el siguiente request estimado USD ${estimatedCostUsd}.`

      await persistResearchStop(context, reason)
      throw new ResearchStoppedError(reason)
    }

    return
  }

  const seoGate = await enforceSeoRunEntitlement(context.organizationId, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!seoGate.allowed) {
    const reason = `Entitlement SEO bloqueó el siguiente request: ${seoGate.blockedReason ?? 'blocked'}.`

    await persistResearchStop(context, reason)
    throw new ResearchStoppedError(reason)
  }
}

const executeResearchStep = async (input: {
  key: string
  name: string
  endpointPath: string
  tasks: Record<string, unknown>[]
  context: ResearchExecutionContext
  estimatedCostUsd: number
  consumer?: 'seo' | 'aeo'
  method?: 'GET' | 'POST'
  allowPending?: boolean
  cacheable?: boolean
  resolvedEndpointPath?: string
}): Promise<ResearchStepArtifact> => {
  const endpoint = findDataForSeoEndpoint(input.endpointPath)

  if (!endpoint || endpoint.execution.status !== 'executable' || !endpoint.execution.internalFamily) {
    throw new Error(`El paso ${input.name} no tiene un endpoint ejecutable: ${input.endpointPath}.`)
  }

  validatePayload(endpoint, input.tasks)
  validateAiOptimizationSafety(endpoint, input.tasks)

  const requestIdentity = {
    endpoint: input.resolvedEndpointPath ?? endpoint.path,
    method: input.method ?? endpoint.method,
    tasks: input.tasks
  }

  const cached = input.context.checkpoint.steps[input.key]

  if (isReusableDataForSeoCheckpointStep(cached, requestIdentity)) {
    const taskCodes = summarizeTaskCodes(cached.tasks)

    return {
      key: input.key,
      name: input.name,
      endpoint: cached.endpoint,
      taskCount: input.tasks.length,
      outcome: classifyDataForSeoOutcome({ httpOk: true, taskCodes }).kind,
      costUsd: 0,
      reused: true,
      taskCodes,
      tasks: cached.tasks
    }
  }

  if ((input.method ?? endpoint.method) === 'POST' && !endpoint.free) {
    await guardResearchSpend(input.context, input.estimatedCostUsd, input.consumer ?? 'seo')
  }

  const request = {
    family: endpoint.execution.internalFamily,
    consumer: input.consumer ?? 'seo',
    method: input.method ?? endpoint.method,
    endpoint: input.resolvedEndpointPath ?? endpoint.path,
    tasks: input.tasks,
    ...((input.method ?? endpoint.method) === 'POST' ? { organizationId: input.context.organizationId } : {})
  } as DataForSeoRequestInput

  const response = await requestDataForSeo(request)

  const taskCodes = summarizeTaskCodes(response.tasks)
  const outcome = classifyDataForSeoOutcome({ httpOk: response.ok, taskCodes })

  if (
    outcome.kind === 'transport_error' ||
    outcome.kind === 'provider_task_error' ||
    (outcome.kind === 'pending' && !input.allowPending)
  ) {
    throw new Error(
      `Research se detuvo en ${input.name}: ${outcome.kind} (${taskCodes.map(task => task.statusCode).join(', ')}).`
    )
  }

  if (outcome.kind === 'pending' && (input.method ?? endpoint.method) === 'GET') {
    return {
      key: input.key,
      name: input.name,
      endpoint: input.resolvedEndpointPath ?? endpoint.path,
      taskCount: 0,
      outcome: outcome.kind,
      costUsd: 0,
      reused: false,
      taskCodes,
      tasks: response.tasks
    }
  }

  const completedAt = new Date().toISOString()

  const expiresAt = input.cacheable
    ? new Date(Date.now() + input.context.cacheMaxAgeHours * 60 * 60 * 1000).toISOString()
    : null

  input.context.checkpoint = recordDataForSeoCheckpointStep(input.context.checkpoint, {
    key: input.key,
    endpoint: input.resolvedEndpointPath ?? endpoint.path,
    request: requestIdentity,
    completedAt,
    expiresAt,
    costUsd: response.cost ?? 0,
    cursor: extractResearchCursor(response.tasks),
    taskIds: taskCodes.flatMap(task => (task.id ? [task.id] : [])),
    tasks: response.tasks
  })
  input.context.checkpoint = await writeDataForSeoResearchCheckpoint(
    input.context.checkpointPath,
    input.context.checkpoint
  )

  return {
    key: input.key,
    name: input.name,
    endpoint: input.resolvedEndpointPath ?? endpoint.path,
    taskCount: input.tasks.length,
    outcome: outcome.kind,
    costUsd: response.cost ?? 0,
    reused: false,
    taskCodes,
    tasks: response.tasks
  }
}

const seedRows = (seeds: string[]): DataForSeoKeywordResearchRow[] =>
  seeds.map(keyword => ({
    keyword,
    normalizedKeyword: keyword.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es'),
    coreKeyword: null,
    searchVolume: null,
    searchVolumeState: 'missing',
    cpc: null,
    competition: null,
    competitionLevel: null,
    keywordDifficulty: null,
    intent: null,
    declaredIntent: null,
    category: null,
    businessPriority: null,
    existingCoverage: 'unknown',
    finalistApproved: false,
    selectionReasons: [],
    ownUrls: [],
    competitorUrls: [],
    competitorDomains: [],
    serpFeatures: [],
    paaQuestions: [],
    aiOverviewPresent: null,
    aiOverviewCitations: [],
    evidence: [],
    sources: ['manual_seed']
  }))

const loadFinalistInputs = async (path: string): Promise<DataForSeoKeywordFinalistInput[]> => {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown

  if (!Array.isArray(parsed)) throw new Error('--finalists-file debe contener un arreglo JSON.')

  return parsed.map(entry => {
    if (typeof entry === 'string') return { keyword: entry, approved: true }

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('Cada finalista debe ser una keyword o un objeto con keyword.')
    }

    const row = entry as Record<string, unknown>

    if (typeof row.keyword !== 'string' || !row.keyword.trim()) throw new Error('Cada finalista exige keyword.')

    return {
      keyword: row.keyword,
      ...(typeof row.intent === 'string' ? { intent: row.intent } : {}),
      ...(typeof row.category === 'string' ? { category: row.category } : {}),
      ...(typeof row.businessPriority === 'number' ? { businessPriority: row.businessPriority } : {}),
      ...(row.existingCoverage === 'covered' ||
      row.existingCoverage === 'partial' ||
      row.existingCoverage === 'gap' ||
      row.existingCoverage === 'unknown'
        ? { existingCoverage: row.existingCoverage }
        : {}),
      ...(typeof row.approved === 'boolean' ? { approved: row.approved } : { approved: true })
    }
  })
}

const initializeResearchContext = async (input: {
  flags: Flags
  kind: DataForSeoResearchCheckpoint['kind']
  plan: unknown
  organizationId: string
  maxUsd: number
  cacheMaxAgeHours: number
}) => {
  const resumePath = flag(input.flags, 'resume')
  const checkpointPath = flag(input.flags, 'checkpoint') ?? resumePath

  if (!checkpointPath) throw new Error('La ejecución compuesta exige --checkpoint <ruta>; usa --resume para continuar.')

  if (resumePath && flag(input.flags, 'checkpoint') && checkpointPath !== resumePath) {
    throw new Error('--checkpoint y --resume deben señalar el mismo archivo.')
  }

  if (!resumePath) {
    try {
      await readFile(checkpointPath, 'utf8')
      throw new Error(`El checkpoint ${checkpointPath} ya existe; usa --resume para no perder evidencia.`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('ya existe')) throw error
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  const checkpoint = resumePath
    ? await loadDataForSeoResearchCheckpoint({
        path: resumePath,
        kind: input.kind,
        plan: input.plan,
        organizationId: input.organizationId
      })
    : createDataForSeoResearchCheckpoint({
        kind: input.kind,
        plan: input.plan,
        organizationId: input.organizationId
      })

  const context: ResearchExecutionContext = {
    organizationId: input.organizationId,
    maxUsd: input.maxUsd,
    checkpointPath,
    checkpoint,
    cacheMaxAgeHours: input.cacheMaxAgeHours
  }

  context.checkpoint = await writeDataForSeoResearchCheckpoint(checkpointPath, context.checkpoint)

  return context
}

const labsRequestEstimate = (tasks: Record<string, unknown>[]) =>
  Number(
    tasks
      .reduce((sum, task) => sum + 0.012 + (typeof task.limit === 'number' ? task.limit : 1000) * 0.00012, 0)
      .toFixed(6)
  )

const writeResearchArtifact = async (input: {
  artifact: Record<string, unknown>
  rows: DataForSeoKeywordResearchRow[]
  flags: Flags
}) => {
  const output = flag(input.flags, 'out')
  const csvOutput = flag(input.flags, 'csv')

  if (output) await writeFile(output, `${JSON.stringify(input.artifact, null, 2)}\n`, { flag: 'wx' })
  if (csvOutput) await writeFile(csvOutput, keywordResearchRowsToCsv(input.rows), { flag: 'wx' })

  if (!output && !csvOutput) {
    printJson(input.artifact)

    return
  }

  const result =
    input.artifact.result && typeof input.artifact.result === 'object' && !Array.isArray(input.artifact.result)
      ? (input.artifact.result as Record<string, unknown>)
      : null

  printJson({
    ok: input.artifact.ok,
    outcome: input.artifact.outcome ?? 'complete',
    runId: input.artifact.runId,
    checkpoint: input.artifact.checkpoint,
    artifacts: { json: output ?? null, csv: csvOutput ?? null },
    result: result
      ? {
          keywordCount: result.keywordCount,
          finalistCount: result.finalistCount,
          actualCostUsd: result.actualCostUsd
        }
      : null
  })
}

const pollStandardSerp = async (input: {
  postStep: ResearchStepArtifact
  context: ResearchExecutionContext
  flags: Flags
}) => {
  const taskIds = input.postStep.taskCodes.flatMap(task => (task.id ? [task.id] : []))

  if (taskIds.length === 0) throw new Error('SERP Standard no devolvió task IDs; no se puede recuperar el resultado.')

  const interval = Math.max(1_000, numberFlag(input.flags, 'poll-ms') ?? 5_000)
  const completed: ResearchStepArtifact[] = []

  for (const taskId of taskIds) {
    const deadline = Date.now() + (numberFlag(input.flags, 'timeout-ms') ?? 120_000)

    while (Date.now() < deadline) {
      const step = await executeResearchStep({
        key: `serp:get:${taskId}`,
        name: 'serp-standard-result',
        endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.serpStandardGet,
        resolvedEndpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.serpStandardGet.replace('$id', encodeURIComponent(taskId)),
        tasks: [],
        context: input.context,
        estimatedCostUsd: 0,
        method: 'GET',
        allowPending: true
      })

      if (step.outcome !== 'pending') {
        completed.push(step)
        break
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }

  if (completed.length !== taskIds.length) {
    const reason = 'SERP Standard sigue pending al agotar el timeout; reanuda el mismo checkpoint, no resubmits.'

    await persistResearchStop(input.context, reason)
    throw new ResearchStoppedError(reason, CLI_EXIT.pending)
  }

  return completed
}

const runKeywordResearch = async (flags: Flags) => {
  const keyword = flag(flags, 'keyword')

  if (!keyword) throw new Error('research exige --keyword "seed uno,seed dos".')

  const serpMode = flag(flags, 'serp-mode') ?? 'standard'

  const plan = buildKeywordResearchPlan({
    keyword,
    market: flag(flags, 'market'),
    locale: flag(flags, 'locale'),
    target: flag(flags, 'target'),
    discoveryLimit: numberFlag(flags, 'limit'),
    candidateLimit: numberFlag(flags, 'candidate-limit'),
    serpLimit: numberFlag(flags, 'serp-limit'),
    competitorLimit: numberFlag(flags, 'competitor-limit'),
    includeIdeas: boolFlag(flags, 'include-ideas'),
    pageSize: numberFlag(flags, 'page-size'),
    maxPages: numberFlag(flags, 'max-pages'),
    cacheMaxAgeHours: numberFlag(flags, 'cache-max-age-hours'),
    serpMode: serpMode as 'standard' | 'live',
    loadAiOverview: boolFlag(flags, 'load-ai-overview')
  })

  const dryRun = boolFlag(flags, 'dry-run') || !boolFlag(flags, 'yes')
  const finalistsFile = flag(flags, 'finalists-file')

  const preview = {
    ok: true,
    dryRun,
    surface: 'dataforseo-keyword-research',
    plan,
    finalistCheckpoint: finalistsFile
      ? { mode: 'approved_file', path: finalistsFile }
      : boolFlag(flags, 'approve-ranked-finalists')
        ? { mode: 'automatic_explicit' }
        : { mode: 'required_before_serp' },
    declarations: [
      'DataForSEO es una lente estimada de mercado.',
      'El límite declarado produce una muestra; no demuestra exhaustividad.',
      'searchVolumeState conserva missing, null y value como estados distintos.',
      'SERP Standard es el default; live y AI Overview son opt-in.',
      'Confirmar gasto y aprobar finalistas son decisiones separadas.'
    ]
  }

  if (dryRun) {
    printJson(preview)
    if (!boolFlag(flags, 'yes')) console.error('Preview solamente. Agrega --yes para ejecutar.')

    return
  }

  const organizationId = flag(flags, 'org')
  const maxUsd = numberFlag(flags, 'max-usd')

  if (!organizationId) throw new Error('research exige --org para ejecutar; no se inventan organizaciones.')
  if (maxUsd === undefined || maxUsd <= 0) throw new Error('research exige --max-usd > 0 para ejecutar.')

  const context = await initializeResearchContext({
    flags,
    kind: 'keyword-research',
    plan,
    organizationId,
    maxUsd,
    cacheMaxAgeHours: plan.cacheMaxAgeHours
  })

  const steps: ResearchStepArtifact[] = []
  const discoveredRows: DataForSeoKeywordResearchRow[] = seedRows(plan.seeds)

  try {
    const discovery = buildKeywordResearchDiscoveryRequests(plan)

    for (const [name, initialTasks] of Object.entries(discovery)) {
      const endpointPath = DATAFORSEO_RESEARCH_ENDPOINTS[name as keyof typeof DATAFORSEO_RESEARCH_ENDPOINTS]

      for (const [taskIndex, initialTask] of initialTasks.entries()) {
        let pageTasks: Record<string, unknown>[] = [initialTask]

        for (let page = 0; page < plan.maxPages; page += 1) {
          const step = await executeResearchStep({
            key: `${name}:${taskIndex}:${page}`,
            name: `${name}:page:${page + 1}`,
            endpointPath,
            tasks: pageTasks,
            context,
            estimatedCostUsd: labsRequestEstimate(pageTasks),
            cacheable: true
          })

          steps.push(step)
          discoveredRows.push(...extractKeywordResearchRows(step.tasks, name))

          if (page + 1 < plan.maxPages) {
            pageTasks = buildNextResearchPageTasks(
              pageTasks,
              extractResearchCursor(step.tasks),
              plan.pageSize,
              page + 1
            )
          }
        }
      }
    }

    let rows = selectKeywordResearchCandidates(mergeKeywordResearchRows(discoveredRows), plan.candidateLimit)
    const overviewTasks = buildKeywordOverviewTasks(rows, plan)

    if (overviewTasks.length > 0) {
      const overview = await executeResearchStep({
        key: 'overview:0',
        name: 'overview',
        endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.overview,
        tasks: overviewTasks,
        context,
        estimatedCostUsd: 0.012 + rows.length * 0.00012,
        cacheable: true
      })

      steps.push(overview)
      rows = selectKeywordResearchCandidates(
        mergeKeywordResearchRows([...rows, ...extractKeywordResearchRows(overview.tasks, 'overview')]),
        plan.candidateLimit
      )
    }

    if (finalistsFile) rows = applyKeywordResearchGovernance(rows, await loadFinalistInputs(finalistsFile))

    const automaticApproval = boolFlag(flags, 'approve-ranked-finalists')
    const finalists = selectKeywordResearchFinalists(rows, plan.serpLimit, automaticApproval ? 'automatic' : 'approved')

    if (automaticApproval) {
      const selected = new Set(finalists.map(row => row.normalizedKeyword))

      rows = rows.map(row =>
        selected.has(row.normalizedKeyword)
          ? {
              ...row,
              finalistApproved: true,
              selectionReasons: [...new Set([...row.selectionReasons, 'automatic_ranking_explicitly_approved'])]
            }
          : row
      )
    }

    if (plan.serpLimit > 0 && !finalistsFile && !automaticApproval) {
      const reason = 'awaiting_finalist_approval'

      await persistResearchStop(context, reason)
      await writeResearchArtifact({
        flags,
        rows,
        artifact: {
          ...preview,
          ok: false,
          dryRun: false,
          outcome: reason,
          runId: context.checkpoint.runId,
          checkpoint: context.checkpointPath,
          candidateDigest: fingerprintDataForSeoResearch(rows),
          result: {
            keywordCount: rows.length,
            finalistCount: 0,
            actualCostUsd: context.checkpoint.actualCostUsd,
            keywords: rows
          },
          steps
        }
      })
      process.exitCode = CLI_EXIT.blocked

      return
    }

    const validation = buildKeywordResearchValidationRequests(finalists, plan)
    const serpResultTasks: unknown[] = []

    if (validation.serp.length > 0 && plan.serpMode === 'live') {
      const serp = await executeResearchStep({
        key: 'serp:live',
        name: 'serp-live',
        endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.serp,
        tasks: validation.serp,
        context,
        estimatedCostUsd: validation.serp.length * 0.002 * (plan.loadAiOverview ? 2 : 1)
      })

      steps.push(serp)
      serpResultTasks.push(...serp.tasks)
    }

    if (validation.serp.length > 0 && plan.serpMode === 'standard') {
      const post = await executeResearchStep({
        key: 'serp:post',
        name: 'serp-standard-submit',
        endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.serpStandardPost,
        tasks: validation.serp,
        context,
        estimatedCostUsd: validation.serp.length * 0.0006 * (plan.loadAiOverview ? 2 : 1),
        allowPending: true
      })

      steps.push(post)
      const results = await pollStandardSerp({ postStep: post, context, flags })

      steps.push(...results)
      results.forEach(step => serpResultTasks.push(...step.tasks))
    }

    if (serpResultTasks.length > 0) {
      rows = enrichKeywordResearchWithSerp({
        rows,
        tasks: serpResultTasks,
        target: plan.target,
        endpoint:
          plan.serpMode === 'standard'
            ? DATAFORSEO_RESEARCH_ENDPOINTS.serpStandardGet
            : DATAFORSEO_RESEARCH_ENDPOINTS.serp,
        observedAt: new Date().toISOString()
      })
    }

    if (validation.competitors) {
      const competitors = await executeResearchStep({
        key: 'competitors:0',
        name: 'competitors',
        endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.competitors,
        tasks: validation.competitors,
        context,
        estimatedCostUsd: labsRequestEstimate(validation.competitors),
        cacheable: true
      })

      steps.push(competitors)
      rows = enrichKeywordResearchWithCompetitors({
        rows,
        tasks: competitors.tasks,
        endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.competitors,
        observedAt: new Date().toISOString()
      })
    }

    const artifact = {
      ...preview,
      dryRun: false,
      queriedAt: new Date().toISOString(),
      organizationId,
      runId: context.checkpoint.runId,
      checkpoint: context.checkpointPath,
      result: {
        keywordCount: rows.length,
        finalistCount: finalists.length,
        actualCostUsd: context.checkpoint.actualCostUsd,
        keywords: rows
      },
      steps
    }

    await writeResearchArtifact({ artifact, rows, flags })
  } catch (error) {
    if (!(error instanceof ResearchStoppedError)) throw error
    printJson({
      ok: false,
      outcome: 'stopped',
      reason: error.message,
      runId: context.checkpoint.runId,
      checkpoint: context.checkpointPath,
      actualCostUsd: context.checkpoint.actualCostUsd
    })
    process.exitCode = error.exitCode
  }
}

const runAiResearch = async (flags: Flags) => {
  const panelPath = flag(flags, 'panel')

  if (!panelPath) throw new Error('ai-research exige --panel <archivo.json>.')

  const panel = parseDataForSeoAiResearchPanel(JSON.parse(await readFile(panelPath, 'utf8')) as unknown)
  const requests = buildDataForSeoAiResearchRequests(panel)
  const totalEstimateUsd = Number(requests.reduce((sum, request) => sum + request.estimatedCostUsd, 0).toFixed(6))
  const dryRun = boolFlag(flags, 'dry-run') || !boolFlag(flags, 'yes')

  const preview = {
    ok: true,
    dryRun,
    surface: 'dataforseo-ai-research',
    panel: {
      ...panel,
      digest: fingerprintDataForSeoResearch(panel),
      apiLaneCount: panel.lanes.filter(lane => lane.surface === 'api').length,
      consumerLaneCount: panel.lanes.filter(lane => lane.surface === 'consumer').length
    },
    requestCount: requests.length,
    estimatedCostUsd: totalEstimateUsd,
    requests: requests.map(request => ({
      key: request.key,
      platform: request.platform,
      model: request.model,
      surface: request.surface,
      endpoint: request.endpoint,
      estimatedCostUsd: request.estimatedCostUsd,
      taskCount: request.tasks.length
    }))
  }

  if (dryRun) {
    printJson(preview)
    if (!boolFlag(flags, 'yes')) console.error('Preview solamente. Agrega --yes para ejecutar.')

    return
  }

  const organizationId = flag(flags, 'org')
  const maxUsd = numberFlag(flags, 'max-usd')

  if (!organizationId) throw new Error('ai-research exige --org; no se inventan organizaciones.')
  if (maxUsd === undefined || maxUsd <= 0) throw new Error('ai-research exige --max-usd > 0.')

  if (panel.lanes.some(lane => lane.model?.startsWith('REEMPLAZAR_'))) {
    throw new Error('Reemplaza los modelos placeholder del panel con nombres obtenidos de los GET /models.')
  }

  const context = await initializeResearchContext({
    flags,
    kind: 'ai-research',
    plan: panel,
    organizationId,
    maxUsd,
    cacheMaxAgeHours: numberFlag(flags, 'cache-max-age-hours') ?? 24
  })

  const rows: DataForSeoAiResearchRow[] = []
  const steps: ResearchStepArtifact[] = []

  try {
    for (const request of requests) {
      const step = await executeResearchStep({
        key: request.key,
        name: request.laneId,
        endpointPath: request.endpoint,
        tasks: request.tasks,
        context,
        estimatedCostUsd: request.estimatedCostUsd,
        consumer: 'aeo',
        cacheable: true
      })

      steps.push(step)
      rows.push(
        normalizeDataForSeoAiResearchResponse({
          request,
          tasks: step.tasks,
          market: panel.market,
          observedAt: new Date().toISOString(),
          costUsd: step.reused ? (context.checkpoint.steps[request.key]?.costUsd ?? 0) : step.costUsd
        })
      )
    }

    const artifact = {
      ...preview,
      dryRun: false,
      queriedAt: new Date().toISOString(),
      organizationId,
      runId: context.checkpoint.runId,
      checkpoint: context.checkpointPath,
      result: {
        rowCount: rows.length,
        actualCostUsd: context.checkpoint.actualCostUsd,
        api: rows.filter(row => row.surface === 'api'),
        consumer: rows.filter(row => row.surface === 'consumer')
      },
      steps
    }

    const output = flag(flags, 'out')
    const csvOutput = flag(flags, 'csv')

    if (output) await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' })
    if (csvOutput) await writeFile(csvOutput, dataForSeoAiResearchRowsToCsv(rows), { flag: 'wx' })
    printJson(artifact)
  } catch (error) {
    if (!(error instanceof ResearchStoppedError)) throw error
    printJson({
      ok: false,
      outcome: 'stopped',
      reason: error.message,
      runId: context.checkpoint.runId,
      checkpoint: context.checkpointPath,
      actualCostUsd: context.checkpoint.actualCostUsd
    })
    process.exitCode = error.exitCode
  }
}

const run = async () => {
  loadGreenhouseToolEnv()
  const { positional, flags } = parseArgs(process.argv.slice(2))
  const [command, subcommand, selector] = positional

  if (!command || command === 'help' || boolFlag(flags, 'help')) return help()

  if (command === 'catalog') {
    if (subcommand === 'info') {
      const counts = DATAFORSEO_CATALOG.endpoints.reduce<Record<string, number>>((acc, endpoint) => {
        acc[endpoint.family] = (acc[endpoint.family] ?? 0) + 1

        return acc
      }, {})

      return printJson({
        ...DATAFORSEO_CATALOG.source,
        generatedAt: DATAFORSEO_CATALOG.generatedAt,
        endpointCount: DATAFORSEO_CATALOG.endpoints.length,
        families: counts
      })
    }

    if (subcommand === 'describe') {
      const endpoint = selector ? findDataForSeoEndpoint(selector) : null

      if (!endpoint) throw new Error(`Endpoint no encontrado: ${selector ?? '(vacío)'}.`)

      return boolFlag(flags, 'json')
        ? printJson(endpoint)
        : console.log(
            `${endpoint.method} ${endpoint.path}\n${endpoint.description}\n\nCampos:\n${endpoint.requestFields.map(field => `- ${field.name} (${field.type ?? 'unknown'})${field.required ? ' REQUIRED' : ''}: ${field.description}`).join('\n')}\n\n${endpoint.execution.status}${endpoint.execution.reason ? `: ${endpoint.execution.reason}` : ''}\n${endpoint.documentationUrl}`
          )
    }

    const endpoints =
      subcommand === 'search' ? searchDataForSeoCatalog(positional.slice(2).join(' ')) : DATAFORSEO_CATALOG.endpoints

    const family = flag(flags, 'family')
    const status = flag(flags, 'status')

    return printEndpoints(
      endpoints.filter(
        endpoint => (!family || endpoint.family === family) && (!status || endpoint.execution.status === status)
      ),
      boolFlag(flags, 'json')
    )
  }

  if (command === 'quick') {
    if (!subcommand || !isDataForSeoCliPreset(subcommand)) {
      throw new Error(`Preset desconocido. Usa: ${Object.keys(DATAFORSEO_CLI_PRESETS).join(', ')}.`)
    }

    const preset = DATAFORSEO_CLI_PRESETS[subcommand]
    const endpoint = findDataForSeoEndpoint(preset.endpoint)

    if (!endpoint) throw new Error(`El catálogo no contiene ${preset.endpoint}.`)

    const tasks = buildDataForSeoPresetPayload({
      preset: subcommand,
      keyword: flag(flags, 'keyword'),
      target: flag(flags, 'target'),
      market: flag(flags, 'market'),
      locale: flag(flags, 'locale'),
      device: flag(flags, 'device'),
      depth: numberFlag(flags, 'depth'),
      loadAiOverview: boolFlag(flags, 'load-ai-overview'),
      limit: numberFlag(flags, 'limit'),
      maxCrawlPages: numberFlag(flags, 'max-crawl-pages'),
      prompt: flag(flags, 'prompt'),
      model: flag(flags, 'model'),
      systemMessage: flag(flags, 'system-message'),
      maxOutputTokens: numberFlag(flags, 'max-output-tokens'),
      webSearch: boolFlag(flags, 'web-search'),
      forceWebSearch: boolFlag(flags, 'force-web-search'),
      platform: flag(flags, 'platform')
    })

    const estimate =
      preset.estimatePerTaskUsd === null
        ? null
        : preset.estimatePerTaskUsd *
          tasks.length *
          (subcommand === 'organic' ? Math.ceil((numberFlag(flags, 'depth') ?? 10) / 10) : 1) *
          (subcommand === 'organic' && boolFlag(flags, 'load-ai-overview') ? 2 : 1)

    return execute({ endpoint, tasks, flags, estimatedCostUsd: estimate, defaultConsumer: preset.consumer })
  }

  if (command === 'research') return runKeywordResearch(flags)
  if (command === 'ai-research') return runAiResearch(flags)
  if (command === 'serp-compare') return runSerpCompare(flags)

  if (command === 'run') {
    const endpoint = subcommand ? findDataForSeoEndpoint(subcommand) : null

    if (!endpoint) throw new Error(`Endpoint no encontrado: ${subcommand ?? '(vacío)'}.`)

    return execute({
      endpoint,
      tasks: endpoint.method === 'POST' ? await readPayload(flags) : [],
      flags,
      estimatedCostUsd: endpoint.free ? 0 : null
    })
  }

  if (command === 'task' && subcommand === 'wait') {
    const endpoint = selector ? findDataForSeoEndpoint(selector) : null
    const taskId = flag(flags, 'task-id')

    if (!endpoint || !taskId) throw new Error('task wait exige endpoint task_get y --task-id.')

    const deadline = Date.now() + (numberFlag(flags, 'timeout-ms') ?? 120_000)
    const interval = Math.max(1_000, numberFlag(flags, 'poll-ms') ?? 5_000)

    while (Date.now() < deadline) {
      await execute({ endpoint, tasks: [], flags: { ...flags, yes: true }, estimatedCostUsd: 0, taskId })
      if (process.exitCode !== CLI_EXIT.pending) return
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Polling agotó el timeout sin estado terminal; la task no fue resubmitted.')
  }

  throw new Error(`Comando desconocido: ${command}.`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run()
    .catch(error => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = CLI_EXIT.usage
    })
    .finally(async () => {
      const { closeGreenhousePostgres } = await import('@/lib/postgres/client')

      await closeGreenhousePostgres({ source: 'dataforseo-cli' })
    })
    .catch(error => {
      console.error(`No se pudieron cerrar los recursos de la CLI: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = CLI_EXIT.transportError
    })
}
