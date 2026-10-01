// Lecho = objeto excusa de la escena (norma de firma §1, design-studio §3), no una banda de blur.
const fs = require('fs')
const drop = s => s.split(/(?<=\.)\s+/).filter(x => !/presentation table|no desks other than the foreground table/i.test(x)).join(' ')
const AUD = 'We watch from the front row of a dark auditorium: in the lowest fifth, so close to the lens that they dissolve into soft dark shapes, the heads and shoulders of three people of the audience are seen from behind, watching her, outside every light. No desks, no monitors, no plants, no lamps.'
const CLIENT = 'We sit on the client’s side of a dark meeting table: in the lowest fifth, so close to the lens that they dissolve into soft abstract shapes, the dark back of the client’s open laptop and a closed notebook on the table edge, outside every light; the laptop screen faces away and throws no light. No monitors, no plants, no lamps.'
const CHAIR = 'We sit across the table from her: in the lowest fifth, so close to the lens that it dissolves into a soft abstract shape, the dark high back of the visitor’s chair crosses the frame, outside every light. No monitors, no plants, no lamps.'
const mk = (src, id, extra, lecho, edit = x => x) => {
  const f = JSON.parse(fs.readFileSync(src + '.json', 'utf8'))
  f.id = id
  f.escena = edit(drop(f.escena)).replace(/\s*$/, ' ') + extra
  f.lecho = lecho
  fs.writeFileSync(id + '.json', JSON.stringify(f, null, 1))
}
const L = o => ({ objeto: o, tono: 'DARK near black' })
mk('MC1-45-portada-foco', 'MC1e-45-portada-publico', AUD, L('the heads and shoulders of three people of the audience in the front row, seen from behind, so close to the lens they are soft dark shapes, outside every light'))
mk('MC4b-916-story-foco', 'MC4e-916-story-publico', AUD, L('the heads and shoulders of three people of the audience in the front row, seen from behind, so close to the lens they are soft dark shapes, outside every light'))
mk('MC5c-169-blog-lecho', 'MC5e-169-blog-publico', AUD, L('the heads and shoulders of four people of the audience in the front row, seen from behind, so close to the lens they are soft dark shapes spread across the whole width, outside every light'))
mk('MC2-45-entidad-estratega', 'MC2e-45-estratega-mesa-cliente', CLIENT, L('the dark back of the client’s open laptop and a closed notebook on the edge of the meeting table, seen from the client’s seat, outside every light'))
for (const v of ['h', 'i']) mk('MC3f-45-lente-tableta-baja', `MC3${v}-45-lente-silla`, CHAIR, L('the dark high back of the visitor’s chair across the table from her, outside every light'), x => x.replace('an empty dark studio at night with thick haze', 'a dark studio at night with thick haze'))
console.log('ok')
