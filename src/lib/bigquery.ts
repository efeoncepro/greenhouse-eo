import { BigQuery } from '@google-cloud/bigquery'

import { getGoogleCredentials } from '@/lib/google-credentials'

let bigQueryClient: BigQuery | undefined

const getProjectId = () => {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT environment variable')
  }

  return projectId
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
