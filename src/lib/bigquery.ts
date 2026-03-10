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

  return JSON.parse(rawCredentials)
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
