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
  { nombre: 't1-qa-compartido', amplio: true, objetivo: 'compositor', cambios: [['const QA_FILE = rutaQa(OUT, PLAN)', "const QA_FILE = path.join(OUT, 'qa.json')"]], pruebas: 'P10', espera: /el QA queda en qa-<plan>\.json ✗/ },
  { nombre: 't1-parcial-pisa', objetivo: 'compositor', cambios: [['if (!only.length) fs.rmSync(QA_FILE, { force: true })', 'fs.rmSync(QA_FILE, { force: true })']], pruebas: 'P10', espera: /la corrida parcial conserva el resto ✗/ },
  { nombre: 't1-sin-esquema', amplio: true, objetivo: 'compositor', cambios: [['    const r = validarPiezaEsquema(p)\n', '    const r = { errores: [], avisos: [] }\n']], pruebas: 'P07', espera: /id con ruta \(\.\.\/\) ✗/ },
  { nombre: 'gate-sin-huellas', objetivo: 'gate', cambios: [['if (!legado) {\n  const comando = huellaComando({ compositor: COMANDO })', 'if (false) {\n  const comando = huellaComando({ compositor: COMANDO })']], pruebas: 'P10', espera: /rechaza plan cambiado ✗/ },
  { nombre: 'gate-acepta-sin-mascara', objetivo: 'gate', cambios: [["if (!legado && guarda === 'sin-mascara') {", 'if (false) {']], pruebas: 'P10', espera: /rechaza sin máscara ✗/ },
  { nombre: 'gate-ignora-nulo', objetivo: 'gate', cambios: [['    if (!m) {\n      console.error(`✗ ${r.id}: «${voz}» no tiene medición de accesibilidad. Una voz sin medir no pasa.`)\n      fallos++\n      continue\n    }\n', '    if (!m) continue\n']], pruebas: 'P10', espera: /rechaza medición ausente ✗/ },
  // ── Tramo 2 · Contraste real
  { nombre: 't2-trazo-es-la-caja', objetivo: 'compositor', cambios: [['for (const [id, m] of Object.entries(medirTrazos(bareRgb, texto))) {', 'for (const [id, m] of Object.entries(medirTrazos(bareRgb, Buffer.from(texto).map((v, i) => (i % 4 === 3 ? 255 : v))))) {']], pruebas: 'P09', espera: /oráculo del trazo: \d+ voces, [1-9]\d* desacuerdos/ },
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
  { nombre: 't4-sin-zona-axis', objetivo: 'compositor', cambios: [["  const zonaDeclarada = s.safeArea === 'axis' ? zonaAxis(W, H) : s.safeArea", "  const zonaDeclarada = s.safeArea === 'axis' ? { x0: 0, y0: 0, x1: 1, y1: 1 } : s.safeArea"]], pruebas: 'P06', espera: /zona de AXIS con safeArea "axis": false/ },
  { nombre: 't4-columna-corrida', objetivo: 'compositor', cambios: [["const xCta=cc=>(cc.x==='columna'?(cc.variant==='text'?x-cc.paddingX:x):W*cc.x);", "const xCta=cc=>(cc.x==='columna'?x+20:W*cc.x);"]], pruebas: 'P06', espera: /CTA y descriptor en la columna: false/ },
  { nombre: 't4-sin-firma-auto', objetivo: 'compositor', cambios: [["    if (s.logo.y === 'auto') {", '    if (false) {']], pruebas: 'P06', espera: /firma automática 20 % legible dentro de la zona: false/ },
  { nombre: 'gate-t4-sin-firma', objetivo: 'gate', cambios: [['  if (!p.logo && !p.firma && !externa) {', '  if (false) {']], pruebas: 'P10', espera: /rechaza pieza sin firma declarada ✗/ },
  { nombre: 'gate-t4-sin-concepto', objetivo: 'gate', cambios: [['  if ((!p.lead || !p.after) && !p.conceptoReducido && bloquea(', '  if (false && bloquea(']], pruebas: 'P10', espera: /rechaza concepto sin cierre ✗/ },
  { nombre: 'gate-t4-sin-excepciones', objetivo: 'gate', cambios: [['  const e = exceptuada(p, regla)\n', '  const e = null\n']], pruebas: 'P10', espera: /acepta la excepción auditada y la imprime ✗/ },
  { nombre: 'gate-t4-sin-zona', objetivo: 'gate', cambios: [['  } else if (r.fueraDeZona?.length && bloquea(', '  } else if (false && bloquea(']], pruebas: 'P10', espera: /rechaza texto fuera de la zona de AXIS ✗/ },
  { nombre: 't4-alt-anuncia-boton', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['`Llamado a la acción: «${accion[0]}»`', '`Botón: «${accion[0]}»`']], espera: /Texto alternativo/ },
  // ── Tramo 6 · El gate no miente: «no certificable» sale con 3, certificación por reproducción, firma en el pie
  { nombre: 't6-legado-certifica', objetivo: 'gate', cambios: [['  noCertificable.push(`${qaLegado} es del formato anterior', '  void (`${qaLegado} es del formato anterior']], pruebas: 'P10', espera: /formato anterior: no certificable \(sale con 3\) ✗/ },
  { nombre: 't6-comando-certifica', objetivo: 'gate', cambios: [['      noCertificable.push(`${p.id}: se compuso con otra versión del comando', '      void (`${p.id}: se compuso con otra versión del comando']], pruebas: 'P10', espera: /otra versión del comando: no certificable \(3\) ✗/ },
  { nombre: 't6-cache-ajena-certifica', objetivo: 'gate', cambios: [["  if (!legado && segmentada && mascara?.origen !== 'fresca' && mascara?.origen !== 'cache-canonica') noCertificable.push(", '  if (false) noCertificable.push(']], pruebas: 'P10', espera: /caché de máscaras ajena: no certificable \(3\) ✗/ },
  { nombre: 't6-gesto-certifica', objetivo: 'gate', cambios: [['  if (p.gesture) noCertificable.push(', '  if (false) noCertificable.push(']], pruebas: 'P10', espera: /gesto manuscrito: no certificable \(3\) ✗/ },
  { nombre: 't6-no-certificable-sale-0', objetivo: 'gate', cambios: [['  process.exit(3)\n', '']], pruebas: 'P10', espera: /formato anterior: no certificable \(sale con 3\) ✗/ },
  { nombre: 't6-reproducir-no-compara', objetivo: 'gate', cambios: [['          else if (!existsSync(reproducido) || sha(readFileSync(entregado)) !== sha(readFileSync(reproducido))) distintos.push(`out/${f}`)', '          else if (false) distintos.push(`out/${f}`)']], pruebas: 'P10', espera: /--reproducir rechaza lo que el comando no produce ✗/ },
  { nombre: 't6-gate-sin-banda-firma', objetivo: 'gate', cambios: [['    if (r.firma?.auto && r.firma.encontrada) {', '    if (false) {']], pruebas: 'P10', espera: /rechaza firma automática por encima del contenido ✗/ },
  { nombre: 't6-gate-sin-trazo-firma', objetivo: 'gate', cambios: [["} else if (!trazo.cumpleWcag && bloquea(p, 'firma-contraste',", "} else if (false && bloquea(p, 'firma-contraste',"]], pruebas: 'P10', espera: /rechaza trazo de la firma bajo 4,5:1 ✗/ },
  { nombre: 't6-firma-sube-sin-tope', objetivo: 'compositor', cambios: [['  const techo = Math.max(Math.ceil(zona.y0 * H), techoMinimo, ...ocupados.map(o => Math.ceil(o.bottom + holgura)))', '  const techo = Math.ceil(zona.y0 * H)']], pruebas: 'P06', espera: /la firma automática nunca sube por encima del contenido \(KV-06-169\): false|la firma automática del canon nuevo queda en el cuarto inferior: false/ }, // tramo 11: con la firma de 25 %, KV-06-169 no encuentra lugar legible en ninguna altura y ya no sube; la banda la vigila la pieza con el pie protegido
  { nombre: 't6-mascara-sin-origen', objetivo: 'compositor', cambios: [["  let origen = MASK_CACHE === MASK_CACHE_REPO ? 'cache-canonica' : 'cache-externa'", "  let origen = 'cache-canonica'"]], pruebas: 'P10', espera: /caché de máscaras ajena: no certificable \(3\) ✗/ },
  // ── Tramo 7 · Umbrales que no se aflojan y excepciones con tope, plate y aprobador registrado
  { nombre: 't7-placement-afloja', objetivo: 'compositor', cambios: [['const ANCHO = Math.min(ANCHO_PANTALLA, s.placement?.anchoCssPx ?? ANCHO_PANTALLA)', 'const ANCHO = s.placement?.anchoCssPx ?? ANCHO_PANTALLA']], pruebas: 'P10', espera: /placement no afloja ✗/ },
  { nombre: 't7-cta-sin-piso', objetivo: 'compositor', cambios: [['pisoTexto:UMBRALES.normalTextContrast,', '']], pruebas: 'P10', espera: /el QA del CTA grande se mide con 4,5:1 ✗/ },
  { nombre: 't7-crece-con-excepcion', objetivo: 'compositor', cambios: [['  const reservaRota = fueraDeReserva({ elementos: elementosMaquetacion(firmaPrevista), reserva: s.editorialReserve })', "  const reservaRota = fueraDeReserva({ elementos: elementosMaquetacion(firmaPrevista), reserva: (s.excepciones ?? []).some(e => e.regla === 'reserva-editorial') ? null : s.editorialReserve })"]], pruebas: 'P06', espera: /crecer no usa la excepción de la reserva: false/ },
  { nombre: 't7-gate-cta-umbral', objetivo: 'gate', cambios: [["    if (voz === 'cta' && !legado && (m.umbralWcag < MIN_TEXTO", "    if (false && (m.umbralWcag < MIN_TEXTO"]], pruebas: 'P10', espera: /CTA siempre ≥ 4,5:1 ✗/ },
  { nombre: 't7-gate-dominante-mayor', objetivo: 'gate', cambios: [["  if (mayores.length && bloquea(p, 'dominante-mayor',", "  if (false && bloquea(p, 'dominante-mayor',"]], pruebas: 'P10', espera: /rechaza dominante que no es la voz mayor ✗/ },
  { nombre: 't7-gate-aprobador-libre', objetivo: 'gate', cambios: [['  if (!a) return `«${id}» no está en el registro de aprobadores (scripts/foto/aprobadores.json)`', '  if (!a) return null']], pruebas: 'P10', espera: /rechaza excepción de aprobador no registrado ✗/ },
  { nombre: 't7-gate-plate-libre', objetivo: 'gate', cambios: [['      : e.plate !== plateDe(p) ?', '      : false ?']], pruebas: 'P10', espera: /rechaza excepción aprobada para otro plate ✗/ },
  { nombre: 't7-gate-sin-tope-libre', objetivo: 'gate', cambios: [["        : medida && typeof e.hasta !== 'number' ?", '        : false ?']], pruebas: 'P10', espera: /rechaza excepción sin tope ✗/ },
  { nombre: 't7-gate-tope-libre', objetivo: 'gate', cambios: [["          : medida && !(medida.sentido === 'min' ? medida.valor >= e.hasta : medida.valor <= e.hasta) ?", '          : false ?']], pruebas: 'P10', espera: /rechaza excepción que no cubre la medida ✗/ },
  { nombre: 't7-gate-salida-libre', objetivo: 'gate', cambios: [['const salidaAprobada = (p, que, declaracion) => {\n', 'const salidaAprobada = (p, que, declaracion) => {\n  return true\n']], pruebas: 'P10', espera: /rechaza sin-firma sin aprobador ✗/ },
  { nombre: 't7-variantes-cta-grande', objetivo: 'modulo', modulo: 'cta-variantes.mjs', prueba: 'cta-variantes.test.mjs', cambios: [['  const umbral = UMBRALES.normalTextContrast', '  const umbral = cssPx >= 24 ? UMBRALES.largeTextContrast : UMBRALES.normalTextContrast']], espera: /El CTA grande también exige/ },
  // ── Tramo 8 · Entradas y bordes
  { nombre: 't8-sin-mayusculas', objetivo: 'compositor', cambios: [['  if (casi.length) errores.push(', '  if (false) errores.push(']], pruebas: 'P07', espera: /ids que sólo difieren en mayúsculas ✗/ },
  { nombre: 't8-plate-sin-nombre', objetivo: 'compositor', cambios: [['    st = await sharp(path.resolve(PLAN_DIR, s0.plate)).stats()', '    st = { channels: [] }']], pruebas: 'P07', espera: /plate ilegible, con su pieza ✗/ },
  { nombre: 't8-final-ignorado', objetivo: 'compositor', cambios: [['  const out = s.final ? sharp(master).resize({ width: s.final[0], height: s.final[1] }) : sharp(master)', '  const out = sharp(master)']], pruebas: 'P10', espera: /el tamaño entregado es el del plan ✗/ },
  { nombre: 't8-gate-sin-tamano', objetivo: 'gate', cambios: [['      else if (esperado && (dims[0] !== esperado[0] || dims[1] !== esperado[1])) fallas.push(', '      else if (false) fallas.push(']], pruebas: 'P10', espera: /rechaza PNG de otro tamaño ✗/ },
  { nombre: 't8-gate-sin-corchetes', objetivo: 'gate', cambios: [['  if (a.corchetes && (a.corchetes.grosorCssPx < 1', '  if (false && (a.corchetes.grosorCssPx < 1']], pruebas: 'P10', espera: /avisa corchetes bajo 1 CSS px ✗/ },
  { nombre: 't8-alt-sin-rol', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['    ? [accion[0] && `Llamado a la acción: «${accion[0]}»`', '    ? [accion[0] && !yaDicho(accion[0]) && `Llamado a la acción: «${accion[0]}»`']], espera: /el rol del CTA se anuncia siempre/ },
  { nombre: 't8-alt-subcadena', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['  const yaDicho = t => citas(escena).some(c => contieneFrase(c, t))', '  const yaDicho = t => Boolean(escena) && escena.toLowerCase().includes(t.toLowerCase())']], espera: /el rol del CTA se anuncia siempre/ },
  { nombre: 't8-entidad-revienta', objetivo: 'modulo', modulo: 'svg-texto.mjs', prueba: 'svg-texto.test.mjs', cambios: [["const desdeCodigo = cp => (Number.isFinite(cp) && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : '\\ufffd')", 'const desdeCodigo = cp => String.fromCodePoint(cp)']], espera: /Una entidad fuera de Unicode no revienta/ },
  // ── Tramo 9 · Proceso
  { nombre: 't9-reclamo-sin-candado', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [['      fs.writeFileSync(reclamo, String(process.pid), { flag: \'wx\' })', '      void 0']], espera: /Reclamar un bloqueo muerto deja un solo dueño/ },
  { nombre: 't9-senal-deja-bloqueo', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [['      for (const [senal, codigo] of Object.entries(SENALES)) process.once(senal, () => { soltar(); process.exit(codigo) })', '      void SENALES']], espera: /Ctrl-C suelta el bloqueo/ },
  { nombre: 't9-sin-aviso-entre-planes', objetivo: 'compositor', cambios: [['  if (compartidos.length) console.warn(', '  if (false) console.warn(']], pruebas: 'P10', espera: /avisa id que otro plan de la carpeta registra ✗/ },
  { nombre: 'reg-sin-manifiesto-verde', objetivo: 'regresion', cambios: [["} else if (!fs.existsSync(COBERTURA) && (!SOLO || args.includes('--cobertura'))) {", '} else if (false) {']], pruebas: 'P02', rapido: true, espera: /sin manifiesto de cobertura falla ✗/ },
  { nombre: 'reg-sin-veredicto-gate', objetivo: 'regresion', cambios: [["    else if (gateNuevas.length || gateQuitadas.length) r.tipo = 'gate'", "    else if (false) r.tipo = 'gate'"]], pruebas: 'P02', rapido: true, espera: /un cambio del veredicto del gate es una diferencia ✗/ },
  { nombre: 'gate-t9-firma-caja', objetivo: 'gate', cambios: [['} else if (c < FIRMA_MIN_CONTRASTE && bloquea(p, \'firma-contraste\', `la firma mide ${c}:1 contra su fondo', '} else if (false && bloquea(p, \'firma-contraste\', `la firma mide ${c}:1 contra su fondo']], pruebas: 'P10', espera: /rechaza firma bajo 4,5:1 en su caja ✗/ },
  { nombre: 'gate-t9-cta-caja', objetivo: 'gate', cambios: [['  } else if (c.cta < MIN_TEXTO) {', '  } else if (false) {']], pruebas: 'P10', espera: /rechaza CTA bajo 4,5:1 en su caja ✗/ },
  { nombre: 'gate-t9-descriptor-caja', objetivo: 'gate', cambios: [["  if (typeof c.descriptor === 'number' && c.descriptor < MIN_TEXTO) {", '  if (false) {']], pruebas: 'P10', espera: /rechaza descriptor bajo 4,5:1 en su caja ✗/ },
  { nombre: 'gate-t9-jerarquia', objetivo: 'gate', cambios: [["  if (typeof r.ratioDominanteEntrada === 'number' && r.ratioDominanteEntrada < 3 && bloquea(", '  if (false && bloquea(']], pruebas: 'P10', espera: /rechaza jerarquía bajo tres veces ✗/ },
  { nombre: 't9-firma-ignora-protect', objetivo: 'compositor', cambios: [['      const protect = (s.protect ?? []).map(z => ({ left: z.box[0] * W, top: z.box[1] * H, right: z.box[2] * W, bottom: z.box[3] * H }))', '      const protect = (s.protect ?? []).map(z => ({ left: z.x0 * W, top: z.y0 * H, right: z.x1 * W, bottom: z.y1 * H }))']], pruebas: 'P06', espera: /la firma automática respeta las zonas protect: false/ },
  { nombre: 't9-gate-sin-rol-alt', objetivo: 'gate', cambios: [["  if (!legado && piezas.find(x => x.id === r.id)?.cta && !/Llamado a la acción: «/.test(a.altText ?? '')) {", '  if (false) {']], pruebas: 'P10', espera: /rechaza texto alternativo sin el rol del CTA ✗/ },
  // ── Tramo 10 · Integridad (tercera certificación)
  { nombre: 't10-espacio-sin-glifo', objetivo: 'compositor', cambios: [["filter(ch => ch !== ' ')", 'filter(ch => !/\\s/u.test(ch))']], pruebas: 'P07', espera: /espacio U\+202F que la fuente no tiene ✗/ },
  { nombre: 't10-sin-tinta', objetivo: 'compositor', cambios: [['      else if (sinTinta(desescaparXml(textoCampo))) e(', '      else if (false) e(']], pruebas: 'P07', espera: /texto sin tinta \(U\+200B\) ✗/ },
  { nombre: 't10-objeto-libre', objetivo: 'compositor', cambios: [["    else elementosSeleccion.push({ id: 'marco de la selección sobre el objeto'", "    else [].push({ id: 'marco de la selección sobre el objeto'"]], pruebas: 'P06', espera: /selección sobre un objeto que tapa el texto rechazada: false/ },
  { nombre: 't10-firma-fuera', objetivo: 'compositor', cambios: [['  if (firmaFuera.length) throw new Error(', '  if (false) throw new Error(']], pruebas: 'P07', espera: /firma externa fuera de la imagen ✗/ },
  { nombre: 't10-final-sin-piso', objetivo: 'compositor', cambios: [['  if (s.final && s.final[0] < pisoFinal) throw new Error(', '  if (false) throw new Error(']], pruebas: 'P07', espera: /final que se aleja de lo medido ✗/ },
  { nombre: 't10-tipografia-declarada', objetivo: 'compositor', cambios: [['closure: s.after ? (s.afterSize ?? 74) : s.afterSize', 'closure: s.afterSize']], pruebas: 'P10', espera: /rechaza cierre por defecto mayor que el dominante ✗/ },
  { nombre: 't10-alt-sin-huella', objetivo: 'compositor', cambios: [[', alt: sha(`${accesibilidad.altText}\\n`) }', ' }']], pruebas: 'P10', espera: /rechaza texto alternativo reemplazado ✗/ },
  { nombre: 'gate-t10-alt', objetivo: 'gate', cambios: [['    else if (h.alt !== sha(readFileSync(alt))) fallas.push(', '    else if (false) fallas.push(']], pruebas: 'P10', espera: /rechaza texto alternativo reemplazado ✗/ },
  { nombre: 'gate-t10-fila-qa', objetivo: 'gate', cambios: [['        if (fila(qaEntregado, p.id) !== fila(qaReproducido, p.id)) distintos.push(', '        if (false) distintos.push(']], pruebas: 'P10', espera: /con --reproducir rechaza el QA entregado alterado ✗/ },
  { nombre: 'gate-t10-origen-publico', objetivo: 'gate', cambios: [["if (args.includes('--origen')) { console.error(", "if (false) { console.error("]], pruebas: 'P10', espera: /--origen ya no es un flag público ✗/ },
  { nombre: 'gate-t10-aprobador-ruta', objetivo: 'gate', cambios: [['  return a.soloPruebas && !deLaSuite() ? `«${id}» sólo vale en los planes de la suite de pruebas` : null', '  return null']], pruebas: 'P10', espera: /rechaza aprobador de pruebas fuera de la suite ✗/ },
  { nombre: 'gate-t10-comando-ajeno', objetivo: 'gate', cambios: [['if (!COMANDO_CANONICO && !deLaSuite()) noCertificable.push(', 'if (false) noCertificable.push(']], pruebas: 'P10', espera: /comando ajeno no certifica fuera de la suite ✗/ },
  { nombre: 'gate-t10-hud', objetivo: 'gate', cambios: [['  if (p.hud) noCertificable.push(', '  if (false) noCertificable.push(']], pruebas: 'P10', espera: /HUD no certificable ✗/ },
  { nombre: 'gate-t10-acento-declarado', objetivo: 'gate', cambios: [['  const token = resuelta?.tokens ? resuelta.tokens[campo] : pieza.cta[campo]', '  const token = pieza.cta[campo]']], pruebas: 'P10', espera: /acento verificado sobre la variante resuelta ✗/ },
  { nombre: 'gate-t10-aprobacion-sin-plate', objetivo: 'gate', cambios: [['  else if (declaracion.plate !== plateDe(p)) console.error(', '  else if (false) console.error(']], pruebas: 'P10', espera: /rechaza aprobación de otro plate ✗/ },
  { nombre: 't10-bloqueo-vacio', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [['    if (pid == null && (!fs.existsSync(ruta) || edad(ruta) < HUERFANO_MS)) {', '    if (pid == null) {']], espera: /Un bloqueo VACÍO huérfano se reclama/ },
  { nombre: 't10-ruta-escrita', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [['  const r = normal(rutaReal(p))', '  const r = normal(path.resolve(p))']], espera: /La ruta REAL decide si un plan está en el repo/ },
  { nombre: 't10-marca-sin-valor', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [["      if (fs.readFileSync(path.join(d, MARCA_SUITE), 'utf8').trim() === nonce) return true", '      if (fs.existsSync(path.join(d, MARCA_SUITE))) return true']], espera: /La marca de la suite vale sólo con el valor/ },
  { nombre: 't10-zona-firma-libre', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    signatureSafeArea: z\n      .object({ x0: fraccion, y0: fraccion, x1: fraccion, y1: fraccion, profile: z.string().optional(), status: z.string().optional() })\n      .strict()\n      .refine(a => a.x0 < a.x1 && a.y0 < a.y1, 'la zona de la firma necesita x0 < x1 e y0 < y1')\n      .optional()", '    signatureSafeArea: z.any().optional()']], espera: /La zona de la firma tiene forma/ },
  { nombre: 't10-campo-interno', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [['  if (internos.length) errores.push(', '  if (false) errores.push(']], espera: /Un campo interno del compositor en la raíz se rechaza/ },
  { nombre: 't10-escala-sin-techo', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [['    cursorScale: positivo.max(1.2).optional(),', '    cursorScale: positivo.optional(),']], espera: /Las escalas de la selección tienen techo/ },
  // ── Tramo 11 · Canon 2026-09-23 (piezas nuevas); el velo dejó de existir
  { nombre: 't11-velo-permitido', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    scrimTop: z.any().refine(() => false, 'el velo no se usa: el lecho donde va el texto se genera desde el prompt (`pnpm foto:prompt` con `reservas: [\"zona-texto\"]`)').optional(),", '    scrimTop: z.any().optional(),']], espera: /Sin velo: scrimTop y scrimBottom se rechazan/ },
  { nombre: 't11-registro-ignorado', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [['  return registros.get(registro).has(`${plateSha}:${huellaSinPlate(pieza)}`) ? CANON_ANTERIOR : CANON_VIGENTE', '  return CANON_VIGENTE']], espera: /El canon de una pieza lo decide su huella en el registro/ },
  { nombre: 't11-sin-zona-por-defecto', objetivo: 'compositor', cambios: [["  if (nuevo && s.safeArea == null) s.safeArea = 'axis'", '  void nuevo']], pruebas: 'P06', espera: /zona AXIS por defecto en una pieza nueva: false/ },
  { nombre: 't11-crecimiento-frenado', objetivo: 'compositor', cambios: [["...visibles.filter(v => !nuevo || v.id !== 'cta-seleccion' || ctaMarcoPintado)].filter(({ box })", '...visibles].filter(({ box })']], pruebas: 'P06', espera: /el 16:9 nuevo crece con la zona AXIS: false/ },
  { nombre: 't11-firma-sube', objetivo: 'compositor', cambios: [['protect, nuevo ? Math.ceil(H * PISO_FIRMA) : 0, nuevo)', 'protect, 0, nuevo)']], pruebas: 'P06', espera: /la firma automática del canon nuevo queda en el cuarto inferior: false/ },
  { nombre: 'gate-t11-canon-qa', objetivo: 'gate', cambios: [['  else if (r.canon !== canonPieza) { console.error(', '  else if (false) { console.error(']], pruebas: 'P10', espera: /rechaza QA con otro canon ✗/ },
  { nombre: 'gate-t11-todo-nuevo', objetivo: 'gate', cambios: [['  const nuevo = canonPieza === CANON_VIGENTE\n', '  const nuevo = true\n']], pruebas: 'P10', espera: /la pieza aprobada sigue con su canon ✗/ },
  { nombre: 'gate-t11-firma-posicion', objetivo: 'gate', cambios: [["      if (razones.length && bloquea(p, 'firma-posicion',", "      if (false && bloquea(p, 'firma-posicion',"]], pruebas: 'P10', espera: /rechaza firma arriba del contenido \(canon nuevo\) ✗/ },
  { nombre: 'gate-t11-firma-max', objetivo: 'gate', cambios: [['    else if (nuevo && ancho > FIRMA_ANCHO_MAX + 0.005 && bloquea(', '    else if (false && bloquea(']], pruebas: 'P10', espera: /rechaza firma gigante \(canon nuevo\) ✗/ },
  { nombre: 'gate-t11-orden', objetivo: 'gate', cambios: [["    if (fueraDeOrden.length && bloquea(p, 'orden-lectura',", "    if (false && bloquea(p, 'orden-lectura',"]], pruebas: 'P10', espera: /rechaza orden de lectura alterado \(canon nuevo\) ✗/ },
  { nombre: 'gate-t11-jerarquia-rol', objetivo: 'gate', cambios: [["    if (sobreTope.length && bloquea(p, 'jerarquia-rol',", "    if (false && bloquea(p, 'jerarquia-rol',"]], pruebas: 'P10', espera: /rechaza jerarquía por rol \(canon nuevo\) ✗/ },
  { nombre: 'gate-t11-aire', objetivo: 'gate', cambios: [["    if (variante !== 'text' && (p.cta.paddingX < p.cta.fontSize * AIRE_CTA.x", "    if (false && (p.cta.paddingX < p.cta.fontSize * AIRE_CTA.x"]], pruebas: 'P10', espera: /rechaza botón sin aire \(canon nuevo\) ✗/ },
  { nombre: 'gate-t11-externa-libre', objetivo: 'gate', cambios: [["    if (externa && !salidaAprobada(p, 'firma EXTERNA", "    if (false && !salidaAprobada(p, 'firma EXTERNA"]], pruebas: 'P10', espera: /firma externa del canon nuevo exige aprobación ✗/ },
  // ── Tramo 12 · cuarta certificación
  { nombre: 't12-marco-titular-libre', objetivo: 'compositor', cambios: [["    if (!onObject) marcos.push({ id: 'marco de la selección del titular'", "    if (false) marcos.push({ id: 'marco de la selección del titular'"]], pruebas: 'P06', espera: /marco de la selección del titular sobre el texto rechazado: false/ },
  { nombre: 't12-marco-cta-libre', objetivo: 'compositor', cambios: [["    if (ctaMarcoPintado) marcos.push({ id: 'marco de la selección del CTA'", "    if (false) marcos.push({ id: 'marco de la selección del CTA'"]], pruebas: 'P06', espera: /corchetes del CTA de texto sobre la nota rechazados: false/ },
  { nombre: 't12-marcos-sin-registro', objetivo: 'compositor', cambios: [['  if (nuevo) {\n    elementosSeleccion.push(...marcos)', '  if (false) {\n    elementosSeleccion.push(...marcos)']], pruebas: 'P06', espera: /marco de la selección del titular sobre el texto rechazado: false/ },
  { nombre: 't12-legado-mudo', objetivo: 'compositor', cambios: [["  const marcoSobreVoz = nuevo ? [] :", '  const marcoSobreVoz = true ? [] :']], pruebas: 'P06', espera: /la pieza aprobada con el marco sobre una voz compone y avisa: false/ },
  { nombre: 't12-sin-reserva-columna', objetivo: 'compositor', cambios: [['  const MX = Math.max(M, (zonaDeclarada?.x0 ?? 0) * W) + reservaMarcos', '  const MX = Math.max(M, (zonaDeclarada?.x0 ?? 0) * W)']], pruebas: 'P06', espera: /la columna deja lugar a los corchetes del CTA de texto: false/ },
  { nombre: 't12-alfa-libre', objetivo: 'compositor', cambios: [['  if (st.isOpaque === false) throw new Error(', '  if (false) throw new Error(']], pruebas: 'P07', espera: /plate con transparencia ✗/ },
  { nombre: 't12-cursor-sobre-texto', objetivo: 'modulo', modulo: 'cta-invariantes.mjs', prueba: 'cta-invariantes.test.mjs', cambios: [["      if ((p.id === s.destino || p.dentroDe === s.destino) && !(puntero && p.tipo === 'texto')) continue", '      if (p.id === s.destino || p.dentroDe === s.destino) continue']], espera: /Un cursor o una etiqueta no tapan el texto de su destino/ },
  { nombre: 't12-marcado-libre', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    if (/\\*\\*|\\[\\[|\\]\\]/.test(t) && !['lead', 'dominant', 'after', 'note.text', 'footer.text'].includes(campo)) e.push(", '    if (false) e.push(']], espera: /Marcado, entidades, saltos de línea y placement chico/ },
  { nombre: 't12-salto-libre', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [['    if (/[\\n\\r\\t]/.test(t)) e.push(', '    if (false) e.push(']], espera: /Marcado, entidades, saltos de línea y placement chico/ },
  { nombre: 't12-placement-sin-piso', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [['    placement: z.object({ anchoCssPx: z.number().finite().min(320).max(8192), razon }).strict().optional(),', '    placement: z.object({ anchoCssPx: positivo, razon }).strict().optional(),']], espera: /Marcado, entidades, saltos de línea y placement chico/ },
  { nombre: 'gate-t12-eje', objetivo: 'gate', cambios: [["    if (fuera.length && bloquea(p, 'eje-centrado',", "    if (false && bloquea(p, 'eje-centrado',"]], pruebas: 'P10', espera: /rechaza bloque centrado fuera del eje ✗/ },
  { nombre: 'gate-t12-tracking', objetivo: 'gate', cambios: [["(p.dominantTracking < TRACKING_TITULAR[0] || p.dominantTracking > TRACKING_TITULAR[1]) && bloquea(p, 'tracking-titular',", "false && bloquea(p, 'tracking-titular',"]], pruebas: 'P10', espera: /rechaza tracking del titular fuera de rango \(canon nuevo\) ✗/ },
  { nombre: 'gate-t12-firma-pegada', objetivo: 'gate', cambios: [['        b.top >= contenidoAbajo - 0.5 && b.top < contenidoAbajo + Math.min(cw, ch) * 0.02 - 0.5 &&', '        false &&']], pruebas: 'P10', espera: /rechaza firma pegada al contenido \(canon nuevo\) ✗/ },
  // ── Tramo 13 · quinta certificación
  { nombre: 't13-alfa-8-bits', objetivo: 'compositor', cambios: [["  if (st.isOpaque === false) throw new Error(", "  if (st.channels.length === 4 && st.channels[3].min < 255) throw new Error("]], pruebas: 'P07', espera: /plate con transparencia en 16 bits ✗/ },
  { nombre: 't13-entidad-sin-digitos', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    const ent = d.match(/&(#\\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i)", "    const ent = d.match(/&(#\\d+|#x[0-9a-f]+|[a-z]+);/i)"]], espera: /Marcado, entidades, saltos de línea y placement chico/ },
  { nombre: 't13-esquina-libre', objetivo: 'compositor', cambios: [["      if(!dentro)throw new Error(", "      if(false)throw new Error("]], pruebas: 'P10', espera: /rechaza esquina del botón sobre el texto ✗/ },
  { nombre: 't13-sin-sujeto-en-qa', objetivo: 'compositor', cambios: [["...(s.selection?.box && opts.mask ? { seleccionSujeto: fraccionSujeto(opts.mask, s.selection.box) } : {}), ", '']], pruebas: 'P10', espera: /rechaza selección sobre nada ✗/ },
  { nombre: 't13-medicion-sin-tope', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [["  if (peor > tope + 0.02) return", "  if (false) return"]], espera: /Una medición imposible se reconoce/ },
  { nombre: 't13-medicion-sin-umbral', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [["  if (umbral != null && umbralEsperado != null && umbral !== umbralEsperado) return", "  if (false) return"]], espera: /Una medición imposible se reconoce/ },
  { nombre: 'gate-t13-losa', objetivo: 'gate', cambios: [["  if (relleno > 1 + 1e-9 && bloquea(p, 'cta-relleno',", "  if (false && bloquea(p, 'cta-relleno',"]], pruebas: 'P10', espera: /rechaza botón-losa ✗/ },
  { nombre: 'gate-t13-descriptor', objetivo: 'gate', cambios: [["distDesc > TECHO_DESCRIPTOR + 1e-9 && bloquea(", "false && bloquea("]], pruebas: 'P10', espera: /rechaza descriptor lejos del botón ✗/ },
  { nombre: 'gate-t13-cta-cuerpo', objetivo: 'gate', cambios: [["tipografia.cta < mayorCuerpo * PISO_CTA_CUERPO - 1e-9 && bloquea(", "false && bloquea("]], pruebas: 'P10', espera: /rechaza CTA menor que el cuerpo ✗/ },
  { nombre: 'gate-t13-paleta', objetivo: 'gate', cambios: [["  if (fueraDePaleta.length && bloquea(p, 'paleta-voces',", "  if (false && bloquea(p, 'paleta-voces',"]], pruebas: 'P10', espera: /rechaza tinta de cuerpo fuera de la paleta ✗/ },
  { nombre: 'gate-t13-seleccion', objetivo: 'gate', cambios: [["r.seleccionSujeto < PISO_SELECCION_SUJETO && bloquea(", "false && bloquea("]], pruebas: 'P10', espera: /rechaza selección sobre nada ✗/ },
  { nombre: 'gate-t13-seleccion-sin-medida', objetivo: 'gate', cambios: [["  if (p.selection?.box && r.guardaSujeto === 'segmentacion' && typeof r.seleccionSujeto !== 'number') noCertificable.push(", "  if (false) noCertificable.push("]], pruebas: 'P10', espera: /rechaza selección sin su medición ✗/ },
  { nombre: 'gate-t13-legibilidad', objetivo: 'gate', cambios: [["    if (chicas.length && bloquea(p, 'legibilidad',", "    if (false && bloquea(p, 'legibilidad',"]], pruebas: 'P10', espera: /rechaza texto chico en el teléfono \(canon nuevo\) ✗/ },
  // ── Tramo 14 · sexta certificación
  { nombre: 't14-cierre-acento-naranja', objetivo: 'compositor', cambios: [[" fill: s.afterFill ?? INK, accentFill: INK, align: s.align })", " fill: s.afterFill ?? INK, align: s.align })"]], pruebas: 'P10', espera: /el cierre en \[\[ \]\] sale blanco, no naranja ✗/ },
  { nombre: 't14-etiqueta-estrella', objetivo: 'compositor', cambios: [["x: lx0 + (s.labelStar ? starR * 2 + gapS : 0), topY: y, fill: INK, align: 'left' })", "x: lx0 + starR * 2 + gapS, topY: y, fill: INK, align: 'left' })"]], pruebas: 'P10', espera: /la etiqueta arranca en la columna ✗/ },
  { nombre: 't14-protect-es-sujeto', objetivo: 'compositor', cambios: [["function fraccionSujeto(mask, [x0, y0, x1, y1]) {", "function fraccionSujeto(mask, [x0, y0, x1, y1], protect = []) {"], ["      if (mask.data[y * mask.W + x] > 127) sujeto++", "      if (mask.data[y * mask.W + x] > 127 || protect.some(z => (x + 0.5) / mask.W >= z.box[0] && (x + 0.5) / mask.W < z.box[2] && (y + 0.5) / mask.H >= z.box[1] && (y + 0.5) / mask.H < z.box[3])) sujeto++"], ["seleccionSujeto: fraccionSujeto(opts.mask, s.selection.box) }", "seleccionSujeto: fraccionSujeto(opts.mask, s.selection.box, s.protect ?? []) }"]], pruebas: 'P10', espera: /rechaza selección sobre nada aunque declare protect ✗/ },
  { nombre: 't14-raster-libre', objetivo: 'compositor', cambios: [["  if (!FORMATOS_PLATE.has(formato)) throw new Error(", "  if (false) throw new Error("]], pruebas: 'P07', espera: /plate SVG que enlaza la foto ✗/ },
  { nombre: 't14-borde-libre', objetivo: 'compositor', cambios: [["      if(dx<0||dy<0)throw new Error(", "      if(false)throw new Error("]], pruebas: 'P10', espera: /rechaza borde del botón sobre el texto ✗/ },
  { nombre: 't14-entidad-sin-punto-y-coma', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    if (!ent && entSin) e.push(", "    if (false) e.push("]], espera: /Marcado, entidades, saltos de línea y placement chico/ },
  { nombre: 't14-escala-sin-piso', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    scale: positivo.min(1).max(2.5).optional(),", "    scale: positivo.max(2.5).optional(),"]], espera: /Las escalas de la selección tienen techo/ },
  { nombre: 't14-cursor-sin-techo', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    cursorScale: positivo.max(1.2).optional(),", "    cursorScale: positivo.max(2).optional(),"]], espera: /Las escalas de la selección tienen techo/ },
  { nombre: 't14-tope-sin-acento', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [["  const tope = Math.max(...[tinta, ...tintasExtra].map(t => {", "  const tope = Math.max(...[tinta].map(t => {"]], espera: /Una medición imposible se reconoce/ },
  { nombre: 'gate-t14-cta-tamano', objetivo: 'gate', cambios: [["  if (tamanoCta > 1 + 1e-9 && bloquea(p, 'cta-tamano',", "  if (false && bloquea(p, 'cta-tamano',"]], pruebas: 'P10', espera: /rechaza CTA que compite con el titular ✗/ },
  { nombre: 'gate-t14-seleccion-aprobada', objetivo: 'gate', cambios: [["  if (nuevo && p.selection?.box && !salidaAprobada(", "  if (false && !salidaAprobada("]], pruebas: 'P10', espera: /selección sobre un objeto exige aprobación \(canon nuevo\) ✗/ },
  { nombre: 'gate-t14-mascara-vacia', objetivo: 'gate', cambios: [["mascara.cobertura === 0 && bloquea(p, 'mascara-vacia',", "false && bloquea(p, 'mascara-vacia',"]], pruebas: 'P10', espera: /rechaza máscara vacía ✗/ },
  // Tramo 15 (séptima certificación): una por guarda nueva.
  { nombre: 't15-entidades-a-mano', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    const nombre = NOMBRES_SIN_PUNTO.find(n => t.startsWith(n, i + 1))", "    const nombre = ['amp', 'lt', 'gt', 'quot', 'nbsp', 'copy', 'reg'].find(n => t.startsWith(n, i + 1))"]], espera: /Entidades sin punto y coma con la lista oficial de HTML5/ },
  { nombre: 't15-cta-centrado-a-la-izquierda', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["  if (c && typeof c === 'object' && c.align === 'center' && p?.align !== 'center') e.push(", "  if (false) e.push("]], espera: /Entidades sin punto y coma con la lista oficial de HTML5/ },
  { nombre: 'gate-t15-holgura', objetivo: 'gate', cambios: [["    const tocan = pegados.filter(([, , s]) => s < piso)", "    const tocan = []"], ["    } else if (pegados.length && bloquea(p, 'holgura',", "    } else if (false && bloquea(p, 'holgura',"]], pruebas: 'P10', espera: /rechaza voces pegadas ✗/ },
  { nombre: 'gate-t15-medio-trazo', objetivo: 'gate', cambios: [["? Math.max(2, Math.ceil(L.canvas.width / (r.anchoPantalla ?? 390))) / 2 :", "? 0 :"]], pruebas: 'P10', espera: /el borde del contorno cuenta medio trazo ✗/ },
  { nombre: 'gate-t15-columna', objetivo: 'gate', cambios: [["    if (corridos.length && bloquea(p, 'cta-columna', msg,", "    if (false && bloquea(p, 'cta-columna', msg,"]], pruebas: 'P10', espera: /rechaza CTA fuera de la columna \(canon nuevo\) ✗/ },
  { nombre: 'gate-t15-area-sin-variante', objetivo: 'gate', cambios: [["  const techoArea = TECHO_BOTON_AREA[varianteDibujada] ?? TECHO_BOTON_AREA.outline", "  const techoArea = TECHO_BOTON_AREA.outline"]], pruebas: 'P10', espera: /rechaza losa de relleno por área ✗/ },
  { nombre: 'gate-t15-cta-texto-desde-la-caja', objetivo: 'gate', cambios: [["  const baseD = varianteDibujada === 'text' ? el('cta') : el('cta-boton') ?? el('cta')", "  const baseD = el('cta-boton') ?? el('cta')"]], pruebas: 'P10', espera: /mide el descriptor desde el texto del CTA ✗/ },
  { nombre: 'gate-t15-origen-heredado', objetivo: 'gate', cambios: [["JSON.stringify({ origen: path.resolve(plan), nonce })", "JSON.stringify({ origen: ORIGEN ?? path.resolve(plan), nonce })"]], pruebas: 'P10', espera: /el origen heredado no certifica un compositor ajeno ✗/ },
  // Tramo 16 (octava certificación): una por guarda nueva.
  { nombre: 't16-invisibles', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    if (invisible && d.trim()) e.push(", "    if (false) e.push("]], espera: /Se valida lo que se dibuja/ },
  { nombre: 't16-entidad-sin-dibujar', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    const d = dibujado(campo, t)", "    const d = t"]], espera: /Se valida lo que se dibuja/ },
  { nombre: 't16-barra-en-etiqueta', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    if (esEtiquetaDeCursor(campo) && t.includes('|')) e.push(", "    if (false) e.push("]], espera: /Se valida lo que se dibuja/ },
  { nombre: 't16-alt-entidades', objetivo: 'modulo', modulo: 'cta-esquema.mjs', prueba: 'cta-esquema.test.mjs', cambios: [["    if (entAlt) e.push(", "    if (false) e.push("]], espera: /Se valida lo que se dibuja/ },
  { nombre: 't16-pendiente-ciega', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [["  for (let i = 1; i < suave.length; i++) max = Math.max(max, Math.abs(suave[i] - suave[i - 1]))", "  for (let i = 1; i < suave.length; i++) max = Math.max(max, Math.abs(suave[i] - suave[i - 1]) / 10)"]], espera: /La pendiente de luz bajo la firma separa un canto/ },
  { nombre: 't16-plate-chico', objetivo: 'compositor', cambios: [["  if (!s.final && W < 780) throw new Error(", "  if (false) throw new Error("]], pruebas: 'P07', espera: /plate bajo 780 px sin final ✗/ },
  { nombre: 't16-firma-sobre-el-canto', objetivo: 'compositor', cambios: [["    if (evitarCanto && pendienteBajoCaja(rgb, W, H, caja) > TECHO_CANTO) continue", "    if (false) continue"]], pruebas: 'P10', espera: /la firma automática evita el canto \(canon nuevo\) ✗/ },
  { nombre: 'gate-t17-burbuja-sin-marca', objetivo: 'gate', cambios: [["    if (!p.marcaEnEscena && bloquea(p, 'firma-burbuja',", "    if (false && !p.marcaEnEscena && bloquea(p, 'firma-burbuja',"]], pruebas: 'P11', espera: /rechaza la burbuja sin el logo en la imagen \(canon nuevo\) ✗/ },
  { nombre: 'gate-t17-burbuja-con-logo', objetivo: 'gate', cambios: [["    if (p.logo && bloquea(p, 'firma-burbuja',", "    if (false && p.logo && bloquea(p, 'firma-burbuja',"]], pruebas: 'P11', espera: /rechaza logo y burbuja juntos \(canon nuevo\) ✗/ },
  { nombre: 'compositor-t17-burbuja-opacidad', objetivo: 'compositor', cambios: [["    const opacidad = nuevo ? 1 : 0.72", "    const opacidad = 0.72"]], pruebas: 'P11', espera: /la burbuja se fusiona a opacidad plena y se mide ✗/ },
  { nombre: 'gate-t16-firma-canto', objetivo: 'gate', cambios: [["    else if (bloquea(p, 'firma-canto', msg,", "    else if (false && bloquea(p, 'firma-canto', msg,"]], pruebas: 'P10', espera: /rechaza firma sobre el canto \(canon nuevo\) ✗/ },
  { nombre: 'gate-t16-tocan-exceptuable', objetivo: 'gate', cambios: [["    const tocan = pegados.filter(([, , s]) => s < piso)", "    const tocan = []"]], pruebas: 'P10', espera: /rechaza voces pegadas ✗/ },
  { nombre: 'gate-t16-holgura-sin-em', objetivo: 'gate', cambios: [["        const pisoPar = Number.isFinite(cuerpo) ? Math.max(piso, cuerpo * HOLGURA_EM) : piso", "        const pisoPar = piso"]], pruebas: 'P10', espera: /rechaza voces casi pegadas \(0,25 em\) ✗/ },
  { nombre: 'gate-t16-relleno-sin-trazo', objetivo: 'gate', cambios: [[": varianteDibujada === 'solid' ? 1 : 0", ": 0"]], pruebas: 'P10', espera: /el relleno cuenta su trazo ✗/ },
  { nombre: 'gate-t16-ritmo', objetivo: 'gate', cambios: [["      if (entre <= dentro && bloquea(p, 'ritmo',", "      if (false && bloquea(p, 'ritmo',"]], pruebas: 'P10', espera: /rechaza ritmo invertido \(canon nuevo\) ✗/ },
  { nombre: 'gate-t16-techo-texto', objetivo: 'gate', cambios: [["const TECHO_BOTON_AREA = { solid: 0.7, outline: 1, text: 0.45 }", "const TECHO_BOTON_AREA = { solid: 0.7, outline: 1, text: 1 }"]], pruebas: 'P10', espera: /el techo de un CTA de texto mide su texto ✗/ },
  { nombre: 'gate-t16-columna-caja-texto', objetivo: 'gate', cambios: [["    const corridos = [['el CTA', varianteDibujada === 'text' ? el('cta') : el('cta-boton')]", "    const corridos = [['el CTA', el('cta-boton')]"]], pruebas: 'P10', espera: /un CTA de texto en la columna no se corre por su caja ✗/ },
  { nombre: 'gate-t16-holgura-caja-texto', objetivo: 'gate', cambios: [["      .filter(e => ['texto', 'cta', 'firma'].includes(e.tipo) && !(e.id === 'cta-boton' && varianteDibujada === 'text'))", "      .filter(e => ['texto', 'cta', 'firma'].includes(e.tipo))"]], pruebas: 'P10', espera: /la holgura no cuenta la caja de un CTA de texto ✗/ },
  // Canarios: rompen algo AJENO al patrón. El arnés tiene que clasificarlos como «falla por otra razón».
  { nombre: 'canario-compositor-revienta', canario: true, objetivo: 'compositor', cambios: [['const QA_FILE = rutaQa(OUT, PLAN)', "const QA_FILE = (() => { throw new Error('canario: el compositor revienta') })()"]], pruebas: 'P10', espera: /rechaza plan cambiado ✗/ },
  { nombre: 'canario-modulo-ajeno', canario: true, objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['export const razonWcag = (l1, l2) =>', 'export const razonWcag = (l1, l2) => 1 || ']], espera: /Texto alternativo: el rol del CTA se anuncia siempre/ },
  // ── Firma externa (seguimiento del 2026-09-23: la firma la pone otra herramienta después del compositor)
  { nombre: 'fx-compositor-ignora-firma-externa', objetivo: 'compositor', cambios: [["    ...(firmaExternaDeclarada(s) ? [{ id: 'firma-externa', box: cajaFirmaExterna(s) }] : []),\n", ''], ["...(firmaExternaDeclarada(s) ? [{ id: 'firma-externa', box: cajaFirmaExterna(s) }] : [])]", ']']], pruebas: 'P06', espera: /firma externa sobre el texto rechazada: false/ },
  { nombre: 'gate-sin-contrato-firma-externa', objetivo: 'gate', cambios: [['  if (externa) {', '  if (false) {']], pruebas: 'P10', espera: /mide el contrato de la firma externa ✗/ },
  { nombre: 'gate-no-reconoce-firma-externa', objetivo: 'gate', cambios: [["  const externa = !p.logo && (p.firma?.modo === 'externa' || (p.firma == null && typeof p.signatureY === 'number'))", '  const externa = false']], pruebas: 'P10', espera: /acepta signatureY como firma externa ✗|mide el contrato de la firma externa ✗/ },
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

// ── Tramo 9 (auditoría de arquitectura, N5): la puntuación sobrestimaba. Un mutante que sólo hacía reventar al
// compositor ponía en ✗ TODAS las verificaciones de P10, incluida la que buscaba su patrón, y contaba como «detectado
// por la razón esperada»; y en los módulos el patrón era el nombre de la prueba, que también aparece con ✔. Ahora:
//   · cada conjunto de pruebas corre una vez SIN mutante (corrida base), y la razón esperada tiene que CAMBIAR: el
//     patrón aparece con el mutante y no en la base;
//   · en los módulos, el patrón se busca sólo en las líneas `✖` (la prueba que falla, no la que pasa);
//   · si el mutante tumba más de la mitad de lo que pasaba en la base —o revienta una prueba— es un COLAPSO: falla por
//     otra razón, aunque el patrón aparezca;
//   · los mutantes `canario` rompen algo AJENO a su patrón a propósito: el arnés tiene que clasificarlos como «falla
//     por otra razón». Si los da por detectados, el arnés volvió a sobrestimar.
const correr = comando => run(process.execPath, comando, { cwd: ROOT, timeout: 60 * 60e3, maxBuffer: 64e6 }).then(r => ({ code: 0, texto: r.stdout + r.stderr }), e => ({ code: e.code ?? 1, texto: String(e.stdout ?? '') + String(e.stderr ?? '') }))

const comandoBase = m => (m.objetivo === 'modulo' ? ['--test', `scripts/foto/${m.prueba}`] : ['scripts/foto/componer-cta.pruebas.mjs', '--solo', m.pruebas, ...(m.rapido ? ['--p02-rapido'] : [])])
const bases = new Map()

const base = m => {
  const k = comandoBase(m).join(' ')

  if (!bases.has(k)) bases.set(k, correr(comandoBase(m)))

  return bases.get(k)
}

// Verificaciones con nombre en la salida: `nombre ✓|✗` (P07, P10, arnés), `nombre: true|false` (P03–P06) y las líneas
// `✔|✖ nombre` de node:test.
export function chequeos(texto) {
  const m = new Map()

  for (const linea of String(texto).split('\n')) {
    const t = linea.trim()
    const nodo = t.match(/^([✔✖]) (.+?)(?: \([\d.]+ms\))?$/)

    if (nodo) { m.set(nodo[2], nodo[1] === '✔'); continue }

    for (const seg of t.split(' · ')) {
      const a = seg.match(/^(.+?) ([✓✗])(?: \(.*\))?$/)

      if (a && !/^[✓✗] P\d\d /.test(seg)) { m.set(a[1], a[2] === '✓'); continue }
      const b = seg.match(/^(.+?): (true|false)\b/)

      if (b) m.set(b[1], b[2] === 'true')
    }
  }

  return m
}

// En los módulos el patrón vale en una línea `✖` o en el informe de fallas de node:test (el mensaje de una aserción),
// nunca en una línea `✔`.
const aparece = (m, texto) => {
  if (m.objetivo !== 'modulo') return m.espera.test(texto)
  const t = String(texto)
  const i = t.indexOf('failing tests:')

  return t.split('\n').some(l => l.trim().startsWith('✖') && m.espera.test(l)) || (i >= 0 && m.espera.test(t.slice(i)))
}

export function clasificar(m, salidaBase, salida) {
  if (salida.code === 0) return 'sobrevive'
  const b = chequeos(salidaBase.texto)
  const x = chequeos(salida.texto)
  const pasaban = [...b].filter(([, ok]) => ok).map(([k]) => k)
  const caidos = pasaban.filter(k => x.get(k) !== true)
  const revienta = /error de la prueba/.test(salida.texto) && !/error de la prueba/.test(salidaBase.texto)
  // `amplio`: una guarda de la que dependen muchas verificaciones (el esquema) tumba legítimamente más de la mitad.
  const colapso = revienta || (!m.amplio && pasaban.length >= 4 && caidos.length > pasaban.length / 2)
  const cambia = aparece(m, salida.texto) && !aparece(m, salidaBase.texto)

  return cambia && !colapso ? 'detectado' : 'falla-por-otra-razon'
}

async function evaluar(m) {
  let archivos = []

  try {
    const mut = mutar(m)

    archivos = mut.archivos
    const [salidaBase, salida] = await Promise.all([base(m), correr(mut.comando)])

    if (salidaBase.code !== 0) return { nombre: m.nombre, estado: 'base-falla', error: `la corrida base (${comandoBase(m).slice(-3).join(' ')}) no pasa: el catálogo no se puede juzgar` }
    const estado = clasificar(m, salidaBase, salida)

    return { nombre: m.nombre, estado, canario: Boolean(m.canario) }
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
      const bien = r.canario ? r.estado === 'falla-por-otra-razon' : r.estado === 'detectado'

      console.log(`${bien ? '✓' : '✗'} ${r.nombre}: ${r.canario ? `canario, ${r.estado === 'falla-por-otra-razon' ? 'el arnés lo clasifica como falla por otra razón' : `el arnés lo dio por ${r.estado} (sobrestima)`}` : r.estado}${r.error ? ` — ${r.error}` : ''}`)
    }
  }))

  const reales = resultados.filter(r => !r.canario)
  const canarios = resultados.filter(r => r.canario)
  const detectados = reales.filter(r => r.estado === 'detectado').length
  const canariosBien = canarios.filter(r => r.estado === 'falla-por-otra-razon').length

  console.log(`\nPuntuación: ${detectados} de ${reales.length} mutantes detectados por la razón esperada${canarios.length ? ` · canarios: ${canariosBien} de ${canarios.length} clasificados como falla por otra razón` : ''}.`)
  process.exitCode = detectados === reales.length && canariosBien === canarios.length ? 0 : 1
}
