import 'server-only'

import { randomUUID } from 'node:crypto'

import { BYTEPLUS_SPEECH_BASE, bytePlusHeaders, bytePlusRequest, BytePlusError } from './byteplus'

/** NDJSON de TTS: debe terminar con 20000000. No acepta un stream truncado como audio completo. */
export const collectBytePlusTts = async (body: ReadableStream<Uint8Array>): Promise<Buffer> => {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const chunks: Buffer[] = []
  let pending = ''
  let complete = false

  const consume = (line: string) => {
    if (!line.trim()) return
    let event: { code: number; data?: string | null }

    try { event = JSON.parse(line) }
    catch { throw new Error('TTS: evento JSON inválido; no se expone el fragmento recibido.') }

    if (event.code === 20000000) complete = true
    else if (event.code !== 0) throw new BytePlusError(200, `tts_${event.code}`, null)
    if (typeof event.data === 'string') chunks.push(Buffer.from(event.data, 'base64'))
  }

  try {
    for (;;) {
      const next = await reader.read()

      if (next.done) break
      pending += decoder.decode(next.value, { stream: true })
      const lines = pending.split('\n')

      pending = lines.pop() ?? ''
      lines.forEach(consume)
    }

    pending += decoder.decode()
    consume(pending)
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }

  if (!complete || !chunks.length) throw new Error('TTS incompleto: falta audio o evento terminal.')

  return Buffer.concat(chunks)
}

export const generateBytePlusTts = async (resource: string, input: Record<string, unknown>) => {
  const requestId = randomUUID()

  const response = await fetch(`${BYTEPLUS_SPEECH_BASE}/api/v3/tts/unidirectional`, {
    method: 'POST', headers: { ...await bytePlusHeaders('speech', resource, requestId), 'X-Api-App-Key': 'aGjiRDfUWi' },
    body: JSON.stringify(input), redirect: 'error', signal: AbortSignal.timeout(180_000)
  })

  if (!response.ok || !response.body) throw new BytePlusError(response.status, 'tts_http_error', response.headers.get('x-tt-logid'))

  return { audio: await collectBytePlusTts(response.body), requestId }
}

export const generateBytePlusAudio = async (input: Record<string, unknown>) => {
  const response = await bytePlusRequest<{ code: number; audio?: string; url?: string; duration?: number; original_duration?: number }>(
    'speech', '/api/v3/tts/create', { method: 'POST', body: { ...input, model: 'seed-audio-1.0' } }
  )

  if (response.data.code !== 0 && response.data.code !== 20000000) throw new BytePlusError(200, `audio_${response.data.code}`, response.requestId)

  return response
}

export const submitBytePlusAsrFile = async (resource: string, input: Record<string, unknown>, requestId: string) => {
  const headers = { ...await bytePlusHeaders('speech', resource, requestId), 'X-Api-Sequence': '-1' }

  const response = await fetch(`${BYTEPLUS_SPEECH_BASE}/api/v3/auc/bigmodel/submit`, {
    method: 'POST', headers, body: JSON.stringify(input), redirect: 'error', signal: AbortSignal.timeout(60_000)
  })

  const status = response.headers.get('x-api-status-code')

  if (!response.ok || status !== '20000000') throw new BytePlusError(response.status, `asr_${status ?? 'unknown'}`, response.headers.get('x-tt-logid'))

  return { requestId, status }
}

export const queryBytePlusAsrFile = async (resource: string, requestId: string) => {
  const headers = { ...await bytePlusHeaders('speech', resource, requestId), 'X-Api-Sequence': '-1' }

  const response = await fetch(`${BYTEPLUS_SPEECH_BASE}/api/v3/auc/bigmodel/query`, {
    method: 'POST', headers, body: '{}', redirect: 'error', signal: AbortSignal.timeout(60_000)
  })

  const status = response.headers.get('x-api-status-code')

  if (!response.ok || !['20000000', '20000001', '20000002'].includes(status ?? '')) throw new BytePlusError(response.status, `asr_${status ?? 'unknown'}`, response.headers.get('x-tt-logid'))

  return { status, data: status === '20000000' ? await response.json() as Record<string, unknown> : null }
}
