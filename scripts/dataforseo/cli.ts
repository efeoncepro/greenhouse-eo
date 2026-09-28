import { readFile, writeFile } from 'node:fs/promises'

import '@/lib/growth/seo/register-provider-spend'

import {
  DATAFORSEO_CATALOG,
  findDataForSeoEndpoint,
  searchDataForSeoCatalog,
  type DataForSeoCatalogEndpoint
} from '@/lib/ai/dataforseo-catalog'
import {
  buildDataForSeoPresetPayload,
  DATAFORSEO_CLI_PRESETS,
  isDataForSeoCliPreset
} from '@/lib/ai/dataforseo-cli-presets'
import {
  buildKeywordOverviewTasks,
  buildKeywordResearchDiscoveryRequests,
  buildKeywordResearchPlan,
  buildKeywordResearchValidationRequests,
  DATAFORSEO_RESEARCH_ENDPOINTS,
  extractKeywordResearchRows,
  keywordResearchRowsToCsv,
  mergeKeywordResearchRows,
  type DataForSeoKeywordResearchRow
} from '@/lib/ai/dataforseo-keyword-research'
import { requestDataForSeo, type DataForSeoRequestInput } from '@/lib/ai/dataforseo'
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
  pnpm dataforseo -- quick organic --keyword "..." --market US --locale en-US --yes --max-usd 0.01
  pnpm dataforseo -- quick keyword-overview --keyword "uno,dos" --market PE --org <uuid> --estimated-usd <n> --max-usd <n> --yes
  pnpm dataforseo -- quick ranked-keywords|competitors|backlinks|onpage-instant|onpage-audit --target <dominio|url> ...

Research compuesto
  pnpm dataforseo -- research --keyword "seed uno,seed dos" --market CL --target ejemplo.com --dry-run
  pnpm dataforseo -- research --keyword "..." --market MX --org <uuid> --max-usd <n> --yes --out research.json --csv research.csv
  Usa Suggestions + Related; --include-ideas agrega expansión categorial sólo para seeds homogéneas.

Ejecución genérica
  pnpm dataforseo -- run <id|path> --file payload.json|--json-input '[{...}]'|--stdin --dry-run
  pnpm dataforseo -- task wait <task-get-id|path> --task-id <uuid> --org <uuid> --timeout-ms 120000

Guardas
  Sin --yes, toda operación pagada queda en preview. Un POST pagado exige --estimated-usd y --max-usd,
  salvo presets con estimación oficial conocida. --max-usd compara la estimación; no es un tope del proveedor.
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

export const validateAiOptimizationSafety = (
  endpoint: DataForSeoCatalogEndpoint,
  tasks: Record<string, unknown>[]
) => {
  if (!endpoint.path.startsWith('/v3/ai_optimization/') || endpoint.method !== 'POST') return

  if (endpoint.path.includes('/llm_responses/') && tasks.some(task => task.max_output_tokens === undefined)) {
    throw new Error('LLM Responses exige max_output_tokens explícito para acotar la generación.')
  }

  if (endpoint.path.includes('/llm_mentions/') && tasks.some(task => !['chat_gpt', 'google'].includes(String(task.platform)))) {
    throw new Error('LLM Mentions exige platform explícita: chat_gpt o google; no se mezclan superficies.')
  }
}

const execute = async (input: {
  endpoint: DataForSeoCatalogEndpoint
  tasks: Record<string, unknown>[]
  flags: Flags
  estimatedCostUsd: number | null
  defaultConsumer?: 'seo' | 'aeo'
  taskId?: string
}) => {
  const { endpoint, tasks, flags } = input
  const organizationId = flag(flags, 'org')
  const dryRun = boolFlag(flags, 'dry-run') || !boolFlag(flags, 'yes')
  const maxUsd = numberFlag(flags, 'max-usd')
  const estimatedUsd = numberFlag(flags, 'estimated-usd') ?? input.estimatedCostUsd
  const resolvedEndpoint = resolveEndpointWithTaskId(endpoint, input.taskId)
  const isPaidPost = endpoint.method === 'POST' && !endpoint.free

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

  const consumer = flag(flags, 'consumer') ?? input.defaultConsumer ??
    (endpoint.execution.internalFamily === 'ai_optimization' ? 'aeo' : 'seo')

  const preview = {
    ok: true,
    dryRun,
    endpoint: { id: endpoint.id, method: endpoint.method, path: resolvedEndpoint },
    family: endpoint.execution.internalFamily,
    organizationId: endpoint.method === 'POST' ? organizationId ?? null : null,
    consumer,
    taskCount: tasks.length,
    tasks,
    batchLimit: endpoint.batchLimit,
    estimatedCostUsd: estimatedUsd,
    estimateStatus: estimatedUsd === null ? 'unavailable' : 'available',
    maxUsd: maxUsd ?? null,
    source: { documentationUrl: endpoint.documentationUrl, sourceModifiedAt: endpoint.sourceModifiedAt }
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

  if (endpoint.method === 'POST' && organizationId) {
    const gate = await enforceSeoRunEntitlement(organizationId, {
      estimatedCostUsd: estimatedUsd ?? undefined,
      consumesAuditAllowance: false
    })

    if (!gate.allowed) {
      printJson({
        ...preview,
        ok: false,
        blockedReason: gate.blockedReason,
        budgetRemainingUsd: gate.budgetRemainingUsd
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
    tasks,
    ...(endpoint.method === 'POST' && organizationId ? { organizationId } : {}),
    ...(numberFlag(flags, 'timeout-ms') ? { timeoutMs: numberFlag(flags, 'timeout-ms') } : {})
  } as DataForSeoRequestInput

  const response = await requestDataForSeo(request)
  const taskCodes = summarizeTaskCodes(response.tasks)
  const outcome = classifyDataForSeoOutcome({ httpOk: response.ok, taskCodes })

  const artifact = {
    ok: outcome.kind === 'success',
    outcome: outcome.kind,
    queriedAt: new Date().toISOString(),
    surface: 'dataforseo-cli',
    request: preview,
    response: {
      httpStatus: response.httpStatus,
      latencyMs: response.latencyMs,
      breakerOpen: response.breakerOpen ?? false,
      taskCodes,
      costUsd: response.cost,
      tasks: response.tasks
    }
  }

  const output = flag(flags, 'out')

  if (output) await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' })
  printJson(artifact)
  process.exitCode = outcome.exitCode
}

type ResearchStepArtifact = {
  name: string
  endpoint: string
  taskCount: number
  outcome: ReturnType<typeof classifyDataForSeoOutcome>['kind']
  costUsd: number
  taskCodes: ReturnType<typeof summarizeTaskCodes>
  tasks: unknown[]
}

const executeResearchStep = async (input: {
  name: string
  endpointPath: string
  tasks: Record<string, unknown>[]
  organizationId: string
}): Promise<ResearchStepArtifact> => {
  const endpoint = findDataForSeoEndpoint(input.endpointPath)

  if (!endpoint || endpoint.execution.status !== 'executable' || !endpoint.execution.internalFamily) {
    throw new Error(`El paso ${input.name} no tiene un endpoint ejecutable: ${input.endpointPath}.`)
  }

  validatePayload(endpoint, input.tasks)

  const request = {
    family: endpoint.execution.internalFamily,
    consumer: 'seo',
    method: 'POST',
    endpoint: endpoint.path,
    tasks: input.tasks,
    organizationId: input.organizationId
  } as DataForSeoRequestInput

  const response = await requestDataForSeo(request)

  const taskCodes = summarizeTaskCodes(response.tasks)
  const outcome = classifyDataForSeoOutcome({ httpOk: response.ok, taskCodes })

  if (outcome.kind === 'transport_error' || outcome.kind === 'provider_task_error' || outcome.kind === 'pending') {
    throw new Error(
      `Research se detuvo en ${input.name}: ${outcome.kind} (${taskCodes.map(task => task.statusCode).join(', ')}).`
    )
  }

  return {
    name: input.name,
    endpoint: endpoint.path,
    taskCount: input.tasks.length,
    outcome: outcome.kind,
    costUsd: response.cost ?? 0,
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
    sources: ['manual_seed']
  }))

const runKeywordResearch = async (flags: Flags) => {
  const keyword = flag(flags, 'keyword')

  if (!keyword) throw new Error('research exige --keyword "seed uno,seed dos".')

  const plan = buildKeywordResearchPlan({
    keyword,
    market: flag(flags, 'market'),
    locale: flag(flags, 'locale'),
    target: flag(flags, 'target'),
    discoveryLimit: numberFlag(flags, 'limit'),
    candidateLimit: numberFlag(flags, 'candidate-limit'),
    serpLimit: numberFlag(flags, 'serp-limit'),
    competitorLimit: numberFlag(flags, 'competitor-limit'),
    includeIdeas: boolFlag(flags, 'include-ideas')
  })

  const dryRun = boolFlag(flags, 'dry-run') || !boolFlag(flags, 'yes')

  const preview = {
    ok: true,
    dryRun,
    surface: 'dataforseo-keyword-research',
    plan,
    declarations: [
      'DataForSEO es una lente estimada de mercado.',
      'El límite declarado produce una muestra; no demuestra exhaustividad.',
      'searchVolumeState conserva missing, null y value como estados distintos.',
      'SERP se consulta sólo para las candidatas finalistas.'
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
  if (maxUsd === undefined) throw new Error('research exige --max-usd para ejecutar.')

  if (plan.estimatedCostUsd > maxUsd) {
    throw new Error(`Costo estimado USD ${plan.estimatedCostUsd} supera --max-usd ${maxUsd}.`)
  }

  const gate = await enforceSeoRunEntitlement(organizationId, {
    estimatedCostUsd: plan.estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    printJson({ ...preview, ok: false, blockedReason: gate.blockedReason, budgetRemainingUsd: gate.budgetRemainingUsd })
    process.exitCode = CLI_EXIT.blocked

    return
  }

  const steps: ResearchStepArtifact[] = []
  const discoveredRows: DataForSeoKeywordResearchRow[] = seedRows(plan.seeds)
  const discovery = buildKeywordResearchDiscoveryRequests(plan)

  for (const [name, tasks] of Object.entries(discovery)) {
    const endpointPath = DATAFORSEO_RESEARCH_ENDPOINTS[name as keyof typeof DATAFORSEO_RESEARCH_ENDPOINTS]
    const step = await executeResearchStep({ name, endpointPath, tasks, organizationId })

    steps.push(step)
    discoveredRows.push(...extractKeywordResearchRows(step.tasks, name))
  }

  let rows = mergeKeywordResearchRows(discoveredRows).slice(0, plan.candidateLimit)
  const overviewTasks = buildKeywordOverviewTasks(rows, plan)

  if (overviewTasks.length > 0) {
    const overview = await executeResearchStep({
      name: 'overview',
      endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.overview,
      tasks: overviewTasks,
      organizationId
    })

    steps.push(overview)
    rows = mergeKeywordResearchRows([...rows, ...extractKeywordResearchRows(overview.tasks, 'overview')]).slice(
      0,
      plan.candidateLimit
    )
  }

  const validation = buildKeywordResearchValidationRequests(rows, plan)

  if (validation.serp.length > 0) {
    steps.push(
      await executeResearchStep({
        name: 'serp',
        endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.serp,
        tasks: validation.serp,
        organizationId
      })
    )
  }

  if (validation.competitors) {
    steps.push(
      await executeResearchStep({
        name: 'competitors',
        endpointPath: DATAFORSEO_RESEARCH_ENDPOINTS.competitors,
        tasks: validation.competitors,
        organizationId
      })
    )
  }

  const artifact = {
    ...preview,
    dryRun: false,
    queriedAt: new Date().toISOString(),
    organizationId,
    result: {
      keywordCount: rows.length,
      finalistCount: validation.serp.length,
      actualCostUsd: Number(steps.reduce((sum, step) => sum + step.costUsd, 0).toFixed(6)),
      keywords: rows
    },
    steps
  }

  const output = flag(flags, 'out')
  const csvOutput = flag(flags, 'csv')

  if (output) await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' })
  if (csvOutput) await writeFile(csvOutput, keywordResearchRowsToCsv(rows), { flag: 'wx' })
  printJson(artifact)
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
      limit: numberFlag(flags, 'limit'),
      maxCrawlPages: numberFlag(flags, 'max-crawl-pages')
      ,prompt: flag(flags, 'prompt')
      ,model: flag(flags, 'model')
      ,systemMessage: flag(flags, 'system-message')
      ,maxOutputTokens: numberFlag(flags, 'max-output-tokens')
      ,webSearch: boolFlag(flags, 'web-search')
      ,forceWebSearch: boolFlag(flags, 'force-web-search')
      ,platform: flag(flags, 'platform')
    })

    const estimate = preset.estimatePerTaskUsd === null ? null : preset.estimatePerTaskUsd * tasks.length

    return execute({ endpoint, tasks, flags, estimatedCostUsd: estimate, defaultConsumer: preset.consumer })
  }

  if (command === 'research') return runKeywordResearch(flags)

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
  run().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = CLI_EXIT.usage
  })
}
