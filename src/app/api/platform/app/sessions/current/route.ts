import { revokeCurrentAppSession, runAppRoute } from '@/lib/api-platform/core/app-auth'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  return runAppRoute({
    request,
    routeKey: 'platform.app.sessions.current.revoke',
    handler: async context => {
      await revokeCurrentAppSession(context)

      return {
        data: {
          revoked: true
        }
      }
    }
  })
}
