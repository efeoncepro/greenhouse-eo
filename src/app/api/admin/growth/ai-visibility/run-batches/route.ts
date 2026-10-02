import { z } from 'zod'

import { handleMarketRequest } from '@/lib/growth/ai-visibility/markets/http'
import { readGraderRunBatch } from '@/lib/growth/ai-visibility/markets/readers'
import { requestGraderRunBatch } from '@/lib/growth/ai-visibility/markets/run-batch'

const schema = z
  .object({
    organizationId: z.string().min(1),
    markets: z.union([z.enum(['primary', 'all_active']), z.array(z.string().min(1)).min(1).max(100)]),
    mode: z.enum(['light', 'full', 'internal_audit']),
    idempotencyKey: z.string().trim().min(1).max(200)
  })
  .strict()

export const POST = (request: Request) =>
  handleMarketRequest(
    async actor => requestGraderRunBatch({ ...schema.parse(await request.json()), ...actor, channel: 'operator' }),
    202
  )
export const GET = (request: Request) =>
  handleMarketRequest(actor => {
    const params = new URL(request.url).searchParams

    return readGraderRunBatch({
      ...actor,
      organizationId: z.string().min(1).parse(params.get('organizationId')),
      batchRef: z.string().min(1).parse(params.get('batchRef'))
    })
  })
