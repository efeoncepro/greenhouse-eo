// Componer → el modelo TERMINA: acabado local del isotipo compuesto, sin tocar el resto de la foto.
// Uso: node isotipo-acabado.cjs <plate-isotipo.png> <cx,cy fracciones> <ancho fracción> <out.png> [lado-recorte-px]
const sharp = require('module').createRequire('/Users/jreye/Documents/greenhouse-eo/x.js')('sharp')
const { spawnSync } = require('child_process')
const path = require('path')
const [plate, c, w, out, ladoArg] = process.argv.slice(2)
const PROMPT = process.env.ACABADO_PROMPT ||
  'This is a crop of a real cinematic photograph: a white armored chest plate of a futuristic suit. A small navy ' +
  'Efeonce mark (a rocket with three round windows inside an elliptical orbit, with a small sphere on top) was placed ' +
  'flat on the plate. It is finished, official artwork: keep its shape, every part, its proportions, its navy colour, ' +
  'its exact size and its exact position — do NOT redraw, restyle, re-letter, simplify, resize or move it. You are only ' +
  'adding MATERIAL and LIGHT so it reads as a real mark applied to that armor: let it follow the gentle curvature of ' +
  'the plate, pick up the same lighting gradient, the soft cool rim light and the faint reflections of the scene, lie perfectly flush with the matte surface as a thin printed decal — NO relief, NO bevel, NO emboss, NO highlight rim around it — with only a tiny edge softness, and carry the same grain, softness and depth of ' +
  'field as the plate around it. Keep everything else in the image exactly as it is: same framing, same plate, same ' +
  'hair, same colours. No text, no extra marks.'
;(async () => {
  const meta = await sharp(plate).metadata()
  const [fx, fy] = c.split(',').map(Number)
  const cx = Math.round(fx * meta.width), cy = Math.round(fy * meta.height), ew = Math.round(+w * meta.width)
  const lado = +(ladoArg || 512)
  const left = Math.max(0, Math.min(meta.width - lado, cx - lado / 2)), top = Math.max(0, Math.min(meta.height - lado, cy - lado / 2))
  const base = out.replace(/\.png$/, '')
  const crop = base + '-recorte.png', fin = base + '-recorte-terminado.png'
  await sharp(plate).extract({ left, top, width: lado, height: lado }).resize(1024, 1024, { kernel: 'lanczos3' }).png().toFile(crop)
  const r = spawnSync('pnpm', ['-s', 'ai:image', '--model', 'gpt-image-2.5-sunburst', '--quality', 'high', '--size', '1024x1024', '--image', crop, '--out', fin, '--prompt', PROMPT], { cwd: '/Users/jreye/Documents/greenhouse-eo', stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status || 1)
  const back = await sharp(fin).resize(lado, lado, { kernel: 'lanczos3' }).png().toBuffer()
  // máscara elíptica suave sólo alrededor del isotipo (el resto de la foto no cambia ni un píxel)
  const rx = Math.round(ew * 0.72), ry = Math.round(ew * 0.6), feather = Math.max(4, Math.round(ew * 0.18))
  const ex = cx - left, ey = cy - top
  const svg = `<svg width="${lado}" height="${lado}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="f"><feGaussianBlur stdDeviation="${feather / 2}"/></filter></defs><ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="white" filter="url(#f)"/></svg>`
  const mask = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer()
  const patch = await sharp(back).removeAlpha().raw().toBuffer()
  const orig = await sharp(plate).extract({ left, top, width: lado, height: lado }).removeAlpha().raw().toBuffer()
  const mix = Buffer.alloc(orig.length)
  for (let i = 0, p = 0; p < lado * lado; p++, i += 3) { const a = mask[p] / 255; for (let k = 0; k < 3; k++) mix[i + k] = Math.round(patch[i + k] * a + orig[i + k] * (1 - a)) }
  const mixPng = await sharp(mix, { raw: { width: lado, height: lado, channels: 3 } }).png().toBuffer()
  await sharp(plate).composite([{ input: mixPng, left, top }]).png().toFile(out)
  // hoja de revisión: compuesto vs terminado, al 300 %
  const z = Math.round(ew * 3.2), zl = Math.max(0, cx - z / 2), zt = Math.max(0, cy - z / 2)
  const a = await sharp(plate).extract({ left: zl, top: zt, width: z, height: z }).resize(360, 360).toBuffer()
  const b = await sharp(out).extract({ left: zl, top: zt, width: z, height: z }).resize(360, 360).toBuffer()
  await sharp({ create: { width: 730, height: 360, channels: 3, background: '#888' } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: 370, top: 0 }]).png().toFile(base + '-comparar.png')
  console.log('ok', out)
})()
