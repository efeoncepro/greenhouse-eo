/**
 * La manzana en bytes de Glitch (TASK-1923): la silueta OFICIAL de la manzana (`glitch-apple.svg` de
 * @efeoncepro/axis-brand-assets) armada con bytes de 8 bits, cada bit lleno (1) o en contorno (0), con el desvío y la
 * opacidad por byte medidos en las láminas aprobadas del canvas (portada B y textura de la contraportada).
 *
 * Se GENERA desde el path oficial, no se copia del canvas: si AXIS cambia la manzana, `pnpm glitch:tokens` la vuelve a
 * armar. Determinista (PRNG sembrado, sin reloj). El color es el del token que recibe (acento o línea).
 */

import sharp from 'sharp'

export interface AppleBytesOptions {
  /** SVG oficial de la manzana (viewBox 539 0 118 154). */
  appleSvg: string
  /** Color de los bits (HEX del token). */
  color: string
  /** Opacidades por byte (medidas en el canvas). */
  opacities?: readonly number[]
  seed?: number
}

/** Medidas de la portada B del canvas, normalizadas a un lienzo de 240 × 300. */
const BIT_W = 3
const BIT_H = 6
const BIT_PITCH = 3.9
const ROW_PITCH = 7.6
const W = 240
const H = 300
const PAD = 8
const OPACITIES = [0.7, 0.726, 0.793, 0.836, 0.875, 0.908, 0.959, 0.977]

const prng = (seed: number) => {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10

export const buildAppleBytesSvg = async ({ appleSvg, color, opacities = OPACITIES, seed = 0x6ec207 }: AppleBytesOptions): Promise<string> => {
  // Silueta de la manzana al tamaño del lienzo interior (se respeta la proporción 118:154, centrada).
  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const scale = Math.min(innerW / 118, innerH / 154)
  const drawW = Math.round(118 * scale)
  const drawH = Math.round(154 * scale)
  const offX = Math.round((W - drawW) / 2)
  const offY = Math.round((H - drawH) / 2)
  const mask = await sharp(Buffer.from(appleSvg)).resize(drawW, drawH).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const inside = (x: number, y: number) => {
    const px = Math.floor(x - offX)
    const py = Math.floor(y - offY)

    if (px < 0 || py < 0 || px >= mask.info.width || py >= mask.info.height) return false

    return mask.data[(py * mask.info.width + px) * mask.info.channels + 3] > 127
  }

  const random = prng(seed)
  const bits: string[] = []
  const byteW = BIT_PITCH * 8

  for (let y = PAD; y + BIT_H <= H - PAD; y += ROW_PITCH) {
    for (let x = PAD; x + byteW <= W - PAD + byteW; x += byteW + BIT_PITCH) {
      const dx = (random() - 0.5) * 2.4
      const dy = (random() - 0.5) * 3
      const opacity = opacities[Math.floor(random() * opacities.length)]

      for (let b = 0; b < 8; b++) {
        const bx = x + b * BIT_PITCH + dx
        const by = y + dy
        const on = random() < 0.56

        if (!inside(bx + BIT_W / 2, by + BIT_H / 2)) continue

        bits.push(
          on
            ? `<rect x="${r1(bx)}" y="${r1(by)}" width="${BIT_W}" height="${BIT_H}" fill="${color}" fill-opacity="${opacity}"/>`
            : `<rect x="${r1(bx)}" y="${r1(by)}" width="${BIT_W}" height="${BIT_H}" fill="none" stroke="${color}" stroke-opacity="${r1(opacity * 0.8 * 10) / 10}" stroke-width="0.8"/>`
        )
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${bits.join('')}</svg>\n`
}
