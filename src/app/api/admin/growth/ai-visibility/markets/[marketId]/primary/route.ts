import { setGraderPrimaryMarket } from '@/lib/growth/ai-visibility/markets/commands'
import { handleMarketRequest } from '@/lib/growth/ai-visibility/markets/http'

export const POST = (_request: Request, context: { params: Promise<{ marketId: string }> }) =>
  handleMarketRequest(async actor => setGraderPrimaryMarket({ ...actor, ...(await context.params) }))
