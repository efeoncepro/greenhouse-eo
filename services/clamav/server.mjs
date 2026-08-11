/**
 * TASK-1378 — Shim HTTP delgado delante de clamd.
 *
 * Por qué existe: `clamd` habla su propio protocolo (INSTREAM sobre socket), no
 * HTTP. El puerto `AssetScanner` del portal existe justamente para que el dominio
 * no sepa nada de ClamAV, así que la traducción vive acá — en el contenedor —
 * y NUNCA torciendo el adapter.
 *
 * Contrato (lo define `src/lib/storage/asset-scan/clamav-http.ts`, no este archivo):
 *   POST /scan   application/octet-stream  → { status: 'ok' }
 *                                          → { status: 'found', signature: '...' }
 *   GET  /health                           → { status, clamd, signatureAgeHours, ... }
 *
 * Cero dependencias npm a propósito: la imagen ya pesa por la base de firmas y
 * un shim de traducción no necesita framework.
 */
import { createServer } from 'node:http'
import { connect } from 'node:net'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { frameInstream, interpretClamdReply } from './clamd-protocol.mjs'

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10)
const CLAMD_SOCKET = process.env.CLAMD_SOCKET ?? '/run/clamav/clamd.sock'
const CLAMD_TIMEOUT_MS = Number.parseInt(process.env.CLAMD_TIMEOUT_MS ?? '60000', 10)
const SIGNATURE_DIR = process.env.CLAMAV_DB_DIR ?? '/var/lib/clamav'

/**
 * Techo de bytes que aceptamos en memoria. El upload público ya limita el
 * tamaño del CV aguas arriba; esto es el cinturón del contenedor para que un
 * request malicioso no lo tumbe por OOM (clamd comparte los 2 GiB con la base
 * de firmas).
 */
const MAX_BYTES = Number.parseInt(process.env.CLAMAV_MAX_BYTES ?? String(32 * 1024 * 1024), 10)

/** Umbral de vejez de la base de firmas. Un ClamAV con firmas viejas da falsa confianza. */
const SIGNATURE_STALE_HOURS = Number.parseInt(process.env.CLAMAV_SIGNATURE_STALE_HOURS ?? '168', 10)

const json = (res, status, payload) => {
  const body = JSON.stringify(payload)

  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

/**
 * Lee el cuerpo con techo duro. Corta la conexión apenas se pasa en vez de
 * seguir acumulando: el objetivo es no morir por OOM, no ser cortés.
 */
const readBody = req =>
  new Promise((resolve, reject) => {
    const chunks = []
    let total = 0

    req.on('data', chunk => {
      total += chunk.length

      if (total > MAX_BYTES) {
        reject(Object.assign(new Error('payload_too_large'), { code: 'payload_too_large' }))
        req.destroy()

        return
      }

      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

/** Abre el socket, empuja el stream framado y espera la línea de respuesta. */
const scanWithClamd = bytes =>
  new Promise((resolve, reject) => {
    const socket = connect(CLAMD_SOCKET)
    const parts = []
    let settled = false

    const fail = error => {
      if (settled) return
      settled = true
      socket.destroy()
      reject(error)
    }

    socket.setTimeout(CLAMD_TIMEOUT_MS, () => fail(Object.assign(new Error('clamd_timeout'), { code: 'clamd_timeout' })))
    socket.on('error', fail)

    socket.on('connect', () => {
      for (const frame of frameInstream(bytes)) socket.write(frame)
    })

    socket.on('data', chunk => parts.push(chunk))

    socket.on('close', () => {
      if (settled) return
      settled = true

      const reply = Buffer.concat(parts).toString('utf8')

      resolve(reply)
    })
  })

/** Edad de la base de firmas, medida sobre el `.cvd`/`.cld` más reciente. */
const readSignatureAgeHours = async () => {
  try {
    const entries = await readdir(SIGNATURE_DIR)
    const dbFiles = entries.filter(name => name.endsWith('.cvd') || name.endsWith('.cld'))

    if (!dbFiles.length) return null

    const mtimes = await Promise.all(
      dbFiles.map(async name => {
        const info = await stat(join(SIGNATURE_DIR, name))

        return info.mtimeMs
      })
    )

    return Math.round(((Date.now() - Math.max(...mtimes)) / 3_600_000) * 10) / 10
  } catch {
    return null
  }
}

const pingClamd = () =>
  new Promise(resolve => {
    const socket = connect(CLAMD_SOCKET)
    let done = false

    const finish = value => {
      if (done) return
      done = true
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(5_000, () => finish(false))
    socket.on('error', () => finish(false))
    socket.on('connect', () => socket.write('zPING\0'))
    socket.on('data', chunk => finish(chunk.toString('utf8').includes('PONG')))
  })

const handleScan = async (req, res) => {
  let bytes

  try {
    bytes = await readBody(req)
  } catch (error) {
    // El adapter trata cualquier no-2xx como veredicto `error` bloqueante.
    json(res, error?.code === 'payload_too_large' ? 413 : 400, { status: 'error', code: error?.code ?? 'body_read_failed' })

    return
  }

  if (!bytes.length) {
    json(res, 400, { status: 'error', code: 'empty_body' })

    return
  }

  try {
    const reply = await scanWithClamd(bytes)
    const parsed = interpretClamdReply(reply)

    if (parsed.status === 'error') {
      // Fail-closed: un 5xx acá es un veredicto bloqueante aguas arriba, que es
      // exactamente lo que queremos. Nunca devolver `ok` ante duda.
      console.error(JSON.stringify({ event: 'clamd_scan_error', detail: parsed.detail }))
      json(res, 502, { status: 'error', code: 'clamd_scan_error' })

      return
    }

    // El nombre de archivo viaja como header sólo para trazabilidad; nunca se
    // usa para decidir nada y nunca se loggea el contenido del CV (PII).
    console.log(
      JSON.stringify({
        event: 'scan',
        result: parsed.status,
        signature: parsed.signature ?? null,
        sizeBytes: bytes.length,
      })
    )

    json(res, 200, parsed)
  } catch (error) {
    console.error(JSON.stringify({ event: 'clamd_unreachable', code: error?.code ?? 'unknown' }))
    json(res, 503, { status: 'error', code: error?.code ?? 'clamd_unreachable' })
  }
}

const handleHealth = async (_req, res) => {
  const [clamdAlive, signatureAgeHours] = await Promise.all([pingClamd(), readSignatureAgeHours()])
  const stale = signatureAgeHours === null || signatureAgeHours > SIGNATURE_STALE_HOURS
  const healthy = clamdAlive && !stale

  json(res, healthy ? 200 : 503, {
    status: healthy ? 'ok' : 'degraded',
    clamd: clamdAlive ? 'up' : 'down',
    signatureAgeHours,
    signatureStaleAfterHours: SIGNATURE_STALE_HOURS,
    signaturesStale: stale,
    gitSha: process.env.GIT_SHA ?? null,
  })
}

/**
 * Readiness separado de health: Cloud Run necesita saber cuándo clamd terminó
 * de cargar la base (20-40 s) sin que la vejez de firmas lo marque no-listo.
 */
const handleReady = async (_req, res) => {
  const clamdAlive = await pingClamd()

  json(res, clamdAlive ? 200 : 503, { status: clamdAlive ? 'ready' : 'loading' })
}

const server = createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]

  if (req.method === 'POST' && path === '/scan') return void handleScan(req, res)
  if (req.method === 'GET' && path === '/health') return void handleHealth(req, res)
  if (req.method === 'GET' && (path === '/ready' || path === '/')) return void handleReady(req, res)

  json(res, 404, { status: 'error', code: 'not_found' })
})

// clamd puede tardar en cargar la base; no cortar el request antes que él.
server.requestTimeout = CLAMD_TIMEOUT_MS + 15_000
server.headersTimeout = 20_000

server.listen(PORT, () => {
  console.log(JSON.stringify({ event: 'clamav_shim_listening', port: PORT, socket: CLAMD_SOCKET }))
})

const shutdown = signal => {
  console.log(JSON.stringify({ event: 'clamav_shim_shutdown', signal }))
  server.close(() => process.exit(0))
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
