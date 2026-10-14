import 'server-only'

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { measurementPolicyMutationSchema, type MeasurementPolicyResult } from './policy-contract'
import { listMeasurementSources } from './policy-source'
import { listMeasurementPolicies, mutateMeasurementPolicyStore } from './policy-store'

export const measurementPermissions = (actor: TenantEntitlementSubject) => {
  const internal=actor.tenantType==='efeonce_internal'

  return {
    read: internal && can(actor,'growth.measurement.read','read','tenant'),
    author: internal && can(actor,'growth.measurement.author','execute','tenant'),
    publish: internal && can(actor,'growth.measurement.publish','execute','tenant'),
    disable: internal && can(actor,'growth.measurement.disable','execute','tenant'),
  }
}

export const readMeasurementPolicyCatalog = async (actor: TenantEntitlementSubject) => {
  const permissions=measurementPermissions(actor)

  if(!permissions.read) return null
  const [sources,policies]=await Promise.all([listMeasurementSources(),listMeasurementPolicies()])

  return {sources,policies,permissions}
}

export const executeMeasurementPolicyCommand = async (actor: TenantEntitlementSubject, raw: unknown): Promise<MeasurementPolicyResult> => {
  const parsed=measurementPolicyMutationSchema.safeParse(raw)

  if(!parsed.success) return {ok:false,error:'invalid_input',blockingReasons:[]}
  const input=parsed.data
  const permission=input.action==='draft'||input.action==='review'?'author':input.action

  if(!measurementPermissions(actor)[permission]) return {ok:false,error:'forbidden',blockingReasons:[]}

  try { return await mutateMeasurementPolicyStore(input,actor.userId) }
  catch { return {ok:false,error:'policy_unavailable',blockingReasons:[]} }
}
