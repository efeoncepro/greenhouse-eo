import { z } from 'zod'

import { setGraderBrandAliases } from '@/lib/growth/ai-visibility/markets/commands'
import { handleMarketRequest, marketAliasSchema } from '@/lib/growth/ai-visibility/markets/http'

const schema = z
  .object({ aliases: z.array(marketAliasSchema).max(20), reason: z.string().trim().min(1).max(1000) })
  .strict()

export const PUT = (request: Request, context: { params: Promise<{ profileId: string }> }) =>
  handleMarketRequest(async actor =>
    setGraderBrandAliases({ ...schema.parse(await request.json()), ...actor, ...(await context.params) })
  )
