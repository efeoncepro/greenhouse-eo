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
