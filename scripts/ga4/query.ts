/**
 * `pnpm ga4:query` — consultas de solo lectura a GA4 sin OAuth de la app ni variables de Vercel.
 *
 * Autenticación: tu ADC local de gcloud impersona la cuenta de servicio de Efeonce
 * (`greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com`, override con GA4_QUERY_SERVICE_ACCOUNT)
 * con scope `analytics.readonly`. No lee `.env.local`, no toca PostgreSQL ni Secret Manager.
 * Requisito por propiedad: la cuenta de servicio debe estar agregada como Lector en GA4
 * (Administrar › Acceso a la propiedad). Si falta, `doctor` lo dice.
 *
 * Uso:
 *   pnpm ga4:query doctor   --property sky
 *   pnpm ga4:query report   --property sky --from 2026-10-01 --to 2026-10-31 \
 *                           --dims yearMonth --metrics sessions --filter hostName=blog.skyairline.com \
 *                           --filter sessionDefaultChannelGroup="Organic Search" [--out oct.csv]
 *   pnpm ga4:query report   --property sky --body-file body.json [--out out.json]
 *   pnpm ga4:query funnel   --property sky --body-file funnel.json [--out out.json]
 *   pnpm ga4:query admin    --property sky keyEvents|dataStreams|customDimensions|customMetrics|property
 *   pnpm ga4:query metadata --property sky [--grep purchase]
 *   pnpm ga4:query batch    --property sky specs.mjs out/dir [--force]
 *
 * `--property` acepta un id numérico o un alias de PROPERTY_ALIASES.
 * `batch` lee un .mjs/.json con [{ name, kind: 'report'|'funnel'|'admin', body?, resource? }]
 * y guarda un JSON por consulta (con capturedAt); salta las que ya existen salvo --force.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { GoogleAuth, Impersonated } from 'google-auth-library'

const SERVICE_ACCOUNT =
  process.env.GA4_QUERY_SERVICE_ACCOUNT ?? 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'

const READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const DATA_V1BETA = 'https://analyticsdata.googleapis.com/v1beta'
const DATA_V1ALPHA = 'https://analyticsdata.googleapis.com/v1alpha'
const ADMIN_V1BETA = 'https://analyticsadmin.googleapis.com/v1beta'

/** Alias de conveniencia. El id es lo que manda; un alias no concede acceso. */
const PROPERTY_ALIASES: Record<string, string> = {
  efeoncepro: '486264460',
  'efeonce-cl': '347852876',
  sky: '354430952'
}

const ADMIN_RESOURCES: Record<string, string> = {
  property: '',
  keyEvents: '/keyEvents',
  dataStreams: '/dataStreams',
  customDimensions: '/customDimensions',
  customMetrics: '/customMetrics'
}

class CliError extends Error {}

// ─── Argumentos ────────────────────────────────────────────────────────────────────────────────

type Args = { positional: string[]; flags: Map<string, string[]> }

const parseArgs = (argv: string[]): Args => {
  const positional: string[] = []
  const flags = new Map<string, string[]>()

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }

    const [key, inline] = token.slice(2).split(/=(.*)/s, 2)
    const next = argv[i + 1]
    const value = inline ?? (next !== undefined && !next.startsWith('--') ? (i++, next) : 'true')

    flags.set(key, [...(flags.get(key) ?? []), value])
  }

  return { positional, flags }
}

const flag = (args: Args, key: string) => args.flags.get(key)?.at(-1)
const flagList = (args: Args, key: string) => (args.flags.get(key) ?? []).flatMap(v => v.split(',')).filter(Boolean)

const resolveProperty = (args: Args) => {
  const raw = flag(args, 'property')

  if (!raw) throw new CliError('Falta --property <id|alias>. Alias: ' + Object.keys(PROPERTY_ALIASES).join(', '))
  const id = PROPERTY_ALIASES[raw] ?? raw

  if (!/^\d+$/.test(id)) throw new CliError(`Propiedad inválida: ${raw}`)

  return id
}

// ─── Token por impersonación (sin OAuth de la app) ─────────────────────────────────────────────

let cached: { token: string; at: number } | undefined

const accessToken = async () => {
  if (cached && Date.now() - cached.at < 45 * 60 * 1000) return cached.token

  const sourceClient = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient()

  const impersonated = new Impersonated({
    sourceClient,
    targetPrincipal: SERVICE_ACCOUNT,
    targetScopes: [READONLY_SCOPE],
    lifetime: 3600
  })

  const { token } = await impersonated.getAccessToken()

  if (!token) throw new CliError(`No se pudo obtener token impersonando ${SERVICE_ACCOUNT}`)
  cached = { token, at: Date.now() }

  return token
}

// ─── HTTP ──────────────────────────────────────────────────────────────────────────────────────

const call = async (url: string, body?: unknown): Promise<Record<string, any>> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })

    if (res.status === 429 || res.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)))
      continue
    }

    const text = await res.text()

    if (res.status === 403) {
      throw new CliError(
        `403 en ${new URL(url).pathname}. La cuenta de servicio ${SERVICE_ACCOUNT} no tiene acceso a esa propiedad: ` +
          'un administrador de la propiedad debe agregarla como Lector (Administrar › Acceso a la propiedad).'
      )
    }

    if (!res.ok) throw new CliError(`GA4 ${res.status}: ${text.slice(0, 1200)}`)

    return JSON.parse(text)
  }

  throw new CliError('GA4 no respondió tras 5 intentos (429/5xx).')
}

const runReport = async (propertyId: string, body: Record<string, unknown>) => {
  const rows: unknown[] = []
  let first: Record<string, any> | undefined
  let offset = 0

  for (;;) {
    const page = await call(`${DATA_V1BETA}/properties/${propertyId}:runReport`, {
      limit: '100000',
      ...body,
      offset: String(offset)
    })

    first ??= page
    rows.push(...(page.rows ?? []))
    offset += (page.rows ?? []).length
    if (!page.rows?.length || offset >= (page.rowCount ?? 0)) break
  }

  return { ...first, rows }
}

const runFunnel = (propertyId: string, body: unknown) =>
  call(`${DATA_V1ALPHA}/properties/${propertyId}:runFunnelReport`, body)

const getAdmin = async (propertyId: string, resource: string) => {
  if (!(resource in ADMIN_RESOURCES)) {
    throw new CliError(`Recurso Admin no soportado: ${resource}. Opciones: ${Object.keys(ADMIN_RESOURCES).join(', ')}`)
  }

  return call(`${ADMIN_V1BETA}/properties/${propertyId}${ADMIN_RESOURCES[resource]}`)
}

// ─── Cuerpo del reporte desde flags ────────────────────────────────────────────────────────────

const reportBodyFromFlags = async (args: Args): Promise<Record<string, unknown>> => {
  const file = flag(args, 'body-file')
  const inline = flag(args, 'body')

  if (file) return JSON.parse(await fs.readFile(file, 'utf8'))
  if (inline) return JSON.parse(inline)

  const from = flag(args, 'from')
  const to = flag(args, 'to')
  const metrics = flagList(args, 'metrics')

  if (!from || !to || metrics.length === 0) {
    throw new CliError('report necesita --body/--body-file, o --from --to --metrics (y opcional --dims, --filter, --limit).')
  }

  const filters = (args.flags.get('filter') ?? []).map(expression => {
    const [field, value] = expression.split(/=(.*)/s, 2)

    if (!field || value === undefined) throw new CliError(`--filter espera campo=valor: ${expression}`)

    return { filter: { fieldName: field, stringFilter: { matchType: 'EXACT', value } } }
  })

  return {
    dateRanges: [{ startDate: from, endDate: to }],
    dimensions: flagList(args, 'dims').map(name => ({ name })),
    metrics: metrics.map(name => ({ name })),
    ...(filters.length ? { dimensionFilter: filters.length === 1 ? filters[0] : { andGroup: { expressions: filters } } } : {}),
    ...(flag(args, 'limit') ? { limit: flag(args, 'limit') } : {})
  }
}

// ─── Salida ────────────────────────────────────────────────────────────────────────────────────

const toCsv = (report: Record<string, any>) => {
  const headers = [
    ...(report.dimensionHeaders ?? []).map((h: { name: string }) => h.name),
    ...(report.metricHeaders ?? []).map((h: { name: string }) => h.name)
  ]

  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

  const lines = (report.rows ?? []).map((row: Record<string, any>) =>
    [...(row.dimensionValues ?? []), ...(row.metricValues ?? [])].map((cell: { value?: string }) => escape(cell.value ?? '')).join(',')
  )

  return [headers.join(','), ...lines].join('\n') + '\n'
}

const emit = async (args: Args, result: Record<string, any>, csvable: boolean) => {
  const out = flag(args, 'out')

  if (out) {
    await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true })
    const payload = out.endsWith('.csv') && csvable ? toCsv(result) : JSON.stringify({ capturedAt: new Date().toISOString(), result }, null, 2)

    await fs.writeFile(out, payload)
    console.error(`guardado ${out}${csvable ? ` (${result.rows?.length ?? 0} filas)` : ''}`)

    return
  }

  process.stdout.write(csvable && flag(args, 'format') !== 'json' ? toCsv(result) : JSON.stringify(result, null, 2) + '\n')
}

// ─── Comandos ──────────────────────────────────────────────────────────────────────────────────

const doctor = async (args: Args) => {
  console.log(`Cuenta de servicio: ${SERVICE_ACCOUNT}`)

  try {
    await accessToken()
    console.log('✓ Token por impersonación (ADC local de gcloud)')
  } catch (error) {
    console.log('✗ No se pudo impersonar la cuenta de servicio.')
    console.log('  Revisa `gcloud auth application-default login` y el rol Service Account Token Creator sobre la cuenta.')
    throw error
  }

  const propertyId = flag(args, 'property') ? resolveProperty(args) : undefined

  if (!propertyId) return

  const property = await getAdmin(propertyId, 'property')

  console.log(`✓ Propiedad ${propertyId}: ${property.displayName} (${property.timeZone}, ${property.currencyCode})`)

  const probe = await runReport(propertyId, {
    dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
    metrics: [{ name: 'sessions' }]
  })

  // `runReport` acumula filas como `unknown[]`; aquí sólo se lee el primer valor del probe.
  const firstRow = probe.rows?.[0] as { metricValues?: { value?: string }[] } | undefined

  console.log(`✓ Data API: ${firstRow?.metricValues?.[0]?.value ?? 0} sesiones ayer`)
}

const batch = async (args: Args, propertyId: string) => {
  const [specFile, outDir] = args.positional.slice(1)

  if (!specFile || !outDir) throw new CliError('batch espera <specs.mjs|json> <outDir>')
  await fs.mkdir(outDir, { recursive: true })

  const specs: Array<{ name: string; kind: 'report' | 'funnel' | 'admin'; body?: Record<string, unknown>; resource?: string }> =
    specFile.endsWith('.json')
      ? JSON.parse(await fs.readFile(specFile, 'utf8'))
      : (await import(pathToFileURL(path.resolve(specFile)).href)).default

  for (const spec of specs) {
    const file = path.join(outDir, `${spec.name}.json`)

    if (flag(args, 'force') !== 'true' && (await fs.stat(file).then(() => true, () => false))) {
      console.log('skip  ', spec.name)
      continue
    }

    try {
      const result =
        spec.kind === 'report'
          ? await runReport(propertyId, spec.body!)
          : spec.kind === 'funnel'
            ? await runFunnel(propertyId, spec.body)
            : await getAdmin(propertyId, spec.resource!)

      await fs.writeFile(file, JSON.stringify({ capturedAt: new Date().toISOString(), propertyId, spec, result }))
      console.log('saved ', spec.name, result.rows ? `(${result.rows.length} filas)` : '')
    } catch (error) {
      console.log('ERROR ', spec.name, error instanceof Error ? error.message : error)
    }
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const command = args.positional[0]

  switch (command) {
    case 'doctor':
      return doctor(args)
    case 'report':
      return emit(args, await runReport(resolveProperty(args), await reportBodyFromFlags(args)), true)

    case 'funnel': {
      const file = flag(args, 'body-file')

      if (!file) throw new CliError('funnel espera --body-file funnel.json')

      return emit(args, await runFunnel(resolveProperty(args), JSON.parse(await fs.readFile(file, 'utf8'))), false)
    }

    case 'admin':
      return emit(args, await getAdmin(resolveProperty(args), args.positional[1] ?? 'property'), false)

    case 'metadata': {
      const meta = await call(`${DATA_V1BETA}/properties/${resolveProperty(args)}/metadata`)
      const grep = flag(args, 'grep')?.toLowerCase()

      const items = [...(meta.dimensions ?? []).map((d: any) => ['dim', d]), ...(meta.metrics ?? []).map((m: any) => ['met', m])]
        .filter(([, item]) => !grep || `${item.apiName} ${item.uiName}`.toLowerCase().includes(grep))

      for (const [kind, item] of items) console.log(`${kind}  ${item.apiName}  —  ${item.uiName}`)

      return
    }

    case 'batch':
      return batch(args, resolveProperty(args))
    default:
      console.log(
        'Uso: pnpm ga4:query <doctor|report|funnel|admin|metadata|batch> --property <id|alias> …\n' +
          'Ver el encabezado de scripts/ga4/query.ts para ejemplos.'
      )
  }
}

main().then(
  () => process.exit(0),
  error => {
    console.error(error instanceof CliError ? `✗ ${error.message}` : error)
    process.exit(1)
  }
)
