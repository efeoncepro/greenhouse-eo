import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isHiringDossierAutoProposeEnabled } from './config'
import { proposeEvaluationDossier } from './propose'

export const HIRING_DOSSIER_AUTO_PROPOSE_ACTOR = 'system:hiring-candidate-review-projection'

type AutoProposeDeps = {
  propose?: typeof proposeEvaluationDossier
  hasScoredAssessment?: (applicationId: string) => Promise<boolean>
}

const hasScoredAssessment = async (applicationId: string) => {
  const rows = await runGreenhousePostgresQuery<{ eligible: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM greenhouse_hiring.hiring_assessment
        WHERE application_id=$1 AND status='scored'
     ) AS eligible`,
    [applicationId]
  )

  return rows[0]?.eligible === true
}

export const autoProposeEvaluationDossier = async (
  applicationId: string,
  deps: AutoProposeDeps = {}
) => {
  if (!isHiringDossierAutoProposeEnabled()) return { outcome: 'disabled' as const }

  const eligible = await (deps.hasScoredAssessment ?? hasScoredAssessment)(applicationId)

  if (!eligible) return { outcome: 'waiting_for_assessment' as const }

  const proposal = await (deps.propose ?? proposeEvaluationDossier)(
    applicationId,
    HIRING_DOSSIER_AUTO_PROPOSE_ACTOR
  )

  return { outcome: 'proposed' as const, proposalId: proposal.proposalId }
}
