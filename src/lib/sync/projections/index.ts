import 'server-only'

import { registerProjection } from '../projection-registry'
import { organization360Projection } from './organization-360'
import { notificationProjection } from './notifications'
import { icoMemberProjection } from './ico-member-metrics'
import { clientEconomicsProjection } from './client-economics'

let registered = false

export const ensureProjectionsRegistered = () => {
  if (registered) return
  registered = true

  registerProjection(organization360Projection)
  registerProjection(notificationProjection)
  registerProjection(icoMemberProjection)
  registerProjection(clientEconomicsProjection)
}
