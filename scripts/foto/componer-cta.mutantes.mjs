// `pnpm foto:componer:cta:mutantes [--solo <nombre,...>] [--jobs <n>]` — puntuación de mutantes del compositor de CTA.
//
// Una guarda que ningún mutante hace fallar no está probada (auditoría adversarial 2026-09-23, hallazgo 16). Este
// catálogo rompe a propósito cada guarda —en el compositor, en el gate, en el arnés de regresión o en un módulo puro— y
// corre las pruebas que la cuidan. Un mutante queda DETECTADO sólo si alguna prueba falla POR LA RAZÓN ESPERADA (su
// patrón aparece en la salida): fallar por otra causa no prueba la guarda. Imprime la puntuación y sale con 1 si un
// mutante sobrevive o si su cambio ya no aplica (el catálogo quedó viejo respecto del código).
//
// Nada toca los archivos reales: cada mutante es una copia `.componer-cta@mut-<nombre>.regresion.mjs` junto al original
// (en .gitignore), y se borra al terminar.
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const SOLO = opt('--solo', null)?.split(',')
const JOBS = Number(opt('--jobs', 2))
const F = rel => path.join(ROOT, 'scripts/foto', rel)

// objetivo: 'compositor' | 'gate' | 'regresion' → corre las pruebas con --compositor/--gate/--regresion;
//           'modulo' → corre la prueba unitaria del módulo contra el mutante.
export const CATALOGO = [
  // ── Tramo 1 · Integridad
  { nombre: 't1-sin-bloqueo', objetivo: 'compositor', cambios: [['tomarBloqueo(`${PLAN_DIR}/out`)', '// mutante: sin bloqueo']], pruebas: 'P10', espera: /rechaza composición concurrente ✗/ },
  { nombre: 't1-cache-confiada', objetivo: 'compositor', cambios: [["if (m.plateSha === plateSha && m.modelo === 'medium' && m.version === VERSION_SEGMENTACION && m.ancho === pw && m.alto === ph && m.mascaraSha === sha(png)) alphaPng = png", 'alphaPng = png']], pruebas: 'P03', espera: /caché envenenada también aborta: false/ },
  { nombre: 't1-escribe-durante', objetivo: 'compositor', cambios: [['  const salidas = []\n', '  const salidas = { push: (...xs) => { for (const [rel, d] of xs) escribirAtomico(`${OUT}/${rel}`, d) }, [Symbol.iterator]: function* () {} }\n']], pruebas: 'P03', espera: /sin archivos tras abortar: false/ },
  { nombre: 't1-qa-compartido', objetivo: 'compositor', cambios: [['const QA_FILE = rutaQa(OUT, PLAN)', "const QA_FILE = path.join(OUT, 'qa.json')"]], pruebas: 'P10', espera: /el QA queda en qa-<plan>\.json ✗/ },
  { nombre: 't1-parcial-pisa', objetivo: 'compositor', cambios: [['if (!only.length) fs.rmSync(QA_FILE, { force: true })', 'fs.rmSync(QA_FILE, { force: true })']], pruebas: 'P10', espera: /la corrida parcial conserva el resto ✗/ },
  { nombre: 't1-sin-esquema', objetivo: 'compositor', cambios: [['    const r = validarPiezaEsquema(p)\n', '    const r = { errores: [], avisos: [] }\n']], pruebas: 'P07', espera: /id con ruta \(\.\.\/\) ✗/ },
  { nombre: 'gate-sin-huellas', objetivo: 'gate', cambios: [['if (!legado) {\n  const comando = huellaComando()', 'if (false) {\n  const comando = huellaComando()']], pruebas: 'P10', espera: /rechaza plan cambiado ✗/ },
  { nombre: 'gate-acepta-sin-mascara', objetivo: 'gate', cambios: [["if (!legado && guarda === 'sin-mascara') {", 'if (false) {']], pruebas: 'P10', espera: /rechaza sin máscara ✗/ },
  { nombre: 'gate-ignora-nulo', objetivo: 'gate', cambios: [['    if (!m) {\n      console.error(`✗ ${r.id}: «${voz}» no tiene medición de accesibilidad. Una voz sin medir no pasa.`)\n      fallos++\n      continue\n    }\n', '    if (!m) continue\n']], pruebas: 'P10', espera: /rechaza medición ausente ✗/ },
  // ── Tramo 2 · Contraste real
  { nombre: 't2-trazo-es-la-caja', objetivo: 'compositor', cambios: [['for (const [id, m] of Object.entries(medirTrazos(bareRgb, texto))) {', 'for (const [id, m] of Object.entries(medirTrazos(bareRgb, Buffer.alloc(texto.length, 255)))) {']], pruebas: 'P09', espera: /oráculo del trazo: \d+ voces, [1-9]\d* desacuerdos/ },
  { nombre: 't2-sin-piso-trazo', objetivo: 'compositor', cambios: [['        return cajas && trazos', '        return cajas']], pruebas: 'P04,P05', espera: /01-fuera-916 sin reserva ×[\d.]+: ✗/ },
  { nombre: 't2-borde-2px', objetivo: 'compositor', cambios: [['const grosorBorde=outline?Math.max(2,Math.ceil(W/ANCHO)):2;', 'const grosorBorde=2;']], pruebas: 'P09', espera: /bordes ≥ 1 CSS px: 0\// },
  { nombre: 't2-sin-protect', objetivo: 'compositor', cambios: [['if (protegidas.length) throw Error(', 'if (false) throw Error(']], pruebas: 'P06', espera: /texto sobre zona protegida rechazado: false/ },
  { nombre: 'gate-t2-sin-trazo', objetivo: 'gate', cambios: [["    } else if (m.metodo === 'pixel' && !m.glifo.cumpleWcag) {", '    } else if (false) {']], pruebas: 'P10', espera: /rechaza trazo bajo umbral ✗/ },
  { nombre: 'gate-t2-sin-anillo', objetivo: 'gate', cambios: [["    } else if (voz === 'cta-borde' && (!m.anillo.cumpleWcag || m.anillo.grosorCssPx < 1)) {", '    } else if (false) {']], pruebas: 'P10', espera: /rechaza borde que se mezcla en el teléfono ✗/ },
  { nombre: 't2-variantes-sin-degradacion', objetivo: 'modulo', modulo: 'cta-variantes.mjs', prueba: 'cta-variantes.test.mjs', cambios: [["if (v === 'outline' && tintaSegura && tintaSegura !== colores.tinta) intentos.push", 'if (false) intentos.push']], espera: /Degradación canónica/ },
  // ── Tramo 3 · Esquema e invariantes
  { nombre: 't3-sin-cobertura-glifos', objetivo: 'compositor', cambios: [['      if (faltan.length) e(`\\`${campo}\\` usa caracteres', '      if (false) e(`\\`${campo}\\` usa caracteres']], pruebas: 'P07', espera: /emoji que la fuente no tiene ✗/ },
  { nombre: 't3-sin-invariantes', objetivo: 'compositor', cambios: [['  if (maquetacion.length) throw new LienzoError(', '  if (false) throw new LienzoError('], ['  if (maquetacionFinal.length) throw new LienzoError(', '  if (false) throw new LienzoError(']], pruebas: 'P06', espera: /firma sobre el texto rechazada: false/ },
  { nombre: 't3-busqueda-ignora-reserva', objetivo: 'compositor', cambios: [['|| maquetacion.length || reservaRota.length)) return { ok: false, hits, resuelta }', '|| maquetacion.length)) return { ok: false, hits, resuelta }']], pruebas: 'P06', espera: /v03 01-fuera-916 compone dentro de su reserva: false/ },
  { nombre: 'gate-t3-sin-invariantes', objetivo: 'gate', cambios: [['invariantesMaquetacion({ ancho: L.canvas.width, alto: L.canvas.height, elementos: L.maquetacion.elementos })', '[]']], pruebas: 'P10', espera: /recalcula las invariantes sobre el layout ✗/ },
  { nombre: 't3-entidades-sin-decodificar', objetivo: 'modulo', modulo: 'svg-texto.mjs', prueba: 'svg-texto.test.mjs', cambios: [['    .replace(/&(lt|gt|quot|apos);/g, (_, e) => NOMBRADAS[e])\n', '']], espera: /Decodifica las entidades/ },
  { nombre: 't3-invariantes-sin-firma', objetivo: 'modulo', modulo: 'cta-invariantes.mjs', prueba: 'cta-invariantes.test.mjs', cambios: [["e.tipo === 'texto' || e.tipo === 'cta' || e.tipo === 'firma'", "e.tipo === 'texto' || e.tipo === 'cta'"]], espera: /El botón bajo la firma/ },
  // ── Tramo 4 · El canon hecho regla
  { nombre: 't4-sin-zona-axis', objetivo: 'compositor', cambios: [["  const zonaDeclarada = s.safeArea === 'axis' ? zonaAxis(W, H) : s.safeArea", "  const zonaDeclarada = s.safeArea === 'axis' ? null : s.safeArea"]], pruebas: 'P06', espera: /zona de AXIS con safeArea "axis": false/ },
  { nombre: 't4-columna-corrida', objetivo: 'compositor', cambios: [["const xCta=cc=>(cc.x==='columna'?(cc.variant==='text'?x-cc.paddingX:x):W*cc.x);", "const xCta=cc=>(cc.x==='columna'?x+20:W*cc.x);"]], pruebas: 'P06', espera: /CTA y descriptor en la columna: false/ },
  { nombre: 't4-sin-firma-auto', objetivo: 'compositor', cambios: [["    if (s.logo.y === 'auto') {", '    if (false) {']], pruebas: 'P06', espera: /firma automática 20 % legible dentro de la zona: false/ },
  { nombre: 'gate-t4-sin-firma', objetivo: 'gate', cambios: [['  if (!p.logo && !p.firma) {', '  if (false) {']], pruebas: 'P10', espera: /rechaza pieza sin firma declarada ✗/ },
  { nombre: 'gate-t4-sin-concepto', objetivo: 'gate', cambios: [['  if ((!p.lead || !p.after) && !p.conceptoReducido && bloquea(', '  if (false && bloquea(']], pruebas: 'P10', espera: /rechaza concepto sin cierre ✗/ },
  { nombre: 'gate-t4-sin-excepciones', objetivo: 'gate', cambios: [['  const e = exceptuada(p, regla)\n', '  const e = null\n']], pruebas: 'P10', espera: /acepta la excepción auditada y la imprime ✗/ },
  { nombre: 'gate-t4-sin-zona', objetivo: 'gate', cambios: [['  } else if (r.fueraDeZona?.length && bloquea(', '  } else if (false && bloquea(']], pruebas: 'P10', espera: /rechaza texto fuera de la zona de AXIS ✗/ },
  { nombre: 't4-alt-anuncia-boton', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['`Llamado a la acción: «${accion[0]}»`', '`Botón: «${accion[0]}»`']], espera: /Texto alternativo/ },
  // ── Tramo 5 · Arnés y pruebas
  { nombre: 't5-crecer-ignora-zona', objetivo: 'compositor', cambios: [['if (opts.dry && (violaDeclarada || hits.length || fuera || fueraDeZona.length || ', 'if (opts.dry && (violaDeclarada || hits.length || fuera || ']], pruebas: 'P06', espera: /crecimiento frenado por la zona declarada: false/ },
  { nombre: 'reg-vacio-verde', objetivo: 'regresion', cambios: [['if (!casos.size) {', 'if (false) {']], pruebas: 'P02', rapido: true, espera: /vacío falla ✗/ },
  { nombre: 'reg-sin-cobertura', objetivo: 'regresion', cambios: [['if (faltantes.length) console.log(', 'if (false) console.log(']], pruebas: 'P02', rapido: true, espera: /pieza faltante de la cobertura falla ✗/ },
  { nombre: 'reg-sin-avisos', objetivo: 'regresion', cambios: [["    else if (avisosNuevos.length || avisosPerdidos.length) r.tipo = 'avisos'\n", '']], pruebas: 'P02', rapido: true, espera: /un aviso nuevo es una diferencia ✗/ },
  { nombre: 'reg-ref-no-hermetica', objetivo: 'modulo', modulo: 'regresion-ref.mjs', prueba: 'regresion-ref.test.mjs', cambios: [['      return `${pre}${q}${destino.startsWith', '      return `${pre}${q}${esp}${q}` || `${pre}${q}${destino.startsWith']], espera: /sin reescribir/ }
]

const ARCHIVO = { compositor: 'componer-cta.mjs', gate: 'componer-cta.gate.mjs', regresion: 'componer-cta.regresion.mjs' }
const BANDERA = { compositor: '--compositor', gate: '--gate', regresion: '--regresion' }

function mutar(m) {
  const original = m.objetivo === 'modulo' ? m.modulo : ARCHIVO[m.objetivo]
  let src = fs.readFileSync(F(original), 'utf8')

  for (const [buscar, reemplazar] of m.cambios) {
    if (!src.includes(buscar)) throw new Error(`el cambio ya no aplica en ${original}: «${buscar.slice(0, 70)}…» (el catálogo quedó viejo)`)
    src = src.replace(buscar, reemplazar)
  }

  const archivo = F(`.componer-cta@mut-${m.nombre}.regresion.mjs`)

  fs.writeFileSync(archivo, src)

  if (m.objetivo !== 'modulo') return { archivos: [archivo], comando: ['scripts/foto/componer-cta.pruebas.mjs', '--solo', m.pruebas, BANDERA[m.objetivo], path.relative(ROOT, archivo), ...(m.rapido ? ['--p02-rapido'] : [])] }

  const prueba = F(`.componer-cta@mut-${m.nombre}-prueba.regresion.mjs`)

  fs.writeFileSync(prueba, fs.readFileSync(F(m.prueba), 'utf8').replace(`from './${m.modulo}'`, `from './${path.basename(archivo)}'`))

  return { archivos: [archivo, prueba], comando: ['--test', path.relative(ROOT, prueba)] }
}

async function evaluar(m) {
  let archivos = []

  try {
    const mut = mutar(m)

    archivos = mut.archivos
    const salida = await run(process.execPath, mut.comando, { cwd: ROOT, timeout: 60 * 60e3, maxBuffer: 64e6 }).then(r => ({ code: 0, texto: r.stdout + r.stderr }), e => ({ code: e.code ?? 1, texto: String(e.stdout ?? '') + String(e.stderr ?? '') }))
    const detectado = salida.code !== 0 && m.espera.test(salida.texto)

    return { nombre: m.nombre, estado: detectado ? 'detectado' : salida.code !== 0 ? 'falla-por-otra-razon' : 'sobrevive' }
  } catch (e) {
    return { nombre: m.nombre, estado: 'catalogo-viejo', error: e.message }
  } finally {
    for (const f of archivos) fs.rmSync(f, { force: true })
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const lista = CATALOGO.filter(m => !SOLO || SOLO.includes(m.nombre))
  const cola = [...lista]
  const resultados = []

  console.log(`Puntuación de mutantes del compositor de CTA · ${lista.length} mutantes · ${JOBS} en paralelo`)

  await Promise.all(Array.from({ length: JOBS }, async () => {
    for (let m = cola.shift(); m; m = cola.shift()) {
      const r = await evaluar(m)

      resultados.push(r)
      console.log(`${r.estado === 'detectado' ? '✓' : '✗'} ${r.nombre}: ${r.estado}${r.error ? ` — ${r.error}` : ''}`)
    }
  }))

  const detectados = resultados.filter(r => r.estado === 'detectado').length

  console.log(`\nPuntuación: ${detectados} de ${resultados.length} mutantes detectados por la razón esperada.`)
  process.exitCode = detectados === resultados.length ? 0 : 1
}
