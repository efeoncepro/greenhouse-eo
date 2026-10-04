#!/usr/bin/env node
import { parseArgs, promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { readFile, stat, open } from 'node:fs/promises'

import { StudioClient, CliError, redact } from './client.mjs'
import { uploadFile, confirmUpload } from './upload.mjs'
import { downloadAsset } from './download.mjs'

const HELP = `Marketing Studio · cliente API (Node 24)

pnpm studio list [--filter copy]
pnpm studio describe <operationId | studio.tool.name>
pnpm studio call <operación> [--param clave=valor ...] [--file body.json|-]
  [--apply] [--confirm] [--key clave-idempotente] [--if-match revisión]
  [--output archivo]
pnpm studio upload <archivo ...> --campaign CMP-### --asset <id> --license owned
  [--metadata metadata.json] [--reference texto] [--territory CL ...] [--channel clave ...]
  [--new-asset --concept id --title texto --ratio 4x5] [--note texto]
  [--apply] [--wait-seconds 600]
pnpm studio upload --campaign CMP-### --resume <uploadId> [--apply]
pnpm studio download --asset <id> --version <n> --output <archivo> [--organization <id>]
pnpm studio doctor

Opciones comunes: --base-url https://studio.efeonce.org
  --token-file <archivo 0600> | --token-secret <Secret Manager id>
  --project <GCP project para --token-secret>
Entorno: STUDIO_API_URL, STUDIO_API_TOKEN. Nunca pases el token como argumento.
Las escrituras validan sin persistir por defecto; --apply ejecuta.
--confirm declara intención local para T2; la API sigue exigiendo autoridad.
--output guarda JSON redactado o bytes de una lectura; no sobrescribe archivos.
El esquema completo de cada cuerpo se obtiene con describe (OpenAPI en vivo).
`

let activeToken
const print = value => process.stdout.write(`${JSON.stringify(redact(value, [activeToken]), null, 2)}\n`)
const log = value => process.stderr.write(`${JSON.stringify(redact(value, [activeToken]))}\n`)

async function jsonFile(path) {
  try {
    if (path !== '-') return JSON.parse(await readFile(path, 'utf8'))
    const chunks = []
    let size = 0

    for await (const chunk of process.stdin) {
      size += chunk.length
      if (size > 10 * 1024 * 1024) throw new CliError('JSON de stdin demasiado grande.')
      chunks.push(chunk)
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new CliError('No se pudo leer JSON válido del archivo indicado.')
  }
}

async function tokenFor(values) {
  const sources = [
    Boolean(process.env.STUDIO_API_TOKEN),
    Boolean(values['token-file']),
    Boolean(values['token-secret'])
  ].filter(Boolean).length

  if (sources > 1) throw new CliError('Elige una sola fuente de token: entorno, archivo o Secret Manager.')

  if (values['token-file']) {
    const handle = await open(values['token-file'], 'r')

    try {
      const info = await handle.stat()

      if (!info.isFile() || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid()))
        throw new CliError('El archivo del token debe ser privado (0600) y de tu usuario.')

      return (await handle.readFile('utf8')).trim()
    } finally {
      await handle.close()
    }
  }

  if (values['token-secret']) {
    if (
      !/^[a-zA-Z0-9_-]+$/.test(values['token-secret']) ||
      !values.project ||
      !/^[a-zA-Z0-9_.:-]+$/.test(values.project)
    )
      throw new CliError('--token-secret requiere un id válido y --project explícito.')

    try {
      const { stdout } = await promisify(execFile)(
        'gcloud',
        ['secrets', 'versions', 'access', 'latest', '--secret', values['token-secret'], '--project', values.project],
        { timeout: 30_000, maxBuffer: 64 * 1024 }
      )

      return stdout.trim()
    } catch {
      throw new CliError('No se pudo leer el secreto con la identidad gcloud vigente.')
    }
  }

  return process.env.STUDIO_API_TOKEN?.trim()
}

async function saveResult(result, path) {
  if (!path) {
    if (result.data === null && result.status !== 204)
      throw new CliError('Respuesta binaria; vuelve a ejecutar con --output.')
    print({ httpStatus: result.status, ...(result.key ? { idempotencyKey: result.key } : {}), data: result.data })

    return
  }

  const handle = await open(path, 'wx', 0o600)

  try {
    if (result.data !== null || !result.response || result.status === 204)
      await handle.writeFile(
        JSON.stringify(
          redact({ httpStatus: result.status, idempotencyKey: result.key, data: result.data }, [activeToken]),
          null,
          2
        ) + '\n'
      )
    else await handle.writeFile(result.response.body)
  } finally {
    await handle.close()
  }

  print({ saved: path, httpStatus: result.status })
}

async function main() {
  const strings = [
    'filter',
    'base-url',
    'file',
    'key',
    'if-match',
    'output',
    'token-file',
    'token-secret',
    'project',
    'campaign',
    'asset',
    'metadata',
    'license',
    'reference',
    'from',
    'until',
    'note',
    'concept',
    'title',
    'ratio',
    'resume',
    'wait-seconds',
    'version',
    'organization'
  ]

  const booleans = ['help', 'apply', 'confirm', 'dry-run', 'new-asset']

  const options = Object.fromEntries([
    ...strings.map(name => [name, { type: 'string' }]),
    ...booleans.map(name => [name, { type: 'boolean' }]),
    ...['param', 'territory', 'channel'].map(name => [name, { type: 'string', multiple: true }])
  ])

  let parsed

  try {
    parsed = parseArgs({ options, allowPositionals: true, strict: true })
  } catch {
    throw new CliError('Argumentos inválidos. Usa pnpm studio --help.')
  }

  const { values, positionals } = parsed
  const [command, ...args] = positionals

  if (!command || values.help || command === 'help') {
    process.stdout.write(HELP)

    return
  }

  if (!['list', 'describe', 'call', 'upload', 'download', 'doctor'].includes(command))
    throw new CliError('Comando desconocido. Usa --help.')
  const common = ['help', 'base-url', 'token-file', 'token-secret', 'project']

  const perCommand = {
    list: ['filter'],
    describe: [],
    doctor: [],
    download: ['asset', 'version', 'organization', 'output'],
    call: ['param', 'file', 'apply', 'confirm', 'dry-run', 'key', 'if-match', 'output'],
    upload: [
      'campaign',
      'asset',
      'metadata',
      'license',
      'reference',
      'from',
      'until',
      'territory',
      'channel',
      'note',
      'new-asset',
      'concept',
      'title',
      'ratio',
      'resume',
      'wait-seconds',
      'apply',
      'dry-run',
      'output'
    ]
  }

  for (const name of Object.keys(values))
    if (![...common, ...perCommand[command]].includes(name)) throw new CliError(`--${name} no aplica a ${command}.`)
  if (
    ['call', 'describe'].includes(command)
      ? args.length !== 1
      : ['list', 'doctor', 'download'].includes(command) && args.length !== 0
  )
    throw new CliError('Número de argumentos incorrecto. Usa --help.')
  if (values.apply && values['dry-run']) throw new CliError('--apply y --dry-run son incompatibles.')

  if (values.output) {
    // Reserve nothing before execution, but reject an existing result before any mutation.
    const exists = await stat(values.output).then(
      () => true,
      error => {
        if (error.code === 'ENOENT') return false
        throw error
      }
    )

    if (exists) throw new CliError('--output ya existe; elige otro archivo.')
  }

  activeToken = await tokenFor(values)
  if ((values['token-file'] || values['token-secret']) && !activeToken)
    throw new CliError('La fuente del token está vacía.')

  const client = await new StudioClient({
    baseUrl: values['base-url'] ?? process.env.STUDIO_API_URL,
    token: activeToken,
    log
  }).discover()

  if (command === 'list') {
    print({
      apiVersion: client.manifest.apiVersion,
      manifestHash: client.manifest.manifestHash,
      operations: [...client.operations.values()]
        .filter(
          op =>
            !values.filter ||
            `${op.id} ${op.tool?.name} ${op.spec.summary}`.toLowerCase().includes(values.filter.toLowerCase())
        )
        .map(op => ({
          operationId: op.id,
          tool: op.tool?.name ?? null,
          method: op.method,
          path: op.path,
          riskTier: op.tool?.riskTier ?? 'T0',
          apiScope: op.tool?.apiScope ?? null,
          requiresPerson: op.tool?.requiresPerson ?? false,
          summary: op.spec.summary
        }))
    })
  } else if (command === 'describe') print(client.describe(args[0]))
  else if (command === 'doctor') {
    const health = await client.call('getHealth')

    print({
      baseUrl: client.baseUrl,
      authenticated: Boolean(activeToken),
      apiVersion: client.manifest.apiVersion,
      tools: client.aliases.size,
      operations: client.operations.size,
      health: health.data,
      note: 'Contrato y salud verificados; esto no certifica permisos de escritura.'
    })
  } else if (command === 'download') {
    if (!values.asset || !values.version || !values.output)
      throw new CliError('download requiere --asset, --version y --output.')
    print(
      await downloadAsset(client, {
        assetId: values.asset,
        versionNo: values.version,
        organizationId: values.organization,
        output: values.output
      })
    )
  } else if (command === 'call') {
    const params = Object.create(null)

    for (const entry of values.param ?? []) {
      const index = entry.indexOf('=')

      if (index < 1 || Object.hasOwn(params, entry.slice(0, index)))
        throw new CliError('--param requiere clave=valor sin claves duplicadas.')
      params[entry.slice(0, index)] = entry.slice(index + 1)
    }

    const result = await client.call(args[0], {
      params,
      body: values.file ? await jsonFile(values.file) : undefined,
      apply: values.apply,
      confirm: values.confirm,
      key: values.key,
      revision: values['if-match']
    })

    await saveResult(result, values.output)
  } else {
    if (!values.campaign) throw new CliError('upload requiere --campaign.')
    const waitSeconds = values['wait-seconds'] === undefined ? 600 : Number(values['wait-seconds'])

    if (!Number.isInteger(waitSeconds) || waitSeconds < 0 || waitSeconds > 3600)
      throw new CliError('--wait-seconds debe estar entre 0 y 3600.')

    if (values.resume) {
      if (
        args.length ||
        Object.keys(values).some(
          k => ![...common, 'resume', 'campaign', 'apply', 'dry-run', 'wait-seconds', 'output'].includes(k)
        )
      )
        throw new CliError('--resume sólo admite campaña, espera y flags de ejecución.')
      const result = await confirmUpload(client, values.campaign, values.resume, { apply: values.apply, waitSeconds })

      await saveResult(result, values.output)
      if (result.data?.pending) process.exitCode = 2

      return
    }

    if (!args.length || (values['new-asset'] && args.length !== 1) || (values.output && args.length !== 1))
      throw new CliError('Faltan archivos; --new-asset y --output admiten un solo archivo por llamada.')
    const metadata = values.metadata ? await jsonFile(values.metadata) : {}

    if (
      !metadata ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata) ||
      Object.keys(metadata).some(k => !['assetId', 'newAsset', 'rights', 'note'].includes(k))
    )
      throw new CliError('metadata admite assetId, newAsset, rights y note.')

    const rights = {
      ...metadata.rights,
      ...(values.license ? { licenseKind: values.license } : {}),
      ...(values.reference ? { reference: values.reference } : {}),
      ...(values.from ? { usageStartsOn: values.from } : {}),
      ...(values.until ? { usageEndsOn: values.until } : {}),
      ...(values.territory ? { territories: values.territory } : {}),
      ...(values.channel ? { channelKeys: values.channel } : {})
    }

    let newAsset = metadata.newAsset

    if (values['new-asset']) {
      if (!values.concept || !values.title || !values.ratio)
        throw new CliError('--new-asset requiere --concept, --title y --ratio.')
      newAsset = {
        conceptId: values.concept,
        title: values.title,
        aspectRatio: values.ratio,
        kind: /\.(mp4|mov)$/i.test(args[0]) ? 'video' : 'image'
      }
    } else if (values.concept || values.title || values.ratio)
      throw new CliError('--concept, --title y --ratio requieren --new-asset.')
    if (newAsset && args.length !== 1) throw new CliError('newAsset admite un archivo por llamada.')

    for (const file of args) {
      const result = await uploadFile(client, file, {
        campaignId: values.campaign,
        assetId: values.asset ?? metadata.assetId,
        newAsset,
        rights,
        note: values.note ?? metadata.note,
        apply: values.apply,
        waitSeconds
      })

      await saveResult(result, values.output)

      if (result.data?.pending) {
        process.exitCode = 2
        break
      }
    }
  }
}

main().catch(error => {
  log({
    error:
      error instanceof CliError
        ? error.message
        : 'La operación falló. Revisa archivos, conectividad y contrato; conserva la llave de idempotencia del recibo.'
  })
  process.exitCode = 1
})
