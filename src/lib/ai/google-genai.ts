import 'server-only'

import { GoogleGenAI } from '@google/genai'

import { resolveNexaModel } from '@/config/nexa-models'
import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'

let googleGenAIClient: GoogleGenAI | undefined

const getProjectId = () => {
  const projectId = getGoogleProjectId()

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT or GOOGLE_CLOUD_PROJECT environment variable for Greenhouse Agent')
  }

  return projectId
}

const getLocation = () => process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global'

export const getGreenhouseAgentModel = () =>
  resolveNexaModel({
    fallbackModel: process.env.GREENHOUSE_AGENT_MODEL?.trim() || null
  })

export const getGreenhouseAgentRuntimeConfig = () => ({
  projectId: getProjectId(),
  location: getLocation(),
  model: getGreenhouseAgentModel()
})

export const getGoogleGenAIClient = async () => {
  if (googleGenAIClient) {
    return googleGenAIClient
  }

  const { projectId, location } = getGreenhouseAgentRuntimeConfig()

  process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true'
  process.env.GOOGLE_CLOUD_PROJECT ||= projectId
  process.env.GOOGLE_CLOUD_LOCATION ||= location

  googleGenAIClient = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
    apiVersion: 'v1',
    googleAuthOptions: getGoogleAuthOptions()
  })

  return googleGenAIClient
}

// ── Grounded search runner (TASK-1226) ───────────────────────────────────────

/** Default Gemini model con Google Search grounding (verificable contra docs vigentes). */
export const GEMINI_GROUNDED_DEFAULT_MODEL = 'gemini-2.5-flash'

export interface GeminiGroundedCitation {
  url: string
  title: string | null
}

export interface GeminiGroundedSearchResult {
  ok: boolean
  model: string
  text: string | null
  citations: GeminiGroundedCitation[]
  usage: Record<string, unknown>
  latencyMs: number
}

/** ¿Hay project id (Vertex via ADC) para Gemini? No lanza. */
export const isGeminiConfigured = (): boolean => Boolean(getGoogleProjectId())

/**
 * Ejecuta un prompt contra Gemini con Google Search grounding (Vertex). Devuelve
 * texto + citations normalizadas (groundingMetadata.groundingChunks[].web.uri).
 * Lanza en error de SDK/credencial (el caller lo mapea a clase canónica).
 */
export const runGeminiGroundedSearch = async (input: {
  prompt: string
  model?: string
}): Promise<GeminiGroundedSearchResult> => {
  const client = await getGoogleGenAIClient()
  const model = input.model?.trim() || GEMINI_GROUNDED_DEFAULT_MODEL
  const started = Date.now()

  const response = await client.models.generateContent({
    model,
    contents: input.prompt,
    config: { tools: [{ googleSearch: {} }] }
  })

  const latencyMs = Date.now() - started
  const candidate = response.candidates?.[0]

  const text =
    candidate?.content?.parts?.map(part => part.text ?? '').join('') || response.text || null

  const citations: GeminiGroundedCitation[] = []
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? []

  for (const chunk of chunks) {
    const uri = chunk.web?.uri

    if (typeof uri === 'string') {
      citations.push({ url: uri, title: chunk.web?.title ?? null })
    }
  }

  return {
    ok: true,
    model,
    text,
    citations,
    usage: (response.usageMetadata as Record<string, unknown> | undefined) ?? {},
    latencyMs
  }
}
