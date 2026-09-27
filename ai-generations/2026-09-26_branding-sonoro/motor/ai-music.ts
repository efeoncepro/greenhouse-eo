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
const outDir = join(RUN, opt('--outdir', 'rock/ai'))
const tag = opt('--tag', route)
const piece = opt('--plan', 'larga')

const STYLE = [
  'modern alternative rock band, live studio recording',
  'tight palm-muted distorted electric guitars, double-tracked left and right',
  'punchy live drums, driving bass guitar',
  '120 BPM, A major, confident, energetic, big and clean mix'
]
const NEGATIVE = ['vocals', 'singing', 'lyrics', 'orchestra', 'lo-fi', 'metal screaming']

// Música de Glitch (ronda 7, sólo Glitch): dos registros del mismo ADN. Sin nostalgia: nada de chiptune, synthwave ni lo-fi.
const GLITCH_STYLES: Record<string, string[]> = {
  // Ronda 9 (el tema): producción real, sin sonidos de videojuego. A = experto y oscuro · B = irreverente y desafiante.
  'tema-a': [
    'dark cinematic electronic score, tense newsroom energy, heavy distorted analog synth bass, industrial processed percussion',
    'precise, confident, sophisticated and restrained, tech-thriller tension, wide and deep modern mix',
    '150 BPM half-time feel, A major tonality, no vocals, no chiptune, no video game sounds, no retro synthwave'
  ],
  // La cama bajo la voz: el mismo estilo que el tema B, en segundo plano.
  'cama-b': [
    'background bed for spoken news narration, same irreverent big beat style but restrained and minimal',
    'filtered laid-back breakbeat drums, dirty overdriven bass groove, subtle texture, no lead melody, no chords in the midrange, leaves room for a voice',
    '150 BPM half-time feel, A major, steady and loopable, no vocals, no chiptune, no video game sounds'
  ],
  'tema-b': [
    'irreverent big beat, live breakbeat drums with swagger, dirty overdriven bass guitar riff, gritty distorted electric guitar stabs',
    'provocative, cocky and confident attitude, raw and punchy, modern heavy mix with real instruments',
    '150 BPM, A major, no vocals, no chiptune, no video game sounds, no retro synthwave'
  ],
  pulso: [
    'minimal hypnotic electronic music, precise contemporary production in the style of Four Tet and Jon Hopkins',
    'soft round four-on-the-floor kick, plucked FM synth arpeggio, warm analog pad, crisp tuned glitchy percussion',
    'subtle digital stutter edits, 120 BPM, A major, focused, intelligent, modern 2026 sound, clean wide mix, no vocals'
  ],
  club: [
    'modern jersey club, bouncy broken kick pattern with stuttering kick rolls, crisp layered claps, deep 808 bass',
    'chopped synth stabs, short tuned chirps on the off-beats, glitchy buffer-repeat edits as a stylistic effect',
    '144 BPM, A major, energetic, playful, social media ready, contemporary 2026 production, punchy clean mix, no vocals'
  ]
}

// Ronda 11b · la cama bajo la noticia, SIN maqueta (la maqueta sintetizada y el recorte de medios la volvieron arcade:
// medios 13 % contra 45 % de la intro aprobada). Generada desde texto, instrumentos reales, cuerpo en los medios.
const BED_STYLES: Record<string, { styles: string[]; text: string }> = {
  'cama-postpunk': {
    styles: ['instrumental post-punk groove, live band in a room', 'overdriven bass guitar riff with swagger, tight dry live drums, one scratchy muted electric guitar', 'cocky, irreverent, restrained, leaves space for a talking voice', 'A major, 150 BPM'],
    text: '[Groove] {bass guitar and dry drums hold a cocky, steady groove; a muted guitar scratches on the off-beats; no melody, no build, same energy throughout}'
  },
  'cama-hiphop': {
    styles: ['instrumental hip-hop beat for a news podcast, live-played', 'dusty punchy boom bap drums, warm electric bass guitar, muted Rhodes chords, subtle vinyl-free clean mix', 'confident, smart, a bit defiant, unobtrusive under a voice', 'A major, 75 BPM half-time'],
    text: '[Beat] {laid-back head-nodding beat with bass and sparse Rhodes stabs; steady, no melody hook, no build, same energy throughout}'
  },
  'cama-tension': {
    styles: ['modern newsroom underscore, organic and tense', 'muted palm-picked electric bass pulse in eighths, brushed snare and rim clicks, soft felt piano notes, subtle tape texture', 'expert, focused, slightly dark, unobtrusive under a voice', 'A major, 150 BPM'],
    text: '[Underscore] {steady pulse under spoken narration; minimal, no melody hook, no build, same energy throughout}'
  }
}
const BED_NEGATIVE = ['vocals', 'singing', 'chiptune', 'video game', '8-bit', 'synthwave', 'arcade', 'lead synth', 'EDM drop']

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
  if (route === 'el-bed' || route === 'sa-bed') {
    const bed = BED_STYLES[piece]
    const seconds = Number(opt('--seconds', '32'))

    if (!bed) throw new Error(`cama desconocida: ${piece}`)
    const res = route === 'el-bed'
      ? await runFalModel<{ audio: { url: string } }>({
          model: 'elevenlabs/music/v2.5',
          pollTimeoutMs: 400000,
          input: { composition_plan: { chunks: [{ text: bed.text, duration_ms: seconds * 1000, positive_styles: bed.styles, negative_styles: BED_NEGATIVE, context_adherence: 'high' }] }, seed: Number(opt('--seed', '7')), output_format: 'mp3_48000_192' }
        })
      : await runFalModel<{ audio: { url: string } }>({
          model: 'fal-ai/stable-audio-25/text-to-audio',
          pollTimeoutMs: 400000,
          input: { prompt: [...bed.styles, 'no vocals, no chiptune, no video game sounds'].join(', '), seconds_total: seconds, num_inference_steps: 8, guidance_scale: 1, seed: Number(opt('--seed', '42')) }
        })
    const url = res.output?.audio?.url

    if (!url) throw new Error(`sin audio: ${JSON.stringify(res).slice(0, 400)}`)
    const file = join(outDir, `${piece}-${tag}.${url.split('.').pop()?.split('?')[0] ?? 'mp3'}`)

    console.log(`${route}: ${file} (${await fetchTo(url, file)} bytes)`)

    return
  }

  const up = await uploadFalFile({ bytes: await readFile(input), fileName: basename(input), contentType: input.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg' })

  if (route === 'sa') {
    const strength = Number(opt('--strength', '0.55'))
    const res = await runFalModel<{ audio: { url: string } }>({
      model: 'fal-ai/stable-audio-25/audio-to-audio',
      pollTimeoutMs: 400000,
      input: { audio_url: up.url, prompt: (GLITCH_STYLES[piece] ?? GLITCH_STYLES[piece.split('-')[0]] ?? (piece.startsWith('glitch') ? [...STYLE, 'glitchy electronic stutter edits, bitcrushed buffer repeats, digital artifacts as a stylistic effect'] : STYLE)).join(', '), strength, num_inference_steps: 8, guidance_scale: Number(opt('--guidance', '1')), seed: 42 }
    })
    const url = res.output?.audio?.url

    if (!url) throw new Error(`sin audio: ${JSON.stringify(res).slice(0, 400)}`)
    const file = join(outDir, `${piece}-${tag}.${url.split('.').pop()?.split('?')[0] ?? 'wav'}`)

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
