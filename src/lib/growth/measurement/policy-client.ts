import type { MeasurementPolicyMutation, MeasurementPolicyResult, MeasurementPolicyRevision, MeasurementPolicySource } from '@/lib/growth/measurement/policy-contract'

export type MeasurementCatalog = {
  sources: MeasurementPolicySource[]
  policies: MeasurementPolicyRevision[]
  permissions: { read: boolean; author: boolean; publish: boolean; disable: boolean }
}
export type PolicyRequest = { mutation: MeasurementPolicyMutation; receipt?: MeasurementPolicyRevision }
export class PolicyClientError extends Error {
  constructor(public kind: 'unavailable'|'denied'|'conflict'|'invalid', public reasons: string[] = []) { super(kind) }
}

export const measurementScopeKey = (scope: MeasurementPolicySource['scope']) => `${scope.sourceKind}:${scope.sourceKey}:${scope.surfaceId}`

export async function readMeasurementCatalog(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<MeasurementCatalog> {
  const response = await fetcher('/api/admin/growth/measurement', { cache: 'no-store', signal })

  if (!response.ok) throw new PolicyClientError([401,403].includes(response.status) ? 'denied' : 'unavailable')

  return response.json()
}

/** Keep this request object across retries. A known receipt retries only readback. */
export async function executePolicyRequest(request: PolicyRequest, fetcher: typeof fetch = fetch, onReceipt?: (receipt: MeasurementPolicyRevision) => void) {
  if (!request.receipt) {
    const response = await fetcher('/api/admin/growth/measurement', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request.mutation),
    })

    if (response.status >= 500) throw new PolicyClientError('unavailable')
    if ([401,403].includes(response.status)) throw new PolicyClientError('denied')
    if (response.status === 409) throw new PolicyClientError('conflict')
    const result = await response.json() as MeasurementPolicyResult

    if (!response.ok || !result.ok || !result.policy) throw new PolicyClientError('invalid', result.blockingReasons ?? [])
    request.receipt = result.policy
    onReceipt?.(result.policy)
  }

  const catalog = await readMeasurementCatalog(fetcher)
  const revision = catalog.policies.find(p => p.revisionId === request.receipt!.revisionId)
  const action = request.mutation.action
  const expectedState = action === 'publish' ? 'published' : action === 'disable' ? 'disabled' : action

  if (!revision || revision.state !== expectedState ||
    (action === 'publish' && revision.publishedRevisionId !== revision.revisionId) ||
    (action === 'disable' && revision.publishedRevisionId !== null)) throw new PolicyClientError('conflict')

  return { catalog, revision }
}
