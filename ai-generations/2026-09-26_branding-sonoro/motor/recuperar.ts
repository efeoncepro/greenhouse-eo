// Recupera un trabajo de fal que excedió la espera local (el trabajo sigue en fal; no se vuelve a cobrar).
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { awaitFalRequest } from '@/lib/ai/fal'
loadEnv({ path: join(process.cwd(), '.env.local') })
const [model, requestId, out] = process.argv.slice(2)
const main = async () => {
  const res = await awaitFalRequest<{ audio: { url: string } }>({ model, requestId, pollTimeoutMs: 300000 })
  const url = res.output?.audio?.url
  if (!url) throw new Error(JSON.stringify(res).slice(0, 300))
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer())
  await writeFile(join(process.cwd(), out), bytes)
  console.log(`${out} (${bytes.length} bytes)`)
}
main().catch(e => { console.error(e); process.exit(1) })
