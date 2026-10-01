// Maquetas de dirección de la iconografía de La órbita (2026-09-26). Método de la lámina 4.9 «Oficina en foto»:
// el arte plano (arte/) sale del paquete de AXIS y es la referencia exacta; GPT Image 2.5 Sunburst xhigh sólo pone
// espacio, material y luz. Registro documental: luz de día con dirección, materiales reales, nadie mira al lente.
// Toda salida se rotula «maqueta de dirección». node items.mjs [id,id]
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const D = dirname(fileURLToPath(import.meta.url))
const A = f => join(D, 'arte', `${f}.png`)
const BASE = c => `Keep every graphic element exactly as drawn in the artwork image: the same words with the same spelling, the small solid sphere placed right after a word (it is a period, not a letter), every icon with its exact shape and its solid colored dot, the thin rings and arcs, and the Efeonce logo. Do not redraw, restyle, translate, move or add any text, logo, icon or mark; no extra words anywhere, no signage that is not in the artwork. Colors stay as in the artwork: deep navy #001A33, white and ${c}. Documentary photograph of a real place in Santiago de Chile, contemporary and well kept: one clear light direction with soft fill, highlights never blown, shadows neutral (never blue), real materials, 1–2 small signs of use and no clutter. Current-generation hardware only (thin bezel-less screens, slim laptops); no paper stacks, books or old monitors unless stated. Nobody looks at the lens; any person is incidental, turned away, cropped or out of focus. No third-party brands or logos anywhere.`
const TEAL = 'teal #36C8BF', OR = 'orange #FF6500'

export const ITEMS = [
  { id: 'area', size: '1536x1024', c: TEAL, img: [A('area')], p: 'Image 1 is the final artwork of the Growth team area wall: the navy wall painted edge to edge, the icon and the words cut from matte white vinyl, and the teal dot as a real raised round disc of painted wood. Photograph the real open-plan office in front of it: the wall seen at a strong oblique angle from low with a 24 mm lens, two people working at oak desks in front of it out of focus, one person walking past with slight motion blur, late-afternoon sunlight raking across the wall so the vinyl edges and the teal disc catch the light and cast thin shadows. Polished concrete floor.' },
  { id: 'informe', size: '1536x1024', c: TEAL, img: [A('informe')], p: 'Image 1 is an open printed report: a two-page A4 spread, the left page navy with a large icon, the right page off-white paper. Photograph the real printed report lying open on an oak meeting table, seen from a 35° angle with a 50 mm lens: uncoated matte paper with a gentle curl near the spine, a hand resting a pen near the right page, a ceramic coffee cup and a phone face down partly in frame, strong window light from the left casting a long soft shadow of the pen across the page.' },
  { id: 'stickers', size: '1536x1024', c: OR, img: [A('stickers')], p: 'Image 1 is a sheet of six round die-cut vinyl stickers. Photograph a closed silver aluminium laptop with no logo on its lid, on a designer desk in a creative studio, with these six stickers applied on the lid at slightly different angles: glossy vinyl, thin white die-cut border, each catching a small specular highlight. A hand with a stylus and a drawing tablet at the edge of the frame, color swatch cards out of focus. Soft side light from a big window, 50 mm lens from a high angle.' },
  { id: 'escenario', size: '1536x1024', c: OR, img: [A('escenario')], p: 'Image 1 is exactly the content shown on the large LED wall of a conference stage. Photograph the real stage from the middle of the audience: the wide LED wall displays exactly this image, bright and crisp; a speaker in dark clothes stands on the left of the stage in silhouette, mid-gesture, turned toward the screen; the heads and shoulders of the audience out of focus in the foreground; dark auditorium, the navy screen glow spilling onto the stage floor. 35 mm lens. The screen content is the artwork itself, never a generic slide.' },
  { id: 'story', size: '1024x1536', c: OR, img: [A('story')], p: 'Image 1 is exactly the vertical story shown full screen on a smartphone. Photograph a hand holding a modern bezel-less smartphone with no visible brand, on a café terrace in Santiago at golden hour: the phone screen shows exactly this story edge to edge, bright and legible; shallow depth of field, warm street bokeh behind, a coffee cup blurred on the table. 50 mm lens. The screen content is the artwork itself, never a generic app interface.' },
  { id: 'tote', size: '1536x1024', c: OR, img: [A('tote')], p: 'Image 1 is the screen-print artwork of a navy cotton canvas tote bag: the white camera with its orange dot printed large in the center. Photograph a person walking along a sunlit street in Santiago carrying the navy tote over the shoulder, seen from the side and slightly behind, cropped at the shoulder so the face is not visible; the print large and centered on the bag with real screen-printing ink texture on the woven canvas, the fabric slightly folded by the weight. Hard midday light with a crisp shadow on the pavement, 50 mm lens.' }
]

const only = process.argv[2]?.split(',')
const todo = ITEMS.filter(item => !only || only.includes(item.id))
let idx = 0
const run = item => new Promise(resolve => {
  const promptFile = join(D, 'prompts', `${item.id}.txt`)
  writeFileSync(promptFile, `${item.p}\n\n${BASE(item.c)}`)
  const args = ['ai:image', '--prompt-file', promptFile, ...item.img.flatMap(i => ['--image', i]), '--model', 'gpt-image-2.5-sunburst', '--quality', 'xhigh', '--size', item.size, '--out', join(D, 'out', `${item.id}.png`)]
  const child = spawn('pnpm', args, { cwd: '/Users/jreye/Documents/greenhouse-eo', stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  child.stdout.on('data', d => { log += d })
  child.stderr.on('data', d => { log += d })
  child.on('close', code => { console.log(`[${item.id}] exit ${code}${code ? `\n${log.slice(-800)}` : ''}`); resolve() })
})
const next = async () => { while (idx < todo.length) await run(todo[idx++]) }
await Promise.all([next(), next(), next()])
