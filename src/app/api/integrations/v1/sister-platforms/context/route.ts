import { NextResponse } from 'next/server'

import { runSisterPlatformReadRoute } from '@/lib/sister-platforms/external-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runSisterPlatformReadRoute({
    request,
    routeKey: 'sister-platforms.context',
    handler: async ({ requestId, consumer, binding }) =>
      NextResponse.json({
        requestId,
        servedAt: new Date().toISOString(),
        consumer: {
          consumerId: consumer.consumerId,
          publicId: consumer.publicId,
          sisterPlatformKey: consumer.sisterPlatformKey,
          consumerName: consumer.consumerName,
          consumerType: consumer.consumerType,
          allowedGreenhouseScopeTypes: consumer.allowedGreenhouseScopeTypes,
          rateLimitPerMinute: consumer.rateLimitPerMinute,
          rateLimitPerHour: consumer.rateLimitPerHour,
          expiresAt: consumer.expiresAt
        },
        binding
      })
  })
}
