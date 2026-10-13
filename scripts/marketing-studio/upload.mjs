import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { createHash } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'

import { CliError, schemaRoot } from './client.mjs'

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.pdf': 'application/pdf'
}

export function storageUrl(value) {
  let url

  try {
    url = new URL(value)
  } catch {
    throw new CliError('URL de almacenamiento inválida.')
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !(url.hostname === 'storage.googleapis.com' || url.hostname.endsWith('.storage.googleapis.com'))
  )
    throw new CliError('Destino de almacenamiento no permitido.')

  return url.href
}

export async function transferFile(ticket, file, byteSize, fetchImpl = fetch) {
  let url = storageUrl(ticket.url)

  if (!['PUT', 'POST'].includes(ticket.method)) throw new CliError('Método de subida desconocido.')
  const headers = { ...ticket.headers }

  for (const name of Object.keys(headers)) {
    if (!/^(content-type|content-md5|x-goog-[a-z0-9-]+)$/i.test(name))
      throw new CliError('Header de almacenamiento no permitido.')
  }

  const send = async (target, options) => {
    try {
      return await fetchImpl(target, { ...options, redirect: 'error', signal: AbortSignal.timeout(15 * 60_000) })
    } catch {
      throw new CliError('Falló la transferencia a almacenamiento. Conserva el uploadId para revisar/reintentar.')
    }
  }

  if (ticket.method === 'POST') {
    const response = await send(url, { method: 'POST', headers })

    if (!response.ok) throw new CliError(`No se pudo iniciar la subida: HTTP ${response.status}.`)
    url = storageUrl(response.headers.get('location'))
  }

  const stream = createReadStream(file)

  try {
    const response = await send(url, {
      method: 'PUT',
      headers:
        ticket.method === 'POST'
          ? {
              'Content-Type': headers['Content-Type'] ?? headers['content-type'] ?? 'application/octet-stream',
              'Content-Length': String(byteSize)
            }
          : { ...headers, 'Content-Length': String(byteSize) },
      body: stream,
      duplex: 'half'
    })

    if (!response.ok && response.status !== 412) throw new CliError(`Transferencia rechazada: HTTP ${response.status}.`)
  } finally {
    stream.destroy()
  }
}

export async function confirmUpload(
  client,
  campaignId,
  uploadId,
  { apply = false, waitSeconds = 600, sleepImpl = sleep } = {}
) {
  const deadline = Date.now() + waitSeconds * 1000

  while (true) {
    const result = await client.call('createAssetVersion', {
      params: { campaignId },
      body: { uploadId },
      apply,
      key: `confirm-${uploadId}`
    })

    if (!apply || result.status !== 202) return result
    const seconds = Math.min(15, Math.max(2, Number(result.response.headers.get('retry-after')) || 2))

    if (Date.now() + seconds * 1000 > deadline)
      return { ...result, data: { ...result.data, resume: { campaignId, uploadId }, pending: true } }
    await sleepImpl(seconds * 1000)
  }
}

export async function uploadFile(client, file, options) {
  const { campaignId, assetId, newAsset, rights, note, apply = false, waitSeconds = 600 } = options

  if (!campaignId || !rights?.licenseKind)
    throw new CliError('upload requiere --campaign y --license (o --metadata con rights).')
  if (assetId && newAsset) throw new CliError('Elige assetId o newAsset, no ambos.')
  const info = await stat(file)

  if (!info.isFile() || info.size < 1 || info.size > 1024 ** 3)
    throw new CliError('El archivo debe tener entre 1 byte y 1 GiB.')
  const mimeType = MIME[extname(file).toLowerCase()]
  const contract = schemaRoot(client.describe('requestAssetVersionUpload').body)

  if (!mimeType || !contract?.properties?.mimeType?.enum?.includes(mimeType))
    throw new CliError('El contrato publicado no admite este tipo de archivo.')
  if (newAsset && !mimeType.startsWith(`${newAsset.kind}/`))
    throw new CliError(
      'Una pieza nueva requiere imagen o video del kind declarado; audio/PDF requieren una pieza existente.'
    )
  const hash = createHash('sha256')

  for await (const chunk of createReadStream(file)) hash.update(chunk)
  const sha256 = hash.digest('hex')

  const body = {
    filename: basename(file),
    byteSize: info.size,
    mimeType,
    sha256,
    rights,
    ...(assetId ? { assetId } : {}),
    ...(newAsset ? { newAsset } : {}),
    ...(note ? { note } : {})
  }

  let revision

  if (assetId) {
    const read = await client.call('getAsset', { params: { assetId } })

    revision = read.data?.asset?.revision
    if (!Number.isInteger(revision) || revision < 1) throw new CliError('Studio no devolvió la revisión de la pieza.')
  }

  const key = `upload-${sha256.slice(0, 32)}-${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16)}`

  const requested = await client.call('requestAssetVersionUpload', {
    params: { campaignId },
    body,
    revision,
    key,
    apply
  })

  const ticket = requested.data

  if (!apply || ticket.status === 'duplicate') return requested
  if (!ticket.uploadId || !['awaiting_upload', 'awaiting_confirmation'].includes(ticket.status))
    throw new CliError('Respuesta de subida inesperada; revisa la inferencia de Studio.')
  client.log({ uploadId: ticket.uploadId, campaignId, sha256, idempotencyKey: key, step: 'upload_reserved' })

  if (ticket.status === 'awaiting_upload') {
    if (!ticket.upload) throw new CliError('Studio no devolvió el ticket de subida.')
    const current = await stat(file)

    if (current.size !== info.size || current.mtimeMs !== info.mtimeMs)
      throw new CliError('El archivo cambió durante la preparación; vuelve a ejecutar.')
    await transferFile(ticket.upload, file, info.size, client.fetch)
  }

  return confirmUpload(client, campaignId, ticket.uploadId, { apply, waitSeconds })
}
