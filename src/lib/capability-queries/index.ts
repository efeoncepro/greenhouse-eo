import 'server-only'

import { getCreativeHubQuery } from '@/lib/capability-queries/creative-hub'
import { getCrmCommandCenterQuery } from '@/lib/capability-queries/crm-command-center'
import { getOnboardingCenterQuery } from '@/lib/capability-queries/onboarding-center'
import type { CapabilityQueryBuilder } from '@/lib/capability-queries/types'
import { getWebDeliveryLabQuery } from '@/lib/capability-queries/web-delivery-lab'

const builders: Record<string, CapabilityQueryBuilder> = {
  'creative-hub': getCreativeHubQuery,
  'crm-command-center': getCrmCommandCenterQuery,
  'onboarding-center': getOnboardingCenterQuery,
  'web-delivery-lab': getWebDeliveryLabQuery
}

export const getModuleQueryBuilder = (moduleId: string): CapabilityQueryBuilder | null => builders[moduleId] || null
