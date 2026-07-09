import type { HiringDeskCopy } from '../../types'

import { hiringDesk as esCL } from '../es-CL/hiringDesk'

export const hiringDesk: HiringDeskCopy = {
  ...esCL,
  title: 'Hiring Desk',
  eyebrow: 'Team and talent',
  subtitle: 'Hiring pipeline control room — publish, assess and decide.',
  navigation: { demand: 'Demand', pipeline: 'Pipeline', publication: 'Publishing' },
  common: { ...esCL.common, search: 'Search by role, person or ID', retry: 'Retry', cancel: 'Cancel', save: 'Save', close: 'Close', confirm: 'Confirm', loading: 'Loading…', noResults: 'No results found.', openApplication: 'Open application', previous: 'Previous', next: 'Next', agency: 'Agency', demandFormRegion: 'New demand form', createOptions: 'More creation options' },
  demand: { ...esCL.demand, title: 'Talent demand', subtitle: 'Open, prioritize and track every search from one operational view.', newDemand: 'New demand', activeDemands: 'Active demands', openPositions: 'Open positions', applicants: 'Applicants', published: 'Published', role: 'Role', area: 'Area', owner: 'Owner', status: 'Status', candidates: 'Candidates', targetDate: 'Target date', drawerTitle: 'New demand', create: 'Create demand', createAndPublish: 'Create and publish' },
  pipeline: { ...esCL.pipeline, title: 'Applicant pipeline', subtitle: 'Drag cards or use the stage menu; every change is saved with rollback.', openingLabel: 'Opening', allOpenings: 'All openings', moveTo: 'Move to stage', saved: 'Stage updated.', saving: 'Saving change…', rollback: 'We could not save the change. The previous stage was restored.' },
  application: { ...esCL.application, back: 'Back', overview: 'Overview', assessment: 'Assessment', documents: 'Documents', decision: 'Decision', decideAction: 'Decide', activity: 'Activity', candidate: 'Candidate', contact: 'Protected contact', opening: 'Opening', decisionTitle: 'Human decision', confirmTitle: 'Confirm decision', decided: 'Decision recorded.', reviewAssessment: 'Review assessment', reviewPending: 'Pending review', aiSuggestion: 'AI suggestion', aiSuggestionNote: 'AI proposes a score; you confirm or edit it before it counts.', scoreLabel: 'Score', overallScore: 'Overall score', confirmScore: 'Confirm score', scoreConfirmed: 'Score confirmed.', finalizeScorecard: 'Finalize scorecard', scorecardFinalized: 'Scorecard finalized.' },
  publication: { ...esCL.publication, title: 'Publishing governance', subtitle: 'Compare internal content with the public payload before publishing.', publicPreview: 'Public preview', internalOnly: 'Internal only', publish: 'Publish', pause: 'Pause', edit: 'Edit content' }
}
