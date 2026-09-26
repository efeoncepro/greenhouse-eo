import {config} from 'dotenv'
import {readFile,writeFile} from 'node:fs/promises'
import {uploadFalFile} from '@/lib/ai/fal'
config({path:'.env.local',quiet:true})
async function main(){
 const root='ai-generations/2026-09-23_cmp003-sky-video/seedance/'
 const r=await uploadFalFile({bytes:new Uint8Array(await readFile(root+'v6/sky-v6-finished-silent.mp4')),fileName:'sky-v6-approved-master-silent.mp4',contentType:'video/mp4'})
 await writeFile(root+'v7/master-upload.json',JSON.stringify(r,null,2))
 console.log('Master uploaded for authorized Seedance editing.')
}
main().catch(()=>{console.error('Master upload failed');process.exitCode=1})
