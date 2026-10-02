import { z } from 'zod'

import { setGraderMarketCompetitors } from '@/lib/growth/ai-visibility/markets/commands'
import { handleMarketRequest, marketCompetitorSchema } from '@/lib/growth/ai-visibility/markets/http'

const schema = z
  .object({ competitors: z.array(marketCompetitorSchema).max(10), reason: z.string().trim().min(1).max(1000) })
  .strict()

export const PUT = (request: Request, context: { params: Promise<{ marketId: string }> }) =>
  handleMarketRequest(async actor =>
    setGraderMarketCompetitors({ ...schema.parse(await request.json()), ...actor, ...(await context.params) })
  )
