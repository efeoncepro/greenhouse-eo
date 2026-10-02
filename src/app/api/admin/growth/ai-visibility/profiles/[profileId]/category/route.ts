import { z } from 'zod'

import { overrideProfileCategory } from '@/lib/growth/ai-visibility/override-category'
import { handleProfileRequest } from '@/lib/growth/ai-visibility/profile-http'

/** TASK-1962 — corrige la categoría (nodo de la taxonomía canónica) de un perfil AEO. Command gobernado y auditado. */
const schema = z.object({ categoryNodeId: z.string().trim().min(3).max(120), reason: z.string().trim().min(10).max(1000) }).strict()

export const PUT = (request: Request, context: { params: Promise<{ profileId: string }> }) =>
  handleProfileRequest(async ({ subject, actor }) => {
    const body = schema.parse(await request.json())
    const { profileId } = await context.params

    return overrideProfileCategory({ subject, profileId, categoryNodeId: body.categoryNodeId, reason: body.reason, updatedBy: actor })
  })
