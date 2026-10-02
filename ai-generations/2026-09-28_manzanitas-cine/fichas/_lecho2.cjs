// Lecho = objeto excusa con nombre, materia y cámara anclada (design-studio §3 «El lecho en el registro cine»).
const fs = require('fs')
const CONSOLE = 'We watch her from the operator’s seat of a dark monitoring console that faces the space: the lens is only a few centimetres behind the near edge of the console, whose low, flat surface with rows of unlit keys and faders crosses the whole bottom of the frame, outside every light, with no screens and nothing lit on it; her body below the hips is hidden behind it.'
const CONSOLE_BLOG = CONSOLE.replace('crosses the whole bottom of the frame', 'crosses the whole bottom of the frame and rises to about a fifth of the frame height at the centre')
const LECHO_CONSOLE = { objeto: 'the near edge of the dark monitoring console we shoot past, a low flat surface with rows of unlit keys and faders, the lens only a few centimetres behind it, outside every light', tono: 'DARK near black' }
const TABLE = 'We sit on the client’s side of the meeting table, at seated eye level: the lens is only a few centimetres behind the near edge of the dark walnut table, whose wood surface in deep shadow crosses the whole bottom of the frame, outside every light; the glow of the card never reaches the near edge, and nothing stands on it.'
const LECHO_TABLE = { objeto: 'the client’s side of the dark walnut meeting table, its wood surface in deep shadow, the lens only a few centimetres behind its near edge, outside every light', tono: 'DARK walnut in deep shadow, near black' }
const CHAIR = 'We sit behind the visitor’s empty chair, across the table from her: the TOP OF THE BACKREST of that empty chair, in dark charcoal fabric upholstery with a soft gentle curve (not a straight line), is only a few centimetres in front of the lens and crosses the whole bottom of the frame, outside every light.'
const LECHO_CHAIR = { objeto: 'the TOP OF THE BACKREST OF THE EMPTY CHAIR in front of the camera, dark charcoal fabric upholstery, a soft gentle curve (not a straight line), outside every light', tono: 'DARK charcoal, near black' }
const mk = (src, id, lechoSentence, lecho, noList) => {
  const f = JSON.parse(fs.readFileSync(src + '.json', 'utf8'))
  const s = f.escena.split(/(?<=\.)\s+/)
  const i = s.findIndex(x => /^We (sit|watch)/.test(x))
  if (i < 0 || !/^No (desks|monitors)/.test(s[i + 1])) throw new Error('estructura ' + id)
  s.splice(i, 2, lechoSentence, noList)
  f.id = id; f.escena = s.join(' '); f.lecho = lecho
  fs.writeFileSync(id + '.json', JSON.stringify(f, null, 1))
}
mk('MC2g-45-estratega-mesa-cliente', 'MC2h-45-estratega-mesa-nogal', TABLE, LECHO_TABLE, 'No laptops, no monitors, no plants, no lamps.')
mk('MC3h-45-lente-silla', 'MC3j-45-lente-respaldo', CHAIR, LECHO_CHAIR, 'No monitors, no plants, no lamps.')
mk('MC4f-916-story-publico', 'MC4g-916-story-consola', CONSOLE, LECHO_CONSOLE, 'No desks other than the console, no monitors, no plants, no lamps.')
mk('MC5e-169-blog-publico', 'MC5f-169-blog-consola', CONSOLE_BLOG, LECHO_CONSOLE, 'No desks other than the console, no monitors, no plants, no lamps.')
console.log('ok')
