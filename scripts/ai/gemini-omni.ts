#!/usr/bin/env tsx
/** Gemini Omni 1.1 Flash on Google Cloud. Local operator tooling; never a Globe runtime. */
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { access, mkdir, open, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, extname, resolve } from 'node:path'

import { createGoogleAuth } from '@/lib/google-credentials'
import {
  assertGcsUri,
  buildOmniRequest,
  estimateOmniVideoOutputUsd,
  omniInteractionUrl,
  OMNI_CLOUD_MODEL,
  summarizeOmniInteraction,
  validateOmniRequest,
  type OmniAspect,
  type OmniMedia,
  type OmniResolution,
  type OmniTask
} from '@/lib/ai/gemini-omni-cli'
import { detectMediaFormat } from '@/lib/ai/fal-input-rules'

type Args = {
  task?: OmniTask
  prompt?: string
  promptFile?: string
  images: string[]
  videos: string[]
  firstFrame?: string
  lastFrame?: string
  gcsOutput?: string
  stagingUri?: string
  project?: string
  aspect: OmniAspect
  resolution: OmniResolution
  duration: number
  out?: string
  stateFile?: string
  statusId?: string
  waitId?: string
  estimate: boolean
  yes: boolean
  maxUsd: number
  explicitAspect: boolean
  explicitDuration: boolean
  help: boolean
}

const usage = `Gemini Omni 1.1 Flash · Google Cloud Interactions API

Generar: pnpm ai:omni --task text|image|frames|reference|edit|extend --prompt "..." --gcs-output gs://bucket/prefix/ --yes
Consultar: pnpm ai:omni --status <interaction-id> [--project efeonce-group]
Esperar:   pnpm ai:omni --wait <interaction-id> [--out clip.mp4]

Entradas: --image <gs://...|archivo> (repetible), --video <gs://...|archivo> (repetible)
          --first-frame y --last-frame para frames; orden explícito
          --staging-uri gs://bucket/prefix/ obligatorio para archivos locales
Opciones: --project, --prompt-file, --aspect 16:9|9:16, --resolution 360p|720p|1080p|4k,
          --duration 3..10, --out clip.mp4, --state-file ruta.json, --estimate,
          --max-usd N (cota sobre SOLO el video output nominal), --yes

Todas las operaciones son async. El submit se hace una sola vez; si se pierde su respuesta,
no repitas el envío a ciegas. La salida queda en GCS; --out la descarga al completar.
Los videos MP4 locales se inspeccionan con ffprobe antes de subirlos.
El modelo Cloud es ${OMNI_CLOUD_MODEL} (Preview, región global, cuota fija).
`

function parseArgs(argv: string[]): Args {
  const args: Args = {
    images: [],
    videos: [],
    aspect: '16:9',
    resolution: '720p',
    duration: 5,
    estimate: false,
    yes: false,
    maxUsd: 1,
    explicitAspect: false,
    explicitDuration: false,
    help: false
  }

  let index = 0

  const next = () => {
    const flag = argv[index]
    const value = argv[++index]

    if (!value || value.startsWith('--')) throw new Error(`Falta el valor de ${flag}.`)

    return value
  }

  for (; index < argv.length; index++) {
    switch (argv[index]) {
      case '--task':
        args.task = next() as OmniTask
        break
      case '--prompt':
        args.prompt = next()
        break
      case '--prompt-file':
        args.promptFile = next()
        break
      case '--image':
        args.images.push(next())
        break
      case '--video':
        args.videos.push(next())
        break
      case '--first-frame':
        args.firstFrame = next()
        break
      case '--last-frame':
        args.lastFrame = next()
        break
      case '--gcs-output':
        args.gcsOutput = next()
        break
      case '--staging-uri':
        args.stagingUri = next()
        break
      case '--project':
        args.project = next()
        break
      case '--aspect':
        args.aspect = next() as OmniAspect
        args.explicitAspect = true
        break
      case '--resolution':
        args.resolution = next() as OmniResolution
        break
      case '--duration':
        args.duration = Number(next())
        args.explicitDuration = true
        break
      case '--out':
        args.out = next()
        break
      case '--state-file':
        args.stateFile = next()
        break
      case '--status':
        args.statusId = next()
        break
      case '--wait':
        args.waitId = next()
        break
      case '--estimate':
        args.estimate = true
        break
      case '--yes':
        args.yes = true
        break
      case '--max-usd':
        args.maxUsd = Number(next())
        break
      case '--help':
      case '-h':
        args.help = true
        break
      default:
        throw new Error(`Flag desconocido: ${argv[index]}`)
    }
  }

  if (!Number.isFinite(args.maxUsd) || args.maxUsd <= 0) throw new Error('--max-usd debe ser positivo.')

  return args
}

function runGcloud(args: string[]): string {
  const result = spawnSync('gcloud', args, { encoding: 'utf8', timeout: 120_000 })

  if (result.error || result.status !== 0) {
    throw new Error(
      `gcloud ${args.slice(0, 2).join(' ')} falló. Revisa la sesión local, el proyecto y el bucket; no se envió una nueva interacción.`
    )
  }

  return result.stdout.trim()
}

function projectId(args: Args): string {
  const value =
    args.project ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    runGcloud(['config', 'get-value', 'project'])

  omniInteractionUrl(value)

  return value
}

function mimeFor(path: string, kind: 'image' | 'video'): string {
  const ext = extname(path).toLowerCase()

  if (kind === 'video' && ext === '.mp4') return 'video/mp4'
  if (kind === 'image' && ext === '.png') return 'image/png'
  if (kind === 'image' && ['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg'
  if (kind === 'image' && ext === '.webp') return 'image/webp'
  throw new Error(`Formato no admitido para ${kind}: ${ext || 'sin extensión'}.`)
}

function validateMediaSource(value: string, kind: 'image' | 'video', stagingUri?: string): void {
  mimeFor(value, kind)
  if (value.startsWith('gs://')) assertGcsUri(value, kind)
  else if (!stagingUri) throw new Error(`Archivo local ${kind}: añade --staging-uri gs://bucket/prefix/.`)
}

async function validateLocalMediaBytes(value: string, kind: 'image' | 'video'): Promise<void> {
  if (value.startsWith('gs://')) return
  const file = await open(resolve(value), 'r')
  const header = Buffer.alloc(32)

  try {
    await file.read(header, 0, header.length, 0)
  } finally {
    await file.close()
  }

  const detected = detectMediaFormat(header)
  const expected = mimeFor(value, kind)

  const actual =
    detected === 'png'
      ? 'image/png'
      : detected === 'jpeg'
        ? 'image/jpeg'
        : detected === 'webp'
          ? 'image/webp'
          : detected === 'mp4'
            ? 'video/mp4'
            : undefined

  if (actual !== expected) throw new Error(`Los bytes de ${basename(value)} no coinciden con el formato ${expected}.`)

  if (kind === 'video') {
    const probe = spawnSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', resolve(value)],
      { encoding: 'utf8', timeout: 30_000 }
    )

    const seconds = Number(probe.stdout.trim())

    if (probe.status !== 0 || !Number.isFinite(seconds) || seconds > 10 || seconds <= 0) {
      throw new Error(`El video local ${basename(value)} debe durar más de 0 y hasta 10 segundos (ffprobe).`)
    }
  }
}

async function assertMissing(path: string, label: string): Promise<void> {
  try {
    await access(resolve(path))
    throw new Error(`${label} ya existe: ${resolve(path)}. Elige otra ruta para preservar el archivo.`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

function mediaFor(value: string, kind: 'image' | 'video', stagingUri?: string): OmniMedia {
  const mimeType = mimeFor(value, kind)

  if (value.startsWith('gs://')) return { uri: value, mimeType }
  if (!stagingUri) throw new Error('Falta --staging-uri.')
  assertGcsUri(stagingUri, '--staging-uri')
  const uri = `${stagingUri.replace(/\/?$/, '/')}${randomUUID()}-${basename(value)}`

  runGcloud(['storage', 'cp', resolve(value), uri])

  return { uri, mimeType }
}

async function bearer(project: string): Promise<string> {
  const auth = createGoogleAuth({
    env: { ...process.env, GCP_PROJECT: project },
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  })

  const client = await auth.getClient()
  const token = await client.getAccessToken()

  if (!token.token) throw new Error('ADC no entregó un token de acceso.')

  return token.token
}

async function interactionRequest(project: string, method: 'POST' | 'GET', id?: string, body?: unknown) {
  const token = await bearer(project)
  let response: Response

  try {
    response = await fetch(omniInteractionUrl(project, id), {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(method === 'POST' ? 120_000 : 30_000)
    })
  } catch {
    throw new Error(
      method === 'POST'
        ? 'Resultado del submit indeterminado. Busca la interacción en Google Cloud antes de reintentar: un segundo POST puede duplicar el gasto.'
        : 'No se pudo leer la interacción; reintenta --status o --wait con el mismo ID.'
    )
  }

  if (!response.ok) {
    const hint =
      response.status === 400
        ? 'Revisa tarea, inputs y response_format.'
        : [401, 403].includes(response.status)
          ? 'Revisa ADC, IAM y acceso al modelo/bucket.'
          : response.status === 429
            ? 'Revisa cuota fija y tasa del modelo exacto.'
            : 'Consulta el estado del servicio antes de reintentar.'

    throw new Error(
      `Google Cloud Interactions respondió HTTP ${response.status}. ${hint} El cuerpo se omite por privacidad.`
    )
  }

  return summarizeOmniInteraction(await response.json())
}

async function saveState(path: string, record: Record<string, unknown>) {
  const target = resolve(path)

  await mkdir(dirname(target), { recursive: true })
  const temp = `${target}.${randomUUID()}.tmp`

  await writeFile(temp, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 })
  await rename(temp, target)
}

function printStatus(summary: ReturnType<typeof summarizeOmniInteraction>, project: string) {
  console.log(
    JSON.stringify(
      {
        project,
        model: summary.model || OMNI_CLOUD_MODEL,
        id: summary.id,
        status: summary.status,
        videos: summary.videos,
        inlineVideoCount: summary.inlineVideos.length,
        usage: summary.usage
      },
      null,
      2
    )
  )
}

async function downloadVideo(summary: ReturnType<typeof summarizeOmniInteraction>, output: string) {
  if (summary.status !== 'completed') throw new Error('La interacción todavía no está completa.')

  if (summary.videos.length + summary.inlineVideos.length !== 1) {
    throw new Error('Se esperaba exactamente un video MP4; revisa --status.')
  }

  const target = resolve(output)

  await assertMissing(target, '--out')
  await mkdir(dirname(target), { recursive: true })
  if (summary.videos.length) runGcloud(['storage', 'cp', summary.videos[0].uri, target])
  else await writeFile(target, Buffer.from(summary.inlineVideos[0].data, 'base64'))
  const file = await open(target, 'r')
  const header = Buffer.alloc(12)

  try {
    await file.read(header, 0, header.length, 0)
  } finally {
    await file.close()
  }

  const bytes = (await stat(target)).size

  if (bytes < 12 || header.toString('ascii', 4, 8) !== 'ftyp') {
    throw new Error('El archivo descargado no tiene cabecera MP4 válida.')
  }

  console.log(`MP4: ${target} (${bytes} bytes)`)
}

async function waitFor(project: string, id: string, output?: string) {
  const deadline = Date.now() + 30 * 60_000

  while (Date.now() < deadline) {
    const summary = await interactionRequest(project, 'GET', id)

    if (summary.id !== id) throw new Error('El ID de la respuesta no coincide con la interacción solicitada.')

    if (summary.status === 'completed') {
      printStatus(summary, project)
      if (output) await downloadVideo(summary, output)

      return
    }

    if (['failed', 'cancelled', 'expired'].includes(summary.status)) {
      printStatus(summary, project)
      throw new Error(`Interacción terminal: ${summary.status}.`)
    }

    await new Promise(done => setTimeout(done, 10_000))
  }

  throw new Error(`La espera llegó a 30 minutos. Recupera con --wait ${id}; no repitas el submit.`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) return console.log(usage)
  const project = projectId(args)

  if (args.statusId || args.waitId) {
    if (args.task || args.prompt || args.images.length || args.videos.length)
      throw new Error('--status/--wait no acepta entradas de generación.')
    const id = args.statusId || args.waitId!

    if (args.waitId) return waitFor(project, id, args.out)

    return printStatus(await interactionRequest(project, 'GET', id), project)
  }

  if (!args.task || !['text', 'image', 'frames', 'reference', 'edit', 'extend'].includes(args.task)) {
    throw new Error('Elige --task text|image|frames|reference|edit|extend.')
  }

  if (args.prompt && args.promptFile) throw new Error('Usa --prompt o --prompt-file, no ambos.')

  if (args.firstFrame || args.lastFrame) {
    if (args.task !== 'frames' || !args.firstFrame || !args.lastFrame || args.images.length) {
      throw new Error('--first-frame y --last-frame van juntos sólo con --task frames.')
    }

    args.images = [args.firstFrame, args.lastFrame]
  }

  if (!args.gcsOutput) throw new Error('Falta --gcs-output gs://bucket/prefix/.')

  if ((args.task === 'edit' || args.task === 'extend') && args.explicitAspect) {
    throw new Error(`--aspect no aplica a ${args.task}; la salida conserva el aspecto del video fuente.`)
  }

  if (args.task === 'edit' && args.explicitDuration) {
    throw new Error('--duration no aplica a edit; la duración la determina el video fuente.')
  }

  const prompt = args.promptFile ? await readFile(resolve(args.promptFile), 'utf8') : args.prompt || ''

  for (const image of args.images) validateMediaSource(image, 'image', args.stagingUri)
  for (const video of args.videos) validateMediaSource(video, 'video', args.stagingUri)
  for (const image of args.images) await validateLocalMediaBytes(image, 'image')
  for (const video of args.videos) await validateLocalMediaBytes(video, 'video')
  // Validate cardinality, shape and MIME before any GCS upload or billable submit.
  validateOmniRequest({
    task: args.task,
    prompt,
    images: args.images.map(value => ({ uri: 'gs://validation-bucket/asset', mimeType: mimeFor(value, 'image') })),
    videos: args.videos.map(value => ({ uri: 'gs://validation-bucket/asset', mimeType: mimeFor(value, 'video') })),
    gcsOutput: args.gcsOutput,
    aspect: args.aspect,
    resolution: args.resolution,
    duration: args.duration
  })
  const pricedDuration = args.task === 'edit' ? 10 : args.duration
  const cost = estimateOmniVideoOutputUsd(args.resolution, pricedDuration)
  const priceLabel = args.task === 'edit' ? 'cota de video output para hasta 10s' : 'video output nominal'

  console.log(
    `Omni 1.1 Cloud · ${args.task} · ${args.resolution} · ${priceLabel} ≈ USD ${cost.toFixed(3)} + input/texto/impuestos.`
  )
  if (args.estimate) return
  if (!args.yes) throw new Error('El submit consume cuota y dinero. Repite con --yes después de revisar la estimación.')
  if (cost > args.maxUsd)
    throw new Error(`Video output nominal USD ${cost.toFixed(3)} supera --max-usd ${args.maxUsd}.`)
  if (args.stateFile) await assertMissing(args.stateFile, '--state-file')
  if (args.out) await assertMissing(args.out, '--out')
  const images = args.images.map(value => mediaFor(value, 'image', args.stagingUri))
  const videos = args.videos.map(value => mediaFor(value, 'video', args.stagingUri))

  const body = buildOmniRequest({
    task: args.task,
    prompt,
    images,
    videos,
    gcsOutput: args.gcsOutput,
    aspect: args.aspect,
    resolution: args.resolution,
    duration: args.duration
  })

  const summary = await interactionRequest(project, 'POST', undefined, body)

  printStatus(summary, project)
  const stateFile = args.stateFile || resolve(homedir(), '.cache/greenhouse/omni', `${randomUUID()}.json`)

  await saveState(stateFile, {
    provider: 'google-cloud',
    project,
    location: 'global',
    model: OMNI_CLOUD_MODEL,
    task: args.task,
    interactionId: summary.id,
    status: summary.status,
    gcsOutput: args.gcsOutput,
    submittedAt: new Date().toISOString()
  })
  console.log(`Estado local: ${resolve(stateFile)}`)
  if (args.out) return waitFor(project, summary.id, args.out)
  console.log(`Retomar: pnpm ai:omni --project ${project} --wait ${summary.id} --out clip.mp4`)
}

main().catch(error => {
  console.error(`ai:omni: ${error instanceof Error ? error.message : 'Error desconocido.'}`)
  process.exitCode = 1
})
