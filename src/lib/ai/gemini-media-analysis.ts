import 'server-only'

import { readFile } from 'node:fs/promises'

import { getGoogleGenAIClient } from '@/lib/ai/google-genai'
import { assertInlineBudget, GEMINI_MEDIA_DEFAULT_MODEL, mimeForPath } from '@/lib/ai/gemini-media-analysis-cli'

export interface GeminiMediaAnalysisResult {
  model: string
  text: string
  usage: { inputTokens: number; outputTokens: number }
  latencyMs: number
}

/**
 * Envía audio, video o imagen inline a Gemini (Vertex, cliente canónico) junto a un prompt y
 * devuelve la respuesta en texto. LANZA en error de SDK, credencial o respuesta vacía.
 */
export const analyzeMediaWithGemini = async (input: {
  files: string[]
  prompt: string
  model?: string
  temperature?: number
}): Promise<GeminiMediaAnalysisResult> => {
  const buffers = await Promise.all(input.files.map(path => readFile(path)))

  assertInlineBudget(buffers.map(buffer => buffer.byteLength))

  const parts = [
    ...input.files.map((path, index) => ({
      inlineData: { mimeType: mimeForPath(path), data: buffers[index].toString('base64') }
    })),
    { text: input.prompt }
  ]

  const client = await getGoogleGenAIClient()
  const model = input.model?.trim() || GEMINI_MEDIA_DEFAULT_MODEL
  const started = Date.now()

  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: { temperature: input.temperature ?? 0.2 }
  })

  const text = response.text?.trim()

  if (!text) throw new Error(`Gemini (${model}) devolvió una respuesta vacía.`)

  const usage = response.usageMetadata

  return {
    model,
    text,
    usage: {
      inputTokens: typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : 0,
      outputTokens: typeof usage?.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : 0
    },
    latencyMs: Date.now() - started
  }
}
