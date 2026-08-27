import 'server-only'

/**
 * TASK-1778 — Lectura de body por stream con corte duro al tope de bytes.
 *
 * Causa compartida del defecto de truncado de `safe-fetch.ts` y `entity-fetch.ts`:
 * `await response.text()` bufferiza el cuerpo COMPLETO antes de truncar, así que el tope
 * nunca protegió memoria — y el pre-check de `content-length` no aplica a respuestas
 * `Transfer-Encoding: chunked` (la mayoría de los sitios detrás de CDN). Este helper lee
 * el stream chunk a chunk, corta al alcanzar `maxBytes` (cancela el stream: no se siguen
 * recibiendo bytes) y DEJA RASTRO (`truncated: true`) para que el consumer degrade
 * honestamente en vez de tratar un cuerpo parcial como completo.
 *
 * Decodifica como UTF-8 tolerante (mismo default efectivo que `response.text()` para las
 * superficies que leemos). NUNCA lanza por contenido; los errores de red/abort del stream
 * propagan al caller, que ya los traduce a `errorCode` (timeout/network).
 */

export interface CappedBodyRead {
  /** Texto decodificado, cortado a lo sumo en `maxBytes` bytes. */
  body: string
  /** `true` si el cuerpo excedía el tope y fue cortado (el consumer NO vio el documento completo). */
  truncated: boolean
}

export const readBodyWithCap = async (response: Response, maxBytes: number): Promise<CappedBodyRead> => {
  const stream = response.body

  // Fallback sin stream (implementaciones de Response sintéticas en tests): se bufferiza,
  // pero el corte igual deja rastro — nunca se entrega un cuerpo cortado como completo.
  if (!stream) {
    const raw = await response.text()

    if (raw.length > maxBytes) {
      return { body: raw.slice(0, maxBytes), truncated: true }
    }

    return { body: raw, truncated: false }
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })

  let received = 0
  let out = ''
  let truncated = false

  try {
    for (;;) {
      const { done, value } = await reader.read()

      if (done) break
      if (!value || value.byteLength === 0) continue

      const remaining = maxBytes - received

      if (value.byteLength >= remaining) {
        out += decoder.decode(value.subarray(0, remaining), { stream: true })
        received += remaining

        if (value.byteLength > remaining) {
          truncated = true
        } else {
          // El chunk llenó el tope exacto: mirar si el stream traía más antes de declarar corte.
          const probe = await reader.read()

          if (!probe.done && probe.value && probe.value.byteLength > 0) truncated = true
        }

        // Corte duro: cancelar el stream para no seguir recibiendo bytes.
        await reader.cancel().catch(() => {})
        break
      }

      out += decoder.decode(value, { stream: true })
      received += value.byteLength
    }

    out += decoder.decode()
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // El lock puede haberse liberado con el cancel; no es un fallo.
    }
  }

  return { body: out, truncated }
}
