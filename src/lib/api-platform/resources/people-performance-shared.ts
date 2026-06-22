import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import {
  readMemberIcoProfileForSubject,
  type PeopleActivitySubject
} from '@/lib/people/person-activity-access'
import type { PersonIcoProfile } from '@/lib/person-360/get-person-ico-profile'

/**
 * TASK-1216 — payload compartido de los lanes de API Platform (ecosystem/MCP + app) para el
 * desempeño ICO de una persona. Cada lane construye su `PeopleActivitySubject` (el ecosystem desde
 * el binding, el app desde el tenant) y delega acá: una sola traducción del resultado del primitive
 * canónico `readMemberIcoProfileForSubject` a payload/ApiPlatformError. Cero lógica de negocio nueva.
 */

export interface MemberPerformancePayload {
  memberId: string
  displayName: string
  profile: PersonIcoProfile
}

export const resolveMemberPerformanceFromQuery = (request: Request): string => {
  const url = new URL(request.url)
  const person = (url.searchParams.get('person') ?? url.searchParams.get('q') ?? '').trim()

  if (!person) {
    throw new ApiPlatformError('Missing required query param: person', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return person
}

export const buildMemberPerformancePayload = async (
  subject: PeopleActivitySubject,
  person: string
): Promise<MemberPerformancePayload> => {
  const result = await readMemberIcoProfileForSubject(subject, person)

  if (result.status === 'forbidden') {
    throw new ApiPlatformError('You do not have access to member performance.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }

  // not_found es uniforme (no existe / fuera de scope): nunca filtra existencia.
  if (result.status === 'not_found') {
    throw new ApiPlatformError('No member matched the provided reference, or it is out of scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  if (result.status === 'ambiguous') {
    throw new ApiPlatformError('The provided reference matched multiple members; be more specific.', {
      statusCode: 409,
      errorCode: 'ambiguous_reference',
      details: { candidates: result.candidates.map(candidate => candidate.displayName) }
    })
  }

  return {
    memberId: result.memberId,
    displayName: result.displayName,
    profile: result.profile
  }
}
