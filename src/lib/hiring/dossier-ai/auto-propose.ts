import 'server-only'

import { isHiringDossierAutoProposeEnabled } from './config'
import { proposeEvaluationDossier } from './propose'

export const HIRING_DOSSIER_AUTO_PROPOSE_ACTOR = 'system:hiring-candidate-review-projection'

type AutoProposeDeps = {
  propose?: typeof proposeEvaluationDossier
}

export const autoProposeEvaluationDossier = async (
  applicationId: string,
  deps: AutoProposeDeps = {}
) => {
  if (!isHiringDossierAutoProposeEnabled()) return { outcome: 'disabled' as const }

  const proposal = await (deps.propose ?? proposeEvaluationDossier)(
    applicationId,
    HIRING_DOSSIER_AUTO_PROPOSE_ACTOR
  )

  return { outcome: 'proposed' as const, proposalId: proposal.proposalId }
}
