/**
 * Materializa los assets que pide un plan de «La órbita» (`planSurfacePiece` / `planSurfaceDocument`) como data URI
 * (TASK-1921; antes vivía en el CLI de TASK-1919). Lo comparten `pnpm brand:compose` (lee del disco) y el
 * `artifact-worker` (lee del asset store): la única diferencia es el `SourceLoader`. El render bloquea la red y no lee
 * rutas externas, por eso todo llega en bytes. Usa sharp: sólo server.
 */

import sharp from 'sharp'

import { EXTERNAL_ASSET_PREFIX } from '@/lib/artifact-composer/pure'
import type { SourceLoader } from '@/lib/glitch-composition/materialize'

import type { SurfaceAssetRequest } from '../types'

export type { SourceLoader, SourceBytes } from '@/lib/glitch-composition/materialize'

/**
 * Bytes de cada asset del plan, como data URI (el render bloquea la red y no lee rutas externas). La clave es
 * la referencia sin el prefijo `asset-ref:`, que es como el motor las busca.
 */
export const materializeSurfaceAssets = async (assets: readonly SurfaceAssetRequest[], load: SourceLoader): Promise<Record<string, string>> => {
  const out: Record<string, string> = {}
  const key = (ref: string) => ref.slice(EXTERNAL_ASSET_PREFIX.length)

  for (const asset of assets) {
    if (asset.kind === 'svg') {
      out[key(asset.ref)] = `data:image/svg+xml;base64,${Buffer.from(asset.svg).toString('base64')}`
      continue
    }

    if (asset.kind === 'painted') {
      if (!asset.svg.includes(asset.photo.marker)) throw new Error(`La capa ${asset.ref} no lleva el marcador de su foto.`)

      const photo = (await load(asset.photo.path)).bytes

      const jpeg = await sharp(photo).resize(asset.photo.fit.width, asset.photo.fit.height, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer()
      const svg = asset.svg.split(asset.photo.marker).join(`data:image/jpeg;base64,${jpeg.toString('base64')}`)

      out[key(asset.ref)] = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
      continue
    }

    const source = await load(asset.path)
    const file = source.bytes

    if (asset.kind === 'logo') {
      out[key(asset.ref)] = await normalizedLogo(file, asset)
      continue
    }

    if (asset.kind === 'file') {
      const mime = fileMimeOf(asset.path, source.mimeType)

      if (!mime) throw new Error(`El archivo ${asset.path} no es SVG ni PNG: un logo se entrega en uno de esos dos.`)

      out[key(asset.ref)] = `data:${mime};base64,${file.toString('base64')}`
      continue
    }

    const jpeg = asset.focus ? await focusedCrop(file, asset.fit, asset.focus) : await sharp(file).resize(asset.fit.width, asset.fit.height, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer()

    out[key(asset.ref)] = `data:image/jpeg;base64,${jpeg.toString('base64')}`
  }

  return out
}

const FILE_MIME: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png' }
const FILE_MIME_TYPES = new Set(Object.values(FILE_MIME))

/** SVG o PNG: el tipo lo dice el asset store (worker) o la extensión (disco). */
const fileMimeOf = (name: string, mimeType: string | null): string | null => {
  if (mimeType && FILE_MIME_TYPES.has(mimeType)) return mimeType

  const dot = name.lastIndexOf('.')

  return dot < 0 ? null : FILE_MIME[name.slice(dot).toLowerCase()] ?? null
}

/** Un recorte que cubre la caja y se corre hacia el foco del archivo (0 = borde izquierdo o superior, 1 = el opuesto). */
const focusedCrop = async (file: Buffer, fit: { width: number; height: number }, focus: { xOfWidth?: number; yOfHeight?: number }): Promise<Buffer> => {
  const meta = await sharp(file).metadata()
  const scale = Math.max(fit.width / meta.width!, fit.height / meta.height!)
  const width = Math.ceil(meta.width! * scale)
  const height = Math.ceil(meta.height! * scale)
  const left = Math.round((width - fit.width) * (focus.xOfWidth ?? 0.5))
  const top = Math.round((height - fit.height) * (focus.yOfHeight ?? 0.5))

  return sharp(file).resize(width, height).extract({ left, top, width: fit.width, height: fit.height }).jpeg({ quality: 90 }).toBuffer()
}

const LUMA = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/**
 * Un logo de tercero en UN tono y con el mismo peso óptico que sus vecinos (TASK-1928): se mide el área de tinta del
 * logo rasterizado y se escala para que todos tengan la misma, dentro de su caja máxima; después se pinta en el tono.
 * Con `recolor` (la excepción tonal declarada) no se aplana: se reemplazan sus colores por tonos del mismo color, y el
 * tono claro, que pesa menos, se compensa con `recolorBox`. Sale como SVG con su tamaño intrínseco (el PNG a 2×
 * adentro), así la plantilla no fija medidas.
 */
const normalizedLogo = async (file: Buffer, asset: Extract<SurfaceAssetRequest, { kind: 'logo' }>): Promise<string> => {
  const base = await sharp(file, { density: 600 }).resize({ height: 400, fit: 'inside' }).ensureAlpha().png().toBuffer()
  const { data: px, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const dropped = (o: number) => asset.knockout === true && LUMA(px[o]!, px[o + 1]!, px[o + 2]!) > 0.92
  let ink = 0

  for (let o = 0; o < px.length; o += 4) ink += dropped(o) ? 0 : px[o + 3]! / 255

  if (ink <= 0) throw new Error(`El logo ${asset.path} no tiene tinta.`)

  const k = Math.min(Math.sqrt(asset.inkArea / ink), asset.maxWidth / info.width, asset.maxHeight / info.height)
  let w = Math.round(info.width * k)
  let h = Math.round(info.height * k)
  let png: Buffer

  if (asset.recolor) {
    let svg = file.toString('utf8')

    for (const [from, to] of Object.entries(asset.recolor)) svg = svg.replaceAll(`fill="${from}"`, `fill="${to}"`)

    const box = asset.recolorBox

    if (box) {
      const scale = Math.min(box.scaleMax, box.maxWidth / w, box.maxHeight / h)

      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }

    png = await sharp(Buffer.from(svg), { density: 600 }).resize(w * 2, h * 2, { fit: 'fill' }).png().toBuffer()
  } else {
    const alpha = Buffer.alloc(info.width * info.height)

    for (let i = 0; i < alpha.length; i++) alpha[i] = dropped(i * 4) ? 0 : px[i * 4 + 3]!

    const mask = await sharp(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).resize(w * 2, h * 2).png().toBuffer()
    const [r, g, b] = [0, 2, 4].map(i => Number.parseInt(asset.tone.replace('#', '').slice(i, i + 2), 16))

    png = await sharp({ create: { width: w * 2, height: h * 2, channels: 3, background: { r: r!, g: g!, b: b! } } }).joinChannel(mask).png().toBuffer()
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image href="data:image/png;base64,${png.toString('base64')}" width="${w}" height="${h}"/></svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

