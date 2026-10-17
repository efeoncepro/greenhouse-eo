import 'server-only'

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { MEASUREMENT_POLICY_AGENT_CONTRACT, measurementPolicyMutationSchema, validateMeasurementMapping, type MeasurementPolicyResult } from './policy-contract'
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

  return {sources,policies,permissions,contract:MEASUREMENT_POLICY_AGENT_CONTRACT}
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

/** A fresh, non-mutating preflight. Execution still revalidates under aggregate lock. */
export const previewMeasurementPolicyCommand = async (actor: TenantEntitlementSubject, raw: unknown) => {
  const parsed=measurementPolicyMutationSchema.safeParse(raw)
  const base:{contractVersion:string;dryRun:true;error?:MeasurementPolicyResult['error']}={contractVersion:MEASUREMENT_POLICY_AGENT_CONTRACT.version,dryRun:true as const}

  if(!parsed.success) return {...base,ok:false,error:'invalid_input' as const,blockingReasons:[],issues:parsed.error.issues.map(issue=>({path:issue.path.join('.'),code:issue.code}))}
  const input=parsed.data
  const permissions=measurementPermissions(actor)
  const permission=input.action==='draft'||input.action==='review'?'author':input.action

  if(!permissions.read || !permissions[permission]) return {...base,ok:false,error:'forbidden' as const,blockingReasons:[]}

  try {
    const catalog=await readMeasurementPolicyCatalog(actor)

    if(!catalog) return {...base,ok:false,error:'forbidden' as const,blockingReasons:[]}
    const revision=input.action==='draft'?null:catalog.policies.find(p=>p.policyId===input.policyId&&p.revisionId===input.revisionId)

    if(input.action!=='draft'&&!revision) return {...base,ok:false,error:'not_found' as const,blockingReasons:[]}
    const scope=input.action==='draft'?input.scope:revision!.scope
    const sameScope=(other:typeof scope)=>other.sourceKind===scope.sourceKind&&other.sourceKey===scope.sourceKey&&other.surfaceId===scope.surfaceId
    const current=catalog.policies.find(p=>sameScope(p.scope))?.publishedRevisionId??null

    if(current!==input.expectedPublishedRevisionId) return {...base,ok:false,error:'conflict' as const,blockingReasons:['published_head_changed']}
    if(revision && ((input.action==='review'&&!['draft','review'].includes(revision.state)) || (input.action==='publish'&&revision.state!=='review') || (input.action==='disable'&&(revision.state!=='published'||current!==revision.revisionId)))) return {...base,ok:false,error:'conflict' as const,blockingReasons:['revision_state_changed']}
    const source=catalog.sources.find(s=>sameScope(s.scope))
    const config=input.action==='draft'?input.config:revision!.config
    const reasons=input.action==='disable'?[]:source?validateMeasurementMapping(config,source):['source_unavailable']

    return {...base,ok:reasons.length===0,blockingReasons:reasons,command:input,impact:{scope,destinations:config.destinations,
      ...(config.googleAds ? { googleAds: config.googleAds } : {}),
      expectedPublishedRevisionId:current,commercialAcceptanceChanged:false,crmDestinationChanged:false}}
  } catch {return {...base,ok:false,error:'policy_unavailable' as const,blockingReasons:[]}}
}
