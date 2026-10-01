// La oficina con IA generativa (2026-09-25). Mismo método que el merch: el arte plano de la lámina 4.3 es la
// composición exacta de cada aplicación y el modelo sólo pone el espacio real, el material y la luz.
// Lenguaje fotográfico de Efeonce: registro documental, luz de día neutro-cálida (~5200 K) con carácter, materiales
// reales y limpios, nadie mira al lente, sin texto ni marcas inventadas.
// node items.mjs [id,id]  → corre pnpm ai:image por ítem (Sunburst xhigh), 3 en paralelo.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const D = dirname(fileURLToPath(import.meta.url))
const A = f => join(D, 'arte', `${f}.png`)

const BASE = `Keep every graphic element exactly as drawn in the artwork image: the same words with the same spelling, the small solid sphere placed right after each word (it is a period, not a letter), the thin ring and the arc with a dot at its tip, and the Efeonce logo. Do not redraw, restyle, translate, move or add any text, logo, icon or mark; no extra words anywhere, no signage that is not in the artwork. Colors stay as in the artwork: deep navy #001A33, teal #36C8BF, white. Documentary architectural photograph of a real, clean, well-kept contemporary office in Santiago de Chile: natural daylight around 5200 K with one clear direction and soft fill, highlights never blown, shadows neutral (never blue), real materials (concrete, oak, glass, painted plaster), 1–2 small signs of use and no clutter, no dirt. Nobody looks at the lens; any person is incidental, turned away or out of focus. No third-party brands.`

export const ITEMS = [
  { id: 'recepcion', size: '1536x1024', img: [A('o_muro')], p: 'Image 1 is the final artwork of the reception mural, a large-format matte print that covers a 4 m wide wall. Photograph the real reception: the mural printed edge to edge on the wall, seen from the entrance at eye level with a 35 mm lens, a low oak bench and a plant in front of it, polished concrete floor catching a soft reflection of the mural. Morning light enters from a side window.' },
  { id: 'sala', size: '1536x1024', img: [A('e_sala')], p: 'Image 1 is the final artwork of a meeting room glass wall: frosted vinyl over clear glass, with a clear circular window cut out of the vinyl, the navy room name and status printed on the frosted part and the teal ring with its arc around the circle. Photograph the real glass wall from the corridor at eye level: through the clear circle a woman in a cream sweater is listening on a call inside the room, slightly out of focus; the frosted vinyl diffuses the room behind. The printed graphics stay crisp on the glass.' },
  { id: 'pasillo', size: '1536x1024', img: [A('e_pasillo')], p: 'Image 1 is the final artwork of a corridor work wall, printed on a matte panel 3 m wide. Photograph the real corridor: the printed wall on the left seen at an oblique angle with a 28 mm lens, the corridor receding with clean concrete and oak doors, warm afternoon light raking along the wall so the panel edges cast a thin shadow.' },
  { id: 'pizarra', size: '1536x1024', img: [A('e_pizarra')], p: 'Image 1 is the final artwork of a whiteboard wall panel with the printed question, the printed ring and the arc ending in a teal magnetic sphere. Photograph the real whiteboard panel mounted on a wall in a project room, seen at eye level with a 50 mm lens: glossy enamel surface with a soft sheen, a real round teal magnet sitting exactly where the sphere is, a navy marker on the tray, a few handwritten words in blue marker inside the ring (small, not legible).' },
  { id: 'estado-sala', size: '1536x1024', img: [A('of_tablet')], p: 'Image 1 is the final artwork of a meeting room door with a wall-mounted tablet that shows the room status screen. Photograph the real door area: oak door, painted plaster wall, a slim tablet mounted at eye level beside the frame showing exactly that screen, the screen glowing softly with a faint reflection; 50 mm lens at a slight angle; soft daylight from the corridor.' },
  { id: 'muro-voz', size: '1536x1024', img: [A('of_voz')], p: 'Image 1 is the final artwork of a voice wall: the question and its answer painted directly on a light plaster wall. Photograph the real painted wall in an open workspace: flat matte wall paint with a subtle roller texture visible up close, the painted letters with crisp hand-cut stencil edges, an oak desk and a chair in the lower part of the frame, out of focus. Warm daylight from a high window.' },
  { id: 'cocina', size: '1536x1024', img: [A('of_cocina')], p: 'Image 1 is the final artwork of the kitchen wall: the question and answer painted on the wall and the shelf of Efeonce mugs below it. Photograph the real office kitchen: the painted phrase on the wall, a slim oak shelf with the six glazed ceramic mugs exactly as drawn (white and navy, each with its word), a counter below with a coffee machine partly in frame, morning light from the side making soft highlights on the glaze.' },
  { id: 'puesto', size: '1536x1024', img: [A('of_puesto')], p: 'Image 1 is the final artwork of a welcome desk kit: a navy notebook, an employee badge, round stickers and a cotton tote bag. Photograph them on a real oak desk seen from a 45° angle with a 50 mm lens: soft-touch notebook cover, the badge in a clear sleeve, vinyl stickers with a slight sheen, a natural cotton tote with the printed word; a laptop edge and a coffee cup out of focus at the side. Afternoon window light.' },
  { id: 'cabinas', size: '1536x1024', img: [A('of_cabina')], p: 'Image 1 is the final artwork of the status signs of two phone booths (free and on air) above their doors. Photograph two real acoustic phone booths side by side in an open office: felt-lined booths with glass doors, the two navy signs mounted above each door exactly as drawn, one booth empty and one with a person inside seen from behind through the glass, out of focus. Even daylight, 35 mm lens at eye level.' }
]

const only = process.argv[2]?.split(',')
const todo = ITEMS.filter(item => !only || only.includes(item.id))
let idx = 0

const run = item => new Promise(resolve => {
  const promptFile = join(D, 'prompts', `${item.id}.txt`)

  writeFileSync(promptFile, `${item.p}\n\n${BASE}`)

  const args = ['ai:image', '--prompt-file', promptFile, ...item.img.flatMap(i => ['--image', i]), '--model', 'gpt-image-2.5-sunburst', '--quality', 'xhigh', '--size', item.size, '--out', join(D, 'out', `${item.id}.png`)]
  const child = spawn('pnpm', args, { cwd: '/Users/jreye/Documents/greenhouse-eo', stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''

  child.stdout.on('data', d => { log += d })
  child.stderr.on('data', d => { log += d })
  child.on('close', code => {
    console.log(`[${item.id}] exit ${code}${code ? `\n${log.slice(-600)}` : ''}`)
    resolve()
  })
})

const next = async () => { while (idx < todo.length) await run(todo[idx++]) }

await Promise.all([next(), next(), next()])
