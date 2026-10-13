// Reel Sika · música (ElevenLabs Music v2.5 vía fal) y locución por línea (ElevenLabs TTS vía fal), cliente canónico.
//   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs ai-generations/2026-10-06_sika-reel/audio.ts --what music|vo --out <dir>
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { runFalModel } from '../../src/lib/ai/fal'

loadEnv({ path: join(process.cwd(), '.env.local') })

const opt = (k: string, d: string) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d }
const out = opt('--out', 'ai-generations/2026-10-06_sika-reel/out')
const what = opt('--what', 'music')
const fetchTo = async (url: string, file: string) => { const b = Buffer.from(await (await fetch(url)).arrayBuffer()); await writeFile(file, b); return b.length }

const LINES: [string, string][] = [
  ['l1', '¿Un sellador para cada lugar de la casa?'],
  ['l2', 'Baño. Cocina. Cancelería.'],
  ['l3', 'Uno solo.'],
  ['l4', 'Nuevo SikaSeal ciento setenta. Dos en uno: antihongos y de uso general.'],
  ['l5', 'Resistente al moho. Impermeable y flexible.'],
  ['l6', 'Innovar es hacerlo posible.'],
  ['l7', 'Innovar es hacerlo Sika.']
]

async function main() {
  await mkdir(out, { recursive: true })
  if (what === 'music') {
    const res = await runFalModel<{ audio: { url: string } }>({
      model: 'elevenlabs/music/v2.5', pollTimeoutMs: 400000,
      input: {
        composition_plan: { chunks: [{
          text: 'High-impact 25 second commercial bed for a premium construction brand. Tense heartbeat intro, three hard stabs, a big confident drop with driving live drums at the 7 second mark, building to a triumphant final hit.',
          duration_ms: 25000,
          positive_styles: ['cinematic trailer percussion', 'live acoustic drums', 'taiko hits', 'electric bass', 'brass stabs', 'driving', 'confident', 'premium commercial', '120 bpm'],
          negative_styles: ['vocals', 'chiptune', 'video game', '8-bit', 'synthwave', 'arcade', 'lead synth', 'lo-fi'],
          context_adherence: 'high'
        }] },
        seed: Number(opt('--seed', '11')), output_format: 'mp3_48000_192'
      }
    })
    const url = res.output?.audio?.url
    if (!url) throw new Error(JSON.stringify(res).slice(0, 400))
    console.log('music', await fetchTo(url, join(out, `music-${opt('--seed', '11')}.mp3`)))
    return
  }
  const voice = opt('--voice', 'George')
  await Promise.all(LINES.map(async ([id, text]) => {
    const res = await runFalModel<{ audio: { url: string } }>({
      model: opt('--model', 'fal-ai/elevenlabs/tts/multilingual-v2'), pollTimeoutMs: 200000,
      input: { text, voice, stability: 0.45, similarity_boost: 0.8, style: 0.35, speed: 1.0, language_code: 'es' }
    })
    const url = res.output?.audio?.url
    if (!url) throw new Error(id + ' ' + JSON.stringify(res).slice(0, 300))
    console.log(id, await fetchTo(url, join(out, `${id}.mp3`)))
  }))
}
main().catch(e => { console.error(e); process.exit(1) })
