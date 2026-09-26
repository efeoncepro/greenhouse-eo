// Arma las 8 fichas del banco de fotos para la lente de la órbita (lámina 5.2 del canvas).
// Registro A documental: nadie mira al lente, sin emblema, sujeto dentro del círculo del 55 %.
import { writeFileSync } from 'node:fs'

const C =
  'LENS FRAMING: everything essential sits inside a centred circle about 55% of the frame width, centred slightly above the middle, with air around it; outside that circle the picture holds only calm secondary material. Nobody looks at the lens.'

const F = [
  {
    id: 'L1-manos-curva',
    palanca: 'manos',
    escena: `SCENE (colour grading suite of a small Santiago studio, mid-afternoon, grading a bakery campaign): two hands work a colour-grading control surface with deep ink-blue matte anodised trackballs and rings; the right fingertips are caught mid-turn on a ring, the left hand steadies the panel edge. Beyond the hands, soft and out of focus, a calibrated monitor shows a warm photograph of bread crust whose glow falls on the knuckles. Hard low afternoon sun from a side window rakes across the panel so every knob throws its own shadow. 85mm f/2, focus on the fingertips. ${C}`,
    lecho: { objeto: 'the near rim of the grading desk, a dark walnut edge right at the lens', tono: 'DARK near black' }
  },
  {
    id: 'L2-variantes-etiqueta',
    palanca: 'variantes',
    eje: 'the warmth of one small orange colour field on the label, and nothing else',
    escena: `SCENE (packaging studio for a craft soda, late morning, the art director choosing the final label): TWELVE printed proofs of the same bottle label pinned in a tidy grid on a pale warm-white plaster wall; each label has the same deep ink-blue field and the same small orange field, and at the instant of decision ONE proof in the centre of the grid is lifted off its pin by a hand entering from the right edge, a pencil tick beside it. Hard morning sun from a high window crosses the grid diagonally, each sheet casting a thin shadow. 50mm f/4, focus on the lifted proof. ${C}`,
    lecho: { objeto: 'the back of a dark office chair at the lens, completely out of focus', tono: 'DARK near black' }
  },
  {
    id: 'L3-sombra-orbita',
    palanca: 'sombra',
    escena: `SCENE (strategy room, early morning, a strategist deciding the plan for a regional bank): on a large matte white whiteboard a hand-drawn ring in deep ink-blue marker, and the strategist, almost entirely out of frame at the right edge, is placing ONE small lime-green round magnet on the ring. A hard low sunbeam from a window behind them throws the long sharp shadow of their arm, hand and the magnet across the ring: the shadow is the clearest shape in the frame. Only fingertips enter at the edge. 35mm f/5.6. ${C}`,
    lecho: { objeto: 'the black marker tray of the whiteboard crossing the bottom edge, deep in shadow', tono: 'DARK near black' }
  },
  {
    id: 'L4-quien-sostiene-rodaje',
    palanca: 'quien-sostiene',
    escena: `SCENE (on-location shoot inside a specialty coffee shop, 10 am, filming a barista for a café chain launch): in focus, a camera operator in a plain dark grey sweater sits on an apple box at a small field monitor mounted on the rig, one hand on the focus wheel, watching the take; the cool light of the monitor lifts their cheek and hand. Behind them, SMALL, SOFT and out of focus, the barista pours at the counter against deep ink-blue glazed tiles. Warm window light from the left falls on the operator. 85mm f/1.8. ${C}`,
    lecho: { objeto: 'the black hard case of the camera kit on the floor at the lens', tono: 'DARK near black' }
  },
  {
    id: 'L5-cenital-informe',
    palanca: 'cenital',
    escena: `SCENE (end-of-month review for a home-goods retailer, 11 am, on a bare pale oak table with nothing else on it): a printed report lies open — on the left page small product photographs of hand-thrown ceramic bowls, on the right page ONE line chart printed in deep ink-blue ink with a few pencil annotations in the margin. A hand from the bottom edge holds the page flat; another from the right edge is caught mid-press sticking ONE small lime-green paper tab beside the rising line; a sharpened pencil lies where it was set down. Nothing else on the table: no plant, no mug, no cup, no glasses, no notebook, no phone. Hard late-morning sun from one side draws crisp shadows off the paper edges and the fingers. The type is tiny and cannot be read at this distance. ${C}`,
    lecho: 'sin-lecho',
    sinLechoPorque: 'cenital perpendicular: no hay primer plano entre cámara y mesa; la foto va dentro de la lente y la pieza pone la firma'
  },
  {
    id: 'L6-escucha-llamada',
    palanca: 'escucha',
    escena: `SCENE (client call about a restaurant group opening, 4 pm, small meeting booth with a pale warm limewashed plaster wall behind her, no coloured wall anywhere): chest-up framing of a woman in her forties in a plain cream knit sweater listening to the client through small white earbuds; only the top edge of the back of a laptop shows at the very bottom right, turned away from the camera. A pen lies UNUSED across a deep ink-blue linen notebook beside her hand, the only blue in the frame. Caught just as the client finishes a sentence: her mouth is closed, eyes lowered and aimed out of frame to the left, chin resting on two fingers. Soft side window light with fill, a hard sliver of sun across the table and her shoulder. 85mm f/2, focus on her eyes. ${C}`,
    lecho: { objeto: 'the dark upholstered back of the booth seat facing her, at the lens', tono: 'DARK near black' }
  },
  {
    id: 'L7-proyeccion-pieza',
    palanca: 'proyeccion',
    escena: `SCENE (approval session for a bakery chain campaign, evening, a raw warehouse studio): the approved key visual — a loaf of bread breaking open, a deep ink-blue field and one small orange field — is projected onto a rough whitewashed brick wall whose grain and mortar lines show through the image. A creative director, caught mid-step as she walks into the beam, stands with her back to the camera, the image falling across her shoulders, her shadow punching a hard hole in it. No screen anywhere. 35mm f/2.8. ${C}`,
    lecho: { objeto: 'the dark silhouette of the projector cart at the lens', tono: 'DARK near black' }
  },
  {
    id: 'L8-ausencia-cierre',
    palanca: 'ausencia',
    escena: `SCENE (end of a project cycle for an olive-oil producer, golden hour, a bare modern studio with raw grey concrete walls, no shelves, no books, no plants): on a long pale oak table lies the final approved print — an olive branch on a deep ink-blue field — slightly askew where it was dropped; beside it a black marker with its cap off, a pencil with a worn tip and two glasses of water half drunk. Two chairs are pushed back at an angle from the table, one swivelled away toward the window, a jacket still hanging on its back. One small desk lamp is still on. Low warm sun from the window at the back throws long shadows of the glasses and chair legs toward the camera. 50mm f/2.8, focus on the print, which sits in the centre of the frame. ${C}`,
    lecho: { objeto: 'the near edge of the oak table right at the lens', tono: 'DARK near black' }
  }
]

for (const f of F) writeFileSync(new URL(`./${f.id}.json`, import.meta.url), JSON.stringify({ formato: '4:5', impacto: true, ...f }, null, 2) + '\n')
console.log(F.length, 'fichas')
