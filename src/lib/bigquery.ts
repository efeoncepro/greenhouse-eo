import 'server-only'

import { BigQuery } from '@google-cloud/bigquery'

let bigQueryClient: BigQuery | undefined

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
        return parsed
      }

      if (typeof parsed === 'string') {
        const reparsed = JSON.parse(parsed)

        if (reparsed && typeof reparsed === 'object') {
          return reparsed
        }
      }
    } catch {
      // Try the next serialization shape. Preview envs may inject escaped or re-quoted JSON strings.
    }
  }

  return undefined
}

const getProjectId = () => {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT environment variable')
  }

  return projectId
}

export const getGoogleCredentials = () => {
  const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  const rawCredentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64?.trim()

  if (!rawCredentials && !rawCredentialsBase64) {
    return undefined
  }

  if (rawCredentials) {
    const parsed = parseCredentials(buildCredentialCandidates(rawCredentials))

    if (parsed) {
      return parsed
    }
  }

  if (rawCredentialsBase64) {
    try {
      const decoded = Buffer.from(stripWrappingQuotes(rawCredentialsBase64), 'base64').toString('utf8')
      const parsed = parseCredentials(buildCredentialCandidates(decoded))

      if (parsed) {
        return parsed
      }
    } catch {
      // Fall through to the explicit runtime error below.
    }
  }

  console.error('Unable to parse GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable.')

  throw new Error('Invalid BigQuery credentials environment variable')
}

export const getBigQueryClient = () => {
  if (bigQueryClient) {
    return bigQueryClient
  }

  const credentials = getGoogleCredentials()

  bigQueryClient = new BigQuery({
    projectId: getProjectId(),
    ...(credentials ? { credentials } : {})
  })

  return bigQueryClient
}

export const getBigQueryProjectId = () => getProjectId()
