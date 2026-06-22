import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { PeopleActivitySubject } from '@/lib/people/person-activity-access'

import {
  buildMemberPerformancePayload,
  resolveMemberPerformanceFromQuery,
  type MemberPerformancePayload
} from './people-performance-shared'

/**
 * API Platform ecosystem lane (MCP / agentes downstream) del desempeño ICO por persona (TASK-1216,
 * `people.v1`). Consumer del MISMO primitive `readMemberIcoProfileForSubject` que Nexa, el app lane y
 * la UI — un primitive, muchos consumers (Full API Parity).
 *
 * Gobernanza: el desempeño de personas es interno y sensible. El ecosystem lane no tiene usuario; la
 * autorización se deriva del binding. SOLO un binding con `greenhouseScopeType === 'internal'` (consumer
 * explícitamente autorizado para scope interno) puede leerlo, mapeado a un subject interno de menor
 * privilegio (`people_viewer` → `canViewActivity`, sin supervisor scope porque no hay persona). Cualquier
 * binding client/organization/space → 403 (un consumer client-scoped NUNCA ve desempeño de miembros).
 */

const buildInternalBindingSubject = (publicId: string): PeopleActivitySubject => ({
  // Identidad sintética del consumer (no es un usuario); el scope interno ya fue autorizado al crear el binding.
  userId: `sister-platform:${publicId}`,
  tenantType: 'efeonce_internal',
  memberId: null,
  // Menor privilegio que confiere canViewActivity (read de actividad), NUNCA admin.
  roleCodes: ['people_viewer'],
  routeGroups: ['people'],
  organizationId: null
})

export const getEcosystemMemberPerformancePayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<MemberPerformancePayload>> => {
  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Member performance is restricted to internal-scope consumers.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const person = resolveMemberPerformanceFromQuery(request)
  const subject = buildInternalBindingSubject(context.consumer.publicId)
  const data = await buildMemberPerformancePayload(subject, person)

  return { data, meta: { memberId: data.memberId } }
}
