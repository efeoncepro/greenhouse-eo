import { BigQuery } from '@google-cloud/bigquery'

import { getBigQueryQueryOptions } from '@/lib/cloud/bigquery'
import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'

let bigQueryClient: BigQuery | undefined

export const getBigQueryClient = () => {
  if (bigQueryClient) {
    return bigQueryClient
  }

  bigQueryClient = new BigQuery(getGoogleAuthOptions())

  return bigQueryClient
}

export const getBigQueryProjectId = () => getGoogleProjectId()
export { getBigQueryQueryOptions }
