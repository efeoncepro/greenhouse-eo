import 'server-only'

import { commercialFormClassificationSchema, type CommercialFormClassificationInput } from './classification-contract'
import { correctCommercialFormClassificationStore } from './store'

/** Shared command for the governed API and the explicitly invoked operator repair CLI. */
export const correctCommercialFormClassification = (input: CommercialFormClassificationInput, actorId: string) => {
  if (!actorId.trim() || actorId.length > 180) throw new Error('actor_required')

  return correctCommercialFormClassificationStore(commercialFormClassificationSchema.parse(input), actorId)
}
