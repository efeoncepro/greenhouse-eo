import { z } from 'zod'

import { handleMarketRequest } from '@/lib/growth/ai-visibility/markets/http'
import { readGraderMarketMatrix } from '@/lib/growth/ai-visibility/markets/readers'

export const GET = (request: Request) =>
  handleMarketRequest(actor =>
    readGraderMarketMatrix({
      ...actor,
      organizationId: z.string().min(1).parse(new URL(request.url).searchParams.get('organizationId'))
    })
  )
