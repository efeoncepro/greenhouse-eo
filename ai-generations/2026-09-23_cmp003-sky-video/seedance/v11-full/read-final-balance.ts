import { config } from 'dotenv'
import { readFile, writeFile } from 'node:fs/promises'
import { getFalAccountBalances } from '@/lib/ai/fal'
config({path:'.env.local',quiet:true})
async function main(){
  const dir='ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/'
  const balances=await getFalAccountBalances()
  const before=JSON.parse(await readFile(dir+'balance-before.json','utf8'))
  const after=balances.find(x=>x.account==='FAL_API_KEY_B')?.balance
  const delta=typeof after==='number'?before.balances.find((x:any)=>x.account==='FAL_API_KEY_B').balance-after:null
  const result={at:new Date().toISOString(),balances,accountDeltaUsd:delta,attribution:'Account balance delta; request-level billing not yet verified',estimatedUsd:23.88204,approvedBudgetUsd:25}
  await writeFile(dir+'balance-final.json',JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify(result))
}
main().catch(()=>{console.error('Read-only balance check failed');process.exitCode=1})
