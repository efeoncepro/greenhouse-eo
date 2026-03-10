import 'server-only'

import { BigQuery } from '@google-cloud/bigquery'

let bigQueryClient: BigQuery | undefined

const getProjectId = () => {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT environment variable')
  }

  return projectId
}

const getCredentials = () => {
  const rawCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()

  if (!rawCredentials) {
    return undefined
  }

  const candidates = [
    rawCredentials,
    rawCredentials.startsWith('"') && rawCredentials.endsWith('"') ? rawCredentials.slice(1, -1) : rawCredentials,
    rawCredentials.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\"/g, '"')
  ]

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
      // Try the next serialization shape. Vercel preview envs may provide escaped JSON strings.
    }
  }

  throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable')
}

export const getBigQueryClient = () => {
  if (bigQueryClient) {
    return bigQueryClient
  }

  const credentials = getCredentials()

  bigQueryClient = new BigQuery({
    projectId: getProjectId(),
    ...(credentials ? { credentials } : {})
  })

  return bigQueryClient
}

export const getBigQueryProjectId = () => getProjectId()
