import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { executeMeasurementPolicyCommand, previewMeasurementPolicyCommand, readMeasurementPolicyCatalog } from '@/lib/growth/measurement/policy-command'
import { measurementPolicyPreviewSchema } from '@/lib/growth/measurement/policy-contract'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic='force-dynamic'

export async function GET() {
  const {tenant,errorResponse}=await requireInternalTenantContext()

  if(!tenant) return errorResponse??canonicalErrorResponse('unauthorized')

  try {
    const catalog=await readMeasurementPolicyCatalog(tenant)

    return catalog?NextResponse.json(catalog):canonicalErrorResponse('forbidden')
  } catch { return canonicalErrorResponse('internal_error',{statusOverride:503}) }
}

export async function POST(request: Request) {
  const {tenant,errorResponse}=await requireInternalTenantContext()

  if(!tenant) return errorResponse??canonicalErrorResponse('unauthorized')
  const text=await request.text()

  if(text.length>16_384) return NextResponse.json({ok:false,error:'invalid_input',blockingReasons:[]},{status:413})
  let body: unknown

  try { body=JSON.parse(text) } catch { return NextResponse.json({ok:false,error:'invalid_input',blockingReasons:[]},{status:400}) }
  const preview=measurementPolicyPreviewSchema.safeParse(body)
  const result=preview.success?await previewMeasurementPolicyCommand(tenant,preview.data.command):await executeMeasurementPolicyCommand(tenant,body)
  const status=result.ok?200:result.error==='forbidden'?403:result.error==='not_found'?404:result.error==='conflict'?409:result.error==='policy_unavailable'?503:422

  return NextResponse.json(result,{status})
}
