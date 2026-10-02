import { join } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { getFalEndpointPricing, getFalAccountBalances } from '@/lib/ai/fal'
loadEnv({ path: join(process.cwd(), '.env.local') })
const main = async () => {
  for (const s of process.argv.slice(2)) console.log(s, JSON.stringify(await getFalEndpointPricing(s)))
  console.log('saldos', JSON.stringify((await getFalAccountBalances()).map(b => ({ ...b }))))
}
main().catch(e => { console.error(e); process.exit(1) })
