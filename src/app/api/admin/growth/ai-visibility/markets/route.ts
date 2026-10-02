import { z } from 'zod'

import { addGraderMarket } from '@/lib/growth/ai-visibility/markets/commands'
import { handleMarketRequest } from '@/lib/growth/ai-visibility/markets/http'
import { readGraderMarkets } from '@/lib/growth/ai-visibility/markets/readers'

const schema = z
  .object({ organizationId: z.string().min(1), marketCode: z.string().min(1), locale: z.string().optional() })
  .strict()

export const GET = (request: Request) =>
  handleMarketRequest(actor =>
    readGraderMarkets({
      ...actor,
      organizationId: z.string().min(1).parse(new URL(request.url).searchParams.get('organizationId'))
    })
  )
export const POST = (request: Request) =>
  handleMarketRequest(async actor => addGraderMarket({ ...schema.parse(await request.json()), ...actor }), 201)
