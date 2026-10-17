#!/usr/bin/env node
// Repone la cara aprobada de un personaje en un plano editado con IA (método narrativo §A).
//
// Toda edición de un plano con IA redibuja las caras aunque el prompt pida conservarlas. Este script toma la cara del
// plano aprobado (una elipse alrededor de ella), la busca en el plano nuevo por posición y escala (correlación
// normalizada sobre la zona interior: ojos, nariz, boca), la pega con borde difuso y corrige el color por el
// desplazamiento medio en un anillo. No genera nada: sólo mueve píxeles aprobados.
//
// Sirve cuando la expresión y el ángulo son parecidos. Si la correlación queda bajo --min-ncc (0,8 por defecto), sale
// con código 3 y no escribe: en ese caso se conserva el plano aprobado y se edita alrededor de la persona.
//
// Uso:
//   pnpm creative:face:restore -- --src aprobado.png --face 603,335,58,72 --dst editado.png --out salida.png \
//     [--window 150,100,650,500] [--scale 0.8,1.4] [--min-ncc 0.8]
//   --face es cx,cy,rx,ry de la elipse de la cara en el aprobado (píxeles). --window acota la búsqueda en el editado.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const gray = (buf, i) => 0.3 * buf[i] + 0.59 * buf[i + 1] + 0.11 * buf[i + 2]

const samplesOf = (patch, w, h, step) => {
  const pts = []

  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) {
      const e = ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2

      if (e < 0.6) pts.push([x, y, gray(patch, (y * w + x) * 3)])
    }

  const mean = pts.reduce((s, p) => s + p[2], 0) / pts.length
  const sd = Math.sqrt(pts.reduce((s, p) => s + (p[2] - mean) ** 2, 0) / pts.length)

  return { pts, mean, sd }
}

const nccAt = (dst, dw, tx, ty, { pts, mean, sd }) => {
  let s = 0
  let ss = 0
  let sp = 0

  for (const [x, y, g] of pts) {
    const v = gray(dst, ((ty + y) * dw + tx + x) * 3)

    s += v
    ss += v * v
    sp += v * g
  }

  const n = pts.length
  const mv = s / n
  const sv = Math.sqrt(Math.max(1e-6, ss / n - mv * mv))

  return (sp / n - mv * mean) / (sv * Math.max(sd, 1e-6))
}

/**
 * Busca la cara del aprobado en el editado y la pega.
 * @returns {Promise<{ncc:number, scale:number, x:number, y:number, w:number, h:number, offset:number[], buffer:Buffer|null, width:number, height:number}>}
 */
export async function restoreFace({ src, face, dst, window: win, scale = [0.75, 1.35], minNcc = 0.8 }) {
  const [cx, cy, rx, ry] = face
  const D = await sharp(dst).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const dw = D.info.width
  const dh = D.info.height
  const pw = rx * 2
  const ph = ry * 2
  const patch = await sharp(src).removeAlpha().extract({ left: cx - rx, top: cy - ry, width: pw, height: ph }).raw().toBuffer()
  const [x0, y0, x1, y1] = win ?? [0, 0, dw, dh]
  let best = { ncc: -2 }

  for (let sc = scale[0]; sc <= scale[1] + 1e-9; sc += 0.025) {
    const w = Math.round(pw * sc)
    const h = Math.round(ph * sc)
    const resized = await sharp(patch, { raw: { width: pw, height: ph, channels: 3 } }).resize(w, h).raw().toBuffer()
    const sample = samplesOf(resized, w, h, 3)

    for (let ty = Math.max(0, y0); ty + h <= Math.min(dh, y1); ty += 4)
      for (let tx = Math.max(0, x0); tx + w <= Math.min(dw, x1); tx += 4) {
        const ncc = nccAt(D.data, dw, tx, ty, sample)

        if (ncc > best.ncc) best = { ncc, scale: sc, x: tx, y: ty, w, h }
      }
  }

  const resized = await sharp(patch, { raw: { width: pw, height: ph, channels: 3 } }).resize(best.w, best.h).raw().toBuffer()
  const fine = samplesOf(resized, best.w, best.h, 2)

  for (let ty = best.y - 4; ty <= best.y + 4; ty++)
    for (let tx = best.x - 4; tx <= best.x + 4; tx++) {
      if (tx < 0 || ty < 0 || tx + best.w > dw || ty + best.h > dh) continue
      const ncc = nccAt(D.data, dw, tx, ty, fine)

      if (ncc > best.ncc) best = { ...best, ncc, x: tx, y: ty }
    }

  const { w, h } = best
  const ma = [0, 0, 0]
  const mb = [0, 0, 0]
  let n = 0

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const e = ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2

      if (e > 1 || e < 0.7) continue
      const i = (y * w + x) * 3
      const j = ((best.y + y) * dw + best.x + x) * 3

      for (let c = 0; c < 3; c++) {
        ma[c] += resized[i + c]
        mb[c] += D.data[j + c]
      }

      n++
    }

  const offset = [0, 1, 2].map(c => (mb[c] - ma[c]) / n)
  const result = { ncc: best.ncc, scale: best.scale, x: best.x, y: best.y, w, h, offset, width: dw, height: dh, buffer: null }

  if (best.ncc < minNcc) return result

  const out = Buffer.from(D.data)

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const e = Math.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
      const wt = e < 0.75 ? 1 : e > 1 ? 0 : 1 - (e - 0.75) / 0.25

      if (!wt) continue
      const i = (y * w + x) * 3
      const j = ((best.y + y) * dw + best.x + x) * 3

      for (let c = 0; c < 3; c++) out[j + c] = Math.max(0, Math.min(255, Math.round(D.data[j + c] * (1 - wt) + (resized[i + c] + offset[c]) * wt)))
    }

  result.buffer = out

  return result
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const argv = process.argv.slice(2).filter(a => a !== '--')
  const args = {}

  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1]

  const nums = v => v?.split(',').map(Number)

  if (!args.src || !args.face || !args.dst || !args.out) {
    console.error('Uso: --src aprobado.png --face cx,cy,rx,ry --dst editado.png --out salida.png [--window x0,y0,x1,y1] [--scale a,b] [--min-ncc 0.8]')
    process.exit(2)
  }

  const r = await restoreFace({ src: args.src, face: nums(args.face), dst: args.dst, window: nums(args.window), scale: nums(args.scale) ?? undefined, minNcc: args['min-ncc'] ? Number(args['min-ncc']) : 0.8 })
  const report = { ncc: +r.ncc.toFixed(3), scale: +r.scale.toFixed(3), x: r.x, y: r.y, w: r.w, h: r.h, offset: r.offset.map(v => +v.toFixed(1)) }

  if (!r.buffer) {
    console.error(`✖ correlación ${report.ncc} bajo el mínimo: la cara cambió de ángulo o expresión. No se escribió nada; editar alrededor de la persona.`)
    console.error(JSON.stringify(report))
    process.exit(3)
  }

  await sharp(r.buffer, { raw: { width: r.width, height: r.height, channels: 3 } }).png().toFile(args.out)
  console.log(JSON.stringify({ ...report, out: args.out }))
}
