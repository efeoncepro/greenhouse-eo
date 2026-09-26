// Clawd sobre el hombro, COMPUESTO — no generado.
//
// Por qué: Clawd es la mascota oficial de un partner. Pedírselo al modelo dio cinco figuras distintas en
// cinco pasadas (patas largas, cuerpo cuadrado, ojos chicos, un tallo que lo volvía antena). Un modelo no
// sostiene una marca. Así que el plate nace SIN él y la figura se pega desde el kit, con el modelo puesto
// sólo —si hace falta— para integrar luz.
//
// La escala NO se elige a ojo: sale de medir la persona en el propio plate.
//   cara pómulo a pómulo = 157 px ≈ 13,5 cm  →  11,6 px/cm
//   comprobación: cabeza mentón-coronilla 260 px / 11,6 = 22,4 cm ✓
//   Clawd declara 25 cm de alto  →  290 px
import path from 'node:path'

import sharp from 'sharp'

const PLATE = process.argv[2] ?? 'ai-generations/2026-09-21_copiloto/plates/A-plate-limpio-v4.png'
const PIEZA = process.argv[3] ?? 'ai-generations/2026-09-21_copiloto/piezas/clawd-07-con-pregunta.png'
const OUT = process.argv[4] ?? 'ai-generations/2026-09-21_copiloto/plates/A-copiloto-compuesto.png'

const PX_POR_CM = 11.85 // cara pómulo a pómulo 160 px ≈ 13,5 cm, medido en este plate
const ALTO_CLAWD_CM = 25 // a esta altura su cabeza cae justo bajo la línea de ojos de ella (ojos y=690, cabeza de la figura y=749)
const APOYO = { x: 440, y: 1045 } // borde REAL del hoodie: medido exigiendo 12 px de azul seguidos (y≈1045 entre x=420 y x=600). La medición anterior, sin continuidad, pescaba el pelo.

const { width: W, height: H } = await sharp(PLATE).metadata()

// La pieza trae el «?» encima de la figura. Se mide la FIGURA sola para escalar por ella, no por el conjunto.
const pieza = sharp(PIEZA)
const { width: pw, height: ph } = await pieza.metadata()
const { data: recorte, info: bbox } = await sharp(PIEZA).trim({ threshold: 5 }).toBuffer({ resolveWithObject: true })

// El «?» ocupa la parte alta del lienzo; la figura, el resto. El compositor de la pieza deja la figura
// abajo del todo, así que su alto es el del lienzo menos el bloque del signo.
const altoSigno = Math.round(ph * 0.4537) // 750 de 1653 en la pieza actual
const altoFigura = ph - altoSigno
const escala = (ALTO_CLAWD_CM * PX_POR_CM) / altoFigura

const anchoEscalado = Math.round(pw * escala)
const altoEscalado = Math.round(ph * escala)
const clawd = await sharp(PIEZA).resize(anchoEscalado, altoEscalado).png().toBuffer()

const left = Math.round(APOYO.x - anchoEscalado / 2)
const top = Math.round(APOYO.y - altoEscalado)

// Sombra de contacto: la luz entra desde la IZQUIERDA, así que la sombra cae a la derecha y hacia abajo.
// Se construye desde la silueta real de la figura, no como una mancha inventada.
const siluetaFigura = await sharp(PIEZA)
  .extract({ left: 0, top: altoSigno, width: pw, height: altoFigura })
  .resize(anchoEscalado, Math.round(altoFigura * escala))
  .extractChannel('alpha')
  .toBuffer()

const { width: sw, height: sh } = await sharp(siluetaFigura).metadata()
// La sombra se construye TIÑENDO la silueta real: tres canales planos + el alfa de la figura.
// (El intento con `dest-in` sobre un lienzo creado devolvía un rectángulo opaco.)
const plano = await sharp({ create: { width: sw, height: sh, channels: 3, background: { r: 10, g: 24, b: 52 } } })
  .png()
  .toBuffer()
const sombra = await sharp(plano)
  .joinChannel(siluetaFigura)
  .blur(7)
  .png()
  .toBuffer()

const topFigura = top + Math.round(altoSigno * escala)

const salida = await sharp(PLATE)
  .composite([
    { input: sombra, left: left + 18, top: topFigura + 26, opacity: 0.55 },
    { input: clawd, left, top }
  ])
  .png()
  .toBuffer()

await sharp(salida).toFile(OUT)

console.log(
  JSON.stringify(
    {
      salida: OUT,
      lienzo: [W, H],
      escala: { pxPorCm: PX_POR_CM, altoClawdCm: ALTO_CLAWD_CM, factor: Number(escala.toFixed(4)) },
      figura: { ancho: sw, alto: sh },
      apoyo: APOYO,
      pieza: path.basename(PIEZA)
    },
    null,
    2
  )
)
