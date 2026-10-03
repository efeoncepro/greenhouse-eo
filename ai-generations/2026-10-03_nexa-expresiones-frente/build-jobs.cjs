// Las 12 expresiones de Nexa, DE FRENTE (2026-10-03). Las de `5-expresiones/` se editaron desde el ancla en tres
// cuartos y comparten su giro de cabeza: puestas como referencia, la serie salía con la cara volteada al mismo lado.
// Se rehacen editando el ANCLA FRONTAL con la expresión como segunda imagen: de la segunda se copia sólo el gesto.
const fs = require('fs')
const path = require('path')
const R = path.resolve(__dirname, '../..')
const D = __dirname
const ANCLA = path.join(R, 'ai-generations/_identidad-nexa/1-anclas/nexa-ancla-1-rostro-frontal.png')
const EXPR = path.join(R, 'ai-generations/_identidad-nexa/5-expresiones')

// Marcadores físicos por expresión (el LEEME midió que seis de doce convergían a la misma media sonrisa).
const GESTO = {
  '01-carcajada': 'a real, open belly laugh: mouth wide open showing the upper teeth, eyes squeezed almost shut with laugh lines, cheeks raised',
  '02-risa-elegante': 'a light, elegant laugh: lips parted in a wide smile that SHOWS the upper teeth, eyes bright and slightly narrowed',
  '03-sorprendida': 'pleasant surprise: brows raised high, eyes wide open, lips parted in a small round "oh"',
  '04-esceptica': 'scepticism: ONE brow arched higher than the other, the mouth pulled slightly to one side, lips closed',
  '05-pensativa': 'thoughtful: lips closed and relaxed, brows slightly drawn together, the eyes looking slightly up and to the side, as if working something out',
  '06-neutra-reposo': 'neutral at rest: mouth closed and relaxed with NO smile, brows relaxed, a calm direct look',
  '07-preocupada': 'concern: the inner ends of the brows raised and drawn together, lips pressed lightly, a worried look',
  '08-conviccion': 'conviction: mouth closed and firm with NO smile, chin level, a steady, intense direct look',
  '09-escucha-empatica': 'empathetic listening: mouth closed and soft with NO smile, brows slightly raised in the centre, warm attentive eyes',
  '10-curiosa': 'curiosity: brows lifted slightly, eyes alert and a little wider, lips closed with the faintest lift at one corner',
  '11-complicidad': 'complicity: a closed-lip knowing smile lifted more on one side, one eye very slightly narrowed',
  '12-mirada-lateral': 'a sideways glance: the head stays facing the camera while ONLY the eyes look toward the edge of the frame, lips closed and neutral'
}

const jobs = []
for (const [k, gesto] of Object.entries(GESTO)) {
  const fuente = path.join(EXPR, `nexa-expr-${k}.png`)
  const pf = path.join(D, 'prompts', `${k}.txt`)
  fs.writeFileSync(pf,
    'Image 1 is Nexa photographed with her head FACING THE CAMERA SQUARELY. Image 2 is the same woman showing a facial expression, ' +
    'but with her head turned to one side — that turn must NOT carry over. Produce image 1 again: same woman, same framing, same ' +
    'head angle facing the camera squarely (both eyes, both brows and both cheeks visible, the nose bridge not crossing the far cheek), ' +
    `same hair, same grey t-shirt, same soft window light with fill and same background. Change ONLY her facial expression: ${gesto}. ` +
    'Take the expression from image 2 — eyes, brows, mouth and cheeks — never its head angle. Keep her identity exactly: almond eyes ' +
    'with the winged upper lash line, thick arched brows, straight nose with a slightly upturned tip, full lips, the small mole near ' +
    'the cheekbone. Skin texture only from fine irregular pores and fine facial hair, even healthy tone, never punitive. No text.')
  jobs.push([ANCLA, pf, path.join(D, 'out', `nexa-expr-${k}-frente.png`), '2048x2560', fuente].join('|'))
}
console.log(jobs.join('\n'))
