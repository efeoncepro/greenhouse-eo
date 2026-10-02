// Genera los fondos de Teams desde sus fichas con la función canónica de foto:prompt (construirPrompt): nunca a mano.
// node generar.mjs <id,id> [variante]  → out/teams-<id>-<variante>{a,b}.png (dos candidatos por fondo)
import { readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { construirPrompt } from '/Users/jreye/Documents/greenhouse-eo/scripts/foto/build-prompt.mjs'

const RAIZ = '/Users/jreye/Documents/greenhouse-eo'
const D = new URL('./', import.meta.url).pathname
const EXTRA = { cocina: ['arte/cocina.png', 'arte/nexa-mes.png'], ...JSON.parse(readFileSync(new URL('./fichas/_imagenes-m.json', import.meta.url), 'utf8')) }
const ids = process.argv[2].split(',')
const v = process.argv[3] ?? 'v1'

const correr = args => new Promise(res => {
  const c = spawn('pnpm', ['-s', 'ai:image', ...args], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  c.stdout.on('data', d => { log += d }); c.stderr.on('data', d => { log += d })
  c.on('close', code => res({ code, log }))
})

const tareas = []
for (const id of ids) {
  const ficha = JSON.parse(readFileSync(D + `fichas/teams-${id}.json`, 'utf8'))
  const r = construirPrompt(ficha)
  const pf = D + `fichas/teams-${id}.prompt.txt`
  writeFileSync(pf, r.prompt)
  const extra = (EXTRA[id] ?? [`arte/${id}.png`]).map(p => D + p)
  const imgs = [...r.imagenes.map(p => `${RAIZ}/${p}`), ...extra].flatMap(p => ['--image', p])
  for (const n of ['a', 'b']) {
    tareas.push(correr(['--model', 'gpt-image-2.5-sunburst', '--quality', 'xhigh', '--size', r.size, ...imgs, '--prompt-file', pf, '--out', D + `out/teams-${id}-${v}${n}.png`])
      .then(({ code, log }) => console.log(`[${id} ${v}${n}] exit ${code}${code ? '\n' + log.slice(-400) : ''}`)))
  }
}
await Promise.all(tareas)
