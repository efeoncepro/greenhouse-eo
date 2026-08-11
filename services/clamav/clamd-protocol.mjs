/**
 * TASK-1378 — Traducción del protocolo de clamd.
 *
 * Módulo puro y sin side effects a propósito: el framing INSTREAM y la lectura
 * de la respuesta son lo único no trivial del servicio, y es justamente lo que
 * un test puede ejercitar sin levantar un contenedor.
 */

/** clamd rechaza chunks por encima de StreamMaxLength; 64 KiB es el tamaño seguro. */
export const INSTREAM_CHUNK_BYTES = 65536

/**
 * INSTREAM se envía como `zINSTREAM\0`, luego N bloques
 * `<uint32 big-endian largo><bytes>`, y termina con un bloque de largo 0.
 * Omitir el terminador deja a clamd esperando para siempre.
 */
export const frameInstream = (bytes, chunkSize = INSTREAM_CHUNK_BYTES) => {
  const frames = [Buffer.from('zINSTREAM\0', 'ascii')]

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    const header = Buffer.allocUnsafe(4)

    header.writeUInt32BE(slice.length, 0)
    frames.push(header, Buffer.from(slice))
  }

  const terminator = Buffer.allocUnsafe(4)

  terminator.writeUInt32BE(0, 0)
  frames.push(terminator)

  return frames
}

/**
 * Respuestas posibles de clamd:
 *   `stream: OK`
 *   `stream: Eicar-Test-Signature FOUND`
 *   `INSTREAM size limit exceeded. ERROR`
 *
 * El orden del match importa: se descarta FOUND y ERROR ANTES de aceptar OK,
 * para que ninguna respuesta ambigua se lea como limpia. Ante duda, `error`
 * (que aguas arriba es bloqueante), nunca `ok`.
 */
export const interpretClamdReply = rawReply => {
  const reply = String(rawReply ?? '')
    .replace(/\0+$/, '')
    .trim()

  if (!reply) return { status: 'error', detail: 'empty_reply' }

  const found = reply.match(/^(?:stream:\s*)?(.+?)\s+FOUND$/)

  if (found) return { status: 'found', signature: found[1].trim() || 'unknown_signature' }

  if (/\bERROR$/.test(reply)) return { status: 'error', detail: reply }

  if (/^(?:stream:\s*)?OK$/.test(reply)) return { status: 'ok' }

  return { status: 'error', detail: reply }
}
