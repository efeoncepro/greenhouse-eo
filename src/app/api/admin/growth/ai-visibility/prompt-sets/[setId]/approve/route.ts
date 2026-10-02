import { approveGraderPromptSet } from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-command'
import { handleProfileRequest } from '@/lib/growth/ai-visibility/profile-http'

/** TASK-1962 — activa un set de preguntas AEO (borrador → activo; el activo anterior queda reemplazado). */
export const POST = (_request: Request, context: { params: Promise<{ setId: string }> }) =>
  handleProfileRequest(async ({ subject, actor }) => {
    const { setId } = await context.params

    return approveGraderPromptSet({ subject, setId, approvedBy: actor })
  })
