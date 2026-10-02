// Etiqueta de voz del branding sonoro: «Empower your <Línea>.» con ElevenLabs v3 vía fal (cliente canónico).
// En fal, `voice: "Brian"` es la de fábrica (ID nPczCjzI2devNBz1zQrb). Fuera de fal, pedirla siempre por ID: hay 25 «Brian».
//   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs ai-generations/2026-09-26_branding-sonoro/motor/voz.ts \
//     --voices Brian,George,Sarah,Alice --text "Empower your Growth." --prefix growth
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { runFalModel } from '@/lib/ai/fal'

loadEnv({ path: join(process.cwd(), '.env.local') })

const args = process.argv.slice(2)
const opt = (n: string, f: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const voices = opt('--voices', 'Brian').split(',')
const text = opt('--text', 'Empower your Growth.')
const prefix = opt('--prefix', 'growth')
const stability = Number(opt('--stability', '0.5'))
const outDir = join(process.cwd(), 'ai-generations/2026-09-26_branding-sonoro/voz')

const main = async () => {
for (const voice of voices) {
  const res = await runFalModel<{ audio: { url: string } }>({
    model: 'fal-ai/elevenlabs/tts/eleven-v3',
    input: { text, voice, stability, language_code: 'en' }
  })
  const url = res.output?.audio?.url

  if (!url) throw new Error(`${voice}: sin audio (${JSON.stringify(res).slice(0, 300)})`)
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer())
  const file = join(outDir, `${prefix}-${voice.toLowerCase()}.mp3`)

  await writeFile(file, bytes)
  console.log(`${voice}: ${file} (${bytes.length} bytes)`)
}
}

main().catch(err => { console.error(err); process.exit(1) })
