// `pnpm foto:componer:cta:pruebas [--ref <git-ref>] [--solo P01,P07] [--compositor <archivo>] [--gate <archivo>]` — 10 pruebas de punta a punta del compositor
// de piezas con CTA, sobre piezas REALES del repo y sobre variantes rotas a propósito.
//
//   P01 determinismo · P02 no regresión (harness completo) · P03 guarda de sujeto · P04 crecer respira (medición
//   independiente) · P05 crecer no degrada contraste · P06 zona segura y eje · P07 validación del plan · P08 cortes
//   de línea · P09 accesibilidad y contraste · P10 gate
//
// Nada se compone en las carpetas reales: todo corre en un directorio temporal. Las pruebas que MIDEN no usan el
// código que prueban (P04 recalcula la distancia al sujeto desde la máscara, P08 trae su propio oráculo de cortes):
// una prueba que se verifica a sí misma no prueba nada. Deja reporte.json, reporte.md y la evidencia en disco.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import sharp from 'sharp'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const args0 = process.argv.slice(2)
// `--compositor <archivo>` corre las pruebas contra OTRA versión (p. ej. un mutante en
// scripts/foto/.componer-cta@<nombre>.regresion.mjs, ignorado por git): una prueba que no falla ante un mutante que
// rompe lo que ella cuida no está probando nada. La regresión (P02) usa ese mismo archivo como candidato.
const COMPOSITOR = path.resolve(ROOT, args0.includes('--compositor') ? args0[args0.indexOf('--compositor') + 1] : 'scripts/foto/componer-cta.mjs')
// `--gate <archivo>`: lo mismo para el gate — un gate mutante que deja de verificar algo debe hacer fallar a P10.
const GATE = path.resolve(ROOT, args0.includes('--gate') ? args0[args0.indexOf('--gate') + 1] : 'scripts/foto/componer-cta.gate.mjs')
// `--regresion <archivo>`: lo mismo para el arnés de regresión (P02 lo pone a prueba con casos hechos a propósito).
const REGRESION = path.resolve(ROOT, args0.includes('--regresion') ? args0[args0.indexOf('--regresion') + 1] : 'scripts/foto/componer-cta.regresion.mjs')
// `--p02-rapido`: P02 sólo verifica el arnés (vacío, cobertura, avisos, referencia hermética), sin la regresión completa.
const P02_RAPIDO = args0.includes('--p02-rapido')
const REPORTE_A11Y = path.join(ROOT, 'scripts/foto/accesibilidad-reporte.mjs')
const MASCARAS = path.join(ROOT, 'node_modules/.cache/foto-sujeto')
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const REF = opt('--ref', 'HEAD')
const SOLO = opt('--solo', null)?.split(',')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'foto-pruebas-'))
const sha = b => createHash('sha256').update(b).digest('hex')

// ── Piezas reales del repo ──────────────────────────────────────────────────────────────────────────
const CMP001 = 'ai-generations/2026-09-21_registro-c-respuesta'
const V07 = 'ai-generations/2026-09-22_aeo-final-safe-v07/piezas.json'
const CMP002 = 'ai-generations/2026-09-22_cmp002-hubspot/composicion-formatos/piezas-formatos.json'

const FIX = {
  mo2_916: [`${CMP001}/piezas-mofu-formatos.json`, 'mo2-no-te-citan-916'],
  mo1_169: [`${CMP001}/piezas-mofu-formatos.json`, 'mo1-canal-nuevo-169'],
  mo3_916: [`${CMP001}/piezas-mofu-formatos.json`, 'mo3-no-creernos-916'],
  b2_916: [`${CMP001}/piezas-bofu-formatos.json`, 'b2-primero-el-numero-916'],
  b2_169: [`${CMP001}/piezas-bofu-formatos.json`, 'b2-primero-el-numero-169'],
  p1_45: [`${CMP001}/piezas-cta.json`, 'p1-cta-contorno'],
  rec_916: [V07, '02-reconoces-916'],
  ele_169: [V07, '04-elegida-169'],
  ref_916: [V07, '03-referencia-916'],
  ref_169: [V07, '03-referencia-169'],
  kv07_916: [CMP002, 'KV-07-916'],
  kv06_169: [CMP002, 'KV-06-169'],
  fue_916: [V07, '01-fuera-916'],
  v03_fue: ['ai-generations/2026-09-22_aeo-cta-v03/piezas.json', '01-fuera-916']
}

const pieza = k => {
  const [rel, id] = FIX[k]
  const plan = path.join(ROOT, rel)
  const p = JSON.parse(fs.readFileSync(plan, 'utf8')).find(x => x.id === id)

  if (!p) throw new Error(`fixture ${k}: no existe ${id} en ${rel}`)

  return { ...structuredClone(p), plate: path.resolve(path.dirname(plan), p.plate) }
}

// La misma pieza, ajustada al canon del tramo 4: zona segura de AXIS, CTA en la columna y firma de 20 % del lado corto
// en una Y que se lea (`logo.y: "auto"`). Es lo que un plan nuevo declara para pasar el gate.
const canon = k => {
  const p = pieza(k)

  p.safeArea = 'axis'
  p.cta.x = 'columna'
  if (p.note) p.note.x = 'columna'
  p.logo = { ...(p.logo ?? {}), width: 0.2, x: 0.5, y: 'auto' }

  return p
}

async function componer(nombre, piezas, ids = [], env = {}) {
  const dir = path.join(TMP, nombre)
  const planPath = path.join(dir, 'piezas.json')

  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(planPath, JSON.stringify(piezas, null, 2))

  try {
    const r = await run(process.execPath, [COMPOSITOR, planPath, ...ids], { cwd: ROOT, timeout: 20 * 60e3, maxBuffer: 64e6, env: { ...process.env, ...env } })
    // QA por plan (`qa-<plan>.json`) desde 2026-09-23: una corrida parcial lo fusiona con el que ya había.
    const qaFile = path.join(dir, 'out', 'qa-piezas.json')

    return { ok: true, dir, planPath, salida: r.stdout + r.stderr, qa: JSON.parse(fs.readFileSync(qaFile, 'utf8')) }
  } catch (e) {
    const texto = String(e.stderr ?? '') + String(e.stdout ?? '')

    return { ok: false, dir, planPath, salida: texto, error: (texto.match(/Error: ([^\n]+)/) ?? [null, String(e.message).split('\n')[0]])[1] }
  }
}

async function gate(planPath, extra = []) {
  try {
    const r = await run(process.execPath, [GATE, planPath, '--comando', COMPOSITOR, ...extra], { cwd: ROOT, maxBuffer: 16e6, timeout: 20 * 60e3 })

    return { code: 0, salida: r.stdout + r.stderr }
  } catch (e) {
    return { code: e.code ?? 1, salida: String(e.stdout ?? '') + String(e.stderr ?? '') }
  }
}

const leerMascara = async plate => {
  const f = path.join(MASCARAS, `${sha(fs.readFileSync(plate))}.png`)
  const { data, info } = await sharp(f).extractChannel(0).raw().toBuffer({ resolveWithObject: true })

  return { data, W: info.width, H: info.height }
}

// Distancia euclidiana mínima de una caja a la silueta (px del lienzo). Oráculo independiente del compositor.
function distanciaAlSujeto(m, caja, canvasW, canvasH, radio) {
  const sx = m.W / canvasW, sy = m.H / canvasH
  let min = Infinity

  for (let y = Math.max(0, Math.floor((caja.top - radio) * sy)); y < Math.min(m.H, Math.ceil((caja.bottom + radio) * sy)); y++) {
    for (let x = Math.max(0, Math.floor((caja.left - radio) * sx)); x < Math.min(m.W, Math.ceil((caja.right + radio) * sx)); x++) {
      if (m.data[y * m.W + x] <= 127) continue
      const X = (x + 0.5) / sx, Y = (y + 0.5) / sy
      const d = Math.hypot(Math.max(caja.left - X, 0, X - caja.right), Math.max(caja.top - Y, 0, Y - caja.bottom))

      if (d < min) min = d
    }
  }

  return min
}

const TEXTO = new Set(['etiqueta', 'entrada', 'dominante', 'cierre-frase', 'nota', 'cta', 'descriptor'])
const leer = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8'))

// Oráculo de cortes, independiente del compositor: palabras cortas que no cierran línea en español.
const DEBILES = new Set(['a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'mi', 'mis', 'ni', 'o', 'para', 'por', 'que', 'se', 'sin', 'su', 'sus', 'tu', 'tus', 'u', 'un', 'una', 'unas', 'unos', 'y'])
const palabras = l => l.split(/\s+/).filter(Boolean)
const limpia = w => w.toLowerCase().replace(/[^\p{L}]/gu, '')

const defectosCorte = lineas => {
  const d = []

  if (lineas.length < 2) return d
  lineas.slice(0, -1).forEach((l, i) => { if (DEBILES.has(limpia(palabras(l).at(-1)))) d.push(`línea ${i + 1} termina en «${palabras(l).at(-1)}»`) })
  if (palabras(lineas.at(-1)).length === 1 && lineas.flatMap(palabras).length >= 3) d.push(`viuda: «${lineas.at(-1)}»`)

  return d
}

const plano = t => String(t ?? '').replace(/\*\*|\[\[|\]\]/g, '').replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim()

// ── Las 10 pruebas ─────────────────────────────────────────────────────────────────────────────────
let harness = null
const crecidas = {}

const PRUEBAS = [
  {
    id: 'P01', nombre: 'Determinismo: la misma pieza compuesta dos veces es idéntica al píxel',
    async correr() {
      const [a, b] = await Promise.all([componer('P01-a', [pieza('mo2_916')]), componer('P01-b', [pieza('mo2_916')])])

      if (!a.ok || !b.ok) return { ok: false, detalle: `no compuso: ${a.error ?? b.error}` }
      const png = d => sha(fs.readFileSync(path.join(d, 'out', 'mo2-no-te-citan-916.png')))
      const iguales = { png: png(a.dir) === png(b.dir), layout: JSON.stringify(leer(a.dir, 'mo2-no-te-citan-916-layout.json')) === JSON.stringify(leer(b.dir, 'mo2-no-te-citan-916-layout.json')), qa: JSON.stringify(a.qa) === JSON.stringify(b.qa) }

      return { ok: Object.values(iguales).every(Boolean), detalle: `png ${iguales.png} · layout ${iguales.layout} · qa ${iguales.qa} (sha ${png(a.dir).slice(0, 12)})` }
    }
  },
  {
    id: 'P02', nombre: `No regresión: todas las piezas con CTA del repo contra ${REF}`,
    async correr() {
      // El ARNÉS también se prueba (tramo 5; auditoría 2026-09-23, hallazgo 13): una red de seguridad con agujeros da
      // verde sin mirar. Cuatro casos hechos a propósito, cada uno con lo que el arnés tiene que decir.
      const arnes = async (extra, env = {}) => run(process.execPath, [REGRESION, ...extra], { cwd: ROOT, timeout: 30 * 60e3, maxBuffer: 64e6, env: { ...process.env, ...env } }).then(r => ({ code: 0, salida: r.stdout + r.stderr }), e => ({ code: e.code ?? 1, salida: String(e.stdout ?? '') + String(e.stderr ?? '') }))
      const vacio = await arnes(['--solo', 'zzz-ningun-plan-se-llama-asi'])
      const PLAN_CHICO = '2026-09-21_registro-c-respuesta/piezas-cta.json'
      const coberturaFalsa = path.join(TMP, 'P02-cobertura.json')

      fs.writeFileSync(coberturaFalsa, JSON.stringify({ piezas: [`ai-generations/${PLAN_CHICO}#pieza-que-ya-no-esta`] }))
      // Un candidato que sólo agrega un aviso: el píxel no cambia, así que sólo la comparación de avisos lo ve.
      const candidatoAviso = path.join(ROOT, `scripts/foto/.componer-cta@p02-aviso-${process.pid}.regresion.mjs`)

      fs.writeFileSync(candidatoAviso, fs.readFileSync(COMPOSITOR, 'utf8').replace('async function composePiece(s, opts = {}) {', "async function composePiece(s, opts = {}) {\n  if (!opts.dry) console.warn(`  ⚠ ${s.id}: aviso de prueba del arnés`)"))
      const conAviso = await arnes(['--solo', PLAN_CHICO, '--candidato', candidatoAviso, '--cobertura', coberturaFalsa])

      fs.rmSync(candidatoAviso, { force: true })
      const hermetica = await run(process.execPath, ['--test', 'scripts/foto/regresion-ref.test.mjs'], { cwd: ROOT }).then(() => true, () => false)

      const arnesOk = {
        'vacío falla': vacio.code !== 0 && /0 piezas que verificar/.test(vacio.salida),
        'pieza faltante de la cobertura falla': conAviso.code !== 0 && /Faltan piezas del manifiesto de COBERTURA/.test(conAviso.salida),
        'un aviso nuevo es una diferencia': conAviso.code !== 0 && /Cambian los AVISOS/.test(conAviso.salida) && /aviso de prueba del arnés/.test(conAviso.salida),
        'referencia hermética': hermetica
      }

      const detalleArnes = Object.entries(arnesOk).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join(' · ')

      if (P02_RAPIDO) return { ok: Object.values(arnesOk).every(Boolean), detalle: `arnés: ${detalleArnes} (sin la regresión completa: --p02-rapido)` }

      try {
        // `--conservar`: P08 y P09 leen las 86 piezas que deja la regresión; la suite borra esa carpeta al final.
        const r = await run(process.execPath, [REGRESION, '--ref', REF, '--candidato', COMPOSITOR, '--conservar'], { cwd: ROOT, timeout: 60 * 60e3, maxBuffer: 64e6 })

        harness = r.stdout.match(/Reporte: (\S+)/)?.[1]

        return { ok: Object.values(arnesOk).every(Boolean), detalle: `${r.stdout.split('\n').filter(l => /^Iguales|^🔵|^ℹ️/.test(l)).join(' · ')} · arnés: ${detalleArnes}`, evidencia: harness }
      } catch (e) {
        harness = String(e.stdout).match(/Reporte: (\S+)/)?.[1]

        return { ok: false, detalle: `${String(e.stdout).split('\n').filter(l => /^Iguales|^🔴|^🟠|^🟡|^🟣|^⚪|^⛔/.test(l)).join(' · ')} · arnés: ${detalleArnes}`, evidencia: harness }
      }
    }
  },
  {
    id: 'P03', nombre: 'Guarda de sujeto: el texto nunca toca a una persona',
    async correr() {
      const encima = pieza('rec_916')

      encima.top = 0.3
      const [kv07, movida, sana] = await Promise.all([componer('P03-kv07', [pieza('kv07_916')]), componer('P03-encima', [encima]), componer('P03-sana', [pieza('rec_916')])])
      const tapa = r => !r.ok && /tapa al sujeto/.test(r.error)

      // Una pieza que aborta no deja archivos suyos (antes quedaban el layout, el SVG de controles y la evidencia).
      const rastro = fs.existsSync(path.join(movida.dir, 'out')) ? fs.readdirSync(path.join(movida.dir, 'out'), { recursive: true }).filter(f => String(f).includes(encima.id)) : []

      // Caché envenenada: una máscara en negro del MISMO tamaño en una caché aislada. El compositor debe verificar la
      // huella de la entrada, regenerarla y abortar igual; confiar en la caché dejaría el texto sobre la persona.
      const cacheAislada = path.join(TMP, 'P03-cache')
      const shaPlate = sha(fs.readFileSync(encima.plate))

      fs.mkdirSync(cacheAislada, { recursive: true })
      for (const ext of ['png', 'json']) if (fs.existsSync(path.join(MASCARAS, `${shaPlate}.${ext}`))) fs.copyFileSync(path.join(MASCARAS, `${shaPlate}.${ext}`), path.join(cacheAislada, `${shaPlate}.${ext}`))
      const { width: mw, height: mh } = await sharp(encima.plate).metadata()

      fs.writeFileSync(path.join(cacheAislada, `${shaPlate}.png`), await sharp({ create: { width: mw, height: mh, channels: 3, background: '#000' } }).extractChannel(0).png().toBuffer())
      const envenenada = await componer('P03-envenenada', [encima], [], { FOTO_MASCARAS_DIR: cacheAislada })

      const ok = tapa(kv07) && tapa(movida) && sana.ok && !rastro.length && tapa(envenenada)

      return { ok, detalle: `KV-07-916 aborta: ${tapa(kv07)} (${kv07.error?.slice(0, 90)}) · texto movido sobre la persona aborta: ${tapa(movida)} (${movida.error?.slice(0, 90)}) · sin archivos tras abortar: ${!rastro.length}${rastro.length ? ` (${rastro.join(', ')})` : ''} · con la caché envenenada también aborta: ${tapa(envenenada)} · original compone: ${sana.ok}` }
    }
  },
  {
    id: 'P04', nombre: 'Crecer respira: el texto crecido queda a ≥ 3,5 % del sujeto (medición independiente)',
    async correr() {
      const claves = ['mo2_916', 'mo1_169', 'rec_916', 'ele_169', 'fue_916']
      const rs = await Promise.all(claves.map(k => componer(`P04-${k}`, [pieza(k)])))
      const filas = []
      let ok = true

      for (const [i, r] of rs.entries()) {
        if (!r.ok) { ok = false; filas.push(`${claves[i]} no compuso: ${r.error}`); continue }
        const p = pieza(claves[i])
        const q = r.qa[0]
        const L = leer(r.dir, `${p.id}-layout.json`)
        const E = leer(r.dir, `${p.id}-cta-evidence.json`)
        const W = L.canvas.width, H = L.canvas.height
        const m = await leerMascara(p.plate)
        const cajas = [...L.elements.filter(e => TEXTO.has(e.id)), { id: 'boton', box: E.surface }]
        const d = Math.min(...cajas.map(c => distanciaAlSujeto(m, c.box, W, H, Math.min(W, H) * 0.1)))
        const exigido = Math.min(W, H) * 0.035 - 1

        crecidas[claves[i]] = { dir: r.dir, id: p.id, qa: q }
        const bien = q.escala <= 1 || d >= exigido

        ok &&= bien
        filas.push(`${p.id} ×${q.escala.toFixed(2)} → ${Number.isFinite(d) ? `${((d / Math.min(W, H)) * 100).toFixed(2)} %` : 'sin sujeto cerca'} ${bien ? '✓' : '✗'}`)
      }

      // Una prueba de crecimiento donde nada crece no prueba nada (auditor adversarial, 2026-09-23): con la
      // segmentación rota, las piezas quedan a ×1 y la prueba pasaba de oficio.
      const crecieron = Object.values(crecidas).filter(c => c.qa.escala > 1).length

      if (crecieron < 3) { ok = false; filas.push(`sólo ${crecieron} pieza(s) crecieron: la prueba no tiene qué medir`) }

      return { ok, detalle: filas.join(' · ') }
    }
  },
  {
    id: 'P05', nombre: 'Crecer no degrada el contraste de ninguna voz',
    async correr() {
      const filas = []
      let ok = true

      for (const [k, c] of Object.entries(crecidas)) {
        const fija = { ...pieza(k), textGrowth: false }
        const r = await componer(`P05-${k}`, [fija])

        if (!r.ok) { ok = false; filas.push(`${k} fija no compuso: ${r.error}`); continue }
        const base = r.qa[0].contraste
        // Techo por tipo (contrato AXIS): texto 4,5:1; un LÍMITE no textual —el relleno del CTA contra la escena— 3:1.
        const techo = v => (/superficie|relleno|borde/.test(v) ? 3 : 4.5)
        const peores = Object.entries(base).filter(([v, x]) => (c.qa.contraste[v] ?? 0) < Math.min(x, techo(v)) - 0.05)
        const fijaEsUno = r.qa[0].escala === 1
        // Tramo 2: el TRAZO de cada voz, con margen — umbral × 1,1 o lo que ya tenía a ×1 (menos 0,05 de ruido).
        const trazoBase = Object.entries(r.qa[0].accesibilidad?.voces ?? {}).filter(([, m]) => m?.glifo)
        const trazoPeor = trazoBase.filter(([v, m]) => (c.qa.accesibilidad?.voces?.[v]?.glifo?.wcag ?? 0) < Math.min(m.glifo.wcag - 0.05, m.glifo.umbralWcag * 1.1) - 0.01)

        ok &&= !peores.length && fijaEsUno && trazoBase.length > 0 && !trazoPeor.length
        filas.push(`${c.id} ×${c.qa.escala.toFixed(2)}: ${peores.length || trazoPeor.length ? `✗ ${[...peores.map(([v, x]) => `${v} ${x}→${c.qa.contraste[v]}`), ...trazoPeor.map(([v, m]) => `trazo ${v} ${m.glifo.wcag}→${c.qa.accesibilidad.voces[v].glifo.wcag}`)].join(', ')}` : '✓'}${fijaEsUno ? '' : ' (textGrowth:false no congeló)'}${trazoBase.length ? '' : ' (sin medición del trazo)'}`)
      }

      if (!Object.keys(crecidas).length) return { ok: false, detalle: 'depende de P04' }

      // Una pieza donde el PISO DEL TRAZO es el que frena (hallazgo 16; visto por la puntuación de mutantes el
      // 2026-09-23): desde el tramo 3, a 01-fuera-916 la frena antes su reserva editorial, y un mutante sin el piso del
      // trazo pasaba. Sin la reserva, el trazo vuelve a ser el freno: crecida y fija se comparan con la misma regla.
      const libre = pieza('fue_916')

      delete libre.editorialReserve
      const [crecidaLibre, fijaLibre] = await Promise.all([componer('P05-fue-libre', [libre]), componer('P05-fue-libre-fija', [{ ...structuredClone(libre), textGrowth: false }])])

      if (!crecidaLibre.ok || !fijaLibre.ok) {
        ok = false
        filas.push(`01-fuera-916 sin reserva no compuso: ${crecidaLibre.error ?? fijaLibre.error}`)
      } else {
        const base = Object.entries(fijaLibre.qa[0].accesibilidad.voces).filter(([, m]) => m?.glifo)
        const vc = crecidaLibre.qa[0].accesibilidad.voces
        const peor = base.filter(([v, m]) => (vc[v]?.glifo?.wcag ?? 0) < Math.min(m.glifo.wcag - 0.05, m.glifo.umbralWcag * 1.1) - 0.01)

        ok &&= base.length > 0 && !peor.length && crecidaLibre.qa[0].escala > 1
        filas.push(`01-fuera-916 sin reserva ×${crecidaLibre.qa[0].escala.toFixed(2)}: ${peor.length ? `✗ ${peor.map(([v, m]) => `trazo ${v} ${m.glifo.wcag}→${vc[v]?.glifo?.wcag}`).join(', ')}` : '✓'}`)
      }

      return { ok, detalle: filas.join(' · ') }
    }
  },
  {
    id: 'P06', nombre: 'Zona segura declarada y eje del bloque',
    async correr() {
      // Sin P04 (corrida parcial), P06 compone su propia pieza crecida: una prueba no depende del orden de otra.
      let rec = crecidas.rec_916

      if (!rec) {
        const r = await componer('P06-rec', [pieza('rec_916')])

        rec = r.ok ? { dir: r.dir, id: r.qa[0].id, qa: r.qa[0] } : null
      }

      let dentro = false
      let detalleA = 'no compuso 02-reconoces-916'

      if (rec) {
        const p = pieza('rec_916')
        const L = leer(rec.dir, `${p.id}-layout.json`)
        const E = leer(rec.dir, `${p.id}-cta-evidence.json`)
        const W = L.canvas.width, H = L.canvas.height, a = p.safeArea
        const cajas = [...L.elements.filter(e => TEXTO.has(e.id)).map(e => e.box), E.surface, ...E.geometry.cursorEvidence.map(c => c.bounds)]
        const fuera = cajas.filter(b => b.left < a.x0 * W - 0.5 || b.right > a.x1 * W + 0.5 || b.top < a.y0 * H - 0.5 || b.bottom > a.y1 * H + 0.5)

        dentro = !fuera.length
        detalleA = `02-reconoces-916 ×${rec.qa.escala.toFixed(2)} dentro de su safeArea: ${dentro}`
      }

      const izquierda = pieza('ref_916')

      Object.assign(izquierda, { align: 'left' })
      delete izquierda.centerX
      Object.assign(izquierda.cta, { align: 'left', x: 0.08 })

      const conIA = anc => {
        const p = pieza('mo2_916')

        p.textGrowth = false
        p.cta.seleccion = { cursores: [{ id: 'usuario', kind: 'local', anchor: 'end-center' }, { id: 'ia', kind: 'collaborator', anchor: anc, label: 'IA', who: 'role' }] }

        return p
      }

      // Zona protegida (tramo 2): un objeto de la escena que el texto no puede tapar aunque no sea una persona.
      const protegida = pieza('mo2_916')

      protegida.textGrowth = false
      protegida.protect = [{ box: [0, 0, 1, 0.5], reason: 'prueba: toda la mitad superior protegida' }]

      // Tramo 3: invariantes de maquetación compartidas por búsqueda, composición y gate.
      const firmaEncima = pieza('mo2_916')

      firmaEncima.textGrowth = false
      firmaEncima.logo = { ...firmaEncima.logo, y: firmaEncima.top ?? 0.05 }
      // Firma EXTERNA declarada sobre el texto: el compositor la reserva y aborta (la pondría otra herramienta encima).
      const externaEncima = pieza('mo2_916')

      externaEncima.textGrowth = false
      delete externaEncima.logo
      externaEncima.firma = { modo: 'externa', razon: 'prueba: la firma la pone firmar.mjs', y: 0.25 }
      const reservaChica = pieza('mo2_916')

      reservaChica.textGrowth = false
      reservaChica.editorialReserve = { maxBottom: 200, maxRight: 900 }

      const enCanon = await componer('P06-canon', [canon('b2_916')])
      // Con "axis" el texto también arranca dentro de la zona por arriba: p1-cta-contorno declara top 0,05 y feed pide 6 %.
      const arriba = await componer('P06-axis-arriba', [canon('p1_45')])
      let respetaArriba = false

      if (arriba.ok) {
        const La = leer(arriba.dir, 'p1-cta-contorno-layout.json')

        respetaArriba = Math.min(...La.maquetacion.elementos.filter(e => e.tipo !== 'firma').map(e => e.box.top)) >= 0.06 * La.canvas.height - 0.5
      }

      // La zona declarada como freno: mo1-canal-nuevo-169 crece ×1,6 sin sujeto cerca; con el borde derecho de la zona a
      // 5 % del ancho de su texto a ×1, sólo la zona puede detener el crecimiento.
      const fija = { ...pieza('mo1_169'), textGrowth: false }
      const rFija = await componer('P06-zona-base', [fija])
      let zonaFrena = false
      let detalleZona = 'no compuso la base'

      if (rFija.ok) {
        const Lf = leer(rFija.dir, `${fija.id}-layout.json`)
        const derecha = Math.max(...Lf.elements.filter(e => TEXTO.has(e.id)).map(e => e.box.right))
        const x1 = +(derecha / Lf.canvas.width + 0.05).toFixed(3)
        const acotada = { ...pieza('mo1_169'), safeArea: { x0: 0.05, y0: 0.04, x1, y1: 0.96 } }
        const rZona = await componer('P06-zona-frena', [acotada])

        if (rZona.ok) {
          const Lz = leer(rZona.dir, `${acotada.id}-layout.json`)
          const derechaZ = Math.max(...Lz.elements.filter(e => TEXTO.has(e.id)).map(e => e.box.right))

          zonaFrena = rZona.qa[0].escala > 1 && rZona.qa[0].escala < 1.5 && derechaZ <= x1 * Lz.canvas.width + 0.5
          detalleZona = `×${rZona.qa[0].escala.toFixed(2)}, texto hasta ${(derechaZ / Lz.canvas.width).toFixed(3)} con la zona en ${x1}`
        } else detalleZona = rZona.error
      }

      let zonaAxis = false
      let enColumna = false
      let firmaAuto = false

      if (enCanon.ok) {
        const p = canon('b2_916')
        const L = leer(enCanon.dir, `${p.id}-layout.json`)
        const q = enCanon.qa[0]
        const W = L.canvas.width, H = L.canvas.height
        // Medición propia: story de AXIS = 10 % a los lados y 13 % arriba y abajo.
        const dentro = b => b.left >= 0.1 * W - 0.5 && b.right <= 0.9 * W + 0.5 && b.top >= 0.13 * H - 0.5 && b.bottom <= 0.87 * H + 0.5
        const cajas = L.maquetacion.elementos.filter(e => e.tipo !== 'acento')

        zonaAxis = cajas.length > 0 && cajas.every(e => dentro(e.box))
        const boton = cajas.find(e => e.id === 'cta-boton')?.box
        const desc = cajas.find(e => e.id === 'descriptor')?.box

        enColumna = Boolean(boton && desc) && Math.abs(boton.left - L.columna) <= 1 && Math.abs(desc.left - L.columna) <= 1
        const logo = cajas.find(e => e.id === 'logo')?.box

        // Tramo 6: debajo de todo lo compuesto, y con el trazo medido ≥ 4,5:1 (no sólo la caja).
        const contenido = Math.max(...cajas.filter(e => e.tipo !== 'firma').map(e => e.box.bottom))

        firmaAuto = q.firma?.auto === true && q.firma.encontrada === true && Boolean(logo) && dentro(logo) && logo.top >= contenido && q.contraste.logo >= 4.5 && q.firma.trazo?.cumpleWcag === true && Math.abs(q.firma.anchoLadoCorto - 0.2) <= 0.005
      }

      // KV-06-169 al canon: la búsqueda subía hasta encima del titular (auditoría de diseño, N1). Ahora la firma queda en
      // la banda del pie o no se encuentra (y entonces el gate la mide al pie); nunca por encima del contenido.
      const kv06 = await componer('P06-firma-banda', [canon('kv06_169')])
      let firmaEnBanda = false
      let detalleBanda = kv06.ok ? '' : kv06.error

      if (kv06.ok) {
        const L = leer(kv06.dir, 'KV-06-169-layout.json')
        const logo = L.maquetacion.elementos.find(e => e.id === 'logo')?.box
        const contenido = Math.max(...L.maquetacion.elementos.filter(e => e.tipo !== 'firma' && e.tipo !== 'acento').map(e => e.box.bottom))

        firmaEnBanda = Boolean(logo) && logo.top >= contenido
        detalleBanda = `firma en ${logo ? Math.round(logo.top) : '—'} px, contenido hasta ${Math.round(contenido)} px, encontrada ${kv06.qa[0].firma?.encontrada}`
      }

      const [original, alineada, choca, cabe, tapaZona, firmaSobre, fueraReserva, v03, externaSobre] = await Promise.all([componer('P06-eje', [pieza('ref_916')]), componer('P06-izquierda', [izquierda]), componer('P06-choque', [conIA('top-end')]), componer('P06-cabe', [conIA('bottom-end')]), componer('P06-protect', [protegida]), componer('P06-firma', [firmaEncima]), componer('P06-reserva', [reservaChica]), componer('P06-v03', [pieza('v03_fue')]), componer('P06-firma-externa', [externaEncima])])
      const protegeZona = !tapaZona.ok && /zona protegida/.test(tapaZona.error)
      const firmaRechazada = !firmaSobre.ok && /choca con «logo»|«logo» choca/.test(firmaSobre.error)
      const externaRechazada = !externaSobre.ok && /choca con «firma-externa»|«firma-externa» choca/.test(externaSobre.error)
      // La reserva no aborta la composición (hay piezas aprobadas con reservas que nadie verificaba): la bloquea el gate.
      const gReserva = fueraReserva.ok ? await gate(fueraReserva.planPath) : { code: -1, salida: fueraReserva.error }
      const reservaRechazada = gReserva.code !== 0 && /fuera de la reserva editorial/.test(gReserva.salida)
      let dentroReserva = false

      if (v03.ok) {
        // Medición independiente: todo lo dibujado (menos la firma) dentro de la reserva que declara el plan.
        const p = pieza('v03_fue')
        const L = leer(v03.dir, `${p.id}-layout.json`)
        const dibujado = L.maquetacion.elementos.filter(e => e.tipo !== 'firma')

        dentroReserva = dibujado.length > 0 && Math.max(...dibujado.map(e => e.box.right)) <= p.editorialReserve.maxRight + 0.5 && Math.max(...dibujado.map(e => e.box.bottom)) <= p.editorialReserve.maxBottom + 0.5
      }

      const choqueRechazado = !choca.ok && /tapa «nota»/.test(choca.error)
      const ejeRechazado = !original.ok && /eje corrido/.test(original.error)
      let margen = false

      if (alineada.ok) {
        const L = leer(alineada.dir, '03-referencia-916-layout.json')

        margen = Math.min(...L.elements.filter(e => TEXTO.has(e.id)).map(e => e.box.left)) >= izquierda.safeArea.x0 * L.canvas.width - 0.5
      }

      return { ok: dentro && ejeRechazado && alineada.ok && margen && choqueRechazado && cabe.ok && protegeZona && firmaRechazada && reservaRechazada && dentroReserva && zonaAxis && enColumna && firmaAuto && zonaFrena && externaRechazada && respetaArriba && firmaEnBanda, detalle: `la firma automática nunca sube por encima del contenido (KV-06-169): ${firmaEnBanda} (${detalleBanda}) · con "axis" el texto arranca dentro de la zona por arriba: ${respetaArriba}${arriba.ok ? '' : ` (${arriba.error})`} · firma externa sobre el texto rechazada: ${externaRechazada} · crecimiento frenado por la zona declarada: ${zonaFrena} (${detalleZona}) · zona de AXIS con safeArea "axis": ${zonaAxis}${enCanon.ok ? '' : ` (${enCanon.error})`} · CTA y descriptor en la columna: ${enColumna} · firma automática 20 % legible dentro de la zona: ${firmaAuto} · ${detalleA} · centrado en eje 0,29 rechazado: ${ejeRechazado} · alineado a la izquierda compone: ${alineada.ok} y arranca dentro del 8 %: ${margen} · colaborador sobre la nota rechazado: ${choqueRechazado} · en otra esquina compone: ${cabe.ok} · texto sobre zona protegida rechazado: ${protegeZona} · firma sobre el texto rechazada: ${firmaRechazada} · texto fuera de la reserva editorial rechazado: ${reservaRechazada} · v03 01-fuera-916 compone dentro de su reserva: ${dentroReserva}${v03.ok ? '' : ` (${v03.error})`}` }
    }
  },
  {
    id: 'P07', nombre: 'Validación: un plan mal escrito falla ANTES de componer, nombrando pieza y campo',
    async correr() {
      const base = () => pieza('p1_45')
      const sinFont = base()
      const token = base()
      const final = base()
      const muda = base()
      const plate = base()
      const ignorar = base()
      const extra = base()
      const ancla = base()
      const prom = base()

      delete sinFont.cta.fontSize
      token.cta.surfaceToken = 'accentSurfce'
      final.final = [1080, 1080]
      delete muda.dominant
      delete muda.lead
      delete muda.label
      plate.plate = path.join(ROOT, 'no/existe.png')
      ignorar.subjectGuard = { ignore: [{ box: [0, 0, 0.1, 0.1] }] }
      extra.colorFondo = '#000'
      ancla.cta.seleccion = { cursores: [{ id: 'ia', kind: 'collaborator', anchor: 'end-center', label: 'IA', who: 'role' }] }
      Object.assign(prom.cta, { variant: 'auto', prominencia: 'enorme' })
      // Tramo 1 de la certificación (2026-09-23): el id es parte de rutas de archivo; una guarda no se apaga entera
      // ni sin nombre de quien lo aprobó; un nulo no es un valor.
      const idMalo = base()
      const ignorarTodo = base()
      const sinAprobador = base()
      const nulo = base()

      idMalo.id = '../fuera'
      ignorarTodo.subjectGuard = { ignore: [{ box: [0, 0, 1, 1], reason: 'no hay sujeto en esta foto', aprobadoPor: 'prueba' }] }
      sinAprobador.subjectGuard = { ignore: [{ box: [0, 0, 0.05, 0.05], reason: 'afiche del fondo detectado' }] }
      nulo.cta.fontSize = null
      // Tramo 3: un carácter que la fuente no tiene saldría como un cuadro vacío.
      const emoji = base()
      const hebreo = base()

      emoji.cta.text = 'Hablemos 🚀'
      hebreo.lead = 'שלום a todos'

      const casos = [
        ['falta cta.fontSize', [sinFont], [], /falta `cta\.fontSize`/],
        ['ids repetidos', [base(), base()], [], /ids repetidos/],
        ['id pedido inexistente', [base()], ['no-existe'], /no están en el plan: no-existe/],
        ['token de color inexistente', [token], [], /`cta\.surfaceToken` debe ser uno de/],
        ['final con otra proporción', [final], [], /no tiene la proporción/],
        ['pieza muda', [muda], [], /pieza muda/],
        ['plate inexistente', [plate], [], /no existe el plate/],
        ['zona ignorada sin razón', [ignorar], [], /reason/],
        ['colaborador anclado fuera de una esquina (regla AXIS)', [ancla], [], /collaborator-anchor-not-corner/],
        ['prominencia inexistente', [prom], [], /prominencia/],
        ['id con ruta (../)', [idMalo], [], /`id`: sólo letras/],
        ['guarda de sujeto apagada entera', [ignorarTodo], [], /una guarda no se apaga entera/],
        ['zona ignorada sin quien la aprobó', [sinAprobador], [], /aprobadoPor/],
        ['campo obligatorio en null', [nulo], [], /falta `cta\.fontSize`/],
        ['emoji que la fuente no tiene', [emoji], [], /`cta\.text` usa caracteres que su fuente no tiene.*U\+1F680/],
        ['hebreo que la fuente no tiene', [hebreo], [], /`lead` usa caracteres que su fuente no tiene/]
      ]

      const rs = await Promise.all(casos.map(([, piezas, ids], i) => componer(`P07-${i}`, piezas, ids)))

      const filas = casos.map(([n, , , re], i) => {
        const r = rs[i]
        const sinPng = !fs.existsSync(path.join(r.dir, 'out', 'p1-cta-contorno.png'))
        const bien = !r.ok && re.test(r.error) && sinPng

        return { n, bien, error: r.error }
      })

      const aviso = await componer('P07-aviso', [extra])
      const avisa = aviso.ok && /campos que este comando no lee — colorFondo/.test(aviso.salida)

      return { ok: filas.every(f => f.bien) && avisa, detalle: `${filas.map(f => `${f.n} ${f.bien ? '✓' : `✗ (${f.error})`}`).join(' · ')} · campo desconocido avisa y compone: ${avisa}` }
    }
  },
  {
    id: 'P08', nombre: 'Cortes de línea: sin viudas ni líneas que terminan en palabra corta',
    async correr() {
      const fuentes = []

      if (harness) {
        for (const r of JSON.parse(fs.readFileSync(harness, 'utf8')).resultados.filter(x => x.cand === 'compone')) fuentes.push([r.id, JSON.parse(fs.readFileSync(path.join(r.dir, 'cand/out/qa-piezas.json'), 'utf8'))[0]])
      } else {
        for (const c of Object.values(crecidas)) fuentes.push([c.id, c.qa])
      }

      const malos = []

      for (const [id, q] of fuentes) {
        for (const voz of ['entrada', 'cierre', 'nota']) for (const d of defectosCorte(q.lineas?.[voz] ?? [])) malos.push(`${id} ${voz}: ${d}`)
      }

      // Cero piezas revisadas no es un pase (auditor adversarial, 2026-09-23).
      return { ok: fuentes.length > 0 && !malos.length, detalle: `${fuentes.length} piezas revisadas · ${malos.length} defectos${malos.length ? `: ${malos.slice(0, 6).join(' · ')}` : ''}` }
    }
  },
  {
    id: 'P09', nombre: 'Accesibilidad y contraste: WCAG 2.2 AA por voz, límites del CTA, alternativa completa',
    async correr() {
      const fuentes = []
      const claves = ['mo2_916', 'mo1_169', 'fue_916', 'p1_45', 'rec_916']
      // ORÁCULO INDEPENDIENTE (tramo 2; hallazgo 16: P09 se verificaba a sí misma). Con FOTO_EVIDENCIA=1 el compositor
      // deja la capa de texto sola y el fondo sin texto; más abajo se recalcula, con aritmética propia de WCAG, el 1 %
      // peor del trazo de cada voz, y se mide en el PNG final el grosor del borde del contorno.
      const evid = await componer('P09-evidencia', claves.map(pieza), [], { FOTO_EVIDENCIA: '1' })

      if (harness) {
        for (const r of JSON.parse(fs.readFileSync(harness, 'utf8')).resultados.filter(x => x.cand === 'compone')) {
          fuentes.push([r.id, JSON.parse(fs.readFileSync(path.join(r.dir, 'cand/out/qa-piezas.json'), 'utf8'))[0], JSON.parse(fs.readFileSync(path.join(r.dir, 'cand/piezas.json'), 'utf8'))[0]])
        }
      } else if (evid.ok) {
        // Corrida parcial (sin P02): las piezas del set de evidencia hacen de fuente, para que P09 pruebe algo solo.
        for (const q of evid.qa) fuentes.push([q.id, q, claves.map(pieza).find(p => p.id === q.id)])
      }

      const fallas = []
      const incompletas = []
      const conBoton = []
      let avisos = 0

      for (const [id, q, p] of fuentes) {
        const a = q.accesibilidad

        if (!a) { fallas.push(`${id} sin medición`); continue }

        for (const [v, m] of Object.entries(a.voces)) {
          if (m && !m.cumpleWcag) fallas.push(`${id}:${v} ${m.wcag}<${m.umbralWcag}`)
          if (m && (m.cumpleApca === false || m.cumpleDaltonismo === false)) avisos++
        }

        // Sin distinguir mayúsculas: si la descripción de la escena ya dice el texto («…sé la referencia…»), la alternativa
        // no lo repite (tramo 4), y un lector de pantalla lo lee igual en mayúscula o minúscula.
        const alt = a.altText.toLowerCase()
        const faltan = [p.lead, p.dominant, p.after, p.note?.text, p.cta?.text, p.cta?.descriptor].map(plano).filter(t => t && !alt.includes(t.toLowerCase()))

        if (faltan.length) incompletas.push(`${id}: ${faltan.join(' / ')}`)
        if (/Botón:/.test(a.altText) || (p.cta && !/Llamado a la acción/.test(a.altText) && !a.altText.includes(plano(p.cta.text)))) conBoton.push(id)
      }

      // Hallazgos del TRAZO en las piezas del repo: se reportan, no hacen fallar la prueba — son de las piezas, no del
      // comando (el gate las rechaza). Lo que esta prueba exige es que la medición sea correcta.
      const trazos = fuentes.flatMap(([id, q]) => Object.entries(q.accesibilidad?.voces ?? {}).filter(([, m]) => m?.glifo && !m.glifo.cumpleWcag).map(([v, m]) => `${id}:${v} ${m.glifo.wcag}<${m.glifo.umbralWcag}`))

      fs.writeFileSync(path.join(TMP, 'P09-trazos-bajo-umbral.json'), JSON.stringify(trazos, null, 2))


      const lin = c => {
        const v = c / 255

        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }

      const lumO = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
      const razon = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      const desacuerdos = []
      const delgados = []
      let vocesOraculo = 0
      let bordes = 0

      for (const q of evid.ok ? evid.qa : []) {
        const tx = await sharp(path.join(evid.dir, 'out', `${q.id}-texto.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        const fo = await sharp(path.join(evid.dir, 'out', `${q.id}-fondo.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        const ancho = tx.info.width

        for (const [voz, m] of Object.entries(q.accesibilidad.voces)) {
          if (!m?.glifo) continue
          const [l, t, r, b] = m.glifo.caja
          const rs = []

          for (let y = t; y < b; y++) {
            for (let x = l; x < r; x++) {
              const j = (y * ancho + x) * 4

              if (tx.data[j + 3] < 128) continue
              const i = (y * ancho + x) * 3

              rs.push(razon(lumO(tx.data[j], tx.data[j + 1], tx.data[j + 2]), lumO(fo.data[i], fo.data[i + 1], fo.data[i + 2])))
            }
          }

          rs.sort((a, b2) => a - b2)
          const p1 = rs[Math.min(rs.length - 1, Math.floor(rs.length * 0.01))]

          vocesOraculo++
          if (!rs.length || Math.abs(p1 - m.glifo.wcag) > 0.011) desacuerdos.push(`${q.id}:${voz} QA ${m.glifo.wcag} · oráculo ${p1?.toFixed(3)}`)
        }

        if (!q.accesibilidad.voces['cta-borde']) continue
        // Grosor del borde en el PNG final: filas cuyo color está a menos de 60 del color del borde, en el centro del
        // tramo superior. Se lleva a CSS px de un teléfono de 390 px de ancho.
        const E = leer(evid.dir, `${q.id}-cta-evidence.json`)
        const L = leer(evid.dir, `${q.id}-layout.json`)
        const png = await sharp(path.join(evid.dir, 'out', `${q.id}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        const k = png.info.width / L.canvas.width
        const [br, bg, bb] = [1, 3, 5].map(i => parseInt(E.colors.surface.slice(i, i + 2), 16))
        const cx = Math.round(((E.surface.left + E.surface.right) / 2) * k)
        let filas = 0

        for (let y = Math.floor((E.surface.top - 12) * k); y <= Math.ceil((E.surface.top + 12) * k); y++) {
          const i = (y * png.info.width + cx) * 3

          if (Math.max(Math.abs(png.data[i] - br), Math.abs(png.data[i + 1] - bg), Math.abs(png.data[i + 2] - bb)) <= 60) filas++
        }

        const css = (filas * 390) / png.info.width

        bordes++
        if (css < 0.95 || !q.accesibilidad.voces['cta-borde'].anillo) delgados.push(`${q.id} ${css.toFixed(2)} CSS px${q.accesibilidad.voces['cta-borde'].anillo ? '' : ' (sin anillo en el QA)'}`)
      }

      // Las pruebas unitarias de los módulos puros (WCAG, APCA, Machado, variantes) también son parte de esta prueba.
      const unitarias = await run(process.execPath, ['--test', 'scripts/foto/accesibilidad.test.mjs', 'scripts/foto/cta-variantes.test.mjs', 'scripts/foto/cta-invariantes.test.mjs', 'scripts/foto/svg-texto.test.mjs'], { cwd: ROOT }).then(() => true, () => false)

      // Y la herramienta de reporte corre sobre un plan compuesto y deja las vistas de daltonismo.
      // El plan de P04 si corrió; si no, el del set de evidencia (que también trae mo2-no-te-citan-916).
      const dirReporte = crecidas.mo2_916?.dir ?? (evid.ok ? evid.dir : null)
      const plan = dirReporte && path.join(dirReporte, 'piezas.json')
      let reporte = false

      if (plan) {
        await run(process.execPath, [REPORTE_A11Y, plan], { cwd: ROOT })
        reporte = fs.existsSync(path.join(dirReporte, 'out/accesibilidad/reporte.md')) && fs.existsSync(path.join(dirReporte, 'out/accesibilidad/mo2-no-te-citan-916-daltonismo.png'))
      }

      return {
        ok: fuentes.length > 0 && !fallas.length && !incompletas.length && !conBoton.length && reporte && evid.ok && vocesOraculo > 0 && !desacuerdos.length && bordes > 0 && !delgados.length && unitarias,
        detalle: `${fuentes.length} piezas · voces bajo WCAG AA: ${fallas.length}${fallas.length ? ` (${fallas.slice(0, 4).join(', ')})` : ''} · alternativas incompletas: ${incompletas.length}${incompletas.length ? ` (${incompletas.slice(0, 3).join('; ')})` : ''} · anuncian «Botón»: ${conBoton.length} · avisos APCA/daltonismo: ${avisos} · reporte y vistas de daltonismo: ${reporte} · oráculo del trazo: ${evid.ok ? `${vocesOraculo} voces, ${desacuerdos.length} desacuerdos${desacuerdos.length ? ` (${desacuerdos.slice(0, 3).join('; ')})` : ''}` : `no compuso (${evid.error})`} · bordes ≥ 1 CSS px: ${bordes - delgados.length}/${bordes}${delgados.length ? ` (${delgados.join(', ')})` : ''} · unitarias: ${unitarias} · piezas del repo con trazo bajo umbral: ${trazos.length}`,
        evidencia: plan && path.join(dirReporte, 'out/accesibilidad/reporte.md')
      }
    }
  },
  {
    id: 'P10', nombre: 'Gate: aprueba lo bueno y rechaza QA incompleto, viejo, CTA sin acento y voz bajo WCAG',
    async correr() {
      const bueno = await componer('P10-bueno', [canon('b2_916'), canon('b2_169')])
      const gBueno = bueno.ok ? await gate(bueno.planPath) : { code: -1, salida: bueno.error }

      // Corrida parcial: recompone una pieza y el QA conserva la otra (antes iba a un `qa-parcial.json` aparte).
      const parcial = bueno.ok ? await run(process.execPath, [COMPOSITOR, bueno.planPath, 'b2-primero-el-numero-916'], { cwd: ROOT, timeout: 20 * 60e3, maxBuffer: 64e6 }).then(() => true, () => false) : false
      const gParcial = parcial ? await gate(bueno.planPath) : { code: -1, salida: 'la corrida parcial no compuso' }

      // Dos planes en la MISMA carpeta: cada uno con su QA; componer el segundo no invalida al primero.
      const dirDos = path.join(TMP, 'P10-dos-planes')

      fs.mkdirSync(dirDos, { recursive: true })
      fs.writeFileSync(path.join(dirDos, 'piezas-a.json'), JSON.stringify([canon('b2_916')], null, 2))
      fs.writeFileSync(path.join(dirDos, 'piezas-b.json'), JSON.stringify([canon('b2_169')], null, 2))
      const dos = await ['piezas-a.json', 'piezas-b.json'].reduce((cadena, f) => cadena.then(ok => ok && run(process.execPath, [COMPOSITOR, path.join(dirDos, f)], { cwd: ROOT, timeout: 20 * 60e3, maxBuffer: 64e6 }).then(() => true, () => false)), Promise.resolve(true))
      const [gDosA, gDosB] = dos ? [await gate(path.join(dirDos, 'piezas-a.json')), await gate(path.join(dirDos, 'piezas-b.json'))] : [{ code: -1 }, { code: -1 }]

      // QA incompleto: se quita una fila.
      const incompleto = await componer('P10-incompleto', [pieza('b2_916'), pieza('b2_169')])

      if (incompleto.ok) fs.writeFileSync(path.join(incompleto.dir, 'out/qa-piezas.json'), JSON.stringify(incompleto.qa.slice(0, 1)))
      const gIncompleto = await gate(incompleto.planPath)

      // HUELLAS (tramo 1, 2026-09-23): el QA vale sólo para el plan, el plate y el PNG que lo produjeron. Se prueba sobre
      // UNA composición, alterando una cosa por vez y restaurándola antes de la siguiente.
      const h = await componer('P10-huellas', [canon('b2_916')])
      const idH = 'b2-primero-el-numero-916'
      const archivo = rel => path.join(h.dir, rel)
      // El QA de la pieza tiene que estar en qa-<plan>.json; sin él, los casos que lo alteran fallan sin reventar.
      const qaPorPlan = fs.existsSync(archivo('out/qa-piezas.json'))

      const conCambio = async (rel, cambiar) => {
        // Si el archivo no está donde debe (p. ej. el QA no quedó en qa-<plan>.json), el caso falla sin reventar la prueba.
        if (!fs.existsSync(archivo(rel))) return { code: -1, salida: `falta ${rel}` }
        const original = fs.readFileSync(archivo(rel))

        cambiar(archivo(rel), original)
        const g = await gate(h.planPath)

        fs.writeFileSync(archivo(rel), original)

        return g
      }

      const futuro = new Date(Date.now() + 60e3)

      fs.utimesSync(h.planPath, futuro, futuro)
      // La FECHA ya no decide: tocar el plan sin cambiar su contenido no invalida el QA.
      const gFecha = await gate(h.planPath)

      const gPlan = await conCambio('piezas.json', (f, o) => {
        const plan = JSON.parse(o)

        plan[0].cta.variantReason = 'cambio posterior a la composición'
        fs.writeFileSync(f, JSON.stringify(plan, null, 2))
      })

      const gPng = await conCambio(`out/${idH}.png`, f => fs.copyFileSync(archivo(`out/preview-390/${idH}.png`), f))

      const editarQa = cambio => conCambio('out/qa-piezas.json', (f, o) => {
        const q = JSON.parse(o)

        cambio(q[0])
        fs.writeFileSync(f, JSON.stringify(q))
      })

      const gSinMascara = await editarQa(r => { r.guardaSujeto = 'sin-mascara' })
      const gNulo = await editarQa(r => { r.accesibilidad.voces.cta = null })
      const gSinHuellas = await editarQa(r => { delete r.huellas })

      const gTrazo = await editarQa(r => {
        const v = Object.values(r.accesibilidad.voces).find(m => m?.glifo)

        Object.assign(v.glifo, { wcag: 2.1, cumpleWcag: false })
      })

      const gSinMetodo = await editarQa(r => { for (const m of Object.values(r.accesibilidad.voces)) if (m) delete m.metodo })

      // Layout alterado CON su huella al día: el gate no confía en el QA, recalcula las invariantes y lo rechaza.
      const layoutRel = `out/${idH}-layout.json`
      let gMaquetacion = { code: -1, salida: 'falta el QA o el layout' }

      if (qaPorPlan && fs.existsSync(archivo(layoutRel))) {
        const layoutOriginal = fs.readFileSync(archivo(layoutRel))
        const qaOriginal = fs.readFileSync(archivo('out/qa-piezas.json'))
        const Lmal = JSON.parse(layoutOriginal)
        const cajaDom = Lmal.maquetacion.elementos.find(e => e.id === 'dominante').box

        Lmal.maquetacion.elementos.push({ id: 'firma-de-prueba', tipo: 'firma', box: { ...cajaDom } })
        const layoutMal = JSON.stringify(Lmal, null, 2)

        fs.writeFileSync(archivo(layoutRel), layoutMal)
        const qaMal = JSON.parse(qaOriginal)

        qaMal[0].huellas.layout = sha(layoutMal)
        fs.writeFileSync(archivo('out/qa-piezas.json'), JSON.stringify(qaMal))
        gMaquetacion = await gate(h.planPath)

        fs.writeFileSync(archivo(layoutRel), layoutOriginal)
        fs.writeFileSync(archivo('out/qa-piezas.json'), qaOriginal)
      }

      // Piso perceptual del CTA (APCA y daltonismo bloquean desde el 2026-09-23): se altera sólo esa medición.
      const gPerceptual = await editarQa(r => {
        Object.assign(r.accesibilidad.voces.cta, { apca: 30, umbralApca: 60, cumpleApca: false })
      })

      const gAnillo = await editarQa(r => {
        const b = r.accesibilidad.voces['cta-borde']

        if (b?.anillo) Object.assign(b.anillo, { wcag: 1.8, cumpleWcag: false })
      })

      // TRAMO 6 · «no certificable» no es un pase (auditoría de arquitectura, N1, N2 y N4): sale con 3, no con 0.
      const gComando = await editarQa(r => { r.huellas.compositor = 'otra-version-del-comando' })
      const gTrazoFirma = await editarQa(r => { Object.assign(r.firma.trazo, { wcag: 2.2, cumpleWcag: false, pctBajoUmbral: 12 }) })
      // La firma automática por encima del contenido: se sube la caja del logo en el layout y se re-firma su huella, para
      // que el gate llegue a la regla (si no, lo frena la huella del layout, que es otra guarda).
      let gFirmaArriba = { code: -1, salida: 'falta el layout' }

      if (fs.existsSync(archivo(`out/${idH}-layout.json`)) && qaPorPlan) {
        const rutaL = archivo(`out/${idH}-layout.json`)
        const rutaQ = archivo('out/qa-piezas.json')
        const [lOrig, qOrig] = [fs.readFileSync(rutaL), fs.readFileSync(rutaQ)]
        const L = JSON.parse(lOrig)
        const logo = L.maquetacion.elementos.find(e => e.id === 'logo')

        if (logo) {
          const alto = logo.box.bottom - logo.box.top

          logo.box.top = 10
          logo.box.bottom = 10 + alto
          const nuevo = JSON.stringify(L, null, 2)
          const q = JSON.parse(qOrig)

          q[0].huellas.layout = sha(Buffer.from(nuevo))
          q[0].firma = { ...q[0].firma, auto: true, encontrada: true }
          fs.writeFileSync(rutaL, nuevo)
          fs.writeFileSync(rutaQ, JSON.stringify(q))
          gFirmaArriba = await gate(h.planPath)
        }

        fs.writeFileSync(rutaL, lOrig)
        fs.writeFileSync(rutaQ, qOrig)
      }

      // Certificación por reproducción: lo entregado idéntico → certifica; un layout alterado → lo rechaza.
      const gReproduce = h.ok ? await gate(h.planPath, ['--reproducir']) : { code: -1, salida: h.error }
      let gReproduceMal = { code: -1, salida: 'falta el layout' }

      if (fs.existsSync(archivo(`out/${idH}-layout.json`))) {
        const rutaL = archivo(`out/${idH}-layout.json`)
        const orig = fs.readFileSync(rutaL)

        fs.writeFileSync(rutaL, Buffer.concat([orig, Buffer.from(' ')]))
        gReproduceMal = await gate(h.planPath, ['--reproducir'])
        fs.writeFileSync(rutaL, orig)
      }

      // Caché de máscaras ajena: la primera composición segmenta (fresca); la segunda lee esa caché (ajena al repo).
      const cacheAjena = path.join(TMP, 'P10-cache-ajena')
      const ajena1 = await componer('P10-cache-ajena-1', [canon('b2_916')], [], { FOTO_MASCARAS_DIR: cacheAjena })
      const ajena2 = await componer('P10-cache-ajena-2', [canon('b2_916')], [], { FOTO_MASCARAS_DIR: cacheAjena })
      const ajenaFresca = ajena1.ok && ajena1.qa[0].mascara?.origen === 'fresca'
      const ajenaCache = ajena2.ok && ajena2.qa[0].mascara?.origen === 'cache-externa'
      const gAjena = ajena2.ok ? await gate(ajena2.planPath) : { code: -1, salida: ajena2.error }
      // Gesto manuscrito: compone, pero no se certifica (decisión del operador 2026-09-23: fuera de alcance).
      const conGesto = canon('b2_916')

      conGesto.gesture = { text: 'mírala', size: 110, x: 0.3, y: 0.66 }
      const rGesto = await componer('P10-gesto', [conGesto])
      const gGesto = rGesto.ok ? await gate(rGesto.planPath) : { code: -1, salida: rGesto.error }

      let gLegado = { code: -1, salida: 'falta out/qa-piezas.json' }

      if (qaPorPlan) {
        fs.renameSync(archivo('out/qa-piezas.json'), archivo('out/qa.json'))
        gLegado = await gate(h.planPath)
        fs.renameSync(archivo('out/qa.json'), archivo('out/qa-piezas.json'))
      }

      // Plate cambiado: una copia del plate, compuesta y alterada después (el real no se toca).
      const conPlate = pieza('b2_916')
      const dirPlate = path.join(TMP, 'P10-plate-origen')

      fs.mkdirSync(dirPlate, { recursive: true })
      const copia = path.join(dirPlate, `plate${path.extname(conPlate.plate)}`)

      fs.copyFileSync(conPlate.plate, copia)
      conPlate.plate = copia
      const plateC = await componer('P10-plate', [conPlate])

      fs.writeFileSync(copia, await sharp(fs.readFileSync(copia)).modulate({ brightness: 1.02 }).toBuffer())
      const gPlate = plateC.ok ? await gate(plateC.planPath) : { code: -1, salida: plateC.error }

      // Dos composiciones en la MISMA carpeta a la vez: una se rechaza (antes se empalmaban, 7 de 8 corridas).
      const dirC = path.join(TMP, 'P10-concurrente')

      fs.mkdirSync(dirC, { recursive: true })
      fs.writeFileSync(path.join(dirC, 'piezas.json'), JSON.stringify([pieza('b2_916')], null, 2))
      const correr = () => run(process.execPath, [COMPOSITOR, path.join(dirC, 'piezas.json')], { cwd: ROOT, timeout: 20 * 60e3, maxBuffer: 64e6 }).then(() => 'ok', e => String(e.stderr ?? '') + String(e.stdout ?? ''))
      const concurrentes = await Promise.all([correr(), correr()])

      // Tramo 4: el canon hecho regla, con excepción auditada.
      const sinFirma = canon('b2_916')
      const firmaChica = canon('b2_916')
      const firmaChicaAuditada = canon('b2_916')
      const sinCierre = canon('b2_916')
      const reducida = canon('b2_916')

      delete sinFirma.logo
      firmaChica.logo.width = 0.1
      firmaChicaAuditada.logo.width = 0.1
      firmaChicaAuditada.excepciones = [{ regla: 'firma-tamano', razon: 'prueba: la marca del partner manda en esta pieza', aprobadoPor: 'prueba' }]
      delete sinCierre.after
      delete reducida.after
      reducida.conceptoReducido = { razon: 'prueba: pieza de recordación de una sola frase' }
      // Firma externa declarada (la pone otra herramienta): el gate la acepta como declaración y mide su contrato.
      const externa = canon('b2_916')

      delete externa.logo
      externa.firma = { modo: 'externa', razon: 'prueba: la firma la pone firmar.mjs', y: 0.9 }
      // La forma que ya usan los planes v05–v07: sólo `signatureY`, sin `firma` ni `logo`.
      const externaLegado = canon('b2_916')

      delete externaLegado.logo
      externaLegado.signatureY = 0.9
      const [rExterna, rLegado] = await Promise.all([componer('P10-firma-externa', [externa]), componer('P10-firma-signatureY', [externaLegado])])
      const gExterna = rExterna.ok ? await gate(rExterna.planPath) : { code: -1, salida: rExterna.error }
      const gLegadoFirma = rLegado.ok ? await gate(rLegado.planPath) : { code: -1, salida: rLegado.error }
      // Y si donde va la firma el fondo no da 4,5:1, el gate lo rechaza (se altera sólo esa medición del QA).
      let gExternaMala = { code: -1, salida: 'no compuso' }

      if (rExterna.ok) {
        const qaExt = path.join(rExterna.dir, 'out/qa-piezas.json')
        const q = JSON.parse(fs.readFileSync(qaExt, 'utf8'))

        q[0].contraste.firmaExterna = 2.1
        fs.writeFileSync(qaExt, JSON.stringify(q))
        gExternaMala = await gate(rExterna.planPath)
      }

      const rs4 = await Promise.all([['P10-sin-firma', sinFirma], ['P10-firma-chica', firmaChica], ['P10-firma-auditada', firmaChicaAuditada], ['P10-sin-cierre', sinCierre], ['P10-reducida', reducida], ['P10-fuera-zona', pieza('b2_916')]].map(([n, p]) => componer(n, [p])))
      const [gSinFirma, gFirmaChica, gFirmaAuditada, gSinCierre, gReducida, gFueraZona] = await Promise.all(rs4.map(r => (r.ok ? gate(r.planPath) : { code: -1, salida: r.error })))

      // 01-fuera-916 al tamaño al que la hacía crecer el compositor anterior (×1.48, medido el 2026-09-23 en P04 sobre
      // 27eb6bc08): la caja de sus voces pasa y el trazo, no (hallazgo 3). El gate tiene que rechazarla.
      const vieja = pieza('fue_916')
      const f = 1.48
      const px = v => (typeof v === 'number' ? Math.round(v * f) : v)

      vieja.textGrowth = false
      if (vieja.lead && vieja.leadSize == null) vieja.leadSize = 70
      if (vieja.after && vieja.afterSize == null) vieja.afterSize = 74
      for (const k of ['leadSize', 'dominantSize', 'afterSize', 'labelSize']) vieja[k] = px(vieja[k])
      if (vieja.note) for (const k of ['size', 'gapAfterClosure']) vieja.note[k] = px(vieja.note[k])
      for (const k of ['fontSize', 'descriptorSize', 'paddingX', 'paddingY', 'radius', 'descriptorGap', 'gapAfterNote']) vieja.cta[k] = px(vieja.cta[k])
      const crecida = await componer('P10-trazo-real', [vieja])
      const gCrecida = crecida.ok ? await gate(crecida.planPath) : { code: -1, salida: crecida.error }

      const sinAcento = await componer('P10-sin-acento', [pieza('ref_169')])
      const gSinAcento = await gate(sinAcento.planPath)

      const oscura = pieza('p1_45')

      oscura.leadFill = '#333333'
      const bajo = await componer('P10-wcag', [oscura])
      const gBajo = await gate(bajo.planPath)

      const firma = await componer('P10-firma', [pieza('mo3_916')])
      const gFirma = await gate(firma.planPath)

      const variantesPlan = await componer('P10-variantes-base', [pieza('b2_916')])
      let hoja = false

      try {
        await run(process.execPath, [COMPOSITOR, variantesPlan.planPath, '--variantes'], { cwd: ROOT, timeout: 20 * 60e3, maxBuffer: 64e6 })
        hoja = fs.existsSync(path.join(variantesPlan.dir, 'out/variantes/b2-primero-el-numero-916.png')) && ['text', 'outline', 'solid'].every(v => fs.existsSync(path.join(variantesPlan.dir, `out/variantes/b2-primero-el-numero-916--${v}.png`)))
      } catch {
        hoja = false
      }

      const auto = pieza('b2_916')

      Object.assign(auto.cta, { variant: 'auto', prominencia: 'discreta' })
      const rAuto = await componer('P10-auto', [auto])
      const eleccion = rAuto.ok ? rAuto.qa[0].ctaVariante : null

      const r = {
        'aprueba el plan bueno': gBueno.code === 0,
        'el QA queda en qa-<plan>.json': qaPorPlan && bueno.ok && fs.existsSync(path.join(bueno.dir, 'out/qa-piezas.json')),
        'rechaza pieza sin firma declarada': gSinFirma.code !== 0 && /no declara firma/.test(gSinFirma.salida),
        'acepta la firma externa declarada y la mide': rExterna.ok && !/no declara firma/.test(gExterna.salida) && typeof rExterna.qa[0].contraste.firmaExterna === 'number',
        'mide el contrato de la firma externa': gExternaMala.code !== 0 && /donde va la firma externa, la mejor tinta mide 2\.1:1/.test(gExternaMala.salida),
        'acepta signatureY como firma externa': rLegado.ok && !/no declara firma/.test(gLegadoFirma.salida) && typeof rLegado.qa[0].contraste.firmaExterna === 'number',
        'rechaza firma bajo el 20 % del lado corto': gFirmaChica.code !== 0 && /del lado corto/.test(gFirmaChica.salida),
        'acepta la excepción auditada y la imprime': gFirmaAuditada.code === 0 && /excepción auditada «firma-tamano»/.test(gFirmaAuditada.salida),
        'rechaza concepto sin cierre': gSinCierre.code !== 0 && /cierre que remata/.test(gSinCierre.salida),
        'acepta conceptoReducido con razón': !/cierre que remata/.test(gReducida.salida),
        'rechaza texto fuera de la zona de AXIS': gFueraZona.code !== 0 && /zona segura story de AXIS/.test(gFueraZona.salida),
        '--variantes arma la hoja de las tres': hoja,
        'auto elige y deja el motivo': Boolean(eleccion?.elegida && eleccion.motivo),
        'rechaza QA incompleto': gIncompleto.code !== 0 && /sin QA/.test(gIncompleto.salida),
        'la corrida parcial conserva el resto': gParcial.code === 0,
        'dos planes en una carpeta no se pisan': gDosA.code === 0 && gDosB.code === 0,
        'la fecha sola no invalida': h.ok && gFecha.code === 0,
        'rechaza plan cambiado': gPlan.code !== 0 && /el plan de la pieza cambió/.test(gPlan.salida),
        'rechaza PNG ajeno': gPng.code !== 0 && /no es el PNG que registró/.test(gPng.salida),
        'rechaza plate cambiado': gPlate.code !== 0 && /el plate cambió/.test(gPlate.salida),
        'rechaza sin máscara': gSinMascara.code !== 0 && /segmentación del sujeto no corrió/.test(gSinMascara.salida),
        'rechaza medición ausente': gNulo.code !== 0 && /no tiene medición/.test(gNulo.salida),
        'rechaza QA sin huellas': gSinHuellas.code !== 0 && /no trae huellas/.test(gSinHuellas.salida),
        'rechaza trazo bajo umbral': gTrazo.code !== 0 && /1 % peor del trazo/.test(gTrazo.salida),
        'rechaza QA sin método de medición': gSinMetodo.code !== 0 && /no dice cómo se midió/.test(gSinMetodo.salida),
        'rechaza borde que se mezcla en el teléfono': gAnillo.code !== 0 && /borde del CTA mide/.test(gAnillo.salida),
        'rechaza CTA bajo el piso perceptual': gPerceptual.code !== 0 && /el CTA no alcanza el piso perceptual/.test(gPerceptual.salida),
        'recalcula las invariantes sobre el layout': gMaquetacion.code !== 0 && /la maquetación no cumple/.test(gMaquetacion.salida),
        'rechaza 01-fuera-916 al tamaño anterior (el trazo no alcanza)': gCrecida.code !== 0 && /1 % peor del trazo/.test(gCrecida.salida),
        'formato anterior: no certificable (sale con 3)': gLegado.code === 3 && /NO CERTIFICABLE/.test(gLegado.salida) && /formato anterior/.test(gLegado.salida),
        'otra versión del comando: no certificable (3)': gComando.code === 3 && /otra versión del comando/.test(gComando.salida),
        'caché de máscaras ajena: no certificable (3)': ajenaFresca && ajenaCache && gAjena.code === 3 && /caché ajena/.test(gAjena.salida),
        'gesto manuscrito: no certificable (3)': gGesto.code === 3 && /gesto manuscrito/.test(gGesto.salida),
        '--reproducir certifica lo idéntico': gReproduce.code === 0 && /idéntico a la reproducción/.test(gReproduce.salida),
        '--reproducir rechaza lo que el comando no produce': gReproduceMal.code === 1 && /no es lo que produce el comando vigente/.test(gReproduceMal.salida),
        'rechaza firma automática por encima del contenido': gFirmaArriba.code === 1 && /por encima del contenido/.test(gFirmaArriba.salida),
        'rechaza trazo de la firma bajo 4,5:1': gTrazoFirma.code === 1 && /trazo de la firma/.test(gTrazoFirma.salida),
        'rechaza composición concurrente': concurrentes.filter(x => x === 'ok').length === 1 && concurrentes.some(x => /otra composición usa/.test(x)),
        'rechaza CTA sin acento': gSinAcento.code !== 0 && /no es un acento/.test(gSinAcento.salida),
        'rechaza voz bajo WCAG': gBajo.code !== 0 && /entrada.*WCAG 2\.2 AA/.test(gBajo.salida),
        'avisa firma sobre sujeto': /firma queda sobre el sujeto/.test(gFirma.salida)
      }

      return { ok: Object.values(r).every(Boolean), detalle: Object.entries(r).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join(' · ') }
    }
  }
]

// ── Ejecución y reporte ──────────────────────────────────────────────────────────────────────────────
console.log(`Pruebas del compositor de CTA · ${TMP}`)
const resultados = []

for (const p of PRUEBAS.filter(x => !SOLO || SOLO.includes(x.id))) {
  const t0 = Date.now()
  let r

  try { r = await p.correr() } catch (e) { r = { ok: false, detalle: `error de la prueba: ${e.message}` } }
  resultados.push({ id: p.id, nombre: p.nombre, ...r, segundos: Math.round((Date.now() - t0) / 1000) })
  console.log(`${r.ok ? '✓' : '✗'} ${p.id} ${p.nombre} (${Math.round((Date.now() - t0) / 1000)} s)\n    ${r.detalle}`)
}

const md = [
  '# Pruebas del compositor de CTA', '', `Referencia de regresión: \`${REF}\` · directorio: \`${TMP}\``, '',
  '| # | prueba | resultado | detalle |', '|---|---|---|---|',
  ...resultados.map(r => `| ${r.id} | ${r.nombre} | ${r.ok ? '✓ pasa' : '✗ falla'} | ${String(r.detalle).replace(/\|/g, '/')} |`)
].join('\n')

fs.writeFileSync(path.join(TMP, 'reporte.json'), JSON.stringify({ ref: REF, tmp: TMP, resultados }, null, 2))

// La carpeta de la regresión pesa ~535 MB: se borra salvo que se pida conservarla.
if (harness && !args.includes('--conservar')) fs.rmSync(path.dirname(harness), { recursive: true, force: true })
fs.writeFileSync(path.join(TMP, 'reporte.md'), `${md}\n`)
console.log(`\n${resultados.filter(r => r.ok).length} de ${resultados.length} pasan · ${path.join(TMP, 'reporte.md')}`)
process.exitCode = resultados.every(r => r.ok) ? 0 : 1
