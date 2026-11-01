// Genera las 5 fichas del hero (misma toma, cambia persona, línea, prenda y color de pantalla).
import { writeFileSync } from 'node:fs'
const base = (p) => `SCENE (Efeonce studio, Santiago, evening): ${p.name} stands centred in the frame, framed from the waist up, the body square to the camera and the head almost frontal (both eyes, both eyebrows and both ears visible), looking straight into the lens with ${p.gesto}, caught at the instant ${p.pron} turns the tablet toward the viewer to show a result that just came in. With both hands ${p.pron} holds a current-generation tablet (thin aluminium unibody, minimal bezels, no third-party logos) at chest height, tilted slightly toward the camera so its screen turns toward the viewer; the screen shows an out-of-focus analytics dashboard, unreadable because it is out of focus, and emits a soft ${p.colorName} (${p.hex}) glow that lights the fingers and the underside of the chin. ${p.wardrobe} The backdrop is a seamless matte charcoal-grey studio paper, plain and evenly dark, with no panels, no windows, no lamps, no shelves and no props: nothing printed, nothing analog, nothing in the background even out of focus. Key light: hard and low from the far left, raking across the face, one side in open shadow softened by a gentle fill; a second light low behind ${p.obj}, gelled azure blue (#0375DB), draws a thin azure rim on the hair and shoulders, separating the figure from the backdrop. 85mm lens at f/2.8 from about 2.5 m, camera at chest height. The whole frame is cool and contemporary; the only colour accent is the glow of the screen.`
const bomber = (pron) => `${pron} wears the Efeonce corporate uniform: the deep navy bomber jacket of the kit ZIPPED HALFWAY over the deep navy pique polo of the kit, so only ONE emblem is visible on the front: the embroidered one on the left chest of the jacket, above the tablet. Dark jeans below, mostly out of frame.`
const P = [
  { k:'hum', linea:'growth', name:'Hum', pron:'she', obj:'her', gesto:'a calm, attentive half-smile, the look of someone who listened before proposing', colorName:'teal', hex:'#36C8BF', ropa:'bomber' },
  { k:'karo', linea:'brand', name:'Karo', pron:'she', obj:'her', gesto:'a sideways, playful smile and a confident spark in the eyes', colorName:'warm orange', hex:'#FF6500', ropa:'hoodie' },
  { k:'sophia', linea:'engine', name:'Sophia', pron:'she', obj:'her', gesto:'a serious, analytical expression with a contained closed-mouth smile', colorName:'azure blue', hex:'#0375DB', ropa:'bomber' },
  { k:'isabella', linea:'voice', name:'Isabella', pron:'she', obj:'her', gesto:'an open, energetic smile, mid-laugh, eyes bright', colorName:'vivid red-orange', hex:'#F83902', ropa:'bomber' },
  { k:'antonio', linea:'revenue-hubspot', name:'Antonio', pron:'he', obj:'him', gesto:'calm confidence and a closed-mouth smile', colorName:'magenta-pink', hex:'#E86BD0', ropa:'bomber' }
]
for (const p of P) {
  const She = p.pron === 'he' ? 'He' : 'She'
  p.wardrobe = p.ropa === 'hoodie'
    ? `${She} wears the Efeonce navy hoodie of the kit, exactly as in the reference, with its embroidered chest mark visible above the tablet.`
    : bomber(She)
  const ficha = {
    id: `HERO-${p.k}`,
    formato: '4:5',
    impacto: true,
    linea: p.linea,
    identidad: [{ persona: p.k }],
    objetos: p.ropa === 'hoodie' ? [{ objeto: 'hoodie-efeonce' }] : [{ objeto: 'chaqueta-bomber-efeonce' }, { objeto: 'polo-efeonce' }],
    escena: base(p),
    lecho: 'sin-lecho',
    sinLechoPorque: 'Plate para recorte: se separa del fondo y se compone en el hero web de efeoncepro.com, donde firma el encabezado del sitio (norma de superficie web §4.1). Un primer plano desenfocado taparía la cintura y rompería el recorte.'
  }
  writeFileSync(`fichas/${ficha.id}.json`, JSON.stringify(ficha, null, 1))
}
