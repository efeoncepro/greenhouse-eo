// Glitch · la cama bajo la noticia (sólo Glitch): bucle sin costura de la toma post-punk aprobada (2026-09-27).
// La toma es de ElevenLabs Music v2.5 (ai-music.ts --route el-bed --plan cama-postpunk, seed 7, 32 s) y va exacta a 150 BPM.
// El bucle son 12 compases desde el tiempo fuerte de 0,83 s (19,2 s); los primeros 30 ms mezclan el inicio con lo que
// sigue al final (potencia constante), así la vuelta no hace clic. Máster a −16 LUFS con master.sh.
//
//   node ai-generations/2026-09-26_branding-sonoro/motor/glitch-cama-bucle.mjs \
//     --in glitch-tema/cama/cama-postpunk-el.mp3 --out glitch-tema/final/glitch-cama-bucle.wav
import { execFileSync } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const RUN = join(HERE, '..')
const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const input = resolve(RUN, opt('--in', 'glitch-tema/cama/cama-postpunk-el.mp3'))
const output = resolve(RUN, opt('--out', 'glitch-tema/final/glitch-cama-bucle.wav'))

const SR = 48000
const BAR = 1.6 // 150 BPM
const START = Number(opt('--start', '0.83')) // tiempo fuerte medido en la toma
const BARS = Number(opt('--bars', '12'))
const XF = 0.03

const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', input, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4)
const s = Math.round(START * SR)
const L = Math.round(BARS * BAR * SR)
const xf = Math.round(XF * SR)

if ((s + L + xf) * 2 > x.length) throw new Error('la toma es más corta que el bucle pedido')

const out = new Float32Array(L * 2)

for (let i = 0; i < L; i++) {
  for (let c = 0; c < 2; c++) {
    const a = x[(s + i) * 2 + c]

    if (i < xf) {
      const t = (i / xf) * (Math.PI / 2)

      out[i * 2 + c] = a * Math.sin(t) + x[(s + L + i) * 2 + c] * Math.cos(t)
    } else {
      out[i * 2 + c] = a
    }
  }
}

const tmp = `${output}.raw.f32`

writeFileSync(tmp, Buffer.from(out.buffer))
const pre = `${output}.pre.wav`

execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', tmp, '-c:a', 'pcm_f32le', pre])
execFileSync('bash', [join(HERE, 'master.sh'), pre, output, '-16', '-1'], { stdio: 'inherit' })
rmSync(tmp)
rmSync(pre)
console.log(`bucle ${BARS} compases (${(L / SR).toFixed(3)} s) desde ${START} s → ${output}`)
