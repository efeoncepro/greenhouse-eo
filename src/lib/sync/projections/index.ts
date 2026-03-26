import 'server-only'

import { registerProjection } from '../projection-registry'
import { organization360Projection } from './organization-360'
import { notificationProjection } from './notifications'
import { icoMemberProjection } from './ico-member-metrics'
import { clientEconomicsProjection } from './client-economics'
import { organizationExecutiveProjection } from './organization-executive'
import { personIntelligenceProjection } from './person-intelligence'
import { icoOrganizationProjection } from './ico-organization-metrics'
import { organizationOperationalProjection } from './organization-operational'

// DEPRECATED: personOperationalProjection removed — replaced by personIntelligenceProjection
// DEPRECATED: icoMemberProjection kept for backward compat (BQ → Postgres sync) but person_intelligence
// is now the primary consumer of that data

let registered = false

export const ensureProjectionsRegistered = () => {
  if (registered) return
  registered = true

  registerProjection(organization360Projection)
  registerProjection(notificationProjection)
  registerProjection(icoMemberProjection) // Keeps BQ → Postgres ico_member_metrics sync active
  registerProjection(clientEconomicsProjection)
  registerProjection(organizationExecutiveProjection)
  registerProjection(personIntelligenceProjection) // Replaces personOperationalProjection
  registerProjection(icoOrganizationProjection)
  registerProjection(organizationOperationalProjection)
}
