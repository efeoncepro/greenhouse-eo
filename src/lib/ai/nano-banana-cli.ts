/** Local Google image tooling. No product/runtime defaults or Globe routes are changed. */
export const NANO_BANANA_MODEL = 'gemini-nano-banana-2.1' as const
export const NANO_ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1'] as const
export type NanoResolution = '1K' | '2K' | '4K'
export type NanoThinking = 'minimal' | 'medium' | 'high'
export type NanoSearch = 'off' | 'web' | 'images' | 'both'
export type NanoPart = {
  text?: string
  inlineData?: { mimeType: string; data: string }
  fileData?: { mimeType: string; fileUri: string }
  thought?: boolean
  thoughtSignature?: string
}
export type NanoContent = { role: 'user' | 'model'; parts: NanoPart[] }
export interface NanoOptions {
  prompt: string
  media: NanoPart[]
  history: NanoContent[]
  aspect?: string
  resolution: NanoResolution
  thinking: NanoThinking
  search: NanoSearch
  system?: string
}

export function validateNanoOptions(options: NanoOptions): void {
  if (!options.prompt.trim()) throw new Error('Falta --prompt o --prompt-file.')
  if (options.aspect && !(NANO_ASPECTS as readonly string[]).includes(options.aspect)) throw new Error('Relación de aspecto no soportada.')
  if (!['1K', '2K', '4K'].includes(options.resolution)) throw new Error('--resolution debe ser 1K, 2K o 4K; 512/0.5K no existe en 2.1.')
  if (!['minimal', 'medium', 'high'].includes(options.thinking)) throw new Error('--thinking debe ser minimal, medium o high.')
  if (!['off', 'web', 'images', 'both'].includes(options.search)) throw new Error('--search debe ser off, web, images o both.')
  let images = 0
  let videos = 0
  let youtube = 0

  for (const part of options.media) {
    const media = part.inlineData ?? part.fileData

    if (!media || !media.mimeType) throw new Error('Entrada de media inválida.')
    if (['image/png', 'image/jpeg', 'image/webp'].includes(media.mimeType)) images++
    else if (media.mimeType === 'video/mp4') videos++
    else if (media.mimeType !== 'application/pdf') throw new Error('Formato de entrada no soportado.')
    if (part.inlineData && !part.inlineData.data) throw new Error('Archivo vacío.')

    if (part.fileData) {
      const uri = part.fileData.fileUri

      if (/^gs:\/\/[a-z0-9][a-z0-9._-]+\/.+/.test(uri) && !/[?#]/.test(uri)) continue
      const url = new URL(uri)

      if (url.protocol !== 'https:' || !['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.hostname) || media.mimeType !== 'video/mp4' || url.username || url.password) {
        throw new Error('Media remota debe ser gs:// sin parámetros o un video público de YouTube.')
      }

      if ([...url.searchParams.keys()].some(key => !['v', 't'].includes(key))) throw new Error('URL de YouTube con parámetros no admitidos.')
      youtube++
    }
  }

  if (images > 14) throw new Error('Máximo 14 referencias de imagen por turno (4 personajes / 10 objetos).')
  if (videos > 10 || youtube > 1) throw new Error('Máximo 10 videos, con una URL de YouTube por turno.')
  assertNanoHistory(options.history)
}

export function assertNanoHistory(value: unknown): asserts value is NanoContent[] {
  if (!Array.isArray(value) || value.length > 100 || value.length % 2 !== 0) throw new Error('Historial inválido o demasiado largo.')
  value.forEach((content, index) => {
    if (!content || content.role !== (index % 2 === 0 ? 'user' : 'model') || !Array.isArray(content.parts) || !content.parts.length) throw new Error('Historial con roles inválidos.')

    for (const part of content.parts) {
      if (!part || part.thought || (typeof part.text !== 'string' && !part.inlineData && !part.fileData)) throw new Error('Historial con partes inválidas o pensamientos privados.')
      if (part.thoughtSignature !== undefined && typeof part.thoughtSignature !== 'string') throw new Error('Firma de continuidad inválida.')
    }
  })
}

export function buildNanoRequest(options: NanoOptions) {
  validateNanoOptions(options)
  const user: NanoContent = { role: 'user', parts: [...options.media, { text: options.prompt }] }

  const searchTypes = {
    ...(['web', 'both'].includes(options.search) ? { webSearch: {} } : {}),
    ...(['images', 'both'].includes(options.search) ? { imageSearch: {} } : {})
  }

  return {
    contents: [...options.history, user],
    ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
    generationConfig: {
      candidateCount: 1,
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { imageSize: options.resolution, ...(options.aspect ? { aspectRatio: options.aspect } : {}) },
      thinkingConfig: { thinkingLevel: options.thinking.toUpperCase(), includeThoughts: false }
    },
    ...(options.search !== 'off' ? { tools: [{ googleSearch: { searchTypes } }] } : {})
  }
}

export type NanoEndpoint = 'generateContent' | 'streamGenerateContent' | 'countTokens'

export function nanoUrl(project: string, endpoint: NanoEndpoint): string {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)) throw new Error('ID de proyecto GCP inválido.')
  if (!['generateContent', 'streamGenerateContent', 'countTokens'].includes(endpoint)) throw new Error('Endpoint no admitido.')

return `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${NANO_BANANA_MODEL}:${endpoint}${endpoint === 'streamGenerateContent' ? '?alt=sse' : ''}`
}

/** Published output-image component only; inputs, reasoning and searches are additional. */
export function estimateNanoOutputUsd(resolution: NanoResolution): number {
  const tokens = { '1K': 1120, '2K': 1680, '4K': 2520 }[resolution]

  if (!tokens) throw new Error('Resolución inválida.')

return tokens * 30 / 1_000_000
}

export function summarizeNanoResponses(responses: unknown[]) {
  const parts: NanoPart[] = []
  const grounding: unknown[] = []
  let usage: unknown
  let modelVersion: string | undefined
  let finishReason: string | undefined

  for (const raw of responses) {
    if (!raw || typeof raw !== 'object') throw new Error('Respuesta de Google inválida.')
    const response = raw as { modelVersion?: string; usageMetadata?: unknown; promptFeedback?: { blockReason?: string }; candidates?: { content?: NanoContent; finishReason?: string; groundingMetadata?: unknown }[] }

    if (response.promptFeedback?.blockReason) throw new Error('Google bloqueó el prompt; no se recibió una imagen.')

    if (response.modelVersion) {
      if (response.modelVersion !== NANO_BANANA_MODEL && !response.modelVersion.startsWith(`${NANO_BANANA_MODEL}-`)) throw new Error('Google respondió con un modelo distinto al solicitado.')
      modelVersion = response.modelVersion
    }

    if (response.usageMetadata) usage = response.usageMetadata
    const candidate = response.candidates?.[0]

    if (candidate?.finishReason) finishReason = candidate.finishReason
    if (candidate?.groundingMetadata) grounding.push(candidate.groundingMetadata)

    for (const part of candidate?.content?.parts ?? []) {
      if (!part.thought) parts.push(part)
    }
  }

  if (finishReason !== 'STOP') throw new Error('La respuesta no terminó correctamente; no se avanzó la sesión.')
  const images = parts.filter(part => part.inlineData?.mimeType.startsWith('image/') && part.inlineData.data)

  if (!images.length) throw new Error('Google no devolvió una imagen final; no se avanzó la sesión.')

return { content: { role: 'model' as const, parts }, images, text: parts.map(part => part.text ?? '').join(''), grounding, usage, modelVersion }
}

/** SSE framing independent of network chunk boundaries; never emits partial image data. */
export async function readNanoSse(body: ReadableStream<Uint8Array>): Promise<unknown[]> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  let event: string[] = []
  let size = 0
  const records: unknown[] = []

  const line = (value: string) => {
    if (value === '') {
      if (event.length) {
        const data = event.join('\n')

        if (data !== '[DONE]') records.push(JSON.parse(data))
        event = []
      }
    } else if (value.startsWith('data:')) event.push(value.slice(5).trimStart())
  }

  try {
    while (true) {
      const chunk = await reader.read()

      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 64 * 1024 * 1024) throw new Error('Respuesta demasiado grande.')
      pending += decoder.decode(chunk.value, { stream: true })
      let newline: number

      while ((newline = pending.indexOf('\n')) !== -1) {
        line(pending.slice(0, newline).replace(/\r$/, ''))
        pending = pending.slice(newline + 1)
      }
    }

    pending += decoder.decode()
    if (pending) line(pending.replace(/\r$/, ''))
    line('')

return records
  } finally { reader.releaseLock() }
}
