import { NextResponse } from 'next/server'

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { EmailEvidenceError, readHubSpotEvidence, readResendEvidence } from '@/lib/marketing-studio/email-evidence'
import { authorizeEmailEvidence } from '@/lib/marketing-studio/email-evidence-port'
import { resolveResendApiKey } from '@/lib/resend'
import { runSisterPlatformReadRoute, SisterPlatformExternalApiError } from '@/lib/sister-platforms/external-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Internal provider transport. End-user evidence is exposed by Studio's registered API/MCP readers. */
export async function GET(request: Request) {
  return runSisterPlatformReadRoute({
    request,
    routeKey: 'sister-platforms.marketing-studio.email-evidence',
    handler: async ({ consumer, binding }) => {
      const params = new URL(request.url).searchParams

      try {
        const account = authorizeEmailEvidence({
          enabled: process.env.GREENHOUSE_STUDIO_EMAIL_EVIDENCE_ENABLED === 'true',
          configuredBindings: process.env.GREENHOUSE_STUDIO_EMAIL_EVIDENCE_BINDINGS,
          consumerPlatform: consumer.sisterPlatformKey,
          bindingPlatform: binding.sisterPlatformKey,
          bindingScope: binding.greenhouseScopeType,
          bindingOrganizationId: binding.organizationId,
          organizationId: params.get('organizationId'),
          provider: params.get('provider'),
          accountRef: params.get('accountRef')
        })

        const cursor = params.get('cursor')

        const page =
          account.provider === 'hubspot'
            ? await readHubSpotEvidence({ token: await getHubSpotAccessToken(), portalId: account.accountRef, cursor })
            : await readResendEvidence({ token: (await resolveResendApiKey()) ?? '', cursor })

        return NextResponse.json({ ...account, complete: true, ...page })
      } catch (error) {
        throw new SisterPlatformExternalApiError('La evidencia de correo no está disponible.', {
          statusCode: error instanceof EmailEvidenceError && error.code === 'not_configured' ? 404 : 503,
          errorCode: error instanceof EmailEvidenceError ? error.code : 'provider_unavailable'
        })
      }
    }
  })
}
