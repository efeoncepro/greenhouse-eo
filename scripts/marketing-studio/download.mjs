import { open, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'

import { CliError } from './client.mjs'
import { storageUrl } from './upload.mjs'

export async function downloadAsset(client, { assetId, versionNo, organizationId, output }) {
  if (!/^[1-9][0-9]*$/.test(String(versionNo))) throw new CliError('La versión debe ser un entero positivo.')
  const params = { assetId, versionNo, ...(organizationId ? { organizationId } : {}) }
  const { data } = await client.call('getAssetVersionDownload', { params })
  const url = storageUrl(data?.url)

  if (!/^[a-f0-9]{64}$/.test(data?.sha256) || !Number.isSafeInteger(data?.byteSize) || data.byteSize < 1)
    throw new CliError('Studio no devolvió la huella/tamaño del original.')
  const handle = await open(output, 'wx', 0o600)
  let complete = false

  try {
    let response

    try {
      response = await client.fetch(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15 * 60_000) })
    } catch {
      throw new CliError('No se pudo descargar el original desde almacenamiento.')
    }

    if (!response.ok || !response.body) throw new CliError(`Descarga rechazada: HTTP ${response.status}.`)
    const hash = createHash('sha256')
    let bytes = 0

    async function* verifiedChunks() {
      for await (const chunk of response.body) {
        bytes += chunk.length
        if (bytes > data.byteSize) throw new CliError('La descarga excede el tamaño declarado.')
        hash.update(chunk)
        yield chunk
      }
    }

    await handle.writeFile(verifiedChunks())
    if (bytes !== data.byteSize || hash.digest('hex') !== data.sha256)
      throw new CliError('Hash/tamaño del original no coinciden; archivo incompleto descartado.')
    complete = true

    return { saved: output, assetId, versionNo, byteSize: bytes, sha256: data.sha256, rights: data.rights }
  } finally {
    await handle.close()
    if (!complete) await unlink(output)
  }
}
