import 'server-only'

import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

import { GoogleGenAI } from '@google/genai'

let googleGenAIClient: GoogleGenAI | undefined
let credentialsFilePromise: Promise<string | undefined> | undefined

const stripWrappingQuotes = (value: string) => {
  const trimmed = value.trim()
  const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"')
  const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'")

  return hasDoubleQuotes || hasSingleQuotes ? trimmed.slice(1, -1).trim() : trimmed
}

const normalizeLegacyEscapedJson = (value: string) => {
  return stripWrappingQuotes(value)
    .replace(/\r?\n/g, '')
    .replace(/^\{\\n\s*/, '{')
    .replace(/,\\n\s*"/g, ',"')
    .replace(/\\n\}$/g, '}')
    .replace(/\\n\\r\\n$/g, '')
}

const collapseDoubledQuotes = (value: string) => value.replace(/""/g, '"')

const extractJsonEnvelope = (value: string) => {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')

  return start >= 0 && end > start ? value.slice(start, end + 1) : value
}

const buildCredentialCandidates = (value: string) => {
  const stripped = stripWrappingQuotes(value)
  const unescaped = stripped.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\"/g, '"')
  const normalized = normalizeLegacyEscapedJson(stripped)
  const extracted = extractJsonEnvelope(stripped)
  const extractedNormalized = extractJsonEnvelope(normalized)

  return Array.from(
    new Set(
      [
        value,
        stripped,
        unescaped,
        normalized,
        collapseDoubledQuotes(stripped),
        collapseDoubledQuotes(unescaped),
        extracted,
        extractedNormalized
      ].filter(Boolean)
    )
  )
}

const parseCredentials = (candidates: string[]) => {
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)

      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>
      }

      if (typeof parsed === 'string') {
        const reparsed = JSON.parse(parsed)

        if (reparsed && typeof reparsed === 'object') {
          return reparsed as Record<string, unknown>
        }
      }
    } catch {
      // Try the next serialization shape. Preview envs may inject escaped or re-quoted JSON strings.
    }
  }

  return undefined
}

const getProjectId = () => {
  const projectId = process.env.GCP_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim()

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT or GOOGLE_CLOUD_PROJECT environment variable for Greenhouse Agent')
  }

  return projectId
}

const getLocation = () => process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global'

export const getGreenhouseAgentModel = () =>
  process.env.GREENHOUSE_AGENT_MODEL?.trim() || 'gemini-2.5-flash'

const ensureCredentialFile = async () => {
  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()

  if (explicitPath) {
    return explicitPath
  }

  const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  const rawCredentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64?.trim()

  if (!rawCredentials && !rawCredentialsBase64) {
    return undefined
  }

  const parsed =
    (rawCredentials && parseCredentials(buildCredentialCandidates(rawCredentials))) ||
    (rawCredentialsBase64 &&
      parseCredentials(
        buildCredentialCandidates(Buffer.from(stripWrappingQuotes(rawCredentialsBase64), 'base64').toString('utf8'))
      ))

  if (!parsed) {
    throw new Error('Invalid Google service account credentials for Greenhouse Agent')
  }

  const dir = await mkdtemp(join(tmpdir(), 'greenhouse-genai-'))
  const filePath = join(dir, 'service-account.json')

  await writeFile(filePath, JSON.stringify(parsed), { encoding: 'utf8', mode: 0o600 })

  process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath

  return filePath
}

export const getGreenhouseAgentRuntimeConfig = () => ({
  projectId: getProjectId(),
  location: getLocation(),
  model: getGreenhouseAgentModel()
})

export const getGoogleGenAIClient = async () => {
  if (googleGenAIClient) {
    return googleGenAIClient
  }

  credentialsFilePromise ||= ensureCredentialFile()
  await credentialsFilePromise

  const { projectId, location } = getGreenhouseAgentRuntimeConfig()

  process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true'
  process.env.GOOGLE_CLOUD_PROJECT ||= projectId
  process.env.GOOGLE_CLOUD_LOCATION ||= location

  googleGenAIClient = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
    apiVersion: 'v1'
  })

  return googleGenAIClient
}
