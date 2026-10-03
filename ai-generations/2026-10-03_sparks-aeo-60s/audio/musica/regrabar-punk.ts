// Cama punk del video Sparks × AEO: regrabación con Stable Audio 2.5 audio-to-audio (USD 0,20 por pieza) sobre la pieza
// larga de ENERGÍA oficial (AXIS sonic v1, sha256 1b23b0a1…), reordenada y acelerada a 160 BPM (ref-punk-160bpm-42s.wav).
// Decisión del operador (2026-10-03): «ponle un ritmo más punk, pásale el sonic brand como referencia».
//   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs <este archivo> --strength 0.75 --tag sa75
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { runFalModel, uploadFalFile } from '@/lib/ai/fal'

loadEnv({ path: join(process.cwd(), '.env.local') })

const DIR = join(process.cwd(), 'ai-generations/2026-10-03_sparks-aeo-60s/audio/musica')
const args = process.argv.slice(2)
const opt = (n: string, f: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const strength = Number(opt('--strength', '0.75'))
const tag = opt('--tag', `sa${Math.round(strength * 100)}`)

const PROMPT = [
  'fast punk rock band, live studio recording, raw and energetic',
  'driving down-picked eighth-note distorted electric guitars, double-tracked left and right, palm-muted stabs',
  'fast punchy live drums with snare on two and four and crash accents, driving overdriven bass guitar',
  '160 BPM, A major, rebellious, confident, big clean modern mix, real instruments',
  'no vocals, no singing, no chiptune, no video game sounds, no synth'
].join(', ')

const main = async () => {
  const input = join(DIR, 'ref-punk-160bpm-42s.wav')
  const up = await uploadFalFile({ bytes: await readFile(input), fileName: 'ref-punk-160bpm-42s.wav', contentType: 'audio/wav' })
  const res = await runFalModel<{ audio: { url: string } }>({
    model: 'fal-ai/stable-audio-25/audio-to-audio',
    pollTimeoutMs: 400000,
    input: { audio_url: up.url, prompt: PROMPT, strength, num_inference_steps: 8, guidance_scale: 1, seed: 42 }
  })
  const url = res.output?.audio?.url

  if (!url) throw new Error(`sin audio: ${JSON.stringify(res).slice(0, 400)}`)
  const file = join(DIR, `cama-punk-${tag}.${url.split('.').pop()?.split('?')[0] ?? 'wav'}`)
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer())

  await writeFile(file, bytes)
  console.log(`strength=${strength}: ${file} (${bytes.length} bytes)`)
}

main().catch(err => { console.error(err); process.exit(1) })
