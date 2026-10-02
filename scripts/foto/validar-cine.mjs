// pnpm foto:validar:cine — las fallas cine que SÍ se pueden medir en píxeles. Lo demás lo juzga `cine-reviewer`.
//
//   pnpm foto:validar:cine <plate.png> [--reserva-arriba f] [--json]
//
// Comando aparte a propósito: `foto:validar` (las seis reservas, todos los registros) no cambia.
// Gates, calibrados el 2026-10-02 contra 16 plates cine aprobados y 19 de otros registros (casebook, «Medidor»):
//   sombra   — ≥ 35 % del cuadro con L* < 20: el piso del low key (casebook, falla 2, sólo la forma gruesa).
//   reserva  — en vertical, L* p99 ≤ 45 en el 36 % superior: nada brillante sube a la reserva (falla 5).
//              Es el único que separa: 3 de 7 plates verticales de otros registros reprueban, ningún cine aprobado.
// Informativo, sin gate: `profundidad` (zona más nítida / mediana). NO separa: la rechazada NX7b mide 18,1, dentro
// del rango de las aprobadas.
// Lo que este comando NO puede ver, medido el mismo día, y por eso es del revisor: los «stickers» (NX7b pasa todo),
// la luz plana con relleno (las documentales miden la misma llave que las cine) y el azul rey del uniforme bajo una
// llave azul (AE2b, rechazado por azul rey, mide L* 12 · b* −28; WB1c, navy aprobado, L* 12 · b* −35).
// Sale con 1 si un gate falla. Un verde no aprueba la foto: la foto se mira al 100 %.
import path from 'node:path'

import sharp from 'sharp'

const lin = c => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const fLab = v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116)

export const lab = (r, g, b) => {
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883

  return { L: 116 * fLab(Y) - 16, a: 500 * (fLab(X) - fLab(Y)), b: 200 * (fLab(Y) - fLab(Z)) }
}

// Umbrales: ver la calibración al pie del casebook (sección «Medidor»).
export const UMBRALES = {
  sombra: 0.35, // fracción del cuadro con L* < 20 (aprobados: 62–86 %)
  reserva: 45   // L* p99 dentro de la reserva superior en vertical
}

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]

export const medirCine = async (file, { reservaArriba } = {}) => {
  const img = sharp(file).removeAlpha().toColourspace('srgb')
  const { width: W, height: H } = await img.metadata()
  const ancho = 640
  const alto = Math.round((H / W) * ancho)
  const { data } = await sharp(file).removeAlpha().toColourspace('srgb').resize(ancho, alto).raw().toBuffer({ resolveWithObject: true })

  const L = new Float32Array(ancho * alto)

  for (let i = 0, p = 0; i < data.length; i += 3, p++) L[p] = lab(data[i], data[i + 1], data[i + 2]).L

  // Profundidad: varianza del laplaciano por celda de una grilla de 8×8 sobre L*.
  const n = 8
  const celdas = []

  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const x0 = Math.floor((gx * ancho) / n) + 1
      const x1 = Math.floor(((gx + 1) * ancho) / n) - 1
      const y0 = Math.floor((gy * alto) / n) + 1
      const y1 = Math.floor(((gy + 1) * alto) / n) - 1
      let s = 0
      let s2 = 0
      let k = 0

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * ancho + x
          const v = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - ancho] - L[i + ancho]

          s += v
          s2 += v * v
          k++
        }
      }

      celdas.push(s2 / k - (s / k) ** 2)
    }
  }

  const ord = [...celdas].sort((a, b) => a - b)
  const profundidad = ord[ord.length - 1] / Math.max(1e-6, pct(ord, 0.5))

  const todos = Array.from(L).sort((a, b) => a - b)
  const sombra = todos.filter(v => v < 20).length / todos.length
  const llave = pct(todos, 0.99) - pct(todos, 0.5)

  const vertical = H > W
  const fraccion = reservaArriba ?? (vertical ? 0.36 : null)
  let reserva = null

  if (fraccion) {
    const filas = Math.round(alto * fraccion)
    const zona = Array.from(L.subarray(0, filas * ancho)).sort((a, b) => a - b)

    reserva = { fraccion, p99: pct(zona, 0.99) }
  }

  const u = UMBRALES

  const checks = [
    { id: 'sombra', valor: sombra, ok: sombra >= u.sombra, regla: `≥ ${Math.round(u.sombra * 100)} % del cuadro con L* < 20`, falla: 'cuadro claro y parejo: el cine es low key, con una sola llave y sin relleno (casebook, falla 2)' }
  ]

  if (reserva) checks.push({ id: 'reserva', valor: reserva.p99, ok: reserva.p99 <= u.reserva, regla: `L* p99 ≤ ${u.reserva} en el ${Math.round(reserva.fraccion * 100)} % superior`, falla: 'el fenómeno o la llave suben a la reserva del titular: bájalos del 36 % por nombre (casebook, falla 5)' })

  const info = { profundidad, llave }

  return { file, W, H, checks, info, ok: checks.every(c => c.ok) }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2)
  const file = args.find(a => !a.startsWith('--') && /\.(png|jpe?g|webp)$/i.test(a))

  const valor = flag => {
    const i = args.indexOf(flag)

    return i >= 0 ? args[i + 1] : undefined
  }

  if (!file) {
    console.error('Uso: pnpm foto:validar:cine <plate.png> [--reserva-arriba f] [--json]')
    process.exit(2)
  }

  const reservaArriba = valor('--reserva-arriba') ? Number(valor('--reserva-arriba')) : undefined
  const r = await medirCine(file, { reservaArriba })

  if (args.includes('--json')) {
    console.log(JSON.stringify(r, null, 2))
  } else {
    console.log(`${path.basename(file)} · ${r.W}×${r.H} · registro cine`)

    for (const c of r.checks) {
      const v = c.id === 'sombra' ? `${Math.round(c.valor * 100)} %` : c.valor.toFixed(1)

      console.log(`  ${c.ok ? '✓' : '✗'} ${c.id.padEnd(12)} ${v} — ${c.regla}`)
      if (!c.ok) console.log(`      ${c.falla}`)
    }

    console.log(`  · profundidad ${r.info.profundidad.toFixed(1)} · llave ${r.info.llave.toFixed(1)} (informativo: no separa aprobadas de rechazadas)`)
    console.log('  No mide: stickers, luz con relleno ni azul rey bajo luz azul → agente cine-reviewer sobre el plate.')
    console.log(r.ok ? '  Sin fallas cine conocidas. Mira la foto al 100 % y corre `pnpm foto:validar` para lecho y texto.' : '  Hay fallas cine: corrige la ficha (no la foto) y regenera.')
  }

  process.exit(r.ok ? 0 : 1)
}
