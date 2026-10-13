import { writeFileSync } from 'node:fs'

import { applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { query, closeGreenhousePostgres } from '../../src/lib/db'

async function main(){
 applyGreenhousePostgresProfile('ops')
 const migrations=await query('SELECT name,run_on FROM public.pgmigrations WHERE name LIKE $1 OR name LIKE $2 OR name LIKE $3 ORDER BY run_on',['%task-2025%','%task-2033%','%insights-outputs-live-identity%'])
 const capabilities=await query("SELECT capability_key FROM greenhouse_core.capabilities_registry WHERE capability_key LIKE 'commercial.quoter.%' OR capability_key = 'marketing_studio.catalog.manage'")
 const manifests=await query("SELECT release_id,target_sha,state FROM greenhouse_sync.release_manifests WHERE target_branch='main' AND state IN ('preflight','ready','deploying','verifying')")
 const receipt={migrations,capabilities,activeManifests:manifests,readAt:new Date().toISOString()}

 writeFileSync('.captures/meta-capi-diagnostic-2026-10-13/full-develop-database-readback.json',JSON.stringify(receipt,null,2)+'\n')
 console.log(JSON.stringify(receipt))
 await closeGreenhousePostgres()
}

main().catch(async e=>{console.error('release_readback_failed',e.code||'unknown');await closeGreenhousePostgres();process.exitCode=1})
