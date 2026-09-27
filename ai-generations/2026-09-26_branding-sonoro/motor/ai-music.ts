// Re-grabación de la maqueta rock con modelos de música vía fal (cliente canónico).
//   sa: Stable Audio 2.5 audio-to-audio — reinterpreta la maqueta completa conservando su tiempo.
//   el: ElevenLabs Music v2.5 — plan por tramos; cada tramo usa su ventana de la maqueta como referencia de audio.
//
//   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs <este archivo> --route sa --in rock/maqueta-larga.mp3 --strength 0.55 --tag sa55
//   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs <este archivo> --route el --plan larga --in rock/maqueta-larga.mp3 --ref high --tag elhigh
import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { runFalModel, uploadFalFile } from '@/lib/ai/fal'

loadEnv({ path: join(process.cwd(), '.env.local') })

const RUN = join(process.cwd(), 'ai-generations/2026-09-26_branding-sonoro')
const args = process.argv.slice(2)
const opt = (n: string, f: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const route = opt('--route', 'sa')
const input = join(RUN, opt('--in', 'rock/maqueta-larga.mp3'))
const tag = opt('--tag', route)
const piece = opt('--plan', 'larga')

const STYLE = [
  'modern alternative rock band, live studio recording',
  'tight palm-muted distorted electric guitars, double-tracked left and right',
  'punchy live drums, driving bass guitar',
  '120 BPM, A major, confident, energetic, big and clean mix'
]
const NEGATIVE = ['vocals', 'singing', 'lyrics', 'orchestra', 'lo-fi', 'metal screaming']

// Tramos de la pieza larga (ms), alineados con la maqueta. El texto dirige; la referencia pone riff y energía.
const PLANS: Record<string, Array<{ name: string; from: number; to: number; text: string; styles?: string[] }>> = {
  larga: [
    { name: 'Intro', from: 0, to: 4000, text: '[Intro] {solo electric guitar: three short palm-muted stabs on E, then silence, twice — a question with no answer}' },
    { name: 'Verse', from: 4000, to: 12000, text: '[Verse] {full band enters: riff of three palm-muted stabs on E followed by a big open chord hit on the downbeat}' },
    { name: 'Verse 2', from: 12000, to: 20000, text: '[Verse 2] {same riff, more drive, crash cymbal, a high guitar note A on every chord hit}' },
    { name: 'Chorus', from: 20000, to: 28000, text: '[Chorus] {half-time, heavier, crash on every bar, same three stabs and answer hit}' },
    { name: 'Build', from: 28000, to: 32000, text: '[Build] {sixteenth-note palm-muted guitars and snare roll rising}' },
    { name: 'Outro', from: 32000, to: 37000, text: '[Outro]\n{the whole band stops dead for half a second}\n{then exactly three short palm-muted guitar stabs on E}\n{then one huge A major power chord hit with kick and crash, ringing out until the very end}', styles: ['big final chord hit', 'ringing sustain'] }
  ]
}

const fetchTo = async (url: string, file: string) => {
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer())

  await writeFile(file, bytes)

  return bytes.length
}

const main = async () => {
  const up = await uploadFalFile({ bytes: await readFile(input), fileName: basename(input), contentType: 'audio/mpeg' })

  if (route === 'sa') {
    const strength = Number(opt('--strength', '0.55'))
    const res = await runFalModel<{ audio: { url: string } }>({
      model: 'fal-ai/stable-audio-25/audio-to-audio',
      pollTimeoutMs: 400000,
      input: { audio_url: up.url, prompt: (piece.startsWith('glitch') ? [...STYLE, 'glitchy electronic stutter edits, bitcrushed buffer repeats, digital artifacts as a stylistic effect'] : STYLE).join(', '), strength, num_inference_steps: 8, guidance_scale: Number(opt('--guidance', '1')), seed: 42 }
    })
    const url = res.output?.audio?.url

    if (!url) throw new Error(`sin audio: ${JSON.stringify(res).slice(0, 400)}`)
    const file = join(RUN, `rock/ai/${piece}-${tag}.${url.split('.').pop()?.split('?')[0] ?? 'wav'}`)

    console.log(`sa strength=${strength}: ${file} (${await fetchTo(url, file)} bytes)`)
  } else {
    const strength = opt('--ref', 'high')
    const chunks = PLANS[piece].map((c, k) => ({
      text: c.text,
      duration_ms: c.to - c.from,
      positive_styles: k === 0 ? STYLE : ['same band, same sound', ...(c.styles ?? [])],
      negative_styles: NEGATIVE,
      context_adherence: 'high',
      audio_reference: { audio_url: up.url, strength, start_ms: c.from, end_ms: Math.max(c.to, c.from + 3000) }
    }))
    const res = await runFalModel<{ audio: { url: string } }>({
      model: 'elevenlabs/music/v2.5',
      pollTimeoutMs: 400000,
      input: { composition_plan: { chunks }, seed: 7, output_format: 'mp3_48000_192' }
    })
    const url = res.output?.audio?.url

    if (!url) throw new Error(`sin audio: ${JSON.stringify(res).slice(0, 400)}`)
    const file = join(RUN, `rock/ai/${piece}-${tag}.mp3`)

    console.log(`el ref=${strength}: ${file} (${await fetchTo(url, file)} bytes)`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
