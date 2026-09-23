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
const REGRESION = path.join(ROOT, 'scripts/foto/componer-cta.regresion.mjs')
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
  fue_916: [V07, '01-fuera-916']
}

const pieza = k => {
  const [rel, id] = FIX[k]
  const plan = path.join(ROOT, rel)
  const p = JSON.parse(fs.readFileSync(plan, 'utf8')).find(x => x.id === id)

  if (!p) throw new Error(`fixture ${k}: no existe ${id} en ${rel}`)

  return { ...structuredClone(p), plate: path.resolve(path.dirname(plan), p.plate) }
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

async function gate(planPath) {
  try {
    const r = await run(process.execPath, [GATE, planPath], { cwd: ROOT, maxBuffer: 16e6 })

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
      try {
        // `--conservar`: P08 y P09 leen las 86 piezas que deja la regresión; la suite borra esa carpeta al final.
        const r = await run(process.execPath, [REGRESION, '--ref', REF, '--candidato', COMPOSITOR, '--conservar'], { cwd: ROOT, timeout: 60 * 60e3, maxBuffer: 64e6 })

        harness = r.stdout.match(/Reporte: (\S+)/)?.[1]

        return { ok: true, detalle: r.stdout.split('\n').filter(l => /^Iguales|^🔵/.test(l)).join(' · '), evidencia: harness }
      } catch (e) {
        harness = String(e.stdout).match(/Reporte: (\S+)/)?.[1]

        return { ok: false, detalle: String(e.stdout).split('\n').filter(l => /^Iguales|^🔴|^🟠|^🟡|^⚪/.test(l)).join(' · '), evidencia: harness }
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

        ok &&= !peores.length && fijaEsUno
        filas.push(`${c.id} ×${c.qa.escala.toFixed(2)}: ${peores.length ? `✗ ${peores.map(([v, x]) => `${v} ${x}→${c.qa.contraste[v]}`).join(', ')}` : '✓'}${fijaEsUno ? '' : ' (textGrowth:false no congeló)'}`)
      }

      if (!Object.keys(crecidas).length) return { ok: false, detalle: 'depende de P04' }

      return { ok, detalle: filas.join(' · ') }
    }
  },
  {
    id: 'P06', nombre: 'Zona segura declarada y eje del bloque',
    async correr() {
      const rec = crecidas.rec_916
      let dentro = false
      let detalleA = 'depende de P04'

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

      const [original, alineada, choca, cabe] = await Promise.all([componer('P06-eje', [pieza('ref_916')]), componer('P06-izquierda', [izquierda]), componer('P06-choque', [conIA('top-end')]), componer('P06-cabe', [conIA('bottom-end')])])
      const choqueRechazado = !choca.ok && /tapa «nota»/.test(choca.error)
      const ejeRechazado = !original.ok && /eje corrido/.test(original.error)
      let margen = false

      if (alineada.ok) {
        const L = leer(alineada.dir, '03-referencia-916-layout.json')

        margen = Math.min(...L.elements.filter(e => TEXTO.has(e.id)).map(e => e.box.left)) >= izquierda.safeArea.x0 * L.canvas.width - 0.5
      }

      return { ok: dentro && ejeRechazado && alineada.ok && margen && choqueRechazado && cabe.ok, detalle: `${detalleA} · centrado en eje 0,29 rechazado: ${ejeRechazado} · alineado a la izquierda compone: ${alineada.ok} y arranca dentro del 8 %: ${margen} · colaborador sobre la nota rechazado: ${choqueRechazado} · en otra esquina compone: ${cabe.ok}` }
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
        ['campo obligatorio en null', [nulo], [], /falta `cta\.fontSize`/]
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

      if (harness) {
        for (const r of JSON.parse(fs.readFileSync(harness, 'utf8')).resultados.filter(x => x.cand === 'compone')) {
          fuentes.push([r.id, JSON.parse(fs.readFileSync(path.join(r.dir, 'cand/out/qa-piezas.json'), 'utf8'))[0], JSON.parse(fs.readFileSync(path.join(r.dir, 'cand/piezas.json'), 'utf8'))[0]])
        }
      }

      const fallas = []
      const incompletas = []
      let avisos = 0

      for (const [id, q, p] of fuentes) {
        const a = q.accesibilidad

        if (!a) { fallas.push(`${id} sin medición`); continue }

        for (const [v, m] of Object.entries(a.voces)) {
          if (m && !m.cumpleWcag) fallas.push(`${id}:${v} ${m.wcag}<${m.umbralWcag}`)
          if (m && (m.cumpleApca === false || m.cumpleDaltonismo === false)) avisos++
        }

        const faltan = [p.lead, p.dominant, p.after, p.note?.text, p.cta?.text, p.cta?.descriptor].map(plano).filter(t => t && !a.altText.includes(t))

        if (faltan.length) incompletas.push(`${id}: ${faltan.join(' / ')}`)
      }

      // Y la herramienta de reporte corre sobre un plan compuesto y deja las vistas de daltonismo.
      const plan = crecidas.mo2_916 && path.join(crecidas.mo2_916.dir, 'piezas.json')
      let reporte = false

      if (plan) {
        await run(process.execPath, [REPORTE_A11Y, plan], { cwd: ROOT })
        reporte = fs.existsSync(path.join(crecidas.mo2_916.dir, 'out/accesibilidad/reporte.md')) && fs.existsSync(path.join(crecidas.mo2_916.dir, 'out/accesibilidad/mo2-no-te-citan-916-daltonismo.png'))
      }

      return {
        ok: fuentes.length > 0 && !fallas.length && !incompletas.length && reporte,
        detalle: `${fuentes.length} piezas · voces bajo WCAG AA: ${fallas.length}${fallas.length ? ` (${fallas.slice(0, 4).join(', ')})` : ''} · alternativas incompletas: ${incompletas.length}${incompletas.length ? ` (${incompletas.slice(0, 3).join('; ')})` : ''} · avisos APCA/daltonismo: ${avisos} · reporte y vistas de daltonismo: ${reporte}`,
        evidencia: plan && path.join(crecidas.mo2_916.dir, 'out/accesibilidad/reporte.md')
      }
    }
  },
  {
    id: 'P10', nombre: 'Gate: aprueba lo bueno y rechaza QA incompleto, viejo, CTA sin acento y voz bajo WCAG',
    async correr() {
      const bueno = await componer('P10-bueno', [pieza('b2_916'), pieza('b2_169')])
      const gBueno = bueno.ok ? await gate(bueno.planPath) : { code: -1, salida: bueno.error }

      // Corrida parcial: recompone una pieza y el QA conserva la otra (antes iba a un `qa-parcial.json` aparte).
      const parcial = bueno.ok ? await run(process.execPath, [COMPOSITOR, bueno.planPath, 'b2-primero-el-numero-916'], { cwd: ROOT, timeout: 20 * 60e3, maxBuffer: 64e6 }).then(() => true, () => false) : false
      const gParcial = parcial ? await gate(bueno.planPath) : { code: -1, salida: 'la corrida parcial no compuso' }

      // Dos planes en la MISMA carpeta: cada uno con su QA; componer el segundo no invalida al primero.
      const dirDos = path.join(TMP, 'P10-dos-planes')

      fs.mkdirSync(dirDos, { recursive: true })
      fs.writeFileSync(path.join(dirDos, 'piezas-a.json'), JSON.stringify([pieza('b2_916')], null, 2))
      fs.writeFileSync(path.join(dirDos, 'piezas-b.json'), JSON.stringify([pieza('b2_169')], null, 2))
      const dos = await ['piezas-a.json', 'piezas-b.json'].reduce((cadena, f) => cadena.then(ok => ok && run(process.execPath, [COMPOSITOR, path.join(dirDos, f)], { cwd: ROOT, timeout: 20 * 60e3, maxBuffer: 64e6 }).then(() => true, () => false)), Promise.resolve(true))
      const [gDosA, gDosB] = dos ? [await gate(path.join(dirDos, 'piezas-a.json')), await gate(path.join(dirDos, 'piezas-b.json'))] : [{ code: -1 }, { code: -1 }]

      // QA incompleto: se quita una fila.
      const incompleto = await componer('P10-incompleto', [pieza('b2_916'), pieza('b2_169')])

      if (incompleto.ok) fs.writeFileSync(path.join(incompleto.dir, 'out/qa-piezas.json'), JSON.stringify(incompleto.qa.slice(0, 1)))
      const gIncompleto = await gate(incompleto.planPath)

      // HUELLAS (tramo 1, 2026-09-23): el QA vale sólo para el plan, el plate y el PNG que lo produjeron. Se prueba sobre
      // UNA composición, alterando una cosa por vez y restaurándola antes de la siguiente.
      const h = await componer('P10-huellas', [pieza('b2_916')])
      const idH = 'b2-primero-el-numero-916'
      const archivo = rel => path.join(h.dir, rel)

      const conCambio = async (rel, cambiar) => {
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

      fs.renameSync(archivo('out/qa-piezas.json'), archivo('out/qa.json'))
      const gLegado = await gate(h.planPath)

      fs.renameSync(archivo('out/qa.json'), archivo('out/qa-piezas.json'))

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
        'avisa formato anterior': /no puede certificarlo/.test(gLegado.salida),
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
