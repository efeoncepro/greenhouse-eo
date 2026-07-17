import 'server-only'

import { OAuth2Client } from 'google-auth-library'

import { getNotionWebhookWorkerUrl } from './notion-async-ingestion'

export const verifyNotionWebhookTaskRequest = async (
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> => {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const serviceAccountEmail = env.NOTION_WEBHOOK_TASKS_SERVICE_ACCOUNT_EMAIL?.trim()

  if (!token || !serviceAccountEmail) {
    return false
  }

  const audience = env.NOTION_WEBHOOK_TASKS_OIDC_AUDIENCE?.trim()
    || getNotionWebhookWorkerUrl(env)

  const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience })
  const payload = ticket.getPayload()

  return payload?.email_verified === true && payload.email === serviceAccountEmail
}
