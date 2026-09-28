import { z } from 'zod'

import { configureGraderMarketRegrade } from '@/lib/growth/ai-visibility/markets/commands'
import { handleMarketRequest } from '@/lib/growth/ai-visibility/markets/http'

const schema = z.object({ enabled: z.boolean(), cadence: z.enum(['weekly', 'monthly', 'quarterly']) }).strict()

export const PUT = (request: Request, context: { params: Promise<{ marketId: string }> }) =>
  handleMarketRequest(async actor =>
    configureGraderMarketRegrade({ ...schema.parse(await request.json()), ...actor, ...(await context.params) })
  )
