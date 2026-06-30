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

// ── Grounded search runner (TASK-1226 / modelo Gemini 3 TASK-1233) ────────────

/**
 * Default Gemini model con Google Search grounding. Gemini 3 (`gemini-3-flash-preview`)
 * es lo más nuevo disponible en Vertex para el proyecto (gemini-3.1 / gemini-3-pro
 * aún dan 404 al 2026-06-24). El grader debe medir con el modelo que usa la gente
 * HOY → se prefiere la última generación. **Override por env** `GREENHOUSE_GEMINI_
 * GROUNDED_MODEL` para bumpear a 3.1/3-pro apenas lleguen, sin deploy.
 */
export const GEMINI_GROUNDED_DEFAULT_MODEL = 'gemini-3-flash-preview'

/** Resuelve el modelo de grounding: env override → default Gemini 3. */
export const resolveGeminiGroundedModel = (env: NodeJS.ProcessEnv = process.env): string =>
  env.GREENHOUSE_GEMINI_GROUNDED_MODEL?.trim() || GEMINI_GROUNDED_DEFAULT_MODEL

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
  const model = input.model?.trim() || resolveGeminiGroundedModel()
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

// ── Structured output runner (TASK-1271) ──────────────────────────────────────

/** Default Gemini model para structured output low-cost (verificable al calibrar). */
export const GEMINI_STRUCTURED_DEFAULT_MODEL = 'gemini-2.5-flash-lite'

export interface GeminiStructuredResult<T> {
  data: T
  model: string
  usage: { inputTokens: number; outputTokens: number }
}

/**
 * Fuerza una respuesta JSON vía Vertex (`responseMimeType: application/json` +
 * `responseJsonSchema`). Devuelve el JSON parseado tipado + modelo + usage. LANZA
 * en error de SDK/credencial/parse (el caller lo mapea a degradación honesta).
 * `thinkingBudget: 0` para mantener barato/determinista el paso de extracción.
 */
export const generateStructuredGemini = async <T>(input: {
  model?: string
  system: string
  prompt: string
  jsonSchema: Record<string, unknown>
  maxOutputTokens?: number
  temperature?: number
}): Promise<GeminiStructuredResult<T>> => {
  const client = await getGoogleGenAIClient()
  const model = input.model?.trim() || GEMINI_STRUCTURED_DEFAULT_MODEL

  const response = await client.models.generateContent({
    model,
    contents: input.prompt,
    config: {
      systemInstruction: input.system,
      temperature: input.temperature ?? 0,
      maxOutputTokens: input.maxOutputTokens ?? 1024,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
      responseJsonSchema: input.jsonSchema
    }
  })

  const text = response.text?.trim()

  if (!text) {
    throw new Error('Gemini structured response vacío.')
  }

  const usage = response.usageMetadata

  return {
    data: JSON.parse(text) as T,
    model,
    usage: {
      inputTokens: typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : 0,
      outputTokens: typeof usage?.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : 0
    }
  }
}
