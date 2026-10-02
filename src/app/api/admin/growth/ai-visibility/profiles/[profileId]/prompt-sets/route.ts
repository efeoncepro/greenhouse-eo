import { z } from 'zod'

import { createGraderPromptSetDraft, readGraderPromptSets } from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-command'
import { PROMPT_FAMILIES, PROMPT_FAN_OUT_TYPES, PROMPT_INTENT_STAGES } from '@/lib/growth/ai-visibility/prompt-packs/tag-vocabulary'
import { handleProfileRequest } from '@/lib/growth/ai-visibility/profile-http'

/**
 * TASK-1962 — set de preguntas AEO de un perfil (Full API Parity de `readGraderPromptSets` y
 * `createGraderPromptSetDraft`). GET lee el activo y las versiones; POST crea un BORRADOR (no lo activa: eso es
 * `POST /prompt-sets/{setId}/approve`). El orden importa: un análisis `full` ejecuta las primeras 12.
 */
const promptSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    text: z.string().trim().min(10).max(400),
    family: z.enum(PROMPT_FAMILIES),
    fanOutType: z.enum(PROMPT_FAN_OUT_TYPES),
    intentStage: z.enum(PROMPT_INTENT_STAGES),
    namesBrand: z.boolean(),
    rationale: z.string().trim().max(400).optional()
  })
  .strict()

const createSchema = z
  .object({
    marketId: z.string().trim().min(3),
    businessModel: z.string().trim().min(1).nullable(),
    categoryNodeId: z.string().trim().min(1).nullable(),
    reason: z.string().trim().min(10).max(1000),
    prompts: z.array(promptSchema).min(1).max(30)
  })
  .strict()
  .refine(body => new Set(body.prompts.map(prompt => prompt.id)).size === body.prompts.length, { message: 'ids repetidos' })

export const GET = (request: Request, context: { params: Promise<{ profileId: string }> }) =>
  handleProfileRequest(async ({ subject }) => {
    const { profileId } = await context.params
    const marketId = new URL(request.url).searchParams.get('marketId') ?? undefined

    return readGraderPromptSets({ subject, profileId, ...(marketId ? { marketId } : {}) })
  })

export const POST = (request: Request, context: { params: Promise<{ profileId: string }> }) =>
  handleProfileRequest(async ({ subject, actor }) => {
    const body = createSchema.parse(await request.json())
    const { profileId } = await context.params

    return createGraderPromptSetDraft({
      subject,
      profileId,
      marketId: body.marketId,
      businessModel: body.businessModel,
      categoryNodeId: body.categoryNodeId,
      prompts: body.prompts,
      generationStrategy: 'template_baseline',
      model: null,
      systemPromptVersion: null,
      groundingSources: [`operator:${body.reason.slice(0, 120)}`],
      createdBy: actor
    })
  }, 201)
