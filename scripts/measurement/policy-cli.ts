/** Agent client: no SQL, browser, credential minting or authority supplied in a command. */
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { measurementPolicyMutationSchema, MEASUREMENT_POLICY_AGENT_CONTRACT } from '../../src/lib/growth/measurement/policy-contract'
import { executePolicyRequest, PolicyClientError, readMeasurementCatalog, type PolicyRequest } from '../../src/lib/growth/measurement/policy-client'

type Cookie = {name:string;value:string;domain:string;path:string;secure?:boolean;expires?:number}
const endpoint=MEASUREMENT_POLICY_AGENT_CONTRACT.endpoint

export function createPolicyAgentFetch(base:string, state:{cookies:Cookie[]}, bypass?:string, fetchImpl:typeof fetch=fetch):typeof fetch {
  const origin=new URL(base)

  if(origin.protocol!=='https:' || origin.username || origin.password || origin.pathname!=='/' || origin.search || origin.hash) throw Error('https_origin_required')
  const cookies=state.cookies.filter(c=>c.domain===origin.hostname && c.path==='/' && /^(__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(c.name) && (c.expires??0)>Date.now()/1000)

  if(!cookies.length || cookies.some(c=>/[\r\n;]/.test(c.value))) throw Error('fresh_user_bound_session_required')
  const cookie=cookies.map(c=>`${c.name}=${c.value}`).join('; ')

  return (async (path,options={})=>{
    if(path!==endpoint) throw Error('route_out_of_scope')

    return fetchImpl(origin.origin+endpoint,{...options,redirect:'error',signal:AbortSignal.timeout(30_000),headers:{...options.headers,Accept:'application/json',Cookie:cookie,...(bypass?{'x-vercel-protection-bypass':bypass}:{})}}).catch(()=>{throw new PolicyClientError('unavailable')})
  }) as typeof fetch
}

const readPrivate = (path:string) => {
  if(statSync(path).mode&0o077) throw Error('private_file_mode_0600_required')

  return JSON.parse(readFileSync(path,'utf8'))
}

async function main() {
  const [operation,inputPath,...flags]=process.argv.slice(2)

  if(!operation||operation==='--help') {
    process.stdout.write(JSON.stringify({contract:MEASUREMENT_POLICY_AGENT_CONTRACT,usage:['discover','validate command.json','apply command.json --apply --receipt private-receipt.json','verify private-receipt.json'],environment:['GROWTH_MEASUREMENT_BASE_URL (HTTPS origin)','GROWTH_MEASUREMENT_STORAGE_STATE (0600; canonical agent-session)','VERCEL_AUTOMATION_BYPASS_SECRET (staging only, optional)'],exitCodes:{success:0,invalid:2,conflict:3,denied:4,unavailable:5,unknownOutcome:6},notes:'Commands must use metadata only; never include contact values. Create one UUID per intended operation and keep it for retries. Discovery and validation never mutate.'})+'\n')

    return
  }

  if(!['discover','validate','apply','verify'].includes(operation)) throw Error('unknown_operation')
  const base=process.env.GROWTH_MEASUREMENT_BASE_URL
  const storage=process.env.GROWTH_MEASUREMENT_STORAGE_STATE

  if(!base||!storage) throw Error('base_and_session_required')
  const fetcher=createPolicyAgentFetch(base,readPrivate(storage),process.env.VERCEL_AUTOMATION_BYPASS_SECRET)

  if(operation==='discover') {
    process.stdout.write(JSON.stringify(await readMeasurementCatalog(fetcher))+'\n')

    return
  }

  if(!inputPath) throw Error('input_file_required')

  if(operation==='verify') {
    const saved=readPrivate(resolve(inputPath)) as PolicyRequest & {origin:string}

    if(saved.origin!==new URL(base).origin || !saved.receipt) throw Error('known_receipt_for_same_origin_required')
    saved.mutation=measurementPolicyMutationSchema.parse(saved.mutation)
    const result=await executePolicyRequest(saved,fetcher)

    process.stdout.write(JSON.stringify({ok:true,verified:true,revision:result.revision})+'\n')

    return
  }

  const mutation=measurementPolicyMutationSchema.parse(JSON.parse(readFileSync(resolve(inputPath),'utf8')))

  if(operation==='validate') {
    const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dryRun:true,command:mutation})})
    const result=await response.json()

    process.stdout.write(JSON.stringify(result)+'\n')
    process.exitCode=response.ok&&result.ok?0:response.status===403?4:response.status===409?3:response.status>=500?5:2

    return
  }

  const receiptIndex=flags.indexOf('--receipt')

  if(!flags.includes('--apply') || receiptIndex<0 || !flags[receiptIndex+1]) throw Error('explicit_apply_and_receipt_required')
  const receiptPath=resolve(flags[receiptIndex+1])
  let request:PolicyRequest & {origin:string}={mutation,origin:new URL(base).origin}

  try {
    writeFileSync(receiptPath,JSON.stringify(request),{mode:0o600,flag:'wx'})
  } catch(error) {
    if((error as NodeJS.ErrnoException).code!=='EEXIST') throw Error('receipt_write_failed')
    const saved=readPrivate(receiptPath)

    if(saved.origin!==request.origin || JSON.stringify(measurementPolicyMutationSchema.parse(saved.mutation))!==JSON.stringify(mutation)) throw Error('receipt_command_mismatch')
    request=saved
  }

  // A known receipt is persisted BEFORE readback; a subsequent invocation never repeats that POST.
  const result=await executePolicyRequest(request,fetcher,()=>writeFileSync(receiptPath,JSON.stringify(request),{mode:0o600}))

  process.stdout.write(JSON.stringify({ok:true,verified:true,revision:result.revision})+'\n')
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{
  const kind=error instanceof PolicyClientError?error.kind:'invalid'
  const safeCodes=new Set(['https_origin_required','fresh_user_bound_session_required','route_out_of_scope','private_file_mode_0600_required','unknown_operation','base_and_session_required','input_file_required','known_receipt_for_same_origin_required','explicit_apply_and_receipt_required','receipt_write_failed','receipt_command_mismatch'])
  const detail=error instanceof Error&&safeCodes.has(error.message)?error.message:undefined
  const code=kind==='conflict'?3:kind==='denied'?4:kind==='unavailable'?6:2

  // Never print arbitrary server/provider errors, cookies, input or filesystem paths.
  process.stderr.write(JSON.stringify({ok:false,error:kind,code:detail,blockingReasons:error instanceof PolicyClientError?error.reasons:[],recovery:code===6?'Outcome may be unknown. Retry the exact command with the same receipt/key; a known receipt retries GET only.':'Use discover/validate and check session, permissions, current revision and private receipt.'})+'\n')
  process.exitCode=code
})
