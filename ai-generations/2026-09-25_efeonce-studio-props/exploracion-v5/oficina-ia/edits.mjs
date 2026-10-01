// Correcciones por EDICIÓN de las fotos generadas (editar conserva): sólo el delta, todo lo demás idéntico.
// node edits.mjs [id,id]
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const D = dirname(fileURLToPath(import.meta.url))
const KEEP = 'Change ONLY what is described. Keep everything else exactly as it is: framing, camera, light, materials, people, colors, every other word, ring, arc and sphere. Documentary photograph, no new text anywhere.'

const EDITS = [
  { id: 'pasillo', img: ['out/pasillo.png'], p: 'Remove the small line of text printed low on the right part of the navy wall panel (it reads «v07 · aprobada por dirección de arte»). Where it was, the navy panel continues plain, with the same matte texture and the same faint bottle silhouettes behind.' },
  { id: 'muro-voz', img: ['out/muro-voz.png'], p: 'Remove the small line of text painted under the big word «Siempre.» (it reads «Muro de voz: una pregunta y su respuesta, pintadas. Una por espacio.»). Where it was, the light plaster wall continues plain with the same roller texture.' },
  { id: 'sala', img: ['out/sala.png'], p: 'In the small navy line «En sesión hasta las 16:00 .» on the frosted glass, delete the space before the final period so it reads «En sesión hasta las 16:00.» with the small period sitting right after the last zero, like the period after «Sala 02».' },
  { id: 'puesto', img: ['out/puesto.png', 'arte/logo-oficial.png'], p: 'Image 2 is the official Efeonce logo. On the employee badge in its clear sleeve, replace the small navy «efeonce» logo at the bottom of the card with exactly the logo in image 2: same letters, same symbol in place of the second letter, same proportions, same navy, printed flat on the card at the same size and position, following the card perspective. Do not redraw or restyle the logo; nothing else on the badge changes (name «Julio Reyes.», title «Managing & GTM Director», photo).' }
]

const only = process.argv[2]?.split(',')
for (const e of EDITS.filter(e => !only || only.includes(e.id))) {
  const pf = join(D, 'prompts-v2', `${e.id}.txt`)
  writeFileSync(pf, `${e.p}\n\n${KEEP}`)
  await new Promise(res => {
    const c = spawn('pnpm', ['ai:image', '--prompt-file', pf, ...e.img.flatMap(i => ['--image', join(D, i)]), '--model', 'gpt-image-2.5-sunburst', '--quality', 'xhigh', '--size', '1536x1024', '--out', join(D, 'out-v2', `${e.id}.png`)], { cwd: '/Users/jreye/Documents/greenhouse-eo', stdio: ['ignore', 'pipe', 'pipe'] })
    let log = ''
    c.stdout.on('data', d => { log += d }); c.stderr.on('data', d => { log += d })
    c.on('close', code => { console.log(`[${e.id}] exit ${code}${code ? `\n${log.slice(-500)}` : ''}`); res() })
  })
}
