#!/usr/bin/env tsx
import { randomUUID } from 'node:crypto'
import { access, chmod, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'

import { config as loadEnv } from 'dotenv'
import sharp from 'sharp'

import { createGoogleAuth, getGoogleProjectId } from '@/lib/google-credentials'
import { detectMediaFormat } from '@/lib/ai/fal-input-rules'
import {
  assertNanoHistory, buildNanoRequest, estimateNanoOutputUsd, nanoUrl, NANO_ASPECTS,
  NANO_BANANA_MODEL, readNanoSse, summarizeNanoResponses,
  type NanoContent, type NanoPart, type NanoResolution, type NanoSearch, type NanoThinking
} from '@/lib/ai/nano-banana-cli'

loadEnv({ path: join(process.cwd(), '.env.local'), quiet: true })

const HELP = `Nano Banana 2.1 · Google directo (Vertex global, credenciales canónicas)

pnpm ai:nano --prompt "..." --out imagen.png --yes
pnpm ai:nano --image base.png --image referencia.png --prompt "Cambia sólo..." --out edit.png --yes
pnpm ai:nano --prompt-file prompt.txt --resolution 4K --aspect 8:1 --thinking high --search both --out banner.png --yes
pnpm ai:nano --prompt "..." --session sesion.json --out paso1.png --yes
pnpm ai:nano --prompt "Refina la imagen anterior..." --session sesion.json --out paso2.png --yes

--image <archivo>         PNG/JPEG/WebP verificado, repetible, hasta 14 referencias por turno.
--video <MP4|gs://...|YouTube> / --pdf <archivo|gs://...>  Contexto multimodal.
--resolution 1K|2K|4K     Default 1K; 512/0.5K no existe en 2.1.
--aspect <ratio>          ${NANO_ASPECTS.join(', ')}. Omitido: lo decide el modelo desde las referencias.
--thinking minimal|medium|high  Default medium.
--search off|web|images|both    Default off; búsqueda puede cobrar extra.
--system-file <archivo>   Instrucciones de sistema.
--session <json>          Historial privado, con firmas opacas de continuidad; incluye imágenes.
--stream                 streamGenerateContent (SSE), guarda sólo cuando termina correctamente.
--count-tokens           Consulta countTokens sin generar imagen.
--dry-run / --estimate   Valida y muestra configuración/costo visual nominal, sin red ni gasto.
--project <GCP ID>        Default del resolver canónico; región siempre global.
--format png|jpeg|webp    Conversión LOCAL explícita; no altera la generación nativa.
--timeout <ms>           Default 280000; una llamada, sin reintentos automáticos.
--max-output-usd <N>     Cota del componente visual nominal (default 0.10), NO de la factura total.
--yes                    Autoriza la llamada de generación.

Lotes asíncronos Batch API e Interactions no implementados. --mask/seed/temperature no se admiten.
Editar por instrucciones no garantiza delta 0 fuera de una zona. No activa ni cambia Globe.
`

export async function runNanoCli(argv: string[]): Promise<void> {
  const flags = new Map<string, string>()
  const switches = new Set<string>()
  const media: { value: string; kind: 'image' | 'video' | 'pdf' }[] = []
  const booleans = ['--help', '--yes', '--stream', '--count-tokens', '--dry-run', '--estimate']
  const values = ['--prompt', '--prompt-file', '--out', '--aspect', '--resolution', '--thinking', '--search', '--system-file', '--session', '--project', '--format', '--timeout', '--max-output-usd']

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]

    if (booleans.includes(flag)) { switches.add(flag); continue }
    if (!values.includes(flag) && !['--image', '--video', '--pdf'].includes(flag)) throw new Error(`Opción no admitida: ${flag}. Ver --help.`)
    const value = argv[++i]

    if (!value || value.startsWith('--')) throw new Error(`Falta el valor de ${flag}.`)

    if (['--image', '--video', '--pdf'].includes(flag)) media.push({ value, kind: flag.slice(2) as 'image' | 'video' | 'pdf' })
    else {
      if (flags.has(flag)) throw new Error(`Opción repetida: ${flag}.`)
      flags.set(flag, value)
    }
  }

  if (switches.has('--help')) { process.stdout.write(HELP);

return }

  if (flags.has('--prompt') && flags.has('--prompt-file')) throw new Error('Usa --prompt o --prompt-file, no ambos.')
  if (switches.has('--stream') && switches.has('--count-tokens')) throw new Error('--stream y --count-tokens son excluyentes.')
  const prompt = flags.get('--prompt') ?? (flags.has('--prompt-file') ? await readFile(flags.get('--prompt-file')!, 'utf8') : '')
  const system = flags.has('--system-file') ? await readFile(flags.get('--system-file')!, 'utf8') : undefined
  const timeout = Number(flags.get('--timeout') ?? 280000)
  const maxOutputUsd = Number(flags.get('--max-output-usd') ?? 0.10)

  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 600000) throw new Error('--timeout debe estar entre 1000 y 600000 ms.')
  if (!Number.isFinite(maxOutputUsd) || maxOutputUsd <= 0) throw new Error('--max-output-usd debe ser positivo.')
  const out = flags.has('--out') ? resolve(flags.get('--out')!) : undefined
  const format = flags.get('--format') ?? (out && ['.jpg', '.jpeg'].includes(extname(out).toLowerCase()) ? 'jpeg' : out?.endsWith('.webp') ? 'webp' : 'png')

  if (!['png', 'jpeg', 'webp'].includes(format)) throw new Error('--format debe ser png, jpeg o webp.')
  if (out && !(format === 'jpeg' ? ['.jpg', '.jpeg'] : [`.${format}`]).includes(extname(out).toLowerCase())) throw new Error('--out y --format no coinciden.')
  if (!out && !switches.has('--count-tokens') && !switches.has('--dry-run') && !switches.has('--estimate')) throw new Error('Falta --out.')
  if (switches.has('--count-tokens') && out) throw new Error('--count-tokens no escribe imagen; omite --out.')
  const session = flags.has('--session') ? resolve(flags.get('--session')!) : undefined

  if (session && out && [out, `${out}.json`].includes(session)) throw new Error('--session no puede ser la imagen ni su metadata.')
  const dry = switches.has('--dry-run') || switches.has('--estimate')
  let lock: Awaited<ReturnType<typeof open>> | undefined
  let lockPath: string | undefined

  try {
    if (session && !dry && !switches.has('--count-tokens')) {
      await mkdir(dirname(session), { recursive: true })
      lockPath = `${session}.lock`
      lock = await open(lockPath, 'wx', 0o600)
    }

    let history: NanoContent[] = []

    if (session) {
      try {
        if ((await stat(session)).size > 64 * 1024 * 1024) throw new Error('Sesión demasiado grande.')
        let saved

        try { saved = JSON.parse(await readFile(session, 'utf8')) }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code) throw error
          throw new Error('Sesión JSON inválida; no se imprimió su contenido.')
        }

        if (saved.version !== 1 || saved.model !== NANO_BANANA_MODEL) throw new Error('Sesión de otra versión/modelo; no se migrará silenciosamente.')
        assertNanoHistory(saved.contents)
        history = saved.contents
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    }

    const parts: NanoPart[] = []
    let totalBytes = 0

    for (const item of media) {
      if (item.value.startsWith('gs://') || item.value.startsWith('https://')) {
        if (item.kind === 'image') throw new Error('Las imágenes deben ser archivos locales para verificar su formato.')
        parts.push({ fileData: { fileUri: item.value, mimeType: item.kind === 'pdf' ? 'application/pdf' : 'video/mp4' } })
        continue
      }

      const metadata = await stat(item.value)

      totalBytes += metadata.size
      if (totalBytes > 20 * 1024 * 1024) throw new Error('Entradas inline sobre 20 MiB: usa gs:// para video/PDF.')
      const data = await readFile(item.value)
      const detected = detectMediaFormat(data)
      const mime = detected === 'png' ? 'image/png' : detected === 'jpeg' ? 'image/jpeg' : detected === 'webp' ? 'image/webp' : detected === 'mp4' ? 'video/mp4' : data.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' : ''

      if (!mime || (item.kind === 'image' ? !mime.startsWith('image/') : mime !== (item.kind === 'video' ? 'video/mp4' : 'application/pdf'))) throw new Error('El contenido del archivo no coincide con el tipo de media solicitado.')
      if (item.kind === 'image') await sharp(data).metadata()
      parts.push({ inlineData: { mimeType: mime, data: data.toString('base64') } })
    }

    const options = {
      prompt, system, history, media: parts, aspect: flags.get('--aspect'),
      resolution: (flags.get('--resolution') ?? '1K').toUpperCase() as NanoResolution,
      thinking: (flags.get('--thinking') ?? 'medium') as NanoThinking,
      search: (flags.get('--search') ?? 'off') as NanoSearch
    }

    const request = buildNanoRequest(options)

    if (Buffer.byteLength(JSON.stringify(request)) > 28 * 1024 * 1024) throw new Error('Contexto inline demasiado grande; inicia una sesión nueva o usa GCS para video/PDF.')
    const endpoint = switches.has('--count-tokens') ? 'countTokens' : switches.has('--stream') ? 'streamGenerateContent' : 'generateContent'
    const project = flags.get('--project') ?? getGoogleProjectId() ?? ''
    const url = nanoUrl(project, endpoint)
    const nominalUsd = estimateNanoOutputUsd(options.resolution)
    const summary = { model: NANO_BANANA_MODEL, project, location: 'global', endpoint, aspect: options.aspect ?? 'auto', resolution: options.resolution, thinking: options.thinking, search: options.search, references: parts.length, previousTurns: history.length / 2, outputImageUsd: nominalUsd, estimateScope: 'Sólo imagen de salida; entrada, reasoning y búsquedas adicionales.' }

    if (dry) { process.stdout.write(JSON.stringify(summary, null, 2) + '\n');

return }

    if (endpoint !== 'countTokens') {
      if (nominalUsd > maxOutputUsd) throw new Error('Componente visual nominal supera --max-output-usd.')
      if (!switches.has('--yes')) throw new Error('La generación requiere --yes. --dry-run valida sin gasto.')

      for (const path of [out!, `${out}.json`]) {
        try { await access(path); throw new Error('La salida ya existe; usa una ruta nueva.') }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      }
    }

    const auth = createGoogleAuth({ env: { ...process.env, GCP_PROJECT: project }, scopes: 'https://www.googleapis.com/auth/cloud-platform' })
    let token: string

    try {
      const credential = await (await auth.getClient()).getAccessToken()

      if (!credential.token) throw new Error('missing')
      token = credential.token
    } catch { throw new Error('No fue posible resolver credenciales Google; revisa el preflight canónico de gcloud.') }

    const body = endpoint === 'countTokens' ? { contents: request.contents, ...(request.systemInstruction ? { systemInstruction: request.systemInstruction } : {}) } : request
    let raw: unknown[]
    const started = Date.now()

    try {
      const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) })

      if (!response.ok) throw new Error(`Google respondió HTTP ${response.status}; revisa identidad del modelo, permisos/cuota y contrato. Cuerpo omitido por privacidad.`)

      if (endpoint === 'countTokens') {
        const data = await response.json() as { totalTokens?: number }

        if (!Number.isInteger(data.totalTokens)) throw new Error('Conteo de tokens inválido.')
        process.stdout.write(JSON.stringify({ model: NANO_BANANA_MODEL, totalTokens: data.totalTokens }) + '\n')

return
      }

      raw = endpoint === 'streamGenerateContent' && response.body ? await readNanoSse(response.body) : [await response.json()]
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Google respondió HTTP')) throw error
      throw new Error('Resultado de la llamada indeterminado; no se reintentó. Verifica el consumo en Google antes de repetir.')
    }

    const result = summarizeNanoResponses(raw)

    if (result.images.length !== 1) throw new Error('Número de imágenes inesperado; no se avanzó la sesión.')
    const native = Buffer.from(result.images[0].inlineData!.data, 'base64')
    const detected = detectMediaFormat(native)

    if (!['png', 'jpeg', 'webp'].includes(detected ?? '')) throw new Error('Bytes de salida no son una imagen reconocida.')
    const decoded = await sharp(native).metadata()
    const buffer = format === detected ? native : await sharp(native).toFormat(format as 'png' | 'jpeg' | 'webp').toBuffer()

    await mkdir(dirname(out!), { recursive: true })
    await writeFile(out!, buffer, { flag: 'wx', mode: 0o600 })
    await writeFile(`${out}.json`, JSON.stringify({ ...summary, modelVersion: result.modelVersion, latencyMs: Date.now() - started, width: decoded.width, height: decoded.height, nativeMime: result.images[0].inlineData!.mimeType, format, usage: result.usage, text: result.text, grounding: result.grounding }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })

    if (session) {
      const contents = [...request.contents, result.content]

      assertNanoHistory(contents)
      const temporary = `${session}.${randomUUID()}.tmp`

      await writeFile(temporary, JSON.stringify({ version: 1, model: NANO_BANANA_MODEL, contents }) + '\n', { mode: 0o600 })
      await rename(temporary, session)
      await chmod(session, 0o600)
    }

    process.stdout.write(JSON.stringify({ ...summary, out, width: decoded.width, height: decoded.height, latencyMs: Date.now() - started, sessionUpdated: Boolean(session) }) + '\n')
  } finally {
    if (lock) { await lock.close(); await unlink(lockPath!) }
  }
}

if (process.argv[1]?.endsWith('nano-banana.ts')) {
  runNanoCli(process.argv.slice(2)).catch(error => {
    // Never serialize provider/auth exceptions, request bodies, tokens or media data.
    const code = (error as NodeJS.ErrnoException).code
    const message = code ? `Error local ${code}; revisa archivos/sesión y permisos.` : error instanceof Error ? error.message : 'Error de CLI.'

    process.stderr.write(message + '\n')
    process.exitCode = 1
  })
}
